/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '@/store';
import { localStore, changeTheme, Themes } from '@/utils/utils';

export interface GlobalOptsPayload {
  keys: (keyof GlobalOptsType)[];
  values: (boolean | string)[];
}

export interface GlobalOptsType {
  isDarkMode: boolean;
  readonly: boolean;
  menuCollapse: boolean;
  mirrorCollapse: boolean;
  outlineCollapse: boolean;
  isEditorBlur: boolean;
  anchor: string;
  narrowMode: boolean;
}

const initialTheme = localStore('theme').value as Themes;
changeTheme(initialTheme ? initialTheme : 'light');

const initialNarrowMode = localStore('narrowMode').value;

const initialState: GlobalOptsType = {
  isDarkMode: initialTheme === 'dark' ? true : false,
  readonly: true,
  menuCollapse: false,
  mirrorCollapse: true,
  outlineCollapse: false,
  isEditorBlur: true,
  anchor: '',
  narrowMode: initialNarrowMode === 'true' ? true : false,
};

export const globalOptsSlice = createSlice({
  name: 'globalOpts',
  initialState,
  reducers: {
    // only for boolean type update
    updateGlobalOpts: (state, action: PayloadAction<GlobalOptsPayload>) => {
      const { keys, values } = action.payload;

      for (const [idx, key] of keys.entries()) {
        if (key === 'anchor') {
          state[key] = values[idx] as string;
        } else {
          state[key] = values[idx] as boolean;
        }

        if (key === 'isDarkMode') {
          const { setStore: setTheme } = localStore('theme');
          changeTheme(!values[idx] ? 'light' : 'dark');
          setTheme(!values[idx] ? 'light' : 'dark');
        }

        if (key === 'narrowMode') {
          const { setStore: setNarrowMode } = localStore('narrowMode');
          setNarrowMode(values[idx] ? 'true' : 'false');
        }
      }
    },
  },
});

export const { updateGlobalOpts } = globalOptsSlice.actions;

export const selectGlobalOpts = (state: RootState) => state.globalOpts;

export const selectDocGlobalOpts = (state: RootState) => {
  const { isDarkMode, readonly, anchor, narrowMode } = state.globalOpts;
  return { isDarkMode, readonly, anchor, narrowMode };
};

export const selectMenuCollapse = (state: RootState) => state.globalOpts.menuCollapse;
export const selectOutlineCollapse = (state: RootState) => state.globalOpts.outlineCollapse;

export const selectDarkMode = (state: RootState) => state.globalOpts.isDarkMode;
export const selectReadonly = (state: RootState) => state.globalOpts.readonly;
export const selectAnchor = (state: RootState) => state.globalOpts.anchor;
export const selectNarrowMode = (state: RootState) => state.globalOpts.narrowMode;
export default globalOptsSlice.reducer;
