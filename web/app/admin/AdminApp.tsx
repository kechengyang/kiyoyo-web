"use client";
/* eslint-disable @next/next/no-img-element -- Tiny admin thumbnails do not need image optimization. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { money, stores } from "../data";
import {
  resolveProductTag,
  salePrice,
  useCatalog,
  useProductTags,
} from "../catalog";
import {
  apiFetch,
  fetchCatalog,
  mapApiProduct,
  observeMember,
} from "../platform";
import type { Order, Product, ProductTagTone } from "../types";

type AdminTab =
  | "overview"
  | "orders"
  | "products"
  | "redeem"
  | "customers"
  | "stores";

const sampleOrders: Order[] = [
  {
    id: "KYO-2608-3186",
    createdAt: "2026-08-04T13:59:00.000Z",
    status: "Preparing",
    channel: "Pickup",
    storeId: "kilimani",
    total: 920,
    pickupCode: "M4K8Q2YP",
    items: [
      {
        key: "sample1",
        productId: "d1",
        quantity: 1,
        size: "Large",
        sugar: "50%",
        ice: "Less ice",
        toppings: ["Boba"],
      },
      {
        key: "sample2",
        productId: "d4",
        quantity: 1,
        size: "Regular",
        sugar: "30%",
        ice: "Regular",
        toppings: [],
      },
    ],
  },
  {
    id: "KYO-2608-3179",
    createdAt: "2026-08-04T13:47:00.000Z",
    status: "Ready",
    channel: "Pickup",
    storeId: "westlands",
    total: 450,
    pickupCode: "P7LW9X3A",
    items: [
      {
        key: "sample3",
        productId: "d2",
        quantity: 1,
        size: "Regular",
        sugar: "50%",
        ice: "Less ice",
        toppings: [],
      },
    ],
  },
  {
    id: "KYO-2608-3162",
    createdAt: "2026-08-04T13:17:00.000Z",
    status: "Placed",
    channel: "Delivery",
    storeId: "cbd",
    total: 6370,
    pickupCode: "D2R6N8UZ",
    items: [
      {
        key: "sample4",
        productId: "d8",
        quantity: 1,
        size: "Regular",
        sugar: "30%",
        ice: "Less ice",
        toppings: [],
      },
      { key: "sample5", productId: "g1", quantity: 1 },
    ],
  },
  {
    id: "KYO-2608-3128",
    createdAt: "2026-08-04T11:35:00.000Z",
    status: "Completed",
    channel: "Pickup",
    storeId: "parklands",
    total: 840,
    pickupCode: "USED2219",
    items: [
      {
        key: "sample6",
        productId: "d3",
        quantity: 2,
        size: "Regular",
        sugar: "50%",
        ice: "Less ice",
        toppings: [],
      },
    ],
  },
];

const customers = [
  {
    name: "Amina Wanjiku",
    phone: "+254 712 ••• 481",
    points: 2480,
    orders: 18,
    tier: "VIP",
  },
  {
    name: "Brian Otieno",
    phone: "+254 733 ••• 092",
    points: 940,
    orders: 7,
    tier: "Member",
  },
  {
    name: "Njeri Kamau",
    phone: "+254 701 ••• 553",
    points: 620,
    orders: 5,
    tier: "Member",
  },
  {
    name: "Samira Noor",
    phone: "+254 729 ••• 044",
    points: 310,
    orders: 3,
    tier: "New",
  },
];

export default function AdminApp() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [catalog, setCatalog] = useCatalog();
  const [productTags, setProductTags] = useProductTags();
  const [orders, setOrders] = useState<Order[]>(sampleOrders);
  const [scan, setScan] = useState("");
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    message: string;
    order?: Order;
  } | null>(null);
  const [storeFilter, setStoreFilter] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [productKind, setProductKind] = useState<"all" | "drink" | "goods">(
    "all",
  );
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productError, setProductError] = useState("");
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTag, setNewTag] = useState<{ label: string; tone: ProductTagTone }>(
    { label: "", tone: "red" },
  );
  const [tagError, setTagError] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [cloudStatus, setCloudStatus] = useState(
    "Sign in from Account before managing cloud data.",
  );

  useEffect(
    () =>
      observeMember(async (user) => {
        if (!user) {
          setCloudStatus("Sign in from Account before opening Admin.");
          return;
        }
        try {
          await apiFetch("/v1/auth/bootstrap", {
            method: "POST",
            body: JSON.stringify({
              nickname:
                user.displayName || user.email?.split("@")[0] || "Admin",
              locale: "en",
            }),
          });
          const [productPayload, tagPayload, orderPayload] = await Promise.all([
            apiFetch<{ data: Parameters<typeof mapApiProduct>[0][] }>(
              "/v1/admin/products",
            ),
            apiFetch<{
              data: Array<{
                id: string;
                label: string;
                tone: "RED" | "YELLOW" | "BLACK" | "GREEN";
                created_at: string;
              }>;
            }>("/v1/admin/product-tags"),
            apiFetch<{
              data: Array<{
                order_number: string;
                created_at: string;
                status: string;
                type: string;
                fulfillment_id: string;
                store_code: string;
                total: number;
              }>;
            }>("/v1/admin/orders"),
          ]);
          setCatalog(productPayload.data.map(mapApiProduct));
          setProductTags(
            tagPayload.data.map((tag) => ({
              id: tag.id,
              label: tag.label,
              tone: tag.tone.toLowerCase() as ProductTagTone,
              createdAt: tag.created_at,
            })),
          );
          const cloudOrders: Order[] = orderPayload.data.map((order) => ({
            id: order.order_number,
            fulfillmentId: order.fulfillment_id,
            createdAt: order.created_at,
            status:
              `${order.status.charAt(0)}${order.status.slice(1).toLowerCase()}` as Order["status"],
            channel:
              `${order.type.charAt(0)}${order.type.slice(1).toLowerCase()}` as Order["channel"],
            storeId: order.store_code,
            total: order.total,
            pickupCode: "SERVER",
            items: [],
          }));
          if (cloudOrders.length) setOrders(cloudOrders);
          setCloudStatus(`Connected as ${user.email}`);
        } catch (error) {
          setCloudStatus(
            error instanceof Error ? error.message : "Cloud connection failed",
          );
        }
      }),
    [setCatalog, setProductTags],
  );

  const shown = useMemo(
    () =>
      orders.filter((o) => storeFilter === "all" || o.storeId === storeFilter),
    [orders, storeFilter],
  );
  const active = orders.filter((o) => o.status !== "Completed");
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const shownProducts = useMemo(
    () =>
      catalog.filter((product) => {
        const query = productSearch.trim().toLowerCase();
        return (
          (productKind === "all" || product.kind === productKind) &&
          (!query ||
            `${product.name} ${product.nameZh} ${product.category}`
              .toLowerCase()
              .includes(query))
        );
      }),
    [catalog, productKind, productSearch],
  );
  const changeStatus = async (id: string, status: Order["status"]) => {
    const order = orders.find((item) => item.id === id);
    if (order?.fulfillmentId) {
      try {
        await apiFetch(
          `/v1/admin/fulfillments/${order.fulfillmentId}/transition`,
          {
            method: "POST",
            body: JSON.stringify({ to: status.toUpperCase() }),
          },
        );
      } catch (error) {
        setCloudStatus(
          error instanceof Error ? error.message : "Status update failed",
        );
        return;
      }
    }
    setOrders(
      orders.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };
  const toggleProduct = async (id: string) => {
    const product = catalog.find((item) => item.id === id);
    if (!product?.apiId || !product.catalogVersion) {
      setProductError("Refresh the cloud catalog before editing.");
      return;
    }
    try {
      await apiFetch(`/v1/admin/products/${product.apiId}`, {
        method: "PATCH",
        body: JSON.stringify({
          active: product.active === false,
          catalog_version: product.catalogVersion,
        }),
      });
      setCatalog(await fetchCatalog());
    } catch (error) {
      setProductError(
        error instanceof Error ? error.message : "Product could not be updated",
      );
    }
  };
  const openProductEditor = (product: Product) => {
    const existingTag = resolveProductTag(product, productTags);
    setEditingProduct({
      ...product,
      active: product.active !== false,
      tagId: existingTag?.id,
      badge: undefined,
    });
    setProductError("");
    setPendingImage(null);
  };
  const addTag = async () => {
    const label = newTag.label.trim().toUpperCase();
    if (!label) {
      setTagError("Enter a tag label.");
      return;
    }
    if (
      productTags.some((tag) => tag.label.toLowerCase() === label.toLowerCase())
    ) {
      setTagError("That tag already exists.");
      return;
    }
    try {
      const response = await apiFetch<{
        data: { id: string; label: string; tone: string; created_at: string };
      }>("/v1/admin/product-tags", {
        method: "POST",
        body: JSON.stringify({ label, tone: newTag.tone.toUpperCase() }),
      });
      setProductTags([
        ...productTags,
        {
          id: response.data.id,
          label: response.data.label,
          tone: response.data.tone.toLowerCase() as ProductTagTone,
          createdAt: response.data.created_at,
        },
      ]);
      setNewTag({ label: "", tone: "red" });
      setTagError("");
    } catch (error) {
      setTagError(
        error instanceof Error ? error.message : "Tag could not be created",
      );
    }
  };
  const deleteTag = async (id: string) => {
    try {
      await apiFetch(`/v1/admin/product-tags/${id}`, { method: "DELETE" });
      setProductTags(productTags.filter((tag) => tag.id !== id));
      setCatalog(await fetchCatalog());
    } catch (error) {
      setTagError(
        error instanceof Error ? error.message : "Tag could not be archived",
      );
    }
  };
  const saveProduct = async () => {
    if (
      !editingProduct ||
      !editingProduct.name.trim() ||
      !editingProduct.nameZh.trim() ||
      editingProduct.price <= 0
    ) {
      setProductError("Complete both names and enter a valid price.");
      return;
    }
    if (!editingProduct.apiId || !editingProduct.catalogVersion) {
      setProductError("Refresh the cloud catalog before editing.");
      return;
    }
    try {
      const update = await apiFetch<{ data: { catalog_version: number } }>(
        `/v1/admin/products/${editingProduct.apiId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name_en: editingProduct.name,
            name_zh: editingProduct.nameZh,
            base_price: editingProduct.price,
            discount_percent: Math.max(
              0,
              Math.min(90, Number(editingProduct.discountPercent) || 0),
            ),
            active: editingProduct.active !== false,
            tag_id: editingProduct.tagId ?? null,
            catalog_version: editingProduct.catalogVersion,
          }),
        },
      );
      if (pendingImage) {
        const upload = await apiFetch<{
          data: { upload_url: string; object_key: string };
        }>(`/v1/admin/products/${editingProduct.apiId}/media-upload`, {
          method: "POST",
          body: JSON.stringify({
            filename: pendingImage.name,
            content_type: pendingImage.type,
            bytes: pendingImage.size,
          }),
        });
        const uploaded = await fetch(upload.data.upload_url, {
          method: "PUT",
          headers: { "Content-Type": pendingImage.type },
          body: pendingImage,
        });
        if (!uploaded.ok) throw new Error("Image upload failed");
        await apiFetch(
          `/v1/admin/products/${editingProduct.apiId}/media-confirm`,
          {
            method: "POST",
            body: JSON.stringify({
              object_key: upload.data.object_key,
              catalog_version: update.data.catalog_version,
            }),
          },
        );
      }
      setCatalog(await fetchCatalog());
      setEditingProduct(null);
      setPendingImage(null);
      setProductError("");
    } catch (error) {
      setProductError(
        error instanceof Error ? error.message : "Product could not be saved",
      );
    }
  };
  const updateProductImage = (file?: File) => {
    if (!file || !editingProduct) return;
    if (!file.type.startsWith("image/")) {
      setProductError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 1_500_000) {
      setProductError("For this local demo, use an image under 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(file);
      setEditingProduct((current) =>
        current ? { ...current, image: String(reader.result) } : current,
      );
    };
    reader.onerror = () => setProductError("The image could not be read.");
    reader.readAsDataURL(file);
  };
  const redeem = async () => {
    const token = scan.trim();
    if (!token) {
      setScanResult({ ok: false, message: "Enter or scan a pickup token." });
      return;
    }
    try {
      const response = await apiFetch<{
        data: { order_number: string; status: string };
      }>("/v1/admin/pickups/redeem", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          token,
          store_id: storeFilter === "all" ? "kilimani" : storeFilter,
        }),
      });
      setScanResult({
        ok: true,
        message: `${response.data.order_number} verified. Hand the order to the customer.`,
      });
    } catch (error) {
      setScanResult({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Pickup could not be redeemed",
      });
    }
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="logo">KIYOYO</span>
          <small>OPERATIONS</small>
        </div>
        <nav>
          {(
            [
              "overview",
              "orders",
              "products",
              "redeem",
              "customers",
              "stores",
            ] as AdminTab[]
          ).map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              <i>
                {
                  {
                    overview: "▦",
                    orders: "▤",
                    products: "◇",
                    redeem: "⌗",
                    customers: "☺",
                    stores: "⌖",
                  }[item]
                }
              </i>
              <span>{item}</span>
              {item === "orders" && <b>{active.length}</b>}
            </button>
          ))}
        </nav>
        <Link href="/">← Customer store</Link>
        <div className="admin-user">
          <i>KO</i>
          <span>
            <strong>Store Admin</strong>
            <small>Nairobi HQ</small>
          </span>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <div>
            <small>KIYOYO / NAIROBI</small>
            <h1>{tab}</h1>
          </div>
          <div>
            <span className="live-dot" /> {cloudStatus}{" "}
            <button>
              Notifications <b>{active.length}</b>
            </button>
          </div>
        </header>

        {tab === "overview" && (
          <>
            <section className="metric-grid">
              <Metric
                label="Today’s orders"
                value={String(orders.length)}
                note={`${active.length} active now`}
                trend="+12%"
              />
              <Metric
                label="Gross sales"
                value={money(revenue)}
                note="Mock payment value"
                trend="+8%"
              />
              <Metric
                label="Ready for pickup"
                value={String(
                  orders.filter((o) => o.status === "Ready").length,
                )}
                note="Needs attention"
                trend="LIVE"
              />
              <Metric
                label="Members"
                value="1,284"
                note="Across Nairobi"
                trend="+24"
              />
            </section>
            <div className="admin-two">
              <section className="admin-panel">
                <PanelHead
                  title="Live orders"
                  action="View all"
                  onAction={() => setTab("orders")}
                />
                <OrderTable
                  orders={orders.slice(0, 5)}
                  catalog={catalog}
                  onStatus={changeStatus}
                />
              </section>
              <section className="admin-panel store-pulse">
                <PanelHead title="Store pulse" />
                <div className="pulse-chart">
                  {stores.slice(0, 5).map((s, i) => (
                    <div key={s.id}>
                      <span>{s.area}</span>
                      <i>
                        <b style={{ height: `${[82, 68, 58, 46, 31][i]}%` }} />
                      </i>
                      <strong>{[32, 27, 23, 18, 11][i]}</strong>
                    </div>
                  ))}
                </div>
                <small>Orders today · illustrative demo data</small>
              </section>
            </div>
            <section className="admin-panel quick">
              <PanelHead title="Quick actions" />
              <div>
                <button onClick={() => setTab("products")}>
                  <i>◇</i>
                  <strong>Manage products</strong>
                  <span>Pricing, offers & images</span>
                </button>
                <button onClick={() => setTab("redeem")}>
                  <i>⌗</i>
                  <strong>Redeem pickup</strong>
                  <span>Verify one-time QR</span>
                </button>
                <button onClick={() => setTab("orders")}>
                  <i>▤</i>
                  <strong>Manage orders</strong>
                  <span>Update preparation status</span>
                </button>
              </div>
            </section>
          </>
        )}

        {tab === "orders" && (
          <section className="admin-panel wide">
            <div className="orders-tools">
              <PanelHead title="All orders" />
              <select
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
              >
                <option value="all">All Nairobi stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.area}
                  </option>
                ))}
              </select>
            </div>
            <OrderTable
              orders={shown}
              catalog={catalog}
              onStatus={changeStatus}
            />
          </section>
        )}

        {tab === "products" && (
          <section className="admin-panel wide product-management">
            <div className="product-admin-head">
              <div>
                <span className="red-label">LIVE CATALOG</span>
                <h2>Product management</h2>
                <p>
                  Changes sync through the Commerce API to every storefront.
                </p>
              </div>
              <div className="catalog-stats">
                <span>
                  <b>{catalog.filter((p) => p.active !== false).length}</b> live
                </span>
                <span>
                  <b>{productTags.length}</b> tags
                </span>
                <button onClick={() => setShowTagManager(!showTagManager)}>
                  {showTagManager ? "Close tags" : "Manage tags"} →
                </button>
              </div>
            </div>
            {showTagManager && (
              <section className="tag-manager">
                <div>
                  <span className="red-label">TAG LIBRARY</span>
                  <h3>Create and define product tags</h3>
                  <p>
                    Tags are reusable. Assign one from each product’s edit
                    panel.
                  </p>
                </div>
                <div className="tag-creator">
                  <input
                    maxLength={18}
                    value={newTag.label}
                    onChange={(e) =>
                      setNewTag({ ...newTag, label: e.target.value })
                    }
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                    placeholder="e.g. DROP 01"
                  />
                  <select
                    value={newTag.tone}
                    onChange={(e) =>
                      setNewTag({
                        ...newTag,
                        tone: e.target.value as ProductTagTone,
                      })
                    }
                  >
                    <option value="red">KIYOYO red</option>
                    <option value="yellow">Highlight yellow</option>
                    <option value="black">Studio black</option>
                    <option value="green">Fresh green</option>
                  </select>
                  <span className="tag-chip" data-tone={newTag.tone}>
                    {newTag.label.trim().toUpperCase() || "PREVIEW"}
                  </span>
                  <button onClick={addTag}>+ Create tag</button>
                </div>
                {tagError && <div className="form-error">{tagError}</div>}
                <div className="tag-library">
                  {productTags.map((tag) => (
                    <span key={tag.id}>
                      <em className="tag-chip" data-tone={tag.tone}>
                        {tag.label}
                      </em>
                      <small>
                        {
                          catalog.filter(
                            (product) =>
                              product.tagId === tag.id ||
                              (!product.tagId &&
                                product.badge?.toLowerCase() ===
                                  tag.label.toLowerCase()),
                          ).length
                        }{" "}
                        products
                      </small>
                      <button
                        aria-label={`Delete ${tag.label}`}
                        onClick={() => deleteTag(tag.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            )}
            <div className="product-admin-tools">
              <label>
                <span>⌕</span>
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products"
                />
              </label>
              <div>
                {(["all", "drink", "goods"] as const).map((kind) => (
                  <button
                    key={kind}
                    className={productKind === kind ? "active" : ""}
                    onClick={() => setProductKind(kind)}
                  >
                    {kind}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-product-list">
              <div className="product-list-head">
                <span>Product</span>
                <span>Price</span>
                <span>Offer / tag</span>
                <span>Visibility</span>
                <span>Action</span>
              </div>
              {shownProducts.map((product) => {
                const assignedTag = resolveProductTag(product, productTags);
                return (
                  <article
                    key={product.id}
                    className={product.active === false ? "offline" : ""}
                  >
                    <span className="admin-product-name">
                      <img src={product.image} alt="" />
                      <span>
                        <strong>{product.name}</strong>
                        <small>
                          {product.nameZh} · {product.category}
                        </small>
                      </span>
                    </span>
                    <span className="admin-price">
                      <strong>{money(salePrice(product))}</strong>
                      {(product.discountPercent || 0) > 0 && (
                        <del>{money(product.price)}</del>
                      )}
                    </span>
                    <span>
                      {(product.discountPercent || 0) > 0 ? (
                        <em className="offer-pill">
                          −{product.discountPercent}%
                        </em>
                      ) : assignedTag ? (
                        <em className="tag-chip" data-tone={assignedTag.tone}>
                          {assignedTag.label}
                        </em>
                      ) : (
                        <small>—</small>
                      )}
                    </span>
                    <span>
                      <button
                        className={`publish-toggle ${product.active === false ? "off" : ""}`}
                        onClick={() => toggleProduct(product.id)}
                      >
                        <i />
                        {product.active === false ? "Offline" : "Live"}
                      </button>
                    </span>
                    <span>
                      <button
                        className="edit-product"
                        onClick={() => openProductEditor(product)}
                      >
                        Edit →
                      </button>
                    </span>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tab === "redeem" && (
          <div className="redeem-layout">
            <section className="redeem-card">
              <span className="red-label">ONE-TIME PICKUP</span>
              <h2>Scan or enter code</h2>
              <p>
                Use a customer’s QR pickup token or order number. A completed
                code cannot be used twice.
              </p>
              <div className="scanner-frame">
                <div className="scanner-line" />
                <span>⌗</span>
                <small>Camera scanner placeholder</small>
              </div>
              <label>
                <span>Pickup token / Order ID</span>
                <div>
                  <input
                    value={scan}
                    onChange={(e) => setScan(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && redeem()}
                    placeholder="e.g. P7LW9X3A"
                  />
                  <button onClick={redeem}>Verify →</button>
                </div>
              </label>
              <button className="demo-code" onClick={() => setScan("P7LW9X3A")}>
                Use demo ready code: P7LW9X3A
              </button>
            </section>
            <aside
              className={`scan-result ${scanResult ? (scanResult.ok ? "ok" : "bad") : ""}`}
            >
              {scanResult ? (
                <>
                  <span>{scanResult.ok ? "✓" : "!"}</span>
                  <h3>{scanResult.ok ? "Verified" : "Cannot redeem"}</h3>
                  <p>{scanResult.message}</p>
                  {scanResult.order && (
                    <div>
                      <b>{scanResult.order.id}</b>
                      <small>
                        {
                          stores.find((s) => s.id === scanResult.order?.storeId)
                            ?.name
                        }
                      </small>
                      <strong>{money(scanResult.order.total)}</strong>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span>⌗</span>
                  <h3>Waiting for a code</h3>
                  <p>
                    The verification result and order summary will appear here.
                  </p>
                </>
              )}
            </aside>
          </div>
        )}

        {tab === "customers" && (
          <section className="admin-panel wide">
            <PanelHead title="Customers" />
            <div className="customer-table">
              <div className="table-head">
                <span>Customer</span>
                <span>Tier</span>
                <span>Points</span>
                <span>Orders</span>
                <span>Action</span>
              </div>
              {customers.map((c) => (
                <div className="customer-row" key={c.phone}>
                  <span>
                    <i>
                      {c.name
                        .split(" ")
                        .map((x) => x[0])
                        .join("")}
                    </i>
                    <b>
                      {c.name}
                      <small>{c.phone}</small>
                    </b>
                  </span>
                  <span>
                    <em>{c.tier}</em>
                  </span>
                  <strong>{c.points.toLocaleString()}</strong>
                  <span>{c.orders}</span>
                  <button>View →</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "stores" && (
          <section className="admin-panel wide">
            <PanelHead title="Nairobi stores" />
            <div className="admin-store-grid">
              {stores.map((s, i) => (
                <article key={s.id}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{s.name}</h3>
                    <p>{s.address}</p>
                    <small>{s.phone}</small>
                  </div>
                  <em className={s.verified ? "verified" : "pending"}>
                    {s.verified ? "Verified" : "Confirm details"}
                  </em>
                </article>
              ))}
            </div>
            <div className="store-warning">
              ⓘ Public KIYOYO sources currently verify four branches. Eastleigh
              and Store 06 require exact operations data before production
              launch.
            </div>
          </section>
        )}
      </main>
      {editingProduct && (
        <div className="modal-backdrop">
          <div className="admin-product-modal">
            <button
              className="modal-close"
              onClick={() => setEditingProduct(null)}
            >
              ×
            </button>
            <span className="red-label">EDIT PRODUCT</span>
            <h2>{editingProduct.name}</h2>
            <div className="product-image-editor">
              <img src={editingProduct.image} alt="Product preview" />
              <label>
                <strong>Replace image</strong>
                <span>JPG, PNG or WebP · max 1.5 MB in local demo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => updateProductImage(e.target.files?.[0])}
                />
              </label>
            </div>
            <label className="form-field">
              <span>Image path / URL</span>
              <input
                value={editingProduct.image}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    image: e.target.value,
                  })
                }
              />
            </label>
            <div className="form-split">
              <label className="form-field">
                <span>English name</span>
                <input
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>Chinese name</span>
                <input
                  value={editingProduct.nameZh}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      nameZh: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <div className="form-split">
              <label className="form-field">
                <span>Base price (KSh)</span>
                <input
                  type="number"
                  min="1"
                  value={editingProduct.price}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>Discount %</span>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={editingProduct.discountPercent || 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      discountPercent: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label className="form-field tag-assignment">
              <span>Product tag</span>
              <select
                value={editingProduct.tagId || ""}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    tagId: e.target.value || undefined,
                    badge: undefined,
                  })
                }
              >
                <option value="">No tag</option>
                {productTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.label} · {tag.tone}
                  </option>
                ))}
              </select>
              {editingProduct.tagId &&
                productTags.find((tag) => tag.id === editingProduct.tagId) && (
                  <em
                    className="tag-chip"
                    data-tone={
                      productTags.find((tag) => tag.id === editingProduct.tagId)
                        ?.tone
                    }
                  >
                    {
                      productTags.find((tag) => tag.id === editingProduct.tagId)
                        ?.label
                    }
                  </em>
                )}
              <small>
                Create reusable tags from Manage tags before assigning them.
              </small>
            </label>
            <div className="sale-preview">
              <span>Customer price</span>
              <strong>{money(salePrice(editingProduct))}</strong>
              {(editingProduct.discountPercent || 0) > 0 && (
                <del>{money(editingProduct.price)}</del>
              )}
            </div>
            <label className="admin-publish-check">
              <input
                type="checkbox"
                checked={editingProduct.active !== false}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    active: e.target.checked,
                  })
                }
              />
              <span>
                <strong>Published on storefront</strong>
                <small>Uncheck to hide this item and block checkout.</small>
              </span>
            </label>
            {productError && <div className="form-error">{productError}</div>}
            <button className="primary full" onClick={saveProduct}>
              Save & sync →
            </button>
            <small className="admin-sync-note">
              Product data is stored in Cloud SQL; uploaded images use the
              private KIYOYO media bucket.
            </small>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  trend,
}: {
  label: string;
  value: string;
  note: string;
  trend: string;
}) {
  return (
    <article className="metric">
      <div>
        <span>{label}</span>
        <b>{trend}</b>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
function PanelHead({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      {action && <button onClick={onAction}>{action} →</button>}
    </div>
  );
}
function OrderTable({
  orders,
  catalog,
  onStatus,
}: {
  orders: Order[];
  catalog: Product[];
  onStatus: (id: string, status: Order["status"]) => void;
}) {
  return (
    <div className="order-table">
      <div className="table-head">
        <span>Order</span>
        <span>Store / channel</span>
        <span>Items</span>
        <span>Total</span>
        <span>Status</span>
      </div>
      {orders.map((o) => (
        <div className="order-row" key={o.id}>
          <span>
            <strong>{o.id}</strong>
            <small>
              {new Date(o.createdAt).toLocaleTimeString("en-KE", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Africa/Nairobi",
              })}
            </small>
          </span>
          <span>
            <b>{stores.find((s) => s.id === o.storeId)?.area || o.storeId}</b>
            <small>{o.channel}</small>
          </span>
          <span className="item-stack">
            {o.items.slice(0, 3).map((i) => (
              <img
                key={i.key}
                src={catalog.find((p) => p.id === i.productId)?.image}
                alt=""
              />
            ))}
          </span>
          <strong>{money(o.total)}</strong>
          <select
            className={`status-select s-${o.status.toLowerCase()}`}
            value={o.status}
            onChange={(e) => onStatus(o.id, e.target.value as Order["status"])}
          >
            <option>Placed</option>
            <option>Preparing</option>
            <option>Ready</option>
            <option>Completed</option>
          </select>
        </div>
      ))}
    </div>
  );
}
