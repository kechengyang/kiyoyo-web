# KIYOYO design system

## Brand direction

Define the experience as **playful retail, disciplined interface**. Use editorial images, confident type, and an occasional red signal against a calm neutral UI. Avoid making every surface red, outlined, shadowed, tilted, or oversized.

### Color tokens

Reuse the current project tokens and add semantic aliases rather than scattered hex values.

| Token | Value | Use |
| --- | --- | --- |
| `--red` | `#D9231E` | KIYOYO identity, primary selection, offer, urgent status |
| `--deep` | `#B51011` | Pressed state, dark red contrast, campaign support |
| `--ink` | `#171412` | Primary type, high-emphasis controls, dark surfaces |
| `--paper` | `#FFFDF9` | Main background |
| `--cream` | `#F6F0E8` | Secondary surface and empty states |
| `--line` | `#D9D0C7` | Dividers and quiet borders |
| `--muted` | `#726A64` | Secondary copy |
| `--gold` | `#D8A852` | Membership and rewards only |
| `--highlight` | `#FFE15B` | Limited playful highlight, never body text |
| `--success` | `#14884D` | Availability, completion, and open-store status |

Target roughly 70% paper/white, 20% ink/media, and no more than 10% red or supporting accents on standard commerce screens. Campaign artwork may break this ratio within its own frame.

### Typography

- Use the product's current sans-serif stack until licensed brand fonts are chosen.
- Use heavy display type only for short campaign or section titles. Do not use it for forms, tables, long paragraphs, or all product names.
- Prefer sentence case for actions and product names; reserve uppercase with letter spacing for navigation, small labels, launch status, and compact section eyebrows.
- Keep line lengths readable: 45–75 characters for body copy.
- Desktop scale: 56–88 px campaign, 32–48 px section, 20–32 px page/product, 14–16 px body, 11–13 px utility.
- Mobile scale: 34–52 px campaign, 26–34 px section, 18–26 px page/product, 14–16 px body, 11–13 px utility.

### Spacing, shape, and elevation

- Use the spacing steps `4, 8, 12, 16, 24, 32, 48, 72` px.
- Give editorial and release sections 64–96 px vertical desktop space and 40–64 px mobile space.
- Keep goods cards square or lightly rectangular with 0–8 px radii. Use larger 16–24 px radii selectively for Drink Studio, membership, location, or mobile functional surfaces.
- Use borders and spacing before shadows. Reserve noticeable shadows for overlays, sticky transactional summaries, or intentionally tactile campaign elements.
- Do not combine thick border, large radius, shadow, skew, gradient, and badge on the same component.

## Shell and navigation

### URL, routing, and recoverability

Treat the URL as part of the product interface and as the source of truth for navigation. A screen that looks like a page but cannot be opened, refreshed, bookmarked, shared, or revisited with browser history is incomplete.

- Give every primary destination and durable business resource one canonical path. Use nouns and stable identifiers, for example `/shop`, `/admin/orders`, `/admin/orders/:orderNumber`, and `/admin/products/:productId/edit`.
- Put shareable view state in query parameters, for example `/admin/orders?store=kilimani&status=preparing`. Filters must round-trip between controls and the URL without losing unrelated parameters.
- Keep transient state in component memory: hover, menu expansion, upload progress, camera activity, unsaved form edits, and dismissible notices do not need URLs.
- Never put passwords, authentication tokens, pickup QR payloads, payment details, personal addresses, or other secrets in a path, query string, or hash.
- Prefer Next.js routes, `<Link>`, `useRouter`, `usePathname`, and shared `layout` boundaries. Do not add a new page that exists only as `useState("tab")` when it represents a destination.
- Use dynamic route segments for repeated resource shapes rather than duplicating page files. Folder names such as `[productId]` or `[section]` are implementation templates; brackets never appear in the customer-facing URL.
- Use static generation only for a finite route set. Generate every supported path at build time and reject unknown values; verify the hosting layer serves each exported clean URL directly.
- Render the correct page title, `h1`, breadcrumb when needed, and `aria-current="page"` state from the active URL.
- Apply the same authentication, role, and store-scope checks on direct entry as on in-app navigation. An unauthorised deep link must not flash protected data; return a safe fallback, forbidden state, or 404 as appropriate.
- Reserve redirects and `replaceState` for canonicalisation, invalid routes, or access fallbacks. Normal user navigation must create browser history so Back and Forward remain meaningful.

KIYOYO routing baseline:

| Surface | Canonical path | URL-owned optional state |
| --- | --- | --- |
| Customer home | `/` | campaign or referral parameters only when durable |
| Shop | `/shop` | mode, category, search, and filters when shareable |
| Product detail | `/products/:slug` | selected sellable variant when it can be restored safely |
| Cart | `/cart` | none; cart contents remain account/local data, never URL data |
| Account | `/account` | a durable subsection may become a nested path |
| Admin home | `/admin` | none |
| Admin task list | `/admin/:section` | store, status, search, sort, and page filters |
| Admin resource | `/admin/:section/:resourceId` | subsection or non-sensitive view state |
| Admin edit flow | `/admin/:section/:resourceId/edit` | no unsaved field values in the URL |
| Pickup redemption | `/admin/redeem` | scanner and pickup token always remain transient and private |

### Desktop

- Use a 24–30 px announcement bar for one operational message.
- Use a calm white main header. Center the KIYOYO capsule logo; place location/search to the left and account/saved/cart utilities to the right.
- Keep category navigation on a separate white row with compact labels and generous horizontal spacing.
- Make the selected Nairobi store visible before users enter Drink Studio.
- Keep sticky behavior quiet: one divider or subtle translucency, not a large colored block.

