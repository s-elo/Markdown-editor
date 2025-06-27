%For window shortcut%
title doc-server.bat

%switch to the script path%
cd /d %~dp0

%run the script%
npm run build && npm run open
