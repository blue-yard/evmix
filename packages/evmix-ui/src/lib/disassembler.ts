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
 * Detailed opcode info for tooltips
 * Format: { stack: [inputs] → [outputs], desc, effect? }
 */
interface OpcodeInfo {
  stack: string      // e.g., "[a, b] → [a+b]"
  desc: string       // Brief description
  effect?: string    // Side effects (memory, storage, etc.)
}

export const OPCODE_INFO: Record<string, OpcodeInfo> = {
  // === STOP & ARITHMETIC ===
  STOP: {
    stack: '[] → []',
    desc: 'Halts execution successfully',
    effect: 'Execution stops, transaction succeeds',
  },
  ADD: {
    stack: '[a, b] → [a+b]',
    desc: 'Addition modulo 2²⁵⁶',
    effect: 'Overflow wraps around (no revert)',
  },
  MUL: {
    stack: '[a, b] → [a*b]',
    desc: 'Multiplication modulo 2²⁵⁶',
    effect: 'Overflow wraps around',
  },
  SUB: {
    stack: '[a, b] → [a-b]',
    desc: 'Subtraction modulo 2²⁵⁶',
    effect: 'Underflow wraps (0-1 = 2²⁵⁶-1)',
  },
  DIV: {
    stack: '[a, b] → [a/b]',
    desc: 'Integer division',
    effect: 'Returns 0 if b=0 (no revert)',
  },
  SDIV: {
    stack: '[a, b] → [a/b]',
    desc: 'Signed integer division',
    effect: 'Treats values as two\'s complement',
  },
  MOD: {
    stack: '[a, b] → [a%b]',
    desc: 'Modulo remainder',
    effect: 'Returns 0 if b=0',
  },
  SMOD: {
    stack: '[a, b] → [a%b]',
    desc: 'Signed modulo',
    effect: 'Sign of result matches sign of a',
  },
  ADDMOD: {
    stack: '[a, b, N] → [(a+b)%N]',
    desc: 'Addition then modulo',
    effect: 'Intermediate sum doesn\'t overflow',
  },
  MULMOD: {
    stack: '[a, b, N] → [(a*b)%N]',
    desc: 'Multiplication then modulo',
    effect: 'Intermediate product doesn\'t overflow',
  },
  EXP: {
    stack: '[a, b] → [a^b]',
    desc: 'Exponentiation modulo 2²⁵⁶',
    effect: 'Gas cost scales with exponent size',
  },
  SIGNEXTEND: {
    stack: '[b, x] → [y]',
    desc: 'Sign-extend x from (b+1) bytes',
    effect: 'Extends sign bit to fill 256 bits',
  },

  // === COMPARISON ===
  LT: {
    stack: '[a, b] → [a<b]',
    desc: 'Less than (unsigned)',
    effect: 'Returns 1 if true, 0 if false',
  },
  GT: {
    stack: '[a, b] → [a>b]',
    desc: 'Greater than (unsigned)',
    effect: 'Returns 1 if true, 0 if false',
  },
  SLT: {
    stack: '[a, b] → [a<b]',
    desc: 'Less than (signed)',
    effect: 'Treats values as two\'s complement',
  },
  SGT: {
    stack: '[a, b] → [a>b]',
    desc: 'Greater than (signed)',
    effect: 'Treats values as two\'s complement',
  },
  EQ: {
    stack: '[a, b] → [a==b]',
    desc: 'Equality check',
    effect: 'Returns 1 if equal, 0 otherwise',
  },
  ISZERO: {
    stack: '[a] → [a==0]',
    desc: 'Check if zero',
    effect: 'Returns 1 if zero, 0 otherwise',
  },

  // === BITWISE ===
  AND: {
    stack: '[a, b] → [a&b]',
    desc: 'Bitwise AND',
    effect: 'Each bit: 1 only if both are 1',
  },
  OR: {
    stack: '[a, b] → [a|b]',
    desc: 'Bitwise OR',
    effect: 'Each bit: 1 if either is 1',
  },
  XOR: {
    stack: '[a, b] → [a^b]',
    desc: 'Bitwise XOR',
    effect: 'Each bit: 1 if bits differ',
  },
  NOT: {
    stack: '[a] → [~a]',
    desc: 'Bitwise NOT',
    effect: 'Flips all 256 bits',
  },
  BYTE: {
    stack: '[i, x] → [byte]',
    desc: 'Get byte i of x (0=MSB)',
    effect: 'Returns 0 if i >= 32',
  },
  SHL: {
    stack: '[shift, value] → [value<<shift]',
    desc: 'Shift left',
    effect: 'Zeros fill from right',
  },
  SHR: {
    stack: '[shift, value] → [value>>shift]',
    desc: 'Logical shift right',
    effect: 'Zeros fill from left',
  },
  SAR: {
    stack: '[shift, value] → [value>>shift]',
    desc: 'Arithmetic shift right',
    effect: 'Sign bit fills from left',
  },

  // === KECCAK ===
  KECCAK256: {
    stack: '[offset, size] → [hash]',
    desc: 'Keccak-256 hash of memory',
    effect: 'Reads memory[offset:offset+size]',
  },

  // === ENVIRONMENT ===
  ADDRESS: {
    stack: '[] → [address]',
    desc: 'Current contract address',
    effect: 'The address of executing code',
  },
  BALANCE: {
    stack: '[address] → [balance]',
    desc: 'Get ETH balance of address',
    effect: 'Balance in wei (10⁻¹⁸ ETH)',
  },
  ORIGIN: {
    stack: '[] → [address]',
    desc: 'Transaction origin (tx.origin)',
    effect: 'Original external account, never a contract',
  },
  CALLER: {
    stack: '[] → [address]',
    desc: 'Immediate caller (msg.sender)',
    effect: 'Can be contract or EOA',
  },
  CALLVALUE: {
    stack: '[] → [value]',
    desc: 'ETH sent with call (msg.value)',
    effect: 'Value in wei',
  },
  CALLDATALOAD: {
    stack: '[offset] → [data]',
    desc: 'Load 32 bytes from calldata',
    effect: 'Pads with zeros if beyond end',
  },
  CALLDATASIZE: {
    stack: '[] → [size]',
    desc: 'Size of calldata in bytes',
    effect: 'Total input data length',
  },
  CALLDATACOPY: {
    stack: '[destOffset, offset, size] → []',
    desc: 'Copy calldata to memory',
    effect: 'memory[destOffset:+size] = calldata[offset:+size]',
  },
  CODESIZE: {
    stack: '[] → [size]',
    desc: 'Size of current code',
    effect: 'Bytecode length in bytes',
  },
  CODECOPY: {
    stack: '[destOffset, offset, size] → []',
    desc: 'Copy code to memory',
    effect: 'memory[destOffset:+size] = code[offset:+size]',
  },
  GASPRICE: {
    stack: '[] → [price]',
    desc: 'Gas price of transaction',
    effect: 'In wei per gas unit',
  },
  EXTCODESIZE: {
    stack: '[address] → [size]',
    desc: 'Code size of external account',
    effect: 'Returns 0 for EOAs',
  },
  EXTCODECOPY: {
    stack: '[address, destOffset, offset, size] → []',
    desc: 'Copy external code to memory',
    effect: 'Like CODECOPY but for other address',
  },
  RETURNDATASIZE: {
    stack: '[] → [size]',
    desc: 'Size of last call\'s return data',
    effect: 'Set after CALL/DELEGATECALL/etc',
  },
  RETURNDATACOPY: {
    stack: '[destOffset, offset, size] → []',
    desc: 'Copy return data to memory',
    effect: 'Reverts if offset+size > RETURNDATASIZE',
  },
  EXTCODEHASH: {
    stack: '[address] → [hash]',
    desc: 'Keccak256 of account code',
    effect: 'Returns 0 for non-existent accounts',
  },

  // === BLOCK INFO ===
  BLOCKHASH: {
    stack: '[blockNum] → [hash]',
    desc: 'Hash of block (last 256 only)',
    effect: 'Returns 0 if block too old/future',
  },
  COINBASE: {
    stack: '[] → [address]',
    desc: 'Block miner/validator address',
    effect: 'Receives block rewards',
  },
  TIMESTAMP: {
    stack: '[] → [timestamp]',
    desc: 'Block timestamp (Unix seconds)',
    effect: 'Can be manipulated by miners slightly',
  },
  NUMBER: {
    stack: '[] → [blockNum]',
    desc: 'Current block number',
    effect: 'Increments each block',
  },
  DIFFICULTY: {
    stack: '[] → [difficulty]',
    desc: 'Block difficulty (PoW) / prevrandao (PoS)',
    effect: 'After merge: random beacon value',
  },
  GASLIMIT: {
    stack: '[] → [limit]',
    desc: 'Block gas limit',
    effect: 'Max gas usable in block',
  },
  CHAINID: {
    stack: '[] → [chainId]',
    desc: 'Chain ID (EIP-155)',
    effect: '1=mainnet, 5=goerli, etc.',
  },
  SELFBALANCE: {
    stack: '[] → [balance]',
    desc: 'Balance of current contract',
    effect: 'Cheaper than BALANCE(ADDRESS)',
  },
  BASEFEE: {
    stack: '[] → [baseFee]',
    desc: 'Block base fee (EIP-1559)',
    effect: 'Minimum gas price for block',
  },

  // === STACK/MEMORY/STORAGE ===
  POP: {
    stack: '[a] → []',
    desc: 'Remove top stack item',
    effect: 'Discards value',
  },
  MLOAD: {
    stack: '[offset] → [value]',
    desc: 'Load 32 bytes from memory',
    effect: 'Reads memory[offset:offset+32]',
  },
  MSTORE: {
    stack: '[offset, value] → []',
    desc: 'Store 32 bytes to memory',
    effect: 'memory[offset:offset+32] = value',
  },
  MSTORE8: {
    stack: '[offset, value] → []',
    desc: 'Store 1 byte to memory',
    effect: 'memory[offset] = value & 0xff',
  },
  SLOAD: {
    stack: '[slot] → [value]',
    desc: 'Load from storage slot',
    effect: 'Reads persistent contract storage',
  },
  SSTORE: {
    stack: '[slot, value] → []',
    desc: 'Store to storage slot',
    effect: 'Writes persistent storage (expensive!)',
  },
  MSIZE: {
    stack: '[] → [size]',
    desc: 'Current memory size',
    effect: 'Always multiple of 32',
  },
  GAS: {
    stack: '[] → [gas]',
    desc: 'Remaining gas',
    effect: 'Gas left after this opcode',
  },

  // === CONTROL FLOW ===
  JUMP: {
    stack: '[dest] → []',
    desc: 'Unconditional jump',
    effect: 'dest must be JUMPDEST',
  },
  JUMPI: {
    stack: '[dest, cond] → []',
    desc: 'Jump if condition non-zero',
    effect: 'If cond≠0, jump to dest (must be JUMPDEST)',
  },
  PC: {
    stack: '[] → [pc]',
    desc: 'Program counter before this op',
    effect: 'Current instruction offset',
  },
  JUMPDEST: {
    stack: '[] → []',
    desc: 'Valid jump destination',
    effect: 'Marks location as valid jump target',
  },

  // === LOGGING ===
  LOG0: {
    stack: '[offset, size] → []',
    desc: 'Emit log with 0 topics',
    effect: 'Emits memory[offset:+size] as event data',
  },
  LOG1: {
    stack: '[offset, size, topic0] → []',
    desc: 'Emit log with 1 topic',
    effect: 'topic0 is indexed (searchable)',
  },
  LOG2: {
    stack: '[offset, size, topic0, topic1] → []',
    desc: 'Emit log with 2 topics',
    effect: 'Topics are indexed (searchable)',
  },
  LOG3: {
    stack: '[offset, size, t0, t1, t2] → []',
    desc: 'Emit log with 3 topics',
    effect: 'Topics are indexed (searchable)',
  },
  LOG4: {
    stack: '[offset, size, t0, t1, t2, t3] → []',
    desc: 'Emit log with 4 topics',
    effect: 'Max 4 topics per event',
  },

  // === SYSTEM ===
  RETURN: {
    stack: '[offset, size] → []',
    desc: 'Return data and halt',
    effect: 'Returns memory[offset:+size] to caller',
  },
  REVERT: {
    stack: '[offset, size] → []',
    desc: 'Revert with return data',
    effect: 'Undoes all state changes, returns data',
  },
  INVALID: {
    stack: '[] → []',
    desc: 'Invalid opcode',
    effect: 'Always reverts, consumes all gas',
  },
  SELFDESTRUCT: {
    stack: '[recipient] → []',
    desc: 'Destroy contract, send ETH',
    effect: 'Deprecated after Cancun (EIP-6780)',
  },

  // === CALL OPERATIONS ===
  CALL: {
    stack: '[gas, addr, value, argsOff, argsLen, retOff, retLen] → [success]',
    desc: 'Call another contract',
    effect: 'Sends ETH + calldata, gets return data',
  },
  CALLCODE: {
    stack: '[gas, addr, value, argsOff, argsLen, retOff, retLen] → [success]',
    desc: 'Call with current storage (deprecated)',
    effect: 'Like DELEGATECALL but with value',
  },
  DELEGATECALL: {
    stack: '[gas, addr, argsOff, argsLen, retOff, retLen] → [success]',
    desc: 'Call preserving msg.sender & storage',
    effect: 'Runs code in current context (proxies)',
  },
  STATICCALL: {
    stack: '[gas, addr, argsOff, argsLen, retOff, retLen] → [success]',
    desc: 'Read-only call (no state changes)',
    effect: 'Reverts if callee tries to write',
  },
  CREATE: {
    stack: '[value, offset, size] → [address]',
    desc: 'Create new contract',
    effect: 'Deploys memory[offset:+size] as code',
  },
  CREATE2: {
    stack: '[value, offset, size, salt] → [address]',
    desc: 'Create with deterministic address',
    effect: 'Address = hash(0xff, sender, salt, initCodeHash)',
  },
}

