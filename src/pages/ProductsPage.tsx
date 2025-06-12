import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Eye, Upload, Edit2, Trash2, Save, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  description: string;
  category_id: string;
  price: number; // Stored in cents
  rental_available: boolean;
  stock_quantity: number;
  rental_quantity: number;
  images: string[];
  features: string[];
  specifications: any;
  created_at: string;
  updated_at: string;
  audience: string;
  category_name: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [productSearchTerm, setProductSearchTerm] = useState(''); // Search for products
  const [categorySearchTerm, setCategorySearchTerm] = useState(''); // Search for categories
  const categoriesPerPage = 5;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsResponse, categoriesResponse] = await Promise.all([
          supabase.from('store_products').select('*'),
          supabase.from('store_categories').select('*'),
        ]);

        if (productsResponse.error) throw productsResponse.error;
        if (categoriesResponse.error) throw categoriesResponse.error;

        const cats = categoriesResponse.data;
        const prods = productsResponse.data.map(prod => ({
          ...prod,
          category_name: cats.find(c => c.id === prod.category_id)?.name || 'Unknown',
        }));

        setProducts(prods);
        setCategories(cats);
      } catch (error: any) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const files = formData.getAll('images') as File[];
    const imagePaths: string[] = [];

    for (const file of files) {
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('store-images') // Using hyphen instead of underscore
        .upload(`products/${Date.now()}_${file.name}`, file, { upsert: true });
      if (uploadError) throw uploadError;
      imagePaths.push(uploadData.path);
    }

    const newProduct = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      category_id: formData.get('category_id') as string,
      price: parseInt(formData.get('price') as string, 10) * 100 || 0, // Convert dollars to cents
      rental_available: formData.get('rental_available') === 'on',
      stock_quantity: parseInt(formData.get('stock_quantity') as string, 10) || 0,
      rental_quantity: parseInt(formData.get('rental_quantity') as string, 10) || 0,
      images: imagePaths,
      features: (formData.get('features') as string).split(',').map(f => f.trim()),
      specifications: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      audience: formData.get('audience') as string,
      variants: {},
    };

    try {
      const { error } = await supabase.from('store_products').insert([newProduct]);
      if (error) throw error;

      toast.success('Product added successfully!');
      setIsAddProductModalOpen(false);
      window.location.reload(); // Temporary; consider state update
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCategory = {
      name: newCategoryName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('store_categories').insert([newCategory]);
      if (error) throw error;

      setCategories([...categories, data[0]]);
      toast.success('Category added successfully!');
      setNewCategoryName('');
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategoryId) return;

    try {
      const { error } = await supabase
        .from('store_categories')
        .update({ name: editCategoryName, updated_at: new Date().toISOString() })
        .eq('id', editCategoryId);
      if (error) throw error;

      setCategories(categories.map(cat =>
        cat.id === editCategoryId ? { ...cat, name: editCategoryName, updated_at: new Date().toISOString() } : cat
      ));
      toast.success('Category updated successfully!');
      setEditCategoryId(null);
      setEditCategoryName('');
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const { error } = await supabase
          .from('store_categories')
          .delete()
          .eq('id', categoryId);
        if (error) throw error;

        setCategories(categories.filter(cat => cat.id !== categoryId));
        toast.success('Category deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting category:', error);
        toast.error('Failed to delete category');
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const { error } = await supabase
          .from('store_products')
          .delete()
          .eq('id', productId);
        if (error) throw error;

        setProducts(products.filter(p => p.id !== productId));
        toast.success('Product deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );
  const indexOfLastCategory = currentPage * categoriesPerPage;
  const indexOfFirstCategory = indexOfLastCategory - categoriesPerPage;
  const currentCategories = filteredCategories.slice(indexOfFirstCategory, indexOfLastCategory);
  const totalPages = Math.ceil(filteredCategories.length / categoriesPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.category_name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.audience.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Products
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-8 w-8 text-blue-600 mr-3" />
          Products
        </h1>
        <p className="mt-2 text-gray-500">Manage your products and categories.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
        <div className="mt-2">
          <input
            type="text"
            value={categorySearchTerm}
            onChange={(e) => { setCategorySearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search categories..."
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          />
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New Category Name"
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 mt-2"
          />
          <button
            onClick={handleAddCategory}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </button>
          <ul className="list-disc pl-5 mt-2">
            {currentCategories.map(cat => (
              <li key={cat.id} className="text-sm text-gray-700 flex items-center justify-between">
                {editCategoryId === cat.id ? (
                  <form onSubmit={handleEditCategory} className="flex-1 flex items-center space-x-2">
                    <input
                      type="text"
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      className="w-full max-w-xs px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditCategoryId(null); setEditCategoryName(''); }}
                      className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <span>{cat.name}</span>
                    <div>
                      <button
                        onClick={() => { setEditCategoryId(cat.id); setEditCategoryName(cat.name); }}
                        className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="inline-flex items-center px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {filteredCategories.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Products</h2>
            <p className="text-sm text-gray-500">Total Products: {products.length}</p>
          </div>
          <div className="relative">
            <input
              type="text"
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full max-w-xs pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={() => setIsAddProductModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </button>
        </div>
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">Add a new product to get started or adjust your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/dashboard/products/${product.id}`)}>
                    <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.category_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${(product.price / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.rental_available ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.audience}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/products/${product.id}`); }}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                        className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddProductModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Product</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  id="description"
                  name="description"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                />
              </div>
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  id="category_id"
                  name="category_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter price in dollars (e.g., 49.99)"
                />
              </div>
              <div>
                <label htmlFor="rental_available" className="block text-sm font-medium text-gray-700">Rental Available</label>
                <input
                  type="checkbox"
                  id="rental_available"
                  name="rental_available"
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                <input
                  type="number"
                  id="stock_quantity"
                  name="stock_quantity"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="rental_quantity" className="block text-sm font-medium text-gray-700">Rental Quantity</label>
                <input
                  type="number"
                  id="rental_quantity"
                  name="rental_quantity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700">Images</label>
                <input
                  type="file"
                  id="images"
                  name="images"
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="features" className="block text-sm font-medium text-gray-700">Features (comma-separated)</label>
                <input
                  type="text"
                  id="features"
                  name="features"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="audience" className="block text-sm font-medium text-gray-700">Audience</label>
                <select
                  id="audience"
                  name="audience"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="couple">Couple</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}