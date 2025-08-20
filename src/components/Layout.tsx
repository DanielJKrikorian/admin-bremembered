import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Users,
  Heart,
  Calendar,
  CreditCard,
  Mail,
  FileText,
  LogOut,
  Building2,
  Crown,
  Shield,
  MapPin,
  Package,
  AlertTriangle,
  Briefcase,
  Database,
  HelpCircle,
  MessageSquare,
  ShoppingCart,
  PackageOpen,
  HeadsetIcon,
} from 'lucide-react';

const navigation = [
  {
    group: 'Main',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: Home }],
  },
  {
    group: 'Users & Leads',
    items: [
      { name: 'Vendors', href: '/dashboard/vendors', icon: Building2 },
      { name: 'Couples', href: '/dashboard/couples', icon: Heart }, // Updated from /couplespage to /couples
      { name: 'Leads', href: '/dashboard/leads', icon: Users },
    ],
  },
  {
    group: 'Communication',
    items: [
      { name: 'Send Emails', href: '/dashboard/send-emails', icon: Mail },
      { name: 'Forum', href: '/dashboard/forum', icon: Mail },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
     { name: 'Chat Bot', href: '/dashboard/chats', icon: HeadsetIcon },
     { name: 'Blog Posts', href: '/dashboard/blogposts', icon: FileText },
    ],
  },
  {
    group: 'Orders & Payments',
    items: [
      { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
      { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
      { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
    ],
  },
  {
    group: 'Feedback & Support',
    items: [
      { name: 'Reviews', href: '/dashboard/reviews', icon: Calendar },
      { name: 'Support Reviews', href: '/dashboard/support-reviews', icon: Calendar },
      { name: 'FAQ', href: '/dashboard/faq', icon: HelpCircle },
      { name: 'Issues', href: '/dashboard/issues', icon: AlertTriangle },
    ],
  },
  {
    group: 'Events & Bookings',
    items: [
      { name: 'Bookings & Events', href: '/dashboard/bookings', icon: Calendar },
      { name: 'Venues', href: '/dashboard/venues', icon: MapPin },
      { name: 'Timelines', href: '/dashboard/timelines', icon: Calendar },
      { name: 'Contracts', href: '/dashboard/contracts', icon: Calendar },
    ],
  },
  {
    group: 'Services & Products',
    items: [
      { name: 'Service Packages', href: '/dashboard/service-packages', icon: Package },
      { name: 'Products', href: '/dashboard/products', icon: PackageOpen },
    ],
  },
  {
    group: 'Admin Tools',
    items: [
      { name: 'Job Board', href: '/dashboard/job-board', icon: Briefcase },
      { name: 'Storage', href: '/dashboard/storage', icon: Database },
      { name: 'Import History', href: '/dashboard/logs', icon: FileText },
    ],
  },
];

export function Layout() {
  const { signOut, profile, isSuperAdmin } = useAuth();
  const location = useLocation();

  const getAdminLevelDisplay = () => {
    if (!profile) return 'Admin User';
    switch (profile.admin_level) {
      case 'super_admin':
        return 'Super Administrator';
      case 'admin':
        return 'Administrator';
      default:
        return 'Admin User';
    }
  };

  const getAdminLevelIcon = () => {
    return isSuperAdmin
      ? <Crown className="h-4 w-4 text-purple-600" />
      : <Shield className="h-4 w-4 text-blue-600" />;
  };

  const getAdminLevelBadge = () => {
    return isSuperAdmin ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        <Crown className="h-3 w-3 mr-1" />
        Super Admin
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg flex flex-col">
        {/* Logo Section */}
        <div className="w-full px-4 pt-4 pb-4 flex flex-col items-center">
          <img
            src="https://eecbrvehrhrvdzuutliq.supabase.co/storage/v1/object/public/public-1//2023_B%20Remembered%20Weddings_Refresh%20copy%202.png"
            alt="Logo"
            className="w-full h-auto object-contain"
            style={{ maxHeight: '120px' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className =
                'w-full h-[120px] bg-rose-500 rounded flex items-center justify-center text-white font-bold text-xl';
              fallback.textContent = 'BR';
              e.currentTarget.parentNode?.appendChild(fallback);
            }}
          />
        </div>
        <div className="border-t border-gray-200" />

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
          {navigation.map((section) => (
            <div key={section.group}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 mb-1">
                {section.group}
              </h4>
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Profile */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  isSuperAdmin ? 'bg-purple-100' : 'bg-blue-100'
                }`}
              >
                {getAdminLevelIcon()}
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.description || getAdminLevelDisplay()}
              </p>
              <div className="flex items-center mt-1">{getAdminLevelBadge()}</div>
            </div>
            <button
              onClick={signOut}
              className="ml-3 inline-flex items-center p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-64">
        <main className="py-6 px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}