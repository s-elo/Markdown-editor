import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { localStore } from "@/utils/utils";

export type Tab = {
  path: string;
  active: boolean;
};

export type CurDocUpdatePayLoad = {
  content: string;
  contentPath: string;
  isDirty: boolean;
  scrollTop?: number;
};

const initialTabs = JSON.parse(localStore("tabs").value ?? "[]");

export const curDocSlice = createSlice({
  name: "curDoc",
  initialState: {
    content: "",
    contentPath: "",
    isDirty: false,
    scrollTop: 0,
    tabs: initialTabs as Tab[],
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

      // update acitve tab
      // clear all first
      state.tabs.forEach((tab) => (tab.active = false));

      const curTab = state.tabs.find((tab) => tab.path === contentPath);
      if (curTab) {
        curTab.active = true;
      } else {
        state.tabs.push({ path: contentPath, active: true });
      }

      // update localStorage
      const { setStore: storeTabs } = localStore("tabs");
      storeTabs(JSON.stringify(state.tabs));
    },

    updateIsDirty: (state, action: PayloadAction<{ isDirty: boolean }>) => {
      state.isDirty = action.payload.isDirty;
    },

    updateScrolling: (state, action: PayloadAction<{ scrollTop: number }>) => {
      state.scrollTop = action.payload.scrollTop;
    },

    updateTabs: (state, action: PayloadAction<Tab[]>) => {
      state.tabs = action.payload;
      // update localStorage
      const { setStore: storeTabs } = localStore("tabs");
      storeTabs(JSON.stringify(state.tabs));
    },
  },
});

export const { updateCurDoc, updateIsDirty, updateScrolling, updateTabs } =
  curDocSlice.actions;

export const selectCurDoc = (state: RootState) => state.curDoc;
export const selectCurContent = (state: RootState) => state.curDoc.content;
export const selectCurPath = (state: RootState) => state.curDoc.contentPath;
export const selectCurScrollTop = (state: RootState) => state.curDoc.scrollTop;
export const selectCurDocDirty = (state: RootState) => state.curDoc.isDirty;
export const selectCurTabs = (state: RootState) => state.curDoc.tabs;
export const selectCurActiveTab = (state: RootState) =>
  state.curDoc.tabs.find((tab) => tab.active);

export default curDocSlice.reducer;
