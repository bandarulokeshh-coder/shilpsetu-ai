import axios from 'axios';
import { API_URL } from './constants';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ARTISAN' | 'BUYER' | 'ADMIN';
  preferredLanguage: string;
  location?: string;
  craftType?: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  stats?: {
    productCount: number;
    enquiryCount: number;
    estimatedEarnings: number;
  };
}

export interface Product {
  id: string;
  artisanId: string;
  title: string;
  description: string;
  hindiDescription?: string;
  englishDescription?: string;
  category: string;
  material: string;
  dimensions?: string;
  quantity: number;
  imageUrl?: string;
  enhancedImageUrl?: string;
  rawMaterialCost: number;
  labourCost: number;
  packagingCost: number;
  otherCost: number;
  minimumPrice?: number;
  suggestedPrice?: number;
  premiumPrice?: number;
  keywords?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  artisan?: {
    id: string;
    name: string;
    location?: string;
    craftType?: string;
    avatar?: string;
  };
  _count?: {
    enquiries: number;
  };
}

export interface Enquiry {
  id: string;
  productId: string;
  buyerId: string;
  quantity: number;
  message: string;
  status: 'PENDING' | 'CONTACTED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    title: string;
    imageUrl?: string;
    suggestedPrice?: number;
    artisan?: {
      id: string;
      name: string;
      location?: string;
    };
  };
  buyer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  artisanId: string;
  artisanName: string;
  title: string;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  buyerId: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPincode: string;
  createdAt: string;
  updatedAt: string;
  buyer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  items: OrderItem[];
}

export interface AdminStats {
  stats: {
    totalArtisans: number;
    totalBuyers: number;
    totalProducts: number;
    approvedProducts: number;
    pendingProducts: number;
    totalEnquiries: number;
    estimatedSales: number;
  };
  recentProducts: Product[];
  recentEnquiries: Enquiry[];
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/api/auth/login', { email, password }),

  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
    preferredLanguage?: string;
    location?: string;
    craftType?: string;
  }) => api.post<{ token: string; user: User }>('/api/auth/register', data),
};

