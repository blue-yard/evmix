import { create } from 'zustand'
import { DebugSession } from '../lib/DebugSession'
import type { ExecutionSnapshot, DebugSessionConfig } from '../lib/types'
import type { TraceEvent } from '@evmix/core'

interface DebugState {
  // Session
  session: DebugSession | null
  isLoading: boolean
  error: string | null

  // Playback
  currentStep: number
  totalSteps: number
  isPlaying: boolean
  playbackSpeed: number // steps per second

  // Current state view
  snapshot: ExecutionSnapshot | null
  events: TraceEvent[]

  // Actions
  loadBytecode: (config: DebugSessionConfig) => void
  setStep: (step: number) => void
  stepForward: () => void
  stepBackward: () => void
  play: () => void
  pause: () => void
  setPlaybackSpeed: (speed: number) => void
  reset: () => void
}

export const useDebugStore = create<DebugState>((set, get) => ({
  // Initial state
  session: null,
  isLoading: false,
  error: null,
  currentStep: 0,
  totalSteps: 0,
  isPlaying: false,
  playbackSpeed: 5,
  snapshot: null,
  events: [],

  // Load and execute bytecode
  loadBytecode: (config: DebugSessionConfig) => {
    set({ isLoading: true, error: null })

    try {
      const session = new DebugSession(config)
      session.runToCompletion()

      const totalSteps = session.getTotalSteps()
      const snapshot = session.getSnapshot(0)
      const events = session.getEventsUpTo(0)

      set({
        session,
        isLoading: false,
        currentStep: 0,
        totalSteps,
        snapshot,
        events,
      })
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  },

  // Set current step (time-travel)
  setStep: (step: number) => {
    const { session } = get()
    if (!session) return

    const clampedStep = Math.max(0, Math.min(step, session.getTotalSteps()))
    const snapshot = session.getSnapshot(clampedStep)
    const events = session.getEventsUpTo(clampedStep)

    set({ currentStep: clampedStep, snapshot, events })
  },

  stepForward: () => {
    const { currentStep, totalSteps, setStep } = get()
    if (currentStep < totalSteps) {
      setStep(currentStep + 1)
    }
  },

  stepBackward: () => {
    const { currentStep, setStep } = get()
    if (currentStep > 0) {
      setStep(currentStep - 1)
    }
  },

  play: () => {
    set({ isPlaying: true })
    const tick = () => {
      const { isPlaying, currentStep, totalSteps, stepForward, playbackSpeed } = get()
      if (!isPlaying || currentStep >= totalSteps) {
        set({ isPlaying: false })
        return
      }
      stepForward()
      setTimeout(tick, 1000 / playbackSpeed)
    }
    tick()
  },

  pause: () => {
    set({ isPlaying: false })
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed })
  },

  reset: () => {
    const { setStep } = get()
    setStep(0)
    set({ isPlaying: false })
  },
}))
