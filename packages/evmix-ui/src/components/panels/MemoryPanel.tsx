import { useState } from 'react'
import { useDebugStore } from '../../store/debugStore'

/**
 * Format bytes as hex string
 */
function bytesToHex(bytes: Uint8Array, start: number, length: number): string {
  const slice = bytes.slice(start, start + length)
  return Array.from(slice)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
}

/**
 * Format bytes as ASCII (printable chars only)
 */
function bytesToAscii(bytes: Uint8Array, start: number, length: number): string {
  const slice = bytes.slice(start, start + length)
  return Array.from(slice)
    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
    .join('')
}

const BYTES_PER_ROW = 16

export function MemoryPanel() {
  const snapshot = useDebugStore((s) => s.snapshot)
  const [showAscii, setShowAscii] = useState(true)

  if (!snapshot) {
    return (
      <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-evmix-muted mb-3">MEMORY</h2>
        <p className="text-evmix-muted text-sm">No execution loaded</p>
      </div>
    )
  }

  const memory = snapshot.memory
  const rowCount = Math.ceil(memory.length / BYTES_PER_ROW)

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-evmix-muted">
          MEMORY{' '}
          <span className="text-evmix-accent">({memory.length} bytes)</span>
        </h2>
        <button
          onClick={() => setShowAscii(!showAscii)}
          className="text-xs text-evmix-muted hover:text-evmix-accent"
        >
          {showAscii ? 'Hide ASCII' : 'Show ASCII'}
        </button>
      </div>

      {memory.length === 0 ? (
        <p className="text-evmix-muted text-sm italic">Empty</p>
      ) : (
        <div className="font-mono text-xs max-h-60 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="text-evmix-muted">
                <th className="text-left pr-4 pb-1">Offset</th>
                <th className="text-left pb-1">Hex</th>
                {showAscii && <th className="text-left pl-4 pb-1">ASCII</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, row) => {
                const offset = row * BYTES_PER_ROW
                const hex = bytesToHex(memory, offset, BYTES_PER_ROW)
                const ascii = bytesToAscii(memory, offset, BYTES_PER_ROW)

                return (
                  <tr key={offset} className="hover:bg-evmix-bg">
                    <td className="text-evmix-muted pr-4 py-0.5">
                      {offset.toString(16).padStart(4, '0')}
                    </td>
                    <td className="text-evmix-text py-0.5">{hex}</td>
                    {showAscii && (
                      <td className="text-evmix-muted pl-4 py-0.5">{ascii}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
