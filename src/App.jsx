import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Products from './pages/Products';
import Reminders from './pages/Reminders';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import Cashbox from './pages/Cashbox';
import CashHandover from './pages/CashHandover';
import CashHandoverRequest from './pages/CashHandoverRequest';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import InvoiceDetail from './pages/InvoiceDetail';
import ClientPortal from './pages/ClientPortal';
import ProductCatalog from './pages/ProductCatalog.jsx';
import Transfers from './pages/Transfers';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/products" element={<Products />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/cashbox" element={<Cashbox />} />
        <Route path="/cash-handover" element={<CashHandover />} />
        <Route path="/cash-handover-request" element={<CashHandoverRequest />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/catalog" element={<ProductCatalog />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/client" element={<ClientPortal />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App