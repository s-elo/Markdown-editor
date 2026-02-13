/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import {
  Article,
  UpdateDocPayload,
  CreateDocPayload,
  DeleteDocPayload,
  CopyCutDocPayload,
  ModifyDocNamePayload,
  CheckServerRes,
  DocTreeNode,
} from './docsApiType';
import { transformResponse, transformErrorResponse } from './interceptor';

export const docsApi = createApi({
  reducerPath: '/docs',
  baseQuery: fetchBaseQuery({ baseUrl: `http://127.0.0.1:${__SERVER_PORT__}/api` }),
  tagTypes: ['Menu', 'Article', 'GitStatus', 'ImgStore', 'Configs'],

  endpoints: (builder) => ({
    checkServer: builder.query<CheckServerRes, void>({
      query: () => '/check',
      transformErrorResponse,
      transformResponse,
    }),
    getDocSubItems: builder.query<DocTreeNode[], { folderDocPath?: string; homeRootDir?: boolean } | void>({
      query: (params = {}) => ({
        url: '/docs/sub-items',
        method: 'GET',
        params: { ...params },
      }),
      providesTags: ['Menu'],
      transformErrorResponse,
      transformResponse,
    }),
    /**
     * get one single doc
     */
    getDoc: builder.query<Article | null, string>({
      query: (filePath) => `/docs/article?filePath=${filePath}`,
      providesTags: (queryRet) => {
        if (!queryRet) return [];
        return [{ type: 'Article', filePath: queryRet.filePath }];
      },
      // the cached time when no subscribers
      // 60s by default
      keepUnusedDataFor: 60, // 300s 5min
      // keepUnusedDataFor: 0, // no cache
      transformErrorResponse,
      transformResponse,
    }),
    /**
     * create a file or folder
     */
    createDoc: builder.mutation<DocTreeNode, CreateDocPayload>({
      query: (newDocInfo) => ({
        url: '/docs/create',
        method: 'POST',
        body: newDocInfo,
      }),
      invalidatesTags: ['GitStatus'],
      transformErrorResponse,
      transformResponse,
    }),
    /** create a folder by absolute path */
    createFolder: builder.mutation<void, { folderPath: string }>({
      query: (createFolderInfo) => ({
        url: '/docs/create-folder',
        method: 'POST',
        body: createFolderInfo,
      }),
      invalidatesTags: ['GitStatus', 'Menu'],
      transformErrorResponse,
      transformResponse,
    }),
    /**
     * delete a file or folder
     */
    deleteDoc: builder.mutation<unknown, DeleteDocPayload>({
      query: (deleteInfo) => ({
        url: '/docs/delete',
        method: 'DELETE',
        body: deleteInfo,
      }),
      invalidatesTags: ['GitStatus'],
      transformErrorResponse,
      transformResponse,
    }),
    copyCutDoc: builder.mutation<unknown, CopyCutDocPayload>({
      query: (copyCutInfo) => ({
        url: '/docs/copy-cut',
        method: 'PATCH',
        body: copyCutInfo,
      }),
      invalidatesTags: ['GitStatus'],
      transformErrorResponse,
      transformResponse,
    }),
    /**
     * modify the doc name
     */
    modifyDocName: builder.mutation<unknown, ModifyDocNamePayload>({
      query: (modifyInfo) => ({
        url: '/docs/update-name',
        method: 'PATCH',
        body: modifyInfo,
      }),
      invalidatesTags: ['GitStatus'],
      transformErrorResponse,
      transformResponse,
    }),
    /**
     * update the content of a single doc
     */
    updateDoc: builder.mutation<unknown, UpdateDocPayload>({
      query: (updateDoc) => ({
        url: '/docs/update',
        method: 'PATCH',
        body: updateDoc,
      }),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      invalidatesTags: (_, __, arg) => [{ type: 'Article', filePath: arg.filePath }, 'GitStatus'],
      transformErrorResponse,
      transformResponse,
    }),
  }),
});

export const {
  useGetDocSubItemsQuery,
  useLazyGetDocSubItemsQuery,
  useGetDocQuery,
  useUpdateDocMutation,
  useCreateDocMutation,
  useCreateFolderMutation,
  useDeleteDocMutation,
  useCopyCutDocMutation,
  useModifyDocNameMutation,
  useCheckServerQuery,
} = docsApi;
