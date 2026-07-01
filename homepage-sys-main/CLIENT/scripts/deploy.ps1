$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ArchiveDir = "D:\deploy"
$ArchivePath = Join-Path $ArchiveDir "personal-site.tgz"
$KeyPath = Join-Path $env:USERPROFILE ".ssh\id_ed25519"
$Server = "root@8.136.21.49"
$RemoteArchive = "/srv/apps/personal-site.tgz"

New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null

Push-Location $ProjectRoot
try {
  $localNodeVersion = $null
  try {
    $localNodeVersion = & node -p "process.versions.node" 2>$null
  }
  catch {
    $localNodeVersion = $null
  }

  if ($localNodeVersion -and ([version]$localNodeVersion -ge [version]"20.19.0")) {
    npm run build
  }
  else {
    Write-Warning "Skipping local build because Node.js 20.19+ is required. The server will build the release."
  }

  if (Test-Path $ArchivePath) {
    Remove-Item -Force $ArchivePath
  }

  tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=responsive-report --exclude=.codex-run -czf $ArchivePath -C $ProjectRoot .
  scp -i $KeyPath $ArchivePath "${Server}:$RemoteArchive"

  $remoteScript = [string]::Join("`n", @(
    'set -euo pipefail',
    'APP=/srv/apps/personal-site',
    'RELEASE=$APP/releases/$(date +%Y%m%d%H%M%S)',
    'mkdir -p "$RELEASE" "$APP/shared"',
    'if [ ! -f "$APP/shared/.env" ] && [ -f "$APP/current/.env" ]; then cp "$APP/current/.env" "$APP/shared/.env"; fi',
    'tar -xzf /srv/apps/personal-site.tgz -C "$RELEASE"',
    'if [ -f "$APP/shared/.env" ]; then ln -sfn "$APP/shared/.env" "$RELEASE/.env"; fi',
    'ln -sfnT "$RELEASE" "$APP/current"',
    'chown -R admin:admin "$APP"',
    'cd "$APP/current"',
    'npm ci',
    'npm run build',
    'npm prune --omit=dev',
    'node --check server/index.js',
    'systemctl restart personal-site',
    'systemctl restart nginx'
  ))

  ($remoteScript -replace "`r", "") | ssh -i $KeyPath $Server "tr -d '\r' | bash -s"
  ssh -i $KeyPath $Server "curl -sS --max-time 10 http://127.0.0.1:5177/api/health"
}
finally {
  Pop-Location
}
