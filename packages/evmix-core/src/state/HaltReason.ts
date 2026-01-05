/**
 * HaltReason - Why the EVM stopped executing
 *
 * These are the possible reasons for execution to halt.
 */

export enum HaltReason {
  /** STOP opcode (0x00) */
  STOP = 'STOP',

  /** RETURN opcode (0xf3) - successful execution */
  RETURN = 'RETURN',

  /** REVERT opcode (0xfd) - execution reverted */
  REVERT = 'REVERT',

  /** Ran out of gas */
  OUT_OF_GAS = 'OUT_OF_GAS',

  /** Invalid or unimplemented opcode */
  INVALID_OPCODE = 'INVALID_OPCODE',

  /** Stack underflow (tried to pop from empty stack) */
  STACK_UNDERFLOW = 'STACK_UNDERFLOW',

  /** Stack overflow (tried to push beyond 1024 items) */
  STACK_OVERFLOW = 'STACK_OVERFLOW',

  /** Invalid jump destination */
  INVALID_JUMP = 'INVALID_JUMP',

  /** Invalid instruction (0xfe INVALID opcode) */
  INVALID_INSTRUCTION = 'INVALID_INSTRUCTION',
}
