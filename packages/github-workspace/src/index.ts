/**
 * Browser-side Git workspace orchestration.
 *
 * `baseTree` is the remote commit, `stagedTree` is the next commit, and
 * `workingTree` is the version shown in the editor.
 */

import { WORKSPACE_SCHEMA_VERSION } from './constants';
import {
  applyChangesToTree,
  cloneTree,
  createBaseTree,
  emptyTree,
  getLocalDirectories,
  getPathMappings,
  getPublishEntries,
  getStagedChanges,
  getUnstagedChanges,
  replayChangesOntoTree,
  restoreLocalDirectories,
} from './git-status';
import { createPersistedWorkspace } from './persistence';
import { cleanPath, createId, createOperationMetadata, getWorkspaceKey } from './utils';
import {
  assertInScope,
  createDirectory,
  createFileEntry,
  deleteWorkspaceEntry,
  getTransferOperation,
  getWorkspaceEntry,
  listDirectoryEntries,
  restoreWorkingChanges,
  stageChanges,
  transferWorkspaceEntry,
  unstageChanges,
  writeFileEntry,
} from './workspace-operations';

import type {
  MutationResult,
  OperationMetadata,
  PathMapping,
  PublishPlan,
  RemoteWorkspaceSnapshot,
  TreeState,
  WorkspaceDescriptor,
  WorkspacePersistence,
  WorkspaceRules,
  WorkspaceSnapshot,
} from './types';

export * from './constants';
export * from './git-status';
export { IndexedDbWorkspacePersistence } from './persistence';
export * from './types';
export { getWorkspaceKey } from './utils';

export class GitWorkspaceStore {
  private descriptor: WorkspaceDescriptor | null = null;

  private workspaceKey = '';

  private baseCommitSha = '';

  private baseTreeSha = '';

  private baseTree = emptyTree();

  private stagedTree = emptyTree();

  private workingTree = emptyTree();

  private workspaceVersion = 0;

  private persistenceLoaded = false;

  private publishingToken = '';

  private readonly movedPathAliases = new Map<string, string>();

  private readonly listeners = new Set<() => void>();

  private operationQueue: Promise<unknown> = Promise.resolve();

  private cachedSnapshot: WorkspaceSnapshot | undefined;

  /**
   * Creates an inactive store with its persistence adapter and path rules.
   * Call `open()` before reading or changing workspace files.
   */
  public constructor(private readonly persistence: WorkspacePersistence, private readonly rules: WorkspaceRules) {}

  /**
   * Registers a listener for snapshot changes and returns its unsubscribe function.
   * The stable function shape is compatible with React's `useSyncExternalStore()`.
   */
  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Returns the current editor tree and its derived staged and unstaged changes.
   * The same cached object is returned until the store notifies subscribers.
   */
  public getSnapshot = (): WorkspaceSnapshot => {
    this.cachedSnapshot ??= {
      descriptor: this.descriptor ? { ...this.descriptor } : null,
      baseCommitSha: this.baseCommitSha,
      baseTreeSha: this.baseTreeSha,
      workspaceVersion: this.workspaceVersion,
      persistenceLoaded: this.persistenceLoaded,
      publishing: Boolean(this.publishingToken),
      entries: cloneTree(this.workingTree).entries,
      unstagedChanges: getUnstagedChanges(this.stagedTree, this.workingTree),
      stagedChanges: getStagedChanges(this.baseTree, this.stagedTree),
    };
    return this.cachedSnapshot;
  };

