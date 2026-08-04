"use client";
/* eslint-disable @next/next/no-img-element -- Tiny admin thumbnails do not need image optimization. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { money, stores } from "../data";
import { salePrice, useCatalog } from "../catalog";
import type { Order, Product } from "../types";

type AdminTab = "overview" | "orders" | "products" | "redeem" | "customers" | "stores";

const sampleOrders: Order[] = [
  { id:"KYO-2608-3186", createdAt:"2026-08-04T13:59:00.000Z", status:"Preparing", channel:"Pickup", storeId:"kilimani", total:920, pickupCode:"M4K8Q2YP", items:[{key:"sample1",productId:"d1",quantity:1,size:"Large",sugar:"50%",ice:"Less ice",toppings:["Boba"]},{key:"sample2",productId:"d4",quantity:1,size:"Regular",sugar:"30%",ice:"Regular",toppings:[]}] },
  { id:"KYO-2608-3179", createdAt:"2026-08-04T13:47:00.000Z", status:"Ready", channel:"Pickup", storeId:"westlands", total:450, pickupCode:"P7LW9X3A", items:[{key:"sample3",productId:"d2",quantity:1,size:"Regular",sugar:"50%",ice:"Less ice",toppings:[]}] },
  { id:"KYO-2608-3162", createdAt:"2026-08-04T13:17:00.000Z", status:"Placed", channel:"Delivery", storeId:"cbd", total:6370, pickupCode:"D2R6N8UZ", items:[{key:"sample4",productId:"d8",quantity:1,size:"Regular",sugar:"30%",ice:"Less ice",toppings:[]},{key:"sample5",productId:"g1",quantity:1}] },
  { id:"KYO-2608-3128", createdAt:"2026-08-04T11:35:00.000Z", status:"Completed", channel:"Pickup", storeId:"parklands", total:840, pickupCode:"USED2219", items:[{key:"sample6",productId:"d3",quantity:2,size:"Regular",sugar:"50%",ice:"Less ice",toppings:[]}] },
];

const customers = [
  { name:"Amina Wanjiku", phone:"+254 712 ••• 481", points:2480, orders:18, tier:"VIP" },
  { name:"Brian Otieno", phone:"+254 733 ••• 092", points:940, orders:7, tier:"Member" },
  { name:"Njeri Kamau", phone:"+254 701 ••• 553", points:620, orders:5, tier:"Member" },
  { name:"Samira Noor", phone:"+254 729 ••• 044", points:310, orders:3, tier:"New" },
];

export default function AdminApp() {
  const [tab,setTab] = useState<AdminTab>("overview");
  const [catalog,setCatalog] = useCatalog();
  const [orders,setOrders] = useState<Order[]>(sampleOrders);
  const [scan,setScan] = useState("");
  const [scanResult,setScanResult] = useState<{ok:boolean;message:string;order?:Order}|null>(null);
  const [storeFilter,setStoreFilter] = useState("all");
  const [productSearch,setProductSearch] = useState("");
  const [productKind,setProductKind] = useState<"all"|"drink"|"goods">("all");
  const [editingProduct,setEditingProduct] = useState<Product|null>(null);
  const [productError,setProductError] = useState("");

  useEffect(() => {
    // Hydrate customer-created demo orders after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const local = JSON.parse(localStorage.getItem("kiyoyo-orders") || "[]") as Order[]; if(local.length) setOrders([...local,...sampleOrders]); } catch { /* demo data */ }
  },[]);
  useEffect(() => { try { localStorage.setItem("kiyoyo-orders",JSON.stringify(orders.filter(o=>!sampleOrders.some(s=>s.id===o.id)))); } catch { /* demo */ } },[orders]);

  const shown = useMemo(()=>orders.filter(o=>storeFilter==="all"||o.storeId===storeFilter),[orders,storeFilter]);
  const active = orders.filter(o=>o.status!=="Completed");
  const revenue = orders.reduce((sum,o)=>sum+o.total,0);
  const shownProducts = useMemo(()=>catalog.filter(product => {
    const query=productSearch.trim().toLowerCase();
    return (productKind==="all"||product.kind===productKind)&&(!query||`${product.name} ${product.nameZh} ${product.category}`.toLowerCase().includes(query));
  }),[catalog,productKind,productSearch]);
  const changeStatus = (id:string,status:Order["status"]) => setOrders(orders.map(o=>o.id===id?{...o,status}:o));
  const toggleProduct = (id:string) => setCatalog(catalog.map(product=>product.id===id?{...product,active:product.active===false,updatedAt:new Date().toISOString()}:product));
  const saveProduct = () => {
    if(!editingProduct||!editingProduct.name.trim()||!editingProduct.nameZh.trim()||editingProduct.price<=0) { setProductError("Complete both names and enter a valid price."); return; }
    const normalized={...editingProduct,discountPercent:Math.max(0,Math.min(90,Number(editingProduct.discountPercent)||0)),updatedAt:new Date().toISOString()};
    setCatalog(catalog.map(product=>product.id===normalized.id?normalized:product)); setEditingProduct(null); setProductError("");
  };
  const updateProductImage = (file?:File) => {
    if(!file||!editingProduct) return;
    if(!file.type.startsWith("image/")) { setProductError("Choose a JPG, PNG or WebP image."); return; }
    if(file.size>1_500_000) { setProductError("For this local demo, use an image under 1.5 MB."); return; }
    const reader=new FileReader();
    reader.onload=()=>setEditingProduct(current=>current?{...current,image:String(reader.result)}:current);
    reader.onerror=()=>setProductError("The image could not be read.");
    reader.readAsDataURL(file);
  };
  const redeem = () => {
    const query=scan.trim().toUpperCase();
    const order=orders.find(o=>o.pickupCode===query||o.id===query);
    if(!order) return setScanResult({ok:false,message:"Code not found. Check the order number or pickup token."});
    if(order.channel!=="Pickup") return setScanResult({ok:false,message:"This is not a pickup order.",order});
    if(order.status==="Completed") return setScanResult({ok:false,message:"Already redeemed — do not release a second order.",order});
    changeStatus(order.id,"Completed"); setScanResult({ok:true,message:"Pickup verified. Hand the order to the customer.",order:{...order,status:"Completed"}});
  };

  return <div className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-brand"><span className="logo">KIYOYO</span><small>OPERATIONS</small></div><nav>{(["overview","orders","products","redeem","customers","stores"] as AdminTab[]).map(item=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}><i>{{overview:"▦",orders:"▤",products:"◇",redeem:"⌗",customers:"☺",stores:"⌖"}[item]}</i><span>{item}</span>{item==="orders"&&<b>{active.length}</b>}</button>)}</nav><Link href="/">← Customer store</Link><div className="admin-user"><i>KO</i><span><strong>Store Admin</strong><small>Nairobi HQ</small></span></div></aside>
    <main className="admin-main"><header className="admin-top"><div><small>KIYOYO / NAIROBI</small><h1>{tab}</h1></div><div><span className="live-dot"/> Live demo <button>Notifications <b>{active.length}</b></button></div></header>

      {tab==="overview"&&<><section className="metric-grid"><Metric label="Today’s orders" value={String(orders.length)} note={`${active.length} active now`} trend="+12%"/><Metric label="Gross sales" value={money(revenue)} note="Mock payment value" trend="+8%"/><Metric label="Ready for pickup" value={String(orders.filter(o=>o.status==="Ready").length)} note="Needs attention" trend="LIVE"/><Metric label="Members" value="1,284" note="Across Nairobi" trend="+24"/></section><div className="admin-two"><section className="admin-panel"><PanelHead title="Live orders" action="View all" onAction={()=>setTab("orders")}/><OrderTable orders={orders.slice(0,5)} catalog={catalog} onStatus={changeStatus}/></section><section className="admin-panel store-pulse"><PanelHead title="Store pulse"/><div className="pulse-chart">{stores.slice(0,5).map((s,i)=><div key={s.id}><span>{s.area}</span><i><b style={{height:`${[82,68,58,46,31][i]}%`}}/></i><strong>{[32,27,23,18,11][i]}</strong></div>)}</div><small>Orders today · illustrative demo data</small></section></div><section className="admin-panel quick"><PanelHead title="Quick actions"/><div><button onClick={()=>setTab("products")}><i>◇</i><strong>Manage products</strong><span>Pricing, offers & images</span></button><button onClick={()=>setTab("redeem")}><i>⌗</i><strong>Redeem pickup</strong><span>Verify one-time QR</span></button><button onClick={()=>setTab("orders")}><i>▤</i><strong>Manage orders</strong><span>Update preparation status</span></button></div></section></>}

      {tab==="orders"&&<section className="admin-panel wide"><div className="orders-tools"><PanelHead title="All orders"/><select value={storeFilter} onChange={e=>setStoreFilter(e.target.value)}><option value="all">All Nairobi stores</option>{stores.map(s=><option key={s.id} value={s.id}>{s.area}</option>)}</select></div><OrderTable orders={shown} catalog={catalog} onStatus={changeStatus}/></section>}

      {tab==="products"&&<section className="admin-panel wide product-management"><div className="product-admin-head"><div><span className="red-label">LIVE CATALOG</span><h2>Product management</h2><p>Changes sync to the customer storefront on this browser.</p></div><div className="catalog-stats"><span><b>{catalog.filter(p=>p.active!==false).length}</b> live</span><span><b>{catalog.filter(p=>(p.discountPercent||0)>0).length}</b> offers</span></div></div><div className="product-admin-tools"><label><span>⌕</span><input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search products"/></label><div>{(["all","drink","goods"] as const).map(kind=><button key={kind} className={productKind===kind?"active":""} onClick={()=>setProductKind(kind)}>{kind}</button>)}</div></div><div className="admin-product-list"><div className="product-list-head"><span>Product</span><span>Price</span><span>Offer</span><span>Visibility</span><span>Action</span></div>{shownProducts.map(product=><article key={product.id} className={product.active===false?"offline":""}><span className="admin-product-name"><img src={product.image} alt=""/><span><strong>{product.name}</strong><small>{product.nameZh} · {product.category}</small></span></span><span className="admin-price"><strong>{money(salePrice(product))}</strong>{(product.discountPercent||0)>0&&<del>{money(product.price)}</del>}</span><span>{(product.discountPercent||0)>0?<em className="offer-pill">−{product.discountPercent}%</em>:<small>—</small>}</span><span><button className={`publish-toggle ${product.active===false?"off":""}`} onClick={()=>toggleProduct(product.id)}><i/>{product.active===false?"Offline":"Live"}</button></span><span><button className="edit-product" onClick={()=>{setEditingProduct({...product,active:product.active!==false});setProductError("");}}>Edit →</button></span></article>)}</div></section>}

      {tab==="redeem"&&<div className="redeem-layout"><section className="redeem-card"><span className="red-label">ONE-TIME PICKUP</span><h2>Scan or enter code</h2><p>Use a customer’s QR pickup token or order number. A completed code cannot be used twice.</p><div className="scanner-frame"><div className="scanner-line"/><span>⌗</span><small>Camera scanner placeholder</small></div><label><span>Pickup token / Order ID</span><div><input value={scan} onChange={e=>setScan(e.target.value)} onKeyDown={e=>e.key==="Enter"&&redeem()} placeholder="e.g. P7LW9X3A"/><button onClick={redeem}>Verify →</button></div></label><button className="demo-code" onClick={()=>setScan("P7LW9X3A")}>Use demo ready code: P7LW9X3A</button></section><aside className={`scan-result ${scanResult?(scanResult.ok?"ok":"bad"):""}`}>{scanResult?<><span>{scanResult.ok?"✓":"!"}</span><h3>{scanResult.ok?"Verified":"Cannot redeem"}</h3><p>{scanResult.message}</p>{scanResult.order&&<div><b>{scanResult.order.id}</b><small>{stores.find(s=>s.id===scanResult.order?.storeId)?.name}</small><strong>{money(scanResult.order.total)}</strong></div>}</>:<><span>⌗</span><h3>Waiting for a code</h3><p>The verification result and order summary will appear here.</p></>}</aside></div>}

      {tab==="customers"&&<section className="admin-panel wide"><PanelHead title="Customers"/><div className="customer-table"><div className="table-head"><span>Customer</span><span>Tier</span><span>Points</span><span>Orders</span><span>Action</span></div>{customers.map(c=><div className="customer-row" key={c.phone}><span><i>{c.name.split(" ").map(x=>x[0]).join("")}</i><b>{c.name}<small>{c.phone}</small></b></span><span><em>{c.tier}</em></span><strong>{c.points.toLocaleString()}</strong><span>{c.orders}</span><button>View →</button></div>)}</div></section>}

      {tab==="stores"&&<section className="admin-panel wide"><PanelHead title="Nairobi stores"/><div className="admin-store-grid">{stores.map((s,i)=><article key={s.id}><span>0{i+1}</span><div><h3>{s.name}</h3><p>{s.address}</p><small>{s.phone}</small></div><em className={s.verified?"verified":"pending"}>{s.verified?"Verified":"Confirm details"}</em></article>)}</div><div className="store-warning">ⓘ Public KIYOYO sources currently verify four branches. Eastleigh and Store 06 require exact operations data before production launch.</div></section>}
    </main>
    {editingProduct&&<div className="modal-backdrop"><div className="admin-product-modal"><button className="modal-close" onClick={()=>setEditingProduct(null)}>×</button><span className="red-label">EDIT PRODUCT</span><h2>{editingProduct.name}</h2><div className="product-image-editor"><img src={editingProduct.image} alt="Product preview"/><label><strong>Replace image</strong><span>JPG, PNG or WebP · max 1.5 MB in local demo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>updateProductImage(e.target.files?.[0])}/></label></div><label className="form-field"><span>Image path / URL</span><input value={editingProduct.image} onChange={e=>setEditingProduct({...editingProduct,image:e.target.value})}/></label><div className="form-split"><label className="form-field"><span>English name</span><input value={editingProduct.name} onChange={e=>setEditingProduct({...editingProduct,name:e.target.value})}/></label><label className="form-field"><span>Chinese name</span><input value={editingProduct.nameZh} onChange={e=>setEditingProduct({...editingProduct,nameZh:e.target.value})}/></label></div><div className="form-split"><label className="form-field"><span>Base price (KSh)</span><input type="number" min="1" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct,price:Number(e.target.value)})}/></label><label className="form-field"><span>Discount %</span><input type="number" min="0" max="90" value={editingProduct.discountPercent||0} onChange={e=>setEditingProduct({...editingProduct,discountPercent:Number(e.target.value)})}/></label></div><div className="sale-preview"><span>Customer price</span><strong>{money(salePrice(editingProduct))}</strong>{(editingProduct.discountPercent||0)>0&&<del>{money(editingProduct.price)}</del>}</div><label className="admin-publish-check"><input type="checkbox" checked={editingProduct.active!==false} onChange={e=>setEditingProduct({...editingProduct,active:e.target.checked})}/><span><strong>Published on storefront</strong><small>Uncheck to hide this item and block checkout.</small></span></label>{productError&&<div className="form-error">{productError}</div>}<button className="primary full" onClick={saveProduct}>Save & sync →</button><small className="admin-sync-note">Changes are stored locally for the MVP. Production uses Cloud SQL and Cloud Storage.</small></div></div>}
  </div>;
}

