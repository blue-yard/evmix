# EVMIX Phase 1 Walkthrough: Understanding the EVM Core

**An educational guide to the Ethereum Virtual Machine fundamentals**

This walkthrough will take you from zero to understanding how the EVM executes code, using the Phase 1 implementation of EVMIX as a learning tool.

---

## Table of Contents

1. [What is the EVM?](#what-is-the-evm)
2. [The Stack Machine Model](#the-stack-machine-model)
3. [EVM Data Types](#evm-data-types)
4. [Machine State](#machine-state)
5. [Your First Program](#your-first-program)
6. [Understanding Opcodes](#understanding-opcodes)
7. [Gas: The Cost of Computation](#gas-the-cost-of-computation)
8. [Trace Events: Making Execution Observable](#trace-events-making-execution-observable)
9. [Memory in the EVM](#memory-in-the-evm)
10. [Putting It All Together](#putting-it-all-together)

---

## What is the EVM?

The **Ethereum Virtual Machine (EVM)** is a computation engine that executes smart contract code. Think of it as a specialized computer that:

- Lives inside the Ethereum blockchain
- Executes bytecode (low-level machine instructions)
- Is deterministic (same inputs always produce same outputs)
- Tracks resource usage through "gas"

### Why a Virtual Machine?

Real computers (x86, ARM) are too complex and non-deterministic for blockchain. The EVM provides:

1. **Determinism**: Every node must get the exact same result
2. **Isolation**: Contract code can't access the host system
3. **Metering**: Every operation costs "gas" to prevent infinite loops
4. **Portability**: Same bytecode runs on any node

### The EVM is a Stack Machine

Unlike typical computers with registers, the EVM uses a **stack** for all computation. Operations pop values from the stack, compute a result, and push it back.

```
Traditional CPU:        EVM:
MOV R1, 5              PUSH 5
MOV R2, 3              PUSH 3
ADD R1, R2             ADD
                       (result on stack)
```

---

## The Stack Machine Model

### What is a Stack?

A stack is a Last-In-First-Out (LIFO) data structure. Think of a stack of plates:

```
    [3]  ← Top (most recent)
    [5]
    [2]  ← Bottom (oldest)
```

Operations:
- **PUSH**: Add an item to the top
- **POP**: Remove and return the top item

### The EVM Stack

The EVM stack has specific rules:

```typescript
// Maximum 1024 items
const MAX_STACK_DEPTH = 1024

// Each item is a 256-bit unsigned integer
type StackItem = Word256  // 0 to 2^256 - 1
```

**Try it yourself:**

```typescript
import { Stack, Word256 } from '@evmix/core'

const stack = new Stack()

// Push some values
stack.push(Word256.fromNumber(5))
stack.push(Word256.fromNumber(3))

// Stack now: [5, 3] (3 on top)

// Pop the top value
const top = stack.pop()
console.log(top.value)  // 3n

// Stack now: [5]
```

### Why Stack-Based?

1. **Simplicity**: Easy to reason about and implement
2. **Security**: No memory addressing bugs
3. **Efficiency**: Minimal state to track
4. **Determinism**: Operations are unambiguous

---

## EVM Data Types

The EVM has exactly **one data type**: the 256-bit unsigned integer.

### Word256: The Universal Type

Everything in the EVM is a `Word256` (32 bytes):

```typescript
import { Word256 } from '@evmix/core'

// Create from different sources
const a = Word256.fromNumber(42)
const b = Word256.fromHex('0x2a')
const c = Word256.from(42n)  // BigInt

// All represent the same value
console.log(a.value === b.value === c.value)  // true
```

### Why 256 bits?

- **Cryptographic hashes**: SHA-256, Keccak-256 produce 256-bit outputs
- **Large numbers**: Can represent enormous values without overflow (in math sense)
- **Addresses**: Ethereum addresses are 160 bits, fit in one word
- **Efficient**: Modern CPUs can handle 256-bit operations

### Word256 Operations

All arithmetic is **modulo 2^256** (wraps around):

```typescript
const max = Word256.max()  // 2^256 - 1 (all bits set)
const one = Word256.one()

// Addition with overflow
const result = max.add(one)
console.log(result.value)  // 0n (wraps around!)

// This is the same as:
// (2^256 - 1) + 1 = 2^256 ≡ 0 (mod 2^256)
```

### Common Operations

```typescript
// Arithmetic
const sum = a.add(b)      // a + b (mod 2^256)
const diff = a.sub(b)     // a - b (mod 2^256)
const prod = a.mul(b)     // a * b (mod 2^256)
const quot = a.div(b)     // a / b (integer division)

// Comparison
a.eq(b)   // a == b
a.lt(b)   // a < b
a.gt(b)   // a > b

// Bitwise
a.and(b)  // a & b
a.or(b)   // a | b
a.not()   // ~a

// Conversion
a.toHex()          // "000...02a" (64 hex chars)
a.toHexWith0x()    // "0x000...02a"
a.toDecimalString() // "42"
```

---

## Machine State

The EVM maintains state during execution:

```typescript
interface MachineState {
  pc: number              // Program Counter (which instruction to execute)
  gasRemaining: bigint    // How much gas is left
  stack: Word256[]        // The computation stack
  memory: Uint8Array      // Expandable byte array
  returnData: Uint8Array  // Data returned from execution
  halted: boolean         // Has execution stopped?
  haltReason?: HaltReason // Why did it stop?
}
```

### Program Counter (PC)

The PC is like a bookmark - it points to the next instruction to execute:

```
Bytecode: [0x60, 0x05, 0x60, 0x03, 0x01, 0x00]
           ^
           PC = 0 (start here)
```

After each instruction, the PC advances:

```
PC = 0 → Execute 0x60 (PUSH1)
PC = 2 → Execute 0x60 (PUSH1)
PC = 4 → Execute 0x01 (ADD)
PC = 5 → Execute 0x00 (STOP)
```

### Gas

Every operation costs **gas** - a measure of computational work:

```typescript
const state = new MachineState(1000000n)  // Start with 1M gas

// Each operation charges gas
state.chargeGas(3n)   // PUSH costs 3 gas
state.chargeGas(3n)   // Another PUSH costs 3 gas
state.chargeGas(3n)   // ADD costs 3 gas

console.log(state.gasRemaining)  // 999991n
```

**What happens when gas runs out?**

```typescript
const state = new MachineState(5n)  // Only 5 gas

try {
  state.chargeGas(10n)  // Try to charge 10 gas
} catch (error) {
  console.log(error.message)     // "Out of gas"
  console.log(state.halted)      // true
  console.log(state.haltReason)  // "OUT_OF_GAS"
}
```

### Halt Reasons

Execution stops for various reasons:

```typescript
enum HaltReason {
  STOP              // STOP opcode (normal exit)
  RETURN            // RETURN opcode (success with data)
  REVERT            // REVERT opcode (failure with data)
  OUT_OF_GAS        // Ran out of gas
  INVALID_OPCODE    // Encountered unknown opcode
  STACK_UNDERFLOW   // Tried to pop from empty stack
  STACK_OVERFLOW    // Tried to push beyond 1024 items
  INVALID_JUMP      // Jumped to invalid destination
}
```

---

## Your First Program

Let's write and execute a simple EVM program: **5 + 3 = 8**

### Step 1: Writing Bytecode

EVM programs are sequences of bytes (opcodes and data):

```typescript
const bytecode = new Uint8Array([
  0x60, 0x05,  // PUSH1 5    (push 5 onto stack)
  0x60, 0x03,  // PUSH1 3    (push 3 onto stack)
  0x01,        // ADD        (pop 2, add, push result)
  0x00,        // STOP       (halt execution)
])
```

**What does each byte mean?**

- `0x60` = PUSH1 (push next 1 byte as a value)
- `0x05` = the value 5 (data, not an opcode)
- `0x01` = ADD (pop two values, push sum)
- `0x00` = STOP (halt)

### Step 2: Creating the Interpreter

```typescript
import { Interpreter } from '@evmix/core'

const interpreter = new Interpreter({
  bytecode,
  initialGas: 1000000n
})
```

### Step 3: Execution

**Option A: Step-by-step**

```typescript
// Execute one instruction at a time
interpreter.step()  // PUSH1 5
interpreter.step()  // PUSH1 3
interpreter.step()  // ADD
interpreter.step()  // STOP

console.log(interpreter.isHalted())  // true
```

**Option B: Run until halt**

```typescript
interpreter.run()  // Execute all instructions

console.log(interpreter.isHalted())  // true
```

### Step 4: Getting the Result

```typescript
// The result is on top of the stack
const result = interpreter.getStack().peek()
console.log(result.value)  // 8n

// How much gas did we use?
const state = interpreter.getState()
const gasUsed = 1000000n - state.gasRemaining
console.log(gasUsed)  // 9n (3 + 3 + 3 for each operation)
```

---

## Understanding Opcodes

Opcodes are the instructions the EVM understands. Each opcode:
1. Has a byte value (0x00 to 0xFF)
2. Has a name (STOP, ADD, PUSH1, etc.)
3. Has a gas cost
4. Has stack requirements (inputs/outputs)

### Currently Implemented Opcodes

#### STOP (0x00)

```
Name: STOP
Gas: 0
Stack: () → ()
Effect: Halts execution
```

**Example:**

```typescript
const bytecode = new Uint8Array([0x00])  // Just STOP

interpreter.run()
console.log(interpreter.getHaltReason())  // "STOP"
```

#### ADD (0x01)

```
Name: ADD
Gas: 3
Stack: (a, b) → (a + b)
Effect: Pops two values, pushes their sum (mod 2^256)
```

**Visual example:**

```
Before:           After:
Stack: [5, 3]     Stack: [8]
        ^top              ^top
```

**Code:**

```typescript
// PUSH 5, PUSH 3, ADD
const bytecode = new Uint8Array([
  0x60, 0x05,  // PUSH1 5
  0x60, 0x03,  // PUSH1 3
  0x01,        // ADD
])
```

#### MUL (0x02)

```
Name: MUL
Gas: 5
Stack: (a, b) → (a * b)
Effect: Pops two values, pushes their product (mod 2^256)
```

**Example:**

```typescript
// 6 * 7 = 42
const bytecode = new Uint8Array([
  0x60, 0x06,  // PUSH1 6
  0x60, 0x07,  // PUSH1 7
  0x02,        // MUL
])
```

#### SUB (0x03)

```
Name: SUB
Gas: 3
Stack: (a, b) → (a - b)
Effect: Pops two values, pushes their difference (mod 2^256)
```

**Underflow example:**

```typescript
// 3 - 5 = ? (in 256-bit arithmetic)
const bytecode = new Uint8Array([
  0x60, 0x03,  // PUSH1 3
  0x60, 0x05,  // PUSH1 5
  0x03,        // SUB
])

interpreter.run()
const result = interpreter.getStack().peek()
// result = 2^256 - 2 (wraps around!)
```

#### DIV (0x04)

```
Name: DIV
Gas: 5
Stack: (a, b) → (a / b)
Effect: Integer division. Division by zero returns 0.
```

**Division by zero:**

```typescript
// 10 / 0 = ?
const bytecode = new Uint8Array([
  0x60, 0x0a,  // PUSH1 10
  0x60, 0x00,  // PUSH1 0
  0x04,        // DIV
])

interpreter.run()
const result = interpreter.getStack().peek()
console.log(result.value)  // 0n (no error, just returns 0)
```

#### PUSH1-PUSH32 (0x60-0x7f)

```
Name: PUSH<n>
Gas: 3
Stack: () → (value)
Effect: Reads next n bytes and pushes as a value
```

**Examples:**

```typescript
// PUSH1: Push 1 byte
0x60, 0xFF        // PUSH1 255

// PUSH2: Push 2 bytes (big-endian)
0x61, 0x01, 0x00  // PUSH2 256

// PUSH32: Push 32 bytes
0x7f, [32 bytes]  // PUSH32 (full word)
```

**Why multiple PUSH variants?**

To efficiently push different sizes:
- Small values: PUSH1 (2 bytes total)
- Medium values: PUSH2-PUSH8
- Large values: PUSH32 (33 bytes total)

---

## Gas: The Cost of Computation

Gas prevents infinite loops and expensive operations on the blockchain.

### Gas Costs (Phase 1)

| Operation | Gas Cost | Why? |
|-----------|----------|------|
| STOP      | 0        | Trivial (just stop) |
| ADD       | 3        | Simple arithmetic |
| SUB       | 3        | Simple arithmetic |
| MUL       | 5        | More complex than add |
| DIV       | 5        | Division is harder |
| PUSH      | 3        | Memory access + stack push |

### Tracking Gas Usage

Every operation charges gas **before** executing:

```typescript
// Internal flow for ADD opcode:
function executeAdd(state, stack, trace) {
  // 1. Charge gas first
  state.chargeGas(3n)  // Throws if insufficient

  // 2. Pop operands
  const b = stack.pop()
  const a = stack.pop()

  // 3. Compute
  const result = a.add(b)

  // 4. Push result
  stack.push(result)

  // 5. Advance PC
  state.pc += 1
}
```

### Example: Calculating Total Gas

```typescript
// Program: (5 + 3) * 2 = 16
const bytecode = new Uint8Array([
  0x60, 0x05,  // PUSH1 5     (3 gas)
  0x60, 0x03,  // PUSH1 3     (3 gas)
  0x01,        // ADD         (3 gas)
  0x60, 0x02,  // PUSH1 2     (3 gas)
  0x02,        // MUL         (5 gas)
  0x00,        // STOP        (0 gas)
])
// Total: 3 + 3 + 3 + 3 + 5 = 17 gas

const interpreter = new Interpreter({
  bytecode,
  initialGas: 100n
})

interpreter.run()
const gasUsed = 100n - interpreter.getState().gasRemaining
console.log(gasUsed)  // 17n
```

### What If Gas Runs Out?

```typescript
const interpreter = new Interpreter({
  bytecode,
  initialGas: 10n  // Not enough!
})

interpreter.run()

console.log(interpreter.isHalted())       // true
console.log(interpreter.getHaltReason())  // "OUT_OF_GAS"
console.log(interpreter.getStack().depth())  // Might be partially executed
```

The EVM stops **immediately** when gas runs out, leaving the stack in whatever state it was in.

---

## Trace Events: Making Execution Observable

This is where EVMIX shines! Every meaningful action emits a **trace event**.

### What is a Trace Event?

A structured record of something that happened:

```typescript
interface OpcodeStartEvent {
  type: 'opcode.start'
  index: number          // Sequential event number
  pc: number            // Where in bytecode
  gasRemaining: bigint  // Gas at this moment
  opcode: number        // The opcode byte
  opcodeName: string    // Human-readable name
}
```

### Types of Events

1. **opcode.start**: An opcode is about to execute
2. **stack.push**: A value was pushed
3. **stack.pop**: A value was popped
4. **gas.charge**: Gas was charged
5. **memory.write**: Memory was written
6. **memory.read**: Memory was read
7. **storage.read**: Storage was read
8. **storage.write**: Storage was written
9. **jump**: A jump occurred
10. **halt**: Execution stopped

### Collecting Traces

```typescript
const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
interpreter.run()

// Get all trace events
const trace = interpreter.getTrace()
const events = trace.getEvents()

console.log(`Execution generated ${events.length} events`)

// Print each event
for (const event of events) {
  console.log(`[${event.index}] ${event.type} at PC=${event.pc}`)
}
```

### Example: Tracing 5 + 3

```typescript
const bytecode = new Uint8Array([
  0x60, 0x05,  // PUSH1 5
  0x60, 0x03,  // PUSH1 3
  0x01,        // ADD
  0x00,        // STOP
])

const interpreter = new Interpreter({ bytecode, initialGas: 1000n })
interpreter.run()

const events = interpreter.getTrace().getEvents()
```

**What events are generated?**

```
[0]  opcode.start    PC=0  opcode=0x60 (PUSH1)
[1]  gas.charge      amount=3  reason="PUSH1"
[2]  stack.push      value=0x05

[3]  opcode.start    PC=2  opcode=0x60 (PUSH1)
[4]  gas.charge      amount=3  reason="PUSH1"
[5]  stack.push      value=0x03

[6]  opcode.start    PC=4  opcode=0x01 (ADD)
[7]  gas.charge      amount=3  reason="ADD"
[8]  stack.pop       value=0x03
[9]  stack.pop       value=0x05
[10] stack.push      value=0x08

[11] opcode.start    PC=5  opcode=0x00 (STOP)
[12] halt            reason="STOP"
```

### Why Traces Matter

1. **Debugging**: See exactly what happened at each step
2. **Education**: Understand how the EVM works
3. **Visualization**: Build UIs that show execution
4. **Time Travel**: Replay execution to any point
5. **Testing**: Verify exact behavior

### Exporting Traces

```typescript
// Export to JSON
const json = trace.toJSON()
console.log(json)  // Pretty-printed JSON

// Save to file
import fs from 'fs'
fs.writeFileSync('execution-trace.json', json)

// Import later
const loadedTrace = TraceCollector.fromJSON(json)
```

### Filtering Events

```typescript
// Get only stack operations
const stackEvents = trace.getEventsByType('stack.push')

// Get only gas charges
const gasEvents = trace.getEventsByType('gas.charge')

// Count opcodes executed
const opcodeEvents = trace.getEventsByType('opcode.start')
console.log(`Executed ${opcodeEvents.length} opcodes`)
```

---

## Memory in the EVM

The EVM has expandable memory (though Phase 1 doesn't use it much yet).

### Memory Basics

```typescript
const state = new MachineState(1000000n)

// Memory starts empty
console.log(state.getMemorySize())  // 0

// Expand memory
const gasCost = state.expandMemory(0, 32)
console.log(state.getMemorySize())  // 32 (rounded to word)
console.log(gasCost)  // Gas cost for expansion
```

### Memory is Byte-Addressed

Unlike the stack (which holds 256-bit words), memory is byte-addressed:

```typescript
// Write 3 bytes at offset 10
state.writeMemory(10, new Uint8Array([0x01, 0x02, 0x03]))

// Read them back
const data = state.readMemory(10, 3)
console.log(Array.from(data))  // [1, 2, 3]
```

### Memory Expansion Costs

Memory expansion is **quadratic** to prevent abuse:

```
Gas = 3 * words + (words^2 / 512)

where words = ceil(size / 32)
```

**Example:**

```typescript
const state = new MachineState(1000000n)

// Expand to 32 bytes
const cost1 = state.expandMemory(0, 32)
console.log(cost1)  // 3 gas

// Expand to 64 bytes
const cost2 = state.expandMemory(32, 32)
console.log(cost2)  // Additional gas (quadratic)

// Accessing existing memory is free
const cost3 = state.expandMemory(10, 20)
console.log(cost3)  // 0 gas (already allocated)
```

---

## Putting It All Together

Let's write a more complex program and trace its execution.

### Program: Calculate (10 + 5) * 2 - (20 / 4)

Expected result: (15 * 2) - 5 = 25

### Step 1: Write the Bytecode

```typescript
const bytecode = new Uint8Array([
  // Part 1: 10 + 5 = 15
  0x60, 0x0a,  // PUSH1 10
  0x60, 0x05,  // PUSH1 5
  0x01,        // ADD → 15

  // Part 2: 15 * 2 = 30
  0x60, 0x02,  // PUSH1 2
  0x02,        // MUL → 30

  // Part 3: 20 / 4 = 5
  0x60, 0x14,  // PUSH1 20
  0x60, 0x04,  // PUSH1 4
  0x04,        // DIV → 5

  // Part 4: 30 - 5 = 25
  0x03,        // SUB → 25

  0x00,        // STOP
])
```

### Step 2: Execute

```typescript
import { Interpreter } from '@evmix/core'

const interpreter = new Interpreter({
  bytecode,
  initialGas: 1000000n
})

console.log('Starting execution...\n')

// Execute step by step to see what happens
while (interpreter.step()) {
  const state = interpreter.getState()
  const stack = interpreter.getStack()

  console.log(`PC: ${state.pc}, Gas: ${state.gasRemaining}`)
  console.log(`Stack (top to bottom): ${
    stack.toArrayReversed().map(w => w.value.toString())
  }`)
  console.log()
}

console.log('Execution halted!')
console.log(`Reason: ${interpreter.getHaltReason()}`)
console.log(`Result: ${interpreter.getStack().peek().value}`)
```

### Step 3: Analyze the Trace

```typescript
const trace = interpreter.getTrace()
const events = trace.getEvents()

console.log(`\nExecution Statistics:`)
console.log(`- Total events: ${events.length}`)
console.log(`- Opcodes executed: ${trace.getEventsByType('opcode.start').length}`)
console.log(`- Stack operations: ${
  trace.getEventsByType('stack.push').length +
  trace.getEventsByType('stack.pop').length
}`)

// Calculate gas used
const gasEvents = trace.getEventsByType('gas.charge')
const totalGas = gasEvents.reduce((sum, e) => sum + BigInt(e.amount), 0n)
console.log(`- Total gas used: ${totalGas}`)

// Export trace
const json = trace.toJSON()
console.log(`\nTrace exported to JSON (${json.length} bytes)`)
```

### Expected Output

```
Starting execution...

PC: 2, Gas: 999997
Stack (top to bottom): 10

PC: 4, Gas: 999994
Stack (top to bottom): 5, 10

PC: 5, Gas: 999991
Stack (top to bottom): 15

PC: 7, Gas: 999988
Stack (top to bottom): 2, 15

PC: 8, Gas: 999983
Stack (top to bottom): 30

PC: 10, Gas: 999980
Stack (top to bottom): 20, 30

PC: 12, Gas: 999977
Stack (top to bottom): 4, 20, 30

PC: 13, Gas: 999972
Stack (top to bottom): 5, 30

PC: 14, Gas: 999969
Stack (top to bottom): 25

Execution halted!
Reason: STOP
Result: 25

Execution Statistics:
- Total events: 51
- Opcodes executed: 9
- Stack operations: 18
- Total gas used: 31
```

---

## Advanced Topics

### Stack Manipulation: DUP and SWAP

(These are implemented but need opcodes to be exposed. Future phases will use them.)

**DUP**: Duplicate stack items

```typescript
// DUP1 duplicates the top item
stack: [5, 3]
DUP1
stack: [3, 5, 3]
```

**SWAP**: Swap stack items

```typescript
// SWAP1 swaps top two items
stack: [3, 5]
SWAP1
stack: [5, 3]
```

### Understanding Overflow and Underflow

**Arithmetic Overflow:**

```typescript
const max = Word256.max()  // 2^256 - 1
const one = Word256.one()
const result = max.add(one)
// result = 0 (wraps around)
```

**Stack Overflow:**

```typescript
const stack = new Stack()
for (let i = 0; i < 1024; i++) {
  stack.push(Word256.fromNumber(i))  // OK
}
// 1025th push throws StackError: "Stack overflow"
```

**Stack Underflow:**

```typescript
const stack = new Stack()
stack.pop()  // Throws StackError: "Stack underflow"
```

### Deterministic Execution

The same bytecode + initial state always produces the same result:

```typescript
// Run 1
const interpreter1 = new Interpreter({ bytecode, initialGas: 1000000n })
interpreter1.run()
const trace1 = interpreter1.getTrace().toJSON()

// Run 2
const interpreter2 = new Interpreter({ bytecode, initialGas: 1000000n })
interpreter2.run()
const trace2 = interpreter2.getTrace().toJSON()

// Traces are identical!
console.log(trace1 === trace2)  // true
```

This is crucial for blockchain consensus!

---

## Exercises

Try these to deepen your understanding:

### Exercise 1: Fibonacci

Calculate the 5th Fibonacci number (5) using the EVM.

```
F(0) = 0
F(1) = 1
F(2) = 1
F(3) = 2
F(4) = 3
F(5) = 5
```

Hint: You'll need to simulate a loop manually by repeating operations.

### Exercise 2: Average

Calculate the average of three numbers: (10 + 20 + 30) / 3 = 20

### Exercise 3: Quadratic

Calculate `2x^2 + 3x + 5` where x = 4.
Expected: 2(16) + 3(4) + 5 = 49

### Exercise 4: Gas Optimization

Write bytecode for `(a + b) * c` in two ways:
1. Push all values first, then operate
2. Push and operate incrementally

Which uses less gas? Why?

### Exercise 5: Trace Analysis

Write a program that uses all 5 opcodes (ADD, MUL, SUB, DIV, STOP).
Export the trace and count each event type.

---

## What's Next?

Phase 1 gives you the foundation. In future phases you'll learn:

**Phase 2 (Control Flow):**
- Conditional execution (JUMPI)
- Loops via jumps
- Comparison operations (LT, GT, EQ)

**Phase 3 (Memory & Data):**
- Loading from memory (MLOAD)
- Storing to memory (MSTORE)
- Working with calldata
- Returning values

**Phase 4 (World Interaction):**
- Reading/writing storage
- Calling other contracts
- Emitting events (logs)

**Phase 5 (Debugging):**
- Breakpoints
- Time travel
- State inspection
- Replay from traces

**Phase 6 (Web Lab):**
- Visual stack viewer
- Memory inspector
- Timeline scrubber
- Interactive debugging

---

## Summary

You now understand:

✅ **The EVM is a stack machine** - All operations use a stack, not registers

✅ **Everything is 256-bit** - One data type: Word256 (32 bytes)

✅ **Gas meters computation** - Every operation costs gas to prevent abuse

✅ **Traces make execution observable** - Every action emits structured events

✅ **Execution is deterministic** - Same input always produces same output

✅ **Opcodes are simple** - Each does one specific thing (push, add, etc.)

✅ **The interpreter is straightforward** - Fetch, decode, execute, advance PC

### The Core Loop

```
while (!halted) {
  1. Fetch opcode at PC
  2. Charge gas
  3. Pop inputs from stack
  4. Execute operation
  5. Push result to stack
  6. Emit trace events
  7. Advance PC
  8. Check for halt
}
```

### Key Insight

The EVM isn't magic - it's a simple, elegant machine that processes bytecode one instruction at a time. EVMIX makes this visible through trace events, turning execution from a black box into an observable, understandable process.

**Now you're ready to read smart contract bytecode and understand exactly what it does!**

---

## Resources

- **EVMIX Source**: Browse `packages/evmix-core/src/` for implementation details
- **Tests**: See `packages/evmix-core/tests/` for more examples
- **Yellow Paper**: Ethereum's formal specification (advanced reading)
- **EVM Opcodes**: https://www.evm.codes/ (comprehensive reference)

---

**Questions? Ideas?** This is an educational project - experiment, break things, and learn!

The best way to understand the EVM is to **write programs and watch them execute.**

Happy hacking! 🚀
