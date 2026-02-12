import { docsApi } from './docs';
import { transformErrorResponse, transformResponse } from './interceptor';

export interface Settings {
  docRootPath?: string;
  ignoreDirs?: string[];
}

const settingsApi = docsApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<Settings, void>({
      query: () => `/settings/`,
      providesTags: ['Configs'],
      keepUnusedDataFor: 300,
      transformResponse,
      transformErrorResponse,
    }),
    updateSettings: builder.mutation<void, Settings>({
      query: (settings) => {
        return {
          url: '/settings',
          method: 'PATCH',
          body: settings,
        };
      },
      transformResponse,
      transformErrorResponse,
      invalidatesTags: ['Configs', 'Menu', 'GitStatus', 'ImgStore', 'Article'],
    }),
  }),

  overrideExisting: false,
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
