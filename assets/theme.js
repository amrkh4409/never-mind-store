/**
 * Never Mind Store — Modern Luxury Fashion Theme
 * Client-Side JavaScript Architecture (Shopify OS 2.0)
 * Native AJAX Cart, Dynamic Variants, Predictive Search, Wishlist, Modals
 */

(function() {
  'use strict';

  // --- Global Utility & Event Helpers ---
  const formatMoney = (cents, format) => {
    if (cents == null || cents === '') return '';
    if (typeof cents === 'string') cents = cents.replace(/[^0-9.-]+/g, '');
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = format || window.NeverMindConfig?.moneyFormat || '{{ amount }} EGP';

    function defaultOption(opt, def) {
      return typeof opt === 'undefined' ? def : opt;
    }

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = defaultOption(precision, 2);
      thousands = defaultOption(thousands, ',');
      decimal = defaultOption(decimal, '.');

      if (isNaN(number) || number == null) return '0';

      number = (Number(number) / 100.0).toFixed(precision);

      const parts = number.split('.');
      const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      const centsPart = parts[1] ? decimal + parts[1] : '';

      return dollars + centsPart;
    }

    const match = formatString.match(placeholderRegex);
    const placeholder = match ? match[1] : 'amount';

    switch (placeholder) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      case 'amount_with_space_separator':
        value = formatWithDelimiters(cents, 2, ' ', ',');
        break;
      case 'amount_no_decimals_with_space_separator':
        value = formatWithDelimiters(cents, 0, ' ', ',');
        break;
      case 'amount_with_apostrophe_separator':
        value = formatWithDelimiters(cents, 2, "'", '.');
        break;
      default:
        value = formatWithDelimiters(cents, 2);
        break;
    }

    if (match) {
      return formatString.replace(placeholderRegex, value);
    }
    const currency = window.NeverMindConfig?.currency || 'EGP';
    return `${value} ${currency}`;
  };

  // --- Cart Drawer Manager ---
  class CartDrawer {
    constructor() {
      this.drawer = document.getElementById('CartDrawer');
      this.backdrop = document.getElementById('CartBackdrop');
      this.closeBtns = document.querySelectorAll('[data-cart-close]');
      this.openBtns = document.querySelectorAll('[data-cart-open]');
      this.itemsContainer = document.getElementById('CartDrawerItems');
      this.subtotalEl = document.getElementById('CartDrawerSubtotal');
      this.shippingBar = document.getElementById('FreeShippingProgressBar');
      this.shippingText = document.getElementById('FreeShippingProgressText');
      this.countBadges = document.querySelectorAll('[data-cart-count]');
      
      this.threshold = parseFloat(window.NeverMindConfig?.freeShippingThreshold || 1000);
      
      this.bindEvents();
    }

    bindEvents() {
      this.openBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      }));

      this.closeBtns.forEach(btn => btn.addEventListener('click', () => this.close()));
      if (this.backdrop) this.backdrop.addEventListener('click', () => this.close());

      // Delegate item quantity & removal inside drawer
      if (this.itemsContainer) {
        this.itemsContainer.addEventListener('click', (e) => {
          const target = e.target.closest('[data-cart-action]');
          if (!target) return;
          const action = target.dataset.cartAction;
          const key = target.dataset.itemKey;
          const currentQty = parseInt(target.dataset.itemQty || '1', 10);

          if (action === 'remove') {
            this.changeItem(key, 0);
          } else if (action === 'plus') {
            this.changeItem(key, currentQty + 1);
          } else if (action === 'minus') {
            this.changeItem(key, Math.max(0, currentQty - 1));
          }
        });
      }

      // Catch native form submissions with [data-ajax-cart-form]
      document.addEventListener('submit', (e) => {
        const form = e.target.closest('[data-ajax-cart-form]');
        if (!form) return;
        e.preventDefault();
        this.addItem(new FormData(form));
      });
    }

    open() {
      if (this.drawer) this.drawer.classList.add('is-open');
      if (this.backdrop) this.backdrop.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      this.refresh();
    }

    close() {
      if (this.drawer) this.drawer.classList.remove('is-open');
      if (this.backdrop) this.backdrop.classList.remove('is-active');
      document.body.style.overflow = '';
    }

    async refresh() {
      try {
        const res = await fetch('/cart.js');
        const cart = await res.json();
        this.render(cart);
      } catch (err) {
        console.error('Error fetching cart:', err);
      }
    }

    async addItem(formData) {
      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error('Failed to add item to cart');
        await this.refresh();
        this.open();
      } catch (err) {
        alert(err.message || 'Item could not be added.');
      }
    }

    async changeItem(key, quantity) {
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity })
        });
        const cart = await res.json();
        this.render(cart);
      } catch (err) {
        console.error('Error changing cart item:', err);
      }
    }

    render(cart) {
      // Update counters
      this.countBadges.forEach(badge => {
        badge.textContent = cart.item_count;
        badge.style.display = cart.item_count > 0 ? 'inline-flex' : 'none';
      });

      // Update subtotal
      if (this.subtotalEl) {
        this.subtotalEl.textContent = formatMoney(cart.total_price);
      }

      // Update Free Shipping Bar
      if (this.shippingBar && this.shippingText) {
        const totalEGP = cart.total_price / 100;
        const progress = Math.min(100, Math.round((totalEGP / this.threshold) * 100));
        this.shippingBar.style.width = `${progress}%`;

        if (totalEGP >= this.threshold) {
          this.shippingText.innerHTML = `🎉 <strong>${window.NeverMindConfig?.translations?.freeShippingAchieved || window.NeverMindConfig?.freeShippingUnlockedMsg || "You've unlocked FREE SHIPPING!"}</strong>`;
        } else {
          const remaining = Math.round(this.threshold - totalEGP);
          const before = window.NeverMindConfig?.translations?.freeShippingBefore || 'Add';
          const after = window.NeverMindConfig?.translations?.freeShippingAfter || 'more for FREE SHIPPING';
          this.shippingText.innerHTML = `${before} <strong>${remaining} EGP</strong> ${after}`;
        }
      }

      // Render Item List
      if (!this.itemsContainer) return;
      if (cart.items.length === 0) {
        const emptyTitle = window.NeverMindConfig?.translations?.cartEmptyTitle || 'Your shopping bag is empty';
        const emptySubtext = window.NeverMindConfig?.translations?.cartEmptySubtext || 'Discover our latest arrivals and luxury fashion essentials.';
        const exploreAll = window.NeverMindConfig?.translations?.exploreAll || 'Explore All Products';
        this.itemsContainer.innerHTML = `
          <div style="text-align: center; padding: 48px 16px; color: var(--color-foreground-secondary);">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin: 0 auto 16px; opacity: 0.4;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/>
            </svg>
            <p style="font-size: 1.05rem; font-weight: 600; margin-bottom: 8px;">${emptyTitle}</p>
            <p style="font-size: 0.9rem; margin-bottom: 24px;">${emptySubtext}</p>
            <a href="/collections/all" class="btn btn-primary btn-sm">${exploreAll}</a>
          </div>
        `;
        return;
      }

      this.itemsContainer.innerHTML = cart.items.map(item => `
        <div class="cart-item" data-item-id="${item.id}">
          <div class="cart-item__media">
            <img class="cart-item__img" src="${item.image || ''}" alt="${item.title}">
          </div>
          <div class="cart-item__details">
            <a href="${item.url}" class="cart-item__title">${item.product_title}</a>
            ${item.variant_title ? `<span class="cart-item__variant">${item.variant_title}</span>` : ''}
            <span style="font-weight: 700; font-size: 0.92rem; margin-top: 2px;">${formatMoney(item.final_line_price)}</span>
            <div class="cart-item__bottom">
              <div class="quantity-stepper">
                <button type="button" class="quantity-stepper__btn" data-cart-action="minus" data-item-key="${item.key}" data-item-qty="${item.quantity}">-</button>
                <input type="text" class="quantity-stepper__input" value="${item.quantity}" readonly>
                <button type="button" class="quantity-stepper__btn" data-cart-action="plus" data-item-key="${item.key}" data-item-qty="${item.quantity}">+</button>
              </div>
              <button type="button" class="cart-item__remove" data-cart-action="remove" data-item-key="${item.key}">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // --- Product Media Gallery Slider Manager ---
  class ProductGallery {
    constructor(container) {
      this.container = container;
      this.slider = this.container.querySelector('[data-gallery-slider]');
      this.slides = Array.from(this.container.querySelectorAll('[data-gallery-slide]'));
      this.thumbs = Array.from(this.container.querySelectorAll('[data-gallery-thumb]'));
      this.prevBtn = this.container.querySelector('[data-gallery-prev]');
      this.nextBtn = this.container.querySelector('[data-gallery-next]');
      this.currentIndex = 0;
      this.isScrolling = false;

      this.bindEvents();
    }

    bindEvents() {
      // Thumbnail clicks
      this.thumbs.forEach((thumb, index) => {
        thumb.addEventListener('click', (e) => {
          e.preventDefault();
          this.slideToIndex(index);
        });
      });

      // Prev / Next arrow buttons
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const isRtl = document.documentElement.dir === 'rtl';
          this.slideStep(isRtl ? 1 : -1);
        });
      }

      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const isRtl = document.documentElement.dir === 'rtl';
          this.slideStep(isRtl ? -1 : 1);
        });
      }

      // Slider scroll listener for touch swipe / manual swipe synchronization
      if (this.slider) {
        let scrollTimeout;
        this.slider.addEventListener('scroll', () => {
          if (this.isScrolling) return;
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            this.syncActiveOnScroll();
          }, 60);
        }, { passive: true });
      }
    }

    syncActiveOnScroll() {
      if (!this.slider || this.slides.length <= 1) return;
      const sliderRect = this.slider.getBoundingClientRect();
      const sliderCenter = sliderRect.left + sliderRect.width / 2;

      let closestIndex = 0;
      let minDistance = Infinity;

      this.slides.forEach((slide, idx) => {
        const slideRect = slide.getBoundingClientRect();
        const slideCenter = slideRect.left + slideRect.width / 2;
        const distance = Math.abs(sliderCenter - slideCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = idx;
        }
      });

      this.setActiveState(closestIndex, false);
    }

    slideStep(step) {
      const targetIndex = Math.max(0, Math.min(this.slides.length - 1, this.currentIndex + step));
      this.slideToIndex(targetIndex);
    }

    slideToIndex(index) {
      if (index < 0 || index >= this.slides.length) return;
      const targetSlide = this.slides[index];
      if (!targetSlide || !this.slider) return;

      this.currentIndex = index;
      this.isScrolling = true;

      const targetLeft = targetSlide.offsetLeft;
      this.slider.scrollTo({ left: targetLeft, behavior: 'smooth' });

      this.setActiveState(index, true);

      setTimeout(() => {
        this.isScrolling = false;
      }, 350);
    }

    slideToMediaId(mediaId) {
      if (!mediaId || this.slides.length === 0) return false;
      const stringId = mediaId.toString();

      // Find slide matching data-media-id
      let slideIndex = this.slides.findIndex(s => s.dataset.mediaId === stringId);

      // Fallback: match by URL if needed
      if (slideIndex === -1) {
        slideIndex = this.slides.findIndex(s => {
          const img = s.querySelector('img');
          return img && img.src && (img.src.includes(`/${stringId}`) || img.src.includes(`_${stringId}_`));
        });
      }

      if (slideIndex !== -1) {
        this.slideToIndex(slideIndex);
        return true;
      }
      return false;
    }

    setActiveState(index, scrollThumb = true) {
      this.currentIndex = index;

      this.slides.forEach((slide, idx) => {
        slide.classList.toggle('is-active', idx === index);
      });

      this.thumbs.forEach((thumb, idx) => {
        const isActive = idx === index;
        thumb.classList.toggle('is-active', isActive);
        if (isActive && scrollThumb) {
          thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });
    }
  }

  // --- Product Variant Selector Manager ---
  class VariantPicker {
    constructor(container) {
      this.container = container;
      this.productData = JSON.parse(this.container.querySelector('[data-product-json]')?.textContent || '{}');
      this.optionPills = this.container.querySelectorAll('[data-variant-option]');
      this.masterSelect = this.container.querySelector('[name="id"]');
      this.priceEl = this.container.querySelector('[data-product-price]');
      this.comparePriceEl = this.container.querySelector('[data-product-compare-price]');
      this.discountBadge = this.container.querySelector('[data-discount-badge]');
      this.submitBtn = this.container.querySelector('[data-add-to-cart]');
      this.submitBtnText = this.container.querySelector('[data-add-to-cart-text]');
      this.wishlistBtn = this.container.querySelector('[data-wishlist-btn]');

      // Initialize Product Media Gallery Slider
      const galleryEl = this.container.querySelector('[data-product-gallery]') || document.querySelector('[data-product-gallery]');
      if (galleryEl) {
        this.gallery = new ProductGallery(galleryEl);
      }

      this.initSelectedStates();
      this.bindEvents();
      this.updateVariant(false);
    }

    initSelectedStates() {
      const groups = this.container.querySelectorAll('.variant-option-group');
      groups.forEach((group, index) => {
        let active = group.querySelector('[data-variant-option].is-selected');
        if (!active) {
          active = group.querySelector('[data-variant-option]:not(.is-unavailable)') || group.querySelector('[data-variant-option]');
          if (active) active.classList.add('is-selected');
        }
        if (active) {
          const labelVal = group.querySelector('[data-option-selected-label]');
          if (labelVal) labelVal.textContent = active.dataset.optionValue;
        }
      });
    }

    getColorOptionIndex() {
      if (!this.productData.options) return -1;
      return this.productData.options.findIndex(opt => {
        const o = opt.toString().trim().toLowerCase();
        return o.includes('color') || o.includes('colour') || o.includes('لون') || o.includes('اللون');
      });
    }

    bindEvents() {
      this.optionPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.preventDefault();
          const optionIndex = pill.dataset.optionIndex;
          const value = pill.dataset.optionValue;

          // Update active state in current group
          const group = pill.closest('.variant-option-group') || pill.closest('.variant-pill-list');
          if (group) {
            group.querySelectorAll('[data-variant-option]').forEach(p => p.classList.remove('is-selected'));
            pill.classList.add('is-selected');

            // Update label text if present
            const labelVal = group.querySelector('[data-option-selected-label]');
            if (labelVal) labelVal.textContent = value;
          }

          // If pill has an associated media ID, slide to it immediately
          if (this.gallery && pill.dataset.mediaId) {
            this.gallery.slideToMediaId(pill.dataset.mediaId);
          }

          this.updateVariant(true);
        });
      });
    }

    getSelectedOptions() {
      const selected = [];
      const groups = this.container.querySelectorAll('.variant-option-group');
      if (groups.length > 0) {
        groups.forEach((group, index) => {
          let active = group.querySelector('[data-variant-option].is-selected');
          if (!active) {
            active = group.querySelector('[data-variant-option]');
            if (active) active.classList.add('is-selected');
          }
          if (active) {
            const optIdx = parseInt(active.dataset.optionIndex ?? index, 10);
            selected[optIdx] = (active.dataset.optionValue || '').trim();
          }
        });
      } else {
        this.container.querySelectorAll('.variant-pill-list').forEach(list => {
          const active = list.querySelector('.is-selected');
          if (active) selected.push((active.dataset.optionValue || '').trim());
        });
      }
      return selected;
    }

    updateOptionAvailability(selected) {
      if (!this.productData.variants || this.productData.variants.length === 0) return;

      const groups = this.container.querySelectorAll('.variant-option-group');
      groups.forEach((group, groupIdx) => {
        const pills = group.querySelectorAll('[data-variant-option]');
        pills.forEach(pill => {
          const pillVal = (pill.dataset.optionValue || '').trim().toLowerCase();
          const pillIdx = parseInt(pill.dataset.optionIndex ?? groupIdx, 10);

          // Check if there is an in-stock variant with this option value matching other currently selected options
          const matchVariant = this.productData.variants.find(v => {
            if (!v.options) return false;
            const currentOpt = (v.options[pillIdx] || '').toString().trim().toLowerCase();
            if (currentOpt !== pillVal) return false;

            for (let i = 0; i < selected.length; i++) {
              if (i === pillIdx) continue;
              const selVal = (selected[i] || '').trim().toLowerCase();
              const vOptVal = (v.options[i] || '').toString().trim().toLowerCase();
              if (selVal && vOptVal && vOptVal !== selVal) {
                return false;
              }
            }
            return v.available;
          });

          if (matchVariant) {
            pill.classList.remove('is-unavailable');
          } else {
            const existsVariant = this.productData.variants.find(v => {
              if (!v.options) return false;
              const currentOpt = (v.options[pillIdx] || '').toString().trim().toLowerCase();
              return currentOpt === pillVal;
            });

            if (!existsVariant) {
              pill.classList.add('is-unavailable');
            } else {
              const comboExists = this.productData.variants.find(v => {
                if (!v.options) return false;
                const currentOpt = (v.options[pillIdx] || '').toString().trim().toLowerCase();
                if (currentOpt !== pillVal) return false;
                for (let i = 0; i < selected.length; i++) {
                  if (i === pillIdx) continue;
                  const selVal = (selected[i] || '').trim().toLowerCase();
                  const vOptVal = (v.options[i] || '').toString().trim().toLowerCase();
                  if (selVal && vOptVal && vOptVal !== selVal) return false;
                }
                return true;
              });

              if (!comboExists || !comboExists.available) {
                pill.classList.add('is-unavailable');
              } else {
                pill.classList.remove('is-unavailable');
              }
            }
          }
        });
      });
    }

    updateVariant(shouldSlide = true) {
      const selected = this.getSelectedOptions();
      this.updateOptionAvailability(selected);

      // Find matching variant
      const variant = this.productData.variants?.find(v => {
        if (!v.options || v.options.length !== selected.length) return false;
        return v.options.every((opt, i) => {
          const sel = selected[i];
          if (!sel) return false;
          return opt.toString().trim().toLowerCase() === sel.toString().trim().toLowerCase();
        });
      });

      const moneyFormat = this.priceEl?.dataset.currencyFormat || window.NeverMindConfig?.moneyFormat;

      // Shopify Variant -> Media Navigation
      if (this.gallery && shouldSlide) {
        let targetMediaId = variant?.featured_media?.id || variant?.featured_image?.id || variant?.image_id;

        // If this specific variant combination (e.g. Black / L) has no media assigned in Shopify,
        // find a sibling variant with the same color that has media assigned in Shopify!
        if (!targetMediaId && variant && selected.length > 0) {
          const colorOptionIndex = this.getColorOptionIndex();
          if (colorOptionIndex !== -1) {
            const selectedColorVal = (selected[colorOptionIndex] || '').trim().toLowerCase();
            const siblingWithMedia = this.productData.variants.find(v => {
              if (!v.options) return false;
              const vColor = (v.options[colorOptionIndex] || '').toString().trim().toLowerCase();
              const hasMedia = v.featured_media?.id || v.featured_image?.id || v.image_id;
              return vColor === selectedColorVal && hasMedia;
            });
            if (siblingWithMedia) {
              targetMediaId = siblingWithMedia.featured_media?.id || siblingWithMedia.featured_image?.id || siblingWithMedia.image_id;
            }
          }
        }

        // If target media found, navigate the slider to that media
        if (targetMediaId) {
          this.gallery.slideToMediaId(targetMediaId);
        }
      }

      if (!variant) {
        if (this.submitBtn) this.submitBtn.disabled = true;
        if (this.submitBtnText) {
          this.submitBtnText.textContent = window.NeverMindConfig?.translations?.unavailable || 'Unavailable';
        }
        return;
      }

      // Update hidden master ID
      if (this.masterSelect) this.masterSelect.value = variant.id;

      // Update price using proper money format
      if (this.priceEl) {
        this.priceEl.textContent = formatMoney(variant.price, moneyFormat);
      }

      if (this.comparePriceEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          this.comparePriceEl.textContent = formatMoney(variant.compare_at_price, moneyFormat);
          this.comparePriceEl.style.display = 'inline';
        } else {
          this.comparePriceEl.style.display = 'none';
        }
      }

      // Update discount badge
      if (this.discountBadge) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          const discountPercent = Math.round(((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100);
          this.discountBadge.textContent = `-${discountPercent}% OFF`;
          this.discountBadge.style.display = 'inline-flex';
        } else {
          this.discountBadge.style.display = 'none';
        }
      }

      // Update button availability
      if (this.submitBtn && this.submitBtnText) {
        if (variant.available) {
          this.submitBtn.disabled = false;
          this.submitBtnText.textContent = window.NeverMindConfig?.translations?.addToCart || 'Add to Bag';
        } else {
          this.submitBtn.disabled = true;
          this.submitBtnText.textContent = window.NeverMindConfig?.translations?.soldOut || 'Sold Out';
        }
      }

      // Update wishlist button state for active variant
      if (this.wishlistBtn) {
        this.wishlistBtn.dataset.productId = variant.id;
        this.wishlistBtn.dataset.productPrice = formatMoney(variant.price, moneyFormat);
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          this.wishlistBtn.dataset.productComparePrice = formatMoney(variant.compare_at_price, moneyFormat);
        } else {
          this.wishlistBtn.dataset.productComparePrice = '';
        }
        if (variant.featured_image && variant.featured_image.src) {
          this.wishlistBtn.dataset.productImage = variant.featured_image.src;
        }
      }

      // Push URL
      if (window.history && window.history.replaceState) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }

  // --- Predictive Search Manager ---
  class PredictiveSearch {
    constructor() {
      this.modal = document.getElementById('SearchModal');
      this.openBtns = document.querySelectorAll('[data-search-open]');
      this.closeBtns = document.querySelectorAll('[data-search-close]');
      this.input = document.getElementById('PredictiveSearchInput');
      this.resultsContainer = document.getElementById('PredictiveSearchResults');
      this.debounceTimer = null;

      this.bindEvents();
    }

    bindEvents() {
      this.openBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      }));

      this.closeBtns.forEach(btn => btn.addEventListener('click', () => this.close()));

      if (this.input) {
        this.input.addEventListener('input', () => {
          clearTimeout(this.debounceTimer);
          const query = this.input.value.trim();
          if (query.length < 2) {
            if (this.resultsContainer) this.resultsContainer.innerHTML = '';
            return;
          }
          this.debounceTimer = setTimeout(() => this.search(query), 250);
        });
      }
    }

    open() {
      if (this.modal) this.modal.classList.add('is-open');
      if (this.input) setTimeout(() => this.input.focus(), 150);
      document.body.style.overflow = 'hidden';
    }

    close() {
      if (this.modal) this.modal.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    async search(query) {
      try {
        const url = `/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=6`;
        const res = await fetch(url);
        const data = await res.json();
        const products = data.resources?.results?.products || [];
        this.render(products, query);
      } catch (err) {
        console.error('Search error:', err);
      }
    }

    render(products, query) {
      if (!this.resultsContainer) return;
      if (products.length === 0) {
        this.resultsContainer.innerHTML = `<p style="text-align: center; padding: 24px; color: var(--color-foreground-secondary);">No results found for "${query}".</p>`;
        return;
      }

      this.resultsContainer.innerHTML = `
        <div class="products-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin-top: 20px;">
          ${products.map(p => `
            <a href="${p.url}" class="product-card" style="text-decoration: none;">
              <div class="product-card__media-wrapper">
                <img class="product-card__img" src="${p.image || ''}" alt="${p.title}">
              </div>
              <p class="product-card__title" style="font-size: 0.88rem;">${p.title}</p>
              <p class="product-price" style="font-size: 0.92rem;">${formatMoney(p.price)}</p>
            </a>
          `).join('')}
        </div>
      `;
    }
  }



  // --- Accordion & Modal Helpers ---
  function initAccordions() {
    document.addEventListener('click', (e) => {
      const header = e.target.closest('.accordion-header');
      if (!header) return;
      const content = header.nextElementSibling;
      if (!content) return;
      const isOpen = content.classList.contains('is-open');

      if (isOpen) {
        content.classList.remove('is-open');
        content.style.maxHeight = '0px';
      } else {
        content.classList.add('is-open');
        content.style.maxHeight = `${content.scrollHeight + 32}px`;
      }
    });
  }

  // --- Wishlist Manager ---
  class WishlistManager {
    constructor() {
      this.storageKey = 'nevermind_wishlist_items';
      this.items = this.loadItems();
      this.drawer = document.getElementById('WishlistDrawer');
      this.backdrop = document.getElementById('WishlistBackdrop');
      this.drawerItems = document.getElementById('WishlistDrawerItems');
      this.countBadges = document.querySelectorAll('[data-wishlist-count]');
      this.drawerCount = document.querySelector('[data-wishlist-drawer-count]');
      this.pageContainer = document.getElementById('WishlistPageContainer');

      this.initEvents();
      this.updateUI();
    }

    loadItems() {
      try {
        const data = localStorage.getItem(this.storageKey);
        const parsed = data ? JSON.parse(data) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.map(item => {
          if (!item || typeof item !== 'object') return null;
          const handle = item.handle || '';
          if (!handle) return null;

          const cleanTitle = (item.title && item.title !== 'undefined')
            ? item.title
            : handle.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const cleanUrl = (item.url && item.url !== 'undefined')
            ? item.url
            : `/products/${handle}`;
          const cleanPrice = (item.price && item.price !== 'undefined') ? item.price : '';
          const cleanComparePrice = (item.compare_at_price && item.compare_at_price !== 'undefined') ? item.compare_at_price : '';
          const cleanImage = (item.image && item.image !== 'undefined') ? item.image : '';
          const cleanVendor = (item.vendor && item.vendor !== 'undefined') ? item.vendor : '';

          return {
            ...item,
            handle,
            title: cleanTitle,
            url: cleanUrl,
            price: cleanPrice,
            compare_at_price: cleanComparePrice,
            image: cleanImage,
            vendor: cleanVendor
          };
        }).filter(Boolean);
      } catch (e) {
        return [];
      }
    }

    saveItems() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items));
      } catch (e) {}
      this.updateUI();
    }

    initEvents() {
      document.querySelectorAll('[data-wishlist-open]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        });
      });

      document.querySelectorAll('[data-wishlist-close]').forEach(btn => {
        btn.addEventListener('click', () => this.close());
      });

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-wishlist-btn]');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          const handle = btn.dataset.productHandle;
          if (!handle) return;

          const card = btn.closest('[data-product-card]');
          let productData = { handle };
          let isFromProductPage = false;

          if (card) {
            const titleEl = card.querySelector('.product-card__title a');
            const imgEl = card.querySelector('.product-card__img--primary') || card.querySelector('img');
            const priceEl = card.querySelector('[data-product-price]');
            const comparePriceEl = card.querySelector('[data-product-compare-price]');
            const vendorEl = card.querySelector('.product-card__vendor');

            productData = {
              handle,
              id: card.dataset.productId || btn.dataset.productId || handle,
              title: (titleEl ? titleEl.textContent.trim() : '') || btn.dataset.productTitle || handle,
              url: (titleEl ? titleEl.getAttribute('href') : '') || btn.dataset.productUrl || `/products/${handle}`,
              image: (imgEl ? imgEl.getAttribute('src') : '') || btn.dataset.productImage || '',
              price: (priceEl ? priceEl.textContent.trim() : '') || btn.dataset.productPrice || '',
              compare_at_price: (comparePriceEl ? comparePriceEl.textContent.trim() : '') || btn.dataset.productComparePrice || '',
              vendor: (vendorEl ? vendorEl.textContent.trim() : '') || btn.dataset.productVendor || ''
            };
          } else {
            isFromProductPage = true;
            const productSection = btn.closest('.product-main-section, .product-layout, section') || document;
            const titleEl = productSection.querySelector('.product-info__title, h1');
            const imgEl = productSection.querySelector('[data-product-main-img], .product-gallery__main-img, img');
            const priceEl = productSection.querySelector('[data-product-price]');
            const comparePriceEl = productSection.querySelector('[data-product-compare-price]');
            const vendorEl = productSection.querySelector('[data-product-vendor], .product-info > span:first-child');

            productData = {
              handle,
              id: btn.dataset.productId || handle,
              title: btn.dataset.productTitle || (titleEl ? titleEl.textContent.trim() : '') || handle,
              url: btn.dataset.productUrl || window.location.pathname || `/products/${handle}`,
              image: (imgEl && imgEl.getAttribute('src')) ? imgEl.getAttribute('src') : (btn.dataset.productImage || ''),
              price: (priceEl && priceEl.textContent.trim()) ? priceEl.textContent.trim() : (btn.dataset.productPrice || ''),
              compare_at_price: (comparePriceEl && comparePriceEl.offsetParent !== null && comparePriceEl.textContent.trim()) ? comparePriceEl.textContent.trim() : (btn.dataset.productComparePrice || ''),
              vendor: btn.dataset.productVendor || (vendorEl ? vendorEl.textContent.trim() : '')
            };
          }
          this.toggle(productData, isFromProductPage);
        }

        const removeBtn = e.target.closest('[data-wishlist-remove]');
        if (removeBtn) {
          e.preventDefault();
          const handle = removeBtn.dataset.productHandle;
          this.remove(handle);
        }
      });
    }

    toggle(product, openDrawerIfAdded = false) {
      const idx = this.items.findIndex(item => item.handle === product.handle);
      if (idx >= 0) {
        this.items.splice(idx, 1);
      } else {
        this.items.unshift(product);
        if (openDrawerIfAdded) {
          this.open();
        }
      }
      this.saveItems();
    }

    remove(handle) {
      this.items = this.items.filter(item => item.handle !== handle);
      this.saveItems();
    }

    open() {
      if (this.drawer) this.drawer.classList.add('is-open');
      if (this.backdrop) this.backdrop.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      this.renderDrawer();
    }

    close() {
      if (this.drawer) this.drawer.classList.remove('is-open');
      if (this.backdrop) this.backdrop.classList.remove('is-active');
      document.body.style.overflow = '';
    }

    updateUI() {
      const count = this.items.length;
      
      this.countBadges.forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
      });

      if (this.drawerCount) {
        this.drawerCount.textContent = count;
      }

      document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
        const handle = btn.dataset.productHandle;
        const exists = this.items.some(item => item.handle === handle);
        if (exists) {
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-pressed', 'false');
        }
      });

      this.renderDrawer();
      this.renderPage();
    }

    renderDrawer() {
      if (!this.drawerItems) return;
      if (this.items.length === 0) {
        const emptyTitle = window.NeverMindConfig?.translations?.wishlistEmptyTitle || 'Your wishlist is empty';
        const emptySub = window.NeverMindConfig?.translations?.wishlistEmptySubtext || 'Explore our collections and save pieces you love.';
        const exploreBtn = window.NeverMindConfig?.translations?.exploreAll || 'Explore Catalog';
        this.drawerItems.innerHTML = `
          <div style="text-align: center; padding: 48px 16px; color: var(--color-foreground-secondary);">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin: 0 auto 16px; opacity: 0.4;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            <p style="font-size: 1.05rem; font-weight: 600; margin-bottom: 8px;">${emptyTitle}</p>
            <p style="font-size: 0.9rem; margin-bottom: 24px;">${emptySub}</p>
            <a href="/collections/all" class="btn btn-primary btn-sm" data-wishlist-close>${exploreBtn}</a>
          </div>
        `;
        return;
      }

      this.drawerItems.innerHTML = this.items.map(item => `
        <div class="cart-item" style="display: grid; grid-template-columns: 80px 1fr auto; gap: 14px; align-items: center;">
          <div class="cart-item__media" style="aspect-ratio: 3/4; border-radius: 4px; overflow: hidden; background: #F8F8F9;">
            ${item.image && item.image !== 'undefined' ? `<img src="${item.image}" alt="${item.title || ''}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
          </div>
          <div class="cart-item__details">
            ${item.vendor && item.vendor !== 'undefined' ? `<span style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-foreground-muted);">${item.vendor}</span>` : ''}
            <a href="${item.url && item.url !== 'undefined' ? item.url : `/products/${item.handle}`}" class="cart-item__title" style="font-size: 0.92rem; font-weight: 600;">${item.title && item.title !== 'undefined' ? item.title : item.handle}</a>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              ${item.price && item.price !== 'undefined' ? `<span style="font-weight: 700; font-size: 0.92rem;">${item.price}</span>` : ''}
              ${item.compare_at_price && item.compare_at_price !== 'undefined' ? `<s style="color: var(--color-foreground-muted); font-size: 0.82rem;">${item.compare_at_price}</s>` : ''}
            </div>
            <a href="${item.url && item.url !== 'undefined' ? item.url : `/products/${item.handle}`}" class="btn btn-outline btn-sm" style="margin-top: 8px; padding: 6px 12px; font-size: 0.8rem; width: fit-content;">${window.NeverMindConfig?.translations?.viewStyle || 'View Style'}</a>
          </div>
          <button type="button" data-wishlist-remove data-product-handle="${item.handle}" style="background: none; border: none; padding: 8px; cursor: pointer; color: var(--color-foreground-muted);" aria-label="${window.NeverMindConfig?.translations?.removeItem || 'Remove item'}">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      `).join('');
    }

    renderPage() {
      if (!this.pageContainer) return;
      if (this.items.length === 0) {
        const emptyTitle = window.NeverMindConfig?.translations?.wishlistEmptyTitle || 'Your wishlist is currently empty';
        const emptySub = window.NeverMindConfig?.translations?.wishlistEmptySubtext || 'Discover our luxury streetwear essentials and save your favorite pieces.';
        const exploreBtn = window.NeverMindConfig?.translations?.exploreAll || 'Explore Catalog';
        this.pageContainer.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 64px 16px;">
            <h3>${emptyTitle}</h3>
            <p style="color: var(--color-foreground-secondary); margin: 12px 0 24px;">${emptySub}</p>
            <a href="/collections/all" class="btn btn-primary">${exploreBtn}</a>
          </div>
        `;
        return;
      }

      this.pageContainer.innerHTML = this.items.map(item => `
        <div class="product-card" data-product-card>
          <div class="product-card__media-wrapper">
            <a href="${item.url && item.url !== 'undefined' ? item.url : `/products/${item.handle}`}" style="display: block; width: 100%; height: 100%;">
              ${item.image && item.image !== 'undefined' ? `<img src="${item.image}" alt="${item.title || ''}" class="product-card__img product-card__img--primary">` : ''}
            </a>
            <button type="button" class="product-card__wishlist is-active" data-wishlist-btn data-product-handle="${item.handle}" aria-label="Remove from Wishlist">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#E05A47" stroke="#E05A47" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
            <div class="product-card__quick-actions">
              <a href="${item.url && item.url !== 'undefined' ? item.url : `/products/${item.handle}`}" class="product-card__quick-btn"><span>${window.NeverMindConfig?.translations?.viewStyle || 'View Product'}</span></a>
            </div>
          </div>
          <div class="product-card__content">
            ${item.vendor && item.vendor !== 'undefined' ? `<span class="product-card__vendor">${item.vendor}</span>` : ''}
            <h3 class="product-card__title"><a href="${item.url && item.url !== 'undefined' ? item.url : `/products/${item.handle}`}">${item.title && item.title !== 'undefined' ? item.title : item.handle}</a></h3>
            <div class="product-card__price-wrap">
              ${item.price && item.price !== 'undefined' ? `<span class="product-price">${item.price}</span>` : ''}
              ${item.compare_at_price && item.compare_at_price !== 'undefined' ? `<s class="product-price product-price--compare">${item.compare_at_price}</s>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  function initModals() {
    // Size Guide Modal
    const sizeGuideOpenBtns = document.querySelectorAll('[data-size-guide-open]');
    const sizeGuideModal = document.getElementById('SizeGuideModal');
    const sizeGuideCloseBtns = document.querySelectorAll('[data-size-guide-close]');

    sizeGuideOpenBtns.forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (sizeGuideModal) sizeGuideModal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }));

    sizeGuideCloseBtns.forEach(btn => btn.addEventListener('click', () => {
      if (sizeGuideModal) sizeGuideModal.classList.remove('is-open');
      document.body.style.overflow = '';
    }));

    // Mobile Navigation Drawer & Multi-Level Accordions
    const mobileToggle = document.querySelector('[data-mobile-menu-toggle]');
    const mobileDrawer = document.getElementById('MobileNavDrawer');
    const mobileBackdrop = document.getElementById('MobileNavBackdrop');
    const mobileCloseBtns = document.querySelectorAll('[data-mobile-menu-close]');

    function openMobileNav() {
      if (mobileDrawer) mobileDrawer.classList.add('is-open');
      if (mobileBackdrop) mobileBackdrop.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    }

    function closeMobileNav() {
      if (mobileDrawer) mobileDrawer.classList.remove('is-open');
      if (mobileBackdrop) mobileBackdrop.classList.remove('is-active');
      document.body.style.overflow = '';
    }

    if (mobileToggle) {
      mobileToggle.addEventListener('click', (e) => {
        e.preventDefault();
        openMobileNav();
      });
    }

    mobileCloseBtns.forEach(btn => btn.addEventListener('click', closeMobileNav));
    if (mobileBackdrop) mobileBackdrop.addEventListener('click', closeMobileNav);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileDrawer && mobileDrawer.classList.contains('is-open')) {
        closeMobileNav();
      }
    });

    // Level 1 Accordions Toggle
    document.querySelectorAll('[data-mobile-accordion-trigger]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = btn.classList.contains('is-open');
        const content = btn.nextElementSibling;
        
        // Toggle current accordion
        if (isOpen) {
          btn.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
          if (content) content.classList.remove('is-open');
        } else {
          btn.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
          if (content) content.classList.add('is-open');
        }
      });
    });

    // Level 2 / Level 3 Sub-Accordions Toggle
    document.querySelectorAll('[data-mobile-sub-accordion-trigger]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = btn.classList.contains('is-open');
        const content = btn.nextElementSibling;

        if (isOpen) {
          btn.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
          if (content) content.classList.remove('is-open');
        } else {
          btn.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
          if (content) content.classList.add('is-open');
        }
      });
    });

    // Auto-close mobile drawer when tapping an internal link
    if (mobileDrawer) {
      mobileDrawer.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          closeMobileNav();
        });
      });
    }

    // Desktop Mega Menu persistent hover, click toggle, keyboard accessibility & Shopify Theme Editor support
    const megaMenuItems = document.querySelectorAll('.header__menu-item--has-mega');
    let hoverTimeouts = new Map();

    megaMenuItems.forEach(item => {
      const link = item.querySelector('.header__menu-link');

      // Click toggle for desktop
      if (link) {
        link.addEventListener('click', (e) => {
          if (window.innerWidth >= 1024) {
            e.preventDefault();
            const wasOpen = item.classList.contains('is-open');
            megaMenuItems.forEach(m => {
              m.classList.remove('is-open');
              const ml = m.querySelector('.header__menu-link');
              if (ml) ml.setAttribute('aria-expanded', 'false');
            });
            if (!wasOpen) {
              item.classList.add('is-open');
              link.setAttribute('aria-expanded', 'true');
            }
          }
        });
      }

      // Debounced hover bridge (prevents flickering)
      item.addEventListener('mouseenter', () => {
        if (hoverTimeouts.has(item)) {
          clearTimeout(hoverTimeouts.get(item));
          hoverTimeouts.delete(item);
        }
        item.classList.add('is-open');
        if (link) link.setAttribute('aria-expanded', 'true');
      });

      item.addEventListener('mouseleave', () => {
        const timer = setTimeout(() => {
          item.classList.remove('is-open');
          if (link) link.setAttribute('aria-expanded', 'false');
          hoverTimeouts.delete(item);
        }, 120);
        hoverTimeouts.set(item, timer);
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      const clickedMega = e.target.closest('.header__menu-item--has-mega');
      if (!clickedMega) {
        megaMenuItems.forEach(item => {
          item.classList.remove('is-open');
          const l = item.querySelector('.header__menu-link');
          if (l) l.setAttribute('aria-expanded', 'false');
        });
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        megaMenuItems.forEach(item => {
          if (item.classList.contains('is-open')) {
            item.classList.remove('is-open');
            const l = item.querySelector('.header__menu-link');
            if (l) {
              l.setAttribute('aria-expanded', 'false');
              l.focus();
            }
          }
        });
      }
    });

    // Shopify Theme Editor: Automatically open mega menu when any related block is selected
    document.addEventListener('shopify:block:select', (e) => {
      const target = e.target;
      const blockId = e.detail?.blockId;
      let targetEl = target;

      if (blockId && !target.closest('.header__menu-item--has-mega')) {
        targetEl = document.querySelector(`[data-shopify-editor-block*="${blockId}"]`) || target;
      }

      const megaItem = targetEl.closest('.header__menu-item--has-mega') || 
                       targetEl.closest('.mega-menu')?.closest('.header__menu-item--has-mega') || 
                       document.querySelector('.header__menu-item--has-mega');
      if (megaItem) {
        megaItem.classList.add('is-open');
        const l = megaItem.querySelector('.header__menu-link');
        if (l) l.setAttribute('aria-expanded', 'true');
      }
    });

    document.addEventListener('shopify:block:deselect', (e) => {
      const target = e.target;
      const megaItem = target.closest('.header__menu-item--has-mega') || 
                       target.closest('.mega-menu')?.closest('.header__menu-item--has-mega') || 
                       document.querySelector('.header__menu-item--has-mega');
      if (megaItem) {
        megaItem.classList.remove('is-open');
        const l = megaItem.querySelector('.header__menu-link');
        if (l) l.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // --- Product Sliders Navigation ---
  function initSliders() {
    document.addEventListener('click', (e) => {
      const prevBtn = e.target.closest('[data-slider-prev]');
      const nextBtn = e.target.closest('[data-slider-next]');

      if (prevBtn) {
        const sectionId = prevBtn.dataset.sliderPrev;
        const slider = document.getElementById(`Slider-${sectionId}`);
        if (slider) {
          const itemWidth = slider.querySelector('.products-slider__item')?.offsetWidth || 300;
          const isRtl = document.documentElement.dir === 'rtl';
          slider.scrollBy({ left: isRtl ? itemWidth : -itemWidth, behavior: 'smooth' });
        }
      }

      if (nextBtn) {
        const sectionId = nextBtn.dataset.sliderNext;
        const slider = document.getElementById(`Slider-${sectionId}`);
        if (slider) {
          const itemWidth = slider.querySelector('.products-slider__item')?.offsetWidth || 300;
          const isRtl = document.documentElement.dir === 'rtl';
          slider.scrollBy({ left: isRtl ? -itemWidth : itemWidth, behavior: 'smooth' });
        }
      }
    });
  }

  // --- Recently Viewed Products Manager ---
  function initRecentlyViewed() {
    const container = document.getElementById('RecentlyViewedContainer');
    const storageKey = 'nevermind_recently_viewed';

    if (window.location.pathname.includes('/products/')) {
      const productTitleEl = document.querySelector('.product-title, .product-single__title, h1');
      const productPriceEl = document.querySelector('.product-price');
      const productImgEl = document.querySelector('.product-media img, .product-single__photo img');
      const pathname = window.location.pathname;

      if (productTitleEl) {
        const item = {
          title: productTitleEl.textContent.trim(),
          url: pathname,
          price: productPriceEl ? productPriceEl.textContent.trim() : '599 EGP',
          image: productImgEl ? productImgEl.src : ''
        };

        try {
          let items = JSON.parse(localStorage.getItem(storageKey) || '[]');
          items = items.filter(i => i.url !== pathname);
          items.unshift(item);
          if (items.length > 8) items.pop();
          localStorage.setItem(storageKey, JSON.stringify(items));
        } catch (e) {}
      }
    }

    if (container) {
      let items = [];
      try {
        items = JSON.parse(localStorage.getItem(storageKey) || '[]');
      } catch (e) {}

      if (items.length > 0) {
        container.innerHTML = items.map(p => `
          <div class="product-card">
            <div class="product-card__media-wrapper">
              <a href="${p.url}" style="display:block; width:100%; height:100%;">
                ${p.image ? `<img src="${p.image}" class="product-card__img" loading="lazy" alt="${p.title}">` : '<div style="background:#f3f4f6; aspect-ratio:3/4; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-weight:700;">Never Mind</div>'}
              </a>
            </div>
            <div class="product-card__content">
              <span class="product-card__vendor">Never Mind</span>
              <h3 class="product-card__title"><a href="${p.url}">${p.title}</a></h3>
              <div class="product-card__price-wrap">
                <span class="product-price">${p.price}</span>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        container.innerHTML = `
          <div class="product-card">
            <div class="product-card__media-wrapper">
              <a href="/products/signature-heavyweight-oversized-tee-mineral-black" style="display:block; width:100%; height:100%;">
                <div style="background:#1a1a1a; color:#fff; aspect-ratio:3/4; display:flex; align-items:center; justify-content:center; font-weight:700; letter-spacing:0.05em;">NEVER MIND</div>
              </a>
            </div>
            <div class="product-card__content">
              <span class="product-card__vendor">Never Mind</span>
              <h3 class="product-card__title"><a href="/products/signature-heavyweight-oversized-tee-mineral-black">Signature Heavyweight Oversized Tee</a></h3>
              <div class="product-card__price-wrap">
                <span class="product-price">599 EGP</span>
                <s class="product-price product-price--compare">799 EGP</s>
              </div>
            </div>
          </div>
          <div class="product-card">
            <div class="product-card__media-wrapper">
              <a href="/products/boxy-french-terry-minimalist-hoodie-charcoal" style="display:block; width:100%; height:100%;">
                <div style="background:#2a2a2a; color:#fff; aspect-ratio:3/4; display:flex; align-items:center; justify-content:center; font-weight:700; letter-spacing:0.05em;">NEVER MIND</div>
              </a>
            </div>
            <div class="product-card__content">
              <span class="product-card__vendor">Never Mind</span>
              <h3 class="product-card__title"><a href="/products/boxy-french-terry-minimalist-hoodie-charcoal">Boxy Minimalist Hoodie</a></h3>
              <div class="product-card__price-wrap">
                <span class="product-price">1199 EGP</span>
                <s class="product-price product-price--compare">1499 EGP</s>
              </div>
            </div>
          </div>
          <div class="product-card">
            <div class="product-card__media-wrapper">
              <a href="/products/tactical-relaxed-cargo-pants-olive-drab" style="display:block; width:100%; height:100%;">
                <div style="background:#1f2421; color:#fff; aspect-ratio:3/4; display:flex; align-items:center; justify-content:center; font-weight:700; letter-spacing:0.05em;">NEVER MIND</div>
              </a>
            </div>
            <div class="product-card__content">
              <span class="product-card__vendor">Never Mind</span>
              <h3 class="product-card__title"><a href="/products/tactical-relaxed-cargo-pants-olive-drab">Tactical Relaxed Cargo Pants</a></h3>
              <div class="product-card__price-wrap">
                <span class="product-price">950 EGP</span>
                <s class="product-price product-price--compare">1250 EGP</s>
              </div>
            </div>
          </div>
          <div class="product-card">
            <div class="product-card__media-wrapper">
              <a href="/products/cropped-structured-heavyweight-tee-bone-ivory" style="display:block; width:100%; height:100%;">
                <div style="background:#e5e5e5; color:#111; aspect-ratio:3/4; display:flex; align-items:center; justify-content:center; font-weight:700; letter-spacing:0.05em;">NEVER MIND</div>
              </a>
            </div>
            <div class="product-card__content">
              <span class="product-card__vendor">Never Mind</span>
              <h3 class="product-card__title"><a href="/products/cropped-structured-heavyweight-tee-bone-ivory">Cropped Structured Heavyweight Tee</a></h3>
              <div class="product-card__price-wrap">
                <span class="product-price">549 EGP</span>
                <s class="product-price product-price--compare">699 EGP</s>
              </div>
            </div>
          </div>
        `;
      }
    }
  }

  // --- Collection Filters & Facets Controller ---
  function initCollectionFilters() {
    const filterContainer = document.querySelector('[data-collection-facets]');
    if (!filterContainer && !document.getElementById('FilterDrawer')) return;

    let isFetching = false;

    // Helper: Safely re-enable any disabled form inputs
    const enableAllInputs = () => {
      document.querySelectorAll('#CollectionFacetsForm input, .filter-drawer__form input').forEach(input => {
        input.disabled = false;
      });
    };

    window.addEventListener('pageshow', enableAllInputs);

    // Sync client-side fallback URL parameters (if collection.filters not yet published in admin)
    const syncUrlParamsToUI = () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Availability checkboxes
      const availabilities = urlParams.getAll('filter.v.availability');
      if (availabilities.length > 0) {
        document.querySelectorAll('input[name="filter.v.availability"]').forEach(input => {
          if (availabilities.includes(input.value)) {
            input.checked = true;
          }
        });
        const availWrap = document.querySelector('[data-facet-dropdown="availability"]');
        if (availWrap) {
          const btn = availWrap.querySelector('[data-facet-chip-trigger]');
          const badge = availWrap.querySelector('.facet-chip-badge');
          if (btn) btn.classList.add('has-active');
          if (badge) {
            badge.textContent = availabilities.length;
            badge.style.display = 'inline-flex';
          }
        }
      }

      // Price inputs
      const priceGte = urlParams.get('filter.v.price.gte');
      const priceLte = urlParams.get('filter.v.price.lte');
      if (priceGte || priceLte) {
        if (priceGte) {
          document.querySelectorAll('input[name="filter.v.price.gte"]').forEach(input => {
            input.value = priceGte;
          });
        }
        if (priceLte) {
          document.querySelectorAll('input[name="filter.v.price.lte"]').forEach(input => {
            input.value = priceLte;
          });
        }
        const priceWrap = document.querySelector('[data-facet-dropdown="price"]');
        if (priceWrap) {
          const btn = priceWrap.querySelector('[data-facet-chip-trigger]');
          const badge = priceWrap.querySelector('.facet-chip-badge');
          if (btn) btn.classList.add('has-active');
          if (badge) badge.style.display = 'inline-flex';
        }
      }

      // Sort by select
      const sortBy = urlParams.get('sort_by');
      if (sortBy) {
        document.querySelectorAll('[data-facet-sort-select]').forEach(select => {
          select.value = sortBy;
        });
      }
    };

    // Close all desktop popovers
    const closeAllPopovers = () => {
      document.querySelectorAll('[data-facet-popover].is-open').forEach(p => {
        p.classList.remove('is-open');
        const trigger = p.closest('[data-facet-dropdown]')?.querySelector('[data-facet-chip-trigger]');
        if (trigger) trigger.classList.remove('is-open');
      });
    };

    // Mobile Filter Drawer Open/Close
    const filterDrawer = document.getElementById('FilterDrawer');
    const filterBackdrop = document.getElementById('FilterDrawerBackdrop');

    const openDrawer = () => {
      if (filterDrawer) filterDrawer.classList.add('is-open');
      if (filterBackdrop) filterBackdrop.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      if (filterDrawer) filterDrawer.classList.remove('is-open');
      if (filterBackdrop) filterBackdrop.classList.remove('is-active');
      document.body.style.overflow = '';
    };

    // Fetch and render filtered results via Section Rendering API
    const fetchResults = async (targetUrl) => {
      if (isFetching) return;
      isFetching = true;

      const gridContainer = document.getElementById('ProductGridContainer');
      const facetsWrapper = document.querySelector('[data-collection-facets]');
      if (gridContainer) gridContainer.classList.add('is-loading');

      try {
        const urlObj = new URL(targetUrl, window.location.origin);
        const sectionId = document.querySelector('.collection-main-container')?.dataset?.sectionId || 'main-collection';
        urlObj.searchParams.set('section_id', sectionId);

        const res = await fetch(urlObj.toString());
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 1. Update Product Grid
        const newGrid = doc.getElementById('ProductGridContainer');
        if (newGrid && gridContainer) {
          gridContainer.innerHTML = newGrid.innerHTML;
        }

        // 2. Update Desktop Facets Toolbar & Active Filter Pills
        const newFacets = doc.querySelector('[data-collection-facets]');
        if (newFacets && facetsWrapper) {
          facetsWrapper.innerHTML = newFacets.innerHTML;
        }

        // 3. Update Mobile Drawer content
        const newDrawer = doc.getElementById('FilterDrawer');
        const curDrawer = document.getElementById('FilterDrawer');
        if (newDrawer && curDrawer) {
          curDrawer.innerHTML = newDrawer.innerHTML;
        }

        // 4. Update browser URL history
        urlObj.searchParams.delete('section_id');
        window.history.pushState({ path: urlObj.toString() }, '', urlObj.toString());

        // 5. Close popovers & drawer
        closeAllPopovers();
        closeDrawer();

        // 6. Re-bind event handlers
        bindFacetEvents();
        syncUrlParamsToUI();

      } catch (err) {
        console.warn('AJAX filter fallback to regular navigation:', err);
        window.location.href = targetUrl;
      } finally {
        if (gridContainer) gridContainer.classList.remove('is-loading');
        isFetching = false;
        enableAllInputs();
      }
    };

    // Build URL from form and trigger fetch
    const submitFormAjax = (form) => {
      if (!form) return;
      const formData = new FormData(form);
      const params = new URLSearchParams();

      for (const [key, val] of formData.entries()) {
        if (val !== '' && val !== null) {
          params.append(key, val);
        }
      }

      const action = form.getAttribute('action') || window.location.pathname;
      const finalUrl = `${action}?${params.toString()}`;
      fetchResults(finalUrl);
    };

    // Bind all interactive events
    const bindFacetEvents = () => {
      // 1. Mobile Drawer Triggers
      document.querySelectorAll('[data-filter-drawer-open]').forEach(btn => {
        btn.onclick = openDrawer;
      });
      document.querySelectorAll('[data-filter-drawer-close]').forEach(btn => {
        btn.onclick = closeDrawer;
      });

      // 2. Desktop Dropdown Popovers
      document.querySelectorAll('[data-facet-dropdown]').forEach(wrap => {
        const trigger = wrap.querySelector('[data-facet-chip-trigger]');
        const popover = wrap.querySelector('[data-facet-popover]');
        if (!trigger || !popover) return;

        trigger.onclick = (e) => {
          e.stopPropagation();
          const isOpen = popover.classList.contains('is-open');
          closeAllPopovers();

          if (!isOpen) {
            popover.classList.add('is-open');
            trigger.classList.add('is-open');
          }
        };

        popover.onclick = (e) => e.stopPropagation();
      });

      // 3. Desktop Checkbox Auto-Submit (AJAX)
      const desktopForm = document.getElementById('CollectionFacetsForm');
      if (desktopForm) {
        desktopForm.querySelectorAll('.facet-checkbox-input').forEach(checkbox => {
          checkbox.onchange = () => {
            submitFormAjax(desktopForm);
          };
        });
      }

      // 4. Sort By Dropdowns (Desktop & Mobile Bar)
      document.querySelectorAll('[data-facet-sort-select]').forEach(select => {
        select.onchange = () => {
          const form = document.getElementById('CollectionFacetsForm');
          if (form) {
            const hiddenSort = form.querySelector('input[name=sort_by]');
            if (hiddenSort) hiddenSort.value = select.value;
            submitFormAjax(form);
          } else {
            const url = new URL(window.location.href);
            url.searchParams.set('sort_by', select.value);
            fetchResults(url.toString());
          }
        };
      });

      // 5. Price Range Form Submission (Desktop Popover & Mobile Drawer)
      if (desktopForm) {
        desktopForm.onsubmit = (e) => {
          e.preventDefault();
          submitFormAjax(desktopForm);
        };
      }

      const drawerForm = document.querySelector('.filter-drawer__form');
      if (drawerForm) {
        drawerForm.onsubmit = (e) => {
          e.preventDefault();
          submitFormAjax(drawerForm);
        };
      }

      // 6. Active Filter Pills & Reset Links (AJAX)
      document.querySelectorAll('[data-facet-remove], [data-facet-clear-all], [data-facet-reset]').forEach(link => {
        link.onclick = (e) => {
          e.preventDefault();
          const href = link.getAttribute('href');
          if (href) fetchResults(href);
        };
      });

      // 7. Pagination Links (AJAX)
      document.querySelectorAll('.collection-pagination a').forEach(link => {
        link.onclick = (e) => {
          e.preventDefault();
          const href = link.getAttribute('href');
          if (href) {
            fetchResults(href);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        };
      });
    };

    // Close on click outside & Escape key
    document.addEventListener('click', closeAllPopovers);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllPopovers();
        closeDrawer();
      }
    });

    // Handle browser Back / Forward buttons
    window.addEventListener('popstate', () => {
      fetchResults(window.location.href);
    });

    // Initial binding
    bindFacetEvents();
    syncUrlParamsToUI();
  }

  // --- Sticky Auto-Hide on Scroll Down / Reveal on Scroll Up ---
  function initStickyHeader() {
    const headerWrapper = document.getElementById('site-header') || document.querySelector('.header-wrapper');
    if (!headerWrapper) return;

    // Ensure parent shopify section wrapper behaves as sticky container
    const headerSection = headerWrapper.closest('.shopify-section') || headerWrapper.parentElement;
    if (headerSection && headerSection !== document.body) {
      headerSection.classList.add('section-header-sticky');
    }

    let lastScrollY = Math.max(0, window.pageYOffset || document.documentElement.scrollTop);
    let ticking = false;
    const scrollThreshold = 8; // minimum px movement to detect intentional direction

    function updateHeader() {
      const currentScrollY = Math.max(0, window.pageYOffset || document.documentElement.scrollTop);
      const headerHeight = headerWrapper.offsetHeight || 76;

      // Do not toggle header if any drawer/modal is open or body is scroll-locked
      const isDrawerOpen = document.body.style.overflow === 'hidden' ||
        document.querySelector('.drawer.is-open, .filter-drawer.is-open, .search-modal.is-open, .mobile-nav-drawer.is-open');

      if (isDrawerOpen) {
        ticking = false;
        return;
      }

      // 1. At the very top (or iOS negative overscroll)
      if (currentScrollY <= 10) {
        headerWrapper.classList.remove('header--hidden');
        headerWrapper.classList.remove('header--scrolled');
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      // Add elevation shadow whenever scrolled past top
      headerWrapper.classList.add('header--scrolled');

      // 2. Near top (within header height), keep visible
      if (currentScrollY <= headerHeight) {
        headerWrapper.classList.remove('header--hidden');
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      // 3. Prevent false triggers at bottom of page (iOS rubber banding)
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      if (currentScrollY >= maxScrollY - 20) {
        ticking = false;
        return;
      }

      const diff = currentScrollY - lastScrollY;

      // 4. Directional scroll detection
      if (Math.abs(diff) >= scrollThreshold) {
        if (diff > 0) {
          // Scrolling DOWN -> Hide Navbar
          if (!headerWrapper.classList.contains('header--hidden')) {
            headerWrapper.classList.add('header--hidden');

            // Close any open desktop mega menus / dropdowns
            document.querySelectorAll('.header__menu-item--has-mega.is-open, .header__menu-item--has-dropdown.is-open').forEach(item => {
              item.classList.remove('is-open');
              const link = item.querySelector('.header__menu-link');
              if (link) link.setAttribute('aria-expanded', 'false');
            });
          }
        } else {
          // Scrolling UP -> Reveal Navbar
          headerWrapper.classList.remove('header--hidden');
        }

        lastScrollY = currentScrollY;
      }

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });

    // Accessibility: Reveal header if keyboard focus moves inside it
    headerWrapper.addEventListener('focusin', () => {
      headerWrapper.classList.remove('header--hidden');
    });

    // Theme Editor: keep header visible during theme customizer interactions
    document.addEventListener('shopify:section:select', (e) => {
      if (e.target.contains(headerWrapper) || headerWrapper.contains(e.target)) {
        headerWrapper.classList.remove('header--hidden');
      }
    });

    document.addEventListener('shopify:block:select', () => {
      headerWrapper.classList.remove('header--hidden');
    });
  }

  // --- Product Card Swatches Interactive Image Switcher ---
  function initProductCardSwatches() {
    document.addEventListener('click', (e) => {
      const swatch = e.target.closest('[data-card-swatch]');
      if (!swatch) return;

      e.preventDefault();
      e.stopPropagation();

      const card = swatch.closest('[data-product-card]');
      if (!card) return;

      // Update active state among swatches in this card
      card.querySelectorAll('[data-card-swatch]').forEach(s => s.classList.remove('is-active'));
      swatch.classList.add('is-active');

      // Update image
      const newImgSrc = swatch.dataset.variantImage;
      if (newImgSrc) {
        const primaryImg = card.querySelector('.product-card__img--primary, [data-product-card-img]');
        if (primaryImg) {
          primaryImg.src = newImgSrc;
        }
        const secondaryImg = card.querySelector('.product-card__img--secondary');
        if (secondaryImg) {
          secondaryImg.src = newImgSrc;
        }
      }
    });
  }

  // --- Initialize All Theme Features on DOM Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    window.NeverMindCart = new CartDrawer();
    window.NeverMindSearch = new PredictiveSearch();
    window.NeverMindWishlist = new WishlistManager();

    document.querySelectorAll('[data-variant-picker]').forEach(el => new VariantPicker(el));
    initAccordions();
    initModals();
    initSliders();
    initRecentlyViewed();
    initCollectionFilters();
    initStickyHeader();
    initProductCardSwatches();
  });
})();

