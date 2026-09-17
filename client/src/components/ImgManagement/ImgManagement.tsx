import { WORKSPACE_ASSET_SEGMENT } from '@markdown-editor/core';
import { Button } from 'primereact/button';
import { DataView } from 'primereact/dataview';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Image } from 'primereact/image';
import { Tag } from 'primereact/tag';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { getImageUrl } from '@/components/Editor/configs/uploadConfig';
import { Icon } from '@/components/Icon/Icon';
import {
  ImgListItem,
  ImgRefDoc,
  useDeleteWorkspaceImgMutation,
  useGetImgListQuery,
  useLazyGetImgRefDocsQuery,
} from '@/redux-api/img';
import { selectCurContent } from '@/redux-feature/curDocSlice';
import { getGitHubWorkspaceKey, selectGithubWorkspace } from '@/redux-feature/githubWorkspaceSlice';
import {
  getGitHubAssetsPath,
  getGitHubImageUrl,
  isSupportedImagePath,
  loadGitHubAssetsDirectory,
  removeGitHubImageUrl,
} from '@/utils/githubImages';
import { githubWorkspaceStore, useGitHubWorkspaceSnapshot } from '@/utils/githubWorkspaceRuntime';
import Toast from '@/utils/Toast';
import { confirm, normalizePath } from '@/utils/utils';

import './ImgManagement.scss';

type FilterMode = 'all' | 'unused' | 'used';

const filterOptions = [
  { label: 'All Images', value: 'all' },
  { label: 'Used in Current Doc', value: 'used' },
  { label: 'Not Used in Current Doc', value: 'unused' },
];

function extractImageUrls(markdown: string): Set<string> {
  const urls = new Set<string>();
  const regex = /!\[.*?\]\((.*?)\)/g;
  let match = regex.exec(markdown);
  while (match !== null) {
    urls.add(match[1]);
    match = regex.exec(markdown);
  }
  return urls;
}

const MS_PER_SECOND = 1000;

function formatDate(timestamp?: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp * MS_PER_SECOND).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Resolves previews through the same mode-aware path used by the editor.
 * In GitHub mode, remote SHAs use an authenticated blob request while new
 * working-tree images render directly from their staged base64 content.
 */
