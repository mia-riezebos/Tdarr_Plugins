import { plugin } from
  '../../../../../../FlowPluginsTs/LocalFlowPlugins/ffmpegCommand/ffmpegCommandSetAudioCodec/1.0.0/index';
import { IpluginInputArgs } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces';

jest.mock('../../../../../../methods/lib', () => () => ({
  loadDefaultValues: jest.fn((inputs) => inputs),
}));

const makeStream = (overrides: Record<string, unknown> = {}) => ({
  codec_type: 'audio',
  codec_name: 'aac',
  channels: 2,
  bit_rate: 128000,
  profile: '',
  removed: false,
  outputArgs: [] as string[],
  inputArgs: [] as string[],
  index: 0,
  ...overrides,
});

const makeArgs = (inputs: Record<string, unknown>, streams: ReturnType<typeof makeStream>[]) => ({
  inputs: {
    targetCodec: 'aac',
    targetMaxChannels: '2',
    bitrate: '',
    ...inputs,
  },
  variables: {
    ffmpegCommand: {
      init: true,
      shouldProcess: false,
      streams,
      inputFiles: [],
      container: 'mkv',
      hardwareDecoding: false,
      overallInputArguments: [],
      overallOuputArguments: [],
    },
    flowFailed: false,
    user: {},
  },
  inputFileObj: { _id: '/test/file.mkv' },
  jobLog: jest.fn(),
} as unknown as IpluginInputArgs);

describe('ffmpegCommandSetAudioCodec', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('copy mode', () => {
    it('should copy all streams when targetCodec is copy', () => {
      const stream = makeStream({ codec_name: 'truehd', channels: 8 });
      const args = makeArgs({ targetCodec: 'copy' }, [stream]);

      const result = plugin(args);

      expect(stream.outputArgs).toEqual([]);
      expect(args.variables.ffmpegCommand.shouldProcess).toBe(false);
      expect(result.outputNumber).toBe(1);
    });
  });

  describe('lossless source', () => {
    it('should encode lossless source to target codec', () => {
      const stream = makeStream({ codec_name: 'truehd', channels: 8, bit_rate: 0 });
      const args = makeArgs({ targetCodec: 'eac3', targetMaxChannels: '6', bitrate: '640k' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toContain('eac3');
      expect(stream.outputArgs).toContain('-ac');
      expect(stream.outputArgs).toContain('6');
      expect(stream.outputArgs).toContain('640k');
      expect(args.variables.ffmpegCommand.shouldProcess).toBe(true);
    });

    it('should respect upmix guard — use source channels when less than target', () => {
      const stream = makeStream({ codec_name: 'flac', channels: 2, bit_rate: 0 });
      const args = makeArgs({ targetCodec: 'aac', targetMaxChannels: '6' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toContain('-ac');
      const acIdx = stream.outputArgs.indexOf('-ac');
      expect(stream.outputArgs[acIdx + 1]).toBe('2');
    });

    it('should encode DTS-HD MA as lossless', () => {
      const stream = makeStream({ codec_name: 'dts', profile: 'DTS-HD MA', channels: 6, bit_rate: 0 });
      const args = makeArgs({ targetCodec: 'eac3', targetMaxChannels: '6', bitrate: '640k' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toContain('eac3');
      expect(args.variables.ffmpegCommand.shouldProcess).toBe(true);
    });

    it('should encode pcm variants as lossless', () => {
      const stream = makeStream({ codec_name: 'pcm_s24le', channels: 6, bit_rate: 0 });
      const args = makeArgs({ targetCodec: 'aac', targetMaxChannels: '2' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toContain('aac');
      expect(stream.outputArgs).toContain('2');
    });
  });

  describe('lossy -> lossless guard', () => {
    it('should never encode lossy source to lossless target', () => {
      const stream = makeStream({ codec_name: 'aac', channels: 2, bit_rate: 128000 });
      const args = makeArgs({ targetCodec: 'flac', targetMaxChannels: '2' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toEqual([]);
      expect(args.variables.ffmpegCommand.shouldProcess).toBe(false);
    });
  });

  describe('lossy re-encode decisions', () => {
    it('should re-encode when target codec is a downgrade (eac3 -> aac)', () => {
      const stream = makeStream({ codec_name: 'eac3', channels: 6, bit_rate: 640000 });
      const args = makeArgs({ targetCodec: 'aac', targetMaxChannels: '2', bitrate: '192k' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toContain('aac');
      expect(stream.outputArgs).toContain('2');
      expect(stream.outputArgs).toContain('192k');
    });

    it('should re-encode when source bitrate exceeds target (same codec)', () => {
      const stream = makeStream({ codec_name: 'eac3', channels: 6, bit_rate: 1500000 });
      const args = makeArgs({ targetCodec: 'eac3', targetMaxChannels: '6', bitrate: '640k' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toContain('eac3');
      expect(stream.outputArgs).toContain('640k');
    });

    it('should copy when target codec is higher tier and bitrate is within target', () => {
      const stream = makeStream({ codec_name: 'ac3', channels: 6, bit_rate: 448000 });
      const args = makeArgs({ targetCodec: 'eac3', targetMaxChannels: '6', bitrate: '640k' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toEqual([]);
      expect(args.variables.ffmpegCommand.shouldProcess).toBe(false);
    });

    it('should copy when same codec and bitrate within target', () => {
      const stream = makeStream({ codec_name: 'aac', channels: 2, bit_rate: 128000 });
      const args = makeArgs({ targetCodec: 'aac', targetMaxChannels: '2', bitrate: '192k' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toEqual([]);
    });
  });

  describe('multiple streams', () => {
    it('should process each audio stream independently', () => {
      const lossless = makeStream({ codec_name: 'truehd', channels: 8, bit_rate: 0, index: 1 });
      const lossy = makeStream({ codec_name: 'ac3', channels: 6, bit_rate: 448000, index: 2 });
      const video = makeStream({ codec_type: 'video', codec_name: 'hevc', index: 0 });
      const args = makeArgs(
        { targetCodec: 'aac', targetMaxChannels: '2', bitrate: '192k' },
        [video, lossless, lossy],
      );

      plugin(args);

      expect(video.outputArgs).toEqual([]);
      expect(lossless.outputArgs).toContain('aac');
      expect(lossy.outputArgs).toContain('aac');
    });

    it('should skip removed streams', () => {
      const stream = makeStream({ codec_name: 'truehd', channels: 8, removed: true });
      const args = makeArgs({ targetCodec: 'aac', targetMaxChannels: '2' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toEqual([]);
    });
  });

  describe('encoder mapping', () => {
    it('should use libopus encoder for opus codec', () => {
      const stream = makeStream({ codec_name: 'flac', channels: 2, bit_rate: 0 });
      const args = makeArgs({ targetCodec: 'opus' }, [stream]);

      plugin(args);

      expect(stream.outputArgs).toContain('libopus');
    });
  });
});
