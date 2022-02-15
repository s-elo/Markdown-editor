import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CurDocUpdatePayLoad = {
  content: string;
  id: string;
  contentPath: string;
  isDirty: boolean;
};

export const curDocSlice = createSlice({
  name: "curDoc",
  initialState: {
    id: "",
    content: "",
    contentPath: "",
    isDirty: false,
  },
  reducers: {
    updateCurDoc: (state, action: PayloadAction<CurDocUpdatePayLoad>) => {
      const { id, content, isDirty, contentPath } = action.payload;
      // cant do this...
      // state = action.payload;
      state.content = content;
      state.id = id;
      state.isDirty = isDirty;
      state.contentPath = contentPath;
    },

    updateIsDirty: (state, action: PayloadAction<{ isDirty: boolean }>) => {
      state.isDirty = action.payload.isDirty;
    },
  },
});

export const { updateCurDoc, updateIsDirty } = curDocSlice.actions;

export const selectCurDoc = (state: RootState) => state.curDoc;

export default curDocSlice.reducer;
