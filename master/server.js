const cluster  = require('cluster');
const numCPUs  = require('os').cpus().length;
const fs       = require('fs');
const path     = require('path');
const uuid     = require('uuid');
const stream   = require('stream');
const StringDecoder = require('string_decoder').StringDecoder;
const readline = require('readline');
const parseLine   = require('../parser/parser');

const dir = './logs';

if (cluster.isMaster) {

  cluster.setupMaster({
    silent: false,
    stdio: [0, 1, 2, 'ipc']
  });

  if ( !fs.existsSync(dir) ) {
    fs.mkdirSync(dir);
  } else {
    let files = fs.readdirSync(dir);
    for (let file of files) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
  
  console.log(`Master ${process.pid} is running`);

  let workers = [];

  for (let i = 0; i < numCPUs; ++i) {
    workers.push(cluster.fork());
  }

  const log  = fs.createReadStream(`./access.log`);
  const rl   = readline.createInterface(log);
  let workerNo = 0;

  rl.on('line', line => {
    workers[workerNo].send({ chunk: line });
    workerNo = (workerNo + 1) % workers.length;
  });

  rl.on('close', () => {
    for (let i = 0; i < workers.length; ++i) {
      workers[i].send({ end: true });
    }
  });

  cluster.on('online', (worker) => {
    console.log(`worker ${worker.process.pid} is online`);
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });

} else {

  const part = fs.createWriteStream(`./logs/${uuid.v4()}.part.log`, { encoding: 'utf-8' });

  const decoder = new StringDecoder('utf-8');
  const transform = new stream.Transform({
    transform(chunk, encoding, callback) {
      if (chunk) {
        let line = decoder.write(chunk);
        line = parseLine(line);
        if (line) this.push(line + '\n');
      }
      callback();
    }
  })

  transform.pipe(part);

  process.on('message', msg => {
    if ( msg.chunk ) {
      transform.write(msg.chunk, 'utf-8');
    }
    if ( msg.end ) {
      transform.end();
    }
  });

  part.on('finish', () => {
    process.disconnect();
  });

  part.on('error', err => {
    if (err) throw err;
  });

}