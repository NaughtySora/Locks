"use strict";
function* range(count) {
  let i = 0;
  while (i++ < count) yield i;
}

module.exports = { range };