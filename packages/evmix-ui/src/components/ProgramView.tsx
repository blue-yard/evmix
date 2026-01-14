import { useEffect, useRef, useState, useMemo, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { useDebugStore } from '../store/debugStore'
import {
  disassemble,
  findInstructionIndexAtPC,
  getInstructionAnnotation,
  getOpcodeCategory,
  getCategoryColorClass,
  type Instruction,
} from '../lib/disassembler'

interface ProgramViewProps {
  className?: string
}

export function ProgramView({ className = '' }: ProgramViewProps) {
  const session = useDebugStore((s) => s.session)
  const snapshot = useDebugStore((s) => s.snapshot)
  const [autoScroll, setAutoScroll] = useState(true)
  const currentRowRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Disassemble bytecode
  const instructions = useMemo(() => {
    if (!session) return []
    return disassemble(session.getBytecode())
  }, [session])

  // Find current instruction
  const currentPC = snapshot?.pc ?? 0
  const currentIndex = useMemo(
    () => findInstructionIndexAtPC(instructions, currentPC),
    [instructions, currentPC]
  )

  // Auto-scroll to current instruction
  useEffect(() => {
    if (autoScroll && currentRowRef.current && containerRef.current) {
      currentRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentIndex, autoScroll])

  // Track visited PCs for showing execution history
  const visitedPCs = useMemo(() => {
    const visited = new Set<number>()
    const events = session?.getEvents() ?? []
    for (const event of events) {
      if (event.type === 'opcode.start') {
        visited.add(event.pc)
      }
    }
    return visited
  }, [session, snapshot])

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
            isVisited={visitedPCs.has(inst.pc)}
            ref={index === currentIndex ? currentRowRef : null}
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
      </div>
    </div>
  )
}

interface InstructionRowProps {
  instruction: Instruction
  isCurrent: boolean
  isVisited: boolean
}

const InstructionRow = forwardRef<HTMLDivElement, InstructionRowProps>(
  function InstructionRow({ instruction, isCurrent, isVisited }, ref) {
    const category = getOpcodeCategory(instruction.opcode)
    const colorClass = getCategoryColorClass(category)
    const annotation = getInstructionAnnotation(instruction)

    return (
      <div
        ref={ref}
        className={`flex items-center gap-3 px-3 py-1.5 border-l-2 transition-colors ${
          isCurrent
            ? 'bg-evmix-accent/20 border-evmix-accent'
            : isVisited
            ? 'bg-evmix-bg/50 border-transparent hover:bg-evmix-bg'
            : 'border-transparent hover:bg-evmix-bg/30'
        }`}
      >
        {/* PC */}
        <span className="text-evmix-muted w-12 text-right text-xs">
          {instruction.pc.toString(16).padStart(4, '0')}
        </span>

        {/* Jump destination marker */}
        <span className="w-4 text-center">
          {instruction.isJumpDest && (
            <span className="text-purple-400" title="Jump Destination">
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
      </div>
    )
  }
)
