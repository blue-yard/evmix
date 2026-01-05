import { describe, it, expect } from 'vitest'
import { Word256, MAX_UINT256 } from '../../src/types/Word256'

describe('Word256', () => {
  describe('construction', () => {
    it('creates from bigint', () => {
      const w = Word256.from(42n)
      expect(w.value).toBe(42n)
    })

    it('creates from number', () => {
      const w = Word256.fromNumber(42)
      expect(w.value).toBe(42n)
    })

    it('creates from hex string', () => {
      const w1 = Word256.fromHex('0x2a')
      expect(w1.value).toBe(42n)

      const w2 = Word256.fromHex('2a')
      expect(w2.value).toBe(42n)

      const w3 = Word256.fromHex('')
      expect(w3.value).toBe(0n)
    })

    it('creates from bytes', () => {
      const bytes = new Uint8Array([0x00, 0x2a])
      const w = Word256.fromBytes(bytes)
      expect(w.value).toBe(42n)
    })

    it('creates zero', () => {
      const w = Word256.zero()
      expect(w.value).toBe(0n)
    })

    it('creates one', () => {
      const w = Word256.one()
      expect(w.value).toBe(1n)
    })

    it('creates max', () => {
      const w = Word256.max()
      expect(w.value).toBe(MAX_UINT256)
    })

    it('wraps overflow on construction', () => {
      const w = Word256.from(MAX_UINT256 + 1n)
      expect(w.value).toBe(0n)
    })
  })

  describe('conversion', () => {
    it('converts to hex', () => {
      const w = Word256.fromNumber(42)
      expect(w.toHex()).toBe('0'.repeat(62) + '2a')
      expect(w.toHexWith0x()).toBe('0x' + '0'.repeat(62) + '2a')
    })

    it('converts to bytes', () => {
      const w = Word256.fromNumber(42)
      const bytes = w.toBytes()
      expect(bytes.length).toBe(32)
      expect(bytes[31]).toBe(42)
      expect(bytes[30]).toBe(0)
    })

    it('converts to decimal string', () => {
      const w = Word256.fromNumber(42)
      expect(w.toDecimalString()).toBe('42')
    })

    it('converts to binary string', () => {
      const w = Word256.fromNumber(5)
      const binary = w.toBinaryString()
      expect(binary.length).toBe(256)
      expect(binary).toBe('0'.repeat(253) + '101')
    })
  })

  describe('arithmetic', () => {
    it('adds', () => {
      const a = Word256.fromNumber(10)
      const b = Word256.fromNumber(32)
      expect(a.add(b).value).toBe(42n)
    })

    it('adds with overflow', () => {
      const a = Word256.max()
      const b = Word256.one()
      expect(a.add(b).value).toBe(0n)
    })

    it('subtracts', () => {
      const a = Word256.fromNumber(50)
      const b = Word256.fromNumber(8)
      expect(a.sub(b).value).toBe(42n)
    })

    it('subtracts with underflow', () => {
      const a = Word256.zero()
      const b = Word256.one()
      expect(a.sub(b).value).toBe(MAX_UINT256)
    })

    it('multiplies', () => {
      const a = Word256.fromNumber(6)
      const b = Word256.fromNumber(7)
      expect(a.mul(b).value).toBe(42n)
    })

    it('multiplies with overflow', () => {
      const a = Word256.max()
      const b = Word256.fromNumber(2)
      expect(a.mul(b).value).toBe(MAX_UINT256 - 1n)
    })

    it('divides', () => {
      const a = Word256.fromNumber(84)
      const b = Word256.fromNumber(2)
      expect(a.div(b).value).toBe(42n)
    })

    it('divides by zero returns zero', () => {
      const a = Word256.fromNumber(42)
      const b = Word256.zero()
      expect(a.div(b).value).toBe(0n)
    })

    it('calculates modulo', () => {
      const a = Word256.fromNumber(47)
      const b = Word256.fromNumber(5)
      expect(a.mod(b).value).toBe(2n)
    })

    it('modulo by zero returns zero', () => {
      const a = Word256.fromNumber(42)
      const b = Word256.zero()
      expect(a.mod(b).value).toBe(0n)
    })

    it('exponentiates', () => {
      const a = Word256.fromNumber(2)
      const b = Word256.fromNumber(8)
      expect(a.exp(b).value).toBe(256n)
    })
  })

  describe('comparison', () => {
    it('checks equality', () => {
      const a = Word256.fromNumber(42)
      const b = Word256.fromNumber(42)
      const c = Word256.fromNumber(43)
      expect(a.eq(b)).toBe(true)
      expect(a.eq(c)).toBe(false)
    })

    it('checks less than', () => {
      const a = Word256.fromNumber(42)
      const b = Word256.fromNumber(43)
      expect(a.lt(b)).toBe(true)
      expect(b.lt(a)).toBe(false)
      expect(a.lt(a)).toBe(false)
    })

    it('checks greater than', () => {
      const a = Word256.fromNumber(43)
      const b = Word256.fromNumber(42)
      expect(a.gt(b)).toBe(true)
      expect(b.gt(a)).toBe(false)
      expect(a.gt(a)).toBe(false)
    })
  })

  describe('bitwise operations', () => {
    it('performs AND', () => {
      const a = Word256.fromNumber(0b1100)
      const b = Word256.fromNumber(0b1010)
      expect(a.and(b).value).toBe(0b1000n)
    })

    it('performs OR', () => {
      const a = Word256.fromNumber(0b1100)
      const b = Word256.fromNumber(0b1010)
      expect(a.or(b).value).toBe(0b1110n)
    })

    it('performs XOR', () => {
      const a = Word256.fromNumber(0b1100)
      const b = Word256.fromNumber(0b1010)
      expect(a.xor(b).value).toBe(0b0110n)
    })

    it('performs NOT', () => {
      const a = Word256.zero()
      expect(a.not().value).toBe(MAX_UINT256)
    })
  })

  describe('shift operations', () => {
    it('shifts left', () => {
      const a = Word256.fromNumber(1)
      const shift = Word256.fromNumber(8)
      expect(a.shl(shift).value).toBe(256n)
    })

    it('shifts left beyond 256 returns zero', () => {
      const a = Word256.fromNumber(1)
      const shift = Word256.fromNumber(256)
      expect(a.shl(shift).value).toBe(0n)
    })

    it('shifts right', () => {
      const a = Word256.fromNumber(256)
      const shift = Word256.fromNumber(8)
      expect(a.shr(shift).value).toBe(1n)
    })

    it('shifts right beyond 256 returns zero', () => {
      const a = Word256.max()
      const shift = Word256.fromNumber(256)
      expect(a.shr(shift).value).toBe(0n)
    })
  })

  describe('utility', () => {
    it('checks if zero', () => {
      expect(Word256.zero().isZero()).toBe(true)
      expect(Word256.one().isZero()).toBe(false)
    })

    it('checks if non-zero', () => {
      expect(Word256.zero().isNonZero()).toBe(false)
      expect(Word256.one().isNonZero()).toBe(true)
    })

    it('gets specific byte', () => {
      const w = Word256.fromHex('0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20')
      expect(w.getByte(0)).toBe(0x01)
      expect(w.getByte(31)).toBe(0x20)
      expect(w.getByte(32)).toBe(0)
      expect(w.getByte(-1)).toBe(0)
    })

    it('converts to string', () => {
      const w = Word256.fromNumber(42)
      expect(w.toString()).toBe('0x' + '0'.repeat(62) + '2a')
    })
  })
})
