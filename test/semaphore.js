"use strict";

const fs = require('node:fs');
const threads = require('node:worker_threads');
const path = require("node:path");
const os = require("node:os");
const assert = require('node:assert');
const { Semaphore } = require("../lib/Semaphore/index.js");
const { range } = require('../util/index.js');

const { isMainThread, workerData, threadId, Worker } = threads;

const CONCURRENCY = 4;
const DIR = path.resolve(__dirname, 'bin');

const readDir = (dir, cb) => {
  fs.readdir(dir, (err, data) => {
    if (err) throw new Error(`Can't read dir ${dir}`);
    cb(data);
  });
};

if (isMainThread) {
  const workers = new Map();
  const limit = os.availableParallelism();
  const buffer = new SharedArrayBuffer(4);
  const TEST_TIME = 6e4;
  new Semaphore(buffer, { concurrency: CONCURRENCY });
  const { forEach } = Iterator.prototype;

  const spawn = () => {
    const worker = new Worker(__filename, { workerData: buffer });
    const id = worker.threadId;
    workers.set(id, worker);

    worker.on("error", (error) => {
      console.error(`Worker ${id} exited with: `, error);
      workers.delete(id);
      process.exit(1);
    });

    worker.on("exit", () => {
      console.log(`Worker exited ${id}`);
      workers.delete(id);
    });
  };

  const finish = () => {
    forEach.call(
      workers.values(),
      worker => worker.terminate(),
    );
    const files = fs.readdirSync(DIR);
    files.forEach(filepath => fs.unlinkSync(path.resolve(DIR, filepath)));
  };

  process.on("SIGINT", () => {
    finish();
    console.log("Graceful shutdown [Semaphore]");
    process.exit(0);
  });

  forEach.call(range(limit), spawn);

  setTimeout(() => {
    finish();
    console.log(`Mutex tests timeout ${TEST_TIME} [Semaphore]`);
  }, TEST_TIME);

} else {
  const semaphore = new Semaphore(workerData);
  const REPEAT_COUNT = 1e6;
  const file = path.resolve(DIR, `file-${threadId}.dat`);
  const data = `Data from ${threadId} `.repeat(REPEAT_COUNT);

  const compareDirLength = () => void readDir(DIR,
    dir => void assert.ok(dir.length <= CONCURRENCY));

  const timer = setTimeout(() => {
    compareDirLength();
    semaphore.enter();
    compareDirLength();
    fs.writeFile(file, data, () => {
      compareDirLength();
      setTimeout(() => {
        compareDirLength();
        fs.unlink(file, () => {
          compareDirLength();
          semaphore.leave();
          compareDirLength();
          timer.refresh();
        });
        compareDirLength();
      }, 0);
      compareDirLength();
    });
    compareDirLength();
  }, 0);
}
