import React, { useRef, useCallback, useEffect, useState } from "react";
import { useGetUploadHistoryQuery } from "@/redux-api/imgStoreApi";

import ResultBox from "./ResultBox";
import Spinner from "../Spinner/Spinner";
import { useDebounce } from "@/utils/hooks/tools";

import "./ImgSearch.less";

export default function ImgSearch() {
  const { data: uploadList = [], isSuccess } = useGetUploadHistoryQuery();
  const [searchRet, setSearchRet] = useState(uploadList);
  const [resultShow, setResultShow] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useDebounce((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchRet(search(e.target.value));
  }, 500);

  const search = useCallback(
    (searchContent: string) =>
      searchContent
        .split(" ")
        .reduce(
          (results, word) =>
            results.filter((result) =>
              result.name.toLocaleLowerCase().includes(word)
            ),
          uploadList
        ),
    [uploadList]
  );

  useEffect(() => {
    if (searchInputRef.current && searchInputRef.current.value.trim() !== "") {
      setSearchRet(search(searchInputRef.current.value));
    }
  }, [search]);

  return (
    <div className="img-search-box">
      <input
        type="text"
        className="input search-input"
        placeholder="search image names"
        ref={searchInputRef}
        onChange={handleSearch}
        onClick={() => {
          if (
            searchInputRef.current &&
            searchInputRef.current.value.trim() === ""
          ) {
            setSearchRet(search(""));
          }
          setResultShow(true);
        }}
        onBlur={() => setResultShow(false)}
      />
      {isSuccess ? (
        <ResultBox
          isShow={resultShow}
          results={searchRet}
          searchContent={
            searchInputRef.current ? searchInputRef.current.value : ""
          }
        ></ResultBox>
      ) : (
        <div
          className="search-results-box"
          style={{
            display: resultShow ? "flex" : "none",
          }}
        >
          <Spinner size="2rem" />
        </div>
      )}
    </div>
  );
}
