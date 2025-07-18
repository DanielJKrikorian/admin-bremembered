import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Edit, Save, X, Check, Clock, AlertCircle, CreditCard, Package, MapPin, Eye, Mail, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  couple_id: string;
  couple_name: string | null;
  couple_email: string | null;
  vendor_id: string;
  vendor_name: string | null;
  vendor_phone: string | null;
  vendor_email: string | null;
  status: string;
  amount: number;
  service_type: string;
  package_id: string | null;
  package_name: string | null;
  package_description: string | null;
  package_price: number | null;
  venue_id: string | null;
  venue_name: string | null;
  venue_address: string | null;
  created_at: string;
  events: Array<{ id: string; start_time: string; end_time: string; title: string }>;
}

interface Venue {
  id: string;
  name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  service_type: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  stripe_payment_id: string | null;
  created_at: string;
  to_platform: boolean;
}

interface EmailLog {
  id: string;
  booking_id: string;
  vendor_id: string;
  couple_id: string;
  email_to: string;
  subject: string;
  sent_at: string;
  opened_at: string | null;
  opened: boolean;
  type: string;
  content: string;
}

interface UpcomingReminder {
  id: string;
  booking_id: string;
  event_id: string;
  type: 'Email' | 'Text' | 'Feedback';
  scheduled_at: string;
  recipient: string;
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({ 
    status: false,
    package: false,
    venue: false 
  });
  const [formData, setFormData] = useState({ 
    status: '',
    package_id: '',
    venue_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [eventPage, setEventPage] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<UpcomingReminder[]>([]);

  useEffect(() => {
    fetchBooking();
    fetchPackages();
    fetchVenues();
  }, [id, eventPage]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Booking ID is undefined');

      const [bookingData, emailLogsData, remindersData] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, couple_id, vendor_id, status, amount, service_type, package_id, created_at, venue_id')
          .eq('id', id)
          .single(),
        supabase
          .from('email_logs')
          .select('*')
          .eq('booking_id', id),
        supabase
          .from('upcoming_reminders')
          .select('*')
          .eq('booking_id', id)
      ]);

      if (bookingData.error) throw bookingData.error;
      if (emailLogsData.error) throw emailLogsData.error;
      if (remindersData.error) throw remindersData.error;

      // Log booking data for debugging
      console.log('Booking data from Supabase:', bookingData.data);

      let coupleName = null, coupleEmail = null;
      if (bookingData.data.couple_id) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('partner1_name, email')
          .eq('id', bookingData.data.couple_id)
          .single();
        coupleName = coupleData?.partner1_name || 'Unknown';
        coupleEmail = coupleData?.email || null;
      }

      let vendorName = null, vendorPhone = null, vendorEmail = null;
      if (bookingData.data.vendor_id) {
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('name, phone, user_id')
          .eq('id', bookingData.data.vendor_id)
          .single();
        vendorName = vendorData?.name || 'Unknown';
        vendorPhone = vendorData?.phone || null;
        if (vendorData?.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', vendorData.user_id)
            .single();
          vendorEmail = userData?.email || null;
        }
      }

      let venueName = null, venueAddress = null;
      if (bookingData.data.venue_id) {
        const { data: venueData } = await supabase
          .from('venues')
          .select('name, street_address, city, state, zip')
          .eq('id', bookingData.data.venue_id)
          .single();
        venueName = venueData?.name || null;
        venueAddress = venueData
          ? `${venueData.street_address || ''}${venueData.city && venueData.state ? `, ${venueData.city}, ${venueData.state} ${venueData.zip || ''}` : ''}`.trim()
          : null;
        setVenue(venueData || null);
      }

      let packageName = null, packageDescription = null, packagePrice = null;
      if (bookingData.data.package_id) {
        const { data: packageData } = await supabase
          .from('service_packages')
          .select('name, description, price')
          .eq('id', bookingData.data.package_id)
          .single();
        packageName = packageData?.name || null;
        packageDescription = packageData?.description || null;
        packagePrice = packageData?.price || null;
      }

