// packages/evmix-core/src/debug/SnapshotManager.ts
import { Snapshot } from './Snapshot'

/**
 * SnapshotManager - handles checkpoint storage and retrieval
 */
export class SnapshotManager {
  private snapshots: Map<number, Snapshot> = new Map()
  private checkpointInterval: number

  constructor(checkpointInterval: number = 50) {
    this.checkpointInterval = checkpointInterval
  }

  /**
   * Store a snapshot at a specific step
   */
  store(stepIndex: number, snapshot: Snapshot): void {
    this.snapshots.set(stepIndex, snapshot)
  }

  /**
   * Get a snapshot at a specific step (or undefined if not stored)
   */
  get(stepIndex: number): Snapshot | undefined {
    return this.snapshots.get(stepIndex)
  }

  /**
   * Store snapshot if at a checkpoint interval
   */
  maybeCheckpoint(stepIndex: number, snapshot: Snapshot): void {
    if (stepIndex % this.checkpointInterval === 0) {
      this.store(stepIndex, snapshot)
    }
  }

  /**
   * Find the nearest checkpoint at or before the given step
   */
  getNearestCheckpoint(stepIndex: number): Snapshot | undefined {
    let nearest: Snapshot | undefined
    let nearestStep = -1

    for (const [step, snapshot] of this.snapshots) {
      if (step <= stepIndex && step > nearestStep) {
        nearestStep = step
        nearest = snapshot
      }
    }

    return nearest
  }

  /**
   * Invalidate all snapshots after a given step (for mutation/forking)
   */
  invalidateAfter(stepIndex: number): void {
    for (const step of this.snapshots.keys()) {
      if (step > stepIndex) {
        this.snapshots.delete(step)
      }
    }
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots.clear()
  }

  /**
   * Get checkpoint interval
   */
  getCheckpointInterval(): number {
    return this.checkpointInterval
  }
}
