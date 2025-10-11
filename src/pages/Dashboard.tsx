import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, Heart, Calendar, DollarSign, Package, UserPlus, Eye, Clock, Activity, Map } from 'lucide-react';
import toast from 'react-hot-toast';

const formatNumberWithCommas = (number: number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

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
    depositRevenue: '$0.00',
    finalPaymentRevenue: '$0.00',
  });
  const [changes, setChanges] = useState({
    vendorsChange: '0%',
    couplesChange: '0%',
    bookingsChange: '0%',
    depositRevenueChange: '0%',
    finalPaymentRevenueChange: '0%',
  });
  const [traffic, setTraffic] = useState({
    totalUsers: { 'app.bremembered.io': 0, 'bremembered.io': 0 },
    currentUsers: { 'app.bremembered.io': 0, 'bremembered.io': 0 },
    todayUsers: { 'app.bremembered.io': 0, 'bremembered.io': 0 },
    hourlyUsers: { 'app.bremembered.io': 0, 'bremembered.io': 0 },
    topScreens: { 'app.bremembered.io': [], 'bremembered.io': [] } as { [key: string]: { screen_name: string; count: number }[] },
    journeys: { 'app.bremembered.io': {}, 'bremembered.io': {} } as { [key: string]: { [session_id: string]: { user_id: string; path: string[]; timestamps: string[] } } },
  });

  const fetchData = async () => {
    try {
      const currentYearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

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

      const { data: eventsCreatedThisYear } = await supabase
        .from('events')
        .select('id')
        .gte('created_at', currentYearStart);
      const eventIdsThisYear = eventsCreatedThisYear?.map(event => event.id) || [];
      const { data: depositBookings } = await supabase
        .from('bookings')
        .select('platform_deposit_share')
        .in('event_id', eventIdsThisYear)
        .gte('created_at', currentYearStart);
      const depositRevenue = depositBookings?.reduce((sum, booking) => sum + (booking.platform_deposit_share || 0), 0) || 0;

      const { data: eventsStartingThisYear } = await supabase
        .from('events')
        .select('id')
        .gte('start_time', currentYearStart);
      const eventIdsStartingThisYear = eventsStartingThisYear?.map(event => event.id) || [];
      const { data: finalBookings } = await supabase
        .from('bookings')
        .select('platform_final_share')
        .in('event_id', eventIdsStartingThisYear)
        .eq('final_payment_status', 'paid');
      const finalPaymentRevenue = finalBookings?.reduce((sum, booking) => sum + (booking.platform_final_share || 0), 0) || 0;

      const { data: prevDepositBookings } = await supabase
        .from('bookings')
        .select('platform_deposit_share')
        .in('event_id', eventIdsThisYear)
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', oneWeekAgo);
      const prevDepositRevenue = prevDepositBookings?.reduce((sum, booking) => sum + (booking.platform_deposit_share || 0), 0) || 0;

      const { data: prevFinalBookings } = await supabase
        .from('bookings')
        .select('platform_final_share')
        .in('event_id', eventIdsStartingThisYear)
        .eq('final_payment_status', 'paid')
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', oneWeekAgo);
      const prevFinalPaymentRevenue = prevFinalBookings?.reduce((sum, booking) => sum + (booking.platform_final_share || 0), 0) || 0;

      const depositRevenueChange = prevDepositRevenue
        ? `${(((depositRevenue - prevDepositRevenue) / prevDepositRevenue) * 100).toFixed(0)}%`
        : '0%';
      const finalPaymentRevenueChange = prevFinalPaymentRevenue
        ? `${(((finalPaymentRevenue - prevFinalPaymentRevenue) / prevFinalPaymentRevenue) * 100).toFixed(0)}%`
        : '0%';

      setStats({
        totalVendors: vendorsCount?.toString() || '0',
        activeCouples: couplesCount?.toString() || '0',
        totalBookings: bookingsCount?.toString() || '0',
        depositRevenue: `$${formatNumberWithCommas(Number((depositRevenue / 100).toFixed(2)))}`,
        finalPaymentRevenue: `$${formatNumberWithCommas(Number((finalPaymentRevenue / 100).toFixed(2)))}`,
      });
      setChanges({
        vendorsChange: vendorsChange,
        couplesChange: couplesChange,
        bookingsChange: bookingsChange,
        depositRevenueChange: depositRevenueChange,
        finalPaymentRevenueChange: finalPaymentRevenueChange,
      });

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

  const fetchTraffic = useCallback(async () => {
    try {
      const sites = ['app.bremembered.io', 'bremembered.io'];
      const today = new Date().toISOString().split('T')[0];
      const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const trafficData: any = {
        totalUsers: {},
        currentUsers: {},
        todayUsers: {},
        hourlyUsers: {},
        topScreens: {},
        journeys: {},
      };

      for (const site of sites) {
        // Total Users: Distinct user_id
        const { data: userData, error: userError } = await supabase
          .from('analytics_events')
          .select('user_id')
          .eq('site', site)
          .not('user_id', 'is', null);
        if (userError) throw userError;
        trafficData.totalUsers[site] = new Set(userData?.map((event: any) => event.user_id)).size;

        // Current Users: Distinct sessions in last 10 min
        const { count: current, error: currentError } = await supabase
          .from('analytics_events')
          .select('session_id', { count: 'exact', head: true })
          .eq('site', site)
          .gte('timestamp', new Date(Date.now() - 10 * 60 * 1000).toISOString())
          .not('event_type', 'eq', 'session_end');
        if (currentError) throw currentError;

        // Today: Distinct sessions
        const { count: todayCount, error: todayError } = await supabase
          .from('analytics_events')
          .select('session_id', { count: 'exact', head: true })
          .eq('site', site)
          .eq('event_type', 'page_view')
          .gte('timestamp', `${today}T00:00:00Z`);
        if (todayError) throw todayError;

        // Hourly: Distinct sessions
        const { count: hourlyCount, error: hourlyError } = await supabase
          .from('analytics_events')
          .select('session_id', { count: 'exact', head: true })
          .eq('site', site)
          .eq('event_type', 'page_view')
          .gte('timestamp', lastHour);
        if (hourlyError) throw hourlyError;

        // Top Screens: Last hour
        const { data: screens, error: screensError } = await supabase
          .rpc('get_top_screens', {
            site_input: site,
            timestamp_input: lastHour,
          });
        if (screensError) throw screensError;

        // User Journeys: Last 24 hours, limited to 10 sessions
        const { data: journeyData, error: journeyError } = await supabase
          .from('analytics_events')
          .select('session_id, screen_name, timestamp, user_id')
          .eq('site', site)
          .eq('event_type', 'page_view')
          .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('session_id, timestamp')
          .limit(10);
        if (journeyError) throw journeyError;

        const journeys = journeyData?.reduce((acc: any, event: any) => {
          if (!acc[event.session_id]) {
            acc[event.session_id] = {
              user_id: event.user_id || 'Anonymous',
              path: [],
              timestamps: [],
            };
          }
          if (event.screen_name) {
            acc[event.session_id].path.push(event.screen_name);
            acc[event.session_id].timestamps.push(
              new Date(event.timestamp).toLocaleString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZone: 'UTC',
              })
            );
          }
          return acc;
        }, {});

        trafficData.totalUsers[site] = userData ? trafficData.totalUsers[site] : 0;
        trafficData.currentUsers[site] = current || 0;
        trafficData.todayUsers[site] = todayCount || 0;
        trafficData.hourlyUsers[site] = hourlyCount || 0;
        trafficData.topScreens[site] = screens || [];
        trafficData.journeys[site] = journeys || {};
      }

      setTraffic(trafficData);
    } catch (error) {
      console.error('Error fetching traffic data:', error);
      toast.error('Failed to load traffic data');
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchTraffic();
    const interval = setInterval(fetchTraffic, 60000);
    const sites = ['app.bremembered.io', 'bremembered.io'];
    const channels = sites.map((site) =>
      supabase
        .channel(`traffic:${site}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'analytics_events', filter: `site=eq.${site}` },
          () => {
            fetchTraffic();
          }
        )
        .subscribe()
    );

    return () => {
      clearInterval(interval);
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [fetchTraffic]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to B. Remembered Admin Dashboard. Monitor and manage all platform data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          title="Deposit Revenue"
          value={stats.depositRevenue}
          change={changes.depositRevenueChange}
          changeType={changes.depositRevenueChange.includes('-') ? 'negative' : 'positive'}
          icon={DollarSign}
        />
        <StatsCard
          title="Final Payment Revenue"
          value={stats.finalPaymentRevenue}
          change={changes.finalPaymentRevenueChange}
          changeType={changes.finalPaymentRevenueChange.includes('-') ? 'negative' : 'positive'}
          icon={DollarSign}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Real-Time Traffic</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {Object.entries(traffic.totalUsers).map(([site, count]) => (
            <StatsCard
              key={site}
              title={`Total Users (${site})`}
              value={formatNumberWithCommas(count)}
              change="All Time"
              changeType="neutral"
              icon={Users}
            />
          ))}
          {Object.entries(traffic.currentUsers).map(([site, count]) => (
            <StatsCard
              key={site}
              title={`Current Users (${site})`}
              value={formatNumberWithCommas(count)}
              change="Live"
              changeType="neutral"
              icon={Activity}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Today's Active Users</h3>
            <div className="space-y-2">
              {Object.entries(traffic.todayUsers).map(([site, count]) => (
                <p key={site} className="text-sm">
                  {site}: {formatNumberWithCommas(count)}
                </p>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Last Hour's Users</h3>
            <div className="space-y-2">
              {Object.entries(traffic.hourlyUsers).map(([site, count]) => (
                <p key={site} className="text-sm">
                  {site}: {formatNumberWithCommas(count)}
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Top Screens (Last Hour)</h3>
            {Object.entries(traffic.topScreens).map(([site, screens]) => (
              <div key={site} className="mb-2">
                <p className="text-xs font-medium text-gray-500">{site}:</p>
                <ul className="text-sm space-y-1">
                  {screens.map((screen, i) => (
                    <li key={i}>• {screen.screen_name} ({formatNumberWithCommas(screen.count)} views)</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Sample User Journeys (Last 24 Hours)</h3>
            {Object.entries(traffic.journeys).map(([site, journeys]) => (
              <div key={site} className="mb-2">
                <p className="text-xs font-medium text-gray-500">{site}:</p>
                <div className="space-y-2">
                  {Object.entries(journeys).map(([session, journey]: [string, any]) => (
                    <div key={session} className="text-sm">
                      <p className="font-medium">Session {session.slice(0, 8)}... (User: {journey.user_id})</p>
                      <p className="text-gray-600">
                        Path: {journey.path.map((screen: string, i: number) => (
                          <span key={i}>
                            {screen} <span className="text-gray-400">({journey.timestamps[i]})</span>
                            {i < journey.path.length - 1 && ' → '}
                          </span>
                        ))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                Total: ${formatNumberWithCommas(Number((latestOrder.total_amount / 100).toFixed(2)))} •{' '}
                {new Date(latestOrder.created_at).toLocaleString('en-US', { timeZone: 'UTC' })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recent orders</p>
        )}
      </div>

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
                Amount: ${formatNumberWithCommas(Number((latestBooking.amount / 100).toFixed(2)))} •{' '}
                {new Date(latestBooking.created_at).toLocaleString('en-US', { timeZone: 'UTC' })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recent bookings</p>
        )}
      </div>

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
              <p className="text-xs text-gray-500">
                {new Date(latestLead.created_at).toLocaleString('en-US', { timeZone: 'UTC' })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recent leads</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;