import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useEditorScrollToAnchor } from '@/utils/hooks/docHooks';
import { useDebounce } from '@/utils/hooks/tools';
import { denormalizePath, hightLight, scrollToBottomListener } from '@/utils/utils';

import './DocSearch.scss';

export interface SearchResult {
  path: string;
}

const loadNum = 13;

// TODO: Search by BE
// eslint-disable-next-line @typescript-eslint/naming-convention
export default function SearchBar() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [resultShow, setResultShow] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showNum, setShowNum] = useState(loadNum);

  const resultBoxRef = useRef<HTMLDivElement>(null);

  const scrollToAnchor = useEditorScrollToAnchor();

  const search = useCallback((searchContent: string): { path: string }[] => {
    const transformResults: { path: string }[] = [];

    // filtering based on previous searching keywords
    return searchContent.split(' ').reduce((rets, word) => {
      return rets.filter((ret) => {
        const { path } = ret;

        // if path is matched, then return directly (show all the headings and keywords)
        if (path.toLowerCase().includes(word.toLowerCase())) {
          return true;
        }

        return false;
      });
    }, transformResults);
  }, []);

  const handleSearch = useDebounce((e: React.ChangeEvent<HTMLInputElement>) => {
    setResults(search(e.target.value));
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  }, 500);

  const toResult = useCallback(
    (path: string, anchor: string) => {
      scrollToAnchor(anchor, path);
    },
    [scrollToAnchor],
  );

  // update when the norDoc changed (headings and keywords changed)
  useEffect(() => {
    if (searchInputRef.current && searchInputRef.current.value.trim() !== '') {
      setResults(search(searchInputRef.current.value));
    }
    // norDocs changes will lead to the change of the search function ref
  }, [search]);

  /**
   * scroll down to the bottom to show more images
   */
  useEffect(() => {
    if (!resultBoxRef.current) return;

    // every time when the results changed, reset to only show loadNum results
    setShowNum(loadNum);

    const remover = scrollToBottomListener(resultBoxRef.current, () => {
      setShowNum((num) => (num + loadNum > results.length ? results.length : num + loadNum));
    });

    return remover as () => void;
  }, [results]);

  return (
    <div className="search-box">
      <input
        ref={searchInputRef}
        type="text"
        className="input search-input"
        placeholder="search docs"
        onChange={handleSearch}
        onFocus={() => {
          if (searchInputRef.current && searchInputRef.current.value.trim() === '') {
            setResults(search(''));
          }
          setResultShow(true);
        }}
        onBlur={() => {
          setResultShow(false);
        }}
      />
      <div
        className="result-wrapper"
        style={{
          display: resultShow ? 'block' : 'none',
        }}
      >
        <div className="result-info">{`found ${results.length} related article`}</div>
        <div
          className="search-results-box"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          ref={resultBoxRef}
        >
          {results.length !== 0 &&
            results.slice(0, showNum).map((result) => {
              const { path } = result;
              const showPath = denormalizePath(path).join('/').replace(/\//g, '->');

              return (
                <div className="result-item" key={path}>
                  <div
                    className="path-show"
                    dangerouslySetInnerHTML={{
                      // eslint-disable-next-line @typescript-eslint/naming-convention
                      __html: hightLight(
                        showPath,
                        searchInputRef.current ? searchInputRef.current.value.split(' ') : [],
                      ),
                    }}
                    onClick={() => {
                      toResult(path, '');
                    }}
                  ></div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
