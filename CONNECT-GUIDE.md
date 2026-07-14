# LUXORA — Going Live: Firebase + Cloudinary Walkthrough

Your store works fully in demo mode right now. When you're ready for real
accounts, orders, and images that sync for every visitor, follow these steps.
Nothing in the code needs changing — you only fill in keys.

---

## Part 1 — Firebase (accounts, database, admin)

### 1. Create the project
1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it (e.g. `luxora-store`), continue, and create it.

### 2. Add a Web app
1. On the project overview, click the **`</>`** (Web) icon.
2. Give it a nickname, click **Register app**.
3. You'll see a `firebaseConfig` object with apiKey, authDomain, etc. Keep it open.

### 3. Paste the keys
Open `firebase/firebase-config.js` and replace the placeholders with your values:
```js
export const firebaseConfig = {
  apiKey: "AIza…",
  authDomain: "luxora-store.firebaseapp.com",
  projectId: "luxora-store",
  storageBucket: "luxora-store.appspot.com",
  messagingSenderId: "…",
  appId: "…"
};
export const ADMIN_EMAIL = "you@yourdomain.com";  // <-- your admin email
```

### 4. Turn on Email/Password sign-in
1. In Firebase: **Build → Authentication → Get started**.
2. Enable **Email/Password**.
3. Create your admin account under the **Users** tab (same email as `ADMIN_EMAIL`).

### 5. Create the database
1. **Build → Firestore Database → Create database**.
2. Choose **production mode**, pick a region close to your customers.
3. Go to the **Rules** tab, paste the contents of `firebase/firestore.rules`,
   and — important — change `your-email@example.com` in that file to your admin
   email first. Publish.

### 6. Authorise your live domain
1. **Authentication → Settings → Authorized domains → Add domain**.
2. Add your Vercel domain (e.g. `luxora.vercel.app`).

### 7. Publish your catalog
1. Deploy, open `/admin/login.html`, sign in with your admin account.
2. Go to **Settings → Publish catalog to Firebase**. Done — the 26 starter
   products are now in Firestore and identical for every visitor. Manage
   everything from **Products** from now on.

---

## Part 2 — Cloudinary (admin image uploads)

Firebase Storage now needs a billing card even on the free tier, so LUXORA uses
Cloudinary's free plan instead — no card required.

1. Sign up free at https://cloudinary.com.
2. On your dashboard, note your **Cloud name**.
3. Go to **Settings (gear) → Upload → Upload presets → Add upload preset**.
   - Set **Signing Mode: Unsigned**.
   - Save, and copy the **preset name**.
4. Put both into `firebase/firebase-config.js`:
```js
export const CLOUDINARY = {
  cloudName: "your-cloud-name",
  uploadPreset: "your-unsigned-preset"
};
```
Now when you upload product or banner images in the admin, they're hosted on
Cloudinary and appear on the live storefront for everyone. (Until you set this,
uploads still work as local previews so you can build your catalogue.)

---

## Part 3 — Deploy to Vercel

1. Push your project to a GitHub repo (contents of the `luxora` folder at the
   repo root — `index.html` must be at the top level).
2. On https://vercel.com, **Add New → Project**, import the repo, click **Deploy**.
3. Every future GitHub push redeploys automatically.

---

## Quick checklist

- [ ] `firebaseConfig` filled in
- [ ] `ADMIN_EMAIL` set to your email
- [ ] Email/Password auth enabled + admin user created
- [ ] Firestore created, rules pasted (with your email) and published
- [ ] Vercel domain added to Authorised domains
- [ ] Catalog published from Settings
- [ ] Cloudinary `cloudName` + `uploadPreset` filled in
- [ ] Deployed to Vercel

When all boxes are ticked, the admin dashboard shows **● Live · Firebase connected**
instead of Demo mode, and your store is fully operational.
