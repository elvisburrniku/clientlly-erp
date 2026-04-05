import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { LanguageProvider } from '@/lib/useLanguage.jsx'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PermissionsProvider } from '@/lib/usePermissions';
import PermissionGuard from '@/components/PermissionGuard';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Quotes from './pages/Quotes';
import Expenses from './pages/Expenses';
import Products from './pages/Products';
import Reminders from './pages/Reminders';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Suppliers from './pages/Suppliers';
import Cashbox from './pages/Cashbox';
import CashHandover from './pages/CashHandover';
import CashHandoverRequest from './pages/CashHandoverRequest';
import Reports from './pages/Reports';
import Royalties from './pages/Royalties';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import InvoiceDetail from './pages/InvoiceDetail';
import ClientPortal from './pages/ClientPortal';
import ProductCatalog from './pages/ProductCatalog.jsx';
import Transfers from './pages/Transfers';
import Debtors from './pages/Debtors';
import DebtorDetail from './pages/DebtorDetail';
import InvoiceAnalytics from './pages/InvoiceAnalytics';
import Onboarding from './pages/Onboarding';
import SuperAdmin from './pages/SuperAdmin';
import ReportTemplates from './pages/ReportTemplates';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Shifts from './pages/Shifts';
import Leave from './pages/Leave';
import Payroll from './pages/Payroll';
import Advances from './pages/Advances';
import Holidays from './pages/Holidays';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Timesheets from './pages/Timesheets';
import Bugs from './pages/Bugs';
import CreditNotes from './pages/CreditNotes';
import DebitNotes from './pages/DebitNotes';
import Bills from './pages/Bills';
import ExpenseRequests from './pages/ExpenseRequests';
import Revenues from './pages/Revenues';
import Leads from './pages/Leads';
import Notes from './pages/Notes';
import Announcements from './pages/Announcements';
import ClientPortalPublic from './pages/ClientPortalPublic';
import VendorPortal from './pages/VendorPortal';
import ServiceCalendar from './pages/ServiceCalendar';
import Assets from './pages/Assets';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import VehicleMaintenance from './pages/VehicleMaintenance';
import FuelLogs from './pages/FuelLogs';
import FleetReports from './pages/FleetReports';
import CustomFields from './pages/CustomFields';
import POSRegister from './pages/POSRegister';
import POSSessions from './pages/POSSessions';
import SalesOrders from './pages/SalesOrders';
import POSConfig from './pages/POSConfig';
import POSReports from './pages/POSReports';
import Login from './pages/Login';
import ActivityLog from './pages/ActivityLog';
import RoleManagement from './pages/RoleManagement';
import Warehouses from './pages/Warehouses';
import StockMovements from './pages/StockMovements';
import PurchaseOrders from './pages/PurchaseOrders';
import StockTransfers from './pages/StockTransfers';
import StockAlerts from './pages/StockAlerts';
import StockValuation from './pages/StockValuation';
import ProcurementAnalytics from './pages/ProcurementAnalytics';
import BarcodeLabels from './pages/BarcodeLabels';
import Proposals from './pages/Proposals';
import ProposalPublic from './pages/ProposalPublic';
import Agreements from './pages/Agreements';
import CompanyDocuments from './pages/CompanyDocuments';
import Certificates from './pages/Certificates';
import ChartOfAccounts from './pages/ChartOfAccounts';
import JournalEntries from './pages/JournalEntries';
import Journals from './pages/Journals';
import TrialBalance from './pages/TrialBalance';
import IncomeStatement from './pages/IncomeStatement';
import BalanceSheet from './pages/BalanceSheet';
import ATKSalesBook from './pages/ATKSalesBook';
import ATKPurchaseBook from './pages/ATKPurchaseBook';
import TaxSummary from './pages/TaxSummary';
import TaxRates from './pages/TaxRates';
import FinancialCards from './pages/FinancialCards';
import Payments from './pages/Payments';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      );
    }
  }

  return (
    <PermissionsProvider>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<PermissionGuard module="dashboard"><Dashboard /></PermissionGuard>} />
          <Route path="/invoices" element={<PermissionGuard module="invoices"><Invoices /></PermissionGuard>} />
          <Route path="/invoices/:id" element={<PermissionGuard module="invoices"><InvoiceDetail /></PermissionGuard>} />
          <Route path="/quotes" element={<PermissionGuard module="quotes"><Quotes /></PermissionGuard>} />
          <Route path="/expenses" element={<PermissionGuard module="expenses"><Expenses /></PermissionGuard>} />
          <Route path="/products" element={<PermissionGuard module="products"><Products /></PermissionGuard>} />
          <Route path="/reminders" element={<PermissionGuard module="reminders"><Reminders /></PermissionGuard>} />
          <Route path="/clients" element={<PermissionGuard module="clients"><Clients /></PermissionGuard>} />
          <Route path="/client-detail/:clientId" element={<PermissionGuard module="clients"><ClientDetail /></PermissionGuard>} />
          <Route path="/suppliers" element={<PermissionGuard module="suppliers"><Suppliers /></PermissionGuard>} />
          <Route path="/cashbox" element={<PermissionGuard module="cashbox"><Cashbox /></PermissionGuard>} />
          <Route path="/cash-handover" element={<PermissionGuard module="cash_handover"><CashHandover /></PermissionGuard>} />
          <Route path="/cash-handover-request" element={<PermissionGuard module="cash_handover"><CashHandoverRequest /></PermissionGuard>} />
          <Route path="/reports" element={<PermissionGuard module="reports"><Reports /></PermissionGuard>} />
          <Route path="/royalties" element={<PermissionGuard module="royalties"><Royalties /></PermissionGuard>} />
          <Route path="/inventory" element={<PermissionGuard module="inventory"><Inventory /></PermissionGuard>} />
          <Route path="/settings" element={<PermissionGuard module="settings"><Settings /></PermissionGuard>} />
          <Route path="/catalog" element={<PermissionGuard module="products"><ProductCatalog /></PermissionGuard>} />
          <Route path="/transfers" element={<PermissionGuard module="transfers"><Transfers /></PermissionGuard>} />
          <Route path="/debtors" element={<PermissionGuard module="debtors"><Debtors /></PermissionGuard>} />
          <Route path="/debtor-detail/:debtorName" element={<PermissionGuard module="debtors"><DebtorDetail /></PermissionGuard>} />
          <Route path="/invoice-analytics" element={<PermissionGuard module="invoices"><InvoiceAnalytics /></PermissionGuard>} />
          <Route path="/client" element={<ClientPortal />} />
          <Route path="/super-admin" element={<PermissionGuard adminOnly><SuperAdmin /></PermissionGuard>} />
          <Route path="/report-templates" element={<PermissionGuard module="report_templates"><ReportTemplates /></PermissionGuard>} />
          <Route path="/projects" element={<PermissionGuard module="projects"><Projects /></PermissionGuard>} />
          <Route path="/projects/:id" element={<PermissionGuard module="projects"><ProjectDetail /></PermissionGuard>} />
          <Route path="/timesheets" element={<PermissionGuard module="timesheets"><Timesheets /></PermissionGuard>} />
          <Route path="/bugs" element={<PermissionGuard module="bugs"><Bugs /></PermissionGuard>} />
          <Route path="/credit-notes" element={<PermissionGuard module="invoices"><CreditNotes /></PermissionGuard>} />
          <Route path="/debit-notes" element={<PermissionGuard module="invoices"><DebitNotes /></PermissionGuard>} />
          <Route path="/bills" element={<PermissionGuard module="expenses"><Bills /></PermissionGuard>} />
          <Route path="/expense-requests" element={<PermissionGuard module="expenses"><ExpenseRequests /></PermissionGuard>} />
          <Route path="/revenues" element={<PermissionGuard module="invoices"><Revenues /></PermissionGuard>} />
          <Route path="/activity-log" element={<PermissionGuard adminOnly><ActivityLog /></PermissionGuard>} />
          <Route path="/role-management" element={<PermissionGuard adminOnly><RoleManagement /></PermissionGuard>} />
          <Route path="/employees" element={<PermissionGuard module="hr"><Employees /></PermissionGuard>} />
          <Route path="/attendance" element={<PermissionGuard module="hr"><Attendance /></PermissionGuard>} />
          <Route path="/shifts" element={<PermissionGuard module="hr"><Shifts /></PermissionGuard>} />
          <Route path="/leave" element={<PermissionGuard module="hr"><Leave /></PermissionGuard>} />
          <Route path="/payroll" element={<PermissionGuard module="hr"><Payroll /></PermissionGuard>} />
          <Route path="/advances" element={<PermissionGuard module="hr"><Advances /></PermissionGuard>} />
          <Route path="/holidays" element={<PermissionGuard module="hr"><Holidays /></PermissionGuard>} />
          <Route path="/leads" element={<PermissionGuard module="leads"><Leads /></PermissionGuard>} />
          <Route path="/notes" element={<PermissionGuard module="notes"><Notes /></PermissionGuard>} />
          <Route path="/announcements" element={<PermissionGuard module="announcements"><Announcements /></PermissionGuard>} />
          <Route path="/service-calendar" element={<PermissionGuard module="service_calendar"><ServiceCalendar /></PermissionGuard>} />
          <Route path="/assets" element={<PermissionGuard module="assets"><Assets /></PermissionGuard>} />
          <Route path="/vehicles" element={<PermissionGuard module="vehicles"><Vehicles /></PermissionGuard>} />
          <Route path="/drivers" element={<PermissionGuard module="drivers"><Drivers /></PermissionGuard>} />
          <Route path="/vehicle-maintenance" element={<PermissionGuard module="vehicle_maintenance"><VehicleMaintenance /></PermissionGuard>} />
          <Route path="/fuel-logs" element={<PermissionGuard module="fuel_logs"><FuelLogs /></PermissionGuard>} />
          <Route path="/fleet-reports" element={<PermissionGuard module="fleet_reports"><FleetReports /></PermissionGuard>} />
          <Route path="/custom-fields" element={<PermissionGuard module="custom_fields"><CustomFields /></PermissionGuard>} />
          <Route path="/warehouses" element={<PermissionGuard module="inventory"><Warehouses /></PermissionGuard>} />
          <Route path="/stock-movements" element={<PermissionGuard module="inventory"><StockMovements /></PermissionGuard>} />
          <Route path="/purchase-orders" element={<PermissionGuard module="inventory"><PurchaseOrders /></PermissionGuard>} />
          <Route path="/stock-transfers" element={<PermissionGuard module="inventory"><StockTransfers /></PermissionGuard>} />
          <Route path="/stock-alerts" element={<PermissionGuard module="inventory"><StockAlerts /></PermissionGuard>} />
          <Route path="/stock-valuation" element={<PermissionGuard module="inventory"><StockValuation /></PermissionGuard>} />
          <Route path="/procurement-analytics" element={<PermissionGuard module="inventory"><ProcurementAnalytics /></PermissionGuard>} />
          <Route path="/barcode-labels" element={<PermissionGuard module="inventory"><BarcodeLabels /></PermissionGuard>} />
          <Route path="/proposals" element={<PermissionGuard module="proposals"><Proposals /></PermissionGuard>} />
          <Route path="/agreements" element={<PermissionGuard module="agreements"><Agreements /></PermissionGuard>} />
          <Route path="/company-documents" element={<PermissionGuard module="company_documents"><CompanyDocuments /></PermissionGuard>} />
          <Route path="/certificates" element={<PermissionGuard module="certificates"><Certificates /></PermissionGuard>} />
          <Route path="/chart-of-accounts" element={<PermissionGuard module="accounting"><ChartOfAccounts /></PermissionGuard>} />
          <Route path="/journal-entries" element={<PermissionGuard module="accounting"><JournalEntries /></PermissionGuard>} />
          <Route path="/journals" element={<PermissionGuard module="accounting"><Journals /></PermissionGuard>} />
          <Route path="/trial-balance" element={<PermissionGuard module="accounting"><TrialBalance /></PermissionGuard>} />
          <Route path="/income-statement" element={<PermissionGuard module="accounting"><IncomeStatement /></PermissionGuard>} />
          <Route path="/balance-sheet" element={<PermissionGuard module="accounting"><BalanceSheet /></PermissionGuard>} />
          <Route path="/atk-sales-book" element={<PermissionGuard module="accounting"><ATKSalesBook /></PermissionGuard>} />
          <Route path="/atk-purchase-book" element={<PermissionGuard module="accounting"><ATKPurchaseBook /></PermissionGuard>} />
          <Route path="/tax-summary" element={<PermissionGuard module="accounting"><TaxSummary /></PermissionGuard>} />
          <Route path="/tax-rates" element={<PermissionGuard module="accounting"><TaxRates /></PermissionGuard>} />
          <Route path="/financial-cards" element={<PermissionGuard module="accounting"><FinancialCards /></PermissionGuard>} />
          <Route path="/payments" element={<PermissionGuard module="invoices"><Payments /></PermissionGuard>} />
          <Route path="/pos" element={<PermissionGuard module="pos"><POSRegister /></PermissionGuard>} />
          <Route path="/pos-sessions" element={<PermissionGuard module="pos"><POSSessions /></PermissionGuard>} />
          <Route path="/sales-orders" element={<PermissionGuard module="pos"><SalesOrders /></PermissionGuard>} />
          <Route path="/pos-config" element={<PermissionGuard module="pos"><POSConfig /></PermissionGuard>} />
          <Route path="/pos-reports" element={<PermissionGuard module="pos"><POSReports /></PermissionGuard>} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </PermissionsProvider>
  );
};


function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/portal/client/:token" element={<ClientPortalPublic />} />
            <Route path="/portal/vendor/:token" element={<VendorPortal />} />
            <Route path="/proposal/:token" element={<ProposalPublic />} />
            <Route path="/*" element={
              <AuthProvider>
                <AuthenticatedApp />
              </AuthProvider>
            } />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </LanguageProvider>
  )
}

export default App
