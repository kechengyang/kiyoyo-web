# Interaction and QA standard

## Define complete states

For every changed interactive component, account for applicable states:

- default
- hover where a pointing device exists
- visible keyboard focus
- pressed/selected
- loading or pending
- success with the next action
- validation or system error with recovery
- disabled with a reason when unclear
- empty
- unavailable, sold out, store closed, or unpublished
- offline or request timeout where network dependency is visible

Do not use color alone to communicate state. Pair it with text, iconography, position, or an accessible status.

## Buttons and links

- Use one primary button per decision area.
- Use an outline or text action for alternatives; use a destructive treatment only for destructive actions.
- Write specific labels such as `Customise drink`, `Choose store`, or `Publish 12 products`; avoid ambiguous `Continue` when the outcome matters.
- Keep async buttons stable in width, disable duplicate submission while pending, and announce the result.
- Use links for navigation and buttons for actions.

## Navigation and URL behavior

- Treat the URL as the authoritative page state. Opening a canonical URL directly and refreshing it must render the same destination without relying on a previous in-memory tab value.
- Verify ordinary navigation updates the URL and creates browser history. Back and Forward must update both the visible page and its active navigation state.
- Every navigation control must expose a real `href` so it can be copied, opened in a new tab, and used without JavaScript interception. Use a button only when the interaction performs an action rather than navigation.
- Verify each destination on the real hosting model. For static export, confirm every supported clean URL produces an exported page and returns HTML directly instead of depending on an accidental development-server fallback.
- Keep `document.title`, the page `h1`, breadcrumbs, and `aria-current="page"` aligned with the active route.
- Round-trip shareable filters and selections through query parameters. Reloading or sharing the URL must restore them; clearing a control must remove its parameter.
- Use path segments for durable resources and nested workflows. Use query parameters for optional non-sensitive view state. Keep transient and sensitive state out of the URL.
- Test authentication and RBAC through direct URLs. Protected content must not render before access is established, and an unauthorised route must lead to an explicit safe fallback.
- Handle unknown routes with a useful 404 or canonical redirect. Do not silently display Home while leaving an unrelated URL in the address bar.

## Carousel

- Default to 5–7 seconds per campaign when autoplay is justified.
- Pause on pointer hover and keyboard focus; pause while the tab is not visible when practical.
- Provide previous/next controls, current position, and direct slide indicators.
- Stop animation for `prefers-reduced-motion`; preserve manual navigation.
- Give each slide a useful accessible name. Do not move keyboard focus when slides rotate.
- On touch, support swipe without trapping vertical page scrolling.

## Product browsing

- Make the product media and name open detail.
- Keep wishlist toggles in place and announce saved/removed state without navigating.
- Route goods add actions to cart or required variant selection.
- Route drink actions to customisation unless a complete repeat-order configuration already exists and is shown.
- Preserve scroll position, filters, and search when closing details or returning from a product.
- Do not show customer-facing changes until Admin data is published and the client has successfully refreshed.

## Forms and authentication

- Keep labels visible; placeholders are examples, not labels.
- Validate on blur or submit, then revalidate corrected fields without waiting for another full submit.
- Put error text next to the field and provide a summary when several fields fail.
- Preserve user input after recoverable errors.
- Use correct input type, autocomplete purpose, mobile keyboard, and password visibility controls.
- Explain why age, gender, phone, location, or address is requested and which fields are optional.
- Handle third-party login cancellation, duplicate email/account linking, provider failure, and return-to-checkout state.

## Dialogs, drawers, and sheets

- Move focus into the overlay, trap it while open, close with Escape, and return focus to the trigger.
- Give every overlay an accessible name and a visible close action.
- Avoid nested modals. Replace multi-step mobile dialogs with a full-height sheet or dedicated page.
- Confirm before discarding meaningful unsaved changes.
- Keep the final action visible without covering focused inputs or the mobile keyboard.

## Location and fulfilment

- Ask for location only after explaining the benefit: finding the nearest KIYOYO store.
- Provide manual store selection before and after permission denial.
- Rank six Nairobi stores by calculated distance when coordinates are available; identify unverified hours or availability.
- Never silently change the chosen store after the user has started customising or added a store-specific drink.
- For pickup, show store, address, hours, preparation estimate, order number, and one-time QR status.
- For delivery, show address, serviceability, fee, estimate, and editable instructions before order placement.

## Cart and checkout

- Recalculate price in response to size, toppings, discounts, quantity, and fulfilment changes.
- Keep subtotal, discounts, delivery/shipping, and total separately labelled.
- Explain out-of-stock or store-incompatible items and provide direct repair actions.
- Prevent duplicate order creation on repeat click, refresh, or network retry.
- On success, make the order number copyable and show the next operational step.
- A redeemed pickup QR must visibly change state and cannot be redeemed twice.

## Admin interactions

- Autosave only when state and recovery are obvious; otherwise provide an explicit Save action.
- Separate Save draft from Publish. Show validation errors before publishing.
- Preview tag color and placement against the actual customer card.
- For image changes, show upload progress, ratio/crop preview, alt-text field, ordering, failure recovery, and a confirm-before-delete action.
- For prices and discounts, show effective time, old/new customer price, conflict warning, and affected variants/stores.
- Show filters and counts for order, user, product, inventory, and redemption states.

## Accessibility baseline

- Maintain WCAG AA contrast for text and actionable boundaries.
- Use semantic headings in order and one page-level `h1`.
- Give icon-only controls accessible names and at least 44×44 px touch targets.
- Keep focus indicators visible on both light and dark/campaign surfaces.
- Add useful image alt text; use empty alt only for purely decorative imagery.
- Associate status updates with an appropriate live region; do not announce decorative carousel motion.
- Support 200% zoom without losing actions, content, or horizontal readability.

## Validation checklist

Run the checks relevant to the change:

1. Inspect at 390, 768, 1280, and 1440 px.
2. Navigate the full changed path using keyboard only.
3. Test touch-target size and fixed/sticky overlap on mobile.
4. Check default, loading, empty, error, unavailable, and success paths.
5. Confirm English and Chinese copy do not overflow.
6. Confirm drink images show the full cup and goods crops match their intended role.
7. Confirm Admin-defined price, discount, tag, image, availability, and publish state reach the customer UI.
8. Check motion with reduced-motion enabled.
9. Open every changed destination directly, refresh it, use Back/Forward, and open its navigation link in a new tab.
10. Confirm the active URL, page title, `h1`, breadcrumb, and navigation state agree.
11. Run lint, build, and targeted automated tests; for static export, inspect the generated route files.
12. Verify the rendered page, not only source code, when visual behavior is part of the request.

Record any intentionally deferred rule with its user impact and a concrete follow-up; do not quietly waive it.
