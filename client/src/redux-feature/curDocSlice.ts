import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CurDocUpdatePayLoad = {
  content: string;
  id: string;
};

export const curDocSlice = createSlice({
  name: "curDoc",
  initialState: {
    id: "",
    content: "",
  },
  reducers: {
    updateCurDoc: (state, action: PayloadAction<CurDocUpdatePayLoad>) => {
      state = action.payload;
    },
  },
});

export const { updateCurDoc } = curDocSlice.actions;

export const selectCurDoc = (state: RootState) => state.curDoc;

export default curDocSlice.reducer;
