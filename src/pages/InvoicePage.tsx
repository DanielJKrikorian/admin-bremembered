import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { Calendar, Plus, Trash2, Save, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

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
  venue_street_address: string;
  venue_city: string;
  venue_state: string;
  venue_zip: string;
  venue_region: string;
}

interface Vendor {
  id: string;
  name: string;
  user_id: string;
  email: string;
  phone: string;
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

export default function InvoicePage() {
  const navigate = useNavigate();
  const [couples, setCouples] = useState<Couple[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [depositPercentage, setDepositPercentage] = useState<number>(0);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDiscountPercentage, setIsDiscountPercentage] = useState(false); // Toggle for discount type
  const [hasProduct, setHasProduct] = useState(false); // Track if a store_product is selected

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [couplesResponse, vendorsResponse, usersResponse, servicePackagesResponse, storeProductsResponse, invoicesResponse] = await Promise.all([
        supabase.from('couples').select('*'),
        supabase.from('vendors').select('id, name, user_id, phone'),
        supabase.from('users').select('id, email'),
        supabase.from('service_packages').select('id, name, price'),
        supabase.from('store_products').select('id, name, price'),
        supabase.from('invoices').select(`
          *,
          couples(partner1_name, partner2_name, email, phone, venue_street_address, venue_city, venue_state, venue_zip, venue_region),
          vendors(name, user_id, phone),
          shipping_addresses(*),
          invoice_line_items(*, service_packages(name), store_products(name))
        `),
      ]);

      if (couplesResponse.error) throw couplesResponse.error;
      if (vendorsResponse.error) throw vendorsResponse.error;
      if (usersResponse.error) throw usersResponse.error;
      if (servicePackagesResponse.error) throw servicePackagesResponse.error;
      if (storeProductsResponse.error) throw storeProductsResponse.error;
      if (invoicesResponse.error) throw invoicesResponse.error;

      const vendorWithEmail = (vendorsResponse.data || []).map((vendor: any) => {
        const user = usersResponse.data.find((u: any) => u.id === vendor.user_id);
        return {
          ...vendor,
          email: user ? user.email : '',
        };
      });

      setCouples(couplesResponse.data || []);
      setVendors(vendorWithEmail);
      setServicePackages(servicePackagesResponse.data || []);
      setStoreProducts(storeProductsResponse.data || []);
      setInvoices(invoicesResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const getSelectedCouple = () => selectedCoupleId ? couples.find(c => c.id === selectedCoupleId) : null;
  const getSelectedVendor = () => selectedVendorId ? vendors.find(v => v.id === selectedVendorId) : null;

  useEffect(() => {
    // No auto-fill for shipping address, left blank for manual entry
    setHasProduct(lineItems.some(item => item.type === 'store_product' && item.store_product_id));
  }, [lineItems]);

  const addLineItem = (type: 'service_package' | 'store_product' | 'custom', item?: any) => {
    const newItem = item || { id: '', price: 0 };
    setLineItems([...lineItems, {
      type,
      service_package_id: type === 'service_package' ? newItem.id : undefined,
      store_product_id: type === 'store_product' ? newItem.id : undefined,
      custom_description: type === 'custom' ? '' : undefined,
      custom_price: type === 'custom' ? 0 : newItem.price,
      quantity: 1,
    }]);
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
  };

  const removeLineItem = (index: number) => {
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
    const total = calculateTotal();
    const deposit = calculateDeposit();
    const newInvoice = {
      couple_id: selectedCoupleId,
      vendor_id: selectedVendorId,
      total_amount: total,
      discount_amount: isDiscountPercentage ? 0 : discountAmount,
      discount_percentage: isDiscountPercentage ? discountPercentage : 0,
      deposit_amount: deposit,
    };

    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert(newInvoice)
        .select(`
          *,
          shipping_addresses(*),
          invoice_line_items(*, service_packages(name), store_products(name))
        `)
        .single();
      if (error) throw error;

      const lineItemsData = lineItems.map(item => ({
        invoice_id: data.id,
        type: item.type,
        service_package_id: item.service_package_id,
        store_product_id: item.store_product_id,
        custom_description: item.custom_description,
        custom_price: item.custom_price,
        quantity: item.quantity,
      }));
      const { error: lineItemsError } = await supabase.from('invoice_line_items').insert(lineItemsData);
      if (lineItemsError) throw lineItemsError;

      if (shippingAddress.full_name) {
        await supabase.from('shipping_addresses').insert({
          invoice_id: data.id,
          ...shippingAddress,
        });
      }

      toast.success('Invoice created successfully!');
      setSelectedInvoice({ ...data, invoice_line_items: lineItems });
      setLineItems([]);
      setDiscountAmount(0);
      setDiscountPercentage(0);
      setDepositPercentage(0);
      setShippingAddress({
        full_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
      });
      fetchData();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    }
  };

  const handleStripePayment = async () => {
    if (!selectedInvoice) return;

    const stripe = await stripePromise;
    if (!stripe) {
      toast.error('Stripe is not initialized. Check your publishable key.');
      return;
    }
    const { error } = await stripe.createPaymentMethod({
      type: 'card',
      card: { number: '4242424242424242', exp_month: 12, exp_year: 2025, cvc: '123' }, // Test card
    });
    if (error) {
      toast.error('Payment failed: ' + error.message);
      return;
    }
    toast.success('Payment processed manually');
    await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', selectedInvoice.id);
    setSelectedInvoice({ ...selectedInvoice, status: 'paid', paid_at: new Date().toISOString() });
    fetchData();
  };

  const handleCreatePaymentLink = async () => {
    if (!selectedInvoice) return;

    const stripe = await stripePromise;
    if (!stripe) {
      toast.error('Stripe is not initialized. Check your publishable key.');
      return;
    }
    const { error, url } = await stripe.paymentLinks.create({
      line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Invoice Payment' }, unit_amount: selectedInvoice.total_amount }, quantity: 1 }],
      mode: 'payment',
      success_url: 'https://yourdomain.com/success',
      cancel_url: 'https://yourdomain.com/cancel',
    });
    if (error) {
      toast.error('Failed to create payment link: ' + error.message);
      return;
    }
    await supabase
      .from('invoices')
      .update({ stripe_payment_link_url: url, status: 'sent' })
      .eq('id', selectedInvoice.id);
    toast.success('Payment link created: ' + url);
    setSelectedInvoice({ ...selectedInvoice, stripe_payment_link_url: url, status: 'sent' });
    fetchData();
  };

  const filteredInvoices = invoices.filter(invoice =>
    (invoice.couple_id ? `${invoice.couples.partner1_name} ${invoice.couples.partner2_name}`.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
    (invoice.vendor_id ? invoice.vendors.name.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
    invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center">
        <Calendar className="h-8 w-8 text-blue-600 mr-3" /> Invoices
      </h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoices..."
            className="w-full max-w-xs pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <select
            value={selectedCoupleId || ''}
            onChange={(e) => setSelectedCoupleId(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Couple</option>
            {couples.map(couple => (
              <option key={couple.id} value={couple.id}>
                {couple.partner1_name} {couple.partner2_name || ''}
              </option>
            ))}
          </select>
          <select
            value={selectedVendorId || ''}
            onChange={(e) => setSelectedVendorId(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Vendor</option>
            {vendors.map(vendor => (
              <option key={vendor.id} value={vendor.id}>{vendor.name} ({vendor.email})</option>
            ))}
          </select>
        </div>
        {/* Display Selected Couple or Vendor Info */}
        {selectedCoupleId && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium">Couple Information</h3>
            <p><strong>Name:</strong> {getSelectedCouple()?.partner1_name} {getSelectedCouple()?.partner2_name || ''}</p>
            <p><strong>Email:</strong> {getSelectedCouple()?.email}</p>
            <p><strong>Phone:</strong> {getSelectedCouple()?.phone}</p>
          </div>
        )}
        {selectedVendorId && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium">Vendor Information</h3>
            <p><strong>Name:</strong> {getSelectedVendor()?.name}</p>
            <p><strong>Email:</strong> {getSelectedVendor()?.email}</p>
            <p><strong>Phone:</strong> {getSelectedVendor()?.phone}</p>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Line Items</label>
            {lineItems.map((item, index) => (
              <div key={index} className="flex space-x-2 mb-2">
                <select
                  value={item.type}
                  onChange={(e) => updateLineItem(index, 'type', e.target.value)}
                  className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="service_package">Service Package</option>
                  <option value="store_product">Store Product</option>
                  <option value="custom">Custom</option>
                </select>
                {item.type === 'service_package' && (
                  <select
                    value={item.service_package_id || ''}
                    onChange={(e) => updateLineItem(index, 'service_package_id', e.target.value)}
                    className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Product</option>
                    {storeProducts.map(product => (
                      <option key={product.id} value={product.id}>{product.name} (${(product.price / 100).toFixed(2)})</option>
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
                      className="w-1/4 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      value={item.custom_price / 100 || 0}
                      onChange={(e) => updateLineItem(index, 'custom_price', parseInt(e.target.value, 10) * 100 || 0)}
                      placeholder="Price ($)"
                      className="w-1/6 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </>
                )}
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                  className="w-1/6 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button onClick={() => removeLineItem(index)} className="px-2 py-1 bg-red-600 text-white rounded-lg">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button onClick={() => addLineItem('custom')} className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg">
              <Plus className="h-4 w-4 mr-2" /> Add Line Item
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{hasProduct ? 'Booking Address' : 'Shipping Address'}</label>
            <input
              type="text"
              value={shippingAddress.full_name}
              onChange={(e) => setShippingAddress({ ...shippingAddress, full_name: e.target.value })}
              placeholder={hasProduct ? 'Booking Address - Full Name' : 'Full Name'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <input
              type="text"
              value={shippingAddress.address_line1}
              onChange={(e) => setShippingAddress({ ...shippingAddress, address_line1: e.target.value })}
              placeholder={hasProduct ? 'Booking Address - Line 1' : 'Address Line 1'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <input
              type="text"
              value={shippingAddress.address_line2}
              onChange={(e) => setShippingAddress({ ...shippingAddress, address_line2: e.target.value })}
              placeholder={hasProduct ? 'Booking Address - Line 2' : 'Address Line 2'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <input
              type="text"
              value={shippingAddress.city}
              onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
              placeholder={hasProduct ? 'Booking Address - City' : 'City'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <input
              type="text"
              value={shippingAddress.state}
              onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
              placeholder={hasProduct ? 'Booking Address - State' : 'State'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <input
              type="text"
              value={shippingAddress.postal_code}
              onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
              placeholder={hasProduct ? 'Booking Address - Postal Code' : 'Postal Code'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <input
              type="text"
              value={shippingAddress.country}
              onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
              placeholder={hasProduct ? 'Booking Address - Country' : 'Country'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Discount</label>
            <div className="flex space-x-2 items-center">
              <label>
                <input
                  type="radio"
                  checked={!isDiscountPercentage}
                  onChange={() => {
                    setIsDiscountPercentage(false);
                    setDiscountPercentage(0); // Reset percentage when switching to dollar
                  }}
                  className="mr-1"
                />
                Dollar
              </label>
              <label>
                <input
                  type="radio"
                  checked={isDiscountPercentage}
                  onChange={() => {
                    setIsDiscountPercentage(true);
                    setDiscountAmount(0); // Reset amount when switching to percentage
                  }}
                  className="mr-1 ml-2"
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
                className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Deposit</label>
            <input
              type="number"
              value={depositPercentage}
              onChange={(e) => setDepositPercentage(parseInt(e.target.value, 10) || 0)}
              placeholder="Percentage (%)"
              className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <p className="text-sm font-medium">Subtotal: ${(calculateTotal() / 100).toFixed(2)}</p>
            <p className="text-sm font-medium">Deposit: ${(calculateDeposit() / 100).toFixed(2)}</p>
            <p className="text-sm font-medium">Total: ${((calculateTotal() - calculateDeposit()) / 100).toFixed(2)}</p>
          </div>
          <button onClick={handleSaveInvoice} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            <Save className="h-4 w-4 mr-2" /> Save Invoice
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Existing Invoices</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple/Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInvoices.map(invoice => (
              <tr key={invoice.id}>
                <td className="px-6 py-4 whitespace-nowrap">{invoice.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{invoice.couple_id ? `${invoice.couples.partner1_name} ${invoice.couples.partner2_name || ''}` : invoice.vendors?.name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">${(invoice.total_amount / 100).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{invoice.status}</td>
                <td className="px-6 py-4 whitespace-nowrap">{invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link to={`/dashboard/invoices/${invoice.id}`} className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2">
                    <Eye className="h-4 w-4 mr-2" /> View/Edit
                  </Link>
                  {invoice.status !== 'paid' && (
                    <>
                      <button onClick={() => handleStripePayment()} className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 mr-2">
                        <Save className="h-4 w-4 mr-2" /> Pay with Card
                      </button>
                      <button onClick={() => handleCreatePaymentLink()} className="inline-flex items-center px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                        <Plus className="h-4 w-4 mr-2" /> Create Payment Link
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}