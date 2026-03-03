# Setup script for Personalized Scheme Recommendation System (Windows)

Write-Host "🚀 Setting up Personalized Scheme Recommendation System..." -ForegroundColor Green

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js >= 18.0.0" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python is not installed. Please install Python >= 3.10" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

# Install Node.js dependencies
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Cyan
npm install

# Setup Python virtual environment
Write-Host "🐍 Setting up Python virtual environment..." -ForegroundColor Cyan
Set-Location ml-pipeline
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
pip install -e ".[dev]"
deactivate
Set-Location ..

# Copy environment files
Write-Host "📝 Setting up environment files..." -ForegroundColor Cyan
if (-not (Test-Path backend\.env)) {
    Copy-Item backend\.env.example backend\.env
    Write-Host "✅ Created backend/.env" -ForegroundColor Green
}

if (-not (Test-Path ml-pipeline\.env)) {
    Copy-Item ml-pipeline\.env.example ml-pipeline\.env
    Write-Host "✅ Created ml-pipeline/.env" -ForegroundColor Green
}

if (-not (Test-Path frontend_new\.env)) {
    Copy-Item frontend_new\.env.example frontend_new\.env
    Write-Host "✅ Created frontend_new/.env" -ForegroundColor Green
}

# Setup Git hooks
Write-Host "🪝 Setting up Git hooks..." -ForegroundColor Cyan
npx husky install

Write-Host ""
Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update .env files with your configuration"
Write-Host "2. Start databases: docker-compose up -d"
Write-Host "3. Run development servers:"
Write-Host "   - Backend: cd backend && npm run dev"
Write-Host "   - ML Pipeline: cd ml-pipeline && .\venv\Scripts\Activate.ps1 && python src/main.py"
Write-Host "   - Frontend: cd frontend_new && npm run dev"
