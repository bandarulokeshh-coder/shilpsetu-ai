import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import { usersApi } from './lib/api';
import { useEffect } from 'react';

// Pages
import LandingPage from './pages/LandingPage';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ArtisanDashboard from './pages/ArtisanDashboard';
import CreateProduct from './pages/CreateProduct';
import BuyerMarketplace from './pages/BuyerMarketplace';
import ProductDetail from './pages/ProductDetail';
import AdminDashboard from './pages/AdminDashboard';
import ArtisanProfile from './pages/ArtisanProfile';
import Settings from './pages/Settings';
import EnquiriesPage from './pages/EnquiriesPage';
import AIImageStudio from './pages/AIImageStudio';
import CatalogShare from './pages/CatalogShare';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import BuyerRequests from './pages/BuyerRequestList';
import CreateBuyerRequest from './pages/BuyerRequestForm';
import BuyerRequestDetail from './pages/BuyerRequestDetail';

function App() {
  const { isAuthenticated, user, setAuth, logout } = useAuthStore();

  useEffect(() => {
    // Load user data if token exists
    const loadUser = async () => {
      if (isAuthenticated && !user) {
        try {
          const response = await usersApi.getMe();
          setAuth(response.data, localStorage.getItem('token')!);
        } catch (error) {
          logout();
        }
      }
    };

    loadUser();
  }, [isAuthenticated, user, setAuth, logout]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/marketplace" element={<BuyerMarketplace />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/catalog/:id" element={<CatalogShare />} />
      <Route path="/artisan/:id" element={<ArtisanProfile />} />
      <Route path="/ai-image-studio" element={<AIImageStudio />} />
      <Route path="/cart" element={<CartPage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            user?.role === 'ARTISAN' ? (
              <ArtisanDashboard />
            ) : user?.role === 'ADMIN' ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/marketplace" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/create-product"
        element={
          isAuthenticated && user?.role === 'ARTISAN' ? (
            <CreateProduct />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/edit-product/:id"
        element={
          isAuthenticated && user?.role === 'ARTISAN' ? (
            <CreateProduct />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/enquiries"
        element={isAuthenticated ? <EnquiriesPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/checkout"
        element={isAuthenticated ? <CheckoutPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/orders"
        element={isAuthenticated ? <OrdersPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/buyer/requests"
        element={isAuthenticated ? <BuyerRequests /> : <Navigate to="/login" />}
      />
      <Route
        path="/buyer/request"
        element={isAuthenticated ? <CreateBuyerRequest /> : <Navigate to="/login" />}
      />
      <Route
        path="/buyer/request/:id"
        element={isAuthenticated ? <BuyerRequestDetail /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings"
        element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
