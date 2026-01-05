# EVMIX Implementation Plan

A comprehensive, step-by-step guide to implementing the EVMIX educational EVM.

## Table of Contents

1. [Project Setup](#project-setup)
2. [Phase 1: Core Skeleton](#phase-1-core-skeleton)
3. [Phase 2: Control Flow](#phase-2-control-flow)
4. [Phase 3: Memory & Data](#phase-3-memory--data)
5. [Phase 4: World Interaction](#phase-4-world-interaction)
6. [Phase 5: Debug Power](#phase-5-debug-power)
7. [Phase 6: Web Lab](#phase-6-web-lab)
8. [Documentation & Content](#documentation--content)
9. [Testing Infrastructure](#testing-infrastructure)
10. [Open Source Prep](#open-source-prep)

---

## Project Setup

### Repository Structure
- [ ] Initialize monorepo structure with package manager (npm/yarn workspaces or pnpm)
- [ ] Create `packages/` directory
- [ ] Set up TypeScript configuration at root level
- [ ] Configure shared tsconfig.base.json
- [ ] Set up ESLint and Prettier for code consistency
- [ ] Create .gitignore file
- [ ] Set up package.json with workspace configuration

### Package Scaffolding
- [ ] Create `packages/evmix-core/` directory
  - [ ] Initialize package.json
  - [ ] Set up TypeScript config
  - [ ] Create `src/` directory
  - [ ] Create `tests/` directory
- [ ] Create `packages/evmix-host/` directory
  - [ ] Initialize package.json
  - [ ] Set up TypeScript config
  - [ ] Create `src/` directory
  - [ ] Create `tests/` directory
- [ ] Create `packages/evmix-cli/` directory
  - [ ] Initialize package.json
  - [ ] Set up TypeScript config
  - [ ] Create `src/` directory
- [ ] Create `packages/evmix-spec/` directory
  - [ ] Initialize package.json (may be documentation-focused)
  - [ ] Create opcode documentation structure
- [ ] Create `packages/evmix-ui/` directory (or separate repo)
  - [ ] Initialize package.json
  - [ ] Set up React/Vite or Next.js
  - [ ] Configure build tooling

### Development Tooling
- [ ] Set up build scripts for all packages
- [ ] Configure test runner (Vitest or Jest)
- [ ] Set up code coverage reporting
- [ ] Add git hooks with husky (pre-commit, pre-push)
- [ ] Create development scripts (dev, build, test, lint)

### Documentation Structure
- [ ] Create `docs/` directory at root
- [ ] Create `docs/architecture/` for design docs
- [ ] Create `docs/opcodes/` for opcode reference
- [ ] Create `docs/guides/` for learning materials
- [ ] Set up README.md at root

---

## Phase 1: Core Skeleton

### Data Types & Primitives (evmix-core)
- [ ] Define `Word256` type (256-bit unsigned integer)
  - [ ] Implement as wrapper around BigInt
  - [ ] Add utility methods (toHex, fromHex, toBinary, etc.)
  - [ ] Add arithmetic operations with overflow checks
  - [ ] Write unit tests
- [ ] Define `Address` type (160-bit)
  - [ ] Implement validation
  - [ ] Implement formatting utilities
  - [ ] Write unit tests
- [ ] Define `Bytes` type utilities
  - [ ] Implement byte array helpers
  - [ ] Add padding functions (left/right)
  - [ ] Add slicing utilities

### Machine State
- [ ] Define `HaltReason` enum
  - [ ] STOP
  - [ ] RETURN
  - [ ] REVERT
  - [ ] OUT_OF_GAS
  - [ ] INVALID_OPCODE
  - [ ] STACK_UNDERFLOW
  - [ ] STACK_OVERFLOW
  - [ ] INVALID_JUMP
- [ ] Implement `MachineState` class
  - [ ] Add `pc: number` (program counter)
  - [ ] Add `gasRemaining: bigint`
  - [ ] Add `stack: Word256[]` (max 1024 items)
  - [ ] Add `memory: Uint8Array` (expandable)
  - [ ] Add `returnData: Uint8Array`
  - [ ] Add `halted: boolean`
  - [ ] Add `haltReason?: HaltReason`
  - [ ] Implement clone/snapshot method
  - [ ] Write unit tests

### Stack Operations
- [ ] Implement `Stack` class
  - [ ] Push operation with overflow check
  - [ ] Pop operation with underflow check
  - [ ] Peek operation
  - [ ] Swap operation (SWAP1-SWAP16)
  - [ ] Dup operation (DUP1-DUP16)
  - [ ] Get depth/size
  - [ ] Clear operation
  - [ ] Write comprehensive tests

### Trace Infrastructure
- [ ] Define `TraceEvent` interface/type hierarchy
  - [ ] Base event with timestamp/index
  - [ ] OpcodeStartEvent
  - [ ] StackPopEvent
  - [ ] StackPushEvent
  - [ ] MemoryWriteEvent
  - [ ] MemoryReadEvent
  - [ ] StorageReadEvent
  - [ ] StorageWriteEvent
  - [ ] GasChargeEvent
  - [ ] JumpEvent
  - [ ] HaltEvent
- [ ] Implement `TraceCollector` class
  - [ ] Add event recording method
  - [ ] Add event filtering capabilities
  - [ ] Implement export to JSON
  - [ ] Add event replay validation
  - [ ] Write unit tests
- [ ] Create trace event factories/builders

### Basic Interpreter Loop
- [ ] Implement `Interpreter` class skeleton
  - [ ] Constructor accepting bytecode and initial state
  - [ ] Add `step()` method (execute one opcode)
  - [ ] Add opcode dispatch mechanism
  - [ ] Add trace event emission
  - [ ] Implement halt detection
  - [ ] Write tests for interpreter lifecycle
- [ ] Implement opcode decoder
  - [ ] Read byte at PC
  - [ ] Map to opcode enum
  - [ ] Handle invalid opcodes
  - [ ] Write unit tests

### Arithmetic Opcodes (Phase 1 Subset)
- [ ] Implement ADD (0x01)
  - [ ] Create `src/opcodes/arithmetic/add.ts`
  - [ ] Implement operation with mod 2^256
  - [ ] Add gas cost (3)
  - [ ] Add stack effect validation (2 in, 1 out)
  - [ ] Emit trace events
  - [ ] Write unit tests
  - [ ] Document in evmix-spec
- [ ] Implement MUL (0x02)
  - [ ] Create implementation file
  - [ ] Implement operation
  - [ ] Add gas cost (5)
  - [ ] Add tests
  - [ ] Document
- [ ] Implement SUB (0x03)
  - [ ] Create implementation file
  - [ ] Implement operation with underflow handling
  - [ ] Add gas cost (3)
  - [ ] Add tests
  - [ ] Document
- [ ] Implement DIV (0x04)
  - [ ] Create implementation file
  - [ ] Implement operation with division by zero handling
  - [ ] Add gas cost (5)
  - [ ] Add tests
  - [ ] Document

### STOP Opcode
- [ ] Implement STOP (0x00)
  - [ ] Create implementation file
  - [ ] Set halted = true
  - [ ] Set haltReason = STOP
  - [ ] Emit halt event
  - [ ] Add tests
  - [ ] Document

### Phase 1 Integration Tests
- [ ] Test simple arithmetic program
- [ ] Test program halting with STOP
- [ ] Test trace event generation
- [ ] Test gas consumption tracking
- [ ] Validate trace replay works

---

## Phase 2: Control Flow

### Program Counter Operations
- [ ] Implement PC (0x58)
  - [ ] Push current PC to stack
  - [ ] Add gas cost (2)
  - [ ] Add tests
  - [ ] Document
- [ ] Implement JUMPDEST validation
  - [ ] Pre-scan bytecode for valid jump destinations
  - [ ] Create JUMPDEST bitmap/set
  - [ ] Add validation method
  - [ ] Write tests

### Jump Operations
- [ ] Implement JUMP (0x56)
  - [ ] Pop destination from stack
  - [ ] Validate destination is JUMPDEST
  - [ ] Update PC
  - [ ] Emit jump event
  - [ ] Handle invalid jump (halt)
  - [ ] Add gas cost (8)
  - [ ] Write extensive tests
  - [ ] Document with common pitfalls
- [ ] Implement JUMPI (0x57)
  - [ ] Pop destination and condition
  - [ ] Check condition != 0
  - [ ] Conditionally jump or continue
  - [ ] Emit jump event (taken/not taken)
  - [ ] Add gas cost (10)
  - [ ] Write tests for both branches
  - [ ] Document
- [ ] Implement JUMPDEST (0x5b)
  - [ ] Mark as valid destination
  - [ ] Add gas cost (1)
  - [ ] Add tests
  - [ ] Document

### Comparison & Boolean Operations
- [ ] Implement LT (0x10)
  - [ ] Less than comparison
  - [ ] Add tests
  - [ ] Document
- [ ] Implement GT (0x11)
  - [ ] Greater than comparison
  - [ ] Add tests
  - [ ] Document
- [ ] Implement EQ (0x14)
  - [ ] Equality comparison
  - [ ] Add tests
  - [ ] Document
- [ ] Implement ISZERO (0x15)
  - [ ] Zero check
  - [ ] Add tests
  - [ ] Document

### Phase 2 Integration Tests
- [ ] Test simple loop with JUMPI
- [ ] Test conditional branches
- [ ] Test invalid jump detection
- [ ] Test jump to non-JUMPDEST
- [ ] Test nested control flow
- [ ] Validate trace shows control flow correctly

---

## Phase 3: Memory & Data

### Memory Implementation
- [ ] Implement `Memory` class
  - [ ] Expandable Uint8Array backing
  - [ ] Memory expansion with 32-byte alignment
  - [ ] Gas cost calculation for expansion
  - [ ] Read byte range
  - [ ] Write byte range
  - [ ] Track memory size
  - [ ] Emit memory access events
  - [ ] Write comprehensive tests
- [ ] Implement memory gas cost calculation
  - [ ] Quadratic cost formula
  - [ ] Memory expansion tracking
  - [ ] Add tests for various sizes

### Memory Opcodes
- [ ] Implement MLOAD (0x51)
  - [ ] Pop offset
  - [ ] Read 32 bytes from memory
  - [ ] Expand memory if needed
  - [ ] Calculate gas (3 + expansion)
  - [ ] Emit events
  - [ ] Add tests
  - [ ] Document
- [ ] Implement MSTORE (0x52)
  - [ ] Pop offset and value
  - [ ] Write 32 bytes to memory
  - [ ] Expand memory if needed
  - [ ] Calculate gas (3 + expansion)
  - [ ] Emit events
  - [ ] Add tests
  - [ ] Document
- [ ] Implement MSTORE8 (0x53)
  - [ ] Pop offset and value
  - [ ] Write 1 byte to memory
  - [ ] Expand memory if needed
  - [ ] Calculate gas
  - [ ] Emit events
  - [ ] Add tests
  - [ ] Document
- [ ] Implement MSIZE (0x59)
  - [ ] Push current memory size
  - [ ] Add gas cost (2)
  - [ ] Add tests
  - [ ] Document

### Calldata Operations
- [ ] Add calldata to execution context
  - [ ] Update Interpreter to accept calldata
  - [ ] Store as Uint8Array
  - [ ] Add to trace events
- [ ] Implement CALLDATALOAD (0x35)
  - [ ] Pop offset
  - [ ] Read 32 bytes from calldata
  - [ ] Pad with zeros if out of bounds
  - [ ] Add gas cost (3)
  - [ ] Emit events
  - [ ] Add tests
  - [ ] Document
- [ ] Implement CALLDATASIZE (0x36)
  - [ ] Push size of calldata
  - [ ] Add gas cost (2)
  - [ ] Add tests
  - [ ] Document
- [ ] Implement CALLDATACOPY (0x37)
  - [ ] Pop destOffset, offset, length
  - [ ] Copy from calldata to memory
  - [ ] Handle out of bounds
  - [ ] Calculate gas (3 + 3*length_words + expansion)
  - [ ] Emit events
  - [ ] Add tests
  - [ ] Document

### Return Operations
- [ ] Implement RETURN (0xf3)
  - [ ] Pop offset and length
  - [ ] Read return data from memory
  - [ ] Set returnData in state
  - [ ] Set halted = true
  - [ ] Set haltReason = RETURN
  - [ ] Calculate gas
  - [ ] Emit events
  - [ ] Add tests
  - [ ] Document
- [ ] Implement REVERT (0xfd)
  - [ ] Pop offset and length
  - [ ] Read return data from memory
  - [ ] Set returnData in state
  - [ ] Set halted = true
  - [ ] Set haltReason = REVERT
  - [ ] Calculate gas (refund unused gas)
  - [ ] Emit events
  - [ ] Add tests
  - [ ] Document

### Phase 3 Integration Tests
- [ ] Test memory expansion gas costs
- [ ] Test calldata operations with various inputs
- [ ] Test RETURN with data
- [ ] Test REVERT with error message
- [ ] Test programs using memory and calldata together
- [ ] Validate trace shows all memory operations

---

## Phase 4: World Interaction

### Host Interface (evmix-host)
- [ ] Define `Account` interface
  - [ ] address: Address
  - [ ] balance: bigint
  - [ ] nonce: number
  - [ ] code: Uint8Array
  - [ ] storage: Map<Word256, Word256>
- [ ] Define `Host` interface
  - [ ] getAccount(address): Account
  - [ ] setAccount(address, account): void
  - [ ] getBalance(address): bigint
  - [ ] getCode(address): Uint8Array
  - [ ] getCodeSize(address): number
  - [ ] sload(address, key): Word256
  - [ ] sstore(address, key, value): void
  - [ ] call(callFrame): CallResult
  - [ ] log(topics, data): void
- [ ] Implement `InMemoryHost`
  - [ ] Use Map for accounts
  - [ ] Implement all interface methods
  - [ ] Add state snapshot/restore
  - [ ] Write comprehensive tests
- [ ] Define `CallFrame` type
  - [ ] caller, target, value, data, gas
  - [ ] call type (CALL, DELEGATECALL, STATICCALL)

### Environment Data
- [ ] Add execution context to Interpreter
  - [ ] Block number, timestamp, coinbase
  - [ ] Gas price, origin, caller
  - [ ] Contract address, value
  - [ ] Gas limit
- [ ] Implement ADDRESS (0x30)
- [ ] Implement BALANCE (0x31)
- [ ] Implement ORIGIN (0x32)
- [ ] Implement CALLER (0x33)
- [ ] Implement CALLVALUE (0x34)
- [ ] Implement GASPRICE (0x3a)
- [ ] Implement COINBASE (0x41)
- [ ] Implement TIMESTAMP (0x42)
- [ ] Implement NUMBER (0x43)
- [ ] Implement GASLIMIT (0x45)

### Storage Operations
- [ ] Implement SLOAD (0x54)
  - [ ] Pop storage key
  - [ ] Call host.sload(address, key)
  - [ ] Push value to stack
  - [ ] Add gas cost (warm: 100, cold: 2100)
  - [ ] Emit storage read event
  - [ ] Add tests
  - [ ] Document
- [ ] Implement SSTORE (0x55)
  - [ ] Pop key and value
  - [ ] Call host.sstore(address, key, value)
  - [ ] Calculate complex gas costs
    - [ ] SSTORE_SET (20000)
    - [ ] SSTORE_RESET (5000)
    - [ ] SSTORE_CLEARS_SCHEDULE (15000 refund)
  - [ ] Emit storage write event
  - [ ] Add tests for all gas scenarios
  - [ ] Document with gas cost explanation

### Log Operations
- [ ] Implement LOG0 (0xa0)
  - [ ] Pop offset and length
  - [ ] Read data from memory
  - [ ] Call host.log([], data)
  - [ ] Calculate gas (375 + 8*length + expansion)
  - [ ] Emit log event
  - [ ] Add tests
  - [ ] Document
- [ ] Implement LOG1, LOG2, LOG3, LOG4
  - [ ] Pop topics before offset/length
  - [ ] Calculate gas (375 + 375*topics + 8*length + expansion)
  - [ ] Add tests for each
  - [ ] Document

### Call Operations (Minimal)
- [ ] Implement basic CALL (0xf1)
  - [ ] Pop gas, address, value, argsOffset, argsLength, retOffset, retLength
  - [ ] Create call frame
  - [ ] Execute via host
  - [ ] Handle success/failure
  - [ ] Write return data
  - [ ] Add gas cost calculation
  - [ ] Emit call event
  - [ ] Add tests for simple scenarios
  - [ ] Document limitations
- [ ] Implement STATICCALL (0xfa)
  - [ ] Similar to CALL but no value transfer
  - [ ] Enforce no state modifications
  - [ ] Add tests
  - [ ] Document

### Phase 4 Integration Tests
- [ ] Test storage read/write operations
- [ ] Test SSTORE gas costs in various scenarios
- [ ] Test log emission with topics
- [ ] Test basic contract calls
- [ ] Test environment data access
- [ ] Validate trace captures all host interactions

---

## Phase 5: Debug Power

### Snapshot System
- [ ] Implement `StateSnapshot` class
  - [ ] Capture complete machine state
  - [ ] Capture world state (via host snapshot)
  - [ ] Include PC, gas, stack, memory, storage
  - [ ] Implement efficient serialization
  - [ ] Write tests
- [ ] Implement `SnapshotManager`
  - [ ] Periodic snapshot creation (every N steps)
  - [ ] Snapshot storage and retrieval
  - [ ] Snapshot cleanup/pruning
  - [ ] Configure snapshot frequency
  - [ ] Write tests

### Breakpoint System
- [ ] Define `Breakpoint` interface
  - [ ] PC breakpoints
  - [ ] Opcode breakpoints
  - [ ] Condition breakpoints (predicate over state)
  - [ ] Storage access breakpoints
  - [ ] Gas threshold breakpoints
- [ ] Implement `BreakpointManager`
  - [ ] Add/remove breakpoints
  - [ ] Evaluate breakpoints during execution
  - [ ] Breakpoint hit detection
  - [ ] Breakpoint enable/disable
  - [ ] Write comprehensive tests

### Debug Session
- [ ] Implement `DebugSession` class
  - [ ] Wrap Interpreter with debug capabilities
  - [ ] Implement `step(n?: number): StepResult`
    - [ ] Execute N opcodes (default 1)
    - [ ] Stop at breakpoints
    - [ ] Return execution info
  - [ ] Implement `run(): ExecutionResult`
    - [ ] Run until halt or breakpoint
    - [ ] Create snapshots periodically
    - [ ] Return full result
  - [ ] Implement `runUntil(predicate): ExecutionResult`
    - [ ] Execute until predicate is true
    - [ ] Check after each step
  - [ ] Implement `reset(): void`
    - [ ] Restore to initial state
    - [ ] Clear trace
  - [ ] Implement `setBreakpoint(bp): void`
  - [ ] Implement `clearBreakpoints(): void`
  - [ ] Implement `mutateWorld(mutator): void`
    - [ ] Allow state manipulation during debug
  - [ ] Implement `exportTrace(): Trace`
    - [ ] Serialize full trace to JSON
  - [ ] Implement `importTrace(trace): void`
    - [ ] Load and validate trace
  - [ ] Write comprehensive tests

### Time Travel / Replay
- [ ] Implement backward stepping
  - [ ] Find nearest snapshot before target PC
  - [ ] Restore snapshot
  - [ ] Replay forward to target
  - [ ] Write tests
- [ ] Implement jump to arbitrary PC
  - [ ] Use snapshot + replay strategy
  - [ ] Validate target PC is reachable
  - [ ] Write tests
- [ ] Implement trace replay
  - [ ] Execute from trace events
  - [ ] Validate determinism
  - [ ] Detect divergence
  - [ ] Write tests

### Phase 5 Integration Tests
- [ ] Test stepping through program
- [ ] Test breakpoint hits
- [ ] Test conditional breakpoints
- [ ] Test backward stepping
- [ ] Test time travel to arbitrary points
- [ ] Test trace export and replay
- [ ] Test world state mutation during debug
- [ ] Validate deterministic replay

---

## Phase 6: Web Lab

### Project Setup (evmix-ui)
- [ ] Initialize React project with Vite or Next.js
- [ ] Set up TypeScript configuration
- [ ] Configure Tailwind CSS or preferred styling
- [ ] Set up component library (shadcn/ui, MUI, etc.)
- [ ] Configure state management (Zustand, Redux, Jotai)
- [ ] Set up routing if needed
- [ ] Configure build and dev scripts

### Core UI Components
- [ ] Implement `BytecodeViewer` component
  - [ ] Display bytecode as hex
  - [ ] Highlight current instruction
  - [ ] Show opcode names
  - [ ] Add line numbers (PC)
  - [ ] Style and polish
- [ ] Implement `StackViewer` component
  - [ ] Display stack items (top to bottom)
  - [ ] Format 256-bit words (hex, decimal, binary toggle)
  - [ ] Highlight recent changes
  - [ ] Show stack depth
  - [ ] Style and polish
- [ ] Implement `MemoryViewer` component
  - [ ] Hex dump view
  - [ ] ASCII view
  - [ ] Address column
  - [ ] Highlight recent writes
  - [ ] Memory size indicator
  - [ ] Search functionality
  - [ ] Style and polish
- [ ] Implement `StorageViewer` component
  - [ ] Key-value table
  - [ ] Format addresses and values
  - [ ] Highlight changes
  - [ ] Show storage diff
  - [ ] Filter/search
  - [ ] Style and polish
- [ ] Implement `TraceViewer` component
  - [ ] Event list/timeline
  - [ ] Filter by event type
  - [ ] Expand event details
  - [ ] Navigate to event
  - [ ] Export trace
  - [ ] Style and polish

### Execution Controls
- [ ] Implement `ControlPanel` component
  - [ ] Step forward button
  - [ ] Step backward button
  - [ ] Run button
  - [ ] Pause button
  - [ ] Reset button
  - [ ] Step N input
  - [ ] Gas display
  - [ ] PC display
  - [ ] Status indicator (running/halted/paused)
  - [ ] Style and polish
- [ ] Implement `Timeline` / scrubber component
  - [ ] Visual execution timeline
  - [ ] Draggable scrubber
  - [ ] Jump to any point
  - [ ] Show snapshots
  - [ ] Show breakpoints
  - [ ] Gas burn visualization
  - [ ] Style and polish

### Interactive Features
- [ ] Implement breakpoint UI
  - [ ] Add breakpoint by PC
  - [ ] Add conditional breakpoint
  - [ ] Breakpoint list
  - [ ] Enable/disable breakpoints
  - [ ] Delete breakpoints
  - [ ] Visual indicators in bytecode view
- [ ] Implement input panel
  - [ ] Bytecode input (hex)
  - [ ] Calldata input
  - [ ] Environment config (block number, timestamp, etc.)
  - [ ] Initial storage input
  - [ ] Gas limit input
  - [ ] Load from file
  - [ ] Example programs dropdown

### State Management & Integration
- [ ] Create DebugSession wrapper/hook
  - [ ] Initialize session with config
  - [ ] Expose step/run/reset methods
  - [ ] Subscribe to state changes
  - [ ] Handle async execution
- [ ] Implement state synchronization
  - [ ] Update UI when state changes
  - [ ] Debounce rapid updates
  - [ ] Highlight changes
- [ ] Implement trace streaming
  - [ ] Stream trace events during execution
  - [ ] Update views incrementally
  - [ ] Handle long traces efficiently

### Opcode Documentation Panel
- [ ] Implement `OpcodeInfoPanel` component
  - [ ] Display opcode name
  - [ ] Show stack effect (inputs → outputs)
  - [ ] Show gas cost
  - [ ] English description
  - [ ] Common pitfalls
  - [ ] Link to Yellow Paper
  - [ ] Link to evmix-spec
  - [ ] Auto-update based on current opcode
  - [ ] Style and polish

### Examples & Learning Content
- [ ] Create example bytecode programs
  - [ ] Simple arithmetic
  - [ ] Control flow (loops, conditionals)
  - [ ] Memory operations
  - [ ] Storage read/write
  - [ ] Contract calls
  - [ ] Event logs
- [ ] Implement example loader
  - [ ] List of examples
  - [ ] Load example into debugger
  - [ ] Show description/explanation
- [ ] Create guided walkthroughs
  - [ ] Step-by-step tutorials
  - [ ] Interactive prompts
  - [ ] Check understanding

### Advanced Features
- [ ] Implement trace export
  - [ ] Download trace as JSON
  - [ ] Download execution summary
- [ ] Implement trace import
  - [ ] Upload trace file
  - [ ] Load and replay
  - [ ] Validate trace
- [ ] Implement "what if?" mutations
  - [ ] Pause execution
  - [ ] Edit stack/memory/storage
  - [ ] Continue execution
  - [ ] Show fork point
- [ ] Implement comparison mode
  - [ ] Compare two execution traces
  - [ ] Highlight differences
  - [ ] Useful for fork differences

### Polish & UX
- [ ] Implement responsive layout
  - [ ] Mobile-friendly views
  - [ ] Collapsible panels
  - [ ] Drag-to-resize
- [ ] Add keyboard shortcuts
  - [ ] Step (Space or S)
  - [ ] Run (R)
  - [ ] Reset (Escape)
  - [ ] Toggle panels
- [ ] Add loading states
- [ ] Add error handling UI
- [ ] Add tooltips
- [ ] Implement dark mode
- [ ] Performance optimization
  - [ ] Virtualize long lists
  - [ ] Memoize expensive renders
  - [ ] Lazy load components

### Phase 6 Integration Tests
- [ ] Test basic execution flow in UI
- [ ] Test stepping through program
- [ ] Test breakpoints
- [ ] Test time travel
- [ ] Test loading examples
- [ ] Test trace export/import
- [ ] Test responsive design
- [ ] E2E tests with Playwright or Cypress

---

## Documentation & Content

### Opcode Documentation (evmix-spec)
- [ ] Create template for opcode documentation
  - [ ] Name and hex code
  - [ ] Stack effect diagram
  - [ ] Gas cost
  - [ ] English description
  - [ ] Preconditions
  - [ ] Postconditions
  - [ ] Common pitfalls
  - [ ] Yellow Paper reference
  - [ ] Code example
- [ ] Document all implemented opcodes
  - [ ] Arithmetic opcodes
  - [ ] Comparison opcodes
  - [ ] Bitwise opcodes
  - [ ] Jump opcodes
  - [ ] Memory opcodes
  - [ ] Storage opcodes
  - [ ] Environmental opcodes
  - [ ] Call opcodes
  - [ ] Log opcodes
  - [ ] System opcodes

### Architecture Documentation
- [ ] Write architecture overview
  - [ ] Component diagram
  - [ ] Data flow diagram
  - [ ] Explain separation of concerns
- [ ] Document trace event system
  - [ ] Event types
  - [ ] Event schema
  - [ ] Usage examples
  - [ ] Replay mechanism
- [ ] Document host interface
  - [ ] Explain pluggable design
  - [ ] InMemoryHost implementation
  - [ ] Creating custom hosts
- [ ] Document debug session
  - [ ] API reference
  - [ ] Usage examples
  - [ ] Snapshot system
  - [ ] Breakpoints

### Learning Guides
- [ ] Write "EVM Basics" guide
  - [ ] What is the EVM?
  - [ ] Stack-based execution
  - [ ] Gas concept
  - [ ] Memory vs Storage
- [ ] Write "Reading Bytecode" guide
  - [ ] Opcode encoding
  - [ ] PUSH instructions
  - [ ] Jump destinations
  - [ ] Disassembly
- [ ] Write "Gas Explained" guide
  - [ ] Why gas exists
  - [ ] Gas costs by category
  - [ ] Memory expansion costs
  - [ ] Storage gas costs
- [ ] Write "Control Flow" guide
  - [ ] Jumps and conditions
  - [ ] Loop patterns
  - [ ] Function dispatching
- [ ] Write "Storage Patterns" guide
  - [ ] Simple variables
  - [ ] Mappings
  - [ ] Dynamic arrays
  - [ ] Packed storage

### Walkthrough Content
- [ ] Create "First Steps" walkthrough
  - [ ] Load simple program
  - [ ] Step through execution
  - [ ] Observe stack changes
- [ ] Create "Understanding Gas" walkthrough
  - [ ] Watch gas decrease
  - [ ] Compare opcode costs
  - [ ] Memory expansion example
- [ ] Create "Smart Contract Call" walkthrough
  - [ ] Function selector
  - [ ] ABI encoding
  - [ ] Call flow
  - [ ] Return value

### API Documentation
- [ ] Generate API docs from TypeScript
  - [ ] Set up TypeDoc
  - [ ] Configure for all packages
  - [ ] Generate HTML docs
  - [ ] Publish to docs site
- [ ] Write usage examples
  - [ ] Creating an interpreter
  - [ ] Using debug session
  - [ ] Implementing custom host
  - [ ] Parsing traces

---

## Testing Infrastructure

### Unit Testing
- [ ] Achieve >90% code coverage for evmix-core
  - [ ] All opcodes covered
  - [ ] All edge cases tested
  - [ ] Gas cost validation
- [ ] Achieve >80% coverage for evmix-host
- [ ] Test all trace event types
- [ ] Test snapshot/restore logic
- [ ] Test breakpoint evaluation

### Integration Testing
- [ ] Create test suite for each phase
  - [ ] Phase 1: arithmetic and STOP
  - [ ] Phase 2: control flow
  - [ ] Phase 3: memory and data
  - [ ] Phase 4: world interaction
  - [ ] Phase 5: debug features
- [ ] Test cross-package integration
  - [ ] Core + Host
  - [ ] Core + CLI
  - [ ] Core + UI (if possible)

### Trace Testing
- [ ] Create golden trace tests
  - [ ] Store expected traces for known programs
  - [ ] Compare actual vs expected
  - [ ] Detect trace format changes
- [ ] Test trace replay determinism
  - [ ] Run program twice
  - [ ] Compare traces exactly
- [ ] Test trace export/import
  - [ ] Export trace
  - [ ] Re-import
  - [ ] Verify integrity

### External Test Vectors
- [ ] Set up Ethereum Foundation test runner
  - [ ] Download EVM tests
  - [ ] Filter to supported opcodes
  - [ ] Run and validate
- [ ] Create custom test cases
  - [ ] Edge cases not covered by EF tests
  - [ ] Gas limit scenarios
  - [ ] Invalid jump scenarios

### Performance Testing
- [ ] Benchmark interpreter speed
  - [ ] Ops per second
  - [ ] Compare with other VMs (informational)
- [ ] Benchmark memory usage
  - [ ] Large programs
  - [ ] Large traces
- [ ] Benchmark UI rendering
  - [ ] Large stack
  - [ ] Large memory
  - [ ] Long traces

---

## Open Source Prep

### Licensing
- [ ] Choose license (MIT or Apache-2.0)
- [ ] Add LICENSE file to root
- [ ] Add license headers to source files
- [ ] Document license in README

### Repository Documentation
- [ ] Write comprehensive README.md
  - [ ] Project description
  - [ ] Vision and goals
  - [ ] Installation instructions
  - [ ] Quick start guide
  - [ ] Link to full docs
  - [ ] Contributing guide link
  - [ ] License info
- [ ] Create CONTRIBUTING.md
  - [ ] Code style guide
  - [ ] Development setup
  - [ ] Testing requirements
  - [ ] PR process
  - [ ] Issue reporting
  - [ ] Opcode implementation guide
  - [ ] Trace compatibility promise
- [ ] Create CODE_OF_CONDUCT.md
  - [ ] Use standard CoC (Contributor Covenant)
- [ ] Create SECURITY.md
  - [ ] Security policy (if relevant)
  - [ ] Vulnerability reporting

### Issue Templates
- [ ] Create bug report template
  - [ ] Description
  - [ ] Reproduction steps
  - [ ] Expected vs actual behavior
  - [ ] Environment info
- [ ] Create feature request template
  - [ ] Use case
  - [ ] Proposed solution
  - [ ] Alternatives considered
- [ ] Create "good first opcode" template
  - [ ] Opcode name and hex
  - [ ] Implementation checklist
  - [ ] Resources and references

### PR Templates
- [ ] Create PR template
  - [ ] Description of changes
  - [ ] Related issues
  - [ ] Testing done
  - [ ] Documentation updated
  - [ ] Checklist

### CI/CD
- [ ] Set up GitHub Actions (or similar)
  - [ ] Run tests on PR
  - [ ] Run linter
  - [ ] Check formatting
  - [ ] Build all packages
  - [ ] Generate code coverage
- [ ] Set up automated releases
  - [ ] Version bumping
  - [ ] Changelog generation
  - [ ] NPM publishing
  - [ ] GitHub releases

### Community Infrastructure
- [ ] Set up discussions (GitHub Discussions)
  - [ ] Categories (Q&A, Ideas, Show & Tell)
- [ ] Create initial "good first issue" tasks
  - [ ] Simple opcodes
  - [ ] Documentation improvements
  - [ ] Example programs
  - [ ] UI polish
- [ ] Set up project board (optional)
  - [ ] Track milestones
  - [ ] Organize issues

### Launch Prep
- [ ] Create demo video/GIF
  - [ ] Show stepping through program
  - [ ] Highlight key features
- [ ] Write launch announcement
  - [ ] Blog post or README highlight
  - [ ] Key differentiators
  - [ ] Call to contributors
- [ ] Prepare example gallery
  - [ ] Showcase interesting programs
  - [ ] Educational examples
- [ ] Set up website/docs site (optional)
  - [ ] GitHub Pages
  - [ ] Custom domain
  - [ ] Documentation hosting

---

## Appendix: Opcode Checklist

### Arithmetic Operations (0x00-0x0f)
- [ ] 0x00 STOP
- [ ] 0x01 ADD
- [ ] 0x02 MUL
- [ ] 0x03 SUB
- [ ] 0x04 DIV
- [ ] 0x05 SDIV
- [ ] 0x06 MOD
- [ ] 0x07 SMOD
- [ ] 0x08 ADDMOD
- [ ] 0x09 MULMOD
- [ ] 0x0a EXP
- [ ] 0x0b SIGNEXTEND

### Comparison & Bitwise (0x10-0x1f)
- [ ] 0x10 LT
- [ ] 0x11 GT
- [ ] 0x12 SLT
- [ ] 0x13 SGT
- [ ] 0x14 EQ
- [ ] 0x15 ISZERO
- [ ] 0x16 AND
- [ ] 0x17 OR
- [ ] 0x18 XOR
- [ ] 0x19 NOT
- [ ] 0x1a BYTE
- [ ] 0x1b SHL
- [ ] 0x1c SHR
- [ ] 0x1d SAR

### Keccak (0x20)
- [ ] 0x20 KECCAK256

### Environmental (0x30-0x3f)
- [ ] 0x30 ADDRESS
- [ ] 0x31 BALANCE
- [ ] 0x32 ORIGIN
- [ ] 0x33 CALLER
- [ ] 0x34 CALLVALUE
- [ ] 0x35 CALLDATALOAD
- [ ] 0x36 CALLDATASIZE
- [ ] 0x37 CALLDATACOPY
- [ ] 0x38 CODESIZE
- [ ] 0x39 CODECOPY
- [ ] 0x3a GASPRICE
- [ ] 0x3b EXTCODESIZE
- [ ] 0x3c EXTCODECOPY
- [ ] 0x3d RETURNDATASIZE
- [ ] 0x3e RETURNDATACOPY
- [ ] 0x3f EXTCODEHASH

### Block Information (0x40-0x48)
- [ ] 0x40 BLOCKHASH
- [ ] 0x41 COINBASE
- [ ] 0x42 TIMESTAMP
- [ ] 0x43 NUMBER
- [ ] 0x44 DIFFICULTY (PREVRANDAO post-merge)
- [ ] 0x45 GASLIMIT
- [ ] 0x46 CHAINID
- [ ] 0x47 SELFBALANCE
- [ ] 0x48 BASEFEE

### Stack/Memory/Storage (0x50-0x5f)
- [ ] 0x50 POP
- [ ] 0x51 MLOAD
- [ ] 0x52 MSTORE
- [ ] 0x53 MSTORE8
- [ ] 0x54 SLOAD
- [ ] 0x55 SSTORE
- [ ] 0x56 JUMP
- [ ] 0x57 JUMPI
- [ ] 0x58 PC
- [ ] 0x59 MSIZE
- [ ] 0x5a GAS
- [ ] 0x5b JUMPDEST

### Push (0x60-0x7f)
- [ ] 0x60 PUSH1
- [ ] 0x61 PUSH2
- [ ] ... (through PUSH32)
- [ ] 0x7f PUSH32

### Dup (0x80-0x8f)
- [ ] 0x80 DUP1
- [ ] 0x81 DUP2
- [ ] ... (through DUP16)
- [ ] 0x8f DUP16

### Swap (0x90-0x9f)
- [ ] 0x90 SWAP1
- [ ] 0x91 SWAP2
- [ ] ... (through SWAP16)
- [ ] 0x9f SWAP16

### Logging (0xa0-0xa4)
- [ ] 0xa0 LOG0
- [ ] 0xa1 LOG1
- [ ] 0xa2 LOG2
- [ ] 0xa3 LOG3
- [ ] 0xa4 LOG4

### System (0xf0-0xff)
- [ ] 0xf0 CREATE
- [ ] 0xf1 CALL
- [ ] 0xf2 CALLCODE
- [ ] 0xf3 RETURN
- [ ] 0xf4 DELEGATECALL
- [ ] 0xf5 CREATE2
- [ ] 0xfa STATICCALL
- [ ] 0xfd REVERT
- [ ] 0xfe INVALID
- [ ] 0xff SELFDESTRUCT

---

## Notes

- This plan is comprehensive but should be treated as a living document
- Phases can be worked on in parallel where dependencies allow
- Testing should be written alongside implementation, not after
- Documentation should be updated as features are implemented
- The CLI can be developed incrementally alongside Core phases
- The Web Lab can start once Phase 3 is complete (basic programs work)
- Community and open source prep can happen at any time but should be complete before public launch
- Performance is NOT a primary goal, but basic profiling helps avoid egregious issues
- Completeness (all opcodes) is less important than correctness and clarity for implemented opcodes

**Success is measured by whether someone can finally understand what the EVM is doing.**
