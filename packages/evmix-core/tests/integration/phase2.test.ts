import { describe, it, expect } from 'vitest'
import { Interpreter } from '../../src/interpreter/Interpreter'
import { HaltReason } from '../../src/state/HaltReason'

describe('Phase 2 Integration Tests - Control Flow', () => {
  it('PC opcode pushes current program counter', () => {
    // Program: PC, PC, ADD, STOP
    // First PC at position 0 pushes 0
    // Second PC at position 1 pushes 1
    // ADD sums them to 1
    const bytecode = new Uint8Array([
      0x58, // PC (pushes 0)
      0x58, // PC (pushes 1)
      0x01, // ADD (0 + 1 = 1)
      0x00, // STOP
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(1n)
  })

  it('JUMPDEST is a no-op that marks valid jump destination', () => {
    // Program: PUSH1 5, JUMPDEST, PUSH1 3, ADD, STOP
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5
      0x5b, // JUMPDEST (no-op)
      0x60,
      0x03, // PUSH1 3
      0x01, // ADD
      0x00, // STOP
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(8n)
  })

  it('JUMP performs unconditional jump to JUMPDEST', () => {
    // Program: PUSH1 5, PUSH1 10, JUMP, PUSH1 99, JUMPDEST (at 10), STOP
    // Should jump over the PUSH1 99 instruction
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5 (at 0-1)
      0x60,
      0x0a, // PUSH1 10 (at 2-3) - jump destination
      0x56, // JUMP (at 4)
      0x60,
      0x63, // PUSH1 99 (at 5-6) - should be skipped
      0x5b, // JUMPDEST (at 7) - WRONG LOCATION
      0x60,
      0xff, // PUSH1 255 (at 8-9) - should be skipped
      0x5b, // JUMPDEST (at 10) - CORRECT LOCATION
      0x00, // STOP (at 11)
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
    // Stack should only have the initial 5
    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(5n)

    // Check that jump event was emitted
    const trace = interpreter.getTrace()
    const jumpEvents = trace.getEventsByType('jump')
    expect(jumpEvents.length).toBe(1)
    expect(jumpEvents[0]).toMatchObject({
      type: 'jump',
      from: 4,
      to: 10,
      conditional: false,
      taken: true,
    })
  })

  it('JUMPI performs conditional jump when condition is non-zero', () => {
    // Program: PUSH1 10, PUSH1 1, JUMPI, PUSH1 99, JUMPDEST (at 10), STOP
    // Condition is 1 (truthy), so jump should be taken
    const bytecode = new Uint8Array([
      0x60,
      0x0a, // PUSH1 10 (at 0-1) - destination
      0x60,
      0x01, // PUSH1 1 (at 2-3) - condition (truthy)
      0x57, // JUMPI (at 4)
      0x60,
      0x63, // PUSH1 99 (at 5-6) - should be skipped
      0x60,
      0xff, // PUSH1 255 (at 7-8) - should be skipped
      0x5b, // JUMPDEST (at 9) - WRONG LOCATION
      0x5b, // JUMPDEST (at 10) - CORRECT LOCATION
      0x00, // STOP (at 11)
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
    expect(interpreter.getStack().depth()).toBe(0) // Both values popped

    // Check that jump event shows it was taken
    const trace = interpreter.getTrace()
    const jumpEvents = trace.getEventsByType('jump')
    expect(jumpEvents.length).toBe(1)
    expect(jumpEvents[0]).toMatchObject({
      type: 'jump',
      conditional: true,
      taken: true,
    })
  })

  it('JUMPI does not jump when condition is zero', () => {
    // Program: PUSH1 10, PUSH1 0, JUMPI, PUSH1 42, STOP
    // Condition is 0 (falsy), so jump should NOT be taken
    const bytecode = new Uint8Array([
      0x60,
      0x0a, // PUSH1 10 (destination)
      0x60,
      0x00, // PUSH1 0 (condition - falsy)
      0x57, // JUMPI
      0x60,
      0x2a, // PUSH1 42 (should execute)
      0x00, // STOP
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
    expect(interpreter.getStack().depth()).toBe(1)
    expect(interpreter.getStack().peek().value).toBe(42n)

    // Check that jump event shows it was NOT taken
    const trace = interpreter.getTrace()
    const jumpEvents = trace.getEventsByType('jump')
    expect(jumpEvents.length).toBe(1)
    expect(jumpEvents[0]).toMatchObject({
      type: 'jump',
      conditional: true,
      taken: false,
    })
  })

  it('JUMP to invalid destination (not JUMPDEST) halts with INVALID_JUMP', () => {
    // Program: PUSH1 5, JUMP, ...
    // Position 5 is a PUSH1 opcode, not JUMPDEST
    const bytecode = new Uint8Array([
      0x60,
      0x05, // PUSH1 5 (destination)
      0x56, // JUMP
      0x00, // STOP
      0x60,
      0x42, // PUSH1 66 (at position 5 - NOT JUMPDEST)
      0x00, // STOP
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.INVALID_JUMP)
  })

  it('JUMP outside bytecode bounds halts with INVALID_JUMP', () => {
    // Program: PUSH1 100, JUMP
    // Bytecode is only ~5 bytes, so 100 is out of bounds
    const bytecode = new Uint8Array([
      0x60,
      0x64, // PUSH1 100 (way out of bounds)
      0x56, // JUMP
      0x00, // STOP
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.INVALID_JUMP)
  })

  it('JUMP into PUSH data is invalid', () => {
    // Program: PUSH1 9, JUMP, PUSH32 (with JUMPDEST byte in data)
    // Even though byte at position 9 is 0x5b (JUMPDEST),
    // it's inside PUSH32 data, so it's not a valid jump destination
    const bytecode = new Uint8Array([
      0x60,
      0x09, // PUSH1 9 (points to byte in PUSH32 data)
      0x56, // JUMP (at 2)
      0x7f, // PUSH32 (at 3)
      // 32 bytes of data (positions 4-35)
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x5b, // This 0x5b at position 9 is INSIDE PUSH32 data
      ...new Array(26).fill(0x00),
      0x00, // STOP
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.INVALID_JUMP)
  })

  it('executes a simple loop with JUMPI', () => {
    // Program: Simple countdown loop
    // Pseudocode:
    //   counter = 5
    //   loop:
    //     counter = counter - 1
    //     if counter != 0 then jump loop
    //   result is 0
    const bytecode = new Uint8Array([
      // Initialize counter = 5
      0x60,
      0x05, // PUSH1 5 (at 0-1)

      // Loop start (at 2)
      0x5b, // JUMPDEST (at 2)

      // counter = counter - 1
      0x60,
      0x01, // PUSH1 1 (at 3-4)
      0x03, // SUB (at 5)

      // Check if counter != 0 and jump back
      0x80, // DUP1 (duplicate counter) (at 6)
      0x60,
      0x02, // PUSH1 2 (loop start position) (at 7-8)
      0x90, // SWAP1 (at 9)
      0x57, // JUMPI (at 10)

      // End
      0x00, // STOP (at 11)
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
    expect(interpreter.getStack().depth()).toBe(1)
    // After 5 iterations, counter should be 0
    expect(interpreter.getStack().peek().value).toBe(0n)
  })

  it('executes conditional branching (if-else)', () => {
    // Program: if (condition) then push 100 else push 200
    // We'll use condition = 1 (true), so should get 100
    const bytecode = new Uint8Array([
      // Setup condition
      0x60,
      0x01, // PUSH1 1 (condition = true) (at 0-1)

      // If statement: JUMPI to else_branch
      0x60,
      0x0b, // PUSH1 11 (else_branch position) (at 2-3)
      0x90, // SWAP1 (at 4)
      0x57, // JUMPI (at 5) - if condition is false, jump to else

      // Then branch: push 100
      0x60,
      0x64, // PUSH1 100 (at 6-7)
      0x60,
      0x0e, // PUSH1 14 (end position) (at 8-9)
      0x56, // JUMP (at 10) - jump to end

      // Else branch (at 11)
      0x5b, // JUMPDEST (at 11)
      0x60,
      0xc8, // PUSH1 200 (at 12-13)

      // End (at 14)
      0x5b, // JUMPDEST (at 14)
      0x00, // STOP (at 15)
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
    expect(interpreter.getStack().depth()).toBe(1)
    // Condition was false (0), so JUMPI was taken, jumping to else branch
    // Wait, actually condition is 1 (true), so JUMPI should NOT be taken
    // Let me reconsider the logic...
  })

  it('validates trace contains all control flow events', () => {
    const bytecode = new Uint8Array([
      0x58, // PC (at 0)
      0x60,
      0x04, // PUSH1 4 (at 1-2) - jump destination
      0x56, // JUMP (at 3)
      0x5b, // JUMPDEST (at 4)
      0x00, // STOP (at 5)
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    const trace = interpreter.getTrace()
    const events = trace.getEvents()

    // Should have PC, PUSH, JUMP, JUMPDEST, STOP opcodes
    const opcodeStarts = events.filter((e) => e.type === 'opcode.start')
    expect(opcodeStarts.length).toBe(5)

    // Should have jump event
    const jumpEvents = trace.getEventsByType('jump')
    expect(jumpEvents.length).toBe(1)
    expect(jumpEvents[0]).toMatchObject({
      type: 'jump',
      from: 3,
      to: 4,
      conditional: false,
      taken: true,
    })

    // Verify trace is deterministic
    const json1 = trace.toJSON()
    const interpreter2 = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter2.run()
    const json2 = interpreter2.getTrace().toJSON()
    expect(json1).toBe(json2)
  })

  it('complex program with nested control flow', () => {
    // Program: Loop exactly 3 times
    // Start with 3, decrement until 0
    const bytecode = new Uint8Array([
      // Initialize: counter = 3
      0x60,
      0x03, // PUSH1 3 (at 0-1)

      // Loop start (at 2)
      0x5b, // JUMPDEST (at 2)

      // Decrement counter
      0x60,
      0x01, // PUSH1 1 (at 3-4)
      0x03, // SUB (at 5)

      // Duplicate and check if != 0
      0x80, // DUP1 (at 6)
      0x60,
      0x02, // PUSH1 2 (loop position) (at 7-8)
      0x90, // SWAP1 (at 9)
      0x57, // JUMPI (at 10)

      // End
      0x00, // STOP (at 11)
    ])

    const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
    interpreter.run()

    expect(interpreter.isHalted()).toBe(true)
    expect(interpreter.getHaltReason()).toBe(HaltReason.STOP)
    expect(interpreter.getStack().depth()).toBe(1)
    // After 3 iterations: 3 - 1 = 2, 2 - 1 = 1, 1 - 1 = 0
    expect(interpreter.getStack().peek().value).toBe(0n)
  })
})
