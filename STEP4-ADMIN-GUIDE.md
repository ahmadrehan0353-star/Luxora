# LUXORA — Admin Dashboard (Step 4)

Your store now has a full admin dashboard at **/admin**.

## How to open it

Go to `your-site.com/admin/login.html`

**In demo mode (no Firebase yet):** enter the admin email from
`firebase/firebase-config.js` — the default is `your-email@example.com` —
and *any* password. You're in. Everything you do is saved in your browser so
you can test the whole thing immediately.

**Once Firebase is connected:** you sign in with your real Firebase admin
account (the email must match `ADMIN_EMAIL` in the config).

## What each page does

- **Dashboard** — revenue, orders, customers, product counts, recent orders, top sellers, low-stock alerts
- **Products** — add / edit / duplicate / enable-disable / delete, upload multiple images, set price & sale price, stock, sizes, colours, and Featured/Trending/Best/New tags. **Anything you save here shows on the public storefront.**
- **Orders** — every order with a status dropdown (pending → confirmed → processing → shipped → delivered → cancelled → refunded)
- **Customers** — everyone who's ordered or registered, with totals
- **Categories** — add/edit/delete and reorder the nav categories
- **Inventory** — stock levels, low/out-of-stock filters, quick stock edits
- **Coupons** — create %-off or fixed-amount codes with expiry and usage limits (these are the codes customers type at checkout)
- **Banners** — the homepage hero slides. Upload a banner here and it appears on the home page.
- **Analytics** — revenue, orders, average order value, a monthly-sales chart, best sellers
- **Settings** — store name, currency, shipping/tax, and a "reset demo data" button

## The key promise: admin controls the public site

- Add or edit a product in **Products** → refresh the storefront → it's there.
- Add a **Banner** → it becomes a homepage hero slide.
- Create a **Coupon** → customers can use it at checkout.

In demo mode this works within your browser. Once Firebase is connected it
works for real, for everyone, across all devices.

## Going live (when you're ready)

1. **Firebase** — paste your keys into `firebase/firebase-config.js`, set `ADMIN_EMAIL`, enable Email/Password auth, create Firestore, and publish the rules in `firebase/firestore.rules` (change `your-email@example.com` there to your admin email).
2. **Images** — create a free Cloudinary account, make an *unsigned upload preset*, and put your `cloudName` + `uploadPreset` into the `CLOUDINARY` block in `firebase-config.js`. Until then, uploaded images work as local previews.

That's it — no code changes needed. The app detects your config and switches from demo mode to live automatically.
