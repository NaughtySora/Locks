# Concurrency primitives 

- Look on tests to see usage

### Mutex

- `class Mutex {`\
`  constructor(buffer: SharedArrayBuffer, offset?: number);`\
`  enter(): void;`\
`  leave(): void`;\
`  isolate(fn: (...args: any) => void, ...args: any[]): void;`\
`  size: number;`\
`}`

### Semaphore 

- `interface SemaphoreOptions {`\
`  offset?: number;`\
`  concurrency?: number;`\
`}`

- `class Semaphore {`\
`  constructor(buffer: SharedArrayBuffer, options: SemaphoreOptions);`\
`  enter(): void;`\
`  leave(): void;`\
`  size: number;`\
`}`

### Exclusive Semaphore

- `class ExclusiveSemaphore extends Semaphore {`\
`  exclusive(): void;`\
`  leaveExclusive(): void;`\
`}`


## Examples
- limit file access concurrency with Semaphore
```js
  // Root
  const workersCount = 10;
  const buffer = new SharedArrayBuffer(4);
  // initialization Semaphore in Root, concurrency says how many threads can work at the same time
  new Semaphore(buffer, { concurrency: 4 });
  spawn({workersCount, workerData: buffer});

  // Worker
  const semaphore = new Semaphore(workerData); // each worker has semaphore with shared buffer from root

  const writeToFile = (filepath, content) => {
    semaphore.enter(); // enter into critical section
    fs.writeFile(filepath, content, (err, data) => {
      /** --- working with errors and data --- */
      semaphore.leave(); // leave critical section
    });
  };

  writeToFile(`./test-${threadId}.js`, 'hello');
```