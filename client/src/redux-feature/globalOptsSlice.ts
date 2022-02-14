import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type globalOptsPayload = {
  keys: ("isDarkMode" | "readonly" | "menuCollapse")[];
  values: boolean[];
};

const initialState = {
  isDarkMode: true,
  readonly: true,
  menuCollapse: false,
};

export const globalOptsSlice = createSlice({
  name: "globalOpts",
  initialState,
  reducers: {
    updateGlobalOpts: (state, action: PayloadAction<globalOptsPayload>) => {
      const { keys, values } = action.payload;

      for (const [idx, key] of keys.entries()) {
        state[key] = values[idx];
      }
    },
  },
});

export const { updateGlobalOpts } = globalOptsSlice.actions;

export const selectGlobalOpts = (state: RootState) => state.globalOpts;

export default globalOptsSlice.reducer;
