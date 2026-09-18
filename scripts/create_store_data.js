/**
 * Never Mind Store - Automated Catalog & Collections Setup Script
 * Usage: node scripts/create_store_data.js <SHOPIFY_ACCESS_TOKEN>
 */

const https = require('https');

const SHOP = '9mtpvw-kr.myshopify.com';
const API_VERSION = '2024-01';
const TOKEN = process.argv[2] || process.env.SHOPIFY_ADMIN_TOKEN;

if (!TOKEN) {
  console.error('\x1b[31mError: Please provide your Shopify Admin API Token (shpat_...)\x1b[0m');
  console.log('Usage: node scripts/create_store_data.js shpat_xxxxxxxxxxxxxxxxxxxx');
  process.exit(1);
}

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const req = https.request({
      hostname: SHOP,
      path: `/admin/api/${API_VERSION}${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN,
        ...(body ? { 'Content-Length': Buffer.byteLength(dataString) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ statusCode: res.statusCode, error: json });
          }
        } catch (e) {
          resolve({ raw: data, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

const COLLECTIONS = [
  {
    title: "Men's Collection",
    handle: "men",
    body_html: "<p>Engineered luxury streetwear, oversized t-shirts, hoodies, and cargo pants tailored from premium Egyptian cotton.</p>"
  },
  {
    title: "Women's Collection",
    handle: "women",
    body_html: "<p>Contemporary minimalist silhouettes, relaxed fits, and everyday luxury essentials tailored in Egypt.</p>"
  },
  {
    title: "Kids & Teens Collection",
    handle: "kids",
    body_html: "<p>Comfortable everyday youth staples and modern streetwear designed for freedom of movement.</p>"
  },
  {
    title: "Best Sellers",
    handle: "best-sellers",
    body_html: "<p>Our most coveted and highest-rated pieces crafted for comfort and presence.</p>"
  },
  {
    title: "New Arrivals",
    handle: "new-arrivals",
    body_html: "<p>Latest seasonal drops and newly released silhouettes.</p>"
  },
  {
    title: "Sale & Offers",
    handle: "sale",
    body_html: "<p>Exclusive seasonal discounts of up to 40% off select styles.</p>"
  }
];

const PRODUCTS = [
  // MEN
  {
    title: "Signature Heavyweight Oversized Tee - Mineral Black",
    collectionHandle: "men",
    product_type: "T-Shirt",
    tags: "men, bestseller, oversized, cotton",
    price: "599.00",
    compare_at_price: "799.00",
    description: "Crafted from 100% premium Egyptian combed cotton (240 GSM). Relaxed drop-shoulder silhouette with reinforced rib collar."
  },
  {
    title: "Boxy French Terry Minimalist Hoodie - Charcoal",
    collectionHandle: "men",
    product_type: "Hoodie",
    tags: "men, bestseller, hoodie, winter",
    price: "1199.00",
    compare_at_price: "1499.00",
    description: "Heavyweight 450 GSM diagonal loopback French terry. Clean kangaroo pocket and structured double-layer hood."
  },
  {
    title: "Tactical Relaxed Cargo Pants - Olive Drab",
    collectionHandle: "men",
    product_type: "Pants",
    tags: "men, cargo, pants",
    price: "950.00",
    compare_at_price: "1250.00",
    description: "Tailored durable gabardine fabric with ergonomic knee darts, deep cargo utility pockets, and adjustable hem drawstrings."
  },
  {
    title: "Essential Relaxed Fit Cotton Tee - Off-White",
    collectionHandle: "men",
    product_type: "T-Shirt",
    tags: "men, basic, essential",
    price: "550.00",
    compare_at_price: "699.00",
    description: "Timeless streetwear essential in soft Egyptian cotton. Pre-shrunk for exact fit wash after wash."
  },
  // WOMEN
  {
    title: "Cropped Structured Heavyweight Tee - Bone Ivory",
    collectionHandle: "women",
    product_type: "T-Shirt",
    tags: "women, bestseller, cropped, tee",
    price: "549.00",
    compare_at_price: "699.00",
    description: "Contemporary boxy crop silhouette engineered from 220 GSM Egyptian cotton. Flattering drape and clean hem finish."
  },
  {
    title: "Oversized Minimalist Lounge Hoodie - Warm Taupe",
    collectionHandle: "women",
    product_type: "Hoodie",
    tags: "women, hoodie, loungewear",
    price: "1150.00",
    compare_at_price: "1399.00",
    description: "Ultra-soft brushed interior with an effortlessly oversized fit. Perfect pairing with matching sweatpants."
  },
  {
    title: "Wide-Leg Structured Sweatpants - Heather Grey",
    collectionHandle: "women",
    product_type: "Pants",
    tags: "women, sweatpants, loungewear",
    price: "899.00",
    compare_at_price: "1150.00",
    description: "High-waisted wide-leg cut with elastic waistband and internal cotton drawcord. Fluid luxury drape."
  },
  // KIDS & TEENS
  {
    title: "Teens Urban Graphic Drop-Shoulder Tee - Desert Sand",
    collectionHandle: "kids",
    product_type: "T-Shirt",
    tags: "kids, teens, streetwear",
    price: "450.00",
    compare_at_price: "599.00",
    description: "Breathable pure cotton tee featuring subtle minimalist chest typography. Designed for everyday comfort and durability."
  },
  {
    title: "Kids Everyday Fleece Tracksuit Set - Midnight Navy",
    collectionHandle: "kids",
    product_type: "Set",
    tags: "kids, set, tracksuit",
    price: "799.00",
    compare_at_price: "999.00",
    description: "2-piece matching hoodie and sweatpants set tailored from skin-friendly cotton fleece with flexible cuffs."
  }
];

async function main() {
  console.log(`\x1b[36mConnecting to Shopify Admin for ${SHOP}...\x1b[0m\n`);

  const createdCollections = {};

  // 1. Create or Fetch Collections
  console.log('--- Step 1: Setting Up Collections ---');
  for (const col of COLLECTIONS) {
    try {
      console.log(`Creating collection: ${col.title} (handle: ${col.handle})...`);
      const res = await apiRequest('POST', '/custom_collections.json', {
        custom_collection: {
          title: col.title,
          handle: col.handle,
          body_html: col.body_html,
          published: true
        }
      });
      createdCollections[col.handle] = res.custom_collection.id;
      console.log(`\x1b[32m✔ Created ${col.title} (ID: ${res.custom_collection.id})\x1b[0m`);
    } catch (err) {
      if (err.statusCode === 422) {
        console.log(`Collection ${col.title} may already exist, fetching existing...`);
        const existing = await apiRequest('GET', `/custom_collections.json?handle=${col.handle}`);
        if (existing.custom_collections && existing.custom_collections.length > 0) {
          createdCollections[col.handle] = existing.custom_collections[0].id;
          console.log(`✔ Found existing ${col.title} (ID: ${existing.custom_collections[0].id})`);
        }
      } else {
        console.error(`Failed to create ${col.title}:`, JSON.stringify(err));
      }
    }
  }

  // 2. Create Products
  console.log('\n--- Step 2: Creating Products with Sizes & EGP Pricing ---');
  for (const prod of PRODUCTS) {
    try {
      console.log(`Creating product: ${prod.title}...`);
      const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
      const productPayload = {
        product: {
          title: prod.title,
          body_html: `<p>${prod.description}</p><p><strong>Care Instructions:</strong> Machine wash cold, inside out. Do not tumble dry.</p>`,
          vendor: "Never Mind",
          product_type: prod.product_type,
          tags: prod.tags,
          published: true,
          variants: sizes.map(size => ({
            option1: size,
            price: prod.price,
            compare_at_price: prod.compare_at_price,
            requires_shipping: true,
            inventory_management: null // Available without strict inventory lock
          })),
          options: [
            { name: "Size", values: sizes }
          ]
        }
      };

      const res = await apiRequest('POST', '/products.json', productPayload);
      const createdProd = res.product;
      console.log(`\x1b[32m✔ Created ${createdProd.title} (ID: ${createdProd.id})\x1b[0m`);

      // Add to category collection
      const targetColId = createdCollections[prod.collectionHandle];
      if (targetColId) {
        await apiRequest('POST', '/collects.json', {
          collect: {
            collection_id: targetColId,
            product_id: createdProd.id
          }
        });
        console.log(`  Linked to ${prod.collectionHandle}`);
      }

      // If tagged bestseller, add to best-sellers collection too
      if (prod.tags.includes('bestseller') && createdCollections['best-sellers']) {
        await apiRequest('POST', '/collects.json', {
          collect: {
            collection_id: createdCollections['best-sellers'],
            product_id: createdProd.id
          }
        });
        console.log(`  Linked to best-sellers`);
      }
    } catch (err) {
      console.error(`Failed to create ${prod.title}:`, JSON.stringify(err));
    }
  }

  console.log('\n\x1b[32m====================================================\x1b[0m');
  console.log('\x1b[32mAll collections and products created successfully!\x1b[0m');
  console.log('\x1b[32mYour store is now fully stocked and ready!\x1b[0m');
  console.log('\x1b[32m====================================================\x1b[0m');
}

main().catch(err => {
  console.error('Fatal error:', err);
});
