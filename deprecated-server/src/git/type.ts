export type StatusType = 'ADDED' | 'DELETED' | 'MODIFIED' | 'UNTRACKED';

export interface Change {
  changePath: string;
  status: StatusType;
}
