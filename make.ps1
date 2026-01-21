<#
.SYNOPSIS
    D&D 5e Character Builder - Build Script for Windows
.DESCRIPTION
    PowerShell equivalent of Makefile for Windows users.
    Run: .\make.ps1 <command>
.EXAMPLE
    .\make.ps1 all
    .\make.ps1 dev
    .\make.ps1 help
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "all", "check", "check-docker", "check-node", "check-env",
        "setup", "install", "install-clean",
        "db-start", "db-stop", "db-reset", "db-push", "db-seed", "db-studio",
        "dev", "build", "start", "lint", "quick-start",
        "clean", "clean-all", "help"
    )]
    [string]$Command = "help"
)

# Configuration
$REQUIRED_NODE_MAJOR = 24
$REQUIRED_NODE_MINOR = 0
$REQUIRED_NODE_PATCH = 0

# Helper functions
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "  $Message" -ForegroundColor Cyan }

# ============================================================================
# CHECK FUNCTIONS
# ============================================================================

function Test-Docker {
    Write-Host "Checking Docker installation..."
    
    try {
        $null = docker --version 2>$null
        if ($LASTEXITCODE -ne 0) { throw }
        Write-Success "Docker is installed"
    }
    catch {
        Write-Error "Docker is not installed. Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
        return $false
    }
    
    Write-Host "Checking Docker Compose installation..."
    try {
        $null = docker compose version 2>$null
        if ($LASTEXITCODE -ne 0) {
            $null = docker-compose --version 2>$null
            if ($LASTEXITCODE -ne 0) { throw }
        }
        Write-Success "Docker Compose is installed"
    }
    catch {
        Write-Error "Docker Compose is not installed. Please install Docker Desktop or Docker Compose: https://docs.docker.com/compose/install/"
        return $false
    }
    
    return $true
}

function Test-NodeVersion {
    Write-Host "Checking Node.js installation..."
    
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -ne 0) { throw }
    }
    catch {
        Write-Error "Node.js is not installed. Please install Node.js v$REQUIRED_NODE_MAJOR.$REQUIRED_NODE_MINOR.$REQUIRED_NODE_PATCH or higher: https://nodejs.org/"
        return $false
    }
    
    # Parse version (v24.0.0 -> 24, 0, 0)
    $version = $nodeVersion -replace '^v', ''
    $parts = $version.Split('.')
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]($parts[2] -replace '[^0-9].*', '')
    
    $isValid = $false
    if ($major -gt $REQUIRED_NODE_MAJOR) {
        $isValid = $true
    }
    elseif ($major -eq $REQUIRED_NODE_MAJOR) {
        if ($minor -gt $REQUIRED_NODE_MINOR) {
            $isValid = $true
        }
        elseif ($minor -eq $REQUIRED_NODE_MINOR -and $patch -ge $REQUIRED_NODE_PATCH) {
            $isValid = $true
        }
    }
    
    if (-not $isValid) {
        Write-Error "Node.js version $nodeVersion is too old. Required: v$REQUIRED_NODE_MAJOR.$REQUIRED_NODE_MINOR.$REQUIRED_NODE_PATCH+"
        return $false
    }
    
    Write-Success "Node.js $nodeVersion is installed"
    return $true
}

function Test-EnvFile {
    Write-Host "Checking environment configuration..."
    
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Creating from .env.example..."
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Success "Created .env from .env.example"
        }
        else {
            Write-Error ".env.example not found. Please create .env manually."
            return $false
        }
    }
    else {
        Write-Success ".env file exists"
    }
    
    return $true
}

function Invoke-Check {
    $dockerOk = Test-Docker
    $nodeOk = Test-NodeVersion
    $envOk = Test-EnvFile
    
    if ($dockerOk -and $nodeOk -and $envOk) {
        Write-Success "All prerequisite checks passed!"
        return $true
    }
    return $false
}

# ============================================================================
# SETUP & INSTALLATION
# ============================================================================

function Invoke-Install {
    Write-Host "Installing npm dependencies..."
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed"
    }
}

function Invoke-InstallClean {
    Write-Host "Removing existing node_modules..."
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules"
    }
    Write-Host "Installing fresh npm dependencies..."
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Clean installation complete"
    }
}

function Invoke-Setup {
    if (Invoke-Check) {
        Invoke-Install
        Write-Success "Project setup complete!"
    }
}

# ============================================================================
# DATABASE COMMANDS
# ============================================================================

function Invoke-DbStart {
    Write-Host "Starting database containers..."
    
    # Try docker compose first, then docker-compose
    docker compose up -d 2>$null
    if ($LASTEXITCODE -ne 0) {
        docker-compose up -d
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database started"
        Write-Info "PostgreSQL: localhost:5432"
        Write-Info "Adminer:    http://localhost:8080"
    }
}

function Invoke-DbStop {
    Write-Host "Stopping database containers..."
    
    docker compose down 2>$null
    if ($LASTEXITCODE -ne 0) {
        docker-compose down
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database stopped"
    }
}

function Invoke-DbReset {
    Write-Warning "This will delete all database data. Proceed? (y/N)"
    $response = Read-Host
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "Resetting database..."
        
        docker compose down -v 2>$null
        if ($LASTEXITCODE -ne 0) {
            docker-compose down -v
        }
        
        docker compose up -d 2>$null
        if ($LASTEXITCODE -ne 0) {
            docker-compose up -d
        }
        
        Write-Success "Database reset complete"
    }
    else {
        Write-Host "Database reset cancelled."
    }
}

