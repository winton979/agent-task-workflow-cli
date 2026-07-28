import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { addRepo, bindRepo, doctor, init, listRepos, refresh, setRepoDisabled, useContext } from './init.js';

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
  task use-context <id>
                Store workflow state in a registered Git repository
  task bind-repo <id> <path>
                Override a workspace repository path on this machine
  task enable-repo <id> [--local]
                Include a workspace repository in routine development
  task disable-repo <id> [--local]
                Exclude a workspace repository from routine development
  task repos    List repositories in the current workflow workspace
  task refresh  Reinstall task-cli managed workflow skills
  task doctor   Check workflow setup and skill freshness
  task --help   Show this help

Recommended flows after init:
  explore: project-explore
  fast: task-fast
  task: task-explore -> task-implement -> task-audit (optional, risk-triggered)
  bug:  bug-explore -> bug-fix -> bug-audit (optional, risk-triggered)
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

function parseRepositoryScope(args) {
  if (args.length === 0) {
    return false;
  }
  if (args.length === 1 && args[0] === '--local') {
    return true;
  }
  throw new Error('enable-repo and disable-repo accept only the optional --local flag.');
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
    case 'use-context': {
      const id = process.argv[3];
      if (!id || id.startsWith('--')) {
        throw new Error('use-context requires a repository ID.');
      }
      useContext(cwd, id, { fs, path, log });
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
    case 'enable-repo':
    case 'disable-repo': {
      const id = process.argv[3];
      if (!id || id.startsWith('--')) {
        throw new Error(`${cmd} requires a repository ID.`);
      }
      setRepoDisabled(cwd, id, cmd === 'disable-repo', {
        local: parseRepositoryScope(process.argv.slice(4)),
        fs,
        path,
        log,
      });
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
