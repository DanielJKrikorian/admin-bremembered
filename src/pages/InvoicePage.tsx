import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Plus, Trash2, Search, Eye, Copy, Mail, Save } from 'lucide-react'; // Added Eye import
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
  payment_token?: string;
  couples?: Couple;
  vendors?: Vendor;
  invoice_line_items?: InvoiceLineItem[];
}

export default function InvoicePage() {
  const navigate = useNavigate();
  const [couples, setCouples] = useState<Couple[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [depositPercentage, setDepositPercentage] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDiscountPercentage, setIsDiscountPercentage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [couplesResponse, vendorsResponse, usersResponse, servicePackagesResponse, storeProductsResponse, invoicesResponse] = await Promise.all([
        supabase.from('couples').select('*'),
        supabase.from('vendors').select('id, name, user_id, phone'),
        supabase.from('users').select('id, email'),
        supabase.from('service_packages').select('id, name, price'),
        supabase.from('store_products').select('id, name, price'),
        supabase.from('invoices').select(`
          *,
          couples(partner1_name, partner2_name, email, phone),
          vendors(name, user_id, phone),
          invoice_line_items(*, service_packages(name), store_products(name))
        `),
      ]);

      if (couplesResponse.error) throw couplesResponse.error;
      if (vendorsResponse.error) throw vendorsResponse.error;
      if (usersResponse.error) throw usersResponse.error;
      if (servicePackagesResponse.error) throw servicePackagesResponse.error;
      if (storeProductsResponse.error) throw storeProductsResponse.error;
      if (invoicesResponse.error) throw invoicesResponse.error;

      const vendorWithEmail = vendorsResponse.data.map((vendor: any) => {
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
      console.error('[InvoicePage] Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      type: 'custom',
      custom_description: '',
      custom_price: 0,
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
    if (!selectedCoupleId || !selectedVendorId || lineItems.length === 0) {
      toast.error('Please select a couple, vendor, and add at least one line item');
      return;
    }

    const total = calculateTotal();
    const deposit = calculateDeposit();
    const newInvoice = {
      couple_id: selectedCoupleId,
      vendor_id: selectedVendorId,
      total_amount: total,
      remaining_balance: total - deposit,
      discount_amount: isDiscountPercentage ? 0 : discountAmount,
      discount_percentage: isDiscountPercentage ? discountPercentage : 0,
      deposit_amount: deposit,
      status: 'draft', // Use valid status
    };

    try {
      console.log('[InvoicePage] Creating invoice with data:', newInvoice);
      const { data, error } = await supabase
        .from('invoices')
        .insert(newInvoice)
        .select('*, payment_token')
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

      toast.success('Invoice created successfully!');
      setLineItems([]);
      setSelectedCoupleId(null);
      setSelectedVendorId(null);
      setDiscountAmount(0);
      setDiscountPercentage(0);
      setDepositPercentage(0);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('[InvoicePage] Error saving invoice:', error);
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

      // Update status to 'sent'
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);
      if (updateError) throw updateError;

      toast.success(`Invoice email sent to ${invoice.couples?.email}`);
      fetchData();
    } catch (err) {
      console.error('[InvoicePage] Error sending invoice email:', err);
      toast.error('Failed to send invoice email');
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    (invoice.couples ? `${invoice.couples.partner1_name} ${invoice.couples.partner2_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
    (invoice.vendors ? invoice.vendors.name.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
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
                      {invoice.couples ? `${invoice.couples.partner1_name} ${invoice.couples.partner2_name || ''}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.vendors?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(invoice.total_amount / 100).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(invoice.remaining_balance / 100).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          invoice.status === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Couple</label>
                      <select
                        value={selectedCoupleId || ''}
                        onChange={(e) => setSelectedCoupleId(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a couple</option>
                        {couples.map(couple => (
                          <option key={couple.id} value={couple.id}>
                            {couple.partner1_name} {couple.partner2_name || ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Vendor</label>
                      <select
                        value={selectedVendorId || ''}
                        onChange={(e) => setSelectedVendorId(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a vendor</option>
                        {vendors.map(vendor => (
                          <option key={vendor.id} value={vendor.id}>{vendor.name} ({vendor.email})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Line Items</h3>
                      {lineItems.map((item, index) => (
                        <div key={index} className="flex items-center space-x-4 mb-4 p-4 bg-gray-50 rounded-lg">
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
