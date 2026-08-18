import chalk from 'chalk';
import { execFileSync } from 'node:child_process';

const TASK_ACTIVE_DIR = '.ai/tasks/active';
const TASK_ARCHIVE_DIR = '.ai/tasks/archive';
const BUG_ACTIVE_DIR = '.ai/bugs/active';
const BUG_ARCHIVE_DIR = '.ai/bugs/archive';
const EFFORT_ACTIVE_DIR = '.ai/efforts/active';
const EFFORT_ARCHIVE_DIR = '.ai/efforts/archive';
const SPECS_DIR = '.ai/specs';
const DECISIONS_FILE = '.ai/decisions/decisions.md';
const WORKSPACE_FILE = 'workspace.yaml';
const WORKSPACE_LOCAL_FILE = 'workspace.local.yaml';
const WORKSPACE_VERSION = 1;
const WORKSPACE_GITIGNORE_BLOCK = [
  '# workscope',
  WORKSPACE_LOCAL_FILE,
].join('\n');

export const WORKSPACE_CONSTANTS = {
  TASK_ACTIVE_DIR,
  TASK_ARCHIVE_DIR,
  BUG_ACTIVE_DIR,
  BUG_ARCHIVE_DIR,
  EFFORT_ACTIVE_DIR,
  EFFORT_ARCHIVE_DIR,
  SPECS_DIR,
  DECISIONS_FILE,
  WORKSPACE_FILE,
  WORKSPACE_LOCAL_FILE,
  WORKSPACE_VERSION,
};

export function logCheck(log, ok, label, detail) {
  if (ok) {
    log.chalk.green(`  OK   ${label}${detail ? ` - ${detail}` : ''}`);
    return;
  }
  console.log(chalk.yellow(`  WARN ${label}${detail ? ` - ${detail}` : ''}`));
}

export function ensureDir(fs, path, baseDir, relativeDir, log) {
  const full = path.join(baseDir, relativeDir);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
    log.chalk.green(`  ✓ ${relativeDir}`);
    return;
  }
  log.chalk.dim(`  - ${relativeDir} (exists)`);
}

function ensureFile(fs, path, filePath, content, log) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    log.chalk.green(`  ✓ ${path.relative(process.cwd(), filePath)}`);
    return;
  }
  log.chalk.dim(`  - ${path.relative(process.cwd(), filePath)} (exists)`);
}

export function ensureWorkflowState(fs, path, cwd, log) {
  const dirs = [
    '.ai',
    TASK_ACTIVE_DIR,
    TASK_ARCHIVE_DIR,
    BUG_ACTIVE_DIR,
    BUG_ARCHIVE_DIR,
    EFFORT_ACTIVE_DIR,
    EFFORT_ARCHIVE_DIR,
    SPECS_DIR,
    '.ai/decisions',
  ];

  for (const dir of dirs) {
    ensureDir(fs, path, cwd, dir, log);
  }

  ensureFile(fs, path, path.join(cwd, DECISIONS_FILE), '# Decisions Log\n\n', log);
}

function hasGitignoreRules(gitignore, rules) {
  return rules.every((rule) => gitignore.includes(rule));
}

