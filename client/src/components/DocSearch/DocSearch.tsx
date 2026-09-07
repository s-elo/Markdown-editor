import { Dialog } from 'primereact/dialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { SelectButton } from 'primereact/selectbutton';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { SearchResults } from './SearchResults';

import type { FileContentMatches, FileNameMatch } from '@/redux-api/searchApi';

import { selectGithubWorkspace } from '@/redux-feature/githubWorkspaceSlice';
import { useGitHubSearchAvailability, useWorkspaceSearch, WorkspaceSearchMode } from '@/utils/hooks/searchHooks';
import { normalizePath } from '@/utils/utils';

import './DocSearch.scss';

const MODE_OPTIONS = [
  { label: 'Files', value: 'files' },
  { label: 'Content', value: 'content' },
];

const GITHUB_SEARCH_RESULT_LIMIT = 1000;

interface DocSearchProps {
  disabled?: boolean;
}

export const DocSearch: FC<DocSearchProps> = ({ disabled = false }) => {
  const [visible, setVisible] = useState(false);
  const [searchMode, setSearchMode] = useState<WorkspaceSearchMode>('files');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [includeFiles, setIncludeFiles] = useState('');
  const [excludeFiles, setExcludeFiles] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [fileResults, setFileResults] = useState<FileNameMatch[]>([]);
  const [contentResults, setContentResults] = useState<FileContentMatches[]>([]);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [documentOnlyContent, setDocumentOnlyContent] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [incompleteResults, setIncompleteResults] = useState(false);
  const [totalCount, setTotalCount] = useState<number>();
  const [nextPage, setNextPage] = useState<number>();
  const [rateLimitReset, setRateLimitReset] = useState<number>();

  const workspace = useSelector(selectGithubWorkspace);
  const searchWorkspace = useWorkspaceSearch();
  const searchAvailability = useGitHubSearchAvailability();
  const requestSequenceRef = useRef(0);
  const navigate = useNavigate();

  const resetResults = useCallback(() => {
    requestSequenceRef.current += 1;
    setFileResults([]);
    setContentResults([]);
    setCollapsedFiles(new Set());
    setSubmittedQuery('');
    setHasSearched(false);
    setIsSearching(false);
    setDocumentOnlyContent(false);
    setSearchError(undefined);
    setIncompleteResults(false);
    setTotalCount(undefined);
    setNextPage(undefined);
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      resetResults();
    },
    [resetResults],
  );

  const handleModeChange = useCallback(
    (mode: WorkspaceSearchMode) => {
      setSearchMode(mode);
      resetResults();
    },
    [resetResults],
  );

  const handleMatchCaseToggle = useCallback(() => {
    const next = !matchCase;
    setMatchCase(next);
    resetResults();
  }, [matchCase, resetResults]);

  const handleIncludeChange = useCallback(
    (value: string) => {
      setIncludeFiles(value);
      resetResults();
    },
    [resetResults],
  );

  const handleExcludeChange = useCallback(
    (value: string) => {
      setExcludeFiles(value);
      resetResults();
    },
    [resetResults],
  );

  const performSearch = useCallback(
    async (page = 1) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery || isSearching || !searchAvailability.supported) return;
      if (rateLimitReset && rateLimitReset > Date.now()) return;

      const requestSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestSequence;
      setIsSearching(true);
      setSearchError(undefined);
      try {
        const response = await searchWorkspace({
          query: trimmedQuery,
          mode: searchMode,
          caseSensitive: matchCase,
          includeFiles: includeFiles.trim() || undefined,
          excludeFiles: excludeFiles.trim() || undefined,
          page,
        });
        if (requestSequenceRef.current !== requestSequence) return;

        setSubmittedQuery(trimmedQuery);
        setHasSearched(true);
        setDocumentOnlyContent(response.documentOnlyContent);
        setIncompleteResults(response.incompleteResults);
        setTotalCount(response.totalCount);
        setNextPage(response.nextPage);
        setCollapsedFiles(new Set());
        setContentResults(response.contentResults);
        setFileResults((previous) => {
          if (page === 1 || !response.documentOnlyContent) return response.fileResults;
          const merged = new Map(previous.map((item) => [normalizePath(item.path), item]));
          response.fileResults.forEach((item) => merged.set(normalizePath(item.path), item));
          return [...merged.values()];
        });
      } catch (error) {
        if (requestSequenceRef.current !== requestSequence) return;
        const githubError = error as { message?: string; rateLimitReset?: number };
        if (githubError.rateLimitReset && githubError.rateLimitReset > Date.now()) {
          setRateLimitReset(githubError.rateLimitReset);
          setSearchError(
            `GitHub search rate limit reached. Try again after ${new Date(
              githubError.rateLimitReset,
            ).toLocaleTimeString()}.`,
          );
        } else {
          setSearchError(githubError.message ?? 'Search failed.');
        }
      } finally {
        if (requestSequenceRef.current === requestSequence) setIsSearching(false);
      }
    },
    [
      excludeFiles,
      includeFiles,
      isSearching,
      matchCase,
      query,
      rateLimitReset,
      searchAvailability.supported,
      searchMode,
      searchWorkspace,
    ],
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
    if (disabled) return;
    setVisible(true);
  }, [disabled]);

  const onHide = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (disabled) setVisible(false);
  }, [disabled]);

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

  useEffect(() => {
    resetResults();
    setRateLimitReset(undefined);
  }, [resetResults, workspace.config.branch, workspace.config.owner, workspace.config.repo, workspace.mode]);

  useEffect(() => {
    if (!rateLimitReset) return;
    const remaining = rateLimitReset - Date.now();
    if (remaining <= 0) {
      setRateLimitReset(undefined);
      return;
    }
    const timer = window.setTimeout(() => {
      setRateLimitReset(undefined);
      setSearchError(undefined);
    }, remaining);
    return () => {
      window.clearTimeout(timer);
    };
  }, [rateLimitReset]);

  const currentQuery = submittedQuery.trim();
  const isFileMode = searchMode === 'files';
  const isGitHubMode = workspace.mode === 'github';
  const isRateLimited = Boolean(rateLimitReset && rateLimitReset > Date.now());
  const displayedSearchError =
    searchError ??
    (isRateLimited && rateLimitReset
      ? `GitHub search rate limit reached. Try again after ${new Date(rateLimitReset).toLocaleTimeString()}.`
      : undefined);
  const canSubmit = Boolean(query.trim() && !isSearching && searchAvailability.supported && !isRateLimited);
  const resultWarning = [
    incompleteResults ? 'GitHub returned incomplete search results.' : '',
    totalCount !== undefined && totalCount > GITHUB_SEARCH_RESULT_LIMIT
      ? `GitHub found ${totalCount.toLocaleString()} results, but only the first 1,000 are available. Refine the query to see more.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className="doc-search-container"
      title={disabled ? 'Search is temporarily unavailable in GitHub mode' : undefined}
    >
      <button className="search-trigger" disabled={disabled} onClick={openSearch}>
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
              if (e.value != null) handleModeChange(e.value as WorkspaceSearchMode);
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) void performSearch();
                }}
                placeholder={isFileMode ? 'Search file name...' : 'Search in files...'}
                className="search-input"
                autoFocus
              />
            </IconField>
            <button
              type="button"
              className="search-submit-btn"
              disabled={!canSubmit}
              onClick={() => void performSearch()}
            >
              {isSearching ? <i className="pi pi-spin pi-spinner" /> : <i className="pi pi-search" />}
              <span>Search</span>
            </button>
            {!isFileMode && (
              <div className="search-options">
                {!isGitHubMode && (
                  <button
                    type="button"
                    className={`search-option-btn ${matchCase ? 'active' : ''}`}
                    onClick={handleMatchCaseToggle}
                    title="Match Case"
                  >
                    Aa
                  </button>
                )}
                <button
                  type="button"
                  className="filter-toggle-btn"
                  onClick={() => {
                    setShowFilters((v) => !v);
                  }}
                >
                  <i className={`pi pi-chevron-${showFilters ? 'down' : 'right'}`} />
                  <span>Filters</span>
                </button>
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
            query={submittedQuery}
            matchCase={matchCase}
            fileResults={fileResults}
            contentResults={contentResults}
            collapsedFiles={collapsedFiles}
            documentOnlyContent={documentOnlyContent}
            hasSearched={hasSearched}
            isSearching={isSearching}
            errorMessage={displayedSearchError}
            noticeMessage={isGitHubMode && !searchAvailability.supported ? searchAvailability.reason : undefined}
            noticeLoading={searchAvailability.isChecking}
            warningMessage={resultWarning || undefined}
            canLoadMore={nextPage !== undefined && !isRateLimited}
            onLoadMore={nextPage === undefined ? undefined : () => void performSearch(nextPage)}
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
