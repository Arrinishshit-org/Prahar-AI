/**
 * Scheme Information Service
 * 
 * Provides detailed information about government schemes
 * Uses the training dataset for quick lookups
 */

import { CHATBOT_TRAINING_DATA } from '../utils/training-data';

export class SchemeInformationService {
  /**
   * Get information about a specific scheme or scheme type
   */
  static getSchemeInfo(
    query: string
  ): { scheme: string; info: string; suggestions: string[] } | null {
    const lowerQuery = query.toLowerCase();

    // Direct scheme lookup
    for (const [schemeId, schemeData] of Object.entries(CHATBOT_TRAINING_DATA.sampleSchemes)) {
      const scheme = schemeData as any;
      
      if (
        lowerQuery.includes(scheme.name.toLowerCase()) ||
        schemeId.includes(lowerQuery.replace(/\s+/g, '-')) ||
        lowerQuery.includes(schemeId.replace(/-/g, ' '))
      ) {
        return {
          scheme: scheme.name,
          info: this.formatSchemeDetails(scheme),
          suggestions: [
            'Check my eligibility',
            'How to apply',
            'Required documents',
            'Find more schemes',
          ],
        };
      }
    }

    // Category-based lookup
    const categoryKeywords: { [key: string]: string[] } = {
      'scholarship|education|student': [
        'PM Shishu Vikas Yojana',
        'PM Jan Dhan Yojana',
      ],
      'employment|job|work': [
        'PM SVANidhi',
        'MGNREGA',
      ],
      'insurance|protection': [
        'PM Aam Aadmi Bima Yojana',
        'PM Jan Dhan Yojana',
      ],
      'energy|gas|lpg|fuel': [
        'Ujwala Yojana',
      ],
      'business|self-employed|entrepreneur': [
        'PM SVANidhi',
      ],
    };

    for (const [keywords, schemes] of Object.entries(categoryKeywords)) {
      const keywordList = keywords.split('|');
      if (keywordList.some(kw => lowerQuery.includes(kw))) {
        return this.getSchemesByNames(schemes);
      }
    }

    return null;
  }

  /**
   * Get schemes by name list
   */
  private static getSchemesByNames(
    schemeNames: string[]
  ): { scheme: string; info: string; suggestions: string[] } | null {
    const schemes = schemeNames
      .map(name => {
        for (const schemeData of Object.values(CHATBOT_TRAINING_DATA.sampleSchemes)) {
          const scheme = schemeData as any;
          if (scheme.name === name) {
            return scheme;
          }
        }
        return null;
      })
      .filter(Boolean);

    if (schemes.length === 0) {
      return null;
    }

    if (schemes.length === 1) {
      return {
        scheme: (schemes[0] as any).name,
        info: this.formatSchemeDetails(schemes[0]),
        suggestions: [
          'Check my eligibility',
          'How to apply',
          'Required documents',
          'Find more schemes',
        ],
      };
    }

    // Multiple schemes
    return {
      scheme: 'Relevant Schemes',
      info: this.formatMultipleSchemes(schemes as any[]),
      suggestions: [
        'Tell me more about any scheme',
        'Check my eligibility',
        'Find more schemes',
      ],
    };
  }

  /**
   * Format single scheme details
   */
  private static formatSchemeDetails(scheme: any): string {
    const parts = [
      `📋 **${scheme.name}**`,
      `\n📂 Category: ${scheme.category}`,
      `\n📝 Benefits: ${scheme.benefits}`,
    ];

    if (scheme.eligibility) {
      const elig = scheme.eligibility;
      const eligParts = [];

      if (elig.age) {
        eligParts.push(`Age: ${elig.age.min || 'Any'} - ${elig.age.max || 'Any'}`);
      }
      if (elig.income) {
        eligParts.push(
          `Income: ₹${elig.income.min?.toLocaleString() || '0'} - ₹${elig.income.max?.toLocaleString() || 'No limit'}`
        );
      }
      if (elig.employment && elig.employment.length > 0) {
        eligParts.push(`Employment: ${elig.employment.join(', ')}`);
      }
      if (elig.povertyLine) {
        eligParts.push(`Poverty Line: ${elig.povertyLine}`);
      }

      if (eligParts.length > 0) {
        parts.push(`\n\n✅ Eligibility Criteria:\n${eligParts.map(e => `  • ${e}`).join('\n')}`);
      }
    }

    parts.push(
      `\n\n📞 Want to know more? Ask me about eligibility, documents needed, or how to apply!`
    );

    return parts.join('');
  }

