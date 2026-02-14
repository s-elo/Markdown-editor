import { APP_VERSION } from '@/constants';
import { getServerDownloadUrl } from '@/utils/utils';

export const getServerInstallationGuide = () => {
  const serverDownloadUrl = getServerDownloadUrl(APP_VERSION) as string;

  return `
  # Please install the local server

  1. Install the [local server](${serverDownloadUrl}).
  
  2. Unzip the file and run the binary file.

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
