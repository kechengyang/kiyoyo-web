import { notFound } from "next/navigation";
import AdminApp from "../AdminApp";
import {
  adminRouteSections,
  adminTabFromSection,
} from "../core/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return adminRouteSections.map((section) => ({ section }));
}

const sectionTitles: Record<string, string> = {
  orders: "Orders",
  redeem: "Redeem",
  customers: "Customers",
  management: "Management",
  overview: "Business overview",
  products: "Products",
  coupons: "Coupons",
  stores: "Stores",
  access: "Users & access",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return {
    title: `KIYOYO Admin · ${sectionTitles[section] ?? "Nairobi Operations"}`,
  };
}

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const initialTab = adminTabFromSection(section);
  if (!initialTab) notFound();
  return <AdminApp initialTab={initialTab} />;
}
