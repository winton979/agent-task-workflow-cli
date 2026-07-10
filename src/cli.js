import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { init, refresh, doctor } from './init.js';

const cwd = process.cwd();
const cmd = process.argv[2];

const log = {
  info(msg) { console.log(msg); },
  chalk: {
    green(msg) { console.log(chalk.green(msg)); },
    dim(msg) { console.log(chalk.dim(msg)); },
  },
};

function showHelp() {
  console.log(`\
task - Lightweight AI-assisted task workflow

Usage:
  task init     Initialize task workflow in current directory
  task refresh  Reinstall task-cli managed workflow skills
  task doctor   Check workflow setup and skill freshness
  task --help   Show this help

Recommended flows after init:
  fast: task-fast
  task: task-explore -> task-implement -> task-audit (optional, risk-triggered)
  bug:  bug-explore -> bug-fix -> bug-audit (optional, risk-triggered)
  cancel: task-cancel | bug-cancel`);
}

switch (cmd) {
  case 'init':
    init(cwd, { fs, path, log });
    break;
  case 'refresh':
    refresh(cwd, { fs, path, log });
    break;
  case 'doctor':
    doctor(cwd, { fs, path, log });
    break;
  case undefined:
  case '--help':
  case '-h':
  default:
    showHelp();
    break;
}
