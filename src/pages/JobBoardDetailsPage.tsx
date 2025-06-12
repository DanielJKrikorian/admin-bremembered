import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Save, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface JobBoard {
  id: string;
  job_type: string;
  description: string;
  couple_id: string;
  is_open: boolean;
  created_at: string;
  updated_at: string | null;
  price: number;
  service_package_id: string;
  vendor_id: string | null;
  event_date: string | null;
  event_start_time: string | null;
  couple_name: string | null;
  service_package_name: string | null;
  vendor_name: string | null;
}

interface Couple {
  id: string;
  name: string;
  wedding_date: string;
}

interface ServicePackage {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface Venue {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

export default function JobBoardDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [eventStartTime, setEventStartTime] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('job_board')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;

        const [couplesResponse, packagesResponse, venuesResponse, vendorsResponse] = await Promise.all([
          supabase.from('couples').select('id, name, wedding_date'),
          supabase.from('service_packages').select('id, name, price, description'),
          supabase.from('venues').select('id, name'),
          supabase.from('vendors').select('id, name'),
        ]);

        if (couplesResponse.error) throw couplesResponse.error;
        if (packagesResponse.error) throw packagesResponse.error;
        if (venuesResponse.error) throw venuesResponse.error;
        if (vendorsResponse.error) throw vendorsResponse.error;

        const couple = couplesResponse.data.find(c => c.id === data.couple_id);
        const packageData = packagesResponse.data.find(p => p.id === data.service_package_id);
        const vendor = data.vendor_id ? (vendorsResponse.data.find(v => v.id === data.vendor_id) || { name: 'N/A' }) : null;
        const mappedJob = {
          ...data,
          couple_name: couple ? couple.name : 'N/A',
          service_package_name: packageData ? packageData.name : 'N/A',
          vendor_name: vendor ? vendor.name : null,
          event_date: couple ? couple.wedding_date : data.event_date, // Auto-fill with wedding_date
        };
        setJob(mappedJob);
        setVendorId(mappedJob.vendor_id);
        setEventStartTime(mappedJob.event_start_time || '');
        setVendors(vendorsResponse.data || []);
      } catch (error: any) {
        console.error('Error fetching job details:', error);
        toast.error('Failed to load job details');
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
        })
        .eq('id', job.id);
      if (error) throw error;

      toast.success('Job updated successfully!');
      navigate('/dashboard/job-board');
    } catch (error: any) {
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    }
  };

  const handleDelete = async () => {
    if (!job) return;

    if (window.confirm('Are you sure you want to delete this job?')) {
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
        toast.error('Failed to delete job');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Job not found</h3>
        <p className="text-gray-500">The requested job could not be loaded.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Job Details
          </h1>
          <p className="mt-2 text-gray-500">Manage job details and assign vendors.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Job Type</label>
              <p className="mt-1 text-sm text-gray-900">{job.job_type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Couple</label>
              <p className="mt-1 text-sm text-gray-900">{job.couple_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Date</label>
              <p className="mt-1 text-sm text-gray-900">{job.event_date ? new Date(job.event_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Start Time</label>
              <p className="mt-1 text-sm text-gray-900">{job.event_start_time ? new Date(job.event_start_time).toLocaleTimeString() : 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price</label>
              <p className="mt-1 text-sm text-gray-900">${(job.price / 100).toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Package</label>
              <p className="mt-1 text-sm text-gray-900">{job.service_package_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vendor</label>
              <select
                value={vendorId || ''}
                onChange={(e) => setVendorId(e.target.value || null)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Not Assigned</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Start Time</label>
              <input
                type="time"
                value={eventStartTime || ''}
                onChange={(e) => setEventStartTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-between space-x-2">
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </button>
                <button
                  onClick={() => navigate('/dashboard/job-board')}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}