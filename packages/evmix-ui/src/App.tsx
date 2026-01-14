import { BytecodeInput } from './components/BytecodeInput'
import { Timeline } from './components/Timeline'
import { StackPanel, MemoryPanel, StoragePanel } from './components/panels'
import { GasMeter } from './components/GasMeter'
import { OpcodeDisplay } from './components/OpcodeDisplay'
import { useDebugStore } from './store/debugStore'

export default function App() {
  const session = useDebugStore((s) => s.session)

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-evmix-accent">EVMIX Lab</h1>
        <p className="text-evmix-muted text-sm">
          An observable, educational Ethereum Virtual Machine
        </p>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Sidebar - Input */}
        <div className="col-span-3 space-y-4">
          <BytecodeInput />
          {session && <GasMeter />}
          {session && <OpcodeDisplay />}
        </div>

        {/* Main Content - State Panels */}
        <div className="col-span-9 space-y-4">
          {session ? (
            <>
              {/* Timeline */}
              <Timeline />

              {/* State Panels */}
              <div className="grid grid-cols-3 gap-4">
                <StackPanel />
                <MemoryPanel />
                <StoragePanel />
              </div>
            </>
          ) : (
            <div className="bg-evmix-panel border border-evmix-border rounded-lg p-8 text-center">
              <p className="text-evmix-muted">
                Load bytecode to start debugging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
