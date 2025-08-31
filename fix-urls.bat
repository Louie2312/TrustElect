@echo off
echo Fixing hardcoded localhost URLs...

cd frontend\src

:: Replace hardcoded API_BASE declarations
powershell -Command "(Get-Content -Path '**\*.js' -Recurse) -replace \"const API_BASE = 'http://localhost:5000/api';\", \"const API_BASE = '/api';\" | Set-Content -Path '**\*.js'"
powershell -Command "(Get-Content -Path '**\*.jsx' -Recurse) -replace \"const API_BASE = 'http://localhost:5000/api';\", \"const API_BASE = '/api';\" | Set-Content -Path '**\*.jsx'"

:: Replace hardcoded BASE_URL declarations
powershell -Command "(Get-Content -Path '**\*.js' -Recurse) -replace \"const BASE_URL = 'http://localhost:5000';\", \"const BASE_URL = '';\" | Set-Content -Path '**\*.js'"
powershell -Command "(Get-Content -Path '**\*.jsx' -Recurse) -replace \"const BASE_URL = 'http://localhost:5000';\", \"const BASE_URL = '';\" | Set-Content -Path '**\*.jsx'"

echo Done! Please review the changes and test.