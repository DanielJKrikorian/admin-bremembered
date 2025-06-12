// src/components/ImportVendorsModal.tsx
import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ImportVendorsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const csvTemplate = `name,profile_photo,phone,years_experience,profile,service_areas,specialties,stripe_account_id,user_id
John Doe,https://example.com/photo.jpg,,5,"Experienced vendor",Boston,Photography,acct_123,,`;

export default function ImportVendorsModal({ isOpen, onClose }: ImportVendorsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sendLoginEmail, setSendLoginEmail] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importedVendors, setImportedVendors] = useState<{ name: string; status: string; email?: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setProgress(0);
    setImportedVendors([]);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').slice(1).filter(row => row.trim());
      const total = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const [name, profile_photo, phone, years_experience, profile, service_areas, specialties, stripe_account_id, user_id] = rows[i].split(',');
        const progressPercent = Math.round((i / total) * 100);
        setProgress(progressPercent);

        try {
          // Create user in Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user_id.trim(),
            password: Math.random().toString(36).slice(-8), // Temporary random password
            email_confirm: true,
            user_metadata: { role: 'vendor' }
          });

          if (authError) throw authError;

          const userId = authData.user?.id;
          if (!userId) throw new Error('User ID not generated');

          // Insert into vendors table
          const updateData = {
            name: name || null,
            profile_photo: profile_photo || null,
            phone: phone || null,
            years_experience: years_experience ? parseInt(years_experience) : null,
            profile: profile || null,
            service_areas: service_areas ? service_areas.split(',').map(area => area.trim()).filter(area => area.length > 0) : [],
            specialties: specialties ? specialties.split(',').map(specialty => specialty.trim()).filter(specialty => specialty.length > 0) : [],
            stripe_account_id: stripe_account_id || null,
            user_id: userId
          };

          const { data, error } = await supabase
            .from('vendors')
            .insert(updateData)
            .select();

          if (error) throw error;

          // Send password reset email if requested
          if (sendLoginEmail && user_id) {
            await supabase.auth.resetPasswordForEmail(user_id.trim(), {
              redirectTo: `${window.location.origin}/reset-password`
            });
          }

          setImportedVendors(prev => [...prev, { name, status: 'Success', email: user_id }]);
        } catch (error: any) {
          setImportedVendors(prev => [...prev, { name, status: 'Failed', email: user_id }]);
        }
      }

      setProgress(100);
      setIsImporting(false);
      setSuccess(true);
      toast.success('Vendors imported successfully!');
    };
    reader.readAsText(file);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Import Vendors
                </Dialog.Title>
                <div className="mt-2">
                  <button
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Download CSV Template
                  </button>
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sendLoginEmail}
                        onChange={(e) => setSendLoginEmail(e.target.checked)}
                        className="mr-2"
                      />
                      Send Login Email to All Vendors
                    </label>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                  />
                  {isImporting && (
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{progress}%</p>
                    </div>
                  )}
                  {importedVendors.length > 0 && (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importedVendors.map((vendor, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 whitespace-nowrap">{vendor.name}</td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {vendor.status === 'Success' ? (
                                  <span className="text-green-600">Success</span>
                                ) : (
                                  <span className="text-red-600">Failed</span>
                                )}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">{vendor.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {success && (
                    <div className="text-green-600 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Import completed successfully!
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!file || isImporting}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    Import
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="ml-2 inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}