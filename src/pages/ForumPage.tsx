import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import AddPostModal from '../components/AddPostModal';

interface ForumPost {
  id: string;
  vendor_id: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
  category: string;
  is_hidden: boolean;
  vendor_name: string | null;
}

export default function ForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null); // Store user data
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndPosts = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const { data, error } = await supabase
          .from('vendor_forum_posts')
          .select('*')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false });
        if (error) throw error;

        const vendorIds = data.filter(post => post.vendor_id).map(post => post.vendor_id);
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

        const mappedPosts = data.map(post => ({
          ...post,
          vendor_name: post.vendor_id ? vendorNames[post.vendor_id] || 'N/A' : 'N/A',
        }));
        setPosts(mappedPosts || []);
        console.log('Forum posts fetched with vendor names:', mappedPosts);
      } catch (error: any) {
        console.error('Error fetching user or posts:', error);
        toast.error('Failed to load forum data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_forum_posts')
        .select('*')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const vendorIds = data.filter(post => post.vendor_id).map(post => post.vendor_id);
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

      const mappedPosts = data.map(post => ({
        ...post,
        vendor_name: post.vendor_id ? vendorNames[post.vendor_id] || 'N/A' : 'N/A',
      }));
      setPosts(mappedPosts || []);
      console.log('Posts refreshed with vendor names:', mappedPosts);
    } catch (error: any) {
      console.error('Error refreshing posts:', error);
      toast.error('Failed to refresh posts');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (user?.id !== '7ee81f6a-f817-4ef7-8947-75bb21901615') {
      toast.error('Only the admin can delete posts');
      return;
    }

    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const { error } = await supabase
          .from('vendor_forum_posts')
          .delete()
          .eq('id', postId);
        if (error) throw error;

        setPosts(posts.filter(post => post.id !== postId));
        toast.success('Post deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting post:', error);
        toast.error('Failed to delete post');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Forum
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
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Forum
          </h1>
          <p className="mt-2 text-gray-500">Manage and view forum posts.</p>
        </div>
        {user?.id === '7ee81f6a-f817-4ef7-8947-75bb21901615' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Post
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Posts ({posts.length})</h2>
        </div>
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
            <p className="text-gray-500">Add a post to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/dashboard/forum/${post.id}`)}>
                    <td className="px-6 py-4 whitespace-nowrap">{post.vendor_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{post.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(post.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/forum/${post.id}`); }} className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                        {user?.id === '7ee81f6a-f817-4ef7-8947-75bb21901615' && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }} className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddPostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostAdded={fetchPosts}
        user={user}
      />
    </div>
  );
}