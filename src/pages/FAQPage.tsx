import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Eye, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
  published: boolean;
  created_at: string;
  view_count: number;
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categoryViewCounts, setCategoryViewCounts] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const faqsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [faqsResponse, logsResponse] = await Promise.all([
          supabase.from('faqs').select('*').order('display_order', { ascending: true }),
          supabase.from('faq_logs').select('faq_id'),
        ]);

        if (faqsResponse.error) throw faqsResponse.error;
        if (logsResponse.error) throw logsResponse.error;

        const faqsData = faqsResponse.data;
        const viewCounts = logsResponse.data.reduce((acc, log) => {
          acc[log.faq_id] = (acc[log.faq_id] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

        const faqsWithViews = faqsData.map(faq => ({
          ...faq,
          view_count: viewCounts[faq.id] || 0,
        }));

        const categoryCounts = faqsData.reduce((acc, faq) => {
          acc[faq.category] = (acc[faq.category] || 0) + (viewCounts[faq.id] || 0);
          return acc;
        }, {} as { [key: string]: number });

        setFaqs(faqsWithViews);
        setCategoryViewCounts(categoryCounts);
      } catch (error: any) {
        console.error('Error fetching FAQs:', error);
        toast.error('Failed to load FAQs');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newFAQ = {
      question: formData.get('question') as string,
      answer: formData.get('answer') as string,
      category: formData.get('category') as string,
      display_order: parseInt(formData.get('display_order') as string, 10) || 0,
      published: formData.get('published') === 'on',
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('faqs').insert([newFAQ]).select();
      if (error) throw error;

      if (data && data.length > 0) {
        const addedFAQ = data[0];
        addedFAQ.view_count = 0; // New FAQ starts with 0 views
        setFaqs([...faqs, addedFAQ]);

        // Update category view counts
        setCategoryViewCounts(prev => ({
          ...prev,
          [addedFAQ.category]: (prev[addedFAQ.category] || 0) + addedFAQ.view_count,
        }));

        toast.success('FAQ added successfully!');
        setIsAddModalOpen(false);
      }
    } catch (error: any) {
      console.error('Error adding FAQ:', error);
      toast.error('Failed to add FAQ');
    }
  };

  // Filter FAQs
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination
  const indexOfLastFaq = currentPage * faqsPerPage;
  const indexOfFirstFaq = indexOfLastFaq - faqsPerPage;
  const currentFaqs = filteredFaqs.slice(indexOfFirstFaq, indexOfLastFaq);
  const totalPages = Math.ceil(filteredFaqs.length / faqsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            FAQ Management
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
          FAQ Management
        </h1>
        <p className="mt-2 text-gray-500">Manage and track FAQs.</p>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center w-full sm:w-auto space-x-4">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search FAQs..."
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
              {Array.from(new Set(faqs.map(faq => faq.category))).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add FAQ
          </button>
        </div>
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
            <p className="text-gray-500">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentFaqs.map(faq => (
                    <tr key={faq.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/dashboard/faq/${faq.id}`)}>
                      <td className="px-6 py-4 whitespace-nowrap">{faq.question}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{faq.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{faq.view_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{faq.published ? 'Yes' : 'No'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/faq/${faq.id}`); }}
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
          </>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New FAQ</h3>
            <form onSubmit={handleAddFAQ} className="space-y-4">
              <div>
                <label htmlFor="question" className="block text-sm font-medium text-gray-700">Question</label>
                <input
                  type="text"
                  id="question"
                  name="question"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="answer" className="block text-sm font-medium text-gray-700">Answer</label>
                <textarea
                  id="answer"
                  name="answer"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
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
                <label htmlFor="display_order" className="block text-sm font-medium text-gray-700">Display Order</label>
                <input
                  type="number"
                  id="display_order"
                  name="display_order"
                  defaultValue={0}
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