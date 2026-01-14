import { motion } from 'framer-motion'
import { useDebugStore } from '../store/debugStore'

export function GasMeter() {
  const snapshot = useDebugStore((s) => s.snapshot)
  const session = useDebugStore((s) => s.session)

  if (!snapshot || !session) {
    return null
  }

  // Get initial gas from first snapshot
  const initialSnapshot = session.getSnapshot(0)
  const initialGas = initialSnapshot.gasRemaining
  const currentGas = snapshot.gasRemaining
  const usedGas = initialGas - currentGas
  const percentRemaining = Number((currentGas * 100n) / initialGas)

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">GAS</h2>

      {/* Visual Meter */}
      <div className="relative h-4 bg-evmix-bg rounded overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-evmix-success via-evmix-warning to-evmix-error"
          initial={{ width: '100%' }}
          animate={{ width: `${percentRemaining}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      {/* Numbers */}
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-evmix-muted">
          Used: <span className="text-evmix-error">{usedGas.toString()}</span>
        </span>
        <span className="text-evmix-muted">
          Remaining:{' '}
          <span className="text-evmix-success">{currentGas.toString()}</span>
        </span>
      </div>
    </div>
  )
}
