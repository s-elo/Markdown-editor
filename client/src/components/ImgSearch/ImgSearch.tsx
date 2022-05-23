import React, { useState } from "react";
import { useGetUploadHistoryQuery } from "@/redux-api/imgStoreApi";

import Spinner from "../Spinner/Spinner";

import "./ImgSearch.less";

export default function ImgSearch() {
  const { data = [], isFetching } = useGetUploadHistoryQuery();
  const [resultShow, setResultShow] = useState(false);
  const [onResultBox, setOnResultBox] = useState(false);

  return (
    <div className="img-search-box">
      <input
        type="text"
        className="input search-input"
        placeholder="search images"
        onClick={() => {
          setResultShow(true);
        }}
        onBlur={() => (!onResultBox && resultShow) && setResultShow(false)}
      />
      <div
        className="search-results-box"
        style={{
          display: resultShow ? "flex" : "none",
        }}
        onMouseEnter={() => setOnResultBox(true)}
        onMouseLeave={() => {
          setResultShow(false);
          setOnResultBox(false);
        }}
      >
        {!isFetching ? (
          data.map((imgData) => (
            <div className="result-item" key={imgData.hash}>
              <div className="img-info">{imgData.url}</div>
              <img src={imgData.url} alt={imgData.filename} />
            </div>
          ))
        ) : (
          <Spinner size="3rem" />
        )}
      </div>
    </div>
  );
}
