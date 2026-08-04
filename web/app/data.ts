import type { Product, Store } from "./types";

export const stores: Store[] = [
  { id: "kilimani", name: "KIYOYO Kilimani", area: "Kilimani", address: "Argwings Kodhek Road, Nairobi", phone: "0707 557 667", lat: -1.2931495, lng: 36.7923182, verified: true },
  { id: "westlands", name: "KIYOYO Westlands", area: "Westlands", address: "Ring Road Parklands, Nairobi", phone: "0790 909 519", lat: -1.2641254, lng: 36.8028556, verified: true },
  { id: "cbd", name: "KIYOYO CBD", area: "CBD", address: "Watalii Lane, Nairobi", phone: "0724 088 886", lat: -1.2851028, lng: 36.824717, verified: true },
  { id: "parklands", name: "KIYOYO Parklands", area: "Parklands", address: "Parklands, Nairobi", phone: "0792 069 688", lat: -1.2577, lng: 36.8172, verified: true },
  { id: "eastleigh", name: "KIYOYO Eastleigh", area: "Eastleigh", address: "Eastleigh, Nairobi · confirm exact pin", phone: "—", lat: -1.2695, lng: 36.8509, verified: false },
  { id: "store-6", name: "KIYOYO Store 06", area: "Coming soon", address: "Address awaiting operations confirmation", phone: "—", verified: false },
];

