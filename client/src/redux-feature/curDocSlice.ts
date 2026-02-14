/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '@/store';
import { localStore } from '@/utils/utils';

export interface Heading {
  text: string;
  level: number;
  id: string;
}

export type DocType = 'draft' | 'internal' | 'workspace';

export interface Tab {
  active: boolean;
  scroll: number;
  type: DocType;
  /**
   * - workspace: the content path
   * - draft: the id
   * - internal: the id
   */
  ident: string;
  title?: string;
}

export interface CurDocState {
  /**
   * - workspace: the content path
   * - draft: the id
   * - internal: the id
   */
  contentIdent: string;
  /** for draft and internal */
  title?: string;
  content: string;
  isDirty: boolean;
  scrollTop: number;
  headings: Heading[];
  tabs: Tab[];
  type: DocType;
}

export type CurDocUpdatePayLoad = Partial<CurDocState> & {
  type: DocType;
};

const getDefaultValue = () => {
  return {
    content: '',
    isDirty: false,
    scrollTop: 0,
    headings: [] as Heading[],
    tabs: [],
    type: 'workspace' as DocType,
    contentIdent: '',
  } as CurDocState;
};

const initialTabs = JSON.parse(localStore('tabs').value ?? '[]') as Tab[];

export const curDocSlice = createSlice({
  name: 'curDoc',
  initialState: {
    ...getDefaultValue(),
    tabs: initialTabs,
  } as CurDocState,
  reducers: {
    updateCurDoc: (state, action: PayloadAction<CurDocUpdatePayLoad>) => {
      const {
        content = state.content,
        isDirty = state.isDirty,
        scrollTop = state.scrollTop,
        headings = state.headings,
        type = state.type,
        contentIdent = state.contentIdent,
        title = state.title,
      } = action.payload;

      // cant do this...
      // state = action.payload;
      state.type = type;
      state.contentIdent = contentIdent;
      state.title = title;
      state.content = content;
      state.isDirty = isDirty;
      state.headings = headings;
      state.scrollTop = scrollTop;

      // update active tab
      // clear all first
      state.tabs.forEach((tab) => (tab.active = false));

      const curTab = state.tabs.find((tab) => tab.ident === contentIdent) as Tab | undefined;
      if (curTab) {
        curTab.active = true;
      } else {
        state.tabs.push({ active: true, scroll: scrollTop, type, ident: contentIdent, title });
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
      state.tabs.forEach((tab) => tab.ident === state.contentIdent && (tab.scroll = scrollTop));
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
/**
 * get the identifier of the current document
 * for workspace, it is the content path
 * for draft and internal, it is the id
 */
export const selectCurDocIdent = (state: RootState) => state.curDoc.contentIdent;
export const selectCurScrollTop = (state: RootState) => state.curDoc.scrollTop;
export const selectCurDocDirty = (state: RootState) => state.curDoc.isDirty;
export const selectCurTabs = (state: RootState) => state.curDoc.tabs;
export const selectCurActiveTab = (state: RootState) => state.curDoc.tabs.find((tab) => tab.active);
export const selectCurDocType = (state: RootState) => state.curDoc.type;

export default curDocSlice.reducer;
