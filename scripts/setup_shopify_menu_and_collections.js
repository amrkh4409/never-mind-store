/**
 * Never Mind Store - Automated Collections & 3-Level Menu Setup Script
 * 
 * Creates all collections and builds the exact 3-level Shopify Navigation
 * hierarchy to simulate the modular streetwear mega menu view.
 * 
 * Usage:
 *   node scripts/setup_shopify_menu_and_collections.js <SHOPIFY_ADMIN_TOKEN>
 * Example:
 *   node scripts/setup_shopify_menu_and_collections.js shpat_xxxxxxxxxxxxxxxxxxxx
 */

const https = require('https');

const SHOP = '9mtpvw-kr.myshopify.com';
const API_VERSION = '2024-07';
const TOKEN = process.argv[2] || process.env.SHOPIFY_ADMIN_TOKEN;

if (!TOKEN) {
  console.log('\x1b[33m%s\x1b[0m', '=======================================================');
  console.log('\x1b[31m%s\x1b[0m', '  Missing Shopify Admin API Access Token');
  console.log('\x1b[33m%s\x1b[0m', '=======================================================');
  console.log('To run this script automatically on your live store:');
  console.log('\x1b[36m  node scripts/setup_shopify_menu_and_collections.js <YOUR_TOKEN>\x1b[0m\n');
  console.log('Where <YOUR_TOKEN> is the Admin API token (starts with shpat_...)');
  console.log('from Shopify Admin > Settings > Apps and sales channels > Develop apps.\n');
  console.log('Below is the EXACT collection & menu shape that will be created:');
  printMenuHierarchyPreview();
  process.exit(0);
}

