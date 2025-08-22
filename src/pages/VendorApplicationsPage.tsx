import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface VendorApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  services_applying_for: string[];
}

export default function VendorApplicationsPage() {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const applicationsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_applications')
        .select('id, name, email, phone, status, created_at, services_applying_for')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (error: any) {
      console.error('Error fetching vendor applications:', error);
      toast.error('Failed to load vendor applications');
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      );
      toast.success('Status updated successfully');
    } catch (error: any) {
      console.error('Error updating application status:', error);
      toast.error('Failed to update status');
    }
  };

  const indexOfLastApplication = currentPage * applicationsPerPage;
  const indexOfFirstApplication = indexOfLastApplication - applicationsPerPage;
  const currentApplications = applications
    .filter((app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.status.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(indexOfFirstApplication, indexOfLastApplication);
  const totalPages = Math.ceil(applications.length / applicationsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Briefcase className="h-8 w-8 text-blue-600 mr-3" />
            Vendor Applications
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
            <Briefcase className="h-8 w-8 text-blue-600 mr-3" />
            Vendor Applications
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all vendor applications.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Applications ({applications.length})</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or status..."
            className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-500">No vendor applications available.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/vendor-application/${app.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">{app.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{app.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{app.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{app.services_applying_for.join(', ')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={app.status}
                          onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(app.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/vendor-application/${app.id}`); }}
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
            <div className="px-6 py-4 flex justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => paginate(page)}
                  className={`mx-1 px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {page}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}