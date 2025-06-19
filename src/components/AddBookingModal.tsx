import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Plus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import AddVenueModal from './AddVenueModal';
import Select from 'react-select';

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Couple {
  id: string;
  name: string;
  partner1_name: string;
  partner2_name: string;
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

interface Option {
  value: string;
  label: string;
}

export default function AddBookingModal({ isOpen, onClose, onSuccess }: AddBookingModalProps) {
  const [formData, setFormData] = useState({
    couple_id: '',
    vendor_id: '',
    service_type: '',
    event_type: 'wedding',
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
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [couplesData, vendorsData, packagesData, venuesData] = await Promise.all([
        supabase.from('couples').select('id, name, partner1_name, partner2_name'),
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
        amount: (selectedPackage.price / 100).toString()
      }));
    }
  };

  const handleVenueSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVenue(e.target.value);
  };

  const handleVenueAdded = (venueId: string) => {
    setFormData(prev => ({ ...prev, venue_id: venueId }));
    setVenues(prev => [...prev, { id: venueId, name: 'New Venue' } as Venue]);
    setSearchVenue('New Venue');
  };

  const handleCoupleChange = (option: Option | null) => {
    setFormData(prev => ({ ...prev, couple_id: option?.value || '' }));
  };

  const handleVendorChange = (option: Option | null) => {
    setFormData(prev => ({ ...prev, vendor_id: option?.value || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitAttempted || loading) return;
    setSubmitAttempted(true);
    setLoading(true);

    try {
      if (!formData.couple_id || !formData.vendor_id || !formData.start_time || !formData.end_time || !formData.venue_id) {
        throw new Error('Please fill all required fields');
      }

      const amount = formData.amount ? parseInt(formData.amount) * 100 : 0;
      console.log('Submitting booking with data:', {
        p_couple_id: formData.couple_id,
        p_vendor_id: formData.vendor_id,
        p_status: formData.status,
        p_amount: amount,
        p_service_type: formData.service_type || 'Unknown',
        p_event_type: formData.event_type || 'wedding',
        p_package_id: formData.package_id || null,
        p_venue_id: formData.venue_id || null,
        p_event_id: null,
      });

      // Create the event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          couple_id: formData.couple_id,
          vendor_id: formData.vendor_id,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
          type: formData.event_type,
          title: `${formData.service_type} Event`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_blocked_time: true
        })
        .select('id')
        .single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error('Failed to create event');

      const eventId = eventData.id;

      // Create the booking
      const { data: bookingData, error: bookingError } = await supabase.rpc('create_booking', {
        p_couple_id: formData.couple_id,
        p_vendor_id: formData.vendor_id,
        p_status: formData.status,
        p_amount: amount,
        p_service_type: formData.service_type || 'Unknown',
        p_event_type: formData.event_type || 'wedding',
        p_package_id: formData.package_id || null,
        p_venue_id: formData.venue_id || null,
        p_event_id: eventId
      });

      if (bookingError) {
        // Roll back the event if booking fails
        await supabase.from('events').delete().eq('id', eventId);
        throw bookingError;
      }

      console.log('Booking and event created:', bookingData);
      toast.success('Booking and event added successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding booking and event:', error);
      toast.error(error.message || 'Failed to add booking and event');
    } finally {
      setLoading(false);
      setSubmitAttempted(false);
    }
  };

  if (!isOpen) return null;

  // Prepare options for react-select
  const coupleOptions: Option[] = couples.map(couple => ({
    value: couple.id,
    label: `${couple.partner1_name} & ${couple.partner2_name || 'Partner'}`
  }));
  const vendorOptions: Option[] = vendors.map(vendor => ({ value: vendor.id, label: vendor.name }));

  // Event type options
  const eventTypeOptions = [
    { value: 'wedding', label: 'Wedding' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'intro_meeting', label: 'Intro Meeting' },
    { value: 'ceremony', label: 'Ceremony' },
    { value: 'blocked', label: 'Blocked' }
  ];

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
                      <Select
                        id="couple_id"
                        options={coupleOptions}
                        value={coupleOptions.find(option => option.value === formData.couple_id)}
                        onChange={handleCoupleChange}
                        placeholder="Search for a couple..."
                        className="w-full"
                        classNamePrefix="react-select"
                        isSearchable
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700">Vendor *</label>
                      <Select
                        id="vendor_id"
                        options={vendorOptions}
                        value={vendorOptions.find(option => option.value === formData.vendor_id)}
                        onChange={handleVendorChange}
                        placeholder="Search for a vendor..."
                        className="w-full"
                        classNamePrefix="react-select"
                        isSearchable
                        required
                      />
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
                      <label htmlFor="event_type" className="block text-sm font-medium text-gray-700">Event Type *</label>
                      <Select
                        id="event_type"
                        options={eventTypeOptions}
                        value={eventTypeOptions.find(option => option.value === formData.event_type)}
                        onChange={(option) => setFormData(prev => ({ ...prev, event_type: option?.value || 'wedding' }))}
                        placeholder="Select event type..."
                        className="w-full"
                        classNamePrefix="react-select"
                        isSearchable
                        required
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
                        placeholder="Search by name, address, city, state, or zip..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg">
                        {venues
                          .filter(venue =>
                            (venue.name?.toLowerCase().includes(searchVenue.toLowerCase()) || 
                             venue.street_address?.toLowerCase().includes(searchVenue.toLowerCase()) || 
                             venue.city?.toLowerCase().includes(searchVenue.toLowerCase()) || 
                             venue.state?.toLowerCase().includes(searchVenue.toLowerCase()) || 
                             venue.zip?.toLowerCase().includes(searchVenue.toLowerCase()))
                          )
                          .map(venue => (
                            <div
                              key={venue.id}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, venue_id: venue.id }));
                                setSearchVenue(venue.name || '');
                              }}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              {venue.name} {venue.street_address && `(${venue.street_address})`} {venue.city && `, ${venue.city}`} {venue.state && `, ${venue.state}`} {venue.zip}
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
      </Dialog>
    </Transition>
  );
}