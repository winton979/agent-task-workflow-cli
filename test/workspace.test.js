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

function createTemporaryHome(t) {
  const home = mkdtempSync(path.join(tmpdir(), 'task-cli-home-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  return home;
}

function runTask(cwd, ...args) {
  let home;
  const last = args[args.length - 1];
  if (last && typeof last === 'object' && !Array.isArray(last)) {
    home = args.pop().home;
  }
  const env = { ...process.env };
  if (home) {
    env.HOME = home;
    env.USERPROFILE = home;
  }
  return spawnSync(process.execPath, [taskBin, ...args], {
    cwd,
    encoding: 'utf-8',
    env,
  });
}

function output(result) {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

test('init keeps the existing single-project workflow unchanged', (t) => {
  const project = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
  initializeGitRepository(project);

  const result = runTask(project, 'init');

  assert.equal(result.status, 0, output(result));
  assert.equal(existsSync(path.join(project, '.ai', 'decisions', 'decisions.md')), true);
  assert.equal(existsSync(path.join(project, '.ai', 'efforts')), false);
  assert.equal(existsSync(path.join(project, '.ai', 'specs')), false);
  assert.equal(existsSync(path.join(project, '.claude')), false);
  assert.equal(existsSync(path.join(project, '.codex')), false);
  assert.equal(existsSync(path.join(project, 'CONTEXT.md')), false);
  assert.equal(existsSync(path.join(project, 'GLOSSARY.md')), false);
  assert.equal(existsSync(path.join(project, 'workspace.yaml')), false);
  const gitignore = readFileSync(path.join(project, '.gitignore'), 'utf-8');
  assert.match(gitignore, /workspace\.local\.yaml/);
  assert.doesNotMatch(gitignore, /\.ai\/efforts|\.ai\/runs/);

  const doctorResult = runTask(project, 'doctor', { home });
  assert.equal(doctorResult.status, 0, output(doctorResult));
  assert.match(output(doctorResult), /\.ai\/tasks\/active - present/);
  assert.match(output(doctorResult), /\.ai\/bugs\/active - present/);
  assert.doesNotMatch(output(doctorResult), /\.ai\/efforts|\.ai\/specs/);
  assert.doesNotMatch(output(doctorResult), /workspace\.yaml/);
});

test('skill install provides evidence-based brief metadata guidance for task and bug workflows', (t) => {
  const project = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
  initializeGitRepository(project);

  const initResult = runTask(project, 'init');
  assert.equal(initResult.status, 0, output(initResult));
  for (const target of ['claude', 'codex']) {
    const installResult = runTask(project, 'skill', 'install', target, { home });
    assert.equal(installResult.status, 0, output(installResult));
  }

  for (const skillRoot of ['.claude', '.codex']) {
    for (const skillName of ['task-fast', 'task-explore', 'bug-explore']) {
      const skillPath = path.join(home, skillRoot, 'skills', skillName, 'SKILL.md');
      const skill = readFileSync(skillPath, 'utf-8');
      assert.match(skill, /When one or more values exist, YAML frontmatter MUST appear/);
      assert.match(skill, /Do not omit frontmatter merely because some fields have no value/);
      assert.match(skill, /for work that spans workspace repositories, working_set must list repository-ID-prefixed paths/);
      assert.match(skill, /omit fields that have no value; do not add empty placeholders/);
      assert.match(skill, /omit frontmatter only when none of these fields has an evidence-backed value/);
    }
  }
});

test('skill install provides diagnostic feedback-loop and regression-loop rules for bugs', (t) => {
  const project = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
  initializeGitRepository(project);

  const initResult = runTask(project, 'init');
  assert.equal(initResult.status, 0, output(initResult));
  for (const target of ['claude', 'codex']) {
    const installResult = runTask(project, 'skill', 'install', target, { home });
    assert.equal(installResult.status, 0, output(installResult));
  }

  for (const skillRoot of ['.claude', '.codex']) {
    const skillsDirectory = path.join(home, skillRoot, 'skills');
    const bugExplore = readFileSync(path.join(skillsDirectory, 'bug-explore', 'SKILL.md'), 'utf-8');
    const bugFix = readFileSync(path.join(skillsDirectory, 'bug-fix', 'SKILL.md'), 'utf-8');

    assert.match(bugExplore, /Diagnostic Loop/);
    assert.match(bugExplore, /tight feedback loop/);
    assert.match(bugExplore, /red-capable symptom/);
    assert.match(bugExplore, /Do not output BUG_READY or claim a confirmed root cause/);
    assert.match(bugFix, /Regression Loop/);
    assert.match(bugFix, /failing regression test before the fix/);
    assert.match(bugFix, /temporary diagnostic logging or instrumentation/);
  }
});

test('skill install provides strict decision memory noise controls', (t) => {
  const project = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
  initializeGitRepository(project);

  const initResult = runTask(project, 'init');
  assert.equal(initResult.status, 0, output(initResult));
  for (const target of ['claude', 'codex']) {
    const installResult = runTask(project, 'skill', 'install', target, { home });
    assert.equal(installResult.status, 0, output(installResult));
  }

  for (const skillRoot of ['.claude', '.codex']) {
    const skillsDirectory = path.join(home, skillRoot, 'skills');
    const decisionLog = readFileSync(path.join(skillsDirectory, 'decision-log', 'SKILL.md'), 'utf-8');
    const decisionSweep = readFileSync(path.join(skillsDirectory, 'decision-sweep-weekly', 'SKILL.md'), 'utf-8');
    const decisionCurate = readFileSync(path.join(skillsDirectory, 'decision-curate', 'SKILL.md'), 'utf-8');

    assert.match(decisionLog, /Record approved stable project constraints/);
    assert.match(decisionLog, /Bug count, task count, or review pain is not a selection criterion/);
    assert.match(decisionLog, /Future-choice test/);
    assert.match(decisionLog, /Artifact test/);
    assert.match(decisionLog, /project documentation already makes the constraint unambiguous/);
    assert.match(decisionLog, /common engineering practices already implied by the codebase, tests, or toolchain/);
    assert.match(decisionLog, /Do not create separate entries for repeated symptoms/);
    assert.match(decisionLog, /A zero-entry outcome is acceptable/);

    assert.match(decisionSweep, /A sweep that proposes no new decisions is a valid successful outcome/);
    assert.match(decisionSweep, /It is not a scheduled weekly requirement/);
    assert.match(decisionSweep, /When no range is specified, default to the last 7 days/);
    assert.match(decisionSweep, /Repeated symptoms are evidence, not separate decisions/);
    assert.match(decisionSweep, /Decision growth must be non-linear with task and bug volume/);
    assert.match(decisionSweep, /The number of scanned briefs never implies a minimum draft count/);
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

test('skill install provides adaptive direct completion and frontier grilling without plan skills', (t) => {
  const project = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
  initializeGitRepository(project);

  const initResult = runTask(project, 'init');
  assert.equal(initResult.status, 0, output(initResult));
  for (const target of ['claude', 'codex']) {
    const installResult = runTask(project, 'skill', 'install', target, { home });
    assert.equal(installResult.status, 0, output(installResult));
  }

  for (const skillRoot of ['.claude', '.codex']) {
    const skillsDirectory = path.join(home, skillRoot, 'skills');
    const taskImplement = readFileSync(path.join(skillsDirectory, 'task-implement', 'SKILL.md'), 'utf-8');
    const bugFix = readFileSync(path.join(skillsDirectory, 'bug-fix', 'SKILL.md'), 'utf-8');

    const taskFast = readFileSync(path.join(skillsDirectory, 'task-fast', 'SKILL.md'), 'utf-8');
    const taskExplore = readFileSync(path.join(skillsDirectory, 'task-explore', 'SKILL.md'), 'utf-8');
    const bugExplore = readFileSync(path.join(skillsDirectory, 'bug-explore', 'SKILL.md'), 'utf-8');

    assert.match(taskFast, /Direct Completion Check/);
    assert.match(taskFast, /A user's claim that work is simple is a lead, not sufficient evidence/);
    assert.match(taskFast, /trivial, narrow patch, not merely a local or single-module implementation/);
    assert.match(taskFast, /Direct Completion is a proof obligation, not a confidence score/);
    assert.match(taskFast, /Any ambiguity that cannot be ruled out is an unresolved decision/);
    assert.match(taskFast, /active decisions that clearly apply to the changed area/);
    assert.match(taskFast, /Select exactly one escalation route/);
    assert.match(taskFast, /do not create or update an artifact for the unselected route/);
    assert.match(taskFast, /Do not create, update, or require a task, bug, or decision artifact/);
    assert.match(taskFast, /Retain the resulting absolute canonical directory as `workflowStateRoot`/);
    assert.match(taskFast, /Never use a relative `\.ai\/\.\.\.` path/);
    assert.match(taskFast, /<workflowStateRoot>\/\.ai\/decisions\/decisions\.md/);
    assert.match(taskFast, /<workflowStateRoot>\/\.ai\/tasks\/active\/YYYY-MM-DD-task-name\.md/);
    assert.doesNotMatch(taskFast, /<workflowStateRoot>\/\.ai\/tasks\/archive\//);
    assert.equal(taskFast.includes('inspect .ai/decisions/decisions.md'), false);
    assert.equal(existsSync(path.join(skillsDirectory, 'task-plan', 'SKILL.md')), false);
    assert.equal(existsSync(path.join(skillsDirectory, 'bug-plan', 'SKILL.md')), false);

    assert.match(taskExplore, /Complete trivial, unambiguous tasks directly/);
    assert.match(taskExplore, /If Direct Completion qualifies, implement and validate it now, then output TASK_DONE/);
    assert.match(taskExplore, /Full Task Exploration/);

    assert.match(bugExplore, /Fix a verified, local bug directly/);
    assert.match(bugExplore, /If Direct Completion qualifies, fix and validate it now, then output BUG_DONE/);
    assert.match(bugExplore, /Full Bug Exploration/);
    assert.match(bugExplore, /for a reported defect, evidence identifies the faulty behavior and the local correction/);

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

  const removedSkillNames = ['effort-explore', 'effort-spec', 'effort-implement'];
  for (const skillRoot of ['.claude', '.codex']) {
    writeFileSync(
      path.join(home, skillRoot, 'skills', 'task-fast', 'SKILL.md'),
      'Stale task-fast guidance.\n'
    );
    for (const skillName of removedSkillNames) {
      const skillPath = path.join(home, skillRoot, 'skills', skillName, 'SKILL.md');
      mkdirSync(path.dirname(skillPath), { recursive: true });
      writeFileSync(skillPath, 'Stale removed workflow.\n');
    }
  }

  const updateResult = runTask(project, 'skill', 'update', { home });
  assert.equal(updateResult.status, 0, output(updateResult));
  assert.equal(existsSync(path.join(project, 'CONTEXT.md')), false);
  for (const skillRoot of ['.claude', '.codex']) {
    const refreshedTaskFast = readFileSync(
      path.join(home, skillRoot, 'skills', 'task-fast', 'SKILL.md'),
      'utf-8'
    );
    assert.match(refreshedTaskFast, /Direct Completion Check/);
    assert.match(refreshedTaskFast, /Automatic Escalation/);
    for (const skillName of removedSkillNames) {
      assert.equal(existsSync(path.join(home, skillRoot, 'skills', skillName)), false);
    }
    for (const skillName of ['decision-log', 'decision-sweep-weekly', 'decision-curate']) {
      assert.equal(existsSync(path.join(home, skillRoot, 'skills', skillName, 'SKILL.md')), true);
    }
    assert.equal(existsSync(path.join(home, skillRoot, 'skills', 'task-plan', 'SKILL.md')), false);
    assert.equal(existsSync(path.join(home, skillRoot, 'skills', 'bug-plan', 'SKILL.md')), false);
  }

  const helpResult = runTask(project, '--help');
  assert.equal(helpResult.status, 0, output(helpResult));
  assert.match(output(helpResult), /fast: task-fast/);
  assert.match(output(helpResult), /other: decision-log \| decision-curate/);
  assert.doesNotMatch(output(helpResult), /effort-|task-plan|bug-plan/);
});

test('refresh removes legacy project-local managed skills but keeps unrelated custom skills', (t) => {
  const project = createTemporaryDirectory(t);
  initializeGitRepository(project);
  assert.equal(runTask(project, 'init').status, 0);

  for (const skillRoot of ['.claude', '.codex']) {
    for (const skillName of ['task-fast', 'task-explore', 'task-plan']) {
      const skillPath = path.join(project, skillRoot, 'skills', skillName, 'SKILL.md');
      mkdirSync(path.dirname(skillPath), { recursive: true });
      writeFileSync(skillPath, 'Old project-local managed skill.\n');
    }
  }
  const customSkillPath = path.join(project, '.claude', 'skills', 'my-own-skill', 'SKILL.md');
  mkdirSync(path.dirname(customSkillPath), { recursive: true });
  writeFileSync(customSkillPath, 'User skill.\n');

  const refreshResult = runTask(project, 'refresh');
  assert.equal(refreshResult.status, 0, output(refreshResult));
  assert.equal(existsSync(path.join(project, '.claude', 'skills', 'task-fast')), false);
  assert.equal(existsSync(path.join(project, '.codex', 'skills', 'task-plan')), false);
  assert.equal(existsSync(customSkillPath), true);
  assert.equal(existsSync(path.join(project, '.claude', 'skills', 'task-explore')), false);
});

test('skill install validates targets, records config, and updates through recorded targets', (t) => {
  const project = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
  initializeGitRepository(project);

  const missingTarget = runTask(project, 'skill', 'install', { home });
  assert.notEqual(missingTarget.status, 0);
  assert.match(output(missingTarget), /skill install requires a target: agents \| claude \| codex/);

  const invalidTarget = runTask(project, 'skill', 'install', 'gemini', { home });
  assert.notEqual(invalidTarget.status, 0);
  assert.match(output(invalidTarget), /Unknown skill target "gemini"/);

  const agentsResult = runTask(project, 'skill', 'install', '.agents', { home });
  assert.equal(agentsResult.status, 0, output(agentsResult));
  assert.equal(existsSync(path.join(home, '.agents', 'skills', 'task-explore', 'SKILL.md')), true);
  assert.equal(existsSync(path.join(home, '.agents', 'skills', 'project-explore', 'agents', 'openai.yaml')), false);

  const codexResult = runTask(project, 'skill', 'install', 'codex', { home });
  assert.equal(codexResult.status, 0, output(codexResult));
  assert.equal(existsSync(path.join(home, '.codex', 'skills', 'project-explore', 'agents', 'openai.yaml')), true);

  const config = JSON.parse(readFileSync(path.join(home, '.task-cli', 'config.json'), 'utf-8'));
  assert.deepEqual(config, { skillTargets: ['agents', 'codex'] });

  const emptyHome = createTemporaryHome(t);
  const updateWithoutTargets = runTask(project, 'skill', 'update', { home: emptyHome });
  assert.notEqual(updateWithoutTargets.status, 0);
  assert.match(output(updateWithoutTargets), /No skill targets configured/);
});

test('skill remove deletes managed global skills and target config while keeping custom skills', (t) => {
  const project = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
  initializeGitRepository(project);

  assert.equal(runTask(project, 'skill', 'install', 'claude', { home }).status, 0);
  assert.equal(runTask(project, 'skill', 'install', 'codex', { home }).status, 0);
  const customSkillPath = path.join(home, '.claude', 'skills', 'my-own-skill', 'SKILL.md');
  mkdirSync(path.dirname(customSkillPath), { recursive: true });
  writeFileSync(customSkillPath, 'User skill.\n');

  const removeClaudeResult = runTask(project, 'skill', 'remove', 'claude', { home });
  assert.equal(removeClaudeResult.status, 0, output(removeClaudeResult));
  assert.equal(existsSync(path.join(home, '.claude', 'skills', 'task-explore')), false);
  assert.equal(existsSync(path.join(home, '.codex', 'skills', 'task-explore')), true);
  assert.equal(existsSync(customSkillPath), true);
  let config = JSON.parse(readFileSync(path.join(home, '.task-cli', 'config.json'), 'utf-8'));
  assert.deepEqual(config, { skillTargets: ['codex'] });

  const removeAllResult = runTask(project, 'skill', 'remove', { home });
  assert.equal(removeAllResult.status, 0, output(removeAllResult));
  assert.equal(existsSync(path.join(home, '.codex', 'skills', 'task-explore')), false);
  assert.equal(existsSync(path.join(home, '.task-cli', 'config.json')), false);

  const doctorResult = runTask(project, 'doctor', { home });
  assert.equal(doctorResult.status, 0, output(doctorResult));
  assert.match(output(doctorResult), /global skills - not installed/);

  const emptyHome = createTemporaryHome(t);
  const removeWithoutConfig = runTask(project, 'skill', 'remove', { home: emptyHome });
  assert.notEqual(removeWithoutConfig.status, 0);
  assert.match(output(removeWithoutConfig), /No skill targets configured/);
});

test('doctor checks globally installed skills and suggests repair commands', (t) => {
  const project = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
  initializeGitRepository(project);
  assert.equal(runTask(project, 'init').status, 0);

  const beforeInstall = runTask(project, 'doctor', { home });
  assert.equal(beforeInstall.status, 0, output(beforeInstall));
  assert.match(output(beforeInstall), /global skills - not installed, run `task skill install <agents\|claude\|codex>`/);
  assert.match(output(beforeInstall), /Recommended next step: run `task skill install/);

  assert.equal(runTask(project, 'skill', 'install', 'claude', { home }).status, 0);

  const healthyDoctor = runTask(project, 'doctor', { home });
  assert.equal(healthyDoctor.status, 0, output(healthyDoctor));
  assert.match(output(healthyDoctor), /~\/\.claude\/skills\/task-fast - current/);
  assert.match(output(healthyDoctor), /Task workflow is healthy/);

  writeFileSync(path.join(home, '.claude', 'skills', 'task-fast', 'SKILL.md'), 'Stale guidance.\n');
  const outdatedDoctor = runTask(project, 'doctor', { home });
  assert.equal(outdatedDoctor.status, 0, output(outdatedDoctor));
  assert.match(output(outdatedDoctor), /outdated, run `task skill update`/);
  assert.match(output(outdatedDoctor), /Recommended next step: run `task skill update`/);
});

test('workflow documentation describes the supported task, bug, decision, and project workflows', () => {
  const english = readFileSync(path.join(projectRoot, 'README.md'), 'utf-8');
  const chinese = readFileSync(path.join(projectRoot, 'README.zh-CN.md'), 'utf-8');

  assert.match(english, /evidence-based direct-completion check/);
  assert.match(english, /automatically continues with full task or bug exploration/);
  assert.match(english, /independent frontier in rounds/);
  assert.match(english, /project-explore/);
  assert.match(english, /task-fast/);
  assert.match(english, /task-explore/);
  assert.match(english, /bug-explore/);
  assert.match(english, /decision-log/);
  assert.match(english, /decision-curate/);
  assert.doesNotMatch(english, /effort-explore|effort-spec|effort-implement|Task Graph/i);
  assert.match(chinese, /基于证据的直接完成检查/);
  assert.match(chinese, /自动进入完整的 task 或 bug 探索/);
  assert.match(chinese, /当前所有互不依赖的问题/);
  assert.match(chinese, /project-explore/);
  assert.match(chinese, /task-fast/);
  assert.match(chinese, /task-explore/);
  assert.match(chinese, /bug-explore/);
  assert.match(chinese, /decision-log/);
  assert.match(chinese, /decision-curate/);
  assert.doesNotMatch(chinese, /effort-explore|effort-spec|effort-implement|任务图/i);
});

test('add-repo promotes an initialized Git project to a portable workspace', (t) => {
  const parent = createTemporaryDirectory(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  const initResult = runTask(backend, 'init');
  assert.equal(initResult.status, 0, output(initResult));

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

test('use-context routes workflow state to a Git context repository while skills stay global', (t) => {
  const parent = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
  const launchRoot = path.join(parent, 'workspace');
  const context = path.join(launchRoot, 'agent-context');
  const backend = path.join(launchRoot, 'backend');
  initializeGitRepository(launchRoot);
  initializeGitRepository(context);
  initializeGitRepository(backend);

  assert.equal(runTask(launchRoot, 'init').status, 0);
  assert.equal(runTask(launchRoot, 'skill', 'install', 'codex', { home }).status, 0);
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
  assert.equal(existsSync(path.join(context, '.ai', 'efforts')), false);
  assert.equal(existsSync(path.join(context, '.ai', 'specs')), false);
  assert.equal(existsSync(path.join(context, 'CONTEXT.md')), false);
  const contextGitignore = readFileSync(path.join(context, '.gitignore'), 'utf-8');
  assert.doesNotMatch(contextGitignore, /\.ai\/efforts|\.ai\/runs/);
  assert.equal(readFileSync(path.join(launchRoot, '.ai', 'tasks', 'active', 'legacy.md'), 'utf-8'), '# Legacy root state\n');
  assert.equal(existsSync(path.join(launchRoot, '.codex')), false);
  assert.equal(existsSync(path.join(context, '.codex')), false);
  for (const skillName of [
    'project-explore', 'task-fast', 'task-explore', 'task-implement', 'task-audit', 'task-cancel',
    'bug-explore', 'bug-fix', 'bug-audit', 'bug-cancel',
    'decision-log', 'decision-sweep-weekly', 'decision-curate',
  ]) {
    const skill = readFileSync(path.join(home, '.codex', 'skills', skillName, 'SKILL.md'), 'utf-8');
    assert.match(skill, /context_repository/);
  }

  rmSync(path.join(context, '.ai'), { recursive: true, force: true });
  const initResult = runTask(launchRoot, 'init');
  assert.equal(initResult.status, 0, output(initResult));
  assert.equal(existsSync(path.join(context, '.ai', 'decisions', 'decisions.md')), true);

  const refreshResult = runTask(launchRoot, 'refresh');
  assert.equal(refreshResult.status, 0, output(refreshResult));
  assert.equal(existsSync(path.join(launchRoot, '.codex')), false);

  rmSync(path.join(launchRoot, '.ai'), { recursive: true, force: true });
  const reselectContextResult = runTask(launchRoot, 'use-context', 'agent-context');
  assert.equal(reselectContextResult.status, 0, output(reselectContextResult));
  const doctorResult = runTask(launchRoot, 'doctor', { home });
  assert.equal(doctorResult.status, 0, output(doctorResult));
  assert.match(output(doctorResult), /context\/\.ai - present/);
  assert.match(output(doctorResult), /workspace repository backend - \.\.\/backend/);
});

test('context configuration never falls back to root workflow state when the selected repository is unavailable', (t) => {
  const parent = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
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

  const doctorResult = runTask(launchRoot, 'doctor', { home });
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
  const home = createTemporaryHome(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend').status, 0);
  rmSync(frontend, { recursive: true, force: true });

  const result = runTask(backend, 'doctor', { home });
  assert.equal(result.status, 0, output(result));
  assert.match(output(result), /workspace repository frontend - missing at ..\/frontend/);
});

test('disabled workspace repositories are skipped and local configuration can re-enable them', (t) => {
  const parent = createTemporaryDirectory(t);
  const home = createTemporaryHome(t);
  const backend = path.join(parent, 'backend');
  const frontend = path.join(parent, 'frontend');
  initializeGitRepository(backend);
  initializeGitRepository(frontend);

  assert.equal(runTask(backend, 'init').status, 0);
  assert.equal(runTask(backend, 'skill', 'install', 'codex', { home }).status, 0);
  assert.equal(runTask(backend, 'add-repo', '../frontend', '--id', 'frontend').status, 0);
  const manifestPath = path.join(backend, 'workspace.yaml');
  const workspace = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  workspace.repositories.find((repository) => repository.id === 'frontend').disabled = true;
  writeFileSync(manifestPath, `${JSON.stringify(workspace, null, 2)}\n`);
  rmSync(frontend, { recursive: true, force: true });

  const reposResult = runTask(backend, 'repos');
  assert.equal(reposResult.status, 0, output(reposResult));
  assert.match(output(reposResult), /frontend\t..\/frontend \[disabled\]/);

  const disabledDoctorResult = runTask(backend, 'doctor', { home });
  assert.equal(disabledDoctorResult.status, 0, output(disabledDoctorResult));
  assert.match(output(disabledDoctorResult), /workspace repository frontend - disabled/);
  assert.doesNotMatch(output(disabledDoctorResult), /workspace repository frontend - missing/);

  writeFileSync(path.join(backend, 'workspace.local.yaml'), `${JSON.stringify({
    version: 1,
    repositories: { frontend: { disabled: false } },
  }, null, 2)}\n`);
  const reenabledDoctorResult = runTask(backend, 'doctor', { home });
  assert.equal(reenabledDoctorResult.status, 0, output(reenabledDoctorResult));
  assert.match(output(reenabledDoctorResult), /workspace repository frontend - missing at ..\/frontend/);

  const projectExplore = readFileSync(
    path.join(home, '.codex', 'skills', 'project-explore', 'SKILL.md'),
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
  const home = createTemporaryHome(t);
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

  const result = runTask(backend, 'doctor', { home });
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
  const home = createTemporaryHome(t);
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

  const result = runTask(backend, 'doctor', { home });
  assert.equal(result.status, 0, output(result));
  assert.match(output(result), /workspace\.local\.yaml - workspace\.local\.yaml contains an unknown repository ID/);
});
