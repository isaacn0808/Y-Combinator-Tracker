# PostgreSQL paths
$pgPath = "C:\Program Files\PostgreSQL\17\bin"
$pgDump = Join-Path $pgPath "pg_dump.exe"
$pgRestore = Join-Path $pgPath "pg_restore.exe"

# Source database details
$sourceHost = "localhost"
$sourceDb = "yc_tracker_db"
$sourceUser = "postgres"
$sourcePass = "Romance124"
$env:PGPASSWORD = $sourcePass

# Supabase database details
$destHost = "aws-0-us-east-2.pooler.supabase.com"
$destDb = "postgres"
$destUser = "postgres.haawerszcmyrqauaddme"
$destPass = "Romance124"

Write-Host "Creating backup of source database..."
& $pgDump -h $sourceHost -U $sourceUser -d $sourceDb -F c -f "db_backup.dump"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create backup"
    exit 1
}

$env:PGPASSWORD = $destPass
Write-Host "Restoring to Supabase..."
# First, try to drop all existing tables
& $pgRestore -h $destHost -U $destUser -d $destDb --clean --if-exists -F c "db_backup.dump"
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Restore completed with warnings. This is normal if some objects didn't exist."
}

Write-Host "Migration completed. Check your Supabase database to verify the data."
