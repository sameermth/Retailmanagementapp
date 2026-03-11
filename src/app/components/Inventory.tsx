import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, AlertTriangle, Package } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
  unitType: "quantity" | "weight"; // New field to distinguish between count and weight
  costPrice: number;
  sellingPrice: number;
  wholesalePrice: number; // New field for B2B pricing
  supplier: string;
  location: string;
  gstRate: number; // GST rate percentage for this item
  status: "in-stock" | "low-stock" | "out-of-stock";
}

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: "",
    sku: "",
    category: "",
    quantity: 0,
    reorderLevel: 10,
    unit: "pcs",
    unitType: "quantity",
    costPrice: 0,
    sellingPrice: 0,
    wholesalePrice: 0,
    supplier: "",
    location: "",
    gstRate: 18, // Default GST rate
    status: "in-stock",
  });

  useEffect(() => {
    const stored = localStorage.getItem("inventory");
    if (stored) {
      setInventory(JSON.parse(stored));
    }
  }, []);

  const saveToLocalStorage = (data: InventoryItem[]) => {
    localStorage.setItem("inventory", JSON.stringify(data));
    setInventory(data);
  };

  const determineStatus = (quantity: number, reorderLevel: number): "in-stock" | "low-stock" | "out-of-stock" => {
    if (quantity === 0) return "out-of-stock";
    if (quantity <= reorderLevel) return "low-stock";
    return "in-stock";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const status = determineStatus(formData.quantity || 0, formData.reorderLevel || 10);
    
    if (editingId) {
      const updated = inventory.map((item) =>
        item.id === editingId ? { ...formData, id: editingId, status } as InventoryItem : item
      );
      saveToLocalStorage(updated);
    } else {
      const newItem: InventoryItem = {
        ...formData,
        id: Date.now().toString(),
        status,
      } as InventoryItem;
      saveToLocalStorage([...inventory, newItem]);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      category: "",
      quantity: 0,
      reorderLevel: 10,
      unit: "pcs",
      unitType: "quantity",
      costPrice: 0,
      sellingPrice: 0,
      wholesalePrice: 0,
      supplier: "",
      location: "",
      gstRate: 18, // Default GST rate
      status: "in-stock",
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData(item);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      const filtered = inventory.filter((item) => item.id !== id);
      saveToLocalStorage(filtered);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || item.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2">Inventory</h1>
          <p className="text-gray-600">Manage your product inventory</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm">Item</th>
                <th className="text-left px-6 py-3 text-sm">SKU</th>
                <th className="text-left px-6 py-3 text-sm">Category</th>
                <th className="text-right px-6 py-3 text-sm">Quantity</th>
                <th className="text-right px-6 py-3 text-sm">Cost Price</th>
                <th className="text-right px-6 py-3 text-sm">Selling Price</th>
                <th className="text-left px-6 py-3 text-sm">Status</th>
                <th className="text-center px-6 py-3 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div>{item.name}</div>
                        <div className="text-sm text-gray-500">{item.supplier}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{item.sku}</td>
                  <td className="px-6 py-4 text-sm">{item.category}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div>{item.quantity} {item.unit}</div>
                    {item.quantity <= item.reorderLevel && (
                      <div className="text-xs text-orange-600 flex items-center justify-end gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        Reorder at {item.reorderLevel}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">₹{item.costPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right">₹{item.sellingPrice.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        item.status === "in-stock"
                          ? "bg-green-100 text-green-700"
                          : item.status === "low-stock"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInventory.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No inventory items found
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl mb-6">
              {editingId ? "Edit Inventory Item" : "Add New Inventory Item"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Category *</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Unit Type *</label>
                  <select
                    value={formData.unitType}
                    onChange={(e) => {
                      const unitType = e.target.value as "quantity" | "weight";
                      setFormData({ 
                        ...formData, 
                        unitType,
                        unit: unitType === "weight" ? "kg" : "pcs"
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="quantity">Quantity (Pieces)</option>
                    <option value="weight">Weight</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {formData.unitType === "weight" ? (
                      <>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="lbs">Pounds (lbs)</option>
                        <option value="oz">Ounce (oz)</option>
                        <option value="ton">Ton</option>
                      </>
                    ) : (
                      <>
                        <option value="pcs">Pieces (pcs)</option>
                        <option value="box">Box</option>
                        <option value="carton">Carton</option>
                        <option value="dozen">Dozen</option>
                        <option value="pack">Pack</option>
                        <option value="unit">Unit</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Reorder Level *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2">Cost Price (per {formData.unit}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Retail Price (per {formData.unit}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Wholesale Price (per {formData.unit}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.wholesalePrice}
                    onChange={(e) => setFormData({ ...formData, wholesalePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Price for distributors/shops"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">GST Rate (%) *</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>0% - Exempt</option>
                    <option value={5}>5% - Essential goods</option>
                    <option value={12}>12% - Standard goods</option>
                    <option value={18}>18% - General goods</option>
                    <option value={28}>28% - Luxury goods</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Storage Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Warehouse A, Shelf 3"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingId ? "Update" : "Add"} Item
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
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