"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Monitor, Mic, Video, Camera, PhoneOff } from "lucide-react"

interface VideoControlsProps extends React.HTMLAttributes<HTMLDivElement> {
  onShare?: () => void
  onMute?: () => void
  onVideo?: () => void
  onRecord?: () => void
  onEnd?: () => void
}

const VideoControls = React.forwardRef<HTMLDivElement, VideoControlsProps>(
  ({ className, onShare, onMute, onVideo, onRecord, onEnd, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed bottom-0 left-0 right-0 flex items-center justify-center gap-4 bg-background/80 backdrop-blur-sm p-4",
          className
        )}
        {...props}
      >
        <Button
          variant="secondary"
          size="icon"
          onClick={onShare}
          className="w-12 h-12"
        >
          <Monitor className="h-6 w-6" />
          <span className="sr-only">Share screen</span>
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={onMute}
          className="w-12 h-12"
        >
          <Mic className="h-6 w-6" />
          <span className="sr-only">Toggle mute</span>
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={onVideo}
          className="w-12 h-12"
        >
          <Video className="h-6 w-6" />
          <span className="sr-only">Toggle video</span>
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={onRecord}
          className="w-12 h-12"
        >
          <Camera className="h-6 w-6" />
          <span className="sr-only">Toggle recording</span>
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={onEnd}
          className="w-12 h-12"
        >
          <PhoneOff className="h-6 w-6" />
          <span className="sr-only">End call</span>
        </Button>
      </div>
    )
  }
)
VideoControls.displayName = "VideoControls"

export { VideoControls } 