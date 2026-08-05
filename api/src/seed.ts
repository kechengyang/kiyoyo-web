import { pool } from "./db.js";

const stores = [
  ["kilimani", "KIYOYO Kilimani", "Kilimani", "Argwings Kodhek Road, Nairobi", "0707 557 667", -1.2931495, 36.7923182, true],
  ["westlands", "KIYOYO Westlands", "Westlands", "Ring Road Parklands, Nairobi", "0790 909 519", -1.2641254, 36.8028556, true],
  ["cbd", "KIYOYO CBD", "CBD", "Watalii Lane, Nairobi", "0724 088 886", -1.2851028, 36.824717, true],
  ["parklands", "KIYOYO Parklands", "Parklands", "Parklands, Nairobi", "0792 069 688", -1.2577, 36.8172, true],
  ["eastleigh", "KIYOYO Eastleigh", "Eastleigh", "Eastleigh, Nairobi · confirm exact pin", null, -1.2695, 36.8509, false],
  ["store-6", "KIYOYO Store 06", "Coming soon", "Address awaiting operations confirmation", null, null, null, false],
] as const;

const products = [
  ["d1", "DRINK", "milk-tea", "assam-boba-milk-tea", "Assam Boba Milk Tea", "阿萨姆珍珠奶茶", "Rich black tea, fresh milk and chewy boba.", "浓郁红茶、鲜奶与Q弹珍珠。", 420, "/images/drinks/assam-boba.jpg", "NO.1"],
  ["d2", "DRINK", "milk-tea", "tiger-sugar-milk-tea", "Tiger Sugar Milk Tea", "老虎糖奶茶", "Caramelised brown sugar ribbons and creamy milk tea.", "焦香黑糖挂壁与丝滑奶茶。", 450, "/images/drinks/tiger-sugar.jpg", "HOT"],
  ["d3", "DRINK", "milk-tea", "jasmine-milk-green-tea", "Jasmine Milk Green Tea", "茉莉奶绿", "Floral jasmine, mellow green tea and milk.", "清香茉莉、醇和绿茶与鲜奶。", 400, "/images/drinks/jasmine-milk-tea.jpg", null],
  ["d4", "DRINK", "fruit-tea", "fresh-lemon-tea", "Fresh Lemon Tea", "柠檬茶", "Hand-shaken lemon tea, bright and refreshing.", "手打鲜柠茶，清爽醒神。", 350, "/images/drinks/lemon-tea.jpg", "FRESH"],
  ["d5", "DRINK", "fruit-tea", "passion-fruit-tea", "Passion Fruit Tea", "百香果水果茶", "Tropical passion fruit with fragrant tea.", "热带百香果与清香茶底。", 420, "/images/drinks/passion-fruit-tea.jpg", null],
  ["d6", "DRINK", "fruit-tea", "grape-moonlight", "Grape Moonlight", "青提白月光", "Green grapes, tea and a cloud-soft finish.", "青提鲜果、清茶与云朵般口感。", 480, "/images/drinks/grape-moonlight.jpg", "NEW"],
  ["d7", "DRINK", "coffee", "coconut-latte", "Coconut Latte", "生椰拿铁", "Espresso mellowed with fragrant coconut milk.", "浓缩咖啡融合清香生椰乳。", 440, "/images/drinks/coconut-latte.jpg", null],
  ["d8", "DRINK", "coffee", "matcha-latte", "Matcha Latte", "抹茶拿铁", "Earthy matcha and velvety fresh milk.", "醇厚抹茶与丝滑鲜奶。", 450, "/images/drinks/matcha-latte.jpg", null],
  ["d9", "DRINK", "jelly-tea", "mango-passion-jelly-tea", "Mango Passion Jelly Tea", "芒果百香冻冻茶", "Juicy mango, passion fruit and springy jelly.", "多汁芒果、百香果与弹嫩茶冻。", 490, "/images/drinks/mango-jelly-tea.jpg", null],
  ["d10", "DRINK", "dessert", "strawberry-shake", "Strawberry Shake", "草莓摇摇奶昔", "Creamy strawberry shake made for happy days.", "香甜草莓奶昔，为快乐加倍。", 480, "/images/drinks/strawberry-shake.jpg", null],
  ["d11", "DRINK", "dessert", "boba-brown-sugar-sundae", "Boba Brown Sugar Sundae", "黑糖珍珠圣代", "Soft serve, boba and a brown sugar drizzle.", "软冰淇淋、珍珠与黑糖淋酱。", 390, "/images/drinks/boba-sundae.jpg", null],
  ["d12", "DRINK", "dessert", "pistachio-matcha-souffle", "Pistachio Matcha Soufflé", "开心果抹茶舒芙蕾", "Airy soufflé with pistachio and matcha.", "轻盈舒芙蕾搭配开心果与抹茶。", 650, "/images/drinks/pistachio-souffle.jpg", "CHEF PICK"],
  ["g1", "GOODS", "fashion", "kiyoyo-street-set", "KIYOYO Street Set", "KIYOYO 街头套装", "A playful limited streetwear capsule.", "趣味限定街头服饰系列。", 5490, "/images/goods/streetwear.png", "DROP 01"],
  ["g2", "GOODS", "accessories", "logo-charm-pack", "Logo Charm Pack", "品牌挂件组合", "Bright tags, charms and key rings.", "亮色吊牌、挂件与钥匙扣组合。", 1290, "/images/goods/accessories.png", null],
  ["g3", "GOODS", "fashion", "family-logo-apparel", "Family Logo Apparel", "全家品牌服饰", "Everyday KIYOYO essentials for all sizes.", "适合各种尺码的日常品牌服饰。", 3490, "/images/goods/apparel.png", null],
  ["g4", "GOODS", "home", "happy-living-collection", "Happy Living Collection", "快乐家居系列", "Soft furnishings that bring the brand home.", "把 KIYOYO 快乐带回家的软装系列。", 3990, "/images/goods/living.png", "NEW"],
  ["g5", "GOODS", "home", "kitchen-table-set", "Kitchen & Table Set", "厨房餐桌套装", "Red-and-white kitchenware with character.", "有趣的红白品牌厨房用品。", 2890, "/images/goods/kitchen.png", null],
  ["g6", "GOODS", "home", "creative-desk-kit", "Creative Desk Kit", "创意桌面套装", "Make work and study a little more fun.", "让工作和学习更有趣。", 1990, "/images/goods/desk.png", null],
  ["g7", "GOODS", "outdoor", "weekend-camping-kit", "Weekend Camping Kit", "周末露营套装", "A bold campsite setup for city explorers.", "为城市探险家准备的醒目露营装备。", 8990, "/images/goods/camping.png", "ADVENTURE"],
  ["g8", "GOODS", "outdoor", "kiyoyo-outdoor-club", "KIYOYO Outdoor Club", "KIYOYO 户外俱乐部", "Outdoor essentials for the whole crew.", "适合全员出行的户外必备系列。", 6490, "/images/goods/outdoor.png", null],
  ["g9", "GOODS", "pets", "little-buddy-set", "Little Buddy Set", "萌宠伙伴套装", "Branded comfort and play for pets.", "给宠物的品牌舒适与玩乐套装。", 2590, "/images/goods/pet.png", "CUTE"],
  ["g10", "GOODS", "beauty", "red-pop-nail-kit", "Red Pop Nail Kit", "红色波普美甲套装", "A compact nail-care set in signature red.", "标志红色便携美甲护理套装。", 1890, "/images/goods/beauty.png", null],
  ["g11", "GOODS", "collectibles", "brand-starter-kit", "Brand Starter Kit", "品牌入门收藏套装", "Tags, cards and packaging for true fans.", "为真爱粉准备的吊牌、卡片与包装收藏。", 990, "/images/goods/brand-kit.png", null],
  ["g12", "GOODS", "sport", "kiyoyo-sport-club", "KIYOYO Sport Club", "KIYOYO 运动俱乐部", "Play-ready gear with an energetic identity.", "充满活力、随时开玩的品牌运动装备。", 4290, "/images/goods/sport.png", null],
] as const;

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
    const tagTones: Record<string, string> = { "NO.1": "BLACK", HOT: "YELLOW", FRESH: "GREEN", NEW: "RED", "CHEF PICK": "RED", "DROP 01": "RED", ADVENTURE: "GREEN", CUTE: "YELLOW" };
    for (const [label, tone] of Object.entries(tagTones)) {
      await client.query(
        `insert into product_tags(label,tone,active) values($1,$2,true)
         on conflict(lower(label)) do update set tone=excluded.tone,active=true,updated_at=now()`,
        [label, tone],
      );
    }
    for (const product of products) {
      await client.query(
        `insert into products(external_code,kind,category_slug,slug,name_en,name_zh,description_en,description_zh,image_key,base_price,tag_id,active)
         values($1,$2,$3,$4,$5,$6,$7,$8,$10,$9,(select id from product_tags where lower(label)=lower($11)),true)
         on conflict(external_code) do update set kind=excluded.kind,category_slug=excluded.category_slug,slug=excluded.slug,name_en=excluded.name_en,name_zh=excluded.name_zh,description_en=excluded.description_en,description_zh=excluded.description_zh,image_key=excluded.image_key,base_price=excluded.base_price,tag_id=excluded.tag_id,updated_at=now()`,
        [...product],
      );
    }
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
