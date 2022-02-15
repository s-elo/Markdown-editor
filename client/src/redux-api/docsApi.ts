import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { GetDocsType, UpdateDocPayload } from "./docsApiType";

export const docsApi = createApi({
  reducerPath: "/getDocs",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:5600" }),
  endpoints: (builder) => ({
    getDocs: builder.query<GetDocsType, void>({
      query: () => "/getDocs",
    }),
    getDoc: builder.query<{ content: string }, string>({
      query: (filePath) => `/getDocs/article?filePath=${filePath}`,

      // the cached time when no subscribers
      // 60s by default
      keepUnusedDataFor: 300, // 300s 5min
    }),
    updateDoc: builder.mutation<unknown, UpdateDocPayload>({
      query: (updateDoc) => ({
        url: "/editDoc",
        method: "POST",
        body: updateDoc,
      }),
    }),
  }),
});

export const { useGetDocsQuery, useGetDocQuery, useUpdateDocMutation } =
  docsApi;
