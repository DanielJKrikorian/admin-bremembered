import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Download, Edit, Music, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO, addMinutes } from 'date-fns';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

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
  music_notes?: string;
  playlist_requests?: string;
  photo_shotlist?: string; // Added
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
          .select('id, title, description, event_date, event_time, location, type, duration_minutes, is_standard, music_notes, playlist_requests, photo_shotlist')
          .eq('couple_id', id)
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true });
        if (timelineError) throw timelineError;

        console.log("Fetched events:", timelineData); // Debugging: Log fetched events
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
          music_notes: selectedEvent.music_notes,
          playlist_requests: selectedEvent.playlist_requests,
          photo_shotlist: selectedEvent.photo_shotlist, // Added
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

  const downloadPDF = async () => {
    try {
      const logoUrl =
        "https://eecbrvehrhrvdzuutliq.supabase.co/storage/v1/object/public/public-1//2023_B%20Remembered%20Weddings_Refresh%20copy%202.png";
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const logoHeight = 40;

      // Load logo image
      const logoImg = new Image();
      logoImg.crossOrigin = "Anonymous";
      logoImg.src = logoUrl;
      await new Promise((resolve) => {
        logoImg.onload = resolve;
      });

      // Add logo to PDF (centered)
      const logoWidth = (logoImg.width * logoHeight) / logoImg.height;
      const logoX = (pdfWidth - logoWidth) / 2;
      pdf.addImage(logoImg, "PNG", logoX, margin, logoWidth, logoHeight);

      // Add couple and wedding details
      let position = margin + logoHeight + 10;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("Wedding Timeline", pdfWidth / 2, position, { align: "center" });
      position += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(14);
      if (coupleDetails?.name) {
        pdf.text(coupleDetails.name, pdfWidth / 2, position, { align: "center" });
        position += 7;
      }
      pdf.setFontSize(12);
      if (coupleDetails?.wedding_date) {
        pdf.text(
          `Date: ${format(parseISO(coupleDetails.wedding_date), "MMMM d, yyyy")}`,
          pdfWidth / 2,
          position,
          { align: "center" }
        );
        position += 7;
      }
      if (coupleDetails?.venue_name) {
        pdf.text(`Venue: ${coupleDetails.venue_name}`, pdfWidth / 2, position, {
          align: "center",
        });
        position += 10;
      }

      // Add timeline events
      pdf.setFont("helvetica", "bold");
      pdf.text("SCHEDULE", margin, position);
      position += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      events.forEach((event) => {
        if (position > pdfHeight - 20) {
          pdf.addPage();
          pdf.addImage(logoImg, "PNG", logoX, margin, logoWidth, logoHeight);
          position = margin + logoHeight + 10;
        }

        const eventTime = event.event_time
          ? format(parseISO(`2000-01-01T${event.event_time}`), "h:mm a")
          : "N/A";
        const endTime = event.duration_minutes && event.event_time
          ? format(
              addMinutes(parseISO(`2000-01-01T${event.event_time}`), event.duration_minutes),
              "h:mm a"
            )
          : null;

        pdf.setFont("helvetica", "bold");
        pdf.text(`${eventTime}${endTime ? ` - ${endTime}` : ""}: ${event.title}`, margin, position);
        position += 6;

        if (event.description) {
          pdf.setFont("helvetica", "normal");
          const descriptionLines = pdf.splitTextToSize(event.description, pdfWidth - 2 * margin - 5);
          pdf.text(descriptionLines, margin + 5, position);
          position += 6 * descriptionLines.length;
        }

        if (event.location) {
          pdf.setFont("helvetica", "normal");
          pdf.text(`Location: ${event.location}`, margin + 5, position);
          position += 6;
        }

        if (event.duration_minutes) {
          pdf.setFont("helvetica", "normal");
          pdf.text(`Duration: ${event.duration_minutes} minutes`, margin + 5, position);
          position += 6;
        }

        if (event.music_notes || event.playlist_requests) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Music Requests", margin + 5, position);
          position += 6;

          if (event.music_notes) {
            pdf.setFont("helvetica", "normal");
            const musicNotesLines = pdf.splitTextToSize(
              `Songs: ${event.music_notes}`,
              pdfWidth - 2 * margin - 5
            );
            pdf.text(musicNotesLines, margin + 10, position);
            position += 6 * musicNotesLines.length;
          }

          if (event.playlist_requests) {
            pdf.setFont("helvetica", "normal");
            const playlistLines = pdf.splitTextToSize(
              `Playlist: ${event.playlist_requests}`,
              pdfWidth - 2 * margin - 5
            );
            pdf.text(playlistLines, margin + 10, position);
            position += 6 * playlistLines.length;
          }
        }

        if (event.photo_shotlist) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Photo Shotlist", margin + 5, position);
          position += 6;

          pdf.setFont("helvetica", "normal");
          const shotlistLines = pdf.splitTextToSize(
            `Must-have shots: ${event.photo_shotlist}`,
            pdfWidth - 2 * margin - 5
          );
          pdf.text(shotlistLines, margin + 10, position);
          position += 6 * shotlistLines.length;
        }

        position += 4;
      });

      pdf.save(`timeline_${coupleDetails?.name || "unnamed"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
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
                            {event.event_time ? format(parseISO(`2000-01-01T${event.event_time}`), 'h:mm a') : 'N/A'}
                          </span>
                          <h3 className="ml-2 text-lg font-medium text-gray-900">
                            {event.title}
                          </h3>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-500">
                          {event.description && <p>{event.description}</p>}
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {format(parseISO(event.event_date), 'MMMM d, yyyy')}
                          </div>
                          {event.event_time && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {format(parseISO(`2000-01-01T${event.event_time}`), 'h:mm a')}
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
                          {(event.music_notes || event.playlist_requests) && (
                            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="flex items-center mb-2">
                                <Music className="w-4 h-4 text-purple-600 mr-2" />
                                <span className="text-sm font-medium text-purple-900">
                                  Music Requests
                                </span>
                              </div>
                              {event.music_notes && (
                                <p className="text-sm text-purple-800 mb-1">
                                  <strong>Songs:</strong> {event.music_notes}
                                </p>
                              )}
                              {event.playlist_requests && (
                                <p className="text-sm text-purple-800">
                                  <strong>Playlist:</strong> {event.playlist_requests}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <Camera className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-blue-900">Photo Shotlist</span>
                            </div>
                            <p className="text-blue-700 text-sm">
                              <strong>Must-have shots:</strong> {event.photo_shotlist || "No shotlist provided"}
                            </p>
                          </div>
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Specific Song Requests</label>
                          <textarea
                            value={selectedEvent.music_notes || ''}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, music_notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                            placeholder="e.g., 'Bridal party entrance song: Perfect by Ed Sheeran', 'First dance: At Last by Etta James'"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Playlist Requests & Preferences</label>
                          <textarea
                            value={selectedEvent.playlist_requests || ''}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, playlist_requests: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                            placeholder="e.g., 'Cocktail hour: Jazz and acoustic covers', 'Reception: Mix of 80s, 90s, and current hits', 'Do NOT play: Country music'"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Photo Shotlist</label>
                          <textarea
                            value={selectedEvent.photo_shotlist || ''}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, photo_shotlist: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                            placeholder="e.g., 'Bride and groom portrait, Family group shot, Cake cutting close-up'"
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
