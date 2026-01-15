/**
 * Word256 - A 256-bit unsigned integer
 *
 * This is the fundamental data type of the EVM stack.
 * All values are BigInt internally, with overflow semantics matching the EVM:
 * all arithmetic operations are modulo 2^256.
 */

export const MAX_UINT256 = (1n << 256n) - 1n
export const WORD_SIZE = 32 // bytes

export class Word256 {
  readonly value: bigint

  private constructor(value: bigint) {
    // Ensure value is in range [0, 2^256 - 1]
    this.value = value & MAX_UINT256
  }

  /**
   * Create a Word256 from a bigint
   */
  static from(value: bigint): Word256 {
    return new Word256(value)
  }

  /**
   * Create a Word256 from a number (safe for small integers)
   */
  static fromNumber(value: number): Word256 {
    return new Word256(BigInt(value))
  }

  /**
   * Create a Word256 from a hex string (with or without 0x prefix)
   */
  static fromHex(hex: string): Word256 {
    const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex
    if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
      throw new Error(`Invalid hex string: ${hex}`)
    }
    return new Word256(cleaned === '' ? 0n : BigInt('0x' + cleaned))
  }

  /**
   * Create a Word256 from a byte array (big-endian)
   */
  static fromBytes(bytes: Uint8Array): Word256 {
    if (bytes.length > 32) {
      throw new Error(`Byte array too long: ${bytes.length} > 32`)
    }
    let value = 0n
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8n) | BigInt(bytes[i])
    }
    return new Word256(value)
  }

  /**
   * Create a zero Word256
   */
  static zero(): Word256 {
    return new Word256(0n)
  }

  /**
   * Create a Word256 with value 1
   */
  static one(): Word256 {
    return new Word256(1n)
  }

  /**
   * Create max value Word256 (all bits set)
   */
  static max(): Word256 {
    return new Word256(MAX_UINT256)
  }

  /**
   * Convert to hex string (padded to 64 characters, no 0x prefix)
   */
  toHex(): string {
    return this.value.toString(16).padStart(64, '0')
  }

  /**
   * Convert to hex string with 0x prefix
   */
  toHexWith0x(): string {
    return '0x' + this.toHex()
  }

  /**
   * Convert to byte array (big-endian, 32 bytes)
   */
  toBytes(): Uint8Array {
    const bytes = new Uint8Array(32)
    let val = this.value
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(val & 0xffn)
      val >>= 8n
    }
    return bytes
  }

  /**
   * Convert to decimal string
   */
  toDecimalString(): string {
    return this.value.toString(10)
  }

  /**
   * Convert to binary string (padded to 256 bits)
   */
  toBinaryString(): string {
    return this.value.toString(2).padStart(256, '0')
  }

  /**
   * Check if this word is zero
   */
  isZero(): boolean {
    return this.value === 0n
  }

  /**
   * Check if this word is non-zero
   */
  isNonZero(): boolean {
    return this.value !== 0n
  }

  /**
   * Arithmetic operations (all modulo 2^256)
   */

  add(other: Word256): Word256 {
    return new Word256(this.value + other.value)
  }

  sub(other: Word256): Word256 {
    return new Word256(this.value - other.value)
  }

  mul(other: Word256): Word256 {
    return new Word256(this.value * other.value)
  }

  div(other: Word256): Word256 {
    if (other.value === 0n) {
      return Word256.zero()
    }
    return new Word256(this.value / other.value)
  }

  mod(other: Word256): Word256 {
    if (other.value === 0n) {
      return Word256.zero()
    }
    return new Word256(this.value % other.value)
  }

  /**
   * Signed division (two's complement)
   * Returns 0 if divisor is 0
   * Special case: -2^255 / -1 = -2^255 (overflow)
   */
  sdiv(other: Word256): Word256 {
    if (other.value === 0n) {
      return Word256.zero()
    }
    const a = this.toSigned()
    const b = other.toSigned()

    // Special case: MIN_INT256 / -1 would overflow, result is MIN_INT256
    const MIN_INT256 = -(1n << 255n)
    if (a === MIN_INT256 && b === -1n) {
      return new Word256(1n << 255n) // MIN_INT256 as unsigned
    }

    const result = a / b
    return new Word256(result)
  }

  /**
   * Signed modulo (two's complement)
   * Returns 0 if divisor is 0
   * Result sign matches dividend sign
   */
  smod(other: Word256): Word256 {
    if (other.value === 0n) {
      return Word256.zero()
    }
    const a = this.toSigned()
    const b = other.toSigned()
    // In EVM, smod result sign follows the dividend (a)
    const result = a % b
    return new Word256(result)
  }

  /**
   * Addition modulo N: (a + b) % N
   * Intermediate sum doesn't overflow (uses arbitrary precision)
   * Returns 0 if N is 0
   */
  addmod(b: Word256, n: Word256): Word256 {
    if (n.value === 0n) {
      return Word256.zero()
    }
    // Use BigInt's arbitrary precision for intermediate sum
    const sum = this.value + b.value
    return new Word256(sum % n.value)
  }

  /**
   * Multiplication modulo N: (a * b) % N
   * Intermediate product doesn't overflow (uses arbitrary precision)
   * Returns 0 if N is 0
   */
  mulmod(b: Word256, n: Word256): Word256 {
    if (n.value === 0n) {
      return Word256.zero()
    }
    // Use BigInt's arbitrary precision for intermediate product
    const product = this.value * b.value
    return new Word256(product % n.value)
  }

  /**
   * Sign-extend from (b+1) bytes
   * If b >= 31, returns unchanged value
   * Otherwise, sign-extends the (b+1)th byte
   */
  signExtend(b: Word256): Word256 {
    if (b.value >= 31n) {
      return new Word256(this.value)
    }

    const byteIndex = Number(b.value)
    const bitIndex = (byteIndex + 1) * 8
    const signBit = 1n << BigInt(bitIndex - 1)
    const mask = signBit - 1n

    if (this.value & signBit) {
      // Sign bit is 1, extend with 1s
      return new Word256(this.value | ~mask)
    } else {
      // Sign bit is 0, mask off higher bits
      return new Word256(this.value & mask)
    }
  }

  exp(other: Word256): Word256 {
    // Modular exponentiation
    let base = this.value
    let exponent = other.value
    let result = 1n

    while (exponent > 0n) {
      if (exponent & 1n) {
        result = (result * base) & MAX_UINT256
      }
      base = (base * base) & MAX_UINT256
      exponent >>= 1n
    }

    return new Word256(result)
  }

  /**
   * Comparison operations
   */

  eq(other: Word256): boolean {
    return this.value === other.value
  }

  lt(other: Word256): boolean {
    return this.value < other.value
  }

  gt(other: Word256): boolean {
    return this.value > other.value
  }

  /**
   * Signed less than comparison
   * Interprets both values as two's complement signed integers
   */
  slt(other: Word256): boolean {
    return this.toSigned() < other.toSigned()
  }

  /**
   * Signed greater than comparison
   * Interprets both values as two's complement signed integers
   */
  sgt(other: Word256): boolean {
    return this.toSigned() > other.toSigned()
  }

  /**
   * Convert to signed bigint (two's complement)
   */
  toSigned(): bigint {
    const signBit = 1n << 255n
    if (this.value >= signBit) {
      // Negative: subtract 2^256 to get negative value
      return this.value - (1n << 256n)
    }
    return this.value
  }

  /**
   * Bitwise operations
   */

  and(other: Word256): Word256 {
    return new Word256(this.value & other.value)
  }

  or(other: Word256): Word256 {
    return new Word256(this.value | other.value)
  }

  xor(other: Word256): Word256 {
    return new Word256(this.value ^ other.value)
  }

  not(): Word256 {
    return new Word256(~this.value)
  }

  /**
   * Shift operations
   */

  shl(shift: Word256): Word256 {
    if (shift.value >= 256n) {
      return Word256.zero()
    }
    return new Word256(this.value << shift.value)
  }

  shr(shift: Word256): Word256 {
    if (shift.value >= 256n) {
      return Word256.zero()
    }
    return new Word256(this.value >> shift.value)
  }

  /**
   * Signed arithmetic right shift
   * Preserves sign bit (fills with 1s for negative numbers)
   */
  sar(shift: Word256): Word256 {
    if (shift.value >= 256n) {
      // If shifting by 256 or more, result is all 0s (positive) or all 1s (negative)
      const signBit = 1n << 255n
      if (this.value >= signBit) {
        return Word256.max() // All 1s for negative
      }
      return Word256.zero() // All 0s for positive
    }
    // Arithmetic right shift preserves sign
    const signed = this.toSigned()
    const shifted = signed >> shift.value
    return new Word256(shifted)
  }

  /**
   * Get a specific byte (0 is most significant)
   */
  getByte(index: number): number {
    if (index < 0 || index >= 32) {
      return 0
    }
    const shiftAmount = BigInt((31 - index) * 8)
    return Number((this.value >> shiftAmount) & 0xffn)
  }

  /**
   * Equality for use in collections
   */
  equals(other: Word256): boolean {
    return this.value === other.value
  }

  /**
   * String representation (hex with 0x prefix)
   */
  toString(): string {
    return this.toHexWith0x()
  }
}
