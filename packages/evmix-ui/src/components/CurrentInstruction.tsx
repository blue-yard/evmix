import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDebugStore } from '../store/debugStore'
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
  snapshot: { halted: boolean; haltReason?: string; gasRemaining: bigint }
}

function ExecutionComplete({ snapshot }: ExecutionCompleteProps) {
  const reason = snapshot.haltReason || 'unknown'
  const isSuccess = reason === 'stop' || reason === 'return'
  const isRevert = reason === 'revert'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-2"
    >
      <div
        className={`text-2xl font-bold mb-2 ${
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
      <div className="text-xs text-evmix-muted mt-1">
        Gas remaining: {snapshot.gasRemaining.toLocaleString()}
      </div>
    </motion.div>
  )
}
