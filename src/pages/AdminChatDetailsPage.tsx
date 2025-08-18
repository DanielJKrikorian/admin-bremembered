import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: string;
  message: string;
  created_at: string;
  lead_id: string | null;
  lead_name: string | null;
  ip_address: string | null;
}

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  source: string | null;
  status: string | null;
  vendor_id: string | null;
  created_at: string | null;
  phone: string | null;
  preferred_contact_method: string | null;
  wedding_date: string | null;
  city: string | null;
  state: string | null;
  services_requested: string[] | null;
  form_notes: string | null;
  response_status: string | null;
  lead_source: string | null;
  updated_at: string | null;
  partner_name: string | null;
  referral_source: string | null;
  photography_hours: number | null;
  videography_hours: number | null;
  dj_hours: number | null;
  coordination_hours: number | null;
  budget_range: string | null;
  service_type: string | null;
}

export default function AdminChatDetailsPage() {
  const { session_id } = useParams<{ session_id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatData = async () => {
      try {
        setLoading(true);

        // Fetch chat messages for the session
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('id, session_id, sender_type, message, created_at, lead_id, ip_address')
          .eq('session_id', session_id)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        // Fetch lead information only if lead_id exists
        let leadsData: Lead | null = null;
        let sessionIpAddress: string | null = null;
        const leadIds = [...new Set(messagesData.map(m => m.lead_id).filter(id => id !== null))] as string[];
        if (leadIds.length > 0) {
          const { data, error: leadsError } = await supabase
            .from('leads')
            .select('id, name, email, source, status, vendor_id, created_at, phone, preferred_contact_method, wedding_date, city, state, services_requested, form_notes, response_status, lead_source, updated_at, partner_name, referral_source, photography_hours, videography_hours, dj_hours, coordination_hours, budget_range, service_type')
            .in('id', leadIds);

          if (leadsError) throw leadsError;

          // Use the first lead if multiple are returned
          leadsData = data && data.length > 0 ? data[0] : null;
        } else {
          // Use the first message's ip_address if no lead_id
          sessionIpAddress = messagesData[0]?.ip_address || 'Unknown';
        }

        const enrichedMessages = messagesData.map(msg => ({
          ...msg,
          lead_name: leadsData && msg.lead_id === leadsData.id ? leadsData.name : null,
          ip_address: msg.lead_id ? null : msg.ip_address || 'Unknown',
        }));

        setMessages(enrichedMessages);
        setLead(leadsData);
        setIpAddress(sessionIpAddress);
      } catch (error: any) {
        console.error('Error loading chat details:', error.message, error.details, error.hint);
        toast.error('Failed to load chat data.');
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();
  }, [session_id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || !session_id) return;

    const message = {
      session_id,
      sender_type: 'admin',
      message: newMessage,
      lead_id: lead?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ip_address: lead ? '' : ipAddress || '',
      metadata: {},
    };

    try {
      const { data, error } = await supabase.from('chat_messages').insert([message]).select().single();
      if (error) throw error;

      // Add the new message to the state
      setMessages(prev => [
        ...prev,
        {
          ...message,
          id: data.id, // Use the ID returned from Supabase
          lead_name: lead?.name || null,
          ip_address: lead ? null : ipAddress || 'Unknown',
        },
      ]);
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error: any) {
      console.error('Error sending message:', error.message, error.details, error.hint);
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session_id) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chat session not found</h3>
        <p className="text-gray-500">The requested chat session could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Chat Session Details
        </h1>
        <p className="mt-2 text-gray-500">View and manage this AI chat session.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Session Information</h2>
          {lead ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Lead ID</p>
                <p className="text-sm text-gray-700">{lead.id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Name</p>
                <p className="text-sm text-gray-700">{lead.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-700">{lead.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Phone</p>
                <p className="text-sm text-gray-700">{lead.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Wedding Date</p>
                <p className="text-sm text-gray-700">{lead.wedding_date ? new Date(lead.wedding_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Source</p>
                <p className="text-sm text-gray-700">{lead.source || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Services Requested</p>
                <p className="text-sm text-gray-700">{lead.services_requested?.join(', ') || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Status</p>
                <p className="text-sm text-gray-700">{lead.status || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-gray-900">Form Notes</p>
                <p className="text-sm text-gray-700">{lead.form_notes || 'N/A'}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-900">IP Address</p>
              <p className="text-sm text-gray-700">{ipAddress || 'Unknown'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map(msg => (
              <div key={msg.id} className={`p-3 rounded-lg ${msg.sender_type === 'admin' ? 'bg-blue-50' : msg.sender_type === 'bot' ? 'bg-green-50' : 'bg-gray-50'}`}>
                <p className="text-sm font-medium text-gray-900">
                  {msg.sender_type === 'admin' ? 'Admin' : msg.sender_type === 'bot' ? 'Bot' : msg.lead_name || `Guest (${msg.ip_address})`}
                </p>
                <p className="text-sm text-gray-700">{msg.message}</p>
                <p className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="mt-4 flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </button>
          </form>
        </div>

        {lead && (
          <div className="lg:w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Additional Lead Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Vendor ID</p>
                  <p className="text-sm text-gray-700">{lead.vendor_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created At</p>
                  <p className="text-sm text-gray-700">{lead.created_at ? new Date(lead.created_at).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Updated At</p>
                  <p className="text-sm text-gray-700">{lead.updated_at ? new Date(lead.updated_at).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Preferred Contact Method</p>
                  <p className="text-sm text-gray-700">{lead.preferred_contact_method || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">City</p>
                  <p className="text-sm text-gray-700">{lead.city || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">State</p>
                  <p className="text-sm text-gray-700">{lead.state || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Response Status</p>
                  <p className="text-sm text-gray-700">{lead.response_status || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Lead Source</p>
                  <p className="text-sm text-gray-700">{lead.lead_source || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Partner Name</p>
                  <p className="text-sm text-gray-700">{lead.partner_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Referral Source</p>
                  <p className="text-sm text-gray-700">{lead.referral_source || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Photography Hours</p>
                  <p className="text-sm text-gray-700">{lead.photography_hours ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Videography Hours</p>
                  <p className="text-sm text-gray-700">{lead.videography_hours ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">DJ Hours</p>
                  <p className="text-sm text-gray-700">{lead.dj_hours ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Coordination Hours</p>
                  <p className="text-sm text-gray-700">{lead.coordination_hours ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Budget Range</p>
                  <p className="text-sm text-gray-700">{lead.budget_range || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Service Type</p>
                  <p className="text-sm text-gray-700">{lead.service_type || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/dashboard/chats')}
        className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>
    </div>
  );
}