import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Save, Truck, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  shipping_address: any;
  payment_intent_id: string;
  created_at: string;
  updated_at: string;
  vendor_id: string | null;
  tax_amount: number;
  tracking_number: string | null;
  shipping_provider: string | null;
  coupon_code: string | null;
  shipping_fee: number;
  shipping_method: string | null;
  coupon_discount: number | null;
  user_name: string;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    is_rental: boolean;
    rental_period_id: string | null;
    rental_start_date: string | null;
    rental_end_date: string | null;
    created_at: string;
    updated_at: string;
    variants: string;
    product_name: string;
    rental_duration?: number;
    rental_price?: number;
  }[];
}

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingProvider, setShippingProvider] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [orderResponse, itemsResponse] = await Promise.all([
          supabase.from('store_orders').select('*').eq('id', id).single(),
          supabase.from('store_order_items').select('*').eq('order_id', id),
        ]);

        if (orderResponse.error) throw orderResponse.error;
        if (itemsResponse.error) throw itemsResponse.error;

        const userId = orderResponse.data.user_id;

        const [couplesRes, vendorsRes, productsRes, rentalsRes] = await Promise.all([
          supabase.from('couples').select('user_id, name').eq('user_id', userId),
          supabase.from('vendors').select('user_id, name').eq('user_id', userId),
          supabase.from('store_products').select('id, name').in('id', itemsResponse.data.map((i: any) => i.product_id)),
          supabase.from('rental_periods').select('*'),
        ]);

        const user_name =
          couplesRes.data?.[0]?.name || vendorsRes.data?.[0]?.name || 'Unknown';

        const products = productsRes.data || [];
        const rentalPeriods = rentalsRes.data || [];

        const itemsWithDetails = itemsResponse.data.map((item: any) => {
          const product = products.find((p: any) => p.id === item.product_id);
          const rentalPeriod = rentalPeriods.find((r: any) => r.id === item.rental_period_id);
          return {
            ...item,
            product_name: product?.name || 'Unknown Product',
            rental_duration: rentalPeriod?.duration_days,
            rental_price: rentalPeriod?.price,
          };
        });

        const fullOrder = {
          ...orderResponse.data,
          user_name,
          items: itemsWithDetails,
        };

        setOrder(fullOrder);
        setNewStatus(fullOrder.status);
        setTrackingNumber(fullOrder.tracking_number || '');
        setShippingProvider(fullOrder.shipping_provider || '');
      } catch (error: any) {
        console.error('Error fetching order:', error);
        toast.error('Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSaveStatus = async () => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('store_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;

      setOrder({ ...order, status: newStatus });
      toast.success('Order status updated!');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleSaveTracking = async () => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('store_orders')
        .update({ tracking_number: trackingNumber, shipping_provider: shippingProvider, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;

      setOrder({ ...order, tracking_number: trackingNumber, shipping_provider: shippingProvider });
      toast.success('Tracking information updated!');
    } catch (error: any) {
      console.error('Error updating tracking:', error);
      toast.error('Failed to update tracking information');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order not found</h3>
          <p className="text-gray-500">The requested order could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              Order Details
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage and view order details.</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/orders')}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Orders
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Order ID</label>
                <p className="mt-1 text-gray-900">{order.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User</label>
                <p className="mt-1 text-gray-900">{order.user_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1 flex items-center space-x-4">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'].map(status => (
                      <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveStatus}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    Save
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tracking</label>
                <div className="mt-1 space-y-2">
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={shippingProvider}
                    onChange={(e) => setShippingProvider(e.target.value)}
                    placeholder="Shipping Provider"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSaveTracking}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Truck className="h-5 w-5 mr-2" />
                    Update Tracking
                  </button>
                  {order.tracking_number && (
                    <p className="text-sm text-gray-600">Tracking: {order.tracking_number} ({order.shipping_provider || 'Unknown'})</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created At</label>
                <p className="mt-1 text-gray-900">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Updated At</label>
                <p className="mt-1 text-gray-900">{new Date(order.updated_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                <p className="mt-1 text-gray-900">${(order.total_amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Shipping Address</label>
                <p className="mt-1 text-gray-900">{JSON.stringify(order.shipping_address)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Intent ID</label>
                <p className="mt-1 text-gray-900">{order.payment_intent_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vendor ID</label>
                <p className="mt-1 text-gray-900">{order.vendor_id || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Amount</label>
                <p className="mt-1 text-gray-900">${(order.tax_amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Coupon Code</label>
                <p className="mt-1 text-gray-900">{order.coupon_code || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Shipping Fee</label>
                <p className="mt-1 text-gray-900">${(order.shipping_fee / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Shipping Method</label>
                <p className="mt-1 text-gray-900">{order.shipping_method || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Coupon Discount</label>
                <p className="mt-1 text-gray-900">${((order.coupon_discount || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Items</label>
                <ul className="mt-1 space-y-2">
                  {order.items.map(item => (
                    <li key={item.id} className="text-gray-700">
                      <span className="font-medium">{item.product_name}</span> x{item.quantity} - $
                      {(item.unit_price / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {item.is_rental && item.rental_period_id && (
                        <span className="ml-2 text-gray-600">
                          (Rental: {item.rental_duration} days, $
                          {((item.rental_price || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}