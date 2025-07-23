import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { Calendar, Save, Plus, Trash2, Copy, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import TakePaymentModal from '../components/TakePaymentModal';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
  console.error('Stripe publishable key is not set in environment variables');
}

interface Couple {
  id: string;
  partner1_name: string;
  partner2_name: string;
  email: string;
  phone: string;
}

interface Vendor {
  id: string;
  name: string;
  user_id: string;
  email: string;
  phone: string;
  stripe_account_id?: string;
}

interface ServicePackage {
  id: string;
  name: string;
  price: number;
}

interface StoreProduct {
  id: string;
  name: string;
  price: number;
}

interface Event {
  id: string;
  title: string;
  start_time: string;
}

interface Booking {
  id: string;
  couple_id: string;
  vendor_id: string;
  package_id: string;
  amount: number;
  initial_payment: number;
  service_type: string;
  event_id: string;
}

interface VendorServicePackage {
  vendor_id: string;
  service_package_id: string;
  service_type: string;
}

interface InvoiceLineItem {
  id?: string;
  type: 'service_package' | 'store_product' | 'custom';
  service_package_id?: string;
  store_product_id?: string;
  booking_id?: string;
  custom_description?: string;
  custom_price: number;
  quantity: number;
  vendor_id?: string;
  stripe_account_id?: string;
  service_package_name?: string;
  store_product_name?: string;
  vendor_name?: string;
  event_title?: string;
}

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
}

interface Invoice {
  id: string;
  recipient_type: 'couple' | 'vendor';
  couple_id?: string;
  vendor_id?: string;
  total_amount: number;
  remaining_balance: number;
  discount_amount: number;
  discount_percentage: number;
  deposit_amount: number;
  status: string;
  paid_at?: string;
  stripe_payment_intent_id?: string;
  payment_token?: string;
  couple_name?: string;
  vendor_name?: string;
  invoice_line_items?: InvoiceLineItem[];
}

const PaymentEntryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: { amount: number; status: string; payment_type: string; created_at: string }) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('succeeded');
  const [paymentType, setPaymentType] = useState('deposit');
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().slice(0, 16));

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount) * 100;
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    onSave({
      amount: parsedAmount,
      status,
      payment_type: paymentType,
      created_at: createdAt,
    });
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
            <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [depositPercentage, setDepositPercentage] = useState<number>(0);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [vendorServicePackages, setVendorServicePackages] = useState<VendorServicePackage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentEntryModalOpen, setIsPaymentEntryModalOpen] = useState(false);
  const [isDiscountPercentage, setIsDiscountPercentage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverLineItems, setServerLineItems] = useState<InvoiceLineItem[]>([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (invoice) {
      setLineItems(invoice.invoice_line_items || []);
      setServerLineItems(invoice.invoice_line_items || []);
      setDiscountAmount(invoice.discount_amount || 0);
      setDiscountPercentage(invoice.discount_percentage || 0);
      setDepositPercentage((invoice.deposit_amount / (invoice.total_amount || 1)) * 100 || 0);
      setIsDiscountPercentage(invoice.discount_percentage > 0);
    }
  }, [invoice]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('[InvoiceDetailsPage] Fetching data for invoice:', id);
      const [
        invoiceResponse,
        lineItemsResponse,
        couplesResponse,
        vendorsResponse,
        usersResponse,
        servicePackagesResponse,
        storeProductsResponse,
        bookingsResponse,
        eventsResponse,
        vendorServicePackagesResponse,
        paymentsResponse
      ] = await Promise.all([
        supabase.from('invoices').select('id, recipient_type, couple_id, vendor_id, total_amount, remaining_balance, discount_amount, discount_percentage, deposit_amount, status, paid_at, payment_token, stripe_payment_intent_id').eq('id', id).single(),
        supabase.from('invoice_line_items').select('id, invoice_id, type, service_package_id, store_product_id, booking_id, custom_description, custom_price, quantity, vendor_id, stripe_account_id').eq('invoice_id', id),
        supabase.from('couples').select('id, partner1_name, partner2_name, email, phone'),
        supabase.from('vendors').select('id, name, user_id, phone, stripe_account_id'),
        supabase.from('users').select('id, email'),
        supabase.from('service_packages').select('id, name, price'),
        supabase.from('store_products').select('id, name, price'),
        supabase.from('bookings').select('id, couple_id, vendor_id, package_id, amount, initial_payment, service_type, event_id'),
        supabase.from('events').select('id, title, start_time'),
        supabase.from('vendor_service_packages').select('vendor_id, service_package_id, service_type'),
        supabase.from('payments').select('id, invoice_id, booking_id, amount, status, stripe_payment_id, to_platform, created_at, payment_type').or(`invoice_id.eq.${id},booking_id.in.(${lineItems.map(item => item.booking_id).filter(id => id).join(',')})`)
      ]);

      if (invoiceResponse.error) throw invoiceResponse.error;
      if (lineItemsResponse.error) throw lineItemsResponse.error;
      if (couplesResponse.error) throw couplesResponse.error;
      if (vendorsResponse.error) throw vendorsResponse.error;
      if (usersResponse.error) throw usersResponse.error;
      if (servicePackagesResponse.error) throw servicePackagesResponse.error;
      if (storeProductsResponse.error) throw storeProductsResponse.error;
      if (bookingsResponse.error) throw bookingsResponse.error;
      if (eventsResponse.error) throw eventsResponse.error;
      if (vendorServicePackagesResponse.error) throw vendorServicePackagesResponse.error;
      if (paymentsResponse.error) throw paymentsResponse.error;

      console.log('[InvoiceDetailsPage] Data fetched:', {
        invoice: invoiceResponse.data ? 1 : 0,
        lineItems: lineItemsResponse.data.length,
        couples: couplesResponse.data.length,
        vendors: vendorsResponse.data.length,
        servicePackages: servicePackagesResponse.data.length,
        storeProducts: storeProductsResponse.data.length,
        bookings: bookingsResponse.data.length,
        events: eventsResponse.data.length,
        vendorServicePackages: vendorServicePackagesResponse.data.length,
        payments: paymentsResponse.data.length
      });

      // Combine vendor email
      const vendorWithEmail = vendorsResponse.data.map((vendor: any) => {
        const user = usersResponse.data.find((u: any) => u.id === vendor.user_id);
        return {
          ...vendor,
          email: user ? user.email : '',
        };
      });

      // Combine invoice line items with related data
      const enrichedLineItems = lineItemsResponse.data.map((item: any) => {
        const booking = item.booking_id ? bookingsResponse.data.find((b: any) => b.id === item.booking_id) : null;
        const servicePackage = item.service_package_id ? servicePackagesResponse.data.find((sp: any) => sp.id === item.service_package_id) : null;
        const storeProduct = item.store_product_id ? storeProductsResponse.data.find((sp: any) => sp.id === item.store_product_id) : null;
        const vendor = item.vendor_id ? vendorWithEmail.find((v: any) => v.id === item.vendor_id) : null;
        const event = booking && booking.event_id ? eventsResponse.data.find((e: any) => e.id === booking.event_id) : null;

        return {
          ...item,
          service_package_name: servicePackage ? servicePackage.name : undefined,
          store_product_name: storeProduct ? storeProduct.name : undefined,
          vendor_name: vendor ? vendor.name : undefined,
          event_title: event ? event.title : undefined,
        };
      });

      const couple = invoiceResponse.data.couple_id ? couplesResponse.data.find((c: any) => c.id === invoiceResponse.data.couple_id) : null;
      const vendor = invoiceResponse.data.vendor_id ? vendorWithEmail.find((v: any) => v.id === invoiceResponse.data.vendor_id) : null;

      setInvoice({
        ...invoiceResponse.data,
        couple_name: couple ? `${couple.partner1_name} ${couple.partner2_name || ''}` : undefined,
        vendor_name: vendor ? vendor.name : undefined,
        invoice_line_items: enrichedLineItems,
      });
      setServerLineItems(enrichedLineItems);
      setCouples(couplesResponse.data || []);
      setVendors(vendorWithEmail);
      setServicePackages(servicePackagesResponse.data || []);
      setStoreProducts(storeProductsResponse.data || []);
      setBookings(bookingsResponse.data || []);
      setEvents(eventsResponse.data || []);
      setVendorServicePackages(vendorServicePackagesResponse.data || []);
      setPayments(paymentsResponse.data || []);
    } catch (error: any) {
      console.error('[InvoiceDetailsPage] Error fetching data:', JSON.stringify(error, null, 2));
      toast.error('Failed to load invoice');
      navigate('/dashboard/invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newLineItems = [...lineItems];
    const item = newLineItems[index];
    const validTypes = ['service_package', 'store_product', 'custom'];

    if (field === 'type' && !validTypes.includes(value)) {
      console.error('[InvoiceDetailsPage] Invalid line item type:', value);
      toast.error(`Invalid line item type: ${value}`);
      return;
    }

    if (field === 'service_package_id' && value) {
      const pkg = servicePackages.find(sp => sp.id === value);
      if (pkg) {
        item.custom_price = pkg.price || 0; // Ensure non-null
        item.stripe_account_id = undefined; // Payments for service packages go to platform
      }
    } else if (field === 'store_product_id' && value) {
      const product = storeProducts.find(sp => sp.id === value);
      if (product) {
        item.custom_price = product.price || 0; // Ensure non-null
        item.stripe_account_id = undefined; // Payments for store products go to platform
      }
    } else if (field === 'booking_id' && value) {
      const booking = bookings.find(b => b.id === value);
      if (booking) {
        const servicePackage = servicePackages.find(sp => sp.id === booking.package_id);
        item.type = 'service_package';
        item.custom_price = (depositPercentage > 0 ? booking.initial_payment : booking.amount) || servicePackage?.price || 0; // Fallback to service package price
        item.vendor_id = booking.vendor_id;
        item.stripe_account_id = vendors.find(v => v.id === booking.vendor_id)?.stripe_account_id || undefined;
        item.service_package_id = booking.package_id;
      }
    } else if (field === 'custom_price') {
      item.custom_price = parseInt(value, 10) * 100 || 0; // Ensure non-null
    }
    newLineItems[index] = { ...item, [field]: value };
    console.log('[InvoiceDetailsPage] Updated line item:', newLineItems[index]);
    setLineItems(newLineItems);
  };

  const removeLineItem = async (index: number) => {
    const itemToRemove = lineItems[index];
    console.log('[InvoiceDetailsPage] Removing line item at index:', index, itemToRemove);

    // If the item has an ID, delete it from the database
    if (itemToRemove.id) {
      try {
        console.log('[InvoiceDetailsPage] Deleting line item from database:', itemToRemove.id);
        const { error: deleteError } = await supabase
          .from('invoice_line_items')
          .delete()
          .eq('id', itemToRemove.id);
        if (deleteError) {
          console.error('[InvoiceDetailsPage] Line item delete error:', JSON.stringify(deleteError, null, 2));
          toast.error('Failed to delete line item: ' + deleteError.message);
          return;
        }
      } catch (error: any) {
        console.error('[InvoiceDetailsPage] Error deleting line item:', JSON.stringify(error, null, 2));
        toast.error('Failed to delete line item: ' + error.message);
        return;
      }
    }

    // Update local state to remove the item
    const newLineItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newLineItems);
    setServerLineItems(serverLineItems.filter(item => item.id !== itemToRemove.id));

    // Wait for state to update before saving
    setTimeout(async () => {
      await saveChanges(newLineItems);
    }, 0);
  };

  const addLineItem = (type: 'service_package' | 'store_product' | 'custom') => {
    if (type === 'service_package' && invoice?.recipient_type === 'couple' && lineItems.filter(item => item.type === 'service_package' && item.booking_id).length >= 3) {
      toast.error('Maximum of three booking-related line items per invoice');
      return;
    }
    const newLineItem: InvoiceLineItem = {
      type,
      service_package_id: type === 'service_package' ? '' : undefined,
      store_product_id: type === 'store_product' ? '' : undefined,
      custom_description: type === 'custom' ? '' : undefined,
      custom_price: 0, // Initialize with 0
      quantity: 1,
      stripe_account_id: undefined,
    };
    console.log('[InvoiceDetailsPage] Adding line item:', newLineItem);
    setLineItems([...lineItems, newLineItem]);
  };

  const saveLineItem = (index: number) => {
    const item = lineItems[index];
    if (!item) return;

    const validTypes = ['service_package', 'store_product', 'custom'];
    if (!validTypes.includes(item.type)) {
      console.error('[InvoiceDetailsPage] Invalid line item type:', item.type);
      toast.error(`Invalid line item type: ${item.type}`);
      return;
    }
    if (item.type === 'service_package' && !item.service_package_id && !item.booking_id) {
      toast.error('Please select a service package or booking for this line item');
      return;
    }
    if (item.type === 'store_product' && !item.store_product_id) {
      toast.error('Please select a store product for this line item');
      return;
    }
    if (item.type === 'custom' && (!item.custom_description || item.custom_price <= 0)) {
      toast.error('Please provide a description and valid price for this custom line item');
      return;
    }
    if (item.custom_price == null) {
      console.error('[InvoiceDetailsPage] Null custom_price detected:', item);
      toast.error('Price cannot be null for this line item');
      return;
    }

    saveChanges(lineItems);
  };

  const saveChanges = async (items: InvoiceLineItem[]) => {
    if (!invoice) return;

    // Validate line items
    const validTypes = ['service_package', 'store_product', 'custom'];
    for (const item of items) {
      if (!validTypes.includes(item.type)) {
        console.error('[InvoiceDetailsPage] Invalid line item type:', item.type);
        toast.error(`Invalid line item type: ${item.type}`);
        return;
      }
      if (item.type === 'service_package' && !item.service_package_id && !item.booking_id) {
        toast.error('Please select a service package or booking for all service package line items');
        return;
      }
      if (item.type === 'store_product' && !item.store_product_id) {
        toast.error('Please select a store product for all store product line items');
        return;
      }
      if (item.type === 'custom' && (!item.custom_description || item.custom_price <= 0)) {
        toast.error('Please provide a description and valid price for all custom line items');
        return;
      }
      if (item.custom_price == null) {
        console.error('[InvoiceDetailsPage] Null custom_price detected:', item);
        toast.error('Price cannot be null for any line item');
        return;
      }
    }

    const total = calculateTotal();
    const deposit = calculateDepositAmount();
    const otherPayments = calculateOtherPayments();
    const updates = {
      total_amount: total,
      remaining_balance: Math.max(total - deposit - otherPayments, 0),
      discount_amount: isDiscountPercentage ? 0 : discountAmount,
      discount_percentage: isDiscountPercentage ? discountPercentage : 0,
      deposit_amount: deposit,
    };

    try {
      console.log('[InvoiceDetailsPage] Saving changes with updates:', JSON.stringify(updates, null, 2));
      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);
      if (error) {
        console.error('[InvoiceDetailsPage] Invoice update error:', JSON.stringify(error, null, 2));
        throw error;
      }

      // Separate line items for upsert (existing) and insert (new)
      const upsertItems = items
        .filter(item => item.id)
        .map(item => ({
          id: item.id,
          invoice_id: id,
          type: item.type,
          service_package_id: item.service_package_id,
          store_product_id: item.store_product_id,
          booking_id: item.booking_id,
          custom_description: item.custom_description,
          custom_price: item.custom_price,
          quantity: item.quantity,
          vendor_id: item.vendor_id,
          stripe_account_id: item.stripe_account_id || null,
        }));
      const insertItems = items
        .filter(item => !item.id)
        .map(item => ({
          invoice_id: id,
          type: item.type,
          service_package_id: item.service_package_id,
          store_product_id: item.store_product_id,
          booking_id: item.booking_id,
          custom_description: item.custom_description,
          custom_price: item.custom_price,
          quantity: item.quantity,
          vendor_id: item.vendor_id,
          stripe_account_id: item.stripe_account_id || null,
        }));

      // Perform upsert for existing items
      if (upsertItems.length > 0) {
        console.log('[InvoiceDetailsPage] Upserting line items:', JSON.stringify(upsertItems, null, 2));
        const { error: upsertError } = await supabase
          .from('invoice_line_items')
          .upsert(upsertItems, { onConflict: 'id' });
        if (upsertError) {
          console.error('[InvoiceDetailsPage] Line items upsert error:', JSON.stringify(upsertError, null, 2));
          throw upsertError;
        }
      }

      // Perform insert for new items
      if (insertItems.length > 0) {
        console.log('[InvoiceDetailsPage] Inserting line items:', JSON.stringify(insertItems, null, 2));
        const { error: insertError } = await supabase
          .from('invoice_line_items')
          .insert(insertItems);
        if (insertError) {
          console.error('[InvoiceDetailsPage] Line items insert error:', JSON.stringify(insertError, null, 2));
          throw insertError;
        }
      }

      toast.success('Changes saved successfully!');
      fetchData();
    } catch (error: any) {
      console.error('[InvoiceDetailsPage] Error saving changes:', JSON.stringify(error, null, 2));
      toast.error('Failed to save changes: ' + error.message);
    }
  };

  const handlePaymentEntry = async (payment: { amount: number; status: string; payment_type: string; created_at: string }) => {
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          invoice_id: id,
          amount: payment.amount,
          status: payment.status,
          payment_type: payment.payment_type,
          created_at: payment.created_at,
          to_platform: true,
        });
      if (error) {
        console.error('[InvoiceDetailsPage] Payment insert error:', JSON.stringify(error, null, 2));
        throw error;
      }
      toast.success('Payment recorded successfully!');
      fetchData();
    } catch (error: any) {
      console.error('[InvoiceDetailsPage] Error recording payment:', JSON.stringify(error, null, 2));
      toast.error('Failed to record payment: ' + error.message);
    }
  };

  const copyInvoiceLink = () => {
    if (!invoice?.payment_token) {
      toast.error('No payment token available');
      return;
    }
    const link = `https://app.bremembered.io/invoice-payment/${invoice.payment_token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invoice link copied to clipboard!');
  };

  const sendInvoiceEmail = async () => {
    if (!invoice?.id) {
      toast.error('No invoice selected');
      return;
    }
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ invoice_id: invoice.id }),
        }
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);
      if (updateError) throw updateError;

      const recipientEmail = invoice.recipient_type === 'couple' ? couples.find(c => c.id === invoice.couple_id)?.email : vendors.find(v => v.id === invoice.vendor_id)?.email;
      toast.success(`Invoice email sent to ${recipientEmail}`);
      fetchData();
    } catch (err) {
      console.error('[InvoiceDetailsPage] Error sending invoice email:', JSON.stringify(err, null, 2));
      toast.error('Failed to send invoice email');
    }
  };

  const getBookingDetails = (bookingId: string | undefined) => {
    if (!bookingId) return null;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return null;
    const servicePackage = servicePackages.find(sp => sp.id === booking.package_id);
    const vendor = vendors.find(v => v.id === booking.vendor_id);
    const event = events.find(e => e.id === booking.event_id);
    const bookingPayments = payments
      .filter(payment => payment.booking_id === bookingId && payment.status === 'succeeded')
      .map(payment => ({
        amount: payment.amount,
        payment_type: payment.payment_type || 'Payment',
        created_at: payment.created_at
      }));
    return {
      packageName: servicePackage?.name || booking.service_type,
      packagePrice: servicePackage?.price ? (servicePackage.price / 100).toFixed(2) : 'N/A',
      vendorName: vendor?.name || 'N/A',
      vendorEmail: vendor?.email || 'N/A',
      vendorPhone: vendor?.phone || 'N/A',
      stripeAccountId: vendor?.stripe_account_id || 'N/A',
      eventTitle: event?.title || 'N/A',
      payments: bookingPayments
    };
  };

  const calculateTotal = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.custom_price || 0) * item.quantity, 0);
    const discount = isDiscountPercentage ? (subtotal * discountPercentage) / 100 : discountAmount;
    return subtotal - (discount > subtotal ? subtotal : discount);
  };

  const calculateDiscount = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.custom_price || 0) * item.quantity, 0);
    const discount = isDiscountPercentage ? (subtotal * discountPercentage) / 100 : discountAmount;
    return discount > subtotal ? subtotal : discount;
  };

  const calculateDepositAmount = () => {
    return payments
      .filter(payment => payment.status === 'succeeded' && payment.payment_type === 'deposit')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  const calculateOtherPayments = () => {
    return payments
      .filter(payment => payment.status === 'succeeded' && payment.payment_type !== 'deposit')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <p className="text-red-600">Invoice not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Invoice Details: {invoice.id}
        </h1>
        <button
          onClick={() => navigate('/dashboard/invoices')}
          className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
        >
          Back to Invoices
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h2>
            <div className="space-y-2">
              <p><strong>Status:</strong> <span className={`px-2 py-1 text-xs font-medium rounded-full ${invoice.status === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{invoice.status}</span></p>
              <p><strong>Total Amount:</strong> ${(invoice.total_amount / 100).toFixed(2)}</p>
              <p><strong>Remaining Balance:</strong> ${(invoice.remaining_balance / 100).toFixed(2)}</p>
              {invoice.paid_at && <p><strong>Paid At:</strong> {new Date(invoice.paid_at).toLocaleDateString()}</p>}
              {invoice.payment_token && (
                <p>
                  <strong>Payment Link:</strong>{' '}
                  <a
                    href={`https://app.bremembered.io/invoice-payment/${invoice.payment_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    https://app.bremembered.io/invoice-payment/{invoice.payment_token}
                  </a>
                </p>
              )}
              {payments.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Payments</h3>
                  {payments.map(payment => (
                    <p key={payment.id} className="text-sm text-gray-600">
                      {payment.payment_type || 'Payment'} of ${(payment.amount / 100).toFixed(2)} ({payment.status}) on {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col justify-between">
            <div>
              {invoice.couple_name && (
                <div className="mb-4">
                  <h3 className="text-md font-medium text-gray-900">Couple Information</h3>
                  <p><strong>Name:</strong> {invoice.couple_name}</p>
                  <p><strong>Email:</strong> {couples.find(c => c.id === invoice.couple_id)?.email || 'N/A'}</p>
                  <p><strong>Phone:</strong> {couples.find(c => c.id === invoice.couple_id)?.phone || 'N/A'}</p>
                </div>
              )}
              {invoice.vendor_name && (
                <div>
                  <h3 className="text-md font-medium text-gray-900">Vendor Information</h3>
                  <p><strong>Name:</strong> {invoice.vendor_name}</p>
                  <p><strong>Email:</strong> {vendors.find(v => v.id === invoice.vendor_id)?.email || 'N/A'}</p>
                  <p><strong>Phone:</strong> {vendors.find(v => v.id === invoice.vendor_id)?.phone || 'N/A'}</p>
                </div>
              )}
            </div>
            {invoice.status !== 'paid' && (
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="h-4 w-4 mr-1 inline" /> Take Payment
                </button>
                <button
                  onClick={() => setIsPaymentEntryModalOpen(true)}
                  className="px-3 py-1 border border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50 text-sm"
                >
                  <Plus className="h-4 w-4 mr-1 inline" /> Enter Payment
                </button>
                <button
                  onClick={copyInvoiceLink}
                  className="px-3 py-1 border border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50 text-sm"
                >
                  <Copy className="h-4 w-4 mr-1 inline" /> Copy Payment Link
                </button>
                <button
                  onClick={sendInvoiceEmail}
                  className="px-3 py-1 border border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50 text-sm"
                >
                  <Mail className="h-4 w-4 mr-1 inline" /> Send Email
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h2>
          <div className="grid grid-cols-12 gap-4 mb-2 text-sm font-medium text-gray-700">
            <div className="col-span-3">Type</div>
            <div className="col-span-4">Item</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-1"></div>
          </div>
          {lineItems.map((item, index) => (
            <div key={item.id || `new-${index}`} className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3">
                  <select
                    value={item.type}
                    onChange={(e) => updateLineItem(index, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {invoice.recipient_type === 'couple' && <option value="service_package">Booking</option>}
                    <option value="service_package">Service Package</option>
                    <option value="store_product">Store Product</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="col-span-4">
                  {item.type === 'service_package' && invoice.recipient_type === 'couple' && (
                    <select
                      value={item.booking_id || ''}
                      onChange={(e) => updateLineItem(index, 'booking_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Booking</option>
                      {bookings
                        .filter(b => b.couple_id === invoice.couple_id)
                        .filter(b => vendorServicePackages.some(vsp => vsp.vendor_id === b.vendor_id && vsp.service_package_id === b.package_id))
                        .map(booking => {
                          const event = events.find(e => e.id === booking.event_id);
                          const servicePackage = servicePackages.find(sp => sp.id === booking.package_id);
                          return (
                            <option key={booking.id} value={booking.id}>
                              {servicePackage?.name || booking.service_type} by {vendors.find(v => v.id === booking.vendor_id)?.name || 'N/A'} - {event?.title || 'Event'} ($
                              {(servicePackage?.price || booking.amount || 0) / 100}
                              )
                            </option>
                          );
                        })}
                    </select>
                  )}
                  {item.type === 'service_package' && invoice.recipient_type === 'vendor' && (
                    <select
                      value={item.service_package_id || ''}
                      onChange={(e) => updateLineItem(index, 'service_package_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Package</option>
                      {servicePackages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} (${(pkg.price / 100).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  )}
                  {item.type === 'store_product' && (
                    <select
                      value={item.store_product_id || ''}
                      onChange={(e) => updateLineItem(index, 'store_product_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Product</option>
                      {storeProducts.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} (${(product.price / 100).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  )}
                  {item.type === 'custom' && (
                    <input
                      type="text"
                      value={item.custom_description || ''}
                      onChange={(e) => updateLineItem(index, 'custom_description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                    placeholder="Qty"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={(item.custom_price / 100) || 0}
                    onChange={(e) => updateLineItem(index, 'custom_price', parseInt(e.target.value, 10) * 100 || 0)}
                    placeholder="Price ($)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-1 flex space-x-2">
                  <button
                    onClick={() => saveLineItem(index)}
                    className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeLineItem(index)}
                    className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {item.booking_id && getBookingDetails(item.booking_id) && (
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>Package Name:</strong> {getBookingDetails(item.booking_id)?.packageName}</p>
                  <p><strong>Package Price:</strong> ${getBookingDetails(item.booking_id)?.packagePrice}</p>
                  <p><strong>Vendor Name:</strong> {getBookingDetails(item.booking_id)?.vendorName}</p>
                  <p><strong>Vendor Email:</strong> {getBookingDetails(item.booking_id)?.vendorEmail}</p>
                  <p><strong>Vendor Phone:</strong> {getBookingDetails(item.booking_id)?.vendorPhone}</p>
                  <p><strong>Stripe Account ID:</strong> {getBookingDetails(item.booking_id)?.stripeAccountId}</p>
                  <p><strong>Event:</strong> {getBookingDetails(item.booking_id)?.eventTitle}</p>
                  {getBookingDetails(item.booking_id)?.payments.length > 0 && (
                    <div className="mt-2">
                      <p><strong>Booking Payments:</strong></p>
                      {getBookingDetails(item.booking_id)?.payments.map(payment => (
                        <p key={payment.created_at} className="text-sm text-gray-500">
                          {payment.payment_type} of ${(payment.amount / 100).toFixed(2)} on {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => addLineItem('custom')}
            className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Line Item
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!isDiscountPercentage}
                  onChange={() => {
                    setIsDiscountPercentage(false);
                    setDiscountPercentage(0);
                  }}
                  className="mr-1"
                />
                Dollar
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={isDiscountPercentage}
                  onChange={() => {
                    setIsDiscountPercentage(true);
                    setDiscountAmount(0);
                  }}
                  className="mr-1"
                />
                Percentage
              </label>
              <input
                type="number"
                value={isDiscountPercentage ? discountPercentage : discountAmount / 100 || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10) || 0;
                  if (isDiscountPercentage) setDiscountPercentage(value);
                  else setDiscountAmount(value * 100);
                }}
                placeholder={isDiscountPercentage ? 'Percentage (%)' : 'Amount ($)'}
                className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit</label>
            <input
              type="number"
              value={depositPercentage}
              onChange={(e) => setDepositPercentage(parseInt(e.target.value, 10) || 0)}
              placeholder="Percentage (%)"
              className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium">Subtotal: ${(lineItems.reduce((sum, item) => sum + (item.custom_price || 0) * item.quantity, 0) / 100).toFixed(2)}</p>
          <p className="text-sm font-medium">Discount: ${(calculateDiscount() / 100).toFixed(2)}</p>
          <p className="text-sm font-medium">Deposit: ${(calculateDepositAmount() / 100).toFixed(2)}</p>
          <p className="text-sm font-medium">Payments: ${(calculateOtherPayments() / 100).toFixed(2)}</p>
          <p className="text-sm font-medium text-gray-900">Total Due: ${((calculateTotal() - calculateDepositAmount() - calculateOtherPayments()) / 100).toFixed(2)}</p>
        </div>

        <button
          onClick={() => saveChanges(lineItems)}
          className="mt-4 inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Save className="h-4 w-4 mr-1" /> Save Changes
        </button>
      </div>

      <TakePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentTaken={fetchData}
      />
      <PaymentEntryModal
        isOpen={isPaymentEntryModalOpen}
        onClose={() => setIsPaymentEntryModalOpen(false)}
        onSave={handlePaymentEntry}
      />
    </div>
  );
}