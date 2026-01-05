/**
 * Header component with window controls
 * Similar to focus-reminder design
 */

import { memo, useCallback } from "react"
import { Button } from "./ui/button"
import { Minus, Square, X } from "lucide-react"

export const Header = memo(function Header() {
  const handleMinimize = useCallback(() => {
    window.api?.window?.minimize?.()
  }, [])

  const handleMaximize = useCallback(() => {
    window.api?.window?.maximize?.()
  }, [])

  const handleClose = useCallback(() => {
    window.api?.window?.close?.()
  }, [])

  return (
    <header className="draggable flex items-center justify-between px-3 py-2 border-b bg-background">
      <div className="flex items-center gap-2">
        <span className="text-lg">⏺</span>
        <span className="text-sm font-medium">Screen Recorder</span>
      </div>

      <div className="non-draggable flex items-center gap-1">
        <Button
          onClick={handleMinimize}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          onClick={handleMaximize}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Maximize"
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  )
})
