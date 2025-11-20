# PowerShell script to download and install rclone on Windows
# Run this script as Administrator: Right-click -> Run with PowerShell

Write-Host "Installing rclone for Windows..." -ForegroundColor Green

# Create temp directory
$tempDir = "$env:TEMP\rclone-install"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Download rclone
Write-Host "Downloading rclone..." -ForegroundColor Yellow
$rcloneUrl = "https://github.com/rclone/rclone/releases/latest/download/rclone-v1.66.0-windows-amd64.zip"
$zipFile = "$tempDir\rclone.zip"

try {
    Invoke-WebRequest -Uri $rcloneUrl -OutFile $zipFile -UseBasicParsing
    Write-Host "Download complete!" -ForegroundColor Green
} catch {
    Write-Host "Failed to download. Trying alternative method..." -ForegroundColor Yellow
    # Try getting latest version URL
    $latestUrl = "https://api.github.com/repos/rclone/rclone/releases/latest"
    $response = Invoke-RestMethod -Uri $latestUrl
    $downloadUrl = ($response.assets | Where-Object { $_.name -like "*windows-amd64.zip" }).browser_download_url
    
    if ($downloadUrl) {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
        Write-Host "Download complete!" -ForegroundColor Green
    } else {
        Write-Host "Error: Could not download rclone automatically." -ForegroundColor Red
        Write-Host "Please download manually from: https://rclone.org/downloads/" -ForegroundColor Yellow
        exit 1
    }
}

# Extract rclone
Write-Host "Extracting rclone..." -ForegroundColor Yellow
Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force

# Find rclone.exe
$rcloneExe = Get-ChildItem -Path $tempDir -Filter "rclone.exe" -Recurse | Select-Object -First 1

if (-not $rcloneExe) {
    Write-Host "Error: rclone.exe not found in archive." -ForegroundColor Red
    exit 1
}

# Install to Program Files
$installDir = "C:\Program Files\rclone"
Write-Host "Installing to $installDir..." -ForegroundColor Yellow

# Create installation directory
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

# Copy rclone.exe
Copy-Item -Path $rcloneExe.FullName -Destination "$installDir\rclone.exe" -Force

# Add to PATH (current user)
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$installDir", "User")
    Write-Host "Added rclone to PATH (User)" -ForegroundColor Green
}

# Also add to system PATH if running as admin
if ([Security.Principal.WindowsIdentity]::GetCurrent().Groups -contains "S-1-5-32-544") {
    $systemPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($systemPath -notlike "*$installDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$systemPath;$installDir", "Machine")
        Write-Host "Added rclone to PATH (System)" -ForegroundColor Green
    }
}

# Cleanup
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "`nInstallation complete!" -ForegroundColor Green
Write-Host "rclone has been installed to: $installDir" -ForegroundColor Cyan
Write-Host "`nIMPORTANT: Please close and reopen your terminal/PowerShell for PATH changes to take effect." -ForegroundColor Yellow
Write-Host "Then verify installation with: rclone version" -ForegroundColor Yellow

