import { plugin } from
  '../../../../../../FlowPluginsTs/LocalFlowPlugins/tools/replaceReleaseGroup/1.0.0/index';
import { IpluginInputArgs } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces';
import { IFileObject } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/synced/IFileObject';

const sampleH264 = require('../../../../../sampleData/media/sampleH264_1.json');

const mockAxios = jest.fn();

jest.mock('../../../../../../methods/lib', () => () => ({
  loadDefaultValues: jest.fn((inputs) => inputs),
}));

jest.mock('../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/fileMoveOrCopy', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: mockFileMoveOrCopy } = require('../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/fileMoveOrCopy');

describe('replaceReleaseGroup', () => {
  let baseArgs: IpluginInputArgs;

  beforeEach(() => {
    jest.clearAllMocks();

    baseArgs = {
      inputs: {
        arr: 'radarr',
        arr_api_key: 'test_key',
        arr_host: 'http://localhost:7878',
        newReleaseGroup: 'mCX',
        noGroupBehavior: 'append',
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
        _id: '/movies/Movie.Name.2024.1080p.BluRay.x264-SPARKS.mkv',
      } as IFileObject,
      originalLibraryFile: JSON.parse(JSON.stringify(sampleH264)) as IFileObject,
      jobLog: jest.fn(),
      deps: { axios: mockAxios },
    } as unknown as IpluginInputArgs;
  });

  describe('release group replacement', () => {
    it('should replace hyphenated release group (-GROUP)', async () => {
      mockAxios.mockResolvedValueOnce({
        data: { parsedMovieInfo: { releaseGroup: 'SPARKS' } },
      });

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(result.outputFileObj._id).toBe(
        '/movies/Movie.Name.2024.1080p.BluRay.x264-mCX.mkv',
      );
      expect(mockFileMoveOrCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'move',
          sourcePath: '/movies/Movie.Name.2024.1080p.BluRay.x264-SPARKS.mkv',
          destinationPath: '/movies/Movie.Name.2024.1080p.BluRay.x264-mCX.mkv',
        }),
      );
    });

    it('should replace bracketed release group [GROUP]', async () => {
      baseArgs.inputFileObj._id = '/anime/[SubGroup] Anime Title - 01.mkv';

      mockAxios.mockResolvedValueOnce({
        data: { parsedMovieInfo: { releaseGroup: 'SubGroup' } },
      });

      const result = await plugin(baseArgs);

      expect(result.outputFileObj._id).toBe('/anime/[mCX] Anime Title - 01.mkv');
    });

    it('should replace parenthesized release group (GROUP)', async () => {
      baseArgs.inputFileObj._id = '/movies/Movie (YIFY).mkv';

      mockAxios.mockResolvedValueOnce({
        data: { parsedMovieInfo: { releaseGroup: 'YIFY' } },
      });

      const result = await plugin(baseArgs);

      expect(result.outputFileObj._id).toBe('/movies/Movie (mCX).mkv');
    });
  });

  describe('sonarr integration', () => {
    it('should extract release group from parsedEpisodeInfo for sonarr', async () => {
      baseArgs.inputs.arr = 'sonarr';
      baseArgs.inputs.arr_host = 'http://localhost:8989';
      baseArgs.inputFileObj._id = '/tv/Show.S01E01.720p.WEB-DL-NTb.mkv';

      mockAxios.mockResolvedValueOnce({
        data: { parsedEpisodeInfo: { releaseGroup: 'NTb' } },
      });

      const result = await plugin(baseArgs);

      expect(result.outputFileObj._id).toBe('/tv/Show.S01E01.720p.WEB-DL-mCX.mkv');
      expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({
        url: expect.stringContaining('http://localhost:8989/api/v3/parse'),
      }));
    });
  });

  describe('no group found — append mode', () => {
    it('should append release group when none found', async () => {
      baseArgs.inputFileObj._id = '/movies/Movie.Name.2024.mkv';

      mockAxios.mockResolvedValueOnce({
        data: { parsedMovieInfo: {} },
      });

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(result.outputFileObj._id).toBe('/movies/Movie.Name.2024-mCX.mkv');
    });
  });

  describe('no group found — skip mode', () => {
    it('should route to output 2 and leave file unchanged', async () => {
      baseArgs.inputs.noGroupBehavior = 'skip';
      baseArgs.inputFileObj._id = '/movies/Movie.Name.2024.mkv';

      mockAxios.mockResolvedValueOnce({
        data: { parsedMovieInfo: {} },
      });

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(2);
      expect(result.outputFileObj._id).toBe('/movies/Movie.Name.2024.mkv');
      expect(mockFileMoveOrCopy).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should route to output 2 on API failure', async () => {
      mockAxios.mockRejectedValueOnce(new Error('Network error'));

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(2);
      expect(mockFileMoveOrCopy).not.toHaveBeenCalled();
    });
  });

  describe('no-op', () => {
    it('should skip rename when filename is unchanged', async () => {
      baseArgs.inputFileObj._id = '/movies/Movie-mCX.mkv';

      mockAxios.mockResolvedValueOnce({
        data: { parsedMovieInfo: { releaseGroup: 'mCX' } },
      });

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(mockFileMoveOrCopy).not.toHaveBeenCalled();
    });
  });
});
