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
    name: 'Update Arr Root Folder',
    description: 'Checks if any media files remain in the old root folder.'
        + ' If empty, updates the movie/series path in Radarr/Sonarr to the new root folder and triggers a refresh.'
        + ' If files remain, skips the update.',
    style: {
        borderColor: 'green',
    },
    tags: '',
    isStartPlugin: false,
    pType: '',
    requiresVersion: '2.11.01',
    sidebarPosition: -1,
    icon: 'faFolderOpen',
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
            tooltip: 'Which arr instance to use.',
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
            label: 'Old Root Folder',
            name: 'oldRootFolder',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'The old root folder path (e.g. /mnt/media/sonarr/candidates).'
                + '\\nIf empty, derived from the original library file path.',
        },
        {
            label: 'New Root Folder',
            name: 'newRootFolder',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'The new root folder path (e.g. /mnt/media/sonarr/transcoded).'
                + '\\nIf empty, derived from the current file path.',
        },
        {
            label: 'File Extensions',
            name: 'fileExtensions',
            type: 'string',
            defaultValue: 'mkv,mp4,avi,ts,wmv,mov',
            inputUI: {
                type: 'text',
            },
            tooltip: 'Comma-separated list of file extensions to check when determining if the old root is empty.',
        },
    ],
    outputs: [
        {
            number: 1,
            tooltip: 'Root folder updated in arr and refreshed',
        },
        {
            number: 2,
            tooltip: 'Files remain in old root, no update performed',
        },
    ],
}); };
exports.details = details;
var deriveMediaFolder = function (filePath, rootFolder) {
    var withoutRoot = filePath.substring(rootFolder.length).replace(/^\//, '');
    var firstSegment = withoutRoot.split('/')[0];
    return "".concat(rootFolder.replace(/\/$/, ''), "/").concat(firstSegment);
};
var deriveRootFolder = function (filePath) {
    var parts = filePath.split('/');
    // Walk back: file -> season/subfolder -> media folder -> root
    // e.g. /mnt/media/sonarr/candidates/ShowName/Season 01/file.mkv
    //      root = /mnt/media/sonarr/candidates
    // Minimum depth: at least 3 parts above the file (root/media/season|file)
    if (parts.length >= 4) {
        return parts.slice(0, -3).join('/');
    }
    if (parts.length >= 3) {
        return parts.slice(0, -2).join('/');
    }
    return parts.slice(0, -1).join('/');
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var scanForMediaFiles = function (dirPath, extensions, fsextra) { return __awaiter(void 0, void 0, void 0, function () {
    var entries, i, entry, found, ext, _err_1;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                return [4 /*yield*/, fsextra.readdir(dirPath, { withFileTypes: true })];
            case 1:
                entries = _c.sent();
                i = 0;
                _c.label = 2;
            case 2:
                if (!(i < entries.length)) return [3 /*break*/, 6];
                entry = entries[i];
                if (!entry.isDirectory()) return [3 /*break*/, 4];
                return [4 /*yield*/, scanForMediaFiles("".concat(dirPath, "/").concat(entry.name), extensions, fsextra)];
            case 3:
                found = _c.sent();
                if (found)
                    return [2 /*return*/, true];
                return [3 /*break*/, 5];
            case 4:
                ext = (_b = (_a = entry.name.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
                if (extensions.has(ext))
                    return [2 /*return*/, true];
                _c.label = 5;
            case 5:
                i += 1;
                return [3 /*break*/, 2];
            case 6: return [3 /*break*/, 8];
            case 7:
                _err_1 = _c.sent();
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/, false];
        }
    });
}); };
var getArrId = function (args, arr, arrHost, headers, fileName) { return __awaiter(void 0, void 0, void 0, function () {
    var imdbId, id, endpoint, lookupResp, parseResp;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    return __generator(this, function (_m) {
        switch (_m.label) {
            case 0:
                imdbId = (_b = (_a = /\b(tt|nm|co|ev|ch|ni)\d{7,10}?\b/i.exec(fileName)) === null || _a === void 0 ? void 0 : _a.at(0)) !== null && _b !== void 0 ? _b : '';
                id = -1;
                if (!imdbId) return [3 /*break*/, 2];
                endpoint = arr === 'radarr' ? 'movie' : 'series';
                return [4 /*yield*/, args.deps.axios({
                        method: 'get',
                        url: "".concat(arrHost, "/api/v3/").concat(endpoint, "/lookup?term=imdb:").concat(imdbId),
                        headers: headers,
                    })];
            case 1:
                lookupResp = _m.sent();
                id = Number((_e = (_d = (_c = lookupResp === null || lookupResp === void 0 ? void 0 : lookupResp.data) === null || _c === void 0 ? void 0 : _c.at(0)) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : -1);
                args.jobLog("Lookup by IMDB ".concat(imdbId, ": ").concat(id !== -1 ? "found id ".concat(id) : 'not found'));
                _m.label = 2;
            case 2:
                if (!(id === -1)) return [3 /*break*/, 4];
                return [4 /*yield*/, args.deps.axios({
                        method: 'get',
                        url: "".concat(arrHost, "/api/v3/parse?title=").concat(encodeURIComponent((0, fileUtils_1.getFileName)(fileName))),
                        headers: headers,
                    })];
            case 3:
                parseResp = _m.sent();
                id = arr === 'radarr'
                    ? Number((_h = (_g = (_f = parseResp.data) === null || _f === void 0 ? void 0 : _f.movie) === null || _g === void 0 ? void 0 : _g.id) !== null && _h !== void 0 ? _h : -1)
                    : Number((_l = (_k = (_j = parseResp.data) === null || _j === void 0 ? void 0 : _j.series) === null || _k === void 0 ? void 0 : _k.id) !== null && _l !== void 0 ? _l : -1);
                args.jobLog("Lookup by parse \"".concat((0, fileUtils_1.getFileName)(fileName), "\": ").concat(id !== -1 ? "found id ".concat(id) : 'not found'));
                _m.label = 4;
            case 4: return [2 /*return*/, id];
        }
    });
}); };
var plugin = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var lib, arr, arrHost, headers, originalPath, currentPath, oldRootInput, newRootInput, oldRoot, newRoot, oldMediaFolder, newMediaFolder, extensionList, extensions, hasMediaFiles, id, endpoint, recordResp, record, refreshData;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                lib = require('../../../../../methods/lib')();
                // eslint-disable-next-line no-param-reassign
                args.inputs = lib.loadDefaultValues(args.inputs, details);
                arr = String(args.inputs.arr);
                arrHost = String(args.inputs.arr_host).trim().replace(/\/$/, '');
                headers = {
                    'Content-Type': 'application/json',
                    'X-Api-Key': String(args.inputs.arr_api_key),
                    Accept: 'application/json',
                };
                originalPath = (_b = (_a = args.originalLibraryFile) === null || _a === void 0 ? void 0 : _a._id) !== null && _b !== void 0 ? _b : '';
                currentPath = args.inputFileObj._id;
                oldRootInput = String(args.inputs.oldRootFolder).trim();
                newRootInput = String(args.inputs.newRootFolder).trim();
                oldRoot = oldRootInput || deriveRootFolder(originalPath);
                newRoot = newRootInput || deriveRootFolder(currentPath);
                oldMediaFolder = deriveMediaFolder(originalPath, oldRoot);
                newMediaFolder = deriveMediaFolder(currentPath, newRoot);
                args.jobLog("Old root: ".concat(oldRoot));
                args.jobLog("New root: ".concat(newRoot));
                args.jobLog("Old media folder: ".concat(oldMediaFolder));
                args.jobLog("New media folder: ".concat(newMediaFolder));
                if (oldRoot === newRoot) {
                    args.jobLog('Old and new root folders are the same, nothing to update.');
                    return [2 /*return*/, {
                            outputFileObj: args.inputFileObj,
                            outputNumber: 1,
                            variables: args.variables,
                        }];
                }
                extensionList = String(args.inputs.fileExtensions).split(',').map(function (e) { return e.trim().toLowerCase(); });
                extensions = new Set(extensionList);
                return [4 /*yield*/, scanForMediaFiles(oldMediaFolder, extensions, args.deps.fsextra)];
            case 1:
                hasMediaFiles = _c.sent();
                if (hasMediaFiles) {
                    args.jobLog("Media files still exist in ".concat(oldMediaFolder, ", skipping root folder update."));
                    return [2 /*return*/, {
                            outputFileObj: args.inputFileObj,
                            outputNumber: 2,
                            variables: args.variables,
                        }];
                }
                args.jobLog("No media files found in ".concat(oldMediaFolder, ", proceeding with root folder update."));
                return [4 /*yield*/, getArrId(args, arr, arrHost, headers, originalPath)];
            case 2:
                id = _c.sent();
                if (id === -1) {
                    args.jobLog("Could not find ".concat(arr === 'radarr' ? 'movie' : 'series', " in ").concat(arr, ". Skipping update."));
                    return [2 /*return*/, {
                            outputFileObj: args.inputFileObj,
                            outputNumber: 2,
                            variables: args.variables,
                        }];
                }
                endpoint = arr === 'radarr' ? 'movie' : 'series';
                return [4 /*yield*/, args.deps.axios({
                        method: 'get',
                        url: "".concat(arrHost, "/api/v3/").concat(endpoint, "/").concat(id),
                        headers: headers,
                    })];
            case 3:
                recordResp = _c.sent();
                record = recordResp.data;
                args.jobLog("Current ".concat(endpoint, " path: ").concat(record.path));
                args.jobLog("Updating to: ".concat(newMediaFolder));
                record.path = newMediaFolder;
                return [4 /*yield*/, args.deps.axios({
                        method: 'put',
                        url: "".concat(arrHost, "/api/v3/").concat(endpoint, "/").concat(id),
                        headers: headers,
                        data: JSON.stringify(record),
                    })];
            case 4:
                _c.sent();
                refreshData = arr === 'radarr'
                    ? JSON.stringify({ name: 'RefreshMovie', movieIds: [id] })
                    : JSON.stringify({ name: 'RefreshSeries', seriesId: id });
                return [4 /*yield*/, args.deps.axios({
                        method: 'post',
                        url: "".concat(arrHost, "/api/v3/command"),
                        headers: headers,
                        data: refreshData,
                    })];
            case 5:
                _c.sent();
                args.jobLog("\u2714 ".concat(endpoint, " '").concat(id, "' path updated and refreshed in ").concat(arr, "."));
                return [2 /*return*/, {
                        outputFileObj: args.inputFileObj,
                        outputNumber: 1,
                        variables: args.variables,
                    }];
        }
    });
}); };
exports.plugin = plugin;
