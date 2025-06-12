import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface TimelineShare {
  id: string;
  couple_id: string;
  vendor_id: string | null;
  created_at: string;
  status: string;
  token: string;
  couple_name: string | null;
  vendor_name: string | null;
}

interface TimelineEvent {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  type: string;
  created_at: string;
  updated_at: string | null;
  duration_minutes: number | null;
  is_standard: boolean | null;
  couple_name: string | null;
}

interface Couple {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

export default function TimelinesPage() {
  const [shares, setShares] = useState<TimelineShare[]>([]);
  const [timelines, setTimelines] = useState<{ couple_id: string; couple_name: string; isShared: boolean; eventCount: number }[]>([]);
  const [allEvents, setAllEvents] = useState<TimelineEvent[]>([]); // Store all timeline events
  const [loading, setLoading] = useState(true);
  const [isAddShareOpen, setIsAddShareOpen] = useState(false);
  const [newShare, setNewShare] = useState({ couple_id: '', vendor_id: '' });
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Fetch timeline shares
        const { data: shareData, error: shareError } = await supabase
          .from('timeline_shares')
          .select('*')
          .order('created_at', { ascending: false });
        if (shareError) throw shareError;

        // Lookup couple names for shares
        const coupleIds = shareData.map(s => s.couple_id).filter(id => id);
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

        // Lookup vendor names for shares
        const vendorIds = shareData.map(s => s.vendor_id).filter(id => id);
        let vendorNames: { [key: string]: string } = {};
        if (vendorIds.length > 0) {
          const { data: vendors, error: vendorError } = await supabase
            .from('vendors')
            .select('id, name')
            .in('id', vendorIds);
          if (vendorError) throw vendorError;
          vendorNames = vendors.reduce((acc, vendor) => {
            acc[vendor.id] = vendor.name;
            return acc;
          }, {} as { [key: string]: string });
        }

        const mappedShares = shareData.map(share => ({
          ...share,
          couple_name: coupleNames[share.couple_id] || 'N/A',
          vendor_name: share.vendor_id ? vendorNames[share.vendor_id] || 'N/A' : 'N/A',
        }));
        setShares(mappedShares || []);

        // Fetch all timeline events
        const { data: timelineData, error: timelineError } = await supabase
          .from('timeline_events')
          .select('*')
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true });
        if (timelineError) throw timelineError;
        setAllEvents(timelineData || []);

        // Lookup couple names for timelines
        const timelineCoupleIds = [...new Set(timelineData.map(t => t.couple_id).filter(id => id))];
        let timelineCoupleNames: { [key: string]: string } = {};
        if (timelineCoupleIds.length > 0) {
          const { data: timelineCouples, error: timelineCoupleError } = await supabase
            .from('couples')
            .select('id, name')
            .in('id', timelineCoupleIds);
          if (timelineCoupleError) throw timelineCoupleError;
          timelineCoupleNames = timelineCouples.reduce((acc, couple) => {
            acc[couple.id] = couple.name;
            return acc;
          }, {} as { [key: string]: string });
        }

        // Group events by couple_id and check share status
        const timelineGroups = timelineCoupleIds.map(coupleId => {
          const coupleEvents = timelineData.filter(t => t.couple_id === coupleId);
          const isShared = mappedShares.some(s => s.couple_id === coupleId && s.status === 'active');
          return {
            couple_id: coupleId,
            couple_name: timelineCoupleNames[coupleId] || 'N/A',
            isShared,
            eventCount: coupleEvents.length,
          };
        });
        setTimelines(timelineGroups);
      } catch (error: any) {
        console.error('Error fetching timelines data:', error);
        toast.error('Failed to load timelines data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.id !== '7ee81f6a-f817-4ef7-8947-75bb21901615' || !newShare.couple_id || !newShare.vendor_id) {
      toast.error('Only the admin can add shares with valid couple and vendor IDs');
      return;
    }

    try {
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from('timeline_shares')
        .insert({
          couple_id: newShare.couple_id,
          vendor_id: newShare.vendor_id,
          created_at: new Date().toISOString(),
          status: 'active',
          token,
        });
      if (error) throw error;

      toast.success('Share added successfully!');
      setShares([...shares, { id: crypto.randomUUID(), couple_id: newShare.couple_id, vendor_id: newShare.vendor_id, created_at: new Date().toISOString(), status: 'active', token, couple_name: 'N/A', vendor_name: 'N/A' }]);
      setNewShare({ couple_id: '', vendor_id: '' });
      setIsAddShareOpen(false);
    } catch (error: any) {
      console.error('Error adding share:', error);
      toast.error('Failed to add share');
    }
  };

  const downloadTimelinePDF = (coupleId: string) => {
    const coupleTimeline = allEvents.filter(event => event.couple_id === coupleId);
    const element = document.createElement('div');
    element.innerHTML = `
      <h1>Wedding Timeline</h1>
      <div>${coupleTimeline.map(event => `
        <div>
          <h3>${event.title} (${new Date(`${event.event_date}T${event.event_time || '00:00'}`).toLocaleTimeString()} - ${event.duration_minutes ? `+${event.duration_minutes} min` : ''})</h3>
          <p>${event.description || ''}</p>
          <p>Location: ${event.location || 'N/A'}</p>
        </div>
      `).join('')}</div>
    `;
    element.style.padding = '20px';

    html2canvas(element).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 40;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 20, 20, pdfWidth, pdfHeight);
      pdf.save(`timeline_${coupleTimeline[0]?.couple_name || 'unnamed'}_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Timelines
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
          Timelines
        </h1>
        <p className="mt-2 text-gray-500">Manage timelines and shares.</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Timeline Shares</h2>
        {user?.id === '7ee81f6a-f817-4ef7-8947-75bb21901615' && (
          <button
            onClick={() => setIsAddShareOpen(true)}
            className="mb-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Share
          </button>
        )}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shares.map((share) => (
                  <tr key={share.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{share.couple_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{share.vendor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{share.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(share.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Timelines</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Couple</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shared with Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timelines.map((timeline) => (
                  <tr key={timeline.couple_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/dashboard/timelines/${timeline.couple_id}`)}>
                    <td className="px-6 py-4 whitespace-nowrap">{timeline.couple_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{timeline.isShared ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{timeline.eventCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(allEvents.find(e => e.couple_id === timeline.couple_id)?.created_at || '').toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadTimelinePDF(timeline.couple_id); }}
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

      {isAddShareOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Share</h3>
            <form onSubmit={handleAddShare} className="space-y-4">
              <div>
                <label htmlFor="couple_id" className="block text-sm font-medium text-gray-500">Couple ID</label>
                <input
                  type="text"
                  id="couple_id"
                  value={newShare.couple_id}
                  onChange={(e) => setNewShare({ ...newShare, couple_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-500">Vendor ID</label>
                <input
                  type="text"
                  id="vendor_id"
                  value={newShare.vendor_id}
                  onChange={(e) => setNewShare({ ...newShare, vendor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onClick={() => setIsAddShareOpen(false)}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}