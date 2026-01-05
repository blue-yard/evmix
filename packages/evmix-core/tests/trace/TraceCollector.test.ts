import { describe, it, expect } from 'vitest'
import { TraceCollector } from '../../src/trace/TraceCollector'
import { TraceEventBuilder } from '../../src/trace/TraceEvent'
import { Word256 } from '../../src/types/Word256'
import { HaltReason } from '../../src/state/HaltReason'

describe('TraceCollector', () => {
  it('initializes empty', () => {
    const collector = new TraceCollector()
    expect(collector.getEventCount()).toBe(0)
    expect(collector.getEvents()).toEqual([])
  })

  it('records events', () => {
    const collector = new TraceCollector()
    const event1 = TraceEventBuilder.opcodeStart(0, 0, 1000n, 0x01, 'ADD')
    const event2 = TraceEventBuilder.stackPush(1, 0, 997n, Word256.fromNumber(42))

    collector.record(event1)
    collector.record(event2)

    expect(collector.getEventCount()).toBe(2)
    expect(collector.getEvents()[0]).toEqual(event1)
    expect(collector.getEvents()[1]).toEqual(event2)
  })

  it('generates sequential indices', () => {
    const collector = new TraceCollector()
    expect(collector.getNextIndex()).toBe(0)
    expect(collector.getNextIndex()).toBe(1)
    expect(collector.getNextIndex()).toBe(2)
  })

  it('filters events by type', () => {
    const collector = new TraceCollector()
    collector.record(TraceEventBuilder.opcodeStart(0, 0, 1000n, 0x01, 'ADD'))
    collector.record(TraceEventBuilder.stackPush(1, 0, 997n, Word256.fromNumber(42)))
    collector.record(TraceEventBuilder.stackPop(2, 0, 997n, Word256.fromNumber(10)))
    collector.record(TraceEventBuilder.stackPush(3, 0, 994n, Word256.fromNumber(52)))

    const stackPushEvents = collector.getEventsByType('stack.push')
    expect(stackPushEvents.length).toBe(2)
    expect(stackPushEvents[0].type).toBe('stack.push')
  })

  it('clears events', () => {
    const collector = new TraceCollector()
    collector.record(TraceEventBuilder.opcodeStart(0, 0, 1000n, 0x01, 'ADD'))
    collector.record(TraceEventBuilder.stackPush(1, 0, 997n, Word256.fromNumber(42)))

    collector.clear()
    expect(collector.getEventCount()).toBe(0)
    expect(collector.getNextIndex()).toBe(0)
  })

  it('exports to JSON', () => {
    const collector = new TraceCollector()
    collector.record(TraceEventBuilder.opcodeStart(0, 0, 1000n, 0x01, 'ADD'))
    collector.record(TraceEventBuilder.halt(1, 5, 500n, HaltReason.STOP))

    const json = collector.toJSON()
    expect(json).toBeTruthy()

    const parsed = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBe(2)
    expect(parsed[0].type).toBe('opcode.start')
    expect(parsed[1].type).toBe('halt')
  })

  it('imports from JSON', () => {
    const collector = new TraceCollector()
    collector.record(TraceEventBuilder.opcodeStart(0, 0, 1000n, 0x01, 'ADD'))
    collector.record(TraceEventBuilder.halt(1, 5, 500n, HaltReason.STOP))

    const json = collector.toJSON()
    const imported = TraceCollector.fromJSON(json)

    expect(imported.getEventCount()).toBe(2)
    expect(imported.getEvents()[0].type).toBe('opcode.start')
    expect(imported.getEvents()[1].type).toBe('halt')
  })

  it('clones collector', () => {
    const collector = new TraceCollector()
    collector.record(TraceEventBuilder.opcodeStart(0, 0, 1000n, 0x01, 'ADD'))

    const cloned = collector.clone()
    expect(cloned.getEventCount()).toBe(1)

    collector.record(TraceEventBuilder.stackPush(1, 0, 997n, Word256.fromNumber(42)))
    expect(collector.getEventCount()).toBe(2)
    expect(cloned.getEventCount()).toBe(1)
  })
})
