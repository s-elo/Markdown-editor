/* eslint-disable @typescript-eslint/no-magic-numbers */
import { WORKSPACE_ASSET_DIRECTORY } from '@markdown-editor/core';

import { GITHUB_MAX_REPOSITORY_FILE_SIZE_BYTES, GITHUB_SUPPORTED_IMAGE_EXTENSIONS } from '@/constants';
import { getGitHubBlobBase64, loadGitHubDirectory } from '@/redux-api/github';
import { getGitHubWorkspaceKey, type GitHubWorkspaceConfig } from '@/redux-feature/githubWorkspaceSlice';
import { githubWorkspaceStore } from '@/utils/githubWorkspaceRuntime';

interface CachedImageUrl {
  objectUrl: string;
  sourceKey: string;
  workspaceKey: string;
}

type WorkspaceImageSource =
  | { content: string; kind: 'local'; sourceKey: string }
  | { kind: 'remote'; sha: string; sourceKey: string };

const imageUrlCache = new Map<string, CachedImageUrl>();
let activeWorkspaceKey = '';

const cleanPath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export const getGitHubAssetsPath = (config: GitHubWorkspaceConfig) =>
  [cleanPath(config.docsRoot), WORKSPACE_ASSET_DIRECTORY].filter(Boolean).join('/');

/** Returns the repository-root-relative URL written into GitHub-mode Markdown. */
export const getGitHubImageUrl = (config: GitHubWorkspaceConfig, fileName: string) =>
  `/${[getGitHubAssetsPath(config), cleanPath(fileName)].filter(Boolean).join('/')}`;

const getGitHubImageRepositoryPath = (config: GitHubWorkspaceConfig, url: string) => {
  if (!url.startsWith('/')) return undefined;
  const normalizedUrl = cleanPath(url);
  const assetsPath = getGitHubAssetsPath(config);
  const legacyAssetsPath = `${WORKSPACE_ASSET_DIRECTORY}/`;
  const repositoryPath = normalizedUrl.startsWith(`${assetsPath}/`)
    ? normalizedUrl
    : normalizedUrl.startsWith(legacyAssetsPath)
    ? [cleanPath(config.docsRoot), normalizedUrl].filter(Boolean).join('/')
    : undefined;
  if (!repositoryPath) return undefined;

  const imagePath = repositoryPath.slice(assetsPath.length + 1);
  if (!imagePath || imagePath.includes('/')) throw new Error(`Unsupported image path: ${url}`);
  return repositoryPath;
};

export const isSupportedImagePath = (path: string) => {
  const extension = path.split('.').at(-1)?.toLocaleLowerCase() ?? '';
  return GITHUB_SUPPORTED_IMAGE_EXTENSIONS.has(extension);
};

const getImageMime = (path: string) => {
  const extension = path.split('.').at(-1)?.toLocaleLowerCase();
  switch (extension) {
    case 'avif':
      return 'image/avif';
    case 'bmp':
      return 'image/bmp';
    case 'gif':
      return 'image/gif';
    case 'ico':
      return 'image/x-icon';
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'svg':
      return 'image/svg+xml';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
};

const base64ToBlob = (content: string, mime: string) => {
  const binary = window.atob(content.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
};

const fileToBase64 = async (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read image.'));
    };
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to encode image.'));
        return;
      }
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });

const hasBytes = (bytes: Uint8Array, expected: number[]) => expected.every((value, index) => bytes[index] === value);

const inferExtensionFromBytes = (bytes: Uint8Array) => {
  if (bytes.length >= 8 && hasBytes(bytes, [137, 80, 78, 71, 13, 10, 26, 10])) return 'png';
  if (bytes.length >= 3 && hasBytes(bytes, [0xff, 0xd8, 0xff])) return 'jpg';
  const header = new TextDecoder().decode(bytes.subarray(0, 12));
  if (header.startsWith('GIF87a') || header.startsWith('GIF89a')) return 'gif';
  if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') return 'webp';
  if (header.startsWith('<svg') || header.startsWith('<?xml')) return 'svg';
  return 'png';
};

const inferExtension = (file: File, bytes: Uint8Array) => {
  const extension = file.name.split('.').at(-1)?.toLocaleLowerCase();
  if (extension && GITHUB_SUPPORTED_IMAGE_EXTENSIONS.has(extension)) return extension === 'jpeg' ? 'jpg' : extension;
  return inferExtensionFromBytes(bytes);
};

const getContentHash = async (bytes: Uint8Array) => {
  const digest = new Uint8Array(await window.crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer));
  return [...digest.subarray(0, 8)].map((value) => value.toString(16).padStart(2, '0')).join('');
};

