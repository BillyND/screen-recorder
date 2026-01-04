/**
 * Recording timer utilities and hooks
 * Format duration and file size for display
 */

/**
 * Format seconds into HH:MM:SS or MM:SS display
 * @param seconds Total seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format bytes into human-readable size
 * @param bytes File size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Parse duration string back to seconds
 * @param duration Formatted duration string
 * @returns Total seconds
 */
export function parseDuration(duration: string): number {
  const parts = duration.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parts[0] || 0
}

/**
 * Calculate recording rate (bytes per second)
 * @param fileSize Current file size in bytes
 * @param duration Current duration in seconds
 * @returns Bytes per second
 */
export function calculateBitrate(fileSize: number, duration: number): number {
  if (duration === 0) return 0
  return Math.round((fileSize * 8) / duration) // bits per second
}

/**
 * Format bitrate for display
 * @param bitsPerSecond Bitrate in bits/second
 * @returns Formatted bitrate (e.g., "2.5 Mbps")
 */
export function formatBitrate(bitsPerSecond: number): string {
  if (bitsPerSecond === 0) return '0 bps'
  if (bitsPerSecond < 1000) return `${bitsPerSecond} bps`
  if (bitsPerSecond < 1000000) return `${(bitsPerSecond / 1000).toFixed(1)} Kbps`
  return `${(bitsPerSecond / 1000000).toFixed(1)} Mbps`
}
