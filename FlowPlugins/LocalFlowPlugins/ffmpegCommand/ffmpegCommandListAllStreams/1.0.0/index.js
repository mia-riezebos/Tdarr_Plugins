"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var flowUtils_1 = require("../../../../FlowHelpers/1.0.0/interfaces/flowUtils");
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
var details = function () { return ({
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
}); };
exports.details = details;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var plugin = function (args) {
    var lib = require('../../../../../methods/lib')();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
    args.inputs = lib.loadDefaultValues(args.inputs, details);
    (0, flowUtils_1.checkFfmpegCommandInit)(args);
    args.variables.ffmpegCommand.streams.forEach(function (stream) {
        args.jobLog("Stream ".concat(stream.index, " has codec ").concat(stream.codec_name));
        args.jobLog("Full stream object: ".concat(JSON.stringify(stream)));
    });
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: args.variables,
    };
};
exports.plugin = plugin;
