import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type globalOptsPayload = {
  isDarkMode: boolean;
  menuCollapse: boolean;
};

const initialState = {
  isDarkMode: true,
  menuCollapse: false,
};

export const globalOptsSlice = createSlice({
  name: "globalOpts",
  initialState,
  reducers: {
    updateGlobalOpts: (state, action: PayloadAction<globalOptsPayload>) => {
      const { isDarkMode, menuCollapse } = action.payload;

      state.isDarkMode = isDarkMode;
      state.menuCollapse = menuCollapse;
    },
  },
});

export const { updateGlobalOpts } = globalOptsSlice.actions;

export const selectGlobalOpts = (state: RootState) => state.globalOpts;

export default globalOptsSlice.reducer;
