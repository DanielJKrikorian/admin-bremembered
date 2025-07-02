import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Upload, Plus, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import ImportBookingsModal from '../components/ImportBookingsModal';
import AddBookingModal from '../components/AddBookingModal';
import AddEventModal from '../components/AddEventModal';

interface Booking {
  id: string;
  couple_id: string;
  couple_name: string;
  vendor_id: string;
  vendor_name: string;
  status: string;
  amount: number;
  service_type: string;
  event_start_datetime: string; // Combined date and time in EST
  event_id: string; // To store event_id for lookup
}

interface Event {
  id: string;
  couple_id: string;
  couple_name: string;
  vendor_id: string;
  vendor_name: string;
  start_time: string;
  end_time: string;
  type: string;
  title: string;
  created_at: string;
}

export default function BookingAndEventsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleEvents, setVisibleEvents] = useState(5);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddBookingModalOpen, setIsAddBookingModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [activeBookingTab, setActiveBookingTab] = useState<'upcoming' | 'past'>('upcoming');
  const [activeEventTab, setActiveEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bookingsData, eventsData] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            id, couple_id, vendor_id, status, amount, service_type, event_id,
            couples!bookings_couple_id_fkey(name),
            vendors!bookings_vendor_id_fkey(name)
          `),
        supabase
          .from('events')
          .select(`
            id, couple_id, vendor_id, start_time, end_time, type, title, created_at,
            couples!events_couple_id_fkey(name),
            vendors!events_vendor_id_fkey(name)
          `)
          .order('start_time', { ascending: true })
      ]);

      if (bookingsData.error) throw bookingsData.error;
      if (eventsData.error) throw eventsData.error;

      // Fetch event start times for bookings
      const bookingsWithEvents = await Promise.all(bookingsData.data.map(async (b) => {
        if (b.event_id) {
          const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('start_time')
            .eq('id', b.event_id)
            .single();
          if (eventError) throw eventError;
          const startTimeUTC = eventData?.start_time;
          const startTimeEST = startTimeUTC
            ? new Date(new Date(startTimeUTC).toLocaleString('en-US', { timeZone: 'America/New_York' })).toISOString()
            : null;
          return {
            ...b,
            couple_name: b.couples?.name || 'Unknown',
            vendor_name: b.vendors?.name || 'Unknown',
            event_start_datetime: startTimeEST || 'N/A',
            event_id: b.event_id
          };
        }
        return {
          ...b,
          couple_name: b.couples?.name || 'Unknown',
          vendor_name: b.vendors?.name || 'Unknown',
          event_start_datetime: 'N/A',
          event_id: b.event_id
        };
      }));

      // Sort bookings by event_start_datetime (ascending for upcoming, descending for past)
      const sortedBookings = bookingsWithEvents.sort((a, b) => {
        const dateA = a.event_start_datetime !== 'N/A' ? new Date(a.event_start_datetime) : new Date(0);
        const dateB = b.event_start_datetime !== 'N/A' ? new Date(b.event_start_datetime) : new Date(0);
        return dateA.getTime() - dateB.getTime();
      });

      setBookings(sortedBookings || []);
      setEvents(eventsData.data.map(e => ({
        ...e,
        couple_name: e.couples?.name || 'Unknown',
        vendor_name: e.vendors?.name || 'Unknown'
      })) || []);
      setVisibleEvents(5); // Reset visible events on data fetch
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load bookings and events');
    } finally {
      setLoading(false);
    }
  };

  // Filter bookings and events based on tabs and search term
  const now = new Date();
  const filterByTime = (items: Booking[] | Event[], type: 'upcoming' | 'past', isBooking: boolean) => {
    return items.filter(item => {
      const date = isBooking
        ? (item as Booking).event_start_datetime !== 'N/A' ? new Date((item as Booking).event_start_datetime) : new Date(0)
        : new Date((item as Event).start_time);
      return type === 'upcoming' ? date >= now : date < now;
    });
  };

  const filteredBookings = filterByTime(bookings, activeBookingTab, true).filter(b =>
    b.couple_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.service_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEvents = filterByTime(events, activeEventTab, false).filter(e =>
    e.couple_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort filtered bookings and events
  const sortedFilteredBookings = filteredBookings.sort((a, b) => {
    const dateA = a.event_start_datetime !== 'N/A' ? new Date(a.event_start_datetime) : new Date(0);
    const dateB = b.event_start_datetime !== 'N/A' ? new Date(b.event_start_datetime) : new Date(0);
    return activeBookingTab === 'upcoming'
      ? dateA.getTime() - dateB.getTime()
      : dateB.getTime() - dateA.getTime();
  });

  const sortedFilteredEvents = filteredEvents.sort((a, b) => {
    const dateA = new Date(a.start_time);
    const dateB = new Date(b.start_time);
    return activeEventTab === 'upcoming'
      ? dateA.getTime() - dateB.getTime()
      : dateB.getTime() - dateA.getTime();
  });

  const displayedEvents = sortedFilteredEvents.slice(0, visibleEvents);

  const getDateStats = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based (0-11)
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const filterBookingsByPeriod = (year: number, month: number) => {
      return bookings.filter(b => {
        const eventDate = b.event_start_datetime && b.event_start_datetime !== 'N/A'
          ? new Date(b.event_start_datetime)
          : new Date(0); // Fallback to epoch if no event date
        return eventDate.getFullYear() === year && eventDate.getMonth() === month;
      });
    };

    const lastMonthBookings = filterBookingsByPeriod(lastYear, lastMonth);
    const thisMonthBookings = filterBookingsByPeriod(currentYear, currentMonth);
    const upcomingMonthBookings = filterBookingsByPeriod(nextYear, nextMonth);
    const thisYearBookings = bookings.filter(b => {
      const eventDate = b.event_start_datetime && b.event_start_datetime !== 'N/A'
        ? new Date(b.event_start_datetime)
        : new Date(0);
      return eventDate.getFullYear() === currentYear;
    });
    const nextYearBookings = bookings.filter(b => {
      const eventDate = b.event_start_datetime && b.event_start_datetime !== 'N/A'
        ? new Date(b.event_start_datetime)
        : new Date(0);
      return eventDate.getFullYear() === nextYear + 1;
    });
    const lastYearBookings = bookings.filter(b => {
      const eventDate = b.event_start_datetime && b.event_start_datetime !== 'N/A'
        ? new Date(b.event_start_datetime)
        : new Date(0);
      return eventDate.getFullYear() === lastYear - 1;
    });

    const getTotalAmount = (bookingsList: Booking[]) => {
      return bookingsList.reduce((sum, b) => sum + (b.amount || 0) / 100, 0);
    };

    return {
      lastMonth: { count: lastMonthBookings.length, amount: getTotalAmount(lastMonthBookings) },
      thisMonth: { count: thisMonthBookings.length, amount: getTotalAmount(thisMonthBookings) },
      upcomingMonth: { count: upcomingMonthBookings.length, amount: getTotalAmount(upcomingMonthBookings) },
      thisYear: { count: thisYearBookings.length, amount: getTotalAmount(thisYearBookings) },
      nextYear: { count: nextYearBookings.length, amount: getTotalAmount(nextYearBookings) },
      lastYear: { count: lastYearBookings.length, amount: getTotalAmount(lastYearBookings) },
    };
  };

  const stats = getDateStats();

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Bookings & Events
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Bookings & Events
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all bookings and events.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Bookings
          </button>
          <button
            onClick={() => setIsAddBookingModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Booking
          </button>
          <button
            onClick={() => setIsAddEventModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Booking Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Last Month Bookings</p>
            <p className="text-lg font-bold text-gray-900">{stats.lastMonth.count}</p>
            <p className="text-sm text-gray-600">${stats.lastMonth.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">This Month Bookings</p>
            <p className="text-lg font-bold text-gray-900">{stats.thisMonth.count}</p>
            <p className="text-sm text-gray-600">${stats.thisMonth.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Upcoming Month Bookings</p>
            <p className="text-lg font-bold text-gray-900">{stats.upcomingMonth.count}</p>
            <p className="text-sm text-gray-600">${stats.upcomingMonth.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">This Year Bookings</p>
            <p className="text-lg font-bold text-gray-900">{stats.thisYear.count}</p>
            <p className="text-sm text-gray-600">${stats.thisYear.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Next Year Bookings</p>
            <p className="text-lg font-bold text-gray-900">{stats.nextYear.count}</p>
            <p className="text-sm text-gray-600">${stats.nextYear.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Last Year Bookings</p>
            <p className="text-lg font-bold text-gray-900">{stats.lastYear.count}</p>
            <p className="text-sm text-gray-600">${stats.lastYear.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Bookings/Events
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by couple, vendor, type, or title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Bookings ({filteredBookings.length})</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveBookingTab('upcoming')}
              className={`px-4 py-2 rounded-md ${activeBookingTab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Upcoming Bookings
            </button>
            <button
              onClick={() => setActiveBookingTab('past')}
              className={`px-4 py-2 rounded-md ${activeBookingTab === 'past' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Past Bookings
            </button>
          </div>
        </div>
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeBookingTab} bookings found</h3>
            <p className="text-gray-500">Try adjusting your search or add a new booking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFilteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/booking/${booking.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">{booking.couple_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{booking.vendor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{booking.service_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{booking.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${(booking.amount / 100).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.event_start_datetime !== 'N/A' ? new Date(booking.event_start_datetime).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/booking/${booking.id}`); }}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Events ({filteredEvents.length})</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => { setActiveEventTab('upcoming'); setVisibleEvents(5); }}
              className={`px-4 py-2 rounded-md ${activeEventTab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Upcoming Events
            </button>
            <button
              onClick={() => { setActiveEventTab('past'); setVisibleEvents(5); }}
              className={`px-4 py-2 rounded-md ${activeEventTab === 'past' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Past Events
            </button>
          </div>
        </div>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeEventTab} events found</h3>
            <p className="text-gray-500">Try adjusting your search or add a new event.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/event/${event.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">{event.couple_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{event.vendor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{event.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{event.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(event.start_time).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/event/${event.id}`); }}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEvents.length > visibleEvents && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setVisibleEvents(prev => prev + 5)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View More
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ImportBookingsModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={fetchData} />
      <AddBookingModal isOpen={isAddBookingModalOpen} onClose={() => setIsAddBookingModalOpen(false)} onSuccess={fetchData} />
      <AddEventModal isOpen={isAddEventModalOpen} onClose={() => setIsAddEventModalOpen(false)} onSuccess={fetchData} />
    </div>
  );
}
