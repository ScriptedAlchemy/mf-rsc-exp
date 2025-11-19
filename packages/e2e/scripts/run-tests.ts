import {spawn} from 'child_process';
import fs from 'fs';
import path from 'path';
import waitOn from 'wait-on';

const repoRoot = path.resolve(__dirname, '../../..');
const e2eDir = path.resolve(__dirname, '..');

const APP1_PORT = process.env.APP1_PORT ?? '4000';
const APP2_PORT = process.env.APP2_PORT ?? '4001';
const APP1_URL = `http://localhost:${APP1_PORT}`;
const APP2_URL = `http://localhost:${APP2_PORT}`;

const APP1_BUILD_DIR = path.resolve(repoRoot, 'packages/app1/build');
const APP2_BUILD_DIR = path.resolve(repoRoot, 'packages/app2/build');
const APP1_BUILD = path.join(APP1_BUILD_DIR, 'main.js');
const APP2_BUILD = path.join(APP2_BUILD_DIR, 'main.js');

function cleanBuildOutputs() {
  [APP1_BUILD_DIR, APP2_BUILD_DIR].forEach((dir) => {
    fs.rmSync(dir, {recursive: true, force: true});
  });
}

function startProcess(command: string, args: string[], options: Parameters<typeof spawn>[2] = {}) {
  return spawn(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
}

function execCommand(command: string, args: string[], options: Parameters<typeof spawn>[2] = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: true,
      ...options,
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

async function waitForReadiness() {
  console.log('Waiting for webpack build artifacts...');
  await waitOn({
    resources: [
      `file:${APP1_BUILD}`,
      `file:${APP2_BUILD}`,
    ],
    timeout: 180_000,
  });
  console.log('Build artifacts detected. Waiting for servers to respond...');
  await waitOn({
    resources: [`${APP1_URL}/`, `${APP2_URL}/`],
    timeout: 180_000,
  });
  console.log('Servers are responding.');
}

async function main() {
  cleanBuildOutputs();

  try {
    await execCommand('npx', ['kill-port', APP1_PORT, APP2_PORT]);
  } catch (error) {
    console.warn('Initial port cleanup failed (likely already free):', error instanceof Error ? error.message : error);
  }

  const app1 = startProcess('pnpm', ['--filter', 'app1', 'start']);
  const app2 = startProcess('pnpm', ['--filter', 'app2', 'start'], {
    env: {...process.env, PORT: APP2_PORT},
  });

  try {
    await waitForReadiness();
    const extraArgs = process.argv.slice(2);
    await execCommand('pnpm', ['exec', 'playwright', 'test', ...extraArgs], {cwd: e2eDir});
    process.exitCode = 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    try {
      await execCommand('npx', ['kill-port', APP1_PORT, APP2_PORT]);
    } catch (error) {
      console.warn('Failed to kill ports:', error instanceof Error ? error.message : error);
    }
    app1.kill('SIGTERM');
    app2.kill('SIGTERM');
  }
}

main();
