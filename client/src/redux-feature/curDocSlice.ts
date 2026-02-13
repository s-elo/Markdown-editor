/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '@/store';
import { localStore } from '@/utils/utils';

export interface Tab {
  path: string;
  active: boolean;
  scroll: number;
}

export interface Heading {
  text: string;
  level: number;
  id: string;
}

export interface CurDocUpdatePayLoad {
  content?: string;
  contentPath?: string;
  isDirty?: boolean;
  scrollTop?: number;
  headings?: Heading[];
}

const initialTabs = JSON.parse(localStore('tabs').value ?? '[]') as Tab[];

const getDefaultValue = () => {
  return {
    content: '',
    contentPath: '',
    isDirty: false,
    scrollTop: 0,
    headings: [] as Heading[],
    tabs: [],
  };
};

export const curDocSlice = createSlice({
  name: 'curDoc',
  initialState: {
    ...getDefaultValue(),
    tabs: initialTabs,
  },
  reducers: {
    updateCurDoc: (state, action: PayloadAction<CurDocUpdatePayLoad>) => {
      const {
        content = state.content,
        isDirty = state.isDirty,
        contentPath = state.contentPath,
        scrollTop = state.scrollTop,
        headings = state.headings,
      } = action.payload;

      // cant do this...
      // state = action.payload;
      state.content = content;
      state.isDirty = isDirty;
      state.contentPath = contentPath;
      if (headings) {
        state.headings = headings;
      }

      if (scrollTop !== undefined) state.scrollTop = scrollTop;

      // update active tab
      // clear all first
      state.tabs.forEach((tab) => (tab.active = false));

      const curTab = state.tabs.find((tab) => tab.path === contentPath);
      if (curTab) {
        curTab.active = true;
      } else {
        state.tabs.push({ path: contentPath, active: true, scroll: 0 });
      }

      // update localStorage
      const { setStore: storeTabs } = localStore('tabs');
      storeTabs(JSON.stringify(state.tabs));
    },

    updateIsDirty: (state, action: PayloadAction<{ isDirty: boolean }>) => {
      state.isDirty = action.payload.isDirty;
    },

    updateScrolling: (state, action: PayloadAction<{ scrollTop: number }>) => {
      const { scrollTop } = action.payload;
      state.scrollTop = scrollTop;

      // update the scroll record at tabs
      state.tabs.forEach((tab) => tab.path === state.contentPath && (tab.scroll = scrollTop));
    },

    updateTabs: (state, action: PayloadAction<Tab[]>) => {
      state.tabs = action.payload;
      // update localStorage
      const { setStore: storeTabs } = localStore('tabs');
      storeTabs(JSON.stringify(state.tabs));

      if (state.tabs.length === 0) {
        Object.assign(state, getDefaultValue());
      }
    },

    updateHeadings: (state, action: PayloadAction<Heading[]>) => {
      state.headings = action.payload;
    },

    clearCurDoc: (state) => {
      Object.assign(state, getDefaultValue());
    },
  },
});

export const { updateCurDoc, updateIsDirty, updateScrolling, updateTabs, updateHeadings, clearCurDoc } =
  curDocSlice.actions;

export const selectCurDoc = (state: RootState) => state.curDoc;
export const selectCurHeadings = (state: RootState) => state.curDoc.headings;
export const selectCurContent = (state: RootState) => state.curDoc.content;
export const selectCurPath = (state: RootState) => state.curDoc.contentPath;
export const selectCurScrollTop = (state: RootState) => state.curDoc.scrollTop;
export const selectCurDocDirty = (state: RootState) => state.curDoc.isDirty;
export const selectCurTabs = (state: RootState) => state.curDoc.tabs;
export const selectCurActiveTab = (state: RootState) => state.curDoc.tabs.find((tab) => tab.active);

export default curDocSlice.reducer;
