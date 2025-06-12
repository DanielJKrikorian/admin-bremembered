import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Trash2, Download, ArrowLeft, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FileUpload {
  id: string;
  vendor_id: string | null;
  couple_id: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  upload_date: string;
  expiry_date: string | null;
  created_at: string;
}

interface Couple {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

export default function StorageDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileUpload | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [filesResponse, couplesResponse, vendorsResponse] = await Promise.all([
          supabase
            .from('file_uploads')
            .select('*')
            .or(`couple_id.eq.${id},vendor_id.eq.${id}`),
          supabase.from('couples').select('id, name'),
          supabase.from('vendors').select('id, name'),
        ]);

        if (filesResponse.error) throw filesResponse.error;
        if (couplesResponse.error) throw couplesResponse.error;
        if (vendorsResponse.error) throw vendorsResponse.error;

        const mappedFiles = filesResponse.data.map(file => ({
          ...file,
          file_path: file.file_path.trim(),
        }));

        setFiles(mappedFiles);

        const couple = couplesResponse.data.find(c => c.id === id);
        const vendor = vendorsResponse.data.find(v => v.id === id);
        setOwnerName(couple ? couple.name : vendor ? vendor.name : 'Unknown');
      } catch (error: any) {
        console.error('Error fetching storage details:', error);
        toast.error('Failed to load storage details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleDelete = async (fileId: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        const { error } = await supabase
          .from('file_uploads')
          .delete()
          .eq('id', fileId);
        if (error) throw error;

        toast.success('File deleted successfully!');
        setFiles(files.filter(file => file.id !== fileId));
      } catch (error: any) {
        console.error('Error deleting file:', error);
        toast.error('Failed to delete file');
      }
    }
  };

  const handleDownload = async (filePath: string) => {
    try {
      const path = filePath.replace(/^vendor_media\//, '');
      const { data, error } = await supabase.storage
        .from('vendor_media')
        .download(path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'file';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('File downloaded successfully!');
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDownloadAll = async () => {
    try {
      const zip = new JSZip();
      for (const file of files) {
        const path = file.file_path.replace(/^vendor_media\//, '');
        const { data, error } = await supabase.storage
          .from('vendor_media')
          .download(path);
        if (error) {
          console.error(`Error downloading ${file.file_name}:`, error);
          continue;
        }
        zip.file(file.file_name, data);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${ownerName || 'files'}.zip`);
      toast.success('All files zipped and downloaded!');
    } catch (error: any) {
      console.error('Error zipping files:', error);
      toast.error('Failed to download all files');
    }
  };

  const handleView = async (file: FileUpload) => {
    try {
      setSelectedFile(file);
      const path = file.file_path.replace(/^vendor_media\//, '');
      const { data, error } = await supabase.storage
        .from('vendor_media')
        .createSignedUrl(path, 3600);
      if (error) {
        toast.error('File not found or inaccessible');
        setSelectedFile(null);
        setImageUrl(null);
        return;
      }
      setImageUrl(data.signedUrl);
    } catch (error: any) {
      console.error('Error viewing file:', error);
      toast.error('Failed to load image');
      setSelectedFile(null);
      setImageUrl(null);
    }
  };

  const totalSizeBytes = files.reduce((sum, file) => sum + file.file_size, 0);
  const getSizeUnit = (bytes: number) => {
    if (bytes >= 1099511627776) return { value: bytes / 1099511627776, unit: 'TB' };
    if (bytes >= 1073741824) return { value: bytes / 1073741824, unit: 'GB' };
    return { value: bytes / 1048576, unit: 'MB' };
  };
  const { value, unit } = getSizeUnit(totalSizeBytes);
  const totalSize = `${value.toFixed(2)} ${unit}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
        <p className="text-gray-500">No files are available for {ownerName}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard/storage')}
          className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Storage Details for {ownerName}
        </h1>
        <button
          onClick={handleDownloadAll}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Download All
        </button>
      </div>

      <p className="text-gray-500">Total Storage Used: {totalSize}</p>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map(file => (
                <tr key={file.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{file.file_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(file.file_size / 1048576).toFixed(2)} MB</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(file.upload_date).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{file.expiry_date ? new Date(file.expiry_date).toLocaleString() : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleView(file)} className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-4 w-4 inline-block mr-1" /> View
                    </button>
                    <button onClick={() => handleDownload(file.file_path)} className="text-green-600 hover:text-green-900">
                      <Download className="h-4 w-4 inline-block mr-1" /> Download
                    </button>
                    <button onClick={() => handleDelete(file.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4 inline-block mr-1" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedFile && imageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{selectedFile.file_name}</h3>
            <img src={imageUrl} alt={selectedFile.file_name} className="w-full h-auto rounded mb-4" />
            <div className="text-right">
              <button
                onClick={() => setSelectedFile(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
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
