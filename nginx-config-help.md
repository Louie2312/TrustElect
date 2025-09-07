# Nginx Configuration for Image Uploads

## The Problem
You're getting a "413 Request Entity Too Large" error because Nginx is rejecting the request before it reaches your Node.js application.

## Solution
You need to update your Nginx configuration to allow larger file uploads.

### 1. Find your Nginx configuration file
Usually located at:
- `/etc/nginx/nginx.conf`
- `/etc/nginx/sites-available/your-site`
- `/etc/nginx/conf.d/your-site.conf`

### 2. Add or update these directives

```nginx
# In the http block (affects all sites)
http {
    client_max_body_size 5M;  # Allow up to 5MB uploads
    
    # Optional: Increase timeout for large uploads
    client_body_timeout 60s;
    client_header_timeout 60s;
}

# Or in the server block (affects only your site)
server {
    listen 80;
    server_name your-domain.com;
    
    client_max_body_size 5M;  # Allow up to 5MB uploads
    
    # Your existing location blocks...
    location / {
        proxy_pass http://localhost:3000;  # or your Node.js port
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase proxy timeouts for large uploads
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 3. Test and reload Nginx
```bash
# Test the configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### 4. Alternative: Quick fix for testing
If you need a quick fix, you can temporarily set a very large limit:
```nginx
client_max_body_size 50M;
```

## Important Notes
- The `client_max_body_size` directive sets the maximum allowed size of the client request body
- Default is usually 1MB
- This affects ALL file uploads, not just images
- Make sure your Node.js application also has appropriate limits
- Consider security implications of allowing large uploads

## Current Application Limits
- Frontend validation: 1.5MB
- Backend validation: 2MB
- Recommended Nginx limit: 5MB (to allow some buffer)

## Troubleshooting
1. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Verify the configuration: `sudo nginx -t`
3. Restart Nginx if needed: `sudo systemctl restart nginx`
