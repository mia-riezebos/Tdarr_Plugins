import { plugin } from
  '../../../../../../FlowPluginsTs/LocalFlowPlugins/tools/updateArrRootFolder/1.0.0/index';
import { IpluginInputArgs } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces';
import { IFileObject } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/synced/IFileObject';

const sampleH264 = require('../../../../../sampleData/media/sampleH264_1.json');

const mockAxios = jest.fn();

jest.mock('../../../../../../methods/lib', () => () => ({
  loadDefaultValues: jest.fn((inputs) => inputs),
}));

describe('updateArrRootFolder', () => {
  let baseArgs: IpluginInputArgs;

  beforeEach(() => {
    jest.clearAllMocks();

    baseArgs = {
      inputs: {
        arr: 'radarr',
        arr_api_key: 'test_key',
        arr_host: 'http://localhost:7878',
        oldRootFolder: '/mnt/media/radarr/candidates',
        newRootFolder: '/mnt/media/radarr/transcoded',
        fileExtensions: 'mkv,mp4,avi',
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
        _id: '/mnt/media/radarr/transcoded/Movie Name (2024)/Movie Name (2024).mkv',
      } as IFileObject,
      originalLibraryFile: {
        ...JSON.parse(JSON.stringify(sampleH264)),
        _id: '/mnt/media/radarr/candidates/Movie Name (2024)/Movie Name (2024).mkv',
      } as IFileObject,
      jobLog: jest.fn(),
      deps: {
        axios: mockAxios,
        fsextra: {
          readdir: jest.fn(),
        },
      },
    } as unknown as IpluginInputArgs;
  });

  describe('when old root is empty', () => {
    it('should update arr path and refresh', async () => {
      // readdir returns empty directory
      baseArgs.deps.fsextra.readdir = jest.fn().mockResolvedValue([]);

      // parse API returns movie id
      mockAxios
        .mockResolvedValueOnce({ data: { movie: { id: 42 } } }) // parse
        .mockResolvedValueOnce({ data: { id: 42, path: '/mnt/media/radarr/candidates/Movie Name (2024)' } }) // GET
        .mockResolvedValueOnce({}) // PUT
        .mockResolvedValueOnce({}); // POST command

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);

      // Verify PUT was called with updated path
      expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'put',
        url: 'http://localhost:7878/api/v3/movie/42',
      }));

      // Verify refresh command
      expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'post',
        url: 'http://localhost:7878/api/v3/command',
        data: JSON.stringify({ name: 'RefreshMovie', movieIds: [42] }),
      }));
    });
  });

  describe('when old root has media files', () => {
    it('should skip update and route to output 2', async () => {
      baseArgs.deps.fsextra.readdir = jest.fn().mockResolvedValue([
        { name: 'other-file.mkv', isDirectory: () => false },
      ]);

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(2);
      expect(mockAxios).not.toHaveBeenCalled();
    });
  });

  describe('when old and new roots are the same', () => {
    it('should skip and route to output 1', async () => {
      baseArgs.inputs.oldRootFolder = '/mnt/media/radarr/transcoded';
      baseArgs.inputs.newRootFolder = '/mnt/media/radarr/transcoded';

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(mockAxios).not.toHaveBeenCalled();
    });
  });

  describe('sonarr integration', () => {
    it('should use series endpoints for sonarr', async () => {
      baseArgs.inputs.arr = 'sonarr';
      baseArgs.inputs.arr_host = 'http://localhost:8989';
      baseArgs.deps.fsextra.readdir = jest.fn().mockResolvedValue([]);

      mockAxios
        .mockResolvedValueOnce({ data: { series: { id: 7 } } }) // parse
        .mockResolvedValueOnce({ data: { id: 7, path: '/old/path' } }) // GET series
        .mockResolvedValueOnce({}) // PUT
        .mockResolvedValueOnce({}); // POST command

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({
        url: 'http://localhost:8989/api/v3/series/7',
        method: 'get',
      }));
      expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'post',
        data: JSON.stringify({ name: 'RefreshSeries', seriesId: 7 }),
      }));
    });
  });

  describe('when arr cannot find the media', () => {
    it('should route to output 2', async () => {
      baseArgs.deps.fsextra.readdir = jest.fn().mockResolvedValue([]);

      // parse returns nothing
      mockAxios.mockResolvedValueOnce({ data: {} });

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(2);
    });
  });
});
