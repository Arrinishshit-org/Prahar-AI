/**
 * Main API Server
 * Sets up Express server with all routes and middleware
 * MOCK VERSION - No database required for testing
 */

import express from 'express';
import cors from 'cors';
import { ProfileExtractor } from '../utils/profile-extractor';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// In-memory user storage for testing (without database)
const users: any[] = [
  {
    userId: 'admin123',
    email: 'admin@example.com',
    password: 'password', // In production, this would be hashed
    name: 'Admin User',
    role: 'admin',
  },
];

// Mock authentication routes
app.post('/api/auth/register', (req, res) => {
  try {
    console.log('=== REGISTRATION REQUEST ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const { email, password, name, age, income, state } = req.body;

    console.log('Registration attempt:', { email, name });

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user
    const newUser = {
      userId: `user_${Date.now()}`,
      email,
      password, // In production, hash this
      name: name || 'User',
      age: age || null,
      income: income || null,
      state: state || null,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    console.log('User registered successfully:', newUser.userId);

    // Generate mock tokens
    const accessToken = `mock_access_token_${newUser.userId}`;
    const refreshToken = `mock_refresh_token_${newUser.userId}`;

    const response = {
      user: {
        userId: newUser.userId,
        email: newUser.email,
        name: newUser.name,
      },
      accessToken,
      refreshToken,
    };
    
    console.log('Sending response:', response);
    res.status(201).json(response);
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email });

    // Find user
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Login successful:', user.userId);

    // Generate mock tokens
    const accessToken = `mock_access_token_${user.userId}`;
    const refreshToken = `mock_refresh_token_${user.userId}`;

    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Mock profile endpoints for testing (without database)
app.get('/api/users/:userId/profile', (req, res) => {
  const user = users.find(u => u.userId === req.params.userId || u.userId === 'admin123');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    userId: user.userId,
    name: user.name,
    email: user.email,
    age: user.age || null,
    income: user.income || null,
    state: user.state || null,
    employment: user.employment || null,
    education: user.education || null,
    completeness: calculateProfileCompleteness(user),
  });
});

app.put('/api/users/:userId/profile', (req, res) => {
  const userIndex = users.findIndex(u => u.userId === req.params.userId || u.userId === 'admin123');
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update user with new data
  users[userIndex] = { ...users[userIndex], ...req.body };

  res.json({
    userId: users[userIndex].userId,
    name: users[userIndex].name,
    email: users[userIndex].email,
    age: users[userIndex].age,
    income: users[userIndex].income,
    state: users[userIndex].state,
    employment: users[userIndex].employment,
    education: users[userIndex].education,
    completeness: calculateProfileCompleteness(users[userIndex]),
  });
});

// Helper function to calculate profile completeness
function calculateProfileCompleteness(user: any): number {
  const fields = ['name', 'email', 'age', 'income', 'state', 'employment', 'education'];
  const filledFields = fields.filter(field => user[field] != null && user[field] !== '');
  return Math.round((filledFields.length / fields.length) * 100);
}

// Real schemes endpoints using India.gov.in API
import { schemesController } from '../schemes/schemes.controller';

app.get('/api/schemes', (req, res) => schemesController.getSchemes(req, res));
app.get('/api/schemes/categories', (req, res) => schemesController.getCategories(req, res));
app.get('/api/schemes/:schemeId', (req, res) => schemesController.getSchemeById(req, res));
app.get('/api/users/:userId/recommendations', (req, res) => schemesController.getRecommendations(req, res));

// Mock nudges endpoint
app.get('/api/users/:userId/nudges', (req, res) => {
  res.json([
    {
      nudgeId: '1',
      title: 'New Scheme Available',
      message: 'A new agriculture scheme matching your profile is now available',
      priority: 'high',
      schemeId: '1',
      viewed: false,
      dismissed: false,
    },
  ]);
});

// Chat endpoint using intelligent agent system
import { chatController } from '../chat';

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    console.log('Chat message received:', message);
    console.log('Conversation history items:', conversationHistory.length);

    // Get user info from token (mock)
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = token?.split('_').pop() || 'admin123';
    const user = users.find(u => u.userId === userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Use intelligent profile extractor
    console.log(`\n📊 Extracting profile data from message: "${message}"`);
    const extraction = ProfileExtractor.extract(message);
    const updates = extraction.updates;
    const updateMessages = extraction.messages;

    // Also extract from conversation history for context
    console.log(`📁 Extracting context from ${conversationHistory.length} previous messages...`);
    const historyContext = ProfileExtractor.extractFromHistory(conversationHistory);
    console.log('Context extracted from history:', historyContext);

    // Apply updates to user profile
    let profileUpdated = false;
    const appliedUpdates: string[] = [];

    if (updates.age !== undefined) {
      user.age = updates.age;
      profileUpdated = true;
      appliedUpdates.push(updateMessages[updateMessages.findIndex(m => m.includes('age'))] || '');
    }

    if (updates.income !== undefined) {
      user.income = updates.income;
      profileUpdated = true;
      appliedUpdates.push(updateMessages[updateMessages.findIndex(m => m.includes('income'))] || '');
    }

    if (updates.state !== undefined) {
      user.state = updates.state;
      profileUpdated = true;
      appliedUpdates.push(updateMessages[updateMessages.findIndex(m => m.includes('state'))] || '');
    }

    if (updates.employment !== undefined) {
      user.employment = updates.employment;
      profileUpdated = true;
      appliedUpdates.push(updateMessages[updateMessages.findIndex(m => m.includes('employment'))] || '');
    }

    if (updates.education !== undefined) {
      user.education = updates.education;
      profileUpdated = true;
      appliedUpdates.push(updateMessages[updateMessages.findIndex(m => m.includes('education'))] || '');
    }

    if (updates.disability !== undefined) {
      user.isDisabled = updates.disability;
      profileUpdated = true;
      appliedUpdates.push(updateMessages[updateMessages.findIndex(m => m.includes('disability'))] || '');
    }

    if (updates.minority !== undefined) {
      user.isMinority = updates.minority;
      profileUpdated = true;
      appliedUpdates.push(updateMessages[updateMessages.findIndex(m => m.includes('minority'))] || '');
    }

    console.log(`✅ Profile updated: ${profileUpdated}, Updates applied:`, appliedUpdates.filter(Boolean));

    // Attach user profile and conversation history to request for chat service
    (req as any).userId = userId;
    (req as any).userProfile = user;
    (req as any).conversationHistory = conversationHistory;
    (req as any).extractedContext = historyContext;

    // If profile was updated, prepend the update messages to the response
    if (profileUpdated && appliedUpdates.length > 0) {
      const originalSend = res.json.bind(res);
      res.json = function(data: any) {
        if (data.response) {
          const updatePrefix = appliedUpdates.filter(Boolean).join(' ');
          data.response = updatePrefix + '\n\n' + data.response;
        }
        return originalSend(data);
      };
    }

    // Use chat controller
    await chatController.sendMessage(req, res);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message', details: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to see all users
app.get('/api/debug/users', (req, res) => {
  res.json({ 
    users: users.map(u => ({ 
      userId: u.userId, 
      email: u.email, 
      name: u.name 
    })),
    count: users.length
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

export default app;
