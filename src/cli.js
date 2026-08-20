import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { createCliLog, parseAddRepoOptions } from './cli-common.js';
import { addRepo, bindRepo, doctor, init, installGlobalSkills, listRepos, refresh, removeGlobalSkills, setRepoDisabled, updateGlobalSkills, useContext } from './init.js';

const cwd = process.cwd();
const cmd = process.argv[2];

const log = createCliLog();

function showHelp() {
  console.log(`\
task - Lightweight AI-assisted task workflow

Usage:
  task init     Initialize the .ai workflow state in current directory
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
  task refresh  Ensure .ai state and remove legacy project-local skills
  task skill install <agents|claude|codex>
                Install workflow skills into the global target directory
  task skill update [<target> ...]
                Update globally installed workflow skills
  task skill remove [<target> ...]
                Remove globally installed workflow skills
  task doctor   Check workflow setup and global skill freshness
  task --help   Show this help

Recommended flows after init (requires "task skill install <agents|claude|codex>" once per machine):
  explore: project-explore
  fast: task-fast
  task: task-explore -> task-implement -> task-audit (optional, risk-triggered)
  bug:  bug-explore -> bug-fix -> bug-audit (optional, risk-triggered)
  cancel: task-cancel | bug-cancel`);
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
    case 'skill': {
      const subcommand = process.argv[3];
      if (subcommand === 'install') {
        const target = process.argv[4];
        if (!target || target.startsWith('--')) {
          throw new Error('skill install requires a target: agents | claude | codex.');
        }
        installGlobalSkills(target, { fs, path, log });
      } else if (subcommand === 'update') {
        updateGlobalSkills(process.argv.slice(4).filter((arg) => !arg.startsWith('--')), { fs, path, log });
      } else if (subcommand === 'remove') {
        removeGlobalSkills(process.argv.slice(4).filter((arg) => !arg.startsWith('--')), { fs, path, log });
      } else {
        throw new Error('Usage: task skill install <agents|claude|codex> | task skill update [<target> ...] | task skill remove [<target> ...]');
      }
      break;
    }
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
