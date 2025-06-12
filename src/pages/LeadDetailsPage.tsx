import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Plus, Edit, Trash2, Save } from 'lucide-react'; // Added Save import
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Lead {
  id: string;
  name: string;
  email: string;
  source: string;
  status: string;
  vendor_id: string | null;
  created_at: string;
  phone: string | null;
  preferred_contact_method: string | null;
  wedding_date: string | null;
  city: string | null;
  services_requested: string | null;
  form_notes: string | null;
  response_status: string | null;
  lead_source: string | null;
  updated_at: string | null;
  state: string | null;
  partner_name: string | null;
  referral_source: string | null;
  photography_hours: number | null;
  videography_hours: number | null;
  dj_hours: number | null;
  coordination_hours: number | null;
  budget_range: string | null;
  service_type: string | null;
}

interface LeadNote {
  id: string;
  lead_id: string;
  note_text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function LeadDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedNoteText, setEditedNoteText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadAndNotes();
  }, [id]);

  const fetchLeadAndNotes = async () => {
    try {
      setLoading(true);
      if (!id) throw new Error('Lead ID is undefined');

      const [leadData, notesData] = await Promise.all([
        supabase.from('leads').select('*').eq('id', id).single(),
        supabase.from('lead_notes').select('*').eq('lead_id', id)
      ]);
      if (leadData.error) throw leadData.error;
      if (notesData.error) throw notesData.error;
      setLead(leadData.data);
      setNotes(notesData.data || []);
    } catch (error: any) {
      console.error('Error fetching lead or notes:', error);
      toast.error('Failed to load lead details');
      navigate('/dashboard/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const { error } = await supabase
        .from('lead_notes')
        .insert({
          lead_id: id,
          note_text: newNote,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });
      if (error) throw error;

      setNewNote('');
      fetchLeadAndNotes();
      toast.success('Note added successfully!');
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const handleEditNote = (note: LeadNote) => {
    setEditingNoteId(note.id);
    setEditedNoteText(note.note_text);
  };

  const handleSaveEdit = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('lead_notes')
        .update({ note_text: editedNoteText, updated_at: new Date().toISOString() })
        .eq('id', noteId);
      if (error) throw error;

      setEditingNoteId(null);
      setEditedNoteText('');
      fetchLeadAndNotes();
      toast.success('Note updated successfully!');
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('lead_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;

      setNotes(notes.filter(note => note.id !== noteId));
      toast.success('Note deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  if (loading || !lead) {
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
          Lead Details: {lead.name}
        </h1>
        <button
          onClick={() => navigate('/dashboard/leads')}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Leads
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Lead Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="text-sm font-medium text-gray-500">Name</label><p className="text-sm text-gray-900">{lead.name}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Email</label><p className="text-sm text-gray-900">{lead.email}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Source</label><p className="text-sm text-gray-900">{lead.source}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Status</label><p className="text-sm text-gray-900">{lead.status}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Vendor ID</label><p className="text-sm text-gray-900">{lead.vendor_id || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Phone</label><p className="text-sm text-gray-900">{lead.phone || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Preferred Contact</label><p className="text-sm text-gray-900">{lead.preferred_contact_method || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Wedding Date</label><p className="text-sm text-gray-900">{lead.wedding_date ? new Date(lead.wedding_date).toLocaleDateString() : 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">City</label><p className="text-sm text-gray-900">{lead.city || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Services Requested</label><p className="text-sm text-gray-900">{lead.services_requested || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Form Notes</label><p className="text-sm text-gray-900">{lead.form_notes || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Response Status</label><p className="text-sm text-gray-900">{lead.response_status || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Lead Source</label><p className="text-sm text-gray-900">{lead.lead_source || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Updated At</label><p className="text-sm text-gray-900">{lead.updated_at ? new Date(lead.updated_at).toLocaleString() : 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">State</label><p className="text-sm text-gray-900">{lead.state || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Partner Name</label><p className="text-sm text-gray-900">{lead.partner_name || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Referral Source</label><p className="text-sm text-gray-900">{lead.referral_source || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Photography Hours</label><p className="text-sm text-gray-900">{lead.photography_hours || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Videography Hours</label><p className="text-sm text-gray-900">{lead.videography_hours || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">DJ Hours</label><p className="text-sm text-gray-900">{lead.dj_hours || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Coordination Hours</label><p className="text-sm text-gray-900">{lead.coordination_hours || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Budget Range</label><p className="text-sm text-gray-900">{lead.budget_range || 'N/A'}</p></div>
          <div><label className="text-sm font-medium text-gray-500">Service Type</label><p className="text-sm text-gray-900">{lead.service_type || 'N/A'}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          Notes
        </h2>
        {notes.map((note) => (
          <div key={note.id} className="mb-4 p-4 bg-gray-50 rounded-lg relative">
            {editingNoteId === note.id ? (
              <>
                <textarea
                  value={editedNoteText}
                  onChange={(e) => setEditedNoteText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
                />
                <button
                  onClick={() => handleSaveEdit(note.id)}
                  className="mt-2 inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-900">{note.note_text}</p>
                <p className="text-xs text-gray-500 mt-1">Added by: {note.created_by} on {new Date(note.created_at).toLocaleString()}</p>
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button
                    onClick={() => handleEditNote(note)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        <form onSubmit={handleAddNote} className="mt-4 space-y-4">
          <div>
            <label htmlFor="newNote" className="block text-sm font-medium text-gray-700">Add Note</label>
            <textarea
              id="newNote"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
              placeholder="Enter note here..."
              required
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </button>
        </form>
      </div>
    </div>
  );
}