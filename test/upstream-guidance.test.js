import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const taskBin = fileURLToPath(new URL('../bin/task.js', import.meta.url));
const upstreamGrilling = readFileSync(new URL('./fixtures/upstream-grilling.md', import.meta.url), 'utf-8')
  .replaceAll('\r\n', '\n')
  .replace(/^---\n[\s\S]*?\n---\n\n/, '')
  .trimEnd();

function createWorkspace(t) {
  const project = mkdtempSync(path.join(tmpdir(), 'task-cli-upstream-'));
  const home = mkdtempSync(path.join(tmpdir(), 'task-cli-upstream-home-'));
  t.after(() => {
    rmSync(project, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });
  execFileSync('git', ['init', '--quiet', project]);
  return { project, home };
}

function runTask({ project, home }, ...args) {
  const result = spawnSync(process.execPath, [taskBin, ...args], {
    cwd: project,
    encoding: 'utf-8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  assert.equal(result.status, 0, `${result.stdout || ''}${result.stderr || ''}`);
  return result.stdout;
}

test('install and update preserve the pinned upstream Grilling body on every target', (t) => {
  const workspace = createWorkspace(t);
  runTask(workspace, 'init');
  const targets = ['agents', 'claude', 'codex'];
  const expectedCounts = { 'task-explore': 1, 'bug-explore': 1, 'task-fast': 2 };
  const installedSkills = new Map();

  for (const target of targets) {
    runTask(workspace, 'skill', 'install', target);
    const skillsDirectory = path.join(workspace.home, `.${target}`, 'skills');
    for (const [skillName, expectedCount] of Object.entries(expectedCounts)) {
      const skillPath = path.join(skillsDirectory, skillName, 'SKILL.md');
      const skill = readFileSync(skillPath, 'utf-8').replaceAll('\r\n', '\n');
      const sections = [...skill.matchAll(/\n\nGrilling\n\n([\s\S]*?)\n\nDecision Intake\n/g)];
      assert.equal(sections.length, expectedCount, `${target}/${skillName}`);
      for (const section of sections) {
        assert.equal(section[1], upstreamGrilling, `${target}/${skillName}`);
      }
      if (installedSkills.has(skillName)) {
        assert.equal(skill, installedSkills.get(skillName));
      } else {
        installedSkills.set(skillName, skill);
      }
      writeFileSync(skillPath, 'Stale skill.\n');
    }
    for (const companion of ['grill-me', 'grilling']) {
      assert.equal(existsSync(path.join(skillsDirectory, companion)), false);
    }
  }

  runTask(workspace, 'skill', 'update');
  for (const target of targets) {
    for (const [skillName, expectedSkill] of installedSkills) {
      const skillPath = path.join(workspace.home, `.${target}`, 'skills', skillName, 'SKILL.md');
      assert.equal(readFileSync(skillPath, 'utf-8').replaceAll('\r\n', '\n'), expectedSkill);
    }
  }
  const doctor = runTask(workspace, 'doctor');
  assert.doesNotMatch(doctor, /outdated|missing|repair/i);
});

for (const glossaries of [[], ['CONTEXT.md'], ['GLOSSARY.md'], ['CONTEXT.md', 'GLOSSARY.md']]) {
  test(`init and refresh preserve optional glossary files: ${glossaries.join(', ') || 'none'}`, (t) => {
    const workspace = createWorkspace(t);
    const contents = new Map(glossaries.map((name) => [name, `# ${name}\n\nUser-owned vocabulary.\n`]));
    for (const [name, content] of contents) {
      writeFileSync(path.join(workspace.project, name), content);
    }
    runTask(workspace, 'init');
    runTask(workspace, 'refresh');
    for (const name of ['GLOSSARY.md', 'CONTEXT.md']) {
      const glossaryPath = path.join(workspace.project, name);
      assert.equal(existsSync(glossaryPath), contents.has(name));
      if (contents.has(name)) {
        assert.equal(readFileSync(glossaryPath, 'utf-8'), contents.get(name));
      }
    }
  });
}
