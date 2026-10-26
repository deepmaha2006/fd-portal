# reset-postgres-password.ps1
# Run AS ADMINISTRATOR in PowerShell.
# Stops the PostgreSQL service, switches to trust auth, resets the password, then restores.

param([string]$NewPassword = "fdportal123")

# ── 1. Must run as Administrator ─────────────────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Please RIGHT-CLICK PowerShell and choose 'Run as administrator', then try again."
    exit 1
}

# ── 2. Find PostgreSQL ────────────────────────────────────────────────────────
$PgVersion = $null
foreach ($v in @(18, 17, 16, 15, 14, 13)) {
    if (Test-Path "C:\Program Files\PostgreSQL\$v\bin\psql.exe") { $PgVersion = $v; break }
}
if (-not $PgVersion) { Write-Error "PostgreSQL not found in Program Files."; exit 1 }

$psql        = "C:\Program Files\PostgreSQL\$PgVersion\bin\psql.exe"
$pg_hba      = "C:\Program Files\PostgreSQL\$PgVersion\data\pg_hba.conf"
$ServiceName = "postgresql-x64-$PgVersion"

Write-Host "Found PostgreSQL $PgVersion  (service: $ServiceName)" -ForegroundColor Cyan

# ── 3. Backup original pg_hba.conf ───────────────────────────────────────────
Copy-Item $pg_hba "$pg_hba.bak" -Force
Write-Host "Backup saved to $pg_hba.bak"

# ── 4. Write a minimal trust pg_hba.conf — NO UTF-8 BOM ─────────────────────
#   PowerShell 5.1 Set-Content writes BOM, which breaks PostgreSQL.
#   Use [System.IO.File]::WriteAllText with an explicit no-BOM encoding instead.
$trustContent = "# Temporary trust for password reset`r`nlocal all all trust`r`nhost all all 127.0.0.1/32 trust`r`nhost all all ::1/128 trust`r`n"
$noBomUtf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($pg_hba, $trustContent, $noBomUtf8)
Write-Host "Wrote temporary trust pg_hba.conf (no BOM)"

# ── 5. Restart the service so PostgreSQL picks up the new pg_hba.conf ────────
Write-Host "Restarting $ServiceName ..."
try {
    Restart-Service -Name $ServiceName -Force -ErrorAction Stop
} catch {
    Write-Error "Could not restart service '$ServiceName': $_"
    # Restore backup before exiting
    Copy-Item "$pg_hba.bak" $pg_hba -Force
    exit 1
}
Start-Sleep -Seconds 4
Write-Host "Service restarted."

# ── 6. Change the postgres user password ─────────────────────────────────────
Write-Host "Setting postgres password to: $NewPassword"
$result = & $psql -U postgres -h 127.0.0.1 -c "ALTER USER postgres PASSWORD '$NewPassword';" 2>&1
Write-Host $result

# ── 7. Restore original pg_hba.conf ──────────────────────────────────────────
Copy-Item "$pg_hba.bak" $pg_hba -Force
Write-Host "Original pg_hba.conf restored."

# ── 8. Restart service again with real auth ───────────────────────────────────
Restart-Service -Name $ServiceName -Force
Start-Sleep -Seconds 3
Write-Host "Service restarted with original authentication rules."

# ── 9. Verify ────────────────────────────────────────────────────────────────
$check = & $psql -U postgres -h 127.0.0.1 "postgresql://postgres:${NewPassword}@127.0.0.1/postgres" -c "SELECT 'connection OK';" 2>&1
if ($check -match "connection OK") {
    Write-Host ""
    Write-Host "SUCCESS! Postgres password is now: $NewPassword" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run these commands next:" -ForegroundColor Cyan
    Write-Host "  npm run db:migrate:dev"
    Write-Host "  npm run db:seed"
    Write-Host "  npm run dev"
} else {
    Write-Host ""
    Write-Host "Password may have been set but verification failed. Try connecting manually:" -ForegroundColor Yellow
    Write-Host "  psql -U postgres -h 127.0.0.1 (enter password: $NewPassword)"
}
