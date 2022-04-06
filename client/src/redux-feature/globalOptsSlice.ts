import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { localStore } from "@/utils/utils";

export type GlobalOptsPayload = {
  keys: ("isDarkMode" | "readonly" | "menuCollapse" | "curTheme")[];
  values: (boolean | CurThemeType)[];
};

export type CurThemeType = "light" | "dark" | "soft";
export type GlobalOptsType = {
  isDarkMode: boolean;
  readonly: boolean;
  menuCollapse: boolean;
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
  curTheme: initailTheme === "dark" ? "dark" : "light",
  themes: {
    light: {
      backgroundColor: "#fff",
      boxColor: "#e6e6e6",
      headerTextColor: "black",
      contentTextColor: "black",
    },
    dark: {
      backgroundColor: "#95a5a6",
      boxColor: "#7f8c8d",
      headerTextColor: "black",
      contentTextColor: 'black',
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
        } else {
          state[key] = values[idx] as boolean;
        }
      }
    },
  },
});

export const { updateGlobalOpts } = globalOptsSlice.actions;

export const selectGlobalOpts = (state: RootState) => state.globalOpts;

export default globalOptsSlice.reducer;