function Invoke-DbPush {
    Write-Host "Pushing schema to database..."
    npx drizzle-kit push
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Schema pushed to database"
    }
}

function Invoke-DbSeed {
    Write-Host "Seeding database with SRD data..."
    npx tsx scripts/seed.ts
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database seeded"
    }
}

function Invoke-DbStudio {
    Write-Host "Opening Drizzle Studio..."
    npx drizzle-kit studio
}

# ============================================================================
# DEVELOPMENT & BUILD
# ============================================================================

function Invoke-Dev {
    Write-Host "Starting development server..."
    npm run dev
}

function Invoke-Build {
    if (Invoke-Check) {
        Write-Host "Building production application..."
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Build complete"
        }
    }
}

function Invoke-Start {
    Write-Host "Starting production server..."
    npm run start
}

function Invoke-Lint {
    Write-Host "Running ESLint..."
    npm run lint
}

function Invoke-QuickStart {
    Invoke-DbStart
    Invoke-Dev
}

# ============================================================================
# UTILITY
# ============================================================================

function Invoke-Clean {
    Write-Host "Cleaning build artifacts..."
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force ".next"
    }
    if (Test-Path "node_modules\.cache") {
        Remove-Item -Recurse -Force "node_modules\.cache"
    }
    Write-Success "Clean complete"
}

function Invoke-CleanAll {
    Invoke-Clean
    Write-Host "Removing node_modules..."
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules"
    }
    Write-Success "Full clean complete"
}

function Invoke-All {
    if (Invoke-Check) {
        Invoke-Install
        Invoke-DbStart
        Start-Sleep -Seconds 3  # Wait for DB to be ready
        Invoke-DbPush
        Invoke-DbSeed
        Write-Success "Setup complete! Run '.\make.ps1 dev' to start the development server."
    }
}

# ============================================================================
# HELP
# ============================================================================

function Show-Help {
    Write-Host ""
    Write-Host "D&D 5e Character Builder - Available Commands" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "First-time Setup:" -ForegroundColor Green
    Write-Host "  .\make.ps1 all           - Complete setup (checks, install, db, seed)"
    Write-Host "  .\make.ps1 setup         - Install dependencies and run checks"
    Write-Host ""
    Write-Host "Checks:" -ForegroundColor Green
    Write-Host "  .\make.ps1 check         - Run all prerequisite checks"
    Write-Host "  .\make.ps1 check-docker  - Verify Docker/Docker Compose installation"
    Write-Host "  .\make.ps1 check-node    - Verify Node.js version (v$REQUIRED_NODE_MAJOR.$REQUIRED_NODE_MINOR.$REQUIRED_NODE_PATCH+)"
    Write-Host "  .\make.ps1 check-env     - Verify .env file exists"
    Write-Host ""
    Write-Host "Database:" -ForegroundColor Green
    Write-Host "  .\make.ps1 db-start      - Start PostgreSQL container"
    Write-Host "  .\make.ps1 db-stop       - Stop PostgreSQL container"
    Write-Host "  .\make.ps1 db-reset      - Reset database (deletes all data)"
    Write-Host "  .\make.ps1 db-push       - Push Drizzle schema to database"
    Write-Host "  .\make.ps1 db-seed       - Seed database with SRD data"
    Write-Host "  .\make.ps1 db-studio     - Open Drizzle Studio"
    Write-Host ""
    Write-Host "Development:" -ForegroundColor Green
    Write-Host "  .\make.ps1 dev           - Start development server"
    Write-Host "  .\make.ps1 build         - Build production application"
    Write-Host "  .\make.ps1 start         - Start production server"
    Write-Host "  .\make.ps1 lint          - Run ESLint"
    Write-Host "  .\make.ps1 quick-start   - Quick start (db + dev server)"
    Write-Host ""
    Write-Host "Utility:" -ForegroundColor Green
    Write-Host "  .\make.ps1 install       - Install npm dependencies"
    Write-Host "  .\make.ps1 install-clean - Clean install dependencies"
    Write-Host "  .\make.ps1 clean         - Clean build artifacts"
    Write-Host "  .\make.ps1 clean-all     - Full clean including node_modules"
    Write-Host "  .\make.ps1 help          - Show this help message"
    Write-Host ""
}

# ============================================================================
# MAIN DISPATCHER
# ============================================================================

switch ($Command) {
    "all"           { Invoke-All }
    "check"         { Invoke-Check }
    "check-docker"  { Test-Docker }
    "check-node"    { Test-NodeVersion }
    "check-env"     { Test-EnvFile }
    "setup"         { Invoke-Setup }
    "install"       { Invoke-Install }
    "install-clean" { Invoke-InstallClean }
    "db-start"      { Invoke-DbStart }
    "db-stop"       { Invoke-DbStop }
    "db-reset"      { Invoke-DbReset }
    "db-push"       { Invoke-DbPush }
    "db-seed"       { Invoke-DbSeed }
    "db-studio"     { Invoke-DbStudio }
    "dev"           { Invoke-Dev }
    "build"         { Invoke-Build }
    "start"         { Invoke-Start }
    "lint"          { Invoke-Lint }
    "quick-start"   { Invoke-QuickStart }
    "clean"         { Invoke-Clean }
    "clean-all"     { Invoke-CleanAll }
    "help"          { Show-Help }
    default         { Show-Help }
}
