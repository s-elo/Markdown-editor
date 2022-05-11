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

  const search = (searchConetnt: string) => {
    const results = Object.keys(norDocs)
      .filter(
        (path) =>
          norDocs[path].isFile &&
          path.toLowerCase().includes(searchConetnt.toLowerCase())
      )
      .map((ret) => ({
        path: ret,
        keywords: [],
        headings: [],
      }));
    return results;
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
          }, 100)
        }
      />
      <div
        className="search-results-box"
        style={{ display: resultShow ? "flex" : "none" }}
      >
        {results.length !== 0
          ? results.map((result) => {
              const showPath = result.path.replace(/-/g, "->");

              return (
                <div
                  className="result-item"
                  key={result.path}
                  onClick={() => toResult(result.path, "")}
                >
                  {showPath}
                </div>
              );
            })
          : "no related results"}
      </div>
    </div>
  );
}
