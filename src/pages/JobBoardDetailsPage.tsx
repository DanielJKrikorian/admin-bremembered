import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Upload, Check, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Select from 'react-select';

interface JobBoard {
  id: string;
  job_type: string;
  description: string | null;
  couple_id: string;
  is_open: boolean;
  created_at: string;
  updated_at: string | null;
  price: number | null;
  service_package_id: string;
  vendor_id: string | null;
  venue_id: string;
  event_start_time: string | null;
  event_end_time: string | null;
  couple_name: string | null;
  service_package_name: string | null;
  vendor_name: string | null;
}

interface Couple {
  id: string;
  name: string;
  wedding_date: string | null;
}

interface ServicePackage {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface Venue {
  id: string;
  name: string;
  city: string | null;
  state: string;
  region: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

export default function JobBoardPage() {
  const [jobs, setJobs] = useState<JobBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [openJobsCount, setOpenJobsCount] = useState(0);
  const [filterOpen, setFilterOpen] = useState<boolean | null>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [newJob, setNewJob] = useState({
    job_type: '',
    description: '',
    couple_id: '',
    price: 0,
    service_package_id: '',
    venue_id: '',
    event_start_time: '',
    event_end_time: '',
  });
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        jobsResponse,
        couplesResponse,
        packagesResponse,
        venuesResponse,
        vendorsResponse
      ] = await Promise.all([
        supabase.from('job_board').select('*').order('created_at', { ascending: false }).then(res => {
          if (res.error) throw new Error(`Jobs fetch error: ${res.error.message}`);
          return res;
        }),
        supabase.from('couples').select('id, name, wedding_date').then(res => {
          if (res.error) throw new Error(`Couples fetch error: ${res.error.message}`);
          return res;
        }),
        supabase.from('service_packages').select('id, name, price, description').then(res => {
          if (res.error) throw new Error(`Packages fetch error: ${res.error.message}`);
          return res;
        }),
        supabase.from('venues').select('id, name, city, state, region').then(res => {
          if (res.error) throw new Error(`Venues fetch error: ${res.error.message}`);
          return res;
        }),
        supabase.from('vendors').select('id, name').then(res => {
          if (res.error) throw new Error(`Vendors fetch error: ${res.error.message}`);
          return res;
        }),
      ]);

