import { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { UnifyResponse } from '@/type';

export const transformResponse = <T>(response: UnifyResponse<T>) => {
  return response.data;
};

export const transformErrorResponse = (errorRes: FetchBaseQueryError) => {
  return errorRes.data;
};
