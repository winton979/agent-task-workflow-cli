import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const workscopeBin = path.join(projectRoot, 'bin', 'workscope.js');

function createTemporaryDirectory(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'workscope-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function initializeGitRepository(directory) {
  mkdirSync(directory, { recursive: true });
  execFileSync('git', ['init', '--quiet', directory]);
}

function runWorkscope(cwd, ...args) {
  return spawnSync(process.execPath, [workscopeBin, ...args], {
    cwd,
    encoding: 'utf-8',
  });
}

function output(result) {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

function readWorkspace(cwd) {
  return JSON.parse(readFileSync(path.join(cwd, 'workspace.yaml'), 'utf-8'));
}

function readLocalWorkspace(cwd) {
  return JSON.parse(readFileSync(path.join(cwd, 'workspace.local.yaml'), 'utf-8'));
}

test('workscope manages workspace without task init or skill installation', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  const addResult = runWorkscope(backend, 'add-repo', '../frontend', '--id', 'frontend');
  assert.equal(addResult.status, 0, output(addResult));

  assert.equal(existsSync(path.join(backend, 'workspace.yaml')), true);
  assert.equal(existsSync(path.join(backend, '.ai')), false);
  assert.equal(existsSync(path.join(backend, '.claude')), false);
  assert.equal(existsSync(path.join(backend, '.codex')), false);

  const workspace = readWorkspace(backend);
  assert.equal(workspace.repositories.length, 2);
  assert.equal(workspace.repositories.find((r) => r.id === 'frontend').path, '../frontend');
});

test('workscope bind-repo auto-ensures workspace.local.yaml is gitignored', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  assert.equal(runWorkscope(backend, 'add-repo', '../frontend', '--id', 'frontend').status, 0);

  const bindResult = runWorkscope(backend, 'bind-repo', 'frontend', '../frontend');
  assert.equal(bindResult.status, 0, output(bindResult));

  const gitignore = readFileSync(path.join(backend, '.gitignore'), 'utf-8');
  assert.match(gitignore, /workspace\.local\.yaml/);
  const localWorkspace = readLocalWorkspace(backend);
  assert.equal(localWorkspace.repositories.frontend, '../frontend');
});

test('workscope focus enables listed repositories and disables the rest', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  const backend = path.join(parent, 'backend');
  const api = path.join(parent, 'api');
  initializeGitRepository(root);
  initializeGitRepository(frontend);
  initializeGitRepository(backend);
  initializeGitRepository(api);

  assert.equal(runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  assert.equal(runWorkscope(root, 'add-repo', '../backend', '--id', 'backend').status, 0);
  assert.equal(runWorkscope(root, 'add-repo', '../api', '--id', 'api').status, 0);

  const focusResult = runWorkscope(root, 'focus', 'frontend', 'api');
  assert.equal(focusResult.status, 0, output(focusResult));
  assert.match(output(focusResult), /Focused repositories: frontend, api/);
  assert.match(output(focusResult), /Disabled: root, backend/);

  const workspace = readWorkspace(root);
  const byId = Object.fromEntries(workspace.repositories.map((r) => [r.id, r]));
  assert.equal(byId.frontend.disabled, undefined);
  assert.equal(byId.api.disabled, undefined);
  assert.equal(byId.root.disabled, true);
  assert.equal(byId.backend.disabled, true);
});

test('workscope focus --local writes overrides to workspace.local.yaml only', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  const backend = path.join(parent, 'backend');
  initializeGitRepository(root);
  initializeGitRepository(frontend);
  initializeGitRepository(backend);

  assert.equal(runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  assert.equal(runWorkscope(root, 'add-repo', '../backend', '--id', 'backend').status, 0);

  const focusResult = runWorkscope(root, 'focus', 'frontend', '--local');
  assert.equal(focusResult.status, 0, output(focusResult));

  const shared = readWorkspace(root);
  const sharedById = Object.fromEntries(shared.repositories.map((r) => [r.id, r]));
  assert.equal(sharedById.frontend.disabled, undefined);
  assert.equal(sharedById.backend.disabled, undefined);

  const local = readLocalWorkspace(root);
  assert.equal(local.repositories.frontend.disabled, false);
  assert.equal(local.repositories.backend.disabled, true);
});

