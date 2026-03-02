import { Driver } from 'neo4j-driver';
import { UserProfile } from '../auth/types';
import { ProfileUpdateInput, ProfileResult, ProfileDeletionResult, ProfileCompletenessDetails } from './types';
import { getCacheService } from '../cache/cache.service';
import { encryptProfile, decryptProfile } from '../encryption';

export class ProfileService {
  private driver: Driver;
  private cacheService = getCacheService();

  constructor(driver: Driver) {
    this.driver = driver;
  }

  /**
   * Get user profile by userId
   * Uses parameterized queries to prevent injection
   */
  async getProfile(userId: string): Promise<Omit<UserProfile, 'passwordHash'> | null> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        'MATCH (u:User {userId: $userId}) RETURN u',
        { userId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const userNode = result.records[0].get('u').properties;
      const profile = await this.mapNodeToUserProfile(userNode);
      
      const { passwordHash: _, ...profileWithoutPassword } = profile;
      return profileWithoutPassword;
    } finally {
      await session.close();
    }
  }

  /**
   * Update user profile with transaction support and retry logic
   * Uses parameterized queries to prevent injection
   */
  async updateProfile(userId: string, updates: ProfileUpdateInput): Promise<ProfileResult> {
    // Validate updates
    this.validateProfileUpdates(updates);

    // Get current profile
    const currentProfile = await this.getProfile(userId);
    if (!currentProfile) {
      throw new Error('User not found');
    }

    // Execute update with transaction and retry logic
    const updatedProfile = await this.executeWithRetry(async () => {
      return await this.executeProfileUpdate(userId, updates, currentProfile);
    });

    // Invalidate cached recommendations
    await this.invalidateUserCache(userId);

    return {
      profile: updatedProfile,
      message: 'Profile updated successfully. Recalculating recommendations...'
    };
  }

  /**
   * Delete user profile with transaction support
   * Uses parameterized queries to prevent injection
   */
  async deleteProfile(userId: string): Promise<ProfileDeletionResult> {
    // Execute deletion with transaction and retry logic
    await this.executeWithRetry(async () => {
      return await this.executeProfileDeletion(userId);
    });

    // Clear all user-related cache
    await this.clearUserCache(userId);

    return {
      success: true,
      message: 'Profile deleted successfully'
    };
  }

  /**
   * Calculate profile completeness
   */
  calculateProfileCompleteness(profile: Partial<UserProfile>): ProfileCompletenessDetails {
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'maritalStatus',
      'familySize', 'annualIncome', 'employmentStatus', 'occupation',
      'state', 'district', 'pincode', 'educationLevel', 'caste'
    ];

    const optionalFields = ['religion', 'disabilityType'];

    const filledFields: string[] = [];
    const missingFields: string[] = [];

    // Check required fields
    for (const field of requiredFields) {
      const value = (profile as any)[field];
      if (value !== undefined && value !== null && value !== '') {
        filledFields.push(field);
      } else {
        missingFields.push(field);
      }
    }

    // Check optional fields
    for (const field of optionalFields) {
      const value = (profile as any)[field];
      if (value !== undefined && value !== null && value !== '') {
        filledFields.push(field);
      }
    }

    const totalFields = requiredFields.length + optionalFields.length;
    const percentage = Math.round((filledFields.length / totalFields) * 100);

    return {
      percentage,
      missingFields,
      optionalFields: optionalFields.filter(f => !filledFields.includes(f)),
      filledFields
    };
  }

  /**
   * Execute profile update within a transaction
   * Private method used by updateProfile
   */
  private async executeProfileUpdate(
    userId: string,
    updates: ProfileUpdateInput,
    currentProfile: Omit<UserProfile, 'passwordHash'>
  ): Promise<Omit<UserProfile, 'passwordHash'>> {
    const session = this.driver.session();
    
    try {
      // Encrypt sensitive fields in updates
      const encryptedUpdates = await encryptProfile(updates);
      
      // Use transaction to ensure consistency
      const result = await session.executeWrite(async (tx) => {
        // Build update query dynamically based on provided fields
        const setStatements: string[] = [];
        const parameters: Record<string, any> = { userId };

        // Update timestamp
        setStatements.push('u.updatedAt = datetime($updatedAt)');
        parameters.updatedAt = new Date().toISOString();

        // Process each update field (using encrypted values for sensitive fields)
        if (encryptedUpdates.firstName !== undefined) {
          setStatements.push('u.firstName = $firstName');
          parameters.firstName = encryptedUpdates.firstName;
        }
        if (encryptedUpdates.lastName !== undefined) {
          setStatements.push('u.lastName = $lastName');
          parameters.lastName = encryptedUpdates.lastName;
        }
        if (encryptedUpdates.dateOfBirth !== undefined) {
          const dob = updates.dateOfBirth ? new Date(updates.dateOfBirth) : null;
          if (dob) {
            setStatements.push('u.dateOfBirth = datetime($dateOfBirth)');
            setStatements.push('u.age = $age');
            // dateOfBirth is encrypted, so we store the encrypted value
            parameters.dateOfBirth = typeof encryptedUpdates.dateOfBirth === 'string' 
              ? encryptedUpdates.dateOfBirth 
              : encryptedUpdates.dateOfBirth;
            parameters.age = this.calculateAge(dob);
          }
        }
        if (updates.gender !== undefined) {
          setStatements.push('u.gender = $gender');
          parameters.gender = updates.gender;
        }
        if (updates.maritalStatus !== undefined) {
          setStatements.push('u.maritalStatus = $maritalStatus');
          parameters.maritalStatus = updates.maritalStatus;
        }
        if (updates.familySize !== undefined) {
          setStatements.push('u.familySize = $familySize');
          parameters.familySize = updates.familySize;
        }
        if (encryptedUpdates.annualIncome !== undefined) {
          setStatements.push('u.annualIncome = $annualIncome');
          setStatements.push('u.incomeLevel = $incomeLevel');
          parameters.annualIncome = encryptedUpdates.annualIncome;
          parameters.incomeLevel = updates.annualIncome !== undefined 
            ? this.determineIncomeLevel(updates.annualIncome) 
            : currentProfile.incomeLevel;
        }
        if (updates.employmentStatus !== undefined) {
          setStatements.push('u.employmentStatus = $employmentStatus');
          parameters.employmentStatus = updates.employmentStatus;
        }
        if (updates.occupation !== undefined) {
          setStatements.push('u.occupation = $occupation');
          setStatements.push('u.occupationCategory = $occupationCategory');
          parameters.occupation = updates.occupation;
          parameters.occupationCategory = this.determineOccupationCategory(updates.occupation);
        }
        if (updates.state !== undefined) {
          setStatements.push('u.state = $state');
          parameters.state = updates.state;
        }
        if (updates.district !== undefined) {
          setStatements.push('u.district = $district');
          parameters.district = updates.district;
        }
        if (encryptedUpdates.pincode !== undefined) {
          setStatements.push('u.pincode = $pincode');
          setStatements.push('u.ruralUrban = $ruralUrban');
          parameters.pincode = encryptedUpdates.pincode;
          parameters.ruralUrban = updates.pincode 
            ? this.determineRuralUrban(updates.pincode) 
            : currentProfile.ruralUrban;
        }
        if (updates.educationLevel !== undefined) {
          setStatements.push('u.educationLevel = $educationLevel');
          parameters.educationLevel = updates.educationLevel;
        }
        if (updates.caste !== undefined) {
          setStatements.push('u.caste = $caste');
          parameters.caste = updates.caste;
        }
        if (updates.religion !== undefined) {
          setStatements.push('u.religion = $religion');
          parameters.religion = updates.religion;
        }
        if (updates.disability !== undefined) {
          setStatements.push('u.disability = $disability');
          parameters.disability = updates.disability;
        }
        if (updates.disabilityType !== undefined) {
          setStatements.push('u.disabilityType = $disabilityType');
          parameters.disabilityType = updates.disabilityType;
        }

        // Calculate new profile completeness
        const mergedProfile: any = { ...currentProfile, ...updates };
        // Convert dateOfBirth string to Date if needed
        if (updates.dateOfBirth && typeof updates.dateOfBirth === 'string') {
          mergedProfile.dateOfBirth = new Date(updates.dateOfBirth);
        }
        const completeness = this.calculateProfileCompleteness(mergedProfile);
        setStatements.push('u.profileCompleteness = $profileCompleteness');
        parameters.profileCompleteness = completeness.percentage;

        // Execute update query
        const query = `
          MATCH (u:User {userId: $userId})
          SET ${setStatements.join(', ')}
          RETURN u
        `;

        const updateResult = await tx.run(query, parameters);
        
        if (updateResult.records.length === 0) {
          throw new Error('User not found');
        }

        return updateResult.records[0].get('u').properties;
      });

      const updatedProfile = await this.mapNodeToUserProfile(result);
      const { passwordHash: _, ...profileWithoutPassword } = updatedProfile;
      return profileWithoutPassword;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute profile deletion within a transaction
   * Private method used by deleteProfile
   */
  private async executeProfileDeletion(userId: string): Promise<void> {
    const session = this.driver.session();
    
    try {
      // Use transaction to ensure all related data is deleted
      await session.executeWrite(async (tx) => {
        // Delete user and all relationships
        await tx.run(
          `
          MATCH (u:User {userId: $userId})
          DETACH DELETE u
          `,
          { userId }
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Execute operation with retry logic (up to 3 attempts)
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Operation attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 100));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Invalidate user-specific cache entries
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    try {
      // Invalidate recommendations cache
      await this.cacheService.delete(`recommendations:${userId}`);
      
      // Invalidate user groups cache
      await this.cacheService.delete(`user_groups:${userId}`);
      
      // Invalidate classification cache
      await this.cacheService.delete(`classification:${userId}`);
      
      // Invalidate all eligibility scores for this user
      await this.cacheService.deletePattern(`eligibility:${userId}:*`);
    } catch (error) {
      console.error('Error invalidating user cache:', error);
      // Don't throw - cache invalidation failure shouldn't break the update
    }
  }

  /**
   * Clear all cache entries for a user
   */
  private async clearUserCache(userId: string): Promise<void> {
    try {
      await this.cacheService.deletePattern(`*:${userId}:*`);
      await this.cacheService.deletePattern(`*:${userId}`);
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }

  /**
   * Validate profile update input
   */
  private validateProfileUpdates(updates: ProfileUpdateInput): void {
    // Validate pincode format if provided
    if (updates.pincode && !/^\d{6}$/.test(updates.pincode)) {
      throw new Error('Pincode must be 6 digits');
    }

    // Validate family size if provided
    if (updates.familySize !== undefined && updates.familySize < 1) {
      throw new Error('Family size must be at least 1');
    }

    // Validate annual income if provided
    if (updates.annualIncome !== undefined && updates.annualIncome < 0) {
      throw new Error('Annual income cannot be negative');
    }

    // Validate date of birth if provided
    if (updates.dateOfBirth) {
      const dob = new Date(updates.dateOfBirth);
      if (isNaN(dob.getTime())) {
        throw new Error('Invalid date of birth');
      }
      const age = this.calculateAge(dob);
      if (age < 0 || age > 150) {
        throw new Error('Invalid date of birth');
      }
    }
  }

  /**
   * Map Neo4j node to UserProfile
   */
  private async mapNodeToUserProfile(node: any): Promise<UserProfile> {
    const encryptedProfile = {
      userId: node.userId,
      email: node.email,
      passwordHash: node.passwordHash,
      emailVerified: node.emailVerified,
      firstName: node.firstName,
      lastName: node.lastName,
      dateOfBirth: new Date(node.dateOfBirth),
      age: node.age,
      gender: node.gender,
      maritalStatus: node.maritalStatus,
      familySize: node.familySize,
      annualIncome: node.annualIncome,
      incomeLevel: node.incomeLevel,
      employmentStatus: node.employmentStatus,
      occupation: node.occupation,
      occupationCategory: node.occupationCategory,
      state: node.state,
      district: node.district,
      pincode: node.pincode,
      ruralUrban: node.ruralUrban,
      educationLevel: node.educationLevel,
      caste: node.caste,
      religion: node.religion,
      disability: node.disability,
      disabilityType: node.disabilityType,
      userGroups: node.userGroups || [],
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt),
      lastLoginAt: new Date(node.lastLoginAt),
      profileCompleteness: node.profileCompleteness,
    };
    
    // Decrypt sensitive fields
    return await decryptProfile(encryptedProfile);
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Determine income level from annual income
   */
  private determineIncomeLevel(annualIncome: number): 'below_poverty' | 'low' | 'middle' | 'high' {
    if (annualIncome < 100000) return 'below_poverty';
    if (annualIncome < 500000) return 'low';
    if (annualIncome < 1500000) return 'middle';
    return 'high';
  }

  /**
   * Determine rural/urban from pincode
   */
  private determineRuralUrban(_pincode: string): 'rural' | 'urban' | 'semi_urban' {
    // Simplified logic - in production, this would use a pincode database
    return 'urban';
  }

  /**
   * Determine occupation category from occupation
   */
  private determineOccupationCategory(occupation: string): string {
    const lowerOccupation = occupation.toLowerCase();
    
    if (lowerOccupation.includes('farmer') || lowerOccupation.includes('agriculture')) {
      return 'agriculture';
    }
    if (lowerOccupation.includes('teacher') || lowerOccupation.includes('education')) {
      return 'education';
    }
    if (lowerOccupation.includes('doctor') || lowerOccupation.includes('nurse') || lowerOccupation.includes('health')) {
      return 'healthcare';
    }
    if (lowerOccupation.includes('engineer') || lowerOccupation.includes('developer') || lowerOccupation.includes('tech')) {
      return 'technology';
    }
    if (lowerOccupation.includes('business') || lowerOccupation.includes('entrepreneur')) {
      return 'business';
    }
    
    return 'other';
  }
}