function gitCommandSucceeds(args) {
  try {
    execFileSync('git', args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function gitRootForDirectory(path, directory) {
  try {
    const output = execFileSync('git', ['-C', directory, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return path.resolve(output.trim());
  } catch {
    return null;
  }
}

function localWorkspaceIsTracked(path, cwd) {
  return gitCommandSucceeds(['-C', cwd, 'ls-files', '--error-unmatch', '--', WORKSPACE_LOCAL_FILE]);
}

function localWorkspaceIsIgnored(path, cwd) {
  if (!gitRootForDirectory(path, cwd)) {
    return true;
  }
  return gitCommandSucceeds(['-C', cwd, 'check-ignore', '--no-index', '--quiet', '--', WORKSPACE_LOCAL_FILE]);
}

function assertLocalWorkspaceIsWritable(path, cwd) {
  if (localWorkspaceIsTracked(path, cwd)) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} is tracked. Remove it from the Git index before changing local workspace settings.`);
  }
  if (!localWorkspaceIsIgnored(path, cwd)) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} is not ignored. Add it to .gitignore before changing local workspace settings.`);
  }
}

export function ensureLocalWorkspaceIgnored(fs, path, cwd, log) {
  if (localWorkspaceIsIgnored(path, cwd)) {
    log.chalk.dim('  - .gitignore (workspace.local.yaml ignored)');
    return;
  }

  const gitignorePath = path.join(cwd, '.gitignore');
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';

  const prefix = existing.trimEnd();
  const next = prefix ? `${prefix}\n\n${WORKSPACE_GITIGNORE_BLOCK}\n` : `${WORKSPACE_GITIGNORE_BLOCK}\n`;
  fs.writeFileSync(gitignorePath, next);
  log.chalk.green('  ✓ .gitignore updated');
}

const WORKSPACE_README_FILENAME = 'WORKSPACE.md';

function workspaceReadmeContent(projectName) {
  return `# Workspace

This directory is an agent workspace for the ${projectName}
multi-repository project.

It contains project context, specifications, decisions, tickets,
and other artifacts used by AI coding skills.

Business source code is maintained in the repositories listed below.

## Workspace configuration

The workspace is defined by:

- \`workspace.yaml\` - shared repository definitions
- \`workspace.local.yaml\` - local developer overrides (not committed)

## Repository resolution

Before selecting a repository or exploring source paths, resolve the
effective workspace directly from these files:

1. Read the repositories declared in \`workspace.yaml\`.
2. If \`workspace.local.yaml\` exists, treat its \`repositories\` entries
   as machine-specific overrides for matching repository IDs. A string
   entry overrides the path; an object entry may override \`path\` and/or
   \`disabled\`.
3. For each field explicitly present in a local override, use the local
   value; otherwise use the shared value. A missing effective \`disabled\`
   value means the repository is enabled.
4. Resolve a relative effective path from this workspace directory. Keep
   an absolute effective path absolute.

For routine development, select and explore only enabled repositories
that are relevant to the task. Do not select, inspect, index, or include
disabled repositories in a working set unless the user explicitly asks
about one.
`;
}

export function ensureWorkspaceReadme(fs, path, cwd, log) {
  const readmePath = path.join(cwd, WORKSPACE_README_FILENAME);
  if (fs.existsSync(readmePath)) {
    log.chalk.dim(`  - ${WORKSPACE_README_FILENAME} (exists)`);
    return;
  }

  const projectName = path.basename(cwd).toUpperCase();
  fs.writeFileSync(readmePath, workspaceReadmeContent(projectName));
  log.chalk.green(`  ✓ ${WORKSPACE_README_FILENAME}`);
}

export function workflowIsInitialized(fs, path, cwd) {
  try {
    return fs.existsSync(path.join(workflowStateRoot(fs, path, cwd), DECISIONS_FILE));
  } catch {
    return fs.existsSync(path.join(cwd, DECISIONS_FILE));
  }
}

function workspacePath(path, cwd) {
  return path.join(cwd, WORKSPACE_FILE);
}

function localWorkspacePath(path, cwd) {
  return path.join(cwd, WORKSPACE_LOCAL_FILE);
}

function normalizeRepositoryId(id) {
  return typeof id === 'string' ? id.trim() : '';
}

function derivedRepositoryId(path, repositoryRoot) {
  const name = path.basename(repositoryRoot).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return /^[a-z]/.test(name) ? name : `repo-${name || 'workspace'}`;
}

function validateWorkspace(workspace, path) {
  if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) {
    throw new Error(`${WORKSPACE_FILE} must contain an object.`);
  }
  if (workspace.version !== WORKSPACE_VERSION) {
    throw new Error(`${WORKSPACE_FILE} must declare version ${WORKSPACE_VERSION}.`);
  }
  if (!Array.isArray(workspace.repositories) || workspace.repositories.length === 0) {
    throw new Error(`${WORKSPACE_FILE} must contain at least one repository.`);
  }

  const repositoryIds = new Set();
  const repositoryPaths = new Set();
  for (const repository of workspace.repositories) {
    const id = normalizeRepositoryId(repository?.id);
    if (!/^[a-z][a-z0-9-]*$/.test(id)) {
      throw new Error(`${WORKSPACE_FILE} repository IDs must use lowercase letters, numbers, and hyphens.`);
    }
    if (repositoryIds.has(id)) {
      throw new Error(`${WORKSPACE_FILE} contains the repository ID "${id}" more than once.`);
    }
    repositoryIds.add(id);

    if (typeof repository.path !== 'string' || !repository.path.trim() || path.isAbsolute(repository.path)) {
      throw new Error(`${WORKSPACE_FILE} repository paths must be non-empty relative paths.`);
    }
    const normalizedPath = path.normalize(repository.path);
    if (repositoryPaths.has(normalizedPath)) {
      throw new Error(`${WORKSPACE_FILE} contains the repository path "${repository.path}" more than once.`);
    }
    repositoryPaths.add(normalizedPath);

    if (repository.description !== undefined
      && (typeof repository.description !== 'string' || !repository.description.trim())) {
      throw new Error(`${WORKSPACE_FILE} repository descriptions must be non-empty strings when provided.`);
    }
    if (repository.disabled !== undefined && typeof repository.disabled !== 'boolean') {
      throw new Error(`${WORKSPACE_FILE} repository disabled flags must be booleans when provided.`);
    }
  }

  if (workspace.context_repository !== undefined) {
    const contextRepositoryId = normalizeRepositoryId(workspace.context_repository);
    if (!/^[a-z][a-z0-9-]*$/.test(contextRepositoryId)) {
      throw new Error(`${WORKSPACE_FILE} context_repository must use a registered repository ID.`);
    }
    if (!repositoryIds.has(contextRepositoryId)) {
      throw new Error(`${WORKSPACE_FILE} context_repository must reference a registered repository ID.`);
    }
  }

  return workspace;
}

function readWorkspace(fs, path, cwd) {
  const manifestPath = workspacePath(path, cwd);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  let workspace;
  try {
    workspace = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (error) {
    throw new Error(`${WORKSPACE_FILE} must use JSON-compatible YAML: ${error.message}`);
  }

  return validateWorkspace(workspace, path);
}

function writeWorkspace(fs, path, cwd, workspace) {
  validateWorkspace(workspace, path);
  fs.writeFileSync(workspacePath(path, cwd), `${JSON.stringify(workspace, null, 2)}\n`);
}

function validateLocalWorkspace(localWorkspace, workspace) {
  if (!localWorkspace || typeof localWorkspace !== 'object' || Array.isArray(localWorkspace)) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} must contain an object.`);
  }
  if (localWorkspace.version !== WORKSPACE_VERSION) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} must declare version ${WORKSPACE_VERSION}.`);
  }
  if (!localWorkspace.repositories || typeof localWorkspace.repositories !== 'object'
    || Array.isArray(localWorkspace.repositories)) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} must contain a repositories object.`);
  }

  const repositoryIds = new Set(workspace.repositories.map((repository) => repository.id));
  for (const [id, repositoryOverride] of Object.entries(localWorkspace.repositories)) {
    if (!repositoryIds.has(id)) {
      throw new Error(`${WORKSPACE_LOCAL_FILE} contains an unknown repository ID "${id}".`);
    }
    if (typeof repositoryOverride === 'string') {
      if (!repositoryOverride.trim()) {
        throw new Error(`${WORKSPACE_LOCAL_FILE} repository paths must be non-empty strings.`);
      }
      continue;
    }
    if (!repositoryOverride || typeof repositoryOverride !== 'object' || Array.isArray(repositoryOverride)) {
      throw new Error(`${WORKSPACE_LOCAL_FILE} repository overrides must be paths or objects.`);
    }
    if (repositoryOverride.path === undefined && repositoryOverride.disabled === undefined) {
      throw new Error(`${WORKSPACE_LOCAL_FILE} repository overrides must specify a path or disabled state.`);
    }
    if (repositoryOverride.path !== undefined
      && (typeof repositoryOverride.path !== 'string' || !repositoryOverride.path.trim())) {
      throw new Error(`${WORKSPACE_LOCAL_FILE} repository paths must be non-empty strings.`);
    }
    if (repositoryOverride.disabled !== undefined && typeof repositoryOverride.disabled !== 'boolean') {
      throw new Error(`${WORKSPACE_LOCAL_FILE} repository disabled flags must be booleans when provided.`);
    }
  }

  return localWorkspace;
}

function readLocalWorkspace(fs, path, cwd, workspace) {
  const manifestPath = localWorkspacePath(path, cwd);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  let localWorkspace;
  try {
    localWorkspace = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (error) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} must use JSON-compatible YAML: ${error.message}`);
  }

  return validateLocalWorkspace(localWorkspace, workspace);
}

