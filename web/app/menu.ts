import type { Product } from "./types";

type MenuSeed = readonly [
  code: string,
  category: string,
  name: string,
  nameZh: string,
  prices: Record<string, number>,
  image: string,
  badge?: string,
];

const categoryCopy: Record<string, readonly [string, string]> = {
  "Milk Tea": [
    "Freshly made KIYOYO milk tea with a smooth, comforting finish.",
    "KIYOYO 现制奶茶，口感顺滑醇香。",
  ],
  "Fruit Tea": [
    "Bright fruit and fragrant tea, shaken fresh to order.",
    "清新水果与香茶现点现摇。",
  ],
  "Jelly Tea": [
    "A refreshing fruit tea layered with springy jelly.",
    "清爽水果茶搭配弹嫩茶冻。",
  ],
  Coffee: [
    "KIYOYO coffee made fresh for an easy lift.",
    "KIYOYO 现制咖啡，香醇提神。",
  ],
  Shake: [
    "A creamy fruit shake made for happy days.",
    "香甜水果摇摇奶昔，为快乐加倍。",
  ],
  Sundae: [
    "Cool, creamy soft serve with a playful finish.",
    "冰凉绵密的软冰淇淋，甜蜜又有趣。",
  ],
  "Cheese Smoothie": [
    "Fresh fruit blended with a cloud-soft cheese cap.",
    "新鲜水果搭配云朵般绵密芝士奶盖。",
  ],
  "Soufflé": [
    "A light KIYOYO soufflé with a soft, airy centre.",
    "轻盈松软的 KIYOYO 舒芙蕾。",
  ],
  "Add-ons": [
    "Add an extra texture or creamy finish to your drink.",
    "为饮品增加一份口感或香浓风味。",
  ],
};

