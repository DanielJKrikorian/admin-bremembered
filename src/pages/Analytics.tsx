import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Eye, Map, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const formatNumberWithCommas = (number: number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

function Analytics() {
  const [dailyData, setDailyData] = useState<any>({});
  const [hourlyData, setHourlyData] = useState<any>({});
  const [journeyData, setJourneyData] = useState<any>({});
  const [topScreens, setTopScreens] = useState<{ [key: string]: { screen_name: string; count: number }[] }>({
    'app.bremembered.io': [],
    'bremembered.io': [],
  });
  const [totalUsers, setTotalUsers] = useState<{ [key: string]: number }>({
    'app.bremembered.io': 0,
    'bremembered.io': 0,
  });

  useEffect(() => {
    fetchTotalUsers();
    fetchDailyData();
    fetchHourlyData();
    fetchJourneys();
    fetchTopScreens();
  }, []);

  const fetchTotalUsers = async () => {
    try {
      const sites = ['app.bremembered.io', 'bremembered.io'];
      const userCounts: { [key: string]: number } = {};

      for (const site of sites) {
        const { data, error } = await supabase
          .from('analytics_events')
          .select('user_id')
          .eq('site', site)
          .not('user_id', 'is', null);
        if (error) throw error;
        userCounts[site] = new Set(data?.map((event: any) => event.user_id)).size;
      }

      setTotalUsers(userCounts);
    } catch (error) {
      console.error('Error fetching total users:', error);
      toast.error('Failed to load total users data');
    }
  };

  const fetchDailyData = async () => {
    try {
      const { data } = await supabase
        .from('daily_active_users')
        .select('site, day, active_sessions')
        .gte('day', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('day', { ascending: true });

      const aggregated = data?.reduce((acc: any, event: any) => {
        const date = event.day.split('T')[0];
        if (!acc[date]) acc[date] = { app: 0, main: 0 };
        acc[date][event.site === 'app.bremembered.io' ? 'app' : 'main'] = event.active_sessions;
        return acc;
      }, {});

      setDailyData(aggregated || {});
    } catch (error) {
      console.error('Error fetching daily data:', error);
      toast.error('Failed to load daily analytics');
    }
  };

  const fetchHourlyData = async () => {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('analytics_events')
        .select('site, timestamp')
        .eq('event_type', 'page_view')
        .gte('timestamp', last24Hours)
        .order('timestamp', { ascending: true });

      const aggregated = data?.reduce((acc: any, event: any) => {
        const hour = new Date(event.timestamp).toISOString().slice(0, 13);
        if (!acc[hour]) acc[hour] = { app: 0, main: 0 };
        acc[hour][event.site === 'app.bremembered.io' ? 'app' : 'main']++;
        return acc;
      }, {});

      setHourlyData(aggregated || {});
    } catch (error) {
      console.error('Error fetching hourly data:', error);
      toast.error('Failed to load hourly analytics');
    }
  };

  const fetchJourneys = async () => {
    try {
      const { data } = await supabase
        .from('analytics_events')
        .select('session_id, screen_name, timestamp, user_id')
        .eq('event_type', 'page_view')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('session_id, timestamp')
        .limit(20);

      const journeys = data?.reduce((acc: any, event: any) => {
        if (!acc[event.session_id]) {
          acc[event.session_id] = {
            user_id: event.user_id || 'Anonymous',
            path: [],
            timestamps: []
          };
        }
        if (event.screen_name) {
          acc[event.session_id].path.push(event.screen_name);
          acc[event.session_id].timestamps.push(new Date(event.timestamp).toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'UTC'
          }));
        }
        return acc;
      }, {});

      setJourneyData(journeys || {});
    } catch (error) {
      console.error('Error fetching journey data:', error);
      toast.error('Failed to load journey data');
    }
  };

  const fetchTopScreens = async () => {
    try {
      const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const sites = ['app.bremembered.io', 'bremembered.io'];
      const topScreensData: any = {};

      for (const site of sites) {
        const { data, error } = await supabase
          .rpc('get_top_screens', {
            site_input: site,
            timestamp_input: lastHour,
          });
        if (error) throw error;
        topScreensData[site] = data || [];
      }

      setTopScreens(topScreensData);
    } catch (error) {
      console.error('Error fetching top screens:', error);
      toast.error('Failed to load top screens data');
    }
  };

  const dailyChartData = {
    labels: Object.keys(dailyData),
    datasets: [
      {
        label: 'App.bremembered.io',
        data: Object.values(dailyData).map((d: any) => d.app || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
      {
        label: 'Bremembered.io',
        data: Object.values(dailyData).map((d: any) => d.main || 0),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
      },
    ],
  };

  const hourlyChartData = {
    labels: Object.keys(hourlyData).map((h) => h.slice(11, 13) + ':00'),
    datasets: [
      {
        label: 'App.bremembered.io',
        data: Object.values(hourlyData).map((d: any) => d.app || 0),
        borderColor: 'rgba(59, 130, 246, 1)',
        fill: false,
      },
      {
        label: 'Bremembered.io',
        data: Object.values(hourlyData).map((d: any) => d.main || 0),
        borderColor: 'rgba(16, 185, 129, 1)',
        fill: false,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-2 text-gray-600">Detailed traffic analytics for B. Remembered apps.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" /> Total Users
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(totalUsers).map(([site, count]) => (
            <div key={site} className="border p-3 rounded">
              <p className="font-medium mb-2">{site}</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumberWithCommas(count)} users</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Eye className="h-5 w-5 mr-2" /> Daily Active Users (Last 7 Days)
        </h2>
        <Bar data={dailyChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" /> Hourly Active Users (Last 24 Hours)
        </h2>
        <Line data={hourlyChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Eye className="h-5 w-5 mr-2" /> Top Screens (Last Hour)
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(topScreens).map(([site, screens]) => (
            <div key={site} className="border p-3 rounded">
              <p className="font-medium mb-2">{site}</p>
              <ul className="text-sm space-y-1">
                {screens.map((screen, i) => (
                  <li key={i}>
                    • {screen.screen_name} ({formatNumberWithCommas(screen.count)} views)
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Map className="h-5 w-5 mr-2" /> Sample User Journeys (Last 24 Hours)
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(journeyData).map(([session, journey]: [string, any]) => (
            <div key={session} className="border p-3 rounded">
              <p className="font-medium">Session {session.slice(0, 8)}... (User: {journey.user_id})</p>
              <p className="text-sm text-gray-600">
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
    </div>
  );
}

export default Analytics;