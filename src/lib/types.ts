export type Role =
  | "SUPER_ADMIN"
  | "OPERATIONS_MANAGER"
  | "GODOWN_MANAGER"
  | "OFFICE_MANAGER"
  | "WORKER";

export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export type Location = "GODOWN" | "OFFICE";

export type TransactionType =
  | "INWARD_TO_GODOWN"
  | "TRANSFER_TO_OFFICE"
  | "DISPATCH_TO_SITE"
  | "RETURN_TO_OFFICE"
  | "MANUAL_ADJUSTMENT";

export type Category =
  | "PANELS"
  | "INVERTER"
  | "CABLES"
  | "PVC_ITEMS"
  | "STRUCTURE"
  | "OTHER";

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  role: Role;
  status: UserStatus;
}

export const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: "PANELS", label: "Solar Panels", icon: "Sun" },
  { key: "INVERTER", label: "Inverters", icon: "Zap" },
  { key: "CABLES", label: "Solar & AC Cables", icon: "Cable" },
  { key: "PVC_ITEMS", label: "PVC & BOS Items", icon: "Layers" },
  { key: "STRUCTURE", label: "Mounting Structures", icon: "Grid" },
  { key: "OTHER", label: "Other Supplies", icon: "Package" },
];

export interface DispatchedRecord {
  id: string;
  batchId?: string | null;
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  quantity: number;
  siteOrCustomer: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  workerName: string | null;
  dispatchedByName: string;
  referenceDocNo: string | null;
  remarks: string | null;
  createdAt: string;
}

export const ROLE_DETAILS: Record<
  Role,
  { label: string; description: string; badgeColor: string }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    description: "Full system control, inventory actions & user management",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300",
  },
  OPERATIONS_MANAGER: {
    label: "Operations Manager",
    description: "Full inventory actions and catalog management (no user admin)",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
  },
  GODOWN_MANAGER: {
    label: "Godown Manager",
    description: "Vendor inward receiving & warehouse transfers to office",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
  },
  OFFICE_MANAGER: {
    label: "Office Manager",
    description: "Office inventory staging, site dispatches & return processing",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
  },
  WORKER: {
    label: "Solar Technician / Worker",
    description: "Mobile checkout of materials for installation sites & return logging",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300",
  },
};

export const TRANSACTION_TYPE_DETAILS: Record<
  TransactionType,
  { label: string; badgeClass: string; icon: string; from: string; to: string }
> = {
  INWARD_TO_GODOWN: {
    label: "Vendor Inward",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: "ArrowDownToLine",
    from: "Vendor",
    to: "Godown Warehouse",
  },
  TRANSFER_TO_OFFICE: {
    label: "Warehouse Transfer",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: "ArrowRightLeft",
    from: "Godown Warehouse",
    to: "Office Hub",
  },
  DISPATCH_TO_SITE: {
    label: "Site Dispatch",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: "Truck",
    from: "Office Hub",
    to: "Customer Site",
  },
  RETURN_TO_OFFICE: {
    label: "Site Return",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    icon: "RotateCcw",
    from: "Customer Site",
    to: "Office Hub",
  },
  MANUAL_ADJUSTMENT: {
    label: "Adjustment",
    badgeClass: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
    icon: "SlidersHorizontal",
    from: "Audit",
    to: "Audit",
  },
};
