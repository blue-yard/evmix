import { Word256 } from '../types/Word256'
import { Address } from '../types/Address'
import { HaltReason } from '../state/HaltReason'

/**
 * TraceEvent - A structured, observable event emitted during execution
 *
 * These events form the primary interface for understanding what the VM is doing.
 * They are:
 * - JSON-serializable
 * - Append-only
 * - Semantically rich
 */

export type TraceEvent =
  | OpcodeStartEvent
  | StackPushEvent
  | StackPopEvent
  | MemoryWriteEvent
  | MemoryReadEvent
  | StorageReadEvent
  | StorageWriteEvent
  | GasChargeEvent
  | JumpEvent
  | HaltEvent

/**
 * Base event properties
 */
interface BaseEvent {
  type: string
  index: number // Sequential event index
  pc: number // Program counter when event occurred
  gasRemaining: bigint
}

/**
 * Opcode execution started
 */
export interface OpcodeStartEvent extends BaseEvent {
  type: 'opcode.start'
  opcode: number
  opcodeName: string
}

/**
 * Value pushed to stack
 */
export interface StackPushEvent extends BaseEvent {
  type: 'stack.push'
  value: string // hex representation
}

/**
 * Value popped from stack
 */
export interface StackPopEvent extends BaseEvent {
  type: 'stack.pop'
  value: string // hex representation
}

/**
 * Memory write occurred
 */
export interface MemoryWriteEvent extends BaseEvent {
  type: 'memory.write'
  offset: number
  data: string // hex representation
}

/**
 * Memory read occurred
 */
export interface MemoryReadEvent extends BaseEvent {
  type: 'memory.read'
  offset: number
  length: number
}

/**
 * Storage read occurred
 */
export interface StorageReadEvent extends BaseEvent {
  type: 'storage.read'
  address: string // hex representation
  key: string // hex representation
  value: string // hex representation
}

/**
 * Storage write occurred
 */
export interface StorageWriteEvent extends BaseEvent {
  type: 'storage.write'
  address: string // hex representation
  key: string // hex representation
  value: string // hex representation
}

/**
 * Gas charged for an operation
 */
export interface GasChargeEvent extends BaseEvent {
  type: 'gas.charge'
  amount: string // bigint as string
  reason: string
}

/**
 * Jump occurred
 */
export interface JumpEvent extends BaseEvent {
  type: 'jump'
  from: number
  to: number
  conditional: boolean
  taken: boolean
}

/**
 * Execution halted
 */
export interface HaltEvent extends BaseEvent {
  type: 'halt'
  reason: HaltReason
}

/**
 * Trace event builder helpers
 */
export class TraceEventBuilder {
  static opcodeStart(
    index: number,
    pc: number,
    gas: bigint,
    opcode: number,
    name: string
  ): OpcodeStartEvent {
    return {
      type: 'opcode.start',
      index,
      pc,
      gasRemaining: gas,
      opcode,
      opcodeName: name,
    }
  }

  static stackPush(index: number, pc: number, gas: bigint, value: Word256): StackPushEvent {
    return {
      type: 'stack.push',
      index,
      pc,
      gasRemaining: gas,
      value: value.toHexWith0x(),
    }
  }

  static stackPop(index: number, pc: number, gas: bigint, value: Word256): StackPopEvent {
    return {
      type: 'stack.pop',
      index,
      pc,
      gasRemaining: gas,
      value: value.toHexWith0x(),
    }
  }

  static memoryWrite(
    index: number,
    pc: number,
    gas: bigint,
    offset: number,
    data: Uint8Array
  ): MemoryWriteEvent {
    return {
      type: 'memory.write',
      index,
      pc,
      gasRemaining: gas,
      offset,
      data: '0x' + Array.from(data, (b) => b.toString(16).padStart(2, '0')).join(''),
    }
  }

  static memoryRead(
    index: number,
    pc: number,
    gas: bigint,
    offset: number,
    length: number
  ): MemoryReadEvent {
    return {
      type: 'memory.read',
      index,
      pc,
      gasRemaining: gas,
      offset,
      length,
    }
  }

  static storageRead(
    index: number,
    pc: number,
    gas: bigint,
    address: Address,
    key: Word256,
    value: Word256
  ): StorageReadEvent {
    return {
      type: 'storage.read',
      index,
      pc,
      gasRemaining: gas,
      address: address.toHexWith0x(),
      key: key.toHexWith0x(),
      value: value.toHexWith0x(),
    }
  }

  static storageWrite(
    index: number,
    pc: number,
    gas: bigint,
    address: Address,
    key: Word256,
    value: Word256
  ): StorageWriteEvent {
    return {
      type: 'storage.write',
      index,
      pc,
      gasRemaining: gas,
      address: address.toHexWith0x(),
      key: key.toHexWith0x(),
      value: value.toHexWith0x(),
    }
  }

  static gasCharge(
    index: number,
    pc: number,
    gas: bigint,
    amount: bigint,
    reason: string
  ): GasChargeEvent {
    return {
      type: 'gas.charge',
      index,
      pc,
      gasRemaining: gas,
      amount: amount.toString(),
      reason,
    }
  }

  static jump(
    index: number,
    pc: number,
    gas: bigint,
    from: number,
    to: number,
    conditional: boolean,
    taken: boolean
  ): JumpEvent {
    return {
      type: 'jump',
      index,
      pc,
      gasRemaining: gas,
      from,
      to,
      conditional,
      taken,
    }
  }

  static halt(index: number, pc: number, gas: bigint, reason: HaltReason): HaltEvent {
    return {
      type: 'halt',
      index,
      pc,
      gasRemaining: gas,
      reason,
    }
  }
}
