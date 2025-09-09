import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Edit, Save, X, Check, Clock, AlertCircle, CreditCard, Package, MapPin, Eye, Mail, MessageSquare, Plus, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Select from 'react-select';

interface Booking {
  id: string;
  couple_id: string;
  couple_name: string | null;
  couple_email: string | null;
  vendor_id: string;
  vendor_name: string | null;
  vendor_phone: string | null;
  vendor_email: string | null;
  status: string;
  amount: number;
  service_type: string;
  package_id: string | null;
  package_name: string | null;
  package_description: string | null;
  package_price: number | null;
  venue_id: string | null;
  venue_name: string | null;
  venue_address: string | null;
  created_at: string;
  initial_payment: number | null;
  final_payment: number | null;
  platform_fee: number | null;
  paid_amount: number | null;
  vendor_deposit_share: number | null;
  platform_deposit_share: number | null;
  vendor_final_share: number | null;
  platform_final_share: number | null;
  platform_total_earnings: number | null;
  vendor_total_earnings: number | null;
  tip_amount: number | null;
  final_payment_status: 'pending' | 'paid';
  events: Array<{ id: string; start_time: string; end_time: string; title: string }>;
}

interface Venue {
  id: string;
  name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  service_type: string;
}

interface Payment {
  id: string;
  invoice_id?: string;
  booking_id?: string;
  amount: number;
  status: string;
  stripe_payment_id?: string | null;
  to_platform?: boolean;
  created_at: string;
  payment_type?: string;
}

interface EmailLog {
  id: string;
  booking_id: string;
  vendor_id: string;
  couple_id: string;
  email_to: string;
  subject: string;
  sent_at: string;
  opened_at: string | null;
  opened: boolean;
  type: string;
  content: string;
}

interface UpcomingReminder {
  id: string;
  booking_id: string;
  event_id: string;
  type: 'Email' | 'Text' | 'Feedback';
  scheduled_at: string;
  recipient: string;
}

