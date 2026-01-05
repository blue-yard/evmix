# EVMIX Phase 2 Walkthrough: Control Flow

**Mastering jumps, loops, and conditional execution in the EVM**

Building on Phase 1, this walkthrough explores how the EVM handles control flow - the foundation of any real program logic.

---

## Table of Contents

1. [Why Control Flow Matters](#why-control-flow-matters)
2. [The Program Counter (PC)](#the-program-counter-pc)
3. [Jump Destinations (JUMPDEST)](#jump-destinations-jumpdest)
4. [Unconditional Jumps (JUMP)](#unconditional-jumps-jump)
5. [Conditional Jumps (JUMPI)](#conditional-jumps-jumpi)
6. [If-Else Patterns](#if-else-patterns)
7. [Loops](#loops)
8. [Jump Validation](#jump-validation)
9. [Stack Manipulation](#stack-manipulation)
10. [Putting It All Together](#putting-it-all-together)

---

## Why Control Flow Matters

Phase 1 gave us linear programs:

```
PUSH 5
PUSH 3
ADD
STOP
```

But real programs need:
- **Decisions**: "If balance > 100, then transfer"
- **Loops**: "While counter > 0, do something"
- **Functions**: "Jump to code at address X"

Phase 2 adds these capabilities through **jumps**.

---

## The Program Counter (PC)

### What is the PC?

The **Program Counter** tracks which instruction will execute next:

```
Bytecode: [0x60, 0x05, 0x60, 0x03, 0x01, 0x00]
          Position: 0     2     4     5
                    ^
                    PC = 0
```

### PC Opcode (0x58)

The `PC` opcode pushes the current program counter onto the stack:

```
Name: PC
Gas: 2
Stack: () → (pc)
Effect: Pushes current PC value
```

**Example:**

```typescript
const bytecode = new Uint8Array([
  0x58,        // PC (pushes 0)
  0x58,        // PC (pushes 1)
  0x01,        // ADD (0 + 1 = 1)
  0x00,        // STOP
])

interpreter.run()
console.log(interpreter.getStack().peek().value)  // 1n
```

**Why is this useful?**

1. **Position-independent code**: Know where you are in bytecode
2. **Relative addressing**: Calculate jump targets dynamically
3. **Debugging**: Understand execution flow

---

## Jump Destinations (JUMPDEST)

### What is JUMPDEST?

`JUMPDEST` marks a **valid jump target**. You can only jump to JUMPDEST instructions.

```
Name: JUMPDEST
Gas: 1
Stack: () → ()
Effect: No-op during execution, marks valid jump destination
```

**Example:**

```typescript
const bytecode = new Uint8Array([
  0x60, 0x05,  // PUSH1 5
  0x5b,        // JUMPDEST (position 2)
  0x60, 0x03,  // PUSH1 3
  0x01,        // ADD
  0x00,        // STOP
])

// JUMPDEST at position 2 does nothing during normal execution
// But it marks position 2 as a valid jump target
```

### Why JUMPDEST?

**Security!** Without JUMPDEST, you could jump into the middle of an instruction:

```
BAD:
PUSH2 0x1234   →  [0x61, 0x12, 0x34]
                           ^
                    If you jump here, you'd execute 0x12 as an opcode!
```

JUMPDEST prevents this by requiring explicit markers.

### Jump Destination Validation

At startup, the interpreter scans bytecode and builds a set of valid destinations:

```typescript
function buildJumpDestinations(bytecode: Uint8Array): Set<number> {
  const validDests = new Set<number>()

  let i = 0
  while (i < bytecode.length) {
    const opcode = bytecode[i]

    // Mark JUMPDEST positions
    if (opcode === 0x5b) {
      validDests.add(i)
    }

    // Skip PUSH data bytes (they're not opcodes!)
    if (opcode >= 0x60 && opcode <= 0x7f) {
      const numBytes = opcode - 0x5f
      i += 1 + numBytes
      continue
    }

    i++
  }

  return validDests
}
```

**Key insight**: JUMPDEST bytes inside PUSH data don't count!

```typescript
const bytecode = new Uint8Array([
  0x7f,  // PUSH32 (next 32 bytes are data)
  ...Array(10).fill(0x00),
  0x5b,  // This 0x5b is DATA, not a JUMPDEST!
  ...Array(21).fill(0x00),
  0x5b,  // This 0x5b IS a JUMPDEST (position 34)
  0x00,  // STOP
])

// Only position 34 is a valid jump destination
```

---

## Unconditional Jumps (JUMP)

### How JUMP Works

`JUMP` pops a destination from the stack and jumps to it:

```
Name: JUMP
Gas: 8
Stack: (dest) → ()
Effect: Jump to dest (must be JUMPDEST)
```

**Execution flow:**

```
1. Pop destination from stack
2. Validate: Is destination a JUMPDEST?
3. If yes: Set PC = destination
4. If no: HALT with INVALID_JUMP
```

### Your First Jump

```typescript
const bytecode = new Uint8Array([
  0x60, 0x06,  // PUSH1 6 (jump target) (at 0-1)
  0x56,        // JUMP (at 2)
  0x60, 0x99,  // PUSH1 153 (at 3-4) - SKIPPED!
  0x00,        // STOP (at 5) - SKIPPED!
  0x5b,        // JUMPDEST (at 6) - TARGET
  0x60, 0x42,  // PUSH1 66 (at 7-8)
  0x00,        // STOP (at 9)
])

interpreter.run()

// Stack contains only 66 (the 153 was never pushed)
console.log(interpreter.getStack().peek().value)  // 66n
```

**What happened:**

```
PC=0: PUSH1 6      → Stack: [6]
PC=2: JUMP         → Stack: []  (jumped to 6)
PC=6: JUMPDEST     → Stack: []
PC=7: PUSH1 66     → Stack: [66]
PC=9: STOP         → Halted
```

### Jump Anywhere (That's Valid)

```typescript
const bytecode = new Uint8Array([
  // Jump table setup
  0x60, 0x08,  // PUSH1 8 (function A address)
  0x60, 0x0c,  // PUSH1 12 (function B address)

  // Choose which function (0 = A, 1 = B)
  0x60, 0x01,  // PUSH1 1 (choose B)
  0x57,        // JUMPI (conditional jump)

  // Fall through to function A
  0x5b,        // JUMPDEST (position 8) - Function A
  0x60, 0x41,  // PUSH1 'A'
  0x56,        // JUMP (exit - would need exit point)

  0x5b,        // JUMPDEST (position 12) - Function B
  0x60, 0x42,  // PUSH1 'B'
  0x00,        // STOP
])
```

---

## Conditional Jumps (JUMPI)

### How JUMPI Works

`JUMPI` jumps **only if a condition is non-zero**:

```
Name: JUMPI
Gas: 10
Stack: (dest, condition) → ()
Effect: If condition != 0, jump to dest
```

**Execution flow:**

```
1. Pop condition from stack
2. Pop destination from stack
3. If condition != 0:
   - Validate destination
   - Set PC = destination
4. If condition == 0:
   - Continue to next instruction (PC += 1)
```

### Conditional Execution

```typescript
// Program: If 5 > 3 then push 100 else push 200
const bytecode = new Uint8Array([
  // Check: is 5 > 3?
  0x60, 0x05,  // PUSH1 5
  0x60, 0x03,  // PUSH1 3
  0x11,        // GT (greater than) - pushes 1 if true

  // If true, skip to "then" branch
  0x60, 0x0c,  // PUSH1 12 (then branch)
  0x57,        // JUMPI

  // Else branch (condition was false)
  0x60, 0xc8,  // PUSH1 200
  0x60, 0x0f,  // PUSH1 15 (exit)
  0x56,        // JUMP

  // Then branch (at position 12)
  0x5b,        // JUMPDEST
  0x60, 0x64,  // PUSH1 100

  // Exit (at position 15)
  0x5b,        // JUMPDEST
  0x00,        // STOP
])
```

### Truth Values

**Any non-zero value is "truthy":**

```typescript
0x00 = false (JUMPI doesn't jump)
0x01 = true  (JUMPI jumps)
0xFF = true  (JUMPI jumps)
0x123456789... = true (JUMPI jumps)
```

---

## If-Else Patterns

### Pattern 1: Simple If

```
if (condition) {
  do_something()
}
continue...
```

**Bytecode:**

```
PUSH condition
PUSH continue_label
JUMPI              // Jump to continue if condition is false
do_something()
JUMPDEST           // continue_label
...
```

### Pattern 2: If-Else

```
if (condition) {
  do_A()
} else {
  do_B()
}
```

**Bytecode:**

```
PUSH condition
PUSH else_label
SWAP1              // Swap so stack is [else_label, condition]
ISZERO             // Invert condition
JUMPI              // Jump to else if condition was false
do_A()
PUSH end_label
JUMP

JUMPDEST           // else_label
do_B()

JUMPDEST           // end_label
```

### Pattern 3: Early Exit

```
require(condition, "error")
continue...
```

**Bytecode:**

```
PUSH condition
PUSH continue_label
JUMPI              // Jump to continue if OK
REVERT             // Halt with error

JUMPDEST           // continue_label
...
```

---

## Loops

### Pattern 1: Countdown Loop

```
counter = 5
while (counter > 0) {
  counter = counter - 1
}
```

**Bytecode:**

```typescript
const bytecode = new Uint8Array([
  // Initialize counter
  0x60, 0x05,  // PUSH1 5 (at 0-1)

  // Loop start (at 2)
  0x5b,        // JUMPDEST

  // Decrement
  0x60, 0x01,  // PUSH1 1 (at 3-4)
  0x03,        // SUB (at 5)

  // Check if counter != 0
  0x80,        // DUP1 (duplicate counter) (at 6)
  0x60, 0x02,  // PUSH1 2 (loop start) (at 7-8)
  0x90,        // SWAP1 (at 9)
  0x57,        // JUMPI (at 10) - jump if counter != 0

  // Exit (counter reached 0)
  0x00,        // STOP (at 11)
])

interpreter.run()
console.log(interpreter.getStack().peek().value)  // 0n
```

**Trace through execution:**

```
Iteration 1: counter=5 → 5-1=4 → jump back (4 != 0)
Iteration 2: counter=4 → 4-1=3 → jump back (3 != 0)
Iteration 3: counter=3 → 3-1=2 → jump back (2 != 0)
Iteration 4: counter=2 → 2-1=1 → jump back (1 != 0)
Iteration 5: counter=1 → 1-1=0 → don't jump (0 == 0)
STOP
```

### Pattern 2: For Loop

```
for (i = 0; i < 10; i++) {
  // do something
}
```

**Bytecode structure:**

```
PUSH 0               // Initialize i
JUMPDEST             // loop_start
DUP1                 // Copy i
PUSH 10
LT                   // i < 10?
PUSH loop_body
JUMPI
PUSH loop_end
JUMP

JUMPDEST             // loop_body
// do something with i

// Increment i
PUSH 1
ADD

PUSH loop_start
JUMP

JUMPDEST             // loop_end
```

### Pattern 3: While Loop

```
while (condition) {
  do_something()
}
```

**Bytecode:**

```
JUMPDEST             // loop_start
compute_condition()
PUSH loop_end
SWAP1
ISZERO
JUMPI                // Exit if condition is false

do_something()

PUSH loop_start
JUMP

JUMPDEST             // loop_end
```

---

## Jump Validation

### Valid Jump

```typescript
const bytecode = new Uint8Array([
  0x60, 0x04,  // PUSH1 4 (valid JUMPDEST)
  0x56,        // JUMP
  0x00,        // STOP
  0x5b,        // JUMPDEST (position 4)
  0x00,        // STOP
])

interpreter.run()
// ✓ Success - jumped to JUMPDEST at position 4
```

### Invalid Jump: No JUMPDEST

```typescript
const bytecode = new Uint8Array([
  0x60, 0x04,  // PUSH1 4
  0x56,        // JUMP
  0x00,        // STOP
  0x60, 0x42,  // PUSH1 66 (position 4) - NOT a JUMPDEST!
  0x00,        // STOP
])

interpreter.run()
console.log(interpreter.getHaltReason())  // "INVALID_JUMP"
```

### Invalid Jump: Into PUSH Data

```typescript
const bytecode = new Uint8Array([
  0x60, 0x06,  // PUSH1 6
  0x56,        // JUMP
  0x7f,        // PUSH32 (position 3)
  ...Array(3).fill(0x00),
  0x5b,        // This 0x5b is at position 6, but it's INSIDE PUSH32 data!
  ...Array(28).fill(0x00),
  0x00,        // STOP
])

interpreter.run()
console.log(interpreter.getHaltReason())  // "INVALID_JUMP"
// The 0x5b byte is data, not a JUMPDEST opcode
```

### Invalid Jump: Out of Bounds

```typescript
const bytecode = new Uint8Array([
  0x60, 0xff,  // PUSH1 255 (way beyond bytecode length)
  0x56,        // JUMP
])

interpreter.run()
console.log(interpreter.getHaltReason())  // "INVALID_JUMP"
```

---

## Stack Manipulation

Loops and conditionals need to manage the stack carefully. Phase 2 adds three crucial opcodes:

### POP (0x50)

Remove the top item:

```
Name: POP
Gas: 2
Stack: (value) → ()
Effect: Discards top of stack
```

**Example:**

```typescript
const bytecode = new Uint8Array([
  0x60, 0x05,  // PUSH1 5
  0x60, 0x03,  // PUSH1 3
  0x50,        // POP (remove 3)
  0x00,        // STOP
])

// Stack ends with just [5]
```

### DUP1-DUP16 (0x80-0x8f)

Duplicate the Nth stack item:

```
Name: DUP<n>
Gas: 3
Stack: (..., nth, ..., 2nd, 1st) → (..., nth, ..., 2nd, 1st, nth)
Effect: Duplicates the nth item to top
```

**Examples:**

```
Stack: [5, 3, 8]

DUP1:  [5, 3, 8, 8]   (duplicate top)
DUP2:  [5, 3, 8, 3]   (duplicate 2nd)
DUP3:  [5, 3, 8, 5]   (duplicate 3rd)
```

**Use case - checking without consuming:**

```typescript
// Check if value > 10 without removing it
const bytecode = new Uint8Array([
  0x60, 0x0f,  // PUSH1 15
  0x80,        // DUP1 (duplicate 15)
  0x60, 0x0a,  // PUSH1 10
  0x11,        // GT (15 > 10 = 1)
  // Stack now: [15, 1]
  // Original 15 is still on stack!
])
```

### SWAP1-SWAP16 (0x90-0x9f)

Swap the top item with the Nth:

```
Name: SWAP<n>
Gas: 3
Stack: (... nth ... 2nd, 1st) → (... 1st ... 2nd, nth)
Effect: Swaps top with nth item
```

**Examples:**

```
Stack: [5, 3, 8]

SWAP1: [5, 8, 3]   (swap top two)
SWAP2: [8, 3, 5]   (swap 1st and 3rd)
```

**Use case - reordering for operations:**

```typescript
// Want to compute: bottom - top (5 - 3 = 2)
// But SUB does: (top of stack) - (second)
const bytecode = new Uint8Array([
  0x60, 0x05,  // PUSH1 5
  0x60, 0x03,  // PUSH1 3
  0x90,        // SWAP1 → Stack: [3, 5]
  0x03,        // SUB → 3 - 5 = -2 (wraps)

  // Actually, this still doesn't work right.
  // SUB pops b first, then a, and computes a - b
  // So without swap: stack=[5,3], pops 3, pops 5, computes 5-3=2
  // With swap: stack=[3,5], pops 5, pops 3, computes 3-5=wrap
])
```

---

## Putting It All Together

### Example 1: Factorial (Iterative)

Calculate 4! = 4 × 3 × 2 × 1 = 24

```typescript
const bytecode = new Uint8Array([
  // Initialize: counter=4, result=1
  0x60, 0x04,  // PUSH1 4 (counter)
  0x60, 0x01,  // PUSH1 1 (result)

  // Loop (at position 4)
  0x5b,        // JUMPDEST

  // result = result * counter
  0x81,        // DUP2 (copy counter)
  0x02,        // MUL

  // counter = counter - 1
  0x90,        // SWAP1
  0x60, 0x01,  // PUSH1 1
  0x03,        // SUB

  // Continue if counter > 0
  0x80,        // DUP1 (copy counter)
  0x60, 0x04,  // PUSH1 4 (loop start)
  0x90,        // SWAP1
  0x57,        // JUMPI

  // Clean up and exit
  0x50,        // POP (remove counter=0)
  0x00,        // STOP
])

interpreter.run()
console.log(interpreter.getStack().peek().value)  // 24n
```

### Example 2: Max of Two Numbers

```typescript
// Find max(7, 12)
const bytecode = new Uint8Array([
  0x60, 0x07,  // PUSH1 7  (a)
  0x60, 0x0c,  // PUSH1 12 (b)

  // Compare: is a > b?
  0x81,        // DUP2 (copy a)
  0x81,        // DUP2 (copy b)
  0x11,        // GT (a > b?)

  // If a > b, jump to return_a
  0x60, 0x0e,  // PUSH1 14 (return_a label)
  0x57,        // JUMPI

  // Else: b is max, clean up a
  0x90,        // SWAP1
  0x50,        // POP (remove a)
  0x60, 0x12,  // PUSH1 18 (end)
  0x56,        // JUMP

  // return_a (at 14)
  0x5b,        // JUMPDEST
  0x50,        // POP (remove b)

  // end (at 18)
  0x5b,        // JUMPDEST
  0x00,        // STOP
])

interpreter.run()
console.log(interpreter.getStack().peek().value)  // 12n
```

### Example 3: Trace a Jump

```typescript
const bytecode = new Uint8Array([
  0x60, 0x04,  // PUSH1 4
  0x56,        // JUMP
  0x00,        // STOP (skipped)
  0x5b,        // JUMPDEST (position 4)
  0x60, 0x2a,  // PUSH1 42
  0x00,        // STOP
])

const interpreter = new Interpreter({ bytecode, initialGas: 1000000n })
interpreter.run()

const trace = interpreter.getTrace()
const jumpEvents = trace.getEventsByType('jump')

console.log(jumpEvents[0])
// {
//   type: 'jump',
//   index: <n>,
//   pc: 2,
//   gasRemaining: <...>,
//   from: 2,
//   to: 4,
//   conditional: false,
//   taken: true
// }
```

---

## Common Patterns

### Pattern: Break from Loop

```
while (true) {
  if (condition) break
  do_something()
}
```

**Bytecode:**

```
JUMPDEST             // loop_start
check_condition()
PUSH loop_end
JUMPI                // Jump out if condition met

do_something()

PUSH loop_start
JUMP

JUMPDEST             // loop_end
```

### Pattern: Switch Statement

```
switch (value) {
  case 1: do_A()
  case 2: do_B()
  default: do_C()
}
```

**Bytecode:**

```
PUSH value
DUP1
PUSH 1
EQ
PUSH case_1
JUMPI

DUP1
PUSH 2
EQ
PUSH case_2
JUMPI

PUSH default
JUMP

JUMPDEST             // case_1
do_A()
PUSH end
JUMP

JUMPDEST             // case_2
do_B()
PUSH end
JUMP

JUMPDEST             // default
do_C()

JUMPDEST             // end
```

---

## Summary

You now understand:

✅ **JUMP** - Unconditional jump to a JUMPDEST

✅ **JUMPI** - Conditional jump based on stack value

✅ **JUMPDEST** - Marks valid jump targets

✅ **PC** - Get current program counter

✅ **Jump validation** - Only JUMPDEST bytes that are opcodes (not data) are valid

✅ **Stack manipulation** - DUP, SWAP, POP for managing the stack

✅ **Control flow patterns** - If-else, loops, early exits

✅ **Trace events** - Jump events show control flow

### The Control Flow Model

```
1. All control flow uses jumps
2. Jumps can only target JUMPDEST
3. JUMPI lets you make decisions
4. Loops are implemented with backward jumps
5. The stack holds jump destinations and conditions
```

---

## Exercises

### Exercise 1: Countdown

Write bytecode that counts from 10 down to 0.

### Exercise 2: Even/Odd

Given a number, push 1 if it's even, 0 if it's odd.
(Hint: Use MOD 2)

### Exercise 3: Range Check

Given a number, check if it's between 10 and 20 (inclusive).

### Exercise 4: Sum of Range

Sum all numbers from 1 to N (where N is on the stack).

### Exercise 5: Infinite Loop Detection

Write bytecode with an infinite loop. How many iterations before OUT_OF_GAS?

---

## What's Next?

**Phase 3 (Memory & Data):**
- MLOAD, MSTORE for memory operations
- CALLDATALOAD for reading input
- RETURN for returning data
- Memory expansion costs

**Phase 4 (World Interaction):**
- SLOAD, SSTORE for persistent storage
- CALL for calling other contracts
- LOG for emitting events

**Phase 5 (Debugging):**
- Breakpoints on specific PCs
- Breakpoints on JUMPs
- Time travel through traces
- State snapshots

---

## Key Insights

1. **The EVM has no "if" or "while"** - Everything is jumps

2. **Jumps are validated at runtime** - Invalid jumps halt execution

3. **JUMPDEST is free** - No gas cost during execution, just marks a spot

4. **The stack is your working memory** - DUP and SWAP are essential

5. **Control flow is explicit** - No hidden jumps, everything is visible in bytecode

---

**You can now write programs with loops and conditionals! The EVM is Turing-complete with these tools.**

Next: Learn how to work with memory and external data in Phase 3.

Happy jumping! 🚀