  /**
   * Opens a repository workspace and restores its trees from browser storage.
   * A workspace without saved state stays empty until `attachRemote()` provides its remote tree.
   */
  public async open(descriptor: WorkspaceDescriptor) {
    await this.operationQueue.catch(() => undefined);
    const key = getWorkspaceKey(descriptor);
    if (this.workspaceKey === key && this.persistenceLoaded) return;
    this.descriptor = { ...descriptor, docsRoot: cleanPath(descriptor.docsRoot) };
    this.workspaceKey = key;
    this.persistenceLoaded = false;
    this.movedPathAliases.clear();
    this._notifySubscribers();
    const persisted = await this.persistence.read(key);
    if (this.workspaceKey !== key) return;
    if (persisted?.schemaVersion === WORKSPACE_SCHEMA_VERSION) {
      this.baseCommitSha = persisted.baseCommitSha;
      this.baseTreeSha = persisted.baseTreeSha;
      this.baseTree = cloneTree(persisted.baseTree);
      this.stagedTree = applyChangesToTree(this.baseTree, persisted.stagedChanges, this.descriptor.docsRoot);
      this.workingTree = applyChangesToTree(this.stagedTree, persisted.unstagedChanges, this.descriptor.docsRoot);
      restoreLocalDirectories(this.workingTree, persisted.localDirectories, this.descriptor.docsRoot);
      this.workspaceVersion = persisted.workspaceVersion;
    } else {
      this.baseCommitSha = '';
      this.baseTreeSha = '';
      this.baseTree = emptyTree();
      this.stagedTree = emptyTree();
      this.workingTree = emptyTree();
      this.workspaceVersion = 0;
    }
    this.persistenceLoaded = true;
    this._notifySubscribers();
  }

  /**
   * Closes the active workspace and clears its in-memory state.
   * Saved browser data is kept for the next `open()` call.
   */
  public close() {
    this.descriptor = null;
    this.workspaceKey = '';
    this.baseCommitSha = '';
    this.baseTreeSha = '';
    this.baseTree = emptyTree();
    this.stagedTree = emptyTree();
    this.workingTree = emptyTree();
    this.workspaceVersion = 0;
    this.persistenceLoaded = false;
    this.movedPathAliases.clear();
    this._notifySubscribers();
  }

  /**
   * Initializes or refreshes the workspace from a remote Git tree.
   * Local empty folders are preserved, and a newer remote tree is ignored while file changes are unpublished.
   */
  public async attachRemote(snapshot: RemoteWorkspaceSnapshot) {
    const expectedKey = this.workspaceKey;
    return this._enqueueOperation(async () => {
      if (!this.descriptor || this.workspaceKey !== expectedKey) return;
      const remote = createBaseTree(this.descriptor, snapshot.entries);
      const pending =
        getUnstagedChanges(this.stagedTree, this.workingTree).length > 0 ||
        getStagedChanges(this.baseTree, this.stagedTree).length > 0;
      // A remote refresh must not replace unpublished local files.
      if (this.baseCommitSha && this.baseCommitSha !== snapshot.baseCommitSha && pending) {
        return;
      }
      if (pending && this.baseCommitSha) return;
      const localDirectories = getLocalDirectories(this.workingTree);
      this.baseTree = remote;
      this.stagedTree = cloneTree(remote);
      this.workingTree = cloneTree(remote);
      restoreLocalDirectories(this.workingTree, localDirectories, this.descriptor.docsRoot);
      this.baseCommitSha = snapshot.baseCommitSha;
      this.baseTreeSha = snapshot.baseTreeSha;
      this.workspaceVersion += 1;
      await this._saveAndNotify();
    });
  }

  /**
   * Returns cloned direct children of a directory, with folders before files.
   * Hidden-file and application-specific filtering is handled by the client.
   */
  public listDirectory(path: string) {
    return listDirectoryEntries(this.workingTree, path);
  }

  /**
   * Returns local content for an edited file or a SHA for an unchanged remote file.
   * Moved-path aliases are resolved automatically; missing paths and directories return `undefined`.
   */
  public getFileSource(path: string) {
    const entry = getWorkspaceEntry(this.workingTree, this.movedPathAliases, path);
    if (!entry || entry.kind !== 'file') return undefined;
    if (entry.content !== undefined) return { kind: 'local', content: entry.content, sha: entry.sha } as const;
    return { kind: 'remote', sha: entry.sha } as const;
  }

  /**
   * Creates a file in the working tree and records one operation group for it.
   * The resulting file is unstaged and the updated workspace is persisted.
   */
  public async createFile(path: string, content = '') {
    assertInScope(this.descriptor, path, this.rules);
    return this._applyOperation(`Create file ${path}`, [path], (tree, operationMetadata) => {
      createFileEntry(tree, this._getOpenDescriptor(), path, content, operationMetadata);
    });
  }

