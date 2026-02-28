import { Dialog } from 'primereact/dialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { SelectButton } from 'primereact/selectbutton';
import { FC, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SearchResults } from './SearchResults';

import {
  FileContentMatches,
  FileNameMatch,
  useLazySearchContentQuery,
  useLazySearchFilesQuery,
} from '@/redux-api/searchApi';
import { useDebounce } from '@/utils/hooks/tools';
import { normalizePath } from '@/utils/utils';

import './DocSearch.scss';

const DEBOUNCE_MS = 350;

type SearchMode = 'content' | 'files';

const MODE_OPTIONS = [
  { label: 'Files', value: 'files' },
  { label: 'Content', value: 'content' },
];

export const DocSearch: FC = () => {
  const [visible, setVisible] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('files');
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [includeFiles, setIncludeFiles] = useState('');
  const [excludeFiles, setExcludeFiles] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [fileResults, setFileResults] = useState<FileNameMatch[]>([]);
  const [contentResults, setContentResults] = useState<FileContentMatches[]>([]);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  const [searchFiles] = useLazySearchFilesQuery();
  const [searchContent] = useLazySearchContentQuery();
  const navigate = useNavigate();

  const performSearch = useCallback(
    (q: string, mode: SearchMode, mc: boolean, inc: string, exc: string) => {
      const trimmed = q.trim();
      if (trimmed === '') {
        if (mode === 'files') setFileResults([]);
        else setContentResults([]);
        return;
      }
      if (mode === 'files') {
        searchFiles(trimmed)
          .unwrap()
          .then((data) => {
            setFileResults(data ?? []);
          })
          .catch(() => {
            setFileResults([]);
          });
      } else {
        searchContent({
          q: trimmed,
          caseSensitive: mc,
          includeFiles: inc.trim() || undefined,
          excludeFiles: exc.trim() || undefined,
        })
          .unwrap()
          .then((data) => {
            setContentResults(data ?? []);
          })
          .catch(() => {
            setContentResults([]);
          })
          .finally(() => {
            setCollapsedFiles(new Set());
          });
      }
    },
    [searchFiles, searchContent, setCollapsedFiles],
  );

  const debouncedSearch = useDebounce(performSearch, DEBOUNCE_MS, [], false);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      debouncedSearch(value, searchMode, matchCase, includeFiles, excludeFiles);
    },
    [searchMode, matchCase, includeFiles, excludeFiles, debouncedSearch],
  );

  const handleModeChange = useCallback(
    (mode: SearchMode) => {
      setSearchMode(mode);
      performSearch(query, mode, matchCase, includeFiles, excludeFiles);
    },
    [query, matchCase, includeFiles, excludeFiles, performSearch],
  );

  const handleMatchCaseToggle = useCallback(() => {
    const next = !matchCase;
    setMatchCase(next);
    if (searchMode === 'content') {
      performSearch(query, searchMode, next, includeFiles, excludeFiles);
    }
  }, [matchCase, searchMode, query, includeFiles, excludeFiles, performSearch]);

  const handleIncludeChange = useCallback(
    (value: string) => {
      setIncludeFiles(value);
      if (searchMode === 'content') {
        debouncedSearch(query, searchMode, matchCase, value, excludeFiles);
      }
    },
    [searchMode, query, matchCase, excludeFiles, debouncedSearch],
  );

  const handleExcludeChange = useCallback(
    (value: string) => {
      setExcludeFiles(value);
      if (searchMode === 'content') {
        debouncedSearch(query, searchMode, matchCase, includeFiles, value);
      }
    },
    [searchMode, query, matchCase, includeFiles, debouncedSearch],
  );

  const navigateToDoc = useCallback(
    (path: string[], searchContext?: { query: string; lineContent: string }) => {
      const normalized = normalizePath(path);
      void navigate(`/article/${normalized}`, {
        state: searchContext ? { searchQuery: searchContext.query, lineContent: searchContext.lineContent } : undefined,
      });
      setVisible(false);
    },
    [navigate],
  );

  const toggleFileCollapse = useCallback((filePath: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedFiles(new Set(contentResults.map((f) => normalizePath(f.path))));
  }, [contentResults]);

  const expandAll = useCallback(() => {
    setCollapsedFiles(new Set());
  }, []);

  const openSearch = useCallback(() => {
    setVisible(true);
  }, []);

  const onHide = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (visible) {
          onHide();
        } else {
          openSearch();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [openSearch, onHide, visible]);

  const currentQuery = query.trim();
  const isFileMode = searchMode === 'files';

  return (
    <div className="doc-search-container">
      <button className="search-trigger" onClick={openSearch}>
        <i className="pi pi-search search-trigger-icon" />
        <span className="search-trigger-text">Search</span>
        <kbd className="search-trigger-shortcut">
          <span>⌘</span>K
        </kbd>
      </button>
      <Dialog
        modal={false}
        header={<div className="modal-title">🔍 Search</div>}
        visible={visible}
        onHide={onHide}
        className="doc-search-dialog"
      >
        <div className="search-panel">
          <SelectButton
            value={searchMode}
            onChange={(e) => {
              if (e.value != null) handleModeChange(e.value as SearchMode);
            }}
            options={MODE_OPTIONS}
            className="search-mode-toggle"
          />

          <div className="search-input-row">
            <IconField iconPosition="left" className="search-input-field">
              <InputIcon className="pi pi-search"> </InputIcon>
              <InputText
                value={query}
                onChange={(e) => {
                  handleQueryChange(e.target.value);
                }}
                placeholder={isFileMode ? 'Search file name...' : 'Search in files...'}
                className="search-input"
                autoFocus
              />
            </IconField>
            {!isFileMode && (
              <div className="search-options">
                <button
                  className={`search-option-btn ${matchCase ? 'active' : ''}`}
                  onClick={handleMatchCaseToggle}
                  title="Match Case"
                >
                  Aa
                </button>
                {!isFileMode && (
                  <button
                    className="filter-toggle-btn"
                    onClick={() => {
                      setShowFilters((v) => !v);
                    }}
                  >
                    <i className={`pi pi-chevron-${showFilters ? 'down' : 'right'}`} />
                    <span>Filters</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {!isFileMode && showFilters && (
            <div className="search-filters-section">
              <div className="search-filters">
                <InputText
                  value={includeFiles}
                  onChange={(e) => {
                    handleIncludeChange(e.target.value);
                  }}
                  placeholder="Files to include (e.g. docs, notes)"
                  className="filter-input"
                />
                <InputText
                  value={excludeFiles}
                  onChange={(e) => {
                    handleExcludeChange(e.target.value);
                  }}
                  placeholder="Files to exclude (e.g. drafts, archive)"
                  className="filter-input"
                />
              </div>
            </div>
          )}

          <SearchResults
            isFileMode={isFileMode}
            currentQuery={currentQuery}
            query={query}
            matchCase={matchCase}
            fileResults={fileResults}
            contentResults={contentResults}
            collapsedFiles={collapsedFiles}
            onNavigate={navigateToDoc}
            onToggleCollapse={toggleFileCollapse}
            onCollapseAll={collapseAll}
            onExpandAll={expandAll}
          />
        </div>
      </Dialog>
    </div>
  );
};
