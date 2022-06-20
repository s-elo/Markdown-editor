import { docsApi } from "./docsApi";

export type ConfigType = {
  docRootPath: string;
  ignoreDirs?: string[];
  region?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  bucket?: string;
};

const configApi = docsApi.injectEndpoints({
  endpoints: (builder) => ({
    getConfigs: builder.query<
      { configs: ConfigType; err: 0 | 1; message: string },
      void
    >({
      query: () => `/config/getConfigs`,
      providesTags: ["Configs"],
      keepUnusedDataFor: 300,
    }),
    updateConfigs: builder.mutation<
      { err: 0 | 1; message: string },
      ConfigType
    >({
      query: (configs) => {
        return {
          url: "/config/updateConfigs",
          method: "POST",
          body: configs,
        };
      },
      invalidatesTags: [
        "Configs",
        "Docs",
        "GitStatus",
        "ImgStore",
        "Menu",
        "NorDocs",
      ],
    }),
  }),

  overrideExisting: false,
});

export const { useGetConfigsQuery, useUpdateConfigsMutation } = configApi;
