# Zaffine Solar Stock & Inventory Management System

A production-ready, mobile-first inventory management web application for solar installation businesses to track and manage material movements between **Godown Warehouse**, **Office Staging Hub**, and **Customer Installation Sites**.

---

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Database & Seed 70+ Solar Catalog Items**:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Demo Logins (1-Tap Switcher on Login Page)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@zaffine.com` | `admin123` |
| **Operations Manager** | `ops@zaffine.com` | `zaffine123` |
| **Godown Manager** | `godown@zaffine.com` | `zaffine123` |
| **Office Manager** | `office@zaffine.com` | `zaffine123` |
| **Technician / Worker** | `worker@zaffine.com` | `zaffine123` |
| **Pending Sign-up** | `pending@zaffine.com` | `zaffine123` |

---

## 📦 Features Overview

- **Mobile-First UX**: Sticky bottom navigation (min 44px targets), mobile summary cards with expandable accordions, and rapid numeric keypad steppers with quick increment chips (`+1`, `+5`, `+10`, `+50`, `+100`).
- **Fast 70+ Item Combobox**: Single-thumb searchable dropdown with category filters (`Panels`, `Inverters`, `Cables`, `PVC & BOS`, `Structure`).
- **Atomic Movement Server Actions**:
  - `Vendor ➔ Godown (Inward)`
  - `Godown ➔ Office (Internal Transfer)` with balance validation
  - `Office ➔ Site (Dispatch)` with customer reference & technician logging
  - `Site ➔ Office (Return)` for leftover project materials
- **Role-Based Access Control (RBAC)**: Strict separation between `SUPER_ADMIN`, `OPERATIONS_MANAGER`, `GODOWN_MANAGER`, `OFFICE_MANAGER`, and `WORKER`.
- **User Approvals**: Public registrations start in `PENDING` status until approved by a Super Admin.
- **Audit Logs & Export**: Full transaction audit history with CSV export capabilities.
