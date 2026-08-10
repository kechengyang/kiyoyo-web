/* eslint-disable @next/next/no-img-element -- Local prototype assets retain original campaign cropping. */

import type { Dispatch, SetStateAction } from "react";
import type { Lang, Product } from "../../types";
import type { CustomerCopy } from "./copy";
import { ProductCard, SectionHead } from "./primitives";

export type Campaign = {
  image: string;
  alt: string;
  tag: string;
  title: string;
  body: string;
  cta: string;
  mode: "drinks" | "goods";
  filter: string;
  motion: string;
};

export function HomeView({
  t, lang, campaigns, activeCampaign, bannerIndex, setBannerIndex,
  setBannerPointerPaused, setBannerFocusPaused, runCampaign, openShop,
  trendingProducts, products, saved, toggleSave, openProduct,
}: {
  t: CustomerCopy;
  lang: Lang;
  campaigns: Campaign[];
  activeCampaign: Campaign;
  bannerIndex: number;
  setBannerIndex: Dispatch<SetStateAction<number>>;
  setBannerPointerPaused: Dispatch<SetStateAction<boolean>>;
  setBannerFocusPaused: Dispatch<SetStateAction<boolean>>;
  runCampaign: () => void;
  openShop: (mode: "drinks" | "goods", filter?: string) => void;
  trendingProducts: Product[];
  products: Product[];
  saved: string[];
  toggleSave: (productId: string) => void;
  openProduct: (product: Product) => void;
}) {
  return (
<>
  <section
    className="campaign-carousel"
    aria-roledescription="carousel"
    aria-label="KIYOYO campaigns"
    onMouseEnter={() => setBannerPointerPaused(true)}
    onMouseLeave={() => setBannerPointerPaused(false)}
    onFocusCapture={() => setBannerFocusPaused(true)}
    onBlurCapture={(event) => {
      if (
        !event.currentTarget.contains(event.relatedTarget as Node)
      )
        setBannerFocusPaused(false);
    }}
  >
    <div
      className={`campaign-stage motion-${activeCampaign.motion}`}
      key={bannerIndex}
    >
      <img
        className="campaign-backdrop"
        src={activeCampaign.image}
        alt=""
        aria-hidden="true"
      />
      <img
        className="campaign-art"
        src={activeCampaign.image}
        alt={activeCampaign.alt}
      />
      <div className="campaign-motion" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
    <button
      className="campaign-arrow previous"
      aria-label="Previous campaign"
      onClick={() =>
        setBannerIndex(
          (index) =>
            (index + campaigns.length - 1) % campaigns.length,
        )
      }
    >
      ←
    </button>
    <button
      className="campaign-arrow next"
      aria-label="Next campaign"
      onClick={() =>
        setBannerIndex((index) => (index + 1) % campaigns.length)
      }
    >
      →
    </button>
    <div className="campaign-info">
      <span>{activeCampaign.tag}</span>
      <div>
        <strong>{activeCampaign.title}</strong>
        <small>{activeCampaign.body}</small>
      </div>
      <button onClick={runCampaign}>{activeCampaign.cta} ↗</button>
    </div>
    <div className="campaign-dots">
      {campaigns.map((campaign, index) => (
        <button
          key={campaign.tag}
          className={bannerIndex === index ? "active" : ""}
          aria-label={`Show campaign ${index + 1}`}
          onClick={() => setBannerIndex(index)}
        >
          <i />
        </button>
      ))}
    </div>
  </section>
  <div className="marquee">
    <div>
      BOBA · SOUFFLÉ · HAPPY THINGS · NAIROBI · BOBA · SOUFFLÉ · HAPPY
      THINGS · NAIROBI ·
    </div>
  </div>
  <section className="content-section">
    <SectionHead
      title={t.trending}
      action={t.seeAll}
      onAction={() => openShop("drinks")}
    />
    <div className="product-grid featured">
      {trendingProducts.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          lang={lang}
          saved={saved.includes(p.id)}
          onSave={() => toggleSave(p.id)}
          onOpen={() => openProduct(p)}
        />
      ))}
    </div>
  </section>
  <section className="story-band">
    <div className="story-photo">
      <img
        src="/images/goods/streetwear.png"
        alt="KIYOYO streetwear"
      />
    </div>
    <div className="story-copy">
      <span className="eyebrow">KIYOYO WORLD / 001</span>
      <h2>
        {lang === "zh" ? "不只是一杯奶茶。" : "More than a cup."}
      </h2>
      <p>
        {lang === "zh"
          ? "我们把内罗毕的能量装进饮品、衣服、家居和每一个小小收藏。"
          : "We bottle Nairobi energy into drinks, clothes, spaces and tiny objects worth keeping."}
      </p>
      <button
        className="primary invert"
        onClick={() => openShop("goods")}
      >
        {t.shopDrop} →
      </button>
    </div>
  </section>
  <section className="content-section">
    <SectionHead
      title={t.goods}
      action={t.seeAll}
      onAction={() => openShop("goods")}
    />
    <div className="editorial-grid">
      {products
        .filter((p) => p.kind === "goods")
        .slice(0, 5)
        .map((p, i) => (
          <div className={`editorial-card e${i}`} key={p.id}>
            <ProductCard
              product={p}
              lang={lang}
              saved={saved.includes(p.id)}
              onSave={() => toggleSave(p.id)}
              onOpen={() => openProduct(p)}
            />
          </div>
        ))}
    </div>
  </section>
</>
  );
}
