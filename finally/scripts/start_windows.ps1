#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Build
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ContainerName = "finally"
$ImageName = "finally"
$Port = 8000
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Build image if missing or -Build flag passed
$imageExists = docker image inspect $ImageName 2>$null
if ($Build -or -not $imageExists) {
    Write-Host "Building Docker image..."
    docker build -t $ImageName $ProjectRoot
}

# Check if container already running
$running = docker ps --filter "name=^${ContainerName}$" --format '{{.Names}}' 2>$null
if ($running -eq $ContainerName) {
    Write-Host "Container '$ContainerName' is already running at http://localhost:${Port}"
    exit 0
}

# Remove stopped container with same name if it exists
$exists = docker ps -a --filter "name=^${ContainerName}$" --format '{{.Names}}' 2>$null
if ($exists -eq $ContainerName) {
    docker rm $ContainerName | Out-Null
}

# Create .env if missing
$envFile = Join-Path $ProjectRoot ".env"
$envExample = Join-Path $ProjectRoot ".env.example"
if (-not (Test-Path $envFile)) {
    Write-Host "No .env found — copying from .env.example"
    Copy-Item $envExample $envFile
}

docker run -d `
    --name $ContainerName `
    -v finally-data:/app/db `
    -p "${Port}:8000" `
    --env-file $envFile `
    $ImageName

Write-Host "FinAlly is running at http://localhost:${Port}"
Start-Process "http://localhost:${Port}"
