import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ImportServicePackagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const csvTemplate = `service_type,name,description,price,features,coverage,status,vendor_id,hour_amount,lookup_key,event_type
"Planning","Basic Package","Basic planning",100,"Feature1\nFeature2","{\"coverage\": \"basic\"}","active",null,2.0,"key123","wedding"
"Decor","Premium Package","Full decor",500,"FeatureA\nFeatureB","{\"coverage\": \"full\"}","active","550e8400-e29b-41d4-a716-446655440000",5.5,"key456","corporate"`;

export default function ImportServicePackagesModal({ isOpen, onClose, onSuccess }: ImportServicePackagesModalProps) {
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
    a.download = 'service_package_template.csv';
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
        const [service_type, name, description, price, features, coverage, status, vendor_id, hour_amount, lookup_key, event_type] = rows[i].split(',').map(field => field.replace(/^"|"$/g, '').trim());
        const progressPercent = Math.round(((i + 1) / total) * 100);
        setProgress(progressPercent);

        try {
          const packageData = {
            service_type: service_type || null,
            name: name || 'Unnamed Package',
            description: description || null,
            price: parseInt(price) || 0,
            features: features ? features.split('\n').filter(f => f.trim()) : null,
            coverage: coverage ? JSON.parse(coverage) : null,
            status: status || null,
            vendor_id: vendor_id || null,
            hour_amount: parseFloat(hour_amount) || null,
            lookup_key: lookup_key || null,
            event_type: event_type || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data, error } = await supabase
            .from('service_packages')
            .insert(packageData)
            .select('id')
            .single();

          if (error) throw error;

          setImportedItems(prev => [...prev, { name, status: 'Success' }]);
        } catch (error: any) {
          console.error(`Error importing package ${name}:`, error);
          setImportedItems(prev => [...prev, { name, status: 'Failed', error: error.message }]);
        }
      }

      setProgress(100);
      setIsImporting(false);
      setSuccess(true);
      const successfulImports = importedItems.filter(i => i.status === 'Success').length;
      toast.success(`Imported ${successfulImports} packages successfully!`);
      if (importedItems.some(i => i.status === 'Failed')) {
        toast.error(`Failed to import ${importedItems.filter(i => i.status === 'Failed').length} packages. Check logs.`);
      }
      onSuccess();
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                  Import Service Packages
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
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
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