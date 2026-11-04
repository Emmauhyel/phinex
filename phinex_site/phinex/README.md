# Phinex website

Files: index.html (public page), admin.html (owner inbox), style.css, admin.css, script.js, admin.js,
config.js (database settings), schema.sql (database), assets/ (logo and product images).

## Setup (about 10 minutes)
1. Create a free project at supabase.com.
2. SQL Editor > New query > paste schema.sql. First change owner@phinex.com to your own email. Run.
3. Authentication > Users > Add user: use that same email and a strong password.
   Authentication > Sign In / Providers: turn OFF "Allow new users to sign up".
4. Project Settings > API: copy the Project URL and the anon public key into config.js.
5. Upload the whole folder to any host (Netlify, Vercel, GitHub Pages). Open /admin.html to log in.

## Editing
- Text, prices, phone number, address: edit index.html.
- Images: replace the files in assets/ with your own photos, keeping the same filenames
  (or change the filenames in index.html if you use .jpg or .png).