const WorkspaceImage: FC<{ image: ImgListItem }> = ({ image }) => {
  const [src, setSrc] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setSrc(undefined);
    setError(false);
    void Promise.resolve(getImageUrl(image.url)).then(
      (resolvedUrl) => {
        if (active) setSrc(resolvedUrl);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [image.url]);

  if (error) return <div className="img-preview-state">Preview unavailable</div>;
  if (!src) return <div className="img-preview-state">Loading...</div>;
  return <Image src={src} alt={image.fileName} width="250" imageClassName="img-thumbnail" preview />;
};

export const ImgManagement: FC = () => {
  const [showImgManagementModal, setShowImgManagementModal] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('used');
  const [githubListLoading, setGithubListLoading] = useState(false);
  const [githubListError, setGithubListError] = useState<string>();
  const workspace = useSelector(selectGithubWorkspace);
  const githubSnapshot = useGitHubWorkspaceSnapshot();
  const isGitHubMode = workspace.mode === 'github';

  // Local mode continues to use the image server. GitHub mode deliberately
  // skips this API because its image inventory comes from the workspace tree.
  const { data: localImages = [], refetch: refetchImgList } = useGetImgListQuery(undefined, {
    skip: !showImgManagementModal || isGitHubMode,
  });
  const [deleteImg] = useDeleteWorkspaceImgMutation();
  const [fetchRefDocs] = useLazyGetImgRefDocsQuery();
  const [refDocsFor, setRefDocsFor] = useState<string | null>(null);
  const [refDocs, setRefDocs] = useState<ImgRefDoc[]>([]);
  const [refDocsLoading, setRefDocsLoading] = useState(false);
  const curContent = useSelector(selectCurContent);
  const navigate = useNavigate();
  const usedUrls = useMemo(() => extractImageUrls(curContent || ''), [curContent]);
  const githubAssetsPath = getGitHubAssetsPath(workspace.config);
  // listDirectory reads the effective working tree, so this list immediately
  // includes unstaged/staged uploads and excludes pending deletions. DataView
  // paginates this in-memory list below; no GitHub request is made per page.
  const githubImages = useMemo<ImgListItem[]>(
    () =>
      githubWorkspaceStore
        .listDirectory(githubAssetsPath)
        .filter((entry) => entry.kind === 'file' && isSupportedImagePath(entry.path))
        .map((entry) => {
          const fileName = entry.path.split('/').at(-1) ?? entry.path;
          return { fileName, url: getGitHubImageUrl(workspace.config, fileName) };
        })
        .sort((left, right) => left.fileName.localeCompare(right.fileName)),
    [githubAssetsPath, githubSnapshot.entries],
  );
  const images = isGitHubMode ? githubImages : localImages;
  const githubWorkspaceKey = getGitHubWorkspaceKey(workspace.config);

  const handleDelete = useCallback(
    async (fileName: string) => {
      const confirmed = await confirm({
        message: `Are you sure you want to delete "${fileName}"?`,
      });
      if (!confirmed) return;
      try {
        if (isGitHubMode) {
          await githubWorkspaceStore.delete(`${githubAssetsPath}/${fileName}`);
          removeGitHubImageUrl(workspace.config, getGitHubImageUrl(workspace.config, fileName));
        } else {
          await deleteImg(fileName).unwrap();
        }
      } catch (error) {
        Toast.error((error as Error).message ?? 'Failed to delete image.');
      }
    },
    [deleteImg, githubAssetsPath, isGitHubMode, workspace.config],
  );

  const handleFindRefs = useCallback(
    async (fileName: string) => {
      if (refDocsFor === fileName) {
        setRefDocsFor(null);
        return;
      }
      setRefDocsFor(fileName);
      setRefDocsLoading(true);
      try {
        const docs = await fetchRefDocs(fileName).unwrap();
        setRefDocs(docs);
      } catch {
        setRefDocs([]);
      } finally {
        setRefDocsLoading(false);
      }
    },
    [fetchRefDocs, refDocsFor],
  );

  const filteredImages = useMemo(() => {
    if (filterMode === 'all') return images;
    return images.filter((img) => {
      const isUsed =
        usedUrls.has(img.url) || (isGitHubMode && usedUrls.has(`${WORKSPACE_ASSET_SEGMENT}${img.fileName}`));
      return filterMode === 'used' ? isUsed : !isUsed;
    });
  }, [filterMode, images, isGitHubMode, usedUrls]);

  useEffect(() => {
    if (!showImgManagementModal) return;
    if (!isGitHubMode) {
      void refetchImgList();
      return;
    }
    let active = true;
    setGithubListLoading(true);
    setGithubListError(undefined);
    // Large repositories may initialize with only the docs root's direct
    // children. Fetch the _assets Git tree once on demand, then merge it into
    // the workspace without overwriting staged or unstaged changes.
    void loadGitHubAssetsDirectory(workspace.config).then(
      () => {
        if (active) setGithubListLoading(false);
      },
      (error: unknown) => {
        if (!active) return;
        setGithubListLoading(false);
        setGithubListError((error as Error).message ?? 'Failed to load images.');
      },
    );
    return () => {
      active = false;
    };
  }, [
    isGitHubMode,
    githubSnapshot.baseCommitSha,
    githubSnapshot.persistenceLoaded,
    refetchImgList,
    showImgManagementModal,
    usedUrls,
    workspace.config.branch,
    workspace.config.docsRoot,
    workspace.config.owner,
    workspace.config.repo,
  ]);

  useEffect(() => {
    if (isGitHubMode) setRefDocsFor(null);
  }, [isGitHubMode]);

  const itemTemplate = (img: ImgListItem, index: number) => {
    const isUsed = usedUrls.has(img.url) || (isGitHubMode && usedUrls.has(`${WORKSPACE_ASSET_SEGMENT}${img.fileName}`));
    const itemKey = isGitHubMode ? `${githubWorkspaceKey}:${img.url}` : img.url;
    return (
      <div className="col-12" key={itemKey}>
        <div className={`img-list-item${index !== 0 ? ' border-top' : ''}`}>
          <WorkspaceImage image={img} />
          <div className="img-details">
            <div className="img-name">{img.fileName}</div>
            <div className="img-meta">
              {!isGitHubMode && <span className="img-date">{formatDate(img.createdTime)}</span>}
              <Tag value={isUsed ? 'Used' : 'Unused'} severity={isUsed ? 'success' : 'warning'} />
            </div>
          </div>
          <div className="img-actions">
            {!isGitHubMode && (
              <Button
                icon="pi pi-link"
                text
                rounded
                severity={refDocsFor === img.fileName ? 'info' : undefined}
                tooltip="Find references"
                tooltipOptions={{ position: 'top' }}
                onClick={() => {
                  void handleFindRefs(img.fileName);
                }}
              />
            )}
            <Button
              icon="pi pi-copy"
              text
              rounded
              tooltip="Copy image URL"
              tooltipOptions={{ position: 'top' }}
              onClick={() => {
                void navigator.clipboard.writeText(img.url).then(() => {
                  Toast.success('Copied.');
                });
              }}
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              tooltip="Delete image"
              tooltipOptions={{ position: 'top' }}
              onClick={() => {
                void handleDelete(img.fileName);
              }}
            />
          </div>
        </div>
        {!isGitHubMode && refDocsFor === img.fileName && (
          <div className="img-ref-docs">
            {refDocsLoading ? (
              <span className="ref-docs-loading">Loading...</span>
            ) : refDocs.length === 0 ? (
              <span className="ref-docs-empty">No documents reference this image.</span>
            ) : (
              <ul className="ref-docs-list">
                {refDocs.map((doc) => {
                  const docPath = doc.path.join('/');
                  return (
                    <li key={docPath}>
                      <Button
                        className="ref-doc-path"
                        size="small"
                        link
                        rounded
                        content="docPath"
                        severity="info"
                        tooltipOptions={{ position: 'top' }}
                        onClick={() => {
                          void navigate(`/article/${normalizePath(doc.path)}`);
                        }}
                      >
                        {docPath}
                      </Button>
                      <Tag value={`${doc.count}`} rounded style={{ padding: '1px 5px' }} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  const listTemplate = (items: ImgListItem[]) => {
    if (!items || items.length === 0) {
      const message = githubListLoading ? 'Loading...' : githubListError ?? 'Empty';
      return <div className="empty">{message}</div>;
    }
    return <div className="grid grid-nogutter">{items.map((img, i) => itemTemplate(img, i))}</div>;
  };

  const header = (
    <div className="img-list-header">
      <span className="img-count">{filteredImages.length} image(s)</span>
      <Dropdown
        value={filterMode}
        options={filterOptions}
        onChange={(e) => {
          setFilterMode(e.value as FilterMode);
        }}
        className="img-filter-dropdown"
      />
    </div>
  );

  return (
    <div className="img-management-container">
      <Icon
        iconName="images"
        id="img-management-icon"
        toolTipContent="Images"
        onClick={() => {
          if (isGitHubMode) setGithubListLoading(true);
          setShowImgManagementModal(true);
        }}
      />
      <Dialog
        modal={false}
        header={<div className="modal-title">Images</div>}
        visible={showImgManagementModal}
        onHide={() => {
          setShowImgManagementModal(false);
        }}
        className="img-management-dialog"
      >
        <div className="img-management-modal-content">
          <DataView
            value={filteredImages}
            listTemplate={listTemplate}
            header={header}
            paginator
            rows={7}
            emptyMessage="No images found"
          />
        </div>
      </Dialog>
    </div>
  );
};
