import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadStripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import Select from 'react-select';
import toast from 'react-hot-toast';

// Use environment variable for Stripe publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Couple {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
  stripe_account_id: string;
}

interface ServicePackage {
  id: string;
  name: string;
  price: number;
}

interface Booking {
  id: string;
  couple_id: string;
  vendor_id: string;
  package_id: string;
  amount: number;
  couple_name: string;
  vendor_name: string;
  package_name: string;
}

interface TakePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentTaken: () => void;
}

export default function TakePaymentModal({ isOpen, onClose, onPaymentTaken }: TakePaymentModalProps) {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedCouple, setSelectedCouple] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'deposit' | 'payment'>('deposit');
  const [bRememberedPercentage, setBRememberedPercentage] = useState<number>(20);
  const [amount, setAmount] = useState<number>(0);
  const [packagePrice, setPackagePrice] = useState<number>(0);
  const [stripe, setStripe] = useState<StripeElements | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);
  const cardElementDivRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (isOpen && stripePromise && cardElementDivRef.current) {
      stripePromise.then((stripeInstance) => {
        if (!stripeInstance) {
          console.error('Stripe failed to initialize');
          toast.error('Failed to load Stripe payment form');
          return;
        }
        console.log('Stripe initialized successfully with key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
        const elements = stripeInstance.elements();
        const cardElement = elements.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#32325d',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#fa755a',
            },
          },
        });
        cardElement.mount(cardElementDivRef.current);
        cardElement.on('change', (event) => {
          setCardError(event.error ? event.error.message : null);
        });
        cardElementRef.current = cardElement;
        setStripe(elements);
      }).catch((error) => {
        console.error('Stripe loading error:', error);
        toast.error('Failed to load Stripe payment form');
      });
    }
    return () => {
      if (cardElementRef.current) {
        cardElementRef.current.unmount();
        cardElementRef.current = null;
      }
      setStripe(null);
      setCardError(null);
    };
  }, [isOpen, cardElementDivRef]);

  const fetchOptions = async () => {
    try {
      const [couplesData, vendorsData, packagesData, bookingsData] = await Promise.all([
        supabase.from('couples').select('id, name'),
        supabase.from('vendors').select('id, name, stripe_account_id'),
        supabase.from('service_packages').select('id, name, price'),
        supabase.from('bookings').select('id, couple_id, vendor_id, package_id, amount').then(async (result) => {
          if (result.error) throw result.error;
          const bookingsWithNames = await Promise.all(result.data.map(async (booking) => {
            const [couple, vendor, packageData] = await Promise.all([
              booking.couple_id ? supabase.from('couples').select('name').eq('id', booking.couple_id).single() : Promise.resolve({ data: null, error: null }),
              booking.vendor_id ? supabase.from('vendors').select('name').eq('id', booking.vendor_id).single() : Promise.resolve({ data: null, error: null }),
              booking.package_id ? supabase.from('service_packages').select('name').eq('id', booking.package_id).single() : Promise.resolve({ data: null, error: null })
            ]);
            return {
              ...booking,
              couple_name: couple.data?.name || 'Unknown',
              vendor_name: vendor.data?.name || 'Unknown',
              package_name: packageData.data?.name || 'Unknown'
            };
          }));
          return { data: bookingsWithNames, error: null };
        })
      ]);
      if (couplesData.error || vendorsData.error || packagesData.error || bookingsData.error) throw new Error('Failed to fetch options');
      setCouples(couplesData.data || []);
      setVendors(vendorsData.data || []);
      setServicePackages(packagesData.data || []);
      setBookings(bookingsData.data || []);
    } catch (error: any) {
      console.error('Error fetching options:', error);
      toast.error('Failed to load options');
    }
  };

  useEffect(() => {
    if (selectedPackage) {
      const pkg = servicePackages.find(p => p.id === selectedPackage);
      if (pkg) {
        setPackagePrice(pkg.price);
        setAmount(Math.round(pkg.price * 0.5 / 100) * 100); // 50% of price in cents
      } else {
        setPackagePrice(0);
        setAmount(0);
      }
    } else if (selectedBooking) {
      const booking = bookings.find(b => b.id === selectedBooking);
      if (booking) {
        setSelectedCouple(booking.couple_id);
        setSelectedVendor(booking.vendor_id);
        setSelectedPackage(booking.package_id);
        setAmount(booking.amount || 0); // Use booking amount or default to 0
      }
    }
  }, [selectedPackage, selectedBooking, bookings, servicePackages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!stripe || !cardElementRef.current) throw new Error('Stripe not initialized');

      let bookingId: string;
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('id')
        .eq('couple_id', selectedCouple)
        .eq('vendor_id', selectedVendor)
        .eq('package_id', selectedPackage)
        .maybeSingle();
      if (bookingData) {
        bookingId = bookingData.id;
      } else {
        const { data: newBooking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            couple_id: selectedCouple,
            vendor_id: selectedVendor,
            package_id: selectedPackage,
            status: 'pending',
            amount: Math.round(amount * 100),
          })
          .select('id')
          .single();
        if (bookingError) throw bookingError;
        bookingId = newBooking.id;
      }

      const totalAmountInCents = Math.round(amount * 100);
      const vendorStripeAccountId = selectedVendor ? vendors.find(v => v.id === selectedVendor)?.stripe_account_id : null;

      const { data, error: functionError } = await supabase.functions.invoke('create-payment', {
        body: { bookingId, amount: totalAmountInCents, vendorId: vendorStripeAccountId, bRememberedPercentage },
      });

      if (functionError) throw functionError;

      const { paymentIntentId } = data;
      const stripeInstance = await stripePromise;

      const { error: confirmError, paymentIntent } = await stripeInstance.confirmCardPayment(paymentIntentId, {
        payment_method: { card: cardElementRef.current },
      });

      if (confirmError) {
        setCardError(confirmError.message);
        throw confirmError;
      }

      if (paymentIntent.status === 'succeeded') {
        toast.success('Payment processed successfully!');
        onPaymentTaken();
        onClose();
      } else {
        throw new Error('Payment failed to confirm');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Take Payment
                </Dialog.Title>
                <div className="mt-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="booking" className="block text-sm font-medium text-gray-700">Select Booking</label>
                      <Select
                        id="booking"
                        options={bookings.map(booking => ({
                          value: booking.id,
                          label: `${booking.couple_name} - ${booking.vendor_name} - ${booking.package_name} - $${(booking.amount / 100).toFixed(2)}`
                        }))}
                        value={bookings.find(b => b.id === selectedBooking) ? {
                          value: selectedBooking,
                          label: `${bookings.find(b => b.id === selectedBooking)?.couple_name} - ${bookings.find(b => b.id === selectedBooking)?.vendor_name} - ${bookings.find(b => b.id === selectedBooking)?.package_name} - $${(bookings.find(b => b.id === selectedBooking)?.amount / 100).toFixed(2)}`
                        } : null}
                        onChange={(selectedOption) => setSelectedBooking(selectedOption ? selectedOption.value : '')}
                        placeholder="Search or select a booking..."
                        className="w-full"
                        classNamePrefix="select"
                      />
                    </div>
                    <div>
                      <label htmlFor="couple" className="block text-sm font-medium text-gray-700">Couple</label>
                      <select
                        id="couple"
                        value={selectedCouple}
                        onChange={(e) => setSelectedCouple(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Couple</option>
                        {couples.map(couple => (
                          <option key={couple.id} value={couple.id}>{couple.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">Vendor</label>
                      <select
                        id="vendor"
                        value={selectedVendor}
                        onChange={(e) => setSelectedVendor(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">B. Remembered Only</option>
                        {vendors.map(vendor => (
                          <option key={vendor.id} value={vendor.id}>{vendor.name} ({vendor.stripe_account_id})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="package" className="block text-sm font-medium text-gray-700">Service Package</label>
                      <select
                        id="package"
                        value={selectedPackage}
                        onChange={(e) => setSelectedPackage(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Package</option>
                        {servicePackages.map(pkg => (
                          <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="payment-type" className="block text-sm font-medium text-gray-700">Payment Type</label>
                      <select
                        id="payment-type"
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value as 'deposit' | 'payment')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="deposit">Deposit</option>
                        <option value="payment">Second Payment</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount ($)</label>
                      <input
                        type="number"
                        id="amount"
                        value={amount / 100} // Display in dollars
                        onChange={(e) => setAmount(Math.round(parseFloat(e.target.value) * 100) || 0)} // Store in cents
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">Suggested: ${(packagePrice / 100 / 2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (50% of package price)</p>
                    </div>
                    <div>
                      <label htmlFor="b-remembered-percentage" className="block text-sm font-medium text-gray-700">B. Remembered Percentage (%)</label>
                      <input
                        type="number"
                        id="b-remembered-percentage"
                        value={bRememberedPercentage}
                        onChange={(e) => setBRememberedPercentage(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="card-element" className="block text-sm font-medium text-gray-700">Credit Card</label>
                      <div ref={cardElementDivRef} id="card-element" className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[40px]"></div>
                      {cardError && <p className="text-sm text-red-600 mt-1">{cardError}</p>}
                      <p className="text-sm text-gray-500 mt-1">Enter card details to process payment.</p>
                    </div>
                    <div className="mt-4">
                      <button
                        type="submit"
                        disabled={loading || !selectedCouple || !selectedPackage || amount <= 0 || !cardElementRef.current}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5 mr-2" />
                            Take Payment
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="ml-2 inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}