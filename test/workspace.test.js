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

test('init installs evidence-based brief metadata guidance for task and bug workflows', (t) => {
  const project = createTemporaryDirectory(t);
  initializeGitRepository(project);

  const initResult = runTask(project, 'init');
  assert.equal(initResult.status, 0, output(initResult));

  for (const skillRoot of ['.claude', '.codex']) {
    for (const skillName of ['task-fast', 'task-explore', 'bug-explore']) {
      const skillPath = path.join(project, skillRoot, 'skills', skillName, 'SKILL.md');
      const skill = readFileSync(skillPath, 'utf-8');
      assert.match(skill, /When one or more values exist, YAML frontmatter MUST appear/);
      assert.match(skill, /Do not omit frontmatter merely because some fields have no value/);
      assert.match(skill, /for work that spans workspace repositories, working_set must list repository-ID-prefixed paths/);
      assert.match(skill, /omit fields that have no value; do not add empty placeholders/);
      assert.match(skill, /omit frontmatter only when none of these fields has an evidence-backed value/);
    }
  }
});

test('init installs strict decision memory noise controls', (t) => {
  const project = createTemporaryDirectory(t);
  initializeGitRepository(project);

  const initResult = runTask(project, 'init');
  assert.equal(initResult.status, 0, output(initResult));

  for (const skillRoot of ['.claude', '.codex']) {
    const skillsDirectory = path.join(project, skillRoot, 'skills');
    const decisionLog = readFileSync(path.join(skillsDirectory, 'decision-log', 'SKILL.md'), 'utf-8');
    const decisionSweep = readFileSync(path.join(skillsDirectory, 'decision-sweep-weekly', 'SKILL.md'), 'utf-8');
    const decisionCurate = readFileSync(path.join(skillsDirectory, 'decision-curate', 'SKILL.md'), 'utf-8');

    assert.match(decisionLog, /Record approved stable project constraints/);
    assert.match(decisionLog, /Bug count, task count, or review pain is not a selection criterion/);
    assert.match(decisionLog, /Future-choice test/);
    assert.match(decisionLog, /common engineering practices already implied by the codebase, tests, or toolchain/);
    assert.match(decisionLog, /Do not create separate entries for repeated symptoms/);
    assert.match(decisionLog, /A zero-entry outcome is acceptable/);

    assert.match(decisionSweep, /A sweep that proposes no new decisions is a valid successful outcome/);
    assert.match(decisionSweep, /Repeated symptoms are evidence, not separate decisions/);
    assert.match(decisionSweep, /Decision growth must be non-linear with task and bug volume/);
    assert.match(decisionSweep, /Prefer zero drafts over weak drafts/);
    assert.match(decisionSweep, /Captures a bug lesson, postmortem reminder, or ordinary mistake instead of a project constraint/);

    assert.match(decisionCurate, /Prune assertively/);
    assert.match(decisionCurate, /It must change a future choice, not merely remind developers to avoid a past mistake/);
    assert.match(decisionCurate, /Possible future usefulness is not enough/);
    assert.match(decisionCurate, /Bias toward removal or merge/);
    assert.match(decisionCurate, /Prefer deleting or merging low-value entries/);
    assert.match(decisionCurate, /Do not keep an entry merely because removal feels risky/);
  }
});

