import { checkFfmpegCommandInit } from '../../../../FlowHelpers/1.0.0/interfaces/flowUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

const LOSSLESS_CODECS = new Set([
  'truehd', 'flac', 'alac', 'mlp',
  'pcm_s16le', 'pcm_s24le', 'pcm_s32le',
  'pcm_f32le', 'pcm_f64le',
  'pcm_s16be', 'pcm_s24be', 'pcm_s32be',
  'pcm_bluray', 'pcm_dvd', 'pcm_alaw', 'pcm_mulaw',
]);

const isLossless = (codecName: string, profile?: string): boolean => {
  if (LOSSLESS_CODECS.has(codecName)) return true;
  if (codecName === 'dts' && profile === 'DTS-HD MA') return true;
  return false;
};

const LOSSY_CODEC_RANK: Record<string, number> = {
  eac3: 0,
  dts: 1,
  ac3: 2,
  aac: 3,
  opus: 4,
  mp3: 5,
};

const isDowngrade = (sourceCodec: string, targetCodec: string): boolean => {
  const sourceRank = LOSSY_CODEC_RANK[sourceCodec] ?? -1;
  const targetRank = LOSSY_CODEC_RANK[targetCodec] ?? -1;
  return targetRank > sourceRank;
};

const parseBitrateToNumber = (bitrate: string): number => {
  const trimmed = bitrate.trim().toLowerCase();
  if (trimmed.endsWith('k')) return parseFloat(trimmed) * 1000;
  if (trimmed.endsWith('m')) return parseFloat(trimmed) * 1000000;
  return parseFloat(trimmed);
};

const CODEC_TO_ENCODER: Record<string, string> = {
  aac: 'aac',
  ac3: 'ac3',
  eac3: 'eac3',
  opus: 'libopus',
  flac: 'flac',
  mp3: 'libmp3lame',
};

const details = (): IpluginDetails => ({
  name: 'Set Audio Codec',
  description: `Set audio codec with safety guards.
    \\n\\nHard guards (not configurable):
    \\n- Never lossy -> lossless (lossy source will never be encoded to a lossless codec)
    \\n- Never upmix (output channels never exceed source channels)
    \\n\\nLossy source re-encodes only when the target codec is a downgrade OR source bitrate exceeds the configured bitrate.`,
  style: {
    borderColor: '#6efefc',
  },
  tags: 'audio',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: '',
  inputs: [
    {
      label: 'Target Codec',
      name: 'targetCodec',
      type: 'string',
      defaultValue: 'aac',
      inputUI: {
        type: 'dropdown',
        options: ['aac', 'ac3', 'eac3', 'opus', 'flac', 'copy'],
      },
      tooltip: 'Desired output codec for audio streams.'
        + '\\nLossy source will never be encoded to a lossless codec (guard).'
        + '\\nUse "copy" to pass all streams through unchanged.',
    },
    {
      label: 'Max Channels',
      name: 'targetMaxChannels',
      type: 'number',
      defaultValue: '2',
      inputUI: {
        type: 'dropdown',
        options: ['2', '6', '8'],
      },
      tooltip: 'Maximum output channel count.'
        + '\\n2 = stereo, 6 = 5.1, 8 = 7.1.'
        + '\\nSource channels are never exceeded (no upmixing).',
    },
    {
      label: 'Bitrate',
      name: 'bitrate',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Target bitrate for lossy encoding (e.g. 128k, 640k).'
        + '\\nAlso used as threshold: lossy source is re-encoded when its bitrate exceeds this value.'
        + '\\nLeave empty to skip bitrate targeting (codec hierarchy still applies).',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

const plugin = (args: IpluginInputArgs): IpluginOutputArgs => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  checkFfmpegCommandInit(args);

  const targetCodec = String(args.inputs.targetCodec);
  const targetMaxChannels = Number(args.inputs.targetMaxChannels);
  const bitrateStr = String(args.inputs.bitrate).trim();
  const targetBitrate = bitrateStr ? parseBitrateToNumber(bitrateStr) : 0;

  const { streams } = args.variables.ffmpegCommand;

  for (let i = 0; i < streams.length; i += 1) {
    const stream = streams[i];
    if (stream.codec_type !== 'audio' || stream.removed) continue;

    const sourceCodec = String(stream.codec_name);
    const sourceProfile = String(stream.profile ?? '');
    const sourceChannels = Number(stream.channels ?? 2);
    const sourceBitrate = Number(stream.bit_rate ?? 0);
    const sourceLossless = isLossless(sourceCodec, sourceProfile);
    const targetIsLossless = LOSSLESS_CODECS.has(targetCodec) || targetCodec === 'flac';
    const outputChannels = Math.min(sourceChannels, targetMaxChannels);

    if (targetCodec === 'copy') {
      args.jobLog(`Stream ${i} (${sourceCodec} ${sourceChannels}ch): copy (target is copy)`);
      continue;
    }

    // Guard: never lossy -> lossless
    if (!sourceLossless && targetIsLossless) {
      args.jobLog(
        `Stream ${i} (${sourceCodec} ${sourceChannels}ch): copy — guard: lossy source, lossless target blocked`,
      );
      continue;
    }

    let shouldEncode = false;

    if (sourceLossless) {
      shouldEncode = true;
      args.jobLog(
        `Stream ${i} (${sourceCodec} ${sourceChannels}ch): encode — lossless source → ${targetCodec} ${outputChannels}ch`,
      );
    } else {
      const codecDowngrade = isDowngrade(sourceCodec, targetCodec);
      const bitrateExceeded = targetBitrate > 0 && sourceBitrate > targetBitrate;

      if (codecDowngrade) {
        shouldEncode = true;
        args.jobLog(
          `Stream ${i} (${sourceCodec} ${sourceChannels}ch ${sourceBitrate}bps): encode`
          + ` — codec downgrade ${sourceCodec} → ${targetCodec}`,
        );
      } else if (bitrateExceeded) {
        shouldEncode = true;
        args.jobLog(
          `Stream ${i} (${sourceCodec} ${sourceChannels}ch ${sourceBitrate}bps): encode`
          + ` — source bitrate ${sourceBitrate} exceeds target ${targetBitrate}`,
        );
      } else {
        args.jobLog(
          `Stream ${i} (${sourceCodec} ${sourceChannels}ch ${sourceBitrate}bps): copy`
          + ` — no downgrade and bitrate within target`,
        );
      }
    }

    if (shouldEncode) {
      const encoder = CODEC_TO_ENCODER[targetCodec] ?? targetCodec;
      stream.outputArgs.push('-c:{outputIndex}', encoder);
      stream.outputArgs.push('-ac', String(outputChannels));

      if (targetBitrate > 0 && !targetIsLossless) {
        stream.outputArgs.push('-b:a:{outputTypeIndex}', bitrateStr);
      }

      args.variables.ffmpegCommand.shouldProcess = true;
    }
  }

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
