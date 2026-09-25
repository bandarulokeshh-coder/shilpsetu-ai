import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  enhanceImageService,
  generateCatalogService,
  calculatePricingService,
  transcribeService,
} from '../lib/aiService.js';

const router = express.Router();

// AI Image Studio - Simulate image enhancement
router.post('/image-enhance', authenticate, async (req: AuthRequest, res) => {
  try {
    const { imageUrl } = req.body;
    const apiKey = process.env.AI_API_KEY;
    const result = enhanceImageService(imageUrl, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Image enhancement error:', error);
    res.status(500).json({ error: 'Failed to enhance image' });
  }
});

// AI Catalog Generation - Generate product listing from description
router.post('/generate-catalog', authenticate, async (req: AuthRequest, res) => {
  try {
    const { description, language, productData } = req.body;
    const apiKey = process.env.AI_API_KEY;
    const result = generateCatalogService(description, language, productData, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Catalog generation error:', error);
    res.status(500).json({ error: 'Failed to generate catalog' });
  }
});

// AI Pricing Assistant - Calculate suggested prices
router.post('/calculate-pricing', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      rawMaterialCost,
      labourCost,
      packagingCost = 50,
      otherCost = 0,
      quantity = 1,
      margin = 30,
      description = '',
      category,
    } = req.body;

    const result = calculatePricingService(
      rawMaterialCost,
      labourCost,
      packagingCost,
      otherCost,
      quantity,
      margin,
      description,
      category,
    );

    res.json(result);
  } catch (error) {
    console.error('Pricing calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
});

// Voice transcription placeholder
router.post('/transcribe', authenticate, async (req: AuthRequest, res) => {
  try {
    const { audioData } = req.body;
    const apiKey = process.env.AI_API_KEY;
    const result = transcribeService(audioData, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// ==========================================
// AI Buyer Request → Direct Artisan Matching
// ==========================================

// Extract structured requirements from natural language
router.post('/extract-requirements', authenticate, async (req: AuthRequest, res) => {
  try {
    const { description, language = 'en' } = req.body;
    const { understandRequirementsService } = await import('../lib/aiService.js');
    const result = understandRequirementsService(description);
    res.json(result);
  } catch (error) {
    console.error('Requirement extraction error:', error);
    res.status(500).json({ error: 'Failed to extract requirements' });
  }
});

// Find suitable artisans based on requirements
router.post('/match-artisan', authenticate, async (req: AuthRequest, res) => {
  try {
    const { requirements, location, craftType, language = 'en' } = req.body;
    const { findArtisanMatchesService } = await import('../lib/aiService.js');
    const result = findArtisanMatchesService(requirements, location, craftType, language);
    res.json(result);
  } catch (error) {
    console.error('Artisan matching error:', error);
    res.status(500).json({ error: 'Failed to match artisans' });
  }
});

export default router;
