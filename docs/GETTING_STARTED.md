# Getting Started with EVMIX

Welcome to EVMIX! This guide will help you get up and running quickly.

## Prerequisites

- **Node.js**: v18 or higher
- **pnpm**: v8 or higher (install with `npm install -g pnpm`)
- **Basic understanding of**: TypeScript, blockchain concepts (helpful but not required)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd evmix

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Verify Installation

```bash
# Run tests (should see 118 passing)
pnpm test

# Run example program
pnpm --filter @evmix/core example
```

If you see all tests passing and the example output, you're ready to go! 🎉

## Learning Path

Follow this path to master EVMIX and understand the EVM:

### 1. Run the Examples (5 minutes)

```bash
cd packages/evmix-core
pnpm example
```

This will show you 7 different EVM programs executing, demonstrating:
- Simple arithmetic
- Complex expressions
- Step-by-step execution
- Overflow behavior
- Division by zero handling
- Trace analysis
- Out of gas scenarios

### 2. Read the Walkthrough (30-60 minutes)

Open **[docs/WALKTHROUGH_PHASE1.md](./WALKTHROUGH_PHASE1.md)** and read through it carefully. This comprehensive guide teaches you:

- What the EVM is and why it works the way it does
- How stack machines work
- Understanding Word256 (256-bit integers)
- Machine state and execution
- Writing and executing bytecode
- Understanding opcodes
- Gas metering
- Trace events for observability
- Memory in the EVM

**Pro tip**: Keep a terminal open and try the code examples as you read!

### 3. Write Your First Program (10-15 minutes)

Create a new file `my-program.ts`:

```typescript
import { Interpreter } from '@evmix/core'

// Calculate: (a + b) * c where a=5, b=3, c=2
// Expected: (5 + 3) * 2 = 16

const bytecode = new Uint8Array([
  0x60, 0x05,  // PUSH1 5
  0x60, 0x03,  // PUSH1 3
  0x01,        // ADD
  0x60, 0x02,  // PUSH1 2
  0x02,        // MUL
  0x00,        // STOP
])

const interpreter = new Interpreter({
  bytecode,
  initialGas: 1000000n
})

interpreter.run()

const result = interpreter.getStack().peek()
console.log(`Result: ${result.value}`)  // Should be 16

// Bonus: Check the trace
const trace = interpreter.getTrace()
console.log(`\nExecution generated ${trace.getEventCount()} events`)
console.log(`Gas used: ${1000000n - interpreter.getState().gasRemaining}`)
```

Run it:

```bash
npx tsx my-program.ts
```

### 4. Explore the Source Code (Variable time)

Once you understand the basics, dive into the implementation:

```
packages/evmix-core/src/
├── types/
│   ├── Word256.ts      ← Start here: 256-bit integers
│   └── Address.ts      ← Ethereum addresses
├── state/
│   ├── Stack.ts        ← The EVM stack
│   ├── MachineState.ts ← Execution state
│   └── HaltReason.ts   ← Why execution stops
├── trace/
│   ├── TraceEvent.ts      ← Event definitions
│   └── TraceCollector.ts  ← Event collection
├── opcodes/
│   ├── Opcode.ts          ← Opcode definitions
│   ├── arithmetic.ts      ← ADD, MUL, SUB, DIV
│   └── system.ts          ← STOP
└── interpreter/
    └── Interpreter.ts  ← Main execution loop
```

**Reading tips:**
- Each file has extensive inline documentation
- Start with the smaller files (Word256, Stack)
- Read the tests to see how things are used
- The Interpreter is the most complex - save it for last

### 5. Try the Exercises (Optional)

From the walkthrough, try these challenges:

**Easy:**
- Calculate the average of three numbers
- Implement a simple quadratic formula
- Create a program that uses all 5 arithmetic opcodes

**Medium:**
- Calculate a Fibonacci number (simulating loops manually)
- Write a program that demonstrates both overflow and underflow
- Create a program that intentionally runs out of gas

