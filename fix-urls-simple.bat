@echo off
echo Fixing hardcoded localhost URLs...

cd frontend\src

:: Use PowerShell with simpler syntax
powershell -Command "Get-ChildItem -Recurse -Include *.js,*.jsx | ForEach-Object { $content = Get-Content $_.FullName -Raw; $newContent = $content -replace 'http://localhost:5000/api', '/api' -replace 'http://localhost:5000', ''; if ($content -ne $newContent) { Set-Content $_.FullName $newContent -NoNewline; Write-Host \"Updated: $($_.FullName)\" } }"

echo.
echo Done! All localhost URLs have been replaced.
echo Please commit, push, and redeploy to Vercel.
pause