### Mobile

- Use a compact header with logo, store/location access, and cart/account utilities.
- Use horizontal category scrolling when labels do not fit; never shrink text below 11 px to force one row.
- Keep the four primary destinations consistent: Home, Shop, Cart, Account. Saved items remain a shelf inside Cart rather than a standalone destination. Use one coherent icon family with matching stroke, optical size, corner style, and active treatment.
- Use a bottom navigation only on mobile. Make targets at least 44×44 px, respect safe-area padding, and show badges without shifting labels.
- Use red for the active destination and ink/muted for inactive destinations; do not use five unrelated pictograms or emoji.

## Campaign carousel

- Show one activity per slide.
- Use original 16:7–16:9 desktop art and mobile-specific 4:3–5:4 crops; do not rely on one crop for every viewport.
- Include the KIYOYO logo within the composition when the campaign needs brand recognition.
- Use a simple slogan of roughly 2–7 words. Let the artwork communicate the rest.
- Use at most two actions. Make the main action obvious and the secondary action quieter.
- Place text over a deliberately quiet area or add a controlled contrast scrim. Never cover the hero product.
- Keep arrows subtle and progress indicators readable. Do not place a dense information panel over the bottom of every slide.

## Product discovery

### Shared card rules

- Keep image ratios consistent within a row.
- Open product detail from the media or name. Keep wishlist and add/customise actions independent.
- Clamp names to two lines and preserve price visibility.
- Show at most one merchandising badge. Use the highest-priority active status: unavailable > discount > launch/new > editorial tag.
- Source tag text, tone, price, discount, availability, images, and publish state from Admin/catalog data.
- Avoid raw emoji, improvised CSS illustrations, and mismatched icon sets in production UI.

### Image rules

- For isolated drink photography, use `object-fit: contain`, centered, with 8–12% internal breathing room. Never crop the lid or cup base.
- For goods packshots, use `contain` when the whole object is necessary for purchase; use `cover` only for editorial/lifestyle images.
- Provide consistent master image ratios or explicit focal-point metadata through Admin.
- Use responsive image sizes, lazy loading below the fold, useful alt text, and a stable placeholder to prevent layout shift.

## Drink Studio

Treat Drink Studio as a service flow, not a standard category grid.

1. **Context:** show selected store, distance, open/closed state, fulfilment mode, and estimated preparation/delivery time.
2. **Discover:** organise by familiar families and moods; preserve search and dietary/allergen filters.
3. **Choose:** show the full drink, price-from, availability, and a direct `Customise` action.
4. **Customise:** guide size, temperature/ice, sweetness, toppings, and quantity in a stable order; update price and summary live.
5. **Review:** show selections in plain language and flag required or unavailable choices inline.
6. **Fulfil:** confirm pickup or delivery and address/store before placing the test order.

- Keep a sticky mobile price-and-action bar while customising.
- Remember the last valid customisation for repeat orders, but never silently substitute unavailable options.
- When changing stores would invalidate items, explain which items change before confirming the switch.
- Keep drink availability store-specific; keep goods inventory and shipping logic separate.

## Goods shop and product detail

- Use campaign/collection entry points followed by sparse release rows or responsive grids.
- Put filters in a quiet sticky toolbar on browse pages; show active filter count and a clear reset.
- Desktop PDP: media gallery 55–65%, purchase panel 35–45%.
- Mobile PDP: swipeable gallery, then title/price/status and a sticky add-to-cart action.
- Order information as: tag/status, title, price, offer, variants, quantity, fulfilment, action, details.
- Use accordions for product details, care, shipping, returns, and blind-box terms.
- Never offer a silent random or blind purchase; explain assortment and probability rules before action.

## Cart, checkout, account, and authentication

- Visually group drink items by store and fulfilment; group goods by shipping method.
- Explain mixed-cart consequences before checkout rather than after payment.
- Keep order summary visible on desktop and sticky near the final action on mobile.
- Mark test payment clearly without making the checkout look broken or untrustworthy.
- Support email/password and Google/Facebook entry points with equal account outcomes.
- Collect nickname, gender, age, and default address only with clear purpose, editable controls, and appropriate privacy copy.
- Let users add, edit, delete, and select delivery addresses during checkout without losing cart or customisation state.
- After order creation, show order number, fulfilment status, next step, and pickup QR only when pickup applies.

## Admin

- Prioritise scannable tables, stable columns, filters, batch actions, and explicit status chips over consumer-style campaign design.
- Use a clear draft → scheduled/published → unpublished/archive lifecycle.
- Let Admin create and define product tags, including label, color/tone, priority, start/end time, and active state.
- Let Admin manage product images, ordering, alt text, crop/focal point, price, discount, visibility, store availability, and stock.
- Preview customer-facing results before publishing. Show last saved, last published, and responsible user.
- Require confirmation for destructive or customer-visible actions and report partial failures precisely.
- Keep red for destructive, urgent, or primary publish actions; use neutral controls for routine editing.

## Responsive layout baseline

- Validate at 390 px mobile, 768 px tablet, 1280 px laptop, and 1440 px desktop.
- Use content widths around 1280–1500 px with 24–80 px responsive gutters.
- Prefer 2-up mobile product cards only when names and price remain readable; otherwise use a horizontal single-row pattern.
- Remove accidental horizontal page overflow. Allow horizontal scrolling only inside an intentional labelled carousel or tab list.
- Reorder by task priority on mobile; do not merely shrink desktop layouts.
