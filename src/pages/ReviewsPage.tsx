import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Vendor {
  id: string;
  name: string;
}

interface Couple {
  id: string;
  name: string;
}

interface VendorReview {
  id: string;
  vendor_id: string;
  rating: number;
  review_text: string;
  vendor_response: string | null;
  created_at: string;
  updated_at: string | null;
  couple_id: string;
  vendor_name: string | null;
  couple_name: string | null;
  showResponse: boolean;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<{ id: string; name: string; avgRating: number }[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const vendorsPerPage = 5;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vendor_reviews')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;

        // Fetch vendor names
        const vendorIds = data.map(review => review.vendor_id);
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

        // Fetch couple names
        const coupleIds = data.map(review => review.couple_id);
        let coupleNames: { [key: string]: string } = {};
        if (coupleIds.length > 0) {
          const { data: couples, error: coupleError } = await supabase
            .from('couples')
            .select('id, name')
            .in('id', coupleIds);
          if (coupleError) throw coupleError;
          coupleNames = couples.reduce((acc, couple) => {
            acc[couple.id] = couple.name;
            return acc;
          }, {} as { [key: string]: string });
        }

        // Map reviews with names and add showResponse flag
        const mappedReviews = data.map(review => ({
          ...review,
          vendor_name: vendorNames[review.vendor_id] || 'N/A',
          couple_name: coupleNames[review.couple_id] || 'N/A',
          showResponse: false,
        }));
        setReviews(mappedReviews || []);

        // Calculate average ratings for vendors
        const vendorRatings = mappedReviews.reduce((acc, review) => {
          if (!acc[review.vendor_id]) {
            acc[review.vendor_id] = { id: review.vendor_id, name: review.vendor_name, totalRating: 0, reviewCount: 0 };
          }
          acc[review.vendor_id].totalRating += review.rating;
          acc[review.vendor_id].reviewCount += 1;
          return acc;
        }, {} as { [key: string]: { id: string; name: string; totalRating: number; reviewCount: number } });

        const vendorAvgRatings = Object.values(vendorRatings).map(vendor => ({
          id: vendor.id,
          name: vendor.name,
          avgRating: vendor.reviewCount > 0 ? vendor.totalRating / vendor.reviewCount : 0,
        })).sort((a, b) => b.avgRating - a.avgRating);

        setVendors(vendorAvgRatings);
        console.log('Reviews fetched:', mappedReviews);
      } catch (error: any) {
        console.error('Error fetching reviews:', error);
        toast.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Reviews
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
          Reviews
        </h1>
        <p className="mt-2 text-gray-500">View vendor reviews.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Top Vendors by Rating</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Rating</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vendors.slice(currentPage * vendorsPerPage, (currentPage + 1) * vendorsPerPage).map((vendor) => (
                <tr key={vendor.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{vendor.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{vendor.avgRating.toFixed(2)}</td> {/* Removed /5 */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {vendors.length > vendorsPerPage && (
          <div className="px-6 py-4 flex justify-end">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-400 disabled:text-gray-500 mr-2"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.floor((vendors.length - 1) / vendorsPerPage)))}
              disabled={(currentPage + 1) * vendorsPerPage >= vendors.length}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-400 disabled:text-gray-500"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reviews ({reviews.length})</h2>
        </div>
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-500">Reviews will appear here when available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map((review) => (
                  <React.Fragment key={review.id}>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">{review.couple_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{review.vendor_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{review.rating}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{review.review_text}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setReviews(reviews.map(r =>
                              r.id === review.id ? { ...r, showResponse: !r.showResponse } : r
                            ));
                          }}
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <ChevronDown className={`h-4 w-4 transform ${review.showResponse ? 'rotate-180' : ''}`} />
                          {review.showResponse ? 'Hide' : 'Show'} Details
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(review.created_at).toLocaleString()}</td>
                    </tr>
                    {review.showResponse && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600"><strong>Feedback:</strong> {review.review_text}</p>
                            <p className="text-sm text-gray-600"><strong>Response:</strong> {review.vendor_response || 'N/A'}</p>
                          </div>
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