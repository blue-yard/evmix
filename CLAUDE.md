**EVMIX** is an open-source, educational implementation of the Ethereum Virtual Machine designed to make EVM execution *legible*.# EVMIX — An Observable, Educational Ethereum Virtual Machine

## 1. Product Vision

**EVMIX** is an open-source, educational implementation of the Ethereum Virtual Machine designed to make EVM execution *legible*.

Where production clients optimize for throughput, consensus correctness, and network integration, EVMIX optimizes for:
- **Observability**
- **Inspectability**
- **Determinism**
- **Pedagogical clarity**

EVMIX is to the EVM what **MINIX** was to operating systems:  
a real system, simplified and structured so that people can *understand how it works*.

The project has two distinct but complementary outputs:

1. **EVMIX Core**  
   A standalone, embeddable EVM interpreter + debugger library.
2. **EVMIX Lab (Web)**  
   A browser-based learning environment built on top of EVMIX Core, with rich visualizations and interactive controls.

They live in separate repositories (or packages) with a clean, explicit interface between them.

---

## 2. Target Audience

Primary:
- Smart contract developers who want to *actually* understand the EVM
- Systems programmers learning virtual machines and interpreters
- Students and educators teaching blockchain internals

Secondary:
- Tooling authors (debuggers, analyzers, formal methods)
- Researchers experimenting with EVM semantics
- Curious engineers coming from OS / PL backgrounds

Non-goals:
- Running mainnet
- Competing with geth, reth, nethermind
- Performance benchmarks
- Consensus, networking, or block sync

---

## 3. Core Design Principles

### 3.1 Observability First
Every meaningful action the VM takes is:
- Explicit
- Structured
- Emitted as data

Nothing is hidden behind opaque internal state transitions.

### 3.2 Determinism
Given:
- bytecode
- calldata
- environment
- host state

EVMIX produces:
- identical traces
- identical state transitions
- identical halting reasons

This enables replay, time travel, and offline visualization.

### 3.3 Separation of Concerns
- **Execution ≠ Visualization**
- **Semantics ≠ UI**
- **Core ≠ Host**
- **Interpreter ≠ Debugger orchestration**

The VM can run headless forever; the UI is just a consumer.

### 3.4 Minimal but Faithful
- Fewer features than mainline EVM
- But *correct* semantics for what is implemented
- Forks added incrementally and explicitly

---

## 4. High-Level Architecture

