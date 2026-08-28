import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import Toast from '@/utils/Toast';

const GITHUB_OAUTH_WORKER_URL = 'https://markdown-editor-github-auth.s-elo.workers.dev/';
export const GITHUB_ACCESS_TOKEN_STORAGE_KEY = 'github-access-token';
const GITHUB_OAUTH_STATE_STORAGE_KEY = 'github-oauth-state';
const OAUTH_QUERY_PARAMS = ['code', 'state', 'error', 'error_description'];

type GitHubAuthFlow = 'install' | 'login';

interface GitHubTokenResponse {
  token?: string;
  error?: string;
}

interface GitHubUserResponse {
  login?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  avatar_url?: string;
}

interface GitHubUser {
  login: string;
  avatarUrl: string | null;
}

let githubAccessToken = window.localStorage.getItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY);
const githubAccessTokenListeners = new Set<() => void>();

const notifyGitHubAccessTokenListeners = () => {
  githubAccessTokenListeners.forEach((listener) => {
    listener();
  });
};

const setGitHubAccessToken = (token: string | null) => {
  if (token === githubAccessToken) return;
  githubAccessToken = token;
  if (token) {
    window.localStorage.setItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY);
  }
  notifyGitHubAccessTokenListeners();
};

const subscribeToGitHubAccessToken = (listener: () => void) => {
  githubAccessTokenListeners.add(listener);
  return () => {
    githubAccessTokenListeners.delete(listener);
  };
};

window.addEventListener('storage', (event) => {
  if (event.key !== GITHUB_ACCESS_TOKEN_STORAGE_KEY || event.newValue === githubAccessToken) return;
  githubAccessToken = event.newValue;
  notifyGitHubAccessTokenListeners();
});

export const getGitHubAccessToken = () => githubAccessToken;

export const useGitHubAccessToken = () =>
  useSyncExternalStore(subscribeToGitHubAccessToken, getGitHubAccessToken, getGitHubAccessToken);

const getUrlWithoutOAuthParams = () => {
  const url = new URL(window.location.href);
  OAUTH_QUERY_PARAMS.forEach((param) => {
    url.searchParams.delete(param);
  });
  return url;
};

const removeOAuthParamsFromUrl = () => {
  const url = getUrlWithoutOAuthParams();
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

const startGitHubAuth = (flow: GitHubAuthFlow) => {
  const oauthState = window.crypto.randomUUID();
  const workerUrl = new URL(GITHUB_OAUTH_WORKER_URL);
  workerUrl.searchParams.set('return_to', getUrlWithoutOAuthParams().toString());
  workerUrl.searchParams.set('client_state', oauthState);
  if (flow === 'login') {
    workerUrl.searchParams.set('flow', 'login');
  }
  window.sessionStorage.setItem(GITHUB_OAUTH_STATE_STORAGE_KEY, oauthState);
  window.location.assign(workerUrl.toString());
};

export const startGitHubLogin = () => {
  startGitHubAuth('login');
};

export const startGitHubInstall = () => {
  startGitHubAuth('install');
};

const getGitHubUser = async (token: string): Promise<GitHubUser | null> => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const user = (await response.json()) as GitHubUserResponse;
  return user.login
    ? {
        login: user.login,
        avatarUrl: user.avatar_url ?? null,
      }
    : null;
};

/** Manages the GitHub OAuth callback and persisted access token. */
export const useGitHubLogin = () => {
  const oauthInProgressRef = useRef(false);
  const accessToken = useGitHubAccessToken();
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [githubAvatarUrl, setGithubAvatarUrl] = useState<string | null>(null);
  const [isGitHubLoginLoading, setIsGitHubLoginLoading] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const oauthError = url.searchParams.get('error');
    const oauthState = url.searchParams.get('state');

    const completeOAuthLogin = async (authorizationCode: string) => {
      oauthInProgressRef.current = true;
      setIsGitHubLoginLoading(true);
      removeOAuthParamsFromUrl();

      try {
        const response = await fetch(GITHUB_OAUTH_WORKER_URL, {
          method: 'POST',
          mode: 'cors',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: authorizationCode }),
        });
        const result = (await response.json()) as GitHubTokenResponse;

        if (!response.ok || !result.token) {
          throw new Error(result.error ?? 'GitHub authentication failed.');
        }

        const user = await getGitHubUser(result.token);
        if (!user) {
          throw new Error('GitHub returned a token that could not access the authenticated user.');
        }

        setGitHubAccessToken(result.token);
        setGithubLogin(user.login);
        setGithubAvatarUrl(user.avatarUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'GitHub authentication failed.';
        Toast.error(message);
      } finally {
        oauthInProgressRef.current = false;
        setIsGitHubLoginLoading(false);
      }
    };

    if (code && !oauthInProgressRef.current) {
      const expectedOAuthState = window.sessionStorage.getItem(GITHUB_OAUTH_STATE_STORAGE_KEY);
      window.sessionStorage.removeItem(GITHUB_OAUTH_STATE_STORAGE_KEY);

      if (!oauthState || oauthState !== expectedOAuthState) {
        removeOAuthParamsFromUrl();
        setIsGitHubLoginLoading(false);
        Toast.error('GitHub authentication failed because the OAuth state was invalid.');
      } else {
        void completeOAuthLogin(code);
      }
    } else if (oauthError) {
      window.sessionStorage.removeItem(GITHUB_OAUTH_STATE_STORAGE_KEY);
      removeOAuthParamsFromUrl();
      setIsGitHubLoginLoading(false);
      Toast.warn(`GitHub authentication was cancelled: ${oauthError}`);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setGithubLogin(null);
      setGithubAvatarUrl(null);
      if (!oauthInProgressRef.current) setIsGitHubLoginLoading(false);
      return;
    }

    let cancelled = false;
    setIsGitHubLoginLoading(true);
    void getGitHubUser(accessToken)
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          // GitHub returns a non-success response for expired or revoked tokens.
          setGitHubAccessToken(null);
          return;
        }
        setGithubLogin(user.login);
        setGithubAvatarUrl(user.avatarUrl);
      })
      .catch(() => {
        // Keep the token while offline; validate it again on the next app load.
      })
      .finally(() => {
        if (!cancelled) setIsGitHubLoginLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return {
    githubLogin,
    githubAvatarUrl,
    isGitHubLoginLoading,
    logoutGitHub: () => {
      setGitHubAccessToken(null);
      window.sessionStorage.removeItem(GITHUB_OAUTH_STATE_STORAGE_KEY);
      setGithubLogin(null);
      setGithubAvatarUrl(null);
      setIsGitHubLoginLoading(false);
      oauthInProgressRef.current = false;
    },
    startGitHubLogin,
    startGitHubInstall,
  };
};
