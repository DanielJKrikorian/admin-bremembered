import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface ImportCouplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Optional, matching AddCoupleModal
}

const csvTemplate = `name,email,phone,partner1_name,partner2_name,wedding_date,budget,vibe_tags,venue_name,guest_count,venue_city,venue_state
"Smith & Johnson",couple@example.com,"(555) 123-4567",Alex,Taylor,2025-12-01,50000,"rustic,boho","Willow Creek Vineyard",150,Napa,CA`;

export default function ImportCouplesModal({ isOpen, onClose, onSuccess }: ImportCouplesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [importedCouples, setImportedCouples] = useState<{ name: string; status: string; email?: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Admin check
  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (error || !user) {
        toast.error('Please log in');
        onClose();
        return;
      }
      if (user.user_metadata?.role !== 'admin') {
        toast.error('Unauthorized action');
        onClose();
      }
    };

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, []); // Empty deps to run once

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
        // Handle CSV parsing with potential commas in fields (e.g., vibe_tags)
        const rowValues = rows[i].split(/(?=(?:[^"]*"[^"]*")*[^"]*$),/).map(val => val.replace(/^"|"$/g, '').trim());
        const [name, email, phone, partner1_name, partner2_name, wedding_date, budget, vibe_tags, venue_name, guest_count, venue_city, venue_state] = rowValues;
        const progressPercent = Math.round(((i + 1) / total) * 100);
        setProgress(progressPercent);

        try {
          const payload = {
            email: email?.trim(),
            name: name?.trim(),
            phone: phone?.trim(),
            partner1_name: partner1_name?.trim(),
            partner2_name: partner2_name?.trim(),
            wedding_date: wedding_date?.trim(),
            budget: budget?.trim(),
            vibe_tags: vibe_tags?.trim(),
            venue_name: venue_name?.trim(),
            guest_count: guest_count?.trim(),
            venue_city: venue_city?.trim(),
            venue_state: venue_state?.trim(),
          };

          const response = await fetch('https://eecbrvehrhrvdzuutliq.supabase.co/functions/v1/create-couple', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(payload),
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Failed to create couple via function');

          setImportedCouples(prev => [...prev, { name, status: 'Success', email }]);
        } catch (error: any) {
          console.error('Import error:', error);
          setImportedCouples(prev => [...prev, { name, status: 'Failed', email }]);
        }
      }

      setProgress(100);
      setIsImporting(false);
      setSuccess(true);
      toast.success('Couples imported successfully!');
      if (typeof onSuccess === 'function') {
        onSuccess(); // Safe call
      }
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