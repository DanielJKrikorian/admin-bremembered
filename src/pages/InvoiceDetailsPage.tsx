import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { Calendar, Save, Plus, Eye, Trash2, Copy, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from 'react-modal';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
  console.error('Stripe publishable key is not set in environment variables');
}

Modal.setAppElement('#root');

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
  shipping_addresses?: { full_name: string; address_line1: string; address_line2: string; city: string; state: string; postal_code: string; country: string }[];
  invoice_line_items?: InvoiceLineItem[];
}

const CheckoutForm: React.FC<{ invoiceId: string; amount: number; onPaymentSuccess: () => void }> = ({
  invoiceId,
  amount,
  onPaymentSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) {
      toast.error('Stripe or Elements is not initialized.');
      return;
    }

    setIsProcessing(true);

    try {
      // Fetch Payment Intent for the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('payment_token')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice?.payment_token) {
        toast.error('Failed to fetch invoice details');
        setIsProcessing(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_token: invoice.payment_token }),
        }
      );

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
        setIsProcessing(false);
        return;
      }

      const cardElement = elements.getElement('card');
      if (!cardElement) {
        toast.error('Card element not found.');
        setIsProcessing(false);
        return;
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: { card: cardElement },
      });

      if (stripeError) {
        toast.error('Payment failed: ' + stripeError.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        toast.success('Payment processed successfully');
        onPaymentSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('An error occurred during payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="border rounded-md p-3 mb-4">
        <div id="card-element"></div>
      </div>
      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
      >
        <Save className="h-4 w-4 mr-2 inline" />
        {isProcessing ? "Processing..." : `Pay $${(amount / 100).toFixed(2)}`}
      </button>
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
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [hasProduct, setHasProduct] = useState(false);
  const [isDiscountPercentage, setIsDiscountPercentage] = useState(false);

  useEffect(() => {
    fetchInvoice();
    fetchSupportingData();
  }, [id]);

  useEffect(() => {
    setHasProduct(lineItems.some(item => item.type === 'store_product' && item.store_product_id));
  }, [lineItems]);

  useEffect(() => {
    if (invoice) {
      setIsDiscountPercentage(invoice.discount_percentage > 0);
    }
  }, [invoice]);

  const fetchInvoice = async () => {
    try {
      console.log('Fetching invoice for id:', id);
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

      const { data: usersData, error: usersError } = await supabase.from('users').select('id, email');
      if (usersError) throw usersError;
      setUsers(usersData || []);

      const vendorWithEmail = data.vendors
        ? { ...data.vendors, email: usersData.find(u => u.id === data.vendors.user_id)?.email || null }
        : null;

      console.log('Invoice data:', data);
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

  const copyInvoiceLink = () => {
    if (!invoice?.payment_token) {
      toast.error('No payment token available');
      return;
    }
    const link = `https://app.bremembered.io/invoice/${invoice.payment_token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invoice link copied to clipboard!');
  };

  const sendInvoiceEmail = async () => {
    if (!invoice?.payment_token) {
      toast.error('No payment token available');
      return;
    }
    const link = `https://app.bremembered.io/invoice/${invoice.payment_token}`;
    try {
      // Placeholder for email sending (e.g., via SendGrid edge function)
      console.log(`Sending email for invoice ${invoice.id} to couple ${invoice.couples?.email} with link: ${link}`);
      toast.success(`Invoice email sent to ${invoice.couples?.email}`);
    } catch (err) {
      console.error('Error sending invoice email:', err);
      toast.error('Failed to send invoice email');
    }
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
              <p><strong>Remaining Balance:</strong> ${(invoice.remaining_balance / 100).toFixed(2)}</p>
              {invoice.payment_token && (
                <p>
                  <strong>Payment Link:</strong>{' '}
                  <a
                    href={`https://app.bremembered.io/invoice/${invoice.payment_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    https://app.bremembered.io/invoice/{invoice.payment_token}
                  </a>
                </p>
              )}
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
                        setDiscountPercentage(0);
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
                        setDiscountAmount(0);
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
              <div className="flex space-x-2">
                <button onClick={saveChanges} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </button>
                {invoice.remaining_balance > 0 && (
                  <>
                    <button onClick={() => setIsPaymentModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                      <Save className="h-4 w-4 mr-2" /> Pay with Card
                    </button>
                    <button onClick={copyInvoiceLink} className="px-4 py-2 bg-purple-600 text-white rounded-lg">
                      <Copy className="h-4 w-4 mr-2" /> Copy Payment Link
                    </button>
                    <button onClick={sendInvoiceEmail} className="px-4 py-2 bg-purple-600 text-white rounded-lg">
                      <Mail className="h-4 w-4 mr-2" /> Send Invoice Email
                    </button>
                  </>
                )}
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
        {stripePromise && invoice && (
          <Elements stripe={stripePromise}>
            <CheckoutForm
              invoiceId={invoice.id}
              amount={invoice.remaining_balance}
              onPaymentSuccess={handlePaymentSuccess}
            />
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
        <h2 className="text-xl font-bold mb-4">Invoice Payment Link</h2>
        {invoice?.payment_token && (
          <p className="mb-4">
            <strong>Payment Link:</strong>{' '}
            <a
              href={`https://app.bremembered.io/invoice/${invoice.payment_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              https://app.bremembered.io/invoice/{invoice.payment_token}
            </a>
          </p>
        )}
        <div className="flex space-x-2">
          <button onClick={copyInvoiceLink} className="px-4 py-2 bg-purple-600 text-white rounded-lg">
            <Copy className="h-4 w-4 mr-2" /> Copy Link
          </button>
          <button onClick={sendInvoiceEmail} className="px-4 py-2 bg-purple-600 text-white rounded-lg">
            <Mail className="h-4 w-4 mr-2" /> Send Email
          </button>
        </div>
        <button onClick={() => setIsLinkModalOpen(false)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
          Close
        </button>
      </Modal>
    </>
  );
}
