import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Edit, Save, Download } from 'lucide-react';
import Select from 'react-select';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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
  service_area_id: string | null;
  insurance: string | null;
  booking_count: number;
  created_at: string;
  updated_at: string;
}

interface ServiceArea {
  id: string;
  region: string;
}

// List of U.S. states
const states = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function VenueDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Venue | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVenue();
    fetchServiceAreas();
  }, [id]);

  const fetchVenue = async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Venue ID is undefined');

      const { data, error } = await supabase
        .from('venues')
        .select('*, service_area_id')
        .eq('id', id)
        .single();

      if (error) throw error;

      setVenue(data);
      setFormData(data);
    } catch (error: any) {
      console.error('Error fetching venue:', error);
      toast.error('Failed to load venue');
      navigate('/dashboard/venues');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('id, region')
        .order('region', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      if (!data) {
        console.warn('No service areas found');
        setServiceAreas([]);
        return;
      }
      setServiceAreas(data);
    } catch (error) {
      console.error('Error fetching service areas:', error);
      toast.error('Failed to load service areas');
    }
  };

  const handleSaveField = async (field: string) => {
    if (!formData || !venue) return;

    setLoading(true);
    try {
      let updateData: Partial<Venue> = { [field]: formData[field as keyof Venue] };
      if (field === 'service_area') {
        updateData = {
          service_area_id: formData.service_area_id,
          region: formData.region
        };
      }

      const { error } = await supabase
        .from('venues')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', venue.id);

      if (error) throw error;

      setVenue(prev => prev ? { ...prev, ...updateData, updated_at: new Date().toISOString() } : null);
      setEditMode(prev => ({ ...prev, [field]: false }));
      toast.success(`${field === 'service_area' ? 'Service Area' : field} updated successfully!`);
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field === 'service_area' ? 'Service Area' : field}`);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceAreaChange = (selectedOption: any) => {
    setFormData(prev => prev ? {
      ...prev,
      service_area_id: selectedOption ? selectedOption.value : null,
      region: selectedOption ? selectedOption.label : null
    } : null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setInsuranceFile(e.target.files[0]);
    }
  };

  const uploadInsurance = async () => {
    if (!insuranceFile || !venue) return;

    setLoading(true);
    try {
      const fileName = `${venue.id}_insurance.pdf`;
      const { data, error } = await supabase.storage
        .from('venue-new')
        .upload(fileName, insuranceFile, {
          upsert: true,
          contentType: 'application/pdf',
        });

      if (error) {
        console.log('Upload Error:', error);
        throw error;
      }

      const { publicUrl } = supabase.storage.from('venue-new').getPublicUrl(fileName);
      await supabase
        .from('venues')
        .update({ insurance: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', venue.id);

      setVenue(prev => prev ? { ...prev, insurance: publicUrl, updated_at: new Date().toISOString() } : null);
      setFormData(prev => prev ? { ...prev, insurance: publicUrl, updated_at: new Date().toISOString() } : null);
      setInsuranceFile(null);
      toast.success('Insurance PDF uploaded and linked successfully!');
    } catch (error: any) {
      console.error('Error uploading insurance:', error);
      toast.error(error.message || 'Failed to upload insurance PDF');
    } finally {
      setLoading(false);
    }
  };

  const downloadInsurance = async () => {
    if (!venue || !venue.insurance) return;

    try {
      const url = venue.insurance;
      const a = document.createElement('a');
      a.href = url;
      a.download = `insurance_${venue.id}.pdf`;
      a.click();
    } catch (error: any) {
      console.error('Error downloading insurance:', error);
      toast.error('Failed to download insurance PDF');
    }
  };

  // Format service areas for react-select
  const serviceAreaOptions = serviceAreas.map(area => ({
    value: area.id,
    label: area.region
  }));

  if (loading || !venue || !formData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Venue: {venue.name}
        </h1>
        <button
          onClick={() => navigate('/dashboard/venues')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Venues
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Venue Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">ID</label>
            <p className="text-sm font-medium text-gray-900">{venue.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            {editMode.name ? (
              <>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('name')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{venue.name}</p>
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
            <label className="text-sm font-medium text-gray-500">Phone</label>
            {editMode.phone ? (
              <>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('phone')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{venue.phone || 'N/A'}</p>
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
            <label className="text-sm font-medium text-gray-500">Email</label>
            {editMode.email ? (
              <>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('email')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{venue.email || 'N/A'}</p>
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
            <label className="text-sm font-medium text-gray-500">Contact Name</label>
            {editMode.contact_name ? (
              <>
                <input
                  type="text"
                  value={formData.contact_name || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, contact_name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('contact_name')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{venue.contact_name || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, contact_name: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Street Address</label>
            {editMode.street_address ? (
              <>
                <input
                  type="text"
                  value={formData.street_address || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, street_address: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('street_address')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{venue.street_address || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, street_address: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">City</label>
            {editMode.city ? (
              <>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, city: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('city')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{venue.city || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, city: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">State</label>
            {editMode.state ? (
              <>
                <select
                  value={formData.state || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, state: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a state</option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleSaveField('state')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{venue.state || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, state: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Zip</label>
            {editMode.zip ? (
              <>
                <input
                  type="text"
                  value={formData.zip || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, zip: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('zip')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{venue.zip || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, zip: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Service Area</label>
            {editMode.service_area ? (
              <>
                <Select
                  value={serviceAreaOptions.find(option => option.value === formData.service_area_id) || null}
                  options={serviceAreaOptions}
                  onChange={handleServiceAreaChange}
                  isClearable
                  placeholder="Select service area..."
                  className="w-full"
                  classNamePrefix="react-select"
                />
                <button
                  onClick={() => handleSaveField('service_area')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{venue.region || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, service_area: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Booking Count</label>
            <p className="text-sm text-gray-900">{venue.booking_count || 0}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="text-sm text-gray-900">{new Date(venue.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Updated</label>
            <p className="text-sm text-gray-900">{new Date(venue.updated_at).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Insurance URL</label>
            {editMode.insurance ? (
              <>
                <input
                  type="text"
                  value={formData.insurance || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, insurance: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('insurance')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{venue.insurance || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, insurance: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Insurance
        </h2>
        <div className="space-y-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={uploadInsurance}
            disabled={!insuranceFile || loading}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
          >
            Upload Insurance PDF
          </button>
          {venue && venue.insurance && (
            <button
              onClick={downloadInsurance}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-2"
            >
              <Download className="h-4 w-4 mr-1" />
              Download Insurance
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
