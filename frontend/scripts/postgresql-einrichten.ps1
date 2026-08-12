param()

$ErrorActionPreference = "Stop"

$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$createdb = "C:\Program Files\PostgreSQL\17\bin\createdb.exe"
$projektOrdner = Split-Path -Parent $PSScriptRoot
$envDatei = Join-Path $projektOrdner ".env"

if (-not (Test-Path -LiteralPath $psql)) {
  throw "PostgreSQL 17 wurde nicht gefunden."
}

$sicheresPasswort = Read-Host "PostgreSQL-Passwort fuer den Benutzer postgres" -AsSecureString
$zeiger = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sicheresPasswort)

try {
  $passwort = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($zeiger)
  $env:PGPASSWORD = $passwort

  & $psql -h localhost -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -tAc "SELECT 1" | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "Die Verbindung ist fehlgeschlagen. Bitte pruefe dein PostgreSQL-Passwort."
  }

  $datenbankAbfrage = & $psql -h localhost -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_database WHERE datname = 'nova_erp'"

  if ($LASTEXITCODE -ne 0) {
    throw "Die vorhandenen Datenbanken konnten nicht geprueft werden."
  }

  $vorhanden = if ($null -eq $datenbankAbfrage) { "" } else { ([string]$datenbankAbfrage).Trim() }

  if ($vorhanden -ne "1") {
    & $createdb -h localhost -p 5432 -U postgres -E UTF8 -T template0 nova_erp

    if ($LASTEXITCODE -ne 0) {
      throw "Die NOVA-Datenbank konnte nicht erstellt werden."
    }
  }

  $kodiertesPasswort = [Uri]::EscapeDataString($passwort)
  $verbindung = "postgresql://postgres:$kodiertesPasswort@localhost:5432/nova_erp?schema=public"
  $inhalt = if (Test-Path -LiteralPath $envDatei) { Get-Content -LiteralPath $envDatei -Raw } else { "" }

  if ($inhalt -match '(?m)^DATABASE_URL=.*$') {
    $inhalt = $inhalt -replace '(?m)^DATABASE_URL=.*$', "DATABASE_URL=`"$verbindung`""
  } else {
    $inhalt = $inhalt.TrimEnd() + "`r`nDATABASE_URL=`"$verbindung`"`r`n"
  }

  Set-Content -LiteralPath $envDatei -Value $inhalt -Encoding utf8

  & $psql -h localhost -p 5432 -U postgres -d nova_erp -v ON_ERROR_STOP=1 -tAc "SELECT current_database()"
  Write-Host "NOVA PostgreSQL wurde erfolgreich eingerichtet." -ForegroundColor Green
} finally {
  $env:PGPASSWORD = $null
  $passwort = $null
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($zeiger)
}
