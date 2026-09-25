import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import enquiryRoutes from './routes/enquiries.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';
import orderRoutes from './routes/orders.js';
import buyerRequestRoutes from './routes/buyer-requests.js';
import quoteRoutes from './routes/quotes.js';
import conversationRoutes from './routes/conversations.js';
import logisticsRoutes from './routes/logistics.js';
import reviewRoutes from './routes/reviews.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API index — handy when demoing or checking the server from a browser
app.get('/api', (req, res) => {
  res.json({
    name: 'Craft2Market AI API',
    version: '1.0.0',
    status: 'running',
    docs: {
      health: 'GET /health',
      auth: ['POST /api/auth/register', 'POST /api/auth/login'],
      products: [
        'GET /api/products',
        'GET /api/products/mine',
        'GET /api/products/:id',
        'POST /api/products',
        'PUT /api/products/:id',
        'DELETE /api/products/:id',
      ],
      enquiries: ['GET /api/enquiries', 'POST /api/enquiries', 'PATCH /api/enquiries/:id'],
      orders: [
        'GET /api/orders',
        'POST /api/orders',
        'GET /api/orders/:id',
        'PATCH /api/orders/:id/status',
        'PATCH /api/orders/:id/cancel',
      ],
      users: ['GET /api/users/me', 'PUT /api/users/me', 'PUT /api/users/password', 'GET /api/users/artisan/:id'],
      admin: ['GET /api/admin/stats', 'GET /api/admin/users', 'GET /api/admin/products', 'PATCH /api/admin/products/:id/status'],
      ai: [
        'POST /api/ai/generate-catalog',
        'POST /api/ai/calculate-pricing',
        'POST /api/ai/image-enhance',
        'POST /api/ai/transcribe',
        'POST /api/ai/understand-requirements',
        'POST /api/ai/find-matches',
      ],
      buyerRequests: ['GET /api/buyer-requests', 'POST /api/buyer-requests', 'GET /api/buyer-requests/:id', 'POST /api/buyer-requests/:id/match'],
      quotes: ['GET /api/quotes', 'POST /api/quotes', 'GET /api/quotes/:id', 'PATCH /api/quotes/:id/status'],
      conversations: ['GET /api/conversations', 'POST /api/conversations', 'GET /api/conversations/:id/messages', 'POST /api/conversations/:id/messages'],
      logistics: [
        // Pickup Locations
        'GET /api/logistics/pickup-locations',
        'POST /api/logistics/pickup-locations',
        'PUT /api/logistics/pickup-locations/:id',
        'DELETE /api/logistics/pickup-locations/:id',
        // Shipments
        'GET /api/logistics/shipments',
        'GET /api/logistics/shipments/:id',
        'POST /api/logistics/shipments',
        'PATCH /api/logistics/shipments/:id/status',
        'GET /api/logistics/shipments/:id/events',
        // Returns
        'GET /api/logistics/returns',
        'POST /api/logistics/returns',
        'PATCH /api/logistics/returns/:id/status',
        // Return Shipments
        'GET /api/logistics/return-shipments',
      ],
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/buyer-requests', buyerRequestRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/reviews', reviewRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  // Map the errors Express/multer actually throw onto sensible status codes so
  // the UI can display a useful message instead of a blanket 500.
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'File too large. Please upload an image under 10 MB.';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    status = 400;
    message = 'Unexpected file field: only a single "imageUrl" file is accepted.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON in request body.';
  } else if (message === 'Only image files are allowed') {
    status = 400;
  }

  res.status(status).json({ error: message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Craft2Market AI Backend running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, '../uploads')}`);
});

export default app;
