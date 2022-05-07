import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CurDocUpdatePayLoad = {
  content: string;
  contentPath: string;
  isDirty: boolean;
  scrollTop?: number;
};

export const curDocSlice = createSlice({
  name: "curDoc",
  initialState: {
    content: "",
    contentPath: "",
    isDirty: false,
    scrollTop: 0,
  },
  reducers: {
    updateCurDoc: (state, action: PayloadAction<CurDocUpdatePayLoad>) => {
      const { content, isDirty, contentPath, scrollTop = 0 } = action.payload;
      // cant do this...
      // state = action.payload;
      state.content = content;
      state.isDirty = isDirty;
      state.contentPath = contentPath;
      state.scrollTop = scrollTop;
    },

    updateIsDirty: (state, action: PayloadAction<{ isDirty: boolean }>) => {
      state.isDirty = action.payload.isDirty;
    },

    updateScrolling: (state, action: PayloadAction<{ scrollTop: number }>) => {
      state.scrollTop = action.payload.scrollTop;
    },
  },
});

export const { updateCurDoc, updateIsDirty, updateScrolling } =
  curDocSlice.actions;

export const selectCurDoc = (state: RootState) => state.curDoc;

export default curDocSlice.reducer;
