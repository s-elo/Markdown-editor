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
      const { id, content } = action.payload;
      // cant do this...
      // state = action.payload;
      state.content = content;
      state.id = id;
    },
  },
});

export const { updateCurDoc } = curDocSlice.actions;

export const selectCurDoc = (state: RootState) => state.curDoc;

export default curDocSlice.reducer;
