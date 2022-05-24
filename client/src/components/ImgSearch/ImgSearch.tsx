import React, { useState } from "react";
import { useGetUploadHistoryQuery } from "@/redux-api/imgStoreApi";

import Spinner from "../Spinner/Spinner";
import Toast from "@/utils/Toast";
import "./ImgSearch.less";

export default function ImgSearch() {
  const { data = [], isFetching } = useGetUploadHistoryQuery();
  const [resultShow, setResultShow] = useState(false);

  const copyInfo = async (info: string) => {
    await navigator.clipboard.writeText(info);
    Toast('copied!', 'SUCCESS');
  };

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
      <div
        className="search-results-box"
        style={{
          display: resultShow ? "flex" : "none",
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {!isFetching ? (
          data.map((imgData) => (
            <div className="result-item" key={imgData.hash}>
              <div className="img-info">
                <div
                  className="img-info-item"
                  title="click to copy"
                  onClick={() => copyInfo(imgData.url)}
                >
                  <span className="info-label">url:</span>
                  {imgData.url}
                </div>
                <div className="img-info-item" title="click to copy" onClick={() => copyInfo(imgData.filename)}>
                  <span className="info-label">name:</span>
                  {imgData.filename}
                </div>
                <div className="img-info-item">
                  <span className="material-icons-outlined" title="delete">
                    delete
                  </span>
                </div>
              </div>
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
