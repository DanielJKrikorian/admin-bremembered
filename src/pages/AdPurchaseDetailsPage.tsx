import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, Mail, Phone, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface AdPurchase {
  id: string;
  sponsor_name: string;
  phone: string;
  email: string;
  placement_type: string;
  billing_cycle: string;
  total_price: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  selected_pages: any; // JSON object
  asset_url: string | null;
  logo_url: string | null;
  redirect_url: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export default function AdPurchaseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<AdPurchase | null>(null);
  const [adImageUrl, setAdImageUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState({
    adImage: true,
    logo: true,
  });
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [noteTimestamp, setNoteTimestamp] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string>('');
  const [reviewedBy, setReviewedBy] = useState<string>('');
  const [reviewTimestamp, setReviewTimestamp] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [isEditingReview, setIsEditingReview] = useState<boolean>(false);
  const currentDate = new Date('2025-09-14'); // Current date for status calculation

  useEffect(() => {
    if (!id) {
      toast.error('Ad purchase ID is undefined');
      navigate('/dashboard/ad-purchases');
      return;
    }
    fetchPurchaseDetails();
  }, [id, navigate]);

  useEffect(() => {
    // Fallback to hide placeholders after 5 seconds if onLoad doesn't fire
    const timeout = setTimeout(() => {
      setImageLoading((prev) => ({
        adImage: false,
        logo: false,
      }));
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  const fetchPurchaseDetails = async () => {
    try {
      setLoading(true);
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase is not configured');
      }

      // Fetch the ad purchase
      const { data, error } = await supabase
        .from('ads')
        .select('id, sponsor_name, phone, email, placement_type, billing_cycle, total_price, start_date, end_date, status, created_at, updated_at, selected_pages, asset_url, logo_url, redirect_url, admin_notes, reviewed_at, reviewed_by')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Log raw data from database
      console.log('Raw ad purchase data:', {
        id: data.id,
        asset_url: data.asset_url,
        logo_url: data.logo_url,
      });

      // Fetch URLs for asset_url and logo_url
      let adImageUrl: string | null = null;
      let logoUrl: string | null = null;
      const initialImageLoading = { adImage: true, logo: true };

      // Helper function to get public or signed URL
      const getStorageUrl = async (filePath: string | null, folder: string): Promise<string | null> => {
        if (!filePath) {
          console.log(`No filePath provided for ${folder}`);
          return null;
        }

        console.log(`Processing filePath for ${folder}:`, filePath);

        // If filePath is a full public URL, use it directly
        if (filePath.startsWith('https://') && filePath.includes('ads')) {
          console.log(`Using stored URL for ${folder}:`, filePath);
          return filePath;
        }

        // Construct relative path for ads bucket
        const relativePath = filePath.includes(folder)
          ? filePath
          : `${folder}/${id}/${filePath.split('/').pop() || filePath}`;
        console.log(`Constructed relative path for ${folder}:`, relativePath);

        // Try public URL
        const { data: publicData } = supabase.storage.from('ads').getPublicUrl(relativePath);
        if (publicData.publicUrl) {
          console.log(`Public URL for ${folder}:`, publicData.publicUrl);
          return publicData.publicUrl;
        }

        // Fallback to signed URL
        console.log(`Public URL failed, attempting signed URL for ${folder}`);
        const { data: signedData, error: signedError } = await supabase.storage
          .from('ads')
          .createSignedUrl(relativePath, 3600); // URL valid for 1 hour
        if (signedError) {
          console.error(`Error fetching signed URL for ${folder}:`, signedError);
          return null;
        }
        console.log(`Signed URL for ${folder}:`, signedData.signedUrl);
        return signedData.signedUrl;
      };

      // Fetch URLs for ad image and logo
      adImageUrl = await getStorageUrl(data.asset_url, 'ad-images');
      logoUrl = await getStorageUrl(data.logo_url, 'logos');

      setPurchase(data);
      setAdImageUrl(adImageUrl);
      setLogoUrl(logoUrl);
      setImageLoading(initialImageLoading);
      setAdminNotes('');
      setNoteTimestamp(data.admin_notes ? data.updated_at : null);
      setReviewedAt('');
      setReviewedBy('');
      setReviewTimestamp(data.reviewed_at && data.reviewed_by ? data.updated_at : null);
      setIsEditingNotes(!!data.admin_notes);
      setIsEditingReview(!!data.reviewed_at && !!data.reviewed_by);
    } catch (error: any) {
      console.error('Error fetching ad purchase details:', error);
      toast.error('Failed to load ad purchase details');
      navigate('/dashboard/ad-purchases');
    } finally {
      setLoading(false);
    }
  };

  const updatePurchaseStatus = async (newStatus: string) => {
    try {
      if (!purchase || !supabase) return;

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || null;

      const { error } = await supabase
        .from('ads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
        })
        .eq('id', purchase.id);

      if (error) throw error;

      setPurchase((prev) =>
        prev
          ? { ...prev, status: newStatus, updated_at: new Date().toISOString(), reviewed_at: new Date().toISOString(), reviewed_by: userId }
          : null
      );
      setReviewTimestamp(new Date().toISOString());
      setIsEditingReview(true);
      toast.success('Status updated successfully');
    } catch (error: any) {
      console.error('Error updating purchase status:', error);
      toast.error('Failed to update status');
    }
  };

  const saveAdminNotes = async () => {
    try {
      if (!purchase || !supabase) return;
      if (adminNotes.length > 5000) {
        toast.error('Admin notes cannot exceed 5000 characters');
        return;
      }

      const currentTime = new Date().toISOString();
      const { error } = await supabase
        .from('ads')
        .update({
          admin_notes: adminNotes || null,
          updated_at: currentTime,
        })
        .eq('id', purchase.id);

      if (error) throw error;

      setPurchase((prev) =>
        prev
          ? { ...prev, admin_notes: adminNotes || null, updated_at: currentTime }
          : null
      );
      setNoteTimestamp(currentTime);
      setAdminNotes('');
      setIsEditingNotes(true);
      toast.success('Admin notes saved successfully');
    } catch (error: any) {
      console.error('Error saving admin notes:', error);
      toast.error('Failed to save admin notes');
    }
  };

  const saveReviewDetails = async () => {
    try {
      if (!purchase || !supabase) return;
      if (!reviewedAt) {
        toast.error('Please select a review date and time');
        return;
      }
      if (!reviewedBy) {
        toast.error('Please enter a reviewer name');
        return;
      }
      if (reviewedBy.length > 100) {
        toast.error('Reviewer name cannot exceed 100 characters');
        return;
      }

      const parsedReviewedAt = new Date(reviewedAt).toISOString();
      if (isNaN(new Date(parsedReviewedAt).getTime())) {
        toast.error('Invalid review date and time');
        return;
      }

      const currentTime = new Date().toISOString();
      const { error } = await supabase
        .from('ads')
        .update({
          reviewed_at: parsedReviewedAt,
          reviewed_by: reviewedBy,
          updated_at: currentTime,
        })
        .eq('id', purchase.id);

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      setPurchase((prev) =>
        prev
          ? { ...prev, reviewed_at: parsedReviewedAt, reviewed_by: reviewedBy, updated_at: currentTime }
          : null
      );
      setReviewTimestamp(currentTime);
      setReviewedAt('');
      setReviewedBy('');
      setIsEditingReview(true);
      toast.success('Review details saved successfully');
    } catch (error: any) {
      console.error('Error saving review details:', error);
      toast.error(`Failed to save review details: ${error.message || 'Unknown error'}`);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading || !purchase) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Briefcase className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Ad Purchase: {purchase.sponsor_name}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span
            className={`text-2xl font-bold px-4 py-2 rounded-full ${getStatusStyles(purchase.status)}`}
          >
            {purchase.status.toUpperCase()}
          </span>
          <button
            onClick={() => navigate('/dashboard/ad-purchases')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Purchases
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0 w-full md:w-1/3">
            {logoUrl ? (
              imageLoading.logo ? (
                <div className="w-48 h-48 bg-gray-200 rounded-full animate-pulse mx-auto"></div>
              ) : (
                <img
                  src={logoUrl}
                  alt={`${purchase.sponsor_name}'s logo`}
                  className="w-48 h-48 object-contain rounded-full mx-auto"
                  loading="lazy"
                  onLoad={() => setImageLoading((prev) => ({ ...prev, logo: false }))}
                  onError={(e) => {
                    console.error('Logo failed to load:', logoUrl, 'Error:', e.currentTarget.error);
                    e.currentTarget.src = '/fallback-image.png';
                    setImageLoading((prev) => ({ ...prev, logo: false }));
                  }}
                />
              )
            ) : (
              <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                <ImageIcon className="h-16 w-16 text-gray-400" />
              </div>
            )}
            <div className="mt-4 text-center">
              <h2 className="text-xl font-semibold text-gray-900">{purchase.sponsor_name}</h2>
              <p className="text-sm text-gray-600">Ad Sponsor</p>
            </div>
          </div>
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{purchase.email}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-sm text-gray-900">{purchase.phone}</p>
                </div>
              </div>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Ad Type</label>
                  <p className="text-sm text-gray-900">{purchase.placement_type}</p>
                </div>
              </div>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing Cycle</label>
                  <p className="text-sm text-gray-900">{purchase.billing_cycle.charAt(0).toUpperCase() + purchase.billing_cycle.slice(1)}</p>
                </div>
              </div>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Price</label>
                  <p className="text-sm text-gray-900">${purchase.total_price.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Start Date</label>
                  <p className="text-sm text-gray-900">{new Date(purchase.start_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">End Date</label>
                  <p className="text-sm text-gray-900">{new Date(purchase.end_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Redirect URL</label>
                  <p className="text-sm text-gray-900">
                    {purchase.redirect_url ? (
                      <a href={purchase.redirect_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {purchase.redirect_url}
                      </a>
                    ) : 'None'}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Selected Pages/Services</label>
                  <p className="text-sm text-gray-900">
                    {purchase.placement_type === 'Email Sponsorship'
                      ? purchase.selected_pages.selectedEmails?.join(', ') || 'None'
                      : purchase.placement_type === 'Photo Ad' || purchase.placement_type === 'Featured Photo Ad'
                      ? `${purchase.selected_pages.numPhotos} Photo${purchase.selected_pages.numPhotos > 1 ? 's' : ''} on Service ID ${purchase.selected_pages.selectedService || 'None'}`
                      : [
                          ...(purchase.selected_pages.selectedServices?.map((id: number) => `Service ID ${id}`) || []),
                          ...(purchase.selected_pages.selectedVendors?.map((id: number) => `Vendor ID ${id}`) || []),
                          ...(purchase.selected_pages.selectedMains || []),
                        ].join(', ') || 'None'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ImageIcon className="h-5 w-5 text-gray-500 mr-2" />
          Ad Images
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Ad Image</label>
            {adImageUrl ? (
              imageLoading.adImage ? (
                <div className="w-48 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
              ) : (
                <a href={adImageUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={adImageUrl}
                    alt="Ad Image"
                    className="w-48 h-32 object-cover rounded-lg mt-2"
                    loading="lazy"
                    onLoad={() => setImageLoading((prev) => ({ ...prev, adImage: false }))}
                    onError={(e) => {
                      console.error('Ad image failed to load:', adImageUrl, 'Error:', e.currentTarget.error);
                      e.currentTarget.src = '/fallback-image.png';
                      setImageLoading((prev) => ({ ...prev, adImage: false }));
                    }}
                  />
                </a>
              )
            ) : (
              <p className="text-sm text-gray-900">None</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Logo</label>
            {logoUrl ? (
              imageLoading.logo ? (
                <div className="w-48 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
              ) : (
                <a href={logoUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-48 h-32 object-contain rounded-lg mt-2"
                    loading="lazy"
                    onLoad={() => setImageLoading((prev) => ({ ...prev, logo: false }))}
                    onError={(e) => {
                      console.error('Logo failed to load:', logoUrl, 'Error:', e.currentTarget.error);
                      e.currentTarget.src = '/fallback-image.png';
                      setImageLoading((prev) => ({ ...prev, logo: false }));
                    }}
                  />
                </a>
              )
            ) : (
              <p className="text-sm text-gray-900">None</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 text-gray-500 mr-2" />
          Admin Notes
        </h2>
        {isEditingNotes ? (
          <>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about this ad purchase..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-2 text-right">
              <span className="text-sm text-gray-500">{adminNotes.length}/5000 characters</span>
            </div>
          </>
        ) : null}
        {purchase.admin_notes && noteTimestamp && (
          <div className="mt-4">
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{purchase.admin_notes}</p>
            <p className="text-sm text-gray-500 mt-1">
              Saved on: {new Date(noteTimestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })}
            </p>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => (isEditingNotes ? saveAdminNotes() : setIsEditingNotes(true))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isEditingNotes ? 'Save Notes' : 'Edit Notes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 text-gray-500 mr-2" />
          Review Details
        </h2>
        {isEditingReview ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Reviewed At</label>
              <input
                type="datetime-local"
                value={reviewedAt ? new Date(reviewedAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => setReviewedAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Reviewed By</label>
              <input
                type="text"
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
                placeholder="Enter reviewer name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ) : null}
        {(purchase.reviewed_at || purchase.reviewed_by) && reviewTimestamp && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Reviewed At</label>
              <p className="text-sm text-gray-900">
                {purchase.reviewed_at ? new Date(purchase.reviewed_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'Not Reviewed'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Reviewed By</label>
              <p className="text-sm text-gray-900">{purchase.reviewed_by || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">
                Saved on: {new Date(reviewTimestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })}
              </p>
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => (isEditingReview ? saveReviewDetails() : setIsEditingReview(true))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isEditingReview ? 'Save Review Details' : 'Edit Review Details'}
          </button>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={() => updatePurchaseStatus('Cancelled')}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          disabled={purchase.status === 'Cancelled'}
        >
          Cancel
        </button>
        <button
          onClick={() => updatePurchaseStatus('Active')}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          disabled={purchase.status === 'Active'}
        >
          Activate
        </button>
      </div>
    </div>
  );
}