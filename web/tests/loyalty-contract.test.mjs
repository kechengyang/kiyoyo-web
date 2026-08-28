import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("customer loyalty uses live API data rather than demonstration points", async () => {
  const [app, account, checkout, platform] = await Promise.all([
    read("../app/components/KiyoyoApp.tsx"),
    read("../app/components/customer/account/AccountView.tsx"),
    read("../app/components/customer/cart/CheckoutDialog.tsx"),
    read("../app/platform.ts"),
  ]);
  assert.match(app, /fetchMemberLoyalty/);
  assert.match(app, /points_to_redeem: pointsToRedeem/);
  assert.match(account, /loyalty\.balancePoints/);
  assert.doesNotMatch(account, />2,480</);
  assert.match(checkout, /Use points/);
  assert.match(checkout, /Points deduction/);
  assert.match(platform, /\/v1\/me\/loyalty/);
});
