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
