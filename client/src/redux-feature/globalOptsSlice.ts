import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type GlobalOptsPayload = {
  keys: ("isDarkMode" | "readonly" | "menuCollapse" | "showOperationMenu")[];
  values: boolean[];
};

export type OperationMenuConfigPayload = {
  isShow: boolean;
  xPos: number;
  yPos: number;
};

const initialState = {
  isDarkMode: true,
  readonly: true,
  menuCollapse: false,
  operationMenuConfig: {
    isShow: false,
    xPos: 0,
    yPos: 0,
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
        if (key !== "showOperationMenu") {
          state[key] = values[idx];
        }
      }
    },
    updateOperationMenuConfig: (
      state,
      action: PayloadAction<OperationMenuConfigPayload>
    ) => {
      const { isShow, xPos, yPos } = action.payload;

      state.operationMenuConfig = { isShow, xPos, yPos };
    },
  },
});

export const { updateGlobalOpts, updateOperationMenuConfig } =
  globalOptsSlice.actions;

export const selectGlobalOpts = (state: RootState) => state.globalOpts;

export default globalOptsSlice.reducer;
