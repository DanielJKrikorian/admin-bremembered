import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Edit, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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

export default function ServicePackageDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState<ServicePackage | null>(null);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<ServicePackage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackage();
  }, [id]);

  const fetchPackage = async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Package ID is undefined');

      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setPackageData(data);
      setFormData(data);
    } catch (error: any) {
      console.error('Error fetching service package:', error);
      toast.error('Failed to load service package');
      navigate('/dashboard/service-packages');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field: string) => {
    if (!formData || !packageData) return;

    setLoading(true);
    try {
      const updateData = { [field]: formData[field as keyof ServicePackage] };
      if (field === 'features') updateData[field] = formData.features || [];
      if (field === 'coverage') updateData[field] = formData.coverage || {};
      const { error } = await supabase
        .from('service_packages')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', packageData.id);

      if (error) throw error;

      setPackageData(prev => prev ? { ...prev, ...updateData, updated_at: new Date().toISOString() } : null);
      setEditMode(prev => ({ ...prev, [field]: false }));
      toast.success(`${field} updated successfully!`);
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !packageData || !formData) {
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
          Service Package: {packageData.name}
        </h1>
        <button
          onClick={() => navigate('/dashboard/service-packages')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Packages
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Package Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">ID</label>
            <p className="text-sm text-gray-900">{packageData.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Service Types</label>
            {editMode.service_type ? (
              <>
                <input
                  type="text"
                  value={formData.service_type}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, service_type: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., photography,videography,dj"
                />
                <button
                  onClick={() => handleSaveField('service_type')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                {packageData.service_type
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
                  )) || <p className="text-sm text-gray-900">N/A</p>}
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, service_type: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
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
                <p className="text-sm text-gray-900">{packageData.name}</p>
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
            <label className="text-sm font-medium text-gray-500">Description</label>
            {editMode.description ? (
              <>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('description')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{packageData.description || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, description: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Price</label>
            {editMode.price ? (
              <>
                <input
                  type="number"
                  value={formData.price / 100} // Display and edit as dollars
                  onChange={(e) => setFormData(prev => prev ? { ...prev, price: Math.round(parseFloat(e.target.value) * 100) } : null)} // Store as cents
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
                <button
                  onClick={() => handleSaveField('price')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">${(packageData.price / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, price: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Features</label>
            {editMode.features ? (
              <>
                <textarea
                  value={(formData.features || []).join('\n')}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, features: e.target.value.split('\n').filter(f => f.trim()) } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter one feature per line"
                />
                <button
                  onClick={() => handleSaveField('features')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{(packageData.features || []).join(', ') || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, features: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Coverage</label>
            {editMode.coverage ? (
              <>
                <textarea
                  value={JSON.stringify(formData.coverage || {}, null, 2)}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, coverage: JSON.parse(e.target.value || '{}') } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder='{"key": "value"}'
                />
                <button
                  onClick={() => handleSaveField('coverage')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{JSON.stringify(packageData.coverage || {}) || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, coverage: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            {editMode.status ? (
              <>
                <input
                  type="text"
                  value={formData.status || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, status: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('status')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{packageData.status || 'N/A'}</p>
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
            <label className="text-sm font-medium text-gray-500">Vendor ID</label>
            {editMode.vendor_id ? (
              <>
                <input
                  type="text"
                  value={formData.vendor_id || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, vendor_id: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('vendor_id')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{packageData.vendor_id || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, vendor_id: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Hour Amount</label>
            {editMode.hour_amount ? (
              <>
                <input
                  type="number"
                  step="0.1"
                  value={formData.hour_amount || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, hour_amount: parseFloat(e.target.value) } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('hour_amount')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{packageData.hour_amount || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, hour_amount: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Lookup Key</label>
            {editMode.lookup_key ? (
              <>
                <input
                  type="text"
                  value={formData.lookup_key || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, lookup_key: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('lookup_key')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{packageData.lookup_key || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, lookup_key: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Event Type</label>
            {editMode.event_type ? (
              <>
                <input
                  type="text"
                  value={formData.event_type || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, event_type: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('event_type')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{packageData.event_type || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, event_type: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="text-sm text-gray-900">{new Date(packageData.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Updated</label>
            <p className="text-sm text-gray-900">{new Date(packageData.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}