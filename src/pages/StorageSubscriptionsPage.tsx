import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface VendorSubscription {
  id: string;
  vendor_id: string;
  plan_id: string;
  storage_used: number;
  payment_status: string;
  created_at: string;
  updated_at: string | null;
  subscription_id: string;
  vendor_name: string | null;
}

interface CoupleSubscription {
  id: string;
  couple_id: string;
  subscription_id: string;
  payment_status: string;
  plan_id: string;
  customer_id: string;
  created_at: string;
  updated_at: string | null;
  free_period_expiry: string | null;
  file_upload_id: string | null;
  file_name: string | null;
  file_size: number | null;
  upload_date: string | null;
  expiry_date: string | null;
}

interface Couple {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface FileUpload {
  id: string;
  file_name: string;
  file_size: number;
  upload_date: string;
  expiry_date: string | null;
}

interface CoupleStorageExtension {
  id: string;
  couple_id: string;
  file_upload_id: string;
  expiry_date: string;
}

export default function StorageSubscriptionsPage() {
  const [vendorSubscriptions, setVendorSubscriptions] = useState<VendorSubscription[]>([]);
  const [coupleSubscriptions, setCoupleSubscriptions] = useState<CoupleSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const [storageExtensions, setStorageExtensions] = useState<CoupleStorageExtension[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vendorSubsResponse, coupleSubsResponse, couplesResponse, vendorsResponse, fileUploadsResponse, extensionsResponse] = await Promise.all([
          supabase.from('storage_subscriptions').select('*'),
          supabase.from('couple_subscriptions').select('*'),
          supabase.from('couples').select('id, name'),
          supabase.from('vendors').select('id, name'),
          supabase.from('file_uploads').select('id, file_name, file_size, upload_date, expiry_date'),
          supabase.from('couple_storage_extensions').select('id, couple_id, file_upload_id, expiry_date'),
        ]);

        if (vendorSubsResponse.error) throw vendorSubsResponse.error;
        if (coupleSubsResponse.error) throw coupleSubsResponse.error;
        if (couplesResponse.error) throw couplesResponse.error;
        if (vendorsResponse.error) throw vendorsResponse.error;
        if (fileUploadsResponse.error) throw fileUploadsResponse.error;
        if (extensionsResponse.error) throw extensionsResponse.error;

        const mappedVendorSubs = vendorSubsResponse.data.map(sub => ({
          ...sub,
          vendor_name: vendorsResponse.data.find(v => v.id === sub.vendor_id)?.name || 'N/A',
        }));

        const mappedCoupleSubs = coupleSubsResponse.data.map(sub => {
          const extension = storageExtensions.find(ext => ext.couple_id === sub.couple_id); // Use pre-loaded extensions
          const fileUpload = extension ? fileUploads.find(fu => fu.id === extension.file_upload_id) : null;
          return {
            ...sub,
            couple_name: couplesResponse.data.find(c => c.id === sub.couple_id)?.name || 'N/A',
            file_upload_id: extension?.file_upload_id || null,
            file_name: fileUpload?.file_name || null,
            file_size: fileUpload?.file_size || null,
            upload_date: fileUpload?.upload_date || null,
            expiry_date: extension?.expiry_date || fileUpload?.expiry_date || null,
          };
        });

        setVendorSubscriptions(mappedVendorSubs);
        setCoupleSubscriptions(mappedCoupleSubs);
        setCouples(couplesResponse.data || []);
        setVendors(vendorsResponse.data || []);
        setFileUploads(fileUploadsResponse.data || []);
        setStorageExtensions(extensionsResponse.data || []);
      } catch (error: any) {
        console.error('Error fetching storage subscriptions:', error);
        toast.error('Failed to load storage subscriptions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Storage Subscriptions
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Storage Subscriptions
        </h1>
        <p className="mt-2 text-gray-500">Manage storage subscriptions and file uploads.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Vendor Subscriptions ({vendorSubscriptions.length})</h2>
        </div>
        {vendorSubscriptions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vendor subscriptions found</h3>
            <p className="text-gray-500">Subscriptions will appear here when available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Used (MB)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendorSubscriptions.map(sub => (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.vendor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.plan_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{(sub.storage_used / (1024 * 1024)).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.payment_status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(sub.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Couple Subscriptions & Files ({coupleSubscriptions.length})</h2>
        </div>
        {coupleSubscriptions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No couple subscriptions or files found</h3>
            <p className="text-gray-500">Subscriptions and files will appear here when available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Free Period Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Size (MB)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupleSubscriptions.map(sub => (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.couple_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.plan_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.payment_status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.free_period_expiry ? new Date(sub.free_period_expiry).toLocaleString() : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(sub.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.file_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.file_size ? (sub.file_size / (1024 * 1024)).toFixed(2) : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.upload_date ? new Date(sub.upload_date).toLocaleString() : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{sub.expiry_date ? new Date(sub.expiry_date).toLocaleString() : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/dashboard/storage/${sub.couple_id}`)}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Files
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}