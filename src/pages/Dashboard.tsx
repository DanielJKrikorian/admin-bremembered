import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, Heart, Calendar, CreditCard, Package, Book, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
}

function StatsCard({ title, value, change, changeType, icon: Icon }: StatsCardProps) {
  const changeColor = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  }[changeType];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              <div className={`ml-2 flex items-baseline text-sm font-semibold ${changeColor}`}>
                {change}
              </div>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

interface StoreOrder {
  id: string;
  total_amount: number;
  created_at: string;
}

interface Booking {
  id: string;
  amount: number;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  created_at: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [latestOrder, setLatestOrder] = useState<StoreOrder | null>(null);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
  const [latestLead, setLatestLead] = useState<Lead | null>(null);
  const [stats, setStats] = useState({
    totalVendors: '0',
    activeCouples: '0',
    totalBookings: '0',
    totalRevenue: '$0.00',
  });
  const [changes, setChanges] = useState({
    vendorsChange: '0%',
    couplesChange: '0%',
    bookingsChange: '0%',
    revenueChange: '0%',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stats
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

        // Total Vendors
        const { count: vendorsCount } = await supabase.from('vendors').select('*', { count: 'exact' });
        const { count: recentVendors } = await supabase
          .from('vendors')
          .select('*', { count: 'exact' })
          .gte('created_at', oneWeekAgo);
        const { count: prevVendors } = await supabase
          .from('vendors')
          .select('*', { count: 'exact' })
          .gte('created_at', twoWeeksAgo)
          .lt('created_at', oneWeekAgo);
        const vendorsChange = vendorsCount && prevVendors
          ? `${((recentVendors / prevVendors - 1) * 100).toFixed(0)}%`
          : '0%';
        const vendorsChangeType = recentVendors >= prevVendors ? 'positive' : 'negative';

        // Active Couples (assuming all are active)
        const { count: couplesCount } = await supabase.from('couples').select('*', { count: 'exact' });
        const { count: recentCouples } = await supabase
          .from('couples')
          .select('*', { count: 'exact' })
          .gte('created_at', oneWeekAgo);
        const { count: prevCouples } = await supabase
          .from('couples')
          .select('*', { count: 'exact' })
          .gte('created_at', twoWeeksAgo)
          .lt('created_at', oneWeekAgo);
        const couplesChange = couplesCount && prevCouples
          ? `${((recentCouples / prevCouples - 1) * 100).toFixed(0)}%`
          : '0%';
        const couplesChangeType = recentCouples >= prevCouples ? 'positive' : 'negative';

        // Total Bookings
        const { count: bookingsCount } = await supabase.from('bookings').select('*', { count: 'exact' });
        const { count: recentBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .gte('created_at', oneWeekAgo);
        const { count: prevBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .gte('created_at', twoWeeksAgo)
          .lt('created_at', oneWeekAgo);
        const bookingsChange = bookingsCount && prevBookings
          ? `${((recentBookings / prevBookings - 1) * 100).toFixed(0)}%`
          : '0%';
        const bookingsChangeType = recentBookings >= prevBookings ? 'positive' : 'negative';

        // Total Revenue (store_orders.total_amount + bookings.amount)
        const { data: ordersData } = await supabase
          .from('store_orders')
          .select('total_amount')
          .gte('created_at', twoWeeksAgo);
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('amount')
          .gte('created_at', twoWeeksAgo);
        const recentRevenue = (ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0) +
          (bookingsData?.reduce((sum, booking) => sum + (booking.amount || 0), 0) || 0);
        const prevRevenue = (ordersData?.filter(order => order.created_at < oneWeekAgo).reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0) +
          (bookingsData?.filter(booking => booking.created_at < oneWeekAgo).reduce((sum, booking) => sum + (booking.amount || 0), 0) || 0);
        const totalRevenue = (recentRevenue / 100).toFixed(2);
        const revenueChange = prevRevenue
          ? `${(((recentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(0)}%`
          : '0%';
        const revenueChangeType = recentRevenue >= prevRevenue ? 'positive' : 'negative';

        setStats({
          totalVendors: vendorsCount?.toString() || '0',
          activeCouples: couplesCount?.toString() || '0',
          totalBookings: bookingsCount?.toString() || '0',
          totalRevenue: `$${(recentRevenue / 100).toFixed(2)}`,
        });
        setChanges({
          vendorsChange: vendorsChange,
          couplesChange: couplesChange,
          bookingsChange: bookingsChange,
          revenueChange: revenueChange,
        });

        // Fetch latest entries
        const { data: orderData } = await supabase
          .from('store_orders')
          .select('id, total_amount, created_at')
          .order('created_at', { ascending: false })
          .limit(1);
        setLatestOrder(orderData?.[0] || null);

        const { data: bookingData } = await supabase
          .from('bookings')
          .select('id, amount, created_at')
          .order('created_at', { ascending: false })
          .limit(1);
        setLatestBooking(bookingData?.[0] || null);

        const { data: leadData } = await supabase
          .from('leads')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(1);
        setLatestLead(leadData?.[0] || null);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to B. Remembered Admin Dashboard. Monitor and manage all platform data.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Vendors"
          value={stats.totalVendors}
          change={changes.vendorsChange}
          changeType={changes.vendorsChange.includes('-') ? 'negative' : 'positive'}
          icon={Users}
        />
        <StatsCard
          title="Active Couples"
          value={stats.activeCouples}
          change={changes.couplesChange}
          changeType={changes.couplesChange.includes('-') ? 'negative' : 'positive'}
          icon={Heart}
        />
        <StatsCard
          title="Bookings"
          value={stats.totalBookings}
          change={changes.bookingsChange}
          changeType={changes.bookingsChange.includes('-') ? 'negative' : 'positive'}
          icon={Calendar}
        />
        <StatsCard
          title="Revenue"
          value={stats.totalRevenue}
          change={changes.revenueChange}
          changeType={changes.revenueChange.includes('-') ? 'negative' : 'positive'}
          icon={CreditCard}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate('/dashboard/store-orders')}
          >
            <Package className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">Manage Store Orders</h3>
            <p className="text-sm text-gray-600">View and manage store orders</p>
          </div>

          <div
            className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate('/dashboard/bookings')}
          >
            <Calendar className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">Manage Bookings</h3>
            <p className="text-sm text-gray-600">View and edit bookings</p>
          </div>

          <div
            className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate('/dashboard/couples')}
          >
            <Heart className="h-8 w-8 text-rose-500 mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">Manage Couples</h3>
            <p className="text-sm text-gray-600">Manage couple accounts</p>
          </div>

          <div
            className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate('/dashboard/vendors')}
          >
            <Users className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">Manage Vendors</h3>
            <p className="text-sm text-gray-600">View and edit vendor details</p>
          </div>

