/**
 * Codec detection utilities for MediaRecorder
 * VP9 preferred, with VP8 fallback
 */

/** Preferred codecs in order of preference */
const PREFERRED_CODECS = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp8',
  'video/webm'
] as const

/**
 * Get the best supported MIME type for MediaRecorder
 * @returns Supported MIME type string
 */
export function getSupportedMimeType(): string {
  for (const codec of PREFERRED_CODECS) {
    if (MediaRecorder.isTypeSupported(codec)) {
      return codec
    }
  }
  // Fallback - should always work
  return 'video/webm'
}

/**
 * Check if a specific codec is supported
 * @param mimeType MIME type to check
 * @returns Whether the codec is supported
 */
export function isCodecSupported(mimeType: string): boolean {
  return MediaRecorder.isTypeSupported(mimeType)
}

/**
 * Get codec info from MIME type
 * @param mimeType MIME type string
 * @returns Parsed codec information
 */
export function parseCodecInfo(mimeType: string): {
  container: string
  videoCodec?: string
  audioCodec?: string
} {
  const [container, codecsPart] = mimeType.split(';codecs=')

  if (!codecsPart) {
    return { container }
  }

  const codecs = codecsPart.split(',').map(c => c.trim())
  const videoCodec = codecs.find(c => c.startsWith('vp') || c.startsWith('av'))
  const audioCodec = codecs.find(c => c === 'opus' || c.startsWith('vorbis'))

  return { container, videoCodec, audioCodec }
}

/** Check if VP9 is available */
export function hasVP9Support(): boolean {
  return isCodecSupported('video/webm;codecs=vp9')
}

/** Check if Opus audio is available */
export function hasOpusSupport(): boolean {
  return isCodecSupported('video/webm;codecs=vp9,opus')
}
