import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Edit, Save } from 'lucide-react';
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

export default function IssueDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<VendorIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('');
  const [adminResponse, setAdminResponse] = useState<string>('');

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vendor_issues')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;

        // Fetch vendor name
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('id, name')
          .eq('id', data.vendor_id)
          .single();
        if (vendorError) throw vendorError;

        const mappedIssue = {
          ...data,
          vendor_name: vendorData.name,
        };
        setIssue(mappedIssue);
        setStatus(mappedIssue.status);
        setAdminResponse(mappedIssue.admin_response || '');
      } catch (error: any) {
        console.error('Error fetching issue:', error);
        toast.error('Failed to load issue details');
      } finally {
        setLoading(false);
      }
    };

    fetchIssue();
  }, [id]);

  const handleSave = async () => {
    if (!issue) return;

    try {
      const { error } = await supabase
        .from('vendor_issues')
        .update({
          status,
          admin_response: adminResponse || null,
        })
        .eq('id', issue.id);
      if (error) throw error;

      toast.success('Issue updated successfully!');
      setIssue({ ...issue, status, admin_response: adminResponse || null });
      navigate('/dashboard/issues');
    } catch (error: any) {
      console.error('Error updating issue:', error);
      toast.error('Failed to update issue');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Issue not found</h3>
        <p className="text-gray-500">The requested issue could not be loaded.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Issue Details
          </h1>
          <p className="mt-2 text-gray-500">Manage vendor issue details.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vendor</label>
              <p className="mt-1 text-sm text-gray-900">{issue.vendor_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{issue.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Issue Type</label>
              <p className="mt-1 text-sm text-gray-900">{issue.issue_type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Severity</label>
              <p className="mt-1 text-sm text-gray-900">{issue.severity}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{issue.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin Response</label>
              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                placeholder="Enter your response..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
              <button
                onClick={() => navigate('/dashboard/issues')}
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}