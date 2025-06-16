// src/components/AddVendorModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

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
    user_id: '',
    gear_list: '',
    portfolio_photos: '',
    portfolio_videos: '',
    awards: '',
    education: '',
    equipment: '',
    social_media: '',
    business_hours: '',
    languages: '',
    insurance_info: '',
    business_license: '',
    service_types: '',
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.user_id)) {
      toast.error('Invalid email format');
      return;
    }
    for (const field of ['equipment', 'social_media', 'business_hours']) {
      if (formData[field]) {
        try {
          JSON.parse(formData[field]);
        } catch {
          toast.error(`Invalid JSON in ${field}`);
          return;
        }
      }
    }
    setLoading(true);

    try {
      const response = await fetch('https://eecbrvehrhrvdzuutliq.supabase.co/functions/v1/create-vendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: formData.user_id,
          name: formData.name,
          profile_photo: formData.profile_photo,
          phone: formData.phone,
          years_experience: formData.years_experience,
          profile: formData.profile,
          service_areas: formData.service_areas,
          specialties: formData.specialties,
          stripe_account_id: formData.stripe_account_id,
          gear_list: formData.gear_list,
          portfolio_photos: formData.portfolio_photos,
          portfolio_videos: formData.portfolio_videos,
          awards: formData.awards,
          education: formData.education,
          equipment: formData.equipment,
          social_media: formData.social_media,
          business_hours: formData.business_hours,
          languages: formData.languages,
          insurance_info: formData.insurance_info,
          business_license: formData.business_license,
          service_types: formData.service_types,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add vendor');
      }

      toast.success('Vendor added and welcome email sent!');
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
                      <label htmlFor="user_id" className="block text-sm font-medium text-gray-700">
                        Email *
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
                      <label htmlFor="gear_list" className="block text-sm font-medium text-gray-700">
                        Gear List
                      </label>
                      <input
                        type="text"
                        id="gear_list"
                        value={formData.gear_list}
                        onChange={(e) => setFormData({ ...formData, gear_list: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Camera, Tripod"
                      />
                    </div>
                    <div>
                      <label htmlFor="portfolio_photos" className="block text-sm font-medium text-gray-700">
                        Portfolio Photos
                      </label>
                      <input
                        type="text"
                        id="portfolio_photos"
                        value={formData.portfolio_photos}
                        onChange={(e) => setFormData({ ...formData, portfolio_photos: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., url1, url2"
                      />
                    </div>
                    <div>
                      <label htmlFor="portfolio_videos" className="block text-sm font-medium text-gray-700">
                        Portfolio Videos
                      </label>
                      <input
                        type="text"
                        id="portfolio_videos"
                        value={formData.portfolio_videos}
                        onChange={(e) => setFormData({ ...formData, portfolio_videos: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., url1, url2"
                      />
                    </div>
                    <div>
                      <label htmlFor="awards" className="block text-sm font-medium text-gray-700">
                        Awards
                      </label>
                      <input
                        type="text"
                        id="awards"
                        value={formData.awards}
                        onChange={(e) => setFormData({ ...formData, awards: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Best Photographer 2023"
                      />
                    </div>
                    <div>
                      <label htmlFor="education" className="block text-sm font-medium text-gray-700">
                        Education
                      </label>
                      <input
                        type="text"
                        id="education"
                        value={formData.education}
                        onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., BFA in Photography"
                      />
                    </div>
                    <div>
                      <label htmlFor="equipment" className="block text-sm font-medium text-gray-700">
                        Equipment (JSON)
                      </label>
                      <textarea
                        id="equipment"
                        value={formData.equipment}
                        onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder='e.g., {"camera": "Canon EOS"}'
                      />
                    </div>
                    <div>
                      <label htmlFor="social_media" className="block text-sm font-medium text-gray-700">
                        Social Media (JSON)
                      </label>
                      <textarea
                        id="social_media"
                        value={formData.social_media}
                        onChange={(e) => setFormData({ ...formData, social_media: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder='e.g., {"twitter": "handle"}'
                      />
                    </div>
                    <div>
                      <label htmlFor="business_hours" className="block text-sm font-medium text-gray-700">
                        Business Hours (JSON)
                      </label>
                      <textarea
                        id="business_hours"
                        value={formData.business_hours}
                        onChange={(e) => setFormData({ ...formData, business_hours: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder='e.g., {"mon": "9-5"}'
                      />
                    </div>
                    <div>
                      <label htmlFor="languages" className="block text-sm font-medium text-gray-700">
                        Languages
                      </label>
                      <input
                        type="text"
                        id="languages"
                        value={formData.languages}
                        onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., English, Spanish"
                      />
                    </div>
                    <div>
                      <label htmlFor="insurance_info" className="block text-sm font-medium text-gray-700">
                        Insurance Info
                      </label>
                      <input
                        type="text"
                        id="insurance_info"
                        value={formData.insurance_info}
                        onChange={(e) => setFormData({ ...formData, insurance_info: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Policy #123"
                      />
                    </div>
                    <div>
                      <label htmlFor="business_license" className="block text-sm font-medium text-gray-700">
                        Business License
                      </label>
                      <input
                        type="text"
                        id="business_license"
                        value={formData.business_license}
                        onChange={(e) => setFormData({ ...formData, business_license: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., License #456"
                      />
                    </div>
                    <div>
                      <label htmlFor="service_types" className="block text-sm font-medium text-gray-700">
                        Service Types
                      </label>
                      <input
                        type="text"
                        id="service_types"
                        value={formData.service_types}
                        onChange={(e) => setFormData({ ...formData, service_types: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Wedding, Corporate"
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