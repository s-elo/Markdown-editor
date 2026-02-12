import { docsApi } from './docs';
import { transformResponse, transformErrorResponse } from './interceptor';

export type StatusType = 'ADDED' | 'DELETED' | 'MODIFIED' | 'RENAME' | 'UNTRACKED';
export interface Change {
  changePath: string;
  status: StatusType;
}
export interface GitStatus {
  workspace: Change[];
  staged: Change[];
  changes: boolean;
  noGit: boolean;
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
      query: () => `/git/status`,
      providesTags: ['GitStatus'],
      keepUnusedDataFor: 0, // no cache
      transformResponse,
      transformErrorResponse,
    }),
    gitAdd: builder.mutation<void, string[]>({
      query: (changePaths) => ({
        url: '/git/add',
        method: 'POST',
        body: { changePaths },
      }),
      invalidatesTags: ['GitStatus'],
      transformResponse,
      transformErrorResponse,
    }),
    gitRestore: builder.mutation<void, GitRestoreType>({
      query: (restoreBody) => ({
        url: '/git/restore',
        method: 'POST',
        body: restoreBody,
      }),
      invalidatesTags: () => ['GitStatus', 'Menu', 'Article'],
      transformResponse,
      transformErrorResponse,
    }),
    gitPull: builder.mutation<void, void>({
      query: () => ({
        url: '/git/pull',
        method: 'POST',
      }),
      invalidatesTags: ['GitStatus', 'Menu', 'Article'],
      transformResponse,
      transformErrorResponse,
    }),
    gitCommit: builder.mutation<void, { title: string; body: string }>({
      query: (message) => ({
        url: '/git/commit',
        method: 'POST',
        body: message,
      }),
      invalidatesTags: ['GitStatus'],
      transformResponse,
      transformErrorResponse,
    }),
    gitPush: builder.mutation<void, void>({
      query: () => ({
        url: '/git/push',
        method: 'POST',
      }),
      invalidatesTags: [],
      transformResponse,
      transformErrorResponse,
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