      const { data: eventsData } = await supabase
        .from('events')
        .select('id, start_time, end_time, title')
        .eq('couple_id', bookingData.data.couple_id)
        .eq('vendor_id', bookingData.data.vendor_id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .range(eventPage * 5, eventPage * 5 + 4);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, status, stripe_payment_id, created_at, to_platform')
        .eq('booking_id', id);

      if (paymentsError) throw paymentsError;

      const newBooking = {
        ...bookingData.data,
        couple_name: coupleName,
        couple_email: coupleEmail,
        vendor_name: vendorName,
        vendor_phone: vendorPhone,
        vendor_email: vendorEmail,
        package_name: packageName,
        package_description: packageDescription,
        package_price: packagePrice,
        venue_name: venueName,
        venue_address: venueAddress,
        events: eventsData || []
      };

      setBooking(newBooking);
      setPayments(paymentsData || []);
      setEmailLogs(emailLogsData.data || []);
      setUpcomingReminders(remindersData.data || []);
      setFormData({
        status: bookingData.data.status,
        package_id: bookingData.data.package_id || '',
        venue_id: bookingData.data.venue_id || ''
      });
    } catch (error: any) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking');
      navigate('/dashboard/bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      console.log('Fetching all packages from service_packages');
      const { data, error } = await supabase
        .from('service_packages')
        .select('id, name, description, price, service_type');
      if (error) throw error;
      console.log('Fetched packages:', data);
      setPackages(data || []);
      if (!data || data.length === 0) {
        toast.info('No packages found in the database');
      }
    } catch (error: any) {
      console.error('Error fetching packages:', JSON.stringify(error, null, 2));
      toast.error('Failed to load packages');
      setPackages([]);
    }
  };

  const fetchVenues = async () => {
    try {
      console.log('Fetching all venues');
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, street_address, city, state, zip');
      if (error) throw error;
      console.log('Fetched venues:', data);
      setVenues(data || []);
      if (!data || data.length === 0) {
        toast.info('No venues found');
      }
    } catch (error: any) {
      console.error('Error fetching venues:', JSON.stringify(error, null, 2));
      toast.error('Failed to load venues');
      setVenues([]);
    }
  };

  const handleSaveField = async (field: string) => {
    if (!booking) return;

    setLoading(true);
    try {
      let updateData: any = { [field]: formData[field] };

      if (field === 'package_id') {
        const selectedPackage = packages.find(p => p.id === formData.package_id);
        if (selectedPackage) {
          updateData = {
            package_id: formData.package_id,
            amount: selectedPackage.price || booking.amount,
            service_type: selectedPackage.service_type,
          };
        }
      } else if (field === 'venue_id') {
        const selectedVenue = venues.find(v => v.id === formData.venue_id);
        if (selectedVenue) {
          updateData = {
            venue_id: formData.venue_id
          };
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);

      if (error) throw error;

      if (field === 'package_id' || field === 'venue_id') {
        await fetchBooking(); // Refresh booking to update dependent fields
      } else {
        setBooking(prev => prev ? { ...prev, ...updateData } : null);
      }

      setEditMode(prev => ({ ...prev, [field]: false }));
      toast.success(`${field} updated successfully!`);
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return <Check className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled': return <X className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const sendReminderEmail = async () => {
    if (!booking?.vendor_email) {
      toast.error('No vendor email available');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-reminder-email', {
        body: { user_id: booking.vendor_email, booking_id: booking.id },
      });
      if (error) throw error;
      toast.success('Reminder email sent successfully');
      fetchBooking();
    } catch (error: any) {
      console.error('Error sending reminder email:', error);
      toast.error('Failed to send reminder email');
    }
  };

  const sendReminderText = async () => {
    if (!booking?.vendor_phone) {
      toast.error('No vendor phone number available');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-reminder-text', {
        body: { phone: booking.vendor_phone, booking_id: booking.id },
      });
      if (error) throw error;
      toast.success('Reminder text sent successfully');
      fetchBooking();
    } catch (error: any) {
      console.error('Error sending reminder text:', error);
      toast.error('Failed to send reminder text');
    }
  };

  const sendFeedbackEmail = async () => {
    if (!booking?.couple_id) {
      toast.error('No couple ID available');
      return;
    }

    try {
      const { error } = await supabase
        .from('review_trigger')
        .insert({ couple_id: booking.couple_id, send_request: true });

      if (error) throw error;

      toast.success('Feedback request recorded successfully');
      fetchBooking();
    } catch (error: any) {
      console.error('Error recording feedback request:', error);
      toast.error('Failed to record feedback request');
    }
  };

  if (loading || !booking) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasMoreEvents = booking.events.length === 5;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Booking: {booking.couple_name} - {booking.service_type}
        </h1>
        <button
          onClick={() => navigate('/dashboard/bookings')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Bookings & Events
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Booking Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Couple</label>
            <p className="text-sm text-gray-900">{booking.couple_name}</p>
            <div className="mt-2">
              <button
                onClick={sendFeedbackEmail}
                className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
              >
                <Mail className="h-4 w-4 mr-1" />
                Send Feedback Request
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Vendor</label>
            <p className="text-sm text-gray-900">{booking.vendor_name}</p>
            <p className="text-sm text-gray-600">{booking.vendor_email || 'No email'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Vendor Phone</label>
            <p className="text-sm text-gray-900">{booking.vendor_phone || 'N/A'}</p>
            <div className="mt-2 space-x-2">
              <button
                onClick={sendReminderEmail}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Mail className="h-4 w-4 mr-1" />
                Send Email Reminder
              </button>
              <button
                onClick={sendReminderText}
                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Send Text Reminder
              </button>
            </div>
          </div>
          <div>
            {editMode.status ? (
              <>
                <label htmlFor="status" className="text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('status')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, status: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-sm text-gray-900 flex items-center">
                  {getStatusIcon(booking.status)}
                  <span className="ml-2 capitalize">{booking.status}</span>
                </p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, status: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Amount</label>
            <p className="text-sm text-gray-900">${(booking.amount / 100).toFixed(2)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Service Type</label>
            <p className="text-sm text-gray-900">{booking.service_type}</p>
          </div>
          <div>
            {editMode.package ? (
              <>
                <label htmlFor="package" className="text-sm font-medium text-gray-700 mb-2">Package</label>
                <select
                  id="package"
                  value={formData.package_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, package_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </select>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('package_id')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading || !formData.package_id}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, package: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Package</label>
                <p className="text-sm text-gray-900">{booking.package_name || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, package: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Package Price</label>
            <p className="text-sm text-gray-900">{booking.package_price ? `$${(booking.package_price / 100).toFixed(2)}` : 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Package Description</label>
            <p className="text-sm text-gray-900">{booking.package_description || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="text-sm text-gray-900">{new Date(booking.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 text-blue-600 mr-2" />
          Venue Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {editMode.venue ? (
              <>
                <label htmlFor="venue" className="text-sm font-medium text-gray-700 mb-2">Venue</label>
                <select
                  id="venue"
                  value={formData.venue_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('venue_id')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading || !formData.venue_id}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, venue: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Venue Name</label>
                <p className="text-sm text-gray-900">{venue?.name || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, venue: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Address</label>
            <p className="text-sm text-gray-900">
              {venue?.street_address || 'No address provided'}
              {venue?.city && venue?.state && `, ${venue.city}, ${venue.state} ${venue.zip || ''}`}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Related Events ({booking.events.length})
        </h2>
        {booking.events.length > 0 ? (
          <div className="space-y-4">
            {booking.events.map((event) => (
              <div key={event.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-600">{new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard/event/${event.id}`)}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>
                </div>
              </div>
            ))}
            {hasMoreEvents && (
              <button
                onClick={() => setEventPage(prev => prev + 1)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next 5
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No related events</h3>
            <p className="text-gray-500">No events associated with this booking.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
          Payments ({payments.length})
        </h2>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">${(payment.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.to_platform ? 'B. Remembered' : 'Vendor'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">No payments associated with this booking.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Reminders</h2>
        {upcomingReminders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingReminders.map((reminder) => (
                  <tr key={reminder.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{reminder.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(reminder.scheduled_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{reminder.recipient}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming reminders</h3>
            <p className="text-gray-500">All reminders are either sent or not scheduled yet.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email/Text Logs</h2>
        {emailLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opened</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emailLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{log.email_to}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.sent_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.opened_at ? new Date(log.opened_at).toLocaleString() : 'Not Opened'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No email logs</h3>
            <p className="text-gray-500">No emails or texts have been sent for this booking yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
