import { APP_VERSION } from '@/constants';
import { getServerDownloadUrl } from '@/utils/utils';

export const getGuideDoc = () => {
  const serverDownloadUrl = getServerDownloadUrl(APP_VERSION);

  return `
  ## Guide (${APP_VERSION})

  Welcome to use the Markdown Editor.

  ## Install the local server

  To unlock the full features of the editor, you need to install the local server.

  1. Install the [local server](${serverDownloadUrl}).
  
  2. Unzip the file and run the binary file **as administrator**.

  :::warning
  The file will automatically register auto start when you open your computer.
  :::

  :::tip
  you can manage the server in terminal

  \`\`\`bash
  # checkout the help information
  $ mds -h

  # stop the server
  $ mds stop
  # checkout server status
  $ mds status

  # uninstall the server, this will remove the cli
  $ mds uninstall
  \`\`\`
  :::
  `;
};
