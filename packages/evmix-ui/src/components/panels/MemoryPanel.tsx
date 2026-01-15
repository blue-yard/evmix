import { useState, useMemo } from 'react'
import { useDebugStore } from '../../store/debugStore'
import type { MemoryWriteEvent } from '@evmix/core'

const BYTES_PER_ROW = 16

/**
 * Get set of byte offsets that changed at current step
 */
function useChangedBytes(): Set<number> {
  const session = useDebugStore((s) => s.session)
  const currentStep = useDebugStore((s) => s.currentStep)
  const events = useDebugStore((s) => s.events)

  return useMemo(() => {
    const changed = new Set<number>()
    if (!session || currentStep === 0) return changed

    const allEvents = session.getEvents()
    let opcodeCount = 0

    for (const event of allEvents) {
      if (event.type === 'opcode.start') {
        opcodeCount++
        if (opcodeCount > currentStep) break
      }

      // Track memory writes at current step
      if (opcodeCount === currentStep && event.type === 'memory.write') {
        const writeEvent = event as MemoryWriteEvent
        // Parse the hex data to get byte count
        const dataHex = writeEvent.data.replace(/^0x/, '')
        const byteCount = dataHex.length / 2
        for (let i = 0; i < byteCount; i++) {
          changed.add(writeEvent.offset + i)
        }
      }
    }

    return changed
  }, [session, events, currentStep])
}

