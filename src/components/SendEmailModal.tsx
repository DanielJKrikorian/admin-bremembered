import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Couple {
  id: string;
  name: string;
  user_id: string | null;
}

interface Vendor {
  id: string;
  name: string;
  user_id: string | null;
}

interface Lead {
  id: string;
  name: string;
  email: string;
}

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSent: () => void;
}

export default function SendEmailModal({ isOpen, onClose, onEmailSent }: SendEmailModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedCouple, setSelectedCouple] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, [selectedVendor, selectedCouple, selectedLead]);

  const fetchOptions = async () => {
    try {
      console.log('Fetching options started...');
      const vendorsPromise = supabase.from('vendors').select('id, name, user_id');
      const couplesPromise = supabase.from('couples').select('id, name, user_id');
      const leadsPromise = supabase.from('leads').select('id, name, email');

      const [vendorsData, couplesData, leadsData] = await Promise.all([vendorsPromise, couplesPromise, leadsPromise]);
      console.log('Vendors data:', vendorsData);
      console.log('Couples data:', couplesData);
      console.log('Leads data:', leadsData);

      if (vendorsData.error) throw new Error(`Vendors fetch error: ${vendorsData.error.message}`);
      if (couplesData.error) throw new Error(`Couples fetch error: ${couplesData.error.message}`);
      if (leadsData.error) throw new Error(`Leads fetch error: ${leadsData.error.message}`);

      setVendors(vendorsData.data || []);
      setCouples(couplesData.data || []);
      setLeads(leadsData.data || []);
      if (leadsData.data.length === 0) {
        console.warn('No leads found in the leads table. Data should exist based on manual query.');
      }

      // Update recipient email based on selection
      if (selectedLead) {
        const lead = leadsData.data.find(l => l.id === selectedLead);
        setRecipientEmail(lead?.email || '');
        console.log('Lead email set:', lead?.email);
      } else if (selectedCouple) {
        const couple = couplesData.data.find(c => c.id === selectedCouple);
        if (couple?.user_id) {
          const { data: user, error } = await supabase
            .from('users')
            .select('email')
            .eq('id', couple.user_id)
            .single();
          if (error) console.error('User fetch error for couple:', error, 'User ID:', couple.user_id);
          setRecipientEmail(user?.email || '');
          console.log('Couple email set:', user?.email);
        }
      } else if (selectedVendor) {
        const vendor = vendorsData.data.find(v => v.id === selectedVendor);
        if (vendor?.user_id) {
          const { data: user, error } = await supabase
            .from('users')
            .select('email')
            .eq('id', vendor.user_id)
            .single();
          if (error) console.error('User fetch error for vendor:', error, 'User ID:', vendor.user_id);
          setRecipientEmail(user?.email || '');
          console.log('Vendor email set:', user?.email);
        }
      }
    } catch (error: any) {
      console.error('Error in fetchOptions:', error);
      toast.error('Failed to load options: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const emailData = {
        vendor_id: selectedVendor || null,
        couple_id: selectedCouple || null,
        lead_id: selectedLead || null,
        email: recipientEmail || null,
        subject,
        body,
      };

      if (!selectedVendor && !selectedCouple && !selectedLead && !recipientEmail) {
        throw new Error('Please select a recipient or enter an email address');
      }

      const { error } = await supabase
        .from('emails')
        .insert(emailData);

      if (error) throw error;

      toast.success('Email sent successfully!');
      onEmailSent();
      onClose();
      setSubject('');
      setBody('');
      setSelectedVendor('');
      setSelectedCouple('');
      setSelectedLead('');
      setRecipientEmail('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
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
                  Send Email
                </Dialog.Title>
                <div className="mt-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">Vendor</label>
                      <select
                        id="vendor"
                        value={selectedVendor}
                        onChange={(e) => {
                          setSelectedVendor(e.target.value);
                          setSelectedCouple('');
                          setSelectedLead('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map(vendor => (
                          <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="couple" className="block text-sm font-medium text-gray-700">Couple</label>
                      <select
                        id="couple"
                        value={selectedCouple}
                        onChange={(e) => {
                          setSelectedCouple(e.target.value);
                          setSelectedVendor('');
                          setSelectedLead('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Couple</option>
                        {couples.map(couple => (
                          <option key={couple.id} value={couple.id}>{couple.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="lead" className="block text-sm font-medium text-gray-700">Lead</label>
                      <select
                        id="lead"
                        value={selectedLead}
                        onChange={(e) => {
                          setSelectedLead(e.target.value);
                          setSelectedVendor('');
                          setSelectedCouple('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 z-50"
                        key="lead-dropdown"
                      >
                        <option value="">Select Lead</option>
                        {leads.length > 0 ? (
                          leads.map(lead => (
                            <option key={lead.id} value={lead.id}>{lead.name}</option>
                          ))
                        ) : (
                          <option value="" disabled>No leads available</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700">Recipient Email</label>
                      <input
                        type="email"
                        id="recipientEmail"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email or auto-filled from selection"
                      />
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
                      <input
                        type="text"
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="body" className="block text-sm font-medium text-gray-700">Body</label>
                      <textarea
                        id="body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                        required
                      />
                    </div>
                    <div className="mt-4">
                      <button
                        type="submit"
                        disabled={loading || (!selectedVendor && !selectedCouple && !selectedLead && !recipientEmail) || !subject || !body}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5 mr-2" />
                            Send Email
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