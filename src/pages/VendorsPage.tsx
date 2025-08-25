import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Upload, Phone, CreditCard, Star, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Vendor, VendorService, VendorServicePackage, VendorReview } from '../types/types';
import ImportVendorsModal from '../components/ImportVendorsModal';
import AddVendorModal from '../components/AddVendorModal';

export function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select(`
          id, user_id, name, phone, years_experience, specialties, stripe_account_id, created_at, updated_at, rating,
          vendor_services (id, vendor_id, service_type, is_active),
          vendor_reviews (id, vendor_id),
          vendor_service_packages (id, vendor_id, status),
          vendor_service_areas (state)
        `)
        .order('created_at', { ascending: false });

      if (vendorsError) throw vendorsError;

      // Fetch points for each vendor from vendor_rewards_points for 2025
      const vendorIds = vendorsData?.map(vendor => vendor.id) || [];
      const { data: pointsData, error: pointsError } = await supabase
        .from('vendor_rewards_points')
        .select('vendor_id, points')
        .in('vendor_id', vendorIds)
        .eq('year', 2025);

      if (pointsError) throw pointsError;

      // Aggregate points by vendor_id
      const pointsByVendor = pointsData.reduce((acc, { vendor_id, points }) => {
        acc[vendor_id] = (acc[vendor_id] || 0) + points;
        return acc;
      }, {} as Record<string, number>);

      console.log('Points by vendor:', pointsByVendor);

      // Transform vendor_service_areas to extract unique states and ensure points is defined
      const transformedVendors = vendorsData?.map(vendor => ({
        ...vendor,
        states: [...new Set(vendor.vendor_service_areas.map((area: { state: string }) => area.state))].sort(),
        points: pointsByVendor[vendor.id] ?? 0, // Use nullish coalescing to ensure 0
      })) || [];

      // Log vendors with missing points
      transformedVendors.forEach(vendor => {
        if (vendor.points === undefined) {
          console.warn(`Vendor ${vendor.id} (${vendor.name}) has undefined points`);
        }
      });

      setVendors(transformedVendors);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const allServiceTypes = vendors.flatMap(vendor =>
    vendor.vendor_services?.filter(service => service.is_active).map(service => service.service_type) || []
  );
  const uniqueServiceTypes = [...new Set(allServiceTypes)].sort();

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.profile && vendor.profile.toLowerCase().includes(searchTerm.toLowerCase()));
    const vendorServiceTypes = vendor.vendor_services?.filter(service => service.is_active).map(service => service.service_type) || [];
    const matchesService = !serviceFilter || vendorServiceTypes.includes(serviceFilter);
    return matchesSearch && matchesService;
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            Vendors
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
            <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            Vendors
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all vendors in the platform.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Vendors
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Vendors
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or profile..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="service-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Service Type
            </label>
            <select
              id="service-filter"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Service Types</option>
              {uniqueServiceTypes.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Vendors ({filteredVendors.length})
          </h2>
        </div>
        {filteredVendors.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
            <p className="text-gray-500">
              {searchTerm || serviceFilter ? 'Try adjusting your filters' : 'No vendors have been added yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Services
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Packages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Areas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reviews
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stripe
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
                {filteredVendors.map((vendor) => {
                  const activeServices = vendor.vendor_services?.filter(service => service.is_active) || [];
                  const servicePackages = vendor.vendor_service_packages || [];
                  const pendingPackages = servicePackages.filter(pkg => pkg.status === 'pending').length;
                  const approvedPackages = servicePackages.filter(pkg => pkg.status === 'approved').length;
                  const reviews = vendor.vendor_reviews || [];

                  return (
                    <tr
                      key={vendor.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/vendor/${vendor.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                          {vendor.phone && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {vendor.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vendor.points !== undefined ? vendor.points.toLocaleString() : '0'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {activeServices.slice(0, 2).map((service) => (
                            <span
                              key={service.id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {service.service_type}
                            </span>
                          ))}
                          {activeServices.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{activeServices.length - 2} more
                            </span>
                          )}
                          {activeServices.length === 0 && (
                            <span className="text-xs text-gray-400 italic">No active services</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {approvedPackages > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {approvedPackages} approved
                              </span>
                            )}
                            {pendingPackages > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {pendingPackages} pending
                              </span>
                            )}
                          </div>
                          {servicePackages.length === 0 && (
                            <span className="text-xs text-gray-400 italic">No packages</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {vendor.states?.slice(0, 2).map((state, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {state}
                            </span>
                          ))}
                          {vendor.states && vendor.states.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{vendor.states.length - 2} more
                            </span>
                          )}
                          {(!vendor.states || vendor.states.length === 0) && (
                            <span className="text-xs text-gray-400 italic">No service areas</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reviews.length > 0 ? (
                          <div className="flex items-center space-x-1">
                            {vendor.rating !== null && vendor.rating !== undefined && (
                              <>
                                <span className="mr-1">{vendor.rating.toFixed(2)}</span>
                                {renderStars(vendor.rating)}
                              </>
                            )}
                            <span className="text-gray-500">({reviews.length})</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No reviews</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vendor.stripe_account_id ? (
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-green-600">Connected</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not connected</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(vendor.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/vendor/${vendor.id}`);
                            }}
                            className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            View/Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ImportVendorsModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <AddVendorModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}

// Simple email validation
function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Render stars with partial fill
function renderStars(rating: number) {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const fillLevel = Math.min(1, Math.max(0, rating - (star - 1)));
        return (
          <Star
            key={star}
            className={`h-4 w-4 ${fillLevel > 0 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            style={{ clipPath: `inset(0 ${100 - fillLevel * 100}% 0 0)` }}
          />
        );
      })}
    </div>
  );
}