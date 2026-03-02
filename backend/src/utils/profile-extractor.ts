/**
 * Intelligent Profile Data Extractor
 * 
 * Uses context-aware patterns to extract demographic information
 * from natural language input with high accuracy
 */

interface ProfileExtractionResult {
  updates: {
    age?: number;
    income?: number;
    state?: string;
    employment?: string;
    education?: string;
    disability?: boolean;
    minority?: boolean;
  };
  messages: string[];
}

export class ProfileExtractor {
  /**
   * Extract profile information from a user message
   * Handles multiple fields and uses context-aware parsing
   */
  static extract(message: string): ProfileExtractionResult {
    const lowerMessage = message.toLowerCase();
    const updates: any = {};
    const messages: string[] = [];

    // 1. Extract AGE - Look for age-specific patterns first
    const agePatterns = [
      /(?:age|years old|i am|i'm)(?:\s+|=\s*)(\d+)(?:\s+years)?/,
      /(?:my age is|age is)(?:\s+|=\s*)(\d+)/,
      /(?:i'm|i am)(?:\s+)(\d+)(?:\s+years old)?/,
      /(\d+)(?:\s+year)?(?:\s+old)?(?:,|\s+and)/i, // "25 year old and income..."
    ];

    for (const pattern of agePatterns) {
      const match = lowerMessage.match(pattern);
      if (match && match[1]) {
        const age = parseInt(match[1], 10);
        // Validate age is reasonable (5-120)
        if (age >= 5 && age <= 120) {
          updates.age = age;
          messages.push(`✅ Updated your age to ${age} years.`);
          break; // Only extract first valid age
        }
      }
    }

    // 2. Extract INCOME - Look for income-specific patterns
    const incomePatterns = [
      /(?:monthly\s+income|income)(?:\s+is)?(?:\s+of)?(?:\s+|=\s*)(₹\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)/,
      /(?:earn|earning|earns)(?:\s+|=\s*)(₹\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)/,
      /(?:income|earn).*?(₹\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)/,
      /(?:₹|rs\.?)\s*(\d+(?:,\d{3})*(?:\.\d+)?)/,
    ];

    for (const pattern of incomePatterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        // Extract the number part (second or third group depending on pattern)
        let incomeStr = match[2] || match[1];
        const income = parseInt(incomeStr.replace(/,/g, ''), 10);
        // Validate income is reasonable (1000-10000000)
        if (income >= 1000 && income <= 10000000) {
          updates.income = income;
          messages.push(`✅ Updated your monthly income to ₹${income.toLocaleString('en-IN')}.`);
          break; // Only extract first valid income
        }
      }
    }

    // 3. Extract EMPLOYMENT STATUS
    const employmentKeywords: { [key: string]: string } = {
      student: 'Student',
      unemployed: 'Unemployed',
      employed: 'Employed',
      working: 'Employed',
      'self-employed': 'Self-Employed',
      'self employed': 'Self-Employed',
      retired: 'Retired',
      freelancer: 'Freelancer',
      businessman: 'Self-Employed',
      farmer: 'Farmer',
    };

    for (const [keyword, employment] of Object.entries(employmentKeywords)) {
      if (lowerMessage.includes(keyword)) {
        updates.employment = employment;
        messages.push(`✅ Updated your employment status to ${employment}.`);
        break; // Only extract first match
      }
    }

    // 4. Extract STATE/LOCATION
    const states = [
      'maharashtra', 'delhi', 'karnataka', 'tamil nadu',
      'gujarat', 'rajasthan', 'uttar pradesh', 'west bengal',
      'punjab', 'haryana', 'kerala', 'andhra pradesh',
      'telangana', 'bihar', 'jharkhand', 'madhya pradesh',
      'chhattisgarh', 'odisha', 'assam', 'himachal pradesh',
      'uttarakhand', 'goa', 'jammu', 'kashmir', 'sikkim',
      'tripura', 'meghalaya', 'manipur', 'mizoram', 'nagaland'
    ];

    for (const state of states) {
      if (lowerMessage.includes(state)) {
        updates.state = state
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        messages.push(`✅ Updated your state to ${updates.state}.`);
        break;
      }
    }

    // 5. Extract EDUCATION LEVEL
    const educationLevels: { [key: string]: string } = {
      'primary': 'Primary',
      'secondary': 'Secondary',
      'higher secondary': 'Higher Secondary',
      'graduate': 'Graduate',
      'postgraduate': 'Postgraduate',
      'post graduate': 'Postgraduate',
      'professional': 'Professional',
      'diploma': 'Diploma',
      '10th': 'Secondary',
      '12th': 'Higher Secondary',
      'ba': 'Graduate',
      'bsc': 'Graduate',
      'btech': 'Graduate',
      'ma': 'Postgraduate',
      'msc': 'Postgraduate',
      'mtech': 'Postgraduate',
    };

    for (const [keyword, education] of Object.entries(educationLevels)) {
      if (lowerMessage.includes(keyword)) {
        updates.education = education;
        messages.push(`✅ Updated your education to ${education}.`);
        break;
      }
    }

    // 6. Extract DISABILITY STATUS
    if (lowerMessage.includes('disabled') || lowerMessage.includes('disability')) {
      updates.disability = true;
      messages.push(`✅ Noted that you have a disability status.`);
    }

    // 7. Extract MINORITY STATUS
    const minorityKeywords = ['minority', 'sc', 'st', 'obc'];
    for (const keyword of minorityKeywords) {
      if (lowerMessage.includes(keyword)) {
        updates.minority = true;
        messages.push(`✅ Noted your minority status.`);
        break;
      }
    }

    // 8. Handle special cases
    if (lowerMessage.includes('below poverty') || lowerMessage.includes('bpl')) {
      updates.income = 50000;
      messages.push(`✅ Noted that your income is below poverty line.`);
    }

    return {
      updates,
      messages,
    };
  }

  /**
   * Extract from conversation history - understand context
   * Returns inferred information from previous messages
   */
  static extractFromHistory(
    conversationHistory: Array<{ role: string; content: string }>
  ): { [key: string]: any } {
    const context: { [key: string]: any } = {};

    // Scan through conversation history for mentions
    for (const msg of conversationHistory) {
      if (msg.role === 'user') {
        const result = this.extract(msg.content);
        // Merge updates (later messages override earlier ones)
        Object.assign(context, result.updates);
      }
    }

    return context;
  }

  /**
   * Validate extracted data
   */
  static validate(updates: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (updates.age !== undefined) {
      if (updates.age < 5 || updates.age > 120) {
        errors.push('Age must be between 5 and 120');
      }
    }

    if (updates.income !== undefined) {
      if (updates.income < 0 || updates.income > 100000000) {
        errors.push('Income must be a positive number');
      }
    }

    if (updates.employment !== undefined) {
      const validStatuses = ['Student', 'Unemployed', 'Employed', 'Self-Employed', 'Retired', 'Freelancer', 'Farmer'];
      if (!validStatuses.includes(updates.employment)) {
        errors.push('Invalid employment status');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
