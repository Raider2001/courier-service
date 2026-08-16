import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { useAuth } from './auth.jsx';
import { Loading } from './components.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';

import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminJobs from './pages/admin/Jobs.jsx';
import AdminJobDetail from './pages/admin/JobDetail.jsx';
import AdminCustomers from './pages/admin/Customers.jsx';
import AdminCustomerDetail from './pages/admin/CustomerDetail.jsx';
import AdminDrivers from './pages/admin/Drivers.jsx';
import AdminPricing from './pages/admin/Pricing.jsx';

import CustomerDashboard from './pages/customer/Dashboard.jsx';
import BookDelivery from './pages/customer/Book.jsx';
import MyDeliveries from './pages/customer/Deliveries.jsx';
import SavedAddresses from './pages/customer/Addresses.jsx';
import Profile from './pages/customer/Profile.jsx';

import DriverDashboard from './pages/driver/Dashboard.jsx';
import DriverHistory from './pages/driver/History.jsx';

const ADMIN_NAV = [
  { to: '/', label: 'Today' },
  { to: '/jobs', label: 'Deliveries' },
  { to: '/customers', label: 'Customers' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/pricing', label: 'Pricing' },
];

const CUSTOMER_NAV = [
  { to: '/', label: 'Overview' },
  { to: '/book', label: 'Book a delivery' },
  { to: '/deliveries', label: 'My deliveries' },
  { to: '/addresses', label: 'Saved addresses' },
  { to: '/profile', label: 'Account' },
];

const DRIVER_NAV = [
  { to: '/', label: 'My runs' },
  { to: '/history', label: 'History' },
];

function Shell({ children }) {
  const { user, isAdmin, isDriver, logout } = useAuth();
  const links = isAdmin ? ADMIN_NAV : isDriver ? DRIVER_NAV : CUSTOMER_NAV;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Courier
          <small>{isAdmin ? 'Control room' : isDriver ? 'Driver' : 'Customer portal'}</small>
        </div>

        <nav className="nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="who">{user.name}</div>
          <div className="role">
            {isAdmin ? 'Administrator' : isDriver ? 'Driver' : user.customer?.name || 'Customer'}
          </div>
          <button type="button" className="link" style={{ marginTop: 8 }} onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, loading, isAdmin, isDriver } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth">
        <Loading />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
      </Routes>
    );
  }

  return (
    <Shell>
      <Routes>
        {isAdmin ? (
          <>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/jobs" element={<AdminJobs />} />
            <Route path="/jobs/:id" element={<AdminJobDetail />} />
            <Route path="/customers" element={<AdminCustomers />} />
            <Route path="/customers/:id" element={<AdminCustomerDetail />} />
            <Route path="/drivers" element={<AdminDrivers />} />
            <Route path="/pricing" element={<AdminPricing />} />
          </>
        ) : isDriver ? (
          <>
            <Route path="/" element={<DriverDashboard />} />
            <Route path="/history" element={<DriverHistory />} />
          </>
        ) : (
          <>
            <Route path="/" element={<CustomerDashboard />} />
            <Route path="/book" element={<BookDelivery />} />
            <Route path="/deliveries" element={<MyDeliveries />} />
            <Route path="/addresses" element={<SavedAddresses />} />
            <Route path="/profile" element={<Profile />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