function writeLocalWorkspace(fs, path, cwd, workspace, localWorkspace) {
  validateLocalWorkspace(localWorkspace, workspace);
  fs.writeFileSync(localWorkspacePath(path, cwd), `${JSON.stringify(localWorkspace, null, 2)}\n`);
}

function resolvedWorkspaceRepositories(workspace, localWorkspace) {
  return workspace.repositories.map((repository) => {
    const localRepository = localWorkspace?.repositories[repository.id];
    const override = typeof localRepository === 'string'
      ? { path: localRepository }
      : localRepository;
    return {
      ...repository,
      path: override?.path ?? repository.path,
      disabled: override?.disabled ?? repository.disabled ?? false,
    };
  });
}

function configuredContextRepository(fs, path, cwd) {
  const workspace = readWorkspace(fs, path, cwd);
  if (!workspace?.context_repository) {
    return null;
  }

  const localWorkspace = readLocalWorkspace(fs, path, cwd, workspace);
  const repository = resolvedWorkspaceRepositories(workspace, localWorkspace)
    .find((candidate) => candidate.id === workspace.context_repository);
  if (repository.disabled) {
    throw new Error(`Configured context repository "${repository.id}" is disabled.`);
  }
  const configuredPath = path.resolve(cwd, repository.path);

  let contextRoot;
  try {
    contextRoot = resolveGitRepository(fs, path, configuredPath);
  } catch (error) {
    throw new Error(`Configured context repository "${repository.id}" is invalid: ${error.message}`);
  }

  if (canonicalPath(fs, path, configuredPath) !== contextRoot) {
    throw new Error(`Configured context repository "${repository.id}" must point to a Git repository root.`);
  }

  return { id: repository.id, root: contextRoot };
}

