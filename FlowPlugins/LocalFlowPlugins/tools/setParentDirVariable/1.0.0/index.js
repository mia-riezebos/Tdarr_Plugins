"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
var details = function () { return ({
    name: 'Set Parent Dir Variable',
    description: 'Set a parentDir variable, up to a specified depth',
    style: {
        borderColor: 'blue',
    },
    tags: '',
    isStartPlugin: false,
    pType: '',
    requiresVersion: '2.11.01',
    sidebarPosition: 1,
    icon: '',
    inputs: [
        {
            label: 'Depth',
            name: 'depth',
            type: 'number',
            defaultValue: '1',
            inputUI: {
                type: 'text',
            },
            tooltip: "Specify the depth of the parents, how far up the tree to go.\n\n      The the parent directory string will be stored in the parentDir variable.\n      Use it with {{{args.variables.user.parentDir}}}",
        },
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
    var depth = Number(args.inputs.depth);
    var value = args.inputFileObj._id.split('/').slice(-(depth + 1), -1).join('/');
    args.jobLog("Input file obj id: ".concat(args.inputFileObj._id));
    args.jobLog("Depth: ".concat(depth));
    args.jobLog("Value: ".concat(value));
    if (!args.variables.user) {
        args.variables.user = {};
    }
    args.jobLog("Setting parentDir variable to ".concat(value));
    args.variables.user.parentDir = value;
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: args.variables,
    };
};
exports.plugin = plugin;
