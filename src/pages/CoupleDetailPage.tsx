import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, User, MapPin, Calendar, Package, CreditCard, MessageSquare, Clock, Check, XCircle, AlertCircle, Star, Edit, Phone, Save, Plus, Mail, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Couple {
  id: string;
  user_id: string;
  name: string;
  partner1_name: string | null;
  partner2_name: string | null;
  wedding_date: string | null;
  budget: number | null;
  vibe_tags: string[] | null;
  phone: string | null;
  email: string | null;
  venue_id: string | null;
  venue_name: string | null;
  venue_city: string | null;
  venue_state: string | null;
  guest_count: number | null;
}

interface Venue {
  id: string;
  name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface Booking {
  id: string;
  couple_id: string;
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
}

interface Event {
  id: string;
  couple_id: string;
  start_time: string;
  end_time: string;
  type: string;
  title: string;
  created_at: string;
}

interface ServicePackage {
  id: string;
  name: string;
  service_type: string;
  description: string | null;
  price: number;
  vendor_id: string;
  event_type: string | null;
}

interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface VendorReview {
  id: string;
  couple_id: string;
  vendor_id: string;
  vendor_name: string | null;
  rating: number;
  review_text: string;
  created_at: string;
}

export default function CoupleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [coupleEmail, setCoupleEmail] = useState<string | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({
    name: false,
    partner1_name: false,
    partner2_name: false,
    wedding_date: false,
    budget: false,
    vibe_tags: false,
    phone: false,
    email: false,
    guest_count: false,
  });
  const [formData, setFormData] = useState({
    name: '',
    partner1_name: '',
    partner2_name: '',
    wedding_date: '',
    budget: '',
    vibe_tags: '',
    phone: '',
    email: '',
    guest_count: '',
  });
  const [newReview, setNewReview] = useState({ rating: 5, review_text: '', vendor_id: null as string | null });
  const [showAddReview, setShowAddReview] = useState(false);
  const [addingReview, setAddingReview] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupleData();
    fetchVendors();
  }, [id]);

  const fetchCoupleData = async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Couple ID is undefined');

      // Fetch couple details
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select(`
          id, user_id, name, partner1_name, partner2_name, wedding_date, budget, vibe_tags, phone, email,
          venue_id, venue_name, venue_city, venue_state, guest_count
        `)
        .eq('id', id)
        .single();

      if (coupleError) {
        console.error('Couple fetch error:', coupleError);
        throw coupleError;
      }
      console.log('Fetched couple:', coupleData);
      setCouple(coupleData);
      setFormData({
        name: coupleData.name || '',
        partner1_name: coupleData.partner1_name || '',
        partner2_name: coupleData.partner2_name || '',
        wedding_date: coupleData.wedding_date || '',
        budget: coupleData.budget ? coupleData.budget.toString() : '',
        vibe_tags: coupleData.vibe_tags ? coupleData.vibe_tags.join(', ') : '',
        phone: coupleData.phone || '',
        email: coupleData.email || '',
        guest_count: coupleData.guest_count ? coupleData.guest_count.toString() : '',
      });

      // Fetch email from users table
      if (coupleData.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', coupleData.user_id)
          .maybeSingle();
        if (userError) {
          console.error('User fetch error:', userError);
          throw userError;
        }
        console.log('Fetched user email:', userData?.email);
        setCoupleEmail(userData?.email || null);
        if (!userData) {
          console.warn(`No user found for user_id: ${coupleData.user_id}`);
          toast.warn('No email found for this couple in users table.');
        }
      }

      // Fetch venue details
      if (coupleData.venue_id) {
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .select('id, name, street_address, city, state, zip')
          .eq('id', coupleData.venue_id)
          .single();
        if (venueError) {
          console.error('Venue fetch error:', venueError);
          throw venueError;
        }
        console.log('Fetched venue:', venueData);
        setVenue(venueData);
      }

      // Fetch bookings with vendor, package, and venue details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id, couple_id, vendor_id, status, amount, service_type, package_id, created_at, venue_id
        `)
        .eq('couple_id', id);
      if (bookingsError) {
        console.error('Bookings fetch error:', bookingsError);
        throw bookingsError;
      }
      console.log('Fetched bookings:', bookingsData);

      // Fetch additional details for bookings
      let bookingsWithDetails: Booking[] = [];
      if (bookingsData && bookingsData.length > 0) {
        // Fetch vendor details (name, phone, user_id for email lookup)
        const vendorIds = [...new Set(bookingsData.map(b => b.vendor_id).filter(id => id))];
        let vendorMap = new Map<string, { name: string; phone: string | null; user_id: string | null }>();
        if (vendorIds.length > 0) {
          const { data: vendorsData, error: vendorsError } = await supabase
            .from('vendors')
            .select('id, name, phone, user_id')
            .in('id', vendorIds);
          if (vendorsError) {
            console.error('Vendors for bookings fetch error:', vendorsError);
            toast.warn('Failed to fetch vendor details for bookings');
          } else {
            console.log('Fetched vendors for bookings:', vendorsData);
            vendorMap = new Map(vendorsData?.map(v => [v.id, { name: v.name, phone: v.phone, user_id: v.user_id }]) || []);
          }
        }

        // Fetch vendor emails from users table
        const vendorUserIds = [...new Set([...vendorMap.values()].map(v => v.user_id).filter(id => id))];
        let emailMap = new Map<string, string | null>();
        if (vendorUserIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, email')
            .in('id', vendorUserIds as string[]);
          if (usersError) {
            console.error('Users for vendor emails fetch error:', usersError);
            toast.warn('Failed to fetch vendor emails');
          } else {
            console.log('Fetched vendor emails:', usersData);
            emailMap = new Map(usersData?.map(u => [u.id, u.email]) || []);
          }
        }

        // Fetch service package details
        const packageIds = [...new Set(bookingsData.map(b => b.package_id).filter(id => id))];
        let packageMap = new Map<string, { name: string; description: string | null; price: number | null }>();
        if (packageIds.length > 0) {
          const { data: packagesData, error: packagesError } = await supabase
            .from('service_packages')
            .select('id, name, description, price')
            .in('id', packageIds);
          if (packagesError) {
            console.error('Service packages for bookings fetch error:', packagesError);
            toast.warn('Failed to fetch service package details');
          } else {
            console.log('Fetched service packages for bookings:', packagesData);
            packageMap = new Map(packagesData?.map(p => [p.id, { name: p.name, description: p.description, price: p.price }]) || []);
          }
        }

        // Fetch venue details
        const venueIds = [...new Set(bookingsData.map(b => b.venue_id).filter(id => id))];
        let venueMap = new Map<string, { name: string; address: string | null }>();
        if (venueIds.length > 0) {
          const { data: venuesData, error: venuesError } = await supabase
            .from('venues')
            .select('id, name, street_address, city, state, zip')
            .in('id', venueIds);
          if (venuesError) {
            console.error('Venues for bookings fetch error:', venuesError);
            toast.warn('Failed to fetch venue details for bookings');
          } else {
            console.log('Fetched venues for bookings:', venuesData);
            venueMap = new Map(venuesData?.map(v => [
              v.id,
              {
                name: v.name,
                address: `${v.street_address || ''}${v.city && v.state ? `, ${v.city}, ${v.state} ${v.zip || ''}` : ''}`.trim() || null
              }
            ]) || []);
          }
        }

        // Combine all details
        bookingsWithDetails = bookingsData.map(b => ({
          id: b.id,
          couple_id: b.couple_id,
          vendor_id: b.vendor_id,
          vendor_name: vendorMap.get(b.vendor_id)?.name || null,
          vendor_phone: vendorMap.get(b.vendor_id)?.phone || null,
          vendor_email: b.vendor_id && vendorMap.get(b.vendor_id)?.user_id
            ? emailMap.get(vendorMap.get(b.vendor_id)!.user_id!) || null
            : null,
          status: b.status,
          amount: b.amount,
          service_type: b.service_type,
          package_id: b.package_id,
          package_name: b.package_id ? packageMap.get(b.package_id)?.name || null : null,
          package_description: b.package_id ? packageMap.get(b.package_id)?.description || null : null,
          package_price: b.package_id ? packageMap.get(b.package_id)?.price || null : null,
          venue_id: b.venue_id,
          venue_name: b.venue_id ? venueMap.get(b.venue_id)?.name || null : null,
          venue_address: b.venue_id ? venueMap.get(b.venue_id)?.address || null : null,
          created_at: b.created_at
        }));
      }
      setBookings(bookingsWithDetails);
      console.log('Bookings with details:', bookingsWithDetails);

      // Fetch service packages for display
      const packageIdsForDisplay = bookingsData?.map(b => b.package_id).filter(id => id) || [];
      if (packageIdsForDisplay.length > 0) {
        const { data: packagesData, error: packagesError } = await supabase
          .from('service_packages')
          .select(`
            id, name, service_type, description, price, vendor_id, event_type
          `)
          .in('id', packageIdsForDisplay);
        if (packagesError) {
          console.error('Service packages fetch error:', packagesError);
          toast.warn('Failed to fetch service packages');
        } else {
          console.log('Fetched service packages:', packagesData);
          setServicePackages(packagesData || []);
        }
      }

      // Fetch payments
      const bookingIds = bookingsData?.map(b => b.id) || [];
      if (bookingIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('id, booking_id, amount, status, created_at')
          .in('booking_id', bookingIds);
        if (paymentsError) {
          console.error('Payments fetch error:', paymentsError);
          throw paymentsError;
        }
        console.log('Fetched payments:', paymentsData);
        setPayments(paymentsData || []);
      }

      // Fetch events (all events for sorting)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, couple_id, start_time, end_time, type, title, created_at')
        .eq('couple_id', id)
        .order('start_time', { ascending: true });
      if (eventsError) {
        console.error('Events fetch error:', eventsError);
        throw eventsError;
      }
      console.log('Fetched events:', eventsData);
      setEvents(eventsData || []);

      // Fetch reviews with vendor names
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('vendor_reviews')
        .select(`
          id, couple_id, vendor_id, rating, review_text, created_at,
          vendors!vendor_reviews_vendor_id_fkey(name)
        `)
        .eq('couple_id', id);
      if (reviewsError) {
        console.error('Reviews fetch error:', reviewsError);
        toast.warn('Failed to fetch reviews');
      } else {
        console.log('Fetched reviews:', reviewsData);
        setReviews(reviewsData?.map(r => ({
          ...r,
          vendor_name: r.vendors?.name || null
        })) || []);
      }
    } catch (error: any) {
      console.error('Error fetching couple data:', error);
      toast.error('Failed to load couple data');
      navigate('/dashboard/couples');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) {
        console.error('Vendors fetch error:', error);
        throw error;
      }
      console.log('Fetched vendors:', data);
      setVendors(data || []);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    }
  };

  const handleSaveField = async (field: string) => {
    if (!couple) return;

    setLoading(true);
    try {
      const updateData: Partial<Couple> = {};
      switch (field) {
        case 'name':
          updateData.name = formData.name.trim() || null;
          break;
        case 'partner1_name':
          updateData.partner1_name = formData.partner1_name.trim() || null;
          break;
        case 'partner2_name':
          updateData.partner2_name = formData.partner2_name.trim() || null;
          break;
        case 'wedding_date':
          updateData.wedding_date = formData.wedding_date || null;
          break;
        case 'budget':
          updateData.budget = formData.budget ? parseInt(formData.budget) : null;
          break;
        case 'vibe_tags':
          updateData.vibe_tags = formData.vibe_tags
            ? formData.vibe_tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
            : [];
          break;
        case 'phone':
          updateData.phone = formData.phone.trim() || null;
          break;
        case 'email':
          updateData.email = formData.email.trim() || null;
          break;
        case 'guest_count':
          updateData.guest_count = formData.guest_count ? parseInt(formData.guest_count) : null;
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from('couples')
        .update(updateData)
        .eq('id', couple.id);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      setCouple(prev => prev ? { ...prev, ...updateData } : null);
      toast.success(`${field.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} updated successfully!`);
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    } finally {
      setLoading(false);
      setEditMode(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleAddReview = async () => {
    if (!couple || !newReview.review_text.trim() || !newReview.vendor_id) return;

    setAddingReview(true);
    try {
      const { data, error } = await supabase
        .from('vendor_reviews')
        .insert({
          couple_id: couple.id,
          vendor_id: newReview.vendor_id,
          rating: newReview.rating,
          review_text: newReview.review_text.trim()
        })
        .select(`
          id, couple_id, vendor_id, rating, review_text, created_at,
          vendors!vendor_reviews_vendor_id_fkey(name)
        `)
        .single();

      if (error) {
        console.error('Review insert error:', error);
        throw error;
      }

      setReviews(prev => [...prev, {
        ...data,
        vendor_name: data.vendors?.name || null
      }]);
      setNewReview({ rating: 5, review_text: '', vendor_id: null });
      setShowAddReview(false);
      toast.success('Review added successfully!');
    } catch (error: any) {
      console.error('Error adding review:', error);
      toast.error('Failed to add review');
    } finally {
      setAddingReview(false);
    }
  };

  const handleResetPassword = async () => {
    if (!couple?.user_id || !coupleEmail || !isValidEmail(coupleEmail)) {
      toast.error('Invalid or missing email address for this couple.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(coupleEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      toast.success('Password reset email sent! Check your inbox or spam folder.');
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast.error(`Failed to send password reset email: ${error.message}`);
    }
  };

  const handleSendLoginEmail = async () => {
    if (!couple?.user_id || !coupleEmail || !isValidEmail(coupleEmail)) {
      toast.error('Invalid or missing email address for this couple.');
      return;
    }
    try {
      const response = await supabase.functions.invoke('send-email', {
        body: { user_id: coupleEmail, type: 'login' },
      });
      if (response.error) throw response.error;
      toast.success('Login email sent! Check your inbox or spam folder.');
    } catch (error: any) {
      console.error('Error sending login email:', error);
      toast.error(`Failed to send login email: ${error.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return <Check className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderStars = (rating: number, interactive: boolean = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRatingChange && onRatingChange(star)}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            disabled={!interactive}
          >
            <Star
              className={`h-5 w-5 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            />
          </button>
        ))}
      </div>
    );
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const toggleBookingDetails = (bookingId: string) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId);
  };

  const toggleEventDetails = (eventId: string) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  const togglePackageDetails = (packageId: string) => {
    setExpandedPackage(expandedPackage === packageId ? null : packageId);
  };

  // Filter upcoming events (after current date, limit to 5 unless showAllEvents is true)
  const currentDate = new Date('2025-06-10T12:36:00-04:00'); // Current date: June 10, 2025, 12:36 PM EDT
  const upcomingEvents = events
    .filter(event => new Date(event.start_time) > currentDate)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const displayedEvents = showAllEvents ? upcomingEvents : upcomingEvents.slice(0, 5);

  // Format currency (divide by 100 for cents to dollars, 2 decimal places)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!couple) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Users className="h-8 w-8 text-blue-600 mr-3" />
          {couple.name}
        </h1>
        <div className="space-x-2">
          <button
            onClick={handleResetPassword}
            className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            disabled={!couple.user_id || !coupleEmail || !isValidEmail(coupleEmail)}
          >
            <Key className="h-4 w-4 mr-1" />
            Reset Password
          </button>
          <button
            onClick={handleSendLoginEmail}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={!couple.user_id || !coupleEmail || !isValidEmail(coupleEmail)}
          >
            <Mail className="h-4 w-4 mr-1" />
            Send Login Email
          </button>
          <button
            onClick={() => navigate('/dashboard/couples')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Couples
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="h-5 w-5 text-blue-600 mr-2" />
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {editMode.name ? (
              <>
                <label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2">Couple Name</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Smith & Johnson"
                />
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('name')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading || !formData.name.trim()}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, name: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Couple Name</label>
                <p className="text-sm text-gray-900">{couple.name}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, name: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            {editMode.partner1_name || editMode.partner2_name ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="partner1_name" className="text-sm font-medium text-gray-700 mb-2">Partner 1 Name</label>
                    <input
                      type="text"
                      id="partner1_name"
                      value={formData.partner1_name}
                      onChange={(e) => setFormData({ ...formData, partner1_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Alex"
                    />
                  </div>
                  <div>
                    <label htmlFor="partner2_name" className="text-sm font-medium text-gray-700 mb-2">Partner 2 Name</label>
                    <input
                      type="text"
                      id="partner2_name"
                      value={formData.partner2_name}
                      onChange={(e) => setFormData({ ...formData, partner2_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Taylor"
                    />
                  </div>
                </div>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => {
                      handleSaveField('partner1_name');
                      handleSaveField('partner2_name');
                    }}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, partner1_name: false, partner2_name: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Partners</label>
                <p className="text-sm text-gray-900">
                  {couple.partner1_name && couple.partner2_name
                    ? `${couple.partner1_name} & ${couple.partner2_name}`
                    : 'Not specified'}
                </p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, partner1_name: true, partner2_name: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            {editMode.email ? (
              <>
                <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., couple@example.com"
                />
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('email')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading || !isValidEmail(formData.email)}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, email: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm text-gray-900">{coupleEmail || couple.email || 'No email'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, email: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            {editMode.phone ? (
              <>
                <label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(555) 123-4567"
                />
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('phone')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, phone: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  Phone
                </label>
                <p className="text-sm text-gray-900">{couple.phone || 'No phone'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, phone: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            {editMode.wedding_date ? (
              <>
                <label htmlFor="wedding_date" className="text-sm font-medium text-gray-700 mb-2">Wedding Date</label>
                <input
                  type="date"
                  id="wedding_date"
                  value={formData.wedding_date}
                  onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('wedding_date')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, wedding_date: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Wedding Date</label>
                <p className="text-sm text-gray-900">
                  {couple.wedding_date ? new Date(couple.wedding_date).toLocaleDateString() : 'Not set'}
                </p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, wedding_date: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            {editMode.budget ? (
              <>
                <label htmlFor="budget" className="text-sm font-medium text-gray-700 mb-2">Budget</label>
                <input
                  type="number"
                  id="budget"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 50000"
                />
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('budget')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, budget: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Budget</label>
                <p className="text-sm text-gray-900">
                  {couple.budget ? `$${couple.budget.toLocaleString()}` : 'Not set'}
                </p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, budget: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            {editMode.guest_count ? (
              <>
                <label htmlFor="guest_count" className="text-sm font-medium text-gray-700 mb-2">Guest Count</label>
                <input
                  type="number"
                  id="guest_count"
                  value={formData.guest_count}
                  onChange={(e) => setFormData({ ...formData, guest_count: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 150"
                />
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('guest_count')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, guest_count: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Guest Count</label>
                <p className="text-sm text-gray-900">{couple.guest_count || 'Not set'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, guest_count: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
        {editMode.vibe_tags ? (
          <div className="mt-4">
            <label htmlFor="vibe_tags" className="text-sm font-medium text-gray-700 mb-2">Vibe Tags</label>
            <input
              type="text"
              id="vibe_tags"
              value={formData.vibe_tags}
              onChange={(e) => setFormData({ ...formData, vibe_tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., rustic, modern, boho"
            />
            <div className="mt-2 space-x-2">
              <button
                onClick={() => handleSaveField('vibe_tags')}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </button>
              <button
                onClick={() => setEditMode(prev => ({ ...prev, vibe_tags: false }))}
                className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          couple.vibe_tags && couple.vibe_tags.length > 0 && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Vibe Tags</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {couple.vibe_tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setEditMode(prev => ({ ...prev, vibe_tags: true }))}
                className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </button>
            </div>
          )
        )}
      </div>

      {venue && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 text-blue-600 mr-2" />
            Venue Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Venue Name</label>
              <p className="text-sm text-gray-900">{venue.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-sm text-gray-900">
                {venue.street_address || 'No address provided'}
                {venue.city && venue.state && `, ${venue.city}, ${venue.state} ${venue.zip || ''}`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Bookings ({bookings.length})
        </h2>
        {bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-gray-50 border border-gray-200 rounded-lg">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleBookingDetails(booking.id)}
                >
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{booking.vendor_name || 'Unknown Vendor'}</h4>
                    <p className="text-sm text-gray-600">{booking.service_type}</p>
                  </div>
                  <div className="text-right flex items-center space-x-4">
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-2 capitalize">{booking.status}</span>
                      </span>
                      <p className="text-sm text-gray-600 mt-1">{formatCurrency(booking.amount)}</p>
                    </div>
                    {expandedBooking === booking.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                </div>
                {expandedBooking === booking.id && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Vendor Information</h5>
                        <p><span className="font-medium">Name:</span> {booking.vendor_name || 'N/A'}</p>
                        <p><span className="font-medium">Phone:</span> {booking.vendor_phone || 'N/A'}</p>
                        <p><span className="font-medium">Email:</span> {booking.vendor_email || 'N/A'}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Service Package</h5>
                        <p><span className="font-medium">Name:</span> {booking.package_name || 'N/A'}</p>
                        <p><span className="font-medium">Price:</span> {booking.package_price ? formatCurrency(booking.package_price) : 'N/A'}</p>
                        <p><span className="font-medium">Description:</span> {booking.package_description || 'N/A'}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Venue</h5>
                        <p><span className="font-medium">Name:</span> {booking.venue_name || 'N/A'}</p>
                        <p><span className="font-medium">Address:</span> {booking.venue_address || 'N/A'}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Booking Details</h5>
                        <p><span className="font-medium">Service Type:</span> {booking.service_type || 'N/A'}</p>
                        <p><span className="font-medium">Booked On:</span> {new Date(booking.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No bookings</h4>
            <p className="text-gray-500">This couple hasn't made any bookings yet.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Upcoming Events ({displayedEvents.length} of {upcomingEvents.length})
        </h2>
        {displayedEvents.length > 0 ? (
          <div className="space-y-4">
            {displayedEvents.map((event) => (
              <div key={event.id} className="bg-gray-50 border border-gray-200 rounded-lg">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleEventDetails(event.id)}
                >
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{event.title || event.type}</h4>
                    <p className="text-sm text-gray-600">{event.type}</p>
                  </div>
                  <div className="text-right flex items-center space-x-4">
                    <p className="text-sm text-gray-600">
                      {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleTimeString()}
                    </p>
                    {expandedEvent === event.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                </div>
                {expandedEvent === event.id && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="text-sm">
                      <p><span className="font-medium">Title:</span> {event.title || 'N/A'}</p>
                      <p><span className="font-medium">Type:</span> {event.type || 'N/A'}</p>
                      <p><span className="font-medium">Start Time:</span> {new Date(event.start_time).toLocaleString()}</p>
                      <p><span className="font-medium">End Time:</span> {new Date(event.end_time).toLocaleString()}</p>
                      <p><span className="font-medium">Created:</span> {new Date(event.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {upcomingEvents.length > 5 && !showAllEvents && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowAllEvents(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View More Events
                </button>
              </div>
            )}
            {showAllEvents && upcomingEvents.length > 5 && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowAllEvents(false)}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Show Less
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No upcoming events</h4>
            <p className="text-gray-500">This couple has no scheduled events.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Package className="h-5 w-5 text-blue-600 mr-2" />
          Booked Service Packages ({servicePackages.length})
        </h2>
        {servicePackages.length > 0 ? (
          <div className="space-y-4">
            {servicePackages.map((pkg) => (
              <div key={pkg.id} className="bg-gray-50 border border-gray-200 rounded-lg">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => togglePackageDetails(pkg.id)}
                >
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{pkg.name}</h4>
                    <p className="text-sm text-gray-600">{pkg.service_type}</p>
                  </div>
                  <div className="text-right flex items-center space-x-4">
                    <p className="text-sm text-gray-600">{formatCurrency(pkg.price)}</p>
                    {expandedPackage === pkg.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                </div>
                {expandedPackage === pkg.id && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="text-sm">
                      <p><span className="font-medium">Name:</span> {pkg.name || 'N/A'}</p>
                      <p><span className="font-medium">Service Type:</span> {pkg.service_type || 'N/A'}</p>
                      <p><span className="font-medium">Price:</span> {formatCurrency(pkg.price)}</p>
                      <p><span className="font-medium">Description:</span> {pkg.description || 'N/A'}</p>
                      <p><span className="font-medium">Event Type:</span> {pkg.event_type || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No service packages</h4>
            <p className="text-gray-500">This couple hasn't booked any service packages.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
          Payments ({payments.length})
        </h2>
        {payments.length > 0 ? (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Payment ID: {payment.id}</h4>
                    <p className="text-sm text-gray-600">Booking ID: {payment.booking_id}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                      <span className="ml-2 capitalize">{payment.status}</span>
                    </span>
                    <p className="text-sm text-gray-600 mt-1">{formatCurrency(payment.amount)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Paid on: {new Date(payment.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No payments</h4>
            <p className="text-gray-500">This couple hasn't made any payments yet.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
          Reviews ({reviews.length})
        </h2>
        {showAddReview && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h4 className="text-md font-medium text-green-900 mb-4">Add New Review</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">Vendor</label>
                <select
                  value={newReview.vendor_id || ''}
                  onChange={(e) => setNewReview({ ...newReview, vendor_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select a vendor</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">Rating</label>
                {renderStars(newReview.rating, true, (rating) =>
                  setNewReview({ ...newReview, rating })
                )}
              </div>
              <div>
                <label htmlFor="review_text" className="block text-sm font-medium text-green-800 mb-2">
                  Review Text *
                </label>
                <textarea
                  id="review_text"
                  rows={4}
                  value={newReview.review_text}
                  onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter review text..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddReview(false);
                    setNewReview({ rating: 5, review_text: '', vendor_id: null });
                  }}
                  className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddReview}
                  disabled={addingReview || !newReview.review_text.trim() || !newReview.vendor_id}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingReview ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((review) => (
                <div key={review.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {renderStars(review.rating)}
                      <span className="text-sm font-medium text-gray-900">
                        {review.rating}/5.0
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{review.review_text}</p>
                  <p className="text-sm text-gray-600">Vendor: {review.vendor_name || 'Unknown'}</p>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h4>
            <p className="text-gray-500">This couple hasn't written any reviews yet.</p>
            <button
              onClick={() => setShowAddReview(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add First Review
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/dashboard/couples')}
        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        Back to Couples
      </button>
    </div>
  );
}