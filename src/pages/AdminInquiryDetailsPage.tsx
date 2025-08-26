import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Send, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface SupportInquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: string | null;
  status: string | null;
  user_id: string | null;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminInquiryDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState<SupportInquiry | null>(null);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInquiry = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('support_inquiries')
          .select('id, name, email, subject, message, priority, status, user_id, response, responded_at, created_at, updated_at')
          .eq('id', id)
          .single();

        if (error) throw error;
        setInquiry(data);
        setResponse(data?.response || '');
        setStatus(data?.status || 'open');
      } catch (error: any) {
        console.error('Error loading inquiry details:', error.message, error.details, error.hint);
        toast.error('Failed to load inquiry details');
      } finally {
        setLoading(false);
      }
    };

    fetchInquiry();
  }, [id]);

  const handleUpdateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !inquiry) return;

    try {
      const updates = {
        response,
        status,
        responded_at: response ? new Date().toISOString() : inquiry.responded_at,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('support_inquiries')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setInquiry({ ...inquiry, ...updates });
      toast.success('Inquiry updated successfully');
    } catch (error: any) {
      console.error('Error updating inquiry:', error.message, error.details, error.hint);
      toast.error('Failed to update inquiry');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Inquiry not found</h3>
        <p className="text-gray-500">The requested inquiry could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Inquiry Details
        </h1>
        <p className="mt-2 text-gray-500">View and manage this support inquiry.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Inquiry Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">ID</p>
              <p className="text-sm text-gray-700">{inquiry.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Name</p>
              <p className="text-sm text-gray-700">{inquiry.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-700">{inquiry.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Subject</p>
              <p className="text-sm text-gray-700">{inquiry.subject}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-gray-900">Message</p>
              <p className="text-sm text-gray-700">{inquiry.message}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Priority</p>
              <p className="text-sm text-gray-700">{inquiry.priority || 'Normal'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Status</p>
              <p className="text-sm text-gray-700">{inquiry.status || 'Open'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Created At</p>
              <p className="text-sm text-gray-700">{new Date(inquiry.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Updated At</p>
              <p className="text-sm text-gray-700">{new Date(inquiry.updated_at).toLocaleString()}</p>
            </div>
            {inquiry.responded_at && (
              <div>
                <p className="text-sm font-medium text-gray-900">Responded At</p>
                <p className="text-sm text-gray-700">{new Date(inquiry.responded_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Inquiry</h2>
        <form onSubmit={handleUpdateInquiry} className="space-y-4">
          <div>
            <label htmlFor="status" className="text-sm font-medium text-gray-900">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label htmlFor="response" className="text-sm font-medium text-gray-900">Response</label>
            <textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your response..."
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Update Inquiry
          </button>
        </form>
      </div>

      <button
        onClick={() => navigate('/dashboard/inquiries')}
        className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>
    </div>
  );
}