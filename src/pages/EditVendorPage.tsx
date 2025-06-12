// src/pages/EditVendorPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Phone, User, Save, Plus, MessageSquare, Star, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Vendor, VendorService, VendorReview } from '../types/types';

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    profile_photo: '',
    phone: '',
    years_experience: '',
    profile: '',
    service_areas: '',
    specialties: '',
    stripe_account_id: ''
  });
  const [newReview, setNewReview] = useState({
    rating: 5,
    review_text: '',
    couple_id: null
  });
  const [saving, setSaving] = useState(false);
  const [addingReview, setAddingReview] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchVendor();
  }, [id]);

  const fetchVendor = async () => {
    try {
      setLoading(true);
      if (!id) {
        throw new Error('Vendor ID is undefined');
      }
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          vendor_services (
            id, vendor_id, service_type, is_active, package_status, created_at, updated_at
          ),
          vendor_reviews (
            id, vendor_id, couple_id, rating, review_text, vendor_response, created_at, updated_at
          ),
          vendor_service_packages (
            id, vendor_id, service_package_id, service_type, status, created_at, updated_at,
            service_packages (
              id, service_type, name, description, price, features, coverage, hour_amount, event_type, status, created_at, updated_at
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setVendor(data);
      setFormData({
        name: data.name || '',
        profile_photo: data.profile_photo || '',
        phone: data.phone || '',
        years_experience: data.years_experience?.toString() || '',
        profile: data.profile || '',
        service_areas: data.service_areas?.join(', ') || '',
        specialties: data.specialties?.join(', ') || '',
        stripe_account_id: data.stripe_account_id || ''
      });
    } catch (error: any) {
      console.error('Error fetching vendor:', error);
      toast.error('Failed to load vendor');
      navigate('/dashboard/vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    setSaving(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        profile_photo: formData.profile_photo.trim() || null,
        phone: formData.phone.trim() || null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        profile: formData.profile.trim() || null,
        service_areas: formData.service_areas
          ? formData.service_areas.split(',').map(area => area.trim()).filter(area => area.length > 0)
          : [],
        specialties: formData.specialties
          ? formData.specialties.split(',').map(specialty => specialty.trim()).filter(specialty => specialty.length > 0)
          : [],
        stripe_account_id: formData.stripe_account_id.trim() || null
      };

      const { data, error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendor.id)
        .select()
        .single();

      if (error) throw error;

      const { data: updatedVendorData, error: fetchError } = await supabase
        .from('vendors')
        .select(`
          *,
          vendor_services (
            id, vendor_id, service_type, is_active, package_status, created_at, updated_at
          ),
          vendor_reviews (
            id, vendor_id, couple_id, rating, review_text, vendor_response, created_at, updated_at
          ),
          vendor_service_packages (
            id, vendor_id, service_package_id, service_type, status, created_at, updated_at,
            service_packages (
              id, service_type, name, description, price, features, coverage, hour_amount, event_type, status, created_at, updated_at
            )
          )
        `)
        .eq('id', vendor.id)
        .single();

      if (fetchError) throw fetchError;

      setVendor(updatedVendorData);
      toast.success('Vendor profile updated successfully!');
      navigate(`/dashboard/vendor/${vendor.id}`);
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      toast.error('Failed to update vendor profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddReview = async () => {
    if (!vendor || !newReview.review_text.trim()) return;

    setAddingReview(true);
    try {
      const { data, error } = await supabase
        .from('vendor_reviews')
        .insert({
          vendor_id: vendor.id,
          couple_id: newReview.couple_id,
          rating: newReview.rating,
          review_text: newReview.review_text.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setVendor(prev => prev ? ({
        ...prev,
        vendor_reviews: [...(prev.vendor_reviews || []), data]
      }) : null);

      setNewReview({ rating: 5, review_text: '', couple_id: null });
      setShowAddReview(false);
      toast.success('Review added successfully!');
    } catch (error: any) {
      console.error('Error adding review:', error);
      toast.error('Failed to add review');
    } finally {
      setAddingReview(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'denied': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'denied': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const togglePackageExpand = (packageId: string) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(packageId)) {
        newSet.delete(packageId);
      } else {
        newSet.add(packageId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!vendor) return null;

  const activeServices = vendor.vendor_services?.filter(service => service.is_active) || [];
  const servicePackages = vendor.vendor_service_packages || [];
  const reviews = vendor.vendor_reviews || [];
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Edit className="h-8 w-8 text-blue-600 mr-3" />
          Edit Vendor: {vendor.name}
        </h1>
        <button
          onClick={() => navigate(`/dashboard/vendor/${vendor.id}`)}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 text-blue-600 mr-2" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="col-span-1">
              <label htmlFor="profile_photo" className="text-sm font-medium text-gray-500 block mb-2">
                Photo
              </label>
              <div className="relative">
                {formData.profile_photo && (
                  <img
                    src={formData.profile_photo}
                    alt={`${vendor.name}'s profile`}
                    className="w-32 h-32 object-cover rounded-full mt-2"
                  />
                )}
                <input
                  type="text"
                  id="profile_photo"
                  value={formData.profile_photo}
                  onChange={(e) => setFormData({ ...formData, profile_photo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                  placeholder="Enter photo URL (e.g., https://...)"
                />
                <button
                  type="button"
                  onClick={() => {/* Add photo upload logic if needed */}}
                  className="absolute bottom-2 right-2 inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Change
                </button>
              </div>
            </div>
            <div className="col-span-3 space-y-3">
              <div>
                <label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter vendor name"
                  required
                />
              </div>
              {vendor.phone && (
                <div>
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
                </div>
              )}
              <div>
                <label htmlFor="rating" className="text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex items-center space-x-2">
                  {averageRating ? (
                    <>
                      {renderStars(Math.round(averageRating), true, (rating) =>
                        setFormData({ ...formData, years_experience: rating.toString() }) // Using years_experience as a proxy for rating input
                      )}
                      <span className="text-sm text-gray-900">
                        {averageRating.toFixed(1)}/5.0 ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">No reviews yet</span>
                  )}
                </div>
              </div>
              {vendor.stripe_account_id && (
                <div>
                  <label htmlFor="stripe_account_id" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Stripe Account ID
                  </label>
                  <input
                    type="text"
                    id="stripe_account_id"
                    value={formData.stripe_account_id}
                    onChange={(e) => setFormData({ ...formData, stripe_account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="acct_1234567890"
                  />
                </div>
              )}
              <div>
                <label htmlFor="years_experience" className="text-sm font-medium text-gray-700 mb-2">
                  Years Experience
                </label>
                <input
                  type="number"
                  id="years_experience"
                  min="0"
                  max="50"
                  value={formData.years_experience}
                  onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter years of experience"
                />
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Description</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <textarea
              id="profile"
              rows={4}
              value={formData.profile}
              onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter vendor profile description..."
            />
          </div>
        </form>
      </div>

      {vendor.service_areas && vendor.service_areas.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <MapPin className="h-5 w-5 text-blue-600 mr-2" />
            Service Areas
          </h2>
          <div className="flex flex-wrap gap-2">
            {formData.service_areas.split(',').map((area, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {area.trim()}
              </span>
            ))}
          </div>
          <input
            type="text"
            value={formData.service_areas}
            onChange={(e) => setFormData({ ...formData, service_areas: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
            placeholder="Enter service areas (comma-separated)"
          />
        </div>
      )}

      {vendor.specialties && vendor.specialties.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Specialties</h2>
          <div className="flex flex-wrap gap-2">
            {formData.specialties.split(',').map((specialty, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
              >
                {specialty.trim()}
              </span>
            ))}
          </div>
          <input
            type="text"
            value={formData.specialties}
            onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
            placeholder="Enter specialties (comma-separated)"
          />
        </div>
      )}

      {activeServices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Services</h2>
          <div className="space-y-3">
            {activeServices.map((service) => (
              <div key={service.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">{service.service_type}</h4>
                    <p className="text-sm text-blue-700">
                      Package Status: <span className="font-medium">{service.package_status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                    <p className="text-xs text-blue-600 mt-1">
                      Added: {new Date(service.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Package className="h-5 w-5 text-blue-600 mr-2" />
          Service Packages ({servicePackages.length})
        </h2>
        {servicePackages.length > 0 ? (
          <div className="space-y-4">
            {servicePackages
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((vendorPackage) => {
                const servicePackage = vendorPackage.service_packages;
                if (!servicePackage) return null;

                const isExpanded = expandedPackages.has(vendorPackage.id);
                const caret = isExpanded ? '▼' : '▸';

                return (
                  <div key={vendorPackage.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div
                      className="flex items-center justify-between mb-2 cursor-pointer"
                      onClick={() => togglePackageExpand(vendorPackage.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">{servicePackage.name}</h4>
                          <span className="text-sm text-gray-500">({servicePackage.service_type})</span>
                        </div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(servicePackage.status)} mt-2`}>
                          {getStatusIcon(servicePackage.status)}
                          <span className="ml-2 capitalize">{servicePackage.status}</span>
                        </div>
                      </div>
                      <span className="text-xl">{caret}</span>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 space-y-4">
                        {servicePackage.description && (
                          <p className="text-sm text-gray-600 mb-3">{servicePackage.description}</p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Price:</span>
                            <p className="text-gray-900">${servicePackage.price.toLocaleString()}</p>
                          </div>
                          {servicePackage.hour_amount && (
                            <div>
                              <span className="font-medium text-gray-700">Hours:</span>
                              <p className="text-gray-900">{servicePackage.hour_amount}</p>
                            </div>
                          )}
                          {servicePackage.event_type && (
                            <div>
                              <span className="font-medium text-gray-700">Event Type:</span>
                              <p className="text-gray-900">{servicePackage.event_type}</p>
                            </div>
                          )}
                        </div>
                        {servicePackage.features && servicePackage.features.length > 0 && (
                          <div className="mt-3">
                            <span className="font-medium text-gray-700 text-sm">Features:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {servicePackage.features.map((feature, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-500">
                          <div>
                            Vendor Package ID: {vendorPackage.id}
                            <span className="mx-2">•</span>
                            Service Package ID: {servicePackage.id}
                          </div>
                          <div>
                            Applied: {new Date(vendorPackage.created_at).toLocaleDateString()}
                            {vendorPackage.updated_at !== vendorPackage.created_at && (
                              <span className="ml-2">
                                • Updated: {new Date(vendorPackage.updated_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {vendorPackage.status === 'pending' && (
                      <div className="flex space-x-2 mt-4">
                        <button
                          onClick={() => handleUpdatePackageStatus(vendorPackage.id, 'approved')}
                          disabled={updatingPackage === vendorPackage.id}
                          className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {updatingPackage === vendorPackage.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdatePackageStatus(vendorPackage.id, 'denied')}
                          disabled={updatingPackage === vendorPackage.id}
                          className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {updatingPackage === vendorPackage.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          Deny
                        </button>
                      </div>
                    )}
                    {(vendorPackage.status === 'approved' || vendorPackage.status === 'denied') && (
                      <div className="flex space-x-2 mt-4">
                        {vendorPackage.status === 'approved' && (
                          <>
                            <button
                              onClick={() => handleUpdatePackageStatus(vendorPackage.id, 'pending')}
                              disabled={updatingPackage === vendorPackage.id}
                              className="inline-flex items-center px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </button>
                            <button
                              onClick={() => handleUpdatePackageStatus(vendorPackage.id, 'denied')}
                              disabled={updatingPackage === vendorPackage.id}
                              className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Deny
                            </button>
                          </>
                        )}
                        {vendorPackage.status === 'denied' && (
                          <>
                            <button
                              onClick={() => handleUpdatePackageStatus(vendorPackage.id, 'approved')}
                              disabled={updatingPackage === vendorPackage.id}
                              className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdatePackageStatus(vendorPackage.id, 'pending')}
                              disabled={updatingPackage === vendorPackage.id}
                              className="inline-flex items-center px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No service packages</h4>
            <p className="text-gray-500">This vendor hasn't applied for any service packages yet.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
            Reviews ({vendor.vendor_reviews?.length || 0})
          </h2>
          <button
            onClick={() => setShowAddReview(!showAddReview)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Review
          </button>
        </div>
        {showAddReview && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h4 className="text-md font-medium text-green-900 mb-4">Add New Review</h4>
            <div className="space-y-4">
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
                    setNewReview({ rating: 5, review_text: '', couple_id: null });
                  }}
                  className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddReview}
                  disabled={addingReview || !newReview.review_text.trim()}
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
        {vendor.vendor_reviews && vendor.vendor_reviews.length > 0 ? (
          <div className="space-y-4">
            {vendor.vendor_reviews
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((review) => (
                <div key={review.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {renderStars(review.rating)}
                      <span className="text-sm font-medium text-gray-900">{review.rating}/5.0</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{review.review_text}</p>
                  {review.vendor_response && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">Vendor Response:</h5>
                      <p className="text-blue-800 text-sm whitespace-pre-wrap">{review.vendor_response}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Review ID: {review.id}
                      {review.couple_id && ` • Couple ID: ${review.couple_id}`}
                    </div>
                    {review.updated_at !== review.created_at && (
                      <span className="text-xs text-gray-500">
                        Updated: {new Date(review.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h4>
            <p className="text-gray-500">This vendor hasn't received any reviews yet.</p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => navigate(`/dashboard/vendor/${vendor.id}`)}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="vendor-form"
          disabled={saving || !formData.name.trim()}
          className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}