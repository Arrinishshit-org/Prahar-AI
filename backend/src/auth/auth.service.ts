import { Driver } from 'neo4j-driver';
import * as crypto from 'crypto';
import { JWTService } from './jwt.service';
import { PasswordService } from './password.service';
import { UserProfile, RegistrationInput, AuthResult, LoginInput } from './types';
import { encryptProfile, decryptProfile } from '../encryption';

export class AuthService {
  private jwtService: JWTService;
  private passwordService: PasswordService;
  private driver: Driver;

  constructor(driver: Driver) {
    this.driver = driver;
    this.jwtService = new JWTService();
    this.passwordService = new PasswordService();
  }

  async register(input: RegistrationInput): Promise<AuthResult> {
    const session = this.driver.session();

    try {
      // Validate password strength
      const passwordValidation = this.passwordService.validatePasswordStrength(input.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
      }

      // Validate required fields
      this.validateRegistrationInput(input);

      // Check for duplicate email
      const existingUser = await this.findUserByEmail(input.email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await this.passwordService.hashPassword(input.password);

      // Calculate age from date of birth
      const dateOfBirth = new Date(input.profile.dateOfBirth);
      const age = this.calculateAge(dateOfBirth);

      // Determine income level
      const incomeLevel = this.determineIncomeLevel(input.profile.annualIncome);

      // Determine rural/urban
      const ruralUrban = this.determineRuralUrban(input.profile.pincode);

      // Determine occupation category
      const occupationCategory = this.determineOccupationCategory(input.profile.occupation);

      // Create user profile
      const userId = crypto.randomUUID();
      const now = new Date();

      const userProfile: UserProfile = {
        userId,
        email: input.email,
        passwordHash,
        emailVerified: false,
        firstName: input.profile.firstName,
        lastName: input.profile.lastName,
        dateOfBirth,
        age,
        gender: input.profile.gender,
        maritalStatus: input.profile.maritalStatus,
        familySize: input.profile.familySize,
        annualIncome: input.profile.annualIncome,
        incomeLevel,
        employmentStatus: input.profile.employmentStatus,
        occupation: input.profile.occupation,
        occupationCategory,
        state: input.profile.state,
        district: input.profile.district,
        pincode: input.profile.pincode,
        ruralUrban,
        educationLevel: input.profile.educationLevel,
        caste: input.profile.caste,
        religion: input.profile.religion,
        disability: input.profile.disability,
        disabilityType: input.profile.disabilityType,
        userGroups: [],
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        profileCompleteness: this.calculateProfileCompleteness(input.profile),
      };

      // Store user in database
      await this.createUser(userProfile);

      // Generate tokens
      const tokens = this.jwtService.generateTokenPair(userId, input.email, 'user');

      // Return auth result without password hash
      const { passwordHash: _, ...userWithoutPassword } = userProfile;

      return {
        ...tokens,
        user: userWithoutPassword,
      };
    } finally {
      await session.close();
    }
  }

  private validateRegistrationInput(input: RegistrationInput): void {
    const missing: string[] = [];

    if (!input.email) missing.push('email');
    if (!input.password) missing.push('password');
    if (!input.profile.firstName) missing.push('firstName');
    if (!input.profile.lastName) missing.push('lastName');
    if (!input.profile.dateOfBirth) missing.push('dateOfBirth');
    if (!input.profile.gender) missing.push('gender');
    if (!input.profile.maritalStatus) missing.push('maritalStatus');
    if (input.profile.familySize === undefined) missing.push('familySize');
    if (input.profile.annualIncome === undefined) missing.push('annualIncome');
    if (!input.profile.employmentStatus) missing.push('employmentStatus');
    if (!input.profile.occupation) missing.push('occupation');
    if (!input.profile.state) missing.push('state');
    if (!input.profile.district) missing.push('district');
    if (!input.profile.pincode) missing.push('pincode');
    if (!input.profile.educationLevel) missing.push('educationLevel');
    if (!input.profile.caste) missing.push('caste');

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new Error('Invalid email format');
    }

    // Validate pincode format (6 digits)
    if (!/^\d{6}$/.test(input.profile.pincode)) {
      throw new Error('Pincode must be 6 digits');
    }

    // Validate family size
    if (input.profile.familySize < 1) {
      throw new Error('Family size must be at least 1');
    }

    // Validate annual income
    if (input.profile.annualIncome < 0) {
      throw new Error('Annual income cannot be negative');
    }
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  private determineIncomeLevel(annualIncome: number): 'below_poverty' | 'low' | 'middle' | 'high' {
    if (annualIncome < 100000) return 'below_poverty';
    if (annualIncome < 500000) return 'low';
    if (annualIncome < 1500000) return 'middle';
    return 'high';
  }

  private determineRuralUrban(_pincode: string): 'rural' | 'urban' | 'semi_urban' {
    // Simplified logic - in production, this would use a pincode database
    // For now, we'll use a simple heuristic
    return 'urban';
  }

  private determineOccupationCategory(occupation: string): string {
    // Simplified categorization
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

  private calculateProfileCompleteness(profile: any): number {
    const totalFields = 16;
    let filledFields = 0;

    const fields = [
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'maritalStatus',
      'familySize', 'annualIncome', 'employmentStatus', 'occupation',
      'state', 'district', 'pincode', 'educationLevel', 'caste'
    ];

    for (const field of fields) {
      if (profile[field] !== undefined && profile[field] !== null && profile[field] !== '') {
        filledFields++;
      }
    }

    // Optional fields
    if (profile.religion) filledFields++;
    if (profile.disability && profile.disabilityType) filledFields++;

    return Math.round((filledFields / totalFields) * 100);
  }

  private async findUserByEmail(email: string): Promise<UserProfile | null> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        'MATCH (u:User {email: $email}) RETURN u',
        { email }
      );

      if (result.records.length === 0) {
        return null;
      }

      const userNode = result.records[0].get('u').properties;
      return await this.mapNodeToUserProfile(userNode);
    } finally {
      await session.close();
    }
  }

  private async createUser(profile: UserProfile): Promise<void> {
    const session = this.driver.session();
    
    try {
      // Encrypt sensitive fields before storing
      const encryptedProfile = await encryptProfile(profile);
      
      await session.run(
        `CREATE (u:User {
          userId: $userId,
          email: $email,
          passwordHash: $passwordHash,
          emailVerified: $emailVerified,
          firstName: $firstName,
          lastName: $lastName,
          dateOfBirth: datetime($dateOfBirth),
          age: $age,
          gender: $gender,
          maritalStatus: $maritalStatus,
          familySize: $familySize,
          annualIncome: $annualIncome,
          incomeLevel: $incomeLevel,
          employmentStatus: $employmentStatus,
          occupation: $occupation,
          occupationCategory: $occupationCategory,
          state: $state,
          district: $district,
          pincode: $pincode,
          ruralUrban: $ruralUrban,
          educationLevel: $educationLevel,
          caste: $caste,
          religion: $religion,
          disability: $disability,
          disabilityType: $disabilityType,
          userGroups: $userGroups,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt),
          lastLoginAt: datetime($lastLoginAt),
          profileCompleteness: $profileCompleteness
        })`,
        {
          userId: encryptedProfile.userId,
          email: encryptedProfile.email,
          passwordHash: encryptedProfile.passwordHash,
          emailVerified: encryptedProfile.emailVerified,
          firstName: encryptedProfile.firstName,
          lastName: encryptedProfile.lastName,
          dateOfBirth: typeof encryptedProfile.dateOfBirth === 'string' 
            ? encryptedProfile.dateOfBirth 
            : encryptedProfile.dateOfBirth.toISOString(),
          age: encryptedProfile.age,
          gender: encryptedProfile.gender,
          maritalStatus: encryptedProfile.maritalStatus,
          familySize: encryptedProfile.familySize,
          annualIncome: encryptedProfile.annualIncome,
          incomeLevel: encryptedProfile.incomeLevel,
          employmentStatus: encryptedProfile.employmentStatus,
          occupation: encryptedProfile.occupation,
          occupationCategory: encryptedProfile.occupationCategory,
          state: encryptedProfile.state,
          district: encryptedProfile.district,
          pincode: encryptedProfile.pincode,
          ruralUrban: encryptedProfile.ruralUrban,
          educationLevel: encryptedProfile.educationLevel,
          caste: encryptedProfile.caste,
          religion: encryptedProfile.religion || null,
          disability: encryptedProfile.disability,
          disabilityType: encryptedProfile.disabilityType || null,
          userGroups: encryptedProfile.userGroups,
          createdAt: encryptedProfile.createdAt.toISOString(),
          updatedAt: encryptedProfile.updatedAt.toISOString(),
          lastLoginAt: encryptedProfile.lastLoginAt.toISOString(),
          profileCompleteness: encryptedProfile.profileCompleteness,
        }
      );
    } finally {
      await session.close();
    }
  }

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

  async login(input: LoginInput): Promise<AuthResult> {
    const session = this.driver.session();

    try {
      // Find user by email
      const user = await this.findUserByEmail(input.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await this.passwordService.verifyPassword(
        input.password,
        user.passwordHash
      );

      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login time
      await this.updateLastLogin(user.userId);
      user.lastLoginAt = new Date();

      // Generate tokens
      const tokens = this.jwtService.generateTokenPair(user.userId, user.email, 'user');

      // Return auth result without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        ...tokens,
        user: userWithoutPassword,
      };
    } finally {
      await session.close();
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verifyRefreshToken(refreshToken);

      // Get user profile
      const user = await this.findUserByEmail(payload.email);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const accessToken = this.jwtService.generateAccessToken(
        user.userId,
        user.email,
        payload.role
      );

      // Return auth result without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        accessToken,
        refreshToken, // Return the same refresh token
        expiresIn: 15 * 60,
        user: userWithoutPassword,
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    // In a production system, you would invalidate the refresh token here
    // For now, we'll just log the action
    console.log(`User ${userId} logged out`);
  }

  private async updateLastLogin(userId: string): Promise<void> {
    const session = this.driver.session();
    
    try {
      await session.run(
        'MATCH (u:User {userId: $userId}) SET u.lastLoginAt = datetime($now)',
        { userId, now: new Date().toISOString() }
      );
    } finally {
      await session.close();
    }
  }

  async getUserProfile(userId: string): Promise<Omit<UserProfile, 'passwordHash'> | null> {
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
      const user = await this.mapNodeToUserProfile(userNode);
      
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } finally {
      await session.close();
    }
  }
}
