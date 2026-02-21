"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var fileMoveOrCopy_1 = __importDefault(require("../../../../FlowHelpers/1.0.0/fileMoveOrCopy"));
var fileUtils_1 = require("../../../../FlowHelpers/1.0.0/fileUtils");
var details = function () { return ({
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
}); };
exports.details = details;
var parseMapping = function (mapping) {
    var result = {};
    if (!mapping.trim())
        return result;
    var pairs = mapping.split(',');
    for (var i = 0; i < pairs.length; i += 1) {
        var eqIdx = pairs[i].indexOf('=');
        if (eqIdx > 0) {
            var key = pairs[i].substring(0, eqIdx).trim();
            var value = pairs[i].substring(eqIdx + 1).trim();
            result[key] = value;
        }
    }
    return result;
};
var plugin = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var lib, resolutionSource, variableName, resolutionMapping, suffixTemplate, rawValue, videoStream, mapping, mappedValue, suffix, currentPath, fileName, container, fileDir, newPath;
    var _a, _b, _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                lib = require('../../../../../methods/lib')();
                // eslint-disable-next-line no-param-reassign
                args.inputs = lib.loadDefaultValues(args.inputs, details);
                resolutionSource = String(args.inputs.resolutionSource);
                variableName = String(args.inputs.variableName).trim();
                resolutionMapping = String(args.inputs.resolutionMapping);
                suffixTemplate = String(args.inputs.suffixTemplate);
                rawValue = '';
                if (resolutionSource === 'ffprobe') {
                    videoStream = (_c = (_b = (_a = args.inputFileObj) === null || _a === void 0 ? void 0 : _a.ffProbeData) === null || _b === void 0 ? void 0 : _b.streams) === null || _c === void 0 ? void 0 : _c.find(function (s) { return s.codec_type === 'video'; });
                    if (videoStream === null || videoStream === void 0 ? void 0 : videoStream.height) {
                        rawValue = String(videoStream.height);
                        args.jobLog("Resolution from ffprobe: ".concat(rawValue, " (height)"));
                    }
                }
                else if (resolutionSource === 'flowVariable') {
                    rawValue = String((_f = (_e = (_d = args.variables) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e[variableName]) !== null && _f !== void 0 ? _f : '');
                    args.jobLog("Resolution from flow variable \"".concat(variableName, "\": \"").concat(rawValue, "\""));
                }
                if (!rawValue) {
                    args.jobLog("Could not determine resolution (source: ".concat(resolutionSource, ")"));
                    return [2 /*return*/, {
                            outputFileObj: args.inputFileObj,
                            outputNumber: 2,
                            variables: args.variables,
                        }];
                }
                mapping = parseMapping(resolutionMapping);
                mappedValue = (_g = mapping[rawValue]) !== null && _g !== void 0 ? _g : rawValue;
                suffix = suffixTemplate.replace(/\$\{resolution\}/g, mappedValue);
                args.jobLog("Mapped resolution: \"".concat(rawValue, "\" \u2192 \"").concat(mappedValue, "\", suffix: \"").concat(suffix, "\""));
                currentPath = args.inputFileObj._id;
                fileName = (0, fileUtils_1.getFileName)(currentPath);
                container = (0, fileUtils_1.getContainer)(currentPath);
                fileDir = (0, fileUtils_1.getFileAbosluteDir)(currentPath);
                newPath = "".concat(fileDir, "/").concat(fileName).concat(suffix, ".").concat(container);
                if (currentPath === newPath) {
                    args.jobLog('Filename unchanged after appending suffix, skipping rename.');
                    return [2 /*return*/, {
                            outputFileObj: args.inputFileObj,
                            outputNumber: 1,
                            variables: args.variables,
                        }];
                }
                args.jobLog("Renaming: ".concat(fileName, ".").concat(container, " \u2192 ").concat(fileName).concat(suffix, ".").concat(container));
                return [4 /*yield*/, (0, fileMoveOrCopy_1.default)({
                        operation: 'move',
                        sourcePath: currentPath,
                        destinationPath: newPath,
                        args: args,
                    })];
            case 1:
                _h.sent();
                return [2 /*return*/, {
                        outputFileObj: __assign(__assign({}, args.inputFileObj), { _id: newPath }),
                        outputNumber: 1,
                        variables: args.variables,
                    }];
        }
    });
}); };
exports.plugin = plugin;
