import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import AddLeadModal from '../components/AddLeadModal';

interface Lead {
  id: string;
  name: string;
  email: string;
  source: string;
  status: string;
  vendor_id: string | null;
  created_at: string;
  phone: string | null;
  preferred_contact_method: string | null;
  wedding_date: string | null;
  city: string | null;
  services_requested: string | null;
  form_notes: string | null;
  response_status: string | null;
  lead_source: string | null;
  updated_at: string | null;
  state: string | null;
  partner_name: string | null;
  referral_source: string | null;
  photography_hours: number | null;
  videography_hours: number | null;
  dj_hours: number | null;
  coordination_hours: number | null;
  budget_range: string | null;
  service_type: string | null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    currentMonth: 0,
    lastMonth: 0,
    thisYear: 0,
    lastYear: 0,
    moMChange: '0%',
    yoYChange: '0%',
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      console.log('Fetching leads from Supabase...');
      const { data, error } = await supabase
        .from('leads')
        .select('*');
      if (error) throw error;

      const leadsData = data || [];
      console.log('Leads data fetched:', leadsData);

      // Calculate analytics
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      const thisYearStart = new Date(now.getFullYear(), 0, 1).toISOString();
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1).toISOString();
      const lastYearEnd = new Date(now.getFullYear(), 0, 0).toISOString();

      const currentMonthLeads = leadsData.filter(lead => 
        new Date(lead.created_at) >= new Date(currentMonthStart) && new Date(lead.created_at) <= now
      ).length;
      const lastMonthLeads = leadsData.filter(lead => 
        new Date(lead.created_at) >= new Date(lastMonthStart) && new Date(lead.created_at) <= new Date(lastMonthEnd)
      ).length;
      const thisYearLeads = leadsData.filter(lead => 
        new Date(lead.created_at) >= new Date(thisYearStart) && new Date(lead.created_at) <= now
      ).length;
      const lastYearLeads = leadsData.filter(lead => 
        new Date(lead.created_at) >= new Date(lastYearStart) && new Date(lead.created_at) <= new Date(lastYearEnd)
      ).length;

      const moMChange = lastMonthLeads > 0 ? `${(((currentMonthLeads - lastMonthLeads) / lastMonthLeads) * 100).toFixed(1)}%` : 'N/A';
      const yoYChange = lastYearLeads > 0 ? `${(((thisYearLeads - lastYearLeads) / lastYearLeads) * 100).toFixed(1)}%` : 'N/A';

      setAnalytics({
        currentMonth: currentMonthLeads,
        lastMonth: lastMonthLeads,
        thisYear: thisYearLeads,
        lastYear: lastYearLeads,
        moMChange: moMChange,
        yoYChange: yoYChange,
      });
      setLeads(leadsData);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Leads
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Leads
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all leads.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </button>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">Current Month Leads</h3>
          <p className="text-2xl font-semibold text-gray-900">{analytics.currentMonth}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">Last Month Leads</h3>
          <p className="text-2xl font-semibold text-gray-900">{analytics.lastMonth}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">This Year Leads</h3>
          <p className="text-2xl font-semibold text-gray-900">{analytics.thisYear}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">Last Year Leads</h3>
          <p className="text-2xl font-semibold text-gray-900">{analytics.lastYear}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">MoM Change</h3>
          <p className={`text-2xl font-semibold ${analytics.moMChange.includes('-') ? 'text-red-600' : 'text-green-600'}`}>
            {analytics.moMChange}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">YoY Change</h3>
          <p className={`text-2xl font-semibold ${analytics.yoYChange.includes('-') ? 'text-red-600' : 'text-green-600'}`}>
            {analytics.yoYChange}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Leads ({leads.length})</h2>
        </div>
        {leads.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-500">Add leads to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/lead/${lead.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">{lead.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{lead.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{lead.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(lead.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/lead/${lead.id}`); }}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLeadAdded={fetchLeads} />
    </div>
  );
}