      const mappedJobs = jobsResponse.data.map(job => {
        const couple = couplesResponse.data.find(c => c.id === job.couple_id);
        const packageData = packagesResponse.data.find(p => p.id === job.service_package_id);
        const vendor = job.vendor_id ? (vendorsResponse.data.find(v => v.id === job.vendor_id) || { name: 'N/A' }) : null;
        return {
          ...job,
          couple_name: couple ? couple.name : 'N/A',
          service_package_name: packageData ? packageData.name : 'N/A',
          vendor_name: vendor ? vendor.name : null,
        };
      });
      setJobs(mappedJobs);
      setCouples(couplesResponse.data || []);
      setServicePackages(packagesResponse.data || []);
      setVenues(venuesResponse.data || []);
      setVendors(vendorsResponse.data || []);
      setOpenJobsCount(mappedJobs.filter(job => job.is_open).length);
    } catch (error: any) {
      console.error('Error fetching job board data:', error);
      toast.error(error.message || 'Failed to load job board data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!newJob.job_type) {
        toast.error('Job Type is required');
        return;
      }
      if (!newJob.service_package_id) {
        toast.error('Service Package is required');
        return;
      }
      if (!newJob.venue_id) {
        toast.error('Venue is required');
        return;
      }
      if (!newJob.couple_id) {
        toast.error('Couple is required');
        return;
      }

      // Convert times to ISO format
      let formattedEventStartTime = null;
      if (newJob.event_start_time) {
        formattedEventStartTime = new Date(newJob.event_start_time).toISOString();
      }
      let formattedEventEndTime = null;
      if (newJob.event_end_time) {
        formattedEventEndTime = new Date(newJob.event_end_time).toISOString();
      }

      const { error } = await supabase
        .from('job_board')
        .insert({
          id: crypto.randomUUID(),
          job_type: newJob.job_type,
          description: newJob.description || null,
          couple_id: newJob.couple_id,
          is_open: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          price: newJob.price ? newJob.price * 100 : null,
          service_package_id: newJob.service_package_id,
          vendor_id: null,
          venue_id: newJob.venue_id,
          event_start_time: formattedEventStartTime,
          event_end_time: formattedEventEndTime,
        });
      if (error) throw error;

      toast.success('Job added successfully!');
      setIsAddModalOpen(false);
      setNewJob({
        job_type: '',
        description: '',
        couple_id: '',
        price: 0,
        service_package_id: '',
        venue_id: '',
        event_start_time: '',
        event_end_time: '',
      });
      fetchData();
    } catch (error: any) {
      console.error('Error adding job:', error);
      toast.error(`Failed to add job: ${error.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.trim().split('\n').map(row => row.split(',')); // CSV format: job_type,description,couple_id,price,service_package_id,venue_id,event_start_time,event_end_time
      const jobsToInsert = rows.map(row => {
        let formattedEventStartTime = null;
        if (row[6]) {
          formattedEventStartTime = new Date(row[6]).toISOString();
        }
        let formattedEventEndTime = null;
        if (row[7]) {
          formattedEventEndTime = new Date(row[7]).toISOString();
        }
        return {
          id: crypto.randomUUID(),
          job_type: row[0],
          description: row[1] || null,
          couple_id: row[2],
          is_open: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          price: parseFloat(row[3]) * 100 || null,
          service_package_id: row[4],
          vendor_id: null,
          venue_id: row[5],
          event_start_time: formattedEventStartTime,
          event_end_time: formattedEventEndTime,
        };
      });

      // Validate required fields for each job
      for (const job of jobsToInsert) {
        if (!job.couple_id || !job.job_type || !job.service_package_id || !job.venue_id) {
          throw new Error('All jobs must include job_type, couple_id, service_package_id, and venue_id');
        }
      }

      const { error } = await supabase.from('job_board').insert(jobsToInsert);
      if (error) throw error;

      toast.success('Jobs imported successfully!');
      setIsImportModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error importing jobs:', error);
      toast.error(`Failed to import jobs: ${error.message}`);
    }
  };

  const handleServicePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setNewJob(prev => {
      const selectedPackage = servicePackages.find(pkg => pkg.id === selectedId);
      const newPrice = selectedPackage ? (selectedPackage.price / 100) * 0.5 : 0;
      const newDescription = selectedPackage ? selectedPackage.description : '';
      return { ...prev, service_package_id: selectedId, price: newPrice, description: newDescription };
    });
  };

  const handleCoupleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setNewJob(prev => {
      const selectedCouple = couples.find(c => c.id === selectedId);
      return {
        ...prev,
        couple_id: selectedId,
        event_start_time: selectedCouple && selectedCouple.wedding_date ? selectedCouple.wedding_date : '',
      };
    });
  };

  const venueOptions = venues.map(venue => ({
    value: venue.id,
    label: `${venue.name} (${venue.city || 'N/A'}, ${venue.state}${venue.region ? `, ${venue.region}` : ''})`,
  }));

  const handleVenueChange = (selectedOption: any) => {
    setNewJob(prev => ({
      ...prev,
      venue_id: selectedOption ? selectedOption.value : '',
    }));
  };

  // Function to convert UTC to EST (GMT-4)
  const convertToEST = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const estOffset = -4 * 60; // EST is UTC-4
    const estDate = new Date(date.getTime() + estOffset * 60 * 1000);
    return estDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Job Board
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Job Board
        </h1>
        <p className="mt-2 text-gray-500">Manage available jobs for vendors.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-medium text-gray-700 flex items-center">
            <Check className="h-5 w-5 text-green-600 mr-2" />
            Open Jobs: {openJobsCount}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Jobs ({jobs.length})</h2>
          <div className="flex space-x-3">
            <select
              value={filterOpen === null ? 'all' : filterOpen ? 'open' : 'taken'}
              onChange={(e) => setFilterOpen(e.target.value === 'all' ? null : e.target.value === 'open')}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="taken">Taken</option>
            </select>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </button>
          </div>
        </div>
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-500">Add or import jobs to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event End Time (EST)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs
                  .filter(job => filterOpen === null || job.is_open === filterOpen)
                  .map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/dashboard/job-board/${job.id}`)}>
                      <td className="px-6 py-4 whitespace-nowrap">{job.job_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{job.couple_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${(job.price ? job.price / 100 : 0).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{job.service_package_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{job.vendor_name || 'Not Taken'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{job.is_open ? 'Open' : 'Taken'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{job.event_start_time ? new Date(job.event_start_time).toLocaleString() : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{convertToEST(job.event_end_time)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/job-board/${job.id}`); }}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Job</h3>
            <form onSubmit={handleAddJob} className="space-y-4">
              <div>
                <label htmlFor="job_type" className="block text-sm font-medium text-gray-700">Job Type</label>
                <select
                  id="job_type"
                  value={newJob.job_type}
                  onChange={(e) => setNewJob({ ...newJob, job_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a job type</option>
                  <option value="Photography">Photography</option>
                  <option value="Videography">Videography</option>
                  <option value="DJ Services">DJ Services</option>
                  <option value="Coordination">Coordination</option>
                  <option value="Editing">Editing</option>
                </select>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  id="description"
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                />
              </div>
              <div>
                <label htmlFor="couple_id" className="block text-sm font-medium text-gray-700">Couple</label>
                <select
                  id="couple_id"
                  value={newJob.couple_id}
                  onChange={handleCoupleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a couple</option>
                  {couples.map(couple => (
                    <option key={couple.id} value={couple.id}>{couple.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="event_start_time" className="block text-sm font-medium text-gray-700">Event Start Date & Time</label>
                <input
                  type="datetime-local"
                  id="event_start_time"
                  value={newJob.event_start_time || ''}
                  onChange={(e) => setNewJob({ ...newJob, event_start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="event_end_time" className="block text-sm font-medium text-gray-700">Event End Date & Time</label>
                <input
                  type="datetime-local"
                  id="event_end_time"
                  value={newJob.event_end_time || ''}
                  onChange={(e) => setNewJob({ ...newJob, event_end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Payout (USD)</label>
                <input
                  type="number"
                  id="price"
                  value={newJob.price}
                  onChange={(e) => setNewJob({ ...newJob, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
              <div>
                <label htmlFor="service_package_id" className="block text-sm font-medium text-gray-700">Service Package</label>
                <select
                  id="service_package_id"
                  value={newJob.service_package_id}
                  onChange={handleServicePackageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a package</option>
                  {servicePackages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="venue_id" className="block text-sm font-medium text-gray-700">Venue</label>
                <Select
                  id="venue_id"
                  options={venueOptions}
                  value={venueOptions.find(option => option.value === newJob.venue_id) || null}
                  onChange={handleVenueChange}
                  placeholder="Search for a venue..."
                  isClearable
                  isSearchable
                  className="w-full"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import Jobs from CSV</h3>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
