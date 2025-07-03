import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import TakePaymentModal from '../components/TakePaymentModal';

interface Payment {
  id: string;
  invoice_id: string | null;
  amount: number;
  status: string;
  stripe_payment_id: string | null;
  to_platform: boolean;
  created_at: string;
  invoice?: {
    id: string;
    couple_id: string | null;
    vendor_id: string | null;
    remaining_balance: number;
  };
  service_package?: { name: string };
  couple?: { name: string };
  vendor?: { name: string; stripe_account_id: string };
}

interface Invoice {
  id: string;
  couple_name: string;
  vendor_name: string;
  service_name: string;
  remaining_balance: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; amount: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('id, invoice_id, amount, status, stripe_payment_id, to_platform, created_at');

      if (paymentError) throw paymentError;

      const paymentsWithDetails = await Promise.all(paymentData.map(async (payment) => {
        if (payment.invoice_id) {
          const { data: invoiceData, error: invoiceError } = await supabase
            .from('invoices')
            .select('id, couple_id, vendor_id, remaining_balance')
            .eq('id', payment.invoice_id)
            .single();

          if (invoiceError) throw invoiceError;

          const [servicePackage, couple, vendor] = await Promise.all([
            invoiceData ? supabase.from('service_packages').select('name').eq('id', invoiceData.id).single() : Promise.resolve({ data: null, error: null }),
            invoiceData.couple_id ? supabase.from('couples').select('name').eq('id', invoiceData.couple_id).single() : Promise.resolve({ data: null, error: null }),
            invoiceData.vendor_id ? supabase.from('vendors').select('name, stripe_account_id').eq('id', invoiceData.vendor_id).single() : Promise.resolve({ data: null, error: null })
          ]);

          return {
            ...payment,
            invoice: invoiceData,
            service_package: servicePackage.data,
            couple: couple.data,
            vendor: vendor.data,
          };
        }
        return { ...payment, invoice: null, service_package: null, couple: null, vendor: null };
      }));

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          couple_id,
          vendor_id,
          remaining_balance,
          couples(name),
          vendors(name),
          invoice_line_items(service_packages(name))
        `)
        .eq('status', 'pending');

      if (invoicesError) throw invoicesError;

      const invoicesWithDetails = invoicesData.map((invoice) => ({
        id: invoice.id,
        couple_name: invoice.couples?.name || 'Unknown',
        vendor_name: invoice.vendors?.name || 'Unknown',
        service_name: invoice.invoice_line_items?.[0]?.service_packages?.name || 'Custom Service',
        remaining_balance: invoice.remaining_balance || 0,
      }));

      setPayments(paymentsWithDetails);
      setInvoices(invoicesWithDetails);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payments or invoices');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice({ id: invoice.id, amount: invoice.remaining_balance / 100 });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6">
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
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Payments
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all payments.</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pending Invoices ({invoices.length})</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invoices</h3>
            <p className="text-gray-500">Create an invoice to take a payment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.couple_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.vendor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.service_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(invoice.remaining_balance / 100).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => openPaymentModal(invoice)}
                        className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Take Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments Table */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
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
                    <td className="px-6 py-4 whitespace-nowrap">{payment.invoice_id || 'N/A'}</td>
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

      <TakePaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPaymentTaken={fetchData}
      />
    </div>
  );
}
