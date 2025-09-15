import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

// Ad types for total price calculation
const adTypes = [
  {
    name: 'Basic Ad',
    monthlyPrice: 250,
    quarterlyPrice: 675,
    yearlyPrice: 2000,
    mainMonthlyPrice: 1000,
    mainQuarterlyPrice: 2700,
    mainYearlyPrice: 8000,
  },
  {
    name: 'Featured Ad',
    monthlyPrice: 500,
    quarterlyPrice: 1350,
    yearlyPrice: 4000,
    mainMonthlyPrice: 1500,
    mainQuarterlyPrice: 4050,
    mainYearlyPrice: 12000,
  },
  {
    name: 'Sponsored Ad',
    monthlyPrice: 1250,
    quarterlyPrice: 3375,
    yearlyPrice: 10000,
    mainMonthlyPrice: 2250,
    mainQuarterlyPrice: 6075,
    mainYearlyPrice: 18000,
  },
  {
    name: 'Photo Ad',
    monthlyPrice: 150,
    quarterlyPrice: 405,
    yearlyPrice: 1200,
  },
  {
    name: 'Featured Photo Ad',
    monthlyPrice: 500,
    quarterlyPrice: 1350,
    yearlyPrice: 4000,
  },
  {
    name: 'Email Sponsorship',
    monthlyPrice: 250,
    quarterlyPrice: 675,
    yearlyPrice: 2000,
  },
];

interface AdPurchase {
  id: string;
  sponsor_name: string;
  email: string;
  phone: string;
  placement_type: string;
  billing_cycle: string;
  total_price: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  selected_pages: any; // JSON object from ads table
}

export default function AdPurchasesPage() {
  const [purchases, setPurchases] = useState<AdPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const purchasesPerPage = 10;
  const navigate = useNavigate();
  const currentDate = new Date('2025-09-14'); // Current date for status calculation

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ads')
        .select('id, sponsor_name, email, phone, placement_type, start_date, end_date, created_at, selected_pages')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate total_price and status
      const purchasesWithDetails = data?.map((purchase) => {
        const ad = adTypes.find((a) => a.name === purchase.placement_type);
        let totalPrice = 0;
        let status = 'Inactive';

        if (ad) {
          const billing = purchase.selected_pages.billingCycle || 'monthly';
          if (purchase.placement_type === 'Email Sponsorship') {
            const emailCount = purchase.selected_pages.selectedEmails?.length || 0;
            const emailPrice = billing === 'monthly' ? ad.monthlyPrice : billing === 'quarterly' ? ad.quarterlyPrice : ad.yearlyPrice;
            totalPrice = emailCount * emailPrice;
          } else if (['Photo Ad', 'Featured Photo Ad'].includes(purchase.placement_type)) {
            const numPhotos = purchase.selected_pages.numPhotos || 1;
            const photoPrice = billing === 'monthly' ? ad.monthlyPrice : billing === 'quarterly' ? ad.quarterlyPrice : ad.yearlyPrice;
            totalPrice = numPhotos * photoPrice;
          } else {
            const serviceCount = (purchase.selected_pages.selectedServices?.length || 0) + (purchase.selected_pages.selectedVendors?.length || 0);
            const mainCount = purchase.selected_pages.selectedMains?.length || 0;
            const servicePrice = billing === 'monthly' ? ad.monthlyPrice : billing === 'quarterly' ? ad.quarterlyPrice : ad.yearlyPrice;
            const mainPrice = billing === 'monthly' ? ad.mainMonthlyPrice : billing === 'quarterly' ? ad.mainQuarterlyPrice : ad.yearlyPrice;
            totalPrice = serviceCount * servicePrice + mainCount * mainPrice;
          }

          // Determine status based on start_date and end_date
          const startDate = new Date(purchase.start_date);
          const endDate = new Date(purchase.end_date);
          status = currentDate >= startDate && currentDate <= endDate ? 'Active' : 'Inactive';
        }

        return {
          ...purchase,
          billing_cycle: purchase.selected_pages.billingCycle || 'monthly',
          total_price: totalPrice,
          status,
        };
      });

      setPurchases(purchasesWithDetails || []);
    } catch (error: any) {
      console.error('Error fetching ad purchases:', error);
      toast.error('Failed to load ad purchases');
    } finally {
      setLoading(false);
    }
  };

  const updatePurchaseStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('ads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setPurchases((prev) =>
        prev.map((purchase) => (purchase.id === id ? { ...purchase, status: newStatus } : purchase))
      );
      toast.success('Status updated successfully');
    } catch (error: any) {
      console.error('Error updating purchase status:', error);
      toast.error('Failed to update status');
    }
  };

  const indexOfLastPurchase = currentPage * purchasesPerPage;
  const indexOfFirstPurchase = indexOfLastPurchase - purchasesPerPage;
  const currentPurchases = purchases
    .filter((purchase) =>
      purchase.sponsor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.placement_type.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(indexOfFirstPurchase, indexOfLastPurchase);
  const totalPages = Math.ceil(purchases.length / purchasesPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Briefcase className="h-8 w-8 text-blue-600 mr-3" />
            Ad Purchases
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
            <Briefcase className="h-8 w-8 text-blue-600 mr-3" />
            Ad Purchases
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all ad purchases.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Purchases ({purchases.length})</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sponsor name, email, or ad type..."
            className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No ad purchases found</h3>
            <p className="text-gray-500">No ad purchases available.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sponsor Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Cycle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPurchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/ad-purchase/${purchase.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">{purchase.sponsor_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{purchase.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{purchase.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{purchase.placement_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{purchase.billing_cycle.charAt(0).toUpperCase() + purchase.billing_cycle.slice(1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${purchase.total_price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(purchase.start_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(purchase.end_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={purchase.status}
                          onChange={(e) => updatePurchaseStatus(purchase.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(purchase.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/ad-purchase/${purchase.id}`); }}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 flex justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => paginate(page)}
                  className={`mx-1 px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {page}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}