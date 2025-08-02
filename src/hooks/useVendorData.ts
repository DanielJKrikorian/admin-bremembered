import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Vendor, VendorService, VendorServicePackage, VendorReview, VendorGear } from '../types/types';

export function useVendorData(id?: string) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendorEmail, setVendorEmail] = useState<string | null>(null);
  const [availableServicePackages, setAvailableServicePackages] = useState<{ id: string; name: string; service_type: string; event_type: string }[]>([]);
  const [couples, setCouples] = useState<{ id: string; name: string }[]>([]);
  const [serviceAreaOptions, setServiceAreaOptions] = useState<{ id: string; region: string; state: string }[]>([]);
  const [vendorServiceAreas, setVendorServiceAreas] = useState<{ id: string; service_area_id: string; state: string; region: string }[]>([]);
  const [languageOptions, setLanguageOptions] = useState<{ id: string; language: string }[]>([]);
  const [vendorLanguages, setVendorLanguages] = useState<{ id: string; vendor_id: string; language_id: string; language: string }[]>([]);
  const [vendorGear, setVendorGear] = useState<VendorGear[]>([]);
  const [styleTagOptions, setStyleTagOptions] = useState<{ id: number; label: string; description?: string }[]>([]);
  const [vendorStyleTags, setVendorStyleTags] = useState<{ id: string; vendor_id: string; style_id: number; label: string; description?: string }[]>([]);
  const [vibeTagOptions, setVibeTagOptions] = useState<{ id: number; label: string; description?: string }[]>([]);
  const [vendorVibeTags, setVendorVibeTags] = useState<{ id: string; vendor_id: string; vibe_id: number; label: string; description?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVendorData = async () => {
    if (!id) {
      console.error('No vendor ID provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          vendor_services (*),
          vendor_reviews (*, couples (name)),
          vendor_service_packages (*, service_packages!vendor_service_packages_service_package_id_fkey (*)),
          vendor_service_areas (*, service_areas (id, region, state)),
          vendor_languages (*, languages (id, language)),
          vendor_gear (*)
        `)
        .eq('id', id)
        .single();
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      console.log('Fetched vendor data:', data);
      setVendor({ ...data, languages: data.vendor_languages?.map((lang: any) => lang.languages.language).sort() || [] });
      setVendorServiceAreas(data.vendor_service_areas?.map((area: any) => ({
        id: area.id,
        service_area_id: area.service_area_id,
        state: area.state || area.service_areas?.state || 'N/A',
        region: area.region || area.service_areas?.region || 'N/A',
      })) || []);
      setVendorLanguages(data.vendor_languages?.map((lang: any) => ({
        id: lang.id,
        vendor_id: lang.vendor_id,
        language_id: lang.language_id,
        language: lang.languages?.language || 'Unknown',
      })) || []);
      setVendorGear(data.vendor_gear || []);

      if (data.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', data.user_id)
          .single();
        if (userError) {
          console.error('User fetch error:', userError);
          throw userError;
        }
        setVendorEmail(userData.email || null);
      }
    } catch (error: any) {
      console.error('Fetch vendor error:', error.message);
      toast.error('Failed to load vendor');
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
      if (error) throw error;
      setCouples(data || []);
    } catch (error: any) {
      toast.error('Failed to load couples');
    }
  };

  const fetchAvailableServicePackages = async () => {
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('id, name, service_type, event_type');
      if (error) throw error;
      setAvailableServicePackages(data || []);
    } catch (error: any) {
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
      if (error) throw error;
      setServiceAreaOptions(data || []);
    } catch (error: any) {
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
      if (error) throw error;
      setVendorServiceAreas(data?.map((area: any) => ({
        id: area.id,
        service_area_id: area.service_area_id,
        state: area.state || area.service_areas?.state || 'N/A',
        region: area.region || area.service_areas?.region || 'N/A',
      })) || []);
    } catch (error: any) {
      toast.error('Failed to load vendor service areas');
    }
  };

  const fetchLanguageOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('languages')
        .select('id, language')
        .order('language', { ascending: true });
      if (error) throw error;
      setLanguageOptions(data || []);
    } catch (error: any) {
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
      if (error) throw error;
      setVendorLanguages(data?.map((lang: any) => ({
        id: lang.id,
        vendor_id: lang.vendor_id,
        language_id: lang.language_id,
        language: lang.languages?.language || 'Unknown',
      })) || []);
    } catch (error: any) {
      toast.error('Failed to load vendor languages');
    }
  };

  const fetchStyleTagOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('style_tags')
        .select('id, label, description')
        .order('label', { ascending: true });
      if (error) throw error;
      setStyleTagOptions(data || []);
    } catch (error: any) {
      toast.error('Failed to load style tag options');
    }
  };

  const fetchVendorStyleTags = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('vendor_style_tags')
        .select('id, vendor_id, style_id, style_tags (id, label, description)')
        .eq('vendor_id', id);
      if (error) throw error;
      setVendorStyleTags(data?.map((tag: any) => ({
        id: tag.id,
        vendor_id: tag.vendor_id,
        style_id: tag.style_id,
        label: tag.style_tags?.label || 'Unknown',
        description: tag.style_tags?.description || undefined,
      })) || []);
    } catch (error: any) {
      toast.error('Failed to load vendor style tags');
    }
  };

  const fetchVibeTagOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('vibe_tags')
        .select('id, label, description')
        .order('label', { ascending: true });
      if (error) throw error;
      setVibeTagOptions(data || []);
    } catch (error: any) {
      toast.error('Failed to load vibe tag options');
    }
  };

  const fetchVendorVibeTags = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('vendor_vibe_tags')
        .select('id, vendor_id, vibe_id, vibe_tags (id, label, description)')
        .eq('vendor_id', id);
      if (error) throw error;
      setVendorVibeTags(data?.map((tag: any) => ({
        id: tag.id,
        vendor_id: tag.vendor_id,
        vibe_id: tag.vibe_id,
        label: tag.vibe_tags?.label || 'Unknown',
        description: tag.vibe_tags?.description || undefined,
      })) || []);
    } catch (error: any) {
      toast.error('Failed to load vendor vibe tags');
    }
  };

  useEffect(() => {
    console.log('Fetching data for vendor ID:', id);
    setLoading(true);
    Promise.all([
      fetchVendorData(),
      fetchCouples(),
      fetchAvailableServicePackages(),
      fetchServiceAreaOptions(),
      fetchVendorServiceAreas(),
      fetchLanguageOptions(),
      fetchVendorLanguages(),
      fetchStyleTagOptions(),
      fetchVendorStyleTags(),
      fetchVibeTagOptions(),
      fetchVendorVibeTags()
    ]).finally(() => {
      setLoading(false);
      console.log('Data fetching complete');
    });
  }, [id]);

  const handleAddService = async (service: VendorService) => {
    if (!vendor || !service.service_type.trim()) return;
    try {
      const { data, error } = await supabase
        .from('vendor_services')
        .insert({ ...service, vendor_id: vendor.id, id: crypto.randomUUID() })
        .select();
      if (error) throw error;
      setVendor(prev => prev ? { ...prev, vendor_services: [...(prev.vendor_services || []), data[0]] } : null);
      toast.success('Service added successfully!');
    } catch (error: any) {
      toast.error('Failed to add service');
    }
  };

  const handleAddServicePackage = async (pkg: VendorServicePackage) => {
    if (!vendor || !pkg.service_package_id.trim() || !pkg.service_type.trim()) return;
    try {
      const { data, error } = await supabase
        .from('vendor_service_packages')
        .insert({ ...pkg, vendor_id: vendor.id, id: crypto.randomUUID() })
        .select('*, service_packages!vendor_service_packages_service_package_id_fkey (*)');
      if (error) throw error;
      setVendor(prev => prev ? { ...prev, vendor_service_packages: [...(prev.vendor_service_packages || []), data[0]] } : null);
      toast.success('Service package added successfully!');
    } catch (error: any) {
      toast.error('Failed to add service package');
    }
  };

  const handleAddReview = async (review: VendorReview) => {
    if (!vendor || !review.couple_id) return;
    try {
      const { data, error } = await supabase
        .from('vendor_reviews')
        .insert({ ...review, vendor_id: vendor.id })
        .select();
      if (error) throw error;
      setVendor(prev => prev ? { ...prev, vendor_reviews: [...(prev.vendor_reviews || []), data[0]] } : null);
      toast.success('Review added successfully!');
    } catch (error: any) {
      toast.error('Failed to add review');
    }
  };

  const handleUpdatePackageStatus = async (packageId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('vendor_service_packages')
        .update({ status: newStatus })
        .eq('id', packageId);
      if (error) throw error;
      setVendor(prev => prev ? {
        ...prev,
        vendor_service_packages: prev.vendor_service_packages?.map(pkg =>
          pkg.id === packageId ? { ...pkg, status: newStatus } : pkg
        )
      } : null);
      toast.success(`Package status updated to ${newStatus}`);
    } catch (error: any) {
      toast.error('Failed to update package status');
    }
  };

  const handleToggleService = async (serviceId: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('vendor_services')
        .update({ is_active: isActive, package_status: isActive ? 'approved' : 'pending' })
        .eq('id', serviceId)
        .select();
      if (error) throw error;
      setVendor(prev => prev ? {
        ...prev,
        vendor_services: prev.vendor_services?.map(service =>
          service.id === serviceId ? { ...service, is_active: isActive, package_status: isActive ? 'approved' : 'pending' } : service
        )
      } : null);
      toast.success(`Service ${isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error: any) {
      toast.error('Failed to toggle service');
    }
  };

  const handleAddServiceAreas = async (selectedRegions: { value: string; label: string }[]) => {
    if (!vendor || !selectedRegions.length) return;
    try {
      const inserts = selectedRegions.map(r => {
        const area = serviceAreaOptions.find(option => option.id === r.value);
        return { vendor_id: vendor.id, service_area_id: r.value, state: area?.state || 'N/A', region: area?.region || 'N/A' };
      });
      const { error } = await supabase.from('vendor_service_areas').insert(inserts);
      if (error) throw error;
      await fetchVendorServiceAreas();
      toast.success('Service areas added successfully');
    } catch (error: any) {
      toast.error('Failed to add service areas');
    }
  };

  const handleAddLanguages = async (languages: { value: string; label: string }[]) => {
    if (!vendor || !languages.length) return;
    try {
      for (const lang of languages) {
        if (!languageOptions.some(option => option.id === lang.value)) {
          const { data, error } = await supabase
            .from('languages')
            .insert({ language: lang.label })
            .select('id, language')
            .single();
          if (error) throw error;
          setLanguageOptions(prev => [...prev, data]);
          lang.value = data.id;
        }
      }
      const inserts = languages.map(lang => ({ vendor_id: vendor.id, language_id: lang.value }));
      const { error } = await supabase.from('vendor_languages').insert(inserts);
      if (error) throw error;
      await fetchVendorLanguages();
      toast.success('Languages added successfully');
    } catch (error: any) {
      toast.error('Failed to add languages');
    }
  };

  const removeLanguage = async (languageId: string) => {
    if (!window.confirm('Are you sure you want to remove this language?')) return;
    try {
      const { error } = await supabase
        .from('vendor_languages')
        .delete()
        .eq('id', languageId);
      if (error) throw error;
      await fetchVendorLanguages();
      toast.success('Language removed successfully');
    } catch (error: any) {
      toast.error('Failed to remove language');
    }
  };

  const handleAddGear = async (gear: VendorGear) => {
    if (!vendor || !gear.gear_type.trim() || !gear.brand.trim() || !gear.model.trim()) return;
    try {
      const { data, error } = await supabase
        .from('vendor_gear')
        .insert({ ...gear, vendor_id: vendor.id, id: crypto.randomUUID() })
        .select();
      if (error) throw error;
      setVendorGear(prev => [...prev, data[0]]);
      toast.success('Gear added successfully!');
    } catch (error: any) {
      toast.error('Failed to add gear');
    }
  };

  const removeGear = async (gearId: string) => {
    if (!window.confirm('Are you sure you want to remove this gear?')) return;
    try {
      const { error } = await supabase
        .from('vendor_gear')
        .delete()
        .eq('id', gearId);
      if (error) throw error;
      setVendorGear(prev => prev.filter(gear => gear.id !== gearId));
      toast.success('Gear removed successfully');
    } catch (error: any) {
      toast.error('Failed to remove gear');
    }
  };

  const handleUpdateGearRating = async (gearId: string, newRating: 'semi-pro' | 'pro') => {
    try {
      const { error } = await supabase
        .from('vendor_gear')
        .update({ gear_rating: newRating })
        .eq('id', gearId);
      if (error) throw error;
      setVendorGear(prev => prev.map(gear =>
        gear.id === gearId ? { ...gear, gear_rating: newRating } : gear
      ));
      toast.success(`Gear rating updated to ${newRating}`);
    } catch (error: any) {
      toast.error('Failed to update gear rating');
    }
  };

  const handleAddStyleTags = async (tags: { value: number; label: string }[]) => {
    if (!vendor || !tags.length) return;
    try {
      const inserts = tags.map(tag => ({ vendor_id: vendor.id, style_id: tag.value }));
      const { error } = await supabase.from('vendor_style_tags').insert(inserts);
      if (error) throw error;
      await fetchVendorStyleTags();
      toast.success('Style tags added successfully');
    } catch (error: any) {
      toast.error('Failed to add style tags');
    }
  };

  const removeStyleTag = async (tagId: string) => {
    if (!window.confirm('Are you sure you want to remove this style tag?')) return;
    try {
      const { error } = await supabase
        .from('vendor_style_tags')
        .delete()
        .eq('id', tagId);
      if (error) throw error;
      await fetchVendorStyleTags();
      toast.success('Style tag removed successfully');
    } catch (error: any) {
      toast.error('Failed to remove style tag');
    }
  };

  const handleAddVibeTags = async (tags: { value: number; label: string }[]) => {
    if (!vendor || !tags.length) return;
    try {
      const inserts = tags.map(tag => ({ vendor_id: vendor.id, vibe_id: tag.value }));
      const { error } = await supabase.from('vendor_vibe_tags').insert(inserts);
      if (error) throw error;
      await fetchVendorVibeTags();
      toast.success('Vibe tags added successfully');
    } catch (error: any) {
      toast.error('Failed to add vibe tags');
    }
  };

  const removeVibeTag = async (tagId: string) => {
    if (!window.confirm('Are you sure you want to remove this vibe tag?')) return;
    try {
      const { error } = await supabase
        .from('vendor_vibe_tags')
        .delete()
        .eq('id', tagId);
      if (error) throw error;
      await fetchVendorVibeTags();
      toast.success('Vibe tag removed successfully');
    } catch (error: any) {
      toast.error('Failed to remove vibe tag');
    }
  };

  const removeServiceArea = async (areaId: string) => {
    if (!window.confirm('Are you sure you want to remove this service area?')) return;
    try {
      const { error } = await supabase
        .from('vendor_service_areas')
        .delete()
        .eq('id', areaId);
      if (error) throw error;
      await fetchVendorServiceAreas();
      toast.success('Service area removed successfully');
    } catch (error: any) {
      toast.error('Failed to remove service area');
    }
  };

  return {
    vendor, vendorEmail, availableServicePackages, couples, serviceAreaOptions, vendorServiceAreas,
    vendorLanguages, languageOptions, vendorGear, styleTagOptions, vendorStyleTags, vibeTagOptions,
    vendorVibeTags, loading, setVendor, fetchVendorData, handleAddService, handleAddServicePackage,
    handleAddReview, handleUpdatePackageStatus, handleToggleService, handleAddServiceAreas,
    handleAddLanguages, removeLanguage, handleAddGear, removeGear, handleUpdateGearRating,
    handleAddStyleTags, removeStyleTag, handleAddVibeTags, removeVibeTag, removeServiceArea
  };
}