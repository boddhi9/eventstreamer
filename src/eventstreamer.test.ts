import {Emitter} from './eventstreamer'

describe('Emitter', () => {
  let emitter: Emitter<string>

  beforeEach(() => {
    emitter = new Emitter<string>()
  })

  test('should subscribe and emit values to consumers', () => {
    const consumer = jest.fn()
    emitter.subscribe(consumer)

    emitter.emit('Test Value')

    expect(consumer).toHaveBeenCalledTimes(1)
    expect(consumer).toHaveBeenCalledWith('Test Value')
  })

  test('should unsubscribe a consumer', () => {
    const consumer = jest.fn()
    const subscription = emitter.subscribe(consumer)

    emitter.emit('First Call')
    subscription.unsubscribe()
    emitter.emit('Second Call')

    expect(consumer).toHaveBeenCalledTimes(1)
  })

  test('should prioritize consumers based on options', () => {
    const consumer1 = jest.fn(() => console.info('Consumer 1'))
    const consumer2 = jest.fn(() => console.info('Consumer 2'))

    emitter.subscribe(consumer1, {priority: 1})
    emitter.subscribe(consumer2, {priority: 10})

    const calls: string[] = []
    console.info = (msg: string) => calls.push(msg)

    emitter.emit('Priority Test')

    expect(calls).toEqual(['Consumer 2', 'Consumer 1'])
  })

  test('should handle once-off consumers', () => {
    const consumer = jest.fn()
    emitter.subscribe(consumer, {once: true})

    emitter.emit('Once Call')
    emitter.emit('Another Call')

    expect(consumer).toHaveBeenCalledTimes(1)
  })

  test('should debounce consumer calls', (done) => {
    jest.useFakeTimers()
    const consumer = jest.fn()
    emitter.subscribe(consumer, {debounce: 100})

    emitter.emit('Debounce Test')
    emitter.emit('Another Debounce Test')

    jest.advanceTimersByTime(100)

    expect(consumer).toHaveBeenCalledTimes(1)
    expect(consumer).toHaveBeenCalledWith('Another Debounce Test')
    jest.useRealTimers()
    done()
  })

  test('should throttle consumer calls', (done) => {
    jest.useFakeTimers()
    const consumer = jest.fn()
    emitter.subscribe(consumer, {throttle: 100})

    emitter.emit('Throttle Test 1')
    jest.advanceTimersByTime(50)
    emitter.emit('Throttle Test 2')
    jest.advanceTimersByTime(100)
    emitter.emit('Throttle Test 3')

    expect(consumer).toHaveBeenCalledTimes(2) // first and third call
    expect(consumer).toHaveBeenCalledWith('Throttle Test 1')
    expect(consumer).toHaveBeenCalledWith('Throttle Test 3')
    jest.useRealTimers()
    done()
  })

  test('should clear all consumers', () => {
    const consumer1 = jest.fn()
    const consumer2 = jest.fn()

    emitter.subscribe(consumer1)
    emitter.subscribe(consumer2)

    emitter.clear()
    emitter.emit('Clear Test')

    expect(consumer1).not.toHaveBeenCalled()
    expect(consumer2).not.toHaveBeenCalled()
  })

  test('should emit to a specific consumer', () => {
    const consumer1 = jest.fn()
    const consumer2 = jest.fn()

    emitter.subscribe(consumer1)
    emitter.subscribe(consumer2)

    emitter.emitToConsumer(consumer1, 'Specific Emit')

    expect(consumer1).toHaveBeenCalledWith('Specific Emit')
    expect(consumer2).not.toHaveBeenCalled()
  })
})
