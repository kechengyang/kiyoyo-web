import type pg from "pg";

export type LoyaltyTransactionType =
  | "ORDER_EARN"
  | "ORDER_REDEEM"
  | "MANUAL_CREDIT"
  | "MANUAL_DEBIT";

export const earnRatePercent = (basisPoints: number) => basisPoints / 100;

export const calculateEarnedPoints = (
  eligibleAmount: number,
  earnRateBasisPoints: number,
) => Math.floor(Math.max(0, eligibleAmount) * earnRateBasisPoints / 10_000);

export const calculatePointsRedemption = (
  requestedPoints: number,
  balancePoints: number,
  payableAmount: number,
) => {
  if (!Number.isInteger(requestedPoints) || requestedPoints < 0) {
    return { error: "Points to redeem must be a non-negative whole number" } as const;
  }
  if (requestedPoints > balancePoints) {
    return { error: "Your points balance is too low" } as const;
  }
  if (requestedPoints > payableAmount) {
    return { error: "Points cannot exceed the amount due" } as const;
  }
  return { points: requestedPoints, discount: requestedPoints } as const;
};

export async function lockLoyaltyWallet(client: pg.PoolClient, userId: string) {
  await client.query(
    `insert into loyalty_wallets(user_id) values($1)
     on conflict(user_id) do nothing`,
    [userId],
  );
  const result = await client.query<{
    balance_points: number;
    lifetime_earned_points: number;
    lifetime_redeemed_points: number;
  }>(
    `select balance_points,lifetime_earned_points,lifetime_redeemed_points
       from loyalty_wallets where user_id=$1 for update`,
    [userId],
  );
  return result.rows[0];
}

export async function recordLoyaltyTransaction(
  client: pg.PoolClient,
  input: {
    userId: string;
    transactionType: LoyaltyTransactionType;
    points: number;
    orderId?: string;
    actorId?: string;
    reason?: string;
    externalReference?: string;
    idempotencyKey?: string;
    earnRateBasisPoints?: number;
    isTest?: boolean;
  },
) {
  const wallet = await lockLoyaltyWallet(client, input.userId);
  const nextBalance = wallet.balance_points + input.points;
  if (nextBalance < 0) throw new Error("LOYALTY_BALANCE_TOO_LOW");
  const earned = input.points > 0 && input.transactionType === "ORDER_EARN" ? input.points : 0;
  const redeemed = input.points < 0 && input.transactionType === "ORDER_REDEEM" ? -input.points : 0;
  await client.query(
    `update loyalty_wallets
        set balance_points=$2,
            lifetime_earned_points=lifetime_earned_points+$3,
            lifetime_redeemed_points=lifetime_redeemed_points+$4,
            updated_at=now()
      where user_id=$1`,
    [input.userId, nextBalance, earned, redeemed],
  );
  const transaction = await client.query(
    `insert into loyalty_transactions(
       user_id,transaction_type,points,balance_after,order_id,actor_id,reason,external_reference,idempotency_key,earn_rate_basis_points,is_test
     ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     returning id,transaction_type,points,balance_after,order_id,reason,external_reference,idempotency_key,earn_rate_basis_points,is_test,created_at`,
    [
      input.userId,
      input.transactionType,
      input.points,
      nextBalance,
      input.orderId ?? null,
      input.actorId ?? null,
      input.reason ?? null,
      input.externalReference ?? null,
      input.idempotencyKey ?? null,
      input.earnRateBasisPoints ?? null,
      input.isTest ?? false,
    ],
  );
  return transaction.rows[0];
}
