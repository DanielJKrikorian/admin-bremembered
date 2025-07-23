import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface InvoiceLineItem {
  id: string;
  type: 'service_package' | 'store_product' | 'custom';
  service_package_id?: string;
  store_product_id?: string;
  booking_id?: string;
  custom_description?: string;
  custom_price: number;
  quantity: number;
  vendor_id?: string;
  service_package_name?: string;
  booking_details?: {
    packageName: string;
    packagePrice: string;
    vendorName: string;
    vendorEmail: string;
    vendorPhone: string;
    stripeAccountId: string;
    eventTitle: string;
    payments: { amount: number; payment_type: string; created_at: string }[];
  };
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
  invoice?: {
    id: string;
    couple_id?: string;
    vendor_id?: string;
    total_amount: number;
    remaining_balance: number;
    status: string;
    invoice_line_items?: InvoiceLineItem[];
  };
  booking?: {
    id: string;
    package_id?: string;
    couple_id?: string;
    vendor_id?: string;
  };
  service_package?: { name: string };
  couple?: { partner1_name: string; partner2_name?: string };
  vendor?: { name: string; stripe_account_id?: string };
}

interface Vendor {
  id: string;
  name: string;
  user_id: string;
  email: string;
  phone: string;
  stripe_account_id?: string;
}

