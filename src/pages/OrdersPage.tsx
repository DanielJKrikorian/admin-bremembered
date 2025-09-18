import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Edit } from 'lucide-react';
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
  email: string | null;
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

interface FormState {
  status: string;
  tracking_number: string | null;
  shipping_provider: string | null;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [formStates, setFormStates] = useState<{ [key: string]: FormState }>({});
  const ordersPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ordersResponse, itemsResponse] = await Promise.all([
          supabase.from('store_orders').select('*'),
          supabase.from('store_order_items').select('*'),
        ]);

        if (ordersResponse.error) throw ordersResponse.error;
        if (itemsResponse.error) throw itemsResponse.error;

        const allUserIds = [...new Set(ordersResponse.data.map(o => o.user_id).filter(id => id))];
        const [couplesRes, vendorsRes] = await Promise.all([
          supabase.from('couples').select('user_id, name').in('user_id', allUserIds),
          supabase.from('vendors').select('user_id, name').in('user_id', allUserIds),
        ]);

        const nameMap = new Map<string, string>();
        (couplesRes.data || []).forEach(c => nameMap.set(c.user_id, c.name));
        (vendorsRes.data || []).forEach(v => nameMap.set(v.user_id, v.name));

        const ordersWithItems = await Promise.all(
          ordersResponse.data.map(async (order) => {
            const orderItems = itemsResponse.data.filter(item => item.order_id === order.id);
            const productIds = orderItems.map(item => item.product_id);

            const [productsRes, rentalPeriodsRes] = await Promise.all([
              supabase.from('store_products').select('id, name').in('id', productIds),
              supabase.from('rental_periods').select('*'),
            ]);

            const products = productsRes.data || [];
            const rentalPeriods = rentalPeriodsRes.data || [];

            const itemsWithDetails = orderItems.map(item => {
              const product = products.find(p => p.id === item.product_id);
              const rentalPeriod = rentalPeriods.find(r => r.id === item.rental_period_id);
              return {
                ...item,
                product_name: product?.name || 'Unknown Product',
                rental_duration: rentalPeriod?.duration_days,
                rental_price: rentalPeriod?.price,
              };
            });

            return {
              ...order,
              user_name: order.user_id ? nameMap.get(order.user_id) || 'Unknown' : 'Guest',
              email: order.email || 'N/A',
              items: itemsWithDetails,
            };
          })
        );

        setOrders(ordersWithItems);
        // Initialize form states
        const initialFormStates = ordersWithItems.reduce((acc, order) => ({
          ...acc,
          [order.id]: {
            status: order.status,
            tracking_number: order.tracking_number,
            shipping_provider: order.shipping_provider,
          },
        }), {});
        setFormStates(initialFormStates);
      } catch (error: any) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFormChange = (orderId: string, field: keyof FormState, value: string) => {
    setFormStates(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (orderId: string) => {
    try {
      const updates = {
        ...formStates[orderId],
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('store_orders')
        .update(updates)
        .eq('id', orderId);
      if (error) throw error;

      setOrders(orders.map(o => o.id === orderId ? { ...o, ...updates } : o));
      toast.success('Order updated successfully');
    } catch (err) {
      console.error('Error updating order:', err);
      toast.error('Failed to update order');
    }
  };

  const filteredOrders = selectedStatus === 'All'
    ? orders
    : orders.filter(order => order.status === selectedStatus);

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const paginate = (page: number) => setCurrentPage(page);

  const handleExportCSV = () => {
    const rows = [
      ['Order ID', 'User', 'Email', 'Status', 'Total Amount', 'Tracking Number', 'Shipping Provider'],
      ...filteredOrders.map(o => [
        o.id,
        o.user_name,
        o.email,
        o.status,
        (o.total_amount / 100).toFixed(2),
        o.tracking_number || '',
        o.shipping_provider || '',
      ]),
    ];
    const csv = rows.map(row => row.map(String).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'orders.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getOrderStats = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const relevant = orders.filter(o =>
      ['paid', 'processing', 'delivered', 'shipped'].includes(o.status.toLowerCase())
    );

    const purchased = relevant.filter(o => !o.items.some(i => i.is_rental));
    const rented = relevant.filter(o => o.items.some(i => i.is_rental));

    return {
      monthlyPurchased: purchased.filter(o => new Date(o.created_at).getMonth() === month && new Date(o.created_at).getFullYear() === year).length,
      monthlyRented: rented.filter(o => new Date(o.created_at).getMonth() === month && new Date(o.created_at).getFullYear() === year).length,
      yearlyPurchased: purchased.filter(o => new Date(o.created_at).getFullYear() === year).length,
      yearlyRented: rented.filter(o => new Date(o.created_at).getFullYear() === year).length,
      totalPurchasedAmount: purchased.reduce((sum, o) => sum + o.total_amount / 100, 0),
      totalRentedAmount: rented.reduce((sum, o) => sum + o.total_amount / 100, 0),
    };
  };

  const stats = getOrderStats();

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Orders
        </h1>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center">
        <Calendar className="h-8 w-8 text-blue-600 mr-3" />
        Orders
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Order Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {[
            { label: 'Purchased This Month', value: stats.monthlyPurchased },
            { label: 'Rented This Month', value: stats.monthlyRented },
            { label: 'Purchased This Year', value: stats.yearlyPurchased },
            { label: 'Rented This Year', value: stats.yearlyRented },
            { label: 'Total Purchased Amount', value: `$${stats.totalPurchasedAmount.toFixed(2)}` },
            { label: 'Total Rented Amount', value: `$${stats.totalRentedAmount.toFixed(2)}` },
          ].map((s, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">{s.label}</p>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {['All', 'pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'].map(s => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Export to CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentOrders.map(order => (
                <tr key={order.id}>
                  <td className="px-6 py-4">{order.id}</td>
                  <td className="px-6 py-4">{order.user_name}</td>
                  <td className="px-6 py-4">{order.email}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <select
                        value={formStates[order.id]?.status || order.status}
                        onChange={(e) => handleFormChange(order.id, 'status', e.target.value)}
                        className="border rounded px-2 py-1 w-full"
                      >
                        {['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'].map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      {formStates[order.id]?.status === 'shipped' && (
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Tracking Number"
                            value={formStates[order.id]?.tracking_number || ''}
                            onChange={(e) => handleFormChange(order.id, 'tracking_number', e.target.value)}
                            className="w-full border rounded px-2 py-1"
                          />
                          <input
                            type="text"
                            placeholder="Shipping Provider"
                            value={formStates[order.id]?.shipping_provider || ''}
                            onChange={(e) => handleFormChange(order.id, 'shipping_provider', e.target.value)}
                            className="w-full border rounded px-2 py-1"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => handleSubmit(order.id)}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Submit
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">${(order.total_amount / 100).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {order.tracking_number ? `${order.tracking_number} (${order.shipping_provider})` : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}