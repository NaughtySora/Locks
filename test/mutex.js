"use strict";

const threads = require("node:worker_threads");
const Mutex = require("../lib/Mutex/index.js");
const os = require("node:os");
const assert = require("node:assert");
const { Worker, workerData, isMainThread, threadId } = threads;
const { range, spawn } = require('../util/index.js');
const { it } = require("node:test");

if (isMainThread) {
  const limit = os.availableParallelism();
  const workers = new Map();
  const workerData = new SharedArrayBuffer(8);
  const TEST_TIME = 6e4;
  const { forEach } = Iterator.prototype;
  
  const finish = () => {
    forEach.call(
      workers.values(),
      worker => worker.terminate(),
    );
  };

  process.on("SIGINT", () => {
    finish();
    console.log("Graceful shutdown [Mutex]");
    process.exit(0);
  });

  forEach.call(range(limit), () => spawn({ file: __filename, workerData, workers }));

  setTimeout(() => {
    finish();
    console.log(`tests timeout ${TEST_TIME} [Mutex]`);
  }, TEST_TIME);

} else {
  const mutex = new Mutex(workerData);
  const array = new Uint8Array(workerData, 4);

  if (threadId % 2 === 0) {
    it("Mutex-read: manually", () => {
      const timer = setTimeout(() => {
        mutex.enter();
        const element = array[0];
        assert.strictEqual(array[1], element);
        assert.strictEqual(array[2], element);
        assert.strictEqual(array[3], element);
        mutex.leave();
        timer.refresh();
      }, 0);
    });

    it("Mutex-read: Symbol.dispose", () => {
      const timer = setTimeout(() => {
        mutex.enter();
        const element = array[0];
        assert.strictEqual(array[1], element);
        assert.strictEqual(array[2], element);
        assert.strictEqual(array[3], element);
        mutex[Symbol.dispose]();
        timer.refresh();
      }, 0);
    });

    it("Mutex-read: using Node >= 24", () => {
      const test = (count = 0) => {
        if (count >= 100000) return;
        using m = mutex;
        m.enter();
        const element = array[0];
        assert.strictEqual(array[1], element);
        assert.strictEqual(array[2], element);
        assert.strictEqual(array[3], element);
        process.nextTick(test, ++count);
      };
      test();
    });
  } else {
    let value = 1;
    const timer = setTimeout(() => {
      mutex.enter();
      for (let i = 0; i < 4; i++) array[i] += value;
      mutex.leave();
      value = -value;
      timer.refresh();
    }, 0);
  }
}
