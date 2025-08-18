import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface ChatSession {
  session_id: string;
  lead_id: string | null;
  lead_name: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
  last_message: string;
  message_count: number;
}

export default function AdminChatPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const chatsPerPage = 10;
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChatSessions = async () => {
      try {
        setLoading(true);

        // Fetch chat messages and group by session_id
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('session_id, lead_id, message, created_at, updated_at, ip_address')
          .order('updated_at', { ascending: false });

        if (messagesError) throw messagesError;

        // Get unique session IDs and lead IDs, filtering out null lead_ids
        const sessionIds = [...new Set(messages.map(m => m.session_id))];
        const leadIds = [...new Set(messages.map(m => m.lead_id).filter(id => id !== null))] as string[];

        // Fetch lead names only if there are valid lead IDs
        let leadNameMap = new Map<string, string>();
        if (leadIds.length > 0) {
          const { data: leads, error: leadsError } = await supabase
            .from('leads')
            .select('id, name')
            .in('id', leadIds);

          if (leadsError) throw leadsError;

          leads.forEach(lead => leadNameMap.set(lead.id, lead.name));
        }

        // Aggregate chat sessions
        const sessionsMap: Record<string, ChatSession> = {};
        messages.forEach(msg => {
          if (!sessionsMap[msg.session_id]) {
            sessionsMap[msg.session_id] = {
              session_id: msg.session_id,
              lead_id: msg.lead_id,
              lead_name: msg.lead_id ? leadNameMap.get(msg.lead_id) || 'Unknown' : null,
              ip_address: msg.lead_id ? null : msg.ip_address || 'Unknown',
              created_at: msg.created_at,
              updated_at: msg.updated_at,
              last_message: msg.message,
              message_count: 1,
            };
          } else {
            sessionsMap[msg.session_id].message_count += 1;
            if (new Date(msg.updated_at) > new Date(sessionsMap[msg.session_id].updated_at)) {
              sessionsMap[msg.session_id].updated_at = msg.updated_at;
              sessionsMap[msg.session_id].last_message = msg.message;
            }
          }
        });

        const chatSessions = Object.values(sessionsMap);
        setChatSessions(chatSessions);
      } catch (error: any) {
        console.error('Error fetching chat sessions:', error.message, error.details, error.hint);
        toast.error('Failed to load chat sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchChatSessions();
  }, [user]);

  const filteredSessions = chatSessions.filter(session => {
    const leadName = session.lead_name || '';
    const ipAddress = session.ip_address || '';
    return (
      leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.session_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.last_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ipAddress.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const indexOfLastChat = currentPage * chatsPerPage;
  const indexOfFirstChat = indexOfLastChat - chatsPerPage;
  const currentSessions = filteredSessions.slice(indexOfFirstChat, indexOfLastChat);
  const totalPages = Math.ceil(filteredSessions.length / chatsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            AI Chat Sessions
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          AI Chat Sessions
        </h1>
        <p className="mt-2 text-gray-500">Monitor and manage AI chatbot conversations.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by lead, IP, or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {chatSessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chat sessions found</h3>
          <p className="text-gray-500">No active AI chatbot conversations.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead/IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentSessions.map(session => (
                  <tr key={session.session_id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">{session.session_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{session.lead_name || session.ip_address || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap truncate max-w-xs">{session.last_message}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{session.message_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(session.updated_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/dashboard/chats/${session.session_id}`)}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Conversation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 flex justify-between items-center">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}