import React from 'react';

import { useRefreshDocsMutation } from '@/redux-api/docs';
import Toast from '@/utils/Toast';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function Refresh({ isFetching }: { isFetching: boolean }) {
  const [refreshDoc] = useRefreshDocsMutation();

  const clickRefresh = async (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();

    try {
      await refreshDoc().unwrap();

      Toast('refreshed', 'SUCCESS');
    } catch (err) {
      Toast('failed to refresh...', 'ERROR');
    }
  };

  return (
    <span
      role="button"
      title="refresh the doc menu"
      className={`refresh-btn material-icons-outlined icon-btn ${isFetching ? 'fetching' : ''}`}
      onClick={(e) => void clickRefresh(e)}
    >
      refresh
    </span>
  );
}
