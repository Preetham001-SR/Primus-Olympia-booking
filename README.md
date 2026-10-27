# Primus Olympia: Complimentary Chauffeur Site Visit

Drop-in feature for `https://www.primuslife.in/bangalore/olympia/`. It adds a hero offer strip, a section after Services, a booking modal, a 2-step qualified lead form, a "Site visit" item in the header ENQUIRY menus, and an FAQ entry.

## Files

| File | What it is |
|---|---|
| `wp-content/mu-plugins/pc-visit.php` | Loader: enqueue, template hooks, lead post type, AJAX handler, spam protection, sales email, CRM hook |
| `wp-content/mu-plugins/pc-visit/strip.php` | Hero offer strip markup |
| `wp-content/mu-plugins/pc-visit/section.php` | Section, form (both steps), success state, `<dialog>` modal |
| `wp-content/mu-plugins/pc-visit/pc-visit.css` | Styles (2.1 KB gzipped). Every class is `pc-` prefixed; only tokens measured on the live page |
| `wp-content/mu-plugins/pc-visit/pc-visit.js` | Vanilla JS, no dependencies (3.8 KB gzipped) |
| `wp-content/mu-plugins/pc-visit/score.php` | Pure helpers: phone normalisation, lead score, band |
| `tests/score-test.php` | Self-check for the helpers: `php tests/score-test.php` |
| `tests/wp-shim-server.php` | Local test server: runs the real handler on WordPress stand-ins and serves a snapshot of the live page with the build in place. Test only, never deploy |
| `tests/olympia-snapshot.html` | Snapshot of the live page HTML used by the test server |

## Install

1. Copy `wp-content/mu-plugins/pc-visit.php` and the `pc-visit/` folder into the site's `wp-content/mu-plugins/`. Must-use plugins load automatically; this is not a plugin from the directory.
2. In the theme's project template for Olympia, add two lines:
   - `<?php do_action( 'pc_visit_strip' ); ?>` immediately **after** the hero banner's closing `</section>`. Not inside it: the banner is a flex row and squeezes the strip.
   - `<?php do_action( 'pc_visit_section' ); ?>` immediately after the Services section (`#services`), before Amenities.
   Both hooks print nothing on other pages, so the shared template is safe.
3. Set the sales inbox (defaults to the WordPress admin email) in the theme's `functions.php`:
   ```php
   add_filter( 'pc_visit_sales_email', fn() => 'sales@primuslife.in' );
   ```
4. Add the FAQ entry in wp-admin (below).
5. GTM: create triggers for the six custom events below.

To try it locally: run `php -S localhost:8765 tests/wp-shim-server.php` from this folder, then open `http://localhost:8765/olympia`.

## Placements (offer copy is verbatim and the disclaimer shows on every one)

- **Hero strip**, below the banner form: offer + "Book a site visit" + disclaimer.
- **Section** "Visit Primus Olympia" after Services: offer, 3 steps, disclaimer, inline form.
- **Modal** (native `<dialog>`, styled like the enquiry popup: dark 80% overlay, white panel, × close, Esc closes). Opened by the strip button and the new header menu item. It never opens on load. Full screen below 576px. The same form moves into the modal, so anything typed carries over.
- **Header ENQUIRY dropdowns** (desktop and mobile): a "SITE VISIT" item that opens the modal. The modal itself shows the offer and disclaimer.
- **FAQ** entry (below).
- The floating Call / WhatsApp / Chat / Enquire bar is unchanged.

## Form

**Step 1** (saves a partial lead immediately): name and mobile (both required). Mobile accepts 10 digits starting 6-9, with optional `+91`, `91` or `0`, spaces or dashes; `type="tel"` brings up the phone keypad on mobile. Then a plain notice of how the number is used, and an **unticked, optional** marketing consent checkbox.

**Step 2:** pickup area or pincode (required), preferred date (required, tomorrow to +90 days), and optional time slot, who the visit is for, number of people, buying timeline, budget band (₹98 L or above / below / not sure), and comfort notes ("Please do not share medical details").

