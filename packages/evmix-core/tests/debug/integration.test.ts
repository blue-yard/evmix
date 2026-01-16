// packages/evmix-core/tests/debug/integration.test.ts
import { describe, it, expect } from 'vitest'
import { DebugSession } from '../../src/debug/DebugSession'
import { MemoryHost } from '../../src/host/MemoryHost'
import { Address } from '../../src/types/Address'
import { Word256 } from '../../src/types/Word256'

describe('DebugSession Integration', () => {
  it('full workflow: step, breakpoint, mutate, run', () => {
    // Contract: PUSH1 5, PUSH1 0, SSTORE, PUSH1 0, SLOAD, STOP
    // Stores 5 at slot 0, then loads it back
    const bytecode = new Uint8Array([
      0x60, 0x05,  // PUSH1 5
      0x60, 0x00,  // PUSH1 0
      0x55,        // SSTORE
      0x60, 0x00,  // PUSH1 0
      0x54,        // SLOAD
      0x00,        // STOP
    ])

    const host = new MemoryHost()
    const contractAddr = Address.fromHex('0x1111111111111111111111111111111111111111')
    host.setAddress(contractAddr)

    const session = new DebugSession({
      bytecode,
      initialGas: 100000n,
      host,
    })

    // Step through first two pushes
    session.step() // PUSH1 5
    session.step() // PUSH1 0
    expect(session.getSnapshot().stack.length).toBe(2)

    // Set breakpoint on PUSH1 before SLOAD (at PC=5)
    // This triggers after PUSH1 executes, leaving us ready to mutate before SLOAD
    session.addBreakpoint({ type: 'pc', value: 5 })

    // Run until breakpoint
    session.run()
    expect(session.isHalted()).toBe(false) // Stopped at breakpoint

    // Mutate storage before SLOAD executes
    session.mutate((h) => {
      h.sstore(contractAddr, Word256.zero(), Word256.from(999n))
    })

    // Continue to end
    session.clearBreakpoints()
    session.run()

    // Stack should have 999 (the mutated value)
    const finalStack = session.getSnapshot().stack
    expect(finalStack[0].value).toBe(999n)
  })
})
