import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Edit, Save, Upload, Trash2 } from 'lucide-react';
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
  primary_image: string | null;
}

export default function ServicePackageDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState<ServicePackage | null>(null);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<ServicePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
      setImagePreview(data.primary_image);
    } catch (error: any) {
      console.error('Error fetching service package:', error);
      toast.error('Failed to load service package');
      navigate('/dashboard/service-packages');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image (PNG, JPEG, JPG)');
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // Updated to 50MB limit
        toast.error('Image size must be less than 50MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile || !packageData) {
      toast.error('No image selected or package data missing');
      return;
    }

    setUploading(true);
    try {
      // Check authentication status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // If there's an existing image, delete it first
      if (packageData.primary_image) {
        const fileName = packageData.primary_image.split('/').pop();
        if (fileName) {
          const { error: deleteError } = await supabase.storage
            .from('service_packages_images')
            .remove([fileName]);
          if (deleteError) {
            console.warn('Failed to delete existing image:', deleteError.message);
            // Continue with upload even if deletion fails
          }
        }
      }

      // Upload new image
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${packageData.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('service_packages_images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('service_packages_images')
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for the image');
      }

      // Update service_packages table with new image URL
      const { error: updateError } = await supabase
        .from('service_packages')
        .update({ 
          primary_image: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', packageData.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      setPackageData(prev => prev ? { ...prev, primary_image: publicUrl } : null);
      setFormData(prev => prev ? { ...prev, primary_image: publicUrl } : null);
      setImageFile(null);
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleImageDelete = async () => {
    if (!packageData || !packageData.primary_image) {
      toast.error('No image to delete');
      return;
    }

    setUploading(true);
    try {
      // Check authentication status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Extract file name from public URL
      const fileName = packageData.primary_image.split('/').pop();
      if (!fileName) {
        throw new Error('Invalid image URL');
      }

      // Delete image from storage
      const { error: deleteError } = await supabase.storage
        .from('service_packages_images')
        .remove([fileName]);

      if (deleteError) {
        throw new Error(`Delete failed: ${deleteError.message}`);
      }

      // Update service_packages table to set primary_image to null
      const { error: updateError } = await supabase
        .from('service_packages')
        .update({ 
          primary_image: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', packageData.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      setPackageData(prev => prev ? { ...prev, primary_image: null } : null);
      setFormData(prev => prev ? { ...prev, primary_image: null } : null);
      setImagePreview(null);
      setImageFile(null);
      toast.success('Image deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast.error(error.message || 'Failed to delete image');
    } finally {
      setUploading(false);
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
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Service Package: {packageData.name}
        </h1>
        <button
          onClick={() => navigate('/dashboard/service-packages')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          Back to Packages
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Calendar className="h-6 w-6 text-blue-600 mr-2" />
          Package Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">ID</label>
            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{packageData.id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Service Types</label>
            {editMode.service_type ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.service_type}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, service_type: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., photography,videography,dj"
                />
                <button
                  onClick={() => handleSaveField('service_type')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 bg-gray-50 p-3 rounded-lg">
                  {packageData.service_type
                    ?.split(',')
                    .map(service => service.trim())
                    .filter(service => service)
                    .map((service, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-full"
                      >
                        {service}
                      </span>
                    )) || <p className="text-sm text-gray-900">N/A</p>}
                </div>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, service_type: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
            {editMode.name ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('name')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{packageData.name}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, name: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
            {editMode.description ? (
              <div className="space-y-2">
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                />
                <button
                  onClick={() => handleSaveField('description')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{packageData.description || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, description: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Price</label>
            {editMode.price ? (
              <div className="space-y-2">
                <input
                  type="number"
                  value={formData.price / 100}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, price: Math.round(parseFloat(e.target.value) * 100) } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
                <button
                  onClick={() => handleSaveField('price')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  ${(packageData.price / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, price: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Features</label>
            {editMode.features ? (
              <div className="space-y-2">
                <textarea
                  value={(formData.features || []).join('\n')}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, features: e.target.value.split('\n').filter(f => f.trim()) } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Enter one feature per line"
                />
                <button
                  onClick={() => handleSaveField('features')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{(packageData.features || []).join(', ') || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, features: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Coverage</label>
            {editMode.coverage ? (
              <div className="space-y-2">
                <textarea
                  value={JSON.stringify(formData.coverage || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      setFormData(prev => prev ? { ...prev, coverage: JSON.parse(e.target.value || '{}') } : null);
                    } catch {}
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder='{"key": "value"}'
                />
                <button
                  onClick={() => handleSaveField('coverage')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{JSON.stringify(packageData.coverage || {}) || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, coverage: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
            {editMode.status ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.status || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, status: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('status')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{packageData.status || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, status: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Vendor ID</label>
            {editMode.vendor_id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.vendor_id || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, vendor_id: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('vendor_id')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{packageData.vendor_id || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, vendor_id: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Hour Amount</label>
            {editMode.hour_amount ? (
              <div className="space-y-2">
                <input
                  type="number"
                  step="0.1"
                  value={formData.hour_amount || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, hour_amount: parseFloat(e.target.value) } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('hour_amount')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{packageData.hour_amount || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, hour_amount: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Lookup Key</label>
            {editMode.lookup_key ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.lookup_key || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, lookup_key: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('lookup_key')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{packageData.lookup_key || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, lookup_key: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Event Type</label>
            {editMode.event_type ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.event_type || ''}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, event_type: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSaveField('event_type')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{packageData.event_type || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, event_type: true }))}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{new Date(packageData.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Updated</label>
            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{new Date(packageData.updated_at).toLocaleDateString()}</p>
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-500 mb-1">Primary Image</label>
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Package preview" 
                  className="max-w-full h-auto rounded-lg max-h-64 object-cover"
                />
              ) : (
                <div className="h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No image uploaded</p>
                </div>
              )}
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                {imageFile && (
                  <button
                    onClick={handleImageUpload}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                )}
                {packageData.primary_image && !imageFile && (
                  <button
                    onClick={handleImageDelete}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                    disabled={uploading}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {uploading ? 'Deleting...' : 'Delete Image'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}