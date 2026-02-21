import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';
import { checkFfmpegCommandInit } from '../../../../FlowHelpers/1.0.0/interfaces/flowUtils';

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = (): IpluginDetails => ({
  name: 'Filter Streams By Property',
  description: 'Filter Streams By Property',
  style: {
    borderColor: '#6efefc',
  },
  tags: 'video',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: '',
  inputs: [
    {
      label: 'Target Codec Type',
      name: 'targetCodecType',
      type: 'string',
      defaultValue: 'audio',
      inputUI: {
        type: 'dropdown',
        options: ['video', 'audio', 'subtitle'],
      },
      tooltip: `
        Specify which codec_type to target. Stream filter will only apply to streams of that type.
      `,
    },
    {
      label: 'Property To Check',
      name: 'propertyToCheck',
      type: 'string',
      defaultValue: 'tags.language',
      inputUI: {
        type: 'text',
      },
      tooltip: `
        Enter one stream property to check.

        \\nExample:\\n
        codec_name

        \\nExample:\\n
        tags.language

        \\nExample:\\n
        channels
        `,
    },
    {
      label: 'Values To Filter',
      name: 'valuesToFilter',
      type: 'string',
      defaultValue: 'eng',
      inputUI: {
        type: 'text',
      },
      tooltip: `
        Enter values of the property above to remove. For example, if removing by codec_name, could enter ac3,aac:

        \\nExample:\\n
        ac3,aac

        \\nExample:\\n
        eng,fre,dut
        `,
    },
    {
      label: 'Condition',
      name: 'condition',
      type: 'string',
      defaultValue: 'no_match',
      inputUI: {
        type: 'dropdown',
        options: ['match', 'no_match'],
      },
      tooltip: `
      Specify whether to remove the streams that match the values above, or the ones that don't match the values above.
      `,
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (args: IpluginInputArgs): IpluginOutputArgs => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  checkFfmpegCommandInit(args);

  const targetCodecType = String(args.inputs.targetCodecType);
  const propertyToCheck = String(args.inputs.propertyToCheck).trim();
  const valuesToFilter = String(args.inputs.valuesToFilter)
    .trim()
    .split(',')
    .map((item) => item.trim());
  const condition = String(args.inputs.condition);

  args.variables.ffmpegCommand.streams.forEach((stream) => {
    if (stream.codec_type !== targetCodecType) return;

    let target: unknown = '';
    if (propertyToCheck.includes('.')) {
      const parts = propertyToCheck.split('.');
      target = (stream as Record<string, unknown>)[parts[0]]?.[parts[1] as keyof object];
    } else {
      target = (stream as Record<string, unknown>)[propertyToCheck];
    }

    if (!target) return;

    const prop = String(target).toLowerCase();
    const prefix = `Marking stream with index ${stream.index} as removed because ${propertyToCheck} of ${prop}`;
    const streamMatches = valuesToFilter.map((value) => value.toLowerCase()).includes(prop);

    switch (condition) {
      case 'match':
        if (streamMatches) {
          args.jobLog(`${prefix} matches ${valuesToFilter}\n`);
          stream.removed = true;
        }
        break;
      case 'no_match':
        if (!streamMatches) {
          args.jobLog(`${prefix} does not match ${valuesToFilter}\n`);
          stream.removed = true;
        }
        break;
      default:
        break;
    }
  });

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
