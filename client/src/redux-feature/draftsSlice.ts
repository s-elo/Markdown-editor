import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { Heading } from './curDocSlice';
import type { RootState } from '@/store';

export interface DraftEntry {
  content: string;
  headings?: Heading[];
}

export interface SetDraftPayload {
  path: string;
  content: string;
  headings?: Heading[];
}

export type DraftsState = Record<string, DraftEntry>;

const initialState: DraftsState = {};

export const draftsSlice = createSlice({
  name: 'drafts',
  initialState,
  reducers: {
    setDraft: (state, action: PayloadAction<SetDraftPayload>) => {
      const { path, content, headings } = action.payload;
      state[path] = { content, headings };
    },
    clearDraft: (state, action: PayloadAction<string>) => {
      const path = action.payload;
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete state[path];
    },
    clearDrafts: (state, action: PayloadAction<string[]>) => {
      for (const path of action.payload) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete state[path];
      }
    },
    clearAllDrafts: () => initialState,
  },
});

export const { setDraft, clearDraft, clearDrafts, clearAllDrafts } = draftsSlice.actions;

export const selectDraft = (path: string) => (state: RootState) => (state.drafts as DraftsState)[path];
export const selectHasDraft = (path: string) => (state: RootState) => path in (state.drafts as DraftsState);

export default draftsSlice.reducer;
