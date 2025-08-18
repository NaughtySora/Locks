"use strict";

const threads = require('node:worker_threads');
const { ExclusiveSemaphore } = require("../lib/Semaphore/index.js");
const os = require('node:os');
const { range } = require('../util/index.js');
const { Worker, isMainThread, threadId, workerData } = threads;

if (!isMainThread) {
  const semaphore = new ExclusiveSemaphore(workerData);
  const array = new Uint8Array(workerData, 8);
  const read = threadId % 2 === 0;
  if (read) {
    const timer = setTimeout(() => {
      semaphore.enter();
      // sequentially(array);
      // console.log(workerData)
      semaphore.leave();
      timer.refresh();
    });
  } else {
    let value = 1;
    const timer = setTimeout(() => {
      
      semaphore.exclusive();
      for (let i = 0; i < 4; i++) array[i] += value;
      semaphore.leaveExclusive();

      //! Error
      // semaphore.enter();
      // for (let i = 0; i < 4; i++) array[i] += value;
      //  semaphore.leave();

      //! Error
      // for (let i = 0; i < 4; i++) array[i] += value;

      timer.refresh();
      value = -value;
    });
  }
}

module.exports = () => {
  if (isMainThread) {
    const limit = os.availableParallelism();
    const workers = new Map();
    const buffer = new SharedArrayBuffer(12);
    new ExclusiveSemaphore(buffer, { concurrency: limit });

    const spawn = () => {
      const worker = new Worker(__filename, { workerData: buffer });
      const id = worker.threadId;
      workers.set(id, worker);

      worker.on("error", (error) => {
        console.error(`Worker Error: `, error);
        console.log(`Worker ${id} terminated`);
        workers.delete(id);
        process.exit(1);
      });

      worker.on("exit", () => {
        console.log(`Worker exit ${id}`);
        workers.delete(id);
      });
    };

    process.on("SIGINT", () => {
      Iterator.prototype.forEach.call(
        workers.values(),
        (worker) => void worker.terminate()
      );
      process.exit(0);
    });

    Iterator.prototype.forEach.call(range(limit), spawn);
  }
};
