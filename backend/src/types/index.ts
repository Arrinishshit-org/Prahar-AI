/**
 * Type definitions for the Personalized Scheme Recommendation System
 */

// User Profile Types
export interface UserProfile {
  userId: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  familySize: number;
  annualIncome: number;
  incomeLevel: 'below_poverty' | 'low' | 'middle' | 'high';
  employmentStatus: 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired';
  occupation: string;
  occupationCategory: string;
  state: string;
  district: string;
  pincode: string;
  ruralUrban: 'rural' | 'urban' | 'semi_urban';
  educationLevel:
    | 'no_formal'
    | 'primary'
    | 'secondary'
    | 'higher_secondary'
    | 'graduate'
    | 'postgraduate';
  caste: 'general' | 'obc' | 'sc' | 'st' | 'other';
  religion?: string;
  disability: boolean;
  disabilityType?: string;
  userGroups: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  profileCompleteness: number;
}

// Scheme Types
export interface Scheme {
  schemeId: string;
  schemeName: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  subCategory: string;
  sponsoredBy: string;
  eligibility: SchemeEligibility;
  benefits: SchemeBenefit[];
  applicationProcess: ApplicationProcess;
  launchDate: Date;
  applicationDeadline?: Date;
  isActive: boolean;
  sourceUrl: string;
  lastUpdated: Date;
  viewCount: number;
  applicationCount: number;
  eligibilityVector: number[];
}

export interface SchemeEligibility {
  ageMin?: number;
  ageMax?: number;
  gender?: string[];
  incomeMax?: number;
  states?: string[];
  districts?: string[];
  ruralUrban?: string[];
  occupations?: string[];
  educationLevels?: string[];
  castes?: string[];
  disability?: boolean;
  otherCriteria?: Record<string, any>;
}

export interface SchemeBenefit {
  type: 'financial' | 'subsidy' | 'training' | 'healthcare' | 'education' | 'other';
  amount?: number;
  description: string;
  duration?: string;
}

export interface ApplicationProcess {
  steps: string[];
  requiredDocuments: string[];
  applicationUrl: string;
  helplineNumber?: string;
  processingTime?: string;
}

// Eligibility Score Types
export interface EligibilityScore {
  scoreId: string;
  userId: string;
  schemeId: string;
  rawScore: number;
  percentage: number;
  category: 'highly_eligible' | 'potentially_eligible' | 'low_eligibility';
  metCriteria: MetCriterion[];
  unmetCriteria: UnmetCriterion[];
  calculatedAt: Date;
  expiresAt: Date;
  version: string;
}

export interface MetCriterion {
  criterionName: string;
  weight: number;
  contribution: number;
}

export interface UnmetCriterion {
  criterionName: string;
  required: boolean;
  userValue: any;
  requiredValue: any;
  gap: string;
}

// Nudge Types
export interface Nudge {
  nudgeId: string;
  userId: string;
  type: 'new_scheme' | 'deadline_reminder' | 'profile_update_suggestion';
  schemeId?: string;
  title: string;
  message: string;
  actionUrl: string;
  priority: 'high' | 'medium' | 'low';
  eligibilityScore?: number;
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
  deliveryStatus: DeliveryStatus[];
  viewed: boolean;
  viewedAt?: Date;
  clicked: boolean;
  clickedAt?: Date;
  dismissed: boolean;
  dismissedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

export interface DeliveryStatus {
  channel: string;
  delivered: boolean;
  deliveredAt?: Date;
  error?: string;
}

// Conversation Types
export interface ConversationSession {
  sessionId: string;
  userId?: string;
  messages: Message[];
  toolExecutions: ToolExecution[];
  currentIntent?: Intent;
  extractedEntities: Entity[];
  userProfile?: UserProfile;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface Message {
  messageId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ToolExecution {
  executionId: string;
  toolName: string;
  parameters: Record<string, any>;
  result: ToolResult;
  timestamp: Date;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: ErrorInfo;
  metadata: {
    executionTime: number;
    cacheHit: boolean;
    toolVersion: string;
  };
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Intent and Entity Types
export type Intent =
  | 'scheme_search'
  | 'eligibility_check'
  | 'application_info'
  | 'deadline_query'
  | 'profile_update'
  | 'general_question'
  | 'nudge_preferences'
  | 'unknown_intent';

export interface Entity {
  type: 'location' | 'income' | 'occupation' | 'age' | 'scheme_name';
  value: string;
  confidence: number;
}

// Recommendation Types
export interface SchemeRecommendation {
  schemeId: string;
  schemeName: string;
  relevanceScore: number;
  matchingCriteria: string[];
  explanation: string;
  eligibilityScore: number;
}

// User Group Types
export interface UserGroup {
  groupId: string;
  groupName: string;
  description: string;
  memberCount: number;
  typicalSchemes: string[];
}

// Classification Types
export interface UserGroupAssignment {
  userId: string;
  groups: UserGroup[];
  confidence: number;
  timestamp: Date;
}
