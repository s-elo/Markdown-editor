import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type OperationMenuPayload = {
  isShow: boolean;
  xPos: number;
  yPos: number;
};

const initialState = {
  isShow: false,
  xPos: 0,
  yPos: 0,
};

export const operationMenuSlice = createSlice({
  name: "operationMenu",
  initialState,
  reducers: {
    updateOperationMenu: (
      state,
      action: PayloadAction<OperationMenuPayload>
    ) => {
      const { isShow, xPos, yPos } = action.payload;

      state.isShow = isShow;
      state.xPos = xPos;
      state.yPos = yPos;
    },
  },
});

export const { updateOperationMenu } = operationMenuSlice.actions;

export const selectOperationMenu = (state: RootState) => state.operationMenu;

export default operationMenuSlice.reducer;
