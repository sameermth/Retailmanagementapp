import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Dashboard } from "./components/Dashboard";
import { Suppliers } from "./components/Suppliers";
import { Customers } from "./components/Customers";
import { Distributors } from "./components/Distributors";
import { Inventory } from "./components/Inventory";
import { Invoices } from "./components/Invoices";
import { Taxation } from "./components/Taxation";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "suppliers", Component: Suppliers },
      { path: "customers", Component: Customers },
      { path: "distributors", Component: Distributors },
      { path: "inventory", Component: Inventory },
      { path: "invoices", Component: Invoices },
      { path: "taxation", Component: Taxation },
    ],
  },
]);