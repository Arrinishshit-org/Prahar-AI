import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { Driver } from 'neo4j-driver';

/**
 * Create profile routes
 * @param driver Neo4j driver instance
 * @returns Express router with profile routes
 */
export function createProfileRoutes(driver: Driver): Router {
  const router = Router();
  const profileService = new ProfileService(driver);
  const profileController = new ProfileController(profileService);

  // Get user profile
  router.get(
    '/users/:userId/profile',
    (req, res) => profileController.getProfile(req, res)
  );

  // Update user profile
  // Triggers reclassification and invalidates cached recommendations
  router.put(
    '/users/:userId/profile',
    (req, res) => profileController.updateProfile(req, res)
  );

  // Delete user profile
  router.delete(
    '/users/:userId/profile',
    (req, res) => profileController.deleteProfile(req, res)
  );

  // Get profile completeness details
  router.get(
    '/users/:userId/profile/completeness',
    (req, res) => profileController.getProfileCompleteness(req, res)
  );

  return router;
}
