# Quick Start Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **Python** >= 3.10 ([Download](https://www.python.org/))
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd personalized-scheme-recommendation-system
```

### 2. Run Setup Script

**On Linux/macOS:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**On Windows (PowerShell):**
```powershell
.\scripts\setup.ps1
```

This script will:
- Install Node.js dependencies
- Create Python virtual environment
- Install Python dependencies
- Copy environment configuration files
- Set up Git hooks

### 3. Configure Environment Variables

Edit the `.env` files in each workspace:

**backend/.env:**
```env
NEO4J_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_32_byte_encryption_key
MYSCHEME_API_KEY=your_api_key
```

**ml-pipeline/.env:**
```env
NEO4J_PASSWORD=your_secure_password
```

**frontend_new/.env:**
```env
VITE_API_URL=http://localhost:3000
```

### 4. Start Databases

```bash
docker-compose up -d
```

This starts:
- Neo4j on ports 7474 (HTTP) and 7687 (Bolt)
- Redis on port 6379

Verify databases are running:
```bash
docker-compose ps
```

Wait for Neo4j to be ready (check logs):
```bash
docker-compose logs -f neo4j
# Wait for "Started." message
```

### 5. Initialize Neo4j Database

```bash
cd backend
npm run db:init:seed
```

This will:
- Create database schema (constraints and indexes)
- Create full-text search indexes
- Seed initial data (categories and user groups)

Verify the setup:
```bash
npm run db:verify
```

You can also access Neo4j Browser at http://localhost:7474
- Username: `neo4j`
- Password: (as configured in docker-compose.yml)

### 6. Start Development Servers

Open three terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend API will run on http://localhost:3000
MCP Server will run on ws://localhost:3001

**Terminal 2 - ML Pipeline:**
```bash
cd ml-pipeline
source venv/bin/activate  # On Windows: venv\Scripts\activate
python src/main.py
```
ML service will run on http://localhost:5000

**Terminal 3 - Frontend:**
```bash
cd frontend_new
npm run dev
```
Frontend will run on http://localhost:5173

## Verify Installation

1. **Check Backend Health:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check ML Service Health:**
   ```bash
   curl http://localhost:5000/health
   ```

3. **Open Frontend:**
   Navigate to http://localhost:5173 in your browser

## Next Steps

- Read the [Architecture Documentation](./ARCHITECTURE.md)
- Review the [API Documentation](../backend/docs/API.md)
- Check the [Contributing Guidelines](../CONTRIBUTING.md)
- Explore the [Design Document](.kiro/specs/personalized-scheme-recommendation-system/design.md)

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find process using port (Linux/macOS)
lsof -i :3000

# Find process using port (Windows)
netstat -ano | findstr :3000

# Kill the process or change the port in .env files
```

### Database Connection Issues

```bash
# Check if databases are running
docker-compose ps

# View database logs
docker-compose logs neo4j
docker-compose logs redis

# Restart databases
docker-compose restart
```

### Python Virtual Environment Issues

```bash
# Recreate virtual environment
cd ml-pipeline
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes and test:**
   ```bash
   npm test
   npm run lint
   ```

3. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

4. **Push and create PR:**
   ```bash
   git push origin feature/your-feature
   ```

## Useful Commands

```bash
# Run all tests
npm test

# Run tests for specific workspace
npm test --workspace=backend

# Lint all code
npm run lint

# Format all code
npm run format

# Build for production
npm run build

# View logs
docker-compose logs -f
```

## Getting Help

- Check the [FAQ](./FAQ.md)
- Open an issue on GitHub
- Contact the development team
