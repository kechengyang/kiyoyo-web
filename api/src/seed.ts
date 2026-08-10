import { config } from "./config.js";
import { pool } from "./db.js";

const stores = [
  ["kilimani", "KIYOYO Kilimani", "Kilimani", "Argwings Kodhek Road, Nairobi", "0707 557 667", -1.2931495, 36.7923182, true],
  ["westlands", "KIYOYO Westlands", "Westlands", "Ring Road Parklands, Nairobi", "0790 909 519", -1.2641254, 36.8028556, true],
  ["cbd", "KIYOYO CBD", "CBD", "Watalii Lane, Nairobi", "0724 088 886", -1.2851028, 36.824717, true],
  ["parklands", "KIYOYO Parklands", "Parklands", "Parklands, Nairobi", "0792 069 688", -1.2577, 36.8172, true],
  ["eastleigh", "KIYOYO Eastleigh", "Eastleigh", "Eastleigh, Nairobi · confirm exact pin", null, -1.2695, 36.8509, false],
  ["store-6", "KIYOYO Store 06", "Coming soon", "Address awaiting operations confirmation", null, null, null, false],
] as const;

type ProductSeed = {
  code: string;
  kind: "DRINK" | "GOODS";
  category: string;
  slug: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  prices: Record<string, number>;
  image: string;
  badge?: string;
};

const categoryCopy: Record<string, readonly [string, string]> = {
  "milk-tea": ["Freshly made KIYOYO milk tea with a smooth, comforting finish.", "KIYOYO 现制奶茶，口感顺滑醇香。"],
  "fruit-tea": ["Bright fruit and fragrant tea, shaken fresh to order.", "清新水果与香茶现点现摇。"],
  "jelly-tea": ["A refreshing fruit tea layered with springy jelly.", "清爽水果茶搭配弹嫩茶冻。"],
  coffee: ["KIYOYO coffee made fresh for an easy lift.", "KIYOYO 现制咖啡，香醇提神。"],
  shake: ["A creamy fruit shake made for happy days.", "香甜水果摇摇奶昔，为快乐加倍。"],
  sundae: ["Cool, creamy soft serve with a playful finish.", "冰凉绵密的软冰淇淋，甜蜜又有趣。"],
  "cheese-smoothie": ["Fresh fruit blended with a cloud-soft cheese cap.", "新鲜水果搭配云朵般绵密芝士奶盖。"],
  souffle: ["A light KIYOYO soufflé with a soft, airy centre.", "轻盈松软的 KIYOYO 舒芙蕾。"],
  "add-ons": ["Add an extra texture or creamy finish to your drink.", "为饮品增加一份口感或香浓风味。"],
};

type MenuRow = readonly [string, string, string, string, string, Record<string, number>, string, string?];

