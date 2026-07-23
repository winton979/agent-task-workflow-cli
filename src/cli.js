import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { addRepo, bindRepo, doctor, init, listRepos, refresh } from './init.js';

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
  task add-repo <path> [--id <id>] [--description <text>]
                Add a Git repository to the current workflow workspace
  task bind-repo <id> <path>
                Override a workspace repository path on this machine
  task repos    List repositories in the current workflow workspace
  task refresh  Reinstall task-cli managed workflow skills
  task doctor   Check workflow setup and skill freshness
  task --help   Show this help

Recommended flows after init:
  explore: project-explore
  fast: task-fast
  task: task-explore -> task-implement -> task-audit (optional, risk-triggered)
  bug:  bug-explore -> bug-fix -> bug-audit (optional, risk-triggered)
  plan: task-plan | bug-plan (optional, review-only)
  cancel: task-cancel | bug-cancel`);
}

function parseAddRepoOptions(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option !== '--id' && option !== '--description') {
      throw new Error(`Unknown option: ${option}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${option} requires a value.`);
    }

    options[option.slice(2)] = value;
    index += 1;
  }

  return options;
}

try {
  switch (cmd) {
    case 'init':
      init(cwd, { fs, path, log });
      break;
    case 'add-repo': {
      const repoPath = process.argv[3];
      if (!repoPath || repoPath.startsWith('--')) {
        throw new Error('add-repo requires a repository path.');
      }
      addRepo(cwd, repoPath, parseAddRepoOptions(process.argv.slice(4)), { fs, path, log });
      break;
    }
    case 'bind-repo': {
      const id = process.argv[3];
      const repoPath = process.argv[4];
      if (!id || !repoPath || id.startsWith('--') || repoPath.startsWith('--')) {
        throw new Error('bind-repo requires a repository ID and path.');
      }
      bindRepo(cwd, id, repoPath, { fs, path, log });
      break;
    }
    case 'repos':
      listRepos(cwd, { fs, path, log });
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
} catch (error) {
  console.error(chalk.red(`Error: ${error.message}`));
  process.exitCode = 1;
}
