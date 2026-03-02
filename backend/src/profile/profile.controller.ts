import { Request, Response } from 'express';
import { ProfileService } from './profile.service';
import { ProfileUpdateInput } from './types';

/**
 * Profile Controller
 * Handles HTTP requests for profile management
 */
export class ProfileController {
  private profileService: ProfileService;

  constructor(profileService: ProfileService) {
    this.profileService = profileService;
  }

  /**
   * GET /api/users/:userId/profile
   * Get user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Verify authenticated user can only access their own profile
      // (In production, this would check JWT token)
      const authenticatedUserId = (req as any).user?.userId;
      if (authenticatedUserId !== userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only access your own profile',
        });
        return;
      }

      const profile = await this.profileService.getProfile(userId);

      if (!profile) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User profile not found',
        });
        return;
      }

      res.status(200).json({ profile });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve profile',
      });
    }
  }

  /**
   * PUT /api/users/:userId/profile
   * Update user profile
   * 
   * This endpoint:
   * 1. Validates the update input
   * 2. Updates the profile in the database (with transaction and retry)
   * 3. Invalidates cached recommendations
   * 4. Triggers user reclassification (future enhancement)
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const updates: ProfileUpdateInput = req.body;

      // Verify authenticated user can only update their own profile
      const authenticatedUserId = (req as any).user?.userId;
      if (authenticatedUserId !== userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only update your own profile',
        });
        return;
      }

      // Validate that at least one field is being updated
      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'No fields to update',
        });
        return;
      }

      // Update profile (includes transaction, retry, and cache invalidation)
      const result = await this.profileService.updateProfile(userId, updates);

      // TODO: Trigger user reclassification
      // This would be handled by a classification service in the future
      // await classificationService.reclassifyUser(userId);

      res.status(200).json({
        profile: result.profile,
        message: result.message,
      });
    } catch (error) {
      console.error('Error updating profile:', error);

      if (error instanceof Error) {
        // Handle validation errors
        if (
          error.message.includes('must be') ||
          error.message.includes('Invalid') ||
          error.message.includes('cannot be')
        ) {
          res.status(400).json({
            error: 'Validation Error',
            message: error.message,
          });
          return;
        }

        // Handle not found errors
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'Not Found',
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update profile',
      });
    }
  }

  /**
   * DELETE /api/users/:userId/profile
   * Delete user profile
   */
  async deleteProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Verify authenticated user can only delete their own profile
      const authenticatedUserId = (req as any).user?.userId;
      if (authenticatedUserId !== userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only delete your own profile',
        });
        return;
      }

      // Delete profile (includes transaction and retry)
      const result = await this.profileService.deleteProfile(userId);

      res.status(200).json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      console.error('Error deleting profile:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete profile',
      });
    }
  }

  /**
   * GET /api/users/:userId/profile/completeness
   * Get profile completeness details
   */
  async getProfileCompleteness(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Verify authenticated user can only access their own profile
      const authenticatedUserId = (req as any).user?.userId;
      if (authenticatedUserId !== userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only access your own profile',
        });
        return;
      }

      const profile = await this.profileService.getProfile(userId);

      if (!profile) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User profile not found',
        });
        return;
      }

      const completeness = this.profileService.calculateProfileCompleteness(profile);

      res.status(200).json({ completeness });
    } catch (error) {
      console.error('Error getting profile completeness:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve profile completeness',
      });
    }
  }
}
