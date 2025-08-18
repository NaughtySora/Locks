"use strict";

const { Worker } = require('node:worker_threads');

function* range(count) {
  let i = 0;
  while (i++ < count) yield i;
}

const spawn = ({ file, workerData, workers }) => {
  const worker = new Worker(file, { workerData });
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

module.exports = { range, spawn };