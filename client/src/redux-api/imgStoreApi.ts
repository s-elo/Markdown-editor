import { docsApi } from "./docsApi";

export type ImgDataType = {
  /** object name on oss */
  name: string;
  /** object url */
  url: string;
  /** object last modified GMT date, e.g.: 2015-02-19T08:39:44.000Z */
  lastModified: string;
  /** object etag contains ", e.g.: "5B3C1A2E053D763E1B002CC607C5A0FE" */
  etag: string;
  /** object type, e.g.: Normal */
  type: string;
  /** object size, e.g.: 344606 */
  size: number;
  storageClass: "Standard" | "IA" | "Archive";
  owner?: {
    id: string;
    displayName: string;
  };
};

export type UploadRespType = {
  message: string;
  status: number;
  err: 0 | 1;
};
const gitApi = docsApi.injectEndpoints({
  endpoints: (builder) => ({
    getUploadHistory: builder.query<ImgDataType[], void>({
      query: () => `/imgStore/uploadHistory`,
      providesTags: ["ImgStore"],
      keepUnusedDataFor: 300,
    }),
    uploadImg: builder.mutation<
      UploadRespType,
      { imgFile: File; fileName: string }
    >({
      query: ({ imgFile, fileName }) => {
        const formData = new FormData();
        formData.append("imgFile", imgFile);
        formData.append('fileName', fileName);

        console.log(formData)

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
