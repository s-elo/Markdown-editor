/* eslint-disable @typescript-eslint/naming-convention */
import type { WORKSPACE_SCHEMA_VERSION } from './constants';

export type WorkspaceStatus = 'ADDED' | 'DELETED' | 'MODIFIED' | 'UNTRACKED';
export enum GitMode {
  Directory = '040000',
  File = '100644',
  ExecutableFile = '100755',
  SymbolicLink = '120000',
  Submodule = '160000',
}
export type GitObjectType = 'blob' | 'commit' | 'tree';
export type WorkspaceEntryKind = 'directory' | 'file';

export interface WorkspaceDescriptor {
  owner: string;
  repo: string;
  branch: string;
  docsRoot: string;
}

export interface WorkspaceRules {
  protectedPaths?: readonly string[];
}

export interface IndexedDbWorkspacePersistenceOptions {
  databaseName: string;
  storeName: string;
}

export interface RemoteTreeEntry {
  path: string;
  mode: GitMode;
  type: GitObjectType;
  sha: string;
  size?: number;
}

export interface RemoteWorkspaceSnapshot {
  baseCommitSha: string;
  baseTreeSha: string;
  entries: RemoteTreeEntry[];
}

export interface OperationMetadata {
  /** Connects every path changed by one user action. */
  groupId: string;
  /** Describes the action in the changes panel. */
  label: string;
  /** Lists the paths covered by the action. */
  scopePaths: string[];
}

export interface WorkspaceEntry {
  id: string;
  path: string;
  kind: WorkspaceEntryKind;
  mode: GitMode;
  type: GitObjectType;
  sha?: string;
  size?: number;
  content?: string;
  /** Records the user action that created this entry state. */
  operationMetadata?: OperationMetadata;
}

export interface WorkspaceChange {
  id: string;
  groupId: string;
  label: string;
  status: WorkspaceStatus;
  path: string;
  kind: WorkspaceEntryKind;
  oldEntry: WorkspaceEntry | null;
  newEntry: WorkspaceEntry | null;
  scopePaths: string[];
}

export interface PathMapping {
  oldPath: string;
  newPath: string;
  kind: WorkspaceEntryKind;
}

export interface MutationResult {
  pathMappings: PathMapping[];
}

export interface WorkspaceSnapshot {
  /** Identifies the open repository workspace. */
  descriptor: WorkspaceDescriptor | null;
  /** Identifies the remote commit used as the local base. */
  baseCommitSha: string;
  /** Identifies the Git tree used to create the next commit. */
  baseTreeSha: string;
  /** Increases whenever workspace data changes. */
  workspaceVersion: number;
  /** True after browser storage has been read. */
  persistenceLoaded: boolean;
  /** True while a publish request is active. */
  publishing: boolean;
  /** Contains the files and folders shown in the editor. */
  entries: Record<string, WorkspaceEntry>;
  /** Contains file changes that are not staged. */
  unstagedChanges: WorkspaceChange[];
  /** Contains file changes included in the next publish. */
  stagedChanges: WorkspaceChange[];
}

export interface PublishTreeEntry {
  path: string;
  mode: GitMode;
  type: 'blob' | 'commit';
  sha: string | null;
  content?: string;
}

export interface PublishPlan {
  token: string;
  baseCommitSha: string;
  baseTreeSha: string;
  entries: PublishTreeEntry[];
}

export interface TreeState {
  entries: Record<string, WorkspaceEntry>;
  /** Keeps operation details for entries that no longer exist. */
  deletedOperationMetadata: Record<string, OperationMetadata>;
}

export interface PersistedWorkspace {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  descriptor: WorkspaceDescriptor;
  baseCommitSha: string;
  baseTreeSha: string;
  baseTree: TreeState;
  unstagedChanges: WorkspaceChange[];
  stagedChanges: WorkspaceChange[];
  localDirectories: WorkspaceEntry[];
  workspaceVersion: number;
}

export interface WorkspacePersistence {
  read: (key: string) => Promise<PersistedWorkspace | null>;
  write: (key: string, value: PersistedWorkspace) => Promise<void>;
}
