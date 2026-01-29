/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '@/store';
import { localStore, changeTheme, Themes } from '@/utils/utils';

export interface GlobalOptsPayload {
  keys: (keyof GlobalOptsType)[];
  values: (boolean | string)[];
}

export enum ServerStatus {
  RUNNING = 'RUNNING',
  VERSION_MISMATCHE = 'VERSION_MISMATCHE',
  CANNOT_CONNECT = 'CANNOT_CONNECT',
}

export interface GlobalOptsType {
  theme: Themes;
  readonly: boolean;
  menuCollapse: boolean;
  mirrorCollapse: boolean;
  outlineCollapse: boolean;
  isEditorBlur: boolean;
  anchor: string;
  narrowMode: boolean;
  appVersion: string;
  serverStatus: ServerStatus;
}

const initialTheme = localStore('theme').value as Themes;
changeTheme(initialTheme ? initialTheme : 'light');

const initialNarrowMode = localStore('narrowMode').value;

const initialState: GlobalOptsType = {
  theme: initialTheme ?? 'light',
  readonly: true,
  menuCollapse: false,
  mirrorCollapse: true,
  outlineCollapse: false,
  isEditorBlur: true,
  anchor: '',
  narrowMode: initialNarrowMode === 'true' ? true : false,
  appVersion: __VERSION__,
  serverStatus: ServerStatus.RUNNING,
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
          state[key] = values[idx] as never;
        }

        if (key === 'theme') {
          const { setStore: setTheme } = localStore('theme');
          changeTheme(values[idx] as Themes);
          setTheme(values[idx] as Themes);
        }

        if (key === 'narrowMode') {
          const { setStore: setNarrowMode } = localStore('narrowMode');
          setNarrowMode(values[idx] ? 'true' : 'false');
        }
      }
    },

    updateServerStatus: (state, action: PayloadAction<ServerStatus>) => {
      state.serverStatus = action.payload;
    },
  },
});

export const { updateGlobalOpts, updateServerStatus } = globalOptsSlice.actions;

export const selectGlobalOpts = (state: RootState) => state.globalOpts;

export const selectMenuCollapse = (state: RootState) => state.globalOpts.menuCollapse;
export const selectMirrorCollapse = (state: RootState) => state.globalOpts.mirrorCollapse;
export const selectOutlineCollapse = (state: RootState) => state.globalOpts.outlineCollapse;

export const selectTheme = (state: RootState) => state.globalOpts.theme;
export const selectReadonly = (state: RootState) => state.globalOpts.readonly;
export const selectAnchor = (state: RootState) => state.globalOpts.anchor;
export const selectNarrowMode = (state: RootState) => state.globalOpts.narrowMode;
export const selectAppVersion = (state: RootState) => state.globalOpts.appVersion;
export const selectServerStatus = (state: RootState) => state.globalOpts.serverStatus;

export default globalOptsSlice.reducer;
