import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadStripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import Select from 'react-select';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Invoice {
  id: string;
  couple_name: string;
  vendor_name: string;
  service_name: string;
  remaining_balance: number;
}

interface TakePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentTaken: () => void;
}

export default function TakePaymentModal({ isOpen, onClose, onPaymentTaken }: TakePaymentModalProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [bRememberedPercentage, setBRememberedPercentage] = useState<number>(50);
  const [stripe, setStripe] = useState<StripeElements | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);
  const cardElementDivRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen]);

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
  }, [isOpen]);

  const fetchInvoices = async () => {
    try {
      console.log('[TakePaymentModal] Fetching pending invoices');
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select(`
          id,
          couple_id,
          vendor_id,
          remaining_balance,
          couples(name),
          vendors(name),
          invoice_line_items(service_package_id, service_packages(name))
        `)
        .eq('status', 'pending');

      if (error) {
        console.error('[TakePaymentModal] Supabase error:', error);
        throw error;
      }

      console.log('[TakePaymentModal] Invoices data:', invoicesData);

      const invoicesWithDetails = invoicesData.map((invoice) => ({
        id: invoice.id,
        couple_name: invoice.couples?.name || 'Unknown',
        vendor_name: invoice.vendors?.name || 'Unknown',
        service_name: invoice.invoice_line_items?.[0]?.service_packages?.name || 'Custom Service',
        remaining_balance: invoice.remaining_balance || 0,
      }));

      console.log('[TakePaymentModal] Processed invoices:', invoicesWithDetails);
      setInvoices(invoicesWithDetails);
    } catch (error: any) {
      console.error('[TakePaymentModal] Error fetching invoices:', error);
      toast.error('Failed to load invoices: ' + error.message);
    }
  };

  useEffect(() => {
    if (selectedInvoice) {
      const invoice = invoices.find(i => i.id === selectedInvoice);
      if (invoice) {
        setAmount(invoice.remaining_balance / 100); // Set default to remaining balance in dollars
      } else {
        setAmount(0);
      }
    }
  }, [selectedInvoice, invoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!stripe || !cardElementRef.current) throw new Error('Stripe not initialized');
      if (!selectedInvoice || amount <= 0) throw new Error('Please select an invoice and enter a valid amount');

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const { data, error: functionError } = await supabase.functions.invoke('create-payment', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          invoice_id: selectedInvoice,
          amount,
          bRememberedPercentage,
        },
      });

      if (functionError) throw functionError;

      const { client_secret } = data;
      const stripeInstance = await stripePromise;

      const { error: confirmError, paymentIntent } = await stripeInstance!.confirmCardPayment(client_secret, {
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
      console.error('[TakePaymentModal] Error processing payment:', error);
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
                      <label htmlFor="invoice" className="block text-sm font-medium text-gray-700">Select Invoice</label>
                      <Select
                        id="invoice"
                        options={invoices.map(invoice => ({
                          value: invoice.id,
                          label: `${invoice.couple_name} - ${invoice.vendor_name} - ${invoice.service_name} - $${(invoice.remaining_balance / 100).toFixed(2)}`
                        }))}
                        value={invoices.find(i => i.id === selectedInvoice) ? {
                          value: selectedInvoice,
                          label: `${invoices.find(i => i.id === selectedInvoice)?.couple_name} - ${invoices.find(i => i.id === selectedInvoice)?.vendor_name} - ${invoices.find(i => i.id === selectedInvoice)?.service_name} - $${(invoices.find(i => i.id === selectedInvoice)?.remaining_balance / 100).toFixed(2)}`
                        } : null}
                        onChange={(selectedOption) => setSelectedInvoice(selectedOption ? selectedOption.value : '')}
                        placeholder="Search or select an invoice..."
                        className="w-full"
                        classNamePrefix="select"
                      />
                    </div>
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount ($)</label>
                      <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Suggested: ${(invoices.find(i => i.id === selectedInvoice)?.remaining_balance / 100 || 0).toFixed(2)}
                      </p>
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
                    <div className="mt-4 flex space-x-2">
                      <button
                        type="submit"
                        disabled={loading || !selectedInvoice || amount <= 0 || !cardElementRef.current}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
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
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
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
