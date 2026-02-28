import { FC, ReactNode, useMemo } from 'react';

import { FileContentMatches, FileNameMatch } from '@/redux-api/searchApi';
import { normalizePath } from '@/utils/utils';

const CONTEXT_CHARS = 30;

function renderHighlightedLine(lineContent: string, query: string, matchCase: boolean): ReactNode {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return lineContent;

  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flags = matchCase ? 'g' : 'gi';

  let regex: RegExp | null = null;
  try {
    regex = new RegExp(escaped, flags);
  } catch {
    return lineContent;
  }

  if (!regex) return lineContent;

  const matches: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null = null;
  while ((m = regex.exec(lineContent)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length });
    if (m[0].length === 0) break;
  }

  if (matches.length === 0) return lineContent;

  const windowStart = Math.max(0, matches[0].start - CONTEXT_CHARS);
  const windowEnd = Math.min(lineContent.length, matches[matches.length - 1].end + CONTEXT_CHARS);
  const prefix = windowStart > 0;
  const suffix = windowEnd < lineContent.length;

  const parts: ReactNode[] = [];
  let cursor = windowStart;
  let key = 0;

  for (const match of matches) {
    if (match.end <= windowStart || match.start >= windowEnd) continue;
    const mStart = Math.max(match.start, windowStart);
    const mEnd = Math.min(match.end, windowEnd);
    if (mStart > cursor) {
      parts.push(lineContent.substring(cursor, mStart));
    }
    parts.push(
      <mark key={key++} className="match-highlight">
        {lineContent.substring(mStart, mEnd)}
      </mark>,
    );
    cursor = mEnd;
  }

  if (cursor < windowEnd) {
    parts.push(lineContent.substring(cursor, windowEnd));
  }

  return (
    <>
      {prefix && <span className="match-ellipsis">…</span>}
      {parts}
      {suffix && <span className="match-ellipsis">…</span>}
    </>
  );
}

interface SearchResultsProps {
  isFileMode: boolean;
  currentQuery: string;
  query: string;
  matchCase: boolean;
  fileResults: FileNameMatch[];
  contentResults: FileContentMatches[];
  collapsedFiles: Set<string>;
  onNavigate: (path: string[], searchContext?: { query: string; lineContent: string }) => void;
  onToggleCollapse: (filePath: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}

const renderFilePath = (path: string[]) => path.join(' / ');

export const SearchResults: FC<SearchResultsProps> = ({
  isFileMode,
  currentQuery,
  query,
  matchCase,
  fileResults,
  contentResults,
  collapsedFiles,
  onNavigate,
  onToggleCollapse,
  onCollapseAll,
  onExpandAll,
}) => {
  const allCollapsed = useMemo(
    () => contentResults.length > 0 && contentResults.every((f) => collapsedFiles.has(normalizePath(f.path))),
    [contentResults, collapsedFiles],
  );

  return (
    <div className="search-results">
      {isFileMode ? (
        <>
          {currentQuery !== '' && fileResults.length === 0 && <div className="empty-results">No files found</div>}
          {fileResults.map((item) => (
            <div
              key={normalizePath(item.path)}
              className="result-item file-result"
              onClick={() => {
                onNavigate(item.path);
              }}
            >
              <i className="pi pi-file result-icon" />
              <div className="result-info">
                <span className="result-name">{item.name}</span>
                <span className="result-path">{renderFilePath(item.path)}</span>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {contentResults.length > 0 && (
            <div className="results-toolbar">
              <button
                className="collapse-all-btn"
                onClick={allCollapsed ? onExpandAll : onCollapseAll}
                title={allCollapsed ? 'Expand All' : 'Collapse All'}
              >
                <i className={`pi pi-chevron-${allCollapsed ? 'right' : 'down'}`} />
                <span>{allCollapsed ? 'Expand All' : 'Collapse All'}</span>
              </button>
            </div>
          )}
          {currentQuery !== '' && contentResults.length === 0 && <div className="empty-results">No matches found</div>}
          {contentResults.map((file) => {
            const fileKey = normalizePath(file.path);
            const isCollapsed = collapsedFiles.has(fileKey);
            return (
              <div key={fileKey} className="content-file-group">
                <div
                  className="content-file-header"
                  onClick={() => {
                    onToggleCollapse(fileKey);
                  }}
                >
                  <i className={`pi pi-chevron-${isCollapsed ? 'right' : 'down'} collapse-icon`} />
                  <i className="pi pi-file result-icon" />
                  <span
                    className="result-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(file.path);
                    }}
                  >
                    {file.name}
                  </span>
                  <span className="result-path">{renderFilePath(file.path)}</span>
                  <span className="match-count">{file.matches.length}</span>
                </div>
                {!isCollapsed && (
                  <div className="content-matches">
                    {file.matches.map((match) => (
                      <div
                        key={`${fileKey}-${match.lineNumber}`}
                        className="match-line"
                        onClick={() => {
                          onNavigate(file.path, { query: query.trim(), lineContent: match.lineContent });
                        }}
                      >
                        <span className="line-number">{match.lineNumber}</span>
                        <span className="line-content">
                          {renderHighlightedLine(match.lineContent, query, matchCase)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
