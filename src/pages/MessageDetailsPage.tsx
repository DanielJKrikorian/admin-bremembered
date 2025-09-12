import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Send, ArrowLeft, UserPlus, Edit, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  timestamp: string;
  conversation_id: string;
  read_by: string[];
  sender_name: string;
}

interface Conversation {
  id: string;
  name: string | null;
}

interface Participant {
  id: string;
  name: string;
  role: 'couple' | 'vendor';
}

export default function MessageDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [messagesRes, participantsRes, conversationRes] = await Promise.all([
          supabase.from('messages').select('*').eq('conversation_id', id).order('timestamp', { ascending: true }),
          supabase.from('conversation_participants').select('user_id').eq('conversation_id', id),
          supabase.from('conversations').select('id, name').eq('id', id).single(),
        ]);

        if (messagesRes.error) throw messagesRes.error;
        if (participantsRes.error) throw participantsRes.error;
        if (conversationRes.error) throw conversationRes.error;

        const senderIds = messagesRes.data.map((m: Message) => m.sender_id);
        const participantIds = participantsRes.data.map((p: any) => p.user_id);
        const uniqueIds = [...new Set([...senderIds, ...participantIds])];

        const [couplesRes, vendorsRes] = await Promise.all([
          supabase.from('couples').select('user_id, name').in('user_id', uniqueIds),
          supabase.from('vendors').select('user_id, name').in('user_id', uniqueIds),
        ]);

        if (couplesRes.error) throw couplesRes.error;
        if (vendorsRes.error) throw vendorsRes.error;

        const roleMap = new Map<string, Participant>();
        (couplesRes.data || []).forEach((c: any) =>
          roleMap.set(c.user_id, { id: c.user_id, name: `${c.name} (couple)`, role: 'couple' })
        );
        (vendorsRes.data || []).forEach((v: any) =>
          roleMap.set(v.user_id, { id: v.user_id, name: `${v.name} (vendor)`, role: 'vendor' })
        );

        const enrichedMessages: Message[] = messagesRes.data.map((msg: any) => ({
          ...msg,
          sender_name: roleMap.get(msg.sender_id)?.name || 'Unknown',
        }));

        const uniqueParticipants: Participant[] = participantIds.map((uid: string) => {
          const found = roleMap.get(uid);
          return found || { id: uid, name: 'Unknown', role: 'vendor' };
        });

        setMessages(enrichedMessages);
        setParticipants(uniqueParticipants);
        setConversation(conversationRes.data);
        setNewName(conversationRes.data.name || '');
      } catch (error: any) {
        console.error('Error loading message details:', error);
        toast.error('Failed to load conversation data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    const message = {
      sender_id: user.id,
      message_text: newMessage,
      timestamp: new Date().toISOString(),
      conversation_id: id,
      read_by: [user.id],
      topic: 'Support',
      extension: '',
      payload: {},
      event: 'message',
      private: false,
      inserted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('messages').insert([message]);
      if (error) throw error;

      setNewMessage('');
      toast.success('Message sent!');
      window.location.reload();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleJoinAsSupport = async () => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', id)
        .eq('user_id', user.id);

      if (existing && existing.length > 0) {
        toast.info('You are already a participant.');
        return;
      }

      await supabase.from('conversation_participants').insert({
        conversation_id: id,
        user_id: user.id,
        joined_at: new Date().toISOString(),
      });

      toast.success('Joined conversation!');
      window.location.reload();
    } catch (error: any) {
      console.error('Join error:', error);
      toast.error('Failed to join');
    }
  };

  const handleSaveName = async () => {
    if (!conversation) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', conversation.id);

      if (error) throw error;

      setConversation({ ...conversation, name: newName });
      setEditName(false);
      toast.success('Name updated!');
    } catch (error: any) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Conversation not found</h3>
        <p className="text-gray-500">The requested conversation could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Conversation Details
        </h1>
        <p className="mt-2 text-gray-500">View and manage this conversation.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversation Name</h2>
          {editName ? (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveName}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
              <button
                onClick={() => { setEditName(false); setNewName(conversation.name || ''); }}
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-900">{conversation.name || 'Unnamed Conversation'}</p>
              <button
                onClick={() => setEditName(true)}
                className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900">Participants</h2>
          <ul className="list-disc pl-5">
            {participants.map(part => (
              <li key={part.id} className="text-sm text-gray-700">{part.name}</li>
            ))}
          </ul>

          <button
            onClick={handleJoinAsSupport}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Join as Support
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg ${
                msg.sender_id === user?.id
                  ? 'bg-blue-100 ml-8'
                  : 'bg-gray-100 mr-8'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">{msg.sender_name}</p>
                <p className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</p>
              </div>
              <p className="text-sm text-gray-800">{msg.message_text}</p>
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

      <button
        onClick={() => navigate('/dashboard/messages')}
        className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>
    </div>
  );
}