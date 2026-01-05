import { describe, it, expect } from 'vitest'
import { MachineState } from '../../src/state/MachineState'
import { HaltReason } from '../../src/state/HaltReason'
import { Word256 } from '../../src/types/Word256'

describe('MachineState', () => {
  it('initializes with correct defaults', () => {
    const state = new MachineState(1000000n)
    expect(state.pc).toBe(0)
    expect(state.gasRemaining).toBe(1000000n)
    expect(state.stack).toEqual([])
    expect(state.memory.length).toBe(0)
    expect(state.returnData.length).toBe(0)
    expect(state.halted).toBe(false)
    expect(state.haltReason).toBeUndefined()
  })

  it('clones state correctly', () => {
    const state = new MachineState(1000000n)
    state.pc = 5
    state.gasRemaining = 900000n
    state.stack.push(Word256.fromNumber(42))
    state.memory = new Uint8Array([1, 2, 3])
    state.returnData = new Uint8Array([4, 5, 6])

    const cloned = state.clone()
    expect(cloned.pc).toBe(5)
    expect(cloned.gasRemaining).toBe(900000n)
    expect(cloned.stack).toEqual(state.stack)
    expect(cloned.memory).toEqual(state.memory)
    expect(cloned.returnData).toEqual(state.returnData)

    // Verify deep copy
    state.stack.push(Word256.fromNumber(100))
    expect(cloned.stack.length).toBe(1)
  })

  it('halts with reason', () => {
    const state = new MachineState(1000000n)
    state.halt(HaltReason.STOP)
    expect(state.halted).toBe(true)
    expect(state.haltReason).toBe(HaltReason.STOP)
  })

  it('charges gas', () => {
    const state = new MachineState(1000n)
    state.chargeGas(300n)
    expect(state.gasRemaining).toBe(700n)
  })

  it('throws when out of gas', () => {
    const state = new MachineState(100n)
    expect(() => state.chargeGas(200n)).toThrow('Out of gas')
    expect(state.halted).toBe(true)
    expect(state.haltReason).toBe(HaltReason.OUT_OF_GAS)
  })

  it('tracks stack depth', () => {
    const state = new MachineState(1000000n)
    expect(state.getStackDepth()).toBe(0)
    state.stack.push(Word256.fromNumber(1))
    expect(state.getStackDepth()).toBe(1)
    state.stack.push(Word256.fromNumber(2))
    expect(state.getStackDepth()).toBe(2)
  })

  it('checks stack item availability', () => {
    const state = new MachineState(1000000n)
    expect(state.hasStackItems(1)).toBe(false)
    state.stack.push(Word256.fromNumber(1))
    expect(state.hasStackItems(1)).toBe(true)
    expect(state.hasStackItems(2)).toBe(false)
  })

  describe('memory operations', () => {
    it('expands memory', () => {
      const state = new MachineState(1000000n)
      const cost = state.expandMemory(0, 32)
      expect(state.memory.length).toBe(32)
      expect(cost).toBeGreaterThan(0n)
    })

    it('does not expand if already large enough', () => {
      const state = new MachineState(1000000n)
      state.expandMemory(0, 32)
      const initialSize = state.memory.length
      const cost = state.expandMemory(0, 16)
      expect(state.memory.length).toBe(initialSize)
      expect(cost).toBe(0n)
    })

    it('rounds memory expansion to 32-byte words', () => {
      const state = new MachineState(1000000n)
      state.expandMemory(0, 33)
      expect(state.memory.length).toBe(64)
    })

    it('reads from memory', () => {
      const state = new MachineState(1000000n)
      state.memory = new Uint8Array([1, 2, 3, 4, 5])
      const data = state.readMemory(1, 3)
      expect(Array.from(data)).toEqual([2, 3, 4])
    })

    it('writes to memory', () => {
      const state = new MachineState(1000000n)
      state.expandMemory(0, 32)
      state.writeMemory(10, new Uint8Array([1, 2, 3]))
      expect(state.memory[10]).toBe(1)
      expect(state.memory[11]).toBe(2)
      expect(state.memory[12]).toBe(3)
    })

    it('expands memory when writing beyond current size', () => {
      const state = new MachineState(1000000n)
      state.writeMemory(100, new Uint8Array([1, 2, 3]))
      expect(state.memory.length).toBeGreaterThanOrEqual(103)
      expect(state.memory[100]).toBe(1)
    })

    it('gets memory size', () => {
      const state = new MachineState(1000000n)
      expect(state.getMemorySize()).toBe(0)
      state.expandMemory(0, 64)
      expect(state.getMemorySize()).toBe(64)
    })
  })
})
