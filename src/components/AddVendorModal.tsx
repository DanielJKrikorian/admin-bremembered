// src/components/AddVendorModal.tsx
import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Plus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddVendorModal({ isOpen, onClose }: AddVendorModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    profile_photo: '',
    phone: '',
    years_experience: '',
    profile: '',
    service_areas: '',
    specialties: '',
    stripe_account_id: '',
    user_id: '' // Email for auth
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.user_id.trim(),
        password: Math.random().toString(36).slice(-8), // Temporary random password
        email_confirm: true,
        user_metadata: { role: 'vendor' }
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('User ID not generated');

      // Insert into vendors table
      const updateData = {
        name: formData.name.trim() || null,
        profile_photo: formData.profile_photo.trim() || null,
        phone: formData.phone.trim() || null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        profile: formData.profile.trim() || null,
        service_areas: formData.service_areas
          ? formData.service_areas.split(',').map(area => area.trim()).filter(area => area.length > 0)
          : [],
        specialties: formData.specialties
          ? formData.specialties.split(',').map(specialty => specialty.trim()).filter(specialty => specialty.length > 0)
          : [],
        stripe_account_id: formData.stripe_account_id.trim() || null,
        user_id: userId
      };

      const { data, error } = await supabase
        .from('vendors')
        .insert(updateData)
        .select();

      if (error) throw error;

      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.user_id.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (resetError) throw resetError;

      toast.success('Vendor added and password reset email sent!');
      onClose();
    } catch (error: any) {
      console.error('Error adding vendor:', error);
      toast.error(`Failed to add vendor: ${error.message}`);
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
                  Add Vendor
                </Dialog.Title>
                <div className="mt-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter vendor name"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="profile_photo" className="block text-sm font-medium text-gray-700">
                        Profile Photo URL
                      </label>
                      <input
                        type="text"
                        id="profile_photo"
                        value={formData.profile_photo}
                        onChange={(e) => setFormData({ ...formData, profile_photo: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter photo URL"
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
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label htmlFor="years_experience" className="block text-sm font-medium text-gray-700">
                        Years Experience
                      </label>
                      <input
                        type="number"
                        id="years_experience"
                        value={formData.years_experience}
                        onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter years"
                      />
                    </div>
                    <div>
                      <label htmlFor="profile" className="block text-sm font-medium text-gray-700">
                        Profile
                      </label>
                      <textarea
                        id="profile"
                        value={formData.profile}
                        onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter profile description"
                      />
                    </div>
                    <div>
                      <label htmlFor="service_areas" className="block text-sm font-medium text-gray-700">
                        Service Areas
                      </label>
                      <input
                        type="text"
                        id="service_areas"
                        value={formData.service_areas}
                        onChange={(e) => setFormData({ ...formData, service_areas: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Boston, Cambridge"
                      />
                    </div>
                    <div>
                      <label htmlFor="specialties" className="block text-sm font-medium text-gray-700">
                        Specialties
                      </label>
                      <input
                        type="text"
                        id="specialties"
                        value={formData.specialties}
                        onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Photography, Planning"
                      />
                    </div>
                    <div>
                      <label htmlFor="stripe_account_id" className="block text-sm font-medium text-gray-700">
                        Stripe Account ID
                      </label>
                      <input
                        type="text"
                        id="stripe_account_id"
                        value={formData.stripe_account_id}
                        onChange={(e) => setFormData({ ...formData, stripe_account_id: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., acct_1234567890"
                      />
                    </div>
                    <div>
                      <label htmlFor="user_id" className="block text-sm font-medium text-gray-700">
                        Email (User ID) *
                      </label>
                      <input
                        type="email"
                        id="user_id"
                        value={formData.user_id}
                        onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter vendor email"
                        required
                      />
                    </div>
                    <div className="mt-4">
                      <button
                        type="submit"
                        disabled={loading || !formData.name.trim() || !formData.user_id.trim()}
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
                            Add Vendor
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