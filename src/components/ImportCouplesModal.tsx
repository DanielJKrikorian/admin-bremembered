import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ImportCouplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback to refresh couples list
}

const csvTemplate = `name,partner1_name,partner2_name,wedding_date,budget,vibe_tags,phone,email,venue_name,guest_count,venue_city,venue_state
"Smith & Johnson",Alex,Taylor,2025-06-15,50000,"rustic,modern,boho",123-456-7890,couple@example.com,Willow Creek Vineyard,150,Napa,CA`;

export default function ImportCouplesModal({ isOpen, onClose, onSuccess }: ImportCouplesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [importedCouples, setImportedCouples] = useState<{ name: string; status: string; email?: string; error?: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'couple_template.csv';
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
    setImportedCouples([]);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').slice(1).filter(row => row.trim());
      const total = rows.length;

      for (let i = 0; i < rows.length; i++) {
        // Parse CSV row, handling quoted fields
        const fields = rows[i].split(',').map(field => field.replace(/^"|"$/g, '').trim());
        const [name, partner1_name, partner2_name, wedding_date, budget, vibe_tags, phone, email, venue_name, guest_count, venue_city, venue_state] = fields;
        const progressPercent = Math.round(((i + 1) / total) * 100);
        setProgress(progressPercent);

        try {
          // Validate email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!email || !emailRegex.test(email)) {
            throw new Error('Invalid or missing email address');
          }

          // Create user in auth.users
          const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { role: 'couple' }
          });

          if (userError) {
            console.error(`Error creating user for ${name}:`, userError);
            throw new Error(`Failed to create user: ${userError.message}`);
          }

          const userId = userData.user?.id;
          if (!userId) {
            throw new Error('User creation failed: No user ID returned');
          }

          // Insert into couples table
          const coupleData = {
            name: name || null,
            partner1_name: partner1_name || null,
            partner2_name: partner2_name || null,
            wedding_date: wedding_date || null,
            budget: budget ? parseInt(budget) : null,
            vibe_tags: vibe_tags ? vibe_tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
            phone: phone || null,
            email: email || null,
            venue_name: venue_name || null,
            guest_count: guest_count ? parseInt(guest_count) : null,
            venue_city: venue_city || null,
            venue_state: venue_state || null,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: coupleError } = await supabase
            .from('couples')
            .insert(coupleData);

          if (coupleError) {
            console.error(`Error inserting couple ${name}:`, coupleError);
            // Clean up: delete user if couple insertion fails
            await supabase.auth.admin.deleteUser(userId);
            throw new Error(`Failed to insert couple: ${coupleError.message}`);
          }

          // Send password reset email
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
          });

          if (resetError) {
            console.warn(`Failed to send reset email for ${name}: ${resetError.message}`);
            setImportedCouples(prev => [...prev, { name, status: 'Success', email, error: 'Failed to send password reset email' }]);
          } else {
            setImportedCouples(prev => [...prev, { name, status: 'Success', email }]);
          }
        } catch (error: any) {
          console.error(`Error importing couple ${name}:`, error);
          setImportedCouples(prev => [...prev, { name, status: 'Failed', email, error: error.message || 'Unknown error' }]);
        }
      }

      setIsImporting(false);
      setSuccess(true);
      const successfulImports = importedCouples.filter(c => c.status === 'Success').length;
      toast.success(`Imported ${successfulImports} couples successfully!`);
      if (importedCouples.some(c => c.status === 'Failed')) {
        toast.error(`Failed to import ${importedCouples.filter(c => c.status === 'Failed').length} couples. Check logs for details.`);
      }
      onSuccess(); // Refresh couples list
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

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
                  Import Couples
                </Dialog.Title>
                <div className="mt-2">
                  <button
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Download CSV Template
                  </button>
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
                  {importedCouples.length > 0 && (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importedCouples.map((couple, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 whitespace-nowrap">{couple.name}</td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {couple.status === 'Success' ? (
                                  <span className="text-green-600">Success</span>
                                ) : (
                                  <span className="text-red-600">Failed</span>
                                )}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">{couple.email}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{couple.error || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {success && (
                    <div className="text-green-600 flex items-center mb-4">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Import completed!
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