/**
 * Utils barrel file
 */

export {
  getSupportedMimeType,
  isCodecSupported,
  parseCodecInfo,
  hasVP9Support,
  hasOpusSupport
} from './codec-utils'

export {
  createMixedAudioTrack,
  cleanupMixer,
  hasMicrophonePermission,
  requestMicrophonePermission
} from './audio-mixer'

export {
  scaleAreaForDPI,
  scaleAreaFromDPI,
  getDisplayScaleFactor,
  isHighDPI
} from './dpi-utils'