export default function PaymentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayment();
  }, [id]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      if (!id) {
        throw new Error('Payment ID is undefined');
      }

      console.log('[PaymentDetailsPage] Fetching payment with ID:', id);
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('id, invoice_id, booking_id, amount, status, stripe_payment_id, to_platform, created_at, payment_type')
        .eq('id', id)
        .single();

      if (paymentError) {
        console.error('[PaymentDetailsPage] Supabase payment error:', JSON.stringify(paymentError, null, 2));
        throw new Error(`Failed to fetch payment: ${paymentError.message}`);
      }

      if (!paymentData) {
        throw new Error('No payment found for the given ID');
      }

      let invoice = null;
      let booking = null;
      let service_package = null;
      let couple = null;
      let vendor = null;

      // Fetch vendors and users to get email
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, name, user_id, phone, stripe_account_id');
      if (vendorsError) {
        console.warn('[PaymentDetailsPage] Vendors fetch error:', JSON.stringify(vendorsError, null, 2));
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email');
      if (usersError) {
        console.warn('[PaymentDetailsPage] Users fetch error:', JSON.stringify(usersError, null, 2));
      }

      const vendorWithEmail = vendorsData?.map((v: any) => {
        const user = usersData?.find((u: any) => u.id === v.user_id);
        return {
          ...v,
          email: user ? user.email : 'N/A',
        };
      }) || [];
      setVendors(vendorWithEmail);

      // Fetch associated payments for bookings or invoice
      let paymentsData: Payment[] = [];
      if (paymentData.invoice_id || paymentData.booking_id) {
        const conditions: string[] = [];
        if (paymentData.invoice_id) conditions.push(`invoice_id.eq.${paymentData.invoice_id}`);
        if (paymentData.booking_id) conditions.push(`booking_id.eq.${paymentData.booking_id}`);
        const { data: fetchedPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('id, invoice_id, booking_id, amount, status, stripe_payment_id, to_platform, created_at, payment_type')
          .or(conditions.join(','));

        if (paymentsError) {
          console.warn('[PaymentDetailsPage] Payments fetch error:', JSON.stringify(paymentsError, null, 2));
        } else {
          paymentsData = fetchedPayments || [];
        }
      }

      // Fetch invoice data if invoice_id exists
      if (paymentData.invoice_id) {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, couple_id, vendor_id, total_amount, remaining_balance, status')
          .eq('id', paymentData.invoice_id)
          .single();

        if (invoiceError) {
          console.warn('[PaymentDetailsPage] Invoice fetch error:', JSON.stringify(invoiceError, null, 2));
        } else {
          console.log('[PaymentDetailsPage] Invoice data:', JSON.stringify(invoiceData, null, 2));
          invoice = invoiceData;

          // Fetch invoice line items
          const { data: lineItemsData, error: lineItemsError } = await supabase
            .from('invoice_line_items')
            .select('id, type, service_package_id, store_product_id, booking_id, custom_description, custom_price, quantity, vendor_id')
            .eq('invoice_id', paymentData.invoice_id);

          if (lineItemsError) {
            console.warn('[PaymentDetailsPage] Line items fetch error:', JSON.stringify(lineItemsError, null, 2));
          } else {
            console.log('[PaymentDetailsPage] Line items data:', JSON.stringify(lineItemsData, null, 2));
            invoice.invoice_line_items = await Promise.all(
              lineItemsData.map(async (item) => {
                let service_package_name = null;
                let booking_details = null;

                if (item.service_package_id) {
                  const { data: spData, error: spError } = await supabase
                    .from('service_packages')
                    .select('name')
                    .eq('id', item.service_package_id)
                    .single();
                  if (!spError) {
                    service_package_name = spData.name;
                  } else {
                    console.warn('[PaymentDetailsPage] Service package fetch error for ID:', item.service_package_id, JSON.stringify(spError, null, 2));
                  }
                }

                if (item.booking_id) {
                  const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .select('id, package_id, couple_id, vendor_id, amount, initial_payment, service_type, event_id')
                    .eq('id', item.booking_id)
                    .single();
                  if (!bookingError) {
                    const [packageData, eventData] = await Promise.all([
                      bookingData.package_id
                        ? supabase.from('service_packages').select('name, price').eq('id', bookingData.package_id).single()
                        : Promise.resolve({ data: null, error: null }),
                      bookingData.event_id
                        ? supabase.from('events').select('title').eq('id', bookingData.event_id).single()
                        : Promise.resolve({ data: null, error: null }),
                    ]);

                    const vendor = vendorWithEmail.find(v => v.id === bookingData.vendor_id);

                    if (!packageData.error && !eventData.error) {
                      booking_details = {
                        packageName: packageData.data?.name || bookingData.service_type || 'N/A',
                        packagePrice: packageData.data?.price ? (packageData.data.price / 100).toFixed(2) : (bookingData.amount / 100).toFixed(2) || 'N/A',
                        vendorName: vendor?.name || 'N/A',
                        vendorEmail: vendor?.email || 'N/A',
                        vendorPhone: vendor?.phone || 'N/A',
                        stripeAccountId: vendor?.stripe_account_id || 'N/A',
                        eventTitle: eventData.data?.title || 'N/A',
                        payments: paymentsData
                          ?.filter(p => p.booking_id === item.booking_id && p.status === 'succeeded')
                          .map(p => ({
                            amount: p.amount,
                            payment_type: p.payment_type || 'Payment',
                            created_at: p.created_at,
                          })) || [],
                      };
                    } else {
                      console.warn('[PaymentDetailsPage] Booking details fetch errors:', {
                        packageError: packageData.error,
                        eventError: eventData.error,
                      });
                    }
                  } else {
                    console.warn('[PaymentDetailsPage] Booking fetch error for ID:', item.booking_id, JSON.stringify(bookingError, null, 2));
                  }
                }

                return {
                  ...item,
                  service_package_name,
                  booking_details,
                };
              })
            );
          }

          if (invoiceData?.couple_id) {
            const { data: coupleData, error: coupleError } = await supabase
              .from('couples')
              .select('partner1_name, partner2_name')
              .eq('id', invoiceData.couple_id)
              .single();
            if (!coupleError) {
              couple = coupleData;
            } else {
              console.warn('[PaymentDetailsPage] Couple fetch error for ID:', invoiceData.couple_id, JSON.stringify(coupleError, null, 2));
            }
          }

          if (invoiceData?.vendor_id) {
            const vendor = vendorWithEmail.find(v => v.id === invoiceData.vendor_id);
            if (vendor) {
              vendor = { name: vendor.name, stripe_account_id: vendor.stripe_account_id };
            } else {
              console.warn('[PaymentDetailsPage] Vendor not found for ID:', invoiceData.vendor_id);
            }
          }
        }
      }

      // Fetch booking data if booking_id exists
      if (paymentData.booking_id) {
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('id, package_id, couple_id, vendor_id')
          .eq('id', paymentData.booking_id)
          .single();

        if (bookingError) {
          console.warn('[PaymentDetailsPage] Booking fetch error:', JSON.stringify(bookingError, null, 2));
        } else {
          booking = bookingData;

          if (bookingData?.package_id) {
            const { data: spData, error: spError } = await supabase
              .from('service_packages')
              .select('name')
              .eq('id', bookingData.package_id)
              .single();
            if (!spError) {
              service_package = spData;
            } else {
              console.warn('[PaymentDetailsPage] Service package fetch error for ID:', bookingData.package_id, JSON.stringify(spError, null, 2));
            }
          }

          if (bookingData?.couple_id && !couple) {
            const { data: coupleData, error: coupleError } = await supabase
              .from('couples')
              .select('partner1_name, partner2_name')
              .eq('id', bookingData.couple_id)
              .single();
            if (!coupleError) {
              couple = coupleData;
            } else {
              console.warn('[PaymentDetailsPage] Couple fetch error for ID:', bookingData.couple_id, JSON.stringify(coupleError, null, 2));
            }
          }

          if (bookingData?.vendor_id && !vendor) {
            const vendor = vendorWithEmail.find(v => v.id === bookingData.vendor_id);
            if (vendor) {
              vendor = { name: vendor.name, stripe_account_id: vendor.stripe_account_id };
            } else {
              console.warn('[PaymentDetailsPage] Vendor not found for ID:', bookingData.vendor_id);
            }
          }
        }
      }

      setPayment({
        ...paymentData,
        invoice,
        booking,
        service_package,
        couple,
        vendor,
      });
    } catch (error: any) {
      console.error('[PaymentDetailsPage] Fetch payment error:', JSON.stringify(error, null, 2));
      toast.error(error.message || 'Failed to load payment details');
      navigate('/dashboard/payments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">Payment not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Payment Details: {payment.stripe_payment_id || payment.id}
        </h1>
        <button
          onClick={() => navigate('/dashboard/payments')}
          className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
        >
          Back to Payments
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Payment Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Payment ID</label>
            <p className="text-sm text-gray-900">{payment.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Amount</label>
            <p className="text-sm text-gray-900">${(payment.amount / 100).toFixed(2)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Payment Type</label>
            <p className="text-sm text-gray-900">{payment.payment_type || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Date</label>
            <p className="text-sm text-gray-900">{new Date(payment.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p className="text-sm text-gray-900">{payment.status}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Stripe Payment ID</label>
            <p className="text-sm text-gray-900">{payment.stripe_payment_id || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Recipient</label>
            <p className="text-sm text-gray-900">{payment.to_platform ? 'B. Remembered' : payment.vendor?.stripe_account_id || 'N/A'}</p>
          </div>
        </div>
      </div>

      {payment.invoice && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-blue-600 mr-2" />
            Invoice Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Invoice ID</label>
              <p className="text-sm text-gray-900">{payment.invoice.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Total Amount</label>
              <p className="text-sm text-gray-900">${(payment.invoice.total_amount / 100).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Remaining Balance</label>
              <p className="text-sm text-gray-900">${(payment.invoice.remaining_balance / 100).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="text-sm text-gray-900">{payment.invoice.status}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Couple</label>
              <p className="text-sm text-gray-900">
                {payment.couple ? `${payment.couple.partner1_name} ${payment.couple.partner2_name || ''}`.trim() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Vendor</label>
              <p className="text-sm text-gray-900">{payment.vendor?.name || 'N/A'}</p>
            </div>
          </div>
          {payment.invoice.invoice_line_items && payment.invoice.invoice_line_items.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold text-gray-900 mb-2">Invoice Line Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payment.invoice.invoice_line_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.type === 'service_package' ? item.service_package_name || 'N/A' : item.custom_description || 'N/A'}
                          {item.booking_details && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>Package Name:</strong> {item.booking_details.packageName}</p>
                              <p><strong>Package Price:</strong> ${item.booking_details.packagePrice}</p>
                              <p><strong>Vendor Name:</strong> {item.booking_details.vendorName}</p>
                              <p><strong>Vendor Email:</strong> {item.booking_details.vendorEmail}</p>
                              <p><strong>Vendor Phone:</strong> {item.booking_details.vendorPhone}</p>
                              <p><strong>Stripe Account ID:</strong> {item.booking_details.stripeAccountId}</p>
                              <p><strong>Event:</strong> {item.booking_details.eventTitle}</p>
                              {item.booking_details.payments.length > 0 && (
                                <div className="mt-2">
                                  <p><strong>Booking Payments:</strong></p>
                                  {item.booking_details.payments.map(payment => (
                                    <p key={payment.created_at} className="text-sm text-gray-500">
                                      {payment.payment_type} of ${(payment.amount / 100).toFixed(2)} on {new Date(payment.created_at).toLocaleDateString()}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(item.custom_price / 100).toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {payment.booking && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-blue-600 mr-2" />
            Booking Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Booking ID</label>
              <p className="text-sm text-gray-900">{payment.booking.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Service Package</label>
              <p className="text-sm text-gray-900">{payment.service_package?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Couple</label>
              <p className="text-sm text-gray-900">
                {payment.couple ? `${payment.couple.partner1_name} ${payment.couple.partner2_name || ''}`.trim() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Vendor</label>
              <p className="text-sm text-gray-900">{payment.vendor?.name || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}