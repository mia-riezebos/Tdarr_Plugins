import { getFileAbosluteDir } from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

const details = (): IpluginDetails => ({
  name: 'Check File Exists (Regex)',
  description: 'Checks if any file in a directory matches a configurable regex pattern.'
    + ' Directory can come from a flow variable or the input file dir.'
    + ' Useful for checking if a transcoded version already exists before processing.',
  style: {
    borderColor: 'orange',
  },
  tags: '',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faQuestion',
  inputs: [
    {
      label: 'Directory Source',
      name: 'directorySource',
      type: 'string',
      defaultValue: 'flowVariable',
      inputUI: {
        type: 'dropdown',
        options: ['flowVariable', 'inputFileDir'],
      },
      tooltip: 'Where to get the directory path from.'
        + '\\nflowVariable: reads from a user flow variable.'
        + '\\ninputFileDir: uses the directory of the current input file.',
    },
    {
      label: 'Directory Variable',
      name: 'directoryVariable',
      type: 'string',
      defaultValue: 'parentDir',
      inputUI: {
        type: 'text',
      },
      tooltip: 'When source is flowVariable, the name of the user variable containing the directory path.'
        + '\\nAccessed as args.variables.user[directoryVariable].',
    },
    {
      label: 'Match Regex',
      name: 'matchRegex',
      type: 'string',
      defaultValue: '\\.(mkv|mp4|avi)$',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Regex pattern to test against each filename.'
        + '\\nUses substring match by default. Use ^ and $ anchors for full match.'
        + '\\nExamples:'
        + '\\n  \\[(?:720p|1080p|2160p)\\] — matches resolution tags'
        + '\\n  \\[(?:Bluray|Remux)-(?:1080p|2160p)\\] — matches quality tags',
    },
    {
      label: 'File Extensions',
      name: 'fileExtensions',
      type: 'string',
      defaultValue: 'mkv,mp4,avi,ts,wmv,mov',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Comma-separated file extensions to consider.'
        + '\\nFiles with other extensions are ignored before regex matching.'
        + '\\nLeave empty to include all files.',
    },
    {
      label: 'Recursive',
      name: 'recursive',
      type: 'string',
      defaultValue: 'false',
      inputUI: {
        type: 'dropdown',
        options: ['false', 'true'],
      },
      tooltip: 'When true, scan subdirectories recursively.',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Matching file found (exists)',
    },
    {
      number: 2,
      tooltip: 'No matching file found or directory does not exist',
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const scanDirectory = async (
  dirPath: string,
  regex: RegExp,
  extensions: Set<string>,
  recursive: boolean,
  fsextra: any,
): Promise<string | null> => {
  let entries;
  try {
    entries = await fsextra.readdir(dirPath, { withFileTypes: true });
  } catch (_err) {
    return null;
  }

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry.isDirectory()) {
      if (recursive) {
        // eslint-disable-next-line no-await-in-loop
        const match = await scanDirectory(`${dirPath}/${entry.name}`, regex, extensions, recursive, fsextra);
        if (match) return match;
      }
    } else {
      const name = entry.name as string;
      if (extensions.size > 0) {
        const ext = name.split('.').pop()?.toLowerCase() ?? '';
        if (!extensions.has(ext)) continue;
      }
      if (regex.test(name)) return `${dirPath}/${name}`;
    }
  }

  return null;
};

const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const directorySource = String(args.inputs.directorySource);
  const directoryVariable = String(args.inputs.directoryVariable).trim();
  const matchRegexStr = String(args.inputs.matchRegex);
  const fileExtStr = String(args.inputs.fileExtensions).trim();
  const recursive = String(args.inputs.recursive) === 'true';

  let targetDir = '';

  if (directorySource === 'flowVariable') {
    targetDir = String(args.variables?.user?.[directoryVariable] ?? '');
  } else {
    targetDir = getFileAbosluteDir(args.inputFileObj._id);
  }

  if (!targetDir) {
    args.jobLog(`Directory is empty (source: ${directorySource}, variable: "${directoryVariable}"). No match.`);
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(matchRegexStr);
  } catch (err) {
    args.jobLog(`Invalid regex "${matchRegexStr}": ${err}. No match.`);
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }

  const extensions = new Set(
    fileExtStr ? fileExtStr.split(',').map((e) => e.trim().toLowerCase()) : [],
  );

  args.jobLog(`Scanning "${targetDir}" for files matching /${matchRegexStr}/`);
  if (extensions.size > 0) args.jobLog(`Extension filter: ${Array.from(extensions).join(', ')}`);
  if (recursive) args.jobLog('Recursive: true');

  const match = await scanDirectory(targetDir, regex, extensions, recursive, args.deps.fsextra);

  if (match) {
    args.jobLog(`Match found: ${match}`);
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 1,
      variables: args.variables,
    };
  }

  args.jobLog('No matching file found.');
  return {
    outputFileObj: args.inputFileObj,
    outputNumber: 2,
    variables: args.variables,
  };
};

export {
  details,
  plugin,
};
