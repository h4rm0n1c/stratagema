param([string]$HelperTarget = "")

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$pluginRoot = Join-Path $repoRoot "streamdeck_plugin"
$dist = Join-Path $repoRoot "dist"
$pluginUuid = "com.stratagema.sdplugin"
$buildDir = Join-Path $dist "$pluginUuid.sdPlugin"

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE"
    }
}

Push-Location $repoRoot
try {
    $cargoArgs = @("build", "--release", "-p", "macro_stub")
    $helperDir = Join-Path $repoRoot "target/release"
    if ($HelperTarget) {
        if ($HelperTarget -notlike "*-windows-*") {
            throw "The plugin requires a Windows helper target."
        }
        $cargoArgs += @("--target", $HelperTarget)
        $helperDir = Join-Path $repoRoot "target/$HelperTarget/release"
    } elseif (-not $IsWindows) {
        throw "On non-Windows hosts supply -HelperTarget x86_64-pc-windows-gnu."
    }
    Invoke-Checked cargo $cargoArgs
    Invoke-Checked node @("$pluginRoot/scripts/generate_commands_json.mjs")

    $helper = Join-Path $helperDir "macro_stub.exe"
    if (-not (Test-Path $helper)) {
        throw "Required Windows helper is missing: $helper"
    }

    if (Test-Path $buildDir) { Remove-Item $buildDir -Recurse -Force }
    New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
    foreach ($file in @("manifest.json", "plugin.js", "commands.txt", "commands.json", "package.json", "package-lock.json", "shared", "property-inspector")) {
        Copy-Item (Join-Path $pluginRoot $file) $buildDir -Recurse -Force
    }
    Copy-Item (Join-Path $repoRoot "icons") $buildDir -Recurse -Force
    $helperDestination = Join-Path $buildDir "helper"
    New-Item -ItemType Directory -Path $helperDestination -Force | Out-Null
    Copy-Item $helper (Join-Path $helperDestination "stratagema_macro_helper.exe")

    # Install runtime dependencies into the staged plugin only. Keep the pinned
    # packaging CLI in the source directory, outside the shipped installer.
    Invoke-Checked npm @("ci", "--omit=dev", "--prefix", $buildDir)
    Invoke-Checked npm @("run", "pack", "--prefix", $pluginRoot)
    $version = (Get-Content (Join-Path $buildDir "manifest.json") -Raw | ConvertFrom-Json).Version
    $filename = "$pluginUuid-$version.streamDeckPlugin"
    $installer = Join-Path $dist $filename
    Copy-Item (Join-Path $dist "$pluginUuid.streamDeckPlugin") $installer -Force
    $hash = (Get-FileHash $installer -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $filename" | Set-Content (Join-Path $dist "SHA256SUMS.txt") -Encoding utf8NoBOM
    Write-Host "Installer: $installer"
} finally {
    Pop-Location
}
