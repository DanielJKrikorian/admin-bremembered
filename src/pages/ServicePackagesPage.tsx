import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Eye, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import AddServicePackageModal from '../components/AddServicePackageModal';
import ImportServicePackagesModal from '../components/ImportServicePackagesModal';

interface ServicePackage {
  id: string;
  service_type: string;
  name: string;
  description: string | null;
  price: number;
  features: string[] | null;
  coverage: object | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  vendor_id: string | null;
  hour_amount: number | null;
  lookup_key: string | null;
  event_type: string | null;
}

export default function ServicePackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [packagesPerPage] = useState(25);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [filterServiceType, setFilterServiceType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterEventType, setFilterEventType] = useState<string>('');
  const [sortField, setSortField] = useState<keyof ServicePackage>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_packages')
        .select('*');

      if (error) throw error;

      setPackages(data || []);
      setCurrentPage(1); // Reset to first page on data fetch
    } catch (error: any) {
      console.error('Error fetching service packages:', error);
      toast.error('Failed to load service packages');
    } finally {
      setLoading(false);
    }
  };

  const handlePackageAdded = () => {
    // Refresh the package list after adding a new package
    fetchData();
  };

  const applyFiltersAndSort = (packages: ServicePackage[]) => {
    let filtered = packages.filter(pkg =>
      (pkg.name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (pkg.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (pkg.status?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (pkg.event_type?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
    );

    if (filterServiceType) {
      filtered = filtered.filter(pkg => pkg.service_type?.toLowerCase().includes(filterServiceType.toLowerCase()));
    }
    if (filterStatus) {
      filtered = filtered.filter(pkg => pkg.status?.toLowerCase() === filterStatus.toLowerCase());
    }
    if (filterEventType) {
      filtered = filtered.filter(pkg => pkg.event_type?.toLowerCase().includes(filterEventType.toLowerCase()));
    }

    return filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'price' || sortField === 'hour_amount') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (sortField === 'created_at') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      } else {
        aValue = (aValue as string || '').toLowerCase();
        bValue = (bValue as string || '').toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredPackages = applyFiltersAndSort(packages);
  const totalPages = Math.ceil(filteredPackages.length / packagesPerPage);
  const indexOfLastPackage = currentPage * packagesPerPage;
  const indexOfFirstPackage = indexOfLastPackage - packagesPerPage;
  const currentPackages = filteredPackages.slice(indexOfFirstPackage, indexOfLastPackage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(prev => prev + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(prev => prev - 1);
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [field, direction] = e.target.value.split('-');
    setSortField(field as keyof ServicePackage);
    setSortDirection(direction as 'asc' | 'desc');
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Service Packages
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
            Service Packages
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all service packages.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Packages
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Package
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label htmlFor="filter-service-type" className="block text-sm font-medium text-gray-700 mb-1">
              Service Type
            </label>
            <input
              type="text"
              id="filter-service-type"
              value={filterServiceType}
              onChange={(e) => setFilterServiceType(e.target.value)}
              placeholder="Filter by service type..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <input
              type="text"
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="Filter by status..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="filter-event-type" className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <input
              type="text"
              id="filter-event-type"
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              placeholder="Filter by event type..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              id="sort"
              value={`${sortField}-${sortDirection}`}
              onChange={handleSortChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="price-desc">Price (High to Low)</option>
              <option value="hour_amount-asc">Hours (Low to High)</option>
              <option value="hour_amount-desc">Hours (High to Low)</option>
              <option value="created_at-asc">Created (Oldest)</option>
              <option value="created_at-desc">Created (Newest)</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Packages
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, service type, status, or event type..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Service Packages ({filteredPackages.length})</h2>
        </div>
        {filteredPackages.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
            <p className="text-gray-500">Try adjusting your search or add a new package.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Types</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentPackages.map((pkg) => (
                  <tr
                    key={pkg.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/service-package/${pkg.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pkg.service_type
                        ?.split(',')
                        .map(service => service.trim())
                        .filter(service => service)
                        .map((service, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 mr-1 mb-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full"
                          >
                            {service}
                          </span>
                        )) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{pkg.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${(pkg.price / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{pkg.hour_amount || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{pkg.status || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{pkg.event_type || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(pkg.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/service-package/${pkg.id}`); }}
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

      <AddServicePackageModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onPackageAdded={handlePackageAdded} />
      <ImportServicePackagesModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={fetchData} />
    </div>
  );
}