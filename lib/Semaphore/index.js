"use strict";

const LOCKED = 0;
const CHANNEL = 1;
const CELL = 0;

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
    if (concurrency) Atomics.store(counter, CELL, concurrency);
  }

  enter() {
    const counter = this.#counter;
    while (true) {
      Atomics.wait(counter, CELL, LOCKED);
      const actual = Atomics.load(counter, CELL);
      if (actual <= LOCKED) continue;
      const desired = actual - CHANNEL;
      const prev = Atomics.compareExchange(counter, CELL, actual, desired);
      if (prev === actual) break;
    }
  }

  leave() {
    const counter = this.#counter;
    Atomics.add(counter, CELL, CHANNEL);
    Atomics.notify(counter, CELL, CHANNEL);
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
      Atomics.store(counter, CELL, concurrency);
      Atomics.store(counter, 1, concurrency);
    } else {
      this.#channels = Atomics.load(counter, 1);
    }
  }

  enter() {
    const counter = this.#counter;
    while (true) {
      Atomics.wait(counter, CELL, LOCKED);
      const actual = Atomics.load(counter, CELL);
      if (actual <= LOCKED) continue;
      const desired = actual - CHANNEL;
      const prev = Atomics.compareExchange(counter, CELL, actual, desired);
      if (prev === actual) break;
    }
  }

  leave() {
    const counter = this.#counter;
    Atomics.add(counter, CELL, CHANNEL);
    Atomics.notify(counter, CELL, CHANNEL);
  }

  exclusive() {
    const counter = this.#counter;
    const channels = this.#channels;
    while (true) {
      Atomics.wait(counter, CELL, LOCKED);
      const actual = Atomics.load(counter, CELL);
      if (actual !== channels) continue;
      const expected = Atomics.compareExchange(counter, CELL, channels, LOCKED);
      if (expected === channels) return void (this.#exclusive = true);
    }
  }

  leaveExclusive() {
    const counter = this.#counter;
    Atomics.store(counter, CELL, this.#channels);
    Atomics.notify(counter, CELL, CHANNEL);
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
