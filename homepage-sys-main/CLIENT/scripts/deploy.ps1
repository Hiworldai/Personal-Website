$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ArchiveDir = "D:\deploy"
$ArchivePath = Join-Path $ArchiveDir "personal-site.tgz"
$KeyPath = "C:\Users\Administrator\.ssh\aliyun_admin_ed25519"
$Server = "admin@8.136.21.49"
$RemoteArchive = "/srv/apps/personal-site.tgz"

New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null

Push-Location $ProjectRoot
try {
  npm run build

  if (Test-Path $ArchivePath) {
    Remove-Item -Force $ArchivePath
  }

  tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=responsive-report --exclude=.codex-run -czf $ArchivePath -C $ProjectRoot .
  scp -i $KeyPath $ArchivePath "${Server}:$RemoteArchive"

  $remoteScript = [string]::Join("`n", @(
    'set -euo pipefail',
    'APP=/srv/apps/personal-site',
    'RELEASE=$APP/releases/$(date +%Y%m%d%H%M%S)',
    'mkdir -p "$RELEASE"',
    'tar -xzf /srv/apps/personal-site.tgz -C "$RELEASE"',
    'ln -sfnT "$RELEASE" "$APP/current"',
    'chown -R admin:admin "$APP"',
    'cd "$APP/current"',
    'npm ci',
    'npm run build',
    'npm prune --omit=dev',
    'node --check server/index.js',
    'sudo systemctl restart personal-site',
    'sudo systemctl restart nginx'
  ))

  $remoteScript | ssh -i $KeyPath $Server "bash -s"
  ssh -i $KeyPath $Server "curl -sS --max-time 10 http://127.0.0.1/api/health"
}
finally {
  Pop-Location
}
