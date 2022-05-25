import React, { useState } from "react";
import { useGetUploadHistoryQuery } from "@/redux-api/imgStoreApi";

import ResultBox from "./ResultBox";
import Spinner from "../Spinner/Spinner";

import "./ImgSearch.less";

export default function ImgSearch() {
  const { data = [], isSuccess } = useGetUploadHistoryQuery();
  const [resultShow, setResultShow] = useState(false);

  return (
    <div className="img-search-box">
      <input
        type="text"
        className="input search-input"
        placeholder="search images"
        onClick={() => {
          setResultShow(true);
        }}
        onBlur={() => setResultShow(false)}
      />
      {isSuccess ? (
        <ResultBox isShow={resultShow} results={data}></ResultBox>
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
