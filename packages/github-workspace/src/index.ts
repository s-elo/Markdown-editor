/**
 * Browser-side Git workspace orchestration.
 *
 * - `base` is the immutable manifest at the selected remote commit.
 * - `index` is the staged snapshot that will become the next commit.
 * - `working` is the effective tree consumed by the menu and editor.
 *
 * Workspace operations mutate a tree, the status boundary derives/merges Git-like changes, and the persistence
 * boundary stores the base plus normalized working/staged statuses before subscribers are notified.
 */

import { WORKSPACE_SCHEMA_VERSION } from './constants';
import {
  applyGitStatusToTree,
  changedPaths,
  cloneTree,
  createBaseTree,
  emptyTree,
  gitStatusToTree,
  getPathMappings,
  getStagedChanges,
  getWorkingChanges,
  stagedChangesToPublishEntries,
} from './git-status';
import { createPersistedWorkspace } from './persistence';
import { cleanPath, createId, getWorkspaceKey, makeMetadata, parentPath, pathsOverlap } from './utils';
import {
  assertInScope,
  createDirectory,
  createFileEntry,
  deleteWorkspaceEntry,
  getTransferMetadata,
  getWorkspaceEntry,
  listDirectoryEntries,
  resolveMovedEntryPath,
  restoreWorkingChanges,
  stageChanges,
  transferWorkspaceEntry,
  unstageChanges,
  writeFileEntry,
} from './workspace-operations';

import type {
  ChangeMetadata,
  MutationResult,
  PathMapping,
  PublishPlan,
  RebaseResult,
  RemoteWorkspaceSnapshot,
  TreeState,
  WorkspaceDescriptor,
  WorkspaceConventions,
  WorkspacePersistence,
  WorkspaceSnapshot,
} from './types';

export * from './constants';
export * from './git-status';
export { IndexedDbWorkspacePersistence } from './persistence';
export * from './types';
export { getWorkspaceKey } from './utils';

export class GitWorkspaceStore {
  private descriptor: WorkspaceDescriptor | null = null;

  private key = '';

  private baseCommitSha = '';

  private baseTreeSha = '';

  private base = emptyTree();

  private index = emptyTree();

  private working = emptyTree();

  private revision = 0;

  private hydrated = false;

  private remoteStale = false;

  private publishingToken = '';

  private readonly aliases = new Map<string, string>();

  private readonly listeners = new Set<() => void>();

  private mutationQueue: Promise<unknown> = Promise.resolve();

  private snapshotCache: WorkspaceSnapshot | undefined;

  public constructor(
    private readonly persistence: WorkspacePersistence,
    private readonly conventions: WorkspaceConventions,
  ) {}

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getSnapshot = (): WorkspaceSnapshot => {
    this.snapshotCache ??= {
      descriptor: this.descriptor ? { ...this.descriptor } : null,
      baseCommitSha: this.baseCommitSha,
      baseTreeSha: this.baseTreeSha,
      revision: this.revision,
      hydrated: this.hydrated,
      remoteStale: this.remoteStale,
      publishing: Boolean(this.publishingToken),
      entries: cloneTree(this.working).entries,
      workingChanges: this.getWorkingChanges(),
      stagedChanges: this.getStagedChanges(),
    };
    return this.snapshotCache;
  };

  public async open(descriptor: WorkspaceDescriptor) {
    await this.mutationQueue.catch(() => undefined);
    const key = getWorkspaceKey(descriptor);
    if (this.key === key && this.hydrated) return;
    this.descriptor = { ...descriptor, docsRoot: cleanPath(descriptor.docsRoot) };
    this.key = key;
    this.hydrated = false;
    this._emit();
    const persisted = await this.persistence.read(key);
    if (this.key !== key) return;
    if (persisted?.schemaVersion === WORKSPACE_SCHEMA_VERSION) {
      this.baseCommitSha = persisted.baseCommitSha;
      this.baseTreeSha = persisted.baseTreeSha;
      this.base = cloneTree(persisted.base);
      this.index = gitStatusToTree(this.base, persisted.stagedChanges, this.descriptor.docsRoot);
      this.working = gitStatusToTree(this.index, persisted.workingChanges, this.descriptor.docsRoot);
      this.revision = persisted.revision;
      this.remoteStale = persisted.remoteStale;
    } else {
      this.baseCommitSha = '';
      this.baseTreeSha = '';
      this.base = emptyTree();
      this.index = emptyTree();
      this.working = emptyTree();
      this.revision = 0;
      this.remoteStale = false;
    }
    this.hydrated = true;
    this._emit();
  }

  public close() {
    this.descriptor = null;
    this.key = '';
    this.hydrated = false;
    this.aliases.clear();
    this._emit();
  }

