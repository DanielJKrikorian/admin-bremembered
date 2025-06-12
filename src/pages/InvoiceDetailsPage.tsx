import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { Calendar, Save, Plus, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from 'react-modal'; // Ensure this is installed

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
  console.error('Stripe publishable key is not set in environment variables');
}

Modal.setAppElement('#root'); // Ensure modal accessibility

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
  email: string | null; // Can be null if no user match
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
  discount_amount: number;
  discount_percentage: number;
  deposit_amount: number;
  status: string;
  paid_at?: string;
  stripe_payment_intent_id?: string;
  stripe_payment_link_url?: string;
  couples?: Couple;
  vendors?: Vendor;
  shipping_addresses?: { full_name: string; address_line1: string; address_line2: string; city: string; state: string; postal_code: string; country: string }[];
  invoice_line_items?: InvoiceLineItem[];
}

const CheckoutForm = ({ onPaymentSuccess }: { onPaymentSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) {
      toast.error('Stripe or Elements is not initialized.');
      return;
    }

    const cardElement = elements.getElement('card');

    if (!cardElement) {
      toast.error('Card element not found.');
      return;
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      toast.error('Payment failed: ' + error.message);
    } else {
      toast.success('Payment processed successfully');
      onPaymentSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <div id="card-element" className="mb-4"></div> {/* Ensure this div exists for mounting */}
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">
          <Save className="h-4 w-4 mr-2" /> Confirm Payment
        </button>
      </div>
    </form>
  );
};

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [shippingAddress, setShippingAddress] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [depositPercentage, setDepositPercentage] = useState<number>(0);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]); // To lookup vendor emails
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [hasProduct, setHasProduct] = useState(false); // Added hasProduct state
  const [isDiscountPercentage, setIsDiscountPercentage] = useState(false); // Added isDiscountPercentage state

  useEffect(() => {
    fetchInvoice();
    fetchSupportingData();
  }, [id]);

  useEffect(() => {
    // Update hasProduct based on lineItems
    setHasProduct(lineItems.some(item => item.type === 'store_product' && item.store_product_id));
  }, [lineItems]);

  useEffect(() => {
    // Initialize isDiscountPercentage based on invoice data
    if (invoice) {
      setIsDiscountPercentage(invoice.discount_percentage > 0);
    }
  }, [invoice]);

  const fetchInvoice = async () => {
    try {
      console.log('Fetching invoice for id:', id); // Debug log
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          couples(partner1_name, partner2_name, email, phone),
          vendors(name, phone, user_id),
          shipping_addresses(*),
          invoice_line_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Fetch users to lookup emails
      const { data: usersData, error: usersError } = await supabase.from('users').select('id, email');
      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Map vendor email based on user_id
      const vendorWithEmail = data.vendors
        ? { ...data.vendors, email: usersData.find(u => u.id === data.vendors.user_id)?.email || null }
        : null;

      console.log('Invoice data:', data); // Debug log
      setInvoice({ ...data, vendors: vendorWithEmail });
      setLineItems(data.invoice_line_items || []);
      setShippingAddress(data.shipping_addresses?.[0] || {
        full_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
      });
      setDiscountAmount(data.discount_amount || 0);
      setDiscountPercentage(data.discount_percentage || 0);
      setDepositPercentage((data.deposit_amount / (data.total_amount || 1)) * 100 || 0);
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
    }
  };

  const fetchSupportingData = async () => {
    try {
      console.log('Fetching supporting data'); // Debug log
      const [servicePackagesResponse, storeProductsResponse] = await Promise.all([
        supabase.from('service_packages').select('id, name, price'),
        supabase.from('store_products').select('id, name, price'),
      ]);

      if (servicePackagesResponse.error) throw servicePackagesResponse.error;
      if (storeProductsResponse.error) throw storeProductsResponse.error;

      console.log('Service packages:', servicePackagesResponse.data); // Debug log
      console.log('Store products:', storeProductsResponse.data); // Debug log
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
      discount_amount: isDiscountPercentage ? 0 : discountAmount,
      discount_percentage: isDiscountPercentage ? discountPercentage : 0,
      deposit_amount: deposit,
    };

    try {
      console.log('Saving changes with updates:', updates); // Debug log
      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .upsert(lineItems.map(item => ({ ...item, invoice_id: id })), { onConflict: 'id' });
      if (lineItemsError) throw lineItemsError;

      if (shippingAddress.full_name) {
        const { error: addressError } = await supabase
          .from('shipping_addresses')
          .upsert({ invoice_id: id, ...shippingAddress }, { onConflict: 'invoice_id' });
        if (addressError) throw addressError;
      }

      toast.success('Changes saved successfully!');
      fetchInvoice();
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    }
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    fetchInvoice();
  };

  const handleLinkSuccess = (url: string) => {
    setIsLinkModalOpen(false);
    fetchInvoice();
  };

  const handleCreatePaymentLink = async () => {
    const stripe = await stripePromise;
    if (!stripe) {
      toast.error('Stripe is not initialized. Check your publishable key.');
      return;
    }
    const { error, url } = await stripe.paymentLinks.create({
      line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Invoice Payment' }, unit_amount: calculateTotal() }, quantity: 1 }],
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
      .eq('id', id);
    handleLinkSuccess(url);
  };

  return (
    <>
      <div className="space-y-8 p-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" /> Invoice Details
        </h1>
        {invoice && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Invoice ID: {invoice.id}</h3>
              <p><strong>Status:</strong> {invoice.status}</p>
              <p><strong>Total Amount:</strong> ${(invoice.total_amount / 100).toFixed(2)}</p>
            </div>
            {invoice.couples && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium">Couple Information</h3>
                <p><strong>Name:</strong> {invoice.couples.partner1_name} {invoice.couples.partner2_name || ''}</p>
                <p><strong>Email:</strong> {invoice.couples.email}</p>
                <p><strong>Phone:</strong> {invoice.couples.phone}</p>
              </div>
            )}
            {invoice.vendors && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium">Vendor Information</h3>
                <p><strong>Name:</strong> {invoice.vendors.name}</p>
                <p><strong>Email:</strong> {invoice.vendors.email || 'Not available'}</p>
                <p><strong>Phone:</strong> {invoice.vendors.phone}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Line Items</label>
                {lineItems.map((item, index) => (
                  <div key={item.id || index} className="flex space-x-2 mb-2">
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
              <button onClick={saveChanges} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </button>
              <div className="mt-4 flex space-x-2">
                <button onClick={() => setIsPaymentModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                  <Save className="h-4 w-4 mr-2" /> Pay with Card
                </button>
                <button onClick={() => setIsLinkModalOpen(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg">
                  <Plus className="h-4 w-4 mr-2" /> Create Payment Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isPaymentModalOpen}
        onRequestClose={() => setIsPaymentModalOpen(false)}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
          },
        }}
      >
        <h2 className="text-xl font-bold mb-4">Pay with Card</h2>
        {stripePromise && (
          <Elements stripe={stripePromise}>
            <CheckoutForm onPaymentSuccess={handlePaymentSuccess} />
          </Elements>
        )}
        <button onClick={() => setIsPaymentModalOpen(false)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
          Close
        </button>
      </Modal>

      <Modal
        isOpen={isLinkModalOpen}
        onRequestClose={() => setIsLinkModalOpen(false)}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
          },
        }}
      >
        <h2 className="text-xl font-bold mb-4">Create Payment Link</h2>
        <button
          onClick={handleCreatePaymentLink}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          <Plus className="h-4 w-4 mr-2" /> Generate Link
        </button>
        {invoice?.stripe_payment_link_url && (
          <p className="mt-4">Payment Link: <a href={invoice.stripe_payment_link_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{invoice.stripe_payment_link_url}</a></p>
        )}
        <button onClick={() => setIsLinkModalOpen(false)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
          Close
        </button>
      </Modal>
    </>
  );
}