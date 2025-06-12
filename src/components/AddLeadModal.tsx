import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: () => void;
}

export default function AddLeadModal({ isOpen, onClose, onLeadAdded }: AddLeadModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('new');
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [preferredContactMethod, setPreferredContactMethod] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [city, setCity] = useState('');
  const [servicesRequested, setServicesRequested] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [responseStatus, setResponseStatus] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [state, setState] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [photographyHours, setPhotographyHours] = useState<number | null>(null);
  const [videographyHours, setVideographyHours] = useState<number | null>(null);
  const [djHours, setDjHours] = useState<number | null>(null);
  const [coordinationHours, setCoordinationHours] = useState<number | null>(null);
  const [budgetRange, setBudgetRange] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const leadData = {
        name,
        email,
        source,
        status,
        vendor_id: vendorId || null,
        phone,
        preferred_contact_method: preferredContactMethod || null,
        wedding_date: weddingDate || null,
        city: city || null,
        services_requested: servicesRequested || null,
        form_notes: formNotes || null,
        response_status: responseStatus || null,
        lead_source: leadSource || null,
        updated_at: new Date().toISOString(),
        state: state || null,
        partner_name: partnerName || null,
        referral_source: referralSource || null,
        photography_hours: photographyHours || null,
        videography_hours: videographyHours || null,
        dj_hours: djHours || null,
        coordination_hours: coordinationHours || null,
        budget_range: budgetRange || null,
        service_type: serviceType || null,
      };

      const { error } = await supabase
        .from('leads')
        .insert(leadData);

      if (error) throw error;

      toast.success('Lead added successfully!');
      onLeadAdded();
      onClose();
      setName('');
      setEmail('');
      setSource('');
      setStatus('new');
      setVendorId(null);
      setPhone('');
      setPreferredContactMethod('');
      setWeddingDate('');
      setCity('');
      setServicesRequested('');
      setFormNotes('');
      setResponseStatus('');
      setLeadSource('');
      setState('');
      setPartnerName('');
      setReferralSource('');
      setPhotographyHours(null);
      setVideographyHours(null);
      setDjHours(null);
      setCoordinationHours(null);
      setBudgetRange('');
      setServiceType('');
    } catch (error: any) {
      console.error('Error adding lead:', error);
      toast.error('Failed to add lead: ' + error.message);
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
                  Add New Lead
                </Dialog.Title>
                <div className="mt-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="source" className="block text-sm font-medium text-gray-700">Source</label>
                      <input
                        type="text"
                        id="source"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700">Vendor ID</label>
                      <input
                        type="text"
                        id="vendorId"
                        value={vendorId || ''}
                        onChange={(e) => setVendorId(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="text"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="preferredContactMethod" className="block text-sm font-medium text-gray-700">Preferred Contact Method</label>
                      <input
                        type="text"
                        id="preferredContactMethod"
                        value={preferredContactMethod}
                        onChange={(e) => setPreferredContactMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="weddingDate" className="block text-sm font-medium text-gray-700">Wedding Date</label>
                      <input
                        type="date"
                        id="weddingDate"
                        value={weddingDate}
                        onChange={(e) => setWeddingDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="servicesRequested" className="block text-sm font-medium text-gray-700">Services Requested</label>
                      <input
                        type="text"
                        id="servicesRequested"
                        value={servicesRequested}
                        onChange={(e) => setServicesRequested(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="formNotes" className="block text-sm font-medium text-gray-700">Form Notes</label>
                      <textarea
                        id="formNotes"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
                      />
                    </div>
                    <div>
                      <label htmlFor="responseStatus" className="block text-sm font-medium text-gray-700">Response Status</label>
                      <input
                        type="text"
                        id="responseStatus"
                        value={responseStatus}
                        onChange={(e) => setResponseStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="leadSource" className="block text-sm font-medium text-gray-700">Lead Source</label>
                      <input
                        type="text"
                        id="leadSource"
                        value={leadSource}
                        onChange={(e) => setLeadSource(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700">State</label>
                      <input
                        type="text"
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="partnerName" className="block text-sm font-medium text-gray-700">Partner Name</label>
                      <input
                        type="text"
                        id="partnerName"
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="referralSource" className="block text-sm font-medium text-gray-700">Referral Source</label>
                      <input
                        type="text"
                        id="referralSource"
                        value={referralSource}
                        onChange={(e) => setReferralSource(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="photographyHours" className="block text-sm font-medium text-gray-700">Photography Hours</label>
                      <input
                        type="number"
                        id="photographyHours"
                        value={photographyHours || ''}
                        onChange={(e) => setPhotographyHours(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="videographyHours" className="block text-sm font-medium text-gray-700">Videography Hours</label>
                      <input
                        type="number"
                        id="videographyHours"
                        value={videographyHours || ''}
                        onChange={(e) => setVideographyHours(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="djHours" className="block text-sm font-medium text-gray-700">DJ Hours</label>
                      <input
                        type="number"
                        id="djHours"
                        value={djHours || ''}
                        onChange={(e) => setDjHours(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="coordinationHours" className="block text-sm font-medium text-gray-700">Coordination Hours</label>
                      <input
                        type="number"
                        id="coordinationHours"
                        value={coordinationHours || ''}
                        onChange={(e) => setCoordinationHours(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="budgetRange" className="block text-sm font-medium text-gray-700">Budget Range</label>
                      <input
                        type="text"
                        id="budgetRange"
                        value={budgetRange}
                        onChange={(e) => setBudgetRange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Type</label>
                      <input
                        type="text"
                        id="serviceType"
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="mt-4">
                      <button
                        type="submit"
                        disabled={loading || !name || !email}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5 mr-2" />
                            Add Lead
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