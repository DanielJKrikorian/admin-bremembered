import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ImportBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const csvTemplate = `couple_name,vendor_name,service_type,amount,status,venue_name,start_time,end_time
"Smith & Johnson","Floral Co","Floral Arrangement",2750,confirmed,Willow Creek,2025-06-15T10:00:00,2025-06-15T12:00:00`;

export default function ImportBookingsModal({ isOpen, onClose, onSuccess }: ImportBookingsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [importedItems, setImportedItems] = useState<{ name: string; status: string; error?: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'booking_template.csv';
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
    setImportedItems([]);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').slice(1).filter(row => row.trim());
      const total = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const [couple_name, vendor_name, service_type, amount, status, venue_name, start_time, end_time] = rows[i].split(',').map(field => field.replace(/^"|"$/g, '').trim());
        const progressPercent = Math.round(((i + 1) / total) * 100);
        setProgress(progressPercent);

        try {
          // Fetch couple and vendor IDs
          const { data: coupleData } = await supabase
            .from('couples')
            .select('id, name')
            .ilike('name', couple_name)
            .single();
          const { data: vendorData } = await supabase
            .from('vendors')
            .select('id, name')
            .ilike('name', vendor_name)
            .single();

          if (!coupleData || !vendorData) {
            throw new Error(`Couple or Vendor not found: ${couple_name}, ${vendor_name}`);
          }

          const coupleId = coupleData.id;
          const vendorId = vendorData.id;

          // Insert booking
          const bookingData = {
            couple_id: coupleId,
            vendor_id: vendorId,
            status: status || 'pending',
            amount: parseInt(amount) * 100, // Store as cents
            service_type: service_type || 'Unknown',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: bookingResult, error: bookingError } = await supabase
            .from('bookings')
            .insert(bookingData)
            .select('id')
            .single();

          if (bookingError) throw bookingError;

          const bookingId = bookingResult.id;

          // Insert event for couple and vendor
          const eventData = {
            couple_id: coupleId,
            vendor_id: vendorId,
            start_time: new Date(start_time).toISOString(),
            end_time: new Date(end_time).toISOString(),
            type: service_type || 'Event',
            title: `${couple_name} - ${service_type}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await supabase.from('events').insert(eventData);

          setImportedItems(prev => [...prev, { name: couple_name, status: 'Success' }]);
        } catch (error: any) {
          console.error(`Error importing booking for ${couple_name}:`, error);
          setImportedItems(prev => [...prev, { name: couple_name, status: 'Failed', error: error.message }]);
        }
      }

      setProgress(100);
      setIsImporting(false);
      setSuccess(true);
      const successfulImports = importedItems.filter(i => i.status === 'Success').length;
      toast.success(`Imported ${successfulImports} bookings successfully!`);
      if (importedItems.some(i => i.status === 'Failed')) {
        toast.error(`Failed to import ${importedItems.filter(i => i.status === 'Failed').length} bookings. Check logs.`);
      }
      onSuccess();
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
          <div className="fixed inset-0 bg-black bg-opacity-75" />
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
                  Import Bookings
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
                  {importedItems.length > 0 && (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importedItems.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 whitespace-nowrap">{item.name}</td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {item.status === 'Success' ? (
                                  <span className="text-green-600">Success</span>
                                ) : (
                                  <span className="text-red-600">Failed</span>
                                )}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">{item.error || '-'}</td>
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