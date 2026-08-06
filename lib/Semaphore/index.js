"use strict";

const LOCKED = 0;
const CHANNEL = 1;
const INDEX = 0;
const SEMAPHORE_SIZE = Int32Array.BYTES_PER_ELEMENT;
const ERROR_SEMAPHORE_SIZE =
  `SharedArrayBuffer should be at least ${SEMAPHORE_SIZE} bytes`;

class Semaphore {
  #counter = null;
  #offset = 0;

  constructor(buffer, { offset = 0, concurrency } = {}) {
    if (buffer.byteLength < SEMAPHORE_SIZE) {
      throw new Error(ERROR_SEMAPHORE_SIZE);
    }
    this.#counter = new Int32Array(buffer, offset, CHANNEL);
    this.#offset = offset;
    if (concurrency) Atomics.store(this.#counter, INDEX, concurrency);
  }

  enter() {
    const counter = this.#counter;
    while (true) {
      Atomics.wait(counter, INDEX, LOCKED);
      const actual = Atomics.load(counter, INDEX);
      if (actual <= LOCKED) continue;
      const desired = actual - CHANNEL;
      const prev = Atomics.compareExchange(counter, INDEX, actual, desired);
      if (prev === actual) break;
    }
  }

  leave() {
    const counter = this.#counter;
    Atomics.add(counter, INDEX, CHANNEL);
    Atomics.notify(counter, INDEX, CHANNEL);
  }

  [Symbol.dispose]() {
    this.leave();
  }

  get size() {
    return SEMAPHORE_SIZE;
  }
}

class ExclusiveSemaphore {
  #counter = null;
  #offset = 0;
  #channels = 0;
  #exclusive = false;

  constructor(buffer, { offset = 0, concurrency } = {}) {
    const size = ExclusiveSemaphore.#size;
    if (buffer.byteLength < size) {
      throw new Error(`SharedArrayBuffer should be at least ${size} bytes`);
    }
    const counter = this.#counter = new Int32Array(buffer, offset, 2);
    this.#offset = offset;
    if (concurrency) {
      Atomics.store(counter, INDEX, concurrency);
      Atomics.store(counter, 1, concurrency);
    } else {
      this.#channels = Atomics.load(counter, 1);
    }
  }

  enter() {
    const counter = this.#counter;
    while (true) {
      Atomics.wait(counter, INDEX, LOCKED);
      const actual = Atomics.load(counter, INDEX);
      if (actual <= LOCKED) continue;
      const desired = actual - CHANNEL;
      const prev = Atomics.compareExchange(counter, INDEX, actual, desired);
      if (prev === actual) break;
    }
  }

  leave() {
    const counter = this.#counter;
    Atomics.add(counter, INDEX, CHANNEL);
    Atomics.notify(counter, INDEX, CHANNEL);
  }

  exclusive() {
    const counter = this.#counter;
    const channels = this.#channels;
    while (true) {
      Atomics.wait(counter, INDEX, LOCKED);
      const actual = Atomics.load(counter, INDEX);
      if (actual !== channels) continue;
      const expected = Atomics.compareExchange(counter, INDEX, channels, LOCKED);
      if (expected === channels) return void (this.#exclusive = true);
    }
  }

  leaveExclusive() {
    const counter = this.#counter;
    Atomics.store(counter, INDEX, this.#channels);
    Atomics.notify(counter, INDEX, CHANNEL);
    this.#exclusive = false;
  }

  [Symbol.dispose]() {
    if (this.#exclusive) this.leaveExclusive();
    else this.leave();
  }

  get size() {
    return ExclusiveSemaphore.#size;
  }

  static #size = SEMAPHORE_SIZE * 2;
}

module.exports = { Semaphore, ExclusiveSemaphore };