export function getConfigRepository(fs, path, cwd) {
  return configuredContextRepository(fs, path, cwd);
}

export function workflowStateRoot(fs, path, cwd) {
  return configuredContextRepository(fs, path, cwd)?.root || cwd;
}

function canonicalPath(fs, path, targetPath) {
  return path.resolve(fs.realpathSync(targetPath));
}

function resolveGitRepository(fs, path, candidatePath) {
  if (!fs.existsSync(candidatePath)) {
    throw new Error(`Repository path does not exist: ${candidatePath}`);
  }
  if (!fs.statSync(candidatePath).isDirectory()) {
    throw new Error(`Repository path is not a directory: ${candidatePath}`);
  }

  const gitRoot = gitRootForDirectory(path, candidatePath);
  if (!gitRoot) {
    throw new Error(`Repository path is not inside a Git worktree: ${candidatePath}`);
  }

  return canonicalPath(fs, path, gitRoot);
}

function relativeRepositoryPath(path, workflowRoot, repositoryRoot) {
  const relativePath = path.relative(workflowRoot, repositoryRoot) || '.';
  if (path.isAbsolute(relativePath)) {
    throw new Error('Repository must be on the same volume as the workflow root so it can use a portable relative path.');
  }
  return relativePath.split(path.sep).join('/');
}

function workspaceRepository(path, workflowRoot, repositoryRoot, id, description) {
  const repository = {
    id,
    path: relativeRepositoryPath(path, workflowRoot, repositoryRoot),
  };
  if (description) {
    repository.description = description;
  }
  return repository;
}

function hasRepositoryRoot(fs, path, cwd, repositories, repositoryRoot, excludedId) {
  return repositories.some((repository) => {
    if (repository.id === excludedId) {
      return false;
    }
    const configuredPath = path.resolve(cwd, repository.path);
    if (!fs.existsSync(configuredPath) || !fs.statSync(configuredPath).isDirectory()) {
      return configuredPath === repositoryRoot;
    }

    const configuredRoot = gitRootForDirectory(path, configuredPath);
    return configuredRoot && canonicalPath(fs, path, configuredRoot) === repositoryRoot;
  });
}

