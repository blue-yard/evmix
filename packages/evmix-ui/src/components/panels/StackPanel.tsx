import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDebugStore } from '../../store/debugStore'
import { formatValue } from '../../lib/disassembler'

type DisplayMode = 'auto' | 'hex' | 'decimal' | 'all'

export function StackPanel() {
  const snapshot = useDebugStore((s) => s.snapshot)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('auto')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

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
    <div className="bg-evmix-panel border border-evmix-border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-evmix-border">
        <h2 className="text-sm font-semibold text-evmix-muted">
          STACK <span className="text-evmix-accent">({stack.length})</span>
        </h2>
        <select
          value={displayMode}
          onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
          className="text-xs bg-evmix-bg border border-evmix-border rounded px-2 py-1"
        >
          <option value="auto">Auto</option>
          <option value="hex">Hex</option>
          <option value="decimal">Decimal</option>
          <option value="all">All formats</option>
        </select>
      </div>

      {stack.length === 0 ? (
        <p className="text-evmix-muted text-sm italic p-4">Empty</p>
      ) : (
        <div className="divide-y divide-evmix-border max-h-80 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {[...stack].reverse().map((hexValue, i) => {
              const stackIndex = stack.length - 1 - i
              const value = BigInt(hexValue)
              const formatted = formatValue(value)
              const isSelected = selectedIndex === stackIndex

              return (
                <motion.div
                  key={`${stackIndex}-${hexValue}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={() => setSelectedIndex(isSelected ? null : stackIndex)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isSelected ? 'bg-evmix-accent/10' : 'hover:bg-evmix-bg'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Stack index */}
                    <span className="text-evmix-muted text-xs w-6 text-right font-mono">
                      {stackIndex}
                    </span>

                    {/* Value display */}
                    <div className="flex-1 font-mono text-xs">
                      <StackValue
                        value={value}
                        formatted={formatted}
                        mode={displayMode}
                      />
                    </div>
                  </div>

                  {/* Expanded view */}
                  <AnimatePresence>
                    {isSelected && displayMode !== 'all' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t border-evmix-border/50 space-y-1 text-xs ml-9">
                          <div className="flex gap-2">
                            <span className="text-evmix-muted w-14">Hex:</span>
                            <code className="text-evmix-text">{formatted.hex}</code>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-evmix-muted w-14">Decimal:</span>
                            <code className="text-evmix-text">{formatted.decimal}</code>
                          </div>
                          {formatted.signed && (
                            <div className="flex gap-2">
                              <span className="text-evmix-muted w-14">Signed:</span>
                              <code className="text-evmix-warning">{formatted.signed}</code>
                            </div>
                          )}
                          {formatted.address && (
                            <div className="flex gap-2">
                              <span className="text-evmix-muted w-14">Address:</span>
                              <code className="text-evmix-accent">{formatted.address}</code>
                            </div>
                          )}
                          {formatted.eth && (
                            <div className="flex gap-2">
                              <span className="text-evmix-muted w-14">ETH:</span>
                              <code className="text-evmix-success">{formatted.eth}</code>
                            </div>
                          )}
                          {formatted.ascii && (
                            <div className="flex gap-2">
                              <span className="text-evmix-muted w-14">ASCII:</span>
                              <code className="text-evmix-text">{formatted.ascii}</code>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

interface StackValueProps {
  value: bigint
  formatted: ReturnType<typeof formatValue>
  mode: DisplayMode
}

function StackValue({ value, formatted, mode }: StackValueProps) {
  switch (mode) {
    case 'hex':
      return <code className="text-evmix-text">{formatted.hex}</code>

    case 'decimal':
      return <code className="text-evmix-text">{formatted.decimal}</code>

    case 'all':
      return (
        <div className="space-y-0.5">
          <code className="text-evmix-text block">{formatted.hex}</code>
          <code className="text-evmix-muted block">{formatted.decimal}</code>
          {formatted.eth && (
            <code className="text-evmix-success block">{formatted.eth}</code>
          )}
        </div>
      )

    case 'auto':
    default:
      // Smart display: show the most useful format
      return <code className="text-evmix-text">{getAutoDisplay(value, formatted)}</code>
  }
}

function getAutoDisplay(value: bigint, formatted: ReturnType<typeof formatValue>): string {
  // Small numbers: decimal
  if (value < 1000n) {
    return `${value}`
  }

  // ETH amounts
  if (formatted.eth) {
    return `${formatted.eth}`
  }

  // ASCII strings
  if (formatted.ascii) {
    return formatted.ascii
  }

  // Addresses
  if (formatted.address) {
    const addr = formatted.address
    return `${addr.slice(0, 10)}...${addr.slice(-6)}`
  }

  // Large numbers: truncated hex
  const hex = formatted.hex
  if (hex.length > 20) {
    return `${hex.slice(0, 10)}...${hex.slice(-6)}`
  }

  return hex
}
