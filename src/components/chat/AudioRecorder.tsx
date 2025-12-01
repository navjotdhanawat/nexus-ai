/**
 * Audio Recorder Component
 * Records audio with waveform visualization
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Mic, Square, Pause, Play, X, Send, Loader2 } from 'lucide-react'
import type { AudioContentPart } from '@/types/multimodal'
import { blobToAudioContent } from '@/types/multimodal'
import { logger } from '@/lib/logger'
import { createMediaError, handleError } from '@/lib/errors'

// ============================================
// Types
// ============================================

interface AudioRecorderProps {
  isOpen: boolean
  onClose: () => void
  onAudioReady: (audio: AudioContentPart) => void
  maxDuration?: number
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'preview'

// ============================================
// Constants
// ============================================

const DEFAULT_MAX_DURATION = 300 // 5 minutes
const AUDIO_LEVELS_HISTORY = 40
const DATA_COLLECT_INTERVAL = 100 // ms

// ============================================
// Component
// ============================================

export const AudioRecorder = memo(function AudioRecorder({
  isOpen,
  onClose,
  onAudioReady,
  maxDuration = DEFAULT_MAX_DURATION,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioLevels, setAudioLevels] = useState<number[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Cleanup timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Cleanup animation
  const clearAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  // Cleanup media recorder
  const cleanupMediaRecorder = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // Ignore errors when stopping
      }
    }
    mediaRecorderRef.current = null
  }, [])

  // Cleanup stream
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  // Cleanup audio context
  const cleanupAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        // Ignore errors when closing
      })
      audioContextRef.current = null
    }
    analyzerRef.current = null
  }, [])

  // Combined cleanup for all resources
  const cleanupResources = useCallback(() => {
    clearTimer()
    clearAnimation()
    cleanupMediaRecorder()
    cleanupStream()
    cleanupAudioContext()
  }, [clearTimer, clearAnimation, cleanupMediaRecorder, cleanupStream, cleanupAudioContext])

  // Cleanup audio URL separately to handle revocation properly
  useEffect(() => {
    const url = audioUrl
    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [audioUrl])

  // Cleanup all resources on unmount
  useEffect(() => {
    return () => {
      cleanupResources()
    }
  }, [cleanupResources])

  // Stop recording function
  const stopRecording = useCallback(() => {
    clearTimer()
    clearAnimation()

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      setState('processing')
      mediaRecorderRef.current.stop()
    }

    cleanupStream()
  }, [clearTimer, clearAnimation, cleanupStream])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      // Set up audio analysis for visualization
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyzerRef.current = analyser

      // Visualization update function
      const updateLevels = () => {
        if (!analyzerRef.current) return

        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount)
        analyzerRef.current.getByteFrequencyData(dataArray)

        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        const normalized = average / 255

        setAudioLevels(prev => {
          const newLevels = [...prev.slice(-(AUDIO_LEVELS_HISTORY - 1)), normalized]
          return newLevels
        })

        animationRef.current = requestAnimationFrame(updateLevels)
      }

      // Determine the best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState('preview')
      }

      mediaRecorder.onerror = e => {
        logger.error('MediaRecorder error', { error: e })
        setError('Recording failed')
        cleanupResources()
        setState('idle')
      }

      // Start recording
      mediaRecorder.start(DATA_COLLECT_INTERVAL)
      setState('recording')
      setDuration(0)

      // Start timer with max duration check
      const stopFn = stopRecording
      const timerId = window.setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            queueMicrotask(() => {
              if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== 'inactive'
              ) {
                stopFn()
              }
            })
          }
          return newDuration
        })
      }, 1000)
      timerRef.current = timerId

      // Start visualization
      updateLevels()
    } catch (err) {
      logger.error('Failed to start recording', { error: err })

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          const appError = createMediaError('mic_denied')
          setError(appError.userMessage)
        } else if (err.name === 'NotFoundError') {
          const appError = createMediaError('mic_not_found')
          setError(appError.userMessage)
        } else {
          setError(handleError(err, 'Start recording'))
        }
      }
      setState('idle')
    }
  }, [maxDuration, cleanupResources, stopRecording])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.pause()
      setState('paused')
      clearTimer()
    }
  }, [clearTimer])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'paused'
    ) {
      mediaRecorderRef.current.resume()
      setState('recording')

      // Resume timer
      const stopFn = stopRecording
      timerRef.current = window.setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            queueMicrotask(() => {
              if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== 'inactive'
              ) {
                stopFn()
              }
            })
          }
          return newDuration
        })
      }, 1000)
    }
  }, [maxDuration, stopRecording])

  // Send audio
  const handleSend = useCallback(async () => {
    if (!audioBlob) return

    setState('processing')
    try {
      const audioContent = await blobToAudioContent(audioBlob, duration)
      onAudioReady(audioContent)
      onClose()
    } catch (err) {
      logger.error('Failed to process audio', { error: err })
      setError(handleError(err, 'Process audio'))
      setState('preview')
    }
  }, [audioBlob, duration, onAudioReady, onClose])

  // Cancel recording
  const handleCancel = useCallback(() => {
    cleanupResources()
    setState('idle')
    setDuration(0)
    setAudioBlob(null)
    setAudioUrl(null)
    setAudioLevels([])
    setError(null)
    onClose()
  }, [cleanupResources, onClose])

  // Reset to record again
  const handleReset = useCallback(() => {
    cleanupResources()
    setAudioBlob(null)
    setAudioUrl(null)
    setState('idle')
    setDuration(0)
    setAudioLevels([])
  }, [cleanupResources])

  // Format duration display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="absolute inset-x-0 bottom-full mx-4 mb-2">
      <div className="rounded-2xl border bg-background p-4 shadow-lg">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-3 w-3 rounded-full',
                state === 'recording' && 'animate-pulse bg-red-500',
                state === 'paused' && 'bg-amber-500',
                state === 'preview' && 'bg-emerald-500',
                state === 'idle' && 'bg-muted',
                state === 'processing' && 'bg-blue-500'
              )}
            />
            <span className="text-sm font-medium">
              {state === 'idle' && 'Ready to record'}
              {state === 'recording' && 'Recording...'}
              {state === 'paused' && 'Paused'}
              {state === 'processing' && 'Processing...'}
              {state === 'preview' && 'Preview'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Waveform visualization */}
        <div className="mb-3 flex h-12 items-center justify-center gap-0.5 rounded-lg bg-muted/50 px-4">
          {state === 'recording' || state === 'paused' ? (
            audioLevels.map((level, i) => (
              <div
                key={i}
                className={cn(
                  'w-1 rounded-full transition-all',
                  state === 'recording' ? 'bg-violet-500' : 'bg-violet-500/50'
                )}
                style={{
                  height: `${Math.max(4, level * 40)}px`,
                }}
              />
            ))
          ) : state === 'preview' && audioUrl ? (
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="h-10 w-full"
            />
          ) : (
            <span className="text-xs text-muted-foreground">
              Click the microphone to start recording
            </span>
          )}
        </div>

        {/* Duration */}
        <div className="mb-4 text-center">
          <span className="font-mono text-2xl font-semibold">
            {formatDuration(duration)}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            / {formatDuration(maxDuration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {state === 'idle' && (
            <Button
              variant="default"
              size="lg"
              className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              onClick={startRecording}
            >
              <Mic className="h-6 w-6" />
            </Button>
          )}

          {state === 'recording' && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={pauseRecording}
              >
                <Pause className="h-5 w-5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={stopRecording}
              >
                <Square className="h-5 w-5" fill="currentColor" />
              </Button>
            </>
          )}

          {state === 'paused' && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={resumeRecording}
              >
                <Play className="h-5 w-5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={stopRecording}
              >
                <Square className="h-5 w-5" fill="currentColor" />
              </Button>
            </>
          )}

          {state === 'processing' && (
            <div className="flex h-14 w-14 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          )}

          {state === 'preview' && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={handleReset}
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                onClick={handleSend}
              >
                <Send className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

export default AudioRecorder
