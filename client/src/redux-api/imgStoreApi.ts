import { docsApi } from "./docsApi";

export type ImgDataType = {
  created_at: number;
  delete: string;
  filename: string;
  hash: string;
  height: number;
  page: string;
  path: string;
  size: number;
  storename: string;
  url: string;
  width: number;
};

export type UploadRespType = {
  RequestId: string;
  code: string;
  message: string;
  success: boolean;
  err: 0 | 1;
};
const gitApi = docsApi.injectEndpoints({
  endpoints: (builder) => ({
    getUploadHistory: builder.query<ImgDataType[], void>({
      query: () => `/imgStore/uploadHistory`,
      providesTags: ["ImgStore"],
      keepUnusedDataFor: 300,
    }),
    uploadImg: builder.mutation<UploadRespType, File>({
      query: (imgFile) => {
        const formData = new FormData();
        formData.append("imgFile", imgFile);

        return {
          url: "/imgStore/upload",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["ImgStore"],
    }),
  }),

  /*
   * You will get a warning
   * if you inject an endpoint that
   * already exists in development mode
   * when you don't explicitly specify overrideExisting: true.
   * You will not see this in production and
   * the existing endpoint will just be overriden
   */
  overrideExisting: false,
});

export const { useGetUploadHistoryQuery, useUploadImgMutation } = gitApi;
