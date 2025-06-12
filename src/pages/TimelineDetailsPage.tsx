import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Download, Edit } from 'lucide-react'; // Added Edit icon
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  type: string;
  duration_minutes: number | null;
  is_standard: boolean | null;
}

interface CoupleDetails {
  name: string;
  wedding_date: string;
  venue_name: string;
  venue_street_address: string;
}

export default function TimelineDetailsPage() {
  const { id } = useParams<{ id: string }>(); // id is couple_id
  const navigate = useNavigate();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [coupleDetails, setCoupleDetails] = useState<CoupleDetails | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimelineDetails = async () => {
      try {
        setIsLoading(true);
        const { data: coupleData, error: coupleError } = await supabase
          .from('couples')
          .select('id, name, wedding_date, venue_name, venue_street_address')
          .eq('id', id)
          .single();
        if (coupleError) throw coupleError;

        const { data: timelineData, error: timelineError } = await supabase
          .from('timeline_events')
          .select('*')
          .eq('couple_id', id)
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true });
        if (timelineError) throw timelineError;

        setCoupleDetails(coupleData);
        setEvents(timelineData || []);
      } catch (error) {
        console.error('Error fetching timeline details:', error);
        toast.error('Failed to load timeline details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimelineDetails();
  }, [id]);

  const toggleEditEvent = (event: TimelineEvent) => {
    setSelectedEvent(event);
  };

  const handleSaveEvent = async () => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from('timeline_events')
        .update({
          title: selectedEvent.title,
          description: selectedEvent.description,
          event_date: selectedEvent.event_date,
          event_time: selectedEvent.event_time,
          location: selectedEvent.location,
          duration_minutes: selectedEvent.duration_minutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedEvent.id);
      if (error) throw error;

      toast.success('Event updated successfully!');
      setEvents(events.map(e => e.id === selectedEvent.id ? selectedEvent : e));
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  const downloadPDF = () => {
    const element = document.createElement('div');
    element.innerHTML = `
      <h1>Wedding Timeline</h1>
      <div>${events.map(event => `
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
      pdf.save(`timeline_${coupleDetails?.name || 'unnamed'}_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Timeline Details
          </h1>
          <p className="mt-2 text-gray-500">View and edit timeline events.</p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Timeline Events</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div className="divide-y divide-gray-100">
                {events.map((event, index) => (
                  <div key={event.id} className="p-6 relative">
                    <div className="absolute left-8 top-8 w-4 h-4 rounded-full bg-blue-500 transform -translate-x-1/2"></div>
                    <div className="ml-12 flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {event.event_time ? new Date(`2000-01-01T${event.event_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </span>
                          <h3 className="ml-2 text-lg font-medium text-gray-900">
                            {event.title}
                          </h3>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-500">
                          {event.description && <p>{event.description}</p>}
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(event.event_date).toLocaleDateString()}
                          </div>
                          {event.event_time && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {new Date(`2000-01-01T${event.event_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                          {event.duration_minutes && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {event.duration_minutes} minutes
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {event.location}
                            </div>
                          )}
                          {index < events.length - 1 && (
                            <div>
                              {(() => {
                                const currentDateTime = new Date(`${event.event_date}T${event.event_time || '00:00'}`);
                                if (event.duration_minutes) {
                                  currentDateTime.setMinutes(currentDateTime.getMinutes() + event.duration_minutes);
                                }
                                const nextDateTime = new Date(`${events[index + 1].event_date}T${events[index + 1].event_time || '00:00'}`);
                                const diffMinutes = Math.round((nextDateTime.getTime() - currentDateTime.getTime()) / (1000 * 60));
                                if (diffMinutes < 0) {
                                  return <span className="text-red-500">Warning: Events overlap by {Math.abs(diffMinutes)} minutes</span>;
                                } else if (diffMinutes === 0) {
                                  return <span>Next event starts immediately</span>;
                                } else if (diffMinutes < 60) {
                                  return <span>{diffMinutes} minute break</span>;
                                } else {
                                  const hours = Math.floor(diffMinutes / 60);
                                  const minutes = diffMinutes % 60;
                                  return (
                                    <span>
                                      {hours} hour{hours !== 1 ? 's' : ''}
                                      {minutes > 0 ? ` ${minutes} minute${minutes !== 1 ? 's' : ''}` : ''} break
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleEditEvent(event); }}
                        className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                    </div>
                    {selectedEvent && selectedEvent.id === event.id && (
                      <div className="mt-2 space-y-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Title</label>
                          <input
                            type="text"
                            value={selectedEvent.title}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            value={selectedEvent.description || ''}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date</label>
                          <input
                            type="date"
                            value={selectedEvent.event_date}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, event_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Time</label>
                          <input
                            type="time"
                            value={selectedEvent.event_time || ''}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, event_time: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Location</label>
                          <input
                            type="text"
                            value={selectedEvent.location || ''}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, location: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                          <input
                            type="number"
                            value={selectedEvent.duration_minutes || ''}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, duration_minutes: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={handleSaveEvent}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setSelectedEvent(null)}
                            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mt-4">
            <button
              onClick={downloadPDF}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}