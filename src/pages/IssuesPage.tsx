import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface VendorIssue {
  id: string;
  vendor_id: string;
  name: string;
  issue_type: string;
  severity: string;
  description: string;
  created_at: string;
  status: string;
  admin_response: string | null;
  vendor_name: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<VendorIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIssuesCount, setOpenIssuesCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all'); // Dropdown filter state
  const navigate = useNavigate();

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vendor_issues')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;

        // Fetch vendor names
        const vendorIds = data.map(issue => issue.vendor_id);
        let vendorNames: { [key: string]: string } = {};
        if (vendorIds.length > 0) {
          const { data: vendors, error: vendorError } = await supabase
            .from('vendors')
            .select('id, name')
            .in('id', vendorIds);
          if (vendorError) throw vendorError;
          vendorNames = vendors.reduce((acc, vendor) => {
            acc[vendor.id] = vendor.name;
            return acc;
          }, {} as { [key: string]: string });
        }

        const mappedIssues = data.map(issue => ({
          ...issue,
          vendor_name: vendorNames[issue.vendor_id] || 'N/A',
        }));
        setIssues(mappedIssues || []);
        setOpenIssuesCount(mappedIssues.filter(issue => issue.status.toLowerCase() === 'open').length);
        setInProgressCount(mappedIssues.filter(issue => issue.status.toLowerCase() === 'in_progress').length);
        setResolvedCount(mappedIssues.filter(issue => issue.status.toLowerCase() === 'resolved').length);
      } catch (error: any) {
        console.error('Error fetching issues:', error);
        toast.error('Failed to load issues');
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Issues
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const filteredIssues = filterStatus === 'all'
    ? issues
    : issues.filter(issue => issue.status.toLowerCase() === filterStatus);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Issues
        </h1>
        <p className="mt-2 text-gray-500">Manage vendor issues.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-medium text-gray-700 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              Open: {openIssuesCount}
            </h2>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-medium text-gray-700 flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
              In Progress: {inProgressCount}
            </h2>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-medium text-gray-700 flex items-center">
              <AlertTriangle className="h-5 w-5 text-green-600 mr-2" />
              Resolved: {resolvedCount}
            </h2>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Issues ({issues.length})</h2>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        {issues.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
            <p className="text-gray-500">Issues will appear here when available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/dashboard/issues/${issue.id}`)}>
                    <td className="px-6 py-4 whitespace-nowrap">{issue.vendor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{issue.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{issue.issue_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{issue.severity}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{issue.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(issue.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/issues/${issue.id}`); }}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}