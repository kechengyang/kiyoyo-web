export type StaffRole = "ADMIN" | "OPERATOR";

export const permissionCodes = [
  "overview.read",
  "orders.read",
  "orders.transition",
  "redeem.verify",
  "redeem.execute",
  "customers.read",
  "customers.write",
  "customers.password_set",
  "products.read",
  "products.write",
  "products.publish",
  "product_tags.write",
  "coupons.read",
  "coupons.write",
  "coupons.publish",
  "customer_coupons.issue",
  "customer_coupons.revoke",
  "stores.read",
  "stores.write",
  "access.read",
  "access.create",
  "access.update",
  "access.remove",
  "access.password_set",
  "audit.read",
  "pospal.manage",
] as const;

export type PermissionCode = (typeof permissionCodes)[number];

const operatorPermissions = new Set<PermissionCode>([
  "orders.read",
  "orders.transition",
  "redeem.verify",
  "redeem.execute",
  "customers.read",
  "stores.read",
]);

export const permissionsForRole = (role: StaffRole): PermissionCode[] =>
  role === "ADMIN" ? [...permissionCodes] : [...operatorPermissions];

export const roleHasPermission = (role: StaffRole, permission: PermissionCode) =>
  role === "ADMIN" || operatorPermissions.has(permission);

export const canAccessStore = (role: StaffRole, storeIds: readonly string[], storeId: string) =>
  role === "ADMIN" || storeIds.includes(storeId);

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const isValidUsername = (value: string) =>
  /^[a-z0-9][a-z0-9._-]{2,39}$/.test(normalizeUsername(value));

export const staffIdentityAlias = (username: string) =>
  `${normalizeUsername(username)}@staff.kiyoyo.internal`;
