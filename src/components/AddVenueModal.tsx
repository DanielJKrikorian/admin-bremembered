import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Save } from 'lucide-react';
import Select from 'react-select';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AddVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueAdded: (venueId: string) => void;
}

interface Venue {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  service_area_id: string | null;
}

interface ServiceArea {
  id: string;
  name: string;
}

export default function AddVenueModal({ isOpen, onClose, onVenueAdded }: AddVenueModalProps) {
  const [newVenue, setNewVenue] = useState({
    name: '',
    phone: '',
    email: '',
    contact_name: '',
    street_address: '',
    city: '',
    state: '',
    zip: '',
    service_area_id: ''
  });
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch service areas when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchServiceAreas = async () => {
        try {
          const { data, error } = await supabase
            .from('service_areas')
            .select('id, name')
            .order('name', { ascending: true });
          
          if (error) throw error;
          setServiceAreas(data || []);
        } catch (error) {
          console.error('Error fetching service areas:', error);
          toast.error('Failed to load service areas');
        }
      };
      fetchServiceAreas();
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVenue(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceAreaChange = (selectedOption: any) => {
    setNewVenue(prev => ({ ...prev, service_area_id: selectedOption ? selectedOption.value : '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const venueData = {
        name: newVenue.name.trim(),
        phone: newVenue.phone.trim() || null,
        email: newVenue.email.trim() || null,
        contact_name: newVenue.contact_name.trim() || null,
        street_address: newVenue.street_address.trim() || null,
        city: newVenue.city.trim() || null,
        state: newVenue.state.trim() || null,
        zip: newVenue.zip.trim() || null,
        service_area_id: newVenue.service_area_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('venues')
        .insert(venueData)
        .select('id')
        .single();

      if (error) throw error;

      onVenueAdded(data.id);
      onClose();
      setNewVenue({
        name: '',
        phone: '',
        email: '',
        contact_name: '',
        street_address: '',
        city: '',
        state: '',
        zip: '',
        service_area_id: ''
      });
      toast.success('New venue added successfully!');
    } catch (error: any) {
      console.error('Error adding new venue:', error);
      toast.error('Failed to add new venue');
    } finally {
      setLoading(false);
    }
  };

  // Format service areas for react-select
  const serviceAreaOptions = serviceAreas.map(area => ({
    value: area.id,
    label: area.name
  }));

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
                  Add New Venue
                </Dialog.Title>
                <div className="mt-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="new_venue_name" className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        id="new_venue_name"
                        name="name"
                        value={newVenue.name}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_venue_phone" className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="text"
                        id="new_venue_phone"
                        name="phone"
                        value={newVenue.phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_venue_email" className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        id="new_venue_email"
                        name="email"
                        value={newVenue.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_venue_contact_name" className="block text-sm font-medium text-gray-700">Contact Name</label>
                      <input
                        type="text"
                        id="new_venue_contact_name"
                        name="contact_name"
                        value={newVenue.contact_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_venue_street_address" className="block text-sm font-medium text-gray-700">Street Address</label>
                      <input
                        type="text"
                        id="new_venue_street_address"
                        name="street_address"
                        value={newVenue.street_address}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="new_venue_city" className="block text-sm font-medium text-gray-700">City</label>
                        <input
                          type="text"
                          id="new_venue_city"
                          name="city"
                          value={newVenue.city}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="new_venue_state" className="block text-sm font-medium text-gray-700">State</label>
                        <input
                          type="text"
                          id="new_venue_state"
                          name="state"
                          value={newVenue.state}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="new_venue_zip" className="block text-sm font-medium text-gray-700">Zip</label>
                        <input
                          type="text"
                          id="new_venue_zip"
                          name="zip"
                          value={newVenue.zip}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="new_venue_service_area" className="block text-sm font-medium text-gray-700">Service Area</label>
                        <Select
                          id="new_venue_service_area"
                          name="service_area_id"
                          options={serviceAreaOptions}
                          onChange={handleServiceAreaChange}
                          isClearable
                          placeholder="Select service area..."
                          className="w-full"
                          classNamePrefix="react-select"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        type="submit"
                        disabled={loading || !newVenue.name.trim()}
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
                            Add Venue
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
