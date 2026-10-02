param([int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$pythonExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (!(Test-Path -LiteralPath $pythonExe)) { throw 'Falta .venv. Consulta la instalación en README.md.' }
if (!(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'frontend\dist\index.html'))) { throw 'Compila el frontend con npm ci y npm run build.' }
Push-Location (Join-Path $PSScriptRoot 'backend')
try {
    Write-Host "Project Office Hub: http://127.0.0.1:$Port (Ctrl+C para detener)"
    & $pythonExe -m uvicorn app.main:app --host 127.0.0.1 --port $Port
    if ($LASTEXITCODE -ne 0) { throw 'El servidor terminó con un error.' }
} finally { Pop-Location }
