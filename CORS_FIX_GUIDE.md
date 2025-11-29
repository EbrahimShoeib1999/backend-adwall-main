# CORS Issue Fix - Complete Guide

## Problem Summary
- **Issue**: CORS error when frontend (https://adwallpro.vercel.app) calls backend API (https://api.adwallpro.com)
- **Symptom**: Request returns 200 OK in Network tab, but CORS error in Console
- **Root Cause**: Nginx reverse proxy not forwarding CORS headers from Node.js to browser

## Solution Implemented

### 1. Enhanced Node.js CORS Configuration (app.js)
We implemented a **dual CORS approach**:

#### A. Manual CORS Headers (Primary)
```javascript
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});
```

#### B. CORS Package (Backup)
The `cors` npm package is still used as a backup layer.

### 2. Nginx Configuration

**CRITICAL**: Your Nginx config must NOT add CORS headers. Let Node.js handle them.

See `nginx-config-example.conf` for the complete configuration.

Key points:
- ✅ Forward the `Origin` header: `proxy_set_header Origin $http_origin;`
- ✅ Do NOT add `add_header Access-Control-*` directives
- ✅ Use `proxy_pass http://127.0.0.1:8000;`

## Deployment Steps

### Step 1: Update Node.js Code (DONE ✅)
The `app.js` file has been updated with the enhanced CORS configuration.

### Step 2: Deploy to VPS

#### A. Upload the updated code to your VPS
```bash
# On your local machine
git add .
git commit -m "Fix CORS headers for Nginx proxy"
git push

# On your VPS
cd /path/to/your/backend
git pull
```

#### B. Restart your Node.js application
```bash
# If using PM2
pm2 restart all

# If using systemd
sudo systemctl restart your-app-name

# Or manually
pkill node
npm start
```

### Step 3: Update Nginx Configuration (If Needed)

#### A. Check your current Nginx config
```bash
sudo nano /etc/nginx/sites-available/api.adwallpro.com
```

#### B. Ensure it does NOT have these lines:
```nginx
# ❌ REMOVE these if present:
add_header 'Access-Control-Allow-Origin' '*';
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
# etc...
```

#### C. Ensure it DOES have this line:
```nginx
# ✅ MUST have this:
proxy_set_header Origin $http_origin;
```

#### D. Reload Nginx
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### Step 4: Test CORS Headers

Run the diagnostic script:
```bash
node test-cors-headers.js
```

Expected output:
```
✓ access-control-allow-origin: https://adwallpro.vercel.app
✓ access-control-allow-credentials: true
✓ access-control-allow-methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
✓ access-control-allow-headers: Content-Type, Authorization, X-Requested-With, Accept
```

### Step 5: Test in Browser

1. Open your frontend: https://adwallpro.vercel.app
2. Open DevTools (F12)
3. Go to Network tab
4. Refresh the page
5. Click on the API request (e.g., `/api/v1/categories`)
6. Check the **Response Headers** section
7. You should see:
   ```
   Access-Control-Allow-Origin: https://adwallpro.vercel.app
   Access-Control-Allow-Credentials: true
   ```

## Troubleshooting

### Issue: Still getting CORS error after deployment

**Check 1: Verify Node.js is running the new code**
```bash
# On VPS
pm2 logs
# Look for the restart timestamp
```

**Check 2: Verify Nginx is forwarding Origin header**
```bash
# On VPS
sudo tail -f /var/log/nginx/access.log
# Make a request from frontend and check if Origin header is logged
```

**Check 3: Check for Nginx CORS headers**
```bash
curl -H "Origin: https://adwallpro.vercel.app" \
     -I https://api.adwallpro.com/api/v1/categories?page=1&limit=16
```

Look for duplicate `Access-Control-Allow-Origin` headers. If you see duplicates, Nginx is adding them (which is bad).

**Check 4: Clear browser cache**
```
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
```

### Issue: OPTIONS requests failing

This means preflight requests aren't handled. Verify:
1. The manual CORS middleware is BEFORE all routes
2. The `if (req.method === 'OPTIONS')` block is present
3. Nginx is not blocking OPTIONS requests

### Issue: Credentials error

If you see "credentials mode is 'include'", ensure:
1. `Access-Control-Allow-Credentials: true` header is present
2. `Access-Control-Allow-Origin` is NOT `*` (must be specific origin)
3. Frontend is sending `credentials: 'include'` in fetch/axios

## Common Nginx Mistakes

❌ **WRONG** - Adding CORS headers in Nginx:
```nginx
location / {
    add_header 'Access-Control-Allow-Origin' '*';  # DON'T DO THIS
    proxy_pass http://127.0.0.1:8000;
}
```

✅ **CORRECT** - Let Node.js handle CORS:
```nginx
location / {
    proxy_set_header Origin $http_origin;  # Forward origin to Node.js
    proxy_pass http://127.0.0.1:8000;
}
```

## Verification Checklist

- [ ] Updated `app.js` with enhanced CORS middleware
- [ ] Committed and pushed code to repository
- [ ] Pulled latest code on VPS
- [ ] Restarted Node.js application
- [ ] Verified Nginx config does NOT add CORS headers
- [ ] Verified Nginx config forwards Origin header
- [ ] Reloaded Nginx
- [ ] Ran `test-cors-headers.js` successfully
- [ ] Tested in browser - no CORS errors
- [ ] Checked Network tab - CORS headers present

## Expected Result

After completing all steps:
- ✅ No CORS errors in browser console
- ✅ API requests succeed from https://adwallpro.vercel.app
- ✅ Response headers include proper CORS headers
- ✅ Both GET and POST requests work
- ✅ Preflight OPTIONS requests handled correctly

## Need Help?

If you're still experiencing issues:
1. Run `node test-cors-headers.js` and share the output
2. Share your Nginx configuration file
3. Share the browser console error (full message)
4. Share the Network tab headers (Request + Response)
