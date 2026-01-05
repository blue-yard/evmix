/**
 * EVMIX Example: Basic Arithmetic
 *
 * This example demonstrates the basics of EVM execution using EVMIX.
 * Run with: npx tsx docs/examples/basic-arithmetic.ts
 */

import { Interpreter, Word256 } from '../../packages/evmix-core/src/index'

console.log('='.repeat(60))
console.log('EVMIX Example: Basic Arithmetic')
console.log('='.repeat(60))
console.log()

// =============================================================================
// Example 1: Simple Addition (5 + 3 = 8)
// =============================================================================

console.log('Example 1: Simple Addition (5 + 3)')
console.log('-'.repeat(60))

const program1 = new Uint8Array([
  0x60,
  0x05, // PUSH1 5
  0x60,
  0x03, // PUSH1 3
  0x01, // ADD
  0x00, // STOP
])

const interpreter1 = new Interpreter({
  bytecode: program1,
  initialGas: 1000000n,
})

interpreter1.run()

const result1 = interpreter1.getStack().peek()
const gasUsed1 = 1000000n - interpreter1.getState().gasRemaining

console.log(`Result: ${result1.value}`)
console.log(`Gas used: ${gasUsed1}`)
console.log(`Trace events: ${interpreter1.getTrace().getEventCount()}`)
console.log()

// =============================================================================
// Example 2: Complex Expression ((10 + 5) * 2 - (20 / 4))
// =============================================================================

console.log('Example 2: Complex Expression ((10 + 5) * 2 - (20 / 4))')
console.log('-'.repeat(60))

const program2 = new Uint8Array([
  // Part 1: 10 + 5 = 15
  0x60,
  0x0a, // PUSH1 10
  0x60,
  0x05, // PUSH1 5
  0x01, // ADD → 15

  // Part 2: 15 * 2 = 30
  0x60,
  0x02, // PUSH1 2
  0x02, // MUL → 30

  // Part 3: 20 / 4 = 5
  0x60,
  0x14, // PUSH1 20
  0x60,
  0x04, // PUSH1 4
  0x04, // DIV → 5

  // Part 4: 30 - 5 = 25
  0x03, // SUB → 25

  0x00, // STOP
])

const interpreter2 = new Interpreter({
  bytecode: program2,
  initialGas: 1000000n,
})

interpreter2.run()

const result2 = interpreter2.getStack().peek()
const gasUsed2 = 1000000n - interpreter2.getState().gasRemaining

console.log(`Result: ${result2.value}`)
console.log(`Expected: 25`)
console.log(`Gas used: ${gasUsed2}`)
console.log(`Trace events: ${interpreter2.getTrace().getEventCount()}`)
console.log()

// =============================================================================
// Example 3: Step-by-Step Execution
// =============================================================================

console.log('Example 3: Step-by-Step Execution (6 * 7)')
console.log('-'.repeat(60))

const program3 = new Uint8Array([
  0x60,
  0x06, // PUSH1 6
  0x60,
  0x07, // PUSH1 7
  0x02, // MUL
  0x00, // STOP
])

const interpreter3 = new Interpreter({
  bytecode: program3,
  initialGas: 1000000n,
})

let stepCount = 0
while (interpreter3.step()) {
  stepCount++
  const state = interpreter3.getState()
  const stack = interpreter3.getStack()

  console.log(`Step ${stepCount}:`)
  console.log(`  PC: ${state.pc}`)
  console.log(
    `  Stack: [${stack
      .toArrayReversed()
      .map((w) => w.value.toString())
      .join(', ')}]`
  )
  console.log(`  Gas: ${state.gasRemaining}`)
  console.log()
}

console.log(`Final result: ${interpreter3.getStack().peek().value}`)
console.log()

// =============================================================================
// Example 4: Overflow Behavior
// =============================================================================

console.log('Example 4: Overflow Behavior (MAX + 1)')
console.log('-'.repeat(60))

const program4 = new Uint8Array([
  // PUSH32 with all 0xFF bytes (MAX_UINT256)
  0x7f,
  ...new Array(32).fill(0xff),
  0x60,
  0x01, // PUSH1 1
  0x01, // ADD (will overflow to 0)
  0x00, // STOP
])

const interpreter4 = new Interpreter({
  bytecode: program4,
  initialGas: 1000000n,
})

interpreter4.run()

const result4 = interpreter4.getStack().peek()
console.log(`MAX_UINT256 + 1 = ${result4.value} (wraps to zero!)`)
console.log()

// =============================================================================
// Example 5: Division by Zero
// =============================================================================

console.log('Example 5: Division by Zero (10 / 0)')
console.log('-'.repeat(60))

const program5 = new Uint8Array([
  0x60,
  0x0a, // PUSH1 10
  0x60,
  0x00, // PUSH1 0
  0x04, // DIV
  0x00, // STOP
])

const interpreter5 = new Interpreter({
  bytecode: program5,
  initialGas: 1000000n,
})

interpreter5.run()

const result5 = interpreter5.getStack().peek()
console.log(`10 / 0 = ${result5.value} (returns zero, no error!)`)
console.log()

// =============================================================================
// Example 6: Trace Analysis
// =============================================================================

console.log('Example 6: Trace Analysis')
console.log('-'.repeat(60))

const program6 = new Uint8Array([
  0x60,
  0x05, // PUSH1 5
  0x60,
  0x03, // PUSH1 3
  0x01, // ADD
  0x00, // STOP
])

const interpreter6 = new Interpreter({
  bytecode: program6,
  initialGas: 1000000n,
})

interpreter6.run()

const trace = interpreter6.getTrace()
const events = trace.getEvents()

console.log(`Total events: ${events.length}`)
console.log(`\nEvent breakdown:`)

const eventTypes = new Map<string, number>()
for (const event of events) {
  eventTypes.set(event.type, (eventTypes.get(event.type) || 0) + 1)
}

for (const [type, count] of eventTypes) {
  console.log(`  ${type}: ${count}`)
}

console.log(`\nFirst 5 events:`)
for (let i = 0; i < Math.min(5, events.length); i++) {
  const e = events[i]
  console.log(`  [${e.index}] ${e.type} at PC=${e.pc}`)
}

console.log()

// =============================================================================
// Example 7: Out of Gas
// =============================================================================

console.log('Example 7: Out of Gas')
console.log('-'.repeat(60))

const program7 = new Uint8Array([
  0x60,
  0x05, // PUSH1 5 (costs 3 gas)
  0x60,
  0x03, // PUSH1 3 (costs 3 gas)
  0x01, // ADD (costs 3 gas) - total 9 gas needed
])

const interpreter7 = new Interpreter({
  bytecode: program7,
  initialGas: 7n, // Only 7 gas - not enough!
})

interpreter7.run()

console.log(`Halted: ${interpreter7.isHalted()}`)
console.log(`Halt reason: ${interpreter7.getHaltReason()}`)
console.log(`Stack depth: ${interpreter7.getStack().depth()}`)
console.log()

// =============================================================================
// Summary
// =============================================================================

console.log('='.repeat(60))
console.log('Summary')
console.log('='.repeat(60))
console.log()
console.log('You have learned:')
console.log('  ✓ How to write EVM bytecode')
console.log('  ✓ How to execute programs with EVMIX')
console.log('  ✓ How to inspect results and traces')
console.log('  ✓ How arithmetic overflow works')
console.log('  ✓ How gas metering prevents infinite loops')
console.log('  ✓ How to analyze execution traces')
console.log()
console.log('Next: Read docs/WALKTHROUGH_PHASE1.md for deeper understanding!')
console.log()
