import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Plus, Trash2, Search, Eye, Copy, Mail, Save } from 'lucide-react';
import toast from 'react-hot-toast';

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
  payment_token?: string;
  couple_name?: string;
  vendor_name?: string;
  invoice_line_items?: InvoiceLineItem[];
}

export default function InvoicePage() {
  const navigate = useNavigate();
  const [couples, setCouples] = useState<Couple[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [vendorServicePackages, setVendorServicePackages] = useState<VendorServicePackage[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [recipientType, setRecipientType] = useState<'couple' | 'vendor'>('couple');
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [depositPercentage, setDepositPercentage] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDiscountPercentage, setIsDiscountPercentage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('sent'); // Default to 'sent'
  const [recipientSearch, setRecipientSearch] = useState<string>(''); // Search term for recipient dropdown
  const recipientDropdownRef = useRef<HTMLDivElement>(null); // Ref for dropdown click-outside handling

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(event.target as Node)) {
        setRecipientSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('[InvoicePage] Fetching data...');
      const [
        couplesResponse,
        vendorsResponse,
        usersResponse,
        servicePackagesResponse,
        storeProductsResponse,
        bookingsResponse,
        eventsResponse,
        vendorServicePackagesResponse,
        invoicesResponse,
        lineItemsResponse
      ] = await Promise.all([
        supabase.from('couples').select('id, partner1_name, partner2_name, email, phone'),
        supabase.from('vendors').select('id, name, user_id, phone, stripe_account_id'),
        supabase.from('users').select('id, email'),
        supabase.from('service_packages').select('id, name, price'),
        supabase.from('store_products').select('id, name, price'),
        supabase.from('bookings').select('id, couple_id, vendor_id, package_id, amount, initial_payment, service_type, event_id'),
        supabase.from('events').select('id, title, start_time'),
        supabase.from('vendor_service_packages').select('vendor_id, service_package_id, service_type'),
        supabase.from('invoices').select('id, recipient_type, couple_id, vendor_id, total_amount, remaining_balance, discount_amount, discount_percentage, deposit_amount, status, paid_at, payment_token'),
        supabase.from('invoice_line_items').select('id, invoice_id, type, service_package_id, store_product_id, booking_id, custom_description, custom_price, quantity, vendor_id, stripe_account_id')
      ]);

      if (couplesResponse.error) throw couplesResponse.error;
      if (vendorsResponse.error) throw vendorsResponse.error;
      if (usersResponse.error) throw usersResponse.error;
      if (servicePackagesResponse.error) throw servicePackagesResponse.error;
      if (storeProductsResponse.error) throw storeProductsResponse.error;
      if (bookingsResponse.error) throw bookingsResponse.error;
      if (eventsResponse.error) throw eventsResponse.error;
      if (vendorServicePackagesResponse.error) throw vendorServicePackagesResponse.error;
      if (invoicesResponse.error) throw invoicesResponse.error;
      if (lineItemsResponse.error) throw lineItemsResponse.error;

      console.log('[InvoicePage] Data fetched:', {
        couples: couplesResponse.data.length,
        vendors: vendorsResponse.data.length,
        servicePackages: servicePackagesResponse.data.length,
        storeProducts: storeProductsResponse.data.length,
        bookings: bookingsResponse.data.length,
        events: eventsResponse.data.length,
        vendorServicePackages: vendorServicePackagesResponse.data.length,
        invoices: invoicesResponse.data.length,
        lineItems: lineItemsResponse.data.length
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
      const enrichedInvoices = invoicesResponse.data.map((invoice: any) => {
        const invoiceLineItems = lineItemsResponse.data
          .filter((item: any) => item.invoice_id === invoice.id)
          .map((item: any) => {
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

        const couple = invoice.couple_id ? couplesResponse.data.find((c: any) => c.id === invoice.couple_id) : null;
        const vendor = invoice.vendor_id ? vendorWithEmail.find((v: any) => v.id === invoice.vendor_id) : null;

        return {
          ...invoice,
          couple_name: couple ? `${couple.partner1_name} ${couple.partner2_name || ''}` : undefined,
          vendor_name: vendor ? vendor.name : undefined,
          invoice_line_items: invoiceLineItems,
        };
      });

      setCouples(couplesResponse.data || []);
      setVendors(vendorWithEmail);
      setServicePackages(servicePackagesResponse.data || []);
      setStoreProducts(storeProductsResponse.data || []);
      setBookings(bookingsResponse.data || []);
      setEvents(eventsResponse.data || []);
      setVendorServicePackages(vendorServicePackagesResponse.data || []);
      setInvoices(enrichedInvoices);
    } catch (error: any) {
      console.error('[InvoicePage] Error fetching data:', JSON.stringify(error, null, 2));
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const addLineItem = () => {
    if (recipientType === 'couple' && lineItems.filter(item => item.type === 'service_package' && item.booking_id).length >= 3) {
      toast.error('Maximum of three booking-related line items per invoice');
      return;
    }
    const newLineItem: InvoiceLineItem = {
      type: recipientType === 'couple' ? 'service_package' : 'custom',
      custom_description: '',
      custom_price: 0,
      quantity: 1,
      stripe_account_id: undefined,
    };
    console.log('[InvoicePage] Adding line item:', newLineItem);
    setLineItems([...lineItems, newLineItem]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newLineItems = [...lineItems];
    const item = newLineItems[index];
    const validTypes = ['service_package', 'store_product', 'custom'];

    if (field === 'type' && !validTypes.includes(value)) {
      console.error('[InvoicePage] Invalid line item type:', value);
      toast.error(`Invalid line item type: ${value}`);
      return;
    }

    if (field === 'service_package_id' && value) {
      const pkg = servicePackages.find(sp => sp.id === value);
      if (pkg) {
        item.custom_price = pkg.price;
        item.stripe_account_id = undefined; // Payments for service packages go to platform
      }
    } else if (field === 'store_product_id' && value) {
      const product = storeProducts.find(sp => sp.id === value);
      if (product) {
        item.custom_price = product.price;
        item.stripe_account_id = undefined; // Payments for store products go to platform
      }
    } else if (field === 'booking_id' && value) {
      const booking = bookings.find(b => b.id === value);
      if (booking) {
        item.type = 'service_package'; // Bookings are treated as service packages
        item.custom_price = depositPercentage > 0 ? booking.initial_payment : booking.amount;
        item.vendor_id = booking.vendor_id;
        item.stripe_account_id = vendors.find(v => v.id === booking.vendor_id)?.stripe_account_id || undefined;
        item.service_package_id = booking.package_id;
      }
    }
    newLineItems[index] = { ...item, [field]: value };
    console.log('[InvoicePage] Updated line item:', newLineItems[index]);
    setLineItems(newLineItems);
  };

  const removeLineItem = (index: number) => {
    console.log('[InvoicePage] Removing line item at index:', index);
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.custom_price || 0) * item.quantity, 0);
    const discount = isDiscountPercentage ? (subtotal * discountPercentage) / 100 : discountAmount;
    return subtotal - (discount > subtotal ? subtotal : discount);
  };

  const calculateDeposit = () => {
    const total = calculateTotal();
    return depositPercentage ? (total * depositPercentage) / 100 : 0;
  };

  const handleSaveInvoice = async () => {
    if (!recipientType || !recipientId || lineItems.length === 0) {
      toast.error('Please select a recipient and add at least one line item');
      return;
    }

    // Validate line items
    const validTypes = ['service_package', 'store_product', 'custom'];
    for (const item of lineItems) {
      if (!validTypes.includes(item.type)) {
        console.error('[InvoicePage] Invalid line item type:', item.type);
        toast.error(`Invalid line item type: ${item.type}`);
        return;
      }
      if (item.type === 'service_package' && !item.service_package_id) {
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
    }

    const total = calculateTotal();
    const deposit = calculateDeposit();
    const newInvoice = {
      recipient_type: recipientType,
      couple_id: recipientType === 'couple' ? recipientId : null,
      vendor_id: recipientType === 'vendor' ? recipientId : null,
      total_amount: total,
      remaining_balance: total - deposit,
      discount_amount: isDiscountPercentage ? 0 : discountAmount,
      discount_percentage: isDiscountPercentage ? discountPercentage : 0,
      deposit_amount: deposit,
      status: 'draft',
    };

    try {
      console.log('[InvoicePage] Creating invoice with data:', JSON.stringify(newInvoice, null, 2));
      const { data, error } = await supabase
        .from('invoices')
        .insert(newInvoice)
        .select('*, payment_token')
        .single();
      if (error) {
        console.error('[InvoicePage] Invoice insert error:', JSON.stringify(error, null, 2));
        throw error;
      }

      const lineItemsData = lineItems.map(item => ({
        invoice_id: data.id,
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
      console.log('[InvoicePage] Inserting line items:', JSON.stringify(lineItemsData, null, 2));
      const { error: lineItemsError } = await supabase.from('invoice_line_items').insert(lineItemsData);
      if (lineItemsError) {
        console.error('[InvoicePage] Line items insert error:', JSON.stringify(lineItemsError, null, 2));
        throw lineItemsError;
      }

      toast.success('Invoice created successfully!');
      setLineItems([]);
      setRecipientType('couple');
      setRecipientId(null);
      setDiscountAmount(0);
      setDiscountPercentage(0);
      setDepositPercentage(0);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('[InvoicePage] Error saving invoice:', JSON.stringify(error, null, 2));
      toast.error('Failed to create invoice: ' + error.message);
    }
  };

  const copyInvoiceLink = async (paymentToken: string) => {
    const link = `https://app.bremembered.io/invoice-payment/${paymentToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Invoice link copied to clipboard!');
  };

  const sendInvoiceEmail = async (invoice: Invoice) => {
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
      console.error('[InvoicePage] Error sending invoice email:', JSON.stringify(err, null, 2));
      toast.error('Failed to send invoice email');
    }
  };

  const filteredInvoices = invoices
    .filter(invoice => {
      const matchesSearch = (invoice.recipient_type === 'couple' && invoice.couple_name
        ? invoice.couple_name.toLowerCase().includes(searchTerm.toLowerCase())
        : invoice.recipient_type === 'vendor' && invoice.vendor_name
        ? invoice.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
        : false) ||
        invoice.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => b.total_amount - a.total_amount); // Sort by total_amount descending

  const getBookingDetails = (bookingId: string | undefined) => {
    if (!bookingId) return null;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return null;
    const servicePackage = servicePackages.find(sp => sp.id === booking.package_id);
    const vendor = vendors.find(v => v.id === booking.vendor_id);
    const event = events.find(e => e.id === booking.event_id);
    return {
      packageName: servicePackage?.name || booking.service_type,
      packagePrice: servicePackage?.price ? (servicePackage.price / 100).toFixed(2) : 'N/A',
      vendorName: vendor?.name || 'N/A',
      vendorEmail: vendor?.email || 'N/A',
      vendorPhone: vendor?.phone || 'N/A',
      stripeAccountId: vendor?.stripe_account_id || 'N/A',
      eventTitle: event?.title || 'N/A',
    };
  };

  const filteredRecipients = recipientType === 'couple'
    ? couples.filter(c => !recipientSearch || `${c.partner1_name} ${c.partner2_name || ''}`.toLowerCase().includes(recipientSearch.toLowerCase()))
    : vendors.filter(v => !recipientSearch || `${v.name} (${v.email})`.toLowerCase().includes(recipientSearch.toLowerCase()));

  const selectedRecipient = recipientType === 'couple'
    ? couples.find(c => c.id === recipientId)
    : vendors.find(v => v.id === recipientId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Invoices
        </h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Existing Invoices ({filteredInvoices.length})</h2>
          <div className="flex items-center space-x-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoices..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500">Create a new invoice to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.recipient_type === 'couple' && invoice.couple_name
                        ? invoice.couple_name
                        : invoice.recipient_type === 'vendor' && invoice.vendor_name
                        ? invoice.vendor_name
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(invoice.total_amount / 100).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(invoice.remaining_balance / 100).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          invoice.status === 'paid' ? 'bg-blue-100 text-blue-800' : invoice.status === 'sent' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        to={`/dashboard/invoices/${invoice.id}`}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 mr-2"
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Link>
                      {invoice.status !== 'paid' && invoice.payment_token && (
                        <>
                          <button
                            onClick={() => copyInvoiceLink(invoice.payment_token!)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 mr-2"
                          >
                            <Copy className="h-4 w-4 mr-1" /> Copy Link
                          </button>
                          <button
                            onClick={() => sendInvoiceEmail(invoice)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            <Mail className="h-4 w-4 mr-1" /> Send Email
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Transition appear show={isCreateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCreateModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Create New Invoice
                  </Dialog.Title>
                  <div className="mt-2 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Type</label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={recipientType === 'couple'}
                            onChange={() => {
                              setRecipientType('couple');
                              setRecipientId(null);
                              setRecipientSearch('');
                              setLineItems([]);
                            }}
                            className="mr-1"
                          />
                          Couple
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={recipientType === 'vendor'}
                            onChange={() => {
                              setRecipientType('vendor');
                              setRecipientId(null);
                              setRecipientSearch('');
                              setLineItems([]);
                            }}
                            className="mr-1"
                          />
                          Vendor
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select {recipientType === 'couple' ? 'Couple' : 'Vendor'}
                      </label>
                      <div className="relative" ref={recipientDropdownRef}>
                        <input
                          type="text"
                          value={recipientSearch}
                          onChange={(e) => setRecipientSearch(e.target.value)}
                          placeholder={`Search ${recipientType === 'couple' ? 'couples' : 'vendors'}...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onFocus={() => setRecipientSearch('')} // Clear search when focusing to show all options
                        />
                        {recipientSearch !== '' && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-auto">
                            {filteredRecipients.map(recipient => (
                              <div
                                key={recipient.id}
                                onClick={() => {
                                  setRecipientId(recipient.id);
                                  setRecipientSearch(recipientType === 'couple' ? `${recipient.partner1_name} ${recipient.partner2_name || ''}` : `${recipient.name} (${recipient.email})`);
                                }}
                                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                              >
                                {recipientType === 'couple'
                                  ? `${recipient.partner1_name} ${recipient.partner2_name || ''}`
                                  : `${recipient.name} (${recipient.email})`}
                              </div>
                            ))}
                          </div>
                        )}
                        {recipientId && !recipientSearch && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                            <div
                              onClick={() => {
                                setRecipientId(null);
                                setRecipientSearch('');
                              }}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              {selectedRecipient
                                ? recipientType === 'couple'
                                  ? `${selectedRecipient.partner1_name} ${selectedRecipient.partner2_name || ''}`
                                  : `${selectedRecipient.name} (${selectedRecipient.email})`
                                : 'Select a recipient'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Line Items</h3>
                      {lineItems.map((item, index) => (
                        <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <select
                              value={item.type}
                              onChange={(e) => updateLineItem(index, 'type', e.target.value)}
                              className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {recipientType === 'couple' && <option value="service_package">Booking</option>}
                              <option value="service_package">Service Package</option>
                              <option value="store_product">Store Product</option>
                              <option value="custom">Custom</option>
                            </select>
                            {item.type === 'service_package' && recipientType === 'couple' && (
                              <select
                                value={item.booking_id || ''}
                                onChange={(e) => updateLineItem(index, 'booking_id', e.target.value)}
                                className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Booking</option>
                                {bookings
                                  .filter(b => b.couple_id === recipientId)
                                  .filter(b => vendorServicePackages.some(vsp => vsp.vendor_id === b.vendor_id && vsp.service_package_id === b.package_id))
                                  .map(booking => {
                                    const event = events.find(e => e.id === booking.event_id);
                                    const servicePackage = servicePackages.find(sp => sp.id === booking.package_id);
                                    return (
                                      <option key={booking.id} value={booking.id}>
                                        {servicePackage?.name || booking.service_type} by {vendors.find(v => v.id === booking.vendor_id)?.name || 'N/A'} - {event?.title || 'Event'} ($
                                        {(depositPercentage > 0 ? booking.initial_payment : booking.amount) / 100}
                                        )
                                      </option>
                                    );
                                  })}
                              </select>
                            )}
                            {item.type === 'service_package' && recipientType === 'vendor' && (
                              <select
                                value={item.service_package_id || ''}
                                onChange={(e) => updateLineItem(index, 'service_package_id', e.target.value)}
                                className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              <>
                                <input
                                  type="text"
                                  value={item.custom_description || ''}
                                  onChange={(e) => updateLineItem(index, 'custom_description', e.target.value)}
                                  placeholder="Description"
                                  className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                  type="number"
                                  value={item.custom_price / 100 || 0}
                                  onChange={(e) => updateLineItem(index, 'custom_price', parseInt(e.target.value, 10) * 100 || 0)}
                                  placeholder="Price ($)"
                                  className="w-1/6 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </>
                            )}
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                              placeholder="Qty"
                              className="w-1/6 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => removeLineItem(index)}
                              className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addLineItem}
                        className="mt-2 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Line Item
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium">Subtotal: ${(calculateTotal() / 100).toFixed(2)}</p>
                      <p className="text-sm font-medium">Deposit: ${(calculateDeposit() / 100).toFixed(2)}</p>
                      <p className="text-sm font-medium text-gray-900">Total Due: ${((calculateTotal() - calculateDeposit()) / 100).toFixed(2)}</p>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={handleSaveInvoice}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                      >
                        <Save className="h-5 w-5 mr-2" /> Create Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}