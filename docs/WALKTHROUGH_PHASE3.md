# EVMIX Phase 3 Walkthrough: Memory & Data

**Understanding how the EVM handles input, working memory, and output**

Building on Phases 1 and 2, this walkthrough explores how the EVM manages data - from receiving input to returning results.

---

## Table of Contents

1. [Why Memory and Data Matter](#why-memory-and-data-matter)
2. [Memory vs Stack](#memory-vs-stack)
3. [Memory Operations](#memory-operations)
4. [Calldata: Contract Input](#calldata-contract-input)
5. [Return and Revert](#return-and-revert)
6. [Memory Expansion Costs](#memory-expansion-costs)
7. [Common Patterns](#common-patterns)
8. [Real Contract Examples](#real-contract-examples)

---

## Why Memory and Data Matter

So far we've worked with:
- **Stack**: 256-bit values, max 1024 items
- **Control flow**: Jumps and loops

But real smart contracts need to:
- Accept variable-length input (transaction data)
- Work with bytes and strings
- Return results to callers
- Handle arrays and structs

Phase 3 adds three critical components:

1. **Memory**: Expandable byte array for working space
2. **Calldata**: Read-only input data
3. **Return/Revert**: Send results back

---

## Memory vs Stack

### The Stack (Review)

```
[Word256] 256-bit words
[Word256] Limited to 1024 items
[Word256] LIFO operations only
    ^
    top
```

**Good for:**
- Simple arithmetic
- Control flow
- Temporary values

**Bad for:**
- Byte-level operations
- Large data structures
- Variable-length data

### Memory

```
Memory: [byte][byte][byte][byte]...
         0     1     2     3
```

**Properties:**
- Byte-addressable (not word-addressable)
- Expandable (starts at 0 bytes)
- Expansion costs gas (quadratic!)
- Volatile (cleared between calls)

**Good for:**
- Working with bytes
- Building return data
- Temporary arrays
- ABI encoding

---

## Memory Operations

### MSTORE (0x52)

Store a 32-byte word to memory.

```
Name: MSTORE
Gas: 3 + expansion cost
Stack: [value, offset] → []
Effect: Writes 32 bytes to memory at offset
```

**Example:**

```typescript
// Store the value 42 at memory offset 0
const bytecode = new Uint8Array([
  0x60, 0x2a,  // PUSH1 42 (value)
  0x60, 0x00,  // PUSH1 0 (offset)
  0x52,        // MSTORE
  0x00,        // STOP
])

// Memory after: [0x00, 0x00, ..., 0x2a] (32 bytes total)
//                                   ^
//                        42 at byte 31 (big-endian)
```

**Key points:**
- Value is stored big-endian
- Always writes exactly 32 bytes
- Memory auto-expands if needed

### MLOAD (0x51)

Load a 32-byte word from memory.

```
Name: MLOAD
Gas: 3 + expansion cost
Stack: [offset] → [value]
Effect: Reads 32 bytes from memory
```

**Example:**

```typescript
// Store, then load
const bytecode = new Uint8Array([
  // Store 0x123 at offset 0
  0x61, 0x01, 0x23,  // PUSH2 0x0123
  0x60, 0x00,        // PUSH1 0
  0x52,              // MSTORE

  // Load it back
  0x60, 0x00,        // PUSH1 0
  0x51,              // MLOAD
  0x00,              // STOP
])

interpreter.run()
console.log(interpreter.getStack().peek().value)  // 0x0123
```

### MSTORE8 (0x53)

Store a single byte to memory.

```
Name: MSTORE8
Gas: 3 + expansion cost
Stack: [value, offset] → []
Effect: Writes 1 byte (least significant byte of value)
```

**Example:**

```typescript
// Build "Hi" in memory (0x4869)
const bytecode = new Uint8Array([
  0x60, 0x48,  // PUSH1 0x48 ('H')
  0x60, 0x00,  // PUSH1 0 (offset)
  0x53,        // MSTORE8

  0x60, 0x69,  // PUSH1 0x69 ('i')
  0x60, 0x01,  // PUSH1 1 (offset)
  0x53,        // MSTORE8

  // Load the word
  0x60, 0x00,  // PUSH1 0
  0x51,        // MLOAD
  0x00,        // STOP
])

// Memory: [0x48, 0x69, 0x00, 0x00, ...]
//          'H'   'i'
```

### MSIZE (0x59)

Get current memory size in bytes.

```
Name: MSIZE
Gas: 2
Stack: [] → [size]
Effect: Pushes memory size (always multiple of 32)
```

**Example:**

```typescript
const bytecode = new Uint8Array([
  0x59,        // MSIZE (initially 0)

  0x60, 0xff,  // PUSH1 255
  0x60, 0x00,  // PUSH1 0
  0x52,        // MSTORE (expands to 32 bytes)

  0x59,        // MSIZE (now 32)
  0x00,        // STOP
])

interpreter.run()
const size2 = interpreter.getStack().pop()
const size1 = interpreter.getStack().pop()

console.log(size1.value)  // 0
console.log(size2.value)  // 32
```

**Important**: Memory size is always rounded up to the next 32-byte word!

---

## Calldata: Contract Input

When you call a smart contract, you send **calldata** - the input to the function.

```
Transaction:
  to: 0x1234...
  data: 0x12345678...  ← This is calldata
```

### Calldata Properties

- **Read-only**: Cannot modify calldata
- **Cheap to read**: No expansion costs
- **Arbitrary length**: Can be 0 to millions of bytes
- **Zero-padded**: Reading beyond calldata returns zeros

### CALLDATASIZE (0x36)

Get the size of calldata in bytes.

```
Name: CALLDATASIZE
Gas: 2
Stack: [] → [size]
Effect: Pushes calldata length
```

**Example:**

```typescript
const bytecode = new Uint8Array([
  0x36,  // CALLDATASIZE
  0x00,  // STOP
])

const calldata = new Uint8Array([1, 2, 3, 4, 5])

const interpreter = new Interpreter({ bytecode, calldata, initialGas: 1000000n })
interpreter.run()

console.log(interpreter.getStack().peek().value)  // 5n
```

### CALLDATALOAD (0x35)

Load a 32-byte word from calldata.

```
Name: CALLDATALOAD
Gas: 3
Stack: [offset] → [value]
Effect: Reads 32 bytes from calldata (zero-pads if needed)
```

**Example:**

```typescript
const bytecode = new Uint8Array([
  0x60, 0x00,  // PUSH1 0 (offset)
  0x35,        // CALLDATALOAD
  0x00,        // STOP
])

// Calldata is a function selector (4 bytes)
const calldata = new Uint8Array([0x12, 0x34, 0x56, 0x78])

interpreter.run()

// Loads 0x12345678 followed by 28 zero bytes
console.log(interpreter.getStack().peek().toHex())
// "0x1234567800000000000000000000000000000000000000000000000000000000"
```

**Common pattern - extracting function selector:**

```typescript
// Function selector is first 4 bytes of calldata
const bytecode = new Uint8Array([
  0x60, 0x00,  // PUSH1 0
  0x35,        // CALLDATALOAD → [full_word]

  // Shift right 224 bits (28 bytes) to get first 4 bytes
  0x60, 0xe0,  // PUSH1 224
  0x1c,        // SHR → [selector]
])
```

### CALLDATACOPY (0x37)

Copy calldata to memory.

```
Name: CALLDATACOPY
Gas: 3 + 3 * words + expansion cost
Stack: [length, offset, destOffset] → []
Effect: Copies 'length' bytes from calldata[offset] to memory[destOffset]
```

**Example:**

```typescript
// Copy all calldata to memory
const bytecode = new Uint8Array([
  // Get calldata size
  0x36,        // CALLDATASIZE → [size]

  // CALLDATACOPY arguments
  0x60, 0x00,  // PUSH1 0 (source offset in calldata)
  0x60, 0x00,  // PUSH1 0 (dest offset in memory)
  0x37,        // CALLDATACOPY

  // Load from memory to verify
  0x60, 0x00,  // PUSH1 0
  0x51,        // MLOAD
  0x00,        // STOP
])

const calldata = new Uint8Array([0xde, 0xad, 0xbe, 0xef])

interpreter.run()
// Memory now contains: [0xde, 0xad, 0xbe, 0xef, 0x00, ...]
```

**Use cases:**
- Copy function arguments to memory
- Process variable-length data
- Build response data

---

## Return and Revert

Every contract execution must eventually halt. Phase 3 adds two ways to halt with data:

### RETURN (0xf3)

Halt successfully and return data to caller.

```
Name: RETURN
Gas: 0 + expansion cost
Stack: [length, offset] → (halts)
Effect: Reads memory[offset:offset+length] and returns it
```

**Example:**

```typescript
// Return "Hello"
const bytecode = new Uint8Array([
  // Write "Hello" to memory
  0x60, 0x48,  // PUSH1 'H'
  0x60, 0x00,  // PUSH1 0
  0x53,        // MSTORE8

  0x60, 0x65,  // PUSH1 'e'
  0x60, 0x01,  // PUSH1 1
  0x53,        // MSTORE8

  0x60, 0x6c,  // PUSH1 'l'
  0x60, 0x02,  // PUSH1 2
  0x53,        // MSTORE8

  0x60, 0x6c,  // PUSH1 'l'
  0x60, 0x03,  // PUSH1 3
  0x53,        // MSTORE8

  0x60, 0x6f,  // PUSH1 'o'
  0x60, 0x04,  // PUSH1 4
  0x53,        // MSTORE8

  // RETURN(offset=0, length=5)
  0x60, 0x05,  // PUSH1 5 (length)
  0x60, 0x00,  // PUSH1 0 (offset)
  0xf3,        // RETURN
])

interpreter.run()

console.log(interpreter.getHaltReason())  // "RETURN"

const returnData = interpreter.getState().returnData
console.log(Buffer.from(returnData).toString())  // "Hello"
```

### REVERT (0xfd)

Halt with an error and return error data.

```
Name: REVERT
Gas: 0 + expansion cost
Stack: [length, offset] → (halts)
Effect: Same as RETURN but signals failure
```

**Key difference from RETURN:**
- RETURN = success, state changes committed
- REVERT = failure, state changes rolled back

**Example:**

```typescript
// Revert with error message
const bytecode = new Uint8Array([
  // Store error message in memory
  // "Err"
  0x60, 0x45,  // PUSH1 'E'
  0x60, 0x00,  // PUSH1 0
  0x53,        // MSTORE8

  0x60, 0x72,  // PUSH1 'r'
  0x60, 0x01,  // PUSH1 1
  0x53,        // MSTORE8

  0x60, 0x72,  // PUSH1 'r'
  0x60, 0x02,  // PUSH1 2
  0x53,        // MSTORE8

  // REVERT(offset=0, length=3)
  0x60, 0x03,  // PUSH1 3
  0x60, 0x00,  // PUSH1 0
  0xfd,        // REVERT
])

interpreter.run()

console.log(interpreter.getHaltReason())  // "REVERT"

const returnData = interpreter.getState().returnData
console.log(Buffer.from(returnData).toString())  // "Err"
```

**Empty return/revert:**

```typescript
// RETURN() with no data
0x60, 0x00,  // PUSH1 0 (length)
0x60, 0x00,  // PUSH1 0 (offset)
0xf3,        // RETURN
```

---

## Memory Expansion Costs

Memory is **expensive** - the more you use, the more it costs (quadratically!).

### The Cost Formula

```
gas_cost = 3 * words + (words^2 / 512)

where words = ceil(size / 32)
```

**Why quadratic?**
- Prevents abuse (can't allocate infinite memory)
- Incentivizes efficient memory use
- Linear in storage size, but quadratic to discourage waste

### Example Costs

```typescript
const state = new MachineState(1000000n)

// Expand to 32 bytes (1 word)
const cost1 = state.expandMemory(0, 32)
console.log(cost1)  // 3 gas

// Expand to 64 bytes (2 words)
const cost2 = state.expandMemory(32, 32)
console.log(cost2)  // 3 more gas (total: 6)

// Expand to 320 bytes (10 words)
const cost3 = state.expandMemory(64, 256)
console.log(cost3)  // ~30 gas

// Expand to 3200 bytes (100 words)
const cost4 = state.expandMemory(320, 2880)
console.log(cost4)  // ~300 gas + quadratic term
```

### Memory Cost Visualization

```
Size (bytes)  |  Words  |  Cost (gas)
--------------|---------|-------------
32            |  1      |  3
64            |  2      |  6
128           |  4      |  12
256           |  8      |  24
512           |  16     |  48
1024          |  32     |  96
10240         |  320    |  ~1160
```

### Optimization Tips

1. **Reuse memory slots**: Overwrite instead of expanding
2. **Pack data tightly**: Use MSTORE8 for bytes
3. **Clear when done**: Memory is temporary anyway
4. **Batch operations**: One CALLDATACOPY is cheaper than many MLOAD/MSTORE

---

## Common Patterns

### Pattern 1: Echo (Return Input Unchanged)

```typescript
// Copy all calldata to memory and return it
const bytecode = new Uint8Array([
  0x36,        // CALLDATASIZE
  0x80,        // DUP1 (duplicate size for RETURN)
  0x60, 0x00,  // PUSH1 0 (src offset)
  0x60, 0x00,  // PUSH1 0 (dest offset)
  0x37,        // CALLDATACOPY
  0x60, 0x00,  // PUSH1 0 (offset for RETURN)
  0xf3,        // RETURN
])
```

### Pattern 2: Require (Conditional Revert)

```solidity
// Solidity: require(value > 10, "Too small")
```

**Bytecode equivalent:**

```typescript
const bytecode = new Uint8Array([
  // Get value from calldata
  0x60, 0x00,  // PUSH1 0
  0x35,        // CALLDATALOAD

  // Check if > 10
  0x60, 0x0a,  // PUSH1 10
  0x11,        // GT (value > 10?)

  // If true, jump to success
  0x60, 0x10,  // PUSH1 16 (success label)
  0x57,        // JUMPI

  // Revert with error
  0x60, 0x00,  // PUSH1 0
  0x60, 0x00,  // PUSH1 0
  0xfd,        // REVERT

  // Success (at 16)
  0x5b,        // JUMPDEST
  0x60, 0x00,  // PUSH1 0
  0x60, 0x00,  // PUSH1 0
  0xf3,        // RETURN
])
```

### Pattern 3: Memory as Scratch Space

```typescript
// Calculate: (a + b) * c, where a, b, c from calldata
const bytecode = new Uint8Array([
  // Load a from calldata[0:32]
  0x60, 0x00,  // PUSH1 0
  0x35,        // CALLDATALOAD → [a]

  // Load b from calldata[32:64]
  0x60, 0x20,  // PUSH1 32
  0x35,        // CALLDATALOAD → [a, b]

  // Add a + b
  0x01,        // ADD → [a+b]

  // Store to memory[0]
  0x60, 0x00,  // PUSH1 0
  0x52,        // MSTORE

  // Load c from calldata[64:96]
  0x60, 0x40,  // PUSH1 64
  0x35,        // CALLDATALOAD → [c]

  // Load (a+b) from memory
  0x60, 0x00,  // PUSH1 0
  0x51,        // MLOAD → [c, a+b]

  // Multiply
  0x02,        // MUL → [(a+b)*c]

  // Store result to memory
  0x60, 0x20,  // PUSH1 32
  0x52,        // MSTORE

  // Return result
  0x60, 0x20,  // PUSH1 32 (length)
  0x60, 0x20,  // PUSH1 32 (offset)
  0xf3,        // RETURN
])
```

### Pattern 4: Build Array in Memory

```typescript
// Return [1, 2, 3] as a 32-byte array
const bytecode = new Uint8Array([
  // Store 1 at offset 0
  0x60, 0x01,  // PUSH1 1
  0x60, 0x00,  // PUSH1 0
  0x52,        // MSTORE

  // Store 2 at offset 32
  0x60, 0x02,  // PUSH1 2
  0x60, 0x20,  // PUSH1 32
  0x52,        // MSTORE

  // Store 3 at offset 64
  0x60, 0x03,  // PUSH1 3
  0x60, 0x40,  // PUSH1 64
  0x52,        // MSTORE

  // Return 96 bytes (3 words)
  0x60, 0x60,  // PUSH1 96
  0x60, 0x00,  // PUSH1 0
  0xf3,        // RETURN
])
```

---

## Real Contract Examples

### Example 1: Simple Storage

```solidity
// Solidity
contract SimpleStorage {
  uint256 value;

  function set(uint256 x) public {
    value = x;
  }

  function get() public view returns (uint256) {
    return value;
  }
}
```

**Just the `get()` function in EVM bytecode:**

```typescript
const bytecode = new Uint8Array([
  // Function selector check (simplified)

  // Load value from storage slot 0
  0x60, 0x00,  // PUSH1 0 (storage slot)
  0x54,        // SLOAD (Phase 4!)

  // Store to memory
  0x60, 0x00,  // PUSH1 0
  0x52,        // MSTORE

  // Return
  0x60, 0x20,  // PUSH1 32
  0x60, 0x00,  // PUSH1 0
  0xf3,        // RETURN
])
```

### Example 2: Add Two Numbers

```solidity
// Solidity
function add(uint256 a, uint256 b) public pure returns (uint256) {
  return a + b;
}
```

**EVM bytecode:**

```typescript
const bytecode = new Uint8Array([
  // Skip function selector (first 4 bytes)
  // Load a from calldata[4:36]
  0x60, 0x04,  // PUSH1 4
  0x35,        // CALLDATALOAD

  // Load b from calldata[36:68]
  0x60, 0x24,  // PUSH1 36
  0x35,        // CALLDATALOAD

  // Add them
  0x01,        // ADD

  // Store result to memory
  0x60, 0x00,  // PUSH1 0
  0x52,        // MSTORE

  // Return result
  0x60, 0x20,  // PUSH1 32
  0x60, 0x00,  // PUSH1 0
  0xf3,        // RETURN
])

// Call with: calldata = [selector, a, b]
const calldata = new Uint8Array([
  0x00, 0x00, 0x00, 0x00,  // Function selector (simplified)
  ...Array(28).fill(0), 0x00, 0x00, 0x00, 0x0a,  // a = 10
  ...Array(28).fill(0), 0x00, 0x00, 0x00, 0x14,  // b = 20
])

interpreter.run()
const returnData = interpreter.getState().returnData
// returnData contains 30 (0x1e)
```

### Example 3: String Reverser

```typescript
// Input: "Hello" → Output: "olleH"
const bytecode = new Uint8Array([
  // Get length
  0x36,        // CALLDATASIZE

  // For each byte, write to memory in reverse
  // (This is complex - would need a loop)
  // Simplified: just copy and return
  0x80,        // DUP1 (duplicate size)
  0x60, 0x00,  // PUSH1 0
  0x60, 0x00,  // PUSH1 0
  0x37,        // CALLDATACOPY

  // Return
  0x60, 0x00,  // PUSH1 0
  0xf3,        // RETURN
])
```

---

## Edge Cases and Gotchas

### 1. Reading Beyond Memory

```typescript
// Memory is [0x42, 0x00, 0x00, ...]  (only 32 bytes allocated)

// Try to read at offset 64
0x60, 0x40,  // PUSH1 64
0x51,        // MLOAD

// Result: All zeros (memory auto-expands with zeros)
// But you pay gas for the expansion!
```

### 2. Reading Beyond Calldata

```typescript
// Calldata is [0xAA, 0xBB]  (2 bytes)

// Try to read 32 bytes at offset 0
0x60, 0x00,  // PUSH1 0
0x35,        // CALLDATALOAD

// Result: 0xAABB000000...  (zero-padded, no error)
// And it's free! (No expansion cost for calldata)
```

### 3. MSTORE vs MSTORE8

```typescript
// MSTORE stores 32 bytes
0x60, 0xff,  // PUSH1 255
0x60, 0x00,  // PUSH1 0
0x52,        // MSTORE
// Memory: [0x00, ..., 0x00, 0xff] (32 bytes)

// MSTORE8 stores 1 byte
0x60, 0xff,  // PUSH1 255
0x60, 0x00,  // PUSH1 0
0x53,        // MSTORE8
// Memory: [0xff, 0x00, 0x00, ...] (only 1 byte)
```

### 4. Memory is Temporary

```typescript
// Memory is cleared between external calls!
// CALL to another contract
// → Your memory is reset

// But calldata persists for the entire transaction
```

---

## Summary

You now understand:

✅ **Memory** - Byte-addressable working space for contracts

✅ **MLOAD/MSTORE** - Read and write 32-byte words

✅ **MSTORE8** - Write individual bytes

✅ **Calldata** - Read-only input from transaction

✅ **CALLDATALOAD/COPY** - Access input data

✅ **RETURN/REVERT** - Send results back to caller

✅ **Memory expansion** - Quadratic gas costs incentivize efficiency

### The Complete Data Flow

```
Transaction Data (Calldata)
        ↓
    [Read only]
        ↓
    CALLDATALOAD / CALLDATACOPY
        ↓
    Memory (Working space)
        ↓
    MLOAD / MSTORE / MSTORE8
        ↓
    Stack (Computation)
        ↓
    MSTORE (Build result)
        ↓
    RETURN / REVERT
        ↓
    Return Data (Output)
```

### Key Insights

1. **Stack is for computation** - Use it for arithmetic and control flow

2. **Memory is for construction** - Build return data, process arrays

3. **Calldata is immutable** - Copy to memory if you need to modify

4. **Always expand carefully** - Memory costs grow quadratically

5. **Return efficiently** - Only return what's needed

---

## Exercises

### Exercise 1: Sum Array

Write bytecode that:
- Accepts an array of numbers in calldata
- Sums them
- Returns the sum

### Exercise 2: Byte Counter

Write bytecode that:
- Accepts arbitrary bytes in calldata
- Counts how many are non-zero
- Returns the count

### Exercise 3: Memory Swap

Write bytecode that:
- Stores value A at memory[0]
- Stores value B at memory[32]
- Swaps them
- Returns both values

### Exercise 4: Conditional Return

Write bytecode that:
- Reads a value from calldata
- If value > 100, return it doubled
- Otherwise, revert

### Exercise 5: Gas Optimization

Compare the gas cost of:
- Copying 64 bytes of calldata vs 256 bytes
- Using MSTORE vs multiple MSTORE8 operations
- Returning 32 bytes vs 320 bytes

---

## What's Next?

**Phase 4 (World Interaction):**
- SLOAD/SSTORE for persistent storage
- BALANCE, ADDRESS, CALLER for context
- CALL for calling other contracts
- LOG for emitting events

**Phase 5 (Debugging):**
- Breakpoints on specific opcodes
- Watch memory/storage changes
- Time travel through execution
- Trace replay and analysis

---

## Key Takeaways

With Phase 3, you can now write contracts that:
- Accept input (calldata)
- Process data (memory + stack)
- Return results (return data)
- Handle errors gracefully (revert)

**This is the complete execution model!** Everything else in the EVM builds on this foundation.

Smart contracts are now **interactive** - they receive input, compute, and respond.

Next: Learn how to persist data across transactions with storage in Phase 4.

Happy coding! 🚀
