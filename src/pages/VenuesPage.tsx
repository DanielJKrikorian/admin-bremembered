import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Upload, Plus, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import AddVenueModal from '../components/AddVenueModal';
import ImportVenuesModal from '../components/ImportVenuesModal';

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
  booking_count: number;
  created_at: string;
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [venuesPerPage] = useState(25);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch venues and join with venue_booking_counts
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, phone, email, contact_name, street_address, city, state, zip, region, created_at');

      if (venuesError) throw venuesError;

      // Fetch booking counts from venue_booking_counts
      const { data: bookingCounts, error: bookingError } = await supabase
        .from('venue_booking_counts')
        .select('name, booking_count');

      if (bookingError) throw bookingError;

      // Map venues with booking counts, matching by name
      const venuesWithCounts = venuesData.map(venue => {
        const bookingData = bookingCounts.find(bc => bc.name === venue.name);
        return {
          ...venue,
          booking_count: bookingData ? bookingData.booking_count : 0,
        };
      });

      setVenues(venuesWithCounts || []);
      setCurrentPage(1); // Reset to first page on data fetch
    } catch (error: any) {
      console.error('Error fetching venues:', error);
      toast.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const handleVenueAdded = (venueId: string) => {
    // Refresh the venue list after adding a new venue
    fetchData();
  };

  const filteredVenues = venues.filter(venue =>
    (venue.name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (venue.city?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (venue.state?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (venue.region?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

  const totalPages = Math.ceil(filteredVenues.length / venuesPerPage);
  const indexOfLastVenue = currentPage * venuesPerPage;
  const indexOfFirstVenue = indexOfLastVenue - venuesPerPage;
  const currentVenues = filteredVenues.slice(indexOfFirstVenue, indexOfLastVenue);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(prev => prev + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(prev => prev - 1);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Venues
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
            Venues
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all venues.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Venues
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Venue
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Venues
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, city, state, or region..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Venues ({filteredVenues.length})</h2>
        </div>
        {filteredVenues.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No venues found</h3>
            <p className="text-gray-500">Try adjusting your search or add a new venue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentVenues.map((venue) => (
                  <tr
                    key={venue.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/venue/${venue.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">{venue.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{venue.city || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{venue.state || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{venue.region || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{venue.booking_count || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(venue.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/venue/${venue.id}`); }}
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
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Previous
              </button>
              <div className="flex space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${currentPage === number ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    {number}
                  </button>
                ))}
              </div>
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-5 w-5 ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ImportVenuesModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={fetchData} />
      <AddVenueModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onVenueAdded={handleVenueAdded} />
    </div>
  );
}