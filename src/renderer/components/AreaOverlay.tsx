/**
 * Area selection overlay component
 * Full-screen overlay for drawing selection rectangle
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import type { CropArea } from '../types/recorder'

interface Props {
  /** Callback when area is selected */
  onSelect: (area: CropArea) => void
  /** Callback when selection is cancelled */
  onCancel: () => void
}

/** Minimum selection size in pixels */
const MIN_SIZE = 10

export function AreaOverlay({ onSelect, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentArea, setCurrentArea] = useState<CropArea | null>(null)

  // Handle mouse down - start drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDrawing(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    setCurrentArea({ x: e.clientX, y: e.clientY, width: 0, height: 0 })
  }, [])

  // Handle mouse move - update selection
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return

    const width = e.clientX - startPos.x
    const height = e.clientY - startPos.y

    // Normalize for negative drag direction
    const area: CropArea = {
      x: width < 0 ? e.clientX : startPos.x,
      y: height < 0 ? e.clientY : startPos.y,
      width: Math.abs(width),
      height: Math.abs(height)
    }

    setCurrentArea(area)
    drawSelection(area)
  }, [isDrawing, startPos])

  // Handle mouse up - finish drawing
  const handleMouseUp = useCallback(() => {
    setIsDrawing(false)
    if (currentArea && currentArea.width >= MIN_SIZE && currentArea.height >= MIN_SIZE) {
      onSelect(currentArea)
    }
  }, [currentArea, onSelect])

  // Draw selection rectangle on canvas
  const drawSelection = useCallback((area: CropArea) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dim area outside selection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Clear selection area (make it visible)
    ctx.clearRect(area.x, area.y, area.width, area.height)

    // Draw border
    ctx.strokeStyle = '#0078d4'
    ctx.lineWidth = 2
    ctx.strokeRect(area.x, area.y, area.width, area.height)

    // Draw dimensions label
    if (area.width > 40 && area.height > 20) {
      ctx.fillStyle = '#0078d4'
      ctx.font = 'bold 12px system-ui, sans-serif'
      ctx.fillText(
        `${area.width} x ${area.height}`,
        area.x + 4,
        area.y > 20 ? area.y - 6 : area.y + area.height + 16
      )
    }
  }, [])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter' && currentArea &&
                 currentArea.width >= MIN_SIZE && currentArea.height >= MIN_SIZE) {
        onSelect(currentArea)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentArea, onSelect, onCancel])

  // Initialize canvas size
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    // Handle resize
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="area-overlay">
      <canvas
        ref={canvasRef}
        className="area-overlay__canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="area-overlay__instructions">
        Drag to select area. Press Enter to confirm, Escape to cancel.
      </div>
    </div>
  )
}
