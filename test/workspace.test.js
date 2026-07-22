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
  assert.match(readFileSync(path.join(project, '.gitignore'), 'utf-8'), /workspace\.local\.yaml/);

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

test('bind-repo overrides a shared repository path only on the local machine', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const defaultFrontend = path.join(parent, 'frontend');
  const localFrontend = path.join(parent, 'developer', 'web-client');
  initializeGitRepository(backend);
  initializeGitRepository(defaultFrontend);
  initializeGitRepository(localFrontend);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend', '--id', 'frontend').status, 0);

  const bindResult = runTask(backend, 'bind-repo', 'frontend', localFrontend);
  assert.equal(bindResult.status, 0, output(bindResult));

  const localWorkspace = JSON.parse(readFileSync(path.join(backend, 'workspace.local.yaml'), 'utf-8'));
  assert.deepEqual(localWorkspace, {
    version: 1,
    repositories: {
      frontend: localFrontend.split(path.sep).join('/'),
    },
  });
  const sharedWorkspace = JSON.parse(readFileSync(path.join(backend, 'workspace.yaml'), 'utf-8'));
  assert.equal(sharedWorkspace.repositories[1].path, '../frontend');

  const reposResult = runTask(backend, 'repos');
  assert.equal(reposResult.status, 0, output(reposResult));
  assert.ok(output(reposResult).includes(`frontend\t${localWorkspace.repositories.frontend}`));

  const doctorResult = runTask(backend, 'doctor');
  assert.equal(doctorResult.status, 0, output(doctorResult));
  assert.ok(output(doctorResult).includes(
    `workspace repository frontend - ${localWorkspace.repositories.frontend}`
  ));
});

test('bind-repo rejects unknown, non-Git, and duplicate local bindings', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  const notARepository = path.join(parent, 'not-a-repository');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);
  mkdirSync(notARepository);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend', '--id', 'frontend').status, 0);

  const unknownResult = runTask(backend, 'bind-repo', 'unknown', frontend);
  assert.notEqual(unknownResult.status, 0);
  assert.match(output(unknownResult), /Unknown workspace repository ID/);

  const nonGitResult = runTask(backend, 'bind-repo', 'frontend', notARepository);
  assert.notEqual(nonGitResult.status, 0);
  assert.match(output(nonGitResult), /not inside a Git worktree/);

  const duplicateResult = runTask(backend, 'bind-repo', 'frontend', backend);
  assert.notEqual(duplicateResult.status, 0);
  assert.match(output(duplicateResult), /already bound to another workspace repository/);
});

test('bind-repo requires old workspaces to refresh their local ignore rule', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  writeFileSync(path.join(backend, '.gitignore'), [
    '# task workflow',
    '.ai/tasks/active/*.md',
    '.ai/bugs/active/*.md',
    '',
  ].join('\n'));

  const bindResult = runTask(backend, 'bind-repo', 'frontend', frontend);
  assert.notEqual(bindResult.status, 0);
  assert.match(output(bindResult), /workspace\.local\.yaml is not ignored/);
  assert.equal(existsSync(path.join(backend, 'workspace.local.yaml')), false);

  const refreshResult = runTask(backend, 'refresh');
  assert.equal(refreshResult.status, 0, output(refreshResult));
  assert.match(readFileSync(path.join(backend, '.gitignore'), 'utf-8'), /workspace\.local\.yaml/);

  const retriedBindResult = runTask(backend, 'bind-repo', 'frontend', frontend);
  assert.equal(retriedBindResult.status, 0, output(retriedBindResult));
});

test('bind-repo refuses a negated or tracked local config', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  const gitignorePath = path.join(backend, '.gitignore');
  writeFileSync(gitignorePath, `${readFileSync(gitignorePath, 'utf-8').trimEnd()}\n!workspace.local.yaml\n`);

  const negatedResult = runTask(backend, 'bind-repo', 'frontend', frontend);
  assert.notEqual(negatedResult.status, 0);
  assert.match(output(negatedResult), /workspace\.local\.yaml is not ignored/);

  writeFileSync(gitignorePath, readFileSync(gitignorePath, 'utf-8').replace('!workspace.local.yaml\n', ''));
  writeFileSync(path.join(backend, 'workspace.local.yaml'), '{"version":1,"repositories":{}}\n');
  execFileSync('git', ['-C', backend, 'add', '-f', 'workspace.local.yaml']);

  const trackedResult = runTask(backend, 'bind-repo', 'frontend', frontend);
  assert.notEqual(trackedResult.status, 0);
  assert.match(output(trackedResult), /workspace\.local\.yaml is tracked/);
});

test('doctor reports invalid local workspace bindings', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  writeFileSync(path.join(backend, 'workspace.local.yaml'), `${JSON.stringify({
    version: 1,
    repositories: { unknown: '../frontend' },
  }, null, 2)}\n`);

  const result = runTask(backend, 'doctor');
  assert.equal(result.status, 0, output(result));
  assert.match(output(result), /workspace\.local\.yaml - workspace\.local\.yaml contains an unknown repository ID/);
});
