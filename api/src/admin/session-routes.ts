import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { query } from "../db.js";
import { requirePermission, requireStaff } from "../auth.js";

async function resolveOverviewScope(request: FastifyRequest, reply: FastifyReply) {
  const input = z.object({ store_id: z.string().optional() }).parse(request.query);
  const staff = request.actor!.staff!;
  if (!input.store_id) return staff.role === "ADMIN" ? null : staff.storeIds;
  const store = await query<{ id: string }>(
    "select id::text from stores where id::text=$1 or code=$1",
    [input.store_id],
  );
  if (!store.rowCount) {
    reply.code(404).send({ error: { code: "NOT_FOUND", message: "Store not found" } });
    return undefined;
  }
  const storeId = store.rows[0].id;
  if (staff.role !== "ADMIN" && !staff.storeIds.includes(storeId)) {
    reply.code(404).send({ error: { code: "NOT_FOUND", message: "Store not found" } });
    return undefined;
  }
  return [storeId];
}

export function registerAdminSessionRoutes(app: FastifyInstance) {
  app.get("/v1/admin/session", { preHandler: requireStaff }, async (request) => {
    const staff = request.actor!.staff!;
    const stores = staff.role === "ADMIN"
      ? await query(
          `select id,code,name,area,status,pickup_enabled,delivery_enabled
             from stores order by name`,
        )
      : await query(
          `select s.id,s.code,s.name,s.area,s.status,s.pickup_enabled,s.delivery_enabled
             from stores s where s.id=any($1::uuid[]) order by s.name`,
          [staff.storeIds],
        );
    return {
      data: {
        user_id: request.actor!.userId,
        username: staff.username,
        role: staff.role,
        permissions: staff.permissions,
        stores: stores.rows,
        legacy: staff.legacy,
      },
    };
  });

  app.get(
    "/v1/admin/context/stores",
    { preHandler: requirePermission("stores.read") },
    async (request) => {
      const staff = request.actor!.staff!;
      const result = staff.role === "ADMIN"
        ? await query(
            `select id,code,name,area,address,phone,lat::float,lng::float,status,
                    pickup_enabled,delivery_enabled,location_verified
               from stores order by name`,
          )
        : await query(
            `select id,code,name,area,address,phone,lat::float,lng::float,status,
                    pickup_enabled,delivery_enabled,location_verified
               from stores where id=any($1::uuid[]) order by name`,
            [staff.storeIds],
          );
      return { data: result.rows };
    },
  );

  app.get(
    "/v1/admin/overview",
    { preHandler: requirePermission("overview.read") },
    async (request, reply) => {
      const scope = await resolveOverviewScope(request, reply);
      if (reply.sent || scope === undefined) return;
      const scopeValue = scope === null ? null : scope;
      const [metrics, recentOrders, storePulse, stores] = await Promise.all([
        query(
          `with scoped_fulfillments as (
             select f.id,f.order_id,f.store_id,f.status,o.user_id
               from fulfillment_groups f join orders o on o.id=f.order_id
              where ($1::uuid[] is null or f.store_id=any($1::uuid[]))
           ), scoped_orders as (
             select distinct order_id,user_id from scoped_fulfillments
           )
           select
             (select count(*)::int from scoped_orders) as order_count,
             (select count(*)::int from scoped_fulfillments where status not in ('COMPLETED','CANCELLED')) as active_count,
             (select count(*)::int from scoped_fulfillments where status='READY') as ready_count,
             (select count(distinct user_id)::int from scoped_orders) as customer_count,
             (select coalesce(sum(oi.line_total),0)::int from order_items oi
               join scoped_fulfillments sf on sf.id=oi.fulfillment_group_id) as gross_sales`,
          [scopeValue],
        ),
        query(
          `select o.order_number,o.total,o.payment_status,o.is_test,o.created_at,u.nickname,u.email,
                  f.id as fulfillment_id,f.type,f.status,f.address_snapshot_json,
                  s.code as store_code,s.name as store_name,
                  coalesce((
                    select jsonb_agg(jsonb_build_object(
                      'id',oi.id,'product_id',oi.product_id,'product_code',p.external_code,
                      'name',oi.name_snapshot,'kind',oi.kind,'quantity',oi.quantity,
                      'unit_price',oi.unit_price,'line_total',oi.line_total,
                      'customization',oi.customization_json
                    ) order by oi.id)
                    from order_items oi left join products p on p.id=oi.product_id
                    where oi.fulfillment_group_id=f.id
                  ),'[]'::jsonb) as items
             from orders o join users u on u.id=o.user_id
             join fulfillment_groups f on f.order_id=o.id
             left join stores s on s.id=f.store_id
            where ($1::uuid[] is null or f.store_id=any($1::uuid[]))
            order by o.created_at desc limit 5`,
          [scopeValue],
        ),
        query(
          `select s.id,s.code,s.name,s.area,count(f.id)::int as order_count
             from stores s left join fulfillment_groups f on f.store_id=s.id
            where ($1::uuid[] is null or s.id=any($1::uuid[]))
            group by s.id order by s.name`,
          [scopeValue],
        ),
        scopeValue === null
          ? query("select id,code,name,area from stores order by name")
          : query("select id,code,name,area from stores where id=any($1::uuid[]) order by name", [scopeValue]),
      ]);
      return {
        data: {
          scope: { mode: scopeValue === null ? "GLOBAL" : "ASSIGNED", stores: stores.rows },
          metrics: metrics.rows[0],
          recent_orders: recentOrders.rows,
          store_pulse: storePulse.rows,
        },
      };
    },
  );
}
