import { motion, AnimatePresence } from 'framer-motion'
import { useDebugStore } from '../../store/debugStore'

/**
 * Format a hex value for display
 * Shows full value but truncates middle for long values
 */
function formatHex(hex: string): { display: string; full: string } {
  if (hex.length <= 18) {
    return { display: hex, full: hex }
  }
  const display = `${hex.slice(0, 10)}...${hex.slice(-6)}`
  return { display, full: hex }
}

/**
 * Guess the type of a stack value based on its pattern
 */
function guessType(hex: string): string | null {
  const value = BigInt(hex)

  // Check if it looks like an address (20 bytes, fits in 160 bits)
  if (hex.length === 42 && value < 2n ** 160n && value > 2n ** 128n) {
    return 'address?'
  }

  // Check if it's a small number
  if (value < 1000n) {
    return `(${value})`
  }

  // Check if it could be wei (common ETH amounts)
  if (value >= 10n ** 15n && value < 10n ** 24n) {
    const eth = Number(value) / 1e18
    if (eth < 1000) {
      return `~${eth.toFixed(4)} ETH`
    }
  }

  return null
}

export function StackPanel() {
  const snapshot = useDebugStore((s) => s.snapshot)

  if (!snapshot) {
    return (
      <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-evmix-muted mb-3">STACK</h2>
        <p className="text-evmix-muted text-sm">No execution loaded</p>
      </div>
    )
  }

  const stack = snapshot.stack

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">
        STACK <span className="text-evmix-accent">({stack.length})</span>
      </h2>

      {stack.length === 0 ? (
        <p className="text-evmix-muted text-sm italic">Empty</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {[...stack].reverse().map((value, i) => {
              const formatted = formatHex(value)
              const typeHint = guessType(value)
              const stackIndex = stack.length - 1 - i

              return (
                <motion.div
                  key={`${stackIndex}-${value}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="group flex items-center gap-2 bg-evmix-bg rounded px-2 py-1"
                >
                  <span className="text-evmix-muted text-xs w-6">
                    {stackIndex}
                  </span>
                  <code
                    className="text-xs text-evmix-text flex-1 truncate"
                    title={formatted.full}
                  >
                    {formatted.display}
                  </code>
                  {typeHint && (
                    <span className="text-xs text-evmix-muted">{typeHint}</span>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
