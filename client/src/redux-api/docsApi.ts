import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { getDocsType } from "./docsApiType";

export const docsApi = createApi({
  reducerPath: "/getDocs",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:5620" }),
  endpoints: (builder) => ({
    getDocs: builder.query<getDocsType, void>({
      query: () => "/getDocs",
    }),
    getDoc: builder.query<{ content: string }, string>({
      query: (filePath) => `/getDocs/article?filePath=${filePath}`,

      // the cached time when no subscribers
      // 60s by default
      keepUnusedDataFor: 300, // 300s 5min
    }),
  }),
});

export const { useGetDocsQuery, useGetDocQuery } = docsApi;
