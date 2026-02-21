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
    name: 'Replace Release Group',
    description: 'Uses the Radarr/Sonarr parse API to identify the release group in a filename,'
        + ' then replaces it with a configurable string.'
        + ' Useful for tagging transcoded files with a custom release group for Custom Format scoring.',
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
            label: 'Arr',
            name: 'arr',
            type: 'string',
            defaultValue: 'radarr',
            inputUI: {
                type: 'dropdown',
                options: ['radarr', 'sonarr'],
            },
            tooltip: 'Which arr instance to use for parsing the filename.',
        },
        {
            label: 'Arr API Key',
            name: 'arr_api_key',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'API key for the arr instance.',
        },
        {
            label: 'Arr Host',
            name: 'arr_host',
            type: 'string',
            defaultValue: 'http://192.168.1.1:7878',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Host URL for the arr instance.'
                + '\\nExample:\\n'
                + 'http://192.168.1.1:7878\\n'
                + 'http://192.168.1.1:8989\\n',
        },
        {
            label: 'New Release Group',
            name: 'newReleaseGroup',
            type: 'string',
            defaultValue: 'mCX',
            inputUI: {
                type: 'text',
            },
            tooltip: 'The release group string to replace the existing one with.',
        },
        {
            label: 'If No Group Found',
            name: 'noGroupBehavior',
            type: 'string',
            defaultValue: 'append',
            inputUI: {
                type: 'dropdown',
                options: ['append', 'skip'],
            },
            tooltip: 'What to do when the arr parse API returns no release group.'
                + '\\nappend: insert -NewGroup before the file extension.'
                + '\\nskip: leave the file unchanged and route to output 2.',
        },
    ],
    outputs: [
        {
            number: 1,
            tooltip: 'Release group replaced or appended',
        },
        {
            number: 2,
            tooltip: 'No release group found (skip mode) or parse failed',
        },
    ],
}); };
exports.details = details;
var replaceGroupInFilename = function (fileName, oldGroup, newGroup) {
    var bracketPatterns = [
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '{', close: '}' },
    ];
    for (var i = 0; i < bracketPatterns.length; i += 1) {
        var _a = bracketPatterns[i], open_1 = _a.open, close_1 = _a.close;
        var bracketed = "".concat(open_1).concat(oldGroup).concat(close_1);
        var idx = fileName.indexOf(bracketed);
        if (idx !== -1) {
            return fileName.substring(0, idx) + "".concat(open_1).concat(newGroup).concat(close_1) + fileName.substring(idx + bracketed.length);
        }
    }
    var hyphenated = "-".concat(oldGroup);
    var hIdx = fileName.indexOf(hyphenated);
    if (hIdx !== -1) {
        return fileName.substring(0, hIdx) + "-".concat(newGroup) + fileName.substring(hIdx + hyphenated.length);
    }
    var plainIdx = fileName.indexOf(oldGroup);
    if (plainIdx !== -1) {
        return fileName.substring(0, plainIdx) + newGroup + fileName.substring(plainIdx + oldGroup.length);
    }
    return fileName;
};
var plugin = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var lib, arr, arrHost, newReleaseGroup, noGroupBehavior, headers, currentPath, fileName, container, fileDir, releaseGroup, parseResponse, err_1, newFileName, newPath;
    var _a, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                lib = require('../../../../../methods/lib')();
                // eslint-disable-next-line no-param-reassign
                args.inputs = lib.loadDefaultValues(args.inputs, details);
                arr = String(args.inputs.arr);
                arrHost = String(args.inputs.arr_host).trim().replace(/\/$/, '');
                newReleaseGroup = String(args.inputs.newReleaseGroup).trim();
                noGroupBehavior = String(args.inputs.noGroupBehavior);
                headers = {
                    'Content-Type': 'application/json',
                    'X-Api-Key': String(args.inputs.arr_api_key),
                    Accept: 'application/json',
                };
                currentPath = args.inputFileObj._id;
                fileName = (0, fileUtils_1.getFileName)(currentPath);
                container = (0, fileUtils_1.getContainer)(currentPath);
                fileDir = (0, fileUtils_1.getFileAbosluteDir)(currentPath);
                args.jobLog("Parsing filename via ".concat(arr, ": ").concat(fileName));
                releaseGroup = '';
                _g.label = 1;
            case 1:
                _g.trys.push([1, 3, , 4]);
                return [4 /*yield*/, args.deps.axios({
                        method: 'get',
                        url: "".concat(arrHost, "/api/v3/parse?title=").concat(encodeURIComponent(fileName)),
                        headers: headers,
                    })];
            case 2:
                parseResponse = _g.sent();
                releaseGroup = arr === 'radarr'
                    ? ((_c = (_b = (_a = parseResponse.data) === null || _a === void 0 ? void 0 : _a.parsedMovieInfo) === null || _b === void 0 ? void 0 : _b.releaseGroup) !== null && _c !== void 0 ? _c : '')
                    : ((_f = (_e = (_d = parseResponse.data) === null || _d === void 0 ? void 0 : _d.parsedEpisodeInfo) === null || _e === void 0 ? void 0 : _e.releaseGroup) !== null && _f !== void 0 ? _f : '');
                args.jobLog("Parse result \u2014 release group: \"".concat(releaseGroup || '(none)', "\""));
                return [3 /*break*/, 4];
            case 3:
                err_1 = _g.sent();
                args.jobLog("Failed to parse filename via ".concat(arr, ": ").concat(err_1));
                return [2 /*return*/, {
                        outputFileObj: args.inputFileObj,
                        outputNumber: 2,
                        variables: args.variables,
                    }];
            case 4:
                if (releaseGroup) {
                    newFileName = replaceGroupInFilename(fileName, releaseGroup, newReleaseGroup);
                    args.jobLog("Replacing release group \"".concat(releaseGroup, "\" \u2192 \"").concat(newReleaseGroup, "\""));
                }
                else if (noGroupBehavior === 'append') {
                    newFileName = "".concat(fileName, "-").concat(newReleaseGroup);
                    args.jobLog("No release group found, appending \"-".concat(newReleaseGroup, "\""));
                }
                else {
                    args.jobLog('No release group found, skipping (skip mode)');
                    return [2 /*return*/, {
                            outputFileObj: args.inputFileObj,
                            outputNumber: 2,
                            variables: args.variables,
                        }];
                }
                newPath = "".concat(fileDir, "/").concat(newFileName, ".").concat(container);
                if (currentPath === newPath) {
                    args.jobLog('Filename unchanged after replacement, skipping rename.');
                    return [2 /*return*/, {
                            outputFileObj: args.inputFileObj,
                            outputNumber: 1,
                            variables: args.variables,
                        }];
                }
                args.jobLog("Renaming: ".concat(fileName, ".").concat(container, " \u2192 ").concat(newFileName, ".").concat(container));
                return [4 /*yield*/, (0, fileMoveOrCopy_1.default)({
                        operation: 'move',
                        sourcePath: currentPath,
                        destinationPath: newPath,
                        args: args,
                    })];
            case 5:
                _g.sent();
                return [2 /*return*/, {
                        outputFileObj: __assign(__assign({}, args.inputFileObj), { _id: newPath }),
                        outputNumber: 1,
                        variables: args.variables,
                    }];
        }
    });
}); };
exports.plugin = plugin;
