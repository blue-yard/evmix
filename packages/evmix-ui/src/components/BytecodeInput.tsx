import { useState } from 'react'
import { useDebugStore } from '../store/debugStore'

interface Example {
  name: string
  bytecode: string
  description: string
  solidity?: string  // Solidity source (shown in tooltip)
  calldata?: string  // Optional calldata to use
  category: 'basic' | 'arithmetic' | 'storage' | 'memory' | 'control' | 'advanced'
}

// Example bytecodes for quick testing
const EXAMPLES: Example[] = [
  // === BASIC ===
  {
    name: 'Simple Add',
    category: 'basic',
    bytecode: '6005600401',
    description: 'PUSH1 5, PUSH1 4, ADD → 9 on stack',
    solidity: `// Pure stack arithmetic
// No Solidity equivalent - direct EVM
//
// PUSH1 0x05  ; push 5
// PUSH1 0x04  ; push 4
// ADD         ; 5 + 4 = 9`,
  },
  {
    name: 'Multiply',
    category: 'basic',
    bytecode: '6007600602',
    description: 'PUSH1 7, PUSH1 6, MUL → 42 on stack',
    solidity: `// Pure stack arithmetic
// result = 6 * 7  // = 42
//
// PUSH1 0x07  ; push 7
// PUSH1 0x06  ; push 6
// MUL         ; 6 * 7 = 42`,
  },
  {
    name: 'Comparison',
    category: 'basic',
    bytecode: '600560031060056003111060056003101010',
    description: 'Compare 3 and 5: LT, GT, EQ',
    solidity: `// Comparison operators
// 3 < 5  → 1 (true)
// 3 > 5  → 0 (false)
// 3 == 5 → 0 (false)
//
// PUSH1 5, PUSH1 3, LT  ; 3 < 5 = 1
// PUSH1 5, PUSH1 3, GT  ; 3 > 5 = 0
// PUSH1 5, PUSH1 3, EQ  ; 3 == 5 = 0`,
  },

  // === STORAGE ===
  {
    name: 'Storage Write',
    category: 'storage',
    bytecode: '602a60005500',
    description: 'Store 42 at slot 0',
    solidity: `// Solidity equivalent:
uint256 value;  // slot 0

function set() {
    value = 42;
}

// PUSH1 0x2a  ; push 42
// PUSH1 0x00  ; slot 0
// SSTORE      ; storage[0] = 42
// STOP`,
  },
  {
    name: 'Counter++',
    category: 'storage',
    bytecode: '600054600101600055',
    description: 'Increment storage slot 0',
    solidity: `// Solidity equivalent:
uint256 counter;  // slot 0

function increment() {
    counter++;
}

// PUSH1 0x00  ; slot 0
// SLOAD       ; load counter
// PUSH1 0x01  ; push 1
// ADD         ; counter + 1
// PUSH1 0x00  ; slot 0
// SSTORE      ; store back`,
  },
  {
    name: 'Multi-Slot',
    category: 'storage',
    bytecode: '600a600055601460015560286002556000546001540160025401',
    description: 'Write to 3 slots, then sum them',
    solidity: `// Solidity equivalent:
uint256 a;  // slot 0 = 10
uint256 b;  // slot 1 = 20
uint256 c;  // slot 2 = 40

function sumAll() returns (uint256) {
    return a + b + c;  // = 70
}

// Store: slot[0]=10, slot[1]=20, slot[2]=40
// Then load and sum: 10 + 20 + 40 = 70`,
  },

  // === MEMORY ===
  {
    name: 'Memory Store',
    category: 'memory',
    bytecode: '7f48656c6c6f2c20576f726c6421000000000000000000000000000000000000006000526014600060206000a0',
    description: 'Store "Hello, World!" in memory, emit as log',
    solidity: `// Solidity equivalent:
event Log(bytes data);

function hello() {
    emit Log("Hello, World!");
}

// PUSH32 "Hello, World!\\0..."
// PUSH1 0x00
// MSTORE        ; store at memory[0]
// LOG0          ; emit log with memory data`,
  },
  {
    name: 'Return Value',
    category: 'memory',
    bytecode: '602a60005260206000f3',
    description: 'Return 42 as bytes32',
    solidity: `// Solidity equivalent:
function getAnswer() returns (uint256) {
    return 42;
}

// PUSH1 0x2a  ; push 42
// PUSH1 0x00  ; memory offset
// MSTORE      ; store 42 at memory[0:32]
// PUSH1 0x20  ; 32 bytes
// PUSH1 0x00  ; from offset 0
// RETURN      ; return memory[0:32]`,
  },
  {
    name: 'Echo Calldata',
    category: 'memory',
    bytecode: '36600060003736600060003760006000f3',
    description: 'Copy calldata to memory and return it',
    calldata: '0xdeadbeef',
    solidity: `// Solidity equivalent:
function echo(bytes calldata data)
    returns (bytes memory) {
    return data;
}

// CALLDATASIZE      ; get size of input
// PUSH1 0x00        ; dst offset
// PUSH1 0x00        ; src offset
// CALLDATACOPY      ; copy to memory
// CALLDATASIZE      ; size again
// PUSH1 0x00        ; offset
// RETURN            ; return the data`,
  },

  // === CONTROL FLOW ===
  {
    name: 'Loop (5x)',
    category: 'control',
    bytecode: '60056000805b600190910190600510600657',
    description: 'Count from 0 to 5 in a loop',
    solidity: `// Solidity equivalent:
function countToFive() returns (uint256) {
    uint256 i = 0;
    while (i < 5) {
        i++;
    }
    return i;  // = 5
}

// PUSH1 5     ; limit
// PUSH1 0     ; counter = 0
// JUMPDEST    ; loop start
// PUSH1 1, ADD; counter++
// DUP2, DUP2  ; copy limit, counter
// LT          ; counter < limit?
// PUSH1 loop  ; loop address
// JUMPI       ; if true, jump back`,
  },
  {
    name: 'Conditional',
    category: 'control',
    bytecode: '6001601057600a6000526016565b60146000525b602060006000a0',
    description: 'If-else: condition ? 20 : 10',
    solidity: `// Solidity equivalent:
function choose(bool cond) returns (uint256) {
    if (cond) {
        return 20;
    } else {
        return 10;
    }
}

// PUSH1 0x01      ; condition (true)
// PUSH1 then_addr ; jump target
// JUMPI           ; if true, jump
// PUSH1 10        ; else: value = 10
// PUSH1 0, MSTORE
// PUSH1 end, JUMP
// JUMPDEST        ; then:
// PUSH1 20        ; value = 20
// PUSH1 0, MSTORE
// JUMPDEST        ; end:
// LOG0            ; emit result`,
  },
  {
    name: 'Nested Loop',
    category: 'control',
    bytecode: '60006000600360005b600160005b60019091019060031060115760019091019060031060085700',
    description: '3x3 nested loop (9 iterations total)',
    solidity: `// Solidity equivalent:
function nestedLoop() returns (uint256) {
    uint256 count = 0;
    for (uint i = 0; i < 3; i++) {
        for (uint j = 0; j < 3; j++) {
            count++;
        }
    }
    return count;  // = 9
}

// Outer loop: i from 0 to 2
//   Inner loop: j from 0 to 2
//     count++
// Result: 9 iterations`,
  },

  // === ADVANCED ===
  {
    name: 'Fibonacci(10)',
    category: 'advanced',
    bytecode: '600060016000600a5b60019003908101906001820391908201918215600a5750',
    description: 'Calculate 10th Fibonacci number iteratively',
    solidity: `// Solidity equivalent:
function fibonacci(uint n) returns (uint) {
    uint a = 0;
    uint b = 1;
    for (uint i = 0; i < n; i++) {
        (a, b) = (b, a + b);
    }
    return a;  // fib(10) = 55
}

// Iterative fibonacci:
// Start: a=0, b=1, n=10
// Loop: a,b = b,a+b; n--
// Result: 55 on stack`,
  },
  {
    name: 'Factorial(5)',
    category: 'advanced',
    bytecode: '600160055b6001900381810290600182111560065750',
    description: 'Calculate 5! = 120',
    solidity: `// Solidity equivalent:
function factorial(uint n) returns (uint) {
    uint result = 1;
    while (n > 1) {
        result *= n;
        n--;
    }
    return result;  // 5! = 120
}

// result = 1, n = 5
// Loop: result *= n; n--
// Until n <= 1
// Result: 120 on stack`,
  },
  {
    name: 'Max of 3',
    category: 'advanced',
    bytecode: '600560076003828211600f578091505b82821160195780915050505b50',
    description: 'Find max(3, 7, 5) = 7',
    solidity: `// Solidity equivalent:
function max3(uint a, uint b, uint c)
    returns (uint) {
    uint result = a;
    if (b > result) result = b;
    if (c > result) result = c;
    return result;
}

// Push 3, 7, 5
// Compare and keep maximum
// Result: 7`,
  },
  {
    name: 'Func Dispatch',
    category: 'advanced',
    bytecode: '600035601c52600060006004601c20636d4ce63c14602a576391b7f5ed14603a5760006000fd5b602a60005260206000f35b60016000540160005560206000f3',
    description: 'Function selector dispatch (like Solidity)',
    calldata: '0x6d4ce63c',  // get() selector
    solidity: `// Solidity equivalent:
uint256 value;

function get() returns (uint256) {
    return 42;
}

function increment() returns (uint256) {
    value++;
    return value;
}

// Load first 4 bytes of calldata
// Compare to function selectors:
//   0x6d4ce63c = get()
//   0x91b7f5ed = increment()
// Jump to matching function
// Calldata: 0x6d4ce63c (get)`,
  },
  {
    name: 'Bitwise Ops',
    category: 'advanced',
    bytecode: '60ff600f16608060041b600f60041c17600f60ff1818',
    description: 'AND, OR, XOR, SHL, SHR operations',
    solidity: `// Solidity equivalent:
function bitwiseOps() {
    uint a = 0xff;
    uint b = 0x0f;

    uint and_result = a & b;   // 0x0f
    uint shifted = b << 4;     // 0xf0
    uint shr_result = b >> 4;  // 0x00
    uint or_result = and_result | shifted;
    uint xor_result = a ^ b;   // 0xf0
}

// Demonstrates: AND, OR, XOR, SHL, SHR`,
  },
]

