# Comprehensive script to fix all hardcoded localhost URLs
Set-Location "frontend\src"

# Get all JS and JSX files recursively
$files = Get-ChildItem -Path . -Include *.js,*.jsx -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Replace various patterns of hardcoded localhost URLs
    $content = $content -replace "const API_BASE = ['\"]http://localhost:5000/api['\"];", "const API_BASE = '/api';"
    $content = $content -replace "const BASE_URL = ['\"]http://localhost:5000['\"];", "const BASE_URL = '';"
    $content = $content -replace "const API_URL = ['\"]http://localhost:5000['\"];", "const API_URL = '';"
    
    # Replace axios baseURL configurations
    $content = $content -replace "baseURL: ['\"]http://localhost:5000['\"],", "baseURL: '',"
    $content = $content -replace "baseURL: ['\"]http://localhost:5000/api['\"],", "baseURL: '/api',"
    
    # Replace direct API calls in quotes
    $content = $content -replace "['\"]http://localhost:5000/api/([^'\"]*)['\"];", "'/api/`$1';"
    $content = $content -replace "['\"]http://localhost:5000/([^'\"]*)['\"];", "'/`$1';"
    
    # Replace fetch and axios calls
    $content = $content -replace "fetch\(['\"]http://localhost:5000/api/([^'\"]*)['\"]\)", "fetch('/api/`$1')"
    $content = $content -replace "fetch\(['\"]http://localhost:5000/([^'\"]*)['\"]\)", "fetch('/`$1')"
    $content = $content -replace "axios\.(get|post|put|delete|patch)\(['\"]http://localhost:5000/api/([^'\"]*)['\"]\)", "axios.`$1('/api/`$2')"
    $content = $content -replace "axios\.(get|post|put|delete|patch)\(['\"]http://localhost:5000/([^'\"]*)['\"]\)", "axios.`$1('/`$2')"
    
    # Replace template literals
    $content = $content -replace "`\`http://localhost:5000/api/([^`]*)`\`", "``/api/`$1``"
    $content = $content -replace "`\`http://localhost:5000/([^`]*)`\`", "``/`$1``"
    
    # Replace image src URLs
    $content = $content -replace "src=['\"]http://localhost:5000/([^'\"]*)['\"];", "src='/`$1';"
    
    # Only write if content changed
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "\nURL replacement complete! All localhost:5000 URLs have been replaced with relative paths."
Write-Host "Please commit, push, and redeploy to Vercel."