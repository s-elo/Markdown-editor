import { FC } from 'react';

import { useGetSettingsQuery } from '@/redux-api/settings';

export const Empty: FC = () => {
  // not easy to get the absolute path of the selected folder
  // may need to work with server

  const { data: { data: settings } = { data: null } } = useGetSettingsQuery();

  return (
    <div className="empty-container">
      {/* <Button className="empty-container-title" size="small" disabled={disabled} onClick={handleSelectFolder}>
        Select Workspace
      </Button> */}
      Doc in current path is empty.
      <p>Current path: {settings?.docRootPath}</p>
      Please update the path in settings
    </div>
  );
};
