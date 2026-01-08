/**
 * Opcode definitions and utilities
 */

export enum Opcode {
  // 0x0: Stop and Arithmetic Operations
  STOP = 0x00,
  ADD = 0x01,
  MUL = 0x02,
  SUB = 0x03,
  DIV = 0x04,
  SDIV = 0x05,
  MOD = 0x06,
  SMOD = 0x07,
  ADDMOD = 0x08,
  MULMOD = 0x09,
  EXP = 0x0a,
  SIGNEXTEND = 0x0b,

  // 0x10: Comparison & Bitwise Logic Operations
  LT = 0x10,
  GT = 0x11,
  SLT = 0x12,
  SGT = 0x13,
  EQ = 0x14,
  ISZERO = 0x15,
  AND = 0x16,
  OR = 0x17,
  XOR = 0x18,
  NOT = 0x19,
  BYTE = 0x1a,
  SHL = 0x1b,
  SHR = 0x1c,
  SAR = 0x1d,

  // 0x20: Keccak256
  KECCAK256 = 0x20,

  // 0x30: Environmental Information
  ADDRESS = 0x30,
  BALANCE = 0x31,
  ORIGIN = 0x32,
  CALLER = 0x33,
  CALLVALUE = 0x34,
  CALLDATALOAD = 0x35,
  CALLDATASIZE = 0x36,
  CALLDATACOPY = 0x37,
  CODESIZE = 0x38,
  CODECOPY = 0x39,
  GASPRICE = 0x3a,

  // 0x50: Stack, Memory, Storage and Flow Operations
  POP = 0x50,
  MLOAD = 0x51,
  MSTORE = 0x52,
  MSTORE8 = 0x53,
  SLOAD = 0x54,
  SSTORE = 0x55,
  JUMP = 0x56,
  JUMPI = 0x57,
  PC = 0x58,
  MSIZE = 0x59,
  GAS = 0x5a,
  JUMPDEST = 0x5b,

  // 0x60-0x7f: Push Operations
  PUSH1 = 0x60,
  PUSH32 = 0x7f,

  // 0x80-0x8f: Duplication Operations
  DUP1 = 0x80,
  DUP16 = 0x8f,

  // 0x90-0x9f: Exchange Operations
  SWAP1 = 0x90,
  SWAP16 = 0x9f,

  // 0xa0-0xa4: Logging Operations
  LOG0 = 0xa0,
  LOG1 = 0xa1,
  LOG2 = 0xa2,
  LOG3 = 0xa3,
  LOG4 = 0xa4,

  // 0xf0: System operations
  RETURN = 0xf3,
  REVERT = 0xfd,
  INVALID = 0xfe,
}

/**
 * Get opcode name from byte value
 */
export function getOpcodeName(opcode: number): string {
  // Handle PUSH variants
  if (opcode >= 0x60 && opcode <= 0x7f) {
    return `PUSH${opcode - 0x5f}`
  }

  // Handle DUP variants
  if (opcode >= 0x80 && opcode <= 0x8f) {
    return `DUP${opcode - 0x7f}`
  }

  // Handle SWAP variants
  if (opcode >= 0x90 && opcode <= 0x9f) {
    return `SWAP${opcode - 0x8f}`
  }

  // Look up in enum
  const name = Opcode[opcode]
  return name || `UNKNOWN(0x${opcode.toString(16).padStart(2, '0')})`
}

/**
 * Check if an opcode is a PUSH operation
 */
export function isPushOpcode(opcode: number): boolean {
  return opcode >= 0x60 && opcode <= 0x7f
}

/**
 * Get number of bytes to push for a PUSH opcode
 */
export function getPushBytes(opcode: number): number {
  if (!isPushOpcode(opcode)) {
    return 0
  }
  return opcode - 0x5f
}