interface Invoice {
  id: string;
  couple_name: string;
  vendor_name: string;
  service_name: string;
  remaining_balance: number;
  status: string;
  couple_id?: string;
  vendor_id?: string;
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

interface Contract {
  id: string;
  booking_id: string;
  content: string;
  signature: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string | null;
  status: string;
  booking_intent_id: string | null;
  couple_name: string | null;
  package_name: string | null;
}

const PaymentEntryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: { invoice_id?: string; booking_id?: string; amount: number; status: string; payment_type: string; created_at: string }) => void;
  defaultBookingId?: string;
}> = ({ isOpen, onClose, onSave, defaultBookingId }) => {
  const [invoiceId, setInvoiceId] = useState('');
  const [bookingId, setBookingId] = useState(defaultBookingId || '');
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
    setFilteredBookings(bookings.filter(booking =>
      (!coupleId || booking.couple_id === coupleId) &&
      (!vendorId || booking.vendor_id === vendorId)
    ));

    setFilteredInvoices(invoices.filter(invoice =>
      (!coupleId || invoice.couple_id === coupleId) &&
      (!vendorId || invoice.vendor_id === vendorId)
    ));

    if (!filteredBookings.some(b => b.id === bookingId)) setBookingId(defaultBookingId || '');
    if (!filteredInvoices.some(i => i.id === invoiceId)) setInvoiceId('');
  }, [coupleId, vendorId, bookings, invoices, bookingId, defaultBookingId]);

  useEffect(() => {
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
    setBookingId(defaultBookingId || '');
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
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Enter amount in dollars"
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

const AddContractModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: { booking_id: string; content: string; signature: string; signed_at: string; status: string }) => void;
  defaultBookingId: string;
}> = ({ isOpen, onClose, onSave, defaultBookingId }) => {
  const [content, setContent] = useState('');
  const [signature, setSignature] = useState('');
  const [signedAt, setSignedAt] = useState(new Date().toISOString().slice(0, 16));
  const [status, setStatus] = useState('pending');

  const handleSubmit = () => {
    if (!content || !signature) {
      toast.error('Please provide contract content and signature');
      return;
    }
    onSave({
      booking_id: defaultBookingId,
      content,
      signature,
      signed_at: signedAt,
      status
    });
    setContent('');
    setSignature('');
    setSignedAt(new Date().toISOString().slice(0, 16));
    setStatus('pending');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Add New Contract</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Contract Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
              placeholder="Enter contract content"
              required
            />
          </div>
          <div>
            <label htmlFor="signature" className="block text-sm font-medium text-gray-700">Signature</label>
            <input
              type="text"
              id="signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter signature"
              required
            />
          </div>
          <div>
            <label htmlFor="signed_at" className="block text-sm font-medium text-gray-700">Signed At</label>
            <input
              type="datetime-local"
              id="signed_at"
              value={signedAt}
              onChange={(e) => setSignedAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="signed">Signed</option>
              <option value="cancelled">Cancelled</option>
            </select>
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
            Save Contract
          </button>
        </div>
      </div>
    </div>
  );
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({ 
    status: false,
    package: false,
    venue: false,
    payments: false
  });
  const [formData, setFormData] = useState({ 
    status: '',
    package_id: '',
    venue_id: '',
    initial_payment: '',
    final_payment: '',
    platform_fee: '',
    paid_amount: '',
    vendor_deposit_share: '',
    platform_deposit_share: '',
    vendor_final_share: '',
    platform_final_share: '',
    platform_total_earnings: '',
    vendor_total_earnings: '',
    tip_amount: '',
    final_payment_status: 'pending' as 'pending' | 'paid'
  });
  const [loading, setLoading] = useState(true);
  const [eventPage, setEventPage] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<UpcomingReminder[]>([]);
  const [isPaymentEntryModalOpen, setIsPaymentEntryModalOpen] = useState(false);
  const [isAddContractOpen, setIsAddContractOpen] = useState(false);
  const [isViewContractOpen, setIsViewContractOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  useEffect(() => {
    fetchBooking();
    fetchPackages();
    fetchVenues();
  }, [id, eventPage]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Booking ID is undefined');

      const [bookingData, emailLogsData, remindersData, contractData] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, couple_id, vendor_id, status, amount, service_type, package_id, created_at, venue_id, initial_payment, final_payment, platform_fee, paid_amount, vendor_deposit_share, platform_deposit_share, vendor_final_share, platform_final_share, platform_total_earnings, vendor_total_earnings, tip_amount, final_payment_status')
          .eq('id', id)
          .single(),
        supabase
          .from('email_logs')
          .select('*')
          .eq('booking_id', id),
        supabase
          .from('upcoming_reminders')
          .select('*')
          .eq('booking_id', id),
        supabase
          .from('contracts')
          .select('*')
          .eq('booking_id', id)
          .order('created_at', { ascending: false })
      ]);

      if (bookingData.error) throw bookingData.error;
      if (emailLogsData.error) throw emailLogsData.error;
      if (remindersData.error) throw remindersData.error;
      if (contractData.error) throw contractData.error;

      console.log('Booking data from Supabase:', bookingData.data);

      let coupleName = null, coupleEmail = null;
      if (bookingData.data.couple_id) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('partner1_name, email')
          .eq('id', bookingData.data.couple_id)
          .single();
        coupleName = coupleData?.partner1_name || 'Unknown';
        coupleEmail = coupleData?.email || null;
      }

      let vendorName = null, vendorPhone = null, vendorEmail = null;
      if (bookingData.data.vendor_id) {
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('name, phone, user_id')
          .eq('id', bookingData.data.vendor_id)
          .single();
        vendorName = vendorData?.name || 'Unknown';
        vendorPhone = vendorData?.phone || null;
        if (vendorData?.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', vendorData.user_id)
            .single();
          vendorEmail = userData?.email || null;
        }
      }

      let venueName = null, venueAddress = null;
      if (bookingData.data.venue_id) {
        const { data: venueData } = await supabase
          .from('venues')
          .select('name, street_address, city, state, zip')
          .eq('id', bookingData.data.venue_id)
          .single();
        venueName = venueData?.name || null;
        venueAddress = venueData
          ? `${venueData.street_address || ''}${venueData.city && venueData.state ? `, ${venueData.city}, ${venueData.state} ${venueData.zip || ''}` : ''}`.trim()
          : null;
        setVenue(venueData || null);
      }

      let packageName = null, packageDescription = null, packagePrice = null;
      if (bookingData.data.package_id) {
        const { data: packageData } = await supabase
          .from('service_packages')
          .select('name, description, price')
          .eq('id', bookingData.data.package_id)
          .single();
        packageName = packageData?.name || null;
        packageDescription = packageData?.description || null;
        packagePrice = packageData?.price || null;
      }

      const { data: eventsData } = await supabase
        .from('events')
        .select('id, start_time, end_time, title')
        .eq('couple_id', bookingData.data.couple_id)
        .eq('vendor_id', bookingData.data.vendor_id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .range(eventPage * 5, eventPage * 5 + 4);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, invoice_id, booking_id, amount, status, stripe_payment_id, to_platform, created_at, payment_type')
        .eq('booking_id', id);

      if (paymentsError) throw paymentsError;

      // Map contracts with couple and package names
      const mappedContracts = await Promise.all(
        contractData.data.map(async (contract) => {
          const booking = await supabase
            .from('bookings')
            .select('id, couple_id, package_id')
            .eq('id', contract.booking_id)
            .single();
          
          let coupleName = 'N/A';
          let packageName = 'N/A';

          if (booking.data?.couple_id) {
            const { data: coupleData } = await supabase
              .from('couples')
              .select('partner1_name')
              .eq('id', booking.data.couple_id)
              .single();
            coupleName = coupleData?.partner1_name || 'N/A';
          }

          if (booking.data?.package_id) {
            const { data: packageData } = await supabase
              .from('service_packages')
              .select('name')
              .eq('id', booking.data.package_id)
              .single();
            packageName = packageData?.name || 'N/A';
          }

          return {
            ...contract,
            couple_name: coupleName,
            package_name: packageName
          };
        })
      );

      const newBooking = {
        ...bookingData.data,
        couple_name: coupleName,
        couple_email: coupleEmail,
        vendor_name: vendorName,
        vendor_phone: vendorPhone,
        vendor_email: vendorEmail,
        package_name: packageName,
        package_description: packageDescription,
        package_price: packagePrice,
        venue_name: venueName,
        venue_address: venueAddress,
        events: eventsData || []
      };

      setBooking(newBooking);
      setPayments(paymentsData || []);
      setEmailLogs(emailLogsData.data || []);
      setUpcomingReminders(remindersData.data || []);
      setContracts(mappedContracts || []);
      setFormData({
        status: bookingData.data.status,
        package_id: bookingData.data.package_id || '',
        venue_id: bookingData.data.venue_id || '',
        initial_payment: bookingData.data.initial_payment ? (bookingData.data.initial_payment / 100).toString() : '',
        final_payment: bookingData.data.final_payment ? (bookingData.data.final_payment / 100).toString() : '',
        platform_fee: bookingData.data.platform_fee ? (bookingData.data.platform_fee / 100).toString() : '',
        paid_amount: bookingData.data.paid_amount ? (bookingData.data.paid_amount / 100).toString() : '',
        vendor_deposit_share: bookingData.data.vendor_deposit_share ? (bookingData.data.vendor_deposit_share / 100).toString() : '',
        platform_deposit_share: bookingData.data.platform_deposit_share ? (bookingData.data.platform_deposit_share / 100).toString() : '',
        vendor_final_share: bookingData.data.vendor_final_share ? (bookingData.data.vendor_final_share / 100).toString() : '',
        platform_final_share: bookingData.data.platform_final_share ? (bookingData.data.platform_final_share / 100).toString() : '',
        platform_total_earnings: bookingData.data.platform_total_earnings ? (bookingData.data.platform_total_earnings / 100).toString() : '',
        vendor_total_earnings: bookingData.data.vendor_total_earnings ? (bookingData.data.vendor_total_earnings / 100).toString() : '',
        tip_amount: bookingData.data.tip_amount ? (bookingData.data.tip_amount / 100).toString() : '',
        final_payment_status: bookingData.data.final_payment_status || 'pending'
      });
    } catch (error: any) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking');
      navigate('/dashboard/bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      console.log('Fetching all packages from service_packages');
      const { data, error } = await supabase
        .from('service_packages')
        .select('id, name, description, price, service_type');
      if (error) throw error;
      console.log('Fetched packages:', data);
      setPackages(data || []);
      if (!data || data.length === 0) {
        toast.info('No packages found in the database');
      }
    } catch (error: any) {
      console.error('Error fetching packages:', JSON.stringify(error, null, 2));
      toast.error('Failed to load packages');
      setPackages([]);
    }
  };

  const fetchVenues = async () => {
    try {
      console.log('Fetching all venues');
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, street_address, city, state, zip');
      if (error) throw error;
      console.log('Fetched venues:', data);
      setVenues(data || []);
      if (!data || data.length === 0) {
        toast.info('No venues found');
      }
    } catch (error: any) {
      console.error('Error fetching venues:', JSON.stringify(error, null, 2));
      toast.error('Failed to load venues');
      setVenues([]);
    }
  };

  const handleSaveField = async (field: string) => {
    if (!booking) return;

    setLoading(true);
    try {
      let updateData: any = { [field]: formData[field] };

      if (field === 'package_id') {
        const selectedPackage = packages.find(p => p.id === formData.package_id);
        if (selectedPackage) {
          updateData = {
            package_id: formData.package_id,
            amount: selectedPackage.price || booking.amount,
            service_type: selectedPackage.service_type,
          };
        }
      } else if (field === 'venue_id') {
        const selectedVenue = venues.find(v => v.id === formData.venue_id);
        if (selectedVenue) {
          updateData = {
            venue_id: formData.venue_id
          };
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);

      if (error) throw error;

      if (field === 'package_id' || field === 'venue_id') {
        await fetchBooking(); // Refresh booking to update dependent fields
      } else {
        setBooking(prev => prev ? { ...prev, ...updateData } : null);
      }

      setEditMode(prev => ({ ...prev, [field]: false }));
      toast.success(`${field.replace(/_/g, ' ')} updated successfully!`);
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field.replace(/_/g, ' ')}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayments = async () => {
    if (!booking) return;

    setLoading(true);
    try {
      const numericFields = [
        'initial_payment',
        'final_payment',
        'platform_fee',
        'paid_amount',
        'vendor_deposit_share',
        'platform_deposit_share',
        'vendor_final_share',
        'platform_final_share',
        'platform_total_earnings',
        'vendor_total_earnings',
        'tip_amount'
      ];

      const updateData: any = {
        final_payment_status: formData.final_payment_status
      };

      numericFields.forEach(field => {
        updateData[field] = formData[field] ? Math.round(parseFloat(formData[field]) * 100) : null;
      });

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);

      if (error) throw error;

      setBooking(prev => prev ? { ...prev, ...updateData } : null);
      setEditMode(prev => ({ ...prev, payments: false }));
      toast.success('Payment details updated successfully!');
    } catch (error: any) {
      console.error('Error updating payment details:', error);
      toast.error('Failed to update payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayments = () => {
    if (!booking) return;
    setEditMode(prev => ({ ...prev, payments: false }));
    setFormData({
      ...formData,
      initial_payment: booking.initial_payment ? (booking.initial_payment / 100).toString() : '',
      final_payment: booking.final_payment ? (booking.final_payment / 100).toString() : '',
      platform_fee: booking.platform_fee ? (booking.platform_fee / 100).toString() : '',
      paid_amount: booking.paid_amount ? (booking.paid_amount / 100).toString() : '',
      vendor_deposit_share: booking.vendor_deposit_share ? (booking.vendor_deposit_share / 100).toString() : '',
      platform_deposit_share: booking.platform_deposit_share ? (booking.platform_deposit_share / 100).toString() : '',
      vendor_final_share: booking.vendor_final_share ? (booking.vendor_final_share / 100).toString() : '',
      platform_final_share: booking.platform_final_share ? (booking.platform_final_share / 100).toString() : '',
      platform_total_earnings: booking.platform_total_earnings ? (booking.platform_total_earnings / 100).toString() : '',
      vendor_total_earnings: booking.vendor_total_earnings ? (booking.vendor_total_earnings / 100).toString() : '',
      tip_amount: booking.tip_amount ? (booking.tip_amount / 100).toString() : '',
      final_payment_status: booking.final_payment_status || 'pending'
    });
  };

  const handlePaymentEntry = async (payment: { invoice_id?: string; booking_id?: string; amount: number; status: string; payment_type: string; created_at: string }) => {
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          invoice_id: payment.invoice_id,
          booking_id: payment.booking_id || id,
          amount: payment.amount,
          status: payment.status,
          payment_type: payment.payment_type,
          created_at: payment.created_at,
          to_platform: true,
        });
      if (error) {
        console.error('[BookingDetailPage] Payment insert error:', JSON.stringify(error, null, 2));
        throw error;
      }
      toast.success('Payment recorded successfully!');
      await fetchBooking(); // Refresh payments and booking data
    } catch (error: any) {
      console.error('[BookingDetailPage] Error recording payment:', JSON.stringify(error, null, 2));
      toast.error('Failed to record payment: ' + error.message);
    }
  };

  const handleAddContract = async (contract: { booking_id: string; content: string; signature: string; signed_at: string; status: string }) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .insert({
          booking_id: contract.booking_id,
          content: contract.content,
          signature: contract.signature,
          signed_at: contract.signed_at,
          status: contract.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          booking_intent_id: null
        });
      if (error) {
        console.error('[BookingDetailPage] Contract insert error:', JSON.stringify(error, null, 2));
        throw error;
      }
      toast.success('Contract added successfully!');
      await fetchBooking(); // Refresh contracts and booking data
    } catch (error: any) {
      console.error('[BookingDetailPage] Error adding contract:', JSON.stringify(error, null, 2));
      toast.error('Failed to add contract: ' + error.message);
    }
  };

  const viewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setIsViewContractOpen(true);
  };

  const downloadContractPDF = (content: string) => {
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return <Check className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled': return <X className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const sendReminderEmail = async () => {
    if (!booking?.vendor_email) {
      toast.error('No vendor email available');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-reminder-email', {
        body: { user_id: booking.vendor_email, booking_id: booking.id },
      });
      if (error) throw error;
      toast.success('Reminder email sent successfully');
      fetchBooking();
    } catch (error: any) {
      console.error('Error sending reminder email:', error);
      toast.error('Failed to send reminder email');
    }
  };

  const sendReminderText = async () => {
    if (!booking?.vendor_phone) {
      toast.error('No vendor phone number available');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-reminder-text', {
        body: { phone: booking.vendor_phone, booking_id: booking.id },
      });
      if (error) throw error;
      toast.success('Reminder text sent successfully');
      fetchBooking();
    } catch (error: any) {
      console.error('Error sending reminder text:', error);
      toast.error('Failed to send reminder text');
    }
  };

  const sendFeedbackEmail = async () => {
    if (!booking?.couple_id) {
      toast.error('No couple ID available');
      return;
    }

    try {
      const { error } = await supabase
        .from('review_trigger')
        .insert({ couple_id: booking.couple_id, send_request: true });

      if (error) throw error;

      toast.success('Feedback request recorded successfully');
      fetchBooking();
    } catch (error: any) {
      console.error('Error recording feedback request:', error);
      toast.error('Failed to record feedback request');
    }
  };

  if (loading || !booking) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasMoreEvents = booking.events.length === 5;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Booking: {booking.couple_name} - {booking.service_type}
        </h1>
        <button
          onClick={() => navigate('/dashboard/bookings')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Bookings & Events
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Booking Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Couple</label>
            <p className="text-sm text-gray-900">{booking.couple_name}</p>
            <div className="mt-2">
              <button
                onClick={sendFeedbackEmail}
                className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
              >
                <Mail className="h-4 w-4 mr-1" />
                Send Feedback Request
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Vendor</label>
            <p className="text-sm text-gray-900">{booking.vendor_name}</p>
            <p className="text-sm text-gray-600">{booking.vendor_email || 'No email'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Vendor Phone</label>
            <p className="text-sm text-gray-900">{booking.vendor_phone || 'N/A'}</p>
            <div className="mt-2 space-x-2">
              <button
                onClick={sendReminderEmail}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Mail className="h-4 w-4 mr-1" />
                Send Email Reminder
              </button>
              <button
                onClick={sendReminderText}
                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Send Text Reminder
              </button>
            </div>
          </div>
          <div>
            {editMode.status ? (
              <>
                <label htmlFor="status" className="text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('status')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, status: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-sm text-gray-900 flex items-center">
                  {getStatusIcon(booking.status)}
                  <span className="ml-2 capitalize">{booking.status}</span>
                </p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, status: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Amount</label>
            <p className="text-sm text-gray-900">${(booking.amount / 100).toFixed(2)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Service Type</label>
            <p className="text-sm text-gray-900">{booking.service_type}</p>
          </div>
          <div>
            {editMode.package ? (
              <>
                <label htmlFor="package" className="text-sm font-medium text-gray-700 mb-2">Package</label>
                <select
                  id="package"
                  value={formData.package_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, package_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </select>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('package_id')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading || !formData.package_id}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, package: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Package</label>
                <p className="text-sm text-gray-900">{booking.package_name || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, package: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Package Price</label>
            <p className="text-sm text-gray-900">{booking.package_price ? `$${(booking.package_price / 100).toFixed(2)}` : 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Package Description</label>
            <p className="text-sm text-gray-900">{booking.package_description || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="text-sm text-gray-900">{new Date(booking.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 text-blue-600 mr-2" />
          Venue Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {editMode.venue ? (
              <>
                <label htmlFor="venue" className="text-sm font-medium text-gray-700 mb-2">Venue</label>
                <select
                  id="venue"
                  value={formData.venue_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('venue_id')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading || !formData.venue_id}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, venue: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Venue Name</label>
                <p className="text-sm text-gray-900">{venue?.name || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, venue: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Address</label>
            <p className="text-sm text-gray-900">
              {venue?.street_address || 'No address provided'}
              {venue?.city && venue?.state && `, ${venue.city}, ${venue.state} ${venue.zip || ''}`}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Related Events ({booking.events.length})
        </h2>
        {booking.events.length > 0 ? (
          <div className="space-y-4">
            {booking.events.map((event) => (
              <div key={event.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-600">{new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard/event/${event.id}`)}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>
                </div>
              </div>
            ))}
            {hasMoreEvents && (
              <button
                onClick={() => setEventPage(prev => prev + 1)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next 5
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No related events</h3>
            <p className="text-gray-500">No events associated with this booking.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
            Payments ({payments.length})
          </h2>
          <button
            onClick={() => setIsPaymentEntryModalOpen(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="h-4 w-4 mr-1 inline" />
            Enter Payment
          </button>
        </div>
        {!editMode.payments ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {[
                { field: 'initial_payment', label: 'Initial Payment' },
                { field: 'final_payment', label: 'Final Payment' },
                { field: 'platform_fee', label: 'Platform Fee' },
                { field: 'paid_amount', label: 'Paid Amount' },
                { field: 'vendor_deposit_share', label: 'Vendor Deposit Share' },
                { field: 'platform_deposit_share', label: 'Platform Deposit Share' },
                { field: 'vendor_final_share', label: 'Vendor Final Share' },
                { field: 'platform_final_share', label: 'Platform Final Share' },
                { field: 'platform_total_earnings', label: 'Platform Total Earnings' },
                { field: 'vendor_total_earnings', label: 'Vendor Total Earnings' },
                { field: 'tip_amount', label: 'Tip Amount' }
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="text-sm font-medium text-gray-500">{label}</label>
                  <p className="text-sm text-gray-900">
                    {booking[field as keyof Booking] !== null ? `$${(Number(booking[field as keyof Booking]) / 100).toFixed(2)}` : 'N/A'}
                  </p>
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-gray-500">Final Payment Status</label>
                <p className="text-sm text-gray-900 capitalize">{booking.final_payment_status}</p>
              </div>
            </div>
            <button
              onClick={() => setEditMode(prev => ({ ...prev, payments: true }))}
              className="mt-4 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit Payments
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {[
                { field: 'initial_payment', label: 'Initial Payment' },
                { field: 'final_payment', label: 'Final Payment' },
                { field: 'platform_fee', label: 'Platform Fee' },
                { field: 'paid_amount', label: 'Paid Amount' },
                { field: 'vendor_deposit_share', label: 'Vendor Deposit Share' },
                { field: 'platform_deposit_share', label: 'Platform Deposit Share' },
                { field: 'vendor_final_share', label: 'Vendor Final Share' },
                { field: 'platform_final_share', label: 'Platform Final Share' },
                { field: 'platform_total_earnings', label: 'Platform Total Earnings' },
                { field: 'vendor_total_earnings', label: 'Vendor Total Earnings' },
                { field: 'tip_amount', label: 'Tip Amount' }
              ].map(({ field, label }) => (
                <div key={field}>
                  <label htmlFor={field} className="text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <input
                    id={field}
                    type="number"
                    step="0.01"
                    value={formData[field]}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount in dollars"
                  />
                </div>
              ))}
              <div>
                <label htmlFor="final_payment_status" className="text-sm font-medium text-gray-700 mb-2">Final Payment Status</label>
                <select
                  id="final_payment_status"
                  value={formData.final_payment_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, final_payment_status: e.target.value as 'pending' | 'paid' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
            <div className="mt-4 space-x-2">
              <button
                onClick={handleSavePayments}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-1" />
                Save All
              </button>
              <button
                onClick={handleCancelPayments}
                className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </button>
            </div>
          </>
        )}
        {payments.length > 0 ? (
          <div className="overflow-x-auto mt-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
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
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.to_platform ? 'B. Remembered' : 'Vendor'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.payment_type || 'N/A'}</td>
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
        ) : (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">No payments associated with this booking.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 text-blue-600 mr-2" />
            Contracts ({contracts.length})
          </h2>
          <button
            onClick={() => setIsAddContractOpen(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="h-4 w-4 mr-1 inline" />
            Add Contract
          </button>
        </div>
        {contracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => viewContract(contract)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">{contract.couple_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{contract.package_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{contract.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{contract.signed_at ? new Date(contract.signed_at).toLocaleString() : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(contract.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadContractPDF(contract.content);
                        }}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
            <p className="text-gray-500">No contracts associated with this booking.</p>
          </div>
        )}
      </div>

      <PaymentEntryModal
        isOpen={isPaymentEntryModalOpen}
        onClose={() => setIsPaymentEntryModalOpen(false)}
        onSave={handlePaymentEntry}
        defaultBookingId={id}
      />

      <AddContractModal
        isOpen={isAddContractOpen}
        onClose={() => setIsAddContractOpen(false)}
        onSave={handleAddContract}
        defaultBookingId={id!}
      />

      {isViewContractOpen && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Details</h3>
            <div className="space-y-4">
              <p><strong>Couple:</strong> {selectedContract.couple_name}</p>
              <p><strong>Package:</strong> {selectedContract.package_name}</p>
              <p><strong>Status:</strong> {selectedContract.status}</p>
              <p><strong>Signed At:</strong> {selectedContract.signed_at ? new Date(selectedContract.signed_at).toLocaleString() : 'N/A'}</p>
              <p><strong>Created At:</strong> {new Date(selectedContract.created_at).toLocaleString()}</p>
              <p><strong>Signature:</strong> {selectedContract.signature || 'Not signed'}</p>
              <div className="whitespace-pre-wrap">{selectedContract.content}</div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => downloadContractPDF(selectedContract.content)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={() => setIsViewContractOpen(false)}
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Reminders</h2>
        {upcomingReminders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingReminders.map((reminder) => (
                  <tr key={reminder.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{reminder.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(reminder.scheduled_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{reminder.recipient}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming reminders</h3>
            <p className="text-gray-500">All reminders are either sent or not scheduled yet.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email/Text Logs</h2>
        {emailLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opened</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emailLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{log.email_to}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.sent_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.opened_at ? new Date(log.opened_at).toLocaleString() : 'Not Opened'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No email logs</h3>
            <p className="text-gray-500">No emails or texts have been sent for this booking yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}