"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var flowUtils_1 = require("../../../../FlowHelpers/1.0.0/interfaces/flowUtils");
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
var details = function () { return ({
    name: 'Filter Best Quality Per Language',
    description: "\n    Filter Best Quality Per Language\n\n    \\nRequires the streams to be ordered by quality before this plugin is run.\n    ",
    style: {
        borderColor: '#6efefc',
    },
    tags: 'audio',
    isStartPlugin: false,
    pType: '',
    requiresVersion: '2.11.01',
    sidebarPosition: -1,
    icon: '',
    inputs: [
        {
            label: 'Codec Order',
            name: 'codecOrder',
            type: 'string',
            defaultValue: 
            // eslint-disable-next-line max-len
            'truehd,dts,eac3,ac3,flac,alac,pcm_alaw,pcm_bluray,pcm_dvd,pcm_f16le,pcm_f24le,pcm_f32be,pcm_f32le,pcm_f64be,pcm_f64le,pcm_lxf,pcm_mulaw,pcm_s16be,pcm_s16be_planar,pcm_s16le,pcm_s16le_planar,pcm_s24be,pcm_s24daud,pcm_s24le,pcm_s24le_planar,pcm_s32be,pcm_s32le,pcm_s32le_planar,pcm_s64be,pcm_s64le,pcm_s8,pcm_s8_planar,pcm_sga,pcm_u16be,pcm_u16le,pcm_u24be,pcm_u24le,pcm_u32be,pcm_u32le,pcm_u8aac,dvaudio,aptx,aptx_hd,aac,aac_latm,mp3,opus',
            inputUI: {
                type: 'text',
            },
            tooltip: "Specify the codec order, separated by commas. Leave blank to disable.\n\n          \\nExample:\\n\n          truehd,dts,eac3,ac3,flac,aac,mp3,opus",
        },
        {
            label: 'Process Order',
            name: 'processOrder',
            type: 'string',
            defaultValue: 'codec_type,codec_name,bit_rate,channels,sample_rate,sample_fmt',
            inputUI: {
                type: 'text',
            },
            tooltip: "Specify which property is preferred for \"quality\", separated by commas.\n\n          \\nExample:\\n\n          codec_type,codec_name,bit_rate,channels,sample_rate,sample_fmt",
        },
        {
            label: 'Keep Commentary Tracks',
            name: 'keepCommentaryTracks',
            type: 'boolean',
            defaultValue: 'false',
            inputUI: {
                type: 'switch',
            },
            tooltip: "\n      Specify whether to keep commentary tracks.\n      \\n\n\n      Default is false.\n      ",
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
    var processOrder = String(args.inputs.processOrder).trim();
    var codecOrder = String(args.inputs.codecOrder).trim();
    var keepCommentaryTracks = Boolean(args.inputs.keepCommentaryTracks);
    var streams = JSON.parse(JSON.stringify(args.variables.ffmpegCommand.streams));
    var originalStreams = JSON.stringify(streams);
    var sortStreams = function (sortStrategy) {
        var _a, _b;
        var sortOrder = (_b = (_a = sortStrategy.sortOrder) === null || _a === void 0 ? void 0 : _a.split(',')) !== null && _b !== void 0 ? _b : null;
        args.jobLog("Sorting streams using ".concat(sortStrategy.getValue));
        streams.sort(function (a, b) {
            try {
                var aValue = sortStrategy.getValue(a);
                var bValue = sortStrategy.getValue(b);
                args.jobLog("Comparing ".concat(aValue, " and ").concat(bValue));
                if (!aValue || !bValue)
                    return 0; // Keep the original order
                var isImageStream = function (stream) {
                    var _a, _b;
                    return ((_a = stream.codec_long_name) === null || _a === void 0 ? void 0 : _a.includes('image'))
                        || ((_b = stream.codec_name) === null || _b === void 0 ? void 0 : _b.includes('png'));
                };
                if (isImageStream(a) && !isImageStream(b))
                    return 1;
                if (!isImageStream(a) && isImageStream(b))
                    return -1;
                if (isImageStream(a) && isImageStream(b))
                    return 0;
                if (sortOrder) {
                    var aIndex = sortOrder.indexOf(String(aValue).toLowerCase());
                    var bIndex = sortOrder.indexOf(String(bValue).toLowerCase());
                    return aIndex - bIndex;
                }
                return Number(aValue) - Number(bValue);
            }
            catch (err) {
                args.jobLog("Error sorting streams: ".concat(err));
                return 0;
            }
        });
    };
    var sortStrategies = {
        codec_type: {
            getValue: function (stream) { return stream.codec_type; },
            sortOrder: 'video,audio,subtitle',
        },
        codec_name: {
            getValue: function (stream) { return stream.codec_name; },
            sortOrder: codecOrder,
        },
        bit_rate: {
            getValue: function (stream) { return Number(stream.bit_rate); },
        },
        channels: {
            getValue: function (stream) { return Number(stream.channels); },
        },
        sample_rate: {
            getValue: function (stream) { return Number(stream.sample_rate); },
        },
        sample_fmt: {
            getValue: function (stream) { return stream.sample_fmt; },
        },
    };
    var processOrderArr = processOrder.split(',').reverse();
    processOrderArr.forEach(function (property) {
        var sortStrategy = sortStrategies[property];
        args.jobLog("Sorting streams using ".concat(property));
        if (sortStrategy) {
            sortStreams(sortStrategy);
        }
    });
    // Only include the first stream per language
    streams.forEach(function (stream, index, self) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (index === 0)
            return;
        if (stream.codec_type !== 'audio')
            return;
        args.jobLog("\n      Checking whether stream ".concat(index, ", with title ").concat((_a = stream.tags) === null || _a === void 0 ? void 0 : _a.title, "\n      is the first audio stream in its language ").concat((_b = stream.tags) === null || _b === void 0 ? void 0 : _b.language, "\n    "));
        var prevStream = self[index - 1];
        if (prevStream.codec_type !== 'audio')
            return;
        if (((_c = prevStream.tags) === null || _c === void 0 ? void 0 : _c.language) !== ((_d = stream.tags) === null || _d === void 0 ? void 0 : _d.language))
            return;
        if (keepCommentaryTracks && ((_f = (_e = stream.tags) === null || _e === void 0 ? void 0 : _e.title) === null || _f === void 0 ? void 0 : _f.toLowerCase().includes('commentary')))
            return;
        args.jobLog("\n      Stream ".concat(index, " with title ").concat((_g = stream.tags) === null || _g === void 0 ? void 0 : _g.title, " is the first audio stream\n      in its language ").concat((_h = stream.tags) === null || _h === void 0 ? void 0 : _h.language, ", therefore it will be marked as removed\n    "));
        stream.removed = true;
    });
    if (JSON.stringify(streams) !== originalStreams) {
        args.jobLog('Filtered streams do not match original streams, updating original streams');
        args.variables.ffmpegCommand.shouldProcess = true;
        args.variables.ffmpegCommand.streams = streams;
    }
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: args.variables,
    };
};
exports.plugin = plugin;
