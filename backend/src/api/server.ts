/**
 * Main API Server
 * Sets up Express server with all routes and middleware
 * MOCK VERSION - No database required for testing
 */

import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
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
    const { email, password, name, age, income, state } = req.body;

    console.log('Registration attempt:', { email, name });

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
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

    res.status(201).json({
      user: {
        userId: newUser.userId,
        email: newUser.email,
        name: newUser.name,
      },
      accessToken,
      refreshToken,
    });
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
  const user = users.find(u => u.userId === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    userId: user.userId,
    name: user.name,
    email: user.email,
    age: user.age,
    income: user.income,
    state: user.state,
    completeness: 60,
  });
});

app.put('/api/users/:userId/profile', (req, res) => {
  const userIndex = users.findIndex(u => u.userId === req.params.userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users[userIndex] = { ...users[userIndex], ...req.body };

  res.json({
    userId: users[userIndex].userId,
    ...req.body,
    completeness: 80,
  });
});

// Mock schemes endpoint for testing
app.get('/api/schemes', (req, res) => {
  const mockSchemes = [
    {
      schemeId: '1',
      name: 'PM-KISAN',
      description: 'Direct income support to farmers',
      category: 'Agriculture',
    },
    {
      schemeId: '2',
      name: 'Ayushman Bharat',
      description: 'Health insurance for economically vulnerable families',
      category: 'Healthcare',
    },
    {
      schemeId: '3',
      name: 'Pradhan Mantri Awas Yojana',
      description: 'Affordable housing for all',
      category: 'Housing',
    },
  ];
  res.json(mockSchemes);
});

app.get('/api/schemes/:schemeId', (req, res) => {
  const mockScheme = {
    schemeId: req.params.schemeId,
    name: 'Sample Scheme',
    description: 'This is a sample scheme for testing',
    category: 'General',
    eligibilityScore: 75,
  };
  res.json(mockScheme);
});

// Mock recommendations endpoint
app.get('/api/users/:userId/recommendations', (req, res) => {
  res.json({
    recommendations: [
      {
        schemeId: '1',
        schemeName: 'PM-KISAN',
        eligibilityScore: 85,
        explanation: 'You match the income and occupation criteria',
      },
      {
        schemeId: '2',
        schemeName: 'Ayushman Bharat',
        eligibilityScore: 75,
        explanation: 'You match the income criteria',
      },
    ],
  });
});

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

// Mock chat endpoint
app.post('/api/chat', (req, res) => {
  try {
    const { message } = req.body;
    console.log('Chat message received:', message);

    // Get user info from token (mock)
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = token?.split('_').pop() || 'admin123';

    // Mock responses based on message content
    let response = '';
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('age')) {
      const user = users.find(u => u.userId === userId);
      response = user?.age 
        ? `Based on your profile, you are ${user.age} years old.`
        : "I don't have your age information yet. Please update your profile to get personalized recommendations.";
    } else if (lowerMessage.includes('scheme') || lowerMessage.includes('program')) {
      response = "I can help you find government schemes! Based on your profile, you may be eligible for PM-KISAN (agriculture support) and Ayushman Bharat (health insurance). Would you like to know more about any specific scheme?";
    } else if (lowerMessage.includes('eligib')) {
      response = "To check your eligibility for schemes, I need some information about you. Please make sure your profile is complete with details like age, income, occupation, and state.";
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = "Hello! I'm your personalized scheme recommendation assistant. I can help you discover government schemes you're eligible for. What would you like to know?";
    } else {
      response = "I'm here to help you find government schemes that match your profile. You can ask me about:\n- Your eligibility for specific schemes\n- Recommended schemes based on your profile\n- How to apply for schemes\n- Updating your profile for better recommendations";
    }

    res.json({ response });
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
