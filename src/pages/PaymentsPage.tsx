import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, Plus, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Select from 'react-select';
import TakePaymentModal from '../components/TakePaymentModal';

interface Payment {
  id: string;
  invoice_id?: string;
  booking_id?: string;
  amount: number;
  status: string;
  stripe_payment_id?: string;
  to_platform?: boolean;
  created_at: string;
  payment_type?: string;
  invoice?: {
    id: string;
    couple_id?: string;
    vendor_id?: string;
    remaining_balance: number;
  };
  service_package?: { name: string };
  couple?: { partner1_name: string; partner2_name?: string };
  vendor?: { name: string; stripe_account_id?: string };
}

interface Invoice {
  id: string;
  couple_name: string;
  vendor_name: string;
  service_name: string;
  remaining_balance: number;
  status: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface Couple {
  id: string;
  partner1_name: string;
  partner2_name?: string;
}

interface Booking {
  id: string;
  couple_id: string;
  vendor_id: string;
  package_id: string;
  service_type: string;
}

const PaymentEntryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: { invoice_id?: string; booking_id?: string; amount: number; status: string; payment_type: string; created_at: string }) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [invoiceId, setInvoiceId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [coupleId, setCoupleId] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('succeeded');
  const [paymentType, setPaymentType] = useState('deposit');
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().slice(0, 16));
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [vendorsResponse, couplesResponse, bookingsResponse, invoicesResponse] = await Promise.all([
            supabase.from('vendors').select('id, name'),
            supabase.from('couples').select('id, partner1_name, partner2_name'),
            supabase.from('bookings').select('id, couple_id, vendor_id, package_id, service_type'),
            supabase.from('invoices').select('id, couple_id, vendor_id, status, remaining_balance, couples!left(partner1_name, partner2_name), vendors!left(name), invoice_line_items!left(service_packages(name))')
          ]);

          if (vendorsResponse.error) throw vendorsResponse.error;
          if (couplesResponse.error) throw couplesResponse.error;
          if (bookingsResponse.error) throw bookingsResponse.error;
          if (invoicesResponse.error) throw invoicesResponse.error;

          setVendors(vendorsResponse.data || []);
          setCouples(couplesResponse.data || []);
          setBookings(bookingsResponse.data || []);
          setInvoices(invoicesResponse.data.map(invoice => ({
            id: invoice.id,
            couple_name: invoice.couples
              ? `${invoice.couples.partner1_name || ''} ${invoice.couples.partner2_name || ''}`.trim() || 'Unknown'
              : 'Unknown',
            vendor_name: invoice.vendors?.name || 'Unknown',
            service_name: invoice.invoice_line_items?.[0]?.service_packages?.name || 'Custom Service',
            remaining_balance: invoice.remaining_balance || 0,
            status: invoice.status || 'Unknown',
            couple_id: invoice.couple_id,
            vendor_id: invoice.vendor_id
          })));
        } catch (error: any) {
          console.error('[PaymentEntryModal] Error fetching data:', JSON.stringify(error, null, 2));
          toast.error('Failed to load dropdown data');
        }
      };
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter bookings based on couple_id or vendor_id
    setFilteredBookings(bookings.filter(booking =>
      (!coupleId || booking.couple_id === coupleId) &&
      (!vendorId || booking.vendor_id === vendorId)
    ));

    // Filter invoices based on couple_id or vendor_id
    setFilteredInvoices(invoices.filter(invoice =>
      (!coupleId || invoice.couple_id === coupleId) &&
      (!vendorId || invoice.vendor_id === vendorId)
    ));

    // Reset dependent fields when filters change
    if (!filteredBookings.some(b => b.id === bookingId)) setBookingId('');
    if (!filteredInvoices.some(i => i.id === invoiceId)) setInvoiceId('');
  }, [coupleId, vendorId, bookings, invoices, bookingId, invoiceId]);

  useEffect(() => {
    // Auto-populate invoice_id from booking
    if (bookingId) {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        const relatedInvoice = invoices.find(i =>
          i.couple_id === booking.couple_id &&
          (!vendorId || i.vendor_id === vendorId)
        );
        setInvoiceId(relatedInvoice?.id || '');
      }
    }
  }, [bookingId, bookings, invoices, vendorId]);

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount) * 100;
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!invoiceId && !bookingId) {
      toast.error('Please provide either an Invoice ID or Booking ID');
      return;
    }
    onSave({
      invoice_id: invoiceId || undefined,
      booking_id: bookingId || undefined,
      amount: parsedAmount,
      status,
      payment_type: paymentType,
      created_at: createdAt,
    });
    setInvoiceId('');
    setBookingId('');
    setVendorId('');
    setCoupleId('');
    setAmount('');
    setStatus('succeeded');
    setPaymentType('deposit');
    setCreatedAt(new Date().toISOString().slice(0, 16));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Enter Payment</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Vendor</label>
            <Select
              options={vendors.map(v => ({ value: v.id, label: v.name }))}
              value={vendors.find(v => v.id === vendorId) ? { value: vendorId, label: vendors.find(v => v.id === vendorId)!.name } : null}
              onChange={(option) => setVendorId(option ? option.value : '')}
              placeholder="Select Vendor"
              isClearable
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Couple</label>
            <Select
              options={couples.map(c => ({ value: c.id, label: `${c.partner1_name} ${c.partner2_name || ''}`.trim() }))}
              value={couples.find(c => c.id === coupleId) ? { value: coupleId, label: `${couples.find(c => c.id === coupleId)!.partner1_name} ${couples.find(c => c.id === coupleId)!.partner2_name || ''}`.trim() } : null}
              onChange={(option) => setCoupleId(option ? option.value : '')}
              placeholder="Select Couple"
              isClearable
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Booking</label>
            <Select
              options={filteredBookings.map(b => ({ value: b.id, label: `${b.id} - ${b.service_type}` }))}
              value={filteredBookings.find(b => b.id === bookingId) ? { value: bookingId, label: `${bookingId} - ${filteredBookings.find(b => b.id === bookingId)!.service_type}` } : null}
              onChange={(option) => setBookingId(option ? option.value : '')}
              placeholder="Select Booking"
              isClearable
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice</label>
            <Select
              options={filteredInvoices.map(i => ({ value: i.id, label: `${i.id} - ${i.couple_name} (${i.status})` }))}
              value={filteredInvoices.find(i => i.id === invoiceId) ? { value: invoiceId, label: `${invoiceId} - ${filteredInvoices.find(i => i.id === invoiceId)!.couple_name} (${filteredInvoices.find(i => i.id === invoiceId)!.status})` } : null}
              onChange={(option) => setInvoiceId(option ? option.value : '')}
              placeholder="Select Invoice"
              isClearable
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice ID (manual)</label>
            <input
              type="text"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Enter Invoice ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Booking ID (manual)</label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Enter Booking ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Type</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="deposit">Deposit</option>
              <option value="full_payment">Full Payment</option>
              <option value="partial_payment">Partial Payment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Created At</label>
            <input
              type="datetime-local"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Save Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentEntryModalOpen, setIsPaymentEntryModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; amount: number } | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const rowsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch payments with invoice_id or booking_id
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('id, invoice_id, booking_id, amount, status, stripe_payment_id, to_platform, created_at, payment_type');

      if (paymentError) throw paymentError;

      const paymentsWithDetails = await Promise.all(
        paymentData.map(async (payment) => {
          let invoice = null;
          let service_package = null;
          let couple = null;
          let vendor = null;

          if (payment.invoice_id) {
            const { data: invoiceData, error: invoiceError } = await supabase
              .from('invoices')
              .select('id, couple_id, vendor_id, remaining_balance')
              .eq('id', payment.invoice_id)
              .single();
            if (invoiceError) console.warn('[PaymentsPage] Invoice fetch error:', JSON.stringify(invoiceError, null, 2));
            else invoice = invoiceData;

            if (invoiceData?.couple_id) {
              const { data: coupleData, error: coupleError } = await supabase
                .from('couples')
                .select('partner1_name, partner2_name')
                .eq('id', invoiceData.couple_id)
                .single();
              if (!coupleError) couple = coupleData;
            }

            if (invoiceData?.vendor_id) {
              const { data: vendorData, error: vendorError } = await supabase
                .from('vendors')
                .select('name, stripe_account_id')
                .eq('id', invoiceData.vendor_id)
                .single();
              if (!vendorError) vendor = vendorData;
            }
          }

          if (payment.booking_id) {
            const { data: bookingData, error: bookingError } = await supabase
              .from('bookings')
              .select('package_id, couple_id, vendor_id')
              .eq('id', payment.booking_id)
              .single();
            if (bookingError) console.warn('[PaymentsPage] Booking fetch error:', JSON.stringify(bookingError, null, 2));
            else {
              if (bookingData?.package_id) {
                const { data: packageData, error: packageError } = await supabase
                  .from('service_packages')
                  .select('name')
                  .eq('id', bookingData.package_id)
                  .single();
                if (!packageError) service_package = packageData;
              }

              if (bookingData?.couple_id && !couple) {
                const { data: coupleData, error: coupleError } = await supabase
                  .from('couples')
                  .select('partner1_name, partner2_name')
                  .eq('id', bookingData.couple_id)
                  .single();
                if (!coupleError) couple = coupleData;
              }

              if (bookingData?.vendor_id && !vendor) {
                const { data: vendorData, error: vendorError } = await supabase
                  .from('vendors')
                  .select('name, stripe_account_id')
                  .eq('id', bookingData.vendor_id)
                  .single();
                if (!vendorError) vendor = vendorData;
              }
            }
          }

          return {
            ...payment,
            invoice,
            service_package,
            couple,
            vendor,
          };
        })
      );

      // Fetch pending and draft invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          couple_id,
          vendor_id,
          status,
          remaining_balance,
          couples!left(partner1_name, partner2_name),
          vendors!left(name),
          invoice_line_items!left(service_packages(name))
        `)
        .in('status', ['pending', 'draft']);

      if (invoicesError) throw invoicesError;

      console.log('[PaymentsPage] Raw invoices data:', JSON.stringify(invoicesData, null, 2));

      const invoicesWithDetails = invoicesData.map((invoice) => ({
        id: invoice.id,
        couple_name: invoice.couples
          ? `${invoice.couples.partner1_name || ''} ${invoice.couples.partner2_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        vendor_name: invoice.vendors?.name || 'Unknown',
        service_name: invoice.invoice_line_items?.[0]?.service_packages?.name || 'Custom Service',
        remaining_balance: invoice.remaining_balance || 0,
        status: invoice.status || 'Unknown',
      }));

      setPayments(paymentsWithDetails);
      setInvoices(invoicesWithDetails);
    } catch (error: any) {
      console.error('[PaymentsPage] Error fetching data:', JSON.stringify(error, null, 2));
      toast.error('Failed to load payments or invoices');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice({ id: invoice.id, amount: invoice.remaining_balance / 100 });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentEntry = async (payment: { invoice_id?: string; booking_id?: string; amount: number; status: string; payment_type: string; created_at: string }) => {
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          invoice_id: payment.invoice_id,
          booking_id: payment.booking_id,
          amount: payment.amount,
          status: payment.status,
          payment_type: payment.payment_type,
          created_at: payment.created_at,
          to_platform: true,
        });
      if (error) {
        console.error('[PaymentsPage] Payment insert error:', JSON.stringify(error, null, 2));
        throw error;
      }
      toast.success('Payment recorded successfully!');
      fetchData();
    } catch (error: any) {
      console.error('[PaymentsPage] Error recording payment:', JSON.stringify(error, null, 2));
      toast.error('Failed to record payment: ' + error.message);
    }
  };

  const handleCSVImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').map(line => line.split(','));
      if (lines.length < 2) {
        toast.error('Invalid CSV format');
        return;
      }

      const headers = lines[0].map(h => h.trim());
      const expectedHeaders = ['invoice_id', 'booking_id', 'amount', 'status', 'payment_type', 'created_at'];
      if (!expectedHeaders.every(h => headers.includes(h))) {
        toast.error('CSV must include headers: invoice_id, booking_id, amount, status, payment_type, created_at');
        return;
      }

      const paymentsToInsert = lines.slice(1).map(row => {
        const rowData: { [key: string]: any } = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index]?.trim();
        });
        return {
          invoice_id: rowData.invoice_id || null,
          booking_id: rowData.booking_id || null,
          amount: parseFloat(rowData.amount) * 100 || 0,
          status: rowData.status || 'succeeded',
          payment_type: rowData.payment_type || 'deposit',
          created_at: rowData.created_at || new Date().toISOString(),
          to_platform: true,
        };
      }).filter(payment => payment.amount > 0 && (payment.invoice_id || payment.booking_id));

      if (paymentsToInsert.length === 0) {
        toast.error('No valid payments found in CSV');
        return;
      }

      try {
        const { error } = await supabase
          .from('payments')
          .insert(paymentsToInsert);
        if (error) {
          console.error('[PaymentsPage] CSV payments insert error:', JSON.stringify(error, null, 2));
          throw error;
        }
        toast.success('Payments imported successfully!');
        fetchData();
      } catch (error: any) {
        console.error('[PaymentsPage] Error importing payments:', JSON.stringify(error, null, 2));
        toast.error('Failed to import payments: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  // Filter invoices based on search term
  const filteredInvoices = invoices.filter(invoice =>
    invoice.id.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    invoice.couple_name.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    invoice.vendor_name.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    invoice.service_name.toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  // Filter payments based on search term
  const filteredPayments = payments.filter(payment =>
    (payment.invoice_id || '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
    (payment.booking_id || '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
    (payment.service_package?.name || '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
    (payment.couple ? `${payment.couple.partner1_name} ${payment.couple.partner2_name || ''}`.trim() : '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
    (payment.vendor?.name || '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
    (payment.payment_type || '').toLowerCase().includes(paymentSearch.toLowerCase())
  );

  // Pagination for invoices
  const totalInvoicePages = Math.ceil(filteredInvoices.length / rowsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (invoicePage - 1) * rowsPerPage,
    invoicePage * rowsPerPage
  );

  // Pagination for payments
  const totalPaymentPages = Math.ceil(filteredPayments.length / rowsPerPage);
  const paginatedPayments = filteredPayments.slice(
    (paymentPage - 1) * rowsPerPage,
    paymentPage * rowsPerPage
  );

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
        <div className="flex gap-2">
          <button
            onClick={() => setIsPaymentEntryModalOpen(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="h-4 w-4 mr-1 inline" />
            Enter Payment
          </button>
          <label className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center cursor-pointer">
            <Upload className="h-4 w-4 mr-1" />
            Import Payments
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Pending and Draft Invoices ({filteredInvoices.length})</h2>
          <input
            type="text"
            value={invoiceSearch}
            onChange={(e) => { setInvoiceSearch(e.target.value); setInvoicePage(1); }}
            placeholder="Search invoices..."
            className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        {paginatedInvoices.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending or draft invoices</h3>
            <p className="text-gray-500">Create an invoice to take a payment.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.couple_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.vendor_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.service_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(invoice.remaining_balance / 100).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPaymentModal(invoice);
                          }}
                          className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
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
            <div className="px-6 py-4 flex justify-between items-center">
              <button
                onClick={() => setInvoicePage(prev => Math.max(prev - 1, 1))}
                disabled={invoicePage === 1}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4 inline" /> Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {invoicePage} of {totalInvoicePages}
              </span>
              <button
                onClick={() => setInvoicePage(prev => Math.min(prev + 1, totalInvoicePages))}
                disabled={invoicePage === totalInvoicePages}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4 inline" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Payments ({filteredPayments.length})</h2>
          <input
            type="text"
            value={paymentSearch}
            onChange={(e) => { setPaymentSearch(e.target.value); setPaymentPage(1); }}
            placeholder="Search payments..."
            className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        {paginatedPayments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">Enter or take a payment to get started.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Package</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/payment/${payment.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(payment.amount / 100).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.invoice_id || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.booking_id || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.service_package?.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.payment_type || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(payment.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.couple ? `${payment.couple.partner1_name} ${payment.couple.partner2_name || ''}`.trim() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.vendor?.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.to_platform ? 'B. Remembered' : payment.vendor?.stripe_account_id || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/payment/${payment.id}`);
                          }}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
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
            <div className="px-6 py-4 flex justify-between items-center">
              <button
                onClick={() => setPaymentPage(prev => Math.max(prev - 1, 1))}
                disabled={paymentPage === 1}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4 inline" /> Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {paymentPage} of {totalPaymentPages}
              </span>
              <button
                onClick={() => setPaymentPage(prev => Math.min(prev + 1, totalPaymentPages))}
                disabled={paymentPage === totalPaymentPages}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4 inline" />
              </button>
            </div>
          </>
        )}
      </div>

      <TakePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentTaken={fetchData}
        invoiceId={selectedInvoice?.id}
        amount={selectedInvoice?.amount}
      />
      <PaymentEntryModal
        isOpen={isPaymentEntryModalOpen}
        onClose={() => setIsPaymentEntryModalOpen(false)}
        onSave={handlePaymentEntry}
      />
    </div>
  );
}