/**
 * Property Test: Message Serialization Round Trip
 * Validates: Requirements 16.5
 * 
 * Property: Any message serialized and deserialized should equal the original
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
}

const messageArbitrary = fc.record({
  id: fc.uuid(),
  role: fc.constantFrom('user' as const, 'agent' as const),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: fc.date().map(d => d.toISOString()),
});

describe('Property 41: Message Serialization Round Trip', () => {
  it('should preserve message data through serialization and deserialization', () => {
    fc.assert(
      fc.property(messageArbitrary, (message) => {
        // Serialize
        const serialized = JSON.stringify(message);
        
        // Deserialize
        const deserialized = JSON.parse(serialized);
        
        // Should be equal
        expect(deserialized).toEqual(message);
      }),
      { numRuns: 10 }
    );
  });

  it('should handle arrays of messages', () => {
    fc.assert(
      fc.property(fc.array(messageArbitrary, { minLength: 0, maxLength: 10 }), (messages) => {
        const serialized = JSON.stringify(messages);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized).toEqual(messages);
        expect(deserialized.length).toBe(messages.length);
      }),
      { numRuns: 10 }
    );
  });
});
