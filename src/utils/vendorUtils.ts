import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export async function handleImageUpload(
  e: React.ChangeEvent<HTMLInputElement>,
  vendorId: string,
  setFormData: (data: any) => void,
  handleSaveField: (field: string) => Promise<void>
) {
  if (!e.target.files || e.target.files.length === 0) return;
  const file = e.target.files[0];
  const filePath = `vendor_photos/${vendorId}/${file.name}`;
  try {
    const { error: uploadError } = await supabase.storage
      .from('vendor-photos')
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage
      .from('vendor-photos')
      .getPublicUrl(filePath);
    setFormData((prev: any) => ({ ...prev, profile_photo: publicUrlData.publicUrl }));
    await handleSaveField('photo');
    toast.success('Profile photo uploaded successfully');
  } catch (error: any) {
    toast.error(`Failed to upload image: ${error.message}`);
  }
}

export async function handleDeleteVendor(vendorId: string, navigate: (path: string) => void) {
  if (!window.confirm('Are you sure you want to delete this vendor and all associated data?')) return;
  try {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendorId);
    if (error) throw error;
    toast.success('Vendor deleted successfully');
    navigate('/dashboard/vendors');
  } catch (error: any) {
    toast.error(`Failed to delete vendor: ${error.message}`);
  }
}