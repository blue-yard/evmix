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
    <div className="flex items-center gap-4">
      {/* Visual Meter */}
      <div className="relative w-32 h-2 bg-evmix-bg rounded overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-evmix-success via-evmix-warning to-evmix-error"
          initial={{ width: '100%' }}
          animate={{ width: `${percentRemaining}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      {/* Numbers */}
      <div className="flex gap-3 text-xs font-mono">
        <span className="text-evmix-muted">
          Used: <span className="text-evmix-error">{formatGas(usedGas)}</span>
        </span>
        <span className="text-evmix-muted">
          Left: <span className="text-evmix-success">{formatGas(currentGas)}</span>
        </span>
      </div>
    </div>
  )
}

function formatGas(gas: bigint): string {
  if (gas < 1000n) return gas.toString()
  if (gas < 1_000_000n) return (Number(gas) / 1000).toFixed(1) + 'K'
  return (Number(gas) / 1_000_000).toFixed(2) + 'M'
}
