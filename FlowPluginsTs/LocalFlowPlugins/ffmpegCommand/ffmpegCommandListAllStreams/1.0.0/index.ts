import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from 'FlowHelpers/1.0.0/interfaces/interfaces';
import { checkFfmpegCommandInit } from 'FlowHelpers/1.0.0/interfaces/flowUtils';

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = (): IpluginDetails => ({
  name: 'List all Streams',
  description: 'List all Streams',
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
    // {
    //   label: 'Property To Check',
    //   name: 'propertyToCheck',
    //   type: 'string',
    //   defaultValue: 'codec_name',
    //   inputUI: {
    //     type: 'text',
    //   },
    //   tooltip: `
    //     Enter one stream property to check.
    //     \\nExample:\\n
    //     codec_name
    //     \\nExample:\\n
    //     tags.language
    //     `,
    // },
    // {
    //   label: 'Values To Remove',
    //   name: 'valuesToRemove',
    //   type: 'string',
    //   defaultValue: 'aac',
    //   inputUI: {
    //     type: 'text',
    //   },
    //   tooltip: `
    //     Enter values of the property above to remove. For example, if removing by codec_name, could enter ac3,aac:
    //     \\nExample:\\n
    //     ac3,aac
    //     `,
    // },
    // {
    //   label: 'Condition',
    //   name: 'condition',
    //   type: 'string',
    //   defaultValue: 'includes',
    //   inputUI: {
    //     type: 'dropdown',
    //     options: ['includes', 'not_includes'],
    //   },
    //   tooltip: `
    //   Specify whether to remove streams that include or do not include the values above.
    //   `,
    // },
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

  args.variables.ffmpegCommand.streams.forEach((stream) => {
    args.jobLog(`Stream ${stream.index} has codec ${stream.codec_name}`);
    args.jobLog(`Full stream object: ${JSON.stringify(stream)}`);
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
