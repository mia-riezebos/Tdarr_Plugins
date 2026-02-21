import { getFileName } from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

interface IHTTPHeaders {
  'Content-Type': string;
  'X-Api-Key': string;
  Accept: string;
}

interface IParseResponse {
  data: {
    movie?: { id: number };
    series?: { id: number };
  };
}

const details = (): IpluginDetails => ({
  name: 'Update Arr Root Folder',
  description: 'Checks if any media files remain in the old root folder.'
    + ' If empty, updates the movie/series path in Radarr/Sonarr to the new root folder and triggers a refresh.'
    + ' If files remain, skips the update.',
  style: {
    borderColor: 'green',
  },
  tags: '',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faFolderOpen',
  inputs: [
    {
      label: 'Arr',
      name: 'arr',
      type: 'string',
      defaultValue: 'radarr',
      inputUI: {
        type: 'dropdown',
        options: ['radarr', 'sonarr'],
      },
      tooltip: 'Which arr instance to use.',
    },
    {
      label: 'Arr API Key',
      name: 'arr_api_key',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'API key for the arr instance.',
    },
    {
      label: 'Arr Host',
      name: 'arr_host',
      type: 'string',
      defaultValue: 'http://192.168.1.1:7878',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Host URL for the arr instance.'
        + '\\nExample:\\n'
        + 'http://192.168.1.1:7878\\n'
        + 'http://192.168.1.1:8989\\n',
    },
    {
      label: 'Old Root Folder',
      name: 'oldRootFolder',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'The old root folder path (e.g. /mnt/media/sonarr/candidates).'
        + '\\nIf empty, derived from the original library file path.',
    },
    {
      label: 'New Root Folder',
      name: 'newRootFolder',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'The new root folder path (e.g. /mnt/media/sonarr/transcoded).'
        + '\\nIf empty, derived from the current file path.',
    },
    {
      label: 'File Extensions',
      name: 'fileExtensions',
      type: 'string',
      defaultValue: 'mkv,mp4,avi,ts,wmv,mov',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Comma-separated list of file extensions to check when determining if the old root is empty.',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Root folder updated in arr and refreshed',
    },
    {
      number: 2,
      tooltip: 'Files remain in old root, no update performed',
    },
  ],
});

const deriveMediaFolder = (filePath: string, rootFolder: string): string => {
  const withoutRoot = filePath.substring(rootFolder.length).replace(/^\//, '');
  const firstSegment = withoutRoot.split('/')[0];
  return `${rootFolder.replace(/\/$/, '')}/${firstSegment}`;
};

const deriveRootFolder = (filePath: string): string => {
  const parts = filePath.split('/');
  // Walk back: file -> season/subfolder -> media folder -> root
  // e.g. /mnt/media/sonarr/candidates/ShowName/Season 01/file.mkv
  //      root = /mnt/media/sonarr/candidates
  // Minimum depth: at least 3 parts above the file (root/media/season|file)
  if (parts.length >= 4) {
    return parts.slice(0, -3).join('/');
  }
  if (parts.length >= 3) {
    return parts.slice(0, -2).join('/');
  }
  return parts.slice(0, -1).join('/');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const scanForMediaFiles = async (
  dirPath: string,
  extensions: Set<string>,
  fsextra: any,
): Promise<boolean> => {
  try {
    const entries = await fsextra.readdir(dirPath, { withFileTypes: true });
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entry.isDirectory()) {
        // eslint-disable-next-line no-await-in-loop
        const found = await scanForMediaFiles(`${dirPath}/${entry.name}`, extensions, fsextra);
        if (found) return true;
      } else {
        const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
        if (extensions.has(ext)) return true;
      }
    }
  } catch (_err) {
    // Directory doesn't exist or can't be read — treat as empty
  }
  return false;
};

