/**
 * Audio mixing utilities using Web Audio API
 * Combines system audio and microphone
 */

/** Audio mixer context and nodes for cleanup */
interface AudioMixerContext {
  audioContext: AudioContext
  micStream?: MediaStream
  cleanup: () => void
}

/** Global context for cleanup on stop */
let currentMixer: AudioMixerContext | null = null

/**
 * Create a mixed audio track from display audio and microphone
 * @param displayStream Stream with potential system audio
 * @param includeMic Whether to include microphone input
 * @returns Mixed audio track or null if no audio available
 */
export async function createMixedAudioTrack(
  displayStream: MediaStream,
  includeMic: boolean
): Promise<MediaStreamTrack | null> {
  // Cleanup previous mixer if exists
  cleanupMixer()

  const audioContext = new AudioContext()
  const destination = audioContext.createMediaStreamDestination()
  let micStream: MediaStream | undefined

  // Connect display audio (system audio) if available
  const displayAudioTrack = displayStream.getAudioTracks()[0]
  if (displayAudioTrack) {
    const displaySource = audioContext.createMediaStreamSource(
      new MediaStream([displayAudioTrack])
    )
    displaySource.connect(destination)
  }

  // Connect microphone if requested
  if (includeMic) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      const micSource = audioContext.createMediaStreamSource(micStream)
      // Reduce mic volume slightly to balance with system audio
      const micGain = audioContext.createGain()
      micGain.gain.value = 0.8
      micSource.connect(micGain)
      micGain.connect(destination)
    } catch (err) {
      console.warn('Microphone access denied:', err)
      // Continue without mic - not a fatal error
    }
  }

  // Check if we have any audio
  const mixedTrack = destination.stream.getAudioTracks()[0]
  if (!mixedTrack) {
    // Cleanup on early exit
    micStream?.getTracks().forEach(t => t.stop())
    await audioContext.close()
    return null
  }

  // Store context for cleanup
  currentMixer = {
    audioContext,
    micStream,
    cleanup: () => {
      micStream?.getTracks().forEach(t => t.stop())
      audioContext.close().catch(() => {})
    }
  }

  return mixedTrack
}

/**
 * Cleanup audio mixer resources
 * Call when recording stops
 */
export function cleanupMixer(): void {
  if (currentMixer) {
    currentMixer.cleanup()
    currentMixer = null
  }
}

/**
 * Check if microphone permission is granted
 * @returns Promise<boolean>
 */
export async function hasMicrophonePermission(): Promise<boolean> {
  try {
    const permission = await navigator.permissions.query({
      name: 'microphone' as PermissionName
    })
    return permission.state === 'granted'
  } catch {
    // Fallback for browsers without permission API
    return false
  }
}

/**
 * Request microphone permission (user gesture required)
 * @returns Promise<boolean> Whether permission was granted
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(t => t.stop())
    return true
  } catch {
    return false
  }
}
