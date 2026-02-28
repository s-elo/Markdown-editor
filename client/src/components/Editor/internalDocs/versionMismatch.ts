import { APP_VERSION, GITHUB_PAGES_BASE_PATH } from '@/constants';
import { getServerDownloadUrl } from '@/utils/utils';

export const getVersionMismatchDoc = () => {
  const serverDownloadUrl = getServerDownloadUrl(APP_VERSION);
  const guideHref = `${GITHUB_PAGES_BASE_PATH}internal/guide`;

  return `
  ## Version mismatch

  Current version: ${APP_VERSION}

  The version of the local server is different from the current version of the editor.

  Please install the latest version of the local server.

  1. Install the [local server](${serverDownloadUrl}).
  
  2. Unzip the file and run the binary file **as administrator**.

  For more information, please refer to the [guide](${guideHref}).
  `;
};
