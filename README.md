# Marginal News — complete newsroom website

A responsive editorial/news homepage inspired by the structure of modern digital newspapers, using the Marginal News red/black identity. Includes a Cloudflare Pages Functions API, KV-backed CMS, admin dashboard, newsletter signup, PWA icons and offline shell.

## Included
- `index.html` — public news homepage, category filters, featured story, breaking ticker, search, article reader, most-read/editor picks, opinion and newsletter.
- `admin/index.html` — password-protected newsroom interface to create, edit, schedule, publish and delete stories; export newsletter subscribers as CSV.
- `functions/api/stories.js` — public stories API and authenticated newsroom API.
- `functions/api/subscribe.js` — newsletter subscription and authenticated CSV export.
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`, `robots.txt`, `_headers`.

## Deploy to Cloudflare Pages
1. Upload the **contents** of this folder to the root of a GitHub repository. Keep `functions/` and `admin/` folders at the repository root.
2. In Cloudflare Dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and select the repository.
3. Use no framework preset. Leave the build command blank and set the build output directory to `.` (the repository root). Deploy.
4. Create a KV namespace under **Workers & Pages → KV**.
5. Open the Pages project **Settings → Bindings → Add → KV namespace**. Set the variable name to exactly `NEWS` and select the namespace.
6. Under **Settings → Variables and Secrets**, add `ADMIN_PASSWORD` as a secret with a long unique password. Do not put this password in the source code.
7. Redeploy the project after adding the binding and secret.
8. Open `https://YOUR-PROJECT.pages.dev/admin`, sign in with `ADMIN_PASSWORD`, and publish your first real story.
9. Add your domain under **Custom domains** and follow Cloudflare's DNS instructions. Replace `YOUR-DOMAIN.example` in the canonical and robots metadata with your real domain.

## Editorial workflow
- Visit `/admin` and sign in.
- Click **New story**, enter headline, summary, category, author, image URL and article body.
- Choose **Publish now**, **Save as draft**, or **Schedule** with a date/time.
- Tick **Featured story** to make the article the homepage lead; tick **Editor's pick** to surface it in the editor's picks area.
- Download newsletter subscribers from the dashboard.

## Notes
- The homepage starts with an honest empty state rather than invented current headlines. Publish genuine reporting through the admin panel.
- Article images should be hosted on a reliable public HTTPS URL and used with permission.
- Newsletter signup requires the Cloudflare KV binding. For high-volume newsletters, connect a dedicated email service before sending campaigns; this form stores subscriber addresses but does not send email.
- Set up Google Search Console, add your verified sitemap, and configure analytics/advertising only after launch and consent/privacy requirements are addressed.
