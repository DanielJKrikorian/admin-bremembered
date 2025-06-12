import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Search, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  participant_ids: string[];
  created_at: string;
  updated_at: string;
  participants: { id: string; name: string }[];
  unread_count: number;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const conversationsPerPage = 10;
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [convoRes, partRes, msgRes] = await Promise.all([
          supabase.from('conversations').select('*'),
          supabase.from('conversation_participants').select('conversation_id, user_id'),
          supabase.from('messages').select('conversation_id').order('timestamp', { ascending: false }),
        ]);

        if (convoRes.error) throw convoRes.error;
        if (partRes.error) throw partRes.error;
        if (msgRes.error) throw msgRes.error;

        const conversationsRaw = convoRes.data;
        const participantsRaw = partRes.data;
        const messagesRaw = msgRes.data;

        // Group user_ids by conversation_id
        const convoParticipantMap: Record<string, string[]> = {};
        const allUserIds = new Set<string>();
        for (const { conversation_id, user_id } of participantsRaw) {
          if (!convoParticipantMap[conversation_id]) convoParticipantMap[conversation_id] = [];
          convoParticipantMap[conversation_id].push(user_id);
          allUserIds.add(user_id);
        }

        // Lookup names for all user_ids
        const userIdArray = Array.from(allUserIds);
        const [couplesRes, vendorsRes] = await Promise.all([
          supabase.from('couples').select('user_id, name').in('user_id', userIdArray),
          supabase.from('vendors').select('user_id, name').in('user_id', userIdArray),
        ]);

        if (couplesRes.error) throw couplesRes.error;
        if (vendorsRes.error) throw vendorsRes.error;

        const nameMap = new Map<string, string>();
        (couplesRes.data || []).forEach(c => nameMap.set(c.user_id, c.name));
        (vendorsRes.data || []).forEach(v => nameMap.set(v.user_id, v.name));

        // Fetch unread counts
        const convsWithParticipants: Conversation[] = await Promise.all(
          conversationsRaw.map(async (conv) => {
            const partIds = convoParticipantMap[conv.id] || [];

            const participantObjs = partIds.map(pid => ({
              id: pid,
              name: nameMap.get(pid) || 'Unknown',
            }));

            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact' })
              .eq('conversation_id', conv.id)
              .not('read_by', 'cs', `{${user?.id}}`);

            return {
              ...conv,
              participant_ids: partIds,
              participants: participantObjs,
              unread_count: count || 0,
            };
          })
        );

        setConversations(convsWithParticipants);
      } catch (error: any) {
        console.error('Error fetching conversations:', error);
        toast.error('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filteredConversations = conversations.filter(conv => {
    const convName = conv.name || '';
    const matchesSearch =
      convName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.participants.some(p =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesSearch;
  });

  const indexOfLastConv = currentPage * conversationsPerPage;
  const indexOfFirstConv = indexOfLastConv - conversationsPerPage;
  const currentConversations = filteredConversations.slice(indexOfFirstConv, indexOfLastConv);
  const totalPages = Math.ceil(filteredConversations.length / conversationsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleStartConversation = async (participantId: string, participantType: 'couple' | 'vendor') => {
    if (!user) return;

    const newConv = {
      is_group: false,
      name: `${user.id} with ${participantType === 'couple' ? 'Couple' : 'Vendor'} ${participantId}`,
      participant_ids: [user.id, participantId],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('conversations').insert([newConv]).select();
      if (error) throw error;

      if (data && data.length > 0) {
        const convId = data[0].id;
        await supabase.from('conversation_participants').insert([
          { conversation_id: convId, user_id: user.id, joined_at: new Date().toISOString() },
          { conversation_id: convId, user_id: participantId, joined_at: new Date().toISOString() },
        ]);
        toast.success('Conversation started!');
        navigate(`/dashboard/messages/${convId}`);
      }
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleJoinAsSupport = async (convId: string) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convId)
        .eq('user_id', user.id);
      if (existing && existing.length > 0) {
        toast.info('You are already a participant in this conversation.');
        return;
      }

      await supabase.from('conversation_participants').insert({
        conversation_id: convId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
      });
      toast.success('Joined conversation as support!');
      navigate(`/dashboard/messages/${convId}`);
    } catch (error: any) {
      console.error('Error joining conversation:', error);
      toast.error('Failed to join conversation');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Messages
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
          Messages
        </h1>
        <p className="mt-2 text-gray-500">Manage your conversations.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate('/dashboard/messages/new')}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start Conversation
            </button>
          </div>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
          <p className="text-gray-500">Start a new conversation to get started.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unread</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentConversations.map(conv => (
                    <tr key={conv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/dashboard/messages/${conv.id}`)}>
                      <td className="px-6 py-4 whitespace-nowrap">{conv.name || 'Unnamed Conversation'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{conv.participants.map(p => p.name).join(', ')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{conv.unread_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(conv.updated_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleJoinAsSupport(conv.id); }}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Join as Support
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
        </>
      )}
    </div>
  );
}
