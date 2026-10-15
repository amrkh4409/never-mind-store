/**
 * Never Mind Store - Publish Bilingual Policies & Contact Pages
 * 
 * Creates or updates the 6 required policy pages on Shopify:
 * 1. Return and Refund Policy (/pages/refund-policy)
 * 2. Shipping Policy (/pages/shipping-policy)
 * 3. Privacy Policy (/pages/privacy-policy)
 * 4. Terms of Service (/pages/terms-of-service)
 * 5. Contact Information (/pages/contact)
 * 6. Legal Notice (/pages/legal-notice)
 * 
 * Also updates navigation menus to link directly to these pages.
 */

const https = require('https');

const fs = require('fs');

const envPath = require('path').resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v && !process.env[k.trim()]) process.env[k.trim()] = v.trim();
  });
}

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN || '9mtpvw-kr.myshopify.com';
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

function postRequest(hostname, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function putRequest(hostname, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);
    const req = https.request({
      hostname,
      path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function getRequest(hostname, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path,
      method: 'GET',
      headers
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Styling wrapper for bilingual presentation
function wrapBilingual(enTitle, enHtml, arTitle, arHtml) {
  return `
<div class="policy-container" style="max-width: 860px; margin: 0 auto; padding: 24px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.7; color: #111827;">

  <!-- Language Switch / Badge -->
  <div style="display: flex; gap: 10px; margin-bottom: 28px; border-bottom: 1px solid #E5E7EB; padding-bottom: 14px;">
    <span style="display: inline-flex; align-items: center; padding: 4px 12px; background: #F3F4F6; border-radius: 9999px; font-size: 0.85rem; font-weight: 600;">🌐 English &amp; العربية</span>
    <span style="display: inline-flex; align-items: center; padding: 4px 12px; background: #ECFDF5; color: #065F46; border-radius: 9999px; font-size: 0.85rem; font-weight: 600;">🇪🇬 Egypt &bull; EGP</span>
  </div>

  <!-- English Section -->
  <section class="policy-lang policy-en" dir="ltr" style="text-align: left; margin-bottom: 48px;">
    <h1 style="font-size: 1.85rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 24px; color: #111827; text-transform: uppercase;">${enTitle}</h1>
    <div class="policy-body" style="font-size: 0.96rem; color: #374151;">
      ${enHtml}
    </div>
  </section>

  <hr style="border: 0; border-top: 2px dashed #D1D5DB; margin: 40px 0;" />

  <!-- Arabic Section -->
  <section class="policy-lang policy-ar" dir="rtl" style="text-align: right; margin-bottom: 40px;">
    <h2 style="font-size: 1.85rem; font-weight: 800; margin-bottom: 24px; color: #111827;">${arTitle}</h2>
    <div class="policy-body" style="font-size: 1rem; color: #374151; line-height: 1.9;">
      ${arHtml}
    </div>
  </section>

</div>
  `.trim();
}

async function main() {
  console.log('--- Connecting to Shopify Admin ---');

  // 1. Get access token
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
  console.log('Authorized with token successfully.\n');

  const headers = { 'X-Shopify-Access-Token': token };

  // 2. Fetch existing pages
  const pagesListRes = await getRequest(SHOP, '/admin/api/2024-07/pages.json', headers);
  const existingPages = pagesListRes.data?.pages || [];
  console.log('Found', existingPages.length, 'existing pages on Shopify.');

  // Policy Contents Definitions
  const policies = [
    // 1. Return & Refund Policy
    {
      title: 'Return and Refund Policy',
      handle: 'refund-policy',
      enTitle: 'Return & Refund Policy',
      arTitle: 'سياسة الاسترجاع والاستبدال',
      enHtml: `
        <p><strong>Effective Date:</strong> October 2026<br/><strong>Brand:</strong> NEVER MIND (&lrm;nevermindeg.com&lrm;)</p>
        
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">1. 14-Day Return &amp; Exchange Window</h3>
        <p>In accordance with Egyptian Consumer Protection Law (Law No. 181 of 2018), <strong>NEVER MIND</strong> offers a <strong>14-day return and exchange window</strong> from the date of package receipt.</p>
        
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">2. Parcel Inspection Upon Delivery</h3>
        <ul>
          <li><strong>Inspect &amp; Try:</strong> Customers are entitled to open the parcel and inspect/try on the items in the presence of the courier before completing payment.</li>
          <li><strong>Defective or Incorrect Item:</strong> If you receive an item with a manufacturing defect, or an incorrect size or color, you may refuse the shipment on the spot. You will pay <strong>0 EGP</strong> in shipping fees, and we will dispatch a replacement free of charge.</li>
          <li><strong>Change of Mind at Delivery:</strong> If you choose not to accept the order for personal reasons without any defect in the product, you only pay the standard courier delivery fee of <strong>60 EGP</strong>.</li>
        </ul>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">3. Eligibility Conditions After Delivery</h3>
        <p>To qualify for a return or exchange after accepting the shipment:</p>
        <ul>
          <li>The product must be in its original condition, unworn, unwashed, and with all original tags attached.</li>
          <li>Footwear must be tested indoors only and returned in the original branded shoe box.</li>
          <li><strong>Hygiene Exclusion:</strong> For personal hygiene and safety, <strong>underwear (men's and women's) is strictly non-returnable and non-exchangeable</strong>. T-shirts, hoodies, pants, denim, jackets, and footwear are fully eligible.</li>
        </ul>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">4. Exchange Fees &amp; Process</h3>
        <ul>
          <li><strong>Size or Color Exchange:</strong> Contact our support team via WhatsApp or email with your order number and photos of the item. An exchange courier order will be arranged with an exchange delivery fee of <strong>60 EGP</strong>.</li>
          <li><strong>Defective Item Exchange:</strong> If a defect is confirmed, NEVER MIND covers 100% of the replacement shipping costs (<strong>0 EGP</strong>).</li>
        </ul>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">5. Refund Procedures for Cash on Delivery (COD)</h3>
        <p>Because orders are settled in cash upon delivery, refunds are disbursed via electronic payout methods:</p>
        <ul>
          <li><strong>Payout Methods:</strong> <strong>InstaPay</strong>, <strong>Vodafone Cash / Mobile Wallets</strong>, or <strong>NEVER MIND Store Credit</strong>.</li>
          <li><strong>Change-of-Mind Return Deduction:</strong> If returning an accepted order for personal reasons, a logistics deduction of <strong>100 EGP</strong> is applied to cover courier round-trip fees, and the remaining balance is refunded within 3 to 5 business days after inspection at our warehouse.</li>
          <li><strong>Confirmed Defect Returns:</strong> <strong>100% full refund</strong> with zero deductions.</li>
        </ul>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">6. How to Request a Return or Exchange</h3>
        <p>Reach out to our customer care team with your order details:</p>
        <p>
          &bull; <strong>WhatsApp Support:</strong> <a href="https://wa.me/201080214330" style="color: #111827; font-weight: 600;">+20 108 021 4330</a><br/>
          &bull; <strong>Email:</strong> <a href="mailto:nevermind.official.eg@gmail.com" style="color: #111827; font-weight: 600;">nevermind.official.eg@gmail.com</a><br/>
          &bull; <strong>Working Hours:</strong> Daily from 10:00 AM &ndash; 10:00 PM (Cairo Time).
        </p>
      `,
      arHtml: `
        <p><strong>تاريخ السريان:</strong> أكتوبر 2026<br/><strong>العلامة التجارية:</strong> NEVER MIND (&lrm;nevermindeg.com&lrm;)</p>
        
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">1. مهلة الـ 14 يوماً للاستبدال والاسترجاع</h3>
        <p>وفقاً لأحكام قانون حماية المستهلك المصري (قانون رقم 181 لسنة 2018)، يتيح متجر <strong>NEVER MIND</strong> لعملائه الكرام <strong>مهلة 14 يوماً للاستبدال أو الاسترجاع</strong> تبدأ من تاريخ استلام الشحنة.</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">2. حق معاينة الشحنة عند الاستلام</h3>
        <ul>
          <li><strong>المعاينة وقياس القطعة:</strong> يحق للعميل فتح الشحنة ومعاينة المنتجات وقياسها بحضور مندوب التوصيل قبل دفع الحساب.</li>
          <li><strong>استلام منتج به عيب صناعة أو مخالف:</strong> في حال وصلك منتج به عيب صناعة أو مقاس/لون مخالف لما تم تأكيده، يمكنك رفض الاستلام فوراً دون سداد أي مصاريف شحن (<strong>0 جنيه</strong>)، وسيتم تسجيل أوردر استبدال مطابق دون أي تكلفة إضافية.</li>
          <li><strong>رفض الاستلام لأسباب شخصية:</strong> إذا رغب العميل في عدم استلام الأوردر لأسباب شخصية دون وجود أي عيب في المنتج، يتم سداد مصاريف الشحن للمندوب بقيمة <strong>60 جنيهاً فقط</strong>.</li>
        </ul>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">3. شروط قبول الاستبدال والاسترجاع بعد الاستلام</h3>
        <p>لقبول طلب الاستبدال أو الاسترجاع بعد مغادرة المندوب:</p>
        <ul>
          <li>أن يكون المنتج بحالته الأصلية تماماً، غير مستخدم وغير مغسول، مع الاحتفاظ بجميع البطاقات (التكت) والغلاف الأصلي.</li>
          <li>يجب تجربة الأحذية في الداخل فقط وإعادتها داخل علبتها الأصلية دون تلف.</li>
          <li><strong>استثناء لأسباب وقائية وصحية:</strong> حفاظاً على الصحة العامة، <strong>الملابس الداخلية (الرجالية والنسائية) غير قابلة للاستبدال أو الاسترجاع نهائياً</strong>. بينما متاح استبدال واسترجاع التيشرتات، الهوديز، البناطيل، الجينز، الجواكت، والأحذية.</li>
        </ul>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">4. رسوم وإجراءات الاستبدال</h3>
        <ul>
          <li><strong>استبدال المقاس أو اللون:</strong> يتم التواصل مع خدمة العملاء عبر الواتساب أو البريد الإلكتروني مع إرسال رقم الطلب وصورة للمنتج، وتسجيل أوردر استبدال مع سداد مصاريف شحن بقيمة <strong>60 جنيهاً</strong>.</li>
          <li><strong>استبدال عيوب الصناعة:</strong> تتحمل NEVER MIND مصاريف شحن الاستبدال بالكامل (<strong>0 جنيه مجاناً</strong>).</li>
        </ul>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">5. إجراءات استرداد الأموال لطلبات الدفع عند الاستلام (COD)</h3>
        <p>نظراً لأن سداد الطلبات يتم نقداً عند الاستلام، يتم رد المبالغ المستحقة عبر الوسائل الإلكترونية المعتمدة:</p>
        <ul>
          <li><strong>طرق التحويل:</strong> <strong>إنستاباي (InstaPay)</strong>، <strong>المحافظ الإلكترونية (فودافون كاش وغيرها)</strong>، أو كرصيد مشتريات بمتجر NEVER MIND.</li>
          <li><strong>خصم مصاريف الإرجاع:</strong> في حال استرجاع الطلب لرغبة العميل دون وجود عيب بالمنتج، يتم خصم <strong>100 جنيه</strong> لتغطية مصاريف الشحن اللوجستي، وتحويل باقي المبلغ خلال 3 إلى 5 أيام عمل من فحص المنتج بمخزننا.</li>
          <li><strong>استرجاع عيوب الصناعة المؤكدة:</strong> استرداد <strong>كامل المبلغ بنسبة 100% دون أي خصم</strong>.</li>
        </ul>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">6. كيفية تقديم طلب الاستبدال أو الاسترجاع</h3>
        <p>يسعدنا تواصلكم عبر قنوات الدعم الرسمية:</p>
        <p>
          &bull; <strong>واتساب خدمة العملاء:</strong> <a href="https://wa.me/201080214330" style="color: #111827; font-weight: 600;">01080214330</a><br/>
          &bull; <strong>البريد الإلكتروني:</strong> <a href="mailto:nevermind.official.eg@gmail.com" style="color: #111827; font-weight: 600;">nevermind.official.eg@gmail.com</a><br/>
          &bull; <strong>ساعات العمل:</strong> يومياً من 10:00 صباحاً وحتى 10:00 مساءً (بتوقيت القاهرة).
        </p>
      `
    },

    // 2. Shipping Policy
    {
      title: 'Shipping Policy',
      handle: 'shipping-policy',
      enTitle: 'Shipping Policy',
      arTitle: 'سياسة الشحن والتوصيل',
      enHtml: `
        <p><strong>Coverage:</strong> All 27 Governorates of Egypt<br/><strong>Payment:</strong> Cash on Delivery (COD) Available</p>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">1. Shipping Rates</h3>
        <p><strong>NEVER MIND</strong> provides a transparent, flat-rate shipping model across Egypt:</p>
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 1.05rem; font-weight: 700; color: #111827;">Flat Shipping Rate: 80 EGP across all governorates of Egypt.</p>
        </div>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">2. Estimated Delivery Timeframes</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #F3F4F6; text-align: left;">
              <th style="padding: 10px; border: 1px solid #E5E7EB;">Destination Zone</th>
              <th style="padding: 10px; border: 1px solid #E5E7EB;">Estimated Delivery Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Greater Cairo &amp; Giza</strong></td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">2 to 3 business days from confirmation</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Alexandria &amp; Delta Governorates</strong></td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">3 to 4 business days</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Canal, Upper Egypt &amp; Coastal Cities</strong></td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">4 to 5 business days</td>
            </tr>
          </tbody>
        </table>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">3. Order Confirmation &amp; Dispatch Process</h3>
        <ul>
          <li>After submitting your order on <code>nevermindeg.com</code>, our verification team contacts you via WhatsApp or phone to confirm sizing, address, and delivery availability.</li>
          <li>Once confirmed, the order moves to printing and factory preparation, and is handed over to our licensed courier partner.</li>
        </ul>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">4. Package Item Limitations</h3>
        <p>To preserve parcel integrity and comply with courier handling limits, a single order may contain up to <strong>5 apparel items</strong> or <strong>3 pairs of shoes</strong>. Orders exceeding these quantities are split into coordinated shipments.</p>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">5. Tracking &amp; Delivery Inquiries</h3>
        <p>If you experience any delay or need to update your delivery address, contact our shipping desk directly on WhatsApp at <a href="https://wa.me/201080214330" style="color: #111827; font-weight: 600;">+20 108 021 4330</a>.</p>
      `,
      arHtml: `
        <p><strong>نطاق التغطية:</strong> جميع محافظات جمهورية مصر العربية (27 محافظة)<br/><strong>طريقة الدفع:</strong> الدفع عند الاستلام متاح لجميع المناطق</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">1. أسعار ومصاريف الشحن</h3>
        <p>يقدم متجر <strong>NEVER MIND</strong> نظام شحن موحد وشفاف لجميع العملاء داخل مصر:</p>
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 1.05rem; font-weight: 700; color: #111827;">سعر الشحن الموحد: 80 جنيهاً مصرياً لكافة محافظات الجمهورية.</p>
        </div>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">2. المواعيد المقدرة للتوصيل</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; text-align: right;">
          <thead>
            <tr style="background: #F3F4F6;">
              <th style="padding: 10px; border: 1px solid #E5E7EB;">منطقة التوصيل</th>
              <th style="padding: 10px; border: 1px solid #E5E7EB;">المدة المتوقعة للتوصيل</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>القاهرة الكبرى والجيزة</strong></td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">خلال 2 إلى 3 أيام عمل من وقت التأكيد</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>الإسكندرية ومحافظات الدلتا</strong></td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">خلال 3 إلى 4 أيام عمل</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>مدن القناة، الصعيد، والمحافظات الساحلية</strong></td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">خلال 4 إلى 5 أيام عمل</td>
            </tr>
          </tbody>
        </table>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">3. خطوات تأكيد الطلب وخروجه للشحن</h3>
        <ul>
          <li>بمجرد إتمام طلبك على <code>nevermindeg.com</code>، يتواصل معك فريق التأكيدات عبر الواتساب أو الاتصال لتأكيد المقاسات وتفاصيل العنوان.</li>
          <li>بعد التأكيد، ينتقل الأوردر إلى مرحلة التجهيز والطباعة ويتم تسليمه لشركة الشحن المتعاقد معها.</li>
        </ul>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">4. الحد الأقصى لعدد القطع في الشحنة</h3>
        <p>للحفاظ على سلامة الملابس والأحذية أثناء النقل، يكون الحد الأقصى للشحنة الواحدة <strong>5 قطع ملابس</strong> أو <strong>3 قطع أحذية</strong>. في حال طلب كميات أكبر، يتم توزيعها على شحنات منسقة.</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">5. تتبع الشحنات والاستفسارات</h3>
        <p>لمتابعة مسار شحنتك أو تعديل موعد الاستلام، يرجى التواصل مع قسم الشحن عبر واتساب: <a href="https://wa.me/201080214330" style="color: #111827; font-weight: 600;">01080214330</a>.</p>
      `
    },

    // 3. Privacy Policy
    {
      title: 'Privacy Policy',
      handle: 'privacy-policy',
      enTitle: 'Privacy Policy',
      arTitle: 'سياسة الخصوصية وحماية البيانات',
      enHtml: `
        <p><strong>Last Updated:</strong> October 2026<br/><strong>Domain:</strong> nevermindeg.com</p>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">1. Information We Collect</h3>
        <p>When you visit or place an order on <strong>NEVER MIND</strong>, we collect necessary customer details to fulfill your purchases:</p>
        <ul>
          <li><strong>Personal Contact Information:</strong> Full name, telephone number, mobile number, and delivery address (governorate, city, street, and landmarks).</li>
          <li><strong>Order History:</strong> Garments, sizes, colors, and order notes.</li>
          <li><strong>Technical Data:</strong> Device type, browser information, and anonymized cookies processed securely through Shopify.</li>
        </ul>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">2. How We Use Your Information</h3>
        <p>Your data is used solely to:</p>
        <ul>
          <li>Verify order parameters and schedule delivery via phone or WhatsApp.</li>
          <li>Print delivery waybills and dispatch parcels with our courier partners.</li>
          <li>Facilitate customer support, size exchanges, and return inquiries.</li>
        </ul>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">3. Data Sharing with Fulfillment Partners</h3>
        <p>We do not sell, rent, or trade your personal information. Relevant delivery data is shared strictly with:</p>
        <ul>
          <li><strong>Shopify:</strong> Our hosting e-commerce software provider.</li>
          <li><strong>Fulfillment &amp; Courier Partners (Vendoor logistics &amp; licensed domestic Egyptian couriers):</strong> For the sole purpose of parcel delivery, recipient contact, and Cash on Delivery payment collection.</li>
        </ul>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">4. Security &amp; Customer Rights</h3>
        <p>All checkout sessions use secure SSL encryption. You have the right at any time to request the inspection, correction, or deletion of your customer records by contacting <a href="mailto:nevermind.official.eg@gmail.com" style="color: #111827; font-weight: 600;">nevermind.official.eg@gmail.com</a>.</p>
      `,
      arHtml: `
        <p><strong>تاريخ التحديث:</strong> أكتوبر 2026<br/><strong>النطاق الإلكتروني:</strong> nevermindeg.com</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">1. البيانات والمعلومات التي نجمعها</h3>
        <p>عند زيارتك لمتجر <strong>NEVER MIND</strong> أو قيامك بطلب شراء، نقوم بجمع البيانات الضرورية لإتمام طلبك:</p>
        <ul>
          <li><strong>بيانات التواصل والتسليم:</strong> الاسم بالكامل، رقم الهاتف ورقم الواتساب، وعنوان التوصيل المفصل (المحافظة، المدينة، الشارع، وأقرب علامة مميزة).</li>
          <li><strong>بيانات الطلب:</strong> المنتجات المختارة، المقاسات، الألوان، والملاحظات الإضافية.</li>
          <li><strong>البيانات التقنية:</strong> نوع المتصفح والجهاز وملفات الكوكيز المشفرة من خلال منصة شوبيفاي.</li>
        </ul>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">2. كيفية استخدام بياناتك</h3>
        <p>تُستخدم بياناتكم حصراً للأغراض المشروعة التالية:</p>
        <ul>
          <li>التواصل معكم لتأكيد تفاصيل الطلب وتنسيق موعد التسليم عبر الهاتف أو الواتساب.</li>
          <li>طباعة بوالص الشحن وتسليم المنتجات لشركات التوصيل المعتمدة.</li>
          <li>متابعة خدمات ما بعد البيع واستبدال المقاسات واسترجاع المنتجات.</li>
        </ul>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">3. مشاركة البيانات مع شركاء الشحن</h3>
        <p>نحن لا نبيع ولا نؤجر بياناتكم لأي أطراف ثالثة. تتم مشاركة البيانات اللازمة للشحن فقط مع:</p>
        <ul>
          <li><strong>منصة شوبيفاي (Shopify):</strong> مزود البنية التحتية والاستضافة لمتجرنا.</li>
          <li><strong>شركاء الشحن والتنفيذ (منظومة فيندور وشركات الشحن المصرية المعتمدة):</strong> لغرض توصيل الشحنة والاتصال بالعميل وتحصيل قيمة الأوردر.</li>
        </ul>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">4. الأمان وحقوق العميل</h3>
        <p>يتم حماية كافة جلسات التصفح بتشفير SSL عالي الأمان. يحق للعميل طلب تعديل أو حذف بيانات الاتصال الخاصة به في أي وقت بمراسلتنا على: <a href="mailto:nevermind.official.eg@gmail.com" style="color: #111827; font-weight: 600;">nevermind.official.eg@gmail.com</a>.</p>
      `
    },

    // 4. Terms of Service
    {
      title: 'Terms of Service',
      handle: 'terms-of-service',
      enTitle: 'Terms of Service',
      arTitle: 'شروط وأحكام الخدمة',
      enHtml: `
        <p><strong>Brand:</strong> NEVER MIND Egypt<br/><strong>Governing Law:</strong> Arab Republic of Egypt</p>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">1. General Agreement</h3>
        <p>By browsing, accessing, or purchasing from <strong>NEVER MIND</strong> (<code>nevermindeg.com</code>), you agree to be bound by these Terms of Service, our Return &amp; Refund Policy, and our Shipping Policy.</p>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">2. Pricing, Products &amp; Sizing</h3>
        <ul>
          <li>All prices on the website are displayed in Egyptian Pounds (EGP).</li>
          <li>We take every measure to accurately present fabric weights, garment measurements, and color tones. Slight visual differences may arise from device display settings.</li>
          <li>In the event of an inadvertent typographical error in product pricing or inventory, NEVER MIND reserves the right to notify the customer and adjust or cancel the affected order.</li>
        </ul>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">3. Cash on Delivery (COD) Commitment</h3>
        <p>Placing and confirming an order with Cash on Delivery constitutes a good-faith commercial commitment to receive the order at your designated address upon courier arrival. You retain your full right of inspection before payment.</p>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">4. Intellectual Property</h3>
        <p>All brand logos, graphics, garment artwork, photographic materials, and textual content are the exclusive intellectual property of <strong>NEVER MIND</strong> and may not be reproduced without prior written permission.</p>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">5. Applicable Law &amp; Dispute Resolution</h3>
        <p>These terms and all transactions are governed by the laws and regulations of the Arab Republic of Egypt, under the jurisdiction of the Egyptian Consumer Protection Agency (CPA).</p>
      `,
      arHtml: `
        <p><strong>العلامة التجارية:</strong> NEVER MIND مصر<br/><strong>القانون الحاكم:</strong> جمهورية مصر العربية</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">1. الاتفاقية العامة</h3>
        <p>باستخدامك أو شرائك من متجر <strong>NEVER MIND</strong> (<code>nevermindeg.com</code>)، فإنك توافق على الالتزام بشروط الخدمة هذه، وسياسة الاسترجاع والاستبدال، وسياسة الشحن والتوصيل.</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">2. الأسعار، المنتجات، والمقاسات</h3>
        <ul>
          <li>كافة الأسعار المعروضة على الموقع هي بالجنيه المصري (EGP).</li>
          <li>نلتزم بأعلى درجات الدقة في عرض خامات الملابس والمقاسات والألوان. قد تختلف درجات الألوان بشكل طفيف باختلاف إعدادات شاشات الأجهزة.</li>
          <li>في حال حدوث خطأ كتابي غير مقصود في تسعير منتج أو توافر المقاس، يحتفظ المتجر بحق مراجعة الطلب مع العميل أو إلغائه بعد إبلاغه.</li>
        </ul>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">3. التزامات الدفع عند الاستلام (COD)</h3>
        <p>يعد تأكيد الطلب بنظام الدفع عند الاستلام التزاماً تجارياً متبادلاً باستلام الشحنة في العنوان المحدد عند وصول المندوب، مع تمتعك بكامل حق المعاينة قبل السداد.</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">4. حقوق الملكية الفكرية</h3>
        <p>كافة الشعارات، التصاميم، الصور، والنصوص المعروضة على هذا الموقع هي ملك حصري لعلامة <strong>NEVER MIND</strong> ومحمية بموجب قوانين الملكية الفكرية المعمول بها في جمهورية مصر العربية.</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">5. القانون الحاكم والنزاعات</h3>
        <p>تخضع شروط الخدمة وكافة المعاملات لقوانين جمهورية مصر العربية، وتختص جهات التحكيم وحماية المستهلك المصرية بالنظر في أي نزاع ينشأ عنها.</p>
      `
    },

    // 5. Contact Information
    {
      title: 'Contact Information',
      handle: 'contact',
      enTitle: 'Contact Information & Customer Support',
      arTitle: 'معلومات الاتصال وخدمة العملاء',
      enHtml: `
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #111827;">NEVER MIND Official Support</h3>
          <p style="margin-bottom: 10px;"><strong>Official Store Name:</strong> NEVER MIND</p>
          <p style="margin-bottom: 10px;"><strong>Official Website:</strong> <a href="https://nevermindeg.com" style="color: #111827; font-weight: 600;">https://nevermindeg.com</a></p>
          <p style="margin-bottom: 10px;"><strong>Customer Support Email:</strong> <a href="mailto:nevermind.official.eg@gmail.com" style="color: #111827; font-weight: 600;">nevermind.official.eg@gmail.com</a></p>
          <p style="margin-bottom: 10px;"><strong>WhatsApp &amp; Phone:</strong> <a href="https://wa.me/201080214330" style="color: #111827; font-weight: 600;">+20 108 021 4330</a></p>
          <p style="margin-bottom: 10px;"><strong>Operating Support Hours:</strong> Daily from 10:00 AM &ndash; 10:00 PM (Cairo Time)</p>
          <p style="margin-bottom: 0;"><strong>Dispatch &amp; Operations Office:</strong> Damietta El-Gadeeda City, Kafr Saad, Damietta Governorate, Egypt</p>
        </div>

        <p>For instant assistance regarding order confirmation, size guides, tracking, or exchanges, connect directly with our WhatsApp team:</p>
        <p><a href="https://wa.me/201080214330" style="display: inline-block; padding: 12px 24px; background: #111827; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600;">💬 Chat on WhatsApp (+201080214330)</a></p>
      `,
      arHtml: `
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #111827;">فريق خدمة عملاء NEVER MIND</h3>
          <p style="margin-bottom: 10px;"><strong>اسم المتجر الرسمي:</strong> NEVER MIND</p>
          <p style="margin-bottom: 10px;"><strong>الموقع الرسمي:</strong> <a href="https://nevermindeg.com" style="color: #111827; font-weight: 600;">https://nevermindeg.com</a></p>
          <p style="margin-bottom: 10px;"><strong>البريد الإلكتروني للدعم:</strong> <a href="mailto:nevermind.official.eg@gmail.com" style="color: #111827; font-weight: 600;">nevermind.official.eg@gmail.com</a></p>
          <p style="margin-bottom: 10px;"><strong>رقم الهاتف والواتساب:</strong> <a href="https://wa.me/201080214330" style="color: #111827; font-weight: 600;">01080214330</a></p>
          <p style="margin-bottom: 10px;"><strong>مواعيد العمل وخدمة العملاء:</strong> يومياً من 10:00 صباحاً حتى 10:00 مساءً (بتوقيت القاهرة)</p>
          <p style="margin-bottom: 0;"><strong>المقر الإداري ونقطة الشحن:</strong> مدينة دمياط الجديدة، كفر سعد، محافظة دمياط، مصر</p>
        </div>

        <p>للحصول على مساعدة سريعة بخصوص تأكيد الطلبات، دليل المقاسات، أو متابعة الشحنات والاستبدال، تواصل معنا مباشرة عبر واتساب:</p>
        <p><a href="https://wa.me/201080214330" style="display: inline-block; padding: 12px 24px; background: #111827; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600;">💬 تواصل معنا عبر واتساب (01080214330)</a></p>
      `
    },

    // 6. Legal Notice
    {
      title: 'Legal Notice',
      handle: 'legal-notice',
      enTitle: 'Legal Notice & Commercial Disclosures',
      arTitle: 'الإشعار القانوني والبيانات التجارية',
      enHtml: `
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">1. Commercial Brand Identification</h3>
        <p><strong>NEVER MIND</strong> is an Egyptian apparel and streetwear brand operating in e-commerce through the registered online domain <code>nevermindeg.com</code>.</p>
        
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">2. Fulfillment &amp; Operational Partnerships</h3>
        <p>Orders placed on this website are manufactured and dispatched through licensed Egyptian textile facilities and logistics hubs under domestic e-commerce regulations.</p>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">3. Regulatory Compliance</h3>
        <p>All business practices, warranty policies, and consumer interactions strictly adhere to Egyptian Consumer Protection Law No. 181 of 2018.</p>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 24px;">4. Legal Contact</h3>
        <p>For legal inquiries, regulatory questions, or formal notices, contact us at: <a href="mailto:nevermind.official.eg@gmail.com" style="color: #111827; font-weight: 600;">nevermind.official.eg@gmail.com</a>.</p>
      `,
      arHtml: `
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">1. الهوية التجارية للعلامة</h3>
        <p>متجر <strong>NEVER MIND</strong> هو علامة تجارية مصرية متخصصة في أزياء الستريت وير والملابس العصرية، تعمل في مجال التجارة الإلكترونية عبر النطاق المعتمد <code>nevermindeg.com</code>.</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">2. الشراكات التشغيلية والتنفيذ</h3>
        <p>يتم تجهيز وشحن الطلبات المنفذة عبر الموقع بالتعاون مع مصانع ملابس ومراكز توزيع لوجستية مرخصة داخل جمهورية مصر العربية وفقاً للمعايير التجارية المعمول بها.</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">3. الامتثال لقانون حماية المستهلك</h3>
        <p>تخضع كافة المعاملات والسياسات لحماية المستهلك وأحكام القانون رقم 181 لسنة 2018 ولائحته التنفيذية المنظمة للتجارة عن بُعد في مصر.</p>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-top: 24px;">4. التواصل القانوني</h3>
        <p>لأي استفسارات قانونية أو مراسلات رسمية، يرجى التواصل عبر البريد الإلكتروني: <a href="mailto:nevermind.official.eg@gmail.com" style="color: #111827; font-weight: 600;">nevermind.official.eg@gmail.com</a>.</p>
      `
    }
  ];

  // 3. Upsert Pages
  for (const p of policies) {
    const existing = existingPages.find(ep => ep.handle === p.handle);
    const bodyHtml = wrapBilingual(p.enTitle, p.enHtml, p.arTitle, p.arHtml);

    if (existing) {
      console.log(`Updating existing page: ${p.title} (ID: ${existing.id}, Handle: ${p.handle})`);
      const updateRes = await putRequest(SHOP, `/admin/api/2024-07/pages/${existing.id}.json`, {
        page: {
          id: existing.id,
          title: p.title,
          body_html: bodyHtml
        }
      }, headers);
      if (updateRes.status >= 200 && updateRes.status < 300) {
        console.log(`[SUCCESS] Updated ${p.handle} -> URL: https://nevermindeg.com/pages/${p.handle}`);
      } else {
        console.error(`[ERROR] Failed to update ${p.handle}:`, updateRes);
      }
    } else {
      console.log(`Creating new page: ${p.title} (Handle: ${p.handle})`);
      const createRes = await postRequest(SHOP, '/admin/api/2024-07/pages.json', {
        page: {
          title: p.title,
          handle: p.handle,
          body_html: bodyHtml,
          published: true
        }
      }, headers);
      if (createRes.status >= 200 && createRes.status < 300) {
        console.log(`[SUCCESS] Created ${p.handle} -> URL: https://nevermindeg.com/pages/${p.handle}`);
      } else {
        console.error(`[ERROR] Failed to create ${p.handle}:`, createRes);
      }
    }
  }

  // 4. Update Navigation Menu: footer-customer-services
  console.log('\n--- Updating Footer Navigation Menu ---');
  const menusQuery = `
    query {
      menu(id: "gid://shopify/Menu/309472002084") {
        id
        title
        handle
        items {
          id
          title
          url
        }
      }
    }
  `;
  const menuFetch = await postRequest(SHOP, '/admin/api/2024-07/graphql.json', { query: menusQuery }, headers);
  console.log('Current customer service menu:', JSON.stringify(menuFetch.data, null, 2));

  // Desired items for Customer Service menu
  const desiredItems = [
    { title: 'Contact Us', url: '/pages/contact' },
    { title: 'Return & Refund Policy', url: '/pages/refund-policy' },
    { title: 'Shipping Policy', url: '/pages/shipping-policy' },
    { title: 'Privacy Policy', url: '/pages/privacy-policy' },
    { title: 'Terms of Service', url: '/pages/terms-of-service' },
    { title: 'Legal Notice', url: '/pages/legal-notice' }
  ];

  const updateMenuMutation = `
    mutation updateMenu($id: ID!, $title: String!, $items: [MenuItemUpdateInput!]!) {
      menuUpdate(id: $id, title: $title, items: $items) {
        menu {
          id
          title
          items {
            id
            title
            url
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const menuUpdateRes = await postRequest(SHOP, '/admin/api/2024-07/graphql.json', {
    query: updateMenuMutation,
    variables: {
      id: "gid://shopify/Menu/309472002084",
      title: "Footer Customer Services",
      items: desiredItems.map(item => ({
        title: item.title,
        url: item.url,
        type: "HTTP"
      }))
    }
  }, headers);

  console.log('Menu update response:', JSON.stringify(menuUpdateRes.data, null, 2));
  console.log('\n--- All Policies & Menus Synchronized Successfully! ---');
}

main().catch(console.error);
