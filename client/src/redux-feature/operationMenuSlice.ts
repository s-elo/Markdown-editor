/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '@/store';

export interface CopyCutPayload {
  isCopy?: boolean;
  /** nor paths */
  copyCutPaths?: string[];
}

export interface SelectedItemContext {
  /** also is the doc nor path */
  selectedItemIds: string[];
}

const initialState: Required<CopyCutPayload & SelectedItemContext> = {
  isCopy: false,
  copyCutPaths: [],
  selectedItemIds: [],
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
    updateSelectedItems: (state, action: PayloadAction<string[]>) => {
      state.selectedItemIds = action.payload;
    },
  },
});

export const { updateCopyCut, updateSelectedItems } = operationMenuSlice.actions;

export const selectOperationMenu = (state: RootState) => state.operationMenu;
export const selectSelectedItemIds = (state: RootState) => state.operationMenu.selectedItemIds;
export default operationMenuSlice.reducer;
