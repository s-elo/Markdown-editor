/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '@/store';

export interface CopyCutPayload {
  isCopy?: boolean;
  copyCutPaths?: string[];
}

const initialState: Required<CopyCutPayload> = {
  isCopy: false,
  copyCutPaths: [],
};

export const operationMenuSlice = createSlice({
  name: 'operationMenu',
  initialState,
  reducers: {
    updateCopyCut: (state, action: PayloadAction<CopyCutPayload>) => {
      const { isCopy, copyCutPaths } = action.payload;

      if (isCopy !== undefined) {
        state.isCopy = isCopy;
      }
      if (copyCutPaths !== undefined) {
        state.copyCutPaths = copyCutPaths;
      }
    },
  },
});

export const { updateCopyCut } = operationMenuSlice.actions;

export const selectOperationMenu = (state: RootState) => state.operationMenu;

export default operationMenuSlice.reducer;
