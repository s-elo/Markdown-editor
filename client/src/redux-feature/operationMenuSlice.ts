import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type OperationMenuPayload = {
  isShow: boolean;
  xPos: number;
  yPos: number;
  path: string[];
  clickOnFile: boolean;
};

export type CopyCutPayload = {
  copyPath: string;
  cutPath: string;
};

const initialState = {
  isShow: false,
  xPos: 0,
  yPos: 0,
  path: [""],
  clickOnFile: false,
  copyPath: "",
  cutPath: "",
};

export const operationMenuSlice = createSlice({
  name: "operationMenu",
  initialState,
  reducers: {
    updateOperationMenu: (
      state,
      action: PayloadAction<OperationMenuPayload>
    ) => {
      const { isShow, xPos, yPos, path, clickOnFile } = action.payload;

      state.isShow = isShow;
      state.xPos = xPos;
      state.yPos = yPos;
      state.path = path;
      state.clickOnFile = clickOnFile;
    },
    updateCopyCut: (state, action: PayloadAction<CopyCutPayload>) => {
      const { copyPath, cutPath } = action.payload;

      state.copyPath = copyPath;
      state.cutPath = cutPath;
    },
  },
});

export const { updateOperationMenu, updateCopyCut } =
  operationMenuSlice.actions;

export const selectOperationMenu = (state: RootState) => state.operationMenu;

export default operationMenuSlice.reducer;
