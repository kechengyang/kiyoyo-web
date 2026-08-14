import type { Tab } from "../../../types";

export const customerTabPath = (tab: Tab) =>
  tab === "home" ? "/" : `/${tab}`;

export const customerTabFromPath = (pathname: string): Tab | null => {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "home";
  if (path === "/shop") return "shop";
  if (path === "/cart") return "cart";
  if (path === "/account") return "account";
  return null;
};
