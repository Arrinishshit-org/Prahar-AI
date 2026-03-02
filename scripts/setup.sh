#!/bin/bash

# Setup script for Personalized Scheme Recommendation System

set -e

echo "🚀 Setting up Personalized Scheme Recommendation System..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python >= 3.10"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Setup Python virtual environment
echo "🐍 Setting up Python virtual environment..."
cd ml-pipeline
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install -e ".[dev]"
deactivate
cd ..

# Copy environment files
echo "📝 Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
fi

if [ ! -f ml-pipeline/.env ]; then
    cp ml-pipeline/.env.example ml-pipeline/.env
    echo "✅ Created ml-pipeline/.env"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
fi

# Setup Git hooks
echo "🪝 Setting up Git hooks..."
npx husky install
chmod +x .husky/pre-commit

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env files with your configuration"
echo "2. Start databases: docker-compose up -d"
echo "3. Run development servers:"
echo "   - Backend: cd backend && npm run dev"
echo "   - ML Pipeline: cd ml-pipeline && source venv/bin/activate && python src/main.py"
echo "   - Frontend: cd frontend && npm run dev"
