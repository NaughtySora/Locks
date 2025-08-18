"use strict";

const threads = require('node:worker_threads');
const os = require('node:os');
const { ExclusiveSemaphore } = require("../lib/Semaphore/index.js");
const { range, spawn } = require('../util/index.js');
const assert = require('node:assert');

const { isMainThread, threadId, workerData } = threads;

if (isMainThread) {
  const limit = os.availableParallelism();
  const workers = new Map();
  const buffer = new SharedArrayBuffer(12);
  const TEST_TIME = 6e4;
  new ExclusiveSemaphore(buffer, { concurrency: limit });
  const { forEach } = Iterator.prototype;

  const finish = () => {
    forEach.call(
      workers.values(),
      worker => worker.terminate(),
    );
  };

  process.on("SIGINT", () => {
    finish();
    console.log("Graceful shutdown [Binary Semaphore]");
    process.exit(0);
  });

  forEach.call(
    range(limit),
    () => spawn({ file: __filename, workerData: buffer, workers }),
  );

  setTimeout(() => {
    finish();
    console.log(`tests timeout ${TEST_TIME} [Binary Semaphore]`);
  }, TEST_TIME);

} else {
  const array = new Uint8Array(workerData, 8);
  if (threadId % 2 === 0) {
    const timer = setTimeout(() => {
      using semaphore = new ExclusiveSemaphore(workerData);
      semaphore.enter();
      const element = array[0];
      assert.strictEqual(array[1], element);
      assert.strictEqual(array[2], element);
      assert.strictEqual(array[3], element);
      timer.refresh();
    }, 0);
  } else {
    let value = 1;
    const timer = setTimeout(() => {
      using semaphore = new ExclusiveSemaphore(workerData);
      semaphore.exclusive();
      for (let i = 0; i < 4; i++) array[i] += value;
      value = -value;
      timer.refresh();
    });
  }
}