import { useEffect, useRef, useState } from 'react';

const GITHUB_OAUTH_WORKER_URL = 'https://markdown-editor-github-auth.s-elo.workers.dev/';
const GITHUB_ACCESS_TOKEN_STORAGE_KEY = 'github-access-token';
const GITHUB_OAUTH_STATE_STORAGE_KEY = 'github-oauth-state';
const OAUTH_QUERY_PARAMS = ['code', 'state', 'error', 'error_description'];

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
  return user.login ? { login: user.login, avatarUrl: user.avatar_url ?? null } : null;
};

/** Manages the GitHub OAuth callback and persisted access token. */
export const useGitHubLogin = () => {
  const oauthInProgressRef = useRef(false);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [githubAvatarUrl, setGithubAvatarUrl] = useState<string | null>(null);
  const [isGitHubLoginLoading, setIsGitHubLoginLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const oauthError = url.searchParams.get('error');
    const oauthState = url.searchParams.get('state');

    const restoreStoredSession = async () => {
      const token = window.localStorage.getItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY);
      if (!token) {
        return;
      }

      try {
        const user = await getGitHubUser(token);
        if (user) {
          setGithubLogin(user.login);
          setGithubAvatarUrl(user.avatarUrl);
        } else {
          // GitHub returns a non-success response for expired or revoked tokens.
          window.localStorage.removeItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY);
        }
      } catch {
        // Keep the token while offline; validate it again on the next app load.
      }
    };

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
          throw new Error('GitHub returned an invalid access token.');
        }

        window.localStorage.setItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY, result.token);
        setGithubLogin(user.login);
        setGithubAvatarUrl(user.avatarUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'GitHub authentication failed.';
        window.alert(message);
      } finally {
        setIsGitHubLoginLoading(false);
      }
    };

    if (code && !oauthInProgressRef.current) {
      const expectedOAuthState = window.sessionStorage.getItem(GITHUB_OAUTH_STATE_STORAGE_KEY);
      window.sessionStorage.removeItem(GITHUB_OAUTH_STATE_STORAGE_KEY);

      if (!oauthState || oauthState !== expectedOAuthState) {
        removeOAuthParamsFromUrl();
        window.alert('GitHub authentication failed because the OAuth state was invalid.');
      } else {
        void completeOAuthLogin(code);
      }
    } else if (oauthError) {
      window.sessionStorage.removeItem(GITHUB_OAUTH_STATE_STORAGE_KEY);
      removeOAuthParamsFromUrl();
      window.alert(`GitHub authentication was cancelled: ${oauthError}`);
    } else {
      void restoreStoredSession();
    }
  }, []);

  return {
    githubLogin,
    githubAvatarUrl,
    isGitHubLoginLoading,
    logoutGitHub: () => {
      window.localStorage.removeItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY);
      window.sessionStorage.removeItem(GITHUB_OAUTH_STATE_STORAGE_KEY);
      setGithubLogin(null);
      setGithubAvatarUrl(null);
      setIsGitHubLoginLoading(false);
      oauthInProgressRef.current = false;
    },
    startGitHubLogin: () => {
      const oauthState = window.crypto.randomUUID();
      const workerUrl = new URL(GITHUB_OAUTH_WORKER_URL);
      workerUrl.searchParams.set('return_to', getUrlWithoutOAuthParams().toString());
      workerUrl.searchParams.set('client_state', oauthState);
      window.sessionStorage.setItem(GITHUB_OAUTH_STATE_STORAGE_KEY, oauthState);
      window.location.assign(workerUrl.toString());
    },
  };
};
