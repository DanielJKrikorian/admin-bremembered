import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import SendEmailModal from '../components/SendEmailModal';

interface Email {
  id: string;
  vendor_id: string | null;
  couple_id: string | null;
  lead_id: string | null;
  subject: string;
  body: string;
  sent_at: string;
  status: string;
  recipient_name: string | null;
  recipient_email: string | null;
}

interface GroupedEmail {
  subject: string;
  count: number;
  sent_at: string;
  status: string;
  ids: string[];
}

export default function SendEmailPage() {
  const [emails, setEmails] = useState<GroupedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const emailsWithDetails = await Promise.all(data.map(async (email) => {
        let recipient_name = null;
        let recipient_email = null;

        if (email.vendor_id) {
          const { data: vendor } = await supabase
            .from('vendors')
            .select('name, user_id')
            .eq('id', email.vendor_id)
            .single();
          recipient_name = vendor?.name || 'Unknown Vendor';
          if (vendor?.user_id) {
            const { data: user } = await supabase
              .from('users')
              .select('email')
              .eq('id', vendor.user_id)
              .single();
            recipient_email = user?.email || 'No email';
          }
        } else if (email.couple_id) {
          const { data: couple } = await supabase
            .from('couples')
            .select('name, user_id')
            .eq('id', email.couple_id)
            .single();
          recipient_name = couple?.name || 'Unknown Couple';
          if (couple?.user_id) {
            const { data: user } = await supabase
              .from('users')
              .select('email')
              .eq('id', couple.user_id)
              .single();
            recipient_email = user?.email || 'No email';
          }
        } else if (email.lead_id) {
          const { data: lead } = await supabase
            .from('leads')
            .select('name, email')
            .eq('id', email.lead_id)
            .single();
          recipient_name = lead?.name || 'Unknown Lead';
          recipient_email = lead?.email || 'No email';
        }

        return { ...email, recipient_name, recipient_email };
      }));

      const groupedEmails: { [key: string]: GroupedEmail } = {};
      emailsWithDetails.forEach((email) => {
        if (!groupedEmails[email.subject]) {
          groupedEmails[email.subject] = {
            subject: email.subject,
            count: 0,
            sent_at: email.sent_at,
            status: email.status,
            ids: [],
          };
        }
        groupedEmails[email.subject].count += 1;
        if (new Date(email.sent_at) > new Date(groupedEmails[email.subject].sent_at)) {
          groupedEmails[email.subject].sent_at = email.sent_at;
        }
        if (groupedEmails[email.subject].status !== 'sent' && email.status === 'sent') {
          groupedEmails[email.subject].status = 'sent';
        }
        groupedEmails[email.subject].ids.push(email.id);
      });

      setEmails(Object.values(groupedEmails));
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const indexOfLastEmail = currentPage * emailsPerPage;
  const indexOfFirstEmail = indexOfLastEmail - emailsPerPage;
  const currentEmails = emails
    .filter((email) =>
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (email.count > 1 && `${email.count} emails`.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .slice(indexOfFirstEmail, indexOfLastEmail);
  const totalPages = Math.ceil(emails.length / emailsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Send Emails
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Send Emails
          </h1>
          <p className="mt-2 text-gray-500">Manage and view all sent emails.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Send Email
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Emails ({emails.length})</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by subject or count..."
            className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
            <p className="text-gray-500">Send a new email to get started.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentEmails.map((email) => (
                    <tr
                      key={email.subject}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/email/${email.ids[0]}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">{email.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{email.count} email(s)</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(email.sent_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{email.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/email/${email.ids[0]}`); }}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 flex justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => paginate(page)}
                  className={`mx-1 px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {page}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <SendEmailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onEmailSent={fetchData} />
    </div>
  );
}