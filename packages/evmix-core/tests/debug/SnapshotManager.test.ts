// packages/evmix-core/tests/debug/SnapshotManager.test.ts
import { describe, it, expect } from 'vitest'
import { SnapshotManager } from '../../src/debug/SnapshotManager'
import { createSnapshot } from '../../src/debug/Snapshot'
import { Word256 } from '../../src/types/Word256'

describe('SnapshotManager', () => {
  function makeSnapshot(stepIndex: number) {
    return createSnapshot(
      stepIndex,
      stepIndex * 2, // pc
      1000000n - BigInt(stepIndex * 100), // gas
      [Word256.from(BigInt(stepIndex))], // stack
      new Uint8Array(0),
      new Uint8Array(0),
      false
    )
  }

  it('should store and retrieve snapshots', () => {
    const manager = new SnapshotManager()
    const snapshot = makeSnapshot(5)
    manager.store(5, snapshot)
    expect(manager.get(5)).toEqual(snapshot)
  })

  it('should auto-checkpoint at intervals', () => {
    const manager = new SnapshotManager(10) // checkpoint every 10 steps
    for (let i = 0; i <= 25; i++) {
      manager.maybeCheckpoint(i, makeSnapshot(i))
    }
    // Should have checkpoints at 0, 10, 20
    expect(manager.get(0)).toBeDefined()
    expect(manager.get(10)).toBeDefined()
    expect(manager.get(20)).toBeDefined()
    expect(manager.get(5)).toBeUndefined()
  })

  it('should find nearest earlier checkpoint', () => {
    const manager = new SnapshotManager(10)
    manager.store(0, makeSnapshot(0))
    manager.store(10, makeSnapshot(10))
    manager.store(20, makeSnapshot(20))

    const nearest = manager.getNearestCheckpoint(15)
    expect(nearest?.stepIndex).toBe(10)
  })

  it('should invalidate snapshots after a step', () => {
    const manager = new SnapshotManager(10)
    manager.store(0, makeSnapshot(0))
    manager.store(10, makeSnapshot(10))
    manager.store(20, makeSnapshot(20))

    manager.invalidateAfter(10)

    expect(manager.get(0)).toBeDefined()
    expect(manager.get(10)).toBeDefined()
    expect(manager.get(20)).toBeUndefined()
  })
})
