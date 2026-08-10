import type { AuthSession, Lang, Tab, UserProfile } from "../../../types";
import type { CustomerCopy } from "../core/copy";
import { Logo, NavIcon } from "../shared/primitives";

type NavigationProps = {
  t: CustomerCopy;
  tab: Tab;
  cartCount: number;
  onNavigate: (tab: Tab) => void;
};

export function CustomerHeader({
  t,
  lang,
  storeArea,
  session,
  profile,
  cartCount,
  onOpenStore,
  onHome,
  onSearch,
  onMember,
  onToggleLanguage,
  onCart,
}: {
  t: CustomerCopy;
  lang: Lang;
  storeArea: string;
  session: AuthSession | null;
  profile: UserProfile;
  cartCount: number;
  onOpenStore: () => void;
  onHome: () => void;
  onSearch: () => void;
  onMember: () => void;
  onToggleLanguage: () => void;
  onCart: () => void;
}) {
  return (
    <>
      <div className="top-strip">
        <span>NAIROBI, KENYA</span>
        <span>FRESHLY MADE · PLAYFULLY SERVED</span>
        <span>EST. WITH JOY</span>
      </div>
      <header className="site-header">
        <button
          className="store-button"
          onClick={onOpenStore}
          aria-label={`${t.location}: ${storeArea}`}
          title={`${t.location}: ${storeArea}`}
        >
          <span>⌖</span>
          <span>
            <small>{t.location}</small>
            <strong>{storeArea}⌄</strong>
          </span>
        </button>
        <button className="brand-button" onClick={onHome}>
          <Logo />
        </button>
        <div className="header-actions">
          <button className="global-search-trigger" onClick={onSearch} aria-label={t.search}>
            <span className="search-mark" aria-hidden="true" />
            <strong>{lang === "zh" ? "搜索" : "Search"}</strong>
            <kbd>/</kbd>
          </button>
          <button
            className={`member-trigger ${session ? "has-session" : ""}`}
            onClick={onMember}
            aria-label={
              session
                ? lang === "zh" ? "打开用户中心" : "Open account"
                : lang === "zh" ? "登录" : "Log in"
            }
          >
            <span aria-hidden="true">
              {session ? (profile.nickname || session.email).charAt(0).toUpperCase() : "○"}
            </span>
            <strong>
              {session
                ? profile.nickname || (lang === "zh" ? "账户" : "ACCOUNT")
                : lang === "zh" ? "登录" : "LOGIN"}
            </strong>
          </button>
          <button
            className="lang"
            onClick={onToggleLanguage}
            aria-label={lang === "en" ? "切换到中文" : "Switch to English"}
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
          <button className="desktop-cart" onClick={onCart}>
            BAG <b>{cartCount}</b>
          </button>
        </div>
      </header>
    </>
  );
}

export function DesktopNavigation({ t, tab, cartCount, onNavigate }: NavigationProps) {
  return (
    <nav className="desktop-nav">
      {(Object.keys(t.nav) as Tab[]).map((item) => (
        <button key={item} className={tab === item ? "active" : ""} onClick={() => onNavigate(item)}>
          {t.nav[item]}
          {item === "cart" && cartCount > 0 && <sup>{cartCount}</sup>}
        </button>
      ))}
    </nav>
  );
}

export function MobileNavigation({ t, tab, cartCount, onNavigate }: NavigationProps) {
  return (
    <nav className="mobile-nav">
      {(Object.keys(t.nav) as Tab[]).map((item) => (
        <button
          key={item}
          className={`${tab === item ? "active" : ""} ${item === "shop" ? "shop-entry" : ""}`}
          onClick={() => onNavigate(item)}
        >
          <NavIcon item={item} />
          <span>{t.nav[item]}</span>
          {item === "cart" && cartCount > 0 && <sup>{cartCount}</sup>}
        </button>
      ))}
    </nav>
  );
}
