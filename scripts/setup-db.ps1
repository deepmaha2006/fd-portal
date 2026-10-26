# FD Portal — Database Setup Script
# Run from the project root: .\scripts\setup-db.ps1
param(
    [string]$Host = "localhost",
    [string]$Port = "5432",
    [string]$User = "postgres",
    [string]$DbName = "fdportal"
)

$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $psql)) {
    # Fallback to PATH
    $psql = (Get-Command psql -ErrorAction SilentlyContinue)?.Source
}
if (-not $psql) {
    Write-Host "ERROR: psql not found. Install PostgreSQL or add it to PATH." -ForegroundColor Red
    exit 1
}

Write-Host "Using psql: $psql" -ForegroundColor Cyan
Write-Host "Creating database '$DbName' on ${Host}:${Port} as user '$User'..." -ForegroundColor Cyan
Write-Host "(You will be prompted for the postgres password)" -ForegroundColor Yellow

& $psql -U $User -h $Host -p $Port -c "CREATE DATABASE $DbName;" postgres

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database '$DbName' created successfully." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Update DATABASE_URL in .env with your password"
    Write-Host "     Change: postgresql://postgres:password@localhost:5432/fdportal"
    Write-Host "     To:     postgresql://postgres:YOUR_REAL_PASSWORD@localhost:5432/fdportal"
    Write-Host ""
    Write-Host "  2. Run migrations:  npm run db:migrate:dev"
    Write-Host "  3. Seed dev data:   npm run db:seed"
    Write-Host "  4. Start the app:   npm run dev"
} else {
    Write-Host "Database may already exist, or connection failed." -ForegroundColor Yellow
    Write-Host "If the error is 'already exists', that's fine — continue with migrations."
}
