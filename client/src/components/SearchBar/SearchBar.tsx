import React, { useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateGlobalOpts } from "@/redux-feature/globalOptsSlice";
import { useGetDocMenuQuery } from "@/redux-api/docsApi";
import { useDebounce } from "@/utils/hooks";

import { getCurrentPath } from "@/utils/utils";

import "./SearchBar.less";

export type SearchResult = {
  path: string;
  keywords: string[];
  headings: string[];
};

export default function SearchBar() {
  const { data: { norDocs } = { norDocs: {} } } = useGetDocMenuQuery();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [resultShow, setResultShow] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const routerHistory = useHistory();
  const { pathname } = useLocation();

  const dispatch = useDispatch();

  const search = (searchContent: string) => {
    const transformResults = Object.keys(norDocs)
      .filter((path) => norDocs[path].isFile)
      .map((path) => ({
        path,
        keywords: norDocs[path].keywords,
        headings: norDocs[path].headings,
      }));

    // filtering based on previous searching keywords
    return searchContent.split(" ").reduce((results, word) => {
      return results.filter((ret) => {
        const { path } = ret;
        const { keywords, headings } = norDocs[path];

        // if path is matched, then return directly
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

        if (filteredKeywords.length !== 0) ret.keywords = filteredKeywords;
        if (filteredHeadings.length !== 0) ret.headings = filteredHeadings;

        if (filteredKeywords.length !== 0 || filteredHeadings.length !== 0)
          return true;

        return false;
      });
    }, transformResults);
  };

  const handleSearch = useDebounce((e: React.ChangeEvent<HTMLInputElement>) => {
    setResults(search(e.target.value));
  }, 500);

  const toResult = (path: string, anchor: string) => {
    if (getCurrentPath(pathname).join("-") !== path) {
      if (anchor !== "") {
        // tell the editor through global opts
        dispatch(updateGlobalOpts({ keys: ["anchor"], values: [anchor] }));
      }

      return routerHistory.push(`/article/${path}`);
    }

    if (anchor !== "") {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
    }
  };

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
        onBlur={() =>
          // make sure after the click event is fired
          setTimeout(() => {
            setResultShow(false);
          }, 500)
        }
      />
      <div
        className="search-results-box"
        style={{ display: resultShow ? "flex" : "none" }}
      >
        {results.length !== 0
          ? results.map((result) => {
              const { path, keywords, headings } = result;
              const showPath = path.replace(/-/g, "->");

              return (
                <div className="result-item" key={path}>
                  <div className="path-show" onClick={() => toResult(path, "")}>
                    {showPath}
                  </div>
                  {searchInputRef.current?.value.trim() !== "" && (
                    <div className="keyword-show">
                      {keywords.map((keyword) => (
                        <div className="keyword-item" key={keyword} onClick={() => toResult(path, keyword)}>
                          {keyword}
                        </div>
                      ))}
                    </div>
                  )}
                  {searchInputRef.current?.value.trim() !== "" && (
                    <div className="heading-show">
                      {headings.map((heading) => (
                        <div
                          className="heading-item"
                          key={heading}
                          onClick={() =>
                            toResult(
                              path,
                              heading
                                .replace(/#+\s/g, "")
                                .replace(/\s/g, "-")
                                .toLowerCase()
                            )
                          }
                        >
                          {heading.replace(/#+\s/g, "")}
                        </div>
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