const CATEGORY_LABELS: Record<Example['category'], string> = {
  basic: 'Basic',
  arithmetic: 'Arithmetic',
  storage: 'Storage',
  memory: 'Memory',
  control: 'Control Flow',
  advanced: 'Advanced',
}

const CATEGORY_ORDER: Example['category'][] = ['basic', 'storage', 'memory', 'control', 'advanced']

export function BytecodeInput() {
  const [input, setInput] = useState('')
  const [calldata, setCalldata] = useState('')
  const [gas, setGas] = useState('1000000')
  const [showAllExamples, setShowAllExamples] = useState(false)
  const { loadBytecode, isLoading, error } = useDebugStore()

  const handleLoad = () => {
    // Parse hex string to bytes
    const cleanHex = input.replace(/^0x/, '').replace(/\s/g, '')
    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
      alert('Invalid hex string')
      return
    }

    const bytes = new Uint8Array(
      cleanHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []
    )

    // Parse calldata if provided
    let calldataBytes: Uint8Array | undefined
    if (calldata) {
      const cleanCalldata = calldata.replace(/^0x/, '').replace(/\s/g, '')
      if (/^[0-9a-fA-F]*$/.test(cleanCalldata)) {
        calldataBytes = new Uint8Array(
          cleanCalldata.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []
        )
      }
    }

    loadBytecode({
      bytecode: bytes,
      initialGas: BigInt(gas),
      calldata: calldataBytes,
    })
  }

  const loadExample = (example: Example) => {
    setInput(example.bytecode)
    setCalldata(example.calldata ?? '')
  }

  // Group examples by category
  const groupedExamples = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    examples: EXAMPLES.filter((ex) => ex.category === category),
  }))

  // For collapsed view, show just first few examples
  const quickExamples = EXAMPLES.slice(0, 6)

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">
        LOAD BYTECODE
      </h2>

      {/* Examples */}
      {!showAllExamples ? (
        // Collapsed view - quick examples
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-2">
            {quickExamples.map((ex) => (
              <ExampleButton key={ex.name} example={ex} onClick={loadExample} />
            ))}
          </div>
          <button
            onClick={() => setShowAllExamples(true)}
            className="text-xs text-evmix-accent hover:underline"
          >
            Show all {EXAMPLES.length} examples...
          </button>
        </div>
      ) : (
        // Expanded view - grouped by category
        <div className="mb-4 space-y-3">
          {groupedExamples.map(({ category, label, examples }) => (
            <div key={category}>
              <div className="text-xs text-evmix-muted mb-1 font-semibold">{label}</div>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex) => (
                  <ExampleButton key={ex.name} example={ex} onClick={loadExample} />
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowAllExamples(false)}
            className="text-xs text-evmix-accent hover:underline"
          >
            Show less
          </button>
        </div>
      )}

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter bytecode (hex)..."
        className="w-full h-20 bg-evmix-bg border border-evmix-border rounded p-2 text-sm font-mono resize-none"
      />

      {/* Calldata Input */}
      <div className="mt-2">
        <label className="text-xs text-evmix-muted block mb-1">Calldata (optional):</label>
        <input
          type="text"
          value={calldata}
          onChange={(e) => setCalldata(e.target.value)}
          placeholder="0x..."
          className="w-full bg-evmix-bg border border-evmix-border rounded px-2 py-1 text-sm font-mono"
        />
      </div>

      {/* Gas Input */}
      <div className="flex items-center gap-2 mt-2">
        <label className="text-sm text-evmix-muted">Gas:</label>
        <input
          type="number"
          value={gas}
          onChange={(e) => setGas(e.target.value)}
          className="w-32 bg-evmix-bg border border-evmix-border rounded px-2 py-1 text-sm"
        />
      </div>

      {/* Load Button */}
      <button
        onClick={handleLoad}
        disabled={isLoading || !input}
        className="mt-4 w-full bg-evmix-accent hover:bg-evmix-accent/80 text-black font-semibold py-2 rounded disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Load & Execute'}
      </button>

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-evmix-error">{error}</p>
      )}
    </div>
  )
}

interface ExampleButtonProps {
  example: Example
  onClick: (example: Example) => void
}

function ExampleButton({ example, onClick }: ExampleButtonProps) {
  // Build tooltip with Solidity source
  const tooltip = example.solidity
    ? `${example.description}\n\n${example.solidity}`
    : example.description

  return (
    <button
      onClick={() => onClick(example)}
      className="text-xs bg-evmix-bg hover:bg-evmix-border px-2 py-1 rounded transition-colors"
      title={tooltip}
    >
      {example.name}
      {example.calldata && (
        <span className="ml-1 text-evmix-accent" title="Has calldata">*</span>
      )}
    </button>
  )
}
