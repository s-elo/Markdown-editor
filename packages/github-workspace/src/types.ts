/* eslint-disable @typescript-eslint/naming-convention */
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

export interface ChangeMetadata {
  groupId: string;
  label: string;
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
  metadata?: ChangeMetadata;
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
  revision: number;
  changes: WorkspaceChange[];
  pathMappings: PathMapping[];
  affectedDirectories: string[];
}

export interface WorkspaceSnapshot {
  descriptor: WorkspaceDescriptor | null;
  baseCommitSha: string;
  baseTreeSha: string;
  revision: number;
  hydrated: boolean;
  remoteStale: boolean;
  publishing: boolean;
  entries: Record<string, WorkspaceEntry>;
  workingChanges: WorkspaceChange[];
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

export interface RebaseResult {
  conflicts: string[];
  rebased: boolean;
}

export interface TreeState {
  entries: Record<string, WorkspaceEntry>;
  deletedMetadata: Record<string, ChangeMetadata>;
}

export interface PersistedWorkspace {
  schemaVersion: number;
  descriptor: WorkspaceDescriptor;
  baseCommitSha: string;
  baseTreeSha: string;
  base: TreeState;
  workingChanges: WorkspaceChange[];
  stagedChanges: WorkspaceChange[];
  revision: number;
  remoteStale: boolean;
}

export interface WorkspacePersistence {
  read: (key: string) => Promise<PersistedWorkspace | null>;
  write: (key: string, value: PersistedWorkspace) => Promise<void>;
}
