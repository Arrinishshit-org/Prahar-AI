/**
 * Chatbot Training Dataset
 * 
 * Contains:
 * - Common user patterns and intents
 * - Scheme information and matching criteria
 * - Conversation examples
 * - Response templates
 */

export const CHATBOT_TRAINING_DATA = {
  // Common user intents and their variations
  intents: {
    FIND_SCHEMES: {
      patterns: [
        'what schemes am i eligible for',
        'show me available schemes',
        'find schemes for me',
        'which schemes can i apply',
        'recommend schemes',
        'what benefits can i get',
        'available schemes for me',
        'suggest schemes',
      ],
      responses: [
        'Based on your profile, here are the schemes you may be eligible for:',
        'I found these schemes that match your eligibility:',
        'You might be interested in these government schemes:',
      ],
    },

    CHECK_ELIGIBILITY: {
      patterns: [
        'am i eligible for',
        'can i apply for',
        'do i qualify for',
        'eligibility for',
        'requirements for',
      ],
      responses: [
        'Let me check your eligibility for this scheme.',
        'Based on your profile, here\'s your eligibility status:',
      ],
    },

    UPDATE_PROFILE: {
      patterns: [
        'my age is',
        'my income is',
        'i live in',
        'i am a student',
        'i am unemployed',
        'update my profile',
        'change my details',
      ],
      responses: [
        'Got it! I\'ve updated your profile.',
        'Thanks for sharing! Your information has been saved.',
      ],
    },

    VIEW_PROFILE: {
      patterns: [
        'show my profile',
        'my details',
        'what do you know about me',
        'my information',
        'view my profile',
      ],
      responses: [
        'Here\'s your current profile:',
        'Based on the information you\'ve shared:',
      ],
    },

    ASK_ABOUT_SCHEME: {
      patterns: [
        'tell me about',
        'what is',
        'how to apply',
        'requirements for',
        'documents needed',
        'eligibility criteria',
      ],
      responses: [
        'Here\'s detailed information about this scheme:',
        'Let me explain this scheme to you:',
      ],
    },
  },

  // Common schemes and their eligibility criteria
  sampleSchemes: {
    'pm-aam-aadmi-bima-yojana': {
      name: 'PM Aam Aadmi Bima Yojana',
      category: 'Insurance',
      eligibility: {
        income: { min: 0, max: 250000 },
        employment: ['Unemployed', 'Self-Employed'],
        age: { min: 18, max: 65 },
      },
      benefits: 'Life insurance coverage up to 2 lakh rupees',
    },

    'pm-jan-dhan-yojana': {
      name: 'PM Jan Dhan Yojana',
      category: 'Banking',
      eligibility: {
        age: { min: 0, max: 150 },
      },
      benefits: 'Basic savings bank account with insurance',
    },

    'pradhan-mantri-shishu-vikas-yojana': {
      name: 'Pradhan Mantri Shishu Vikas Yojana',
      category: 'Education',
      eligibility: {
        age: { min: 0, max: 18 },
      },
      benefits: 'Child development and education benefits',
    },

    'pm-svanidhi': {
      name: 'PM SVANidhi',
      category: 'Loans',
      eligibility: {
        employment: ['Self-Employed'],
        income: { min: 0, max: 500000 },
      },
      benefits: 'Working capital loan up to 10,000 rupees',
    },

    'ujwala-yojana': {
      name: 'Ujwala Yojana',
      category: 'Energy',
      eligibility: {
        povertyLine: 'BPL',
        age: { min: 18, max: 150 },
      },
      benefits: 'Free LPG connections and initial cylinders',
    },

    'pm-nrega': {
      name: 'MGNREGA',
      category: 'Employment',
      eligibility: {
        employment: ['Unemployed'],
        education: ['Any'],
      },
      benefits: '100 days of guaranteed employment per year',
    },
  },

  // Profile extraction training data
  profileExtractionExamples: [
    {
      input: 'I am 25 years old, earning 50000 monthly, and I am a student',
      expected: {
        age: 25,
        income: 50000,
        employment: 'Student',
      },
      explanation:
        'Numbers closer to age keywords should be treated as age, not income',
    },

    {
      input: 'Student, monthly income is 10000, age is 20',
      expected: {
        age: 20,
        income: 10000,
        employment: 'Student',
      },
      explanation: 'Match keywords with their respective numbers',
    },

    {
      input: 'I earn 25000 per month and I am 35 years old',
      expected: {
        age: 35,
        income: 25000,
      },
      explanation: 'Context from keywords helps distinguish fields',
    },

    {
      input: 'From Maharashtra, graduated, disability, income below poverty line',
      expected: {
        state: 'Maharashtra',
        education: 'Graduate',
        disability: true,
        income: 50000,
      },
      explanation: 'Extract multiple fields from a single message',
    },
  ],

  // Conversation flow training
  conversationFlows: {
    'first-interaction': [
      'Namaste! I am Prahar, your assistant for government schemes.',
      'To help you find the best schemes, I would like to know a bit about you.',
      'Could you share your age, employment status, and monthly income?',
    ],

    'after-profile-update': [
      'Great! I have updated your profile.',
      'Now I can recommend schemes tailored to your situation.',
      'Would you like me to find schemes you are eligible for?',
    ],

    'scheme-recommendation': [
      'Based on your profile, here are the top schemes for you:',
      'Each of these has specific benefits and requirements.',
      'Would you like to know more about any of these schemes?',
    ],
  },

  // Common mistakes to avoid
  commonMistakes: [
    {
      wrong: 'Extracting the first number as age even when it is income',
      correct: 'Look for contextual keywords like "monthly", "earn", "income"',
    },

    {
      wrong: 'Not handling multiple fields in one message',
      correct: 'Extract all mentioned fields and update all that apply',
    },

    {
      wrong: 'Forgetting context from earlier in the conversation',
      correct: 'Always reference conversationHistory for user-mentioned details',
    },

    {
      wrong: 'Recommending schemes without validating eligibility',
      correct: 'Always check all eligibility criteria before recommending',
    },
  ],

  // Response quality guidelines
  responseGuidelines: {
    tone: 'Helpful, professional, respectful of user',
    language: 'Simple Hindi-English mix, easy to understand',
    structure: 'Answer → Explanation → Next Steps',
    accuracy: 'Always cite official scheme information',
    personalization: 'Reference user\'s specific situation',
  },
};

/**
 * Helper function to find matching intent
 */
export function findMatchingIntent(userMessage: string): string | null {
  const lowerMessage = userMessage.toLowerCase();

  for (const [intentKey, intentData] of Object.entries(CHATBOT_TRAINING_DATA.intents)) {
    for (const pattern of (intentData as any).patterns) {
      if (lowerMessage.includes(pattern)) {
        return intentKey;
      }
    }
  }

  return null;
}

/**
 * Helper function to get random response for intent
 */
export function getResponseForIntent(intentKey: string): string {
  const intent = (CHATBOT_TRAINING_DATA.intents as any)[intentKey];
  if (!intent || !intent.responses) {
    return 'How can I help you?';
  }

  const responses = intent.responses as string[];
  return responses[Math.floor(Math.random() * responses.length)];
}
