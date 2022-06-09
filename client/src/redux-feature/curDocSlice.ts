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
      const { content, isDirty, contentPath, scrollTop } = action.payload;
      // cant do this...
      // state = action.payload;
      state.content = content;
      state.isDirty = isDirty;
      state.contentPath = contentPath;
      if (scrollTop !== undefined) state.scrollTop = scrollTop;
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
export const selectCurContent = (state: RootState) => state.curDoc.content;
export const selectCurPath = (state: RootState) => state.curDoc.contentPath;
export const selectCurScrollTop = (state: RootState) => state.curDoc.scrollTop;

export default curDocSlice.reducer;
