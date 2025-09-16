import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Recipient {
  id: string;
  name: string;
  email: string;
  type: 'vendor' | 'couple' | 'lead' | 'blog_subscription' | 'custom';
  weddingDate?: string;
}

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSent: () => void;
}

export default function SendEmailModal({ isOpen, onClose, onEmailSent }: SendEmailModalProps) {
  const [vendors, setVendors] = useState<Recipient[]>([]);
  const [couples, setCouples] = useState<Recipient[]>([]);
  const [leads, setLeads] = useState<Recipient[]>([]);
  const [blogSubscribers, setBlogSubscribers] = useState<Recipient[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [deselectedRecipients, setDeselectedRecipients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const quillRef = useRef<ReactQuill>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      [{ color: [] }, { background: [] }],
      [{ font: [] }],
      [{ align: [] }],
      ['clean'],
    ],
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    setIsFetching(true);
    try {
      const vendorsPromise = supabase.from('vendors').select('id, name, user_id');
      const couplesPromise = supabase.from('couples').select('id, name, user_id, wedding_date');
      const leadsPromise = supabase.from('leads').select('id, name, email, partner_name');
      const subscribersPromise = supabase
        .from('blog_subscriptions')
        .select('id, name, email')
        .eq('status', 'subscribed')
        .is('unsubscribed_at', null);

      const [vendorsResult, couplesResult, leadsResult, subscribersResult] = await Promise.all([
        vendorsPromise,
        couplesPromise,
        leadsPromise,
        subscribersPromise,
      ]);

      if (vendorsResult.error) throw vendorsResult.error;
      if (couplesResult.error) throw couplesResult.error;
      if (leadsResult.error) throw leadsResult.error;
      if (subscribersResult.error) throw subscribersResult.error;

      const userIds = [
        ...vendorsResult.data.map((v) => v.user_id).filter((id): id is string => !!id),
        ...couplesResult.data.map((c) => c.user_id).filter((id): id is string => !!id),
      ];
      let userEmails: { [key: string]: string } = {};
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds);
        if (usersError) {
          console.warn(`Failed to fetch user emails: ${usersError.message}`);
          toast.warn('Some user emails could not be fetched. Check database permissions.');
        } else {
          userEmails = users.reduce((acc: { [key: string]: string }, user: { id: string; email: string }) => {
            acc[user.id] = user.email;
            return acc;
          }, {});
        }
      }

      const vendorsData = vendorsResult.data
        .map((vendor) => {
          const email = vendor.user_id ? userEmails[vendor.user_id] : '';
          if (!email) {
            console.warn(`No email found for vendor ${vendor.id} (user_id: ${vendor.user_id})`);
            return null;
          }
          return { id: vendor.id, name: vendor.name, email, type: 'vendor' };
        })
        .filter((v): v is Recipient => v !== null);

      const couplesData = couplesResult.data
        .map((couple) => {
          const email = couple.user_id ? userEmails[couple.user_id] : '';
          if (!email) {
            console.warn(`No email found for couple ${couple.id} (user_id: ${couple.user_id})`);
            return null;
          }
          return {
            id: couple.id,
            name: couple.name,
            email,
            type: 'couple',
            weddingDate: couple.wedding_date ? new Date(couple.wedding_date).toLocaleDateString() : undefined,
          };
        })
        .filter((c): c is Recipient => c !== null);

      const leadsData = leadsResult.data.map((lead) => ({
        id: lead.id,
        name: lead.partner_name ? `${lead.name} & ${lead.partner_name}` : lead.name,
        email: lead.email,
        type: 'lead',
      }));

      const subscribersData = subscribersResult.data.map((sub) => ({
        id: sub.id,
        name: sub.name || 'Subscriber',
        email: sub.email,
        type: 'blog_subscription',
      }));

      setVendors(vendorsData || []);
      setCouples(couplesData || []);
      setLeads(leadsData || []);
      setBlogSubscribers(subscribersData || []);

      console.log('Vendors:', vendorsData);
      console.log('Couples:', couplesData);
      console.log('Leads:', leadsData);
      console.log('Subscribers:', subscribersData);

      if (vendorsData.length === 0 && couplesData.length === 0 && leadsData.length === 0 && subscribersData.length === 0) {
        toast.warn('No valid recipients found. Check user data and permissions.');
      }
    } catch (error: any) {
      console.error('Error in fetchOptions:', error);
      toast.error('Failed to load recipients: ' + error.message);
      setVendors([]);
      setCouples([]);
      setLeads([]);
      setBlogSubscribers([]);
    } finally {
      setIsFetching(false);
    }
  };

  const handleGroupToggle = (group: string) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
    setDeselectedRecipients(new Set());
  };

  const handleSelectAll = (group: string) => {
    setDeselectedRecipients((prev) => {
      const newSet = new Set(prev);
      const groupRecipients = getGroupRecipients(group);
      groupRecipients.forEach((r) => newSet.delete(r.id));
      return newSet;
    });
  };

  const handleUnselectAll = (group: string) => {
    setDeselectedRecipients((prev) => {
      const newSet = new Set(prev);
      const groupRecipients = getGroupRecipients(group);
      groupRecipients.forEach((r) => newSet.add(r.id));
      return newSet;
    });
  };

  const handleDeselectRecipient = (recipientId: string) => {
    setDeselectedRecipients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(recipientId)) {
        newSet.delete(recipientId);
      } else {
        newSet.add(recipientId);
      }
      return newSet;
    });
  };

  const getGroupRecipients = (group: string): Recipient[] => {
    switch (group) {
      case 'vendors':
        return vendors || [];
      case 'couples':
        return couples || [];
      case 'leads':
        return leads || [];
      case 'blog_subscriptions':
        return blogSubscribers || [];
      default:
        return [];
    }
  };

  const getAllRecipients = (): Recipient[] => {
    const all = [
      ...(vendors || []),
      ...(couples || []),
      ...(leads || []),
      ...(blogSubscribers || []),
    ];
    return all.filter((r, index, self) => self.findIndex((t) => t.email === r.email) === index);
  };

  const filteredRecipients = getAllRecipients().filter((recipient) =>
    recipient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSelectedRecipients = () => {
    const allRecipients = getAllRecipients();
    if (!allRecipients) return [];
    return allRecipients.filter((r) => !deselectedRecipients.has(r.id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input clicked, change event triggered');
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setAttachment(file);
      toast.success('PDF attached successfully!');
    } else {
      setAttachment(null);
      toast.error('Please select a valid PDF file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAttachmentClick = () => {
    console.log('Attachment button clicked');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Send Email button clicked');
    setLoading(true);

    try {
      const recipients = getSelectedRecipients();
      if (recipients.length === 0 && !recipientEmail) {
        throw new Error('Please select at least one recipient or enter an email address');
      }

      const emailData: any = {
        recipients: recipients.map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          type: r.type,
        })),
        subject,
        body,
      };

      if (recipientEmail) {
        emailData.recipients.push({
          id: 'custom',
          email: recipientEmail,
          name: 'Custom Recipient',
          type: 'custom',
        });
      }

      let attachmentUrl = null;
      if (attachment) {
        const fileName = `${Date.now()}_${attachment.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('email-attachments')
          .upload(fileName, attachment, {
            contentType: 'application/pdf',
          });

        if (uploadError) {
          throw new Error(`Failed to upload attachment: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('email-attachments')
          .getPublicUrl(fileName);

        attachmentUrl = urlData.publicUrl;
        emailData.attachment = {
          name: attachment.name,
          url: attachmentUrl,
        };
      }

      const { error, data, status } = await supabase.functions.invoke('admin-email-system', {
        body: emailData,
      });

      console.log('Function response:', { error, data, status });

      if (error) throw error;

      toast.success(
        data.errors?.length
          ? `Sent ${data.sent.length} email(s), ${data.errors.length} failed`
          : 'Email(s) sent successfully!'
      );
      onEmailSent();
      onClose();
      setSubject('');
      setBody('');
      setSelectedGroups([]);
      setDeselectedRecipients(new Set());
      setRecipientEmail('');
      setSearchQuery('');
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(`Failed to send email: ${error.message || 'Internal server error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    console.log('Cancel button clicked');
    onClose();
  };

  const handleBackdropClick = () => {
    console.log('Backdrop clicked, closing modal');
    onClose();
  };

  const isSendDisabled = loading || (getSelectedRecipients().length === 0 && !recipientEmail) || !subject || !body || isFetching;

  const sendButtonTooltip = isSendDisabled
    ? (isFetching
        ? 'Loading recipients...'
        : (getSelectedRecipients().length === 0 && !recipientEmail)
        ? 'Select at least one recipient or enter an email'
        : !subject
        ? 'Subject is required'
        : !body
        ? 'Email body is required'
        : 'Sending in progress')
    : '';

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleBackdropClick}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex justify-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500 pointer-events-auto cancel-button"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Send Email
                </Dialog.Title>
                {isFetching ? (
                  <div className="text-center">Loading recipients...</div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Select Recipient Groups</label>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {['vendors', 'couples', 'leads', 'blog_subscriptions'].map((group) => (
                          <div key={group} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedGroups.includes(group)}
                              onChange={() => handleGroupToggle(group)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                              {group
                                .replace('blog_subscriptions', 'Blog Subscribers')
                                .replace('_', ' ')
                                .split(' ')
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectAll(group)}
                              className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnselectAll(group)}
                              className="text-xs text-red-600 hover:text-red-800 ml-1"
                            >
                              Unselect All
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Search All Recipients</label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search all recipients..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                        {filteredRecipients.map((recipient) => (
                          <div key={recipient.id} className="flex items-center py-1">
                            <input
                              type="checkbox"
                              checked={!deselectedRecipients.has(recipient.id)}
                              onChange={() => handleDeselectRecipient(recipient.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {recipient.name}
                              {recipient.type === 'couple' && recipient.weddingDate && (
                                <span className="ml-2 text-xs text-gray-500">({recipient.weddingDate})</span>
                              )}
                              {' ('}
                              {recipient.email}
                              {') - '}
                              {recipient.type.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700">
                        Single Recipient Email (Optional)
                      </label>
                      <input
                        type="email"
                        id="recipientEmail"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter a single email address"
                      />
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
                      <input
                        type="text"
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="attachment" className="block text-sm font-medium text-gray-700">
                        Attach PDF (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={handleAttachmentClick}
                        className="mt-1 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Choose PDF
                      </button>
                      <input
                        type="file"
                        id="attachment"
                        ref={fileInputRef}
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {attachment && (
                        <p className="mt-1 text-sm text-gray-600">
                          Attached: {attachment.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="body" className="block text-sm font-medium text-gray-700">Body</label>
                      <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={body}
                        onChange={setBody}
                        modules={quillModules}
                        className="h-64 mb-6"
                      />
                    </div>
                  </div>
                )}
                <div className="mt-8 flex justify-end space-x-2 z-60 button-container">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSendDisabled}
                      title={sendButtonTooltip}
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed pointer-events-auto"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5 mr-2" />
                          Send Email
                        </>
                      )}
                    </button>
                    {isSendDisabled && sendButtonTooltip && (
                      <span className="absolute top-full mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded-md shadow-md">
                        {sendButtonTooltip}
                      </span>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}