export function doctorWorkspace(fs, path, cwd, log) {
  const manifestPath = workspacePath(path, cwd);
  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  let workspace;
  let repositories;
  try {
    workspace = readWorkspace(fs, path, cwd);
    const localWorkspace = readLocalWorkspace(fs, path, cwd, workspace);
    repositories = resolvedWorkspaceRepositories(workspace, localWorkspace);
  } catch (error) {
    const label = error.message.startsWith(WORKSPACE_LOCAL_FILE)
      ? WORKSPACE_LOCAL_FILE
      : WORKSPACE_FILE;
    logCheck(log, false, label, error.message);
    return [false];
  }

  const checks = [true];
  logCheck(log, true, WORKSPACE_FILE, `version ${workspace.version}`);
  const registeredRoots = new Map();

  for (const repository of repositories) {
    const label = `workspace repository ${repository.id}`;
    if (repository.disabled) {
      checks.push(true);
      logCheck(log, true, label, 'disabled');
      continue;
    }
    const configuredPath = path.resolve(cwd, repository.path);
    if (!fs.existsSync(configuredPath) || !fs.statSync(configuredPath).isDirectory()) {
      checks.push(false);
      logCheck(log, false, label, `missing at ${repository.path}`);
      continue;
    }

    const gitRoot = gitRootForDirectory(path, configuredPath);
    if (!gitRoot) {
      checks.push(false);
      logCheck(log, false, label, `not a Git worktree at ${repository.path}`);
      continue;
    }

    const configuredRoot = canonicalPath(fs, path, configuredPath);
    const actualRoot = canonicalPath(fs, path, gitRoot);
    if (configuredRoot !== actualRoot) {
      checks.push(false);
      logCheck(log, false, label, `path must point to Git root (${repository.path})`);
      continue;
    }
    if (registeredRoots.has(actualRoot)) {
      checks.push(false);
      logCheck(log, false, label, `duplicates ${registeredRoots.get(actualRoot)}`);
      continue;
    }

    registeredRoots.set(actualRoot, repository.id);
    checks.push(true);
    logCheck(log, true, label, repository.path);
  }

  return checks;
}

export function localWorkspaceGitignoreStatus(path, cwd) {
  return {
    ignored: localWorkspaceIsIgnored(path, cwd),
    tracked: localWorkspaceIsTracked(path, cwd),
  };
}

export function hasGitignoreBlock(gitignore, rules) {
  return hasGitignoreRules(gitignore, rules);
}

function readWorkspaceOrThrow(fs, path, cwd) {
  const workspace = readWorkspace(fs, path, cwd);
  if (!workspace) {
    throw new Error(`No ${WORKSPACE_FILE} found. Run \`workscope add-repo\` first.`);
  }
  return workspace;
}

function resolveLocalOverridePath(existingOverride) {
  if (typeof existingOverride === 'string') {
    return existingOverride;
  }
  return existingOverride?.path;
}

function applyLocalOverride(localWorkspace, repositoryId, patch) {
  const existingOverride = localWorkspace.repositories[repositoryId];
  const localPath = resolveLocalOverridePath(existingOverride);
  localWorkspace.repositories[repositoryId] = {
    ...(localPath === undefined ? {} : { path: localPath }),
    ...patch,
  };
}

export function addRepo(cwd, repositoryPath, options, { fs, path, log, onWorkspacePromotion }) {
  const workflowRoot = canonicalPath(fs, path, cwd);
  const repositoryRoot = resolveGitRepository(fs, path, path.resolve(workflowRoot, repositoryPath));
  const existingWorkspace = readWorkspace(fs, path, workflowRoot);
  const isWorkspacePromotion = !existingWorkspace;
  const workspace = existingWorkspace || {
    version: WORKSPACE_VERSION,
    repositories: [],
  };

  if (!existingWorkspace) {
    const currentRepositoryRoot = gitRootForDirectory(path, workflowRoot);
    if (currentRepositoryRoot && canonicalPath(fs, path, currentRepositoryRoot) === workflowRoot
      && repositoryRoot !== workflowRoot) {
      const rootId = derivedRepositoryId(path, workflowRoot);
      workspace.repositories.push(workspaceRepository(path, workflowRoot, workflowRoot, rootId));
    }
  }

  const localWorkspace = existingWorkspace
    ? readLocalWorkspace(fs, path, workflowRoot, existingWorkspace)
    : null;
  const repositories = resolvedWorkspaceRepositories(workspace, localWorkspace);
  if (hasRepositoryRoot(fs, path, workflowRoot, repositories, repositoryRoot)) {
    throw new Error(`Repository is already registered: ${repositoryRoot}`);
  }

  const id = normalizeRepositoryId(options.id || derivedRepositoryId(path, repositoryRoot));
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new Error('Repository ID must use lowercase letters, numbers, and hyphens, starting with a letter.');
  }
  if (workspace.repositories.some((repository) => repository.id === id)) {
    throw new Error(`Repository ID is already registered: ${id}`);
  }

  const description = options.description?.trim();
  if (options.description !== undefined && !description) {
    throw new Error('Repository description cannot be empty.');
  }

  workspace.repositories.push(workspaceRepository(path, workflowRoot, repositoryRoot, id, description));
  writeWorkspace(fs, path, workflowRoot, workspace);
  log.chalk.green(`  ✓ ${WORKSPACE_FILE}`);
  log.info(`Added repository ${id}: ${relativeRepositoryPath(path, workflowRoot, repositoryRoot)}`);

  if (isWorkspacePromotion && onWorkspacePromotion) {
    onWorkspacePromotion(fs, path, workflowRoot, log);
  }
}

