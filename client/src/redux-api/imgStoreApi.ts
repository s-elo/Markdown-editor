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

export type RenameType = {
  fileName: string;
  newName: string;
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
        formData.append("fileName", fileName);

        return {
          url: "/imgStore/upload",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["ImgStore"],
    }),
    deleteImg: builder.mutation<UploadRespType, string>({
      query: (imgName) => ({
        url: "/imgStore/delete",
        method: "DELETE",
        body: {
          imgName,
        },
      }),
      invalidatesTags: ["ImgStore"],
    }),
    renameImg: builder.mutation<UploadRespType, RenameType>({
      query: (renameInfo) => ({
        url: "/imgStore/rename",
        method: "PATCH",
        body: renameInfo,
      }),
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

export const {
  useGetUploadHistoryQuery,
  useUploadImgMutation,
  useDeleteImgMutation,
  useRenameImgMutation,
} = gitApi;