  public async attachRemote(snapshot: RemoteWorkspaceSnapshot) {
    const expectedKey = this.key;
    return this._enqueue(async () => {
      if (!this.descriptor || this.key !== expectedKey) return;
      const remote = createBaseTree(this.descriptor, snapshot.entries);
      const pending = this.getWorkingChanges().length > 0 || this.getStagedChanges().length > 0;
      if (this.baseCommitSha && this.baseCommitSha !== snapshot.baseCommitSha && pending) {
        this.remoteStale = true;
        await this._persistAndEmit();
        return;
      }
      if (!pending || !this.baseCommitSha) {
        this.base = remote;
        this.index = cloneTree(remote);
        this.working = cloneTree(remote);
      }
      this.baseCommitSha = snapshot.baseCommitSha;
      this.baseTreeSha = snapshot.baseTreeSha;
      this.remoteStale = false;
      await this._persistAndEmit();
    });
  }

  public getWorkingChanges() {
    return getWorkingChanges(this.index, this.working, this.conventions);
  }

  public getStagedChanges() {
    return getStagedChanges(this.base, this.index, this.conventions);
  }

  public listDirectory(path: string) {
    return listDirectoryEntries(this.working, path, this.conventions);
  }

  public getEntry(path: string) {
    return getWorkspaceEntry(this.working, this.aliases, path);
  }

  public getFileSource(path: string) {
    const entry = this.getEntry(path);
    if (!entry || entry.kind !== 'file') return undefined;
    if (entry.content !== undefined) return { kind: 'local', content: entry.content, sha: entry.sha } as const;
    return { kind: 'remote', sha: entry.sha } as const;
  }

  public resolveMovedPath(path: string) {
    return resolveMovedEntryPath(this.working, this.aliases, path);
  }

  public async createFile(path: string, content = '') {
    assertInScope(this.descriptor, path, this.conventions);
    return this._mutate(`Create file ${path}`, [path], (tree, metadata) => {
      createFileEntry(tree, this._requireDescriptor(), path, content, metadata, this.conventions);
    });
  }

  public async createDirectory(path: string) {
    assertInScope(this.descriptor, path, this.conventions);
    return this._mutate(`Create folder ${path}`, [path], (tree, metadata) => {
      createDirectory(tree, this._requireDescriptor(), path, metadata, this.conventions);
    });
  }

  public async writeFile(path: string, content: string) {
    assertInScope(this.descriptor, path, this.conventions);
    const current = this.working.entries[path];
    if (!current || current.kind !== 'file') return Promise.reject(new Error(`The file ${path} does not exist.`));
    const metadata = current.metadata ?? makeMetadata(`Update ${path}`, [path]);
    return this._mutateWithMetadata(metadata, (tree) => {
      writeFileEntry(tree, path, content, metadata);
    });
  }

  public async delete(path: string) {
    assertInScope(this.descriptor, path, this.conventions);
    return this._mutate(`Delete ${path}`, [path], (tree, metadata) => {
      deleteWorkspaceEntry(tree, this.base, path, metadata, this.conventions);
    });
  }

  public async move(source: string, destination: string) {
    return this._transfer(source, destination, false);
  }

  public async copy(source: string, destination: string) {
    return this._transfer(source, destination, true);
  }

  public async stage(groupIds: string[]) {
    return this._enqueue(async () => {
      this._assertStagingUnlocked();
      stageChanges(this.base, this.index, this.working, groupIds, this.conventions);
      this.revision += 1;
      await this._persistAndEmit();
      return this._result();
    });
  }

  public async stageAll() {
    return this._enqueue(async () => {
      this._assertStagingUnlocked();
      this.index = cloneTree(this.working);
      this.revision += 1;
      await this._persistAndEmit();
      return this._result();
    });
  }

  public async unstage(groupIds: string[]) {
    return this._enqueue(async () => {
      this._assertStagingUnlocked();
      unstageChanges(this.base, this.index, groupIds, this.conventions);
      this.revision += 1;
      await this._persistAndEmit();
      return this._result();
    });
  }

  public async restoreWorking(groupIds: string[]) {
    return this._enqueue(async () => {
      const before = cloneTree(this.working);
      restoreWorkingChanges(this.index, this.working, groupIds, this.conventions);
      this.revision += 1;
      await this._persistAndEmit();
      return this._result(getPathMappings(before, this.working));
    });
  }

  public async discardAll() {
    return this._enqueue(async () => {
      const before = cloneTree(this.working);
      this.index = cloneTree(this.base);
      this.working = cloneTree(this.base);
      this.remoteStale = false;
      this.revision += 1;
      await this._persistAndEmit();
      return this._result(getPathMappings(before, this.working));
    });
  }