**Advanced:**
- Optimize a calculation for minimum gas usage
- Write a trace analyzer that produces execution statistics
- Create a bytecode disassembler

## Common Tasks

### Running Tests

```bash
# All tests
pnpm test

# Just evmix-core
cd packages/evmix-core && pnpm test

# Watch mode (auto-rerun on changes)
cd packages/evmix-core && pnpm test:watch

# With coverage
pnpm test:coverage
```

### Building

```bash
# Build all packages
pnpm build

# Watch mode for development
cd packages/evmix-core && pnpm dev
```

### Code Quality

```bash
# Lint all code
pnpm lint

# Format all code
pnpm format

# Type check without emitting
pnpm typecheck
```

## Understanding the Output

When you run a program, you'll see:

```
Result: 42
Gas used: 17
Trace events: 23
```

- **Result**: The value left on top of the stack when execution halted
- **Gas used**: How much computational "fuel" was consumed
- **Trace events**: Number of observable events emitted during execution

### Reading Traces

Traces show you everything that happened:

```typescript
const trace = interpreter.getTrace()
const events = trace.getEvents()

for (const event of events) {
  console.log(`[${event.index}] ${event.type}`)
  if (event.type === 'opcode.start') {
    console.log(`  Opcode: ${event.opcodeName}`)
  }
}
```

## Troubleshooting

### "Out of gas" Error

Your program needs more gas:

```typescript
// Increase initial gas
const interpreter = new Interpreter({
  bytecode,
  initialGas: 10000000n  // More gas
})
```

### "Stack underflow" Error

You tried to pop from an empty stack. Check your bytecode - you need to PUSH values before using them:

```typescript
// Wrong - ADD needs two values
const wrong = new Uint8Array([0x01])  // ADD with empty stack

// Right - Push two values first
const right = new Uint8Array([
  0x60, 0x05,  // PUSH1 5
  0x60, 0x03,  // PUSH1 3
  0x01         // ADD
])
```

### "Stack overflow" Error

The stack can only hold 1024 items. You're pushing too many values without popping them.

### "Invalid opcode" Error

You used an opcode that isn't implemented yet:

```typescript
// 0x10 (LT - less than) isn't implemented in Phase 1
const bytecode = new Uint8Array([0x10])  // Error!
```

Check the README for which opcodes are currently available.

## What's Next?

After mastering Phase 1:

1. **Wait for Phase 2** (Control Flow) - Coming soon!
   - JUMP/JUMPI for loops and conditionals
   - Comparison operations (LT, GT, EQ)
   - Real program control flow

2. **Contribute** - The project is open source!
   - Add tests for edge cases
   - Improve documentation
   - Suggest new features

3. **Build Tools** - Use EVMIX as a library
   - Create a bytecode disassembler
   - Build a gas profiler
   - Make a visual debugger

## Resources

- **[WALKTHROUGH_PHASE1.md](./WALKTHROUGH_PHASE1.md)** - Deep dive into EVM concepts
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Full roadmap (6 phases)
- **[PROGRESS.md](./PROGRESS.md)** - Current status
- **[examples/](../examples/)** - More code examples
- **[EVM Opcodes Reference](https://www.evm.codes/)** - Comprehensive opcode documentation

## Getting Help

- **Documentation**: Check the docs/ folder first
- **Source Code**: The code is extensively commented
- **Tests**: Look at test files for usage examples
- **Issues**: Open a GitHub issue if you find bugs

## Pro Tips

1. **Use the REPL Pattern**: Write small programs, run them, inspect the results
2. **Check Traces**: When confused, look at the trace events to see what happened
3. **Start Small**: Master simple arithmetic before moving to complex programs
4. **Read Tests**: The test files show many usage patterns
5. **Experiment**: The VM is sandboxed - you can't break anything!

---

**Welcome to EVMIX! Now go make the EVM legible! 🚀**
