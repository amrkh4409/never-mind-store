/**
 * Never Mind Store — Modern Luxury Fashion Theme
 * Client-Side JavaScript Architecture (Shopify OS 2.0)
 * Native AJAX Cart, Dynamic Variants, Predictive Search, Wishlist, Modals
 */

(function() {
  'use strict';

  // --- Global Utility & Event Helpers ---
  const formatMoney = (cents, format) => {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const value = (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return `${value} EGP`;
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
          this.shippingText.innerHTML = `🎉 <strong>${window.NeverMindConfig?.freeShippingUnlockedMsg || "You've unlocked FREE SHIPPING!"}</strong>`;
        } else {
          const remaining = Math.round(this.threshold - totalEGP);
          this.shippingText.innerHTML = `Add <strong>${remaining} EGP</strong> more for <strong>FREE SHIPPING</strong>`;
        }
      }

      // Render Item List
      if (!this.itemsContainer) return;
      if (cart.items.length === 0) {
        this.itemsContainer.innerHTML = `
          <div style="text-align: center; padding: 48px 16px; color: var(--color-foreground-secondary);">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin: 0 auto 16px; opacity: 0.4;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/>
            </svg>
            <p style="font-size: 1.05rem; font-weight: 600; margin-bottom: 8px;">Your shopping bag is empty</p>
            <p style="font-size: 0.9rem; margin-bottom: 24px;">Discover our latest arrivals and luxury fashion essentials.</p>
            <a href="/collections/all" class="btn btn-primary btn-sm">Explore All Products</a>
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

  // --- Product Variant Selector Manager ---
  class VariantPicker {
    constructor(container) {
      this.container = container;
      this.productData = JSON.parse(this.container.querySelector('[data-product-json]')?.textContent || '{}');
      this.optionPills = this.container.querySelectorAll('[data-variant-option]');
      this.masterSelect = this.container.querySelector('[name="id"]');
      this.priceEl = this.container.querySelector('[data-product-price]');
      this.comparePriceEl = this.container.querySelector('[data-product-compare-price]');
      this.submitBtn = this.container.querySelector('[data-add-to-cart]');
      this.submitBtnText = this.container.querySelector('[data-add-to-cart-text]');

      this.bindEvents();
    }

    bindEvents() {
      this.optionPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.preventDefault();
          const optionIndex = pill.dataset.optionIndex;
          const value = pill.dataset.optionValue;

          // Update active state in current group
          const group = pill.closest('.variant-pill-list');
          group.querySelectorAll('[data-variant-option]').forEach(p => p.classList.remove('is-selected'));
          pill.classList.add('is-selected');

          // Update label text if present
          const labelVal = group.parentElement.querySelector('[data-option-selected-label]');
          if (labelVal) labelVal.textContent = value;

          this.updateVariant();
        });
      });
    }

    getSelectedOptions() {
      const selected = [];
      this.container.querySelectorAll('.variant-pill-list').forEach(list => {
        const active = list.querySelector('.is-selected');
        if (active) selected.push(active.dataset.optionValue);
      });
      return selected;
    }

    updateVariant() {
      const selected = this.getSelectedOptions();
      const variant = this.productData.variants?.find(v => 
        v.options.every((opt, i) => opt === selected[i])
      );

      if (!variant) {
        if (this.submitBtn) this.submitBtn.disabled = true;
        if (this.submitBtnText) this.submitBtnText.textContent = 'Unavailable';
        return;
      }

      // Update hidden master ID
      if (this.masterSelect) this.masterSelect.value = variant.id;

      // Update price
      if (this.priceEl) this.priceEl.textContent = formatMoney(variant.price);
      if (this.comparePriceEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          this.comparePriceEl.textContent = formatMoney(variant.compare_at_price);
          this.comparePriceEl.style.display = 'inline';
        } else {
          this.comparePriceEl.style.display = 'none';
        }
      }

      // Update button availability
      if (this.submitBtn && this.submitBtnText) {
        if (variant.available) {
          this.submitBtn.disabled = false;
          this.submitBtnText.textContent = 'Add to Bag';
        } else {
          this.submitBtn.disabled = true;
          this.submitBtnText.textContent = 'Sold Out';
        }
      }

      // Switch gallery image if variant has featured_image
      if (variant.featured_image && variant.featured_image.src) {
        const mainImg = document.querySelector('[data-product-main-img]');
        if (mainImg) mainImg.src = variant.featured_image.src;
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

  // --- Wishlist Manager (LocalStorage) ---
  class WishlistManager {
    constructor() {
      this.storageKey = 'nevermind_wishlist';
      this.countBadges = document.querySelectorAll('[data-wishlist-count]');
      this.bindButtons();
      this.updateBadges();
    }

    getItems() {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      } catch {
        return [];
      }
    }

    toggle(handle) {
      let items = this.getItems();
      if (items.includes(handle)) {
        items = items.filter(h => h !== handle);
      } else {
        items.push(handle);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(items));
      this.updateBadges();
      this.updateButtonStates();
    }

    updateBadges() {
      const count = this.getItems().length;
      this.countBadges.forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
      });
    }

    updateButtonStates() {
      const items = this.getItems();
      document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
        const handle = btn.dataset.productHandle;
        if (items.includes(handle)) {
          btn.classList.add('is-active');
        } else {
          btn.classList.remove('is-active');
        }
      });
    }

    bindButtons() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-wishlist-btn]');
        if (!btn) return;
        e.preventDefault();
        const handle = btn.dataset.productHandle;
        if (handle) this.toggle(handle);
      });
      this.updateButtonStates();
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

    // Mobile Navigation Drawer
    const mobileToggle = document.querySelector('[data-mobile-menu-toggle]');
    const mobileDrawer = document.getElementById('MobileNavDrawer');
    const mobileClose = document.querySelector('[data-mobile-menu-close]');

    if (mobileToggle && mobileDrawer) {
      mobileToggle.addEventListener('click', () => {
        mobileDrawer.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      });
    }

    if (mobileClose && mobileDrawer) {
      mobileClose.addEventListener('click', () => {
        mobileDrawer.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    }
  }

  // --- Initialize All Theme Features on DOM Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    window.NeverMindCart = new CartDrawer();
    window.NeverMindSearch = new PredictiveSearch();
    window.NeverMindWishlist = new WishlistManager();

    document.querySelectorAll('[data-variant-picker]').forEach(el => new VariantPicker(el));
    initAccordions();
    initModals();
  });
})();
