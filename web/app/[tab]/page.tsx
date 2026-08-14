import { notFound } from "next/navigation";
import KiyoyoApp from "../components/KiyoyoApp";
import type { Tab } from "../types";

const customerRouteTabs = ["shop", "cart", "account"] as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return customerRouteTabs.map((tab) => ({ tab }));
}

export default async function CustomerTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!customerRouteTabs.includes(tab as (typeof customerRouteTabs)[number])) {
    notFound();
  }
  return <KiyoyoApp initialTab={tab as Tab} />;
}
