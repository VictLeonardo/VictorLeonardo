#!/usr/bin/env node
/**
 * Sobe backend (API) e frontend (Vite) juntos, sem dependências extras.
 * Uso: npm run dev  (a partir de centro-visao/)
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function run(name, cmd, args, cwd, color) {
  const p = spawn(cmd, args, { cwd, shell: true });
  const tag = `\x1b[${color}m[${name}]\x1b[0m`;
  p.stdout.on('data', (d) => process.stdout.write(`${tag} ${d}`));
  p.stderr.on('data', (d) => process.stderr.write(`${tag} ${d}`));
  p.on('exit', (code) => {
    console.log(`${tag} saiu (code ${code})`);
    process.exit(code || 0);
  });
  return p;
}

console.log('Iniciando Centro Visão (backend :4000 + frontend :5173)…\n');
run('api', 'npm', ['start'], path.join(root, 'backend'), '36');
run('web', 'npm', ['run', 'dev'], path.join(root, 'frontend'), '34');

process.on('SIGINT', () => process.exit(0));
