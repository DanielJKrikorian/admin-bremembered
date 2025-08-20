import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Save, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  post_count: number;
  created_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image?: string;
  author_id?: string;
  category: string;
  tags: string[] | null;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  read_time: number;
  view_count: number;
  like_count: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
  author?: { id: string; name: string; email: string };
  category_info?: BlogCategory;
}

export default function BlogPostDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    featured: false,
    read_time: 5,
    featured_image: null as File | null,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log(`Fetching post with id ${id} and views from Supabase...`);
        const [postResponse, viewsResponse, categoriesResponse] = await Promise.all([
          supabase.from('blog_posts').select('id, slug, title, excerpt, content, category, published_at, created_at, updated_at, featured_image, tags, author_id, read_time, view_count, like_count, status, featured').eq('id', id).single(),
          supabase.from('blog_post_views').select('post_id').eq('post_id', id),
          supabase.from('blog_categories').select('*'),
        ]);

        if (postResponse.error) {
          console.error('Post query error:', postResponse.error);
          throw new Error(`Failed to fetch post: ${postResponse.error.message}`);
        }
        if (viewsResponse.error) {
          console.error('Views query error:', viewsResponse.error);
          throw new Error(`Failed to fetch post views: ${viewsResponse.error.message}`);
        }
        if (categoriesResponse.error) {
          console.error('Categories query error:', categoriesResponse.error);
          throw new Error(`Failed to fetch categories: ${categoriesResponse.error.message}`);
        }

        console.log('Post response:', postResponse.data);
        console.log('Views response:', viewsResponse.data);
        console.log('Categories response:', categoriesResponse.data);

        const categoriesMap = new Map(categoriesResponse.data.map(cat => [cat.slug, cat]));
        const viewCount = viewsResponse.data.length;
        const postData = {
          ...postResponse.data,
          view_count: viewCount || postResponse.data.view_count || 0,
          category_info: categoriesMap.get(postResponse.data.category),
        };
        setPost(postData);
        setFormData({
          title: postData.title,
          slug: postData.slug,
          excerpt: postData.excerpt,
          content: postData.content,
          category: postData.category,
          status: postData.status,
          featured: postData.featured,
          read_time: postData.read_time,
          featured_image: null,
        });
        setError(null);
      } catch (error: any) {
        console.error('Error fetching blog post:', error);
        setError(error.message);
        toast.error('Failed to load blog post: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!post) return;

    let featuredImageUrl: string | null = post.featured_image;
    if (formData.featured_image) {
      try {
        const fileExt = formData.featured_image.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('blog_images')
          .upload(fileName, formData.featured_image);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('blog_images')
          .getPublicUrl(fileName);
        featuredImageUrl = publicUrlData.publicUrl;
      } catch (error: any) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload image: ' + error.message);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          title: formData.title,
          slug: formData.slug,
          excerpt: formData.excerpt,
          content: formData.content,
          category: formData.category,
          status: formData.status,
          featured: formData.featured,
          read_time: formData.read_time,
          published_at: formData.status === 'published' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
          featured_image: featuredImageUrl,
        })
        .eq('id', post.id);
      if (error) throw error;

      toast.success('Blog post updated successfully!');
      setEditMode(false);
      navigate('/dashboard/blogposts');
    } catch (error: any) {
      console.error('Error updating blog post:', error);
      toast.error('Failed to update blog post: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!post || !window.confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const { error: postError } = await supabase.from('blog_posts').delete().eq('id', post.id);
      const { error: viewsError } = await supabase.from('blog_post_views').delete().eq('post_id', post.id);
      const { error: likesError } = await supabase.from('blog_post_likes').delete().eq('post_id', post.id);
      if (postError || viewsError || likesError) throw postError || viewsError || likesError;

      toast.success('Blog post deleted successfully!');
      navigate('/dashboard/blogposts');
    } catch (error: any) {
      console.error('Error deleting blog post:', error);
      toast.error('Failed to delete blog post: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Blog Post Details
          </h1>
        </div>
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Blog Post</h3>
          <p className="text-gray-500">{error || 'The requested blog post could not be loaded.'}</p>
          <p className="text-gray-500 mt-2">Please check your Supabase database configuration and ensure the 'blog_posts' table exists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Blog Post Details
        </h1>
        <p className="mt-2 text-gray-500">Edit or delete this blog post.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            {editMode ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{post.title}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug</label>
            {editMode ? (
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{post.slug}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Excerpt</label>
            {editMode ? (
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{post.excerpt}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Content</label>
            {editMode ? (
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{post.content}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            {editMode ? (
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{post.category_info?.name || post.category}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            {editMode ? (
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            ) : (
              <p className="mt-1 text-sm text-gray-900">{post.status}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Featured</label>
            {editMode ? (
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{post.featured ? 'Yes' : 'No'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Read Time (minutes)</label>
            {editMode ? (
              <input
                type="number"
                value={formData.read_time}
                onChange={(e) => setFormData({ ...formData, read_time: parseInt(e.target.value) || 5 })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{post.read_time}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Featured Image</label>
            {editMode ? (
              <input
                type="file"
                id="featured_image"
                name="featured_image"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, featured_image: e.target.files ? e.target.files[0] : null })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{post.featured_image ? <img src={post.featured_image} alt="Featured" className="h-20 w-auto" /> : '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Views</label>
            <p className="mt-1 text-sm text-gray-900">{post.view_count}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Likes</label>
            <p className="mt-1 text-sm text-gray-900">{post.like_count}</p>
          </div>
          <div className="flex justify-between space-x-2">
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
            <div className="flex space-x-2">
              {editMode ? (
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard/blogposts')}
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}