  /**
   * Creates a local-only directory and persists it in browser storage.
   * Empty directories do not produce Git status or publish entries.
   */
  public async createDirectory(path: string) {
    assertInScope(this.descriptor, path, this.rules);
    return this._applyOperation(`Create folder ${path}`, [path], (tree, operationMetadata) => {
      createDirectory(tree, this._getOpenDescriptor(), path, operationMetadata);
    });
  }

  /**
   * Replaces a working-tree file's content and persists the change.
   * Repeated writes reuse the file's operation group so they appear as one change.
   */
  public async writeFile(path: string, content: string) {
    assertInScope(this.descriptor, path, this.rules);
    const current = this.workingTree.entries[path];
    if (!current || current.kind !== 'file') return Promise.reject(new Error(`The file ${path} does not exist.`));
    const operationMetadata = current.operationMetadata ?? createOperationMetadata(`Update ${path}`, [path]);
    return this._applyOperationWithMetadata(operationMetadata, (tree) => {
      writeFileEntry(tree, path, content, operationMetadata);
    });
  }

  /**
   * Removes a file or directory subtree from the working tree.
   * Deleted tracked files retain operation metadata so they can be staged or restored as one action.
   */
  public async delete(path: string) {
    assertInScope(this.descriptor, path, this.rules);
    return this._applyOperation(`Delete ${path}`, [path], (tree, operationMetadata) => {
      deleteWorkspaceEntry(tree, this.baseTree, path, operationMetadata);
    });
  }

  /**
   * Moves a file or directory subtree in the working tree.
   * Source deletions and destination additions share one operation group and moved paths remain resolvable.
   */
  public async move(source: string, destination: string) {
    return this._transfer(source, destination, false);
  }

  /**
   * Copies a file or directory subtree to a new working-tree path.
   * Copied entries receive new IDs and are reconciled as unstaged additions.
   */
  public async copy(source: string, destination: string) {
    return this._transfer(source, destination, true);
  }

  /**
   * Stages every file path belonging to the selected operation groups.
   * Selected states are copied from the working tree to the staged tree.
   */
  public async stage(groupIds: string[]) {
    return this._enqueueOperation(async () => {
      this._assertCanChangeStaging();
      stageChanges(this.baseTree, this.stagedTree, this.workingTree, groupIds);
      this.workspaceVersion += 1;
      await this._saveAndNotify();
      return this._createMutationResult();
    });
  }

  /**
   * Stages all current file changes by replacing the staged tree with the working tree.
   * Local-only directories remain excluded when Git status and publish entries are derived.
   */
  public async stageAll() {
    return this._enqueueOperation(async () => {
      this._assertCanChangeStaging();
      this.stagedTree = cloneTree(this.workingTree);
      this.workspaceVersion += 1;
      await this._saveAndNotify();
      return this._createMutationResult();
    });
  }

  /**
   * Removes selected operation groups from the staged set.
   * Their staged paths are reset from the base tree while the working tree is left unchanged.
   */
  public async unstage(groupIds: string[]) {
    return this._enqueueOperation(async () => {
      this._assertCanChangeStaging();
      unstageChanges(this.baseTree, this.stagedTree, groupIds);
      this.workspaceVersion += 1;
      await this._saveAndNotify();
      return this._createMutationResult();
    });
  }

  /**
   * Discards selected unstaged operation groups from the working tree.
   * Paths are restored from the staged tree and path mappings describe any reversed moves.
   */
  public async restoreWorking(groupIds: string[]) {
    return this._enqueueOperation(async () => {
      const before = cloneTree(this.workingTree);
      restoreWorkingChanges(this.stagedTree, this.workingTree, groupIds);
      this.workspaceVersion += 1;
      const result = this._createMutationResult(getPathMappings(before, this.workingTree));
      await this._saveAndNotify();
      return result;
    });
  }

  /**
   * Starts a publish transaction and returns the staged GitHub tree entries.
   * The returned token identifies the transaction and staging stays locked until completion or abort.
   */
  public beginPublish(): PublishPlan {
    if (this.publishingToken) throw new Error('A publish is already in progress.');
    const token = createId();
    this.publishingToken = token;
    this._notifySubscribers();
    return {
      token,
      baseCommitSha: this.baseCommitSha,
      baseTreeSha: this.baseTreeSha,
      entries: getPublishEntries(this.baseTree, this.stagedTree),
    };
  }