const menuRows: MenuRow[] = [
  ["A1", "milk-tea", "assam-boba-tea", "Assam Boba Tea", "阿萨姆珍珠奶茶", { M: 380, L: 480 }, "A1-assam-boba-tea.jpg", "RECOMMENDED"],
  ["A2", "milk-tea", "aroma-boba-tea", "Aroma Boba Tea", "蜜香珍珠奶茶", { M: 380, L: 480 }, "A2-aroma-boba-tea.jpg"],
  ["A3", "milk-tea", "classic-boba-tea", "Classic Boba Tea", "经典珍珠奶茶", { M: 380, L: 480 }, "A3-classic-boba-tea.jpg"],
  ["A4", "milk-tea", "tiger-sugar-boba-tea", "Tiger Sugar Boba Tea", "老虎糖奶茶", { M: 420 }, "A4-tiger-sugar-boba-tea.jpg"],
  ["A5", "milk-tea", "taro-coconut", "Taro Coconut", "香芋椰椰", { M: 380 }, "A5-taro-coconut.jpg"],
  ["A6", "milk-tea", "jasmine-milk-green-tea", "Jasmine Milk Green Tea", "茉莉奶绿", { M: 380, L: 480 }, "A6-jasmine-milk-green-tea.jpg"],
  ["A7", "milk-tea", "mocha-snow-cap", "Mocha Snow Cap", "巧克力摩卡雪顶", { L: 480 }, "A7-mocha-snow-cap.jpg"],
  ["A8", "milk-tea", "matcha-snow-cap", "Matcha Snow Cap", "抹茶奶绿雪顶", { L: 480 }, "A8-matcha-snow-cap.jpg", "RECOMMENDED"],
  ["A9", "milk-tea", "coconut-boba", "Coconut Boba", "生椰珍珠奶茶", { M: 380 }, "A9-coconut-boba.jpg"],
  ["B1", "fruit-tea", "get-rich-tea", "Get Rich Tea", "柠檬茶", { M: 99 }, "B1-get-rich-tea.jpg"],
  ["B2", "fruit-tea", "aroma-lemonade", "Aroma Lemonade", "香水柠檬", { M: 199 }, "B2-aroma-lemonade.jpg"],
  ["B3", "fruit-tea", "grapefruit-tea", "Grapefruit Tea", "西柚水果茶", { M: 380 }, "B3-grapefruit-tea.jpg"],
  ["B4", "fruit-tea", "passion-fruit-tea", "Passion Fruit Tea", "百香果水果茶", { M: 420, L: 480 }, "B4-passion-fruit-tea.jpg", "RECOMMENDED"],
  ["B5", "fruit-tea", "green-grape-tea", "Green Grape Tea", "青提白月光", { L: 520 }, "B5-green-grape-tea.jpg"],
  ["D1", "jelly-tea", "mango-passion-jelly-tea", "Mango Passion Jelly Tea", "芒果百香冻冻茶", { L: 480 }, "D1-mango-passion-jelly-tea.jpg"],
  ["D2", "jelly-tea", "peach-grapefruit-jelly-tea", "Peach & Grapefruit Jelly Tea", "蜜桃西柚冻冻茶", { L: 480 }, "D2-peach-grapefruit-jelly-tea.jpg", "RECOMMENDED"],
  ["D3", "jelly-tea", "peach-strawberry-jelly-tea", "Peach Strawberry Jelly Tea", "蜜桃草莓冻冻茶", { L: 480 }, "D3-peach-strawberry-jelly-tea.jpg"],
  ["D4", "jelly-tea", "pineapple-passion-jelly-tea", "Pineapple Passion Jelly Tea", "菠萝百香果冻冻茶", { L: 480 }, "D4-pineapple-passion-jelly-tea.jpg"],
  ["C1", "coffee", "americano", "Americano", "美式咖啡", { M: 199 }, "C1-americano.jpg"],
  ["C2", "coffee", "raw-coconut-latte", "Raw Coconut Latte", "生椰拿铁", { M: 299 }, "C2-raw-coconut-latte.jpg", "RECOMMENDED"],
  ["C3", "coffee", "sweet-olive-latte", "Sweet Olive Latte", "桂花拿铁", { M: 399 }, "C3-sweet-olive-latte.jpg"],
  ["C4", "coffee", "rose-latte", "Rose Latte", "玫瑰拿铁", { M: 399 }, "C4-rose-latte.jpg"],
  ["C5", "coffee", "matcha-latte", "Matcha Latte", "抹茶拿铁", { M: 399 }, "C5-matcha-latte.jpg"],
  ["C6", "coffee", "pink-lady", "Pink Lady", "草莓咖啡", { M: 299 }, "C6-pink-lady.jpg"],
  ["E1", "shake", "mango-rocking-shake", "Mango Rocking Shake", "芒果摇摇奶昔", { M: 450 }, "E1-mango-rocking-shake.jpg"],
  ["E2", "shake", "strawberry-rocking-shake", "Strawberry Rocking Shake", "草莓摇摇奶昔", { M: 450 }, "E2-strawberry-rocking-shake.jpg", "RECOMMENDED"],
  ["E3", "shake", "red-grape-rocking-shake", "Red Grape Rocking Shake", "葡萄摇摇奶昔", { M: 450 }, "E3-red-grape-rocking-shake.jpg"],
  ["E4", "shake", "pineapple-rocking-shake", "Pineapple Rocking Shake", "菠萝摇摇奶昔", { M: 450 }, "E4-pineapple-rocking-shake.jpg"],
  ["F1", "sundae", "ice-cream-cone", "Ice Cream Cone", "原味冰淇淋甜筒", { "One size": 99 }, "F1-ice-cream-cone.jpg"],
  ["F2", "sundae", "strawberry-cone", "Strawberry Cone", "草莓冰淇淋甜筒", { "One size": 99 }, "F2-strawberry-cone.jpg"],
  ["F3", "sundae", "brown-sugar-boba-sundae", "Brown Sugar Boba Sundae", "黑糖珍珠圣代", { M: 380 }, "F3-brown-sugar-boba-sundae.jpg", "RECOMMENDED"],
  ["F4", "sundae", "mango-sundae", "Mango Sundae", "芒果圣代", { M: 380 }, "F4-mango-sundae.jpg"],
  ["F5", "sundae", "strawberry-sundae", "Strawberry Sundae", "草莓圣代", { M: 380 }, "F5-strawberry-sundae.jpg"],
  ["F6", "sundae", "oreo-sundae", "Oreo Sundae", "奥利奥圣代", { M: 480 }, "F6-oreo-sundae.jpg"],
  ["F7", "sundae", "chocolate-sundae", "Chocolate Sundae", "巧克力圣代", { M: 380 }, "F7-chocolate-sundae.jpg"],
  ["S1", "cheese-smoothie", "red-grape-cheese-smoothie", "Red Grape Cheese Smoothie", "红葡萄芝士多多", { L: 580 }, "S1-red-grape-cheese-smoothie.jpg", "RECOMMENDED"],
  ["S2", "cheese-smoothie", "peach-cheese-smoothie", "Peach Cheese Smoothie", "桃子芝士多多", { L: 580 }, "S2-peach-cheese-smoothie.jpg"],
  ["S3", "cheese-smoothie", "green-grape-cheese-smoothie", "Green Grape Cheese Smoothie", "青提芝士多多", { L: 580 }, "S3-green-grape-cheese-smoothie.jpg"],
  ["G1", "souffle", "mango-jelly-souffle", "Mango Jelly Soufflé", "芒果水晶舒芙蕾", { M: 399, L: 599 }, "G1-mango-jelly-souffle.jpg"],
  ["G2", "souffle", "black-sugar-boba-souffle", "Black Sugar Boba Soufflé", "黑糖珍珠舒芙蕾", { M: 399, L: 599 }, "G2-black-sugar-boba-souffle.jpg", "RECOMMENDED"],
  ["G3", "souffle", "happiness-matcha-souffle", "Happiness Matcha Soufflé", "开心果抹茶舒芙蕾", { M: 399, L: 599 }, "G3-happiness-matcha-souffle.jpg"],
  ["G4", "souffle", "oreo-souffle", "Oreo Soufflé", "奥利奥舒芙蕾", { M: 399, L: 599 }, "G4-oreo-souffle.jpg"],
  ["J1", "add-ons", "boba", "Boba", "珍珠", { "One size": 50 }, "J1-boba.jpg"],
  ["J2", "add-ons", "crystal-boba", "Crystal Boba", "脆脆晶球", { "One size": 100 }, "J2-crystal-boba.jpg"],
  ["J3", "add-ons", "coconut-jelly", "Coconut Jelly", "椰果", { "One size": 50 }, "J3-coconut-jelly.jpg"],
  ["J4", "add-ons", "ice-cream", "Ice Cream", "冰淇淋", { "One size": 100 }, "J4-ice-cream.jpg"],
  ["J5", "add-ons", "milk-cap", "Milk Cap", "奶盖", { "One size": 100 }, "J5-milk-cap.jpg"],
];

