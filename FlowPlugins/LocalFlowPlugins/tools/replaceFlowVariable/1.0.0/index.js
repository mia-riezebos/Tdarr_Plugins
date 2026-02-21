"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var details = function () { return ({
    name: 'Replace Flow Variable',
    description: 'Performs a find/replace on a flow variable value.'
        + ' Supports literal string or regex patterns.'
        + ' Useful for deriving target paths from source paths (e.g. candidates → transcoded).',
    style: {
        borderColor: 'blue',
    },
    tags: '',
    isStartPlugin: false,
    pType: '',
    requiresVersion: '2.11.01',
    sidebarPosition: -1,
    icon: 'faPenToSquare',
    inputs: [
        {
            label: 'Input Variable',
            name: 'inputVariable',
            type: 'string',
            defaultValue: 'parentDir',
            inputUI: {
                type: 'text',
            },
            tooltip: 'The user flow variable to read from.'
                + '\\nAccessed as args.variables.user[inputVariable].'
                + '\\nUse {{{args.variables.user.parentDir}}} to reference it in other plugins.',
        },
        {
            label: 'Find Pattern',
            name: 'findPattern',
            type: 'string',
            defaultValue: 'candidates',
            inputUI: {
                type: 'text',
            },
            tooltip: 'The string or regex pattern to find in the variable value.',
        },
        {
            label: 'Replace With',
            name: 'replaceWith',
            type: 'string',
            defaultValue: 'transcoded',
            inputUI: {
                type: 'text',
            },
            tooltip: 'The replacement string.'
                + '\\nWhen useRegex is true, supports $1, $2 etc. for capture groups.',
        },
        {
            label: 'Use Regex',
            name: 'useRegex',
            type: 'string',
            defaultValue: 'false',
            inputUI: {
                type: 'dropdown',
                options: ['false', 'true'],
            },
            tooltip: 'When true, findPattern is compiled as a RegExp.',
        },
        {
            label: 'Replace All',
            name: 'replaceAll',
            type: 'string',
            defaultValue: 'false',
            inputUI: {
                type: 'dropdown',
                options: ['false', 'true'],
            },
            tooltip: 'When true, replaces all occurrences instead of just the first.',
        },
        {
            label: 'Output Variable',
            name: 'outputVariable',
            type: 'string',
            defaultValue: '',
            inputUI: {
                type: 'text',
            },
            tooltip: 'The user flow variable to write the result to.'
                + '\\nIf empty, writes back to the input variable.',
        },
    ],
    outputs: [
        {
            number: 1,
            tooltip: 'Replacement applied',
        },
        {
            number: 2,
            tooltip: 'Input variable not set or invalid regex',
        },
    ],
}); };
exports.details = details;
var plugin = function (args) {
    var lib = require('../../../../../methods/lib')();
    // eslint-disable-next-line no-param-reassign
    args.inputs = lib.loadDefaultValues(args.inputs, details);
    var inputVariable = String(args.inputs.inputVariable).trim();
    var findPattern = String(args.inputs.findPattern);
    var replaceWith = String(args.inputs.replaceWith);
    var useRegex = String(args.inputs.useRegex) === 'true';
    var doReplaceAll = String(args.inputs.replaceAll) === 'true';
    var outputVariable = String(args.inputs.outputVariable).trim() || inputVariable;
    if (!args.variables.user) {
        // eslint-disable-next-line no-param-reassign
        args.variables.user = {};
    }
    var inputValue = args.variables.user[inputVariable];
    if (inputValue === undefined || inputValue === null) {
        args.jobLog("Variable \"".concat(inputVariable, "\" is not set. Routing to output 2."));
        return {
            outputFileObj: args.inputFileObj,
            outputNumber: 2,
            variables: args.variables,
        };
    }
    var str = String(inputValue);
    var result;
    if (useRegex) {
        try {
            var flags = doReplaceAll ? 'g' : '';
            var regex = new RegExp(findPattern, flags);
            result = str.replace(regex, replaceWith);
        }
        catch (err) {
            args.jobLog("Invalid regex \"".concat(findPattern, "\": ").concat(err, ". Routing to output 2."));
            return {
                outputFileObj: args.inputFileObj,
                outputNumber: 2,
                variables: args.variables,
            };
        }
    }
    else if (doReplaceAll) {
        result = str.split(findPattern).join(replaceWith);
    }
    else {
        result = str.replace(findPattern, replaceWith);
    }
    args.jobLog("\"".concat(inputVariable, "\" = \"").concat(str, "\""));
    args.jobLog("Find: \"".concat(findPattern, "\" \u2192 Replace: \"").concat(replaceWith, "\" (regex=").concat(useRegex, ", all=").concat(doReplaceAll, ")"));
    args.jobLog("Result \u2192 \"".concat(outputVariable, "\" = \"").concat(result, "\""));
    args.variables.user[outputVariable] = result;
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: args.variables,
    };
};
exports.plugin = plugin;
