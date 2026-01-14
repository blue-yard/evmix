import { useState } from 'react'
import { useDebugStore } from '../store/debugStore'

// Example bytecodes for quick testing
const EXAMPLES = [
  {
    name: 'Simple Add',
    bytecode: '6005600401',
    description: 'PUSH1 5, PUSH1 4, ADD -> 9 on stack',
  },
  {
    name: 'Storage Write',
    bytecode: '602a60005500',
    description: 'Store 42 at slot 0',
  },
  {
    name: 'Loop (5 iterations)',
    bytecode: '6005600080600190039160055780600057',
    description: 'Count down from 5 to 0',
  },
]

export function BytecodeInput() {
  const [input, setInput] = useState('')
  const [gas, setGas] = useState('1000000')
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

    loadBytecode({
      bytecode: bytes,
      initialGas: BigInt(gas),
    })
  }

  const loadExample = (hex: string) => {
    setInput(hex)
  }

  return (
    <div className="bg-evmix-panel border border-evmix-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-evmix-muted mb-3">
        LOAD BYTECODE
      </h2>

      {/* Examples */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.name}
            onClick={() => loadExample(ex.bytecode)}
            className="text-xs bg-evmix-bg hover:bg-evmix-border px-2 py-1 rounded"
            title={ex.description}
          >
            {ex.name}
          </button>
        ))}
      </div>

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter bytecode (hex)..."
        className="w-full h-20 bg-evmix-bg border border-evmix-border rounded p-2 text-sm font-mono resize-none"
      />

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
