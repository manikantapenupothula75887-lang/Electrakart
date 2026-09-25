import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';

// Layouts
import { CustomerLayout } from './components/layout/CustomerLayout';
import { RetailerLayout } from './components/layout/RetailerLayout';
import { DistributorLayout } from './components/layout/DistributorLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Customer Pages
import { HomePage } from './pages/customer/HomePage';
import { ProductCatalogPage } from './pages/customer/ProductCatalogPage';
import { ProductDetailPage } from './pages/customer/ProductDetailPage';
import { SearchClarificationPage } from './pages/customer/SearchClarificationPage';
import { EstimateUploadPage } from './pages/customer/EstimateUploadPage';
import { EstimateReviewPage } from './pages/customer/EstimateReviewPage';
import { QuotationPage } from './pages/customer/QuotationPage';
import { CartPage } from './pages/customer/CartPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { OrderTrackingPage } from './pages/customer/OrderTrackingPage';
import { OrdersHistoryPage } from './pages/customer/OrdersHistoryPage';
import { AccountPage } from './pages/customer/AccountPage';

// Retailer Pages
import { RetailerDashboard } from './pages/retailer/RetailerDashboard';
import { RetailerInventoryPage } from './pages/retailer/RetailerInventoryPage';
import { RetailerOrdersPage } from './pages/retailer/RetailerOrdersPage';
import { RetailerEarningsPage } from './pages/retailer/RetailerEarningsPage';

// Distributor Pages
import { DistributorDashboard } from './pages/distributor/DistributorDashboard';
import { WarehousesPage } from './pages/distributor/WarehousesPage';
import { DistributorInventoryPage } from './pages/distributor/DistributorInventoryPage';
import { DistributorOrdersPage } from './pages/distributor/DistributorOrdersPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProductMasterPage } from './pages/admin/AdminProductMasterPage';
import { AdminPartnersPage } from './pages/admin/AdminPartnersPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminFinancePage } from './pages/admin/AdminFinancePage';
import { AdminElectriciansPage } from './pages/admin/AdminElectriciansPage';
import { AdminDeliveriesPage } from './pages/admin/AdminDeliveriesPage';

// Electrician Pages & Layout
import { ElectricianLayout } from './components/layout/ElectricianLayout';
import { ElectricianDashboard } from './pages/electrician/ElectricianDashboard';
import { ElectricianRegisterPage } from './pages/electrician/ElectricianRegisterPage';
import { FindElectricianPage } from './pages/customer/FindElectricianPage';

// Common / Auth
import { LoginPage } from './pages/auth/LoginPage';
import { BecomePartnerPage } from './pages/partner/BecomePartnerPage';

export function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Customer Routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/customer" element={<HomePage />} />
            <Route path="/customer/shop" element={<ProductCatalogPage />} />
            <Route path="/customer/products" element={<ProductCatalogPage />} />
            <Route path="/customer/product/:id" element={<ProductDetailPage />} />
            <Route path="/customer/search" element={<SearchClarificationPage />} />
            <Route path="/customer/estimate" element={<EstimateUploadPage />} />
            <Route path="/customer/estimate/review" element={<EstimateReviewPage />} />
            <Route path="/customer/quotation/:id" element={<QuotationPage />} />
            <Route path="/customer/cart" element={<CartPage />} />
            <Route path="/customer/checkout" element={<CheckoutPage />} />
            <Route path="/customer/orders" element={<OrdersHistoryPage />} />
            <Route path="/customer/orders/:id" element={<OrderTrackingPage />} />
            <Route path="/customer/account" element={<AccountPage />} />
            <Route path="/customer/electricians" element={<FindElectricianPage />} />

            {/* Public Partner & Electrician Registration */}
            <Route path="/partner/register" element={<BecomePartnerPage />} />
            <Route path="/electrician/register" element={<ElectricianRegisterPage />} />
          </Route>

          {/* Electrician Portal */}
          <Route path="/electrician" element={<ElectricianLayout />}>
            <Route index element={<ElectricianDashboard />} />
            <Route path="history" element={<ElectricianDashboard />} />
            <Route path="profile" element={<ElectricianDashboard />} />
            <Route path="account" element={<AccountPage />} />
          </Route>

          {/* Retailer Portal */}
          <Route path="/retailer" element={<RetailerLayout />}>
            <Route index element={<RetailerDashboard />} />
            <Route path="inventory" element={<RetailerInventoryPage />} />
            <Route path="orders" element={<RetailerOrdersPage />} />
            <Route path="earnings" element={<RetailerEarningsPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>

          {/* Distributor Portal */}
          <Route path="/distributor" element={<DistributorLayout />}>
            <Route index element={<DistributorDashboard />} />
            <Route path="warehouses" element={<WarehousesPage />} />
            <Route path="inventory" element={<DistributorInventoryPage />} />
            <Route path="orders" element={<DistributorOrdersPage />} />
            <Route path="earnings" element={<RetailerEarningsPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>

          {/* Super Admin Portal */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="partners" element={<AdminPartnersPage />} />
            <Route path="electricians" element={<AdminElectriciansPage />} />
            <Route path="deliveries" element={<AdminDeliveriesPage />} />
            <Route path="products" element={<AdminProductMasterPage />} />
            <Route path="inventory" element={<DistributorInventoryPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="finance" element={<AdminFinancePage />} />
            <Route path="settings" element={<AccountPage />} />
          </Route>

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
