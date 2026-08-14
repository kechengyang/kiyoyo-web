import { EventEmitter } from "node:events";
import type { PoolClient } from "pg";
import { pool } from "./db.js";

const ORDER_CHANNEL = "kiyoyo_new_orders";
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export type OrderCreatedEvent = {
  type: "created";
  orderNumber: string;
  createdAt: string;
  storeId: string | null;
};

export type OrderStatusChangedEvent = {
  type: "status-changed";
  orderNumber: string;
  updatedAt: string;
  storeId: string | null;
};

export type OrderEvent = OrderCreatedEvent | OrderStatusChangedEvent;

let listenerClient: PoolClient | null = null;
let listenerConnection: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let closing = false;

const parseOrderEvent = (payload?: string): OrderEvent | null => {
  if (!payload) return null;
  try {
    const event = JSON.parse(payload) as {
      type?: unknown;
      orderNumber?: unknown;
      createdAt?: unknown;
      updatedAt?: unknown;
      storeId?: unknown;
    };
    if (typeof event.orderNumber !== "string") return null;
    if (event.storeId !== null && typeof event.storeId !== "string") return null;
    if (event.type === "created" && typeof event.createdAt === "string") {
      return event as OrderCreatedEvent;
    }
    if (event.type === undefined && typeof event.createdAt === "string") {
      return { ...event, type: "created" } as OrderCreatedEvent;
    }
    if (event.type === "status-changed" && typeof event.updatedAt === "string") {
      return event as OrderStatusChangedEvent;
    }
    return null;
  } catch {
    return null;
  }
};

const scheduleReconnect = () => {
  if (closing || reconnectTimer || emitter.listenerCount("order") === 0) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void ensureOrderEventListener().catch(scheduleReconnect);
  }, 1_000);
};

const disconnectListener = (client: PoolClient) => {
  if (listenerClient !== client) return;
  listenerClient = null;
  client.release(true);
  scheduleReconnect();
};

const connectOrderEventListener = async () => {
  const client = await pool.connect();
  try {
    await client.query(`listen ${ORDER_CHANNEL}`);
    if (closing) {
      await client.query(`unlisten ${ORDER_CHANNEL}`);
      client.release();
      return;
    }
    listenerClient = client;
    client.on("notification", (notification) => {
      if (notification.channel !== ORDER_CHANNEL) return;
      const event = parseOrderEvent(notification.payload);
      if (event) emitter.emit("order", event);
    });
    client.once("error", () => disconnectListener(client));
    client.once("end", () => disconnectListener(client));
  } catch (error) {
    client.release(true);
    throw error;
  }
};

export const ensureOrderEventListener = async () => {
  if (listenerClient) return;
  if (!listenerConnection) {
    listenerConnection = connectOrderEventListener().finally(() => {
      listenerConnection = null;
    });
  }
  await listenerConnection;
};

export const subscribeToOrderEvents = (listener: (event: OrderEvent) => void) => {
  emitter.on("order", listener);
  return () => emitter.off("order", listener);
};

export const notifyOrderCreated = (
  client: PoolClient,
  event: Omit<OrderCreatedEvent, "type">,
) => client.query("select pg_notify($1,$2)", [
  ORDER_CHANNEL,
  JSON.stringify({ ...event, type: "created" } satisfies OrderCreatedEvent),
]);

export const notifyOrderStatusChanged = (
  client: PoolClient,
  event: Omit<OrderStatusChangedEvent, "type">,
) => client.query("select pg_notify($1,$2)", [
  ORDER_CHANNEL,
  JSON.stringify({ ...event, type: "status-changed" } satisfies OrderStatusChangedEvent),
]);

export const closeOrderEventListener = async () => {
  closing = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  await listenerConnection?.catch(() => undefined);
  const client = listenerClient;
  listenerClient = null;
  if (!client) return;
  try {
    await client.query(`unlisten ${ORDER_CHANNEL}`);
  } finally {
    client.release();
  }
};
