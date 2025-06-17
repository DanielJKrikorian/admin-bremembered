import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface AddCoupleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Optional
}

export default function AddCoupleModal({ isOpen, onClose, onSuccess }: AddCoupleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    partner1_name: '',
    partner2_name: '',
    wedding_date: '',
    budget: '',
    vibe_tags: '',
    phone: '',
    email: '',
    venue_name: '',
    guest_count: '',
    venue_city: '',
    venue_state: '',
  });
  const [loading, setLoading] = useState(false);

  // Admin check
  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (error || !user) {
        toast.error('Please log in');
        onClose();
        return;
      }
      if (user.user_metadata?.role !== 'admin') {
        toast.error('Unauthorized action');
        onClose();
      }
    };

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, []); // Empty deps to run once

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Invalid email format');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('https://eecbrvehrhrvdzuutliq.supabase.co/functions/v1/create-couple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          partner1_name: formData.partner1_name,
          partner2_name: formData.partner2_name,
          wedding_date: formData.wedding_date,
          budget: formData.budget,
          vibe_tags: formData.vibe_tags,
          phone: formData.phone,
          venue_name: formData.venue_name,
          guest_count: formData.guest_count,
          venue_city: formData.venue_city,
          venue_state: formData.venue_state,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add couple');
      }

      toast.success('Couple added and welcome email sent!');
      if (typeof onSuccess === 'function') {
        onSuccess(); // Safe call
      }
      onClose();
    } catch (error: any) {
      console.error('Error adding couple:', error);
      toast.error(`Failed to add couple: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                  Add Couple
                </Dialog.Title>
                <div className="mt-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Couple Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Smith & Johnson"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., couple@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., (555) 123-4567"
                      />
                    </div>
                    <div>
                      <label htmlFor="partner1_name" className="block text-sm font-medium text-gray-700">
                        Partner 1 Name
                      </label>
                      <input
                        type="text"
                        id="partner1_name"
                        value={formData.partner1_name}
                        onChange={(e) => setFormData({ ...formData, partner1_name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Alex"
                      />
                    </div>
                    <div>
                      <label htmlFor="partner2_name" className="block text-sm font-medium text-gray-700">
                        Partner 2 Name
                      </label>
                      <input
                        type="text"
                        id="partner2_name"
                        value={formData.partner2_name}
                        onChange={(e) => setFormData({ ...formData, partner2_name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Taylor"
                      />
                    </div>
                    <div>
                      <label htmlFor="wedding_date" className="block text-sm font-medium text-gray-700">
                        Wedding Date
                      </label>
                      <input
                        type="date"
                        id="wedding_date"
                        value={formData.wedding_date}
                        onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                        Budget
                      </label>
                      <input
                        type="number"
                        id="budget"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., 50000"
                      />
                    </div>
                    <div>
                      <label htmlFor="vibe_tags" className="block text-sm font-medium text-gray-700">
                        Vibe Tags
                      </label>
                      <input
                        type="text"
                        id="vibe_tags"
                        value={formData.vibe_tags}
                        onChange={(e) => setFormData({ ...formData, vibe_tags: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., rustic, modern, boho"
                      />
                    </div>
                    <div>
                      <label htmlFor="guest_count" className="block text-sm font-medium text-gray-700">
                        Guest Count
                      </label>
                      <input
                        type="number"
                        id="guest_count"
                        value={formData.guest_count}
                        onChange={(e) => setFormData({ ...formData, guest_count: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., 150"
                      />
                    </div>
                    <div>
                      <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700">
                        Venue Name
                      </label>
                      <input
                        type="text"
                        id="venue_name"
                        value={formData.venue_name}
                        onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Willow Creek Vineyard"
                      />
                    </div>
                    <div>
                      <label htmlFor="venue_city" className="block text-sm font-medium text-gray-700">
                        Venue City
                      </label>
                      <input
                        type="text"
                        id="venue_city"
                        value={formData.venue_city}
                        onChange={(e) => setFormData({ ...formData, venue_city: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Napa"
                      />
                    </div>
                    <div>
                      <label htmlFor="venue_state" className="block text-sm font-medium text-gray-700">
                        Venue State
                      </label>
                      <input
                        type="text"
                        id="venue_state"
                        value={formData.venue_state}
                        onChange={(e) => setFormData({ ...formData, venue_state: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., CA"
                      />
                    </div>
                    <div className="mt-4">
                      <button
                        type="submit"
                        disabled={loading || !formData.name.trim() || !formData.email.trim()}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5 mr-2" />
                            Add Couple
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