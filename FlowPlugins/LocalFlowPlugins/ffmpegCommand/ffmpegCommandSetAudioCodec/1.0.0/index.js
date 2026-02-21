"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var flowUtils_1 = require("../../../../FlowHelpers/1.0.0/interfaces/flowUtils");
var LOSSLESS_CODECS = new Set([
    'truehd', 'flac', 'alac', 'mlp',
    'pcm_s16le', 'pcm_s24le', 'pcm_s32le',
    'pcm_f32le', 'pcm_f64le',
    'pcm_s16be', 'pcm_s24be', 'pcm_s32be',
    'pcm_bluray', 'pcm_dvd', 'pcm_alaw', 'pcm_mulaw',
]);
var isLossless = function (codecName, profile) {
    if (LOSSLESS_CODECS.has(codecName))
        return true;
    if (codecName === 'dts' && profile === 'DTS-HD MA')
        return true;
    return false;
};
var LOSSY_CODEC_RANK = {
    eac3: 0,
    dts: 1,
    ac3: 2,
    aac: 3,
    opus: 4,
    mp3: 5,
};
var isDowngrade = function (sourceCodec, targetCodec) {
    var _a, _b;
    var sourceRank = (_a = LOSSY_CODEC_RANK[sourceCodec]) !== null && _a !== void 0 ? _a : -1;
    var targetRank = (_b = LOSSY_CODEC_RANK[targetCodec]) !== null && _b !== void 0 ? _b : -1;
    return targetRank > sourceRank;
};
var parseBitrateToNumber = function (bitrate) {
    var trimmed = bitrate.trim().toLowerCase();
    if (trimmed.endsWith('k'))
        return parseFloat(trimmed) * 1000;
    if (trimmed.endsWith('m'))
        return parseFloat(trimmed) * 1000000;
    return parseFloat(trimmed);
};
var CODEC_TO_ENCODER = {
    aac: 'aac',
    ac3: 'ac3',
    eac3: 'eac3',
    opus: 'libopus',
    flac: 'flac',
    mp3: 'libmp3lame',
};
var details = function () { return ({
    name: 'Set Audio Codec',
    description: "Set audio codec with safety guards.\n    \\n\\nHard guards (not configurable):\n    \\n- Never lossy -> lossless (lossy source will never be encoded to a lossless codec)\n    \\n- Never upmix (output channels never exceed source channels)\n    \\n\\nLossy source re-encodes only when the target codec is a downgrade OR source bitrate exceeds the configured bitrate.",
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
            label: 'Target Codec',
            name: 'targetCodec',
            type: 'string',
            defaultValue: 'aac',
            inputUI: {
                type: 'dropdown',
                options: ['aac', 'ac3', 'eac3', 'opus', 'flac', 'copy'],
            },
            tooltip: 'Desired output codec for audio streams.'
                + '\\nLossy source will never be encoded to a lossless codec (guard).'
                + '\\nUse "copy" to pass all streams through unchanged.',
        },
        {
            label: 'Max Channels',
            name: 'targetMaxChannels',
            type: 'number',
            defaultValue: '2',
            inputUI: {
                type: 'dropdown',
                options: ['2', '6', '8'],
            },
            tooltip: 'Maximum output channel count.'
                + '\\n2 = stereo, 6 = 5.1, 8 = 7.1.'
                + '\\nSource channels are never exceeded (no upmixing).',
        },
        {
            label: 'Bitrate',
            name: 'bitrate',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Target bitrate for lossy encoding (e.g. 128k, 640k).'
                + '\\nAlso used as threshold: lossy source is re-encoded when its bitrate exceeds this value.'
                + '\\nLeave empty to skip bitrate targeting (codec hierarchy still applies).',
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
var plugin = function (args) {
    var _a, _b, _c, _d;
    var lib = require('../../../../../methods/lib')();
    // eslint-disable-next-line no-param-reassign
    args.inputs = lib.loadDefaultValues(args.inputs, details);
    (0, flowUtils_1.checkFfmpegCommandInit)(args);
    var targetCodec = String(args.inputs.targetCodec);
    var targetMaxChannels = Number(args.inputs.targetMaxChannels);
    var bitrateStr = String(args.inputs.bitrate).trim();
    var targetBitrate = bitrateStr ? parseBitrateToNumber(bitrateStr) : 0;
    var streams = args.variables.ffmpegCommand.streams;
    for (var i = 0; i < streams.length; i += 1) {
        var stream = streams[i];
        if (stream.codec_type !== 'audio' || stream.removed)
            continue;
        var sourceCodec = String(stream.codec_name);
        var sourceProfile = String((_a = stream.profile) !== null && _a !== void 0 ? _a : '');
        var sourceChannels = Number((_b = stream.channels) !== null && _b !== void 0 ? _b : 2);
        var sourceBitrate = Number((_c = stream.bit_rate) !== null && _c !== void 0 ? _c : 0);
        var sourceLossless = isLossless(sourceCodec, sourceProfile);
        var targetIsLossless = LOSSLESS_CODECS.has(targetCodec) || targetCodec === 'flac';
        var outputChannels = Math.min(sourceChannels, targetMaxChannels);
        if (targetCodec === 'copy') {
            args.jobLog("Stream ".concat(i, " (").concat(sourceCodec, " ").concat(sourceChannels, "ch): copy (target is copy)"));
            continue;
        }
        // Guard: never lossy -> lossless
        if (!sourceLossless && targetIsLossless) {
            args.jobLog("Stream ".concat(i, " (").concat(sourceCodec, " ").concat(sourceChannels, "ch): copy \u2014 guard: lossy source, lossless target blocked"));
            continue;
        }
        var shouldEncode = false;
        if (sourceLossless) {
            shouldEncode = true;
            args.jobLog("Stream ".concat(i, " (").concat(sourceCodec, " ").concat(sourceChannels, "ch): encode \u2014 lossless source \u2192 ").concat(targetCodec, " ").concat(outputChannels, "ch"));
        }
        else {
            var codecDowngrade = isDowngrade(sourceCodec, targetCodec);
            var bitrateExceeded = targetBitrate > 0 && sourceBitrate > targetBitrate;
            if (codecDowngrade) {
                shouldEncode = true;
                args.jobLog("Stream ".concat(i, " (").concat(sourceCodec, " ").concat(sourceChannels, "ch ").concat(sourceBitrate, "bps): encode")
                    + " \u2014 codec downgrade ".concat(sourceCodec, " \u2192 ").concat(targetCodec));
            }
            else if (bitrateExceeded) {
                shouldEncode = true;
                args.jobLog("Stream ".concat(i, " (").concat(sourceCodec, " ").concat(sourceChannels, "ch ").concat(sourceBitrate, "bps): encode")
                    + " \u2014 source bitrate ".concat(sourceBitrate, " exceeds target ").concat(targetBitrate));
            }
            else {
                args.jobLog("Stream ".concat(i, " (").concat(sourceCodec, " ").concat(sourceChannels, "ch ").concat(sourceBitrate, "bps): copy")
                    + " \u2014 no downgrade and bitrate within target");
            }
        }
        if (shouldEncode) {
            var encoder = (_d = CODEC_TO_ENCODER[targetCodec]) !== null && _d !== void 0 ? _d : targetCodec;
            stream.outputArgs.push('-c:{outputIndex}', encoder);
            stream.outputArgs.push('-ac', String(outputChannels));
            if (targetBitrate > 0 && !targetIsLossless) {
                stream.outputArgs.push('-b:a:{outputTypeIndex}', bitrateStr);
            }
            args.variables.ffmpegCommand.shouldProcess = true;
        }
    }
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: args.variables,
    };
};
exports.plugin = plugin;
