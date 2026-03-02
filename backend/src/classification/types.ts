/**
 * Classification service types
 * 
 * Defines interfaces for user classification, group assignments,
 * and feature vectors used by the ML-based classification engine.
 */

/**
 * User group assignment result
 */
export interface UserGroupAssignment {
  userId: string;
  groups: UserGroup[];
  confidence: number;
  features: number[];
  timestamp: Date;
}

/**
 * User group information
 */
export interface UserGroup {
  groupId: number;
  groupName: string;
  description: string;
  memberCount: number;
  typicalProfile?: TypicalProfile;
}

/**
 * Typical profile characteristics for a user group
 */
export interface TypicalProfile {
  ageRange: [number, number];
  incomeRange: [number, number];
  commonGender?: string;
  commonMaritalStatus?: string;
  commonEmploymentStatus?: string;
  commonEducationLevel?: string;
  commonState?: string;
  commonRuralUrban?: string;
  memberCount: number;
}

/**
 * Classification request for a single user
 */
export interface ClassifyUserRequest {
  userId: string;
  confidenceThreshold?: number;
  multiGroupThreshold?: number;
}

/**
 * Classification response
 */
export interface ClassifyUserResponse {
  userId: string;
  groups: UserGroup[];
  confidence: number;
  timestamp: Date;
  message?: string;
}

/**
 * Batch reclassification result
 */
export interface BatchReclassificationResult {
  totalUsers: number;
  successCount: number;
  failureCount: number;
  duration: number;
  errors: Array<{
    userId: string;
    error: string;
  }>;
}

/**
 * Classification performance metrics
 */
export interface ClassificationMetrics {
  userId: string;
  classificationTime: number;
  confidence: number;
  groupCount: number;
  timestamp: Date;
}

/**
 * User profile for classification (subset of full profile)
 */
export interface ClassificationProfile {
  user_id: string;
  age: number;
  gender: string;
  marital_status: string;
  family_size: number;
  annual_income: number;
  employment_status: string;
  state: string;
  rural_urban: string;
  education_level: string;
  caste: string;
  disability: boolean;
}
