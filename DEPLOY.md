# TerraTwin Deployment Guide

TerraTwin is a static, client-side web application built with React, Vite, Leaflet, and Three.js. It requires no backend application server or database.

---

## 1. Fast Production Build (Static `dist/`)

To produce the static distribution:

```bash
cd terra_twin_web
npm install
npm run build
```

This generates `terra_twin_web/dist/`. Because Vite is configured with `base: './'`, this directory can be deployed directly to any static web host, subdirectory, or S3/GCS bucket.

To test the production build locally:

```bash
npm run preview
# Or with specific port and host:
npm run preview -- --host 0.0.0.0 --port 4173
```

---

## 2. Docker Deployment (Multi-Stage Build + Nginx)

A production-ready multi-stage `Dockerfile` and `nginx.conf` are provided in `terra_twin_web/`.

### Build and Run Docker Container

```bash
cd terra_twin_web
docker build -t terratwin-web .
docker run -d --name terratwin -p 80:80 terratwin-web
```

Open `http://localhost/` in your browser.

### Docker Features
- Multi-stage build (`node:20-alpine` -> `nginx:alpine`) keeping final container image small (< 30 MB).
- Gzip compression enabled for JS, CSS, JSON, SVG, HTML.
- Long cache headers (`1 year, immutable`) for hashed assets in `/assets/`.
- No-cache headers for `index.html` and `.json` data to ensure data freshness.
- Single Page Application (SPA) routing fallback: all routes fallback to `/index.html`.
- Legacy `/terrain` redirect: automatically returns `301 /?view=globe&terrain=1&focus=terrain`.

---

## 3. WebXR / Meta Quest HTTPS Requirement

> [!IMPORTANT]
> WebXR (Virtual Reality) **requires a secure context (HTTPS)**. Headset browsers such as Meta Quest Browser will disable WebXR sessions over plain HTTP.

### Running Behind an Existing HTTPS Nginx Proxy

If you have an existing domain with Let's Encrypt or an SSL certificate, proxy incoming requests to the Docker container or local preview server:

```nginx
server {
    listen 443 ssl http2;
    server_name terratwin.example.org;

    ssl_certificate /etc/letsencrypt/live/terratwin.example.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/terratwin.example.org/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### Local HTTPS for Quest Headset Testing

For testing on a local Meta Quest headset over Wi-Fi:
1. Run local HTTPS tunnel (e.g. `cloudflared tunnel`, `caddy`, or `mkcert` with Vite):
   ```bash
   npx cloudflared tunnel --url http://localhost:4173
   ```
2. Open the generated `https://...trycloudflare.com` URL in Meta Quest Browser.

---

## 4. Static Hosting Providers

### Netlify / Vercel
Deploy the `terra_twin_web/dist` folder:
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **SPA Rewrite Rule (Netlify `_redirects`):** `/* /index.html 200`
- **SPA Rewrite Rule (Vercel `vercel.json`):**
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

### GitHub Pages
1. Push `dist/` contents to `gh-pages` branch.
2. Note: GitHub Pages supports custom 404 page fallback by copying `dist/index.html` to `dist/404.html`.