// Products API
export const productsApi = {
  getAll: (params?: {
    category?: string;
    craftType?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    status?: string;
  }) => api.get<Product[]>('/api/products', { params }),

  getById: (id: string) => api.get<Product>(`/api/products/${id}`),

  /** Own listings, including drafts and pending items (artisan/admin only). */
  getMine: () => api.get<Product[]>('/api/products/mine'),

  getByArtisan: (artisanId: string) => api.get<Product[]>(`/api/products/artisan/${artisanId}`),

  create: (formData: FormData) =>
    api.post<Product>('/api/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, formData: FormData) =>
    api.put<Product>(`/api/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) => api.delete(`/api/products/${id}`),
};

// Enquiries API
export const enquiriesApi = {
  getAll: () => api.get<Enquiry[]>('/api/enquiries'),

  create: (data: { productId: string; quantity: number; message: string }) =>
    api.post<Enquiry>('/api/enquiries', data),

  updateStatus: (id: string, status: string) =>
    api.patch<Enquiry>(`/api/enquiries/${id}`, { status }),
};

// Users API
export const usersApi = {
  getMe: () => api.get<User>('/api/users/me'),

  updateMe: (data: Partial<User>) => api.put<User>('/api/users/me', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/api/users/password', { currentPassword, newPassword }),

  getArtisan: (id: string) =>
    api.get<User & { products: Product[] }>(`/api/users/artisan/${id}`),
};

// Admin API
export const adminApi = {
  getStats: () => api.get<AdminStats>('/api/admin/stats'),

  getUsers: (params?: { role?: string; isApproved?: boolean; search?: string }) =>
    api.get<User[]>('/api/admin/users', { params }),

  approveUser: (id: string, isApproved: boolean) =>
    api.patch(`/api/admin/users/${id}/approve`, { isApproved }),

  getProducts: (params?: { status?: string }) =>
    api.get<Product[]>('/api/admin/products', { params }),

  updateProductStatus: (id: string, status: string) =>
    api.patch<Product>(`/api/admin/products/${id}/status`, { status }),
};

// Orders API (cart checkout & tracking)
export const ordersApi = {
  getAll: () => api.get<Order[]>('/api/orders'),

  getById: (id: string) => api.get<Order>(`/api/orders/${id}`),

  create: (data: {
    items: { productId: string; quantity: number }[];
    shipping: {
      name: string;
      phone: string;
      address: string;
      city: string;
      pincode: string;
    };
  }) => api.post<Order>('/api/orders', data),

  updateStatus: (id: string, status: Order['status']) =>
    api.patch<Order>(`/api/orders/${id}/status`, { status }),

  cancel: (id: string) => api.patch<Order>(`/api/orders/${id}/cancel`),
};

// Buyer Request Types
export interface BuyerRequest {
  id: string;
  buyerId: string;
  title: string;
  description: string;
  hindiDescription?: string;
  englishDescription?: string;
  craftType?: string;
  category?: string;
  material?: string;
  quantity: number;
  maxBudget?: number;
  deadline?: string;
  attachments?: string[];
  status: 'PENDING' | 'MATCHED' | 'QUOTED' | 'CLOSED';
  matchStatus?: 'SEARCHING' | 'SHORTLISTED' | 'NO_MATCH' | 'CONFIRMED';
  matchedArtisanId?: string;
  matchedArtisanScore?: number;
  selectedQuoteId?: string;
  createdAt: string;
  updatedAt: string;
  buyer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  matchedArtisan?: {
    id: string;
    name: string;
    location?: string;
    craftType?: string;
    avatar?: string;
    rating?: number;
  };
  quotes?: Quote[];
}

export interface ArtisanMatch {
  id: string;
  buyerRequestId: string;
  artisanId: string;
  score: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REJECTED';
  matchedAt: string;
  artisan?: {
    id: string;
    name: string;
    location?: string;
    craftType?: string;
    avatar?: string;
    rating?: number;
  };
}

export interface Quote {
  id: string;
  buyerRequestId: string;
  artisanId: string;
  amount: number;
  currency: string;
  description: string;
  deadline?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  artisan?: {
    id: string;
    name: string;
    location?: string;
    craftType?: string;
    avatar?: string;
  };
}

export interface Conversation {
  id: string;
  buyerRequestId: string;
  senderId: string;
  receiverId: string;
  message: string;
  attachments?: string[];
  read: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
  receiver?: {
    id: string;
    name: string;
    email: string;
  };
}

// AI API
export const aiApi = {
  enhanceImage: (imageUrl: string) =>
    api.post<{
      originalImageUrl: string;
      enhancedImageUrl: string;
      processing: boolean;
      note: string;
    }>('/api/ai/image-enhance', { imageUrl }),

  generateCatalog: (data: {
    description: string;
    language: string;
    productData?: any;
  }) =>
    api.post<{
      title: string;
      shortDescription: string;
      detailedDescription: string;
      hindiDescription: string;
      englishDescription: string;
      keywords: string;
      category: string;
      material: string;
      processing: boolean;
      note: string;
    }>('/api/ai/generate-catalog', data),

  calculatePricing: (data: {
    rawMaterialCost: number;
    labourCost: number;
    packagingCost?: number;
    otherCost?: number;
    quantity?: number;
    margin?: number;
    description?: string;
    category?: string;
  }) =>
    api.post<{
      baseCost: number;
      totalCost: number;
      pricing: {
        minimum: { price: number; profit: number; margin: number };
        suggested: { price: number; profit: number; margin: number };
        premium: { price: number; profit: number; margin: number };
      };
      inputs: any;
      analysis: {
        category: string;
        craft: string;
        trend: { label: string; demand: number; note: string };
        complexity: { label: string; index: number; note: string };
        marketMultiplier: number;
        effectiveMargin: number;
        reasoning: string[];
      };
      explanation: string;
      note: string;
    }>('/api/ai/calculate-pricing', data),
};

export interface BuyerRequestCreate {
  title: string;
  description: string;
  hindiDescription?: string;
  englishDescription?: string;
  craftType?: string;
  category?: string;
  material?: string;
  quantity?: number;
  maxBudget?: number;
  deadline?: string;
  attachments?: File[];
}

// Buyer Requests API
export const buyerRequestsApi = {
  /** The list endpoint returns { requests, total, limit, offset } — unwrap it to an array. */
  getAll: () =>
    api
      .get<{ requests: BuyerRequest[]; total: number; limit: number; offset: number }>('/api/buyer-requests')
      .then((res) => ({ ...res, data: res.data?.requests ?? [] })),

  getById: (id: string) => api.get<BuyerRequest>(`/api/buyer-requests/${id}`),

  /** Buyer's own requests (the API has no /mine route — same list endpoint). */
  getMine: () => buyerRequestsApi.getAll(),

  create: (data: BuyerRequestCreate) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    if (data.hindiDescription) formData.append('hindiDescription', data.hindiDescription);
    if (data.englishDescription) formData.append('englishDescription', data.englishDescription);
    if (data.craftType) formData.append('craftType', data.craftType);
    if (data.category) formData.append('category', data.category);
    if (data.material) formData.append('material', data.material);
    if (data.quantity != null) formData.append('quantity', String(data.quantity));
    if (data.maxBudget != null) formData.append('maxBudget', String(data.maxBudget));
    if (data.deadline) formData.append('deadline', data.deadline);
    data.attachments?.forEach((file) => formData.append('attachments', file));

    return api.post<BuyerRequest>('/api/buyer-requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateStatus: (id: string, status: BuyerRequest['status']) =>
    api.put<BuyerRequest>(`/api/buyer-requests/${id}/status`, { status }),

  matchArtisan: (id: string) => api.post<BuyerRequest>(`/api/buyer-requests/${id}/match`, {}),

  /** Quotes for a buyer request */
  getQuotes: (requestId: string) => quotesApi.getByRequest(requestId),

  /** Conversations for a buyer request */
  getConversations: (requestId: string) => conversationsApi.getByRequest(requestId),
};

/** The API returns `message`/`expiryDate`; the UI expects `description`/`deadline`. */
const mapQuote = (quote: any): Quote => ({
  ...quote,
  description: quote.description ?? quote.message ?? '',
  deadline: quote.deadline ?? quote.expiryDate,
});

// Quotes API
export const quotesApi = {
  getAll: () =>
    api
      .get<{ quotes: any[] }>('/api/quotes')
      .then((res) => ({ ...res, data: (res.data?.quotes ?? []).map(mapQuote) })),

  getByRequest: (requestId: string) =>
    api
      .get<{ quotes: any[] }>(`/api/quotes/request/${requestId}`)
      .then((res) => ({ ...res, data: (res.data?.quotes ?? []).map(mapQuote) })),

  create: (data: {
    buyerRequestId: string;
    amount: number;
    description: string;
    deadline?: string;
  }) => api.post<Quote>('/api/quotes', data),

  accept: (id: string) => api.patch<Quote>(`/api/quotes/${id}/accept`),

  reject: (id: string) => api.patch<Quote>(`/api/quotes/${id}/reject`),

  cancel: (id: string) => api.patch<Quote>(`/api/quotes/${id}/cancel`),
};

// Conversations API
export const conversationsApi = {
  getAll: () => api.get<Conversation[]>('/api/conversations'),

  getByRequest: (requestId: string) =>
    api
      .get<{ messages: Conversation[] }>(`/api/conversations/request/${requestId}`)
      .then((res) => ({ ...res, data: res.data.messages ?? [] })),

  getWithUser: (requestId: string, otherUserId: string) =>
    api
      .get<{ messages: Conversation[] }>(`/api/conversations/request/${requestId}/users/${otherUserId}`)
      .then((res) => ({ ...res, data: res.data?.messages ?? [] })),

  create: (data: {
    buyerRequestId: string;
    receiverId: string;
    message: string;
    attachments?: File[];
  }) => {
    const formData = new FormData();
    formData.append('buyerRequestId', data.buyerRequestId);
    formData.append('receiverId', data.receiverId);
    formData.append('message', data.message);
    data.attachments?.forEach((file) => formData.append('attachments', file));

    return api.post<Conversation>('/api/conversations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  markAsRead: (id: string) => api.patch<Conversation>(`/api/conversations/${id}/read`),
};
