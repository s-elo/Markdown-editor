import { docsApi } from "./docsApi";

export type GetGitStatus = {
  changes: boolean;
  noGit: boolean;
};

const gitApi = docsApi.injectEndpoints({
  endpoints: (builder) => ({
    getGitStatus: builder.query<GetGitStatus, void>({
      query: () => `/git/getStatus`,
      providesTags: ["GitStatus"],
      keepUnusedDataFor: 0, // no cache
    }),
    gitPull: builder.mutation<{ err: boolean }, void>({
      query: () => ({
        url: "/git/pull",
        method: "POST",
        // body: message,
      }),
      invalidatesTags: ["GitStatus"],
    }),
    gitCommit: builder.mutation<unknown, { message: string }>({
      query: (message) => ({
        url: "/git/commit",
        method: "POST",
        body: message,
      }),
      invalidatesTags: ["GitStatus"],
    }),
  }),

  /*
   * You will get a warning
   * if you inject an endpoint that
   * already exists in development mode
   * when you don't explicitly specify overrideExisting: true.
   * You will not see this in production and
   * the existing endpoint will just be overriden
   */
  overrideExisting: false,
});

export const {
  useGetGitStatusQuery,
  useGitCommitMutation,
  useGitPullMutation,
} = gitApi;
