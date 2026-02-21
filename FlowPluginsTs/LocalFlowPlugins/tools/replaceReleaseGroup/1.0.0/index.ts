import fileMoveOrCopy from '../../../../FlowHelpers/1.0.0/fileMoveOrCopy';
import {
  getContainer, getFileAbosluteDir, getFileName,
} from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

interface IParseResponse {
  data: {
    parsedMovieInfo?: { releaseGroup?: string };
    parsedEpisodeInfo?: { releaseGroup?: string };
  };
}

const details = (): IpluginDetails => ({
  name: 'Replace Release Group',
  description: 'Uses the Radarr/Sonarr parse API to identify the release group in a filename,'
    + ' then replaces it with a configurable string.'
    + ' Useful for tagging transcoded files with a custom release group for Custom Format scoring.',
  style: {
    borderColor: 'green',
  },
  tags: '',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faPenToSquare',
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
      tooltip: 'Which arr instance to use for parsing the filename.',
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
      label: 'New Release Group',
      name: 'newReleaseGroup',
      type: 'string',
      defaultValue: 'mCX',
      inputUI: {
        type: 'text',
      },
      tooltip: 'The release group string to replace the existing one with.',
    },
    {
      label: 'If No Group Found',
      name: 'noGroupBehavior',
      type: 'string',
      defaultValue: 'append',
      inputUI: {
        type: 'dropdown',
        options: ['append', 'skip'],
      },
      tooltip: 'What to do when the arr parse API returns no release group.'
        + '\\nappend: insert -NewGroup before the file extension.'
        + '\\nskip: leave the file unchanged and route to output 2.',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Release group replaced or appended',
    },
    {
      number: 2,
      tooltip: 'No release group found (skip mode) or parse failed',
    },
  ],
});

const replaceGroupInFilename = (fileName: string, oldGroup: string, newGroup: string): string => {
  const bracketPatterns = [
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '{', close: '}' },
  ];

  for (let i = 0; i < bracketPatterns.length; i += 1) {
    const { open, close } = bracketPatterns[i];
    const bracketed = `${open}${oldGroup}${close}`;
    const idx = fileName.indexOf(bracketed);
    if (idx !== -1) {
      return fileName.substring(0, idx) + `${open}${newGroup}${close}` + fileName.substring(idx + bracketed.length);
    }
  }

  const hyphenated = `-${oldGroup}`;
  const hIdx = fileName.indexOf(hyphenated);
  if (hIdx !== -1) {
    return fileName.substring(0, hIdx) + `-${newGroup}` + fileName.substring(hIdx + hyphenated.length);
  }

  const plainIdx = fileName.indexOf(oldGroup);
  if (plainIdx !== -1) {
    return fileName.substring(0, plainIdx) + newGroup + fileName.substring(plainIdx + oldGroup.length);
  }

  return fileName;
};

const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const arr = String(args.inputs.arr);
  const arrHost = String(args.inputs.arr_host).trim().replace(/\/$/, '');
  const newReleaseGroup = String(args.inputs.newReleaseGroup).trim();
  const noGroupBehavior = String(args.inputs.noGroupBehavior);
  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': String(args.inputs.arr_api_key),
    Accept: 'application/json',
  };

  const currentPath = args.inputFileObj._id;
  const fileName = getFileName(currentPath);
  const container = getContainer(currentPath);
  const fileDir = getFileAbosluteDir(currentPath);

  args.jobLog(`Parsing filename via ${arr}: ${fileName}`);

  let releaseGroup = '';
  try {
    const parseResponse: IParseResponse = await args.deps.axios({
      method: 'get',
      url: `${arrHost}/api/v3/parse?title=${encodeURIComponent(fileName)}`,
      headers,
    });

    releaseGroup = arr === 'radarr'
      ? (parseResponse.data?.parsedMovieInfo?.releaseGroup ?? '')
      : (parseResponse.data?.parsedEpisodeInfo?.releaseGroup ?? '');

    args.jobLog(`Parse result — release group: "${releaseGroup || '(none)'}"`);
  } catch (err) {
    args.jobLog(`Failed to parse filename via ${arr}: ${err}`);
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }

  let newFileName: string;

  if (releaseGroup) {
    newFileName = replaceGroupInFilename(fileName, releaseGroup, newReleaseGroup);
    args.jobLog(`Replacing release group "${releaseGroup}" → "${newReleaseGroup}"`);
  } else if (noGroupBehavior === 'append') {
    newFileName = `${fileName}-${newReleaseGroup}`;
    args.jobLog(`No release group found, appending "-${newReleaseGroup}"`);
  } else {
    args.jobLog('No release group found, skipping (skip mode)');
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }

  const newPath = `${fileDir}/${newFileName}.${container}`;

  if (currentPath === newPath) {
    args.jobLog('Filename unchanged after replacement, skipping rename.');
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 1,
      variables: args.variables,
    };
  }

  args.jobLog(`Renaming: ${fileName}.${container} → ${newFileName}.${container}`);

  await fileMoveOrCopy({
    operation: 'move',
    sourcePath: currentPath,
    destinationPath: newPath,
    args,
  });

  return {
    outputFileObj: { ...args.inputFileObj, _id: newPath },
    outputNumber: 1,
    variables: args.variables,
  };
};

export {
  details,
  plugin,
};
