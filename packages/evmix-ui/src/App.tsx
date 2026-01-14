import { useState } from 'react'
import { BytecodeInput } from './components/BytecodeInput'
import { Timeline } from './components/Timeline'
import { StackPanel, MemoryPanel, StoragePanel } from './components/panels'
import { GasMeter } from './components/GasMeter'
import { ProgramView } from './components/ProgramView'
import { useDebugStore } from './store/debugStore'

type ActivePanel = 'stack' | 'memory' | 'storage'

export default function App() {
  const session = useDebugStore((s) => s.session)
  const [activePanel, setActivePanel] = useState<ActivePanel>('stack')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex-none p-4 border-b border-evmix-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-evmix-accent">EVMIX Lab</h1>
            <p className="text-evmix-muted text-sm">
              An observable, educational Ethereum Virtual Machine
            </p>
          </div>
          {session && <GasMeter />}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Input & State Panels */}
        <div className="w-80 flex-none border-r border-evmix-border overflow-y-auto p-4 space-y-4">
          <BytecodeInput />

          {session && (
            <>
              {/* Panel Tabs */}
              <div className="flex gap-1 bg-evmix-bg rounded-lg p-1">
                <PanelTab
                  active={activePanel === 'stack'}
                  onClick={() => setActivePanel('stack')}
                >
                  Stack
                </PanelTab>
                <PanelTab
                  active={activePanel === 'memory'}
                  onClick={() => setActivePanel('memory')}
                >
                  Memory
                </PanelTab>
                <PanelTab
                  active={activePanel === 'storage'}
                  onClick={() => setActivePanel('storage')}
                >
                  Storage
                </PanelTab>
              </div>

              {/* Active Panel */}
              {activePanel === 'stack' && <StackPanel />}
              {activePanel === 'memory' && <MemoryPanel />}
              {activePanel === 'storage' && <StoragePanel />}
            </>
          )}
        </div>

        {/* Main Content - Program View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {session ? (
            <>
              {/* Timeline */}
              <div className="flex-none p-4 border-b border-evmix-border">
                <Timeline />
              </div>

              {/* Program View */}
              <div className="flex-1 overflow-hidden p-4">
                <ProgramView className="h-full" />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4 opacity-20">{'{ }'}</div>
                <p className="text-evmix-muted text-lg">
                  Load bytecode to start debugging
                </p>
                <p className="text-evmix-muted text-sm mt-2">
                  Paste hex bytecode or use an example program
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface PanelTabProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function PanelTab({ active, onClick, children }: PanelTabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
        active
          ? 'bg-evmix-accent text-black'
          : 'text-evmix-muted hover:text-evmix-text hover:bg-evmix-border/50'
      }`}
    >
      {children}
    </button>
  )
}
