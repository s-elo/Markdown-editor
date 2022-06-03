import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { localStore } from "@/utils/utils";

export type GlobalOptsPayload = {
  keys: (
    | "isDarkMode"
    | "readonly"
    | "menuCollapse"
    | "mirrorCollapse"
    | "isEditorBlur"
    | "anchor"
  )[];
  values: (boolean | string)[];
};

export type GlobalOptsType = {
  isDarkMode: boolean;
  readonly: boolean;
  menuCollapse: boolean;
  mirrorCollapse: boolean;
  isEditorBlur: boolean;
  anchor: string;
};

const initailTheme = localStore("theme").value;

const initialState: GlobalOptsType = {
  isDarkMode: initailTheme === "dark" ? true : false,
  readonly: true,
  menuCollapse: true,
  mirrorCollapse: true,
  isEditorBlur: true,
  anchor: "",
};

export const globalOptsSlice = createSlice({
  name: "globalOpts",
  initialState,
  reducers: {
    // only for boolean type update
    updateGlobalOpts: (state, action: PayloadAction<GlobalOptsPayload>) => {
      const { keys, values } = action.payload;

      for (const [idx, key] of keys.entries()) {
        if (key === "anchor") {
          state[key] = values[idx] as string;
        } else {
          state[key] = values[idx] as boolean;
        }
      }
    },
  },
});

export const { updateGlobalOpts } = globalOptsSlice.actions;

export const selectGlobalOpts = (state: RootState) => state.globalOpts;

export const selectDocGlobalOpts = (state: RootState) => {
  const { isDarkMode, readonly, anchor } = state.globalOpts;
  return { isDarkMode, readonly, anchor };
};

export const selectMenuCollapse = (state: RootState) =>
  state.globalOpts.menuCollapse;

export const selectDarkMode = (state: RootState) => state.globalOpts.isDarkMode;
export const selectReadonly = (state: RootState) => state.globalOpts.readonly;
export const selectAnchor = (state: RootState) => state.globalOpts.anchor;

export default globalOptsSlice.reducer;
