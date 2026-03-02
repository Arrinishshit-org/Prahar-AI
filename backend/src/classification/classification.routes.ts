/**
 * Classification Routes
 * 
 * Defines API routes for user classification endpoints.
 */

import { Router } from 'express';
import { Driver } from 'neo4j-driver';
import { ClassificationController } from './classification.controller';

export function createClassificationRoutes(driver: Driver): Router {
  const router = Router();
  const controller = new ClassificationController(driver);

  /**
   * POST /api/classification/classify
   * Classify a single user into groups
   */
  router.post('/classify', (req, res) => controller.classifyUser(req, res));

  /**
   * POST /api/classification/reclassify-all
   * Batch reclassify all users
   */
  router.post('/reclassify-all', (req, res) => controller.reclassifyAllUsers(req, res));

  /**
   * GET /api/classification/metrics/performance
   * Get aggregate performance metrics
   */
  router.get('/metrics/performance', (req, res) => controller.getPerformanceMetrics(req, res));

  /**
   * GET /api/classification/:userId
   * Get user classification
   */
  router.get('/:userId', (req, res) => controller.getUserClassification(req, res));

  return router;
}
