# Reacharr Local Agent Installer for Windows
# Run this script in PowerShell as Administrator

param(
    [string]$InstallPath = "$env:ProgramFiles\Reacharr\Agent",
    [switch]$Service = $true,
    [switch]$AutoStart = $true
)

Write-Host "🚀 Reacharr Local Agent Installer v1.0.0" -ForegroundColor Blue
Write-Host "Installing to: $InstallPath" -ForegroundColor Gray

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Create installation directory
if (!(Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Host "📁 Created installation directory" -ForegroundColor Green
}

# Download and extract agent
$downloadUrl = "https://github.com/reacharr/releases/latest/download/reacharr-agent-windows-v1.0.0.zip"
$tempZip = "$env:TEMP\reacharr-agent.zip"

try {
    Write-Host "📥 Downloading Reacharr Agent..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip -UseBasicParsing
    
    Write-Host "📦 Extracting files..." -ForegroundColor Yellow
    Expand-Archive -Path $tempZip -DestinationPath $InstallPath -Force
    
    Remove-Item $tempZip -Force
} catch {
    Write-Host "❌ Failed to download agent: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Create configuration
$envPath = "$InstallPath\.env"
if (!(Test-Path $envPath)) {
    Copy-Item "$InstallPath\.env.example" $envPath
    Write-Host "📝 Created configuration file: $envPath" -ForegroundColor Green
    Write-Host "⚠️  Please edit $envPath with your settings before starting the agent" -ForegroundColor Yellow
}

# Install as Windows Service
if ($Service) {
    Write-Host "🔧 Installing Windows Service..." -ForegroundColor Yellow
    
    $serviceName = "ReacharrAgent"
    $exePath = "$InstallPath\reacharr-agent-windows.exe"
    
    # Stop existing service if running
    if (Get-Service $serviceName -ErrorAction SilentlyContinue) {
        Stop-Service $serviceName -Force
        & sc.exe delete $serviceName
        Start-Sleep 2
    }
    
    # Create new service
    & sc.exe create $serviceName binPath= "\"$exePath\"" start= auto
    & sc.exe description $serviceName "Reacharr Local Agent - Connects local media servers to Reacharr cloud"
    
    if ($AutoStart) {
        Write-Host "▶️  Starting service..." -ForegroundColor Green
        Start-Service $serviceName
        
        # Check service status
        $service = Get-Service $serviceName
        if ($service.Status -eq "Running") {
            Write-Host "✅ Reacharr Agent service is running!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Service installed but not running. Check configuration and start manually." -ForegroundColor Yellow
        }
    }
}

# Create desktop shortcuts
$WshShell = New-Object -comObject WScript.Shell
$desktopPath = [System.Environment]::GetFolderPath('Desktop')

# Start agent shortcut
$shortcut = $WshShell.CreateShortcut("$desktopPath\Start Reacharr Agent.lnk")
$shortcut.TargetPath = "$InstallPath\start.bat"
$shortcut.WorkingDirectory = $InstallPath
$shortcut.Description = "Start Reacharr Local Agent"
$shortcut.Save()

# Configuration shortcut
$shortcut = $WshShell.CreateShortcut("$desktopPath\Configure Reacharr Agent.lnk")
$shortcut.TargetPath = "notepad.exe"
$shortcut.Arguments = "$InstallPath\.env"
$shortcut.Description = "Edit Reacharr Agent Configuration"
$shortcut.Save()

Write-Host ""
Write-Host "🎉 Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Edit configuration: $envPath" -ForegroundColor White
Write-Host "2. Add Firebase service account: $InstallPath\firebase-service-account.json" -ForegroundColor White
if ($Service) {
    Write-Host "3. The agent service will start automatically" -ForegroundColor White
} else {
    Write-Host "3. Run the agent: $InstallPath\start.bat" -ForegroundColor White
}
Write-Host ""
Write-Host "Documentation: https://docs.reacharr.com" -ForegroundColor Gray
Write-Host "Support: https://discord.gg/reacharr" -ForegroundColor Gray

Read-Host "Press Enter to exit"