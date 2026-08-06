"use strict";

const LOCKED = 0;
const UNLOCKED = 1;
const INDEX = 0;

class Mutex {
  #offset = 0;
  #lock = null;

  constructor(buffer, offset = 0) {
    const lock = new Int32Array(buffer, offset, UNLOCKED);
    this.#lock = lock
    this.#offset = offset;
    Atomics.store(lock, INDEX, UNLOCKED);
  }

  enter() {
    const lock = this.#lock;
    let expected = Atomics.exchange(lock, INDEX, LOCKED);
    while (expected !== UNLOCKED) {
      Atomics.wait(lock, INDEX, UNLOCKED);
      expected = Atomics.exchange(lock, INDEX, LOCKED);
    }
  }

  leave() {
    const lock = this.#lock;
    Atomics.store(lock, INDEX, UNLOCKED);
    Atomics.notify(lock, INDEX, UNLOCKED);
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
