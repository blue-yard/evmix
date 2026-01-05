# EVMIX Documentation Index

A guide to all the documentation in this project.

## For Learners (Start Here!)

### 1. [GETTING_STARTED.md](./GETTING_STARTED.md)
**Your first stop.** Installation, setup, and your first program.

- ⏱️ Time: 10 minutes
- 🎯 Goal: Get EVMIX running and see it work
- 📝 Prerequisites: None - just basic programming knowledge

### 2. [WALKTHROUGH_PHASE1.md](./WALKTHROUGH_PHASE1.md)
**Deep dive into EVM fundamentals.** Comprehensive educational guide.

- ⏱️ Time: 30-60 minutes
- 🎯 Goal: Understand how the EVM actually works
- 📝 Prerequisites: Complete Getting Started first
- 📚 Topics covered:
  - What is the EVM?
  - Stack machines
  - 256-bit arithmetic
  - Opcodes and bytecode
  - Gas metering
  - Trace events
  - Memory model

### 3. [examples/basic-arithmetic.ts](./examples/basic-arithmetic.ts)
**Runnable code examples.** 7 complete programs demonstrating Phase 1 features.

- ⏱️ Time: 15 minutes to run and read
- 🎯 Goal: See real EVM programs executing
- 📝 Prerequisites: Installation complete
- 🚀 Run with: `pnpm --filter @evmix/core example`

## For Contributors

### [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
**Complete project roadmap.** 400+ tasks across 6 phases.

- 📋 All planned features
- ✅ What's done vs. what's next
- 📐 Architectural decisions
- 🗺️ Full opcode checklist

### [PROGRESS.md](./PROGRESS.md)
**Current status report.** Phase 1 completion details and Phase 2 planning.

- ✅ Phase 1: Complete (100%)
- 🚧 Phase 2: Not started
- 📊 Metrics: Tests, coverage, LOC
- 🎯 Next steps

## Project Vision

### [../CLAUDE.md](../CLAUDE.md)
**Why EVMIX exists.** Product vision and design philosophy.

- 🎨 Design principles (Observability, Determinism, Separation of Concerns)
- 🏗️ Architecture decisions
- 🎓 Educational goals
- 🎯 Success criteria

### [../README.md](../README.md)
**Project overview.** What EVMIX is and how to use it.

- 📝 Quick start
- 🔥 Key features
- 📦 Package structure
- 🧪 Testing info
- 📚 Links to all documentation

## Source Code Documentation

All source code includes extensive inline documentation:

### Core Types
- `packages/evmix-core/src/types/Word256.ts` - 256-bit integers
- `packages/evmix-core/src/types/Address.ts` - Ethereum addresses

### State Management
- `packages/evmix-core/src/state/Stack.ts` - The EVM stack
- `packages/evmix-core/src/state/MachineState.ts` - Execution state
- `packages/evmix-core/src/state/HaltReason.ts` - Halt conditions

### Observability
- `packages/evmix-core/src/trace/TraceEvent.ts` - Event definitions
- `packages/evmix-core/src/trace/TraceCollector.ts` - Event collection

### Execution
- `packages/evmix-core/src/interpreter/Interpreter.ts` - Main loop
- `packages/evmix-core/src/opcodes/Opcode.ts` - Opcode definitions
- `packages/evmix-core/src/opcodes/arithmetic.ts` - ADD, MUL, SUB, DIV
- `packages/evmix-core/src/opcodes/system.ts` - STOP

### Tests (Great for Learning!)
- `packages/evmix-core/tests/` - 117 tests showing how everything works

## Documentation by Audience

### "I want to learn how the EVM works"

1. Read [GETTING_STARTED.md](./GETTING_STARTED.md) (10 min)
2. Run [examples/basic-arithmetic.ts](./examples/basic-arithmetic.ts) (5 min)
3. Read [WALKTHROUGH_PHASE1.md](./WALKTHROUGH_PHASE1.md) (45 min)
4. Try the exercises in the walkthrough (30+ min)
5. Browse the source code with new understanding

### "I want to use EVMIX in my project"

