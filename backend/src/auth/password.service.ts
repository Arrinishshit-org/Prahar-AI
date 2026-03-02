import * as bcrypt from 'bcrypt';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export class PasswordService {
  private readonly COST_FACTOR = 12;

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.COST_FACTOR);
    return bcrypt.hash(password, salt);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validatePasswordStrength(password: string): ValidationResult {
    // Minimum 8 characters
    if (password.length < 8) {
      return {
        valid: false,
        message: 'Password must be at least 8 characters long',
      };
    }

    // At least 1 uppercase letter
    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one uppercase letter',
      };
    }

    // At least 1 lowercase letter
    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one lowercase letter',
      };
    }

    // At least 1 number
    if (!/\d/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one number',
      };
    }

    // At least 1 special character
    if (!/[@$!%*?&]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one special character (@$!%*?&)',
      };
    }

    return { valid: true };
  }
}