  /**
   * Completes the matching publish transaction with GitHub's new remote snapshot.
   * It resets the base and staged trees, then replays remaining unstaged files and local directories.
   */
  public async completePublish(snapshot: RemoteWorkspaceSnapshot, token: string) {
    return this._enqueueOperation(async () => {
      if (token !== this.publishingToken) throw new Error('The publish transaction is no longer active.');
      const descriptor = this._getOpenDescriptor();
      const previousStagedTree = this.stagedTree;
      const localDirectories = getLocalDirectories(this.workingTree);
      const nextBase = createBaseTree(descriptor, snapshot.entries);
      this.baseTree = nextBase;
      this.stagedTree = cloneTree(nextBase);
      // Keep unstaged files and local-only empty folders after publishing.
      this.workingTree = replayChangesOntoTree(previousStagedTree, this.workingTree, nextBase, descriptor.docsRoot);
      restoreLocalDirectories(this.workingTree, localDirectories, descriptor.docsRoot);
      this.baseCommitSha = snapshot.baseCommitSha;
      this.baseTreeSha = snapshot.baseTreeSha;
      this.publishingToken = '';
      this.workspaceVersion += 1;
      await this._saveAndNotify();
    });
  }

  /**
   * Cancels the matching publish transaction and unlocks staging.
   * A stale or unrelated token has no effect.
   */
  public abortPublish(token: string) {
    if (token === this.publishingToken) {
      this.publishingToken = '';
      this._notifySubscribers();
    }
  }

  private async _transfer(source: string, destination: string, isCopy: boolean) {
    assertInScope(this.descriptor, source, this.rules);
    assertInScope(this.descriptor, destination, this.rules);
    if (!this.workingTree.entries[source]) return Promise.reject(new Error(`${source} does not exist.`));
    const { existing, operationMetadata } = getTransferOperation(
      this.workingTree,
      this.stagedTree,
      source,
      destination,
      isCopy,
    );
    return this._applyOperationWithMetadata(operationMetadata, (tree) => {
      transferWorkspaceEntry(
        tree,
        this._getOpenDescriptor(),
        this.movedPathAliases,
        existing,
        source,
        destination,
        isCopy,
        operationMetadata,
      );
    });
  }

  private async _applyOperation(
    label: string,
    scopes: string[],
    apply: (tree: TreeState, operationMetadata: OperationMetadata) => void,
  ) {
    return this._applyOperationWithMetadata(createOperationMetadata(label, scopes), (tree, operationMetadata) => {
      apply(tree, operationMetadata);
    });
  }

  private async _applyOperationWithMetadata(
    operationMetadata: OperationMetadata,
    apply: (tree: TreeState, operationMetadata: OperationMetadata) => void,
  ) {
    return this._enqueueOperation(async () => {
      const before = cloneTree(this.workingTree);
      apply(this.workingTree, operationMetadata);
      this.workspaceVersion += 1;
      const result = this._createMutationResult(getPathMappings(before, this.workingTree));
      await this._saveAndNotify();
      return result;
    });
  }

  private async _enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private _createMutationResult(pathMappings: PathMapping[] = []): MutationResult {
    pathMappings.forEach(({ oldPath, newPath }) => this.movedPathAliases.set(oldPath, newPath));
    return { pathMappings };
  }

  private _getOpenDescriptor() {
    if (!this.descriptor) throw new Error('No GitHub workspace is open.');
    return this.descriptor;
  }

  private _assertCanChangeStaging() {
    if (this.publishingToken) throw new Error('Staging is locked while publishing.');
  }

  private async _saveAndNotify() {
    if (this.descriptor && this.workspaceKey) {
      await this.persistence.write(
        this.workspaceKey,
        createPersistedWorkspace({
          descriptor: this.descriptor,
          baseCommitSha: this.baseCommitSha,
          baseTreeSha: this.baseTreeSha,
          baseTree: this.baseTree,
          stagedTree: this.stagedTree,
          workingTree: this.workingTree,
          workspaceVersion: this.workspaceVersion,
        }),
      );
    }
    this._notifySubscribers();
  }

  private _notifySubscribers() {
    this.cachedSnapshot = undefined;
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}
