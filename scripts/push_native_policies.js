/**
 * Never Mind Store - Push Native Shopify Policies (/policies/*)
 * 
 * Uses Shopify GraphQL mutation `shopPolicyUpdate` to push approved policies
 * directly into Shopify Settings > Policies:
 * - /policies/refund-policy
 * - /policies/shipping-policy
 * - /policies/privacy-policy
 * - /policies/terms-of-service
 * - /policies/legal-notice
 * - /policies/contact-information
 * 
 * Note: Requires `write_legal_policies` scope on the App.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v && !process.env[k.trim()]) process.env[k.trim()] = v.trim();
  });
}

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN || '9mtpvw-kr.myshopify.com';
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

function wrapBilingual(enTitle, enHtml, arTitle, arHtml) {
  return `
<div class="policy-container" style="max-width: 860px; margin: 0 auto; padding: 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.7; color: #111827;">

  <!-- Language Switch / Badge -->
  <div style="display: flex; gap: 10px; margin-bottom: 24px; border-bottom: 1px solid #E5E7EB; padding-bottom: 14px;">
    <span style="display: inline-flex; align-items: center; padding: 4px 12px; background: #F3F4F6; border-radius: 9999px; font-size: 0.85rem; font-weight: 600;">🌐 English &amp; العربية</span>
    <span style="display: inline-flex; align-items: center; padding: 4px 12px; background: #ECFDF5; color: #065F46; border-radius: 9999px; font-size: 0.85rem; font-weight: 600;">🇪🇬 Egypt &bull; EGP</span>
  </div>

  <!-- English Section -->
  <section class="policy-lang policy-en" dir="ltr" style="text-align: left; margin-bottom: 40px;">
    <h1 style="font-size: 1.85rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 20px; color: #111827; text-transform: uppercase;">${enTitle}</h1>
    <div class="policy-body" style="font-size: 0.96rem; color: #374151;">
      ${enHtml}
    </div>
  </section>

  <hr style="border: 0; border-top: 2px dashed #D1D5DB; margin: 36px 0;" />

  <!-- Arabic Section -->
  <section class="policy-lang policy-ar" dir="rtl" style="text-align: right; margin-bottom: 30px;">
    <h2 style="font-size: 1.85rem; font-weight: 800; margin-bottom: 20px; color: #111827;">${arTitle}</h2>
    <div class="policy-body" style="font-size: 1rem; color: #374151; line-height: 1.9;">
      ${arHtml}
    </div>
  </section>

</div>
  `.trim();
}

async function main() {
  console.log('--- Connecting to Shopify Admin ---');

  const tokenData = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  }).toString();

  const tokenRes = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SHOP,
      path: '/admin/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenData)
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.on('error', reject);
    req.write(tokenData);
    req.end();
  });

  const token = tokenRes.access_token;
  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': token
  };

  const pagesRes = await new Promise((resolve, reject) => {
    https.request({
      hostname: SHOP,
      path: '/admin/api/2024-07/pages.json',
      headers: { 'X-Shopify-Access-Token': token }
    }, r => {
      let b = '';
      r.on('data', d => b += d);
      r.on('end', () => resolve(JSON.parse(b)));
    }).end();
  });

  const pages = pagesRes.pages || [];

  // Mapping of Shopify Policy Types
  const policyTypes = [
    { type: 'REFUND_POLICY', handle: 'refund-policy', name: 'Refund policy' },
    { type: 'SHIPPING_POLICY', handle: 'shipping-policy', name: 'Shipping policy' },
    { type: 'PRIVACY_POLICY', handle: 'privacy-policy', name: 'Privacy policy' },
    { type: 'TERMS_OF_SERVICE', handle: 'terms-of-service', name: 'Terms of service' },
    { type: 'LEGAL_NOTICE', handle: 'legal-notice', name: 'Legal notice' },
    { type: 'CONTACT_INFORMATION', handle: 'contact', name: 'Contact information' }
  ];

  for (const item of policyTypes) {
    const page = pages.find(p => p.handle === item.handle);
    if (!page || !page.body_html) continue;

    const mutation = `
      mutation updatePolicy($shopPolicy: ShopPolicyInput!) {
        shopPolicyUpdate(shopPolicy: $shopPolicy) {
          shopPolicy {
            id
            title
            url
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const body = JSON.stringify({
      query: mutation,
      variables: {
        shopPolicy: {
          type: item.type,
          body: page.body_html
        }
      }
    });

    const res = await new Promise((resolve) => {
      const req = https.request({
        hostname: SHOP,
        path: '/admin/api/2024-07/graphql.json',
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }
      }, r => {
        let b = '';
        r.on('data', d => b += d);
        r.on('end', () => resolve({ status: r.statusCode, data: JSON.parse(b) }));
      });
      req.write(body);
      req.end();
    });

    if (res.data?.data?.shopPolicyUpdate?.shopPolicy) {
      console.log(`[SUCCESS] Updated native policy: ${item.name} -> ${res.data.data.shopPolicyUpdate.shopPolicy.url}`);
    } else {
      console.log(`[NOTICE] ${item.name}:`, res.data?.errors || res.data?.data?.shopPolicyUpdate?.userErrors);
    }
  }
}

main().catch(console.error);
