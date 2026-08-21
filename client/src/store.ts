import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import { docsApi } from './redux-api/docs';
import { githubApi } from './redux-api/github';
import curDocReducer from './redux-feature/curDocSlice';
import draftsReducer from './redux-feature/draftsSlice';
import githubWorkspaceReducer, {
  applyPublishedWorkspace,
  applyWorkingEntries,
  discardAllChanges,
  discardOperations,
  getGitHubWorkspaceKey,
  markRemoteStale,
  rebaseRemoteWorkspace,
  stageAllOperations,
  stageOperations,
  syncRemoteWorkspace,
  unstageOperations,
} from './redux-feature/githubWorkspaceSlice';
import globalOptsReducer from './redux-feature/globalOptsSlice';
import operationMenuReducer from './redux-feature/operationMenuSlice';
import { writeGitHubWorkspace } from './utils/githubWorkspaceDb';

const githubWorkspaceListener = createListenerMiddleware();

export const store = configureStore({
  reducer: {
    globalOpts: globalOptsReducer,
    curDoc: curDocReducer,
    drafts: draftsReducer,
    githubWorkspace: githubWorkspaceReducer,
    operationMenu: operationMenuReducer,
    [docsApi.reducerPath]: docsApi.reducer,
    [githubApi.reducerPath]: githubApi.reducer,
  },
  // This middleware must be added as well - it manages cache lifetimes and expiration
  // We need to keep all of the existing standard middleware like redux-thunk in the store setup,
  // which leads to the use of concat
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(githubWorkspaceListener.middleware, docsApi.middleware, githubApi.middleware),
});

githubWorkspaceListener.startListening({
  matcher: isAnyOf(
    applyPublishedWorkspace,
    applyWorkingEntries,
    discardAllChanges,
    discardOperations,
    markRemoteStale,
    rebaseRemoteWorkspace,
    stageAllOperations,
    stageOperations,
    syncRemoteWorkspace,
    unstageOperations,
  ),
  effect: async (_, listenerApi) => {
    const workspace = (listenerApi.getState() as RootState).githubWorkspace;
    const key = getGitHubWorkspaceKey(workspace.config);
    if (!workspace.config.owner || !workspace.config.repo || !workspace.config.branch) return;
    await writeGitHubWorkspace(key, {
      config: workspace.config,
      baseEntries: workspace.baseEntries,
      working: workspace.working,
      staged: workspace.staged,
      remoteStale: workspace.remoteStale,
    });
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
