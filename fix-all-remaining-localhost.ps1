# Fix ALL remaining hardcoded localhost URLs
Set-Location "frontend\src"

# Files with simple API_BASE and BASE_URL constants
$simpleFiles = @(
    "app\admin\election\create\[id]\ballot\page.jsx",
    "app\student\elections\[id]\receipt\page.jsx",
    "app\superadmin\election\create\[id]\ballot\page.jsx",
    "app\superadmin\election\[id]\page.jsx",
    "app\admin\election\[id]\page.jsx",
    "app\student\elections\[id]\results\page.jsx"
)

# Fix simple constant declarations
foreach ($file in $simpleFiles) {
    if (Test-Path $file) {
        Write-Host "Updating: $file"
        $content = Get-Content $file -Raw
        $content = $content -replace "const API_BASE = 'http://localhost:5000/api';", "const API_BASE = '/api';"
        $content = $content -replace "const BASE_URL = 'http://localhost:5000';", "const BASE_URL = '';"
        Set-Content $file -Value $content -NoNewline
        Write-Host "✓ Updated: $file"
    }
}

# Files with multiple hardcoded URLs in axios calls
$complexFiles = @(
    "app\admin\election\[id]\edit\page.jsx",
    "app\superadmin\election\[id]\edit\page.jsx",
    "app\superadmin\election\create\[id]\ballot\page.jsx"
)

# Fix hardcoded URLs in axios calls
foreach ($file in $complexFiles) {
    if (Test-Path $file) {
        Write-Host "Updating complex file: $file"
        $content = Get-Content $file -Raw
        
        # Replace all hardcoded localhost URLs with relative paths
        $content = $content -replace "http://localhost:5000/api/", "/api/"
        $content = $content -replace "http://localhost:5000/", "/"
        $content = $content -replace '"http://localhost:5000"', '"/"'
        $content = $content -replace "'http://localhost:5000'", "'/'"
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "✓ Updated complex file: $file"
    }
}

Write-Host "\n🎉 ALL localhost URLs have been fixed!"