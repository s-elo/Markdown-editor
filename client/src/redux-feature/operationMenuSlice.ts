/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '@/store';

export interface CopyCutPayload {
  copyPath: string;
  cutPath: string;
}

const initialState = {
  copyPath: '',
  cutPath: '',
};

export const operationMenuSlice = createSlice({
  name: 'operationMenu',
  initialState,
  reducers: {
    updateCopyCut: (state, action: PayloadAction<CopyCutPayload>) => {
      const { copyPath, cutPath } = action.payload;

      state.copyPath = copyPath;
      state.cutPath = cutPath;
    },
  },
});

export const { updateCopyCut } = operationMenuSlice.actions;

export const selectOperationMenu = (state: RootState) => state.operationMenu;

export default operationMenuSlice.reducer;
