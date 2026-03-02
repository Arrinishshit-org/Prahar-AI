export interface UserProfile {
  userId: string;
  
  // Authentication
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  
  // Demographics
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  familySize: number;
  
  // Economic
  annualIncome: number;
  incomeLevel: 'below_poverty' | 'low' | 'middle' | 'high';
  employmentStatus: 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired';
  occupation: string;
  occupationCategory: string;
  
  // Geographic
  state: string;
  district: string;
  pincode: string;
  ruralUrban: 'rural' | 'urban' | 'semi_urban';
  
  // Categorical
  educationLevel: 'no_formal' | 'primary' | 'secondary' | 'higher_secondary' | 'graduate' | 'postgraduate';
  caste: 'general' | 'obc' | 'sc' | 'st' | 'other';
  religion?: string;
  disability: boolean;
  disabilityType?: string;
  
  // System
  userGroups: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  profileCompleteness: number;
}

export interface RegistrationInput {
  email: string;
  password: string;
  profile: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    familySize: number;
    annualIncome: number;
    employmentStatus: 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired';
    occupation: string;
    state: string;
    district: string;
    pincode: string;
    educationLevel: 'no_formal' | 'primary' | 'secondary' | 'higher_secondary' | 'graduate' | 'postgraduate';
    caste: 'general' | 'obc' | 'sc' | 'st' | 'other';
    disability: boolean;
    disabilityType?: string;
    religion?: string;
  };
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: Omit<UserProfile, 'passwordHash'>;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}