```text
evmix/
  packages/
    evmix-core/        ← EVM interpreter + tracing + replay
    evmix-host/        ← In-memory host + fixtures
    evmix-cli/         ← CLI + REPL + trace exporter
    evmix-spec/        ← Opcode docs, invariants, learning material
    evmix-ui/          ← Web-based visual lab (separate repo optional)


⸻

5. EVMIX Core (Standalone Product)

5.1 Responsibilities
	•	Parse and execute EVM bytecode
	•	Maintain machine state
	•	Interact with a pluggable host
	•	Emit structured execution events
	•	Support stepping, breakpoints, and replay

5.2 Non-Responsibilities
	•	Networking
	•	Trie implementation
	•	Block synchronization
	•	Mempool
	•	Consensus rules beyond what execution requires

⸻

6. Core Concepts & Data Model

6.1 Machine State

interface MachineState {
  pc: number
  gasRemaining: bigint
  stack: Word256[]
  memory: Uint8Array
  returnData: Uint8Array
  halted: boolean
  haltReason?: HaltReason
}

6.2 World State (via Host)

interface Host {
  getAccount(address): Account
  setAccount(address, account): void
  sload(address, key): Word256
  sstore(address, key, value): void
  getCode(address): Uint8Array
  call(callFrame): CallResult
}

6.3 Execution Result

interface ExecutionResult {
  finalState: MachineState
  returnData: Uint8Array
  trace: TraceEvent[]
}


⸻

7. Trace & Observability Model (Critical)

7.1 Trace Events as the Primary Interface

Trace events are the product surface.

They are:
	•	JSON-serializable
	•	Append-only
	•	Semantically rich

Examples:

{ type: "opcode.start", pc, opcode, gas }
{ type: "stack.pop", value }
{ type: "stack.push", value }
{ type: "memory.write", offset, bytes }
{ type: "storage.read", address, key, value }
{ type: "storage.write", address, key, value }
{ type: "gas.charge", amount, reason }
{ type: "jump", from, to, valid }
{ type: "halt", reason }

7.2 Why This Matters
	•	UI never has to infer behavior
	•	Breakpoints are predicates over events
	•	Traces can be replayed offline
	•	Execution can be visualized without re-running code

⸻

8. Debug & Control API

8.1 DebugSession

class DebugSession {
  step(n?: number): StepResult
  run(): ExecutionResult
  runUntil(predicate): ExecutionResult
  reset(): void
  setBreakpoint(bp): void
  clearBreakpoints(): void
  mutateWorld(mutator): void
  exportTrace(): Trace
  importTrace(trace): void
}

8.2 Time Travel
	•	Periodic snapshots (configurable)
	•	Deterministic replay between snapshots
	•	Enables reverse stepping and scrubbing

⸻

9. Opcode Implementation Strategy
	•	One opcode = one function (or file)
	•	Clear preconditions and postconditions
	•	Validation separated from execution where possible
	•	Explicit gas accounting

Opcode files include:
	•	English description
	•	Stack effect
	•	Common pitfalls
	•	Links to Yellow Paper section

⸻

10. Fork & Versioning Strategy
	•	Start with Frontier-era semantics
	•	Forks added as opt-in execution modes
	•	Each fork documents:
	•	What changed
	•	Why it matters
	•	Observable differences in traces

⸻

11. Testing Strategy

11.1 Unit Tests
	•	Opcode-level golden tests
	•	Stack/memory/storage invariants

11.2 Trace Tests
	•	Given input → exact expected trace
	•	Diff-friendly output

11.3 External Vectors (Later)
	•	Ethereum Foundation EVM tests (selective)
	•	Used to validate correctness, not completeness

⸻

12. EVMIX CLI

Features:
	•	Run bytecode from hex
	•	Step execution interactively
	•	Dump traces to JSON
	•	Load traces and replay
	•	Simple REPL mode

Purpose:
	•	Learning without the browser
	•	Scripting
	•	CI and regression testing

⸻

13. EVMIX Lab (Web Product)

13.1 Purpose

A learning environment, not just a debugger.

13.2 Core Features
	•	Step-by-step execution
	•	Timeline scrubber (time travel)
	•	Visual stack (256-bit words rendered clearly)
	•	Memory viewer (byte-level + hex)
	•	Storage diff viewer
	•	Gas burn visualization
	•	Opcode explanation panel
	•	Breakpoints and watchpoints
	•	Editable world state (“what if?”)

13.3 Architecture
	•	Pure frontend app (React or similar)
	•	Talks only to DebugSession
	•	Can load:
	•	Live sessions
	•	Saved traces
	•	Example programs

⸻

14. Educational Content Strategy
	•	Curated bytecode examples:
	•	Arithmetic
	•	Control flow
	•	Memory tricks
	•	Reverts
	•	Storage patterns
	•	Guided walkthroughs:
	•	“What actually happens when you call a contract?”
	•	“Why SSTORE is expensive”
	•	Fork diffs as lessons

⸻

15. Open Source Strategy

15.1 Licensing
	•	MIT or Apache-2.0
	•	Friendly to reuse in tools and education

15.2 Contribution Philosophy
	•	Readability > cleverness
	•	Explicit over abstract
	•	Tests + docs required for new opcodes
	•	Trace compatibility is a stability promise

15.3 Community Hooks
	•	“Good first opcode” issues
	•	Visual bugs welcome
	•	Teaching material PRs encouraged

⸻

16. Milestone Plan (Conceptual)

Phase 1: Core Skeleton
	•	Stack machine
	•	Arithmetic
	•	STOP
	•	Tracing infra

Phase 2: Control Flow
	•	PC
	•	JUMP/JUMPI
	•	JUMPDEST validation

Phase 3: Memory & Data
	•	Memory expansion
	•	CALLDATA
	•	RETURN / REVERT

Phase 4: World Interaction
	•	SLOAD / SSTORE
	•	LOGs
	•	Minimal CALL

Phase 5: Debug Power
	•	Breakpoints
	•	Snapshots
	•	Time travel

Phase 6: Web Lab
	•	Visual stack/memory
	•	Timeline
	•	Examples

⸻

17. Success Criteria

EVMIX is successful if:
	•	Someone can explain the EVM by watching it run
	•	A student can step through a contract without reading the Yellow Paper
	•	Tooling authors reuse the core for experiments
	•	The codebase remains small, legible, and opinionated

⸻

18. North Star

“I finally understand what the EVM is doing.”

If EVMIX reliably produces that reaction, it’s working.

