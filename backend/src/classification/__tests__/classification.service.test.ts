/**
 * Classification Service Unit Tests
 */

import { ClassificationService } from '../classification.service';
import { Driver } from 'neo4j-driver';
import { getCacheService } from '../../cache/cache.service';

// Mock dependencies
jest.mock('../../cache/cache.service');
jest.mock('child_process');

describe('ClassificationService', () => {
  let service: ClassificationService;
  let mockDriver: jest.Mocked<Driver>;
  let mockSession: any;
  let mockCacheService: any;

  beforeEach(() => {
    // Setup mock driver
    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
      executeWrite: jest.fn(),
      executeRead: jest.fn()
    };

    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession)
    } as any;

    // Setup mock cache service
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn()
    };

    (getCacheService as jest.Mock).mockReturnValue(mockCacheService);

    // Create service instance
    service = new ClassificationService(mockDriver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserClassification', () => {
    it('should return cached classification if available', async () => {
      const userId = 'user-123';
      const cachedClassification = {
        userId,
        groups: [{ groupId: 1, groupName: 'Group 1', description: '', memberCount: 10 }],
        confidence: 0.85,
        timestamp: new Date()
      };

      mockCacheService.get.mockResolvedValue(cachedClassification);

      const result = await service.getUserClassification(userId);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
      expect(result?.confidence).toBe(0.85);
      expect(mockCacheService.get).toHaveBeenCalledWith(`classification:${userId}`);
      expect(mockSession.run).not.toHaveBeenCalled();
    });

    it('should query database if cache miss', async () => {
      const userId = 'user-123';
      mockCacheService.get.mockResolvedValue(null);

      mockSession.run.mockResolvedValue({
        records: [
          {
            get: (key: string): any => {
              if (key === 'userId') return userId;
              if (key === 'groups') return [{ groupId: 1, groupName: 'Group 1' }];
              if (key === 'confidence') return 0.85;
              if (key === 'timestamp') return new Date().toISOString();
              return undefined;
            }
          }
        ]
      });

      const result = await service.getUserClassification(userId);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
      expect(mockSession.run).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return null if user classification not found', async () => {
      const userId = 'nonexistent';
      mockCacheService.get.mockResolvedValue(null);
      mockSession.run.mockResolvedValue({ records: [] });

      const result = await service.getUserClassification(userId);

      expect(result).toBeNull();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return null if no metrics available', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getPerformanceMetrics();

      expect(result).toBeNull();
    });

    it('should return metrics with performance score', async () => {
      const mockMetrics = {
        totalClassifications: 100,
        totalTime: 150000,
        avgTime: 1500,
        maxTime: 4500,
        minTime: 800,
        avgConfidence: 0.82,
        slowClassifications: 5,
        lastUpdated: new Date().toISOString()
      };

      mockCacheService.get.mockResolvedValue(mockMetrics);

      const result = await service.getPerformanceMetrics();

      expect(result).toBeDefined();
      expect(result?.totalClassifications).toBe(100);
      expect(result?.avgTime).toBe(1500);
      expect(result?.performanceScore).toBe(95); // 100 - (5/100 * 100)
    });

    it('should calculate performance score correctly', async () => {
      const mockMetrics = {
        totalClassifications: 50,
        totalTime: 100000,
        avgTime: 2000,
        maxTime: 6000,
        minTime: 1000,
        avgConfidence: 0.75,
        slowClassifications: 10, // 20% slow
        lastUpdated: new Date().toISOString()
      };

      mockCacheService.get.mockResolvedValue(mockMetrics);

      const result = await service.getPerformanceMetrics();

      expect(result?.performanceScore).toBe(80); // 100 - 20
    });
  });

  describe('Performance Requirements', () => {
    it('should track classifications exceeding 5 second target', async () => {
      // This test verifies that the service monitors the 5-second requirement
      const mockMetrics = {
        totalClassifications: 100,
        slowClassifications: 8,
        avgTime: 2500
      };

      mockCacheService.get.mockResolvedValue(mockMetrics);

      const result = await service.getPerformanceMetrics();

      // 8% of classifications exceeded 5s target
      expect(result?.slowClassifications).toBe(8);
      expect(result?.performanceScore).toBe(92);
    });
  });
});
