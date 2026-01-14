import { useDebugStore } from '../store/debugStore'
import type { TraceEvent } from '@evmix/core'

/**
 * Get marker type and color for an event
 */
function getEventMarker(event: TraceEvent): { color: string; label: string } | null {
  switch (event.type) {
    case 'jump':
      return { color: 'bg-evmix-accent', label: 'JUMP' }
    case 'storage.write':
      return { color: 'bg-evmix-warning', label: 'SSTORE' }
    case 'log':
      return { color: 'bg-purple-500', label: 'LOG' }
    case 'halt':
      return { color: 'bg-evmix-error', label: 'HALT' }
    default:
      return null
  }
}

export function Timeline() {
  const {
    currentStep,
    totalSteps,
    setStep,
    isPlaying,
    play,
    pause,
    stepForward,
    stepBackward,
    reset,
    playbackSpeed,
    setPlaybackSpeed,
    events,
  } = useDebugStore()

  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  // Get notable events for markers
  const markers = events
    .filter((e) => getEventMarker(e) !== null)
    .map((e) => ({
      event: e,
      marker: getEventMarker(e)!,
      // Approximate position based on event index
      position: (e.index / Math.max(events.length, 1)) * 100,
    }))

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      {/* Playback Controls */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={reset}
          className="p-2 hover:bg-evmix-bg rounded"
          title="Reset"
        >
          {'|<'}
        </button>
        <button
          onClick={stepBackward}
          className="p-2 hover:bg-evmix-bg rounded"
          title="Step Back"
          disabled={currentStep === 0}
        >
          {'<'}
        </button>
        <button
          onClick={isPlaying ? pause : play}
          className="p-2 hover:bg-evmix-bg rounded text-evmix-accent"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '||' : '>'}
        </button>
        <button
          onClick={stepForward}
          className="p-2 hover:bg-evmix-bg rounded"
          title="Step Forward"
          disabled={currentStep >= totalSteps}
        >
          {'>'}
        </button>
        <button
          onClick={() => setStep(totalSteps)}
          className="p-2 hover:bg-evmix-bg rounded"
          title="Go to End"
        >
          {'>|'}
        </button>

        <div className="flex-1" />

        {/* Speed Control */}
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          className="bg-evmix-bg border border-evmix-border rounded px-2 py-1 text-sm"
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={5}>5x</option>
          <option value={10}>10x</option>
          <option value={20}>20x</option>
        </select>

        {/* Step Counter */}
        <span className="text-sm text-evmix-muted">
          Step {currentStep} / {totalSteps}
        </span>
      </div>

      {/* Timeline Scrubber */}
      <div className="relative h-8">
        {/* Track */}
        <div className="absolute inset-y-2 left-0 right-0 bg-evmix-bg rounded">
          {/* Progress */}
          <div
            className="h-full bg-evmix-accent/30 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Event Markers */}
        {markers.map(({ event, marker, position }, i) => (
          <div
            key={`${event.type}-${i}`}
            className={`absolute top-0 w-1 h-3 ${marker.color} rounded`}
            style={{ left: `${position}%` }}
            title={marker.label}
          />
        ))}

        {/* Scrubber Handle */}
        <input
          type="range"
          min={0}
          max={totalSteps}
          value={currentStep}
          onChange={(e) => setStep(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />

        {/* Playhead */}
        <div
          className="absolute top-1 w-2 h-6 bg-evmix-accent rounded shadow-lg"
          style={{ left: `calc(${progress}% - 4px)` }}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-evmix-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-evmix-accent rounded" /> Jump
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-evmix-warning rounded" /> Storage
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-purple-500 rounded" /> Log
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-evmix-error rounded" /> Halt
        </span>
      </div>
    </div>
  )
}