test('init installs task-fast plus implementation and fix proposal gates without plan skills', (t) => {
  const project = createTemporaryDirectory(t);
  initializeGitRepository(project);

  const initResult = runTask(project, 'init');
  assert.equal(initResult.status, 0, output(initResult));

  for (const skillRoot of ['.claude', '.codex']) {
    const skillsDirectory = path.join(project, skillRoot, 'skills');
    const taskImplement = readFileSync(path.join(skillsDirectory, 'task-implement', 'SKILL.md'), 'utf-8');
    const bugFix = readFileSync(path.join(skillsDirectory, 'bug-fix', 'SKILL.md'), 'utf-8');

    const taskFast = readFileSync(path.join(skillsDirectory, 'task-fast', 'SKILL.md'), 'utf-8');

    assert.match(taskFast, /Fast path for obvious small changes or fixes/);
    assert.match(taskFast, /User invocation of task-fast is authorization to execute directly/);
    assert.match(taskFast, /recommend task-explore for changed behavior or bug-explore for a non-obvious defect/);
    assert.equal(existsSync(path.join(skillsDirectory, 'task-plan', 'SKILL.md')), false);
    assert.equal(existsSync(path.join(skillsDirectory, 'bug-plan', 'SKILL.md')), false);

    assert.match(taskImplement, /Default to Direct Execution/);
    assert.match(taskImplement, /Implementation Proposal/);
    assert.match(taskImplement, /concise modification report, not a request for the user to design the implementation/);
    assert.match(taskImplement, /## Recommended Action/);
    assert.match(taskImplement, /Do not ask the user to choose routine implementation details/);
    assert.match(taskImplement, /multiple reasonable implementation approaches exist/);
    assert.match(taskImplement, /Do not create a proposal when/);
    assert.match(taskImplement, /Do not repeat broad discovery after confirmation/);
    assert.match(taskImplement, /Do not invent a pre-approval plan for routine work/);
    assert.doesNotMatch(taskImplement, /Ask whether to proceed/);
    assert.doesNotMatch(taskImplement, /Plan-Aware Preparation/);
    assert.doesNotMatch(taskImplement, /Plan Context/);

    assert.match(bugFix, /Fix Strategy Proposal/);
    assert.match(bugFix, /concise fix report, not a request for the user to design the repair/);
    assert.match(bugFix, /## Next Step/);
    assert.match(bugFix, /Do not ask the user to choose routine repair details/);
    assert.match(bugFix, /Do not delay fixes for immaterial uncertainty/);
    assert.match(bugFix, /multiple fixes have materially different trade-offs/);
    assert.match(bugFix, /Do not repeat broad discovery after confirmation/);
    assert.doesNotMatch(bugFix, /Ask whether to proceed/);
    assert.doesNotMatch(bugFix, /Plan-Aware Preparation/);
    assert.doesNotMatch(bugFix, /Plan Context/);
  }

  const refreshResult = runTask(project, 'refresh');
  assert.equal(refreshResult.status, 0, output(refreshResult));
  assert.equal(existsSync(path.join(project, '.codex', 'skills', 'task-fast', 'SKILL.md')), true);
  assert.equal(existsSync(path.join(project, '.codex', 'skills', 'task-plan', 'SKILL.md')), false);
  assert.equal(existsSync(path.join(project, '.claude', 'skills', 'bug-plan', 'SKILL.md')), false);

  const helpResult = runTask(project, '--help');
  assert.equal(helpResult.status, 0, output(helpResult));
  assert.match(output(helpResult), /fast: task-fast/);
  assert.doesNotMatch(output(helpResult), /task-plan|bug-plan/);
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
  mkdirSync(path.dirname(staleSkillPath), { recursive: true });
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

test('use-context keeps skills at the launch root and routes workflow state to a Git context repository', (t) => {
  const parent = createTemporaryDirectory(t);
  const launchRoot = path.join(parent, 'workspace');
  const context = path.join(launchRoot, 'agent-context');
  const backend = path.join(launchRoot, 'backend');
  initializeGitRepository(launchRoot);
  initializeGitRepository(context);
  initializeGitRepository(backend);

  assert.equal(runTask(launchRoot, 'init').status, 0);
  writeFileSync(path.join(launchRoot, '.ai', 'tasks', 'active', 'legacy.md'), '# Legacy root state\n');
  assert.equal(runTask(launchRoot, 'add-repo', 'agent-context', '--id', 'agent-context').status, 0);
  writeFileSync(path.join(context, 'workspace.yaml'), `${JSON.stringify({
    version: 1,
    repositories: [
      { id: 'agent-context', path: '.' },
      { id: 'backend', path: '../backend' },
    ],
  }, null, 2)}\n`);

  const useContextResult = runTask(launchRoot, 'use-context', 'agent-context');
  assert.equal(useContextResult.status, 0, output(useContextResult));

  const launchWorkspace = JSON.parse(readFileSync(path.join(launchRoot, 'workspace.yaml'), 'utf-8'));
  assert.equal(launchWorkspace.context_repository, 'agent-context');
  assert.equal(existsSync(path.join(context, '.ai', 'decisions', 'decisions.md')), true);
  assert.equal(readFileSync(path.join(launchRoot, '.ai', 'tasks', 'active', 'legacy.md'), 'utf-8'), '# Legacy root state\n');
  assert.equal(existsSync(path.join(launchRoot, '.codex', 'skills', 'task-explore', 'SKILL.md')), true);
  assert.equal(existsSync(path.join(context, '.codex', 'skills')), false);
  for (const skillName of [
    'task-fast', 'task-explore', 'task-implement', 'task-audit', 'task-cancel',
    'bug-explore', 'bug-fix', 'bug-audit', 'bug-cancel',
    'decision-log', 'decision-sweep-weekly', 'decision-curate',
  ]) {
    const skill = readFileSync(path.join(launchRoot, '.codex', 'skills', skillName, 'SKILL.md'), 'utf-8');
    assert.match(skill, /context_repository/);
  }

  rmSync(path.join(context, '.ai'), { recursive: true, force: true });
  const initResult = runTask(launchRoot, 'init');
  assert.equal(initResult.status, 0, output(initResult));
  assert.equal(existsSync(path.join(context, '.ai', 'decisions', 'decisions.md')), true);

  const refreshResult = runTask(launchRoot, 'refresh');
  assert.equal(refreshResult.status, 0, output(refreshResult));
  assert.equal(existsSync(path.join(launchRoot, '.codex', 'skills', 'task-fast', 'SKILL.md')), true);

  rmSync(path.join(launchRoot, '.ai'), { recursive: true, force: true });
  const reselectContextResult = runTask(launchRoot, 'use-context', 'agent-context');
  assert.equal(reselectContextResult.status, 0, output(reselectContextResult));
  const doctorResult = runTask(launchRoot, 'doctor');
  assert.equal(doctorResult.status, 0, output(doctorResult));
  assert.match(output(doctorResult), /context\/\.ai - present/);
  assert.match(output(doctorResult), /workspace repository backend - \.\.\/backend/);
});

test('context configuration never falls back to root workflow state when the selected repository is unavailable', (t) => {
  const parent = createTemporaryDirectory(t);
  const launchRoot = path.join(parent, 'workspace');
  const context = path.join(launchRoot, 'agent-context');
  initializeGitRepository(launchRoot);
  initializeGitRepository(context);

  assert.equal(runTask(launchRoot, 'init').status, 0);
  assert.equal(runTask(launchRoot, 'add-repo', 'agent-context', '--id', 'agent-context').status, 0);
  const manifestPath = path.join(launchRoot, 'workspace.yaml');
  const workspace = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  workspace.context_repository = 'agent-context';
  writeFileSync(manifestPath, `${JSON.stringify(workspace, null, 2)}\n`);
  rmSync(path.join(launchRoot, '.ai'), { recursive: true, force: true });
  rmSync(context, { recursive: true, force: true });

  const refreshResult = runTask(launchRoot, 'refresh');
  assert.notEqual(refreshResult.status, 0);
  assert.match(output(refreshResult), /Configured context repository "agent-context" is invalid/);
  assert.equal(existsSync(path.join(launchRoot, '.ai')), false);

  const doctorResult = runTask(launchRoot, 'doctor');
  assert.equal(doctorResult.status, 0, output(doctorResult));
  assert.match(output(doctorResult), /context_repository - Configured context repository "agent-context" is invalid/);
  assert.doesNotMatch(output(doctorResult), /\.ai - present/);
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

test('disabled workspace repositories are skipped and local configuration can re-enable them', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  const manifestPath = path.join(backend, 'workspace.yaml');
  const workspace = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  workspace.repositories.find((repository) => repository.id === 'frontend').disabled = true;
  writeFileSync(manifestPath, `${JSON.stringify(workspace, null, 2)}\n`);
  rmSync(frontend, { recursive: true, force: true });

  const reposResult = runTask(backend, 'repos');
  assert.equal(reposResult.status, 0, output(reposResult));
  assert.match(output(reposResult), /frontend\t..\/frontend \[disabled\]/);

  const disabledDoctorResult = runTask(backend, 'doctor');
  assert.equal(disabledDoctorResult.status, 0, output(disabledDoctorResult));
  assert.match(output(disabledDoctorResult), /workspace repository frontend - disabled/);
  assert.doesNotMatch(output(disabledDoctorResult), /workspace repository frontend - missing/);

  writeFileSync(path.join(backend, 'workspace.local.yaml'), `${JSON.stringify({
    version: 1,
    repositories: { frontend: { disabled: false } },
  }, null, 2)}\n`);
  const reenabledDoctorResult = runTask(backend, 'doctor');
  assert.equal(reenabledDoctorResult.status, 0, output(reenabledDoctorResult));
  assert.match(output(reenabledDoctorResult), /workspace repository frontend - missing at ..\/frontend/);

  const projectExplore = readFileSync(
    path.join(backend, '.codex', 'skills', 'project-explore', 'SKILL.md'),
    'utf-8'
  );
  assert.match(projectExplore, /disabled flag is true.*Do not select, inspect, index/);
});

test('enable-repo and disable-repo update shared and local repository status', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend', '--id', 'frontend').status, 0);

  const disabledResult = runTask(backend, 'disable-repo', 'frontend');
  assert.equal(disabledResult.status, 0, output(disabledResult));
  assert.match(output(disabledResult), /Disabled repository frontend in the workspace manifest/);
  let workspace = JSON.parse(readFileSync(path.join(backend, 'workspace.yaml'), 'utf-8'));
  assert.equal(workspace.repositories.find((repository) => repository.id === 'frontend').disabled, true);

  const disabledReposResult = runTask(backend, 'repos');
  assert.equal(disabledReposResult.status, 0, output(disabledReposResult));
  assert.match(output(disabledReposResult), /backend\t\. \[enabled\]/);
  assert.match(output(disabledReposResult), /frontend\t..\/frontend \[disabled\]/);

  const enabledResult = runTask(backend, 'enable-repo', 'frontend');
  assert.equal(enabledResult.status, 0, output(enabledResult));
  workspace = JSON.parse(readFileSync(path.join(backend, 'workspace.yaml'), 'utf-8'));
  assert.equal(workspace.repositories.find((repository) => repository.id === 'frontend').disabled, undefined);

  const bindResult = runTask(backend, 'bind-repo', 'frontend', '../frontend');
  assert.equal(bindResult.status, 0, output(bindResult));
  const boundLocalWorkspace = JSON.parse(readFileSync(path.join(backend, 'workspace.local.yaml'), 'utf-8'));
  const boundLocalPath = boundLocalWorkspace.repositories.frontend;

  const locallyDisabledResult = runTask(backend, 'disable-repo', 'frontend', '--local');
  assert.equal(locallyDisabledResult.status, 0, output(locallyDisabledResult));
  let localWorkspace = JSON.parse(readFileSync(path.join(backend, 'workspace.local.yaml'), 'utf-8'));
  assert.deepEqual(localWorkspace.repositories.frontend, { path: boundLocalPath, disabled: true });

  const locallyEnabledResult = runTask(backend, 'enable-repo', 'frontend', '--local');
  assert.equal(locallyEnabledResult.status, 0, output(locallyEnabledResult));
  localWorkspace = JSON.parse(readFileSync(path.join(backend, 'workspace.local.yaml'), 'utf-8'));
  assert.deepEqual(localWorkspace.repositories.frontend, { path: boundLocalPath, disabled: false });

  const unknownResult = runTask(backend, 'disable-repo', 'unknown');
  assert.notEqual(unknownResult.status, 0);
  assert.match(output(unknownResult), /Unknown workspace repository ID/);

  const helpResult = runTask(backend, '--help');
  assert.equal(helpResult.status, 0, output(helpResult));
  assert.match(output(helpResult), /task enable-repo <id> \[--local\]/);
  assert.match(output(helpResult), /task disable-repo <id> \[--local\]/);
});

test('workspace disabled flags must be boolean', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  writeFileSync(path.join(backend, 'workspace.local.yaml'), `${JSON.stringify({
    version: 1,
    repositories: { frontend: { disabled: 'true' } },
  }, null, 2)}\n`);

  const result = runTask(backend, 'doctor');
  assert.equal(result.status, 0, output(result));
  assert.match(output(result), /workspace\.local\.yaml repository disabled flags must be booleans/);
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
