import React, { useState } from 'react';
import { X, Users, Mail, Phone, Heart, Calendar, Save, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AddCoupleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback to refresh couples list
}

export default function AddCoupleModal({ isOpen, onClose, onSuccess }: AddCoupleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    partner1_name: '',
    partner2_name: '',
    wedding_date: '',
    budget: '',
    vibe_tags: '',
    phone: '',
    email: '',
    venue_name: '',
    guest_count: '',
    venue_city: '',
    venue_state: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Invalid email address');
      }

      // Create user in auth.users
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: formData.email.trim(),
        email_confirm: true,
        user_metadata: { role: 'couple' }
      });

      if (userError) {
        console.error('Error creating user:', userError);
        throw new Error(`Failed to create user: ${userError.message}`);
      }

      const userId = userData.user?.id;
      if (!userId) {
        throw new Error('User creation failed: No user ID returned');
      }

      // Insert couple into couples table
      const coupleData = {
        user_id: userId,
        name: formData.name.trim() || null,
        partner1_name: formData.partner1_name.trim() || null,
        partner2_name: formData.partner2_name.trim() || null,
        wedding_date: formData.wedding_date || null,
        budget: formData.budget ? parseInt(formData.budget) : null,
        vibe_tags: formData.vibe_tags
          ? formData.vibe_tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
          : [],
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        venue_name: formData.venue_name.trim() || null,
        guest_count: formData.guest_count ? parseInt(formData.guest_count) : null,
        venue_city: formData.venue_city.trim() || null,
        venue_state: formData.venue_state.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: coupleError } = await supabase
        .from('couples')
        .insert(coupleData);

      if (coupleError) {
        console.error('Error creating couple:', coupleError);
        // Clean up: delete user if couple insertion fails
        await supabase.auth.admin.deleteUser(userId);
        throw new Error(`Failed to create couple: ${coupleError.message}`);
      }

      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (resetError) {
        console.error('Error sending reset email:', resetError);
        toast.warn('Couple created, but failed to send password reset email');
      } else {
        toast.success('Couple added and password reset email sent!');
      }

      onSuccess(); // Refresh couples list
      onClose();
    } catch (error: any) {
      console.error('Error adding couple:', error);
      toast.error(error.message || 'Failed to add couple');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            Add New Couple
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Couple Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Smith & Johnson"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., couple@example.com"
              />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., (555) 123-4567"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="partner1_name" className="block text-sm font-medium text-gray-700 mb-1">Partner 1 Name</label>
              <input
                type="text"
                id="partner1_name"
                name="partner1_name"
                value={formData.partner1_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Alex"
              />
            </div>
            <div>
              <label htmlFor="partner2_name" className="block text-sm font-medium text-gray-700 mb-1">Partner 2 Name</label>
              <input
                type="text"
                id="partner2_name"
                name="partner2_name"
                value={formData.partner2_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Taylor"
              />
            </div>
          </div>
          <div>
            <label htmlFor="wedding_date" className="block text-sm font-medium text-gray-700 mb-1">Wedding Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                id="wedding_date"
                name="wedding_date"
                value={formData.wedding_date}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 50000"
            />
          </div>
          <div>
            <label htmlFor="vibe_tags" className="block text-sm font-medium text-gray-700 mb-1">Vibe Tags</label>
            <div className="relative">
              <Heart className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                id="vibe_tags"
                name="vibe_tags"
                value={formData.vibe_tags}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., rustic, modern, boho"
              />
            </div>
          </div>
          <div>
            <label htmlFor="guest_count" className="block text-sm font-medium text-gray-700 mb-1">Guest Count</label>
            <input
              type="number"
              id="guest_count"
              name="guest_count"
              value={formData.guest_count}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 150"
            />
          </div>
          <div>
            <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
            <input
              type="text"
              id="venue_name"
              name="venue_name"
              value={formData.venue_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Willow Creek Vineyard"
            />
          </div>
          <div>
            <label htmlFor="venue_city" className="block text-sm font-medium text-gray-700 mb-1">Venue City</label>
            <input
              type="text"
              id="venue_city"
              name="venue_city"
              value={formData.venue_city}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Napa"
            />
          </div>
          <div>
            <label htmlFor="venue_state" className="block text-sm font-medium text-gray-700 mb-1">Venue State</label>
            <input
              type="text"
              id="venue_state"
              name="venue_state"
              value={formData.venue_state}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., CA"
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim() || !formData.email.trim()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Couple
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}