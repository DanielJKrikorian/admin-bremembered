import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Save, Upload, ArrowLeft, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  description: string;
  category_id: string;
  price: number;
  rental_available: boolean;
  stock_quantity: number;
  rental_quantity: number;
  images: string[] | null; // Allow null for images
  features: string[];
  specifications: any;
  created_at: string;
  updated_at: string;
  audience: string;
  category_name: string;
}

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    price: 0,
    rental_available: false,
    stock_quantity: 0,
    rental_quantity: 0,
    images: [] as string[],
    features: [] as string[],
    audience: '',
  });
  const [newImages, setNewImages] = useState<File[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productResponse, categoriesResponse] = await Promise.all([
          supabase.from('store_products').select('*').eq('id', id).single(),
          supabase.from('store_categories').select('id, name'),
        ]);

        if (productResponse.error) throw productResponse.error;
        if (categoriesResponse.error) throw categoriesResponse.error;

        const prod = productResponse.data;
        const cats = categoriesResponse.data;

        const productWithCategory = {
          ...prod,
          category_name: cats.find(c => c.id === prod.category_id)?.name || 'Unknown',
          images: prod.images || [], // Default to empty array if images is null
        };

        setProduct(productWithCategory);
        setCategories(cats);
        setFormData({
          name: productWithCategory.name,
          description: productWithCategory.description,
          category_id: productWithCategory.category_id,
          price: productWithCategory.price,
          rental_available: productWithCategory.rental_available,
          stock_quantity: productWithCategory.stock_quantity,
          rental_quantity: productWithCategory.rental_quantity,
          images: productWithCategory.images || [],
          features: productWithCategory.features,
          audience: productWithCategory.audience,
        });
      } catch (error: any) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!product) return;

    const imagePaths: string[] = [...formData.images];
    for (const file of newImages) {
      try {
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('store-images') // Updated to match new bucket name
          .upload(`products/${Date.now()}_${file.name}`, file, { upsert: true });
        if (uploadError) {
          if (uploadError.status === 404) {
            throw new Error('Storage bucket "store-images" not found. Please create it in the Supabase dashboard.');
          }
          throw uploadError;
        }
        imagePaths.push(uploadData.path);
      } catch (error: any) {
        console.error('Error uploading image:', error);
        toast.error(`Image upload failed: ${error.message}`);
        return; // Stop the save process if an image upload fails
      }
    }

    try {
      const { error } = await supabase
        .from('store_products')
        .update({
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id,
          price: formData.price,
          rental_available: formData.rental_available,
          stock_quantity: formData.stock_quantity,
          rental_quantity: formData.rental_quantity,
          images: imagePaths,
          features: formData.features,
          audience: formData.audience,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);
      if (error) throw error;

      setProduct({ ...product, ...formData, images: imagePaths });
      setEditMode(false);
      setNewImages([]);
      toast.success('Product updated successfully!');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Product not found</h3>
        <p className="text-gray-500">The requested product could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Product Details
        </h1>
        <p className="mt-2 text-gray-500">Manage this product.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            {editMode ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{product.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            {editMode ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{product.description}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            {editMode ? (
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm text-gray-900">{product.category_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price</label>
            {editMode ? (
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value, 10) || 0 })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">${product.price.toFixed(2)}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Rental Available</label>
            {editMode ? (
              <input
                type="checkbox"
                checked={formData.rental_available}
                onChange={(e) => setFormData({ ...formData, rental_available: e.target.checked })}
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{product.rental_available ? 'Yes' : 'No'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
            {editMode ? (
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value, 10) || 0 })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{product.stock_quantity}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Rental Quantity</label>
            {editMode ? (
              <input
                type="number"
                value={formData.rental_quantity}
                onChange={(e) => setFormData({ ...formData, rental_quantity: parseInt(e.target.value, 10) || 0 })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{product.rental_quantity}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Images</label>
            {editMode ? (
              <div>
                <input
                  type="file"
                  onChange={(e) => setNewImages(Array.from(e.target.files || []))}
                  multiple
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.images && formData.images.length > 0 && formData.images.map((img, index) => (
                  <img key={index} src={supabase.storage.from('store-images').getPublicUrl(img).data.publicUrl} alt={product.name} className="mt-2 h-20 object-cover" />
                ))}
              </div>
            ) : (
              <div className="mt-1 flex space-x-2">
                {product.images && product.images.length > 0 ? product.images.map((img, index) => (
                  <img key={index} src={supabase.storage.from('store-images').getPublicUrl(img).data.publicUrl} alt={product.name} className="h-20 object-cover" />
                )) : <p className="text-sm text-gray-500">No images available</p>}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Features</label>
            {editMode ? (
              <input
                type="text"
                value={formData.features.join(', ')}
                onChange={(e) => setFormData({ ...formData, features: e.target.value.split(',').map(f => f.trim()) })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{product.features.join(', ')}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Audience</label>
            {editMode ? (
              <select
                value={formData.audience}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="couple">Couple</option>
                <option value="vendor">Vendor</option>
              </select>
            ) : (
              <p className="mt-1 text-sm text-gray-900">{product.audience}</p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            {editMode ? (
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard/products')}
              className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}