import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDebugStore } from '../store/debugStore'
import type { ExecutionSnapshot } from '../lib/types'
import {
  disassemble,
  findInstructionAtPC,
  getOpcodeDescription,
  getOpcodeCategory,
  getCategoryColorClass,
  OPCODE_INFO,
} from '../lib/disassembler'

export function CurrentInstruction() {
  const session = useDebugStore((s) => s.session)
  const snapshot = useDebugStore((s) => s.snapshot)
  const currentStep = useDebugStore((s) => s.currentStep)
  const totalSteps = useDebugStore((s) => s.totalSteps)

  const instruction = useMemo(() => {
    if (!session || !snapshot) return null
    const instructions = disassemble(session.getBytecode())
    return findInstructionAtPC(instructions, snapshot.pc)
  }, [session, snapshot])

  if (!session || !snapshot) return null

  // Check if execution is complete
  const isComplete = currentStep >= totalSteps || snapshot.halted

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <AnimatePresence mode="wait">
        {isComplete ? (
          <ExecutionComplete snapshot={snapshot} />
        ) : instruction ? (
          <InstructionDetail key={instruction.pc} instruction={instruction} />
        ) : (
          <div className="text-evmix-muted text-sm">No instruction at PC</div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface InstructionDetailProps {
  instruction: ReturnType<typeof findInstructionAtPC>
}

function InstructionDetail({ instruction }: InstructionDetailProps) {
  if (!instruction) return null

  const category = getOpcodeCategory(instruction.opcode)
  const colorClass = getCategoryColorClass(category)
  const info = OPCODE_INFO[instruction.name]
  const description = getOpcodeDescription(instruction.name)
  const lines = description.split('\n')

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="space-y-3"
    >
      {/* Opcode name and PC */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${colorClass}`}>
            {instruction.name}
          </span>
          {instruction.data !== undefined && (
            <span className="text-lg text-evmix-muted font-mono">
              0x{instruction.data.toString(16)}
            </span>
          )}
        </div>
        <span className="text-evmix-muted text-sm font-mono">
          PC: 0x{instruction.pc.toString(16).padStart(4, '0')}
        </span>
      </div>

      {/* Stack signature */}
      {info && (
        <div className="font-mono text-sm bg-evmix-bg rounded px-3 py-2">
          <span className="text-evmix-muted">Stack: </span>
          <span className="text-evmix-text">{info.stack}</span>
        </div>
      )}

      {/* Description */}
      <div className="text-sm space-y-1">
        {lines.map((line, i) => (
          <p
            key={i}
            className={i === 0 ? 'text-evmix-text' : 'text-evmix-muted'}
          >
            {line}
          </p>
        ))}
      </div>

      {/* Data value explanation for PUSH */}
      {instruction.data !== undefined && (
        <div className="text-xs text-evmix-muted bg-evmix-bg/50 rounded px-3 py-2">
          <span className="text-evmix-muted">Pushing: </span>
          <span className="text-evmix-accent font-mono">
            {instruction.data < 1000n
              ? instruction.data.toString()
              : `0x${instruction.data.toString(16)}`}
          </span>
          {instruction.data < 256n && instruction.data >= 32n && instruction.data <= 126n && (
            <span className="ml-2 text-evmix-muted">
              (ASCII: '{String.fromCharCode(Number(instruction.data))}')
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

interface ExecutionCompleteProps {
  snapshot: ExecutionSnapshot
}

function ExecutionComplete({ snapshot }: ExecutionCompleteProps) {
  const session = useDebugStore((s) => s.session)
  const events = useDebugStore((s) => s.events)
  const totalSteps = useDebugStore((s) => s.totalSteps)

  const reason = snapshot.haltReason ?? 'UNKNOWN'
  const isSuccess = reason === 'STOP' || reason === 'RETURN'
  const isRevert = reason === 'REVERT'

  // Calculate gas used
  const initialGas = session?.getSnapshot(0).gasRemaining ?? 0n
  const gasUsed = initialGas - snapshot.gasRemaining

  // Count events by type
  const eventStats = useMemo(() => {
    const stats = {
      storageWrites: 0,
      storageReads: 0,
      memoryWrites: 0,
      logs: 0,
    }
    for (const event of events) {
      if (event.type === 'storage.write') stats.storageWrites++
      if (event.type === 'storage.read') stats.storageReads++
      if (event.type === 'memory.write') stats.memoryWrites++
      if (event.type === 'log') stats.logs++
    }
    return stats
  }, [events])

  // Try to extract return data from final memory (for RETURN/REVERT)
  // This is a simplification - actual return data would come from the halt event
  const returnDataHex = useMemo(() => {
    if (reason !== 'RETURN' && reason !== 'REVERT') return null
    // For now, show first 64 bytes of memory if any
    if (snapshot.memory.length === 0) return null
    const bytes = snapshot.memory.slice(0, Math.min(64, snapshot.memory.length))
    return '0x' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  }, [reason, snapshot.memory])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      {/* Status header */}
      <div className="text-center">
        <div
          className={`text-2xl font-bold mb-1 ${
            isSuccess
              ? 'text-evmix-success'
              : isRevert
              ? 'text-evmix-warning'
              : 'text-evmix-error'
          }`}
        >
          {isSuccess ? '✓ Execution Complete' : isRevert ? '↩ Reverted' : '✗ Failed'}
        </div>
        <div className="text-sm text-evmix-muted">
          Halted with: <span className="text-evmix-text font-mono">{reason.toUpperCase()}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <StatBox
          label="Steps"
          value={totalSteps.toLocaleString()}
          color="text-evmix-accent"
        />
        <StatBox
          label="Gas Used"
          value={formatGas(gasUsed)}
          subValue={`of ${formatGas(initialGas)}`}
          color="text-evmix-error"
        />
        <StatBox
          label="Storage"
          value={`${eventStats.storageWrites}W / ${eventStats.storageReads}R`}
          color="text-orange-400"
        />
        <StatBox
          label="Logs"
          value={eventStats.logs.toString()}
          color="text-indigo-400"
        />
      </div>

      {/* Return data (if any) */}
      {returnDataHex && returnDataHex !== '0x' && (
        <div className="bg-evmix-bg rounded p-3">
          <div className="text-xs text-evmix-muted mb-1">
            {reason === 'RETURN' ? 'Return Data:' : 'Revert Data:'}
          </div>
          <code className="text-xs text-evmix-text font-mono break-all">
            {returnDataHex.length > 130 ? returnDataHex.slice(0, 130) + '...' : returnDataHex}
          </code>
          {/* Try to decode as number if small */}
          {returnDataHex.length <= 66 && returnDataHex !== '0x' && (
            <div className="text-xs text-evmix-muted mt-1">
              = {BigInt(returnDataHex).toString()}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

interface StatBoxProps {
  label: string
  value: string
  subValue?: string
  color?: string
}

function StatBox({ label, value, subValue, color = 'text-evmix-text' }: StatBoxProps) {
  return (
    <div className="bg-evmix-bg rounded p-2">
      <div className="text-xs text-evmix-muted">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      {subValue && <div className="text-xs text-evmix-muted">{subValue}</div>}
    </div>
  )
}

function formatGas(gas: bigint): string {
  if (gas < 1000n) return gas.toString()
  if (gas < 1_000_000n) return (Number(gas) / 1000).toFixed(1) + 'K'
  return (Number(gas) / 1_000_000).toFixed(2) + 'M'
}
