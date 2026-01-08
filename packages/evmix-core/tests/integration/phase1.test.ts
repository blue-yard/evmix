import { describe, it, expect } from 'vitest'
import { Interpreter } from '../../src/interpreter/Interpreter'
import { HaltReason } from '../../src/state/HaltReason'
import { MemoryHost } from '../../src/host/MemoryHost'

describe('Phase 1 Integration Tests', () => {
  it('executes a simple arithmetic program', () => {
    // Program: 5 + 3 * 2 - 1
    // In stack notation: PUSH 5, PUSH 3, PUSH 2, MUL, ADD, PUSH 1, SUB, STOP
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5
      0x60,
      0x03, // PUSH1 3
      0x60,
      0x02, // PUSH1 2
      0x02, // MUL (3 * 2 = 6)
      0x01, // ADD (5 + 6 = 11)
      0x60,
      0x01, // PUSH1 1
      0x03, // SUB (11 - 1 = 10)
      0x00, // STOP
    ])

    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(10n)
  })

  it('executes a program with overflow', () => {
    // Program: MAX_UINT256 + 1 should wrap to 0
    const bytecode = new Uint8Array([
      0x7f,
      ...new Array(32).fill(0xff), // PUSH32 MAX_UINT256
      0x60,
      0x01, // PUSH1 1
      0x01, // ADD
      0x00, // STOP
    ])

    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
    interpreter.run()

    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(0n)
  })

  it('generates complete trace for program execution', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x0a, // PUSH1 10
      0x60,
      0x05, // PUSH1 5
      0x04, // DIV
      0x00, // STOP
    ])

    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
    interpreter.run()

    const trace = interpreter.getTrace()
    const events = trace.getEvents()

    // Verify we have all expected event types
    expect(events.some((e) => e.type === 'opcode.start')).toBe(true)
    expect(events.some((e) => e.type === 'gas.charge')).toBe(true)
    expect(events.some((e) => e.type === 'stack.push')).toBe(true)
    expect(events.some((e) => e.type === 'stack.pop')).toBe(true)
    expect(events.some((e) => e.type === 'halt')).toBe(true)

    // Verify events are sequential
    for (let i = 0; i < events.length; i++) {
      expect(events[i].index).toBe(i)
    }

    // Verify trace can be exported and imported
    const json = trace.toJSON()
    expect(json).toBeTruthy()

    const parsed = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBe(events.length)
  })

  it('correctly tracks gas consumption across multiple operations', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x02, // PUSH1 2 (3 gas)
      0x60,
      0x03, // PUSH1 3 (3 gas)
      0x02, // MUL (5 gas)
      0x60,
      0x04, // PUSH1 4 (3 gas)
      0x01, // ADD (3 gas)
      0x00, // STOP (0 gas)
    ])

    const initialGas = 1000n
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas, host })
    interpreter.run()

    // Total gas: 3 + 3 + 5 + 3 + 3 = 17
    expect(interpreter.getState().gasRemaining).toBe(983n)

    // Verify gas charge events
    const trace = interpreter.getTrace()
    const gasEvents = trace.getEventsByType('gas.charge')
    expect(gasEvents.length).toBe(5)

    let totalGasCharged = 0n
    for (const event of gasEvents) {
      if ('amount' in event) {
        totalGasCharged += BigInt(event.amount)
      }
    }
    expect(totalGasCharged).toBe(17n)
  })

  it('handles stack underflow correctly', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5
      0x01, // ADD (needs 2 values, only has 1)
    ])

    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STACK_UNDERFLOW)
  })

  it('executes complex nested arithmetic', () => {
    // Program: ((10 + 5) * 2) - (20 / 4)
    // = (15 * 2) - 5
    // = 30 - 5
    // = 25
    const bytecode = new Uint8Array([
      // Part 1: (10 + 5)
      0x60,
      0x0a, // PUSH1 10
      0x60,
      0x05, // PUSH1 5
      0x01, // ADD -> 15

      // Part 2: * 2
      0x60,
      0x02, // PUSH1 2
      0x02, // MUL -> 30

      // Part 3: (20 / 4)
      0x60,
      0x14, // PUSH1 20
      0x60,
      0x04, // PUSH1 4
      0x04, // DIV -> 5

      // Part 4: subtract
      0x03, // SUB -> 25

      0x00, // STOP
    ])

    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })
    interpreter.run()

    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(25n)
  })

  it('validates trace determinism', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5
      0x60,
      0x03, // PUSH1 3
      0x01, // ADD
      0x00, // STOP
    ])

    // Run twice
    const interpreter1 = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter1.run()
    const trace1 = interpreter1.getTrace().toJSON()

    const interpreter2 = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter2.run()
    const trace2 = interpreter2.getTrace().toJSON()

    // Traces should be identical
    expect(trace1).toBe(trace2)
  })
})
