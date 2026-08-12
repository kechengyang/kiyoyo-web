import type { Lang, Product } from "../../../types";
import type { CustomerCopy } from "../core/copy";
import { ProductCard } from "../shared/primitives";

export function SavedShelf({
  t,
  lang,
  saved,
  products,
  toggleSave,
  openProduct,
  onExplore,
}: {
  t: CustomerCopy;
  lang: Lang;
  saved: string[];
  products: Product[];
  toggleSave: (productId: string) => void;
  openProduct: (product: Product) => void;
  onExplore: () => void;
}) {
  const savedProducts = products.filter((product) =>
    saved.includes(product.id),
  );

  return (
    <section
      className="content-section saved-shelf"
      aria-labelledby="saved-shelf-title"
    >
      <div className="saved-shelf-heading">
        <div>
          <span className="eyebrow">
            ♡ {lang === "zh"
              ? `${savedProducts.length} 件收藏`
              : `${savedProducts.length} SAVED`}
          </span>
          <h2 id="saved-shelf-title">{t.collectionTitle}</h2>
          <p>{t.collectionSub}</p>
        </div>
      </div>
      {savedProducts.length ? (
        <div
          className="saved-shelf-row"
          role="region"
          aria-label={
            lang === "zh"
              ? "横向滚动浏览收藏商品"
              : "Scroll horizontally through saved products"
          }
          tabIndex={0}
        >
          {savedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              saved
              onSave={() => toggleSave(product.id)}
              onOpen={() => openProduct(product)}
            />
          ))}
        </div>
      ) : (
        <div className="saved-shelf-empty">
          <span aria-hidden="true">♡</span>
          <div>
            <p>{t.emptySaved}</p>
            <button onClick={onExplore}>{t.explore} →</button>
          </div>
        </div>
      )}
    </section>
  );
}
