import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDebugStore } from '../../store/debugStore'
import { formatValue } from '../../lib/disassembler'
import type { StorageWriteEvent, StorageReadEvent } from '@evmix/core'

/**
 * Storage slot info with history
 */
interface StorageSlot {
  key: string           // Raw hex key
  slotNumber: string    // Decimal slot number (if small enough)
  currentValue: string  // Current hex value
  previousValue: string | null // Previous value (null if first write)
  writeCount: number    // How many times written
  readCount: number     // How many times read
}

/**
 * Extract storage state from events, tracking history
 */
function buildStorageState(
  events: (StorageWriteEvent | StorageReadEvent)[]
): Map<string, StorageSlot> {
  const storage = new Map<string, StorageSlot>()

  for (const event of events) {
    const existing = storage.get(event.key)

    if (event.type === 'storage.write') {
      if (existing) {
        // Update existing slot
        storage.set(event.key, {
          ...existing,
          previousValue: existing.currentValue,
          currentValue: event.value,
          writeCount: existing.writeCount + 1,
        })
      } else {
        // First write to this slot
        const slotBigInt = BigInt(event.key)
        storage.set(event.key, {
          key: event.key,
          slotNumber: slotBigInt < 1000n ? slotBigInt.toString() : formatSlotNumber(event.key),
          currentValue: event.value,
          previousValue: null, // Was zero before (uninitialized)
          writeCount: 1,
          readCount: 0,
        })
      }
    } else if (event.type === 'storage.read') {
      if (existing) {
        storage.set(event.key, {
          ...existing,
          readCount: existing.readCount + 1,
        })
      } else {
        // Read from unwritten slot (returns zero)
        const slotBigInt = BigInt(event.key)
        storage.set(event.key, {
          key: event.key,
          slotNumber: slotBigInt < 1000n ? slotBigInt.toString() : formatSlotNumber(event.key),
          currentValue: event.value,
          previousValue: null,
          writeCount: 0,
          readCount: 1,
        })
      }
    }
  }

  return storage
}

/**
 * Format a slot number for display
 */
function formatSlotNumber(hex: string): string {
  // For large slot numbers (like keccak hashes), truncate
  if (hex.length > 10) {
    return `${hex.slice(0, 6)}...${hex.slice(-4)}`
  }
  return BigInt(hex).toString()
}

/**
 * Get a human-friendly display of a storage value
 */
function getValueDisplay(hex: string): { short: string; full: string } {
  const value = BigInt(hex)
  const formatted = formatValue(value)

  // For zero
  if (value === 0n) {
    return { short: '0', full: 'Zero (empty slot)' }
  }

  // For small numbers
  if (value < 1000n) {
    return { short: value.toString(), full: `${value} (0x${value.toString(16)})` }
  }

  // For values that look like addresses
  if (formatted.address) {
    return {
      short: `${formatted.address.slice(0, 8)}...${formatted.address.slice(-4)}`,
      full: `Address: ${formatted.address}`
    }
  }

  // For ETH amounts
  if (formatted.eth) {
    return { short: formatted.eth, full: `${formatted.eth} (${formatted.hex})` }
  }

  // For ASCII strings
  if (formatted.ascii) {
    return { short: formatted.ascii, full: `String: ${formatted.ascii}` }
  }

  // For large numbers, truncate hex
  const hexStr = formatted.hex
  if (hexStr.length > 18) {
    return {
      short: `${hexStr.slice(0, 10)}...${hexStr.slice(-4)}`,
      full: hexStr
    }
  }

  return { short: hexStr, full: `${formatted.decimal} (${hexStr})` }
}

