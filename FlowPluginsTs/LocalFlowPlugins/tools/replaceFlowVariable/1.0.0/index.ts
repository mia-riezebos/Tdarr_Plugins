import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

const details = (): IpluginDetails => ({
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
});

const plugin = (args: IpluginInputArgs): IpluginOutputArgs => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const inputVariable = String(args.inputs.inputVariable).trim();
  const findPattern = String(args.inputs.findPattern);
  const replaceWith = String(args.inputs.replaceWith);
  const useRegex = String(args.inputs.useRegex) === 'true';
  const doReplaceAll = String(args.inputs.replaceAll) === 'true';
  const outputVariable = String(args.inputs.outputVariable).trim() || inputVariable;

  if (!args.variables.user) {
    // eslint-disable-next-line no-param-reassign
    args.variables.user = {};
  }

  const inputValue = args.variables.user[inputVariable];
  if (inputValue === undefined || inputValue === null) {
    args.jobLog(`Variable "${inputVariable}" is not set. Routing to output 2.`);
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }

  const str = String(inputValue);
  let result: string;

  if (useRegex) {
    try {
      const flags = doReplaceAll ? 'g' : '';
      const regex = new RegExp(findPattern, flags);
      result = str.replace(regex, replaceWith);
    } catch (err) {
      args.jobLog(`Invalid regex "${findPattern}": ${err}. Routing to output 2.`);
      return {
        outputFileObj: args.inputFileObj,
        outputNumber: 2,
        variables: args.variables,
      };
    }
  } else if (doReplaceAll) {
    result = str.split(findPattern).join(replaceWith);
  } else {
    result = str.replace(findPattern, replaceWith);
  }

  args.jobLog(`"${inputVariable}" = "${str}"`);
  args.jobLog(`Find: "${findPattern}" → Replace: "${replaceWith}" (regex=${useRegex}, all=${doReplaceAll})`);
  args.jobLog(`Result → "${outputVariable}" = "${result}"`);

  args.variables.user[outputVariable] = result;

  return {
    outputFileObj: args.inputFileObj,
    outputNumber: 1,
    variables: args.variables,
  };
};

export {
  details,
  plugin,
};
