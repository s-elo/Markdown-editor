import type { GitHubCodeSearchItem } from '@/redux-api/github';
import type { FileNameMatch } from '@/redux-api/searchApi';
import type { GitHubWorkspaceConfig } from '@/redux-feature/githubWorkspaceSlice';
import type { WorkspaceEntry, WorkspaceSnapshot } from '@markdown-editor/github-workspace';

const MARKDOWN_EXTENSION = '.md';

const cleanPath = (path: string) => path.replace(/^\/+|\/+$/g, '');

const getRelativeRepositoryPath = (config: GitHubWorkspaceConfig, repositoryPath: string) => {
  const root = cleanPath(config.docsRoot);
  if (!root) return cleanPath(repositoryPath);
  if (!repositoryPath.startsWith(`${root}/`)) return null;
  return repositoryPath.slice(root.length + 1);
};

const isVisibleMarkdownPath = (config: GitHubWorkspaceConfig, repositoryPath: string) => {
  const relativePath = getRelativeRepositoryPath(config, repositoryPath);
  if (relativePath === null || !relativePath.endsWith(MARKDOWN_EXTENSION)) return false;
  const parts = relativePath.split('/').filter(Boolean);
  return (
    parts.length > 0 &&
    !parts.some((part) => part.startsWith('.')) &&
    !parts.slice(0, -1).some((part) => part === '_assets' || config.ignoreDirs.includes(part))
  );
};

const toFileNameMatch = (config: GitHubWorkspaceConfig, repositoryPath: string): FileNameMatch => {
  const relativePath = getRelativeRepositoryPath(config, repositoryPath) ?? repositoryPath;
  const path = relativePath.slice(0, -MARKDOWN_EXTENSION.length).split('/');
  return { name: path.at(-1) ?? '', path };
};

const getFileMatchKey = (match: FileNameMatch) => JSON.stringify(match.path);

const sortFileMatches = (matches: FileNameMatch[], query: string) => {
  const normalizedQuery = query.toLocaleLowerCase();
  return matches.sort((left, right) => {
    const leftName = left.name.toLocaleLowerCase();
    const rightName = right.name.toLocaleLowerCase();
    const leftStartsWith = leftName.startsWith(normalizedQuery);
    const rightStartsWith = rightName.startsWith(normalizedQuery);
    if (leftStartsWith !== rightStartsWith) return leftStartsWith ? -1 : 1;
    return leftName.localeCompare(rightName);
  });
};

const getVisibleMarkdownEntries = (config: GitHubWorkspaceConfig, entries: Record<string, WorkspaceEntry>) =>
  Object.values(entries).filter((entry) => entry.kind === 'file' && isVisibleMarkdownPath(config, entry.path));

export const searchGitHubFileNames = (
  config: GitHubWorkspaceConfig,
  entries: Record<string, WorkspaceEntry>,
  query: string,
) => {
  const normalizedQuery = query.toLocaleLowerCase();
  return sortFileMatches(
    getVisibleMarkdownEntries(config, entries)
      .map((entry) => toFileNameMatch(config, entry.path))
      .filter((entry) => entry.name.toLocaleLowerCase().includes(normalizedQuery)),
    query,
  );
};

const parsePatterns = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((pattern) => pattern.trim().toLocaleLowerCase())
    .filter(Boolean);

const matchesPathFilters = (
  config: GitHubWorkspaceConfig,
  repositoryPath: string,
  includeFiles?: string,
  excludeFiles?: string,
) => {
  const path = (getRelativeRepositoryPath(config, repositoryPath) ?? repositoryPath).toLocaleLowerCase();
  const includes = parsePatterns(includeFiles);
  const excludes = parsePatterns(excludeFiles);
  return (
    (includes.length === 0 || includes.some((pattern) => path.includes(pattern))) &&
    !excludes.some((pattern) => path.includes(pattern))
  );
};

const contentIncludes = (content: string, query: string) =>
  content.toLocaleLowerCase().includes(query.toLocaleLowerCase());

export const mergeGitHubContentResults = (
  config: GitHubWorkspaceConfig,
  snapshot: WorkspaceSnapshot,
  remoteItems: GitHubCodeSearchItem[],
  query: string,
  includeFiles?: string,
  excludeFiles?: string,
): FileNameMatch[] => {
  const visibleEntries = getVisibleMarkdownEntries(config, snapshot.entries);
  const entriesBySha = new Map<string, WorkspaceEntry[]>();
  visibleEntries.forEach((entry) => {
    if (!entry.sha) return;
    const entries = entriesBySha.get(entry.sha) ?? [];
    entries.push(entry);
    entriesBySha.set(entry.sha, entries);
  });

  const deletedPaths = new Set(
    [...snapshot.stagedChanges, ...snapshot.unstagedChanges]
      .filter((change) => change.newEntry === null)
      .map((change) => change.oldEntry?.path ?? change.path),
  );
  const results = new Map<string, FileNameMatch>();
  const addEntry = (entry: WorkspaceEntry) => {
    if (!matchesPathFilters(config, entry.path, includeFiles, excludeFiles)) return;
    const result = toFileNameMatch(config, entry.path);
    results.set(getFileMatchKey(result), result);
  };

  remoteItems.forEach((item) => {
    const currentEntries = entriesBySha.get(item.sha);
    if (currentEntries?.length) {
      currentEntries.forEach((entry) => {
        if (entry.content !== undefined && !contentIncludes(entry.content, query)) return;
        addEntry(entry);
      });
      return;
    }
    if (!isVisibleMarkdownPath(config, item.path) || deletedPaths.has(item.path)) return;
    if (!matchesPathFilters(config, item.path, includeFiles, excludeFiles)) return;
    const result = toFileNameMatch(config, item.path);
    results.set(getFileMatchKey(result), result);
  });

  visibleEntries.forEach((entry) => {
    if (entry.content !== undefined && contentIncludes(entry.content, query)) addEntry(entry);
  });

  return [...results.values()].sort((left, right) =>
    left.name.toLocaleLowerCase().localeCompare(right.name.toLocaleLowerCase()),
  );
};
