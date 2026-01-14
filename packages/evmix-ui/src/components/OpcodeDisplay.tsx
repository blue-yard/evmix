import { useDebugStore } from '../store/debugStore'
import type { OpcodeStartEvent } from '@evmix/core'

// Opcode descriptions for learning
const OPCODE_DESCRIPTIONS: Record<string, string> = {
  STOP: 'Halts execution',
  ADD: 'Addition: a + b',
  MUL: 'Multiplication: a * b',
  SUB: 'Subtraction: a - b',
  DIV: 'Integer division: a / b',
  PUSH1: 'Push 1-byte value onto stack',
  PUSH32: 'Push 32-byte value onto stack',
  POP: 'Remove top stack item',
  MLOAD: 'Load 32 bytes from memory',
  MSTORE: 'Store 32 bytes to memory',
  SLOAD: 'Load from storage',
  SSTORE: 'Store to storage',
  JUMP: 'Unconditional jump',
  JUMPI: 'Conditional jump',
  JUMPDEST: 'Valid jump destination marker',
  PC: 'Push program counter',
  GAS: 'Push remaining gas',
  CALLER: 'Push msg.sender',
  CALLVALUE: 'Push msg.value',
  ADDRESS: 'Push contract address',
  RETURN: 'Return data and halt',
  REVERT: 'Revert and return data',
}

export function OpcodeDisplay() {
  const events = useDebugStore((s) => s.events)
  const snapshot = useDebugStore((s) => s.snapshot)

  // Find the last opcode.start event
  const opcodeEvents = events.filter(
    (e) => e.type === 'opcode.start'
  ) as OpcodeStartEvent[]

  const currentOpcode = opcodeEvents[opcodeEvents.length - 1]

  if (!currentOpcode || !snapshot) {
    return (
      <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-evmix-muted mb-3">
          CURRENT OPCODE
        </h2>
        <p className="text-evmix-muted text-sm">No execution</p>
      </div>
    )
  }

  const description =
    OPCODE_DESCRIPTIONS[currentOpcode.opcodeName] ||
    OPCODE_DESCRIPTIONS[currentOpcode.opcodeName.replace(/\d+$/, '')] ||
    'EVM opcode'

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">
        CURRENT OPCODE
      </h2>

      <div className="flex items-center gap-3">
        {/* Opcode Badge */}
        <div className="bg-evmix-accent text-black px-3 py-1 rounded font-bold">
          {currentOpcode.opcodeName}
        </div>

        {/* Hex */}
        <code className="text-xs text-evmix-muted">
          0x{currentOpcode.opcode.toString(16).padStart(2, '0')}
        </code>
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-evmix-muted">{description}</p>

      {/* Program Counter */}
      <div className="mt-3 flex gap-4 text-xs text-evmix-muted">
        <span>
          PC: <code className="text-evmix-text">{snapshot.pc}</code>
        </span>
        <span>
          Halted:{' '}
          <code
            className={snapshot.halted ? 'text-evmix-error' : 'text-evmix-success'}
          >
            {snapshot.halted ? 'Yes' : 'No'}
          </code>
        </span>
        {snapshot.haltReason && (
          <span>
            Reason:{' '}
            <code className="text-evmix-warning">{snapshot.haltReason}</code>
          </span>
        )}
      </div>
    </div>
  )
}
