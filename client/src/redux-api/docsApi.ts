import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import {
  GetDocsType,
  GetDocType,
  UpdateDocPayload,
  CreateDocPayload,
} from "./docsApiType";

export const docsApi = createApi({
  reducerPath: "/docOperations",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:5600" }),
  tagTypes: ["Docs", "Menu"] as string[],

  endpoints: (builder) => ({
    /**
     * get the overall menu
     * */
    getDocMenu: builder.query<GetDocsType, void>({
      query: () => "/getDocs",
      providesTags: ["Menu"],
    }),
    /**
     * get one single doc
     */
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
      keepUnusedDataFor: 60, // 300s 5min
    }),
    /**
     * create a file or folder
     */
    createFile: builder.mutation<unknown, CreateDocPayload>({
      query: (newDocInfo) => ({
        url: "/menu/createDoc",
        method: "POST",
        body: newDocInfo,
      }),
      invalidatesTags: ["Menu"],
    }),
    /**
     * update the content of a single doc
     */
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

export const {
  useGetDocMenuQuery,
  useGetDocQuery,
  useUpdateDocMutation,
  useCreateFileMutation,
} = docsApi;
