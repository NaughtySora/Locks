"use strict";

const LOCKED = 0;
const CHANNEL = 1;

class Semaphore {
  #counter = null;
  #offset = 0;

  constructor(buffer, { offset = 0, concurrency } = {}) {
    const size = Semaphore.#size;
    if (buffer.byteLength < size) {
      throw new Error(`SharedArrayBuffer should be at least ${size} bytes`);
    }
    const counter = this.#counter = new Int32Array(buffer, offset, CHANNEL);
    this.#offset = offset;
    if (concurrency) Atomics.store(counter, 0, concurrency);
  }

  enter() {
    const counter = this.#counter;
    const offset = this.#offset;
    while (true) {
      Atomics.wait(counter, offset, LOCKED);
      const actual = Atomics.load(counter, offset);
      if (actual <= LOCKED) continue;
      const desired = actual - CHANNEL;
      const prev = Atomics.compareExchange(counter, offset, actual, desired);
      if (prev === actual) break;
    }
  }

  leave() {
    const counter = this.#counter;
    const offset = this.#offset;
    Atomics.add(counter, offset, CHANNEL);
    Atomics.notify(counter, offset, CHANNEL);
  }

  [Symbol.dispose]() {
    this.leave();
  }

  get size() {
    return Semaphore.#size;
  }

  static #size = Int32Array.BYTES_PER_ELEMENT;
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
      Atomics.store(counter, 0, concurrency);
      Atomics.store(counter, 1, concurrency);
    } else {
      this.#channels = Atomics.load(counter, 1);
    }
  }

  enter() {
    const counter = this.#counter;
    const offset = this.#offset;
    while (true) {
      Atomics.wait(counter, offset, LOCKED);
      const actual = Atomics.load(counter, offset);
      if (actual <= LOCKED) continue;
      const desired = actual - CHANNEL;
      const prev = Atomics.compareExchange(counter, offset, actual, desired);
      if (prev === actual) break;
    }
  }

  leave() {
    const counter = this.#counter;
    const offset = this.#offset;
    Atomics.add(counter, offset, CHANNEL);
    Atomics.notify(counter, offset, CHANNEL);
  }

  exclusive() {
    const counter = this.#counter;
    const offset = this.#offset;
    const channels = this.#channels;
    while (true) {
      Atomics.wait(counter, offset, LOCKED);
      const actual = Atomics.load(counter, offset);
      if (actual !== channels) continue;
      const expected = Atomics.compareExchange(counter, offset, channels, LOCKED);
      if (expected === channels) return void (this.#exclusive = true);
    }
  }

  leaveExclusive() {
    const counter = this.#counter;
    const offset = this.#offset;
    Atomics.store(counter, offset, this.#channels);
    Atomics.notify(counter, offset, CHANNEL);
    this.#exclusive = false;
  }

  [Symbol.dispose]() {
    if (this.#exclusive) this.leaveExclusive();
    else this.leave();
  }

  get size() {
    return ExclusiveSemaphore.#size;
  }

  static #size = Int32Array.BYTES_PER_ELEMENT * 2;
}

module.exports = { Semaphore, ExclusiveSemaphore };