function Metric({label,value,note,trend}:{label:string;value:string;note:string;trend:string}) { return <article className="metric"><div><span>{label}</span><b>{trend}</b></div><strong>{value}</strong><small>{note}</small></article>; }
function PanelHead({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}) { return <div className="panel-head"><h2>{title}</h2>{action&&<button onClick={onAction}>{action} →</button>}</div>; }
function OrderTable({orders,catalog,onStatus}:{orders:Order[];catalog:Product[];onStatus:(id:string,status:Order["status"])=>void}) { return <div className="order-table"><div className="table-head"><span>Order</span><span>Store / channel</span><span>Items</span><span>Total</span><span>Status</span></div>{orders.map(o=><div className="order-row" key={o.id}><span><strong>{o.id}</strong><small>{new Date(o.createdAt).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Nairobi"})}</small></span><span><b>{stores.find(s=>s.id===o.storeId)?.area||o.storeId}</b><small>{o.channel}</small></span><span className="item-stack">{o.items.slice(0,3).map(i=><img key={i.key} src={catalog.find(p=>p.id===i.productId)?.image} alt=""/>)}</span><strong>{money(o.total)}</strong><select className={`status-select s-${o.status.toLowerCase()}`} value={o.status} onChange={e=>onStatus(o.id,e.target.value as Order["status"])}><option>Placed</option><option>Preparing</option><option>Ready</option><option>Completed</option></select></div>)}</div>; }
