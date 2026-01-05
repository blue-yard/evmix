import { TraceEvent } from './TraceEvent'

/**
 * TraceCollector - Collects and manages trace events during execution
 *
 * This is the append-only log of everything the VM does.
 */

export class TraceCollector {
  private events: TraceEvent[]
  private nextIndex: number

  constructor() {
    this.events = []
    this.nextIndex = 0
  }

  /**
   * Record an event
   */
  record(event: TraceEvent): void {
    this.events.push(event)
  }

  /**
   * Get the next event index and increment
   */
  getNextIndex(): number {
    return this.nextIndex++
  }

  /**
   * Get all events
   */
  getEvents(): TraceEvent[] {
    return [...this.events]
  }

  /**
   * Get events filtered by type
   */
  getEventsByType<T extends TraceEvent>(type: string): T[] {
    return this.events.filter((e) => e.type === type) as T[]
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = []
    this.nextIndex = 0
  }

  /**
   * Export events as JSON string
   */
  toJSON(): string {
    return JSON.stringify(
      this.events,
      (_key, value) => {
        // Convert bigints to strings for JSON serialization
        if (typeof value === 'bigint') {
          return value.toString()
        }
        return value
      },
      2
    )
  }

  /**
   * Import events from JSON string
   */
  static fromJSON(json: string): TraceCollector {
    const collector = new TraceCollector()
    const parsed = JSON.parse(json)

    if (!Array.isArray(parsed)) {
      throw new Error('Invalid trace JSON: expected array of events')
    }

    collector.events = parsed
    collector.nextIndex = parsed.length

    return collector
  }

  /**
   * Clone the collector
   */
  clone(): TraceCollector {
    const cloned = new TraceCollector()
    cloned.events = [...this.events]
    cloned.nextIndex = this.nextIndex
    return cloned
  }
}
