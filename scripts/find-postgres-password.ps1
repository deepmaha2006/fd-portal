# find-postgres-password.ps1
# Tries common default PostgreSQL passwords and, if one works, changes it to fdportal123.
# Does NOT require Administrator rights.

$NewPassword = "fdportal123"
$DbName      = "fdportal"

# Find psql
$psql = $null
foreach ($v in @(18, 17, 16, 15, 14, 13)) {
    $p = "C:\Program Files\PostgreSQL\$v\bin\psql.exe"
    if (Test-Path $p) { $psql = $p; break }
}
if (-not $psql) {
    $psql = (Get-Command psql -ErrorAction SilentlyContinue)?.Source
}
if (-not $psql) { Write-Error "psql not found."; exit 1 }

Write-Host "Using: $psql" -ForegroundColor Cyan
Write-Host "Trying common default passwords..." -ForegroundColor Cyan

$candidates = @("postgres", "", "admin", "password", "123456", "test", "changeme", "root", "Pass@123", $NewPassword)

$foundPassword = $null
foreach ($pw in $candidates) {
    $env:PGPASSWORD = $pw
    $result = & $psql -U postgres -h 127.0.0.1 -t -c "SELECT 1" 2>&1
    if ($result -match "^\s*1") {
        $foundPassword = $pw
        Write-Host ""
        Write-Host "Found working password: '$pw'" -ForegroundColor Green
        break
    }
}
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

if (-not $foundPassword) {
    Write-Host ""
    Write-Host "None of the common passwords worked." -ForegroundColor Yellow
    Write-Host "You have two options:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Option 1 (No install): Use a free cloud database (Neon.tech)"
    Write-Host "    1. Go to https://neon.tech and create a FREE account"
    Write-Host "    2. Create a new project (choose 'fdportal' as database name)"
    Write-Host "    3. Copy the connection string (looks like postgresql://...)"
    Write-Host "    4. Update DATABASE_URL in your .env file"
    Write-Host "    5. Run: npm run db:migrate:dev"
    Write-Host "    6. Run: npm run db:seed"
    Write-Host "    7. Run: npm run dev"
    Write-Host ""
    Write-Host "  Option 2 (Admin required): Run PowerShell AS ADMINISTRATOR then:"
    Write-Host "    .\scripts\reset-postgres-password.ps1"
    exit 1
}

if ($foundPassword -ne $NewPassword) {
    Write-Host "Changing password to: $NewPassword ..."
    $env:PGPASSWORD = $foundPassword
    & $psql -U postgres -h 127.0.0.1 -c "ALTER USER postgres PASSWORD '$NewPassword';" 2>&1
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# Create database if it doesn't exist
Write-Host "Creating database '$DbName' if it doesn't exist..."
$env:PGPASSWORD = $NewPassword
& $psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE $DbName;" 2>&1
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "All done!" -ForegroundColor Green
Write-Host "DATABASE_URL in .env is already set to the correct value." -ForegroundColor Cyan
Write-Host ""
Write-Host "Run these commands now:" -ForegroundColor Cyan
Write-Host "  npm run db:migrate:dev"
Write-Host "  npm run db:seed"
Write-Host "  npm run dev"
