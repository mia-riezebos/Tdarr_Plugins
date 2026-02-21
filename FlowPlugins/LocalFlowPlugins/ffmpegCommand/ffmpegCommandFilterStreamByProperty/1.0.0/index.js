"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var flowUtils_1 = require("../../../../FlowHelpers/1.0.0/interfaces/flowUtils");
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
var details = function () { return ({
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
            tooltip: "\n        Specify which codec_type to target. Stream filter will only apply to streams of that type.\n      ",
        },
        {
            label: 'Property To Check',
            name: 'propertyToCheck',
            type: 'string',
            defaultValue: 'tags.language',
            inputUI: {
                type: 'text',
            },
            tooltip: "\n        Enter one stream property to check.\n\n        \\nExample:\\n\n        codec_name\n\n        \\nExample:\\n\n        tags.language\n\n        \\nExample:\\n\n        channels\n        ",
        },
        {
            label: 'Values To Filter',
            name: 'valuesToFilter',
            type: 'string',
            defaultValue: 'eng',
            inputUI: {
                type: 'text',
            },
            tooltip: "\n        Enter values of the property above to remove. For example, if removing by codec_name, could enter ac3,aac:\n\n        \\nExample:\\n\n        ac3,aac\n\n        \\nExample:\\n\n        eng,fre,dut\n        ",
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
            tooltip: "\n      Specify whether to remove the streams that match the values above, or the ones that don't match the values above.\n      ",
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
    (0, flowUtils_1.checkFfmpegCommandInit)(args);
    var targetCodecType = String(args.inputs.targetCodecType);
    var propertyToCheck = String(args.inputs.propertyToCheck).trim();
    var valuesToFilter = String(args.inputs.valuesToFilter)
        .trim()
        .split(',')
        .map(function (item) { return item.trim(); });
    var condition = String(args.inputs.condition);
    args.variables.ffmpegCommand.streams.forEach(function (stream) {
        var _a;
        if (stream.codec_type !== targetCodecType)
            return;
        var target = '';
        if (propertyToCheck.includes('.')) {
            var parts = propertyToCheck.split('.');
            target = (_a = stream[parts[0]]) === null || _a === void 0 ? void 0 : _a[parts[1]];
        }
        else {
            target = stream[propertyToCheck];
        }
        if (!target)
            return;
        var prop = String(target).toLowerCase();
        var prefix = "Marking stream with index ".concat(stream.index, " as removed because ").concat(propertyToCheck, " of ").concat(prop);
        var streamMatches = valuesToFilter.map(function (value) { return value.toLowerCase(); }).includes(prop);
        switch (condition) {
            case 'match':
                if (streamMatches) {
                    args.jobLog("".concat(prefix, " matches ").concat(valuesToFilter, "\n"));
                    stream.removed = true;
                }
                break;
            case 'no_match':
                if (!streamMatches) {
                    args.jobLog("".concat(prefix, " does not match ").concat(valuesToFilter, "\n"));
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
exports.plugin = plugin;
