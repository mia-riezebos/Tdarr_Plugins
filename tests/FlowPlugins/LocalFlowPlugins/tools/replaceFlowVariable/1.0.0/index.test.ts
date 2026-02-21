import { plugin } from
  '../../../../../../FlowPluginsTs/LocalFlowPlugins/tools/replaceFlowVariable/1.0.0/index';
import { IpluginInputArgs } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces';

jest.mock('../../../../../../methods/lib', () => () => ({
  loadDefaultValues: jest.fn((inputs) => inputs),
}));

const makeArgs = (
  inputs: Record<string, unknown>,
  userVars: Record<string, string> = {},
) => ({
  inputs: {
    inputVariable: 'parentDir',
    findPattern: 'candidates',
    replaceWith: 'transcoded',
    useRegex: 'false',
    replaceAll: 'false',
    outputVariable: '',
    ...inputs,
  },
  variables: {
    ffmpegCommand: {
      init: false, inputFiles: [], streams: [], container: '',
      hardwareDecoding: false, shouldProcess: false,
      overallInputArguments: [], overallOuputArguments: [],
    },
    flowFailed: false,
    user: { ...userVars },
  },
  inputFileObj: { _id: '/test/file.mkv' },
  jobLog: jest.fn(),
} as unknown as IpluginInputArgs);

describe('replaceFlowVariable', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('literal replace', () => {
    it('should replace first occurrence by default', () => {
      const args = makeArgs({}, { parentDir: '/mnt/media/sonarr/candidates/Show/Season 01' });

      const result = plugin(args);

      expect(result.outputNumber).toBe(1);
      expect(args.variables.user.parentDir).toBe('/mnt/media/sonarr/transcoded/Show/Season 01');
    });

    it('should replace all occurrences when replaceAll is true', () => {
      const args = makeArgs(
        { replaceAll: 'true', findPattern: 'a', replaceWith: 'X' },
        { parentDir: 'banana' },
      );

      plugin(args);

      expect(args.variables.user.parentDir).toBe('bXnXnX');
    });
  });

  describe('regex replace', () => {
    it('should use regex when useRegex is true', () => {
      const args = makeArgs(
        { useRegex: 'true', findPattern: '(\\d+)', replaceWith: '[$1]' },
        { parentDir: 'Season 01' },
      );

      plugin(args);

      expect(args.variables.user.parentDir).toBe('Season [01]');
    });

    it('should replace all with regex and replaceAll', () => {
      const args = makeArgs(
        { useRegex: 'true', replaceAll: 'true', findPattern: '\\d', replaceWith: 'X' },
        { parentDir: 'S01E02' },
      );

      plugin(args);

      expect(args.variables.user.parentDir).toBe('SXXEXX');
    });

    it('should route to output 2 on invalid regex', () => {
      const args = makeArgs(
        { useRegex: 'true', findPattern: '[invalid' },
        { parentDir: 'test' },
      );

      const result = plugin(args);

      expect(result.outputNumber).toBe(2);
    });
  });

  describe('output variable', () => {
    it('should write to a different variable when outputVariable is set', () => {
      const args = makeArgs(
        { outputVariable: 'targetDir' },
        { parentDir: '/mnt/candidates/Show' },
      );

      plugin(args);

      expect(args.variables.user.targetDir).toBe('/mnt/transcoded/Show');
      expect(args.variables.user.parentDir).toBe('/mnt/candidates/Show');
    });
  });

  describe('missing input', () => {
    it('should route to output 2 when variable is not set', () => {
      const args = makeArgs({}, {});

      const result = plugin(args);

      expect(result.outputNumber).toBe(2);
    });
  });
});
