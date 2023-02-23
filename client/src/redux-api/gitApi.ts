import { docsApi } from './docsApi';

export type StatusType = 'ADDED' | 'DELETED' | 'MODIFIED' | 'RENAME' | 'UNTRACKED';
export interface Change {
  changePath: string;
  status: StatusType;
}
export interface GitStatus {
  workSpace: Change[];
  staged: Change[];
  changes: boolean;
  noGit: boolean;
  err: 0 | 1;
  message: string;
}
export interface GitRestoreType {
  staged: boolean;
  changes: {
    changePath: string;
    status: StatusType;
  }[];
}

const gitApi = docsApi.injectEndpoints({
  endpoints: (builder) => ({
    getGitStatus: builder.query<GitStatus, void>({
      query: () => `/git/getStatus`,
      providesTags: ['GitStatus'],
      keepUnusedDataFor: 0, // no cache
    }),
    gitAdd: builder.mutation<{ err: 0 | 1; message: string }, string[]>({
      query: (changePaths) => ({
        url: '/git/add',
        method: 'POST',
        body: { changePaths },
      }),
      invalidatesTags: ['GitStatus'],
    }),
    gitRestore: builder.mutation<{ err: 0 | 1; message: string }, GitRestoreType>({
      query: (restoreBody) => ({
        url: '/git/restore',
        method: 'POST',
        body: restoreBody,
      }),
      invalidatesTags: () => [
        'NorDocs', // for outline
        'GitStatus',
        'Docs',
        'Menu',
      ],
    }),
    gitPull: builder.mutation<{ err: 0 | 1; message: string }, void>({
      query: () => ({
        url: '/git/pull',
        method: 'POST',
        // body: message,
      }),
      invalidatesTags: ['GitStatus', 'Menu', 'Docs', 'NorDocs'],
    }),
    gitCommit: builder.mutation<{ err: 0 | 1; message: string }, { title: string; body: string }>({
      query: (message) => ({
        url: '/git/commit',
        method: 'POST',
        body: message,
      }),
      invalidatesTags: ['GitStatus'],
    }),
    gitPush: builder.mutation<{ err: 0 | 1; message: string }, void>({
      query: () => ({
        url: '/git/push',
        method: 'POST',
      }),
      invalidatesTags: [],
    }),
  }),

  /*
   * You will get a warning
   * if you inject an endpoint that
   * already exists in development mode
   * when you don't explicitly specify overrideExisting: true.
   * You will not see this in production and
   * the existing endpoint will just be override
   */
  overrideExisting: false,
});

export const {
  useGetGitStatusQuery,
  useGitCommitMutation,
  useGitPullMutation,
  useGitAddMutation,
  useGitRestoreMutation,
  useGitPushMutation,
} = gitApi;
