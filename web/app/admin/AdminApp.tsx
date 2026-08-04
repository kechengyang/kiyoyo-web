"use client";
/* eslint-disable @next/next/no-img-element -- Tiny admin thumbnails do not need image optimization. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { money, products, stores } from "../data";
import type { Order } from "../types";

type AdminTab = "overview" | "orders" | "redeem" | "customers" | "stores";

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
  const [orders,setOrders] = useState<Order[]>(sampleOrders);
  const [scan,setScan] = useState("");
  const [scanResult,setScanResult] = useState<{ok:boolean;message:string;order?:Order}|null>(null);
  const [storeFilter,setStoreFilter] = useState("all");

  useEffect(() => {
    // Hydrate customer-created demo orders after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const local = JSON.parse(localStorage.getItem("kiyoyo-orders") || "[]") as Order[]; if(local.length) setOrders([...local,...sampleOrders]); } catch { /* demo data */ }
  },[]);
  useEffect(() => { try { localStorage.setItem("kiyoyo-orders",JSON.stringify(orders.filter(o=>!sampleOrders.some(s=>s.id===o.id)))); } catch { /* demo */ } },[orders]);

  const shown = useMemo(()=>orders.filter(o=>storeFilter==="all"||o.storeId===storeFilter),[orders,storeFilter]);
  const active = orders.filter(o=>o.status!=="Completed");
  const revenue = orders.reduce((sum,o)=>sum+o.total,0);
  const changeStatus = (id:string,status:Order["status"]) => setOrders(orders.map(o=>o.id===id?{...o,status}:o));
  const redeem = () => {
    const query=scan.trim().toUpperCase();
    const order=orders.find(o=>o.pickupCode===query||o.id===query);
    if(!order) return setScanResult({ok:false,message:"Code not found. Check the order number or pickup token."});
    if(order.channel!=="Pickup") return setScanResult({ok:false,message:"This is not a pickup order.",order});
    if(order.status==="Completed") return setScanResult({ok:false,message:"Already redeemed — do not release a second order.",order});
    changeStatus(order.id,"Completed"); setScanResult({ok:true,message:"Pickup verified. Hand the order to the customer.",order:{...order,status:"Completed"}});
  };

  return <div className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-brand"><span className="logo">KIYOYO</span><small>OPERATIONS</small></div><nav>{(["overview","orders","redeem","customers","stores"] as AdminTab[]).map(item=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}><i>{{overview:"▦",orders:"▤",redeem:"⌗",customers:"☺",stores:"⌖"}[item]}</i><span>{item}</span>{item==="orders"&&<b>{active.length}</b>}</button>)}</nav><Link href="/">← Customer store</Link><div className="admin-user"><i>KO</i><span><strong>Store Admin</strong><small>Nairobi HQ</small></span></div></aside>
    <main className="admin-main"><header className="admin-top"><div><small>KIYOYO / NAIROBI</small><h1>{tab}</h1></div><div><span className="live-dot"/> Live demo <button>Notifications <b>{active.length}</b></button></div></header>

      {tab==="overview"&&<><section className="metric-grid"><Metric label="Today’s orders" value={String(orders.length)} note={`${active.length} active now`} trend="+12%"/><Metric label="Gross sales" value={money(revenue)} note="Mock payment value" trend="+8%"/><Metric label="Ready for pickup" value={String(orders.filter(o=>o.status==="Ready").length)} note="Needs attention" trend="LIVE"/><Metric label="Members" value="1,284" note="Across Nairobi" trend="+24"/></section><div className="admin-two"><section className="admin-panel"><PanelHead title="Live orders" action="View all" onAction={()=>setTab("orders")}/><OrderTable orders={orders.slice(0,5)} onStatus={changeStatus}/></section><section className="admin-panel store-pulse"><PanelHead title="Store pulse"/><div className="pulse-chart">{stores.slice(0,5).map((s,i)=><div key={s.id}><span>{s.area}</span><i><b style={{height:`${[82,68,58,46,31][i]}%`}}/></i><strong>{[32,27,23,18,11][i]}</strong></div>)}</div><small>Orders today · illustrative demo data</small></section></div><section className="admin-panel quick"><PanelHead title="Quick actions"/><div><button onClick={()=>setTab("redeem")}><i>⌗</i><strong>Redeem pickup</strong><span>Verify one-time QR</span></button><button onClick={()=>setTab("orders")}><i>▤</i><strong>Manage orders</strong><span>Update preparation status</span></button><button onClick={()=>setTab("customers")}><i>☺</i><strong>Find customer</strong><span>Points and history</span></button></div></section></>}

      {tab==="orders"&&<section className="admin-panel wide"><div className="orders-tools"><PanelHead title="All orders"/><select value={storeFilter} onChange={e=>setStoreFilter(e.target.value)}><option value="all">All Nairobi stores</option>{stores.map(s=><option key={s.id} value={s.id}>{s.area}</option>)}</select></div><OrderTable orders={shown} onStatus={changeStatus}/></section>}

      {tab==="redeem"&&<div className="redeem-layout"><section className="redeem-card"><span className="red-label">ONE-TIME PICKUP</span><h2>Scan or enter code</h2><p>Use a customer’s QR pickup token or order number. A completed code cannot be used twice.</p><div className="scanner-frame"><div className="scanner-line"/><span>⌗</span><small>Camera scanner placeholder</small></div><label><span>Pickup token / Order ID</span><div><input value={scan} onChange={e=>setScan(e.target.value)} onKeyDown={e=>e.key==="Enter"&&redeem()} placeholder="e.g. P7LW9X3A"/><button onClick={redeem}>Verify →</button></div></label><button className="demo-code" onClick={()=>setScan("P7LW9X3A")}>Use demo ready code: P7LW9X3A</button></section><aside className={`scan-result ${scanResult?(scanResult.ok?"ok":"bad"):""}`}>{scanResult?<><span>{scanResult.ok?"✓":"!"}</span><h3>{scanResult.ok?"Verified":"Cannot redeem"}</h3><p>{scanResult.message}</p>{scanResult.order&&<div><b>{scanResult.order.id}</b><small>{stores.find(s=>s.id===scanResult.order?.storeId)?.name}</small><strong>{money(scanResult.order.total)}</strong></div>}</>:<><span>⌗</span><h3>Waiting for a code</h3><p>The verification result and order summary will appear here.</p></>}</aside></div>}

      {tab==="customers"&&<section className="admin-panel wide"><PanelHead title="Customers"/><div className="customer-table"><div className="table-head"><span>Customer</span><span>Tier</span><span>Points</span><span>Orders</span><span>Action</span></div>{customers.map(c=><div className="customer-row" key={c.phone}><span><i>{c.name.split(" ").map(x=>x[0]).join("")}</i><b>{c.name}<small>{c.phone}</small></b></span><span><em>{c.tier}</em></span><strong>{c.points.toLocaleString()}</strong><span>{c.orders}</span><button>View →</button></div>)}</div></section>}

      {tab==="stores"&&<section className="admin-panel wide"><PanelHead title="Nairobi stores"/><div className="admin-store-grid">{stores.map((s,i)=><article key={s.id}><span>0{i+1}</span><div><h3>{s.name}</h3><p>{s.address}</p><small>{s.phone}</small></div><em className={s.verified?"verified":"pending"}>{s.verified?"Verified":"Confirm details"}</em></article>)}</div><div className="store-warning">ⓘ Public KIYOYO sources currently verify four branches. Eastleigh and Store 06 require exact operations data before production launch.</div></section>}
    </main>
  </div>;
}

