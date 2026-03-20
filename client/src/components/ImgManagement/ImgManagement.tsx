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

function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp * MS_PER_SECOND).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ImgManagement: FC = () => {
  const [showImgManagementModal, setShowImgManagementModal] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('used');

  const { data: images = [], refetch: refetchImgList } = useGetImgListQuery(undefined, {
    skip: !showImgManagementModal,
  });
  const [deleteImg] = useDeleteWorkspaceImgMutation();
  const [fetchRefDocs] = useLazyGetImgRefDocsQuery();
  const [refDocsFor, setRefDocsFor] = useState<string | null>(null);
  const [refDocs, setRefDocs] = useState<ImgRefDoc[]>([]);
  const [refDocsLoading, setRefDocsLoading] = useState(false);
  const curContent = useSelector(selectCurContent);
  const navigate = useNavigate();
  const usedUrls = useMemo(() => extractImageUrls(curContent || ''), [curContent]);

  const handleDelete = useCallback(
    async (fileName: string) => {
      const confirmed = await confirm({
        message: `Are you sure you want to delete "${fileName}"?`,
      });
      if (!confirmed) return;
      await deleteImg(fileName);
    },
    [deleteImg],
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
      const isUsed = usedUrls.has(img.url);
      return filterMode === 'used' ? isUsed : !isUsed;
    });
  }, [images, filterMode, usedUrls]);

  useEffect(() => {
    if (!showImgManagementModal) return;
    refetchImgList();
  }, [refetchImgList, usedUrls]);

  const itemTemplate = (img: ImgListItem, index: number) => {
    const isUsed = usedUrls.has(img.url);
    return (
      <div className="col-12" key={img.url}>
        <div className={`img-list-item${index !== 0 ? ' border-top' : ''}`}>
          <Image src={getImageUrl(img.url)} alt={img.fileName} width="250" preview />
          <div className="img-details">
            <div className="img-name">{img.fileName}</div>
            <div className="img-meta">
              <span className="img-date">{formatDate(img.createdTime)}</span>
              <Tag value={isUsed ? 'Used' : 'Unused'} severity={isUsed ? 'success' : 'warning'} />
            </div>
          </div>
          <div className="img-actions">
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
        {refDocsFor === img.fileName && (
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
    if (!items || items.length === 0) return <div className="empty">Empty</div>;
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