export function MemoryPanel() {
  const snapshot = useDebugStore((s) => s.snapshot)
  const [showAscii, setShowAscii] = useState(true)
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null)
  const changedBytes = useChangedBytes()

  if (!snapshot) {
    return (
      <div className="bg-evmix-panel border border-evmix-border rounded-lg">
        <div className="p-3 border-b border-evmix-border">
          <h2 className="text-sm font-semibold text-evmix-muted">MEMORY</h2>
        </div>
        <p className="text-evmix-muted text-sm p-4">No execution loaded</p>
      </div>
    )
  }

  const memory = snapshot.memory
  const rowCount = Math.ceil(memory.length / BYTES_PER_ROW)

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-evmix-border">
        <h2 className="text-sm font-semibold text-evmix-muted">
          MEMORY{' '}
          <span className="text-evmix-accent">({memory.length} bytes)</span>
          {changedBytes.size > 0 && (
            <span className="ml-2 text-yellow-400">
              ({changedBytes.size} changed)
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowAscii(!showAscii)}
          className="text-xs text-evmix-muted hover:text-evmix-accent"
        >
          {showAscii ? 'Hide ASCII' : 'Show ASCII'}
        </button>
      </div>

      {memory.length === 0 ? (
        <p className="text-evmix-muted text-sm italic p-4">Empty</p>
      ) : (
        <div className="font-mono text-xs max-h-80 overflow-y-auto">
          {/* Memory rows */}
          {Array.from({ length: rowCount }).map((_, row) => {
            const offset = row * BYTES_PER_ROW
            const rowHasChanges = Array.from({ length: BYTES_PER_ROW }).some(
              (_, i) => changedBytes.has(offset + i)
            )

            return (
              <MemoryRow
                key={offset}
                memory={memory}
                offset={offset}
                showAscii={showAscii}
                changedBytes={changedBytes}
                hasChanges={rowHasChanges}
                isSelected={selectedOffset !== null &&
                  selectedOffset >= offset &&
                  selectedOffset < offset + BYTES_PER_ROW}
                onSelect={setSelectedOffset}
              />
            )
          })}
        </div>
      )}

      {/* Selected byte detail */}
      {selectedOffset !== null && selectedOffset < memory.length && (
        <div className="p-3 border-t border-evmix-border text-xs">
          <div className="flex gap-4">
            <span className="text-evmix-muted">
              Offset: <code className="text-evmix-accent">0x{selectedOffset.toString(16).padStart(4, '0')}</code>
              <span className="text-evmix-muted/50 ml-1">({selectedOffset})</span>
            </span>
            <span className="text-evmix-muted">
              Value: <code className="text-evmix-text">0x{memory[selectedOffset].toString(16).padStart(2, '0')}</code>
              <span className="text-evmix-muted/50 ml-1">({memory[selectedOffset]})</span>
            </span>
            {memory[selectedOffset] >= 32 && memory[selectedOffset] <= 126 && (
              <span className="text-evmix-muted">
                ASCII: <code className="text-evmix-text">'{String.fromCharCode(memory[selectedOffset])}'</code>
              </span>
            )}
            {changedBytes.has(selectedOffset) && (
              <span className="text-yellow-400">← Changed this step</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface MemoryRowProps {
  memory: Uint8Array
  offset: number
  showAscii: boolean
  changedBytes: Set<number>
  hasChanges: boolean
  isSelected: boolean
  onSelect: (offset: number | null) => void
}

function MemoryRow({
  memory,
  offset,
  showAscii,
  changedBytes,
  hasChanges,
  isSelected,
  onSelect
}: MemoryRowProps) {
  return (
    <div
      className={`flex items-center px-3 py-1 border-l-2 transition-colors cursor-pointer ${
        hasChanges
          ? 'border-yellow-400 bg-yellow-400/5'
          : isSelected
          ? 'border-evmix-accent bg-evmix-accent/10'
          : 'border-transparent hover:bg-evmix-bg/50'
      }`}
    >
      {/* Offset */}
      <span className="text-evmix-muted w-12 flex-none">
        {offset.toString(16).padStart(4, '0')}
      </span>

      {/* Hex bytes - two groups of 8 */}
      <div className="flex gap-4 flex-1">
        <div className="flex gap-1">
          {Array.from({ length: 8 }).map((_, i) => {
            const byteOffset = offset + i
            const isChanged = changedBytes.has(byteOffset)
            const byte = byteOffset < memory.length ? memory[byteOffset] : null

            return (
              <span
                key={i}
                onClick={() => byte !== null && onSelect(byteOffset)}
                className={`w-5 text-center cursor-pointer ${
                  byte === null
                    ? 'text-evmix-muted/30'
                    : isChanged
                    ? 'text-yellow-400 font-bold bg-yellow-400/20 rounded'
                    : 'text-evmix-text hover:bg-evmix-accent/20 rounded'
                }`}
              >
                {byte !== null ? byte.toString(16).padStart(2, '0') : '  '}
              </span>
            )
          })}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 8 }).map((_, i) => {
            const byteOffset = offset + 8 + i
            const isChanged = changedBytes.has(byteOffset)
            const byte = byteOffset < memory.length ? memory[byteOffset] : null

            return (
              <span
                key={i}
                onClick={() => byte !== null && onSelect(byteOffset)}
                className={`w-5 text-center cursor-pointer ${
                  byte === null
                    ? 'text-evmix-muted/30'
                    : isChanged
                    ? 'text-yellow-400 font-bold bg-yellow-400/20 rounded'
                    : 'text-evmix-text hover:bg-evmix-accent/20 rounded'
                }`}
              >
                {byte !== null ? byte.toString(16).padStart(2, '0') : '  '}
              </span>
            )
          })}
        </div>
      </div>

      {/* ASCII */}
      {showAscii && (
        <div className="flex-none ml-4 text-evmix-muted">
          {Array.from({ length: BYTES_PER_ROW }).map((_, i) => {
            const byteOffset = offset + i
            const byte = byteOffset < memory.length ? memory[byteOffset] : null
            const isChanged = changedBytes.has(byteOffset)
            const char = byte !== null && byte >= 32 && byte <= 126
              ? String.fromCharCode(byte)
              : byte !== null ? '.' : ' '

            return (
              <span
                key={i}
                className={isChanged ? 'text-yellow-400 font-bold' : ''}
              >
                {char}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