**Serviceability hint** (shown live, never a confirmation):
- pincode matches the list: "Looks like we can arrange this. Our team will confirm."
- any other pincode: "Our team will check whether pickup is possible from this pincode and confirm by call."
- area name with no pincode: "Our team will check pickup from this area and confirm by call."

**Success:** the name, phone and reference are confirmed, with next steps, the disclaimer, and a WhatsApp button to +91 98450 37078 prefilled with date, time, pickup area and reference (not name or phone).

**Hidden fields:** `utm_source/medium/campaign/term/content` (from the URL, kept for the browser session), `page_url`, `device`, `client_ts`, `offer_id=olympia-chauffeur-v1`. The lead score is computed **on the server only**, so it can't be faked from the browser; the band is sent back for analytics.

## Endpoint: `POST /wp-admin/admin-ajax.php`, `action=pc_visit`

Body is `multipart/form-data`. Responses are WordPress JSON: `{ "success": true, "data": {...} }` or `{ "success": false, "data": { "message", "field" } }` with HTTP 400 / 403 / 429 / 500. `field` names the input to highlight.

| Stage | Fields | Server checks | Success data |
|---|---|---|---|
| `stage=1` | `nonce`, `name`, `phone`, `consent=yes` (optional), hidden fields, `website` (honeypot) | Nonce; name 2-80 chars; Indian mobile; max 5 per IP per hour (429) | `ref` (e.g. `PO-123`), `token` |
| `stage=2` | `nonce`, `ref`, `token`, `pickup_area`, `visit_date`, `slot`, `visit_for`, `people`, `timeline`, `budget`, `comfort` | Token must match the lead (SHA-256 stored); area 2-120 chars; date after today and within 90 days; every choice checked against a fixed list (anything else is stored as blank); comfort notes trimmed to 500 characters with tags stripped. A repeat submit returns the same answer and changes nothing | `ref`, `band` |

**Spam:** honeypot (a filled `website` field gets a fake success and nothing is stored), nonce, and a per-IP rate limit on step 1. Step 2 needs the secret token from step 1.

**Lead score (0-8):** buying now +3 / in 1-3 months +2; budget ₹98 L or above +2; visit for self or parent +1; visit within 14 days +1; pincode on the list +1. Bands: **hot** 6+, **warm** 3-5, **cold** 0-2.

**Where leads go:**
- **WordPress:** every lead is saved as a private "Site visit leads" post (wp-admin menu with a car icon). The title shows the band and score, and the body holds all fields. Step 1 creates it and step 2 updates it, so nothing is lost if email fails.
- **Email:** sales gets one email when step 2 completes, with the subject `[HOT 8/8] Chauffeur site visit: Name, date`. If step 2 isn't finished within 30 minutes, a `[PARTIAL]` email goes out instead (via WP-Cron, which runs on page traffic).
- **CRM:** connect it here (in `functions.php`), at both stages:
  ```php
  add_action( 'pc_visit_lead', function ( array $lead, string $stage, int $post_id ) {
      // $stage is 'partial' or 'complete'. Push to the CRM here, e.g. wp_remote_post( CRM_URL, [ 'body' => $lead ] ).
  }, 10, 3 );
  ```
- **WhatsApp:** the visitor-side link is built in the browser. To send a WhatsApp confirmation from Primus's own number, call the WhatsApp Business API provider from the same `pc_visit_lead` hook when `$stage === 'complete'`.

**Filters:** `pc_visit_enabled` (which pages; default is the post with slug `olympia`), `pc_visit_pincode_re` (serviceable pincodes; default `^560\d{3}$`), `pc_visit_sales_email`.

## Analytics (pushed to `dataLayer`, with `offer_id` on every event; no personal data)

