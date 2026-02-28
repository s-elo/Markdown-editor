import { docsApi } from './docs';
import { transformResponse, transformErrorResponse } from './interceptor';

export interface FileNameMatch {
  name: string;
  path: string[];
}

export interface LineMatch {
  lineNumber: number;
  lineContent: string;
}

export interface FileContentMatches {
  name: string;
  path: string[];
  matches: LineMatch[];
}

const searchApi = docsApi.injectEndpoints({
  endpoints: (builder) => ({
    searchFiles: builder.query<FileNameMatch[], string>({
      query: (q) => `/search/files?q=${encodeURIComponent(q)}`,
      transformResponse,
      transformErrorResponse,
    }),
    searchContent: builder.query<
      FileContentMatches[],
      {
        q: string;
        caseSensitive?: boolean;
        includeFiles?: string;
        excludeFiles?: string;
      }
    >({
      query: ({ q, caseSensitive = false, includeFiles, excludeFiles }) => {
        const params = new URLSearchParams();
        params.set('q', q);
        params.set('caseSensitive', String(caseSensitive));
        if (includeFiles) params.set('includeFiles', includeFiles);
        if (excludeFiles) params.set('excludeFiles', excludeFiles);
        return `/search/content?${params.toString()}`;
      },
      transformResponse,
      transformErrorResponse,
    }),
  }),
  overrideExisting: false,
});

export const { useLazySearchFilesQuery, useLazySearchContentQuery } = searchApi;
