# EVMIX - An Observable, Educational Ethereum Virtual Machine

EVMIX is an open-source, educational implementation of the Ethereum Virtual Machine designed to make EVM execution **legible**.

Where production clients optimize for throughput and consensus correctness, EVMIX optimizes for:
- **Observability** - Every action is emitted as structured trace events
- **Inspectability** - Complete state available at every step
- **Determinism** - Identical inputs produce identical outputs and traces
- **Pedagogical clarity** - Code is written to be understood, not just executed

## Project Status

### Phase 1: Core Skeleton (COMPLETE)

The foundational EVM interpreter is complete and fully tested:

- **Data Types**
  - `Word256`: 256-bit unsigned integer with full arithmetic operations
  - `Address`: 20-byte Ethereum address type

- **Machine State**
  - Program counter (PC)
  - Gas tracking with automatic charging
  - Stack (up to 1024 items)
  - Memory (expandable with gas costs)
  - Halt detection and reason tracking

- **Stack Operations**
  - Push/Pop with overflow/underflow detection
  - Peek operations
  - SWAP (SWAP1-SWAP16)
  - DUP (DUP1-DUP16)

- **Trace System**
  - 10 event types (opcode.start, stack.push/pop, memory.read/write, etc.)
  - JSON serialization and replay
  - Full execution observability

- **Interpreter**
  - Step-by-step execution
  - Run until halt
  - Complete opcode dispatch

- **Implemented Opcodes** (5 total)
  - `STOP (0x00)` - Halt execution
  - `ADD (0x01)` - Addition with overflow
  - `MUL (0x02)` - Multiplication
  - `SUB (0x03)` - Subtraction with underflow
  - `DIV (0x04)` - Integer division (div by zero = 0)
  - `PUSH1-PUSH32 (0x60-0x7f)` - Push immediate values

- **Test Coverage**: 117 tests passing, covering:
  - All data types and primitives
  - Stack operations and edge cases
  - State management
  - Trace collection and replay
  - Arithmetic operations
  - Gas consumption
  - Integration scenarios

### Coming Next: Phase 2 - Control Flow

- Program Counter operations (PC)
- Jump operations (JUMP, JUMPI, JUMPDEST)
- JUMPDEST validation
- Comparison operations (LT, GT, EQ, ISZERO)
- Boolean operations (AND, OR, NOT, XOR)

## Project Structure

```
evmix/
├── packages/
│   ├── evmix-core/       ← EVM interpreter + tracing + replay [PHASE 1 COMPLETE]
│   ├── evmix-host/       ← In-memory host + fixtures [Phase 4]
│   ├── evmix-cli/        ← CLI + REPL + trace exporter [Phase 5+]
│   ├── evmix-spec/       ← Opcode docs, invariants, learning material [Ongoing]
│   └── evmix-ui/         ← Web-based visual lab [Phase 6]
├── docs/
│   └── IMPLEMENTATION_PLAN.md  ← Complete roadmap with 400+ tasks
├── CLAUDE.md             ← Product vision and architecture
└── README.md             ← This file
```

## Quick Start

**New to EVMIX?** Read **[docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)** for a complete introduction!

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Basic Usage

```typescript
import { Interpreter } from '@evmix/core'

// Simple program: 5 + 3 = 8
const bytecode = new Uint8Array([
  0x60, 0x05,  // PUSH1 5
  0x60, 0x03,  // PUSH1 3
  0x01,        // ADD
  0x00,        // STOP
])

const interpreter = new Interpreter({
  bytecode,
  initialGas: 1000000n
})

// Execute until halt
interpreter.run()

// Get result
const result = interpreter.getStack().peek()
console.log(result.value) // 8n

// Get execution trace
const trace = interpreter.getTrace()
console.log(trace.toJSON()) // Full execution history
```

### Try the Examples

```bash
# Run interactive examples
cd packages/evmix-core
pnpm example

# Or directly:
pnpm --filter @evmix/core example
```

**Then read [docs/WALKTHROUGH_PHASE1.md](./docs/WALKTHROUGH_PHASE1.md) to understand what you just saw!**

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
cd packages/evmix-core && pnpm test:watch
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/evmix-core && pnpm build

# Watch mode for development
cd packages/evmix-core && pnpm dev
```

### Code Quality

```bash
# Lint all code
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck
```

## Architecture Highlights

### Trace Events: The Primary Interface

Every meaningful action emits a structured event:

```typescript
{ type: "opcode.start", pc: 0, opcode: 0x01, opcodeName: "ADD", ... }
{ type: "stack.pop", value: "0x03", ... }
{ type: "stack.pop", value: "0x05", ... }
{ type: "stack.push", value: "0x08", ... }
{ type: "gas.charge", amount: "3", reason: "ADD", ... }
{ type: "halt", reason: "STOP", ... }
```

This means:
- UI never has to infer behavior
- Traces can be replayed offline
- Debugging is time-travel by default
- Educational visualizations are data-driven

### Separation of Concerns

- **Execution ≠ Visualization** - VM runs headless; UI is just a consumer
- **Semantics ≠ UI** - Core logic has no UI dependencies
- **Interpreter ≠ Debugger** - Step execution is built in from day one

### Test-Driven Development

Phase 1 includes:
- 117 unit and integration tests
- >90% code coverage
- Golden trace tests for determinism
- Edge case coverage (overflow, underflow, out of gas)

## Documentation

### Learning Resources

- **[docs/WALKTHROUGH_PHASE1.md](./docs/WALKTHROUGH_PHASE1.md)** - 📚 **Start here!** Comprehensive guide to understanding the EVM
- **[docs/examples/basic-arithmetic.ts](./docs/examples/basic-arithmetic.ts)** - Runnable examples with `pnpm --filter @evmix/core example`

### Project Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete product vision and design philosophy
- **[docs/IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)** - Detailed roadmap with 400+ tasks
- **[docs/PROGRESS.md](./docs/PROGRESS.md)** - Current status and what's next
- **[packages/evmix-core/src/](./packages/evmix-core/src/)** - Inline code documentation

## Contributing

EVMIX is in active development. Phase 1 is complete; we're ready for Phase 2!

The codebase is intentionally:
- **Readable over clever** - Explicit is better than implicit
- **Documented** - Every meaningful function has comments
- **Tested** - New code requires tests
- **Small** - We're not competing with Geth; we're teaching the EVM

## License

MIT

## North Star

> "I finally understand what the EVM is doing."

If EVMIX reliably produces that reaction, it's working.
