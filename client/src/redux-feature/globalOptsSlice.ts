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
    | "curTheme"
  )[];
  values: (boolean | CurThemeType | string)[];
};

export type CurThemeType = "light" | "dark" | "soft";
export type GlobalOptsType = {
  isDarkMode: boolean;
  readonly: boolean;
  menuCollapse: boolean;
  mirrorCollapse: boolean;
  isEditorBlur: boolean;
  anchor: string;
  curTheme: CurThemeType;
  themes: {
    [key in CurThemeType]: {
      backgroundColor: string;
      boxColor: string;
      headerTextColor: string;
      contentTextColor: string;
    };
  };
};

const initailTheme = localStore("theme").value;

const initialState: GlobalOptsType = {
  isDarkMode: initailTheme === "dark" ? true : false,
  readonly: true,
  menuCollapse: false,
  mirrorCollapse: true,
  isEditorBlur: true,
  anchor: "",
  curTheme: initailTheme === "dark" ? "dark" : "light",
  themes: {
    light: {
      backgroundColor: "#e6e6e6",
      boxColor: "#fff",
      headerTextColor: "#494E59",
      contentTextColor: "black",
    },
    // dark: {
    //   backgroundColor: "#252932",
    //   boxColor: "#2E3440",
    //   headerTextColor: "#D3D7DC",
    //   contentTextColor: "#9D9FA6",
    // },
    dark: {
      backgroundColor: "#95a5a6",
      boxColor: "#7f8c8d",
      headerTextColor: "black",
      contentTextColor: "#e6e6e6",
    },
    soft: {
      backgroundColor: "#252932",
      boxColor: "#252932",
      headerTextColor: "#fff",
      contentTextColor: "#e6e6e6",
    },
  },
};

export const globalOptsSlice = createSlice({
  name: "globalOpts",
  initialState,
  reducers: {
    // only for boolean type update
    updateGlobalOpts: (state, action: PayloadAction<GlobalOptsPayload>) => {
      const { keys, values } = action.payload;

      for (const [idx, key] of keys.entries()) {
        if (key === "curTheme") {
          state[key] = values[idx] as CurThemeType;
        } else if (key === "anchor") {
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
