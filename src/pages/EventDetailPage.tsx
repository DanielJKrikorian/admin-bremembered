import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Edit, Save, X, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  couple_id: string;
  couple_name: string | null;
  vendor_id: string;
  vendor_name: string | null;
  start_time: string;
  end_time: string;
  type: string;
  title: string;
  created_at: string;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({ 
    title: false, 
    type: false, 
    start_time: false, 
    end_time: false 
  });
  const [formData, setFormData] = useState({ 
    title: '', 
    type: '', 
    start_time: '', 
    end_time: '' 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Event ID is undefined');

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, couple_id, vendor_id, start_time, end_time, type, title, created_at')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;

      // Lookup couple name
      let coupleName = null;
      if (eventData.couple_id) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('name')
          .eq('id', eventData.couple_id)
          .single();
        coupleName = coupleData?.name || 'Unknown';
      }

      // Lookup vendor name
      let vendorName = null;
      if (eventData.vendor_id) {
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('name')
          .eq('id', eventData.vendor_id)
          .single();
        vendorName = vendorData?.name || 'Unknown';
      }

      const newEvent = {
        ...eventData,
        couple_name: coupleName,
        vendor_name: vendorName
      };

      setEvent(newEvent);
      setFormData({ 
        title: eventData.title || '', 
        type: eventData.type || '', 
        start_time: eventData.start_time || '', 
        end_time: eventData.end_time || '' 
      });
    } catch (error: any) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
      navigate('/dashboard/bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field: string) => {
    if (!event) return;

    setLoading(true);
    try {
      const updateData = { [field]: formData[field] };
      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', event.id);

      if (error) throw error;

      setEvent(prev => prev ? { ...prev, ...updateData } : null);
      setEditMode(prev => ({ ...prev, [field]: false }));
      toast.success(`${field} updated successfully!`);
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Event: {event.title || event.type}
        </h1>
        <button
          onClick={() => navigate('/dashboard/bookings')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Bookings & Events
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Event Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Couple</label>
            <p className="text-sm text-gray-900">{event.couple_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Vendor</label>
            <p className="text-sm text-gray-900">{event.vendor_name}</p>
          </div>
          <div>
            {editMode.title ? (
              <>
                <label htmlFor="title" className="text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('title')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, title: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-sm text-gray-900">{event.title || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, title: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            {editMode.type ? (
              <>
                <label htmlFor="type" className="text-sm font-medium text-gray-700 mb-2">Type</label>
                <input
                  type="text"
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('type')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, type: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="text-sm text-gray-900">{event.type || 'N/A'}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, type: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            {editMode.start_time ? (
              <>
                <label htmlFor="start_time" className="text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  id="start_time"
                  value={formData.start_time ? new Date(formData.start_time).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('start_time')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading || !formData.start_time}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, start_time: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">Start Time</label>
                <p className="text-sm text-gray-900">{new Date(event.start_time).toLocaleString()}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, start_time: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
          <div>
            {editMode.end_time ? (
              <>
                <label htmlFor="end_time" className="text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="datetime-local"
                  id="end_time"
                  value={formData.end_time ? new Date(formData.end_time).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleSaveField('end_time')}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    disabled={loading || !formData.end_time}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(prev => ({ ...prev, end_time: false }))}
                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-500">End Time</label>
                <p className="text-sm text-gray-900">{new Date(event.end_time).toLocaleString()}</p>
                <button
                  onClick={() => setEditMode(prev => ({ ...prev, end_time: true }))}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
