import React, { useCallback, useEffect, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { useGetNorDocsQuery } from "@/redux-api/docsApi";
import { useDebounce } from "@/utils/hooks";

import { getCurrentPath, hightlight } from "@/utils/utils";

import "./DocSearch.less";

export type SearchResult = {
  path: string;
  keywords: string[];
  headings: string[];
};

export default function SearchBar() {
  const { data: norDocs = {} } = useGetNorDocsQuery();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [resultShow, setResultShow] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const routerHistory = useHistory();
  const { pathname } = useLocation();

  const dispatch = useDispatch();

  const search = useCallback(
    (
      searchContent: string
    ): { path: string; keywords: string[]; headings: string[] }[] => {
      const transformResults = Object.keys(norDocs)
        .filter((path) => norDocs[path].doc.isFile)
        .map((path) => ({
          path,
          keywords: norDocs[path].doc.keywords,
          headings: norDocs[path].doc.headings,
        }));

      // filtering based on previous searching keywords
      return searchContent.split(" ").reduce((results, word) => {
        return results.filter((ret) => {
          const { path } = ret;
          const { keywords, headings } = norDocs[path].doc;

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
    [norDocs]
  );

  const handleSearch = useDebounce((e: React.ChangeEvent<HTMLInputElement>) => {
    setResults(search(e.target.value));
  }, 500);

  const toResult = useCallback(
    (path: string, anchor: string) => {
      if (getCurrentPath(pathname).join("-") !== path) {
        if (anchor !== "") {
          // tell the editor through global opts
          dispatch(updateGlobalOpts({ keys: ["anchor"], values: [anchor] }));
        }

        return routerHistory.push(`/article/${path}`);
      }

      if (anchor !== "") {
        const dom = document.getElementById(anchor);
        const parentDom = document.getElementsByClassName(
          "milkdown"
        )[0] as HTMLElement;

        if (dom) {
          parentDom.scroll({ top: dom.offsetTop, behavior: "smooth" });
        }
      }
    },
    [pathname, dispatch, routerHistory]
  );

  // update when the norDoc changed (headings and keywords changed)
  useEffect(() => {
    if (searchInputRef.current && searchInputRef.current.value.trim() !== "") {
      setResults(search(searchInputRef.current.value));
    }
    // norDocs changes will lead to the change of the search function ref
  }, [search]);

  return (
    <div className="search-box">
      <input
        ref={searchInputRef}
        type="text"
        className="input search-input"
        placeholder="search docs"
        onChange={handleSearch}
        onFocus={() => {
          if (
            searchInputRef.current &&
            searchInputRef.current.value.trim() === ""
          ) {
            setResults(search(""));
          }
          setResultShow(true);
        }}
        onBlur={() => setResultShow(false)}
      />
      <div
        className="search-results-box"
        style={{
          display: resultShow ? "flex" : "none",
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {results.length !== 0
          ? results.map((result) => {
              const { path, keywords, headings } = result;
              const showPath = path.replace(/-/g, "->");

              return (
                <div className="result-item" key={path}>
                  <div
                    className="path-show"
                    dangerouslySetInnerHTML={{
                      __html: hightlight(
                        showPath,
                        searchInputRef.current
                          ? searchInputRef.current.value.split(" ")
                          : []
                      ),
                    }}
                    onClick={() => toResult(path, "")}
                  ></div>
                  {searchInputRef.current?.value.trim() !== "" &&
                    keywords.length !== 0 && (
                      <div className="keyword-show">
                        {keywords.map((keyword) => (
                          <div
                            className="keyword-item"
                            key={keyword}
                            dangerouslySetInnerHTML={{
                              __html: hightlight(
                                keyword,
                                searchInputRef.current
                                  ? searchInputRef.current.value.trim().split(" ")
                                  : []
                              ),
                            }}
                            onClick={() => toResult(path, keyword)}
                          ></div>
                        ))}
                      </div>
                    )}
                  {searchInputRef.current?.value.trim() !== "" &&
                    headings.length !== 0 && (
                      <div className="heading-show">
                        {headings.map((heading) => (
                          <div
                            className="heading-item"
                            key={heading}
                            dangerouslySetInnerHTML={{
                              __html: hightlight(
                                heading.replace(/#+\s/g, ""),
                                searchInputRef.current
                                  ? searchInputRef.current.value.trim().split(" ")
                                  : []
                              ),
                            }}
                            onClick={() =>
                              toResult(
                                path,
                                heading
                                  .replace(/#+\s/g, "")
                                  .replace(/\s/g, "-")
                                  .toLowerCase()
                              )
                            }
                          ></div>
                        ))}
                      </div>
                    )}
                </div>
              );
            })
          : "no related results"}
      </div>
    </div>
  );
}