/**
 * Get detailed description for an opcode
 */
export function getOpcodeDescription(name: string): string {
  // Handle PUSH variants
  if (name.startsWith('PUSH')) {
    const bytes = name.replace('PUSH', '')
    return `[] → [value]\nPush ${bytes}-byte immediate value onto stack\nValue follows opcode in bytecode`
  }

  // Handle DUP variants
  if (name.startsWith('DUP')) {
    const n = parseInt(name.replace('DUP', ''))
    const items = Array.from({ length: n }, (_, i) => `v${n - i}`).join(', ')
    return `[${items}] → [${items}, v${n}]\nDuplicate ${n}${getOrdinalSuffix(n)} stack item\nCopies without removing original`
  }

  // Handle SWAP variants
  if (name.startsWith('SWAP')) {
    const n = parseInt(name.replace('SWAP', ''))
    return `[v0, ..., v${n}] → [v${n}, ..., v0]\nSwap top with ${n + 1}${getOrdinalSuffix(n + 1)} stack item\nExchanges positions`
  }

  const info = OPCODE_INFO[name]
  if (info) {
    let result = `${info.stack}\n${info.desc}`
    if (info.effect) {
      result += `\n${info.effect}`
    }
    return result
  }

  return 'EVM opcode'
}

function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
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
