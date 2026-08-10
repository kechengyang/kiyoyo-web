import type { Product, Store } from "./types";
import { menuProducts } from "./menu";

export const stores: Store[] = [
  { id: "kilimani", name: "KIYOYO Kilimani", area: "Kilimani", address: "Argwings Kodhek Road, Nairobi", phone: "0707 557 667", lat: -1.2931495, lng: 36.7923182, verified: true },
  { id: "westlands", name: "KIYOYO Westlands", area: "Westlands", address: "Ring Road Parklands, Nairobi", phone: "0790 909 519", lat: -1.2641254, lng: 36.8028556, verified: true },
  { id: "cbd", name: "KIYOYO CBD", area: "CBD", address: "Watalii Lane, Nairobi", phone: "0724 088 886", lat: -1.2851028, lng: 36.824717, verified: true },
  { id: "parklands", name: "KIYOYO Parklands", area: "Parklands", address: "Parklands, Nairobi", phone: "0792 069 688", lat: -1.2577, lng: 36.8172, verified: true },
  { id: "eastleigh", name: "KIYOYO Eastleigh", area: "Eastleigh", address: "Eastleigh, Nairobi · confirm exact pin", phone: "—", lat: -1.2695, lng: 36.8509, verified: false },
  { id: "store-6", name: "KIYOYO Store 06", area: "Coming soon", address: "Address awaiting operations confirmation", phone: "—", verified: false },
];

export const products: Product[] = [
  ...menuProducts,
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
