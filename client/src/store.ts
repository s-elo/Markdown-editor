import { configureStore } from '@reduxjs/toolkit';

import { docsApi } from './redux-api/docs';
import curDocReducer from './redux-feature/curDocSlice';
import draftsReducer from './redux-feature/draftsSlice';
import globalOptsReducer from './redux-feature/globalOptsSlice';
import operationMenuReducer from './redux-feature/operationMenuSlice';

export const store = configureStore({
  reducer: {
    globalOpts: globalOptsReducer,
    curDoc: curDocReducer,
    drafts: draftsReducer,
    operationMenu: operationMenuReducer,
    [docsApi.reducerPath]: docsApi.reducer,
  },
  // This middleware must be added as well - it manages cache lifetimes and expiration
  // We need to keep all of the existing standard middleware like redux-thunk in the store setup,
  // which leads to the use of concat
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(docsApi.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
