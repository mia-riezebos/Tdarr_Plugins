import { plugin } from
  '../../../../../../FlowPluginsTs/LocalFlowPlugins/tools/checkFileExistsRegex/1.0.0/index';
import { IpluginInputArgs } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces';
import { IFileObject } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/synced/IFileObject';

const sampleH264 = require('../../../../../sampleData/media/sampleH264_1.json');

jest.mock('../../../../../../methods/lib', () => () => ({
  loadDefaultValues: jest.fn((inputs) => inputs),
}));

const makeArgs = (
  inputs: Record<string, unknown>,
  userVars: Record<string, string> = {},
  readdirResult: unknown[] | Error = [],
) => ({
  inputs: {
    directorySource: 'flowVariable',
    directoryVariable: 'targetDir',
    matchRegex: '\\[(?:720p|1080p|2160p)\\]',
    fileExtensions: 'mkv,mp4,avi',
    recursive: 'false',
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
  inputFileObj: {
    ...JSON.parse(JSON.stringify(sampleH264)),
    _id: '/mnt/media/sonarr/candidates/Show/Season 01/Show S01E01.mkv',
  } as IFileObject,
  jobLog: jest.fn(),
  deps: {
    fsextra: {
      readdir: jest.fn().mockImplementation(() => {
        if (readdirResult instanceof Error) return Promise.reject(readdirResult);
        return Promise.resolve(readdirResult);
      }),
    },
  },
} as unknown as IpluginInputArgs);

const file = (name: string) => ({ name, isDirectory: () => false });
const dir = (name: string) => ({ name, isDirectory: () => true });

describe('checkFileExistsRegex', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('match found', () => {
    it('should route to output 1 when a file matches the regex', async () => {
      const args = makeArgs(
        {},
        { targetDir: '/mnt/media/sonarr/transcoded/Show/Season 01' },
        [file('Show S01E01 [1080p].mkv'), file('other.txt')],
      );

      const result = await plugin(args);

      expect(result.outputNumber).toBe(1);
      expect(args.jobLog).toHaveBeenCalledWith(expect.stringContaining('Match found'));
    });
  });

  describe('no match', () => {
    it('should route to output 2 when no file matches', async () => {
      const args = makeArgs(
        {},
        { targetDir: '/mnt/media/sonarr/transcoded/Show/Season 01' },
        [file('Show S01E01.mkv'), file('other.avi')],
      );

      const result = await plugin(args);

      expect(result.outputNumber).toBe(2);
    });
  });

  describe('extension filter', () => {
    it('should ignore files with non-matching extensions', async () => {
      const args = makeArgs(
        { fileExtensions: 'mkv' },
        { targetDir: '/some/dir' },
        [file('Show [1080p].mp4'), file('Show [1080p].srt')],
      );

      const result = await plugin(args);

      expect(result.outputNumber).toBe(2);
    });

    it('should include files when extensions is empty', async () => {
      const args = makeArgs(
        { fileExtensions: '', matchRegex: 'Show' },
        { targetDir: '/some/dir' },
        [file('Show.srt')],
      );

      const result = await plugin(args);

      expect(result.outputNumber).toBe(1);
    });
  });

  describe('inputFileDir source', () => {
    it('should use the input file directory when source is inputFileDir', async () => {
      const args = makeArgs(
        { directorySource: 'inputFileDir', matchRegex: 'S01E01' },
        {},
        [file('Show S01E01.mkv')],
      );

      const result = await plugin(args);

      expect(result.outputNumber).toBe(1);
      expect(args.deps.fsextra.readdir).toHaveBeenCalledWith(
        '/mnt/media/sonarr/candidates/Show/Season 01',
        { withFileTypes: true },
      );
    });
  });

  describe('directory does not exist', () => {
    it('should route to output 2', async () => {
      const args = makeArgs(
        {},
        { targetDir: '/nonexistent/dir' },
        new Error('ENOENT'),
      );

      const result = await plugin(args);

      expect(result.outputNumber).toBe(2);
    });
  });

  describe('invalid regex', () => {
    it('should route to output 2', async () => {
      const args = makeArgs(
        { matchRegex: '[invalid' },
        { targetDir: '/some/dir' },
      );

      const result = await plugin(args);

      expect(result.outputNumber).toBe(2);
    });
  });

  describe('empty directory variable', () => {
    it('should route to output 2 when variable is not set', async () => {
      const args = makeArgs({}, {});

      const result = await plugin(args);

      expect(result.outputNumber).toBe(2);
    });
  });

  describe('recursive', () => {
    it('should find matches in subdirectories when recursive is true', async () => {
      const mockReaddir = jest.fn()
        .mockResolvedValueOnce([dir('Season 01'), file('info.nfo')])
        .mockResolvedValueOnce([file('Show S01E01 [720p].mkv')]);

      const args = makeArgs(
        { recursive: 'true' },
        { targetDir: '/mnt/transcoded/Show' },
      );
      args.deps.fsextra.readdir = mockReaddir;

      const result = await plugin(args);

      expect(result.outputNumber).toBe(1);
      expect(mockReaddir).toHaveBeenCalledTimes(2);
    });
  });
});
