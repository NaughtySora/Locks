"use strict";

const tests = ['mutex', 'binary-semaphore', 'semaphore'];
const skip = process.argv.slice(2);

for (const test of tests) {
  if (skip.includes(test)) continue;
  require(`./${test}.js`);
}