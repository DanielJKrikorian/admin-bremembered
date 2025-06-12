import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Plus, ThumbsUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import AddReplyModal from '../components/AddReplyModal';

interface ForumPost {
  id: string;
  vendor_id: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
  category: string;
  is_hidden: boolean;
}

interface ForumReply {
  id: string;
  post_id: string;
  vendor_id: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
}

interface ForumVote {
  id: string;
  vendor_id: string | null;
  post_id: string;
  reply_id: string | null;
  vote_type: string;
  created_at: string;
}

export default function ForumPostDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [votes, setVotes] = useState<ForumVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null); // Store user data

  useEffect(() => {
    fetchPostDetails();
  }, [id]);

  const fetchPostDetails = async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Post ID is undefined');

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const [postData, repliesData, votesData] = await Promise.all([
        supabase.from('vendor_forum_posts').select('*').eq('id', id).single(),
        supabase.from('vendor_forum_replies').select('*').eq('post_id', id),
        supabase.from('vendor_forum_votes').select('*').eq('post_id', id)
      ]);
      if (postData.error) throw postData.error;
      if (repliesData.error) throw repliesData.error;
      if (votesData.error) throw votesData.error;
      setPost(postData.data);
      setReplies(repliesData.data || []);
      setVotes(votesData.data || []);
    } catch (error: any) {
      console.error('Error fetching post details:', error);
      toast.error('Failed to load post details');
      navigate('/dashboard/forum');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = () => {
    if (user?.id === '7ee81f6a-f817-4ef7-8947-75bb21901615') {
      setIsReplyModalOpen(true);
    } else {
      toast.error('Only admins can add replies');
    }
  };

  if (loading || !post) {
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
          Forum Post: {post.category}
        </h1>
        <button
          onClick={() => navigate('/dashboard/forum')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Forum
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Post Details
        </h2>
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{post.content}</p>
        <p className="text-xs text-gray-500 mt-2">Posted on: {new Date(post.created_at).toLocaleString()}</p>
        <p className="text-xs text-gray-500">Likes: {votes.filter(v => !v.reply_id && v.vote_type === 'like').length}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Replies ({replies.length})
        </h2>
        {replies.length === 0 ? (
          <p className="text-sm text-gray-500">No replies yet.</p>
        ) : (
          <div className="space-y-4">
            {replies.map((reply) => (
              <div key={reply.id} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{reply.content}</p>
                <p className="text-xs text-gray-500 mt-1">Replied on: {new Date(reply.created_at).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Likes: {votes.filter(v => v.reply_id === reply.id && v.vote_type === 'like').length}</p>
              </div>
            ))}
          </div>
        )}
        {user?.id === '7ee81f6a-f817-4ef7-8947-75bb21901615' && (
          <button
            onClick={handleAddReply}
            className="mt-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Reply
          </button>
        )}
      </div>

      <AddReplyModal
        isOpen={isReplyModalOpen}
        onClose={() => setIsReplyModalOpen(false)}
        onReplyAdded={fetchPostDetails} // Now defined
        postId={id}
        user={user}
      />
    </div>
  );
}