  /**
   * Format multiple schemes
   */
  private static formatMultipleSchemes(schemes: any[]): string {
    const schemeList = schemes
      .map((s, i) => `${i + 1}. **${s.name}** (${s.category})\n   ${s.benefits}`)
      .join('\n\n');

    return `🎯 Here are relevant schemes for your search:\n\n${schemeList}\n\n📝 Ask me about any of these schemes to learn more!`;
  }

  /**
   * Get eligibility information
   */
  static checkEligibility(userProfile: any, schemeName: string): string {
    const scheme = this.findSchemeByName(schemeName);
    if (!scheme) {
      return `I don't have detailed information about that scheme. Please try another scheme.`;
    }

    const eligibility = (scheme as any).eligibility;
    if (!eligibility) {
      return `Eligibility criteria not available for ${schemeName}.`;
    }

    const issues: string[] = [];
    const meets: string[] = [];

    // Check age
    if (eligibility.age && userProfile.age) {
      if (userProfile.age >= eligibility.age.min && userProfile.age <= eligibility.age.max) {
        meets.push(`✓ Age (${userProfile.age} years) - Eligible`);
      } else {
        issues.push(
          `✗ Age: You need to be ${eligibility.age.min}-${eligibility.age.max} years old`
        );
      }
    }

    // Check income
    if (eligibility.income && userProfile.income) {
      if (
        userProfile.income >= eligibility.income.min &&
        userProfile.income <= eligibility.income.max
      ) {
        meets.push(`✓ Income (₹${userProfile.income}) - Eligible`);
      } else {
        issues.push(`✗ Income: Scheme is for income ₹${eligibility.income.min}-₹${eligibility.income.max}`);
      }
    }

    // Check employment
    if (eligibility.employment && userProfile.employment) {
      if (eligibility.employment.includes(userProfile.employment)) {
        meets.push(`✓ Employment (${userProfile.employment}) - Eligible`);
      } else {
        issues.push(
          `✗ Employment: Scheme is for ${eligibility.employment.join(', ')}`
        );
      }
    }

    const response = [
      `📋 **Eligibility Check for ${(scheme as any).name}**\n`,
    ];

    if (meets.length > 0) {
      response.push(`✅ You Meet These Criteria:\n${meets.map(m => `  ${m}`).join('\n')}\n`);
    }

    if (issues.length > 0) {
      response.push(`⚠️ Issues:\n${issues.map(i => `  ${i}`).join('\n')}\n`);
    }

    if (issues.length === 0 && meets.length > 0) {
      response.push(`\n🎉 Great! You appear to be eligible for this scheme!`);
    }

    response.push(`\n📞 Would you like to know how to apply?`);

    return response.join('');
  }

  /**
   * Get application information
   */
  static getApplicationInfo(schemeName: string): string {
    const scheme = this.findSchemeByName(schemeName);
    if (!scheme) {
      return `I don't have information about that scheme.`;
    }

    return `📝 **How to Apply for ${(scheme as any).name}**

**Steps:**
1. Check your eligibility (ask me "am I eligible?")
2. Gather required documents
3. Visit the official scheme website or government office
4. Fill the application form
5. Submit with required documents
6. Track application status online

**Documents Typically Needed:**
• Identity Proof
• Income Certificate
• Address Proof
• Age Proof
• Employment Certificate (if applicable)

**Processing Time:** Usually 30-90 days depending on the scheme

📞 Ask me about "Documents needed" for more specific details!`;
  }

  /**
   * Find scheme by name
   */
  private static findSchemeByName(name: string): any | null {
    const lowerName = name.toLowerCase();
    for (const scheme of Object.values(CHATBOT_TRAINING_DATA.sampleSchemes)) {
      const s = scheme as any;
      if (s.name.toLowerCase().includes(lowerName) || lowerName.includes(s.name.toLowerCase())) {
        return scheme;
      }
    }
    return null;
  }

  /**
   * Get all available schemes
   */
  static getAllSchemes(): string {
    const schemeList = Object.values(CHATBOT_TRAINING_DATA.sampleSchemes)
      .map((s: any) => `• **${s.name}** (${s.category})\n  ${s.benefits}`)
      .join('\n\n');

    return `📚 **Available Government Schemes**\n\n${schemeList}\n\n💡 Ask me about any scheme to learn more!`;
  }
}
