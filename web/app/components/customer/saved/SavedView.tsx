import type { Lang, Product } from "../../../types";
import type { CustomerCopy } from "../core/copy";
import { ProductCard } from "../shared/primitives";

export function SavedView({ t, lang, saved, products, toggleSave, openProduct, onExplore }: {
  t: CustomerCopy;
  lang: Lang;
  saved: string[];
  products: Product[];
  toggleSave: (productId: string) => void;
  openProduct: (product: Product) => void;
  onExplore: () => void;
}) {
  return (
<section className="content-section collection-page">
  <div className="page-heading">
    <span className="sticker">♡ YOURS</span>
    <h1>{t.collectionTitle}</h1>
    <p>{t.collectionSub}</p>
  </div>
  {saved.length ? (
    <div className="product-grid">
      {products
        .filter((p) => saved.includes(p.id))
        .map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            lang={lang}
            saved
            onSave={() => toggleSave(p.id)}
            onOpen={() => openProduct(p)}
          />
        ))}
    </div>
  ) : (
    <div className="empty-state">
      <span>♡</span>
      <p>{t.emptySaved}</p>
      <button className="primary" onClick={onExplore}>
        {t.explore}
      </button>
    </div>
  )}
</section>
  );
}
