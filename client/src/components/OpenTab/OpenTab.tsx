import { ScrollPanel } from 'primereact/scrollpanel';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import type { RootState } from '@/store';

import { Icon } from '@/components/Icon/Icon';
import { useGetSettingsQuery } from '@/redux-api/settings';
import { selectCurTabs, Tab } from '@/redux-feature/curDocSlice';
import { selectServerStatus, ServerStatus } from '@/redux-feature/globalOptsSlice';
import { useDeleteTab } from '@/utils/hooks/reduxHooks';
import Toast from '@/utils/Toast';
import { denormalizePath, getDraftKey } from '@/utils/utils';

import './OpenTab.scss';

function getDisambiguations(tabs: Tab[]): Map<string, string> {
  const result = new Map<string, string>();
  const groups = new Map<string, { ident: string; parts: string[] }[]>();

  for (const tab of tabs) {
    if (tab.type !== 'workspace') continue;
    const parts = denormalizePath(tab.ident);
    const baseName = parts[parts.length - 1];
    if (!groups.has(baseName)) groups.set(baseName, []);
    groups.get(baseName)!.push({ ident: tab.ident, parts });
  }

  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    for (let depth = 2; depth <= Math.max(...group.map((g) => g.parts.length)); depth++) {
      const suffixes = group.map((g) => g.parts.slice(-depth).slice(0, -1).join('/'));
      if (new Set(suffixes).size === group.length) {
        group.forEach((g, i) => result.set(g.ident, suffixes[i]));
        break;
      }
    }
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function OpenTab() {
  const curTabs = useSelector(selectCurTabs);
  const { data: settings } = useGetSettingsQuery();
  const draftKeys = useSelector((state: RootState) => Object.keys(state.drafts));
  const serverStatus = useSelector(selectServerStatus);

  const navigate = useNavigate();

  const deleteTab = useDeleteTab();

  const disambiguations = getDisambiguations(curTabs);

  const activeTabRef = useRef<HTMLDivElement>(null);
  const activeIdent = curTabs.find((t) => t.active)?.ident;

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeIdent]);

  return (
    <ScrollPanel style={{ borderBottom: '1px solid var(--shadowColor)' }}>
      <div className="open-tab-container">
        {curTabs.map(({ ident, active, type, title }) => {
          const draftKey = getDraftKey(settings?.docRootPath, ident);
          const isDirty = draftKeys.includes(draftKey);

          const TabTitle = type === 'workspace' ? denormalizePath(ident).join('/') : title ?? ident;

          const tabName = type === 'workspace' ? denormalizePath(ident).slice(-1)[0] : title ?? ident;
          const subtitle = disambiguations.get(ident) ?? '';

          const notFoundTab = serverStatus === ServerStatus.CANNOT_CONNECT && type === 'workspace';

          const toDoc = () => {
            if (notFoundTab) {
              Toast.error(`Can not found the content of "${ident}".`);
              return;
            }

            if (type === 'workspace') {
              void navigate(`/article/${ident}`);
            } else if (type === 'draft') {
              void navigate(`/draft/${ident}`);
            } else if (type === 'internal') {
              void navigate(`/internal/${ident}`);
            }
          };

          return (
            <div
              key={ident}
              ref={active ? activeTabRef : undefined}
              className={`open-tab${active ? ' active-tab' : ''}${isDirty ? ' dirty' : ''}${
                notFoundTab ? ' not-found-tab' : ''
              }`}
              title={`${TabTitle}.md${isDirty ? ' (unsaved)' : ''}`}
              onClick={() => {
                toDoc();
              }}
            >
              <span className="tab-name">
                {type === 'internal' && <i className="pi pi-server internal-icon" />}
                {`${tabName}.md`}
                {subtitle && <span className="tab-subtitle">{subtitle}</span>}
              </span>
              <Icon
                id="close-tab"
                className="close-tag"
                iconName="times"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteTab([ident]);
                }}
              />
            </div>
          );
        })}
      </div>
    </ScrollPanel>
  );
}
