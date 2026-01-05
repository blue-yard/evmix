import { describe, it, expect } from 'vitest'
import { Address } from '../../src/types/Address'

describe('Address', () => {
  describe('construction', () => {
    it('creates from bigint', () => {
      const addr = Address.from(42n)
      expect(addr.value).toBe(42n)
    })

    it('creates from hex string', () => {
      const addr1 = Address.fromHex('0x2a')
      expect(addr1.value).toBe(42n)

      const addr2 = Address.fromHex('2a')
      expect(addr2.value).toBe(42n)

      const addr3 = Address.fromHex('')
      expect(addr3.value).toBe(0n)
    })

    it('creates from full hex address', () => {
      const hex = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'
      const addr = Address.fromHex(hex)
      expect(addr.toHexWith0x()).toBe(hex.toLowerCase())
    })

    it('creates from bytes', () => {
      const bytes = new Uint8Array([0x00, 0x2a])
      const addr = Address.fromBytes(bytes)
      expect(addr.value).toBe(42n)
    })

    it('creates zero address', () => {
      const addr = Address.zero()
      expect(addr.value).toBe(0n)
    })

    it('wraps overflow on construction', () => {
      const max160 = (1n << 160n) - 1n
      const addr = Address.from(max160 + 1n)
      expect(addr.value).toBe(0n)
    })

    it('throws on invalid hex string', () => {
      expect(() => Address.fromHex('0xZZZ')).toThrow('Invalid hex string')
    })

    it('throws on hex string too long', () => {
      const tooLong = '0x' + '0'.repeat(41)
      expect(() => Address.fromHex(tooLong)).toThrow('Address hex string too long')
    })

    it('throws on byte array too long', () => {
      const bytes = new Uint8Array(21)
      expect(() => Address.fromBytes(bytes)).toThrow('Byte array too long')
    })
  })

  describe('conversion', () => {
    it('converts to hex', () => {
      const addr = Address.from(42n)
      expect(addr.toHex()).toBe('0'.repeat(38) + '2a')
      expect(addr.toHexWith0x()).toBe('0x' + '0'.repeat(38) + '2a')
    })

    it('converts to bytes', () => {
      const addr = Address.from(42n)
      const bytes = addr.toBytes()
      expect(bytes.length).toBe(20)
      expect(bytes[19]).toBe(42)
      expect(bytes[18]).toBe(0)
    })

    it('converts to string', () => {
      const addr = Address.from(42n)
      expect(addr.toString()).toBe('0x' + '0'.repeat(38) + '2a')
    })
  })

  describe('equality', () => {
    it('checks equality', () => {
      const addr1 = Address.from(42n)
      const addr2 = Address.from(42n)
      const addr3 = Address.from(43n)
      expect(addr1.equals(addr2)).toBe(true)
      expect(addr1.equals(addr3)).toBe(false)
    })
  })
})
