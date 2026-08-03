// Dev launcher: starts Vite dev server, then Electron pointed at it.
import { createServer } from 'vite';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server = await createServer({ configFile: path.join(root, 'vite.config.mjs') });
await server.listen();
const url = server.resolvedUrls.local[0];
console.log('Vite dev server at', url);

const electronBin = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const child = spawn(electronBin, ['.'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, RAMS_DEV_URL: url },
});
child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
