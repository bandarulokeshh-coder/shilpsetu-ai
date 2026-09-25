export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

export const CATEGORIES = [
  'Textiles & Clothing',
  'Jewelry & Accessories',
  'Home Decor',
  'Pottery & Ceramics',
  'Woodwork',
  'Art & Painting',
  'Bamboo & Cane',
  'Metalwork',
  'Handmade Crafts',
  'Other',
];

export const MATERIALS = [
  'Cotton',
  'Silk',
  'Wool',
  'Leather',
  'Wood',
  'Bamboo',
  'Clay',
  'Terracotta',
  'Brass',
  'Copper',
  'Stone',
  'Jute',
  'Other',
];

export const CRAFT_TYPES = [
  'Weaving',
  'Pottery',
  'Carpentry',
  'Metalwork',
  'Jewelry Making',
  'Painting',
  'Embroidery',
  'Block Printing',
  'Other',
];

export const PRODUCT_STATUS = {
  DRAFT: 'Draft',
  PENDING: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const ENQUIRY_STATUS = {
  PENDING: 'Pending',
  CONTACTED: 'Contacted',
  CLOSED: 'Closed',
};
