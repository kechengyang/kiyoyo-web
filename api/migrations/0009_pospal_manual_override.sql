-- Admin 手动锁定:线上与线下不一致的场景,锁定的商品同步不覆盖
-- (银豹为准的默认行为保留;Admin 看同步差分报表后对例外商品开锁)
alter table products
  add column pospal_manual_override boolean not null default false;