1. Read [GETTING_STARTED.md](./GETTING_STARTED.md)
2. Check [../README.md](../README.md) for API usage
3. Look at [examples/](./examples/) for patterns
4. Browse tests in `packages/evmix-core/tests/` for advanced usage
5. Read inline docs in source code for API details

### "I want to contribute to EVMIX"

1. Read [../CLAUDE.md](../CLAUDE.md) to understand the vision
2. Check [PROGRESS.md](./PROGRESS.md) for current status
3. Review [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for what's next
4. Read the source code (it's designed to be readable!)
5. Pick a task from Phase 2 in the implementation plan
6. Write tests first, then implement
7. Update docs as you go

### "I'm teaching blockchain/EVM concepts"

1. Read [WALKTHROUGH_PHASE1.md](./WALKTHROUGH_PHASE1.md) yourself first
2. Use [examples/basic-arithmetic.ts](./examples/basic-arithmetic.ts) for demonstrations
3. Have students write their own programs
4. Use trace events to show what's happening
5. Assign exercises from the walkthrough
6. Build on EVMIX as the course progresses (Phases 2-6)

## Documentation Coverage

| Topic | Coverage | Documents |
|-------|----------|-----------|
| Installation | ✅ Complete | GETTING_STARTED.md |
| Basic Usage | ✅ Complete | README.md, GETTING_STARTED.md |
| EVM Fundamentals | ✅ Complete | WALKTHROUGH_PHASE1.md |
| Code Examples | ✅ Complete | examples/basic-arithmetic.ts |
| API Reference | ✅ Inline docs | Source code comments |
| Architecture | ✅ Complete | CLAUDE.md |
| Roadmap | ✅ Complete | IMPLEMENTATION_PLAN.md |
| Current Status | ✅ Complete | PROGRESS.md |
| Contributing | ⚠️ Partial | Mentioned in README |
| Advanced Topics | ⏸️ Phase 2+ | Coming in future phases |

## Quick Reference

### Most Common Questions

**Q: Where do I start?**
→ [GETTING_STARTED.md](./GETTING_STARTED.md)

**Q: How does the EVM work?**
→ [WALKTHROUGH_PHASE1.md](./WALKTHROUGH_PHASE1.md)

**Q: How do I write EVM programs?**
→ [examples/basic-arithmetic.ts](./examples/basic-arithmetic.ts) + Walkthrough

**Q: What's implemented so far?**
→ [PROGRESS.md](./PROGRESS.md)

**Q: What's coming next?**
→ [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

**Q: Why does EVMIX exist?**
→ [../CLAUDE.md](../CLAUDE.md)

**Q: How do I use this API?**
→ Source code inline docs + tests

**Q: How can I contribute?**
→ [PROGRESS.md](./PROGRESS.md) + [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

## Documentation TODOs (Future)

As the project grows, we may add:

- [ ] API Reference (auto-generated from TypeDoc)
- [ ] Video Walkthroughs
- [ ] Interactive Tutorials
- [ ] Cookbook of Common Patterns
- [ ] Performance Guide
- [ ] Testing Best Practices
- [ ] Contributing Guidelines (detailed)
- [ ] Architecture Decision Records (ADRs)
- [ ] Comparison with Other EVMs
- [ ] Integration Examples

## Keeping Documentation Updated

Documentation is a first-class citizen in EVMIX:

- ✅ All PRs must update relevant docs
- ✅ New features require documentation
- ✅ New opcodes require entries in WALKTHROUGH
- ✅ Examples should demonstrate real use cases
- ✅ Tests serve as executable documentation

**If you find outdated docs, that's a bug - please report it!**

---

## Navigation

**Root Level:**
- [../README.md](../README.md) - Project overview
- [../CLAUDE.md](../CLAUDE.md) - Product vision

**docs/ Directory:**
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Installation and first steps
- [WALKTHROUGH_PHASE1.md](./WALKTHROUGH_PHASE1.md) - Educational deep dive
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Complete roadmap
- [PROGRESS.md](./PROGRESS.md) - Current status
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - This file
- [examples/](./examples/) - Code examples

**Source Code:**
- [../packages/evmix-core/src/](../packages/evmix-core/src/) - Implementation
- [../packages/evmix-core/tests/](../packages/evmix-core/tests/) - Tests

---

**Now pick your path and start learning! 🚀**