function Metric({label,value,note,trend}:{label:string;value:string;note:string;trend:string}) { return <article className="metric"><div><span>{label}</span><b>{trend}</b></div><strong>{value}</strong><small>{note}</small></article>; }
function PanelHead({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}) { return <div className="panel-head"><h2>{title}</h2>{action&&<button onClick={onAction}>{action} →</button>}</div>; }
function OrderTable({orders,onStatus}:{orders:Order[];onStatus:(id:string,status:Order["status"])=>void}) { return <div className="order-table"><div className="table-head"><span>Order</span><span>Store / channel</span><span>Items</span><span>Total</span><span>Status</span></div>{orders.map(o=><div className="order-row" key={o.id}><span><strong>{o.id}</strong><small>{new Date(o.createdAt).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Nairobi"})}</small></span><span><b>{stores.find(s=>s.id===o.storeId)?.area||o.storeId}</b><small>{o.channel}</small></span><span className="item-stack">{o.items.slice(0,3).map(i=><img key={i.key} src={products.find(p=>p.id===i.productId)?.image} alt=""/>)}</span><strong>{money(o.total)}</strong><select className={`status-select s-${o.status.toLowerCase()}`} value={o.status} onChange={e=>onStatus(o.id,e.target.value as Order["status"])}><option>Placed</option><option>Preparing</option><option>Ready</option><option>Completed</option></select></div>)}</div>; }
