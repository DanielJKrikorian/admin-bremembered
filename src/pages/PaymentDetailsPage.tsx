import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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

export default function PaymentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayment();
  }, [id]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      if (!id) {
        throw new Error('Payment ID is undefined');
      }

      console.log('Fetching payment with ID:', id); // Debug log
      const { data, error } = await supabase
        .from('payments')
        .select('id, booking_id, amount, status, stripe_payment_id, to_platform, created_at')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Failed to fetch payment: ${error.message}`);
      }

      if (!data) {
        throw new Error('No payment found for the given ID');
      }

      const paymentData = data as Payment;
      if (paymentData.booking_id) {
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('id, package_id, couple_id, vendor_id')
          .eq('id', paymentData.booking_id)
          .single();

        if (bookingError) {
          console.error('Booking fetch error:', bookingError);
          throw new Error(`Failed to fetch booking: ${bookingError.message}`);
        }

        const [servicePackage, couple, vendor] = await Promise.all([
          bookingData.package_id ? supabase.from('service_packages').select('name').eq('id', bookingData.package_id).single() : Promise.resolve({ data: null, error: null }),
          bookingData.couple_id ? supabase.from('couples').select('name').eq('id', bookingData.couple_id).single() : Promise.resolve({ data: null, error: null }),
          bookingData.vendor_id ? supabase.from('vendors').select('name, stripe_account_id').eq('id', bookingData.vendor_id).single() : Promise.resolve({ data: null, error: null })
        ]);

        if (servicePackage.error) console.error('Service package fetch error:', servicePackage.error);
        if (couple.error) console.error('Couple fetch error:', couple.error);
        if (vendor.error) console.error('Vendor fetch error:', vendor.error);

        setPayment({
          ...paymentData,
          booking: bookingData,
          service_package: servicePackage.data,
          couple: couple.data,
          vendor: vendor.data
        });
      } else {
        setPayment(paymentData);
      }
    } catch (error: any) {
      console.error('Fetch payment error:', error);
      toast.error(error.message || 'Failed to load payment details');
      navigate('/dashboard/payments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">Payment not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Payment Details: {payment.stripe_payment_id || payment.id}
        </h1>
        <button
          onClick={() => navigate('/dashboard/payments')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Payments
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Payment Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">ID</label>
            <p className="text-sm text-gray-900">{payment.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Amount</label>
            <p className="text-sm text-gray-900">${(payment.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Service Package</label>
            <p className="text-sm text-gray-900">{payment.service_package?.name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Date</label>
            <p className="text-sm text-gray-900">{new Date(payment.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Couple</label>
            <p className="text-sm text-gray-900">{payment.couple?.name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Vendor</label>
            <p className="text-sm text-gray-900">{payment.vendor?.name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Recipient</label>
            <p className="text-sm text-gray-900">{payment.to_platform ? 'B. Remembered' : payment.vendor?.stripe_account_id || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p className="text-sm text-gray-900">{payment.status}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Stripe Payment ID</label>
            <p className="text-sm text-gray-900">{payment.stripe_payment_id || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}