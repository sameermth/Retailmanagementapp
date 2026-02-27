import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, FileText, Calculator } from "lucide-react";

interface TaxRule {
  id: string;
  name: string;
  taxType: "VAT" | "GST" | "Sales Tax" | "Income Tax" | "Other";
  rate: number;
  applicableTo: "products" | "services" | "both";
  region: string;
  description: string;
  status: "active" | "inactive";
}

interface TaxCalculation {
  id: string;
  date: string;
  description: string;
  baseAmount: number;
  taxRule: string;
  taxAmount: number;
  totalAmount: number;
}

export function Taxation() {
  const [activeTab, setActiveTab] = useState<"rules" | "calculations">("rules");
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [taxCalculations, setTaxCalculations] = useState<TaxCalculation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showCalcForm, setShowCalcForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ruleFormData, setRuleFormData] = useState<Partial<TaxRule>>({
    name: "",
    taxType: "VAT",
    rate: 0,
    applicableTo: "both",
    region: "",
    description: "",
    status: "active",
  });
  const [calcFormData, setCalcFormData] = useState<Partial<TaxCalculation>>({
    date: new Date().toISOString().split("T")[0],
    description: "",
    baseAmount: 0,
    taxRule: "",
    taxAmount: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    const storedRules = localStorage.getItem("taxRules");
    const storedCalcs = localStorage.getItem("taxCalculations");
    if (storedRules) setTaxRules(JSON.parse(storedRules));
    if (storedCalcs) setTaxCalculations(JSON.parse(storedCalcs));
  }, []);

  const saveRulesToLocalStorage = (data: TaxRule[]) => {
    localStorage.setItem("taxRules", JSON.stringify(data));
    setTaxRules(data);
  };

  const saveCalcsToLocalStorage = (data: TaxCalculation[]) => {
    localStorage.setItem("taxCalculations", JSON.stringify(data));
    setTaxCalculations(data);
  };

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const updated = taxRules.map((rule) =>
        rule.id === editingId ? { ...ruleFormData, id: editingId } as TaxRule : rule
      );
      saveRulesToLocalStorage(updated);
    } else {
      const newRule: TaxRule = {
        ...ruleFormData,
        id: Date.now().toString(),
      } as TaxRule;
      saveRulesToLocalStorage([...taxRules, newRule]);
    }
    resetRuleForm();
  };

  const handleCalcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRule = taxRules.find((r) => r.name === calcFormData.taxRule);
    const baseAmount = calcFormData.baseAmount || 0;
    const taxAmount = selectedRule ? (baseAmount * selectedRule.rate) / 100 : 0;
    const totalAmount = baseAmount + taxAmount;

    const newCalc: TaxCalculation = {
      ...calcFormData,
      id: Date.now().toString(),
      taxAmount,
      totalAmount,
    } as TaxCalculation;
    saveCalcsToLocalStorage([...taxCalculations, newCalc]);
    resetCalcForm();
  };

  const resetRuleForm = () => {
    setRuleFormData({
      name: "",
      taxType: "VAT",
      rate: 0,
      applicableTo: "both",
      region: "",
      description: "",
      status: "active",
    });
    setShowRuleForm(false);
    setEditingId(null);
  };

  const resetCalcForm = () => {
    setCalcFormData({
      date: new Date().toISOString().split("T")[0],
      description: "",
      baseAmount: 0,
      taxRule: "",
      taxAmount: 0,
      totalAmount: 0,
    });
    setShowCalcForm(false);
  };

  const handleEditRule = (rule: TaxRule) => {
    setRuleFormData(rule);
    setEditingId(rule.id);
    setShowRuleForm(true);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm("Are you sure you want to delete this tax rule?")) {
      const filtered = taxRules.filter((r) => r.id !== id);
      saveRulesToLocalStorage(filtered);
    }
  };

  const handleDeleteCalc = (id: string) => {
    if (confirm("Are you sure you want to delete this calculation?")) {
      const filtered = taxCalculations.filter((c) => c.id !== id);
      saveCalcsToLocalStorage(filtered);
    }
  };

  const filteredRules = taxRules.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCalcs = taxCalculations.filter((c) =>
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2">Taxation</h1>
          <p className="text-gray-600">Manage tax rules and calculations</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === "rules") {
              setShowRuleForm(true);
            } else {
              setShowCalcForm(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {activeTab === "rules" ? "Add Tax Rule" : "New Calculation"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === "rules"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Tax Rules
        </button>
        <button
          onClick={() => setActiveTab("calculations")}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === "calculations"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Calculations
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

      {/* Tax Rules View */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRules.map((rule) => (
            <div key={rule.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg mb-1">{rule.name}</h3>
                  <div className="flex gap-2">
                    <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                      {rule.taxType}
                    </span>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        rule.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {rule.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rate:</span>
                  <span className="text-lg">{rule.rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Region:</span>
                  <span>{rule.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Applicable to:</span>
                  <span className="capitalize">{rule.applicableTo}</span>
                </div>
              </div>

              {rule.description && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                  {rule.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tax Calculations View */}
      {activeTab === "calculations" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm">Date</th>
                  <th className="text-left px-6 py-3 text-sm">Description</th>
                  <th className="text-left px-6 py-3 text-sm">Tax Rule</th>
                  <th className="text-right px-6 py-3 text-sm">Base Amount</th>
                  <th className="text-right px-6 py-3 text-sm">Tax Amount</th>
                  <th className="text-right px-6 py-3 text-sm">Total Amount</th>
                  <th className="text-center px-6 py-3 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCalcs.map((calc) => (
                  <tr key={calc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {new Date(calc.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">{calc.description}</td>
                    <td className="px-6 py-4 text-sm">{calc.taxRule}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      ${calc.baseAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-orange-600">
                      ${calc.taxAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      ${calc.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleDeleteCalc(calc.id)}
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
            {filteredCalcs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No calculations found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tax Rule Form Modal */}
      {showRuleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl mb-6">
              {editingId ? "Edit Tax Rule" : "Add New Tax Rule"}
            </h2>
            <form onSubmit={handleRuleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Rule Name *</label>
                  <input
                    type="text"
                    required
                    value={ruleFormData.name}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Tax Type *</label>
                  <select
                    value={ruleFormData.taxType}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, taxType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="VAT">VAT</option>
                    <option value="GST">GST</option>
                    <option value="Sales Tax">Sales Tax</option>
                    <option value="Income Tax">Income Tax</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Tax Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={ruleFormData.rate}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Applicable To *</label>
                  <select
                    value={ruleFormData.applicableTo}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, applicableTo: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="products">Products</option>
                    <option value="services">Services</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Region *</label>
                <input
                  type="text"
                  required
                  value={ruleFormData.region}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, region: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., California, New York, EU"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Description</label>
                <textarea
                  value={ruleFormData.description}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Status</label>
                <select
                  value={ruleFormData.status}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, status: e.target.value as "active" | "inactive" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingId ? "Update" : "Add"} Tax Rule
                </button>
                <button
                  type="button"
                  onClick={resetRuleForm}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Calculation Form Modal */}
      {showCalcForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full">
            <h2 className="text-2xl mb-6">New Tax Calculation</h2>
            <form onSubmit={handleCalcSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Date *</label>
                <input
                  type="date"
                  required
                  value={calcFormData.date}
                  onChange={(e) => setCalcFormData({ ...calcFormData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Description *</label>
                <input
                  type="text"
                  required
                  value={calcFormData.description}
                  onChange={(e) => setCalcFormData({ ...calcFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Sales invoice #1234"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Base Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={calcFormData.baseAmount}
                  onChange={(e) => setCalcFormData({ ...calcFormData, baseAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Tax Rule *</label>
                <select
                  required
                  value={calcFormData.taxRule}
                  onChange={(e) => setCalcFormData({ ...calcFormData, taxRule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a tax rule</option>
                  {taxRules
                    .filter((r) => r.status === "active")
                    .map((rule) => (
                      <option key={rule.id} value={rule.name}>
                        {rule.name} ({rule.rate}%)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Calculate
                </button>
                <button
                  type="button"
                  onClick={resetCalcForm}
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
