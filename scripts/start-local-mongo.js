const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

const PORT = 27017;
const dataDir = path.join(__dirname, '..', 'backend', 'data', 'db');

function checkPortInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function findMongodBinary() {
  const cacheDir = path.join(os.homedir(), '.cache', 'mongodb-binaries');
  
  // 1. Prefer known working 6.0.14 version matching existing database files
  const preferred = path.join(cacheDir, 'mongod-x64-win32-6.0.14.exe');
  if (fs.existsSync(preferred)) {
    return preferred;
  }

  // 2. Any other mongod binary in the cache
  if (fs.existsSync(cacheDir)) {
    const binaries = fs.readdirSync(cacheDir)
      .filter((file) => file.startsWith('mongod') && (file.endsWith('.exe') || !file.includes('.')))
      .map((file) => path.join(cacheDir, file));
    if (binaries.length > 0) {
      return binaries[0];
    }
  }

  // 3. System installed mongod fallback
  return 'mongod';
}

async function start() {
  const inUse = await checkPortInUse(PORT);
  if (inUse) {
    console.log('====================================================');
    console.log(`[mongo] MongoDB is already active on 127.0.0.1:${PORT}`);
    console.log('[mongo] Reusing existing running instance.');
    console.log('====================================================');
    // Keep alive so concurrent process runner does not exit
    setInterval(() => {}, 60000);
    return;
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const binaryPath = findMongodBinary();

  console.log('====================================================');
  console.log('     STARTING PERSISTENT LOCAL MONGODB SERVER       ');
  console.log('====================================================');
  console.log(`• Port: ${PORT}`);
  console.log(`• Storage Path: ${dataDir}`);
  console.log(`• Binary: ${binaryPath}`);
  console.log(`• Connection URI: mongodb://127.0.0.1:${PORT}/leasify`);
  console.log('====================================================\n');

  const mongod = spawn(binaryPath, ['--port', String(PORT), '--dbpath', dataDir], {
    stdio: 'inherit'
  });

  mongod.on('error', (err) => {
    console.error('[mongo] Failed to start mongod:', err.message);
  });

  mongod.on('close', (code) => {
    console.log(`[mongo] mongod process exited with code ${code}`);
    process.exit(code || 0);
  });

  const cleanup = () => {
    if (mongod) {
      try {
        mongod.kill('SIGINT');
      } catch (e) {}
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start();
