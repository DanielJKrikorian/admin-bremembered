import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Eye, Search } from 'lucide-react';
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
  tags: string[];
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

interface BlogSubscriber {
  id: string;
  email: string;
  name: string | null;
  status: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  subscription_source: string | null;
  preferences: any | null;
  created_at: string;
  updated_at: string;
}

interface ViewTrend {
  date: string;
  views: number;
}

interface SubscriberTrend {
  date: string;
  count: number;
}

export default function BlogPostManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [subscribers, setSubscribers] = useState<BlogSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categoryViewCounts, setCategoryViewCounts] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'posts' | 'subscribers'>('posts');
  const [postStats, setPostStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    totalViews: 0,
    avgViewsPerPost: 0,
  });
  const [subscriberStats, setSubscriberStats] = useState({
    totalSubscribers: 0,
    yearlyGained: 0,
    monthlyGained: 0,
    dailyGained: 0,
  });
  const [viewTrends, setViewTrends] = useState<ViewTrend[]>([]);
  const [subscriberTrends, setSubscriberTrends] = useState<SubscriberTrend[]>([]);
  const [error, setError] = useState<string | null>(null);
  const postsPerPage = 10;
  const subscribersPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching posts, views, and subscribers from Supabase...');
        const [postsResponse, viewsResponse, categoriesResponse, subscribersResponse] = await Promise.all([
          supabase
            .from('blog_posts')
            .select('id, slug, title, excerpt, content, category, published_at, created_at, updated_at, featured_image, tags, author_id, read_time, view_count, like_count, status, featured')
            .order('created_at', { ascending: false }),
          supabase.from('blog_post_views').select('post_id, viewed_at'),
          supabase.from('blog_categories').select('*'),
          supabase.from('blog_subscriptions').select('id, email, name, status, subscribed_at, unsubscribed_at, subscription_source, preferences, created_at, updated_at'),
        ]);

        if (postsResponse.error) {
          console.error('Posts query error:', postsResponse.error);
          throw new Error(`Failed to fetch posts: ${postsResponse.error.message}`);
        }
        if (viewsResponse.error) {
          console.error('Views query error:', viewsResponse.error);
          throw new Error(`Failed to fetch post views: ${viewsResponse.error.message}`);
        }
        if (categoriesResponse.error) {
          console.error('Categories query error:', categoriesResponse.error);
          throw new Error(`Failed to fetch categories: ${categoriesResponse.error.message}`);
        }
        if (subscribersResponse.error) {
          console.error('Subscribers query error:', subscribersResponse.error);
          throw new Error(`Failed to fetch subscribers: ${subscribersResponse.error.message}`);
        }

        console.log('Posts response:', postsResponse.data);
        console.log('Views response:', viewsResponse.data);
        console.log('Categories response:', categoriesResponse.data);
        console.log('Subscribers response:', subscribersResponse.data);

        // Process posts
        const categoriesMap = new Map(categoriesResponse.data.map(cat => [cat.slug, cat]));
        const postsData = postsResponse.data;
        const viewCounts = viewsResponse.data.reduce((acc, view) => {
          acc[view.post_id] = (acc[view.post_id] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

        const postsWithViews = postsData.map(post => ({
          ...post,
          view_count: viewCounts[post.id] || post.view_count || 0,
          category_info: categoriesMap.get(post.category),
        }));

        const categoryCounts = postsData.reduce((acc, post) => {
          acc[post.category] = (acc[post.category] || 0) + (viewCounts[post.id] || post.view_count || 0);
          return acc;
        }, {} as { [key: string]: number });

        // Calculate post statistics
        const totalPosts = postsData.length;
        const publishedPosts = postsData.filter(post => post.status === 'published').length;
        const totalViews = Object.values(viewCounts).reduce((sum, count) => sum + count, 0);
        const avgViewsPerPost = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

        setPostStats({
          totalPosts,
          publishedPosts,
          totalViews,
          avgViewsPerPost,
        });

        // Calculate view trends
        const viewTrendsData = viewsResponse.data.reduce((acc, view) => {
          if (!view.view_at) return acc;
          const date = new Date(view.view_at).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

        const viewTrendData = Object.entries(viewTrendsData)
          .map(([date, views]) => ({ date, views }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-7);

        setViewTrends(viewTrendData);
        setPosts(postsWithViews);
        setCategoryViewCounts(categoryCounts);

        // Process subscribers
        const subscribersData = subscribersResponse.data || [];
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const totalSubscribers = subscribersData.length;
        const yearlyGained = subscribersData.filter(sub => new Date(sub.subscribed_at) >= startOfYear).length;
        const monthlyGained = subscribersData.filter(sub => new Date(sub.subscribed_at) >= startOfMonth).length;
        const dailyGained = subscribersData.filter(sub => new Date(sub.subscribed_at) >= startOfDay).length;

        setSubscriberStats({
          totalSubscribers,
          yearlyGained,
          monthlyGained,
          dailyGained,
        });

        const subscriberTrendsData = subscribersData.reduce((acc, sub) => {
          if (!sub.subscribed_at) return acc;
          const date = new Date(sub.subscribed_at).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

        const subscriberTrendData = Object.entries(subscriberTrendsData)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-7);

        setSubscribers(subscribersData);
        setSubscriberTrends(subscriberTrendData);
        setError(null);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.message);
        toast.error('Failed to load data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get('title') as string;
    const file = formData.get('featured_image') as File;

    let featuredImageUrl: string | null = null;
    if (file && file.size > 0) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('blog_images')
          .upload(fileName, file);
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

    const newPost = {
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      excerpt: formData.get('excerpt') as string,
      category: formData.get('category') as string,
      content: formData.get('content') as string,
      status: formData.get('published') === 'on' ? 'published' : 'draft',
      published_at: formData.get('published') === 'on' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      featured_image: featuredImageUrl,
      tags: null,
      author_id: null,
      read_time: parseInt(formData.get('read_time') as string) || 5,
      view_count: 0,
      like_count: 0,
      featured: formData.get('featured') === 'on',
    };

    try {
      const { data, error } = await supabase.from('blog_posts').insert([newPost]).select();
      if (error) throw error;

      if (data && data.length > 0) {
        const addedPost = { ...data[0], view_count: 0, like_count: 0, category_info: null };
        setPosts([addedPost, ...posts]);

        setCategoryViewCounts(prev => ({
          ...prev,
          [addedPost.category]: (prev[addedPost.category] || 0) + addedPost.view_count,
        }));

        setPostStats(prev => ({
          ...prev,
          totalPosts: prev.totalPosts + 1,
          publishedPosts: addedPost.status === 'published' ? prev.publishedPosts + 1 : prev.publishedPosts,
        }));

        toast.success('Blog post added successfully!');
        setIsAddModalOpen(false);
      }
    } catch (error: any) {
      console.error('Error adding blog post:', error);
      toast.error('Failed to add blog post: ' + error.message);
    }
  };

  const postChartConfig = {
    type: 'line',
    data: {
      labels: viewTrends.map(trend => trend.date),
      datasets: [
        {
          label: 'Views',
          data: viewTrends.map(trend => trend.views),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Date' },
        },
        y: {
          title: { display: true, text: 'Views' },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: { display: true, position: 'top' },
      },
    },
  };

  const subscriberChartConfig = {
    type: 'line',
    data: {
      labels: subscriberTrends.map(trend => trend.date),
      datasets: [
        {
          label: 'New Subscribers',
          data: subscriberTrends.map(trend => trend.count),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Date' },
        },
        y: {
          title: { display: true, text: 'New Subscribers' },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: { display: true, position: 'top' },
      },
    },
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredSubscribers = subscribers.filter(sub =>
    sub.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const postsTotalPages = Math.ceil(filteredPosts.length / postsPerPage);

  const indexOfLastSubscriber = currentPage * subscribersPerPage;
  const indexOfFirstSubscriber = indexOfLastSubscriber - subscribersPerPage;
  const currentSubscribers = filteredSubscribers.slice(indexOfFirstSubscriber, indexOfLastSubscriber);
  const subscribersTotalPages = Math.ceil(filteredSubscribers.length / subscribersPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Blog Management
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Blog Management
          </h1>
        </div>
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-500">{error}</p>
          <p className="text-gray-500 mt-2">Please check your Supabase database configuration and ensure the 'blog_posts', 'blog_post_views', and 'blog_subscriptions' tables exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Blog Management
        </h1>
        <p className="mt-2 text-gray-500">Manage blog posts and subscribers.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'posts' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'subscribers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('subscribers')}
          >
            Subscribers
          </button>
        </div>
      </div>

      {activeTab === 'posts' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Blog Post Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Total Posts</p>
                <p className="text-lg font-bold text-gray-900">{postStats.totalPosts}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Published Posts</p>
                <p className="text-lg font-bold text-gray-900">{postStats.publishedPosts}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Total Views</p>
                <p className="text-lg font-bold text-gray-900">{postStats.totalViews}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Avg Views per Post</p>
                <p className="text-lg font-bold text-gray-900">{postStats.avgViewsPerPost}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900">View Counts by Category</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {Object.entries(categoryViewCounts).map(([category, count]) => (
                <div key={category} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">{category}</p>
                  <p className="text-lg font-bold text-gray-900">{count} views</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900">View Trends (Last 7 Days)</h2>
            {viewTrends.length === 0 ? (
              <p className="text-gray-500 text-center mt-4">No view data available for the last 7 days.</p>
            ) : (
              ```chartjs
              ${JSON.stringify(postChartConfig)}
              ```
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center w-full sm:w-auto space-x-4">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Categories</option>
                  {Array.from(new Set(posts.map(post => post.category))).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Post
              </button>
            </div>
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
                <p className="text-gray-500">Try adjusting your search or category filter.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentPosts.map(post => (
                        <tr key={post.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/dashboard/blogposts/${post.id}`)}>
                          <td className="px-6 py-4 whitespace-nowrap">{post.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{post.category_info?.name || post.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{post.view_count}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{post.status}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/blogposts/${post.id}`); }}
                              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
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
                    Page {currentPage} of {postsTotalPages}
                  </span>
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === postsTotalPages}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'subscribers' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Subscriber Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Total Subscribers</p>
                <p className="text-lg font-bold text-gray-900">{subscriberStats.totalSubscribers}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Gained This Year</p>
                <p className="text-lg font-bold text-gray-900">{subscriberStats.yearlyGained}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Gained This Month</p>
                <p className="text-lg font-bold text-gray-900">{subscriberStats.monthlyGained}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Gained Today</p>
                <p className="text-lg font-bold text-gray-900">{subscriberStats.dailyGained}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Subscriber Growth (Last 7 Days)</h2>
            {subscriberTrends.length === 0 ? (
              <p className="text-gray-500 text-center mt-4">No subscriber data available for the last 7 days.</p>
            ) : (
              ```chartjs
              ${JSON.stringify(subscriberChartConfig)}
              ```
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search subscribers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            {filteredSubscribers.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No subscribers found</h3>
                <p className="text-gray-500">Try adjusting your search filter.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscribed At</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unsubscribed At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentSubscribers.map(sub => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">{sub.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{sub.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{sub.status}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{sub.subscription_source || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(sub.subscribed_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {sub.unsubscribed_at
                              ? new Date(sub.unsubscribed_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : '-'}
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
                    Page {currentPage} of {subscribersTotalPages}
                  </span>
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === subscribersTotalPages}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Blog Post</h3>
            <form onSubmit={handleAddPost} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">Excerpt</label>
                <textarea
                  id="excerpt"
                  name="excerpt"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                />
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
                <textarea
                  id="content"
                  name="content"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="read_time" className="block text-sm font-medium text-gray-700">Read Time (minutes)</label>
                <input
                  type="number"
                  id="read_time"
                  name="read_time"
                  defaultValue={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="featured_image" className="block text-sm font-medium text-gray-700">Featured Image</label>
                <input
                  type="file"
                  id="featured_image"
                  name="featured_image"
                  accept="image/*"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="published" className="block text-sm font-medium text-gray-700">Published</label>
                <input
                  type="checkbox"
                  id="published"
                  name="published"
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="featured" className="block text-sm font-medium text-gray-700">Featured</label>
                <input
                  type="checkbox"
                  id="featured"
                  name="featured"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}