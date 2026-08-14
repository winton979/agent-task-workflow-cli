import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { createCliLog, parseAddRepoOptions } from './cli-common.js';
import {
  ensureLocalWorkspaceIgnored,
  ensureWorkspaceReadme,
  addRepo,
  useContext,
  bindRepo,
  setRepoDisabled,
  listRepos,
  focusRepos,
} from './workspace.js';

const cwd = process.cwd();
const cmd = process.argv[2];

const log = createCliLog();

function showHelp() {
  console.log(`\
workscope - Workspace repository management for multi-repo projects

Usage:
  workscope add-repo <path> [--id <id>] [--description <text>]
                Add a Git repository to the workspace manifest
  workscope use-context <id>
                Store workflow state in a registered Git repository
  workscope bind-repo <id> <path>
                Override a workspace repository path on this machine
  workscope enable-repo <id> [--local]
                Include a workspace repository in routine development
  workscope disable-repo <id> [--local]
                Exclude a workspace repository from routine development
  workscope focus <id> [<id>...] [--local]
                Enable the listed repositories and disable all others
  workscope repos
                List repositories in the workspace
  workscope --help
                Show this help

The --local flag writes to workspace.local.yaml (machine-specific, gitignored).
Without --local, changes are written to workspace.yaml (shared, committed).`);
}

function parseLocalFlag(args) {
  const remaining = [];
  let local = false;

  for (const arg of args) {
    if (arg === '--local') {
      local = true;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    remaining.push(arg);
  }

  return { local, remaining };
}

function ensureLocalIgnored() {
  log.info('\nEnsuring workspace.local.yaml is ignored...');
  ensureLocalWorkspaceIgnored(fs, path, cwd, log);
}

function ensureReadme() {
  log.info('\nEnsuring WORKSPACE.md declaration...');
  ensureWorkspaceReadme(fs, path, cwd, log);
}

const WRITE_COMMANDS = new Set(['add-repo', 'use-context', 'bind-repo', 'enable-repo', 'disable-repo', 'focus']);

try {
  if (WRITE_COMMANDS.has(cmd)) {
    ensureReadme();
  }
  switch (cmd) {
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
      ensureLocalIgnored();
      break;
    }
    case 'bind-repo': {
      const id = process.argv[3];
      const repoPath = process.argv[4];
      if (!id || !repoPath || id.startsWith('--') || repoPath.startsWith('--')) {
        throw new Error('bind-repo requires a repository ID and path.');
      }
      ensureLocalIgnored();
      bindRepo(cwd, id, repoPath, { fs, path, log });
      break;
    }
    case 'enable-repo':
    case 'disable-repo': {
      const id = process.argv[3];
      if (!id || id.startsWith('--')) {
        throw new Error(`${cmd} requires a repository ID.`);
      }
      const { local } = parseLocalFlag(process.argv.slice(4));
      if (local) {
        ensureLocalIgnored();
      }
      setRepoDisabled(cwd, id, cmd === 'disable-repo', { local, fs, path, log });
      break;
    }
    case 'focus': {
      const { local, remaining } = parseLocalFlag(process.argv.slice(3));
      if (remaining.length === 0) {
        throw new Error('focus requires at least one repository ID.');
      }
      if (local) {
        ensureLocalIgnored();
      }
      focusRepos(cwd, remaining, { local, fs, path, log });
      break;
    }
    case 'repos':
      listRepos(cwd, { fs, path, log });
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
