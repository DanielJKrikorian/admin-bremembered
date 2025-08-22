import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, User, Mail, Phone, MapPin, Award, Camera, Link, FileText } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

interface VendorApplication {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: { street: string; city: string; state: string; zip: string } | null;
  service_locations: string[];
  services_applying_for: string[];
  gear: { year: string; brand: string; model: string; condition: string; gear_type: string }[];
  profile_photo: string | null;
  drivers_license_front: string | null;
  drivers_license_back: string | null;
  description: string | null;
  work_links: string[];
  work_samples: string[];
  status: string;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ServiceArea {
  id: string;
  state: string;
  region: string | null;
}

export default function VendorApplicationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [licenseFrontUrl, setLicenseFrontUrl] = useState<string | null>(null);
  const [licenseBackUrl, setLicenseBackUrl] = useState<string | null>(null);
  const [workSampleUrls, setWorkSampleUrls] = useState<string[]>([]);
  const [serviceAreaNames, setServiceAreaNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState({
    profile: true,
    licenseFront: true,
    licenseBack: true,
    workSamples: [] as boolean[],
  });
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [noteTimestamp, setNoteTimestamp] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string>('');
  const [reviewedBy, setReviewedBy] = useState<string>('');
  const [reviewTimestamp, setReviewTimestamp] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [isEditingReview, setIsEditingReview] = useState<boolean>(false);

  useEffect(() => {
    if (!id) {
      toast.error('Application ID is undefined');
      navigate('/dashboard/vendor-application');
      return;
    }
    fetchApplicationDetails();
  }, [id, navigate]);

  useEffect(() => {
    // Fallback to hide placeholders after 5 seconds if onLoad doesn't fire
    const timeout = setTimeout(() => {
      setImageLoading((prev) => ({
        profile: false,
        licenseFront: false,
        licenseBack: false,
        workSamples: prev.workSamples.map(() => false),
      }));
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase is not configured');
      }

      // Fetch the application
      const { data, error } = await supabase
        .from('vendor_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Log raw data from database
      console.log('Raw vendor_applications data:', {
        id: data.id,
        profile_photo: data.profile_photo,
        drivers_license_front: data.drivers_license_front,
        drivers_license_back: data.drivers_license_back,
        work_samples: data.work_samples,
      });

      // Fetch URLs for profile_photo, drivers_license_front, drivers_license_back, and work_samples
      let profilePhotoUrl: string | null = null;
      let licenseFrontUrl: string | null = null;
      let licenseBackUrl: string | null = null;
      const workSampleUrls: string[] = [];
      const initialImageLoading = { profile: true, licenseFront: true, licenseBack: true, workSamples: [] as boolean[] };

      // Helper function to get public or signed URL
      const getStorageUrl = async (filePath: string | null, folder: string): Promise<string | null> => {
        if (!filePath) {
          console.log(`No filePath provided for ${folder}`);
          return null;
        }

        console.log(`Processing filePath for ${folder}:`, filePath);

        // If filePath is a full public URL, use it directly
        if (filePath.startsWith('https://') && filePath.includes('vendor-applications')) {
          console.log(`Using stored URL for ${folder}:`, filePath);
          return filePath;
        }

        // Construct relative path for vendor-applications bucket
        const relativePath = filePath.includes(folder) 
          ? filePath 
          : `${folder}/${id}/${filePath.split('/').pop() || filePath}`;
        console.log(`Constructed relative path for ${folder}:`, relativePath);

        // Try public URL
        const { data: publicData } = supabase.storage.from('vendor-applications').getPublicUrl(relativePath);
        if (publicData.publicUrl) {
          console.log(`Public URL for ${folder}:`, publicData.publicUrl);
          return publicData.publicUrl;
        }

        // Fallback to signed URL
        console.log(`Public URL failed, attempting signed URL for ${folder}`);
        const { data: signedData, error: signedError } = await supabase.storage
          .from('vendor-applications')
          .createSignedUrl(relativePath, 3600); // URL valid for 1 hour
        if (signedError) {
          console.error(`Error fetching signed URL for ${folder}:`, signedError);
          return null;
        }
        console.log(`Signed URL for ${folder}:`, signedData.signedUrl);
        return signedData.signedUrl;
      };

      // Fetch URLs for each file
      profilePhotoUrl = await getStorageUrl(data.profile_photo, 'profile');
      licenseFrontUrl = await getStorageUrl(data.drivers_license_front, 'license-front');
      licenseBackUrl = await getStorageUrl(data.drivers_license_back, 'license-back');
      if (data.work_samples && data.work_samples.length > 0) {
        initialImageLoading.workSamples = data.work_samples.map(() => true);
        for (const sample of data.work_samples) {
          const url = await getStorageUrl(sample, 'work-samples');
          if (url) {
            workSampleUrls.push(url);
          }
        }
      }

      // Fetch service area names
      let serviceAreaNames: string[] = data.service_locations;
      if (data.service_locations && data.service_locations.length > 0) {
        const { data: areasData, error: areasError } = await supabase
          .from('service_areas')
          .select('id, state, region')
          .in('id', data.service_locations);

        if (areasError) {
          console.error('Error fetching service areas:', areasError);
          throw areasError;
        }

        serviceAreaNames = areasData.map((area: ServiceArea) =>
          area.region ? `${area.state}, ${area.region}` : area.state
        );
      }

      setApplication(data);
      setProfilePhotoUrl(profilePhotoUrl);
      setLicenseFrontUrl(licenseFrontUrl);
      setLicenseBackUrl(licenseBackUrl);
      setWorkSampleUrls(workSampleUrls);
      setServiceAreaNames(serviceAreaNames);
      setImageLoading(initialImageLoading);
      setAdminNotes('');
      setNoteTimestamp(data.admin_notes ? data.updated_at : null);
      setReviewedAt('');
      setReviewedBy('');
      setReviewTimestamp(data.reviewed_at && data.reviewed_by ? data.updated_at : null);
      setIsEditingNotes(!!data.admin_notes);
      setIsEditingReview(!!data.reviewed_at && !!data.reviewed_by);
    } catch (error: any) {
      console.error('Error fetching application details:', error);
      toast.error('Failed to load application details');
      navigate('/dashboard/vendor-application');
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (newStatus: string) => {
    try {
      if (!application || !supabase) return;

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || null;

      const { error } = await supabase
        .from('vendor_applications')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
        })
        .eq('id', application.id);

      if (error) throw error;

      setApplication((prev) =>
        prev
          ? { ...prev, status: newStatus, updated_at: new Date().toISOString(), reviewed_at: new Date().toISOString(), reviewed_by: userId }
          : null
      );
      setReviewTimestamp(new Date().toISOString());
      setIsEditingReview(true);
      toast.success('Status updated successfully');
    } catch (error: any) {
      console.error('Error updating application status:', error);
      toast.error('Failed to update status');
    }
  };

  const saveAdminNotes = async () => {
    try {
      if (!application || !supabase) return;
      if (adminNotes.length > 5000) {
        toast.error('Admin notes cannot exceed 5000 characters');
        return;
      }

      const currentTime = new Date().toISOString();
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          admin_notes: adminNotes || null,
          updated_at: currentTime,
        })
        .eq('id', application.id);

      if (error) throw error;

      setApplication((prev) =>
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
      if (!application || !supabase) return;
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

      // Ensure reviewed_at is a valid ISO 8601 timestamp
      const parsedReviewedAt = new Date(reviewedAt).toISOString();
      if (isNaN(new Date(parsedReviewedAt).getTime())) {
        toast.error('Invalid review date and time');
        return;
      }

      const currentTime = new Date().toISOString();
      const { error } = await supabase
        .from('vendor_applications')
        .update({
          reviewed_at: parsedReviewedAt,
          reviewed_by: reviewedBy,
          updated_at: currentTime,
        })
        .eq('id', application.id);

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      setApplication((prev) =>
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

  const formatAddress = (address: VendorApplication['address']) => {
    if (!address) return 'None';
    const { street, city, state, zip } = address;
    return `${street}, ${city}, ${state} ${zip}`;
  };

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading || !application) {
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
          <h1 className="text-3xl font-bold text-gray-900">Vendor Profile: {application.name}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span
            className={`text-2xl font-bold px-4 py-2 rounded-full ${getStatusStyles(application.status)}`}
          >
            {application.status.toUpperCase()}
          </span>
          <button
            onClick={() => navigate('/dashboard/vendor-application')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0 w-full md:w-1/3">
            {profilePhotoUrl ? (
              imageLoading.profile ? (
                <div className="w-48 h-48 bg-gray-200 rounded-full animate-pulse mx-auto"></div>
              ) : (
                <img
                  src={profilePhotoUrl}
                  alt={`${application.name}'s profile`}
                  className="w-48 h-48 object-cover rounded-full mx-auto"
                  loading="lazy"
                  onLoad={() => setImageLoading((prev) => ({ ...prev, profile: false }))}
                  onError={(e) => {
                    console.error('Profile photo failed to load:', profilePhotoUrl, 'Error:', e.currentTarget.error);
                    e.currentTarget.src = '/fallback-image.png';
                    setImageLoading((prev) => ({ ...prev, profile: false }));
                  }}
                />
              )
            ) : (
              <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                <User className="h-16 w-16 text-gray-400" />
              </div>
            )}
            <div className="mt-4 text-center">
              <h2 className="text-xl font-semibold text-gray-900">{application.name}</h2>
              <p className="text-sm text-gray-600">Vendor Applicant</p>
            </div>
          </div>
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{application.email}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-sm text-gray-900">{application.phone}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-sm text-gray-900">{formatAddress(application.address)}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Award className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Services Applying For</label>
                  <p className="text-sm text-gray-900">{application.services_applying_for.join(', ') || 'None'}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Service Locations</label>
                  <p className="text-sm text-gray-900">{serviceAreaNames.join(', ') || 'None'}</p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-500 mr-2 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{application.description || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Camera className="h-5 w-5 text-gray-500 mr-2" />
          Photos and Documents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Driver's License (Front)</label>
            {licenseFrontUrl ? (
              imageLoading.licenseFront ? (
                <div className="w-48 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
              ) : (
                <a href={licenseFrontUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={licenseFrontUrl}
                    alt="Driver's License Front"
                    className="w-48 h-32 object-cover rounded-lg mt-2"
                    loading="lazy"
                    onLoad={() => setImageLoading((prev) => ({ ...prev, licenseFront: false }))}
                    onError={(e) => {
                      console.error('License front failed to load:', licenseFrontUrl, 'Error:', e.currentTarget.error);
                      e.currentTarget.src = '/fallback-image.png';
                      setImageLoading((prev) => ({ ...prev, licenseFront: false }));
                    }}
                  />
                </a>
              )
            ) : (
              <p className="text-sm text-gray-900">None</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Driver's License (Back)</label>
            {licenseBackUrl ? (
              imageLoading.licenseBack ? (
                <div className="w-48 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
              ) : (
                <a href={licenseBackUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={licenseBackUrl}
                    alt="Driver's License Back"
                    className="w-48 h-32 object-cover rounded-lg mt-2"
                    loading="lazy"
                    onLoad={() => setImageLoading((prev) => ({ ...prev, licenseBack: false }))}
                    onError={(e) => {
                      console.error('License back failed to load:', licenseBackUrl, 'Error:', e.currentTarget.error);
                      e.currentTarget.src = '/fallback-image.png';
                      setImageLoading((prev) => ({ ...prev, licenseBack: false }));
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
          <Camera className="h-5 w-5 text-gray-500 mr-2" />
          Work Samples
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {workSampleUrls.length > 0 ? (
            workSampleUrls.map((sample, index) => (
              <div key={index} className="relative w-full h-40">
                {imageLoading.workSamples[index] ? (
                  <div className="w-full h-full bg-gray-200 rounded-lg animate-pulse"></div>
                ) : (
                  <img
                    src={sample}
                    alt={`Work sample ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                    onLoad={() =>
                      setImageLoading((prev) => ({
                        ...prev,
                        workSamples: prev.workSamples.map((v, i) => (i === index ? false : v)),
                      }))
                    }
                    onError={(e) => {
                      console.error('Work sample failed to load:', sample, 'Error:', e.currentTarget.error);
                      e.currentTarget.src = '/fallback-image.png';
                      setImageLoading((prev) => ({
                        ...prev,
                        workSamples: prev.workSamples.map((v, i) => (i === index ? false : v)),
                      }));
                    }}
                  />
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-900">None</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Camera className="h-5 w-5 text-gray-500 mr-2" />
          Gear
        </h2>
        {application.gear.length > 0 ? (
          <ul className="list-disc pl-5 mt-2">
            {application.gear.map((item, index) => (
              <li key={index} className="text-sm text-gray-900">
                {item.gear_type}: {item.brand} {item.model} ({item.year}, {item.condition})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-900">None</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Link className="h-5 w-5 text-gray-500 mr-2" />
          Work Links
        </h2>
        {application.work_links.length > 0 ? (
          <ul className="list-disc pl-5">
            {application.work_links.map((link, index) => (
              <li key={index}>
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-900">None</p>
        )}
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
              placeholder="Add notes about this vendor..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-2 text-right">
              <span className="text-sm text-gray-500">{adminNotes.length}/5000 characters</span>
            </div>
          </>
        ) : null}
        {application.admin_notes && noteTimestamp && (
          <div className="mt-4">
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{application.admin_notes}</p>
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
        {(application.reviewed_at || application.reviewed_by) && reviewTimestamp && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Reviewed At</label>
              <p className="text-sm text-gray-900">
                {application.reviewed_at ? new Date(application.reviewed_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'Not Reviewed'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Reviewed By</label>
              <p className="text-sm text-gray-900">{application.reviewed_by || 'N/A'}</p>
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
          onClick={() => updateApplicationStatus('rejected')}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          disabled={application.status === 'rejected'}
        >
          Deny
        </button>
        <button
          onClick={() => updateApplicationStatus('approved')}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          disabled={application.status === 'approved'}
        >
          Approve
        </button>
      </div>
    </div>
  );
}