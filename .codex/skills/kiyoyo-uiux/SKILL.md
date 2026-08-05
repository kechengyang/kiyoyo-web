---
name: kiyoyo-uiux
description: Enforce KIYOYO's project UI/UX system across the customer web app, responsive mobile layouts, Drink Studio, goods commerce, account, cart, checkout, and Admin. Use whenever creating, editing, reviewing, or validating KIYOYO screens, components, visual hierarchy, responsive behavior, accessibility, or commerce interactions; apply the project's POP MART-inspired but original visual and interaction conventions.
---

# KIYOYO UI/UX

Create a coherent KIYOYO experience: campaign-led and collectible for goods, fast and customisable for drinks, and efficient for Admin. Borrow retail interaction principles from POP MART without copying its brand assets, characters, campaign compositions, names, or page layouts one-for-one.

## Follow the workflow

1. Read `references/popmart-patterns.md` to understand the source research and the adopt/adapt/avoid boundary.
2. Read `references/design-system.md` before changing visual hierarchy, layout, tokens, navigation, cards, product details, or responsive behavior.
3. Read `references/interaction-qa.md` before changing an interactive component or validating a UI change.
4. Inspect the existing implementation before editing. Reuse shared classes, tokens, types, data sources, and components; do not introduce a parallel design language.
5. Classify the surface before designing it:
   - **Campaign/editorial:** make imagery and one message dominant.
   - **Drink commerce:** optimise for store context, fast discovery, customisation, fulfilment, and repeat ordering.
   - **Goods commerce:** optimise for image-led discovery, product detail, collection, and releases.
   - **Transactional:** optimise for trust, status clarity, error prevention, and completion.
   - **Admin:** optimise for scanning, bulk work, explicit status, and safe publishing.
6. Make the smallest coherent change. If a component pattern already exists, improve the shared pattern instead of styling one instance.
7. Check desktop and mobile behavior, keyboard use, focus, loading, empty, error, disabled, sold-out, and success states in proportion to the change.
8. Run the project's relevant lint, build, and tests. Use browser inspection when the task requires visual verification.

## Enforce the non-negotiables

- Keep KIYOYO recognisable. Use KIYOYO's capsule logo, red, Nairobi context, copy voice, products, and original campaign art.
- Let campaign art carry emotion. Keep interface chrome mostly white, paper, and ink; reserve red for identity, priority, selection, offers, and urgent status.
- Show one primary message and one primary action per module. Avoid giant generic slogans, competing CTAs, and decorative UI that hides the product.
- Separate drink and goods journeys. Never treat a configurable drink like a one-click goods SKU.
- Preserve store context for drinks. Show the selected store and fulfilment mode before availability, customisation, and checkout decisions.
- Keep product media fully visible. Use `object-fit: contain` for isolated drink photography and controlled `cover` only for editorial or intentionally cropped goods media.
- Use Admin-managed data for product tags, prices, discounts, availability, images, and publishing state. Do not hard-code merchandising labels in customer components.
- Use the existing English/Chinese copy structure for user-facing strings. Add both languages whenever adding a new persistent label or message.
- Maintain 44 px minimum touch targets, visible focus, semantic controls, useful alt text, adequate contrast, and reduced-motion support.
- Complete every interaction state. A polished default state with missing loading, error, empty, or disabled behavior is incomplete.

## Route references by task

- For homepage, banner, navigation, product-card, PDP, and mobile discovery work, read `references/popmart-patterns.md` and `references/design-system.md`.
- For Drink Studio, store selection, customisation, pickup/delivery, and mixed-cart work, read `references/design-system.md` and `references/interaction-qa.md`.
- For forms, authentication, account, checkout, dialogs, and Admin work, read `references/interaction-qa.md` as well as the relevant component section in `references/design-system.md`.
- For reviews, report findings against the applicable rules with exact files and tight line ranges, then distinguish required fixes from optional polish.

## Judge similarity correctly

Aim for similarity in rhythm, restraint, discovery, and interaction—not imitation. A successful KIYOYO screen should feel as confident and shoppable as POP MART while still looking unmistakably like a Nairobi drinks-and-lifestyle brand.
