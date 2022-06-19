import React, { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useGetNorDocsQuery } from "@/redux-api/docsApi";
import { selectCurTabs, Tab, updateTabs } from "@/redux-feature/curDocSlice";
import { useDeleteTab, useSaveDoc } from "@/utils/hooks/reduxHooks";
import "./OpenTab.less";

export default function OpenTab() {
  const curTabs = useSelector(selectCurTabs);

  const { data: norDocs = {} } = useGetNorDocsQuery();

  const router = useHistory();

  const dispatch = useDispatch();

  const deleteTab = useDeleteTab();
  const saveDoc = useSaveDoc();

  useEffect(() => {
    const newTabs: Tab[] = [];

    curTabs.forEach(
      ({ path, active }) => norDocs[path] && newTabs.push({ path, active })
    );

    // select first one to be displayed
    const availablePaths = Object.keys(norDocs);
    if (newTabs.length === 0 && availablePaths.length !== 0) {
      newTabs.push({ path: availablePaths[0], active: true });
      router.push(`/article/${availablePaths[0]}`);
    }

    dispatch(updateTabs(newTabs));
    // eslint-disable-next-line
  }, [norDocs, dispatch, updateTabs]);

  return (
    <div className="open-tab-container">
      {curTabs.map(({ path, active }) => (
        <div
          key={path}
          className={`open-tab ${active ? "active-tab" : ""}`}
          title={path.replaceAll("-", "/") + ".md"}
          onClick={() => {
            // auto save when switch
            saveDoc();
            router.push(`/article/${path}`);
          }}
        >
          <span className="tab-name">
            {path.split("-").slice(-1)[0] + ".md"}
          </span>
          <span
            className="close-tag"
            onClick={(e) => {
              e.stopPropagation();
              deleteTab(path);
            }}
          >
            ×
          </span>
        </div>
      ))}
    </div>
  );
}
