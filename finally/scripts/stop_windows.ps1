#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ContainerName = "finally"

$running = docker ps --filter "name=^${ContainerName}$" --format '{{.Names}}' 2>$null
if ($running -eq $ContainerName) {
    Write-Host "Stopping container '$ContainerName'..."
    docker stop $ContainerName | Out-Null
    docker rm $ContainerName | Out-Null
    Write-Host "Container stopped. Data volume preserved."
} else {
    Write-Host "Container '$ContainerName' is not running."
}
