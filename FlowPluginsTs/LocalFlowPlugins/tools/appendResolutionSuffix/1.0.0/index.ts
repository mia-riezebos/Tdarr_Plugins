import fileMoveOrCopy from '../../../../FlowHelpers/1.0.0/fileMoveOrCopy';
import {
  getContainer, getFileAbosluteDir, getFileName,
} from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

const details = (): IpluginDetails => ({
  name: 'Append Resolution Suffix',
  description: 'Appends a resolution suffix to the filename before the extension.'
    + ' Resolution can come from ffprobe data or a flow variable.'
    + ' An optional mapping translates raw values (e.g. 2160 → 4K).',
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
      label: 'Resolution Source',
      name: 'resolutionSource',
      type: 'string',
      defaultValue: 'ffprobe',
      inputUI: {
        type: 'dropdown',
        options: ['ffprobe', 'flowVariable'],
      },
      tooltip: 'Where to get the resolution value from.'
        + '\\nffprobe: uses the height of the first video stream.'
        + '\\nflowVariable: reads from args.variables.user[variableName].',
    },
    {
      label: 'Variable Name',
      name: 'variableName',
      type: 'string',
      defaultValue: 'resolution',
      inputUI: {
        type: 'text',
      },
      tooltip: 'When source is flowVariable, the name of the user variable to read.'
        + '\\nAccessed as args.variables.user[variableName].',
    },
    {
      label: 'Resolution Mapping',
      name: 'resolutionMapping',
      type: 'string',
      defaultValue: '2160=4K,1080=1080p,720=720p,480=SD',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Optional comma-separated key=value pairs to map raw values to labels.'
        + '\\nExample: 2160=4K,1080=1080p,720=720p,480=SD'
        + '\\nIf empty, the raw value is used as-is.',
    },
    {
      label: 'Suffix Template',
      name: 'suffixTemplate',
      type: 'string',
      // eslint-disable-next-line no-template-curly-in-string
      defaultValue: ' [${resolution}]',
      inputUI: {
        type: 'text',
      },
      // eslint-disable-next-line no-template-curly-in-string
      tooltip: 'Template for the suffix appended before the extension.'
        // eslint-disable-next-line no-template-curly-in-string
        + '\\n${resolution} is replaced with the mapped resolution value.'
        // eslint-disable-next-line no-template-curly-in-string
        + '\\nExample: " [${resolution}]" → " [1080p]"',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Resolution suffix appended',
    },
    {
      number: 2,
      tooltip: 'Could not determine resolution',
    },
  ],
});

const parseMapping = (mapping: string): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!mapping.trim()) return result;

  const pairs = mapping.split(',');
  for (let i = 0; i < pairs.length; i += 1) {
    const eqIdx = pairs[i].indexOf('=');
    if (eqIdx > 0) {
      const key = pairs[i].substring(0, eqIdx).trim();
      const value = pairs[i].substring(eqIdx + 1).trim();
      result[key] = value;
    }
  }
  return result;
};

const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const resolutionSource = String(args.inputs.resolutionSource);
  const variableName = String(args.inputs.variableName).trim();
  const resolutionMapping = String(args.inputs.resolutionMapping);
  const suffixTemplate = String(args.inputs.suffixTemplate);

  let rawValue = '';

  if (resolutionSource === 'ffprobe') {
    const videoStream = args.inputFileObj?.ffProbeData?.streams?.find(
      (s: Record<string, unknown>) => s.codec_type === 'video',
    );
    if (videoStream?.height) {
      rawValue = String(videoStream.height);
      args.jobLog(`Resolution from ffprobe: ${rawValue} (height)`);
    }
  } else if (resolutionSource === 'flowVariable') {
    rawValue = String(args.variables?.user?.[variableName] ?? '');
    args.jobLog(`Resolution from flow variable "${variableName}": "${rawValue}"`);
  }

  if (!rawValue) {
    args.jobLog(`Could not determine resolution (source: ${resolutionSource})`);
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }

  const mapping = parseMapping(resolutionMapping);
  const mappedValue = mapping[rawValue] ?? rawValue;
  // eslint-disable-next-line no-template-curly-in-string
  const suffix = suffixTemplate.replace(/\$\{resolution\}/g, mappedValue);

  args.jobLog(`Mapped resolution: "${rawValue}" → "${mappedValue}", suffix: "${suffix}"`);

  const currentPath = args.inputFileObj._id;
  const fileName = getFileName(currentPath);
  const container = getContainer(currentPath);
  const fileDir = getFileAbosluteDir(currentPath);
  const newPath = `${fileDir}/${fileName}${suffix}.${container}`;

  if (currentPath === newPath) {
    args.jobLog('Filename unchanged after appending suffix, skipping rename.');
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 1,
      variables: args.variables,
    };
  }

  args.jobLog(`Renaming: ${fileName}.${container} → ${fileName}${suffix}.${container}`);

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
