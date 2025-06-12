import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Download, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ContractTemplate {
  id: string;
  service_type: string;
  content: string;
  created_at: string;
  updated_at: string | null;
}

interface Booking {
  id: string;
  couple_id: string;
  vendor_id: string | null;
  status: string;
  package_id: string;
  created_at: string;
  updated_at: string | null;
}

interface Couple {
  id: string;
  name: string;
}

interface ServicePackage {
  id: string;
  name: string;
}

interface Contract {
  id: string;
  booking_id: string;
  content: string;
  signature: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string | null;
  status: string;
  booking_intent_id: string | null;
  couple_name: string | null;
  package_name: string | null;
}

export default function ContractsPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({ service_type: '', content: '' });
  const [editedTemplate, setEditedTemplate] = useState<ContractTemplate | null>(null);
  const [isViewContractOpen, setIsViewContractOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Fetch contract templates
        const { data: templateData, error: templateError } = await supabase
          .from('contract_templates')
          .select('*')
          .order('created_at', { ascending: false });
        if (templateError) {
          console.error('Template fetch error:', templateError);
          throw templateError;
        }
        setTemplates(templateData || []);

        // Fetch contracts
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .select('*')
          .order('created_at', { ascending: false });
        if (contractError) {
          console.error('Contract fetch error:', contractError);
          throw contractError;
        }

        // Fetch all related bookings
        const bookingIds = contractData.map(c => c.booking_id).filter(id => id);
        let bookings: Booking[] = [];
        if (bookingIds.length > 0) {
          const { data: bookingsData, error: bookingError } = await supabase
            .from('bookings')
            .select('id, couple_id, package_id')
            .in('id', bookingIds);
          if (bookingError) throw bookingError;
          bookings = bookingsData || [];
        }

        // Fetch couple names
        const coupleIds = bookings.map(b => b.couple_id).filter(id => id);
        let coupleNames: { [key: string]: string } = {};
        if (coupleIds.length > 0) {
          const { data: couples, error: coupleError } = await supabase
            .from('couples')
            .select('id, name')
            .in('id', coupleIds);
          if (coupleError) throw coupleError;
          coupleNames = couples.reduce((acc, couple) => {
            acc[couple.id] = couple.name;
            return acc;
          }, {} as { [key: string]: string });
        }

        // Fetch package names
        const packageIds = bookings.map(b => b.package_id).filter(id => id);
        let packageNames: { [key: string]: string } = {};
        if (packageIds.length > 0) {
          const { data: packages, error: packageError } = await supabase
            .from('service_packages')
            .select('id, name')
            .in('id', packageIds);
          if (packageError) throw packageError;
          packageNames = packages.reduce((acc, pkg) => {
            acc[pkg.id] = pkg.name;
            return acc;
          }, {} as { [key: string]: string });
        }

        // Map contracts with lookup data
        const mappedContracts = contractData.map(contract => {
          const booking = bookings.find(b => b.id === contract.booking_id);
          return {
            ...contract,
            couple_name: booking ? coupleNames[booking.couple_id] || 'N/A' : 'N/A',
            package_name: booking ? packageNames[booking.package_id] || 'N/A' : 'N/A',
          };
        });
        setContracts(mappedContracts || []);
        console.log('Contracts fetched with details:', mappedContracts);
      } catch (error: any) {
        console.error('Error fetching contracts data:', error);
        toast.error('Failed to load contracts data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.id !== '7ee81f6a-f817-4ef7-8947-75bb21901615' || !newTemplate.service_type || !newTemplate.content) {
      toast.error('Only the admin can add templates with valid service type and content');
      return;
    }

    try {
      const { error } = await supabase
        .from('contract_templates')
        .insert({
          service_type: newTemplate.service_type,
          content: newTemplate.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;

      toast.success('Template added successfully!');
      setTemplates([...templates, { ...newTemplate, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
      setNewTemplate({ service_type: '', content: '' });
      setIsAddTemplateOpen(false);
    } catch (error: any) {
      console.error('Error adding template:', error);
      toast.error('Failed to add template');
    }
  };

  const handleEditTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.id !== '7ee81f6a-f817-4ef7-8947-75bb21901615' || !editedTemplate) {
      toast.error('Only the admin can edit templates');
      return;
    }

    try {
      const { error } = await supabase
        .from('contract_templates')
        .update({
          service_type: editedTemplate.service_type,
          content: editedTemplate.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editedTemplate.id);
      if (error) throw error;

      toast.success('Template updated successfully!');
      setTemplates(templates.map(t => t.id === editedTemplate.id ? editedTemplate : t));
      setIsEditTemplateOpen(false);
      setEditedTemplate(null);
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (user?.id !== '7ee81f6a-f817-4ef7-8947-75bb21901615') {
      toast.error('Only the admin can delete templates');
      return;
    }

    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        const { error } = await supabase
          .from('contract_templates')
          .delete()
          .eq('id', templateId);
        if (error) throw error;

        setTemplates(templates.filter(t => t.id !== templateId));
        toast.success('Template deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting template:', error);
        toast.error('Failed to delete template');
      }
    }
  };

  const downloadContractPDF = (content: string) => {
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const viewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setIsViewContractOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Contracts
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
          Contracts
        </h1>
        <p className="mt-2 text-gray-500">Manage contract templates and signed contracts.</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contract Templates</h2>
        {user?.id === '7ee81f6a-f817-4ef7-8947-75bb21901615' && (
          <button
            onClick={() => setIsAddTemplateOpen(true)}
            className="mb-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </button>
        )}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setEditedTemplate({ ...template }); setIsEditTemplateOpen(true); }}>
                    <td className="px-6 py-4 whitespace-nowrap">{template.service_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{template.content.substring(0, 50) + (template.content.length > 50 ? '...' : '')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(template.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user?.id === '7ee81f6a-f817-4ef7-8947-75bb21901615' && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }} className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Signed Contracts</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewContract(contract)}>
                    <td className="px-6 py-4 whitespace-nowrap">{contract.couple_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{contract.package_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{contract.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{contract.signed_at ? new Date(contract.signed_at).toLocaleString() : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(contract.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadContractPDF(contract.content); }}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAddTemplateOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Template</h3>
            <form onSubmit={handleAddTemplate} className="space-y-4">
              <div>
                <label htmlFor="service_type" className="block text-sm font-medium text-gray-700">Service Type</label>
                <input
                  type="text"
                  id="service_type"
                  value={newTemplate.service_type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, service_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
                <textarea
                  id="content"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddTemplateOpen(false)}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditTemplateOpen && editedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Template</h3>
            <form onSubmit={handleEditTemplate} className="space-y-4">
              <div>
                <label htmlFor="service_type" className="block text-sm font-medium text-gray-700">Service Type</label>
                <input
                  type="text"
                  id="service_type"
                  value={editedTemplate.service_type}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, service_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
                <textarea
                  id="content"
                  value={editedTemplate.content}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditTemplateOpen(false)}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewContractOpen && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Details</h3>
            <div className="space-y-4">
              <p><strong>Couple:</strong> {selectedContract.couple_name}</p>
              <p><strong>Package:</strong> {selectedContract.package_name}</p>
              <p><strong>Status:</strong> {selectedContract.status}</p>
              <p><strong>Signed At:</strong> {selectedContract.signed_at ? new Date(selectedContract.signed_at).toLocaleString() : 'N/A'}</p>
              <p><strong>Created At:</strong> {new Date(selectedContract.created_at).toLocaleString()}</p>
              <p><strong>Signature:</strong> {selectedContract.signature || 'Not signed'}</p>
              <div className="whitespace-pre-wrap">{selectedContract.content}</div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => downloadContractPDF(selectedContract.content)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={() => setIsViewContractOpen(false)}
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}