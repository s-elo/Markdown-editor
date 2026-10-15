import { GITHUB_WORKSPACE_CONFIG_STORAGE_KEY, SERVER_BASE_URL, WORKSPACE_MODE_STORAGE_KEY } from '@/constants';
import { emptyConfig, type GitHubWorkspaceConfig } from '@/redux-feature/githubWorkspaceSlice';
import { clearGitHubImageUrlCache, resolveGitHubImageUrl, uploadGitHubImage } from '@/utils/githubImages';

const getWorkspaceMode = () => window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY);

const getGitHubConfig = (): GitHubWorkspaceConfig => {
  try {
    return {
      ...emptyConfig,
      ...(JSON.parse(
        window.localStorage.getItem(GITHUB_WORKSPACE_CONFIG_STORAGE_KEY) ?? '{}',
      ) as Partial<GitHubWorkspaceConfig>),
    };
  } catch {
    return emptyConfig;
  }
};

export function getImageUrl(url: string): Promise<string> | string {
  if (getWorkspaceMode() === 'github') return resolveGitHubImageUrl(getGitHubConfig(), url);
  clearGitHubImageUrlCache();
  if (url.startsWith('/')) {
    return `${SERVER_BASE_URL}/imgs${url}`;
  }
  return url;
}

export async function uploadImage(file: File) {
  if (getWorkspaceMode() === 'github') return uploadGitHubImage(getGitHubConfig(), file);
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${SERVER_BASE_URL}/imgs/upload`, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  return json.data as string;
}
