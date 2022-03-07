import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type OperationMenuPayload = {
  isShow: boolean;
  xPos: number;
  yPos: number;
  path: string;
  isFile: boolean;
};

const initialState = {
  isShow: false,
  xPos: 0,
  yPos: 0,
  path: "",
  isFile: false,
};

export const operationMenuSlice = createSlice({
  name: "operationMenu",
  initialState,
  reducers: {
    updateOperationMenu: (
      state,
      action: PayloadAction<OperationMenuPayload>
    ) => {
      const { isShow, xPos, yPos, path, isFile } = action.payload;

      state.isShow = isShow;
      state.xPos = xPos;
      state.yPos = yPos;
      state.path = path;
      state.isFile = isFile;
    },
  },
});

export const { updateOperationMenu } = operationMenuSlice.actions;

export const selectOperationMenu = (state: RootState) => state.operationMenu;

export default operationMenuSlice.reducer;
