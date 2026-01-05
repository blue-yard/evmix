/**
 * EVMIX Core - Educational EVM Interpreter
 */

// Types
export { Word256, MAX_UINT256, WORD_SIZE } from './types/Word256'
export { Address } from './types/Address'

// State
export { HaltReason } from './state/HaltReason'
export { MachineState } from './state/MachineState'
export { Stack, StackError, MAX_STACK_DEPTH } from './state/Stack'

// Trace
export type {
  TraceEvent,
  OpcodeStartEvent,
  StackPushEvent,
  StackPopEvent,
  MemoryWriteEvent,
  MemoryReadEvent,
  StorageReadEvent,
  StorageWriteEvent,
  GasChargeEvent,
  JumpEvent,
  HaltEvent,
} from './trace/TraceEvent'
export { TraceEventBuilder } from './trace/TraceEvent'
export { TraceCollector } from './trace/TraceCollector'

// Opcodes
export { Opcode, getOpcodeName, isPushOpcode, getPushBytes } from './opcodes/Opcode'

// Interpreter
export { Interpreter } from './interpreter/Interpreter'
export type { InterpreterConfig } from './interpreter/Interpreter'