          <div
            className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate('/dashboard/leads')}
          >
            <UserPlus className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">Manage Leads</h3>
            <p className="text-sm text-gray-600">Track and manage leads</p>
          </div>

          <div
            className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate('/dashboard/job-board')}
          >
            <Book className="h-8 w-8 text-indigo-600 mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">Manage Job Board</h3>
            <p className="text-sm text-gray-600">View and manage job listings</p>
          </div>
        </div>
      </div>

      {/* Latest Store Order */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Latest Store Order</h2>
        {latestOrder ? (
          <div className="flex items-center">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">Order #{latestOrder.id}</span>
              </p>
              <p className="text-xs text-gray-500">
                Total: ${(latestOrder.total_amount / 100).toFixed(2)} • {new Date(latestOrder.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recent orders</p>
        )}
      </div>

      {/* Latest Booking */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Latest Booking</h2>
        {latestBooking ? (
          <div className="flex items-center">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">Booking #{latestBooking.id}</span>
              </p>
              <p className="text-xs text-gray-500">
                Amount: ${(latestBooking.amount / 100).toFixed(2)} • {new Date(latestBooking.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recent bookings</p>
        )}
      </div>

      {/* Latest Lead */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Latest Lead</h2>
        {latestLead ? (
          <div className="flex items-center">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-purple-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{latestLead.name}</span>
              </p>
              <p className="text-xs text-gray-500">{new Date(latestLead.created_at).toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recent leads</p>
        )}
      </div>
    </div>
  );
}