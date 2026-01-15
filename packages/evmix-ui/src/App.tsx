import { useState, useMemo } from 'react'
import { BytecodeInput } from './components/BytecodeInput'
import { Timeline } from './components/Timeline'
import { StackPanel, MemoryPanel, StoragePanel } from './components/panels'
import { GasMeter } from './components/GasMeter'
import { ProgramView } from './components/ProgramView'
import { useDebugStore } from './store/debugStore'

type ActivePanel = 'stack' | 'memory' | 'storage'

/**
 * Detect which areas changed at the current step
 */
function useChangeIndicators() {
  const events = useDebugStore((s) => s.events)
  const currentStep = useDebugStore((s) => s.currentStep)
  const session = useDebugStore((s) => s.session)

  return useMemo(() => {
    if (!session || currentStep === 0) {
      return { stackChanged: false, memoryChanged: false, storageChanged: false }
    }

    // Get events for the current step only (not cumulative)
    const allEvents = session.getEvents()

    // Find events that happened at this step
    // Events are indexed, we need to find those between step-1 and step
    let opcodeCount = 0
    let stackChanged = false
    let memoryChanged = false
    let storageChanged = false

    for (const event of allEvents) {
      if (event.type === 'opcode.start') {
        opcodeCount++
        // Reset flags for each new opcode
        if (opcodeCount === currentStep) {
          // This is our current step, check subsequent events until next opcode
          stackChanged = false
          memoryChanged = false
          storageChanged = false
        }
        if (opcodeCount > currentStep) break
      }

      // Only count events for the current step
      if (opcodeCount === currentStep) {
        if (event.type === 'stack.push' || event.type === 'stack.pop') {
          stackChanged = true
        }
        if (event.type === 'memory.write') {
          memoryChanged = true
        }
        if (event.type === 'storage.write' || event.type === 'storage.read') {
          storageChanged = true
        }
      }
    }

    return { stackChanged, memoryChanged, storageChanged }
  }, [session, events, currentStep])
}

export default function App() {
  const session = useDebugStore((s) => s.session)
  const [activePanel, setActivePanel] = useState<ActivePanel>('stack')
  const { stackChanged, memoryChanged, storageChanged } = useChangeIndicators()

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
                  changed={stackChanged}
                  changeColor="text-green-400"
                >
                  Stack
                </PanelTab>
                <PanelTab
                  active={activePanel === 'memory'}
                  onClick={() => setActivePanel('memory')}
                  changed={memoryChanged}
                  changeColor="text-yellow-400"
                >
                  Memory
                </PanelTab>
                <PanelTab
                  active={activePanel === 'storage'}
                  onClick={() => setActivePanel('storage')}
                  changed={storageChanged}
                  changeColor="text-orange-400"
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
  changed?: boolean
  changeColor?: string
}

function PanelTab({ active, onClick, children, changed, changeColor = 'text-evmix-accent' }: PanelTabProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
        active
          ? 'bg-evmix-accent text-black'
          : 'text-evmix-muted hover:text-evmix-text hover:bg-evmix-border/50'
      }`}
    >
      {children}
      {/* Change indicator - show when not active and there's a change */}
      {changed && !active && (
        <span
          className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${changeColor} bg-current animate-pulse`}
          title="Changed at this step"
        />
      )}
      {/* Subtle indicator when active */}
      {changed && active && (
        <span
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-black/50"
          title="Changed at this step"
        />
      )}
    </button>
  )
}
