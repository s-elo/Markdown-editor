%For window shortcut%

%switch to the script path%
cd /d %~dp0

start /min cmd /c "cd client && npm run start"

%run the script%
tsc && cd dist && node server.js
