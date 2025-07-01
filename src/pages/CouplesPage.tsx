import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Upload, Eye, Phone, Calendar, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import ImportCouplesModal from '../components/ImportCouplesModal';
import AddCoupleModal from '../components/AddCoupleModal';
import { format, parseISO } from 'date-fns';

interface Couple {
  id: string;
  user_id: string;
  name: string;
  wedding_date: string | null;
  budget: number | null;
  vibe_tags: string[] | null;
  created_at: string;
  updated_at: string;
  partner1_name: string | null;
  partner2_name: string | null;
  venue_name: string | null;
  guest_count: number | null;
  phone: string | null;
  email: string | null;
  venue_city: string | null;
  venue_state: string | null;
}

export function CouplesPage() {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vibeFilter, setVibeFilter] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchCouples();
  }, []);

  const fetchCouples = async () => {
    try {
      setLoading(true);
      console.log('Fetching couples from Supabase...');
      const { data: couplesData, error: couplesError } = await supabase
        .from('couples')
        .select(`
          id, user_id, name, wedding_date, budget, vibe_tags, created_at, updated_at,
          partner1_name, partner2_name, venue_name, guest_count, phone, email,
          venue_city, venue_state
        `)
        .order('created_at', { ascending: false });

      if (couplesError) {
        console.error('Supabase error fetching couples:', couplesError);
        throw couplesError;
      }
      console.log('Couples data fetched:', couplesData);
      setCouples(couplesData || []);
    } catch (error: any) {
      console.error('Error fetching couples:', error);
      toast.error('Failed to load couples');
    } finally {
      setLoading(false);
    }
  };

  const allVibeTags = couples.flatMap(couple => couple.vibe_tags || []);
  const uniqueVibeTags = [...new Set(allVibeTags)].sort();

  const filteredCouples = couples.filter(couple => {
    const matchesSearch = 
      couple.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (couple.email && couple.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (couple.partner1_name && couple.partner1_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (couple.partner2_name && couple.partner2_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesVibe = !vibeFilter || (couple.vibe_tags?.includes(vibeFilter));
    console.log(`Filtering couple ${couple.id}: Search=${matchesSearch}, Vibe=${matchesVibe}`);
    return matchesSearch && matchesVibe;
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            Couples
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
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            Couples
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all couples in the platform.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Couples
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Couple
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Couples
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or partner names..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="vibe-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Vibe Tag
            </label>
            <select
              id="vibe-filter"
              value={vibeFilter}
              onChange={(e) => setVibeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Vibe Tags</option>
              {uniqueVibeTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Couples ({filteredCouples.length})
          </h2>
        </div>
        {filteredCouples.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No couples found</h3>
            <p className="text-gray-500">
              {searchTerm || vibeFilter ? 'Try adjusting your filters' : 'No couples have been added yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Couple Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partners
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wedding Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vibe Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCouples.map((couple) => (
                  <tr
                    key={couple.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/couple/${couple.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{couple.name}</div>
                        {couple.phone && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {couple.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {couple.partner1_name && couple.partner2_name 
                          ? `${couple.partner1_name} & ${couple.partner2_name}`
                          : 'Not specified'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {couple.wedding_date ? (
                          <>
                            <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                            <span>{format(parseISO(couple.wedding_date), 'MMM d, yyyy')}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {couple.venue_name ? (
                          <>
                            <span>{couple.venue_name}</span>
                            {couple.venue_city && couple.venue_state && (
                              <span className="text-gray-500 block text-xs">
                                {couple.venue_city}, {couple.venue_state}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">No venue</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {couple.vibe_tags?.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800"
                          >
                            {tag}
                          </span>
                        ))}
                        {couple.vibe_tags && couple.vibe_tags.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{couple.vibe_tags.length - 2} more
                          </span>
                        )}
                        {!couple.vibe_tags || couple.vibe_tags.length === 0 && (
                          <span className="text-xs text-gray-400 italic">No tags</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {couple.budget ? (
                        <span>${couple.budget.toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(couple.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/couple/${couple.id}`);
                          }}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View/Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ImportCouplesModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <AddCoupleModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}