export function StoragePanel() {
  const events = useDebugStore((s) => s.events)
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)

  const storageEvents = events.filter(
    (e) => e.type === 'storage.write' || e.type === 'storage.read'
  ) as (StorageWriteEvent | StorageReadEvent)[]

  const storageState = buildStorageState(storageEvents)

  // Sort slots by slot number (numeric sort for small numbers)
  const sortedSlots = Array.from(storageState.values()).sort((a, b) => {
    const aNum = BigInt(a.key)
    const bNum = BigInt(b.key)
    if (aNum < bNum) return -1
    if (aNum > bNum) return 1
    return 0
  })

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg">
      <div className="flex items-center justify-between p-3 border-b border-evmix-border">
        <h2 className="text-sm font-semibold text-evmix-muted">
          STORAGE{' '}
          <span className="text-evmix-accent">({storageState.size} slots)</span>
        </h2>
      </div>

      {storageState.size === 0 ? (
        <p className="text-evmix-muted text-sm italic p-4">No storage accessed yet</p>
      ) : (
        <div className="divide-y divide-evmix-border max-h-80 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {sortedSlots.map((slot) => {
              const isExpanded = expandedSlot === slot.key
              const currentDisplay = getValueDisplay(slot.currentValue)
              const previousDisplay = slot.previousValue
                ? getValueDisplay(slot.previousValue)
                : { short: '0', full: 'Zero (uninitialized)' }
              const wasModified = slot.writeCount > 0

              return (
                <motion.div
                  key={slot.key}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={() => setExpandedSlot(isExpanded ? null : slot.key)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isExpanded ? 'bg-evmix-accent/10' : 'hover:bg-evmix-bg'
                  }`}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3">
                    {/* Slot indicator */}
                    <div className="flex items-center gap-1">
                      <span className="text-evmix-muted text-xs">Slot</span>
                      <code className="text-xs font-semibold text-orange-400 w-8">
                        {slot.slotNumber}
                      </code>
                    </div>

                    {/* Value change display */}
                    <div className="flex-1 flex items-center gap-2 font-mono text-xs">
                      {wasModified && slot.previousValue !== null ? (
                        // Show old -> new for updates
                        <>
                          <span className="text-evmix-muted line-through">
                            {previousDisplay.short}
                          </span>
                          <span className="text-evmix-muted">→</span>
                          <span className="text-evmix-success font-semibold">
                            {currentDisplay.short}
                          </span>
                        </>
                      ) : wasModified ? (
                        // First write (was zero)
                        <>
                          <span className="text-evmix-muted">0</span>
                          <span className="text-evmix-muted">→</span>
                          <span className="text-evmix-success font-semibold">
                            {currentDisplay.short}
                          </span>
                        </>
                      ) : (
                        // Read-only (no writes)
                        <span className="text-evmix-text">
                          {currentDisplay.short}
                        </span>
                      )}
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-1">
                      {slot.writeCount > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-evmix-success/20 text-evmix-success">
                          W{slot.writeCount > 1 ? `×${slot.writeCount}` : ''}
                        </span>
                      )}
                      {slot.readCount > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-evmix-accent/20 text-evmix-accent">
                          R{slot.readCount > 1 ? `×${slot.readCount}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t border-evmix-border/50 space-y-2 text-xs">
                          {/* Slot key details */}
                          <div>
                            <span className="text-evmix-muted block mb-1">Storage Key (Slot):</span>
                            <code className="text-evmix-text break-all block bg-evmix-bg/50 p-1 rounded">
                              {slot.key}
                            </code>
                          </div>

                          {/* Current value details */}
                          <div>
                            <span className="text-evmix-muted block mb-1">Current Value:</span>
                            <code className="text-evmix-success break-all block bg-evmix-bg/50 p-1 rounded">
                              {slot.currentValue}
                            </code>
                            <span className="text-evmix-muted mt-1 block">
                              = {currentDisplay.full}
                            </span>
                          </div>

                          {/* Previous value (if modified) */}
                          {wasModified && (
                            <div>
                              <span className="text-evmix-muted block mb-1">Previous Value:</span>
                              <code className="text-evmix-muted break-all block bg-evmix-bg/50 p-1 rounded">
                                {slot.previousValue ?? '0x0'}
                              </code>
                              <span className="text-evmix-muted mt-1 block">
                                = {previousDisplay.full}
                              </span>
                            </div>
                          )}

                          {/* Access stats */}
                          <div className="flex gap-4 pt-1">
                            <span className="text-evmix-muted">
                              Writes: <span className="text-evmix-success">{slot.writeCount}</span>
                            </span>
                            <span className="text-evmix-muted">
                              Reads: <span className="text-evmix-accent">{slot.readCount}</span>
                            </span>
                          </div>
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
