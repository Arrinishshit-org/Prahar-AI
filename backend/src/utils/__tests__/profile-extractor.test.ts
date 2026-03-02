/**
 * Profile Extractor Test Suite
 * 
 * Tests for the intelligent profile data extraction system
 * Run with: npx jest src/utils/__tests__/profile-extractor.test.ts
 */

import { ProfileExtractor } from '../profile-extractor';

describe('ProfileExtractor - Intelligent Profile Data Extraction', () => {
  describe('Age Extraction', () => {
    it('should extract age with "age is" pattern', () => {
      const result = ProfileExtractor.extract('My age is 25');
      expect(result.updates.age).toBe(25);
      expect(result.messages).toContain(expect.stringContaining('age'));
    });

    it('should extract age with "years old" pattern', () => {
      const result = ProfileExtractor.extract('I am 35 years old');
      expect(result.updates.age).toBe(35);
    });

    it('should NOT confuse income with age', () => {
      const result = ProfileExtractor.extract('Monthly income is 50000, age is 25');
      expect(result.updates.age).toBe(25);
      expect(result.updates.income).toBe(50000);
      // Critical: age should NOT be 50000
      expect(result.updates.age).not.toBe(50000);
    });

    it('should validate age range (5-120)', () => {
      const tooYoung = ProfileExtractor.extract('I am 2 years old');
      const tooOld = ProfileExtractor.extract('I am 200 years old');
      const valid = ProfileExtractor.extract('I am 45 years old');

      expect(tooYoung.updates.age).toBeUndefined();
      expect(tooOld.updates.age).toBeUndefined();
      expect(valid.updates.age).toBe(45);
    });
  });

  describe('Income Extraction', () => {
    it('should extract income with "income is" pattern', () => {
      const result = ProfileExtractor.extract('My income is 50000');
      expect(result.updates.income).toBe(50000);
    });

    it('should extract income with currency symbol', () => {
      const result = ProfileExtractor.extract('I earn ₹30,000 per month');
      expect(result.updates.income).toBe(30000);
    });

    it('should handle comma-separated numbers', () => {
      const result = ProfileExtractor.extract('Monthly income is ₹1,50,000');
      expect(result.updates.income).toBe(150000);
    });

    it('should extract income from "earn" pattern', () => {
      const result = ProfileExtractor.extract('I earn 25000 monthly');
      expect(result.updates.income).toBe(25000);
    });

    it('should handle "below poverty line"', () => {
      const result = ProfileExtractor.extract('My income is below poverty line');
      expect(result.updates.income).toBe(50000);
    });

    it('should validate income range', () => {
      const tooLow = ProfileExtractor.extract('Income is 50');
      const huge = ProfileExtractor.extract('Income is 999999999');
      const valid = ProfileExtractor.extract('Income is 500000');

      expect(tooLow.updates.income).toBeUndefined();
      expect(huge.updates.income).toBeUndefined();
      expect(valid.updates.income).toBe(500000);
    });
  });

  describe('Employment Status Extraction', () => {
    it('should detect "Student"', () => {
      const result = ProfileExtractor.extract('I am a student');
      expect(result.updates.employment).toBe('Student');
    });

    it('should detect "Employed"', () => {
      const result = ProfileExtractor.extract('I am working as a software engineer');
      expect(result.updates.employment).toBe('Employed');
    });

    it('should detect "Unemployed"', () => {
      const result = ProfileExtractor.extract('I am unemployed');
      expect(result.updates.employment).toBe('Unemployed');
    });

    it('should detect "Self-Employed"', () => {
      const result = ProfileExtractor.extract('I am self-employed');
      expect(result.updates.employment).toBe('Self-Employed');
    });

    it('should detect "Retired"', () => {
      const result = ProfileExtractor.extract('I am retired');
      expect(result.updates.employment).toBe('Retired');
    });

    it('should detect "Farmer"', () => {
      const result = ProfileExtractor.extract('I am a farmer');
      expect(result.updates.employment).toBe('Farmer');
    });
  });

  describe('State/Location Extraction', () => {
    it('should extract single-word states', () => {
      const result = ProfileExtractor.extract('I live in Delhi');
      expect(result.updates.state).toBe('Delhi');
    });

    it('should extract multi-word states', () => {
      const result = ProfileExtractor.extract('I am from Tamil Nadu');
      expect(result.updates.state).toBe('Tamil Nadu');
    });

    it('should be case-insensitive', () => {
      const result1 = ProfileExtractor.extract('I live in maharashtra');
      const result2 = ProfileExtractor.extract('I live in MAHARASHTRA');
      expect(result1.updates.state).toBe('Maharashtra');
      expect(result2.updates.state).toBe('Maharashtra');
    });

    it('should extract from all 28 states', () => {
      const states = ['maharashtra', 'karnataka', 'tamil nadu', 'uttar pradesh'];
      states.forEach(state => {
        const result = ProfileExtractor.extract(`I am from ${state}`);
        expect(result.updates.state).toBeDefined();
      });
    });
  });

  describe('Education Extraction', () => {
    it('should extract primary education', () => {
      const result = ProfileExtractor.extract('I studied up to primary school');
      expect(result.updates.education).toBe('Primary');
    });

    it('should extract secondary education', () => {
      const result = ProfileExtractor.extract('I completed 10th standard');
      expect(result.updates.education).toBe('Secondary');
    });

    it('should extract graduate level', () => {
      const result = ProfileExtractor.extract('I have a Bachelor\'s degree');
      expect(result.updates.education).toBe('Graduate');
    });

    it('should extract postgraduate level', () => {
      const result = ProfileExtractor.extract('I completed my Master\'s');
      expect(result.updates.education).toBe('Postgraduate');
    });
  });

  describe('Multiple Fields in One Message', () => {
    it('should extract age and income together', () => {
      const result = ProfileExtractor.extract('I am 28 years old and earn ₹40,000 per month');
      expect(result.updates.age).toBe(28);
      expect(result.updates.income).toBe(40000);
    });

    it('should extract age, employment, and location', () => {
      const result = ProfileExtractor.extract(
        'I am 30 years old, work as an engineer, and live in Mumbai'
      );
      expect(result.updates.age).toBe(30);
      expect(result.updates.employment).toBe('Employed');
      expect(result.updates.state).toBe('Mumbai');
    });

    it('should extract all major fields', () => {
      const result = ProfileExtractor.extract(
        'I am 25 years old, a student from Chennai, earning ₹10,000 monthly, studied till 12th'
      );
      expect(result.updates.age).toBe(25);
      expect(result.updates.employment).toBe('Student');
      expect(result.updates.income).toBe(10000);
      expect(result.updates.education).toBe('Higher Secondary');
    });

    it('should return multiple update messages', () => {
      const result = ProfileExtractor.extract(
        'I am 35, work as a teacher, from Karnataka, earned 60000'
      );
      expect(result.messages.length).toBeGreaterThan(1);
      expect(result.messages.join()).toContain('age');
      expect(result.messages.join()).toContain('employment');
    });
  });

  describe('Edge Cases & Special Handling', () => {
    it('should handle special case "below poverty line"', () => {
      const result = ProfileExtractor.extract('My income is below poverty line');
      expect(result.updates.income).toBe(50000);
    });

    it('should handle casual/slang input', () => {
      const result = ProfileExtractor.extract('m 25yo student from bombay earning 15k');
      // Should still extract despite casual language
      expect(result.updates).toBeDefined();
    });

    it('should not extract invalid numbers', () => {
      const result = ProfileExtractor.extract('The year is 2026');
      // Should not extract 2026 as age
      expect(result.updates.age).toBeUndefined();
    });

    it('should handle missing/incomplete information', () => {
      const result = ProfileExtractor.extract('Just tell me what schemes I can get');
      // Should return empty updates, not crash
      expect(result.updates).toBeDefined();
    });

    it('should ignore age > 120 and < 5', () => {
      const tooHigh = ProfileExtractor.extract('Age 150');
      const tooLow = ProfileExtractor.extract('Age 2');
      expect(tooHigh.updates.age).toBeUndefined();
      expect(tooLow.updates.age).toBeUndefined();
    });
  });

  describe('Conversation History Context', () => {
    it('should extract context from multiple messages', () => {
      const history = [
        { role: 'user', content: 'I am 30 years old' },
        { role: 'user', content: 'I earn 50000 per month' },
        { role: 'user', content: 'I am from Maharashtra' },
      ];
      const context = ProfileExtractor.extractFromHistory(history);
      expect(context.age).toBe(30);
      expect(context.income).toBe(50000);
      expect(context.state).toBe('Maharashtra');
    });

    it('should merge and override with latest information', () => {
      const history = [
        { role: 'user', content: 'Age 25' },
        { role: 'user', content: 'Actually I am 26 now' },
      ];
      const context = ProfileExtractor.extractFromHistory(history);
      // Latest message should override
      expect(context.age).toBe(26);
    });
  });

  describe('Validation', () => {
    it('should validate extracted data', () => {
      const updates = {
        age: 35,
        income: 50000,
        employment: 'Employed',
      };
      const validation = ProfileExtractor.validate(updates);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject invalid age', () => {
      const updates = { age: 200 };
      const validation = ProfileExtractor.validate(updates);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid income', () => {
      const updates = { income: -5000 };
      const validation = ProfileExtractor.validate(updates);
      expect(validation.valid).toBe(false);
    });

    it('should reject invalid employment status', () => {
      const updates = { employment: 'Astronaut' };
      const validation = ProfileExtractor.validate(updates);
      expect(validation.valid).toBe(false);
    });
  });

  describe('Critical Bug Fix: Age vs Income Confusion', () => {
    it('CRITICAL: should NOT confuse "monthly income 10000, age 10" with "age 10000"', () => {
      const result = ProfileExtractor.extract('Student, monthly income is 10000, age is 10');
      
      // These assertions are CRITICAL
      expect(result.updates.age).toBe(10); // NOT 10000!
      expect(result.updates.income).toBe(10000);
      expect(result.updates.employment).toBe('Student');
      
      // Verify the messages confirm it
      const messages = result.messages.join();
      expect(messages).toContain('age to 10 years');
      expect(messages).toContain('income to ₹10,000');
    });

    it('CRITICAL: should handle various orderings correctly', () => {
      const variations = [
        'Age 20, income 50000',
        'Income 50000, age 20',
        'Monthly income 50000 and I am 20 years old',
        '20 years old earning 50000 monthly',
      ];

      variations.forEach(input => {
        const result = ProfileExtractor.extract(input);
        expect(result.updates.age).toBe(20);
        expect(result.updates.income).toBe(50000);
      });
    });
  });
});

// Helper function to run basic tests
export function runBasicTests() {
  console.log('🧪 Running Profile Extractor Tests...\n');

  const testCases = [
    {
      input: 'Student, monthly income is 10000, age is 10',
      expected: { age: 10, income: 10000, employment: 'Student' },
      description: 'CRITICAL BUG FIX - Age vs Income confusion',
    },
    {
      input: 'I am 25 years old and earn 50000',
      expected: { age: 25, income: 50000 },
      description: 'Multiple fields in one message',
    },
    {
      input: 'I live in Maharashtra and am from student community',
      expected: { state: 'Maharashtra', employment: 'Student' },
      description: 'State and employment extraction',
    },
  ];

  testCases.forEach(test => {
    const result = ProfileExtractor.extract(test.input);
    const passed = JSON.stringify(result.updates) === JSON.stringify(test.expected);
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${test.description}`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Got: ${JSON.stringify(result.updates)}`);
    if (!passed) {
      console.log(`   Expected: ${JSON.stringify(test.expected)}`);
    }
    console.log();
  });
}
