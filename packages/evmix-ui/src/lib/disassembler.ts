import { getOpcodeName, isPushOpcode, getPushBytes } from '@evmix/core'

/**
 * A single disassembled instruction
 */
export interface Instruction {
  pc: number              // byte offset in bytecode
  opcode: number          // raw opcode byte
  name: string            // human readable name (PUSH1, ADD, etc.)
  bytes: Uint8Array       // raw bytes (opcode + any immediate data)
  size: number            // total size in bytes
  data?: bigint           // for PUSH: the pushed value
  jumpTarget?: number     // for JUMP/JUMPI: potential target (from stack analysis)
  isJumpDest: boolean     // is this a JUMPDEST?
}

/**
 * Disassemble bytecode into instructions
 */
export function disassemble(bytecode: Uint8Array): Instruction[] {
  const instructions: Instruction[] = []
  let pc = 0

  while (pc < bytecode.length) {
    const opcode = bytecode[pc]
    const name = getOpcodeName(opcode)

    let size = 1
    let data: bigint | undefined

    // Handle PUSH operations - they have immediate data
    if (isPushOpcode(opcode)) {
      const pushBytes = getPushBytes(opcode)
      size = 1 + pushBytes

      // Extract the pushed value
      let value = 0n
      for (let i = 1; i <= pushBytes && pc + i < bytecode.length; i++) {
        value = (value << 8n) | BigInt(bytecode[pc + i])
      }
      data = value
    }

    const bytes = bytecode.slice(pc, pc + size)
    const isJumpDest = opcode === 0x5b // JUMPDEST

    instructions.push({
      pc,
      opcode,
      name,
      bytes,
      size,
      data,
      isJumpDest,
    })

    pc += size
  }

  return instructions
}

/**
 * Find instruction by PC
 */
export function findInstructionAtPC(
  instructions: Instruction[],
  pc: number
): Instruction | undefined {
  return instructions.find((inst) => inst.pc === pc)
}

/**
 * Find instruction index by PC
 */
export function findInstructionIndexAtPC(
  instructions: Instruction[],
  pc: number
): number {
  return instructions.findIndex((inst) => inst.pc === pc)
}

/**
 * Format a value for display with multiple representations
 */
export interface FormattedValue {
  hex: string
  decimal: string
  signed?: string
  ascii?: string
  address?: string
  eth?: string
}

/**
 * Format a bigint value in multiple human-friendly ways
 */
export function formatValue(value: bigint): FormattedValue {
  const hex = '0x' + value.toString(16).padStart(2, '0')
  const decimal = value.toString()

  const result: FormattedValue = { hex, decimal }

  // Signed interpretation (if high bit is set in 256-bit context)
  if (value >= 2n ** 255n) {
    const signed = value - 2n ** 256n
    result.signed = signed.toString()
  }

  // Check if it could be an address (fits in 160 bits, non-trivial)
  if (value > 0n && value < 2n ** 160n && value > 2n ** 128n) {
    result.address = '0x' + value.toString(16).padStart(40, '0')
  }

  // Check if it could be ETH (reasonable wei amounts)
  if (value >= 10n ** 9n && value < 10n ** 27n) {
    const eth = Number(value) / 1e18
    if (eth >= 0.0001 && eth < 1_000_000) {
      result.eth = eth.toFixed(6) + ' ETH'
    }
  }

  // Try to interpret as ASCII (for small values that look like strings)
  if (value > 0n && value < 2n ** 64n) {
    const bytes: number[] = []
    let v = value
    while (v > 0n) {
      bytes.unshift(Number(v & 0xffn))
      v = v >> 8n
    }
    if (bytes.every(b => b >= 32 && b <= 126)) {
      result.ascii = '"' + String.fromCharCode(...bytes) + '"'
    }
  }

  return result
}

/**
 * Get a short annotation for an instruction (for inline display)
 */
export function getInstructionAnnotation(inst: Instruction): string | null {
  if (inst.data !== undefined) {
    // For PUSH, show the decimal value if small, hex otherwise
    if (inst.data < 256n) {
      return `${inst.data}`
    } else if (inst.data < 2n ** 32n) {
      return inst.data.toString()
    } else {
      // Truncate large values
      const hex = inst.data.toString(16)
      if (hex.length > 16) {
        return '0x' + hex.slice(0, 8) + '...' + hex.slice(-4)
      }
      return '0x' + hex
    }
  }
  return null
}

/**
 * Categorize opcodes for color coding
 */
export type OpcodeCategory =
  | 'arithmetic'
  | 'comparison'
  | 'bitwise'
  | 'memory'
  | 'storage'
  | 'flow'
  | 'stack'
  | 'system'
  | 'environment'
  | 'log'
  | 'unknown'

export function getOpcodeCategory(opcode: number): OpcodeCategory {
  // Arithmetic: 0x01-0x0b
  if (opcode >= 0x01 && opcode <= 0x0b) return 'arithmetic'

  // Comparison & Bitwise: 0x10-0x1d
  if (opcode >= 0x10 && opcode <= 0x1d) return 'comparison'

  // Keccak256: 0x20
  if (opcode === 0x20) return 'bitwise'

  // Environment: 0x30-0x3f
  if (opcode >= 0x30 && opcode <= 0x3f) return 'environment'

  // Block info: 0x40-0x48
  if (opcode >= 0x40 && opcode <= 0x48) return 'environment'

  // Memory/Storage/Flow: 0x50-0x5b
  if (opcode === 0x50) return 'stack' // POP
  if (opcode >= 0x51 && opcode <= 0x53) return 'memory' // MLOAD, MSTORE, MSTORE8
  if (opcode >= 0x54 && opcode <= 0x55) return 'storage' // SLOAD, SSTORE
  if (opcode >= 0x56 && opcode <= 0x5b) return 'flow' // JUMP, JUMPI, PC, MSIZE, GAS, JUMPDEST

  // PUSH: 0x60-0x7f
  if (opcode >= 0x60 && opcode <= 0x7f) return 'stack'

  // DUP: 0x80-0x8f
  if (opcode >= 0x80 && opcode <= 0x8f) return 'stack'

  // SWAP: 0x90-0x9f
  if (opcode >= 0x90 && opcode <= 0x9f) return 'stack'

  // LOG: 0xa0-0xa4
  if (opcode >= 0xa0 && opcode <= 0xa4) return 'log'

  // System: 0xf0-0xff
  if (opcode >= 0xf0) return 'system'

  // STOP
  if (opcode === 0x00) return 'system'

  return 'unknown'
}

/**
 * Get CSS class for opcode category
 */
export function getCategoryColorClass(category: OpcodeCategory): string {
  switch (category) {
    case 'arithmetic': return 'text-blue-400'
    case 'comparison': return 'text-cyan-400'
    case 'bitwise': return 'text-cyan-400'
    case 'memory': return 'text-yellow-400'
    case 'storage': return 'text-orange-400'
    case 'flow': return 'text-purple-400'
    case 'stack': return 'text-green-400'
    case 'system': return 'text-red-400'
    case 'environment': return 'text-pink-400'
    case 'log': return 'text-indigo-400'
    default: return 'text-evmix-muted'
  }
}