test('workscope focus refuses to disable configured context repository', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  const backend = path.join(parent, 'backend');
  initializeGitRepository(root);
  initializeGitRepository(frontend);
  initializeGitRepository(backend);

  assert.equal(runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  assert.equal(runWorkscope(root, 'add-repo', '../backend', '--id', 'backend').status, 0);
  assert.equal(runWorkscope(root, 'use-context', 'frontend').status, 0);

  const focusResult = runWorkscope(root, 'focus', 'backend');
  assert.notEqual(focusResult.status, 0);
  assert.match(output(focusResult), /Cannot focus without context repository "frontend"/);

  const okFocusResult = runWorkscope(root, 'focus', 'frontend', 'backend');
  assert.equal(okFocusResult.status, 0, output(okFocusResult));
});

test('workscope focus rejects unknown repository IDs', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(root);
  initializeGitRepository(frontend);

  assert.equal(runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend').status, 0);

  const focusResult = runWorkscope(root, 'focus', 'unknown');
  assert.notEqual(focusResult.status, 0);
  assert.match(output(focusResult), /Unknown workspace repository ID/);
});

test('workscope focus requires at least one repository ID', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(root);
  initializeGitRepository(frontend);

  assert.equal(runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend').status, 0);

  const focusResult = runWorkscope(root, 'focus');
  assert.notEqual(focusResult.status, 0);
  assert.match(output(focusResult), /focus requires at least one repository ID/);
});

test('workscope focus re-enables previously disabled repositories', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  const backend = path.join(parent, 'backend');
  initializeGitRepository(root);
  initializeGitRepository(frontend);
  initializeGitRepository(backend);

  assert.equal(runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  assert.equal(runWorkscope(root, 'add-repo', '../backend', '--id', 'backend').status, 0);
  assert.equal(runWorkscope(root, 'disable-repo', 'frontend').status, 0);

  let workspace = readWorkspace(root);
  assert.equal(workspace.repositories.find((r) => r.id === 'frontend').disabled, true);

  const focusResult = runWorkscope(root, 'focus', 'frontend');
  assert.equal(focusResult.status, 0, output(focusResult));

  workspace = readWorkspace(root);
  assert.equal(workspace.repositories.find((r) => r.id === 'frontend').disabled, undefined);
  assert.equal(workspace.repositories.find((r) => r.id === 'backend').disabled, true);
});

test('workscope focus preserves existing local path overrides', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  const localFrontend = path.join(parent, 'dev-frontend');
  const backend = path.join(parent, 'backend');
  initializeGitRepository(root);
  initializeGitRepository(frontend);
  initializeGitRepository(localFrontend);
  initializeGitRepository(backend);

  assert.equal(runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  assert.equal(runWorkscope(root, 'add-repo', '../backend', '--id', 'backend').status, 0);
  assert.equal(runWorkscope(root, 'bind-repo', 'frontend', localFrontend).status, 0);

  const focusResult = runWorkscope(root, 'focus', 'frontend', '--local');
  assert.equal(focusResult.status, 0, output(focusResult));

  const local = readLocalWorkspace(root);
  assert.equal(local.repositories.frontend.path, localFrontend.split(path.sep).join('/'));
  assert.equal(local.repositories.frontend.disabled, false);
  assert.equal(local.repositories.backend.disabled, true);
});

test('workscope repos lists workspace repositories', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(root);
  initializeGitRepository(frontend);

  assert.equal(runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend', '--description', 'Web app').status, 0);

  const reposResult = runWorkscope(root, 'repos');
  assert.equal(reposResult.status, 0, output(reposResult));
  assert.match(output(reposResult), /frontend\t..\/frontend - Web app \[enabled\]/);
});