export function useContext(cwd, id, { fs, path, log, onContextSelected }) {
  const workflowRoot = canonicalPath(fs, path, cwd);
  const workspace = readWorkspaceOrThrow(fs, path, workflowRoot);

  const repositoryId = normalizeRepositoryId(id);
  const localWorkspace = readLocalWorkspace(fs, path, workflowRoot, workspace);
  const repository = resolvedWorkspaceRepositories(workspace, localWorkspace)
    .find((candidate) => candidate.id === repositoryId);
  if (!repository) {
    throw new Error(`Unknown workspace repository ID: ${repositoryId}`);
  }
  if (repository.disabled) {
    throw new Error(`Cannot select disabled workspace repository as context: ${repositoryId}`);
  }

  const configuredPath = path.resolve(workflowRoot, repository.path);
  const contextRoot = resolveGitRepository(fs, path, configuredPath);
  if (canonicalPath(fs, path, configuredPath) !== contextRoot) {
    throw new Error('Context repository path must point to a Git repository root.');
  }

  workspace.context_repository = repositoryId;
  writeWorkspace(fs, path, workflowRoot, workspace);
  log.chalk.green(`  ✓ ${WORKSPACE_FILE}`);
  log.info(`Selected context repository ${repositoryId}: ${repository.path}`);

  log.info('\nEnsuring context workflow state...');
  ensureWorkflowState(fs, path, contextRoot, log);

  if (onContextSelected) {
    onContextSelected({ fs, path, workflowRoot, contextRoot, log });
  }
}

export function bindRepo(cwd, id, repositoryPath, { fs, path, log }) {
  const workflowRoot = canonicalPath(fs, path, cwd);
  const workspace = readWorkspaceOrThrow(fs, path, workflowRoot);

  const repositoryId = normalizeRepositoryId(id);
  if (!workspace.repositories.some((repository) => repository.id === repositoryId)) {
    throw new Error(`Unknown workspace repository ID: ${repositoryId}`);
  }

  assertLocalWorkspaceIsWritable(path, workflowRoot);

  const repositoryRoot = resolveGitRepository(
    fs,
    path,
    path.resolve(workflowRoot, repositoryPath)
  );
  const localWorkspace = readLocalWorkspace(fs, path, workflowRoot, workspace) || {
    version: WORKSPACE_VERSION,
    repositories: {},
  };
  const localPath = path.isAbsolute(repositoryPath)
    ? repositoryRoot.split(path.sep).join('/')
    : (path.relative(workflowRoot, repositoryRoot) || '.').split(path.sep).join('/');
  const existingOverride = localWorkspace.repositories[repositoryId];
  if (existingOverride && typeof existingOverride === 'object') {
    existingOverride.path = localPath;
  } else {
    localWorkspace.repositories[repositoryId] = localPath;
  }

  const repositories = resolvedWorkspaceRepositories(workspace, localWorkspace);
  if (hasRepositoryRoot(fs, path, workflowRoot, repositories, repositoryRoot, repositoryId)) {
    throw new Error(`Repository is already bound to another workspace repository: ${repositoryRoot}`);
  }

  writeLocalWorkspace(fs, path, workflowRoot, workspace, localWorkspace);
  log.chalk.green(`  ✓ ${WORKSPACE_LOCAL_FILE}`);
  log.info(`Bound repository ${repositoryId}: ${localPath}`);
}

