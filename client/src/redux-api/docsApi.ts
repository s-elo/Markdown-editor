import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { GetDocsType, GetDocType, UpdateDocPayload } from "./docsApiType";

export const docsApi = createApi({
  reducerPath: "/getDocs",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:5600" }),
  tagTypes: ["Docs"] as string[],

  endpoints: (builder) => ({
    getDocs: builder.query<GetDocsType, void>({
      query: () => "/getDocs",
    }),
    getDoc: builder.query<GetDocType, string>({
      query: (filePath) => `/getDocs/article?filePath=${filePath}`,
      providesTags: (
        queryRet = { content: "", filePath: "" },
        error,
        queryArg
      ) => [
        // specific to a certian doc
        { type: "Docs", filePath: queryRet.filePath },
      ],
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
      invalidatesTags: (_, __, arg) => [
        { type: "Docs", filePath: arg.modifyPath },
      ],
    }),
  }),
});

export const { useGetDocsQuery, useGetDocQuery, useUpdateDocMutation } =
  docsApi;
