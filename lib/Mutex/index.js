"use strict";

const LOCKED = 0;
const UNLOCKED = 1;

class Mutex {
  #offset = 0;
  #lock = null;

  constructor(buffer, offset = 0) {
    const lock = new Int32Array(buffer, offset, UNLOCKED);
    this.#lock = lock
    this.#offset = offset;
    Atomics.store(lock, offset, UNLOCKED);
  }

  enter() {
    const offset = this.#offset;
    const lock = this.#lock;
    let expected = Atomics.exchange(lock, offset, LOCKED);
    while (expected !== UNLOCKED) {
      Atomics.wait(lock, offset, UNLOCKED);
      expected = Atomics.exchange(lock, offset, LOCKED);
    }
  }

  leave() {
    const offset = this.#offset;
    const lock = this.#lock;
    Atomics.store(lock, offset, UNLOCKED);
    Atomics.notify(lock, offset, UNLOCKED);
  }

  isolate(fn, ...args) {
    this.enter();
    fn.apply(fn, args);
    this.leave();
  }

  [Symbol.dispose]() {
    this.leave();
  }

  static #size = Int32Array.BYTES_PER_ELEMENT;

  get size() {
    return Mutex.#size;
  }
}


module.exports = Mutex;
