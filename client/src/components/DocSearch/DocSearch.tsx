import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useGetNorDocsQuery } from '@/redux-api/docs';
import { useEditorScrollToAnchor } from '@/utils/hooks/docHooks';
import { useDebounce } from '@/utils/hooks/tools';
import { denormalizePath, headerToId, hightLight, scrollToBottomListener } from '@/utils/utils';

import './DocSearch.scss';

export interface SearchResult {
  path: string;
  keywords: string[];
  headings: string[];
}

const loadNum = 13;

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function SearchBar() {
  const { data: norDocs = {} } = useGetNorDocsQuery();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [resultShow, setResultShow] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showNum, setShowNum] = useState(loadNum);

  const resultBoxRef = useRef<HTMLDivElement>(null);

  const scrollToAnchor = useEditorScrollToAnchor();

  const search = useCallback(
    (searchContent: string): { path: string; keywords: string[]; headings: string[] }[] => {
      const transformResults = Object.keys(norDocs)
        .filter((path) => norDocs[path].isFile)
        .map((path) => ({
          path,
          keywords: norDocs[path].keywords,
          headings: norDocs[path].headings,
        }));

      // filtering based on previous searching keywords
      return searchContent.split(' ').reduce((rets, word) => {
        return rets.filter((ret) => {
          const { path } = ret;
          const { keywords, headings } = norDocs[path];

          // if path is matched, then return directly (show all the headings and keywords)
          if (path.toLowerCase().includes(word.toLowerCase())) {
            return true;
          }

          const filteredKeywords: string[] = [];
          const filteredHeadings: string[] = [];

          // see if the keywords match the search content
          for (const keyword of keywords) {
            if (keyword.toLowerCase().includes(word.toLowerCase())) {
              filteredKeywords.push(keyword);
            }
          }

          // see if the headings match the search content
          for (const heading of headings) {
            if (heading.toLowerCase().includes(word.toLowerCase())) {
              filteredHeadings.push(heading);
            }
          }

          if (filteredKeywords.length !== 0 || filteredHeadings.length !== 0) {
            ret.keywords = filteredKeywords;
            ret.headings = filteredHeadings;
            return true;
          }

          return false;
        });
      }, transformResults);
    },
    [norDocs],
  );

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
              const { path, keywords, headings } = result;
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
                  {searchInputRef.current?.value.trim() !== '' && keywords.length !== 0 && (
                    <div className="keyword-show">
                      {keywords.map((keyword) => (
                        <div
                          className="keyword-item"
                          key={keyword}
                          dangerouslySetInnerHTML={{
                            // eslint-disable-next-line @typescript-eslint/naming-convention
                            __html: hightLight(
                              keyword,
                              searchInputRef.current ? searchInputRef.current.value.trim().split(' ') : [],
                            ),
                          }}
                          onClick={() => {
                            toResult(path, keyword);
                          }}
                        ></div>
                      ))}
                    </div>
                  )}
                  {searchInputRef.current?.value.trim() !== '' && headings.length !== 0 && (
                    <div className="heading-show">
                      {headings.map((heading) => (
                        <div
                          className="heading-item"
                          key={heading}
                          dangerouslySetInnerHTML={{
                            // eslint-disable-next-line @typescript-eslint/naming-convention
                            __html: hightLight(
                              heading.replace(/#+\s/g, ''),
                              searchInputRef.current ? searchInputRef.current.value.trim().split(' ') : [],
                            ),
                          }}
                          onClick={() => {
                            toResult(path, headerToId(heading.replace(/#+\s/g, '')));
                          }}
                        ></div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
