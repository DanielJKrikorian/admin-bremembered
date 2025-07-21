import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Save, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface JobBoard {
  id: string;
  job_type: string;
  description: string | null;
  couple_id: string;
  is_open: boolean;
  created_at: string;
  updated_at: string | null;
  price: number | null;
  service_package_id: string;
  vendor_id: string | null;
  venue_id: string;
  event_start_time: string | null;
  event_end_time: string | null;
  couple_name: string | null;
  service_package_name: string | null;
  vendor_name: string | null;
  venue_name: string | null;
  venue_city: string | null;
  venue_state: string | null;
  venue_region: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

export default function JobBoardDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [eventStartTime, setEventStartTime] = useState<string>('');
  const [eventEndTime, setEventEndTime] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          jobResponse,
          vendorsResponse,
          venuesResponse
        ] = await Promise.all([
          supabase.from('job_board').select('*').eq('id', id).single().then(res => {
            if (res.error) throw new Error(`Job fetch error: ${res.error.message}`);
            return res;
          }),
          supabase.from('vendors').select('id, name').then(res => {
            if (res.error) throw new Error(`Vendors fetch error: ${res.error.message}`);
            return res;
          }),
          supabase.from('venues').select('id, name, city, state, region').then(res => {
            if (res.error) throw new Error(`Venues fetch error: ${res.error.message}`);
            return res;
          }),
        ]);

        const venue = venuesResponse.data.find(v => v.id === jobResponse.data.venue_id);
        const mappedJob: JobBoard = {
          ...jobResponse.data,
          couple_name: jobResponse.data.couple_id ? (await supabase.from('couples').select('name').eq('id', jobResponse.data.couple_id).single()).data?.name || 'N/A' : 'N/A',
          service_package_name: jobResponse.data.service_package_id ? (await supabase.from('service_packages').select('name').eq('id', jobResponse.data.service_package_id).single()).data?.name || 'N/A' : 'N/A',
          vendor_name: jobResponse.data.vendor_id ? (vendorsResponse.data.find(v => v.id === jobResponse.data.vendor_id)?.name || 'N/A') : null,
          venue_name: venue ? venue.name : 'N/A',
          venue_city: venue ? venue.city : 'N/A',
          venue_state: venue ? venue.state : 'N/A',
          venue_region: venue ? venue.region : 'N/A',
        };
        setJob(mappedJob);
        setVendorId(mappedJob.vendor_id);
        setEventStartTime(mappedJob.event_start_time || '');
        setEventEndTime(mappedJob.event_end_time || '');
        setVendors(vendorsResponse.data || []);
      } catch (error: any) {
        console.error('Error fetching job details:', error);
        toast.error(error.message || 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!job) return;

    try {
      const { error } = await supabase
        .from('job_board')
        .update({
          vendor_id: vendorId,
          is_open: !vendorId,
          updated_at: new Date().toISOString(),
          event_start_time: eventStartTime || null,
          event_end_time: eventEndTime || null,
        })
        .eq('id', job.id);
      if (error) throw error;

      toast.success('Job updated successfully!');
      navigate('/dashboard/job-board');
    } catch (error: any) {
      console.error('Error updating job:', error);
      toast.error(`Failed to update job: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!job) return;

    try {
      const { error } = await supabase
        .from('job_board')
        .delete()
        .eq('id', job.id);
      if (error) throw error;

      toast.success('Job deleted successfully!');
      navigate('/dashboard/job-board');
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast.error(`Failed to delete job: ${error.message}`);
    }
  };

  // Function to convert UTC to EST (GMT-4)
  const convertToEST = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { timeZone: 'America/New_York' });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Job Details
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Job Details
          </h1>
        </div>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Job not found</h3>
          <p className="text-gray-500">The requested job could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <button
            onClick={() => navigate('/dashboard/job-board')}
            className="inline-flex items-center px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Job Board
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center mt-2">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Job Details
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Job Type</label>
              <p className="mt-1 text-sm text-gray-900">{job.job_type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Couple</label>
              <p className="mt-1 text-sm text-gray-900">{job.couple_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payout</label>
              <p className="mt-1 text-sm text-gray-900">${(job.price ? job.price / 100 : 0).toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Service Package</label>
              <p className="mt-1 text-sm text-gray-900">{job.service_package_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Venue</label>
              <p className="mt-1 text-sm text-gray-900">
                {job.venue_name || 'N/A'}
                {job.venue_name && job.venue_city && job.venue_state ? ` (${job.venue_city}, ${job.venue_state}${job.venue_region ? `, ${job.venue_region}` : ''})` : ''}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Start Date & Time</label>
              <input
                type="datetime-local"
                value={eventStartTime || ''}
                onChange={(e) => setEventStartTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Event End Date & Time</label>
              <input
                type="datetime-local"
                value={eventEndTime || ''}
                onChange={(e) => setEventEndTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vendor</label>
              <select
                value={vendorId || ''}
                onChange={(e) => setVendorId(e.target.value || null)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-between space-x-2">
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
