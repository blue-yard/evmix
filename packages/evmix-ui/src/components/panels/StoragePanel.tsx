import { motion, AnimatePresence } from 'framer-motion'
import { useDebugStore } from '../../store/debugStore'
import type { StorageWriteEvent, StorageReadEvent } from '@evmix/core'

/**
 * Extract storage state from events
 */
function buildStorageState(
  events: (StorageWriteEvent | StorageReadEvent)[]
): Map<string, { key: string; value: string; isNew: boolean }> {
  const storage = new Map<string, { key: string; value: string; isNew: boolean }>()

  for (const event of events) {
    if (event.type === 'storage.write') {
      const existing = storage.has(event.key)
      storage.set(event.key, {
        key: event.key,
        value: event.value,
        isNew: !existing,
      })
    }
  }

  return storage
}

function formatHex(hex: string): string {
  if (hex.length <= 18) return hex
  return `${hex.slice(0, 10)}...${hex.slice(-6)}`
}

export function StoragePanel() {
  const events = useDebugStore((s) => s.events)

  const storageEvents = events.filter(
    (e) => e.type === 'storage.write' || e.type === 'storage.read'
  ) as (StorageWriteEvent | StorageReadEvent)[]

  const storageState = buildStorageState(storageEvents)

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">
        STORAGE{' '}
        <span className="text-evmix-accent">({storageState.size} slots)</span>
      </h2>

      {storageState.size === 0 ? (
        <p className="text-evmix-muted text-sm italic">No storage accessed</p>
      ) : (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {Array.from(storageState.values()).map(({ key, value, isNew }) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`flex items-center gap-2 rounded px-2 py-1 ${
                  isNew ? 'bg-evmix-success/10' : 'bg-evmix-bg'
                }`}
              >
                <code
                  className="text-xs text-evmix-muted truncate w-24"
                  title={key}
                >
                  {formatHex(key)}
                </code>
                <span className="text-evmix-muted">{'->'}</span>
                <code
                  className="text-xs text-evmix-text truncate flex-1"
                  title={value}
                >
                  {formatHex(value)}
                </code>
                {isNew && (
                  <span className="text-xs text-evmix-success">NEW</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
