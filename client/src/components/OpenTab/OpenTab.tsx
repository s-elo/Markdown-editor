import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useGetNorDocsQuery } from '@/redux-api/docsApi';
import { selectCurTabs, Tab, updateTabs } from '@/redux-feature/curDocSlice';
import { useDeleteTab, useSaveDoc } from '@/utils/hooks/reduxHooks';
import './OpenTab.scss';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function OpenTab() {
  const curTabs = useSelector(selectCurTabs);

  const { data: norDocs = {}, isSuccess } = useGetNorDocsQuery();

  const navigate = useNavigate();

  const dispatch = useDispatch();

  const deleteTab = useDeleteTab();
  const saveDoc = useSaveDoc();

  useEffect(() => {
    if (!isSuccess) return;

    const newTabs: Tab[] = [];

    curTabs.forEach(({ path, ...rest }) => {
      if (norDocs[path]) newTabs.push({ path, ...rest });
    });

    // select first file to be displayed
    const availablePaths = Object.keys(norDocs).filter((path) => norDocs[path].doc.isFile);
    if (newTabs.length === 0 && availablePaths.length !== 0) {
      newTabs.push({ path: availablePaths[0], active: true, scroll: 0 });
      void navigate(`/article/${availablePaths[0]}`);
    }

    if (curTabs.length !== newTabs.length) {
      dispatch(updateTabs(newTabs));
    }

    // eslint-disable-next-line
  }, [norDocs, dispatch, updateTabs]);

  return (
    <div className="open-tab-container">
      {curTabs.map(({ path, active }) => (
        <div
          key={path}
          className={`open-tab ${active ? 'active-tab' : ''}`}
          title={`${path.replaceAll('-', '/') as string}.md`}
          onClick={() => {
            // auto save when switch
            saveDoc();
            void navigate(`/article/${path as string}`);
          }}
        >
          <span className="tab-name">{`${path.split('-').slice(-1)[0] as string}.md`}</span>
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