export const products: Product[] = [
  { id: "d1", kind: "drink", category: "Milk Tea", name: "Assam Boba Milk Tea", nameZh: "阿萨姆珍珠奶茶", description: "Rich black tea, fresh milk and chewy boba.", descriptionZh: "浓郁红茶、鲜奶与Q弹珍珠。", price: 420, image: "/images/drinks/assam-boba.jpg", badge: "No.1" },
  { id: "d2", kind: "drink", category: "Milk Tea", name: "Tiger Sugar Milk Tea", nameZh: "老虎糖奶茶", description: "Caramelised brown sugar ribbons and creamy milk tea.", descriptionZh: "焦香黑糖挂壁与丝滑奶茶。", price: 450, image: "/images/drinks/tiger-sugar.jpg", badge: "Hot" },
  { id: "d3", kind: "drink", category: "Milk Tea", name: "Jasmine Milk Green Tea", nameZh: "茉莉奶绿", description: "Floral jasmine, mellow green tea and milk.", descriptionZh: "清香茉莉、醇和绿茶与鲜奶。", price: 400, image: "/images/drinks/jasmine-milk-tea.jpg" },
  { id: "d4", kind: "drink", category: "Fruit Tea", name: "Fresh Lemon Tea", nameZh: "柠檬茶", description: "Hand-shaken lemon tea, bright and refreshing.", descriptionZh: "手打鲜柠茶，清爽醒神。", price: 350, image: "/images/drinks/lemon-tea.jpg", badge: "Fresh" },
  { id: "d5", kind: "drink", category: "Fruit Tea", name: "Passion Fruit Tea", nameZh: "百香果水果茶", description: "Tropical passion fruit with fragrant tea.", descriptionZh: "热带百香果与清香茶底。", price: 420, image: "/images/drinks/passion-fruit-tea.jpg" },
  { id: "d6", kind: "drink", category: "Fruit Tea", name: "Grape Moonlight", nameZh: "青提白月光", description: "Green grapes, tea and a cloud-soft finish.", descriptionZh: "青提鲜果、清茶与云朵般口感。", price: 480, image: "/images/drinks/grape-moonlight.jpg", badge: "New" },
  { id: "d7", kind: "drink", category: "Coffee", name: "Coconut Latte", nameZh: "生椰拿铁", description: "Espresso mellowed with fragrant coconut milk.", descriptionZh: "浓缩咖啡融合清香生椰乳。", price: 440, image: "/images/drinks/coconut-latte.jpg" },
  { id: "d8", kind: "drink", category: "Coffee", name: "Matcha Latte", nameZh: "抹茶拿铁", description: "Earthy matcha and velvety fresh milk.", descriptionZh: "醇厚抹茶与丝滑鲜奶。", price: 450, image: "/images/drinks/matcha-latte.jpg" },
  { id: "d9", kind: "drink", category: "Jelly Tea", name: "Mango Passion Jelly Tea", nameZh: "芒果百香冻冻茶", description: "Juicy mango, passion fruit and springy jelly.", descriptionZh: "多汁芒果、百香果与弹嫩茶冻。", price: 490, image: "/images/drinks/mango-jelly-tea.jpg" },
  { id: "d10", kind: "drink", category: "Dessert", name: "Strawberry Shake", nameZh: "草莓摇摇奶昔", description: "Creamy strawberry shake made for happy days.", descriptionZh: "香甜草莓奶昔，为快乐加倍。", price: 480, image: "/images/drinks/strawberry-shake.jpg" },
  { id: "d11", kind: "drink", category: "Dessert", name: "Boba Brown Sugar Sundae", nameZh: "黑糖珍珠圣代", description: "Soft serve, boba and a brown sugar drizzle.", descriptionZh: "软冰淇淋、珍珠与黑糖淋酱。", price: 390, image: "/images/drinks/boba-sundae.jpg" },
  { id: "d12", kind: "drink", category: "Dessert", name: "Pistachio Matcha Soufflé", nameZh: "开心果抹茶舒芙蕾", description: "Airy soufflé with pistachio and matcha.", descriptionZh: "轻盈舒芙蕾搭配开心果与抹茶。", price: 650, image: "/images/drinks/pistachio-souffle.jpg", badge: "Chef pick" },
  { id: "g1", kind: "goods", category: "Fashion", name: "KIYOYO Street Set", nameZh: "KIYOYO 街头套装", description: "A playful limited streetwear capsule.", descriptionZh: "趣味限定街头服饰系列。", price: 5490, image: "/images/goods/streetwear.png", badge: "Drop 01" },
  { id: "g2", kind: "goods", category: "Accessories", name: "Logo Charm Pack", nameZh: "品牌挂件组合", description: "Bright tags, charms and key rings.", descriptionZh: "亮色吊牌、挂件与钥匙扣组合。", price: 1290, image: "/images/goods/accessories.png" },
  { id: "g3", kind: "goods", category: "Fashion", name: "Family Logo Apparel", nameZh: "全家品牌服饰", description: "Everyday KIYOYO essentials for all sizes.", descriptionZh: "适合各种尺码的日常品牌服饰。", price: 3490, image: "/images/goods/apparel.png" },
  { id: "g4", kind: "goods", category: "Home", name: "Happy Living Collection", nameZh: "快乐家居系列", description: "Soft furnishings that bring the brand home.", descriptionZh: "把 KIYOYO 快乐带回家的软装系列。", price: 3990, image: "/images/goods/living.png", badge: "New" },
  { id: "g5", kind: "goods", category: "Home", name: "Kitchen & Table Set", nameZh: "厨房餐桌套装", description: "Red-and-white kitchenware with character.", descriptionZh: "有趣的红白品牌厨房用品。", price: 2890, image: "/images/goods/kitchen.png" },
  { id: "g6", kind: "goods", category: "Home", name: "Creative Desk Kit", nameZh: "创意桌面套装", description: "Make work and study a little more fun.", descriptionZh: "让工作和学习更有趣。", price: 1990, image: "/images/goods/desk.png" },
  { id: "g7", kind: "goods", category: "Outdoor", name: "Weekend Camping Kit", nameZh: "周末露营套装", description: "A bold campsite setup for city explorers.", descriptionZh: "为城市探险家准备的醒目露营装备。", price: 8990, image: "/images/goods/camping.png", badge: "Adventure" },
  { id: "g8", kind: "goods", category: "Outdoor", name: "KIYOYO Outdoor Club", nameZh: "KIYOYO 户外俱乐部", description: "Outdoor essentials for the whole crew.", descriptionZh: "适合全员出行的户外必备系列。", price: 6490, image: "/images/goods/outdoor.png" },
  { id: "g9", kind: "goods", category: "Pets", name: "Little Buddy Set", nameZh: "萌宠伙伴套装", description: "Branded comfort and play for pets.", descriptionZh: "给宠物的品牌舒适与玩乐套装。", price: 2590, image: "/images/goods/pet.png", badge: "Cute" },
  { id: "g10", kind: "goods", category: "Beauty", name: "Red Pop Nail Kit", nameZh: "红色波普美甲套装", description: "A compact nail-care set in signature red.", descriptionZh: "标志红色便携美甲护理套装。", price: 1890, image: "/images/goods/beauty.png" },
  { id: "g11", kind: "goods", category: "Collectibles", name: "Brand Starter Kit", nameZh: "品牌入门收藏套装", description: "Tags, cards and packaging for true fans.", descriptionZh: "为真爱粉准备的吊牌、卡片与包装收藏。", price: 990, image: "/images/goods/brand-kit.png" },
  { id: "g12", kind: "goods", category: "Sport", name: "KIYOYO Sport Club", nameZh: "KIYOYO 运动俱乐部", description: "Play-ready gear with an energetic identity.", descriptionZh: "充满活力、随时开玩的品牌运动装备。", price: 4290, image: "/images/goods/sport.png" },
];

export const money = (value: number) => `KSh ${value.toLocaleString("en-KE")}`;

export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