export function setRepoDisabled(cwd, id, disabled, { local, fs, path, log }) {
  const workflowRoot = canonicalPath(fs, path, cwd);
  const workspace = readWorkspaceOrThrow(fs, path, workflowRoot);

  const repositoryId = normalizeRepositoryId(id);
  const repository = workspace.repositories.find((candidate) => candidate.id === repositoryId);
  if (!repository) {
    throw new Error(`Unknown workspace repository ID: ${repositoryId}`);
  }
  if (disabled && workspace.context_repository === repositoryId) {
    throw new Error(`Cannot disable configured context repository: ${repositoryId}`);
  }

  if (local) {
    assertLocalWorkspaceIsWritable(path, workflowRoot);
    const localWorkspace = readLocalWorkspace(fs, path, workflowRoot, workspace) || {
      version: WORKSPACE_VERSION,
      repositories: {},
    };
    applyLocalOverride(localWorkspace, repositoryId, { disabled });
    writeLocalWorkspace(fs, path, workflowRoot, workspace, localWorkspace);
    log.chalk.green(`  ✓ ${WORKSPACE_LOCAL_FILE}`);
    log.info(`${disabled ? 'Disabled' : 'Enabled'} repository ${repositoryId} locally.`);
    return;
  }

  if (disabled) {
    repository.disabled = true;
  } else {
    delete repository.disabled;
  }
  writeWorkspace(fs, path, workflowRoot, workspace);
  log.chalk.green(`  ✓ ${WORKSPACE_FILE}`);
  log.info(`${disabled ? 'Disabled' : 'Enabled'} repository ${repositoryId} in the workspace manifest.`);
}

export function listRepos(cwd, { fs, path, log }) {
  const workspace = readWorkspace(fs, path, cwd);
  if (!workspace) {
    log.info(`No ${WORKSPACE_FILE} found. This workflow uses the existing single-project mode.`);
    return [];
  }

  const localWorkspace = readLocalWorkspace(fs, path, cwd, workspace);
  const repositories = resolvedWorkspaceRepositories(workspace, localWorkspace);
  log.info('Workspace repositories:');
  for (const repository of repositories) {
    const description = repository.description ? ` - ${repository.description}` : '';
    const status = repository.disabled ? 'disabled' : 'enabled';
    log.info(`  ${repository.id}\t${repository.path}${description} [${status}]`);
  }
  return repositories;
}

export function focusRepos(cwd, ids, { local, fs, path, log }) {
  if (ids.length === 0) {
    throw new Error('focus requires at least one repository ID.');
  }

  const workflowRoot = canonicalPath(fs, path, cwd);
  const workspace = readWorkspaceOrThrow(fs, path, workflowRoot);

  const validIds = new Set(workspace.repositories.map((repository) => repository.id));
  const focusIds = new Set();
  for (const rawId of ids) {
    const id = normalizeRepositoryId(rawId);
    if (!validIds.has(id)) {
      throw new Error(`Unknown workspace repository ID: ${id}`);
    }
    focusIds.add(id);
  }

  if (workspace.context_repository && !focusIds.has(workspace.context_repository)) {
    throw new Error(
      `Cannot focus without context repository "${workspace.context_repository}". Include it in the focus list.`
    );
  }

  const focusList = Array.from(focusIds);

  if (local) {
    assertLocalWorkspaceIsWritable(path, workflowRoot);
    const localWorkspace = readLocalWorkspace(fs, path, workflowRoot, workspace) || {
      version: WORKSPACE_VERSION,
      repositories: {},
    };

    const disabledIds = [];
    for (const repository of workspace.repositories) {
      const shouldEnable = focusIds.has(repository.id);
      if (!shouldEnable) {
        disabledIds.push(repository.id);
      }
      applyLocalOverride(localWorkspace, repository.id, { disabled: !shouldEnable });
    }

    writeLocalWorkspace(fs, path, workflowRoot, workspace, localWorkspace);
    log.chalk.green(`  ✓ ${WORKSPACE_LOCAL_FILE}`);
    log.info(`Focused repositories locally: ${focusList.join(', ')}`);
    log.info(`Disabled: ${disabledIds.join(', ') || '(none)'}`);
    return;
  }

  const disabledIds = [];
  for (const repository of workspace.repositories) {
    if (focusIds.has(repository.id)) {
      delete repository.disabled;
    } else {
      repository.disabled = true;
      disabledIds.push(repository.id);
    }
  }
  writeWorkspace(fs, path, workflowRoot, workspace);
  log.chalk.green(`  ✓ ${WORKSPACE_FILE}`);
  log.info(`Focused repositories: ${focusList.join(', ')}`);
  log.info(`Disabled: ${disabledIds.join(', ') || '(none)'}`);
}