  public async rebase(snapshot: RemoteWorkspaceSnapshot): Promise<RebaseResult> {
    return this._enqueue(async () => {
      const descriptor = this._requireDescriptor();
      const remote = createBaseTree(descriptor, snapshot.entries);
      const remoteChanges = changedPaths(this.base, remote, this.conventions);
      const scopes = [...this.getWorkingChanges(), ...this.getStagedChanges()].flatMap((change) => change.scopePaths);
      const conflicts = remoteChanges.filter((path) => scopes.some((scope) => pathsOverlap(path, scope)));
      if (conflicts.length) {
        this.remoteStale = true;
        await this._persistAndEmit();
        return { conflicts, rebased: false };
      }
      const oldBase = this.base;
      this.base = remote;
      this.index = applyGitStatusToTree(oldBase, this.index, remote, descriptor.docsRoot, this.conventions);
      this.working = applyGitStatusToTree(oldBase, this.working, this.index, descriptor.docsRoot, this.conventions);
      this.baseCommitSha = snapshot.baseCommitSha;
      this.baseTreeSha = snapshot.baseTreeSha;
      this.remoteStale = false;
      this.revision += 1;
      await this._persistAndEmit();
      return { conflicts: [], rebased: true };
    });
  }

  public beginPublish(): PublishPlan {
    if (this.publishingToken) throw new Error('A publish is already in progress.');
    if (this.remoteStale) throw new Error('Rebase the GitHub workspace before publishing.');
    const token = createId();
    this.publishingToken = token;
    this._emit();
    return {
      token,
      baseCommitSha: this.baseCommitSha,
      baseTreeSha: this.baseTreeSha,
      entries: stagedChangesToPublishEntries(this.base, this.index, this.descriptor?.docsRoot ?? '', this.conventions),
    };
  }

  public async completePublish(snapshot: RemoteWorkspaceSnapshot, token: string) {
    return this._enqueue(async () => {
      if (token !== this.publishingToken) throw new Error('The publish transaction is no longer active.');
      const descriptor = this._requireDescriptor();
      const previousIndex = this.index;
      const nextBase = createBaseTree(descriptor, snapshot.entries);
      this.base = nextBase;
      this.index = cloneTree(nextBase);
      this.working = applyGitStatusToTree(previousIndex, this.working, nextBase, descriptor.docsRoot, this.conventions);
      this.baseCommitSha = snapshot.baseCommitSha;
      this.baseTreeSha = snapshot.baseTreeSha;
      this.publishingToken = '';
      this.remoteStale = false;
      this.revision += 1;
      await this._persistAndEmit();
    });
  }

  public abortPublish(token: string) {
    if (token === this.publishingToken) {
      this.publishingToken = '';
      this._emit();
    }
  }

  protected async _transfer(source: string, destination: string, isCopy: boolean) {
    assertInScope(this.descriptor, source, this.conventions);
    assertInScope(this.descriptor, destination, this.conventions);
    if (!this.working.entries[source]) return Promise.reject(new Error(`${source} does not exist.`));
    const { existing, metadata } = getTransferMetadata(this.working, this.index, source, destination, isCopy);
    return this._mutateWithMetadata(metadata, (tree) => {
      transferWorkspaceEntry(
        tree,
        this._requireDescriptor(),
        this.aliases,
        existing,
        source,
        destination,
        isCopy,
        metadata,
        this.conventions,
      );
    });
  }

  protected async _mutate(label: string, scopes: string[], apply: (tree: TreeState, metadata: ChangeMetadata) => void) {
    return this._mutateWithMetadata(makeMetadata(label, scopes), (tree, metadata) => {
      apply(tree, metadata);
    });
  }

  protected async _mutateWithMetadata(
    metadata: ChangeMetadata,
    apply: (tree: TreeState, metadata: ChangeMetadata) => void,
  ) {
    return this._enqueue(async () => {
      const before = cloneTree(this.working);
      apply(this.working, metadata);
      this.revision += 1;
      await this._persistAndEmit();
      return this._result(getPathMappings(before, this.working));
    });
  }

  protected async _enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation, operation);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  protected _result(pathMappings: PathMapping[] = []): MutationResult {
    pathMappings.forEach(({ oldPath, newPath }) => this.aliases.set(oldPath, newPath));
    const changes = this.getWorkingChanges();
    return {
      revision: this.revision,
      changes,
      pathMappings,
      affectedDirectories: [...new Set(changes.map((change) => parentPath(change.path)).filter(Boolean))],
    };
  }

  protected _requireDescriptor() {
    if (!this.descriptor) throw new Error('No GitHub workspace is open.');
    return this.descriptor;
  }

  protected _assertStagingUnlocked() {
    if (this.publishingToken) throw new Error('Staging is locked while publishing.');
  }

  protected async _persistAndEmit() {
    if (this.descriptor && this.key) {
      await this.persistence.write(
        this.key,
        createPersistedWorkspace({
          descriptor: this.descriptor,
          baseCommitSha: this.baseCommitSha,
          baseTreeSha: this.baseTreeSha,
          base: this.base,
          index: this.index,
          working: this.working,
          revision: this.revision,
          remoteStale: this.remoteStale,
          conventions: this.conventions,
        }),
      );
    }
    this._emit();
  }

  protected _emit() {
    this.snapshotCache = undefined;
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}
