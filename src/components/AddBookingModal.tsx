import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Plus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import AddVenueModal from './AddVenueModal'; // Import the new component

interface AddBookingModalProps {
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

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  service_type: string;
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
  region: string | null;
}

export default function AddBookingModal({ isOpen, onClose, onSuccess }: AddBookingModalProps) {
  const [formData, setFormData] = useState({
    couple_id: '',
    vendor_id: '',
    service_type: '',
    amount: '',
    status: 'pending',
    venue_id: '',
    package_id: '',
    start_time: '',
    end_time: ''
  });
  const [couples, setCouples] = useState<Couple[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [searchVenue, setSearchVenue] = useState('');
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [couplesData, vendorsData, packagesData, venuesData] = await Promise.all([
        supabase.from('couples').select('id, name'),
        supabase.from('vendors').select('id, name'),
        supabase.from('service_packages').select('id, name, description, price, service_type'),
        supabase.from('venues').select('id, name, phone, email, contact_name, street_address, city, state, zip, region')
      ]);
      if (couplesData.error) throw couplesData.error;
      if (vendorsData.error) throw vendorsData.error;
      if (packagesData.error) throw packagesData.error;
      if (venuesData.error) throw venuesData.error;
      setCouples(couplesData.data || []);
      setVendors(vendorsData.data || []);
      setServicePackages(packagesData.data || []);
      setVenues(venuesData.data || []);
    } catch (error: any) {
      console.error('Error fetching options:', error);
      toast.error('Failed to load options');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const packageId = e.target.value;
    const selectedPackage = servicePackages.find(p => p.id === packageId);
    if (selectedPackage) {
      setFormData(prev => ({
        ...prev,
        package_id: packageId,
        service_type: selectedPackage.service_type,
        amount: (selectedPackage.price / 100).toString() // Convert cents to dollars for display
      }));
    }
  };

  const handleVenueSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVenue(e.target.value);
  };

  const handleVenueAdded = (venueId: string) => {
    setFormData(prev => ({ ...prev, venue_id: venueId }));
    setVenues(prev => [...prev, { id: venueId, name: 'New Venue' } as Venue]); // Placeholder name, update if needed
    setSearchVenue('New Venue'); // Update search to reflect new venue
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.couple_id || !formData.vendor_id || !formData.start_time || !formData.end_time || !formData.venue_id) {
        throw new Error('Please fill all required fields');
      }

      const amount = formData.amount ? parseInt(formData.amount) * 100 : 0; // Convert dollars to cents
      const bookingData = {
        couple_id: formData.couple_id,
        vendor_id: formData.vendor_id,
        status: formData.status,
        amount,
        service_type: formData.service_type || 'Unknown',
        package_id: formData.package_id || null,
        venue_id: formData.venue_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: bookingResult, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select('id')
        .single();

      if (bookingError) throw bookingError;

      const eventData = {
        couple_id: formData.couple_id,
        vendor_id: formData.vendor_id,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        type: formData.service_type || 'Event',
        title: `${couples.find(c => c.id === formData.couple_id)?.name} - ${formData.service_type}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await supabase.from('events').insert(eventData);

      toast.success('Booking and event added successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding booking:', error);
      toast.error(error.message || 'Failed to add booking');
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
                  Add Booking
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
                      <label htmlFor="package_id" className="block text-sm font-medium text-gray-700">Service Package *</label>
                      <select
                        id="package_id"
                        name="package_id"
                        value={formData.package_id}
                        onChange={handlePackageChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a package</option>
                        {servicePackages.map(pkg => (
                          <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="service_type" className="block text-sm font-medium text-gray-700">Service Type</label>
                      <input
                        type="text"
                        id="service_type"
                        name="service_type"
                        value={formData.service_type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount ($)</label>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="venue_id" className="block text-sm font-medium text-gray-700">Venue *</label>
                      <input
                        type="text"
                        id="venue_id"
                        name="venue_id"
                        value={searchVenue}
                        onChange={handleVenueSearch}
                        placeholder="Search or add a venue..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg">
                        {venues
                          .filter(venue => venue.name?.toLowerCase().includes(searchVenue.toLowerCase()))
                          .map(venue => (
                            <div
                              key={venue.id}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, venue_id: venue.id }));
                                setSearchVenue(venue.name || '');
                              }}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              {venue.name}
                            </div>
                          ))}
                        <div
                          onClick={() => setIsAddVenueOpen(true)}
                          className="px-3 py-2 text-blue-600 hover:bg-gray-100 cursor-pointer"
                        >
                          Add New Venue
                        </div>
                      </div>
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
                        disabled={loading || !formData.couple_id || !formData.vendor_id || !formData.start_time || !formData.end_time || !formData.venue_id}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5 mr-2" />
                            Add Booking
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
        <AddVenueModal isOpen={isAddVenueOpen} onClose={() => setIsAddVenueOpen(false)} onVenueAdded={handleVenueAdded} />
      </Dialog>
    </Transition>
  );
}