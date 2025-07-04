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
  email: string | null;
  phone: string;
  user_id: string;
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

interface InvoiceLineItem {
  id?: string;
  type: 'service_package' | 'store_product' | 'custom';
  service_package_id?: string;
  store_product_id?: string;
  custom_description?: string;
  custom_price: number;
  quantity: number;
}

interface Invoice {
  id: string;
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
  couples?: Couple;
  vendors?: Vendor;
  invoice_line_items?: InvoiceLineItem[];
}

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [depositPercentage, setDepositPercentage] = useState<number>(0);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDiscountPercentage, setIsDiscountPercentage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
    fetchSupportingData();
  }, [id]);

  useEffect(() => {
    if (invoice) {
      setLineItems(invoice.invoice_line_items || []);
      setDiscountAmount(invoice.discount_amount || 0);
      setDiscountPercentage(invoice.discount_percentage || 0);
      setDepositPercentage((invoice.deposit_amount / (invoice.total_amount || 1)) * 100 || 0);
      setIsDiscountPercentage(invoice.discount_percentage > 0);
    }
  }, [invoice]);

  const fetchInvoice = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching invoice for id:', id);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          couples(partner1_name, partner2_name, email, phone),
          vendors(name, phone, user_id),
          invoice_line_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const { data: usersData, error: usersError } = await supabase.from('users').select('id, email');
      if (usersError) throw usersError;
      setUsers(usersData || []);

      const vendorWithEmail = data.vendors
        ? { ...data.vendors, email: usersData.find(u => u.id === data.vendors.user_id)?.email || null }
        : null;

      console.log('Invoice data:', data);
      setInvoice({ ...data, vendors: vendorWithEmail });
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
      navigate('/dashboard/invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupportingData = async () => {
    try {
      console.log('Fetching supporting data');
      const [servicePackagesResponse, storeProductsResponse] = await Promise.all([
        supabase.from('service_packages').select('id, name, price'),
        supabase.from('store_products').select('id, name, price'),
      ]);

      if (servicePackagesResponse.error) throw servicePackagesResponse.error;
      if (storeProductsResponse.error) throw storeProductsResponse.error;

      console.log('Service packages:', servicePackagesResponse.data);
      console.log('Store products:', storeProductsResponse.data);
      setServicePackages(servicePackagesResponse.data || []);
      setStoreProducts(storeProductsResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching supporting data:', error);
      toast.error('Failed to load supporting data');
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newLineItems = [...lineItems];
    const item = newLineItems[index];
    if (field === 'service_package_id' && value) {
      const pkg = servicePackages.find(sp => sp.id === value);
      if (pkg) item.custom_price = pkg.price;
    } else if (field === 'store_product_id' && value) {
      const product = storeProducts.find(sp => sp.id === value);
      if (product) item.custom_price = product.price;
    }
    newLineItems[index] = { ...item, [field]: value };
    setLineItems(newLineItems);
    saveChanges();
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
    saveChanges();
  };

  const addLineItem = (type: 'service_package' | 'store_product' | 'custom') => {
    setLineItems([...lineItems, {
      type,
      service_package_id: type === 'service_package' ? '' : undefined,
      store_product_id: type === 'store_product' ? '' : undefined,
      custom_description: type === 'custom' ? '' : undefined,
      custom_price: 0,
      quantity: 1,
    }]);
    saveChanges();
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

  const saveChanges = async () => {
    const total = calculateTotal();
    const deposit = calculateDeposit();
    const updates = {
      total_amount: total,
      remaining_balance: total - deposit,
      discount_amount: isDiscountPercentage ? 0 : discountAmount,
      discount_percentage: isDiscountPercentage ? discountPercentage : 0,
      deposit_amount: deposit,
    };

    try {
      console.log('Saving changes with updates:', updates);
      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .upsert(lineItems.map(item => ({ ...item, invoice_id: id })), { onConflict: 'id' });
      if (lineItemsError) throw lineItemsError;

      toast.success('Changes saved successfully!');
      fetchInvoice();
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
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
      toast.success(`Invoice email sent to ${invoice.couples?.email}`);
    } catch (err) {
      console.error('Error sending invoice email:', err);
      toast.error('Failed to send invoice email');
    }
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
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
            </div>
          </div>
          <div className="flex flex-col justify-between">
            <div>
              {invoice.couples && (
                <div className="mb-4">
                  <h3 className="text-md font-medium text-gray-900">Couple Information</h3>
                  <p><strong>Name:</strong> {invoice.couples.partner1_name} {invoice.couples.partner2_name || ''}</p>
                  <p><strong>Email:</strong> {invoice.couples.email}</p>
                  <p><strong>Phone:</strong> {invoice.couples.phone}</p>
                </div>
              )}
              {invoice.vendors && (
                <div>
                  <h3 className="text-md font-medium text-gray-900">Vendor Information</h3>
                  <p><strong>Name:</strong> {invoice.vendors.name}</p>
                  <p><strong>Email:</strong> {invoice.vendors.email || 'Not available'}</p>
                  <p><strong>Phone:</strong> {invoice.vendors.phone}</p>
                </div>
              )}
            </div>
            {invoice.status !== 'paid' && (
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2 inline" /> Take Payment
                </button>
                <button
                  onClick={copyInvoiceLink}
                  className="px-4 py-2 border border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50"
                >
                  <Copy className="h-4 w-4 mr-2 inline" /> Copy Payment Link
                </button>
                <button
                  onClick={sendInvoiceEmail}
                  className="px-4 py-2 border border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50"
                >
                  <Mail className="h-4 w-4 mr-2 inline" /> Send Email
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h2>
          {lineItems.map((item, index) => (
            <div key={item.id || index} className="flex items-center space-x-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <select
                value={item.type}
                onChange={(e) => updateLineItem(index, 'type', e.target.value)}
                className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="service_package">Service Package</option>
                <option value="store_product">Store Product</option>
                <option value="custom">Custom</option>
              </select>
              {item.type === 'service_package' && (
                <select
                  value={item.service_package_id || ''}
                  onChange={(e) => updateLineItem(index, 'service_package_id', e.target.value)}
                  className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Package</option>
                  {servicePackages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name} (${(pkg.price / 100).toFixed(2)})</option>
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
                    <option key={product.id} value={product.id}>{pkg.name} (${(product.price / 100).toFixed(2)})</option>
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
          ))}
          <button
            onClick={() => addLineItem('custom')}
            className="mt-2 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Line Item
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
          <p className="text-sm font-medium">Subtotal: ${(calculateTotal() / 100).toFixed(2)}</p>
          <p className="text-sm font-medium">Deposit: ${(calculateDeposit() / 100).toFixed(2)}</p>
          <p className="text-sm font-medium text-gray-900">Total Due: ${((calculateTotal() - calculateDeposit()) / 100).toFixed(2)}</p>
        </div>

        <button
          onClick={saveChanges}
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" /> Save Changes
        </button>
      </div>

      <TakePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentTaken={fetchInvoice}
      />
    </div>
  );
}
