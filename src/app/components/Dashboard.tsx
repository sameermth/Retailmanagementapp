import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Package, Users, Truck, AlertTriangle } from "lucide-react";

interface Stats {
  totalInventory: number;
  lowStockItems: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalDistributors: number;
  monthlyRevenue: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalInventory: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalDistributors: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    // Calculate stats from localStorage
    const inventory = JSON.parse(localStorage.getItem("inventory") || "[]");
    const customers = JSON.parse(localStorage.getItem("customers") || "[]");
    const suppliers = JSON.parse(localStorage.getItem("suppliers") || "[]");
    const distributors = JSON.parse(localStorage.getItem("distributors") || "[]");

    const lowStock = inventory.filter((item: any) => item.quantity <= item.reorderLevel).length;

    setStats({
      totalInventory: inventory.length,
      lowStockItems: lowStock,
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      totalDistributors: distributors.length,
      monthlyRevenue: 0,
    });
  }, []);

  const cards = [
    {
      title: "Total Inventory Items",
      value: stats.totalInventory,
      icon: Package,
      color: "blue",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: "red",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "green",
    },
    {
      title: "Total Suppliers",
      value: stats.totalSuppliers,
      icon: Truck,
      color: "purple",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your retail business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`p-3 rounded-lg bg-${card.color}-50`}
                >
                  <Icon className={`w-6 h-6 text-${card.color}-600`} />
                </div>
              </div>
              <div className="text-3xl mb-1">{card.value}</div>
              <div className="text-sm text-gray-600">{card.title}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
              Add New Inventory Item
            </button>
            <button className="w-full text-left px-4 py-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
              Register New Customer
            </button>
            <button className="w-full text-left px-4 py-3 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors">
              Add New Supplier
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Data Storage</span>
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Local Storage
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Backup</span>
              <span className="text-gray-800">Manual Only</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">System Status</span>
              <span className="text-green-600">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
