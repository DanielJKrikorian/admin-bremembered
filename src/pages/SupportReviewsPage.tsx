import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface SupportReview {
  id: string;
  customer_name: string;
  event_type: string;
  event_date: string;
  booking_experience_rating: number;
  support_experience_rating: number;
  would_recommend: boolean;
  feedback: string;
  created_at: string;
  updated_at: string | null;
  email: string;
}

export default function SupportReviewsPage() {
  const [reviews, setReviews] = useState<SupportReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupportReviews = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('support_feedback')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Supabase error fetching support_feedback:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          console.log('No reviews found in support_feedback table');
        } else {
          console.log('Support reviews fetched from support_feedback:', data);
        }

        // Initialize showFeedback state for each review
        const mappedReviews = data.map(review => ({
          ...review,
          showFeedback: false,
        }));
        setReviews(mappedReviews || []);
      } catch (error: any) {
        console.error('Error fetching support reviews:', error.message);
        toast.error('Failed to load support reviews: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSupportReviews();
  }, []);

  // Calculate averages
  const calculateAverages = (reviews: SupportReview[]) => {
    const totalBooking = reviews.reduce((sum, review) => sum + review.booking_experience_rating, 0);
    const totalSupport = reviews.reduce((sum, review) => sum + review.support_experience_rating, 0);
    const count = reviews.length;
    const monthlyReviews = reviews.filter(review => {
      const reviewDate = new Date(review.created_at);
      const now = new Date();
      return reviewDate.getMonth() === now.getMonth() && reviewDate.getFullYear() === now.getFullYear();
    });
    const monthlyBooking = monthlyReviews.reduce((sum, review) => sum + review.booking_experience_rating, 0);
    const monthlySupport = monthlyReviews.reduce((sum, review) => sum + review.support_experience_rating, 0);
    const monthlyCount = monthlyReviews.length;

    return {
      avgBooking: count > 0 ? (totalBooking / count).toFixed(2) : '0.00',
      avgSupport: count > 0 ? (totalSupport / count).toFixed(2) : '0.00',
      monthlyAvgBooking: monthlyCount > 0 ? (monthlyBooking / monthlyCount).toFixed(2) : '0.00',
      monthlyAvgSupport: monthlyCount > 0 ? (monthlySupport / monthlyCount).toFixed(2) : '0.00',
    };
  };

  const averages = calculateAverages(reviews);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Support Reviews
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
          Support Reviews
        </h1>
        <p className="mt-2 text-gray-500">View B. Remembered support reviews.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700">Average Booking Rating</h3>
            <p className="text-2xl font-bold text-gray-900">{averages.avgBooking}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700">Average Support Rating</h3>
            <p className="text-2xl font-bold text-gray-900">{averages.avgSupport}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700">Monthly Avg Booking Rating</h3>
            <p className="text-2xl font-bold text-gray-900">{averages.monthlyAvgBooking}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700">Monthly Avg Support Rating</h3>
            <p className="text-2xl font-bold text-gray-900">{averages.monthlyAvgSupport}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reviews ({reviews.length})</h2>
        </div>
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-500">Reviews will appear here when available. Check the console for details.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client (Email)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Support Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map((review) => (
                  <React.Fragment key={review.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setReviews(reviews.map(r =>
                          r.id === review.id ? { ...r, showFeedback: !r.showFeedback } : r
                        ));
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">{review.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{review.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{review.event_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(review.event_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{review.booking_experience_rating}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{review.support_experience_rating}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{review.would_recommend ? 'Yes' : 'No'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(review.created_at).toLocaleString()}</td>
                    </tr>
                    {review.showFeedback && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50">
                          <div className="text-sm text-gray-600 whitespace-pre-wrap">{review.feedback}</div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}