| Event | When | Extra |
|---|---|---|
| `offer_view` | Once per placement, when it scrolls into the upper 60% of the screen | `placement`: `hero_strip`, `section` |
| `offer_cta_click` | A button or menu item that opens the modal | `placement`: `hero_strip`, `header_menu`, `header_menu_mobile` |
| `step1_complete` | Step 1 passes validation and is sent | |
| `step2_complete` | Step 2 passes validation and is sent | |
| `submit_success` | Server confirms step 2 | `lead_band`: hot / warm / cold |
| `whatsapp_click` | WhatsApp button on the success screen | |

## FAQ entry (add as the 11th item in wp-admin)

**Question:** `11. Is the chauffeur service really free?`

**Answer:** `Yes. Get Free Complimentary Doorstep Chauffeur Pickup & Drop when you book a site visit. Travel stress-free. Chauffeur service across Bangalore is subject to location, schedule, and team confirmation.`

The page's `FAQPage` JSON-LD looks generated from the same FAQ list, so it should pick this up. Check after saving: view the page source and search for "really free". If it isn't there, the markup to add to that JSON-LD `mainEntity` array is:

```json
{ "@type": "Question", "name": "11. Is the chauffeur service really free?",
  "acceptedAnswer": { "@type": "Answer", "text": "Yes. Get Free Complimentary Doorstep Chauffeur Pickup & Drop when you book a site visit. Travel stress-free. Chauffeur service across Bangalore is subject to location, schedule, and team confirmation." } }
```

If the FAQ is hard-coded in the template instead, the HTML in the page's existing format is:

```html
<div class="accordion-item">
    <h2 class="accordion-header" id="heading_11">
        <button class="accordion-button accordion-btn collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapse_11" aria-expanded="false" aria-controls="collapse_11" itemprop="name">
            11. Is the chauffeur service really free?
        </button>
    </h2>
    <div id="collapse_11" class="accordion-collapse collapse" aria-labelledby="heading_11" data-bs-parent="#accordionFlushExample">
        <div class="accordion-body">
            <p>Yes. Get Free Complimentary Doorstep Chauffeur Pickup &amp; Drop when you book a site visit. Travel stress-free. Chauffeur service across Bangalore is subject to location, schedule, and team confirmation.</p>
        </div>
    </div>
</div>
```

No other JSON-LD was added: no offer, rating or review markup.

## Assumptions (please confirm)

1. The Olympia page is the post with slug `olympia`. If not, use the `pc_visit_enabled` filter.
2. **Any 560xxx pincode counts as "likely serviceable"** until the ops team supplies the real list.
3. Visit time slots are 10 am-12 noon, 12 noon-3 pm and 3 pm-6 pm, and the earliest visit date is tomorrow.
4. Sales WhatsApp is +91 98450 37078 and the phone line is 1800 121 411111 (both taken from the live page).
5. The new copy deliberately says nothing about possession, "ready to move in", or assisted vs independent living, because the live page contradicts itself on both.
6. The page stays uncached (it currently sends `no-cache`). If full-page caching is turned on, the form nonce goes stale after about 24 hours and submits fail with "This page has expired".
7. Leads go to a separate handler, not the theme's `handle_form_submission`, because its PHP and CRM mapping weren't available. Connect the CRM through the `pc_visit_lead` hook.

## Compliance flags (not legal advice)

- **DPDP Act / TRAI:** the new form keeps "arrange this visit" (the purpose the visitor asked for) separate from marketing consent, and the marketing checkbox is optional and unticked. The existing hero form still has implied consent tied to submitting the form, "even if my number is on DND/NDNC". That form is not changed here; please have legal review it.
- **Retention:** leads are stored in WordPress indefinitely. Agree a retention period and an erasure process for access and deletion requests.
- **Who can see leads:** editors and administrators can view the "Site visit leads" posts.

## Known limits

- The Privacy Policy link inside the notice is an inline text link, so its tap target is the line height, not 48px. WCAG allows this for inline links.
- Error messages use the brand dark plum plus a "!" marker instead of red, because the page has no red token.
- Field underlines use `#4A4A4A` instead of the theme's `#CCCCCC` so they meet the 3:1 contrast needed for form controls.
- The rate limit is a simple counter per IP per hour. Use Cloudflare rate limiting if spam gets through.
