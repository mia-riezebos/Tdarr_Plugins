import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from 'FlowHelpers/1.0.0/interfaces/interfaces';
import { checkFfmpegCommandInit } from 'FlowHelpers/1.0.0/interfaces/flowUtils';

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = (): IpluginDetails => ({
  name: 'Filter Best Quality Per Language',
  description: `
    Filter Best Quality Per Language

    \\nRequires the streams to be ordered by quality before this plugin is run.
    `,
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
      label: 'Codec Order',
      name: 'codecOrder',
      type: 'string',
      defaultValue:
        // eslint-disable-next-line max-len
        'truehd,dts,eac3,ac3,flac,alac,pcm_alaw,pcm_bluray,pcm_dvd,pcm_f16le,pcm_f24le,pcm_f32be,pcm_f32le,pcm_f64be,pcm_f64le,pcm_lxf,pcm_mulaw,pcm_s16be,pcm_s16be_planar,pcm_s16le,pcm_s16le_planar,pcm_s24be,pcm_s24daud,pcm_s24le,pcm_s24le_planar,pcm_s32be,pcm_s32le,pcm_s32le_planar,pcm_s64be,pcm_s64le,pcm_s8,pcm_s8_planar,pcm_sga,pcm_u16be,pcm_u16le,pcm_u24be,pcm_u24le,pcm_u32be,pcm_u32le,pcm_u8aac,dvaudio,aptx,aptx_hd,aac,aac_latm,mp3,opus',
      inputUI: {
        type: 'text',
      },
      tooltip: "Specify the codec order, separated by commas. Leave blank to disable.\n\n          \\nExample:\\n\n          truehd,dts,eac3,ac3,flac,aac,mp3,opus",
    },
    {
      label: 'Process Order',
      name: 'processOrder',
      type: 'string',
      defaultValue: 'codec_type,codec_name,bit_rate,channels,sample_rate,sample_fmt',
      inputUI: {
        type: 'text',
      },
      tooltip: "Specify which property is preferred for \"quality\", separated by commas.\n\n          \\nExample:\\n\n          codec_type,codec_name,bit_rate,channels,sample_rate,sample_fmt",
    },
    {
      label: 'Keep Commentary Tracks',
      name: 'keepCommentaryTracks',
      type: 'boolean',
      defaultValue: 'false',
      inputUI: {
        type: 'switch',
      },
      tooltip: `
      Specify whether to keep commentary tracks.
      \\n

      Default is false.
      `,
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

interface SortStrategy {
  getValue: (stream: Record<string, unknown>) => unknown;
  sortOrder?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (args: IpluginInputArgs): IpluginOutputArgs => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  checkFfmpegCommandInit(args);

  const processOrder = String(args.inputs.processOrder).trim();
  const codecOrder = String(args.inputs.codecOrder).trim();
  const keepCommentaryTracks = Boolean(args.inputs.keepCommentaryTracks);
  const streams = JSON.parse(JSON.stringify(args.variables.ffmpegCommand.streams));
  const originalStreams = JSON.stringify(streams);

  const sortStreams = (sortStrategy: SortStrategy) => {
    const sortOrder = sortStrategy.sortOrder?.split(',') ?? null;
    args.jobLog(`Sorting streams using ${sortStrategy.getValue}`);
    streams.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      try {
        const aValue = sortStrategy.getValue(a);
        const bValue = sortStrategy.getValue(b);
        args.jobLog(`Comparing ${aValue} and ${bValue}`);
        if (!aValue || !bValue) return 0; // Keep the original order

        const isImageStream = (stream: Record<string, unknown>) =>
          (stream.codec_long_name as string)?.includes('image')
          || (stream.codec_name as string)?.includes('png');

        if (isImageStream(a) && !isImageStream(b)) return 1;
        if (!isImageStream(a) && isImageStream(b)) return -1;
        if (isImageStream(a) && isImageStream(b)) return 0;

        if (sortOrder) {
          const aIndex = sortOrder.indexOf(String(aValue).toLowerCase());
          const bIndex = sortOrder.indexOf(String(bValue).toLowerCase());
          return aIndex - bIndex;
        }
        return Number(aValue) - Number(bValue);
      } catch (err) {
        args.jobLog(`Error sorting streams: ${err}`);
        return 0;
      }
    });
  };

  const sortStrategies: Record<string, SortStrategy> = {
    codec_type: {
      getValue: (stream) => stream.codec_type,
      sortOrder: 'video,audio,subtitle',
    },
    codec_name: {
      getValue: (stream) => stream.codec_name,
      sortOrder: codecOrder,
    },
    bit_rate: {
      getValue: (stream) => Number(stream.bit_rate),
    },
    channels: {
      getValue: (stream) => Number(stream.channels),
    },
    sample_rate: {
      getValue: (stream) => Number(stream.sample_rate),
    },
    sample_fmt: {
      getValue: (stream) => stream.sample_fmt,
    },
  };

  const processOrderArr = processOrder.split(',').reverse();
  processOrderArr.forEach((property) => {
    const sortStrategy = sortStrategies[property];
    args.jobLog(`Sorting streams using ${property}`);
    if (sortStrategy) {
      sortStreams(sortStrategy);
    }
  });

  // Only include the first stream per language
  streams.forEach((stream: Record<string, unknown>, index: number, self: Record<string, unknown>[]) => {
    if (index === 0) return;
    if (stream.codec_type !== 'audio') return;

    args.jobLog(`
      Checking whether stream ${index}, with title ${(stream.tags as Record<string, string>)?.title}
      is the first audio stream in its language ${(stream.tags as Record<string, string>)?.language}
    `);

    const prevStream = self[index - 1];
    if (prevStream.codec_type !== 'audio') return;
    if ((prevStream.tags as Record<string, string>)?.language !== (stream.tags as Record<string, string>)?.language) return;
    if (keepCommentaryTracks && (stream.tags as Record<string, string>)?.title?.toLowerCase().includes('commentary')) return;

    args.jobLog(`
      Stream ${index} with title ${(stream.tags as Record<string, string>)?.title} is the first audio stream
      in its language ${(stream.tags as Record<string, string>)?.language}, therefore it will be marked as removed
    `);
    stream.removed = true;
  });

  if (JSON.stringify(streams) !== originalStreams) {
    args.jobLog('Filtered streams do not match original streams, updating original streams');
    args.variables.ffmpegCommand.shouldProcess = true;
    args.variables.ffmpegCommand.streams = streams;
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
