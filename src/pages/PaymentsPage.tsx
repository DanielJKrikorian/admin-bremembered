import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import TakePaymentModal from '../components/TakePaymentModal';

interface Payment {
  id: string;
  booking_id: string | null;
  amount: number;
  status: string;
  stripe_payment_id: string | null;
  to_platform: boolean;
  created_at: string;
  booking?: {
    id: string;
    package_id: string | null;
    couple_id: string | null;
    vendor_id: string | null;
  };
  service_package?: { name: string };
  couple?: { name: string };
  vendor?: { name: string; stripe_account_id: string };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('id, booking_id, amount, status, stripe_payment_id, to_platform, created_at');

      if (paymentError) throw paymentError;

      const paymentsWithDetails = await Promise.all(paymentData.map(async (payment) => {
        if (payment.booking_id) {
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select('id, package_id, couple_id, vendor_id')
            .eq('id', payment.booking_id)
            .single();

          if (bookingError) throw bookingError;

          const [servicePackage, couple, vendor] = await Promise.all([
            bookingData.package_id ? supabase.from('service_packages').select('name').eq('id', bookingData.package_id).single() : Promise.resolve({ data: null, error: null }),
            bookingData.couple_id ? supabase.from('couples').select('name').eq('id', bookingData.couple_id).single() : Promise.resolve({ data: null, error: null }),
            bookingData.vendor_id ? supabase.from('vendors').select('name, stripe_account_id').eq('id', bookingData.vendor_id).single() : Promise.resolve({ data: null, error: null })
          ]);

          return {
            ...payment,
            booking: bookingData,
            service_package: servicePackage.data,
            couple: couple.data,
            vendor: vendor.data
          };
        }
        return { ...payment, booking: null, service_package: null, couple: null, vendor: null };
      }));

      setPayments(paymentsWithDetails);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Payments
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
            Payments
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all payments.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Take Payment
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payments ({payments.length})</h2>
        </div>
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">Take a new payment to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/payment/${payment.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">${(payment.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.service_package?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.couple?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.vendor?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.to_platform ? 'B. Remembered' : payment.vendor?.stripe_account_id || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/payment/${payment.id}`); }}
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
        )}
      </div>

      <TakePaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onPaymentTaken={fetchData} />
    </div>
  );
}