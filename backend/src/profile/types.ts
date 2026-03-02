import { UserProfile } from '../auth/types';

/**
 * Profile update input - allows partial updates
 */
export interface ProfileUpdateInput {
  // Demographics
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  familySize?: number;
  
  // Economic
  annualIncome?: number;
  employmentStatus?: 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired';
  occupation?: string;
  
  // Geographic
  state?: string;
  district?: string;
  pincode?: string;
  
  // Categorical
  educationLevel?: 'no_formal' | 'primary' | 'secondary' | 'higher_secondary' | 'graduate' | 'postgraduate';
  caste?: 'general' | 'obc' | 'sc' | 'st' | 'other';
  religion?: string;
  disability?: boolean;
  disabilityType?: string;
}

/**
 * Profile service result
 */
export interface ProfileResult {
  profile: Omit<UserProfile, 'passwordHash'>;
  message?: string;
}

/**
 * Profile deletion result
 */
export interface ProfileDeletionResult {
  success: boolean;
  message: string;
}

/**
 * Profile completeness breakdown
 */
export interface ProfileCompletenessDetails {
  percentage: number;
  missingFields: string[];
  optionalFields: string[];
  filledFields: string[];
}