const getArrId = async (
  args: IpluginInputArgs,
  arr: string,
  arrHost: string,
  headers: IHTTPHeaders,
  fileName: string,
): Promise<number> => {
  const imdbId = /\b(tt|nm|co|ev|ch|ni)\d{7,10}?\b/i.exec(fileName)?.at(0) ?? '';
  let id = -1;

  if (imdbId) {
    const endpoint = arr === 'radarr' ? 'movie' : 'series';
    const lookupResp = await args.deps.axios({
      method: 'get',
      url: `${arrHost}/api/v3/${endpoint}/lookup?term=imdb:${imdbId}`,
      headers,
    });
    id = Number(lookupResp?.data?.at(0)?.id ?? -1);
    args.jobLog(`Lookup by IMDB ${imdbId}: ${id !== -1 ? `found id ${id}` : 'not found'}`);
  }

  if (id === -1) {
    const parseResp: IParseResponse = await args.deps.axios({
      method: 'get',
      url: `${arrHost}/api/v3/parse?title=${encodeURIComponent(getFileName(fileName))}`,
      headers,
    });
    id = arr === 'radarr'
      ? Number(parseResp.data?.movie?.id ?? -1)
      : Number(parseResp.data?.series?.id ?? -1);
    args.jobLog(`Lookup by parse "${getFileName(fileName)}": ${id !== -1 ? `found id ${id}` : 'not found'}`);
  }

  return id;
};

const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const arr = String(args.inputs.arr);
  const arrHost = String(args.inputs.arr_host).trim().replace(/\/$/, '');
  const headers: IHTTPHeaders = {
    'Content-Type': 'application/json',
    'X-Api-Key': String(args.inputs.arr_api_key),
    Accept: 'application/json',
  };

  const originalPath = args.originalLibraryFile?._id ?? '';
  const currentPath = args.inputFileObj._id;

  const oldRootInput = String(args.inputs.oldRootFolder).trim();
  const newRootInput = String(args.inputs.newRootFolder).trim();

  const oldRoot = oldRootInput || deriveRootFolder(originalPath);
  const newRoot = newRootInput || deriveRootFolder(currentPath);

  const oldMediaFolder = deriveMediaFolder(originalPath, oldRoot);
  const newMediaFolder = deriveMediaFolder(currentPath, newRoot);

  args.jobLog(`Old root: ${oldRoot}`);
  args.jobLog(`New root: ${newRoot}`);
  args.jobLog(`Old media folder: ${oldMediaFolder}`);
  args.jobLog(`New media folder: ${newMediaFolder}`);

  if (oldRoot === newRoot) {
    args.jobLog('Old and new root folders are the same, nothing to update.');
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 1,
      variables: args.variables,
    };
  }

  const extensionList = String(args.inputs.fileExtensions).split(',').map((e) => e.trim().toLowerCase());
  const extensions = new Set(extensionList);

  const hasMediaFiles = await scanForMediaFiles(oldMediaFolder, extensions, args.deps.fsextra);

  if (hasMediaFiles) {
    args.jobLog(`Media files still exist in ${oldMediaFolder}, skipping root folder update.`);
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }

  args.jobLog(`No media files found in ${oldMediaFolder}, proceeding with root folder update.`);

  const id = await getArrId(args, arr, arrHost, headers, originalPath);

  if (id === -1) {
    args.jobLog(`Could not find ${arr === 'radarr' ? 'movie' : 'series'} in ${arr}. Skipping update.`);
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }

  const endpoint = arr === 'radarr' ? 'movie' : 'series';

  const recordResp = await args.deps.axios({
    method: 'get',
    url: `${arrHost}/api/v3/${endpoint}/${id}`,
    headers,
  });
  const record = recordResp.data;

  args.jobLog(`Current ${endpoint} path: ${record.path}`);
  args.jobLog(`Updating to: ${newMediaFolder}`);

  record.path = newMediaFolder;

  await args.deps.axios({
    method: 'put',
    url: `${arrHost}/api/v3/${endpoint}/${id}`,
    headers,
    data: JSON.stringify(record),
  });

  const refreshData = arr === 'radarr'
    ? JSON.stringify({ name: 'RefreshMovie', movieIds: [id] })
    : JSON.stringify({ name: 'RefreshSeries', seriesId: id });

  await args.deps.axios({
    method: 'post',
    url: `${arrHost}/api/v3/command`,
    headers,
    data: refreshData,
  });

  args.jobLog(`✔ ${endpoint} '${id}' path updated and refreshed in ${arr}.`);

  return {
    outputFileObj: args.inputFileObj,
    outputNumber: 1,
    variables: args.variables,
  };
};

export {
  details,
  plugin,
};
