import Link from "next/link";
import type { MouseEvent } from "react";
import type { AuthSession, Lang, Tab, UserProfile } from "../../../types";
import type { CustomerCopy } from "../core/copy";
import { customerTabPath } from "../core/routes";
import { Logo, NavIcon } from "../shared/primitives";

const navigateInPlace = (
  event: MouseEvent<HTMLAnchorElement>,
  navigate: () => void,
) => {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) return;
  event.preventDefault();
  navigate();
};

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
        <Link
          className="brand-button"
          href="/"
          onClick={(event) => navigateInPlace(event, onHome)}
          aria-label="KIYOYO home"
        >
          <Logo />
        </Link>
        <div className="header-actions">
          <button className="global-search-trigger" onClick={onSearch} aria-label={t.search}>
            <span className="search-mark" aria-hidden="true" />
            <strong>{lang === "zh" ? "搜索" : "Search"}</strong>
            <kbd>/</kbd>
          </button>
          {session ? (
            <Link
              className="member-trigger has-session"
              href="/account"
              onClick={(event) => navigateInPlace(event, onMember)}
              aria-label={lang === "zh" ? "打开用户中心" : "Open account"}
            >
              <span aria-hidden="true">
                {(profile.nickname || session.email || "K").charAt(0).toUpperCase()}
              </span>
              <strong>{profile.nickname || (lang === "zh" ? "账户" : "ACCOUNT")}</strong>
            </Link>
          ) : (
            <button
              className="member-trigger"
              onClick={onMember}
              aria-label={lang === "zh" ? "登录" : "Log in"}
            >
              <span aria-hidden="true">○</span>
              <strong>{lang === "zh" ? "登录" : "LOGIN"}</strong>
            </button>
          )}
          <button
            className="lang"
            onClick={onToggleLanguage}
            aria-label={lang === "en" ? "切换到中文" : "Switch to English"}
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
          <Link
            className="desktop-cart"
            href="/cart"
            onClick={(event) => navigateInPlace(event, onCart)}
          >
            BAG <b>{cartCount}</b>
          </Link>
        </div>
      </header>
    </>
  );
}

export function DesktopNavigation({ t, tab, cartCount, onNavigate }: NavigationProps) {
  return (
    <nav className="desktop-nav">
      {(Object.keys(t.nav) as Tab[]).map((item) => (
        <Link
          key={item}
          href={customerTabPath(item)}
          className={tab === item ? "active" : ""}
          aria-current={tab === item ? "page" : undefined}
          onClick={(event) => navigateInPlace(event, () => onNavigate(item))}
        >
          {t.nav[item]}
          {item === "cart" && cartCount > 0 && <sup>{cartCount}</sup>}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNavigation({ t, tab, cartCount, onNavigate }: NavigationProps) {
  return (
    <nav className="mobile-nav">
      {(Object.keys(t.nav) as Tab[]).map((item) => (
        <Link
          key={item}
          href={customerTabPath(item)}
          className={`${tab === item ? "active" : ""} ${item === "shop" ? "shop-entry" : ""}`}
          aria-current={tab === item ? "page" : undefined}
          onClick={(event) => navigateInPlace(event, () => onNavigate(item))}
        >
          <NavIcon item={item} />
          <span>{t.nav[item]}</span>
          {item === "cart" && cartCount > 0 && <sup>{cartCount}</sup>}
        </Link>
      ))}
    </nav>
  );
}
