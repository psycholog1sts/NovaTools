# Cloudflare SSL/TLS Configuration for SSL Labs A+ Readiness

Use these exact Cloudflare dashboard steps for mc-novatools.com after the updated repository security headers are deployed.

## 1. Set origin encryption to Full (strict)

1. Sign in to the Cloudflare dashboard.
2. Select the mc-novatools.com zone.
3. Navigate to SSL/TLS.
4. Open Overview.
5. Set SSL/TLS encryption mode to Full (strict).
6. Confirm the origin server has a valid, unexpired certificate that matches mc-novatools.com before relying on Full (strict).

## 2. Configure Edge Certificates for modern HTTPS

1. In the mc-novatools.com zone, navigate to SSL/TLS.
2. Open Edge Certificates.
3. Set Minimum TLS Version to TLS 1.2.
4. Confirm TLS 1.0 and TLS 1.1 are disabled. TLS 1.0 and TLS 1.1 are deprecated protocols and are penalized by SSL Labs because they do not meet modern transport security expectations.
5. Enable Always Use HTTPS.
6. Enable Automatic HTTPS Rewrites.
7. Enable Opportunistic Encryption.

## 3. Enable HSTS for preload readiness

1. In SSL/TLS > Edge Certificates, open HTTP Strict Transport Security (HSTS).
2. Enable HSTS.
3. Set Max Age Header to 12 months or 31536000 seconds.
4. Enable Include subdomains.
5. Enable Preload.
6. Save the HSTS configuration.
7. Monitor the site for at least 72 hours after stable HSTS deployment and confirm all subdomains are HTTPS-ready.
8. After 72 hours of stable HSTS deployment, submit the domain for preload review at https://hstspreload.org.

## 4. Configure Speed and Optimization settings

1. Navigate to Speed.
2. Open Optimization.
3. Enable Auto Minify for HTML.
4. Enable Auto Minify for CSS.
5. Enable Auto Minify for JS.
6. Enable Brotli compression.
7. Enable Early Hints.
8. Disable Rocket Loader. Rocket Loader must remain disabled because it can defer or rewrite scripts in ways that interfere with crawler rendering, advertising scripts, consent flows, or client-side utility behavior.

## 5. Verify externally after deployment

1. Deploy the repository changes that emit the required security headers.
2. Wait for Cloudflare cache propagation.
3. Test https://mc-novatools.com at https://www.ssllabs.com/ssltest/.
4. Confirm the report shows TLS 1.0 and TLS 1.1 are not offered.
5. Confirm the report recognizes HSTS with includeSubDomains and preload readiness.
6. Confirm the final SSL Labs grade is A+.
