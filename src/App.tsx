import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { VendorsPage } from './pages/VendorsPage';
import VendorDetailPage from './pages/VendorDetailPage';
import EditVendorPage from './pages/EditVendorPage';
import { CouplesPage } from './pages/CouplesPage';
import CoupleDetailPage from './pages/CoupleDetailPage';
import BookingAndEventsPage from './pages/BookingAndEventsPage';
import BookingDetailPage from './pages/BookingDetailPage';
import EventDetailPage from './pages/EventDetailPage';
import VenuesPage from './pages/VenuesPage';
import VenueDetailsPage from './pages/VenueDetailsPage';
import ServicePackagesPage from './pages/ServicePackagesPage';
import ServicePackageDetailsPage from './pages/ServicePackageDetailsPage';
import PaymentsPage from './pages/PaymentsPage';
import PaymentDetailsPage from './pages/PaymentDetailsPage';
import SendEmailPage from './pages/SendEmailPage';
import SendEmailDetailsPage from './pages/SendEmailDetailsPage';
import LeadsPage from './pages/LeadsPage';
import LeadDetailsPage from './pages/LeadDetailsPage';
import ForumPage from './pages/ForumPage';
import ForumPostDetailsPage from './pages/ForumPostDetailsPage';
import ReviewsPage from './pages/ReviewsPage';
import SupportReviewsPage from './pages/SupportReviewsPage';
import ContractsPage from './pages/ContractsPage';
import TimelinesPage from './pages/TimelinesPage';
import TimelineDetailsPage from './pages/TimelineDetailsPage';
import IssuesPage from './pages/IssuesPage';
import IssueDetailsPage from './pages/IssueDetailsPage';
import JobBoardPage from './pages/JobBoardPage';
import JobBoardDetailsPage from './pages/JobBoardDetailsPage';
import StorageSubscriptionsPage from './pages/StorageSubscriptionsPage';
import StorageDetailsPage from './pages/StorageDetailsPage';
import FAQPage from './pages/FAQPage';
import FAQDetailsPage from './pages/FAQDetailsPage';
import MessagesPage from './pages/MessagesPage';
import MessageDetailsPage from './pages/MessageDetailsPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import InvoicePage from './pages/InvoicePage';
import InvoiceDetailsPage from './pages/InvoiceDetailsPage';
import BlogPostManagement from './pages/BlogPostManagement';
import BlogPostDetailsPage from './pages/BlogPostDetailsPage';
import VendorApplicationsPage from './pages/VendorApplicationsPage';
import VendorApplicationDetailsPage from './pages/VendorApplicationDetailsPage';
import ErrorBoundary from './components/ErrorBoundary';
import AdminChatPage from './pages/AdminChatPage';
import AdminChatDetailsPage from './pages/AdminChatDetailsPage.tsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="vendors" element={<VendorsPage />} />
              <Route
                path="vendor/:id"
                element={
                  <ErrorBoundary>
                    <VendorDetailPage />
                  </ErrorBoundary>
                }
              />
              <Route path="vendor/:id/edit" element={<EditVendorPage />} />
              <Route path="couples" element={<CouplesPage />} />
              <Route path="couplespage" element={<Navigate to="/dashboard/couples" replace />} /> {/* Fallback for old path */}
              <Route
                path="couple/:id"
                element={
                  <ErrorBoundary>
                    <CoupleDetailPage />
                  </ErrorBoundary>
                }
              />
              <Route path="bookings" element={<BookingAndEventsPage />} />
              <Route
                path="booking/:id"
                element={
                  <ErrorBoundary>
                    <BookingDetailPage />
                  </ErrorBoundary>
                }
              />
                <Route path="vendor-application" element={<VendorApplicationsPage />} />
              <Route
                path="vendor-application/:id"
                element={
                  <ErrorBoundary>
                    <VendorApplicationDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="event/:id"
                element={
                  <ErrorBoundary>
                    <EventDetailPage />
                  </ErrorBoundary>
                }
              />
              <Route path="venues" element={<VenuesPage />} />
              <Route
                path="venue/:id"
                element={
                  <ErrorBoundary>
                    <VenueDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="service-packages" element={<ServicePackagesPage />} />
              <Route
                path="service-package/:id"
                element={
                  <ErrorBoundary>
                    <ServicePackageDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="payments" element={<PaymentsPage />} />
              <Route
                path="payment/:id"
                element={
                  <ErrorBoundary>
                    <PaymentDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="send-emails" element={<SendEmailPage />} />
              <Route
                path="email/:id"
                element={
                  <ErrorBoundary>
                    <SendEmailDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="leads" element={<LeadsPage />} />
              <Route
                path="lead/:id"
                element={
                  <ErrorBoundary>
                    <LeadDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="forum" element={<ForumPage />} />
              <Route
                path="forum/:id"
                element={
                  <ErrorBoundary>
                    <ForumPostDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="support-reviews" element={<SupportReviewsPage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="timelines" element={<TimelinesPage />} />
              <Route
                path="timelines/:id"
                element={
                  <ErrorBoundary>
                    <TimelineDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="issues" element={<IssuesPage />} />
              <Route
                path="issues/:id"
                element={
                  <ErrorBoundary>
                    <IssueDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="job-board" element={<JobBoardPage />} />
              <Route
                path="job-board/:id"
                element={
                  <ErrorBoundary>
                    <JobBoardDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="storage" element={<StorageSubscriptionsPage />} />
              <Route
                path="storage/:id"
                element={
                  <ErrorBoundary>
                    <StorageDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="faq" element={<FAQPage />} />
              <Route
                path="faq/:id"
                element={
                  <ErrorBoundary>
                    <FAQDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="messages" element={<MessagesPage />} />
              <Route
                path="messages/:id"
                element={
                  <ErrorBoundary>
                    <MessageDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="chats" element={<AdminChatPage />} />
              <Route
                path="chats/:session_id"
                element={
                  <ErrorBoundary>
                    <AdminChatDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="blogposts" element={<BlogPostManagement />} />
              <Route
                  path="blogposts/:id"
                  element={
                    <ErrorBoundary>
                      <BlogPostDetailsPage />
                    </ErrorBoundary>
                  }
                />
              <Route path="messages/new" element={<MessagesPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route
                path="orders/:id"
                element={
                  <ErrorBoundary>
                    <OrderDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="products" element={<ProductsPage />} />
              <Route
                path="products/:id"
                element={
                  <ErrorBoundary>
                    <ProductDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="invoices" element={<InvoicePage />} />
              <Route
                path="invoices/:id"
                element={
                  <ErrorBoundary>
                    <InvoiceDetailsPage />
                  </ErrorBoundary>
                }
              />
              <Route path="emails" element={<div className="p-8 text-center text-gray-500">Email notifications page coming soon</div>} />
              <Route path="logs" element={<div className="p-8 text-center text-gray-500">Import history page coming soon</div>} />
            </Route>
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;