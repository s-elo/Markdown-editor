/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

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
} from './docsApiType';

import { UnifyResponse } from '@/type';

export const transformResponse = <T>(response: UnifyResponse<T>) => response.data;

export const docsApi = createApi({
  reducerPath: '/docs',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Docs', 'Menu', 'NorDocs', 'GitStatus', 'ImgStore', 'Configs'],

  endpoints: (builder) => ({
    /**
     * get the overall menu
     * */
    getDocMenu: builder.query<GetDocsType, void>({
      query: () => '/docs',
      providesTags: ['Menu'],
      keepUnusedDataFor: 60,
      transformResponse,
    }),
    /**
     * get the normalized docs
     * */
    getNorDocs: builder.query<NormalizedDoc, void>({
      query: () => '/docs/nor-docs',
      providesTags: ['NorDocs'],
      keepUnusedDataFor: 60,
      transformResponse,
    }),
    /**
     * refresh the cache
     */
    refreshDocs: builder.mutation<unknown, void>({
      query: () => ({
        url: '/docs/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Menu', 'NorDocs', 'Docs'],
      transformResponse,
    }),
    /**
     * get one single doc
     */
    getDoc: builder.query<GetDocType | null, string>({
      query: (filePath) => `/docs/article?filePath=${filePath}`,
      providesTags: (queryRet) => {
        if (!queryRet) return [];
        return [{ type: 'Docs', filePath: queryRet.filePath }];
      },
      // the cached time when no subscribers
      // 60s by default
      keepUnusedDataFor: 60, // 300s 5min
      transformResponse,
    }),
    /**
     * create a file or folder
     */
    createDoc: builder.mutation<unknown, CreateDocPayload>({
      query: (newDocInfo) => ({
        url: '/docs/create',
        method: 'POST',
        body: newDocInfo,
      }),
      invalidatesTags: ['Menu', 'GitStatus', 'NorDocs'],
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
      invalidatesTags: ['Menu', 'GitStatus', 'NorDocs'],
      transformResponse,
    }),
    copyCutDoc: builder.mutation<unknown, CopyCutDocPayload>({
      query: (copyCutInfo) => ({
        url: '/docs/copy-cut',
        method: 'PATCH',
        body: copyCutInfo,
      }),
      invalidatesTags: ['Menu', 'GitStatus', 'NorDocs'],
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
      invalidatesTags: ['Menu', 'GitStatus', 'NorDocs'],
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
      invalidatesTags: (_, __, arg) => [
        { type: 'Docs', filePath: arg.filePath },
        'NorDocs', // for outline
        'GitStatus',
      ],
      transformResponse,
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
  useRefreshDocsMutation,
} = docsApi;
