import { Role, UserStatus } from "./types";

export interface PermissionCheck {
  canViewDashboard: boolean;
  canInwardToGodown: boolean;
  canTransferToOffice: boolean;
  canDispatchToSite: boolean;
  canReturnFromSite: boolean;
  canManageCatalog: boolean;
  canManageUsers: boolean;
  canViewAllTransactions: boolean;
}

export function getRolePermissions(role: Role, status: UserStatus): PermissionCheck {
  if (status !== "ACTIVE") {
    return {
      canViewDashboard: false,
      canInwardToGodown: false,
      canTransferToOffice: false,
      canDispatchToSite: false,
      canReturnFromSite: false,
      canManageCatalog: false,
      canManageUsers: false,
      canViewAllTransactions: false,
    };
  }

  switch (role) {
    case "SUPER_ADMIN":
      return {
        canViewDashboard: true,
        canInwardToGodown: true,
        canTransferToOffice: true,
        canDispatchToSite: true,
        canReturnFromSite: true,
        canManageCatalog: true,
        canManageUsers: true,
        canViewAllTransactions: true,
      };

    case "OPERATIONS_MANAGER":
      return {
        canViewDashboard: true,
        canInwardToGodown: true,
        canTransferToOffice: true,
        canDispatchToSite: true,
        canReturnFromSite: true,
        canManageCatalog: true,
        canManageUsers: false, // EXPLICIT RESTRICTION: Absolutely NO user management
        canViewAllTransactions: true,
      };

    case "GODOWN_MANAGER":
      return {
        canViewDashboard: true,
        canInwardToGodown: true,
        canTransferToOffice: true,
        canDispatchToSite: false,
        canReturnFromSite: false,
        canManageCatalog: false,
        canManageUsers: false,
        canViewAllTransactions: true,
      };

    case "OFFICE_MANAGER":
      return {
        canViewDashboard: true,
        canInwardToGodown: false,
        canTransferToOffice: false,
        canDispatchToSite: true,
        canReturnFromSite: true,
        canManageCatalog: false,
        canManageUsers: false,
        canViewAllTransactions: true,
      };

    case "WORKER":
      return {
        canViewDashboard: true,
        canInwardToGodown: false,
        canTransferToOffice: false,
        canDispatchToSite: true, // Workers take material for site
        canReturnFromSite: true, // Workers return leftover material
        canManageCatalog: false,
        canManageUsers: false,
        canViewAllTransactions: false, // Worker views their own or dispatches
      };

    default:
      return {
        canViewDashboard: false,
        canInwardToGodown: false,
        canTransferToOffice: false,
        canDispatchToSite: false,
        canReturnFromSite: false,
        canManageCatalog: false,
        canManageUsers: false,
        canViewAllTransactions: false,
      };
  }
}
