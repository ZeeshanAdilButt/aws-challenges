# Dot-source this file:  . .\toolkit\env.ps1
# It points everything at the emulator and removes anything that could reach a real account.
$root = Split-Path -Parent $PSScriptRoot
$env:AWS_ENDPOINT_URL = "http://localhost:5000"
$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:AWS_REGION = "us-east-1"
$env:AWS_EC2_METADATA_DISABLED = "true"
$env:AWS_CONFIG_FILE = Join-Path $root ".aws-empty\config"
$env:AWS_SHARED_CREDENTIALS_FILE = Join-Path $root ".aws-empty\credentials"
foreach ($name in "AWS_PROFILE", "AWS_DEFAULT_PROFILE", "AWS_SESSION_TOKEN", "AWS_IGNORE_CONFIGURED_ENDPOINT_URLS") {
  Remove-Item "Env:$name" -ErrorAction SilentlyContinue
}
Write-Host "Environment set for the emulator at $env:AWS_ENDPOINT_URL (fake keys, empty config files)."
