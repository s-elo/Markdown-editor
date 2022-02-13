import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { getDocsType } from "./docsApiType";

export const docsApi = createApi({
  reducerPath: "/getDocs",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:5620" }),
  endpoints: (builder) => ({
    getDocs: builder.query<getDocsType, void>({
      query: () => "/getDocs",
    }),
  }),
});

export const { useGetDocsQuery } = docsApi;
