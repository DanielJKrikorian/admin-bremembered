import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AddServicePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPackageAdded: () => void;
}

export default function AddServicePackageModal({ isOpen, onClose, onPackageAdded }: AddServicePackageModalProps) {
  const [newPackage, setNewPackage] = useState({
    service_type: '',
    name: '',
    description: '',
    price: 0,
    features: [''],
    coverage: '{}',
    status: '',
    vendor_id: '',
    hour_amount: 0,
    lookup_key: '',
    event_type: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewPackage(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'hour_amount' ? parseInt(value) || 0 : value
    }));
  };

  const handleFeaturesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewPackage(prev => ({
      ...prev,
      features: e.target.value.split('\n').filter(f => f.trim())
    }));
  };

  const handleCoverageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewPackage(prev => ({
      ...prev,
      coverage: e.target.value ? JSON.parse(e.target.value) : {}
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const packageData = {
        service_type: newPackage.service_type.trim() || null,
        name: newPackage.name.trim(),
        description: newPackage.description.trim() || null,
        price: newPackage.price,
        features: newPackage.features.length > 0 ? newPackage.features : null,
        coverage: newPackage.coverage ? JSON.parse(newPackage.coverage) : null,
        status: newPackage.status.trim() || null,
        vendor_id: newPackage.vendor_id.trim() || null,
        hour_amount: newPackage.hour_amount || null,
        lookup_key: newPackage.lookup_key.trim() || null,
        event_type: newPackage.event_type.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('service_packages')
        .insert(packageData)
        .select('id')
        .single();

      if (error) throw error;

      onPackageAdded();
      onClose();
      setNewPackage({
        service_type: '',
        name: '',
        description: '',
        price: 0,
        features: [''],
        coverage: '{}',
        status: '',
        vendor_id: '',
        hour_amount: 0,
        lookup_key: '',
        event_type: ''
      });
      toast.success('New service package added successfully!');
    } catch (error: any) {
      console.error('Error adding new service package:', error);
      toast.error('Failed to add new service package');
    } finally {
      setLoading(false);
    }
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
                  Add New Service Package
                </Dialog.Title>
                <div className="mt-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="new_package_service_type" className="block text-sm font-medium text-gray-700">Service Type</label>
                      <input
                        type="text"
                        id="new_package_service_type"
                        name="service_type"
                        value={newPackage.service_type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_package_name" className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        id="new_package_name"
                        name="name"
                        value={newPackage.name}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_package_description" className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        id="new_package_description"
                        name="description"
                        value={newPackage.description}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_package_price" className="block text-sm font-medium text-gray-700">Price *</label>
                      <input
                        type="number"
                        id="new_package_price"
                        name="price"
                        value={newPackage.price}
                        onChange={handleChange}
                        step="1"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_package_features" className="block text-sm font-medium text-gray-700">Features</label>
                      <textarea
                        id="new_package_features"
                        name="features"
                        value={newPackage.features.join('\n')}
                        onChange={handleFeaturesChange}
                        placeholder="Enter one feature per line"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_package_coverage" className="block text-sm font-medium text-gray-700">Coverage (JSON)</label>
                      <textarea
                        id="new_package_coverage"
                        name="coverage"
                        value={JSON.stringify(newPackage.coverage, null, 2)}
                        onChange={handleCoverageChange}
                        placeholder='{"key": "value"}'
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_package_status" className="block text-sm font-medium text-gray-700">Status</label>
                      <input
                        type="text"
                        id="new_package_status"
                        name="status"
                        value={newPackage.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_package_vendor_id" className="block text-sm font-medium text-gray-700">Vendor ID</label>
                      <input
                        type="text"
                        id="new_package_vendor_id"
                        name="vendor_id"
                        value={newPackage.vendor_id}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_package_hour_amount" className="block text-sm font-medium text-gray-700">Hour Amount</label>
                      <input
                        type="number"
                        id="new_package_hour_amount"
                        name="hour_amount"
                        value={newPackage.hour_amount}
                        onChange={handleChange}
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_package_lookup_key" className="block text-sm font-medium text-gray-700">Lookup Key</label>
                      <input
                        type="text"
                        id="new_package_lookup_key"
                        name="lookup_key"
                        value={newPackage.lookup_key}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_package_event_type" className="block text-sm font-medium text-gray-700">Event Type</label>
                      <input
                        type="text"
                        id="new_package_event_type"
                        name="event_type"
                        value={newPackage.event_type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="mt-4">
                      <button
                        type="submit"
                        disabled={loading || !newPackage.name.trim() || newPackage.price <= 0}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5 mr-2" />
                            Add Package
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="ml-2 inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}