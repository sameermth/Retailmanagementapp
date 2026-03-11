import React, { useState, useEffect } from "react";
import { Plus, Search, Eye, Trash2, Download, FileText, ArrowRight } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  sellingPrice: number;
  wholesalePrice: number;
  unit: string;
  unitType: "quantity" | "weight";
  gstRate: number;
}

interface InvoiceItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unit: string;
  price: number;
  gstRate: number;
  gstAmount: number;
  total: number;
}

interface InvoiceParent {
  id: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerType: "retail" | "wholesale";
  items: InvoiceItem[];
  subtotal: number;
  totalGst: number;
  grandTotal: number;
}

interface Invoice extends InvoiceParent{
  invoiceNumber: string;
  status: "paid" | "unpaid" | "cancelled";
  paymentMethod?: string;
}

interface Quotation extends InvoiceParent{
  quotationNumber: string;
  validUntil: string;
  status: "pending" | "accepted" | "rejected" | "converted";
  notes?: string;
}

export function Invoices() {
  const [activeTab, setActiveTab] = useState<"invoices" | "quotations">("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"invoice" | "quotation">("invoice");
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    customerType: "retail" as "retail" | "wholesale",
    date: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    paymentMethod: "cash",
    notes: "",
  });

  useEffect(() => {
    const storedInvoices = localStorage.getItem("invoices");
    const storedQuotations = localStorage.getItem("quotations");
    const storedInventory = localStorage.getItem("inventory");
    const storedCustomers = localStorage.getItem("customers");
    
    if (storedInvoices) setInvoices(JSON.parse(storedInvoices));
    if (storedQuotations) setQuotations(JSON.parse(storedQuotations));
    if (storedInventory) setInventory(JSON.parse(storedInventory));
    if (storedCustomers) setCustomers(JSON.parse(storedCustomers));
  }, []);

  const saveInvoicesToLocalStorage = (data: Invoice[]) => {
    localStorage.setItem("invoices", JSON.stringify(data));
    setInvoices(data);
  };

  const saveQuotationsToLocalStorage = (data: Quotation[]) => {
    localStorage.setItem("quotations", JSON.stringify(data));
    setQuotations(data);
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000);
    return `INV-${year}${month}-${random}`;
  };

  const generateQuotationNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000);
    return `QUO-${year}${month}-${random}`;
  };

  const addItemToInvoice = (itemId: string, quantity: number) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item || quantity <= 0) return;

    const existingItemIndex = invoiceItems.findIndex((i) => i.itemId === itemId);
    
    if (existingItemIndex >= 0) {
      const updated = [...invoiceItems];
      updated[existingItemIndex].quantity += quantity;
      const lineTotal = updated[existingItemIndex].quantity * item.sellingPrice;
      updated[existingItemIndex].gstAmount = (lineTotal * item.gstRate) / 100;
      updated[existingItemIndex].total = lineTotal + updated[existingItemIndex].gstAmount;
      setInvoiceItems(updated);
    } else {
      const lineTotal = quantity * item.sellingPrice;
      const gstAmount = (lineTotal * item.gstRate) / 100;
      const newItem: InvoiceItem = {
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        quantity,
        unit: item.unit,
        price: item.sellingPrice,
        gstRate: item.gstRate,
        gstAmount,
        total: lineTotal + gstAmount,
      };
      setInvoiceItems([...invoiceItems, newItem]);
    }
  };

  const removeItemFromInvoice = (itemId: string) => {
    setInvoiceItems(invoiceItems.filter((i) => i.itemId !== itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromInvoice(itemId);
      return;
    }

    const updated = invoiceItems.map((item) => {
      if (item.itemId === itemId) {
        const lineTotal = quantity * item.price;
        const gstAmount = (lineTotal * item.gstRate) / 100;
        return {
          ...item,
          quantity,
          gstAmount,
          total: lineTotal + gstAmount,
        };
      }
      return item;
    });
    setInvoiceItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const totalGst = invoiceItems.reduce((sum, item) => sum + item.gstAmount, 0);
    const grandTotal = subtotal + totalGst;
    return { subtotal, totalGst, grandTotal };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceItems.length === 0) {
      alert("Please add at least one item");
      return;
    }

    const { subtotal, totalGst, grandTotal } = calculateTotals();
    
    if (formType === "invoice") {
      const newInvoice: Invoice = {
        id: Date.now().toString(),
        invoiceNumber: generateInvoiceNumber(),
        date: formData.date,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        customerType: formData.customerType,
        items: invoiceItems,
        subtotal,
        totalGst,
        grandTotal,
        status: "unpaid",
        paymentMethod: formData.paymentMethod,
      };
      saveInvoicesToLocalStorage([...invoices, newInvoice]);
    } else {
      const newQuotation: Quotation = {
        id: Date.now().toString(),
        quotationNumber: generateQuotationNumber(),
        date: formData.date,
        validUntil: formData.validUntil,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        customerType: formData.customerType,
        items: invoiceItems,
        subtotal,
        totalGst,
        grandTotal,
        status: "pending",
        notes: formData.notes
      };
      saveQuotationsToLocalStorage([...quotations, newQuotation]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerAddress: "",
      customerType: "retail" as "retail" | "wholesale",
      date: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      paymentMethod: "cash",
      notes: "",
    });
    setInvoiceItems([]);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      const filtered = invoices.filter((inv) => inv.id !== id);
      saveInvoicesToLocalStorage(filtered);
    }
  };

  const handleDeleteQuotation = (id: string) => {
    if (confirm("Are you sure you want to delete this quotation?")) {
      const filtered = quotations.filter((quo) => quo.id !== id);
      saveQuotationsToLocalStorage(filtered);
    }
  };

  const updateInvoiceStatus = (id: string, status: "paid" | "unpaid" | "cancelled") => {
    const updated = invoices.map((inv) =>
      inv.id === id ? { ...inv, status } : inv
    );
    saveInvoicesToLocalStorage(updated);
  };

  const updateQuotationStatus = (id: string, status: "pending" | "accepted" | "rejected" | "converted") => {
    const updated = quotations.map((quo) =>
      quo.id === id ? { ...quo, status } : quo
    );
    saveQuotationsToLocalStorage(updated);
  };

  const convertQuotationToInvoice = (quotation: Quotation) => {
    if (quotation.status === "converted") {
      alert("This quotation has already been converted to an invoice");
      return;
    }

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: generateInvoiceNumber(),
      date: new Date().toISOString().split("T")[0],
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      customerType: "retail",
      items: quotation.items,
      subtotal: quotation.subtotal,
      totalGst: quotation.totalGst,
      grandTotal: quotation.grandTotal,
      status: "unpaid",
    };

    saveInvoicesToLocalStorage([...invoices, newInvoice]);
    updateQuotationStatus(quotation.id, "converted");
    setViewQuotation(null);
    alert(`Quotation ${quotation.quotationNumber} has been converted to Invoice ${newInvoice.invoiceNumber}`);
  };

  const selectCustomer = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerAddress: customer.address,
      });
    }
  };

  const filteredInvoices = invoices.filter((inv) =>
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuotations = quotations.filter((quo) =>
    quo.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quo.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { subtotal, totalGst, grandTotal } = calculateTotals();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl mb-2">Invoices & Quotations</h1>
          <p className="text-gray-600">Manage invoices and quotations with GST</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFormType("quotation");
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <FileText className="w-4 h-4" />
            New Quotation
          </button>
          <button
            onClick={() => {
              setFormType("invoice");
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === "invoices"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab("quotations")}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === "quotations"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Quotations ({quotations.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Invoices Table */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm">Invoice #</th>
                  <th className="text-left px-6 py-3 text-sm">Date</th>
                  <th className="text-left px-6 py-3 text-sm">Customer</th>
                  <th className="text-right px-6 py-3 text-sm">Subtotal</th>
                  <th className="text-right px-6 py-3 text-sm">GST</th>
                  <th className="text-right px-6 py-3 text-sm">Total</th>
                  <th className="text-left px-6 py-3 text-sm">Status</th>
                  <th className="text-center px-6 py-3 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">{invoice.customerName}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      ₹{invoice.subtotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-orange-600">
                      ₹{invoice.totalGst.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      ₹{invoice.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={invoice.status}
                        onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value as any)}
                        className={`text-xs px-2 py-1 rounded border-0 ${
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "unpaid"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewInvoice(invoice)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
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
            {filteredInvoices.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No invoices found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quotations Table */}
      {activeTab === "quotations" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm">Quotation #</th>
                  <th className="text-left px-6 py-3 text-sm">Date</th>
                  <th className="text-left px-6 py-3 text-sm">Valid Until</th>
                  <th className="text-left px-6 py-3 text-sm">Customer</th>
                  <th className="text-right px-6 py-3 text-sm">Total</th>
                  <th className="text-left px-6 py-3 text-sm">Status</th>
                  <th className="text-center px-6 py-3 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{quotation.quotationNumber}</td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(quotation.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(quotation.validUntil).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">{quotation.customerName}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      ₹{quotation.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={quotation.status}
                        onChange={(e) => updateQuotationStatus(quotation.id, e.target.value as any)}
                        disabled={quotation.status === "converted"}
                        className={`text-xs px-2 py-1 rounded border-0 ${
                          quotation.status === "accepted"
                            ? "bg-green-100 text-green-700"
                            : quotation.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : quotation.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="converted">Converted</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewQuotation(quotation)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        {quotation.status !== "converted" && (
                          <button
                            onClick={() => convertQuotationToInvoice(quotation)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Convert to Invoice"
                          >
                            <ArrowRight className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteQuotation(quotation.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredQuotations.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No quotations found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full my-8">
            <h2 className="text-2xl mb-6">Create New {formType === "invoice" ? "Invoice" : "Quotation"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm mb-2">Select Customer (Optional)</label>
                <select
                  onChange={(e) => selectCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a customer or enter manually --</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {formType === "quotation" && (
                <div>
                  <label className="block text-sm mb-2">Valid Until *</label>
                  <input
                    type="date"
                    required
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm mb-2">Address</label>
                <textarea
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              {formType === "quotation" && (
                <div>
                  <label className="block text-sm mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Terms and conditions, special notes..."
                  />
                </div>
              )}

              {/* Add Items */}
              <div className="border-t pt-4">
                <h3 className="text-lg mb-4">Items</h3>
                
                <div className="flex gap-2 mb-4">
                  <select
                    id="itemSelect"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select an item --</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - ₹{item.sellingPrice} (GST: {item.gstRate}%)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    id="itemQuantity"
                    min="1"
                    defaultValue="1"
                    placeholder="Qty"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const select = document.getElementById("itemSelect") as HTMLSelectElement;
                      const qtyInput = document.getElementById("itemQuantity") as HTMLInputElement;
                      if (select.value) {
                        addItemToInvoice(select.value, parseInt(qtyInput.value) || 1);
                        select.value = "";
                        qtyInput.value = "1";
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                  >
                    Add Item
                  </button>
                </div>

                {/* Items List */}
                {invoiceItems.length > 0 && (
                  <div className="border rounded-lg overflow-hidden mb-4">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-2 text-sm">Item</th>
                            <th className="text-right px-4 py-2 text-sm">Price</th>
                            <th className="text-right px-4 py-2 text-sm">Qty</th>
                            <th className="text-right px-4 py-2 text-sm">GST%</th>
                            <th className="text-right px-4 py-2 text-sm">GST</th>
                            <th className="text-right px-4 py-2 text-sm">Total</th>
                            <th className="text-center px-4 py-2 text-sm w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {invoiceItems.map((item) => (
                            <tr key={item.itemId}>
                              <td className="px-4 py-2 text-sm">
                                <div>{item.itemName}</div>
                                <div className="text-xs text-gray-500">{item.sku}</div>
                              </td>
                              <td className="px-4 py-2 text-sm text-right">₹{item.price.toFixed(2)}</td>
                              <td className="px-4 py-2 text-sm text-right">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(item.itemId, parseInt(e.target.value) || 0)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm text-right">{item.gstRate}%</td>
                              <td className="px-4 py-2 text-sm text-right text-orange-600">
                                ₹{item.gstAmount.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-sm text-right">
                                ₹{item.total.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeItemFromInvoice(item.itemId)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Totals */}
                {invoiceItems.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2 text-orange-600">
                      <span>Total GST:</span>
                      <span>₹{totalGst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg border-t pt-2">
                      <span>Grand Total:</span>
                      <span>₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create {formType === "invoice" ? "Invoice" : "Quotation"}
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

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full my-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl mb-2">INVOICE</h2>
                <p className="text-gray-600">{viewInvoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Date</p>
                <p>{new Date(viewInvoice.date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm text-gray-600 mb-2">Bill To:</h3>
              <p className="font-semibold">{viewInvoice.customerName}</p>
              {viewInvoice.customerEmail && <p className="text-sm">{viewInvoice.customerEmail}</p>}
              {viewInvoice.customerPhone && <p className="text-sm">{viewInvoice.customerPhone}</p>}
              {viewInvoice.customerAddress && <p className="text-sm">{viewInvoice.customerAddress}</p>}
            </div>

            <table className="w-full mb-8">
              <thead className="border-b-2 border-gray-300">
                <tr>
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">GST Rate</th>
                  <th className="text-right py-2">GST Amount</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {viewInvoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3">
                      <div>{item.itemName}</div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                    </td>
                    <td className="text-right py-3">${item.price.toFixed(2)}</td>
                    <td className="text-right py-3">{item.quantity}</td>
                    <td className="text-right py-3">{item.gstRate}%</td>
                    <td className="text-right py-3 text-orange-600">${item.gstAmount.toFixed(2)}</td>
                    <td className="text-right py-3">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm mb-2">GST Breakdown:</h3>
              {Array.from(new Set(viewInvoice.items.map(i => i.gstRate))).map(rate => {
                const itemsWithRate = viewInvoice.items.filter(i => i.gstRate === rate);
                const gstForRate = itemsWithRate.reduce((sum, i) => sum + i.gstAmount, 0);
                const taxableAmount = itemsWithRate.reduce((sum, i) => sum + (i.quantity * i.price), 0);
                return (
                  <div key={rate} className="flex justify-between text-sm">
                    <span>GST @ {rate}% on ${taxableAmount.toFixed(2)}</span>
                    <span>${gstForRate.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t-2 border-gray-300 pt-4 mb-6">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>${viewInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2 text-orange-600">
                <span>Total GST:</span>
                <span>${viewInvoice.totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl border-t pt-2 mt-2">
                <span>Grand Total:</span>
                <span>${viewInvoice.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-6">
              <span
                className={`inline-block px-4 py-2 rounded text-sm ${
                  viewInvoice.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : viewInvoice.status === "unpaid"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                Status: {viewInvoice.status.toUpperCase()}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                Print / Download
              </button>
              <button
                onClick={() => setViewInvoice(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Quotation Modal */}
      {viewQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full my-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl mb-2">QUOTATION</h2>
                <p className="text-gray-600">{viewQuotation.quotationNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Date</p>
                <p>{new Date(viewQuotation.date).toLocaleDateString()}</p>
                <p className="text-sm text-gray-600 mt-2">Valid Until</p>
                <p>{new Date(viewQuotation.validUntil).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm text-gray-600 mb-2">Quotation For:</h3>
              <p className="font-semibold">{viewQuotation.customerName}</p>
              {viewQuotation.customerEmail && <p className="text-sm">{viewQuotation.customerEmail}</p>}
              {viewQuotation.customerPhone && <p className="text-sm">{viewQuotation.customerPhone}</p>}
              {viewQuotation.customerAddress && <p className="text-sm">{viewQuotation.customerAddress}</p>}
            </div>

            <table className="w-full mb-8">
              <thead className="border-b-2 border-gray-300">
                <tr>
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">GST Rate</th>
                  <th className="text-right py-2">GST Amount</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {viewQuotation.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3">
                      <div>{item.itemName}</div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                    </td>
                    <td className="text-right py-3">${item.price.toFixed(2)}</td>
                    <td className="text-right py-3">{item.quantity}</td>
                    <td className="text-right py-3">{item.gstRate}%</td>
                    <td className="text-right py-3 text-orange-600">${item.gstAmount.toFixed(2)}</td>
                    <td className="text-right py-3">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm mb-2">GST Breakdown:</h3>
              {Array.from(new Set(viewQuotation.items.map(i => i.gstRate))).map(rate => {
                const itemsWithRate = viewQuotation.items.filter(i => i.gstRate === rate);
                const gstForRate = itemsWithRate.reduce((sum, i) => sum + i.gstAmount, 0);
                const taxableAmount = itemsWithRate.reduce((sum, i) => sum + (i.quantity * i.price), 0);
                return (
                  <div key={rate} className="flex justify-between text-sm">
                    <span>GST @ {rate}% on ${taxableAmount.toFixed(2)}</span>
                    <span>${gstForRate.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t-2 border-gray-300 pt-4 mb-6">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>${viewQuotation.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2 text-orange-600">
                <span>Total GST:</span>
                <span>${viewQuotation.totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl border-t pt-2 mt-2">
                <span>Grand Total:</span>
                <span>${viewQuotation.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {viewQuotation.notes && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm mb-2">Notes:</h3>
                <p className="text-sm">{viewQuotation.notes}</p>
              </div>
            )}

            <div className="mb-6">
              <span
                className={`inline-block px-4 py-2 rounded text-sm ${
                  viewQuotation.status === "accepted"
                    ? "bg-green-100 text-green-700"
                    : viewQuotation.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : viewQuotation.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                Status: {viewQuotation.status.toUpperCase()}
              </span>
            </div>

            <div className="flex gap-3">
              {viewQuotation.status !== "converted" && (
                <button
                  onClick={() => convertQuotationToInvoice(viewQuotation)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <ArrowRight className="w-4 h-4" />
                  Convert to Invoice
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                Print / Download
              </button>
              <button
                onClick={() => setViewQuotation(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}