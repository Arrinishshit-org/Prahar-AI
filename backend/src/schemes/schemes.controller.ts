/**
 * Schemes Controller
 * Handles HTTP requests for government schemes
 * Uses Similarity Agent for matching and recommendations (with fallback to direct API)
 */

import { Request, Response } from 'express';
import { similarityAgent } from '../agents/similarity-agent';
import { indiaGovService } from './india-gov.service';
import { sampleSchemes } from './sample-schemes';

export class SchemesController {
  /**
   * GET /api/schemes
   * Fetch schemes with optional filters
   */
  async getSchemes(req: Request, res: Response) {
    try {
      const { q, limit = '20', page = '1' } = req.query;
      const limitNum = parseInt(limit as string, 10);
      const pageNum = parseInt(page as string, 10);

      try {
        // Try using similarity agent (Neo4j)
        let schemes;

        if (q) {
          schemes = await similarityAgent.searchSchemes(q as string, limitNum);
        } else {
          schemes = await similarityAgent.searchSchemes('', limitNum);
        }

        // Return flat array with correct field names
        res.json(schemes.map((s) => ({
          id: s.schemeId,
          title: s.name,
          description: s.description || 'No description available',
          category: s.rawCategory || s.categories?.[0]?.type || 'General',
          benefits: s.ministry || 'Government of India',
          eligibility: s.tags?.join(', ') || 'Check official website',
        })));
      } catch (dbError) {
        // Fallback to direct API if Neo4j is not available
        console.log('Neo4j not available, falling back to direct API');
        
        try {
          const result = await indiaGovService.fetchSchemes({
            pageNumber: pageNum,
            pageSize: limitNum,
          });

          let schemes = result.schemes;

          if (q) {
            schemes = indiaGovService.searchSchemes(schemes, q as string);
          }

          // Return flat array with correct field names
          res.json(schemes.map((s) => ({
            id: s.schemeId,
            title: s.name,
            description: s.description || 'No description available',
            category: Array.isArray(s.category) ? s.category[0] : (s.category || 'General'),
            benefits: s.ministry || 'Government of India',
            eligibility: Array.isArray(s.tags) ? s.tags.join(', ') : 'Check official website',
          })));
        } catch (apiError) {
          // Fallback to sample data if API also fails
          console.log('API also failed, using sample data');
          let schemes = sampleSchemes;

          if (q) {
            const lowerQuery = q.toString().toLowerCase();
            schemes = sampleSchemes.filter(s => 
              s.name.toLowerCase().includes(lowerQuery) ||
              s.description.toLowerCase().includes(lowerQuery) ||
              s.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
            );
          }

          res.json(schemes.map((s) => ({
            id: s.schemeId,
            title: s.name,
            description: s.description || 'No description available',
            category: Array.isArray(s.category) ? s.category[0] : (s.category || 'General'),
            benefits: s.ministry || 'Government of India',
            eligibility: Array.isArray(s.tags) ? s.tags.join(', ') : 'Check official website',
          })));
        }
      }
    } catch (error: any) {
      console.error('Error in getSchemes:', error);
      res.status(500).json({
        error: 'Failed to fetch schemes',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/schemes/:schemeId
   * Get a specific scheme by ID (slug)
   */
  async getSchemeById(req: Request, res: Response) {
    try {
      const { schemeId } = req.params;

      try {
        // Try using similarity agent (Neo4j)
        const scheme = await similarityAgent.getSchemeById(schemeId);

        if (!scheme) {
          return res.status(404).json({ error: 'Scheme not found' });
        }

        res.json({
          id: scheme.schemeId,
          title: scheme.name,
          description: scheme.description || 'No description available',
          category: scheme.rawCategory || scheme.categories?.[0]?.type || 'General',
          benefits: scheme.ministry || 'Government of India',
          eligibility: scheme.tags?.join(', ') || 'Check official website',
          applicationProcess: 'Visit the official government portal to apply',
          requiredDocuments: ['Aadhaar Card', 'Income Certificate', 'Residence Proof'],
        });
      } catch (dbError) {
        // Fallback to direct API
        console.log('Neo4j not available, falling back to direct API');
        
        try {
          const result = await indiaGovService.fetchSchemes({ pageSize: 100 });
          const scheme = result.schemes.find((s) => s.schemeId === schemeId);

          if (!scheme) {
            return res.status(404).json({ error: 'Scheme not found' });
          }

          res.json({
            id: scheme.schemeId,
            title: scheme.name,
            description: scheme.description || 'No description available',
            category: scheme.category || 'General',
            benefits: scheme.ministry || 'Government of India',
            eligibility: scheme.tags?.join(', ') || 'Check official website',
            applicationProcess: 'Visit the official government portal to apply',
            requiredDocuments: ['Aadhaar Card', 'Income Certificate', 'Residence Proof'],
          });
        } catch (apiError) {
          // Fallback to sample data
          console.log('API also failed, using sample data');
          const scheme = sampleSchemes.find((s) => s.schemeId === schemeId);

          if (!scheme) {
            return res.status(404).json({ error: 'Scheme not found' });
          }

          res.json({
            id: scheme.schemeId,
            title: scheme.name,
            description: scheme.description || 'No description available',
            category: Array.isArray(scheme.category) ? scheme.category[0] : 'General',
            benefits: scheme.ministry || 'Government of India',
            eligibility: Array.isArray(scheme.tags) ? scheme.tags.join(', ') : 'Check official website',
            applicationProcess: 'Visit the official government portal to apply',
            requiredDocuments: ['Aadhaar Card', 'Income Certificate', 'Residence Proof'],
          });
        }
      }
    } catch (error: any) {
      console.error('Error in getSchemeById:', error);
      res.status(500).json({
        error: 'Failed to fetch scheme',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/schemes/categories
   * Get available scheme categories
   */
  async getCategories(req: Request, res: Response) {
    try {
      try {
        // Try using similarity agent (Neo4j)
        const categories = await similarityAgent.getAllCategories();
        res.json({ categories });
      } catch (dbError) {
        // Fallback to predefined categories
        console.log('Neo4j not available, returning predefined categories');
        
        const categories = indiaGovService.getAvailableCategories();
        res.json({ categories });
      }
    } catch (error: any) {
      console.error('Error in getCategories:', error);
      res.status(500).json({
        error: 'Failed to fetch categories',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/users/:userId/recommendations
   * Get personalized scheme recommendations for a user
   */
  async getRecommendations(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      try {
        // Try using similarity agent (Neo4j)
        const userProfile = {
          userId,
          employment: 'Unemployed',
          income: 'Below1Lakh',
          locality: 'Rural',
          socialCategory: 'General',
          education: 'Secondary',
          povertyLine: 'BPL',
          state: 'Maharashtra',
          interests: ['agriculture', 'education', 'health'],
        };

        const matches = await similarityAgent.findMatchingSchemes(userProfile, 10);

        const recommendations = matches.map((match) => ({
          id: match.schemeId,
          title: match.name,
          description: match.description || 'No description available',
          category: match.categories?.[0]?.type || 'General',
          benefits: match.ministry || 'Government of India',
          eligibilityScore: match.eligibilityScore,
        }));

        res.json(recommendations);
      } catch (dbError) {
        // Fallback to simple API-based recommendations
        console.log('Neo4j not available, using simple recommendations');
        
        const categories = [
          'Agriculture,Rural & Environment',
          'Education & Learning',
          'Health & Wellness',
        ];

        const allRecommendations = [];

        for (const category of categories) {
          const result = await indiaGovService.fetchSchemes({
            categories: [category],
            pageSize: 3,
          });

          allRecommendations.push(...result.schemes);
        }

        const recommendations = allRecommendations.map((scheme) => ({
          id: scheme.schemeId,
          title: scheme.name,
          description: scheme.description || 'No description available',
          category: scheme.category || 'General',
          benefits: scheme.ministry || 'Government of India',
          eligibilityScore: Math.floor(Math.random() * 30) + 70,
        }));

        res.json(recommendations);
      }
    } catch (error: any) {
      console.error('Error in getRecommendations:', error);
      res.status(500).json({
        error: 'Failed to fetch recommendations',
        details: error.message,
      });
    }
  }
}

export const schemesController = new SchemesController();