const seeds: MenuSeed[] = [
  ["A1", "Milk Tea", "Assam Boba Tea", "阿萨姆珍珠奶茶", { M: 380, L: 480 }, "A1-assam-boba-tea.jpg", "RECOMMENDED"],
  ["A2", "Milk Tea", "Aroma Boba Tea", "蜜香珍珠奶茶", { M: 380, L: 480 }, "A2-aroma-boba-tea.jpg"],
  ["A3", "Milk Tea", "Classic Boba Tea", "经典珍珠奶茶", { M: 380, L: 480 }, "A3-classic-boba-tea.jpg"],
  ["A4", "Milk Tea", "Tiger Sugar Boba Tea", "老虎糖奶茶", { M: 420 }, "A4-tiger-sugar-boba-tea.jpg"],
  ["A5", "Milk Tea", "Taro Coconut", "香芋椰椰", { M: 380 }, "A5-taro-coconut.jpg"],
  ["A6", "Milk Tea", "Jasmine Milk Green Tea", "茉莉奶绿", { M: 380, L: 480 }, "A6-jasmine-milk-green-tea.jpg"],
  ["A7", "Milk Tea", "Mocha Snow Cap", "巧克力摩卡雪顶", { L: 480 }, "A7-mocha-snow-cap.jpg"],
  ["A8", "Milk Tea", "Matcha Snow Cap", "抹茶奶绿雪顶", { L: 480 }, "A8-matcha-snow-cap.jpg", "RECOMMENDED"],
  ["A9", "Milk Tea", "Coconut Boba", "生椰珍珠奶茶", { M: 380 }, "A9-coconut-boba.jpg"],
  ["B1", "Fruit Tea", "Get Rich Tea", "柠檬茶", { M: 99 }, "B1-get-rich-tea.jpg"],
  ["B2", "Fruit Tea", "Aroma Lemonade", "香水柠檬", { M: 199 }, "B2-aroma-lemonade.jpg"],
  ["B3", "Fruit Tea", "Grapefruit Tea", "西柚水果茶", { M: 380 }, "B3-grapefruit-tea.jpg"],
  ["B4", "Fruit Tea", "Passion Fruit Tea", "百香果水果茶", { M: 420, L: 480 }, "B4-passion-fruit-tea.jpg", "RECOMMENDED"],
  ["B5", "Fruit Tea", "Green Grape Tea", "青提白月光", { L: 520 }, "B5-green-grape-tea.jpg"],
  ["D1", "Jelly Tea", "Mango Passion Jelly Tea", "芒果百香冻冻茶", { L: 480 }, "D1-mango-passion-jelly-tea.jpg"],
  ["D2", "Jelly Tea", "Peach & Grapefruit Jelly Tea", "蜜桃西柚冻冻茶", { L: 480 }, "D2-peach-grapefruit-jelly-tea.jpg", "RECOMMENDED"],
  ["D3", "Jelly Tea", "Peach Strawberry Jelly Tea", "蜜桃草莓冻冻茶", { L: 480 }, "D3-peach-strawberry-jelly-tea.jpg"],
  ["D4", "Jelly Tea", "Pineapple Passion Jelly Tea", "菠萝百香果冻冻茶", { L: 480 }, "D4-pineapple-passion-jelly-tea.jpg"],
  ["C1", "Coffee", "Americano", "美式咖啡", { M: 199 }, "C1-americano.jpg"],
  ["C2", "Coffee", "Raw Coconut Latte", "生椰拿铁", { M: 299 }, "C2-raw-coconut-latte.jpg", "RECOMMENDED"],
  ["C3", "Coffee", "Sweet Olive Latte", "桂花拿铁", { M: 399 }, "C3-sweet-olive-latte.jpg"],
  ["C4", "Coffee", "Rose Latte", "玫瑰拿铁", { M: 399 }, "C4-rose-latte.jpg"],
  ["C5", "Coffee", "Matcha Latte", "抹茶拿铁", { M: 399 }, "C5-matcha-latte.jpg"],
  ["C6", "Coffee", "Pink Lady", "草莓咖啡", { M: 299 }, "C6-pink-lady.jpg"],
  ["E1", "Shake", "Mango Rocking Shake", "芒果摇摇奶昔", { M: 450 }, "E1-mango-rocking-shake.jpg"],
  ["E2", "Shake", "Strawberry Rocking Shake", "草莓摇摇奶昔", { M: 450 }, "E2-strawberry-rocking-shake.jpg", "RECOMMENDED"],
  ["E3", "Shake", "Red Grape Rocking Shake", "葡萄摇摇奶昔", { M: 450 }, "E3-red-grape-rocking-shake.jpg"],
  ["E4", "Shake", "Pineapple Rocking Shake", "菠萝摇摇奶昔", { M: 450 }, "E4-pineapple-rocking-shake.jpg"],
  ["F1", "Sundae", "Ice Cream Cone", "原味冰淇淋甜筒", { "One size": 99 }, "F1-ice-cream-cone.jpg"],
  ["F2", "Sundae", "Strawberry Cone", "草莓冰淇淋甜筒", { "One size": 99 }, "F2-strawberry-cone.jpg"],
  ["F3", "Sundae", "Brown Sugar Boba Sundae", "黑糖珍珠圣代", { M: 380 }, "F3-brown-sugar-boba-sundae.jpg", "RECOMMENDED"],
  ["F4", "Sundae", "Mango Sundae", "芒果圣代", { M: 380 }, "F4-mango-sundae.jpg"],
  ["F5", "Sundae", "Strawberry Sundae", "草莓圣代", { M: 380 }, "F5-strawberry-sundae.jpg"],
  ["F6", "Sundae", "Oreo Sundae", "奥利奥圣代", { M: 480 }, "F6-oreo-sundae.jpg"],
  ["F7", "Sundae", "Chocolate Sundae", "巧克力圣代", { M: 380 }, "F7-chocolate-sundae.jpg"],
  ["S1", "Cheese Smoothie", "Red Grape Cheese Smoothie", "红葡萄芝士多多", { L: 580 }, "S1-red-grape-cheese-smoothie.jpg", "RECOMMENDED"],
  ["S2", "Cheese Smoothie", "Peach Cheese Smoothie", "桃子芝士多多", { L: 580 }, "S2-peach-cheese-smoothie.jpg"],
  ["S3", "Cheese Smoothie", "Green Grape Cheese Smoothie", "青提芝士多多", { L: 580 }, "S3-green-grape-cheese-smoothie.jpg"],
  ["G1", "Soufflé", "Mango Jelly Soufflé", "芒果水晶舒芙蕾", { M: 399, L: 599 }, "G1-mango-jelly-souffle.jpg"],
  ["G2", "Soufflé", "Black Sugar Boba Soufflé", "黑糖珍珠舒芙蕾", { M: 399, L: 599 }, "G2-black-sugar-boba-souffle.jpg", "RECOMMENDED"],
  ["G3", "Soufflé", "Happiness Matcha Soufflé", "开心果抹茶舒芙蕾", { M: 399, L: 599 }, "G3-happiness-matcha-souffle.jpg"],
  ["G4", "Soufflé", "Oreo Soufflé", "奥利奥舒芙蕾", { M: 399, L: 599 }, "G4-oreo-souffle.jpg"],
  ["J1", "Add-ons", "Boba", "珍珠", { "One size": 50 }, "J1-boba.jpg"],
  ["J2", "Add-ons", "Crystal Boba", "脆脆晶球", { "One size": 100 }, "J2-crystal-boba.jpg"],
  ["J3", "Add-ons", "Coconut Jelly", "椰果", { "One size": 50 }, "J3-coconut-jelly.jpg"],
  ["J4", "Add-ons", "Ice Cream", "冰淇淋", { "One size": 100 }, "J4-ice-cream.jpg"],
  ["J5", "Add-ons", "Milk Cap", "奶盖", { "One size": 100 }, "J5-milk-cap.jpg"],
];

export const menuProducts: Product[] = seeds.map(
  ([id, category, name, nameZh, sizePrices, image, badge]) => {
    const [description, descriptionZh] = categoryCopy[category];
    return {
      id,
      kind: "drink",
      category,
      name,
      nameZh,
      description,
      descriptionZh,
      price: Math.min(...Object.values(sizePrices)),
      sizePrices,
      image: `/images/drinks/menu/${image}`,
      badge,
    };
  },
);

export const drinkCategoryOrder = [
  "Milk Tea",
  "Fruit Tea",
  "Jelly Tea",
  "Coffee",
  "Shake",
  "Sundae",
  "Cheese Smoothie",
  "Soufflé",
  "Add-ons",
] as const;

export const drinkCategoryZh: Record<(typeof drinkCategoryOrder)[number], string> = {
  "Milk Tea": "经典奶茶",
  "Fruit Tea": "水果茶",
  "Jelly Tea": "水果冻冻茶",
  Coffee: "咖啡",
  Shake: "摇摇奶昔",
  Sundae: "冰淇淋圣代",
  "Cheese Smoothie": "芝士水果多多",
  "Soufflé": "舒芙蕾",
  "Add-ons": "加料区",
};
