import { describe, it, expect } from 'vitest'
import { Interpreter } from '../../src/interpreter/Interpreter'
import { HaltReason } from '../../src/state/HaltReason'
import { MemoryHost } from '../../src/host/MemoryHost'

describe('Interpreter', () => {
  it('initializes correctly', () => {
    const bytecode = new Uint8Array([0x00]) // STOP
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    expect(interpreter.isHalted()).toBe(false)
    expect(interpreter.getState().pc).toBe(0)
    expect(interpreter.getState().gasRemaining).toBe(1000000n)
  })

  it('executes STOP opcode', () => {
    const bytecode = new Uint8Array([0x00]) // STOP
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    const continued = interpreter.step()
    expect(continued).toBe(false)
    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
  })

  it('executes PUSH1 and PUSH1', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5
      0x60,
      0x03, // PUSH1 3
    ])
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    interpreter.step() // PUSH1 5
    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(5n)

    interpreter.step() // PUSH1 3
    expect(interpreter.getStack().depth()).toBe(2)
    expect(interpreter.getStack().peek().value).toBe(3n)
  })

  it('executes ADD opcode', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5
      0x60,
      0x03, // PUSH1 3
      0x01, // ADD
    ])
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    interpreter.step() // PUSH1 5
    interpreter.step() // PUSH1 3
    interpreter.step() // ADD

    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(8n)
  })

  it('executes MUL opcode', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x06, // PUSH1 6
      0x60,
      0x07, // PUSH1 7
      0x02, // MUL
    ])
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    interpreter.step() // PUSH1 6
    interpreter.step() // PUSH1 7
    interpreter.step() // MUL

    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(42n)
  })

  it('executes SUB opcode', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x0a, // PUSH1 10
      0x60,
      0x03, // PUSH1 3
      0x03, // SUB
    ])
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    interpreter.step() // PUSH1 10
    interpreter.step() // PUSH1 3
    interpreter.step() // SUB

    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(7n)
  })

  it('executes DIV opcode', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x54, // PUSH1 84
      0x60,
      0x02, // PUSH1 2
      0x04, // DIV
    ])
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    interpreter.step() // PUSH1 84
    interpreter.step() // PUSH1 2
    interpreter.step() // DIV

    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(42n)
  })

  it('handles division by zero', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x0a, // PUSH1 10
      0x60,
      0x00, // PUSH1 0
      0x04, // DIV
    ])
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    interpreter.step() // PUSH1 10
    interpreter.step() // PUSH1 0
    interpreter.step() // DIV

    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(0n)
  })

  it('runs until halt', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5
      0x60,
      0x03, // PUSH1 3
      0x01, // ADD
      0x00, // STOP
    ])
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(8n)
  })

  it('collects trace events', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5
      0x60,
      0x03, // PUSH1 3
      0x01, // ADD
      0x00, // STOP
    ])
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    interpreter.run()

    const trace = interpreter.getTrace()
    const events = trace.getEvents()

    expect(events.length).toBeGreaterThan(0)

    // Check for opcode.start events
    const opcodeEvents = events.filter((e) => e.type === 'opcode.start')
    expect(opcodeEvents.length).toBe(4) // PUSH1, PUSH1, ADD, STOP

    // Check for stack operations
    const stackPushEvents = events.filter((e) => e.type === 'stack.push')
    expect(stackPushEvents.length).toBe(3) // 2 pushes from PUSH1, 1 from ADD

    // Check for halt event
    const haltEvents = events.filter((e) => e.type === 'halt')
    expect(haltEvents.length).toBe(1)
  })

  it('charges gas correctly', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5 (3 gas)
      0x60,
      0x03, // PUSH1 3 (3 gas)
      0x01, // ADD (3 gas)
    ])
    const initialGas = 100n
    const interpreter = new Interpreter({ bytecode, initialGas })

    interpreter.run()

    // Should have consumed 3 + 3 + 3 = 9 gas
    expect(interpreter.getState().gasRemaining).toBe(91n)
  })

  it('halts on out of gas', () => {
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5 (3 gas)
      0x60,
      0x03, // PUSH1 3 (3 gas)
      0x01, // ADD (3 gas)
    ])
    const initialGas = 5n // Not enough gas
    const interpreter = new Interpreter({ bytecode, initialGas })

    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.OUT_OF_GAS)
  })

  it('halts on invalid opcode', () => {
    const bytecode = new Uint8Array([0xff]) // Not implemented
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    interpreter.step()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.INVALID_OPCODE)
  })

  it('halts when PC exceeds bytecode length', () => {
    const bytecode = new Uint8Array([0x60, 0x05]) // PUSH1 5
    const host = new MemoryHost()
    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n, host })

    interpreter.step() // PUSH1 5 advances PC to 2
    const continued = interpreter.step() // PC=2, beyond bytecode

    expect(continued).toBe(false)
    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
  })
})
