import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const taskBin = path.join(projectRoot, 'bin', 'task.js');

function createTemporaryDirectory(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'task-cli-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function initializeGitRepository(directory) {
  mkdirSync(directory, { recursive: true });
  execFileSync('git', ['init', '--quiet', directory]);
}

function runTask(cwd, ...args) {
  return spawnSync(process.execPath, [taskBin, ...args], {
    cwd,
    encoding: 'utf-8',
  });
}

function output(result) {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

test('init keeps the existing single-project workflow unchanged', (t) => {
  const project = createTemporaryDirectory(t);
  initializeGitRepository(project);

  const result = runTask(project, 'init');

  assert.equal(result.status, 0, output(result));
  assert.equal(existsSync(path.join(project, '.ai', 'decisions', 'decisions.md')), true);
  assert.equal(existsSync(path.join(project, 'workspace.yaml')), false);

  const doctorResult = runTask(project, 'doctor');
  assert.equal(doctorResult.status, 0, output(doctorResult));
  assert.doesNotMatch(output(doctorResult), /workspace\.yaml/);
});

test('add-repo promotes an initialized Git project to a portable workspace', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  const initResult = runTask(backend, 'init');
  assert.equal(initResult.status, 0, output(initResult));
  const staleSkillPath = path.join(backend, '.codex', 'skills', 'task-fast', 'SKILL.md');
  writeFileSync(staleSkillPath, 'Old managed skill without workspace support.\n');

  const addResult = runTask(
    backend,
    'add-repo',
    '../frontend',
    '--id',
    'frontend',
    '--description',
    'Web application'
  );
  assert.equal(addResult.status, 0, output(addResult));
  assert.match(readFileSync(staleSkillPath, 'utf-8'), /Workspace Context/);

  const manifest = JSON.parse(readFileSync(path.join(backend, 'workspace.yaml'), 'utf-8'));
  assert.deepEqual(manifest, {
    version: 1,
    repositories: [
      { id: 'backend', path: '.' },
      { id: 'frontend', path: '../frontend', description: 'Web application' },
    ],
  });

  const reposResult = runTask(backend, 'repos');
  assert.equal(reposResult.status, 0, output(reposResult));
  assert.match(output(reposResult), /backend\s+\./);
  assert.match(output(reposResult), /frontend\s+\.\.\/frontend - Web application/);
});

test('add-repo rejects invalid and duplicate repositories without rewriting the manifest', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  const nonGitDirectory = path.join(parent, 'not-a-repository');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);
  mkdirSync(nonGitDirectory);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend').status, 0);
  const manifestPath = path.join(backend, 'workspace.yaml');
  const originalManifest = readFileSync(manifestPath, 'utf-8');

  const duplicateResult = runTask(backend, 'add-repo', '../frontend');
  assert.notEqual(duplicateResult.status, 0);
  assert.match(output(duplicateResult), /already registered/);
  assert.equal(readFileSync(manifestPath, 'utf-8'), originalManifest);

  const nonGitResult = runTask(backend, 'add-repo', '../not-a-repository');
  assert.notEqual(nonGitResult.status, 0);
  assert.match(output(nonGitResult), /not inside a Git worktree/);
  assert.equal(readFileSync(manifestPath, 'utf-8'), originalManifest);

  const missingResult = runTask(backend, 'add-repo', '../missing');
  assert.notEqual(missingResult.status, 0);
  assert.match(output(missingResult), /does not exist/);
  assert.equal(readFileSync(manifestPath, 'utf-8'), originalManifest);
});

test('doctor validates repository paths only when workspace mode is enabled', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend').status, 0);
  rmSync(frontend, { recursive: true, force: true });

  const result = runTask(backend, 'doctor');
  assert.equal(result.status, 0, output(result));
  assert.match(output(result), /workspace repository frontend - missing at ..\/frontend/);
});
