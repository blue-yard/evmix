/**
 * Address - A 20-byte Ethereum address (160 bits)
 */

export class Address {
  readonly value: bigint

  private constructor(value: bigint) {
    // Ensure value is in range [0, 2^160 - 1]
    this.value = value & ((1n << 160n) - 1n)
  }

  /**
   * Create an Address from a bigint
   */
  static from(value: bigint): Address {
    return new Address(value)
  }

  /**
   * Create an Address from a hex string (with or without 0x prefix)
   */
  static fromHex(hex: string): Address {
    const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex
    if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
      throw new Error(`Invalid hex string: ${hex}`)
    }
    if (cleaned.length > 40) {
      throw new Error(`Address hex string too long: ${cleaned.length} > 40`)
    }
    return new Address(cleaned === '' ? 0n : BigInt('0x' + cleaned))
  }

  /**
   * Create an Address from a byte array (big-endian)
   */
  static fromBytes(bytes: Uint8Array): Address {
    if (bytes.length > 20) {
      throw new Error(`Byte array too long: ${bytes.length} > 20`)
    }
    let value = 0n
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8n) | BigInt(bytes[i])
    }
    return new Address(value)
  }

  /**
   * Create a zero Address
   */
  static zero(): Address {
    return new Address(0n)
  }

  /**
   * Convert to hex string (padded to 40 characters, no 0x prefix)
   */
  toHex(): string {
    return this.value.toString(16).padStart(40, '0')
  }

  /**
   * Convert to hex string with 0x prefix
   */
  toHexWith0x(): string {
    return '0x' + this.toHex()
  }

  /**
   * Convert to byte array (big-endian, 20 bytes)
   */
  toBytes(): Uint8Array {
    const bytes = new Uint8Array(20)
    let val = this.value
    for (let i = 19; i >= 0; i--) {
      bytes[i] = Number(val & 0xffn)
      val >>= 8n
    }
    return bytes
  }

  /**
   * Check equality with another address
   */
  equals(other: Address): boolean {
    return this.value === other.value
  }

  /**
   * String representation (hex with 0x prefix)
   */
  toString(): string {
    return this.toHexWith0x()
  }
}
