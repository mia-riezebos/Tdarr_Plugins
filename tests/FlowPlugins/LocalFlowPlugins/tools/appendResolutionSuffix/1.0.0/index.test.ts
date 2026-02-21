import { plugin } from
  '../../../../../../FlowPluginsTs/LocalFlowPlugins/tools/appendResolutionSuffix/1.0.0/index';
import { IpluginInputArgs } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces';
import { IFileObject } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/synced/IFileObject';

const sampleH264 = require('../../../../../sampleData/media/sampleH264_1.json');

jest.mock('../../../../../../methods/lib', () => () => ({
  loadDefaultValues: jest.fn((inputs) => inputs),
}));

jest.mock('../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/fileMoveOrCopy', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: mockFileMoveOrCopy } = require('../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/fileMoveOrCopy');

describe('appendResolutionSuffix', () => {
  let baseArgs: IpluginInputArgs;

  beforeEach(() => {
    jest.clearAllMocks();

    baseArgs = {
      inputs: {
        resolutionSource: 'ffprobe',
        variableName: 'resolution',
        resolutionMapping: '2160=4K,1080=1080p,720=720p,480=SD',
        // eslint-disable-next-line no-template-curly-in-string
        suffixTemplate: ' [${resolution}]',
      },
      variables: {
        ffmpegCommand: {
          init: false, inputFiles: [], streams: [], container: '',
          hardwareDecoding: false, shouldProcess: false,
          overallInputArguments: [], overallOuputArguments: [],
        },
        flowFailed: false,
        user: {},
      },
      inputFileObj: {
        ...JSON.parse(JSON.stringify(sampleH264)),
        _id: '/movies/Movie.Name.2024-mCX.mkv',
        ffProbeData: {
          streams: [
            { codec_type: 'video', height: 1080 },
            { codec_type: 'audio', channels: 2 },
          ],
        },
      } as unknown as IFileObject,
      jobLog: jest.fn(),
    } as unknown as IpluginInputArgs;
  });

  describe('ffprobe source', () => {
    it('should append mapped resolution from ffprobe height', async () => {
      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(result.outputFileObj._id).toBe('/movies/Movie.Name.2024-mCX [1080p].mkv');
    });

    it('should map 2160 to 4K', async () => {
      (baseArgs.inputFileObj as any).ffProbeData.streams[0].height = 2160;

      const result = await plugin(baseArgs);

      expect(result.outputFileObj._id).toBe('/movies/Movie.Name.2024-mCX [4K].mkv');
    });

    it('should use raw value when no mapping matches', async () => {
      (baseArgs.inputFileObj as any).ffProbeData.streams[0].height = 576;

      const result = await plugin(baseArgs);

      expect(result.outputFileObj._id).toBe('/movies/Movie.Name.2024-mCX [576].mkv');
    });

    it('should route to output 2 when no video stream exists', async () => {
      (baseArgs.inputFileObj as any).ffProbeData.streams = [
        { codec_type: 'audio', channels: 2 },
      ];

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(2);
      expect(mockFileMoveOrCopy).not.toHaveBeenCalled();
    });
  });

  describe('flow variable source', () => {
    it('should read resolution from user variable', async () => {
      baseArgs.inputs.resolutionSource = 'flowVariable';
      baseArgs.inputs.variableName = 'targetRes';
      baseArgs.variables.user = { targetRes: '720' };

      const result = await plugin(baseArgs);

      expect(result.outputFileObj._id).toBe('/movies/Movie.Name.2024-mCX [720p].mkv');
    });

    it('should route to output 2 when variable is not set', async () => {
      baseArgs.inputs.resolutionSource = 'flowVariable';
      baseArgs.inputs.variableName = 'missing';

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(2);
    });
  });

  describe('custom template', () => {
    it('should apply custom suffix template', async () => {
      // eslint-disable-next-line no-template-curly-in-string
      baseArgs.inputs.suffixTemplate = '.${resolution}';

      const result = await plugin(baseArgs);

      expect(result.outputFileObj._id).toBe('/movies/Movie.Name.2024-mCX.1080p.mkv');
    });
  });

  describe('empty mapping', () => {
    it('should use raw value when mapping is empty', async () => {
      baseArgs.inputs.resolutionMapping = '';

      const result = await plugin(baseArgs);

      expect(result.outputFileObj._id).toBe('/movies/Movie.Name.2024-mCX [1080].mkv');
    });
  });
});
