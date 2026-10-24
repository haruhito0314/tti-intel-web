import { existsSync, symlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const dependencies = fileURLToPath(new URL('../../frontend/node_modules/', import.meta.url));
const vite = fileURLToPath(new URL('../../frontend/node_modules/vite/bin/vite.js', import.meta.url));

if (!existsSync(vite)) {
  console.error('先に元サイトの依存関係を準備してください: npm --prefix ../frontend ci');
  process.exit(1);
}

// Reuse the original site's exact dependency versions without a second install.
if (!existsSync(`${root}node_modules`)) symlinkSync(dependencies, `${root}node_modules`, 'dir');

if (process.argv[2] === 'build') {
  const tsc = `${dependencies}typescript/bin/tsc`;
  const check = spawnSync(process.execPath, [tsc, '--project', 'tsconfig.json', '--noEmit'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (check.status !== 0) process.exit(check.status ?? 1);
}

const child = spawn(process.execPath, [vite, ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
