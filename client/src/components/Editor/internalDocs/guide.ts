import { APP_VERSION } from '@/constants';
import { getServerDownloadUrl } from '@/utils/utils';

export const getGuideDoc = () => {
  const serverDownloadUrl = getServerDownloadUrl(APP_VERSION);

  return `
  # Guide (${APP_VERSION})

  Welcome to use the online version of [Markdown Editor](https://github.com/s-elo/Markdown-editor).

  ## Install the local server

  To unlock the full features of the editor, you need to install the local server.

  1. Install the [local server](${serverDownloadUrl}).
  
  2. Unzip the file and run the binary file.

  > It will also open the local client in your default browser.

  :::tip
  For MacOS, rignt click to open the App.

  For windows, right click to run the executable as **administrator**.
  :::

  ## Setup Workspace

  Now you should be able to connect to local server.

  Open the Menu/Settings to select a folder as workspace.

  ## Manage local server

  you can manage the server in terminal

  \`\`\`bash
  # checkout the help information
  $ mds -h

  # stop the server
  $ mds stop
  # checkout server status
  $ mds status
  \`\`\`
  `;
};

export const getLocalModeGuideDoc = () => {
  return `
  # Guide (${APP_VERSION})

  Welcome to use the [Markdown Editor](https://github.com/s-elo/Markdown-editor).

  ## Setup Workspace

  Since you can open this editor, you should be able to connect to local server.

  Open the Menu/Settings to select a folder as workspace.

  ## Manage local server

  you can manage the server in terminal

  \`\`\`bash
  # checkout the help information
  $ mds -h

  # stop the server
  $ mds stop
  # checkout server status
  $ mds status
  \`\`\`
  `;
};