export const loadGitHubAssetsDirectory = async (config: GitHubWorkspaceConfig) => {
  const assetsPath = getGitHubAssetsPath(config);
  const request = githubWorkspaceStore.getDirectoryLoadRequest(assetsPath);
  if (!request) return;
  const page = await loadGitHubDirectory({ owner: config.owner, repo: config.repo, ...request });
  await githubWorkspaceStore.attachRemoteDirectory(page);
};

const getWorkspaceImageSource = async (config: GitHubWorkspaceConfig, repositoryPath: string) => {
  await loadGitHubAssetsDirectory(config);
  const source = githubWorkspaceStore.getFileSource(repositoryPath);
  if (!source) throw new Error(`Image not found: ${repositoryPath}`);
  if (source.kind === 'local') {
    if (source.contentEncoding !== 'base64') throw new Error(`Image content is not binary: ${repositoryPath}`);
    return {
      content: source.content,
      kind: 'local',
      sourceKey: `local:${source.sha ?? ''}:${source.content.length}`,
    } satisfies WorkspaceImageSource;
  }
  if (!source.sha) throw new Error(`Image blob is unavailable: ${repositoryPath}`);
  return { kind: 'remote', sha: source.sha, sourceKey: `remote:${source.sha}` } satisfies WorkspaceImageSource;
};

export const clearGitHubImageUrlCache = () => {
  imageUrlCache.forEach(({ objectUrl }) => {
    URL.revokeObjectURL(objectUrl);
  });
  imageUrlCache.clear();
  activeWorkspaceKey = '';
};

export const activateGitHubImageWorkspace = (config?: GitHubWorkspaceConfig) => {
  const workspaceKey = config ? getGitHubWorkspaceKey(config) : '';
  if (activeWorkspaceKey && activeWorkspaceKey !== workspaceKey) clearGitHubImageUrlCache();
  activeWorkspaceKey = workspaceKey;
};

export const removeGitHubImageUrl = (config: GitHubWorkspaceConfig, url: string) => {
  const repositoryPath = getGitHubImageRepositoryPath(config, url);
  if (!repositoryPath) return;
  const cached = imageUrlCache.get(repositoryPath);
  if (!cached) return;
  URL.revokeObjectURL(cached.objectUrl);
  imageUrlCache.delete(repositoryPath);
};

export const resolveGitHubImageUrl = async (config: GitHubWorkspaceConfig, url: string) => {
  const repositoryPath = getGitHubImageRepositoryPath(config, url);
  if (!repositoryPath) return url;
  const workspaceKey = getGitHubWorkspaceKey(config);
  activateGitHubImageWorkspace(config);

  const source = await getWorkspaceImageSource(config, repositoryPath);
  const cached = imageUrlCache.get(repositoryPath);
  if (cached?.workspaceKey === workspaceKey && cached.sourceKey === source.sourceKey) return cached.objectUrl;
  if (cached) URL.revokeObjectURL(cached.objectUrl);

  // A remote SHA fully identifies immutable GitHub blob content, so cached
  // previews can be reused without downloading the blob again.
  const content =
    source.kind === 'local' ? source.content : await getGitHubBlobBase64(config.owner, config.repo, source.sha);
  const objectUrl = URL.createObjectURL(base64ToBlob(content, getImageMime(repositoryPath)));
  imageUrlCache.set(repositoryPath, { objectUrl, sourceKey: source.sourceKey, workspaceKey });
  return objectUrl;
};

export const uploadGitHubImage = async (config: GitHubWorkspaceConfig, file: File) => {
  if (file.size > GITHUB_MAX_REPOSITORY_FILE_SIZE_BYTES) {
    throw new Error('GitHub does not accept regular repository files larger than 100 MiB.');
  }
  await loadGitHubAssetsDirectory(config);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = inferExtension(file, bytes);
  const hash = await getContentHash(bytes);
  const content = await fileToBase64(file);
  const assetsPath = getGitHubAssetsPath(config);

  for (let suffix = 0; ; suffix += 1) {
    const fileName = `${hash}${suffix ? `_${suffix}` : ''}.${extension}`;
    const repositoryPath = `${assetsPath}/${fileName}`;
    const existing = githubWorkspaceStore.getFileSource(repositoryPath);
    if (!existing) {
      await githubWorkspaceStore.createFile(repositoryPath, content, 'base64');
      return getGitHubImageUrl(config, fileName);
    }
    const existingContent =
      existing.kind === 'local'
        ? existing.contentEncoding === 'base64'
          ? existing.content
          : undefined
        : existing.sha
        ? await getGitHubBlobBase64(config.owner, config.repo, existing.sha)
        : undefined;
    if (existingContent === content) return getGitHubImageUrl(config, fileName);
  }
};
