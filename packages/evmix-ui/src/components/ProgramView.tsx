import { useEffect, useRef, useState, useMemo, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { useDebugStore } from '../store/debugStore'
import {
  disassemble,
  findInstructionIndexAtPC,
  getInstructionAnnotation,
  getOpcodeCategory,
  getCategoryColorClass,
  getOpcodeDescription,
  type Instruction,
} from '../lib/disassembler'

interface ProgramViewProps {
  className?: string
}

export function ProgramView({ className = '' }: ProgramViewProps) {
  const session = useDebugStore((s) => s.session)
  const snapshot = useDebugStore((s) => s.snapshot)
  const currentStep = useDebugStore((s) => s.currentStep)
  const [autoScroll, setAutoScroll] = useState(true)
  const currentRowRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const jumpTargetRef = useRef<HTMLDivElement>(null)

  // Disassemble bytecode
  const instructions = useMemo(() => {
    if (!session) return []
    return disassemble(session.getBytecode())
  }, [session])

  // Get current PC from snapshot (now accurate since we snapshot every step)
  // snapshot.pc = the NEXT instruction to execute
  const currentPC = snapshot?.pc ?? 0

  const currentIndex = useMemo(
    () => findInstructionIndexAtPC(instructions, currentPC),
    [instructions, currentPC]
  )

  // Detect jump target when current instruction is JUMP/JUMPI
  const jumpTarget = useMemo(() => {
    if (!snapshot || !instructions[currentIndex]) return null

    const currentInst = instructions[currentIndex]
    const isJump = currentInst.name === 'JUMP' || currentInst.name === 'JUMPI'

    if (!isJump || snapshot.stack.length === 0) return null

    // Jump destination is top of stack
    const destHex = snapshot.stack[snapshot.stack.length - 1]
    const dest = Number(BigInt(destHex))

    // Find instruction at that PC
    const targetIndex = findInstructionIndexAtPC(instructions, dest)
    if (targetIndex === -1) return null

    const targetInst = instructions[targetIndex]
    // Verify it's a valid JUMPDEST
    const isValid = targetInst?.isJumpDest

    return {
      pc: dest,
      index: targetIndex,
      isValid,
      isConditional: currentInst.name === 'JUMPI',
    }
  }, [snapshot, instructions, currentIndex])

  // Auto-scroll to current instruction
  useEffect(() => {
    if (autoScroll && currentRowRef.current && containerRef.current) {
      currentRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentIndex, autoScroll])

  // Track which instructions have been executed (by looking at all events up to current)
  const executedPCs = useMemo(() => {
    const executed = new Set<number>()
    const allEvents = session?.getEvents() ?? []

    // Count opcode.start events to find which ones are before currentStep
    let opcodeCount = 0
    for (const event of allEvents) {
      if (event.type === 'opcode.start') {
        if (opcodeCount < currentStep) {
          executed.add(event.pc)
        }
        opcodeCount++
      }
    }
    return executed
  }, [session, currentStep])

  if (!session || instructions.length === 0) {
    return (
      <div className={`bg-evmix-panel border border-evmix-border rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-evmix-muted">PROGRAM</h2>
        </div>
        <p className="text-evmix-muted text-sm">Load bytecode to see disassembly</p>
      </div>
    )
  }

  return (
    <div className={`bg-evmix-panel border border-evmix-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-evmix-border">
        <h2 className="text-sm font-semibold text-evmix-muted">
          PROGRAM{' '}
          <span className="text-evmix-accent">({instructions.length} instructions)</span>
        </h2>
        <label className="flex items-center gap-2 text-xs text-evmix-muted">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>
      </div>

      {/* Instructions */}
      <div
        ref={containerRef}
        className="overflow-y-auto font-mono text-sm"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {instructions.map((inst, index) => (
          <InstructionRow
            key={inst.pc}
            instruction={inst}
            isCurrent={index === currentIndex}
            isExecuted={executedPCs.has(inst.pc)}
            isJumpTarget={jumpTarget?.index === index}
            jumpTargetValid={jumpTarget?.index === index ? jumpTarget.isValid : undefined}
            isConditionalTarget={jumpTarget?.index === index ? jumpTarget.isConditional : false}
            ref={index === currentIndex ? currentRowRef : jumpTarget?.index === index ? jumpTargetRef : null}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-3 border-t border-evmix-border text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded" /> Stack
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-purple-400 rounded" /> Flow
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-yellow-400 rounded" /> Memory
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-orange-400 rounded" /> Storage
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-400 rounded" /> Arithmetic
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-red-400 rounded" /> System
        </span>
        <span className="text-evmix-muted">|</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 border-2 border-purple-400 rounded" /> Jump Target
        </span>
      </div>
    </div>
  )
}

interface InstructionRowProps {
  instruction: Instruction
  isCurrent: boolean
  isExecuted: boolean
  isJumpTarget?: boolean
  jumpTargetValid?: boolean
  isConditionalTarget?: boolean
}

const InstructionRow = forwardRef<HTMLDivElement, InstructionRowProps>(
  function InstructionRow({
    instruction,
    isCurrent,
    isExecuted,
    isJumpTarget,
    jumpTargetValid,
    isConditionalTarget
  }, ref) {
    const category = getOpcodeCategory(instruction.opcode)
    const colorClass = getCategoryColorClass(category)
    const annotation = getInstructionAnnotation(instruction)
    const description = getOpcodeDescription(instruction.name)

    // Build tooltip
    const tooltip = instruction.data !== undefined
      ? `${instruction.name}: ${description}\nValue: ${instruction.data} (0x${instruction.data.toString(16)})`
      : `${instruction.name}: ${description}`

    // Determine row styling
    const getRowClass = () => {
      if (isCurrent) {
        return 'bg-evmix-accent/20 border-evmix-accent'
      }
      if (isJumpTarget) {
        if (jumpTargetValid === false) {
          return 'bg-red-500/20 border-red-500 animate-pulse'
        }
        return isConditionalTarget
          ? 'bg-purple-500/20 border-purple-500'
          : 'bg-purple-500/30 border-purple-500'
      }
      if (isExecuted) {
        return 'bg-evmix-bg/50 border-transparent hover:bg-evmix-bg'
      }
      return 'border-transparent hover:bg-evmix-bg/30'
    }

    return (
      <div
        ref={ref}
        title={tooltip}
        className={`flex items-center gap-3 px-3 py-1.5 border-l-2 transition-colors cursor-help ${getRowClass()}`}
      >
        {/* PC */}
        <span className="text-evmix-muted w-12 text-right text-xs">
          {instruction.pc.toString(16).padStart(4, '0')}
        </span>

        {/* Jump destination marker */}
        <span className="w-4 text-center">
          {instruction.isJumpDest && (
            <span className="text-purple-400" title="Valid jump target">
              {'->'}
            </span>
          )}
        </span>

        {/* Opcode name */}
        <span className={`w-20 font-semibold ${colorClass}`}>
          {instruction.name}
        </span>

        {/* Data / Annotation */}
        <span className="flex-1 text-evmix-text">
          {instruction.data !== undefined && (
            <span className="text-evmix-muted">
              0x{instruction.data.toString(16).padStart(2, '0')}
            </span>
          )}
        </span>

        {/* Human-readable annotation */}
        {annotation && (
          <span className="text-evmix-muted text-xs">
            ; {annotation}
          </span>
        )}

        {/* Current instruction indicator */}
        {isCurrent && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-evmix-accent"
          >
            {'<--'}
          </motion.span>
        )}

        {/* Jump target indicator */}
        {isJumpTarget && !isCurrent && (
          <motion.span
            initial={{ scale: 0, x: 10 }}
            animate={{ scale: 1, x: 0 }}
            className={jumpTargetValid === false ? 'text-red-500' : 'text-purple-400'}
          >
            {jumpTargetValid === false ? '✗ invalid' : isConditionalTarget ? '⤵ if true' : '⤵ jump'}
          </motion.span>
        )}
      </div>
    )
  }
)