test('workscope enable-repo and disable-repo work without task init', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(root);
  initializeGitRepository(frontend);

  assert.equal(runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend').status, 0);

  const disableResult = runWorkscope(root, 'disable-repo', 'frontend');
  assert.equal(disableResult.status, 0, output(disableResult));
  let workspace = readWorkspace(root);
  assert.equal(workspace.repositories.find((r) => r.id === 'frontend').disabled, true);

  const localDisableResult = runWorkscope(root, 'disable-repo', 'frontend', '--local');
  assert.equal(localDisableResult.status, 0, output(localDisableResult));
  const local = readLocalWorkspace(root);
  assert.equal(local.repositories.frontend.disabled, true);

  const enableResult = runWorkscope(root, 'enable-repo', 'frontend');
  assert.equal(enableResult.status, 0, output(enableResult));
  workspace = readWorkspace(root);
  assert.equal(workspace.repositories.find((r) => r.id === 'frontend').disabled, undefined);
});

test('workscope --help shows available commands', () => {
  const helpResult = runWorkscope(process.cwd(), '--help');
  assert.equal(helpResult.status, 0, output(helpResult));
  assert.match(output(helpResult), /workscope focus <id> \[<id>...\] \[--local\]/);
  assert.match(output(helpResult), /workscope add-repo/);
  assert.match(output(helpResult), /workscope use-context/);
  assert.match(output(helpResult), /workscope bind-repo/);
  assert.match(output(helpResult), /workscope repos/);
});

test('workscope write commands generate WORKSPACE.md on first run', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(root);
  initializeGitRepository(frontend);

  assert.equal(existsSync(path.join(root, 'WORKSPACE.md')), false);

  const addResult = runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend');
  assert.equal(addResult.status, 0, output(addResult));
  assert.match(output(addResult), /Ensuring WORKSPACE\.md declaration/);
  assert.match(output(addResult), /✓ WORKSPACE\.md/);

  const readme = readFileSync(path.join(root, 'WORKSPACE.md'), 'utf-8');
  assert.match(readme, /# Workspace/);
  assert.match(readme, /agent workspace for the ROOT/);
  assert.match(readme, /workspace\.yaml/);
  assert.match(readme, /workspace\.local\.yaml/);
  assert.match(readme, /Before selecting a repository or exploring source paths/);
  assert.match(readme, /machine-specific overrides/);
  assert.match(readme, /A string\s+entry overrides the path/);
  assert.match(readme, /missing effective \`disabled\`/);
  assert.match(readme, /Resolve a relative effective path from this workspace directory/);
  assert.match(readme, /Do not select, inspect, index, or include/);
  assert.doesNotMatch(readme, /workscope repos/);
});

test('workscope skips WORKSPACE.md generation when it already exists', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(root);
  initializeGitRepository(frontend);

  assert.equal(runWorkscope(root, 'add-repo', '../frontend', '--id', 'frontend').status, 0);

  const beforeMtime = statSync(path.join(root, 'WORKSPACE.md')).mtimeMs;
  const beforeContent = readFileSync(path.join(root, 'WORKSPACE.md'), 'utf-8');

  const secondResult = runWorkscope(root, 'disable-repo', 'frontend');
  assert.equal(secondResult.status, 0, output(secondResult));
  assert.match(output(secondResult), /- WORKSPACE\.md \(exists\)/);
  assert.doesNotMatch(output(secondResult), /✓ WORKSPACE\.md/);

  const afterMtime = statSync(path.join(root, 'WORKSPACE.md')).mtimeMs;
  const afterContent = readFileSync(path.join(root, 'WORKSPACE.md'), 'utf-8');
  assert.equal(afterMtime, beforeMtime);
  assert.equal(afterContent, beforeContent);
});

test('workscope read-only commands do not generate WORKSPACE.md', (t) => {
  const parent = createTemporaryDirectory(t);
  const root = path.join(parent, 'root');
  initializeGitRepository(root);

  const reposResult = runWorkscope(root, 'repos');
  assert.equal(reposResult.status, 0, output(reposResult));
  assert.equal(existsSync(path.join(root, 'WORKSPACE.md')), false);

  const helpResult = runWorkscope(root, '--help');
  assert.equal(helpResult.status, 0, output(helpResult));
  assert.equal(existsSync(path.join(root, 'WORKSPACE.md')), false);
});
