"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var fileUtils_1 = require("../../../../FlowHelpers/1.0.0/fileUtils");
var details = function () { return ({
    name: 'Check File Exists (Regex)',
    description: 'Checks if any file in a directory matches a configurable regex pattern.'
        + ' Directory can come from a flow variable or the input file dir.'
        + ' Useful for checking if a transcoded version already exists before processing.',
    style: {
        borderColor: 'orange',
    },
    tags: '',
    isStartPlugin: false,
    pType: '',
    requiresVersion: '2.11.01',
    sidebarPosition: -1,
    icon: 'faQuestion',
    inputs: [
        {
            label: 'Directory Source',
            name: 'directorySource',
            type: 'string',
            defaultValue: 'flowVariable',
            inputUI: {
                type: 'dropdown',
                options: ['flowVariable', 'inputFileDir'],
            },
            tooltip: 'Where to get the directory path from.'
                + '\\nflowVariable: reads from a user flow variable.'
                + '\\ninputFileDir: uses the directory of the current input file.',
        },
        {
            label: 'Directory Variable',
            name: 'directoryVariable',
            type: 'string',
            defaultValue: 'parentDir',
            inputUI: {
                type: 'text',
            },
            tooltip: 'When source is flowVariable, the name of the user variable containing the directory path.'
                + '\\nAccessed as args.variables.user[directoryVariable].',
        },
        {
            label: 'Match Regex',
            name: 'matchRegex',
            type: 'string',
            defaultValue: '\\.(mkv|mp4|avi)$',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Regex pattern to test against each filename.'
                + '\\nUses substring match by default. Use ^ and $ anchors for full match.'
                + '\\nExamples:'
                + '\\n  \\[(?:720p|1080p|2160p)\\] — matches resolution tags'
                + '\\n  \\[(?:Bluray|Remux)-(?:1080p|2160p)\\] — matches quality tags',
        },
        {
            label: 'File Extensions',
            name: 'fileExtensions',
            type: 'string',
            defaultValue: 'mkv,mp4,avi,ts,wmv,mov',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Comma-separated file extensions to consider.'
                + '\\nFiles with other extensions are ignored before regex matching.'
                + '\\nLeave empty to include all files.',
        },
        {
            label: 'Recursive',
            name: 'recursive',
            type: 'string',
            defaultValue: 'false',
            inputUI: {
                type: 'dropdown',
                options: ['false', 'true'],
            },
            tooltip: 'When true, scan subdirectories recursively.',
        },
    ],
    outputs: [
        {
            number: 1,
            tooltip: 'Matching file found (exists)',
        },
        {
            number: 2,
            tooltip: 'No matching file found or directory does not exist',
        },
    ],
}); };
exports.details = details;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var scanDirectory = function (dirPath, regex, extensions, recursive, fsextra) { return __awaiter(void 0, void 0, void 0, function () {
    var entries, _err_1, i, entry, match, name_1, ext;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                return [4 /*yield*/, fsextra.readdir(dirPath, { withFileTypes: true })];
            case 1:
                entries = _c.sent();
                return [3 /*break*/, 3];
            case 2:
                _err_1 = _c.sent();
                return [2 /*return*/, null];
            case 3:
                i = 0;
                _c.label = 4;
            case 4:
                if (!(i < entries.length)) return [3 /*break*/, 9];
                entry = entries[i];
                if (!entry.isDirectory()) return [3 /*break*/, 7];
                if (!recursive) return [3 /*break*/, 6];
                return [4 /*yield*/, scanDirectory("".concat(dirPath, "/").concat(entry.name), regex, extensions, recursive, fsextra)];
            case 5:
                match = _c.sent();
                if (match)
                    return [2 /*return*/, match];
                _c.label = 6;
            case 6: return [3 /*break*/, 8];
            case 7:
                name_1 = entry.name;
                if (extensions.size > 0) {
                    ext = (_b = (_a = name_1.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
                    if (!extensions.has(ext))
                        return [3 /*break*/, 8];
                }
                if (regex.test(name_1))
                    return [2 /*return*/, "".concat(dirPath, "/").concat(name_1)];
                _c.label = 8;
            case 8:
                i += 1;
                return [3 /*break*/, 4];
            case 9: return [2 /*return*/, null];
        }
    });
}); };
var plugin = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var lib, directorySource, directoryVariable, matchRegexStr, fileExtStr, recursive, targetDir, regex, extensions, match;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                lib = require('../../../../../methods/lib')();
                // eslint-disable-next-line no-param-reassign
                args.inputs = lib.loadDefaultValues(args.inputs, details);
                directorySource = String(args.inputs.directorySource);
                directoryVariable = String(args.inputs.directoryVariable).trim();
                matchRegexStr = String(args.inputs.matchRegex);
                fileExtStr = String(args.inputs.fileExtensions).trim();
                recursive = String(args.inputs.recursive) === 'true';
                targetDir = '';
                if (directorySource === 'flowVariable') {
                    targetDir = String((_c = (_b = (_a = args.variables) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b[directoryVariable]) !== null && _c !== void 0 ? _c : '');
                }
                else {
                    targetDir = (0, fileUtils_1.getFileAbosluteDir)(args.inputFileObj._id);
                }
                if (!targetDir) {
                    args.jobLog("Directory is empty (source: ".concat(directorySource, ", variable: \"").concat(directoryVariable, "\"). No match."));
                    return [2 /*return*/, {
                            outputFileObj: args.inputFileObj,
                            outputNumber: 2,
                            variables: args.variables,
                        }];
                }
                try {
                    regex = new RegExp(matchRegexStr);
                }
                catch (err) {
                    args.jobLog("Invalid regex \"".concat(matchRegexStr, "\": ").concat(err, ". No match."));
                    return [2 /*return*/, {
                            outputFileObj: args.inputFileObj,
                            outputNumber: 2,
                            variables: args.variables,
                        }];
                }
                extensions = new Set(fileExtStr ? fileExtStr.split(',').map(function (e) { return e.trim().toLowerCase(); }) : []);
                args.jobLog("Scanning \"".concat(targetDir, "\" for files matching /").concat(matchRegexStr, "/"));
                if (extensions.size > 0)
                    args.jobLog("Extension filter: ".concat(Array.from(extensions).join(', ')));
                if (recursive)
                    args.jobLog('Recursive: true');
                return [4 /*yield*/, scanDirectory(targetDir, regex, extensions, recursive, args.deps.fsextra)];
            case 1:
                match = _d.sent();
                if (match) {
                    args.jobLog("Match found: ".concat(match));
                    return [2 /*return*/, {
                            outputFileObj: args.inputFileObj,
                            outputNumber: 1,
                            variables: args.variables,
                        }];
                }
                args.jobLog('No matching file found.');
                return [2 /*return*/, {
                        outputFileObj: args.inputFileObj,
                        outputNumber: 2,
                        variables: args.variables,
                    }];
        }
    });
}); };
exports.plugin = plugin;