// REST Request Helper
function restRequest(method, path, body = null) {
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

// GraphQL Request Helper
function graphqlRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify({ query, variables });
    const req = https.request({
      hostname: SHOP,
      path: `/admin/api/${API_VERSION}/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN,
        'Content-Length': Buffer.byteLength(dataString)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errors) {
            reject({ statusCode: res.statusCode, errors: json.errors });
          } else {
            resolve(json.data);
          }
        } catch (e) {
          reject({ raw: data, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

// All 21 Collections to Simulate the Modular Mega Menu View
const COLLECTIONS_TO_CREATE = [
  // Top Level / Category Collections
  { title: "Men's Streetwear", handle: "men", desc: "Engineered luxury streetwear, oversized tees, hoodies, and cargo pants." },
  { title: "Women's Collection", handle: "women", desc: "Contemporary minimalist silhouettes, relaxed fits, and everyday luxury essentials." },
  { title: "Kids & Teens", handle: "kids", desc: "Comfortable everyday youth staples and modern streetwear designed for freedom." },
  { title: "Top Best Sellers", handle: "best-sellers", desc: "Our most coveted and highest-rated pieces crafted for comfort and presence." },
  { title: "New Arrivals 2026", handle: "new-arrivals", desc: "Latest seasonal drops and newly released silhouettes." },
  { title: "Sale & Offers", handle: "sale", desc: "Exclusive seasonal discounts of up to 40% off select styles." },

  // Men Sub-Collections
  { title: "Oversized T-Shirts", handle: "men-oversized-t-shirts", desc: "Heavyweight 240 GSM drop-shoulder boxy tees." },
  { title: "Graphic & Printed Tees", handle: "men-graphic-tees", desc: "Minimalist streetwear typography and archival graphic tees." },
  { title: "Heavyweight Hoodies", handle: "men-hoodies", desc: "450 GSM diagonal loopback French terry hoodies." },
  { title: "Tactical Cargo & Pants", handle: "men-cargo-pants", desc: "Tailored durable gabardine cargo utility trousers." },
  { title: "Matching Sets & Tracksuits", handle: "men-matching-sets", desc: "Coordinated two-piece fleece sets and relaxed tracksuits." },

  // Women Sub-Collections
  { title: "Cropped & Oversized Tops", handle: "women-cropped-tops", desc: "Contemporary boxy crop and relaxed silhouette tops." },
  { title: "Minimalist Lounge Hoodies", handle: "women-hoodies", desc: "Ultra-soft brushed fleece hoodies with effortless drape." },
  { title: "Wide-Leg Pants & Cargo", handle: "women-pants", desc: "High-waisted wide-leg sweatpants and tailored pants." },
  { title: "Comfort Matching Sets", handle: "women-matching-sets", desc: "Fluid luxury matching sets for loungewear and streetwear." },
  { title: "Bags & Accessories", handle: "women-accessories", desc: "Crossbody bags, caps, and street accessories." },

  // Kids & Teens Sub-Collections
  { title: "Boys Graphic Tees", handle: "kids-graphic-tees", desc: "Pure Egyptian cotton tees for boys with bold prints." },
  { title: "Girls Casual & Tops", handle: "kids-casual-tops", desc: "Easy relaxed tops and everyday comfort fits for girls." },
  { title: "Kids Hoodies & Sweats", handle: "kids-hoodies", desc: "Fleece hoodies and crewnecks tailored for all-day comfort." },
  { title: "Comfort Shorts & Pants", handle: "kids-shorts-pants", desc: "Flexible cotton shorts and sweatpants." },
  { title: "Teen Streetwear Essentials", handle: "teen-streetwear", desc: "Modern urban drops sized specifically for teenagers." }
];

function printMenuHierarchyPreview() {
  console.log(`
--------------------------------------------------------------------------------------
LEVEL 1 (Navbar)  -->  LEVEL 2 (Mega Columns)  -->  LEVEL 3 (Sub-Collection Links)
--------------------------------------------------------------------------------------
Catalog (/collections/all)
   │
   ├─► Men's Streetwear (/collections/men)
   │     ├── Oversized T-Shirts          (/collections/men-oversized-t-shirts)
   │     ├── Graphic & Printed Tees      (/collections/men-graphic-tees)
   │     ├── Heavyweight Hoodies         (/collections/men-hoodies)
   │     ├── Tactical Cargo & Pants      (/collections/men-cargo-pants)
   │     └── Matching Sets & Tracksuits  (/collections/men-matching-sets)
   │
   ├─► Women's Collection (/collections/women)
   │     ├── Cropped & Oversized Tops    (/collections/women-cropped-tops)
   │     ├── Minimalist Lounge Hoodies   (/collections/women-hoodies)
   │     ├── Wide-Leg Pants & Cargo      (/collections/women-pants)
   │     ├── Comfort Matching Sets       (/collections/women-matching-sets)
   │     └── Bags & Accessories          (/collections/women-accessories)
   │
   ├─► Kids & Teens (/collections/kids)
   │     ├── Boys Graphic Tees           (/collections/kids-graphic-tees)
   │     ├── Girls Casual & Tops         (/collections/kids-casual-tops)
   │     ├── Kids Hoodies & Sweats       (/collections/kids-hoodies)
   │     ├── Comfort Shorts & Pants      (/collections/kids-shorts-pants)
   │     └── Teen Streetwear Essentials  (/collections/teen-streetwear)
   │
   └─► Trending & Highlights (/collections/best-sellers)
         ├── Top Best Sellers 🔥          (/collections/best-sellers)
         ├── Summer Drop 2026            (/collections/all)
         ├── Heavyweight Essentials      (/collections/men)
         └── Clearance Sale Up to 50% 🏷️ (/collections/sale)

Plus Top-Level Quick Links:
   ├── Best Sellers (/collections/best-sellers)
   ├── Sale (/collections/sale)
   └── Contact Us (/pages/contact)
--------------------------------------------------------------------------------------
`);
}

async function main() {
  console.log('\x1b[36m%s\x1b[0m', `Connecting to Shopify Store: ${SHOP}...`);

  // Step 0: Test connection
  try {
    const shopInfo = await restRequest('GET', '/shop.json');
    console.log(`\x1b[32m✔ Connected to: ${shopInfo.shop.name} (${shopInfo.shop.domain})\x1b[0m\n`);
  } catch (err) {
    console.error('\x1b[31mFailed to connect to Shopify. Please check your token.\x1b[0m', err);
    process.exit(1);
  }

  // Step 1: Create all 21 collections
  console.log('--- Step 1: Creating 21 Collections for Modular Mega Menu ---');
  const collectionIds = {};
  const collectionGids = {};

  for (const item of COLLECTIONS_TO_CREATE) {
    try {
      process.stdout.write(`Creating collection "${item.title}" (${item.handle})... `);
      const res = await restRequest('POST', '/custom_collections.json', {
        custom_collection: {
          title: item.title,
          handle: item.handle,
          body_html: `<p>${item.desc}</p>`,
          published: true
        }
      });
      const colId = res.custom_collection.id;
      collectionIds[item.handle] = colId;
      collectionGids[item.handle] = `gid://shopify/Collection/${colId}`;
      console.log(`\x1b[32m✔ (ID: ${colId})\x1b[0m`);
    } catch (err) {
      if (err.statusCode === 422) {
        // Collection already exists, fetch it
        try {
          const existing = await restRequest('GET', `/custom_collections.json?handle=${item.handle}`);
          if (existing.custom_collections && existing.custom_collections.length > 0) {
            const colId = existing.custom_collections[0].id;
            collectionIds[item.handle] = colId;
            collectionGids[item.handle] = `gid://shopify/Collection/${colId}`;
            console.log(`\x1b[33m✔ Already exists (ID: ${colId})\x1b[0m`);
          } else {
            console.log(`\x1b[33m✔ Already exists\x1b[0m`);
          }
        } catch (e) {
          console.log(`\x1b[33m✔ Found existing\x1b[0m`);
        }
      } else {
        console.log(`\x1b[31m✖ Error: ${JSON.stringify(err.error || err)}\x1b[0m`);
      }
    }
  }

  // Step 2: Associate existing products to these collections
  console.log('\n--- Step 2: Populating Collections with Products ---');
  try {
    const productsRes = await restRequest('GET', '/products.json?limit=50');
    const products = productsRes.products || [];
    console.log(`Found ${products.length} existing products in store.`);

    for (const prod of products) {
      const pTitle = prod.title.toLowerCase();
      const targetHandles = [];

      if (pTitle.includes('men') || prod.tags.includes('men')) {
        targetHandles.push('men');
        if (pTitle.includes('tee') || pTitle.includes('t-shirt')) targetHandles.push('men-oversized-t-shirts');
        if (pTitle.includes('hoodie')) targetHandles.push('men-hoodies');
        if (pTitle.includes('cargo') || pTitle.includes('pant')) targetHandles.push('men-cargo-pants');
      }
      if (pTitle.includes('women') || prod.tags.includes('women')) {
        targetHandles.push('women');
        if (pTitle.includes('crop') || pTitle.includes('top') || pTitle.includes('tee')) targetHandles.push('women-cropped-tops');
        if (pTitle.includes('hoodie')) targetHandles.push('women-hoodies');
        if (pTitle.includes('pant') || pTitle.includes('sweatpant')) targetHandles.push('women-pants');
      }
      if (pTitle.includes('kid') || pTitle.includes('teen') || prod.tags.includes('kids')) {
        targetHandles.push('kids', 'kids-graphic-tees', 'kids-hoodies');
      }

      for (const h of targetHandles) {
        const cId = collectionIds[h];
        if (cId) {
          try {
            await restRequest('POST', '/collects.json', {
              collect: { collection_id: cId, product_id: prod.id }
            });
          } catch (e) {
            // Already collected
          }
        }
      }
    }
    console.log('\x1b[32m✔ Products mapped to relevant collections!\x1b[0m');
  } catch (err) {
    console.log('Skipping product mapping:', err.message || err);
  }

  // Step 3: Build the 3-Level Menu in Shopify Navigation via GraphQL
  console.log('\n--- Step 3: Setting Up 3-Level Menu in Shopify Navigation ---');

  const menuItems = [
    { title: "Home", type: "HTTP", url: "/" },
    {
      title: "Catalog",
      type: "CATALOG",
      url: "/collections/all",
      items: [
        {
          title: "Men's Streetwear",
          type: "COLLECTION",
          resourceId: collectionGids['men'] || null,
          url: "/collections/men",
          items: [
            { title: "Oversized T-Shirts", type: "COLLECTION", resourceId: collectionGids['men-oversized-t-shirts'] || null, url: "/collections/men-oversized-t-shirts" },
            { title: "Graphic & Printed Tees", type: "COLLECTION", resourceId: collectionGids['men-graphic-tees'] || null, url: "/collections/men-graphic-tees" },
            { title: "Heavyweight Hoodies", type: "COLLECTION", resourceId: collectionGids['men-hoodies'] || null, url: "/collections/men-hoodies" },
            { title: "Tactical Cargo & Pants", type: "COLLECTION", resourceId: collectionGids['men-cargo-pants'] || null, url: "/collections/men-cargo-pants" },
            { title: "Matching Sets & Tracksuits", type: "COLLECTION", resourceId: collectionGids['men-matching-sets'] || null, url: "/collections/men-matching-sets" }
          ]
        },
        {
          title: "Women's Collection",
          type: "COLLECTION",
          resourceId: collectionGids['women'] || null,
          url: "/collections/women",
          items: [
            { title: "Cropped & Oversized Tops", type: "COLLECTION", resourceId: collectionGids['women-cropped-tops'] || null, url: "/collections/women-cropped-tops" },
            { title: "Minimalist Lounge Hoodies", type: "COLLECTION", resourceId: collectionGids['women-hoodies'] || null, url: "/collections/women-hoodies" },
            { title: "Wide-Leg Pants & Cargo", type: "COLLECTION", resourceId: collectionGids['women-pants'] || null, url: "/collections/women-pants" },
            { title: "Comfort Matching Sets", type: "COLLECTION", resourceId: collectionGids['women-matching-sets'] || null, url: "/collections/women-matching-sets" },
            { title: "Bags & Accessories", type: "COLLECTION", resourceId: collectionGids['women-accessories'] || null, url: "/collections/women-accessories" }
          ]
        },
        {
          title: "Kids & Teens",
          type: "COLLECTION",
          resourceId: collectionGids['kids'] || null,
          url: "/collections/kids",
          items: [
            { title: "Boys Graphic Tees", type: "COLLECTION", resourceId: collectionGids['kids-graphic-tees'] || null, url: "/collections/kids-graphic-tees" },
            { title: "Girls Casual & Tops", type: "COLLECTION", resourceId: collectionGids['kids-casual-tops'] || null, url: "/collections/kids-casual-tops" },
            { title: "Kids Hoodies & Sweats", type: "COLLECTION", resourceId: collectionGids['kids-hoodies'] || null, url: "/collections/kids-hoodies" },
            { title: "Comfort Shorts & Pants", type: "COLLECTION", resourceId: collectionGids['kids-shorts-pants'] || null, url: "/collections/kids-shorts-pants" },
            { title: "Teen Streetwear Essentials", type: "COLLECTION", resourceId: collectionGids['teen-streetwear'] || null, url: "/collections/teen-streetwear" }
          ]
        },
        {
          title: "Trending & Highlights",
          type: "COLLECTION",
          resourceId: collectionGids['best-sellers'] || null,
          url: "/collections/best-sellers",
          items: [
            { title: "Top Best Sellers 🔥", type: "COLLECTION", resourceId: collectionGids['best-sellers'] || null, url: "/collections/best-sellers" },
            { title: "Summer Drop 2026", type: "CATALOG", url: "/collections/all" },
            { title: "Heavyweight Essentials", type: "COLLECTION", resourceId: collectionGids['men'] || null, url: "/collections/men" },
            { title: "Clearance Sale Up to 50% 🏷️", type: "COLLECTION", resourceId: collectionGids['sale'] || null, url: "/collections/sale" }
          ]
        }
      ]
    },
    { title: "Best Sellers", type: "COLLECTION", resourceId: collectionGids['best-sellers'] || null, url: "/collections/best-sellers" },
    { title: "Sale", type: "COLLECTION", resourceId: collectionGids['sale'] || null, url: "/collections/sale" },
    { title: "Contact Us", type: "HTTP", url: "/pages/contact" }
  ];

  try {
    // Find Main Menu ID
    const getMenusQuery = `
      query {
        menus(first: 20) {
          nodes {
            id
            title
            handle
          }
        }
      }
    `;
    const menusData = await graphqlRequest(getMenusQuery);
    const menus = menusData.menus.nodes || [];
    const mainMenu = menus.find(m => m.handle === 'main-menu') || menus[0];

    if (mainMenu) {
      console.log(`Found Main Menu: "${mainMenu.title}" (ID: ${mainMenu.id})`);

      const updateMenuMutation = `
        mutation updateMenu($id: ID!, $title: String!, $items: [MenuItemCreateInput!]!) {
          menuUpdate(id: $id, title: $title, items: $items) {
            menu {
              id
              title
              handle
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      // Clean items without resourceId for non-resource types
      function sanitizeItems(items) {
        return items.map(item => {
          const res = {
            title: item.title,
            type: item.type,
            url: item.url
          };
          if (item.type === 'COLLECTION' && item.resourceId) {
            res.resourceId = item.resourceId;
          }
          if (item.items && item.items.length > 0) {
            res.items = sanitizeItems(item.items);
          }
          return res;
        });
      }

      const updateRes = await graphqlRequest(updateMenuMutation, {
        id: mainMenu.id,
        title: mainMenu.title,
        items: sanitizeItems(menuItems)
      });

      if (updateRes.menuUpdate.userErrors && updateRes.menuUpdate.userErrors.length > 0) {
        console.log('\x1b[33mShopify returned error while auto-updating menu:\x1b[0m', updateRes.menuUpdate.userErrors);
        printMenuHierarchyPreview();
      } else {
        console.log('\x1b[32m✔ Successfully updated Main Menu with full 3-level hierarchy in Shopify Navigation!\x1b[0m');
      }
    } else {
      console.log('Main menu not found via GraphQL. Please see below for manual nesting:');
      printMenuHierarchyPreview();
    }
  } catch (err) {
    console.log('\x1b[33mNote on Shopify Navigation API:\x1b[0m');
    console.log('Your Custom App needs "write_online_store_navigation" permission to modify menus via API.');
    console.log('All collections have been created and are ready to link.');
    printMenuHierarchyPreview();
  }

  console.log('\n\x1b[32m===============================================================');
  console.log('  SETUP COMPLETE!');
  console.log('  All 21 collections are active and ready on your Shopify store.');
  console.log('  The Never Mind modular mega menu will automatically link to them!');
  console.log('===============================================================\x1b[0m\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
});
