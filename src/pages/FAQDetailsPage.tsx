import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Save, Edit, Trash2, ArrowLeft } from 'lucide-react';
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

export default function FAQDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [faq, setFaq] = useState<FAQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    display_order: 0,
    published: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [faqResponse, logsResponse] = await Promise.all([
          supabase.from('faqs').select('*').eq('id', id).single(), // Updated to faqs
          supabase.from('faq_logs').select('faq_id').eq('faq_id', id),
        ]);

        if (faqResponse.error) throw faqResponse.error;
        if (logsResponse.error) throw logsResponse.error;

        const viewCount = logsResponse.data.length;
        const faqData = { ...faqResponse.data, view_count: viewCount };
        setFaq(faqData);
        setFormData({
          question: faqData.question,
          answer: faqData.answer,
          category: faqData.category,
          display_order: faqData.display_order,
          published: faqData.published,
        });
      } catch (error: any) {
        console.error('Error fetching FAQ:', error);
        toast.error('Failed to load FAQ');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!faq) return;

    try {
      const { error } = await supabase
        .from('faqs') // Updated to faqs
        .update({
          question: formData.question,
          answer: formData.answer,
          category: formData.category,
          display_order: formData.display_order,
          published: formData.published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', faq.id);
      if (error) throw error;

      toast.success('FAQ updated successfully!');
      setEditMode(false);
      navigate('/dashboard/faq');
    } catch (error: any) {
      console.error('Error updating FAQ:', error);
      toast.error('Failed to update FAQ');
    }
  };

  const handleDelete = async () => {
    if (!faq || window.confirm('Are you sure you want to delete this FAQ?')) {
      try {
        const { error: faqError } = await supabase.from('faqs').delete().eq('id', faq.id); // Updated to faqs
        const { error: logError } = await supabase.from('faq_logs').delete().eq('faq_id', faq.id);
        if (faqError || logError) throw faqError || logError;

        toast.success('FAQ deleted successfully!');
        navigate('/dashboard/faq');
      } catch (error: any) {
        console.error('Error deleting FAQ:', error);
        toast.error('Failed to delete FAQ');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!faq) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">FAQ not found</h3>
        <p className="text-gray-500">The requested FAQ could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          FAQ Details
        </h1>
        <p className="mt-2 text-gray-500">Edit or delete this FAQ.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Question</label>
            {editMode ? (
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{faq.question}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Answer</label>
            {editMode ? (
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{faq.answer}</p>
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
              <p className="mt-1 text-sm text-gray-900">{faq.category}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Display Order</label>
            {editMode ? (
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{faq.display_order}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Published</label>
            {editMode ? (
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{faq.published ? 'Yes' : 'No'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Views</label>
            <p className="mt-1 text-sm text-gray-900">{faq.view_count}</p>
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
                onClick={() => navigate('/dashboard/faq')}
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