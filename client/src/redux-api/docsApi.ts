import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
// import { docNormalizer } from "@/utils/utils";
import {
  GetDocsType,
  NormalizedDoc,
  GetDocType,
  UpdateDocPayload,
  CreateDocPayload,
  DeleteDocPayload,
  CopyCutDocPayload,
  ModifyDocNamePayload,
} from "./docsApiType";

export const docsApi = createApi({
  reducerPath: "/docOperations",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:5600" }),
  tagTypes: ["Docs", "Menu", "NorDocs", "GitStatus"],

  endpoints: (builder) => ({
    /**
     * get the overall menu
     * */
    getDocMenu: builder.query<GetDocsType, void>({
      query: () => "/getDocs",
      // transformResponse: (responseDoc: DOC[], meta, arg) => {
      //   const normalizedDoc = docNormalizer(responseDoc);
      //   return {
      //     docs: responseDoc,
      //     norDocs: normalizedDoc,
      //   };
      // },
      providesTags: ["Menu"],
    }),
    /**
     * get the normalized docs
     * */
    getNorDocs: builder.query<NormalizedDoc, void>({
      query: () => "/getDocs/norDocs",
      providesTags: ["NorDocs"],
    }),
    /**
     * get one single doc
     */
    getDoc: builder.query<GetDocType, string>({
      query: (filePath) => `/getDocs/article?filePath=${filePath}`,
      providesTags: (
        queryRet = { content: "", filePath: "", headings: [], keywords: [] },
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
    createDoc: builder.mutation<unknown, CreateDocPayload>({
      query: (newDocInfo) => ({
        url: "/menu/createDoc",
        method: "POST",
        body: newDocInfo,
      }),
      invalidatesTags: ["Menu", "GitStatus"],
    }),
    /**
     * delete a file or folder
     */
    deleteDoc: builder.mutation<unknown, DeleteDocPayload>({
      query: (deleteInfo) => ({
        url: "/menu/deleteDoc",
        method: "DELETE",
        body: deleteInfo,
      }),
      invalidatesTags: ["Menu", "GitStatus"],
    }),
    copyCutDoc: builder.mutation<unknown, CopyCutDocPayload>({
      query: (copyCutInfo) => ({
        url: "/menu/copyCutDoc",
        method: "PATCH",
        body: copyCutInfo,
      }),
      invalidatesTags: ["Menu", "GitStatus"],
    }),
    /**
     * modify the doc name
     */
    modifyDocName: builder.mutation<unknown, ModifyDocNamePayload>({
      query: (modifyInfo) => ({
        url: "/editDoc/modifyName",
        method: "PATCH",
        body: modifyInfo,
      }),
      invalidatesTags: ["Menu", "GitStatus"],
    }),
    /**
     * update the content of a single doc
     */
    updateDoc: builder.mutation<unknown, UpdateDocPayload>({
      query: (updateDoc) => ({
        url: "/editDoc",
        method: "PATCH",
        body: updateDoc,
      }),
      invalidatesTags: (_, __, arg) => [
        { type: "Docs", filePath: arg.modifyPath },
        "GitStatus",
      ],
    }),
  }),
});

export const {
  useGetDocMenuQuery,
  useGetNorDocsQuery,
  useGetDocQuery,
  useUpdateDocMutation,
  useCreateDocMutation,
  useDeleteDocMutation,
  useCopyCutDocMutation,
  useModifyDocNameMutation,
} = docsApi;
