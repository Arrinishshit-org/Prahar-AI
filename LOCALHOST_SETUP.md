# Local Development Setup Guide

This guide will help you run the Personalized Scheme Recommendation System on your local machine for testing.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Python 3.9+ (for ML pipeline - optional for basic testing)
- Neo4j (optional for full functionality)
- Redis (optional for caching)

## Quick Start (Frontend + Backend Only)

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# backend/.env
PORT=3000
NODE_ENV=development

# JWT Configuration (for testing)
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Database (optional for basic testing)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Redis (optional for basic testing)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Start the Backend Server

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3000`

You should see:
```
🚀 Backend server running on http://localhost:3000
📊 Health check: http://localhost:3000/health
🔐 Auth API: http://localhost:3000/api/auth
👤 Users API: http://localhost:3000/api/users
```

### 4. Start the Frontend Development Server

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173` (Vite default)

You should see:
```
  VITE v5.0.11  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 5. Test the Application

Open your browser and navigate to `http://localhost:5173`

You should see the home page with:
- "Personalized Scheme Recommendation System" heading
- "Browse Schemes" and "Get Started" buttons

## Available Pages

- **Home**: `http://localhost:5173/`
- **Browse Schemes**: `http://localhost:5173/schemes`
- **Login**: `http://localhost:5173/login`
- **Register**: `http://localhost:5173/register`
- **Dashboard**: `http://localhost:5173/dashboard` (requires login)
- **Chat**: `http://localhost:5173/chat` (requires login)

## Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Schemes (Mock Data)
```bash
curl http://localhost:3000/api/schemes
```

Expected response:
```json
[
  {
    "schemeId": "1",
    "name": "PM-KISAN",
    "description": "Direct income support to farmers",
    "category": "Agriculture"
  },
  ...
]
```

## Current Limitations

### What Works:
✅ Frontend UI components render correctly
✅ Backend API server runs
✅ Mock schemes endpoint returns data
✅ Basic routing between pages
✅ Form inputs and buttons

### What Doesn't Work Yet:
❌ User registration/login (requires database setup)
❌ Real scheme data (requires myscheme.gov.in API integration)
❌ User recommendations (requires ML pipeline)
❌ Chat functionality (requires MCP server)
❌ Profile management (requires database)
❌ Nudges/notifications (requires database)

## Next Steps for Full Functionality

### 1. Set Up Neo4j Database
```bash
# Using Docker
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest
```

Then initialize the database:
```bash
cd backend
npm run db:init:seed
```

### 2. Set Up Redis Cache
```bash
# Using Docker
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:latest
```

### 3. Set Up ML Pipeline (Python)
```bash
cd ml-pipeline
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Train ML Models
```bash
cd ml-pipeline
python scripts/train_user_classifier.py
```

## Troubleshooting

### Port Already in Use
If port 3000 or 5173 is already in use:

**Backend:**
```bash
# Change PORT in backend/.env
PORT=3001
```

**Frontend:**
```bash
# Vite will automatically try the next available port
# Or specify in vite.config.ts
```

### CORS Errors
The backend is configured with CORS enabled for all origins in development. If you still see CORS errors, check that:
1. Backend is running on port 3000
2. Frontend is making requests to `http://localhost:3000`

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Commands

### Backend
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Lint code
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Lint code
```

## Browser Console

Open browser DevTools (F12) to see:
- Network requests to the backend
- Any JavaScript errors
- React component rendering

## Success Indicators

You'll know everything is working when:
1. ✅ Backend shows "Server running on port 3000"
2. ✅ Frontend shows "Local: http://localhost:5173/"
3. ✅ Browser loads the home page without errors
4. ✅ Clicking "Browse Schemes" shows 3 mock schemes
5. ✅ Browser console shows no errors

## Need Help?

Check the following files for more information:
- `backend/README.md` - Backend architecture
- `frontend/IMPLEMENTATION_SUMMARY.md` - Frontend components
- `docs/ARCHITECTURE.md` - System architecture
- `docs/QUICKSTART.md` - Quick start guide
