import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, User, Calendar, MapPin, MessageSquare, Package, CreditCard, Check, Clock, AlertCircle, XCircle, Star, Edit, Phone, Save, Plus, Mail, Key, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Vendor, VendorService, ServicePackage, VendorServicePackage, VendorReview } from '../types/types';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

interface LanguageOption {
  id: string;
  language: string;
}

interface VendorLanguage {
  id: string;
  vendor_id: string;
  language_id: string;
  language: string; // For display purposes
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendorEmail, setVendorEmail] = useState<string | null>(null);
  const [availableServicePackages, setAvailableServicePackages] = useState<{ id: string; name: string; service_type: string; event_type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPackage, setUpdatingPackage] = useState<string | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState<Record<string, boolean>>({
    photo: false,
    phone: false,
    stripe: false,
    profile: false,
    specialties: false,
  });
  const [newService, setNewService] = useState<VendorService>({
    id: '',
    vendor_id: id || '',
    service_type: '',
    is_active: true,
    package_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const [newServicePackage, setNewServicePackage] = useState<VendorServicePackage>({
    id: '',
    vendor_id: id || '',
    service_package_id: '',
    service_type: '',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const [newReview, setNewReview] = useState({
    communication_rating: 5,
    experience_rating: 5,
    quality_rating: 5,
    overall_rating: 5,
    feedback: '',
    couple_id: null as string | null,
  });
  const [couples, setCouples] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    profile_photo: '',
    phone: '',
    stripe_account_id: '',
    profile: '',
    specialties: '',
  });
  const [addingReview, setAddingReview] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);
  const [serviceAreaOptions, setServiceAreaOptions] = useState<{ id: string; region: string; state: string }[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<{ value: string; label: string }[]>([]);
  const [stagedServiceAreas, setStagedServiceAreas] = useState<{ service_area_id: string; state: string; region: string }[]>([]);
  const [vendorServiceAreas, setVendorServiceAreas] = useState<{ id: string; service_area_id: string; state: string; region: string }[]>([]);
  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<{ value: string; label: string }[]>([]);
  const [stagedLanguages, setStagedLanguages] = useState<{ language_id: string; language: string }[]>([]);
  const [vendorLanguages, setVendorLanguages] = useState<VendorLanguage[]>([]);

  useEffect(() => {
    fetchVendor();
    fetchCouples();
    fetchAvailableServicePackages();
    fetchServiceAreaOptions();
    fetchVendorServiceAreas();
    fetchLanguageOptions();
    fetchVendorLanguages();
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
            id, vendor_id, couple_id, communication_rating, feedback, vendor_response, created_at, updated_at,
            experience_rating, quality_rating, overall_rating,
            couples (name)
          ),
          vendor_service_packages (
            id, vendor_id, service_package_id, service_type, status, created_at, updated_at,
            service_packages (
              id, service_type, name, description, price, features, coverage, hour_amount, event_type, status, created_at, updated_at
            )
          ),
          vendor_service_areas (
            id, vendor_id, service_area_id, state, region,
            service_areas (id, region, state)
          ),
          vendor_languages (
            id, vendor_id, language_id, languages (id, language)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase error fetching vendor:', error, error?.details, error?.message);
        throw error;
      }
      setVendor({
        ...data,
        languages: data.vendor_languages ? data.vendor_languages.map((lang: any) => lang.languages.language).sort() : [],
      });
      setFormData({
        profile_photo: data.profile_photo || '',
        phone: data.phone || '',
        stripe_account_id: data.stripe_account_id || '',
        profile: data.profile || '',
        specialties: data.specialties?.join(', ') || '',
      });
      setVendorServiceAreas(data.vendor_service_areas.map((area: any) => ({
        id: area.id,
        service_area_id: area.service_area_id,
        state: area.state || area.service_areas?.state || 'N/A',
        region: area.region || area.service_areas?.region || 'N/A',
      })));
      setVendorLanguages(
        data.vendor_languages.map((lang: any) => ({
          id: lang.id,
          vendor_id: lang.vendor_id,
          language_id: lang.language_id,
          language: lang.languages?.language || 'Unknown',
        }))
      );
      setSelectedRegions(
        data.vendor_service_areas
          .filter((area: any) => area.service_areas?.region)
          .map((area: any) => ({
            value: area.service_area_id,
            label: area.service_areas.region,
          }))
      );
      setSelectedLanguages(
        data.vendor_languages
          .filter((lang: any) => lang.languages?.language)
          .map((lang: any) => ({
            value: lang.language_id,
            label: lang.languages.language,
          }))
      );

      // Fetch email from users table using user_id
      if (data.user_id) {
        console.log('Looking up user with id:', data.user_id);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', data.user_id);
        if (userError) {
          console.error('Error fetching user email:', userError, userError?.details, userError?.message);
          if (userError.code === 'PGRST116') {
            toast.error(`No user found for user_id: ${data.user_id}. Please check the users table.`);
          } else {
            throw userError;
          }
        } else if (userData && userData.length > 0) {
          setVendorEmail(userData[0].email || null);
          console.log('Fetched email:', userData[0].email);
        } else {
          console.warn('No user data returned for user_id:', data.user_id);
          toast.error(`No email found for user_id: ${data.user_id}.`);
        }
      }
    } catch (error: any) {
      console.error('Error fetching vendor:', error, error?.details, error?.message);
      toast.error('Failed to load vendor');
      navigate('/dashboard/vendors');
    } finally {
      setLoading(false);
    }
  };

  const fetchCouples = async () => {
    try {
      const { data, error } = await supabase
        .from('couples')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) {
        console.error('Supabase error fetching couples:', error, error?.details, error?.message);
        throw error;
      }
      setCouples(data || []);
    } catch (error: any) {
      console.error('Error fetching couples:', error, error?.details, error?.message);
      toast.error('Failed to load couples');
    }
  };

  const fetchAvailableServicePackages = async () => {
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('id, name, service_type, event_type');
      if (error) {
        console.error('Supabase error fetching service packages:', error, error?.details, error?.message);
        throw error;
      }
      setAvailableServicePackages(data || []);
    } catch (error: any) {
      console.error('Error fetching service packages:', error, error?.details, error?.message);
      toast.error('Failed to load service packages');
    }
  };

  const fetchServiceAreaOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('id, region, state')
        .not('region', 'is', null)
        .order('region', { ascending: true });
      if (error) {
        console.error('Supabase error fetching service area options:', error, error?.details, error?.message);
        throw error;
      }
      setServiceAreaOptions(data || []);
    } catch (error: any) {
      console.error('Error fetching service area options:', error, error?.details, error?.message);
      toast.error('Failed to load service area options');
    }
  };

  const fetchVendorServiceAreas = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('vendor_service_areas')
        .select('id, vendor_id, service_area_id, state, region, service_areas (id, region, state)')
        .eq('vendor_id', id);
      if (error) {
        console.error('Supabase error fetching vendor service areas:', error, error?.details, error?.message);
        throw error;
      }
      setVendorServiceAreas(
        data?.map((area: any) => ({
          id: area.id,
          service_area_id: area.service_area_id,
          state: area.state || area.service_areas?.state || 'N/A',
          region: area.region || area.service_areas?.region || 'N/A',
        })) || []
      );
      setSelectedRegions(
        data
          ?.filter((area: any) => area.service_areas?.region)
          .map((area: any) => ({
            value: area.service_area_id,
            label: area.service_areas.region,
          })) || []
      );
    } catch (error: any) {
      console.error('Error fetching vendor service areas:', error, error?.details, error?.message);
      toast.error('Failed to load vendor service areas');
    }
  };

  const fetchLanguageOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('languages')
        .select('id, language')
        .order('language', { ascending: true });
      if (error) {
        console.error('Supabase error fetching language options:', error, error?.details, error?.message);
        throw error;
      }
      setLanguageOptions(data || []);
    } catch (error: any) {
      console.error('Error fetching language options:', error, error?.details, error?.message);
      toast.error('Failed to load language options');
    }
  };

  const fetchVendorLanguages = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('vendor_languages')
        .select('id, vendor_id, language_id, languages (id, language)')
        .eq('vendor_id', id);
      if (error) {
        console.error('Supabase error fetching vendor languages:', error, error?.details, error?.message);
        throw error;
      }
      setVendorLanguages(
        data?.map((lang: any) => ({
          id: lang.id,
          vendor_id: lang.vendor_id,
          language_id: lang.language_id,
          language: lang.languages?.language || 'Unknown',
        })) || []
      );
      setSelectedLanguages(
        data
          ?.filter((lang: any) => lang.languages?.language)
          .map((lang: any) => ({
            value: lang.language_id,
            label: lang.languages.language,
          })) || []
      );
    } catch (error: any) {
      console.error('Error fetching vendor languages:', error, error?.details, error?.message);
      toast.error('Failed to load vendor languages');
    }
  };

  const addServiceAreas = async () => {
    if (!vendor || !stagedServiceAreas.length) return;

    try {
      const inserts = stagedServiceAreas.map(({ service_area_id, state, region }) => ({
        vendor_id: vendor.id,
        service_area_id,
        state,
        region,
      }));
      const { error } = await supabase
        .from('vendor_service_areas')
        .insert(inserts);
      if (error) {
        console.error('Supabase error adding service areas:', error, error?.details, error?.message);
        throw error;
      }
      setStagedServiceAreas([]);
      await fetchVendorServiceAreas();
      toast.success('Service areas added successfully');
    } catch (error: any) {
      console.error('Error adding service areas:', error, error?.details, error?.message);
      toast.error(`Failed to add service areas: ${error.message}`);
    }
  };

  const addLanguages = async (languages: { language_id: string; language: string }[]) => {
    if (!vendor || !languages.length) return;

    try {
      const inserts = languages.map(({ language_id }) => ({
        vendor_id: vendor.id,
        language_id,
      }));
      console.log('Inserting languages:', { vendor_id: vendor.id, inserts });
      const { error } = await supabase
        .from('vendor_languages')
        .insert(inserts);
      if (error) {
        console.error('Insert error details:', { vendor_id: vendor.id, error });
        throw error;
      }
      setStagedLanguages([]);
      setSelectedLanguages([]);
      await fetchVendorLanguages();
      toast.success('Languages added successfully');
    } catch (error: any) {
      console.error('Error adding languages:', error, error?.details, error?.message);
      toast.error(`Failed to add languages: ${error.message}`);
    }
  };

  const handleAddServiceAreas = () => {
    const newAreas = selectedRegions.map(r => {
      const serviceArea = serviceAreaOptions.find(option => option.id === r.value);
      if (!serviceArea) {
        console.warn(`No service area found for id: ${r.value}`);
        return null;
      }
      return {
        service_area_id: r.value,
        state: serviceArea.state || 'N/A',
        region: serviceArea.region,
      };
    }).filter((area): area is { service_area_id: string; state: string; region: string } => area !== null);

    const uniqueAreas = newAreas.filter(
      (newArea) =>
        !vendorServiceAreas.some(
          (area) => area.service_area_id === newArea.service_area_id
        )
    );

    setStagedServiceAreas(uniqueAreas);
    addServiceAreas();
  };

  const handleAddLanguages = async () => {
    const newLanguages = stagedLanguages
      .filter(
        (lang) => !vendorLanguages.some((vLang) => vLang.language_id === lang.language_id)
      )
      .map((lang) => ({
        language_id: lang.language_id,
        language: lang.language,
      }));

    if (!newLanguages.length) {
      toast.error('All selected languages are already added.');
      return;
    }

    // Insert new languages into languages table if they don't exist
    for (const lang of newLanguages) {
      if (!languageOptions.some((option) => option.id === lang.language_id)) {
        try {
          const { data, error } = await supabase
            .from('languages')
            .insert({ language: lang.language })
            .select('id, language')
            .single();
          if (error) throw error;
          setLanguageOptions((prev) => [...prev, { id: data.id, language: data.language }]);
          lang.language_id = data.id; // Update language_id for new language
        } catch (error: any) {
          console.error('Error adding new language to languages table:', error, error?.details, error?.message);
          toast.error(`Failed to add language "${lang.language}": ${error.message}`);
          return;
        }
      }
    }

    await addLanguages(newLanguages);
  };

  const removeServiceArea = async (serviceAreaId: string) => {
    if (!window.confirm('Are you sure you want to remove this service area?')) return;

    try {
      const { error } = await supabase
        .from('vendor_service_areas')
        .delete()
        .eq('id', serviceAreaId);
      if (error) {
        console.error('Supabase error removing service area:', error, error?.details, error?.message);
        throw error;
      }
      await fetchVendorServiceAreas();
      toast.success('Service area removed successfully');
    } catch (error: any) {
      console.error('Error removing service area:', error, error?.details, error?.message);
      toast.error('Failed to remove service area');
    }
  };

  const removeLanguage = async (languageId: string) => {
    if (!window.confirm('Are you sure you want to remove this language?')) return;

    try {
      const { error } = await supabase
        .from('vendor_languages')
        .delete()
        .eq('id', languageId);
      if (error) {
        console.error('Supabase error removing language:', error, error?.details, error?.message);
        throw error;
      }
      await fetchVendorLanguages();
      toast.success('Language removed successfully');
    } catch (error: any) {
      console.error('Error removing language:', error, error?.details, error?.message);
      toast.error('Failed to remove language');
    }
  };

  const handleSaveField = async (field: string) => {
    if (!vendor) return;

    setLoading(true);
    try {
      const updateData: Partial<Vendor> = {};
      switch (field) {
        case 'photo':
          updateData.profile_photo = formData.profile_photo.trim() || null;
          break;
        case 'phone':
          updateData.phone = formData.phone.trim() || null;
          break;
        case 'stripe':
          updateData.stripe_account_id = formData.stripe_account_id.trim() || null;
          break;
        case 'profile':
          updateData.profile = formData.profile.trim() || null;
          break;
        case 'specialties':
          updateData.specialties = formData.specialties
            ? formData.specialties.split(',').map(specialty => specialty.trim()).filter(specialty => specialty.length > 0)
            : [];
          break;
        default:
          return;
      }

      const { data, error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendor.id)
        .select();

      if (error) {
        console.error('Supabase error updating vendor:', error, error?.details, error?.message);
        if (error.code === 'PGRST116') {
          toast.error(`No vendor found with id: ${vendor.id}. Please refresh the page.`);
        } else {
          throw error;
        }
      } else if (data && data.length > 0) {
        setVendor(prev => prev ? { ...prev, ...updateData } : null);
        toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
      } else {
        console.warn('No rows updated or returned for id:', vendor.id);
        toast.error('Update failed: No rows affected.');
      }
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error, error?.details, error?.message);
      toast.error(`Failed to update ${field}`);
    } finally {
      setLoading(false);
      setEditMode(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !newService.service_type.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_services')
        .insert({
          ...newService,
          vendor_id: vendor.id,
          id: crypto.randomUUID(),
        })
        .select();

      if (error) {
        console.error('Supabase error adding service:', error, error?.details, error?.message);
        throw error;
      }

      setVendor(prev => prev ? {
        ...prev,
        vendor_services: [...(prev.vendor_services || []), data[0]],
      } : null);
      setNewService({
        id: '',
        vendor_id: vendor.id || '',
        service_type: '',
        is_active: true,
        package_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      toast.success('Service added successfully!');
    } catch (error: any) {
      console.error('Error adding service:', error, error?.details, error?.message);
      toast.error('Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  const handleAddServicePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !newServicePackage.service_package_id.trim() || !newServicePackage.service_type.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_service_packages')
        .insert({
          ...newServicePackage,
          vendor_id: vendor.id,
          id: crypto.randomUUID(),
        })
        .select(`
          id, vendor_id, service_package_id, service_type, status, created_at, updated_at,
          service_packages (
            id, service_type, name, description, price, features, coverage, hour_amount, event_type, status, created_at, updated_at
          )
        `);

      if (error) {
        console.error('Supabase error adding service package:', error, error?.details, error?.message);
        throw error;
      }

      if (data && data.length > 0) {
        setVendor(prev => prev ? {
          ...prev,
          vendor_service_packages: [...(prev.vendor_service_packages || []), data[0]],
        } : null);
        setNewServicePackage({
          id: '',
          vendor_id: id || '',
          service_package_id: '',
          service_type: '',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        toast.success('Service package added successfully!');
      } else {
        console.warn('No data returned from service package insert:', data);
        toast.error('Failed to add service package: No data returned.');
      }
    } catch (error: any) {
      console.error('Error adding service package:', error, error?.details, error?.message);
      toast.error(`Failed to add service package: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (!vendor || !newReview.couple_id) return;

    setAddingReview(true);
    try {
      const { data, error } = await supabase
        .from('vendor_reviews')
        .insert({
          vendor_id: vendor.id,
          couple_id: newReview.couple_id,
          communication_rating: newReview.communication_rating,
          experience_rating: newReview.experience_rating,
          quality_rating: newReview.quality_rating,
          overall_rating: newReview.overall_rating,
          feedback: newReview.feedback.trim() || null,
        })
        .select();

      if (error) {
        console.error('Supabase error adding review:', error, error?.details, error?.message);
        throw error;
      }

      if (data && data.length > 0) {
        setVendor(prev => prev ? {
          ...prev,
          vendor_reviews: [...(prev.vendor_reviews || []), data[0]],
        } : null);
      } else {
        console.warn('No data returned from insert, refreshing vendor data');
        fetchVendor();
      }

      setNewReview({
        communication_rating: 5,
        experience_rating: 5,
        quality_rating: 5,
        overall_rating: 5,
        feedback: '',
        couple_id: null,
      });
      toast.success('Review added successfully!');
    } catch (error: any) {
      console.error('Error adding review:', error, error?.details, error?.message);
      toast.error(`Failed to add review: ${error.message}`);
    } finally {
      setAddingReview(false);
    }
  };

  const handleResetPassword = async () => {
    if (!vendor?.user_id || !vendorEmail || !isValidEmail(vendorEmail)) {
      toast.error('Invalid or missing email address for this vendor.');
      return;
    }
    try {
      const response = await supabase.functions.invoke('send-email', {
        body: { user_id: vendorEmail, type: 'reset' },
      });
      if (response.error) {
        console.error('Supabase error sending password reset:', response.error, response.error?.details, response.error?.message);
        throw response.error;
      }
      toast.success('Password reset email sent! Check your inbox or spam folder.');
    } catch (error: any) {
      console.error('Error sending password reset:', error, error?.details, error?.message);
      toast.error(`Failed to send password reset email: ${error.message}`);
    }
  };

  const handleSendLoginEmail = async () => {
    if (!vendor?.user_id || !vendorEmail || !isValidEmail(vendorEmail)) {
      toast.error('Invalid or missing email address for this vendor.');
      return;
    }
    try {
      const response = await supabase.functions.invoke('send-email', {
        body: { user_id: vendorEmail, type: 'login' },
      });
      if (response.error) {
        console.error('Supabase error sending login email:', response.error, response.error?.details, response.error?.message);
        throw response.error;
      }
      toast.success('Login email sent! Check your inbox or spam folder.');
    } catch (error: any) {
      console.error('Error sending login email:', error, error?.details, error?.message);
      toast.error(`Failed to send login email: ${error.message}`);
    }
  };

  const handleUpdatePackageStatus = async (packageId: string, newStatus: string) => {
    setUpdatingPackage(packageId);
    try {
      const { error } = await supabase
        .from('vendor_service_packages')
        .update({ status: newStatus })
        .eq('id', packageId);

      if (error) {
        console.error('Supabase error updating package status:', error, error?.details, error?.message);
        throw error;
      }

      setVendor(prev => prev ? ({
        ...prev,
        vendor_service_packages: prev.vendor_service_packages?.map(pkg =>
          pkg.id === packageId ? { ...pkg, status: newStatus } : pkg
        ),
      }) : null);
      toast.success(`Package status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating package status:', error, error?.details, error?.message);
      toast.error('Failed to update package status');
    } finally {
      setUpdatingPackage(null);
    }
  };

  const handleToggleService = async (serviceId: string, isActive: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_services')
        .update({
          is_active: true,
          package_status: 'approved',
        })
        .eq('id', serviceId)
        .select();

      if (error) {
        console.error('Supabase error toggling service:', error, error?.details, error?.message);
        throw error;
      }

      setVendor(prev => prev ? {
        ...prev,
        vendor_services: prev.vendor_services?.map(service =>
          service.id === serviceId ? { ...service, is_active: true, package_status: 'approved' } : service
        ),
      } : null);
      toast.success('Service activated successfully!');
    } catch (error: any) {
      console.error('Error toggling service:', error, error?.details, error?.message);
      toast.error('Failed to toggle service');
    } finally {
      setLoading(false);
    }
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

  const renderStars = (rating: number, interactive: boolean = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const fillLevel = Math.min(1, Math.max(0, rating - (star - 1)));
          return (
            <button
              key={star}
              type="button"
              onClick={() => interactive && onRatingChange && onRatingChange(star)}
              className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
              disabled={!interactive}
            >
              <Star
                className={`h-5 w-5 ${fillLevel > 0 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                style={{ clipPath: `inset(0 ${100 - fillLevel * 100}% 0 0)` }}
              />
            </button>
          );
        })}
      </div>
    );
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

  // Simple email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const regionOptions = serviceAreaOptions
    .filter(option => option.region && !vendorServiceAreas.some(area => area.service_area_id === option.id))
    .map(option => ({ value: option.id, label: option.region }));

  const languageSelectOptions = languageOptions
    .filter(
      (option) => !vendorLanguages.some((vLang) => vLang.language_id === option.id)
    )
    .map((option) => ({
      value: option.id,
      label: option.language,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!vendor) return null;

  const activeServices = vendor.vendor_services || [];
  const vendorServicePackages = vendor.vendor_service_packages || [];
  const reviews = vendor.vendor_reviews || [];
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.overall_rating, 0) / reviews.length
    : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Building2 className="h-8 w-8 text-blue-600 mr-3" />
          {vendor.name}
          {vendor.rating !== null && vendor.rating !== undefined && (
            <span className="ml-4 text-lg">
              Rating: {vendor.rating.toFixed(2)}
              {renderStars(vendor.rating)}
            </span>
          )}
        </h1>
        <div className="space-x-2">
          <button
            onClick={handleResetPassword}
            className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            disabled={!vendor.user_id || !vendorEmail || !isValidEmail(vendorEmail)}
          >
            <Key className="h-4 w-4 mr-1" />
            Reset Password
          </button>
          <button
            onClick={handleSendLoginEmail}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={!vendor.user_id || !vendorEmail || !isValidEmail(vendorEmail)}
          >
            <Mail className="h-4 w-4 mr-1" />
            Send Login Email
          </button>
          <button
            onClick={() => navigate('/dashboard/vendors')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Vendors
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="h-5 w-5 text-blue-600 mr-2" />
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1">
            <label className="text-sm font-medium text-gray-500 block mb-2">Photo</label>
            {editMode.photo ? (
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
                  value={formData.profile_photo}
                  onChange={(e) => setFormData({ ...formData, profile_photo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                  placeholder="Enter photo URL"
                />
                <button
                  onClick={() => handleSaveField('photo')}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, photo: false }))}
                  className="mt-2 ml-2 inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                {vendor.profile_photo && (
                  <img
                    src={vendor.profile_photo}
                    alt={`${vendor.name}'s profile`}
                    className="w-32 h-32 object-cover rounded-full mt-2"
                  />
                )}
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, photo: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Photo
                </button>
              </div>
            )}
          </div>
          <div className="col-span-3 space-y-3">
            {vendor.user_id && (
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center">
                  Email
                </label>
                <p className="text-sm text-gray-900">{vendorEmail || 'Loading email...'}</p>
              </div>
            )}
            <div>
              {editMode.phone ? (
                <>
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(555) 123-4567"
                  />
                  <button
                    onClick={() => handleSaveField('phone')}
                    className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, phone: false }))}
                    className="mt-2 ml-2 inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </>
              ) : vendor.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Phone
                  </label>
                  <p className="text-sm text-gray-900">{vendor.phone}</p>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, phone: true }))}
                    className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </div>
              )}
            </div>
            <div>
              {editMode.stripe ? (
                <>
                  <label htmlFor="stripe_account_id" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Stripe Account ID
                  </label>
                  <input
                    type="text"
                    value={formData.stripe_account_id}
                    onChange={(e) => setFormData({ ...formData, stripe_account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="acct_1234567890"
                  />
                  <button
                    onClick={() => handleSaveField('stripe')}
                    className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, stripe: false }))}
                    className="mt-2 ml-2 inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </>
              ) : vendor.stripe_account_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Stripe Account ID
                  </label>
                  <p className="text-sm text-gray-900 font-mono">{vendor.stripe_account_id}</p>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, stripe: true }))}
                    className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Languages className="h-4 w-4 mr-1" />
                Languages
              </label>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Select or Add Languages
                  </label>
                  <CreatableSelect
                    isMulti
                    options={languageSelectOptions}
                    value={selectedLanguages}
                    onChange={(selected) => {
                      setSelectedLanguages(selected);
                      setStagedLanguages(
                        selected.map((s) => ({
                          language_id: s.value,
                          language: s.label,
                        }))
                      );
                    }}
                    className="basic-multi-select"
                    classNamePrefix="react-select"
                    placeholder="Select or type languages..."
                    formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddLanguages}
                    disabled={!stagedLanguages.length || loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Languages
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Vendor Languages
                  </label>
                  {vendorLanguages.length > 0 ? (
                    <ul className="space-y-2">
                      {vendorLanguages
                        .sort((a, b) => a.language.localeCompare(b.language))
                        .map((lang) => (
                          <li
                            key={lang.id}
                            className="flex items-center justify-between bg-gray-100 p-2 rounded-md"
                          >
                            <span className="text-sm text-gray-600">{lang.language}</span>
                            <button
                              type="button"
                              onClick={() => removeLanguage(lang.id)}
                              className="p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200"
                              title="Remove language"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No languages selected. Add languages above.
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Select or type languages, then click "Add Languages" to save
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Description</h2>
        {editMode.profile ? (
          <div className="bg-gray-50 rounded-lg p-4">
            <textarea
              value={formData.profile}
              onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter vendor profile description..."
            />
            <button
              onClick={() => handleSaveField('profile')}
              className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </button>
            <button
              onClick={() => setEditMode(prev => ({ ...prev, profile: false }))}
              className="mt-2 ml-2 inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : vendor.profile && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{vendor.profile}</p>
            <button
              onClick={() => setEditMode(prev => ({ ...prev, profile: true }))}
              className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <MapPin className="h-5 w-5 text-blue-600 mr-2" />
          Service Areas
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Regions
            </label>
            <Select
              isMulti
              options={regionOptions}
              value={selectedRegions}
              onChange={(selected) => {
                setSelectedRegions(selected);
                setStagedServiceAreas(
                  selected.map((r) => {
                    const serviceArea = serviceAreaOptions.find(option => option.id === r.value);
                    if (!serviceArea) {
                      console.warn(`No service area found for id: ${r.value}`);
                      return null;
                    }
                    return {
                      service_area_id: r.value,
                      state: serviceArea.state || 'N/A',
                      region: serviceArea.region,
                    };
                  }).filter((area): area is { service_area_id: string; state: string; region: string } => area !== null)
                );
              }}
              className="basic-multi-select"
              classNamePrefix="react-select"
              placeholder="Select regions..."
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleAddServiceAreas}
              disabled={!stagedServiceAreas.length || loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Service Areas
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Vendor Service Areas
            </label>
            {vendorServiceAreas.length > 0 ? (
              <div className="space-y-3">
                <ul className="space-y-2">
                  {vendorServiceAreas
                    .sort((a, b) => a.region.localeCompare(b.region))
                    .map((area) => (
                      <li
                        key={area.id}
                        className="flex items-center justify-between bg-gray-100 p-2 rounded-md"
                      >
                        <span className="text-sm text-gray-600">{area.region} ({area.state})</span>
                        <button
                          type="button"
                          onClick={() => removeServiceArea(area.id)}
                          className="p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200"
                          title="Remove region"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No service areas selected. Add regions above.
              </p>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Select regions, then click "Add Service Areas" to save
        </p>
      </div>

      {vendor.specialties && vendor.specialties.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Specialties</h2>
          {editMode.specialties ? (
            <div>
              <input
                type="text"
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter specialties (comma-separated)"
              />
              <button
                onClick={() => handleSaveField('specialties')}
                className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </button>
              <button
                onClick={() => setEditMode(prev => ({ ...prev, specialties: false }))}
                className="mt-2 ml-2 inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {vendor.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {specialty}
                </span>
              ))}
              <button
                onClick={() => setEditMode(prev => ({ ...prev, specialties: true }))}
                className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Services</h2>
        <div className="space-y-3">
          {activeServices.map((service) => (
            <div key={service.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">{service.service_type}</h4>
                <p className="text-sm text-blue-700">
                  Package Status: <span className="font-medium">{service.package_status}</span>
                </p>
              </div>
              <button
                onClick={() => handleToggleService(service.id, !service.is_active)}
                className={`px-3 py-1 rounded-md text-sm ${service.is_active ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
                disabled={service.is_active}
              >
                {service.is_active ? 'Active' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Package className="h-5 w-5 text-blue-600 mr-2" />
          Service Packages ({vendorServicePackages.length})
        </h2>
        {vendorServicePackages.length > 0 ? (
          <div className="space-y-4">
            {vendorServicePackages
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((vendorPackage) => {
                const servicePackage = vendorPackage.service_packages;
                if (!servicePackage) return null;

                const isExpanded = expandedPackages.has(vendorPackage.id);
                const caret = isExpanded ? '▼' : '▸';
                const packageStatus = vendorPackage.status;

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
                        <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(packageStatus)} mt-2`}>
                          {getStatusIcon(packageStatus)}
                          <span className="ml-2 capitalize">{packageStatus}</span>
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
        <form onSubmit={handleAddServicePackage} className="mt-4">
          <h3 className="text-md font-semibold text-gray-900 mb-2">Add New Service Package</h3>
          <select
            value={newServicePackage.service_package_id}
            onChange={(e) => {
              const selectedId = e.target.value;
              const selectedPackage = availableServicePackages.find(pkg => pkg.id === selectedId);
              if (selectedPackage) {
                setNewServicePackage({
                  ...newServicePackage,
                  service_package_id: selectedId,
                  service_type: selectedPackage.service_type,
                });
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
            required
          >
            <option value="">Select a Service Package</option>
            {availableServicePackages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {`${pkg.name} (${pkg.service_type} - ${pkg.event_type})`}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newServicePackage.service_type}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 bg-gray-100"
            placeholder="Service Type (set from selection)"
          />
          <button
            type="submit"
            disabled={loading || !newServicePackage.service_package_id.trim() || !newServicePackage.service_type.trim()}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add Service Package
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
          Reviews ({reviews.length})
          <button
            onClick={() => setShowAddReview(true)}
            className="ml-4 inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Review
          </button>
        </h2>
        {showAddReview && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h4 className="text-md font-medium text-green-900 mb-4">Add New Review</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">Couple</label>
                <select
                  value={newReview.couple_id || ''}
                  onChange={(e) => setNewReview({ ...newReview, couple_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select a couple</option>
                  {couples.map(couple => (
                    <option key={couple.id} value={couple.id}>{couple.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">Communication Rating</label>
                {renderStars(newReview.communication_rating, true, (rating) =>
                  setNewReview({ ...newReview, communication_rating: rating })
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">Experience Rating</label>
                {renderStars(newReview.experience_rating, true, (rating) =>
                  setNewReview({ ...newReview, experience_rating: rating })
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">Quality Rating</label>
                {renderStars(newReview.quality_rating, true, (rating) =>
                  setNewReview({ ...newReview, quality_rating: rating })
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">Overall Rating</label>
                {renderStars(newReview.overall_rating, true, (rating) =>
                  setNewReview({ ...newReview, overall_rating: rating })
                )}
              </div>
              <div>
                <label htmlFor="feedback" className="block text-sm font-medium text-green-800 mb-2">
                  Feedback (Optional)
                </label>
                <textarea
                  id="feedback"
                  rows={4}
                  value={newReview.feedback}
                  onChange={(e) => setNewReview({ ...newReview, feedback: e.target.value })}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter feedback (optional)..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddReview(false);
                    setNewReview({
                      communication_rating: 5,
                      experience_rating: 5,
                      quality_rating: 5,
                      overall_rating: 5,
                      feedback: '',
                      couple_id: null,
                    });
                  }}
                  className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddReview}
                  disabled={addingReview || !newReview.couple_id}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingReview ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {reviews.length > 0 && (
          <div className="space-y-4">
            {reviews
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((review) => (
                <div key={review.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {renderStars(review.overall_rating || 0)}
                      <span className="text-sm font-medium text-gray-900">
                        {review.overall_rating || 0}/5.0
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.couples && review.couples.name && (
                    <p className="text-gray-600 text-sm mb-1">Couple: {review.couples.name}</p>
                  )}
                  {review.communication_rating && (
                    <p className="text-gray-600 text-sm mb-1">Communication: {review.communication_rating}/5</p>
                  )}
                  {review.experience_rating && (
                    <p className="text-gray-600 text-sm mb-1">Experience: {review.experience_rating}/5</p>
                  )}
                  {review.quality_rating && (
                    <p className="text-gray-600 text-sm mb-1">Quality: {review.quality_rating}/5</p>
                  )}
                  {review.feedback && (
                    <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{review.feedback}</p>
                  )}
                  {review.vendor_response && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <h5 className="text-xs font-medium text-blue-900 mb-1">Vendor Response:</h5>
                      <p className="text-blue-800 text-xs whitespace-pre-wrap">{review.vendor_response}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/dashboard/vendors')}
        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        Back to Vendors
      </button>
    </div>
  );
}

// Simple email validation
function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
