import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, User, MapPin, Package, CreditCard, Star, Phone, Plus, X, XCircle, ChevronDown, ChevronRight, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { useVendorData } from '../hooks/useVendorData';
import { Vendor, VendorService, VendorServicePackage, VendorReview, VendorGear } from '../types/types';
import { handleImageUpload, handleDeleteVendor } from '../utils/vendorUtils';
import EditableField from '../components/EditableField';

interface LanguageOption { id: string; language: string; }
interface VendorLanguage { id: string; vendor_id: string; language_id: string; language: string; }
interface StyleTagOption { id: number; label: string; description?: string; }
interface VendorStyleTag { id: string; vendor_id: string; style_id: number; label: string; description?: string; }
interface VibeTagOption { id: number; label: string; description?: string; }
interface VendorVibeTag { id: string; vendor_id: string; vibe_id: number; label: string; description?: string; }

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    vendor, vendorEmail, availableServicePackages, couples, serviceAreaOptions, vendorServiceAreas,
    vendorLanguages, languageOptions, vendorGear, styleTagOptions, vendorStyleTags, vibeTagOptions,
    vendorVibeTags, loading, setVendor, fetchVendorData, handleAddService, handleAddServicePackage,
    handleAddReview, handleUpdatePackageStatus, handleToggleService, handleAddServiceAreas,
    handleAddLanguages, removeLanguage, handleAddGear, removeGear, handleUpdateGearRating,
    handleAddStyleTags, removeStyleTag, handleAddVibeTags, removeVibeTag, removeServiceArea
  } = useVendorData(id);
  
  const [editMode, setEditMode] = useState({
    photo: false, phone: false, stripe: false, profile: false, specialties: false, name: false
  });
  const [formData, setFormData] = useState({
    profile_photo: vendor?.profile_photo || '',
    phone_number: vendor?.phone_number || vendor?.phone || '',
    stripe_account_id: vendor?.stripe_account_id || '',
    profile: vendor?.profile || '',
    specialties: vendor?.specialties?.join(', ') || '',
    name: vendor?.name || ''
  });
  const [newService, setNewService] = useState<VendorService>({
    id: '', vendor_id: id || '', service_type: '', is_active: true, package_status: 'pending',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  });
  const [newServicePackage, setNewServicePackage] = useState<VendorServicePackage>({
    id: '', vendor_id: id || '', service_package_id: '', service_type: '', status: 'pending',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  });
  const [newReview, setNewReview] = useState({
    communication_rating: 5, experience_rating: 5, quality_rating: 5, overall_rating: 5,
    feedback: '', couple_id: null as string | null
  });
  const [newGear, setNewGear] = useState<VendorGear>({
    id: '', vendor_id: id || '', gear_type: '', brand: '', model: '', year: null,
    condition: '', submitted_at: new Date().toISOString(), gear_rating: null, review_notes: ''
  });
  const [selectedRegions, setSelectedRegions] = useState<{ value: string; label: string }[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<{ value: string; label: string }[]>([]);
  const [selectedStyleTags, setSelectedStyleTags] = useState<{ value: number; label: string }[]>([]);
  const [selectedVibeTags, setSelectedVibeTags] = useState<{ value: number; label: string }[]>([]);
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [isServicePackagesExpanded, setIsServicePackagesExpanded] = useState(true);
  const [isVendorGearExpanded, setIsVendorGearExpanded] = useState(true);
  const [isGearModalOpen, setIsGearModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isStyleTagModalOpen, setIsStyleTagModalOpen] = useState(false);
  const [isVibeTagModalOpen, setIsVibeTagModalOpen] = useState(false);

  useEffect(() => {
    if (vendor) {
      console.log('Vendor:', vendor);
      console.log('FormData:', formData);
      setFormData({
        profile_photo: vendor.profile_photo || '',
        phone_number: vendor.phone_number || vendor.phone || '',
        stripe_account_id: vendor.stripe_account_id || '',
        profile: vendor.profile || '',
        specialties: vendor.specialties?.join(', ') || '',
        name: vendor.name || ''
      });
    }
  }, [vendor]);

  const regionOptions = serviceAreaOptions
    .filter(option => option.region && !vendorServiceAreas.some(area => area.service_area_id === option.id))
    .map(option => ({ value: option.id, label: option.region }));
  const languageSelectOptions = languageOptions
    .filter(option => !vendorLanguages.some(vLang => vLang.language_id === option.id))
    .map(option => ({ value: option.id, label: option.language }));
  const styleTagSelectOptions = styleTagOptions
    .filter(option => !vendorStyleTags.some(vTag => vTag.style_id === option.id))
    .map(option => ({ value: option.id, label: option.label }));
  const vibeTagSelectOptions = vibeTagOptions
    .filter(option => !vendorVibeTags.some(vTag => vTag.vibe_id === option.id))
    .map(option => ({ value: option.id, label: option.label }));

  const handleSaveField = async (field: string) => {
    if (!vendor) return;
    try {
      const updateData: Partial<Vendor> = {};
      if (field === 'specialties') {
        updateData[field] = formData[field] ? formData[field].split(',').map(s => s.trim()).filter(s => s.length) : [];
      } else {
        updateData[field] = formData[field].trim() || null;
      }
      const { error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendor.id);
      if (error) throw error;
      setVendor({ ...vendor, ...updateData });
      setEditMode({ ...editMode, [field]: false });
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
    } catch (error: any) {
      console.error(`Failed to update ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    }
  };

  const handleAddGearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddGear(newGear);
    setNewGear({ id: '', vendor_id: id || '', gear_type: '', brand: '', model: '', year: null, condition: '', submitted_at: new Date().toISOString(), gear_rating: null, review_notes: '' });
    setIsGearModalOpen(false);
  };

  const handleAddLanguagesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddLanguages(selectedLanguages);
    setSelectedLanguages([]);
    setIsLanguageModalOpen(false);
  };

  const handleAddStyleTagsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddStyleTags(selectedStyleTags);
    setSelectedStyleTags([]);
    setIsStyleTagModalOpen(false);
  };

  const handleAddVibeTagsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddVibeTags(selectedVibeTags);
    setSelectedVibeTags([]);
    setIsVibeTagModalOpen(false);
  };

  const renderStars = (rating: number, interactive: boolean = false, onRatingChange?: (rating: number) => void) => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => interactive && onRatingChange && onRatingChange(star)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          disabled={!interactive}
        >
          <Star
            className={`h-5 w-5 ${rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  );

  if (loading || !vendor) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  const activeServices = vendor.vendor_services || [];
  const vendorServicePackages = vendor.vendor_service_packages || [];
  const pendingPackagesCount = vendorServicePackages.filter(pkg => pkg.status === 'pending').length;
  const reviews = vendor.vendor_reviews || [];
  const semiProGearCount = vendorGear.filter(g => g.gear_rating === 'semi-pro').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Building2 className="h-8 w-8 text-blue-600 mr-3" />
          <EditableField
            value={formData.name}
            field="name"
            editMode={editMode.name}
            setEditMode={v => setEditMode({ ...editMode, name: v })}
            onSave={() => handleSaveField('name')}
            onChange={v => setFormData({ ...formData, name: v })}
            placeholder="No name provided"
            className="text-3xl font-bold"
          />
        </h1>
        <div className="space-x-2">
          <button onClick={() => handleDeleteVendor(vendor.id, navigate)} className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            <XCircle className="h-4 w-4 mr-1" /> Delete Vendor
          </button>
          <button onClick={() => navigate('/dashboard/vendors')} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Back to Vendors
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="h-5 w-5 text-blue-600 mr-2" /> Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <EditableField
              type="image"
              value={formData.profile_photo}
              field="photo"
              editMode={editMode.photo}
              setEditMode={v => setEditMode({ ...editMode, photo: v })}
              onSave={() => handleSaveField('profile_photo')}
              onChange={v => setFormData({ ...formData, profile_photo: v })}
              onFileChange={e => handleImageUpload(e, vendor.id, setFormData, handleSaveField)}
              placeholder="No photo provided"
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
          <div className="col-span-2 space-y-4">
            {vendorEmail && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <p className="text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">{vendorEmail}</p>
              </div>
            )}
            <EditableField
              value={formData.phone_number}
              field="phone"
              editMode={editMode.phone}
              setEditMode={v => setEditMode({ ...editMode, phone: v })}
              onSave={() => handleSaveField('phone_number')}
              onChange={v => setFormData({ ...formData, phone_number: v })}
              icon={<Phone className="h-4 w-4 mr-1 text-gray-500" />}
              type="tel"
              placeholder="No phone provided"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <EditableField
              value={formData.stripe_account_id}
              field="stripe"
              editMode={editMode.stripe}
              setEditMode={v => setEditMode({ ...editMode, stripe: v })}
              onSave={() => handleSaveField('stripe_account_id')}
              onChange={v => setFormData({ ...formData, stripe_account_id: v })}
              icon={<CreditCard className="h-4 w-4 mr-1 text-gray-500" />}
              placeholder="No Stripe ID provided"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-600">Languages</label>
                <button
                  onClick={() => setIsLanguageModalOpen(true)}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Languages
                </button>
              </div>
              {vendorLanguages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {vendorLanguages.map(lang => (
                    <div key={lang.id} className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                      <span>{lang.language}</span>
                      <button onClick={() => removeLanguage(lang.id)} className="ml-2 text-blue-600 hover:text-blue-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No languages added</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-600">Style Tags</label>
                <button
                  onClick={() => setIsStyleTagModalOpen(true)}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Style Tags
                </button>
              </div>
              {vendorStyleTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {vendorStyleTags.map(tag => (
                    <div key={tag.id} className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                      <span>{tag.label}</span>
                      <button onClick={() => removeStyleTag(tag.id)} className="ml-2 text-blue-600 hover:text-blue-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No style tags added</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-600">Vibe Tags</label>
                <button
                  onClick={() => setIsVibeTagModalOpen(true)}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Vibe Tags
                </button>
              </div>
              {vendorVibeTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {vendorVibeTags.map(tag => (
                    <div key={tag.id} className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                      <span>{tag.label}</span>
                      <button onClick={() => removeVibeTag(tag.id)} className="ml-2 text-blue-600 hover:text-blue-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No vibe tags added</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isGearModalOpen} onClose={() => setIsGearModalOpen(false)} title="Add Gear">
        <form onSubmit={handleAddGearSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Gear Type</label>
            <input
              type="text"
              value={newGear.gear_type}
              onChange={e => setNewGear({ ...newGear, gear_type: e.target.value })}
              placeholder="Gear Type"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Brand</label>
            <input
              type="text"
              value={newGear.brand}
              onChange={e => setNewGear({ ...newGear, brand: e.target.value })}
              placeholder="Brand"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Model</label>
            <input
              type="text"
              value={newGear.model}
              onChange={e => setNewGear({ ...newGear, model: e.target.value })}
              placeholder="Model"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Year</label>
            <input
              type="number"
              value={newGear.year || ''}
              onChange={e => setNewGear({ ...newGear, year: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Year"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Condition</label>
            <input
              type="text"
              value={newGear.condition}
              onChange={e => setNewGear({ ...newGear, condition: e.target.value })}
              placeholder="Condition"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Review Notes</label>
            <input
              type="text"
              value={newGear.review_notes}
              onChange={e => setNewGear({ ...newGear, review_notes: e.target.value })}
              placeholder="Review Notes"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setIsGearModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Add Gear
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} title="Add Languages">
        <form onSubmit={handleAddLanguagesSubmit} className="space-y-4">
          <CreatableSelect
            isMulti
            options={languageSelectOptions}
            value={selectedLanguages}
            onChange={selected => setSelectedLanguages(selected as { value: string; label: string }[])}
            className="basic-multi-select"
            placeholder="Select or type languages..."
          />
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setIsLanguageModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
              Cancel
            </button>
            <button type="submit" disabled={!selectedLanguages.length} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              Add Languages
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isStyleTagModalOpen} onClose={() => setIsStyleTagModalOpen(false)} title="Add Style Tags">
        <form onSubmit={handleAddStyleTagsSubmit} className="space-y-4">
          <Select
            isMulti
            options={styleTagSelectOptions}
            value={selectedStyleTags}
            onChange={selected => setSelectedStyleTags(selected as { value: number; label: string }[])}
            className="basic-multi-select"
            placeholder="Select style tags..."
          />
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setIsStyleTagModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
              Cancel
            </button>
            <button type="submit" disabled={!selectedStyleTags.length} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              Add Style Tags
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isVibeTagModalOpen} onClose={() => setIsVibeTagModalOpen(false)} title="Add Vibe Tags">
        <form onSubmit={handleAddVibeTagsSubmit} className="space-y-4">
          <Select
            isMulti
            options={vibeTagSelectOptions}
            value={selectedVibeTags}
            onChange={selected => setSelectedVibeTags(selected as { value: number; label: string }[])}
            className="basic-multi-select"
            placeholder="Select vibe tags..."
          />
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setIsVibeTagModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
              Cancel
            </button>
            <button type="submit" disabled={!selectedVibeTags.length} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              Add Vibe Tags
            </button>
          </div>
        </form>
      </Modal>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Description</h2>
        <EditableField
          value={formData.profile}
          field="profile"
          editMode={editMode.profile}
          setEditMode={v => setEditMode({ ...editMode, profile: v })}
          onSave={() => handleSaveField('profile')}
          onChange={v => setFormData({ ...formData, profile: v })}
          type="textarea"
          placeholder="No description provided"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsVendorGearExpanded(!isVendorGearExpanded)}
        >
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Camera className="h-5 w-5 text-blue-600 mr-2" />
            Vendor Gear ({vendorGear.length} total, {semiProGearCount} semi-pro)
          </h2>
          <span className="text-xl">{isVendorGearExpanded ? <ChevronDown /> : <ChevronRight />}</span>
        </div>
        {isVendorGearExpanded && (
          <>
            {vendorGear.length > 0 ? (
              <ul className="space-y-4 mt-4">
                {vendorGear.map(gear => (
                  <li key={gear.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p><strong>Type:</strong> {gear.gear_type || 'N/A'}</p>
                        <p><strong>Brand:</strong> {gear.brand || 'N/A'}</p>
                        <p><strong>Model:</strong> {gear.model || 'N/A'}</p>
                        <p><strong>Year:</strong> {gear.year || 'N/A'}</p>
                      </div>
                      <div>
                        <p><strong>Condition:</strong> {gear.condition || 'N/A'}</p>
                        <p><strong>Submitted:</strong> {new Date(gear.submitted_at).toLocaleDateString()}</p>
                        <p><strong>Rating:</strong> {gear.gear_rating || 'Not rated'}</p>
                        <p><strong>Notes:</strong> {gear.review_notes || 'None'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => handleUpdateGearRating(gear.id, 'semi-pro')}
                        className={`inline-flex items-center px-3 py-1 rounded-md ${gear.gear_rating === 'semi-pro' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-green-700 hover:text-white`}
                      >
                        Semi-Pro
                      </button>
                      <button
                        onClick={() => handleUpdateGearRating(gear.id, 'pro')}
                        className={`inline-flex items-center px-3 py-1 rounded-md ${gear.gear_rating === 'pro' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-green-700 hover:text-white`}
                      >
                        Pro
                      </button>
                      <button
                        onClick={() => removeGear(gear.id)}
                        className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        <X className="h-4 w-4 mr-1" /> Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 mt-4">No gear added</p>
            )}
            <button
              onClick={() => setIsGearModalOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" /> Add Gear
            </button>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <MapPin className="h-5 w-5 text-blue-600 mr-2" /> Service Areas
        </h2>
        <Select
          isMulti
          options={regionOptions}
          value={selectedRegions}
          onChange={setSelectedRegions}
          className="basic-multi-select"
          placeholder="Select regions..."
        />
        <button
          onClick={() => handleAddServiceAreas(selectedRegions)}
          disabled={!selectedRegions.length}
          className="mt-2 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          <Plus className="h-5 w-5 mr-2" /> Add Service Areas
        </button>
        {vendorServiceAreas.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {vendorServiceAreas.map(area => (
              <div key={area.id} className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                <span>{area.region} ({area.state})</span>
                <button onClick={() => removeServiceArea(area.id)} className="ml-2 text-blue-600 hover:text-blue-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Services</h2>
        {activeServices.map(service => (
          <div key={service.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2 flex justify-between items-center">
            <span>{service.service_type} ({service.package_status})</span>
            <button
              onClick={() => handleToggleService(service.id, !service.is_active)}
              className={`px-3 py-1 rounded-md ${service.is_active ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'} hover:bg-green-700 hover:text-white`}
            >
              {service.is_active ? 'Active' : 'Activate'}
            </button>
          </div>
        ))}
        <form onSubmit={e => { e.preventDefault(); handleAddService(newService); }} className="mt-4">
          <input
            type="text"
            value={newService.service_type}
            onChange={e => setNewService({ ...newService, service_type: e.target.value })}
            placeholder="Service Type"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="mt-2 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Add Service
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsServicePackagesExpanded(!isServicePackagesExpanded)}
        >
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Package className="h-5 w-5 text-blue-600 mr-2" />
            Service Packages ({vendorServicePackages.length} total, {pendingPackagesCount} pending)
          </h2>
          <span className="text-xl">{isServicePackagesExpanded ? <ChevronDown /> : <ChevronRight />}</span>
        </div>
        {isServicePackagesExpanded && (
          <>
            {vendorServicePackages.map(vendorPackage => (
              <div key={vendorPackage.id} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedPackages(prev => {
                    const newSet = new Set(prev);
                    newSet.has(vendorPackage.id) ? newSet.delete(vendorPackage.id) : newSet.add(vendorPackage.id);
                    return newSet;
                  })}
                >
                  <h4 className="text-lg font-medium text-gray-900">{vendorPackage.service_packages?.name} ({vendorPackage.status})</h4>
                  <span className="text-xl">{expandedPackages.has(vendorPackage.id) ? '▼' : '▸'}</span>
                </div>
                {expandedPackages.has(vendorPackage.id) && (
                  <div className="mt-4">
                    <p>Details: {vendorPackage.service_packages?.description}</p>
                    <div className="mt-2 space-x-2">
                      <button
                        onClick={() => handleUpdatePackageStatus(vendorPackage.id, 'approved')}
                        className={`inline-flex items-center px-3 py-1 rounded-md ${vendorPackage.status === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-green-700 hover:text-white`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdatePackageStatus(vendorPackage.id, 'pending')}
                        className={`inline-flex items-center px-3 py-1 rounded-md ${vendorPackage.status === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-yellow-700 hover:text-white`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => handleUpdatePackageStatus(vendorPackage.id, 'denied')}
                        className={`inline-flex items-center px-3 py-1 rounded-md ${vendorPackage.status === 'denied' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-red-700 hover:text-white`}
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <form onSubmit={e => { e.preventDefault(); handleAddServicePackage(newServicePackage); }} className="mt-4">
              <Select
                options={availableServicePackages.map(pkg => ({ value: pkg.id, label: pkg.name }))}
                onChange={option => setNewServicePackage({ ...newServicePackage, service_package_id: option?.value || '' })}
                className="mb-2"
                placeholder="Select service package..."
              />
              <input
                type="text"
                value={newServicePackage.service_type}
                onChange={e => setNewServicePackage({ ...newServicePackage, service_type: e.target.value })}
                placeholder="Service Type"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="mt-2 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Add Service Package
              </button>
            </form>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reviews</h2>
        {reviews.map(review => (
          <div key={review.id} className="border-b border-gray-200 py-4">
            <div className="flex items-center">
              {renderStars(review.overall_rating)}
              <span className="ml-2 text-sm text-gray-600">by {review.couples?.name}</span>
            </div>
            <p className="text-sm text-gray-700 mt-2">{review.feedback}</p>
          </div>
        ))}
        <form onSubmit={e => { e.preventDefault(); handleAddReview(newReview); }} className="mt-4">
          <Select
            options={couples.map(c => ({ value: c.id, label: c.name }))}
            onChange={option => setNewReview({ ...newReview, couple_id: option?.value || null })}
            className="mb-2"
            placeholder="Select couple..."
          />
          <textarea
            value={newReview.feedback}
            onChange={e => setNewReview({ ...newReview, feedback: e.target.value })}
            placeholder="Review feedback"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="mt-2 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Add Review
          </button>
        </form>
      </div>
    </div>
  );
}