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
  copyCutOnFile: boolean;
};

const initialState = {
  isShow: false,
  xPos: 0,
  yPos: 0,
  path: [""],
  clickOnFile: false,
  copyPath: "",
  cutPath: "",
  copyCutOnFile: false,
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
      const { copyPath, cutPath, copyCutOnFile } = action.payload;

      state.copyPath = copyPath;
      state.cutPath = cutPath;
      state.copyCutOnFile = copyCutOnFile;
    },
  },
});

export const { updateOperationMenu, updateCopyCut } =
  operationMenuSlice.actions;

export const selectOperationMenu = (state: RootState) => state.operationMenu;

export default operationMenuSlice.reducer;
