export interface Subscription {
  unsubscribe(): void
}

export type Consumer<T> = (value: T) => void

export interface Publisher<T> {
  subscribe(consumer: Consumer<T>, options?: ConsumerOptions): Subscription
}

interface ConsumerOptions {
  priority?: number // higher-priority consumers are called first
  once?: boolean // unsubscribe after one emit
  debounce?: number // debounce time in milliseconds
  throttle?: number // throttle time in milliseconds
}

const EMPTY_SUBSCRIPTION: Subscription = {
  unsubscribe: () => {},
}

export class Emitter<T> implements Publisher<T> {
  private consumers = new Map<
    symbol,
    {consumer: Consumer<T>; options: ConsumerOptions}
  >()
  private lastEmitTimes = new Map<symbol, number>()
  private timers = new Map<symbol, ReturnType<typeof setTimeout>>()

  get size(): number {
    return this.consumers.size
  }

  /**
   * Subscribes a consumer to receive emitted values with optional behavior customization.
   * @param consumer - The function to be invoked with emitted values.
   * @param options - Optional behavior settings for this consumer.
   * @returns A Subscription object to unsubscribe.
   */
  subscribe(
    consumer: Consumer<T>,
    options: ConsumerOptions = {},
  ): Subscription {
    if (typeof consumer !== 'function') return EMPTY_SUBSCRIPTION
    const key = Symbol()
    this.consumers.set(key, {consumer, options})

    return {
      unsubscribe: () => {
        this.consumers.delete(key)
        this.clearTimers(key)
      },
    }
  }

  /**
   * Emits a value to all subscribed consumers, respecting their options.
   * @param value - The value to emit.
   */
  emit(value: T): void {
    const sortedConsumers = Array.from(this.consumers.entries()).sort(
      ([, a], [, b]) => (b.options.priority ?? 0) - (a.options.priority ?? 0),
    )

    for (const [key, {consumer, options}] of sortedConsumers) {
      if (options.once) {
        this.consumers.delete(key)
      }

      const now = Date.now()

      if (options.throttle) {
        const lastEmit = this.lastEmitTimes.get(key) ?? 0
        if (now - lastEmit < options.throttle) {
          continue
        }
        this.lastEmitTimes.set(key, now)
      }

      if (options.debounce) {
        this.clearTimers(key)
        const timer = setTimeout(() => consumer(value), options.debounce)
        this.timers.set(key, timer)
      } else {
        consumer(value)
      }
    }
  }

  /**
   * Emits a value to a specific consumer if it is subscribed.
   * @param consumer - The consumer to target.
   * @param value - The value to emit.
   */
  emitToConsumer(consumer: Consumer<T>, value: T): void {
    for (const {consumer: c, options} of this.consumers.values()) {
      if (c === consumer) {
        if (options.once) {
          this.unsubscribeConsumer(c)
        }
        c(value)
      }
    }
  }

  /** Clears all subscribed consumers. */
  clear(): void {
    this.consumers.clear()
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers.clear()
    this.lastEmitTimes.clear()
  }

  /**
   * Checks if a specific consumer is currently subscribed.
   * @param consumer - The consumer function to check.
   * @returns True if the consumer is subscribed, false otherwise.
   */
  isSubscribed(consumer: Consumer<T>): boolean {
    for (const {consumer: c} of this.consumers.values()) {
      if (c === consumer) return true
    }
    return false
  }

  /**
   * Unsubscribes a specific consumer if it is subscribed.
   * @param consumer - The consumer function to unsubscribe.
   */
  unsubscribeConsumer(consumer: Consumer<T>): void {
    for (const [key, {consumer: c}] of this.consumers.entries()) {
      if (c === consumer) {
        this.consumers.delete(key)
        this.clearTimers(key)
        break
      }
    }
  }

  private clearTimers(key: symbol): void {
    const timer = this.timers.get(key)
    if (timer !== undefined) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }
}
