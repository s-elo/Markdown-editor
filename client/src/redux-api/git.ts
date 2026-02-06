import { docsApi, transformResponse } from './docs';

import { UnifyResponse } from '@/type';

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
    }),
    gitAdd: builder.mutation<UnifyResponse<void>, string[]>({
      query: (changePaths) => ({
        url: '/git/add',
        method: 'POST',
        body: { changePaths },
      }),
      invalidatesTags: ['GitStatus'],
      // transformResponse,
    }),
    gitRestore: builder.mutation<UnifyResponse<void>, GitRestoreType>({
      query: (restoreBody) => ({
        url: '/git/restore',
        method: 'POST',
        body: restoreBody,
      }),
      invalidatesTags: () => ['GitStatus', 'Menu', 'Article'],
      // transformResponse,
    }),
    gitPull: builder.mutation<UnifyResponse<void>, void>({
      query: () => ({
        url: '/git/pull',
        method: 'POST',
        // body: message,
        // transformResponse,
      }),
      invalidatesTags: ['GitStatus', 'Menu', 'Article'],
    }),
    gitCommit: builder.mutation<UnifyResponse<void>, { title: string; body: string }>({
      query: (message) => ({
        url: '/git/commit',
        method: 'POST',
        body: message,
      }),
      invalidatesTags: ['GitStatus'],
      // transformResponse,
    }),
    gitPush: builder.mutation<UnifyResponse<void>, void>({
      query: () => ({
        url: '/git/push',
        method: 'POST',
      }),
      invalidatesTags: [],
      // transformResponse,
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
