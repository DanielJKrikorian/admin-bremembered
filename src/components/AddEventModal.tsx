import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Plus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Couple {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

export default function AddEventModal({ isOpen, onClose, onSuccess }: AddEventModalProps) {
  const [formData, setFormData] = useState({
    couple_id: '',
    vendor_id: '',
    type: '',
    title: '',
    start_time: '',
    end_time: ''
  });
  const [couples, setCouples] = useState<Couple[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [couplesData, vendorsData] = await Promise.all([
        supabase.from('couples').select('id, name'),
        supabase.from('vendors').select('id, name')
      ]);
      if (couplesData.error) throw couplesData.error;
      if (vendorsData.error) throw vendorsData.error;
      setCouples(couplesData.data || []);
      setVendors(vendorsData.data || []);
    } catch (error: any) {
      console.error('Error fetching options:', error);
      toast.error('Failed to load couples and vendors');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.couple_id || !formData.vendor_id || !formData.start_time || !formData.end_time) {
        throw new Error('Please fill all required fields');
      }

      const eventData = {
        couple_id: formData.couple_id,
        vendor_id: formData.vendor_id,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        type: formData.type || 'Event',
        title: formData.title || `${couples.find(c => c.id === formData.couple_id)?.name} Event`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('events').insert(eventData);

      if (error) throw error;

      toast.success('Event added successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding event:', error);
      toast.error(error.message || 'Failed to add event');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
                  Add Event
                </Dialog.Title>
                <div className="mt-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="couple_id" className="block text-sm font-medium text-gray-700">Couple *</label>
                      <select
                        id="couple_id"
                        name="couple_id"
                        value={formData.couple_id}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a couple</option>
                        {couples.map(couple => (
                          <option key={couple.id} value={couple.id}>{couple.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700">Vendor *</label>
                      <select
                        id="vendor_id"
                        name="vendor_id"
                        value={formData.vendor_id}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a vendor</option>
                        {vendors.map(vendor => (
                          <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
                      <input
                        type="text"
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Wedding Ceremony"
                      />
                    </div>
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Wedding Day"
                      />
                    </div>
                    <div>
                      <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">Start Time *</label>
                      <input
                        type="datetime-local"
                        id="start_time"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">End Time *</label>
                      <input
                        type="datetime-local"
                        id="end_time"
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="mt-4">
                      <button
                        type="submit"
                        disabled={loading || !formData.couple_id || !formData.vendor_id || !formData.start_time || !formData.end_time}
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
                            Add Event
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