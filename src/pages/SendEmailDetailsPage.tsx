import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Email {
  id: string;
  vendor_id: string | null;
  couple_id: string | null;
  lead_id: string | null;
  subject: string;
  body: string;
  sent_at: string;
  status: string;
  recipient_name: string | null;
  recipient_email: string | null;
}

export default function SendEmailDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmail();
  }, [id]);

  const fetchEmail = async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Email ID is undefined');

      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      let recipient_name = null;
      let recipient_email = null;

      if (data.vendor_id) {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('name, user_id')
          .eq('id', data.vendor_id)
          .single();
        recipient_name = vendor?.name || 'Unknown Vendor';
        if (vendor?.user_id) {
          const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('id', vendor.user_id)
            .single();
          recipient_email = user?.email || 'No email';
        }
      } else if (data.couple_id) {
        const { data: couple } = await supabase
          .from('couples')
          .select('name, user_id')
          .eq('id', data.couple_id)
          .single();
        recipient_name = couple?.name || 'Unknown Couple';
        if (couple?.user_id) {
          const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('id', couple.user_id)
            .single();
          recipient_email = user?.email || 'No email';
        }
      } else if (data.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('name, email')
          .eq('id', data.lead_id)
          .single();
        recipient_name = lead?.name || 'Unknown Lead';
        recipient_email = lead?.email || 'No email';
      }

      setEmail({ ...data, recipient_name, recipient_email });
    } catch (error: any) {
      console.error('Error fetching email:', error);
      toast.error('Failed to load email details');
      navigate('/dashboard/send-emails');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !email) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Email Details: {email.id}
        </h1>
        <button
          onClick={() => navigate('/dashboard/send-emails')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Emails
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Email Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Recipient</label>
            <p className="text-sm text-gray-900">{email.recipient_name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-sm text-gray-900">{email.recipient_email || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Subject</label>
            <p className="text-sm text-gray-900">{email.subject}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Sent At</label>
            <p className="text-sm text-gray-900">{new Date(email.sent_at).toLocaleString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p className="text-sm text-gray-900">{email.status}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Body</label>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{email.body}</p>
          </div>
        </div>
      </div>
    </div>
  );
}