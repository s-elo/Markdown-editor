import { docsApi } from './docs';

import { UnifyResponse } from '@/type';

export interface Settings {
  docRootPath: string;
  ignoreDirs?: string[];
  region?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  bucket?: string;
}

const settingsApi = docsApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<UnifyResponse<Settings>, void>({
      query: () => `/settings/`,
      providesTags: ['Configs'],
      keepUnusedDataFor: 300,
    }),
    updateSettings: builder.mutation<UnifyResponse<void>, Settings>({
      query: (settings) => {
        return {
          url: '/settings',
          method: 'PATCH',
          body: settings,
        };
      },
      invalidatesTags: ['Configs', 'Docs', 'GitStatus', 'ImgStore', 'Menu', 'NorDocs'],
    }),
  }),

  overrideExisting: false,
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
