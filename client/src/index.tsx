import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import { store } from './store';
import './theme.scss';
import 'primeicons/primeicons.css';

const rootDom = document.getElementById('root');

// Base path for GitHub Pages (set via GITHUB_PAGES_BASE_PATH env var at build time)
// This should match the publicPath in rsbuild.config.ts
// eslint-disable-next-line @typescript-eslint/naming-convention
const basePath = __GITHUB_PAGES_BASE_PATH__ || '';

createRoot(rootDom!).render(
  <Provider store={store}>
    <BrowserRouter basename={basePath}>
      <App />
    </BrowserRouter>
  </Provider>,
);