const menuProducts: ProductSeed[] = menuRows.map(([code, category, slug, name, nameZh, prices, image, badge]) => {
  const [description, descriptionZh] = categoryCopy[category];
  return {
    code,
    kind: "DRINK",
    category,
    slug,
    name,
    nameZh,
    description,
    descriptionZh,
    prices,
    image: `gcs://${config.mediaBucket}/products/menu/${image}`,
    badge,
  };
});

const goods: ProductSeed[] = [
  { code: "g1", kind: "GOODS", category: "fashion", slug: "kiyoyo-street-set", name: "KIYOYO Street Set", nameZh: "KIYOYO 街头套装", description: "A playful limited streetwear capsule.", descriptionZh: "趣味限定街头服饰系列。", prices: { "One size": 5490 }, image: "/images/goods/streetwear.png", badge: "DROP 01" },
  { code: "g2", kind: "GOODS", category: "accessories", slug: "logo-charm-pack", name: "Logo Charm Pack", nameZh: "品牌挂件组合", description: "Bright tags, charms and key rings.", descriptionZh: "亮色吊牌、挂件与钥匙扣组合。", prices: { "One size": 1290 }, image: "/images/goods/accessories.png" },
  { code: "g3", kind: "GOODS", category: "fashion", slug: "family-logo-apparel", name: "Family Logo Apparel", nameZh: "全家品牌服饰", description: "Everyday KIYOYO essentials for all sizes.", descriptionZh: "适合各种尺码的日常品牌服饰。", prices: { "One size": 3490 }, image: "/images/goods/apparel.png" },
  { code: "g4", kind: "GOODS", category: "home", slug: "happy-living-collection", name: "Happy Living Collection", nameZh: "快乐家居系列", description: "Soft furnishings that bring the brand home.", descriptionZh: "把 KIYOYO 快乐带回家的软装系列。", prices: { "One size": 3990 }, image: "/images/goods/living.png", badge: "NEW" },
  { code: "g5", kind: "GOODS", category: "home", slug: "kitchen-table-set", name: "Kitchen & Table Set", nameZh: "厨房餐桌套装", description: "Red-and-white kitchenware with character.", descriptionZh: "有趣的红白品牌厨房用品。", prices: { "One size": 2890 }, image: "/images/goods/kitchen.png" },
  { code: "g6", kind: "GOODS", category: "home", slug: "creative-desk-kit", name: "Creative Desk Kit", nameZh: "创意桌面套装", description: "Make work and study a little more fun.", descriptionZh: "让工作和学习更有趣。", prices: { "One size": 1990 }, image: "/images/goods/desk.png" },
  { code: "g7", kind: "GOODS", category: "outdoor", slug: "weekend-camping-kit", name: "Weekend Camping Kit", nameZh: "周末露营套装", description: "A bold campsite setup for city explorers.", descriptionZh: "为城市探险家准备的醒目露营装备。", prices: { "One size": 8990 }, image: "/images/goods/camping.png", badge: "ADVENTURE" },
  { code: "g8", kind: "GOODS", category: "outdoor", slug: "kiyoyo-outdoor-club", name: "KIYOYO Outdoor Club", nameZh: "KIYOYO 户外俱乐部", description: "Outdoor essentials for the whole crew.", descriptionZh: "适合全员出行的户外必备系列。", prices: { "One size": 6490 }, image: "/images/goods/outdoor.png" },
  { code: "g9", kind: "GOODS", category: "pets", slug: "little-buddy-set", name: "Little Buddy Set", nameZh: "萌宠伙伴套装", description: "Branded comfort and play for pets.", descriptionZh: "给宠物的品牌舒适与玩乐套装。", prices: { "One size": 2590 }, image: "/images/goods/pet.png", badge: "CUTE" },
  { code: "g10", kind: "GOODS", category: "beauty", slug: "red-pop-nail-kit", name: "Red Pop Nail Kit", nameZh: "红色波普美甲套装", description: "A compact nail-care set in signature red.", descriptionZh: "标志红色便携美甲护理套装。", prices: { "One size": 1890 }, image: "/images/goods/beauty.png" },
  { code: "g11", kind: "GOODS", category: "collectibles", slug: "brand-starter-kit", name: "Brand Starter Kit", nameZh: "品牌入门收藏套装", description: "Tags, cards and packaging for true fans.", descriptionZh: "为真爱粉准备的吊牌、卡片与包装收藏。", prices: { "One size": 990 }, image: "/images/goods/brand-kit.png" },
  { code: "g12", kind: "GOODS", category: "sport", slug: "kiyoyo-sport-club", name: "KIYOYO Sport Club", nameZh: "KIYOYO 运动俱乐部", description: "Play-ready gear with an energetic identity.", descriptionZh: "充满活力、随时开玩的品牌运动装备。", prices: { "One size": 4290 }, image: "/images/goods/sport.png" },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const store of stores) {
      await client.query(
        `insert into stores(code,name,area,address,phone,lat,lng,status,pickup_enabled,delivery_enabled,location_verified)
         values($1,$2,$3,$4,$5,$6,$7,'ACTIVE',true,true,$8)
         on conflict(code) do update set name=excluded.name,area=excluded.area,address=excluded.address,phone=excluded.phone,lat=excluded.lat,lng=excluded.lng,location_verified=excluded.location_verified,updated_at=now()`,
        [...store],
      );
    }
    const tagTones: Record<string, string> = { "NO.1": "BLACK", HOT: "YELLOW", FRESH: "GREEN", NEW: "RED", "CHEF PICK": "RED", RECOMMENDED: "RED", "DROP 01": "RED", ADVENTURE: "GREEN", CUTE: "YELLOW" };
    for (const [label, tone] of Object.entries(tagTones)) {
      await client.query(
        `insert into product_tags(label,tone,active) values($1,$2,true)
         on conflict(lower(label)) do update set tone=excluded.tone,active=true,updated_at=now()`,
        [label, tone],
      );
    }
    await client.query(
      `update products
       set slug='legacy-' || coalesce(external_code,id::text) || '-' || slug,
           active=false,
           catalog_version=catalog_version+1,
           updated_at=now()
       where kind='DRINK'
         and not (external_code=any($1::text[]))
         and slug not like 'legacy-%'`,
      [menuProducts.map((product) => product.code)],
    );
    const products = [...menuProducts, ...goods];
    for (const product of products) {
      const basePrice = Math.min(...Object.values(product.prices));
      await client.query(
        `insert into products(external_code,kind,category_slug,slug,name_en,name_zh,description_en,description_zh,image_key,base_price,size_prices_json,tag_id,active)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,(select id from product_tags where lower(label)=lower($12)),true)
         on conflict(external_code) do update set kind=excluded.kind,category_slug=excluded.category_slug,slug=excluded.slug,name_en=excluded.name_en,name_zh=excluded.name_zh,description_en=excluded.description_en,description_zh=excluded.description_zh,image_key=excluded.image_key,base_price=excluded.base_price,size_prices_json=excluded.size_prices_json,tag_id=excluded.tag_id,active=true,catalog_version=products.catalog_version+1,updated_at=now()`,
        [product.code, product.kind, product.category, product.slug, product.name, product.nameZh, product.description, product.descriptionZh, product.image, basePrice, product.prices, product.badge ?? null],
      );
    }
    await client.query(
      "update products set active=false,catalog_version=catalog_version+1,updated_at=now() where kind='DRINK' and not (external_code=any($1::text[])) and active=true",
      [menuProducts.map((product) => product.code)],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
