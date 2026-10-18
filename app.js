/**
 * Scripbox PMS Landing Page - Canonical Prototype Logic
 * Single canonical experience (Variant B - CTA to Modal Flow)
 * Conversion-Optimised 3-Step Qualification Flow:
 * Step 1 (Goal) -> Step 2 (Contextual Portfolio/Allocation) -> Step 3 (Contact Conversion)
 * Followed by Optional Callback Scheduling -> Thank You Confirmation.
 * In-memory state tracking, responsive field validation, dynamic copy adaptation,
 * duplicate submission prevention, and accessible navigation.
 */

(function () {
  'use strict';

  // In-Memory Form State
  const formState = {
    q1: '',
    q2: '',
    name: '',
    mobile: '',
    city: '',
    callTime: ''
  };

  let isSubmitting = false;

  // DOM Elements - Hero & Controls
  const heroSection = document.getElementById('heroSection');
  const btnHeroB = document.getElementById('btnHeroB');
  const stickyCtaBar = document.getElementById('stickyCtaBar');
  const stickyCtaBtn = document.getElementById('stickyCtaBtn');
  const btnSecondaryCta = document.getElementById('btnSecondaryCta');

  // DOM Elements - Overlay & Panels
  const stepOverlay = document.getElementById('stepOverlay');
  const panelQ1 = document.getElementById('panelQ1');
  const panelQ2 = document.getElementById('panelQ2');
  const panelContact = document.getElementById('panelContact');
  const panelThanks = document.getElementById('panelThanks');

  const panels = {
    q1: panelQ1,
    q2: panelQ2,
    contact: panelContact,
    thanks: panelThanks
  };

  // Back Navigation & Edit Affordance Buttons
  const btnBackFromQ1 = document.getElementById('btnBackFromQ1');
  const btnBackFromQ2 = document.getElementById('btnBackFromQ2');
  const btnBackFromContact = document.getElementById('btnBackFromContact');
  const btnEditRecap = document.getElementById('btnEditRecap');
  const btnThanksClose = document.getElementById('btnThanksClose');

  // Contact Form Elements
  const contactForm = document.getElementById('contactForm');
  const contactName = document.getElementById('contactName');
  const contactMobile = document.getElementById('contactMobile');
  const contactCity = document.getElementById('contactCity');
  const nameWrapper = document.getElementById('nameWrapper');
  const mobileWrapper = document.getElementById('mobileWrapper');
  const cityWrapper = document.getElementById('cityWrapper');
  const nameError = document.getElementById('nameError');
  const mobileError = document.getElementById('mobileError');
  const cityError = document.getElementById('cityError');
  const btnContactSubmit = document.getElementById('btnContactSubmit');

  // Thanks Screen Callback Chips
  const callbackChips = document.querySelectorAll('.callback-chip');
  const callbackSavedHint = document.getElementById('callbackSavedHint');

  let currentActiveStep = null;
  let lastTriggerElement = null;
  let lastScrollY = 0;

  // Background elements to isolate with inert when modal opens
  const bgHero = document.getElementById('heroSection');
  const bgContent = document.getElementById('belowFoldContent');
  const bgFooter = document.querySelector('.btf-footer');
  const bgSticky = document.getElementById('stickyCtaBar');

  // Overlay Step Management
  function goToStep(stepId) {
    if (!currentActiveStep) {
      lastTriggerElement = document.activeElement;
      lastScrollY = window.scrollY;
      if (bgHero) bgHero.setAttribute('inert', '');
      if (bgContent) bgContent.setAttribute('inert', '');
      if (bgFooter) bgFooter.setAttribute('inert', '');
      if (bgSticky) bgSticky.setAttribute('inert', '');
    }

    currentActiveStep = stepId;

    stepOverlay.style.display = 'block';
    stepOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Hide all panels
    Object.keys(panels).forEach(key => {
      if (panels[key]) {
        panels[key].style.display = 'none';
      }
    });

    const activePanel = panels[stepId];
    if (activePanel) {
      activePanel.style.display = 'flex';
      const heading = activePanel.querySelector('h1, h2, h3, .step-heading, .thanks-heading');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      }
      activePanel.scrollTop = 0;
    }

    restoreStepState(stepId);
  }

  function closeOverlay() {
    stepOverlay.style.display = 'none';
    stepOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (bgHero) bgHero.removeAttribute('inert');
    if (bgContent) bgContent.removeAttribute('inert');
    if (bgFooter) bgFooter.removeAttribute('inert');
    if (bgSticky) bgSticky.removeAttribute('inert');
    checkHeroScroll();

    currentActiveStep = null;
    window.scrollTo(0, lastScrollY);

    if (lastTriggerElement && typeof lastTriggerElement.focus === 'function') {
      lastTriggerElement.focus();
    } else if (btnHeroB) {
      btnHeroB.focus();
    }
  }

  // Escape key and modal focus trap
  if (stepOverlay) {
    window.addEventListener('keydown', function (e) {
      if (stepOverlay.style.display === 'none' || !currentActiveStep) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeOverlay();
        return;
      }

      if (e.key === 'Tab') {
        const activePanel = panels[currentActiveStep];
        if (!activePanel) return;

        const focusables = Array.from(
          activePanel.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
        ).filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none';
        });

        if (focusables.length === 0) return;

        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || !activePanel.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl || !activePanel.contains(document.activeElement)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    });
  }

  // Restore State on Revisit / Back Navigation & Dynamic Content Adaptation
  function restoreStepState(stepId) {
    if (stepId === 'q1') {
      panelQ1.querySelectorAll('.modal-tile, .q1-card-tile, .objective-card').forEach(t => {
        const matches = t.getAttribute('data-choice') === formState.q1;
        t.classList.toggle('is-selected', matches);
        t.setAttribute('aria-pressed', matches ? 'true' : 'false');
      });
    } else if (stepId === 'q2') {
      // Dynamic Q2 copy adaptation based on Step 1 intent
      const q2Heading = document.getElementById('q2Heading');
      const q2Subnote = document.getElementById('q2Subnote');
      if (q2Heading) {
        if (formState.q1 === 'Portfolio review by experts') {
          q2Heading.textContent = 'Size of portfolio to review';
          if (q2Subnote) {
            q2Subnote.textContent = '*Comprehensive review available for portfolios starting at ₹50 Lakhs.';
          }
        } else {
          q2Heading.textContent = 'Planned investment in PMS';
          if (q2Subnote) {
            q2Subnote.textContent = '*SEBI requires a minimum investment of ₹50 Lakhs for Portfolio Management Services.';
          }
        }
      }

      panelQ2.querySelectorAll('.q2-tile, .option-tile').forEach(t => {
        const matches = t.getAttribute('data-choice') === formState.q2;
        t.classList.toggle('is-selected', matches);
        t.setAttribute('aria-pressed', matches ? 'true' : 'false');
      });
    } else if (stepId === 'contact') {
      if (contactName) contactName.value = formState.name || '';
      if (contactMobile) contactMobile.value = formState.mobile || '';
      if (contactCity) contactCity.value = formState.city || '';

      // Dynamic Strategy Recap Pill
      const recapText = document.getElementById('recapText');
      if (recapText) {
        const parts = [];
        if (formState.q1) parts.push(formState.q1);
        if (formState.q2) {
          parts.push(formState.q2 === 'Under 50 Lakhs' ? 'Under ₹50L (Mutual Fund Advisory)' : formState.q2);
        }
        recapText.textContent = parts.length > 0
          ? parts.join(' • ')
          : 'Goal-based strategy • ₹50 Lakhs to ₹2 Crore';
      }

      // Dynamic Benefit-Led Headline & Under-₹50L Routing
      const contactHeading = document.getElementById('contactHeading');
      const contactSub = document.getElementById('contactSub');
      const btnText = btnContactSubmit ? btnContactSubmit.querySelector('.btn-text') : null;

      if (formState.q2 === 'Under 50 Lakhs') {
        if (contactHeading) contactHeading.textContent = 'Request your mutual fund advisory consultation';
        if (contactSub) {
          contactSub.textContent = 'SEBI mandates a ₹50 Lakh minimum for PMS. Our wealth advisory team will evaluate your goals and design a high-conviction direct mutual fund strategy.';
        }
        if (btnText) btnText.textContent = 'Request Advisory Consultation';
      } else if (formState.q1 === 'Portfolio review by experts') {
        if (contactHeading) contactHeading.textContent = 'Request your confidential portfolio review';
        if (contactSub) {
          contactSub.textContent = 'A senior SEBI-registered portfolio manager will evaluate your existing holdings and prepare an objective diagnostic.';
        }
        if (btnText) btnText.textContent = 'Request Portfolio Review';
      } else {
        if (contactHeading) contactHeading.textContent = 'Request your confidential PMS strategy consultation';
        if (contactSub) {
          contactSub.textContent = 'A senior SEBI-registered portfolio specialist will evaluate your mandate profile and connect for a confidential 1-on-1 consultation.';
        }
        if (btnText) btnText.textContent = 'Request Expert Consultation';
      }

      updateContactSubmitState();
    } else if (stepId === 'thanks') {
      const thanksHeading = document.getElementById('thanksHeading');
      const thanksSubhead = document.getElementById('thanksSubhead');
      const summaryText = document.getElementById('thanksSummaryText');

      if (formState.q2 === 'Under 50 Lakhs') {
        if (thanksHeading) thanksHeading.textContent = 'Advisory Consultation Request Confirmed';
        if (thanksSubhead) {
          thanksSubhead.textContent = 'Your advisory profile has been queued for a senior mutual fund wealth specialist.';
        }
      } else if (formState.q1 === 'Portfolio review by experts') {
        if (thanksHeading) thanksHeading.textContent = 'Portfolio Review Request Confirmed';
        if (thanksSubhead) {
          thanksSubhead.textContent = 'Your portfolio diagnostic request has been queued for a senior SEBI-registered manager.';
        }
      } else {
        if (thanksHeading) thanksHeading.textContent = 'Consultation Request Confirmed';
        if (thanksSubhead) {
          thanksSubhead.textContent = 'Your mandate profile has been successfully queued for specialist review.';
        }
      }

      if (summaryText) {
        const parts = [];
        if (formState.q1) parts.push(formState.q1);
        if (formState.q2) {
          parts.push(formState.q2 === 'Under 50 Lakhs' ? 'Mutual Fund Advisory (<₹50L)' : formState.q2);
        }
        summaryText.textContent = `Enquiry: ${parts.length > 0 ? parts.join(' • ') : 'PMS Consultation'}`;
      }

      // Sync callback chips state
      syncCallbackChips();
    }
  }

  // Callback Chips Synchronization & Event Listeners
  function syncCallbackChips() {
    callbackChips.forEach(chip => {
      const matches = formState.callTime && chip.getAttribute('data-choice') === formState.callTime;
      chip.classList.toggle('is-selected', !!matches);
      chip.setAttribute('aria-checked', matches ? 'true' : 'false');
    });
    if (callbackSavedHint) {
      if (formState.callTime) {
        const label = formState.callTime.split(' (')[0];
        callbackSavedHint.textContent = `Preference saved: ${label} window selected. We will prioritize calling during this time.`;
        callbackSavedHint.style.display = 'block';
      } else {
        callbackSavedHint.style.display = 'none';
      }
    }
  }

  callbackChips.forEach(chip => {
    chip.addEventListener('click', function () {
      const choice = this.getAttribute('data-choice');
      if (formState.callTime === choice) {
        // Toggle off if tapped again
        formState.callTime = '';
      } else {
        formState.callTime = choice;
      }
      syncCallbackChips();
    });
  });

  // Q1 Selection Handler in Modal (Auto-advances to Step 2)
  function handleQ1Selection(tileElement) {
    const choice = tileElement.getAttribute('data-choice');
    formState.q1 = choice;

    panelQ1.querySelectorAll('.modal-tile, .q1-card-tile, .objective-card').forEach(t => {
      t.classList.remove('is-selected');
      t.setAttribute('aria-pressed', 'false');
    });

    tileElement.classList.add('is-selected');
    tileElement.setAttribute('aria-pressed', 'true');

    setTimeout(() => {
      goToStep('q2');
    }, 180);
  }

  // Wire up Modal Q1 cards / tiles
  panelQ1.querySelectorAll('.modal-tile, .q1-card-tile, .objective-card').forEach(tile => {
    tile.addEventListener('click', function () {
      handleQ1Selection(this);
    });
  });

  // Wire up Q2 Tiles (Auto-advances to Step 3 - Contact)
  panelQ2.querySelectorAll('.q2-tile, .option-tile').forEach(tile => {
    tile.addEventListener('click', function () {
      const choice = this.getAttribute('data-choice');
      formState.q2 = choice;

      panelQ2.querySelectorAll('.q2-tile, .option-tile').forEach(t => {
        t.classList.remove('is-selected');
        t.setAttribute('aria-pressed', 'false');
      });

      this.classList.add('is-selected');
      this.setAttribute('aria-pressed', 'true');

      setTimeout(() => {
        goToStep('contact');
      }, 180);
    });
  });

  // Wire up Hero CTA Button
  if (btnHeroB) {
    btnHeroB.addEventListener('click', function () {
      goToStep('q1');
    });
  }

  // Back Navigation Handlers
  if (btnBackFromQ1) {
    btnBackFromQ1.addEventListener('click', function () {
      closeOverlay();
    });
  }

  if (btnBackFromQ2) {
    btnBackFromQ2.addEventListener('click', function () {
      goToStep('q1');
    });
  }

  if (btnBackFromContact) {
    btnBackFromContact.addEventListener('click', function () {
      goToStep('q2');
    });
  }

  // Recap Edit Button Handler (Jumps directly back to Step 1 while preserving answers)
  if (btnEditRecap) {
    btnEditRecap.addEventListener('click', function () {
      goToStep('q1');
    });
  }

  // Confirmation Return / Close Button Handler
  if (btnThanksClose) {
    btnThanksClose.addEventListener('click', function () {
      closeOverlay();
    });
  }

  // Contact Form Validation Logic
  function validateName(value) {
    const trimmed = value.trim();
    if (!trimmed) return { valid: false, message: 'Please enter your full name.' };
    if (trimmed.length < 2) return { valid: false, message: 'Name must be at least 2 characters.' };
    return { valid: true };
  }

  function validateMobile(value) {
    const clean = value.replace(/[\s\-]/g, '');
    if (!clean) return { valid: false, message: 'Please enter your mobile number.' };
    const phonePattern = /^[6-9]\d{9}$/;
    if (!phonePattern.test(clean)) {
      return { valid: false, message: 'Please enter a valid 10-digit Indian mobile number.' };
    }
    return { valid: true };
  }

  // City is optional: valid if blank, but if entered must be at least 2 chars
  function validateCity(value) {
    const trimmed = value.trim();
    if (!trimmed) return { valid: true };
    if (trimmed.length < 2) return { valid: false, message: 'City must be at least 2 characters if provided.' };
    return { valid: true };
  }

  function setFieldError(field, wrapper, errorEl, res) {
    if (!res.valid) {
      wrapper.classList.add('is-invalid');
      wrapper.classList.add('has-error');
      errorEl.textContent = res.message;
      errorEl.classList.add('is-visible');
      errorEl.style.display = 'block';
      field.setAttribute('aria-invalid', 'true');
    } else {
      wrapper.classList.remove('is-invalid');
      wrapper.classList.remove('has-error');
      errorEl.textContent = '';
      errorEl.classList.remove('is-visible');
      errorEl.style.display = 'none';
      field.setAttribute('aria-invalid', 'false');
    }
  }

  function updateContactSubmitState() {
    if (!btnContactSubmit || isSubmitting) return;
    const nameRes = validateName(contactName ? contactName.value : '');
    const mobileRes = validateMobile(contactMobile ? contactMobile.value : '');
    const cityRes = validateCity(contactCity ? contactCity.value : '');
    const isValid = nameRes.valid && mobileRes.valid && cityRes.valid;
    btnContactSubmit.disabled = !isValid;
  }

  if (contactName) {
    contactName.addEventListener('input', () => {
      setFieldError(contactName, nameWrapper, nameError, { valid: true });
      updateContactSubmitState();
    });
    contactName.addEventListener('blur', () => {
      if (contactName.value.trim().length > 0) {
        setFieldError(contactName, nameWrapper, nameError, validateName(contactName.value));
      }
    });
  }

  if (contactMobile) {
    contactMobile.addEventListener('input', e => {
      e.target.value = e.target.value.replace(/[^\d\s\-]/g, '');
      setFieldError(contactMobile, mobileWrapper, mobileError, { valid: true });
      updateContactSubmitState();
    });
    contactMobile.addEventListener('blur', () => {
      if (contactMobile.value.trim().length > 0) {
        setFieldError(contactMobile, mobileWrapper, mobileError, validateMobile(contactMobile.value));
      }
    });
  }

  if (contactCity) {
    contactCity.addEventListener('input', () => {
      setFieldError(contactCity, cityWrapper, cityError, { valid: true });
      updateContactSubmitState();
    });
    contactCity.addEventListener('blur', () => {
      if (contactCity.value.trim().length > 0) {
        setFieldError(contactCity, cityWrapper, cityError, validateCity(contactCity.value));
      }
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isSubmitting) return;

      const nameRes = validateName(contactName.value);
      const mobileRes = validateMobile(contactMobile.value);
      const cityRes = validateCity(contactCity.value);

      setFieldError(contactName, nameWrapper, nameError, nameRes);
      setFieldError(contactMobile, mobileWrapper, mobileError, mobileRes);
      setFieldError(contactCity, cityWrapper, cityError, cityRes);

      if (!nameRes.valid) {
        contactName.focus();
        return;
      }
      if (!mobileRes.valid) {
        contactMobile.focus();
        return;
      }
      if (!cityRes.valid) {
        contactCity.focus();
        return;
      }

      isSubmitting = true;
      formState.name = contactName.value.trim();
      formState.mobile = contactMobile.value.trim();
      formState.city = contactCity.value.trim();

      // UI Loading state to prevent duplicate submission and reassure user
      btnContactSubmit.classList.add('is-loading');
      btnContactSubmit.disabled = true;
      const btnText = btnContactSubmit.querySelector('.btn-text');
      const originalText = btnText ? btnText.textContent : 'Request Expert Consultation';
      if (btnText) btnText.textContent = 'Submitting enquiry...';

      setTimeout(() => {
        isSubmitting = false;
        btnContactSubmit.classList.remove('is-loading');
        btnContactSubmit.disabled = false;
        if (btnText) btnText.textContent = originalText;
        goToStep('thanks');
      }, 300);
    });
  }

  // Sticky CTA Observer & Visibility Handler
  function setStickyVisible(visible) {
    if (visible) {
      stickyCtaBar.classList.add('is-visible');
      stickyCtaBar.setAttribute('aria-hidden', 'false');
      stickyCtaBar.removeAttribute('inert');
    } else {
      stickyCtaBar.classList.remove('is-visible');
      stickyCtaBar.setAttribute('aria-hidden', 'true');
      stickyCtaBar.setAttribute('inert', '');
    }
  }

  function checkHeroScroll() {
    const heroRect = heroSection.getBoundingClientRect();
    if (heroRect.bottom <= 0) {
      setStickyVisible(true);
    } else {
      setStickyVisible(false);
    }
  }

  window.addEventListener('scroll', checkHeroScroll, { passive: true });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            setStickyVisible(true);
          } else if (entry.isIntersecting) {
            setStickyVisible(false);
          }
        });
      },
      { threshold: 0 }
    );
    observer.observe(heroSection);
  }

  // Sticky CTA Button Click
  stickyCtaBtn.addEventListener('click', function () {
    goToStep('q1');
  });

  // Secondary BTF CTA Button Click
  if (btnSecondaryCta) {
    btnSecondaryCta.addEventListener('click', function () {
      goToStep('q1');
    });
  }

  // Strategy Selector Control (Compact 3-Option Segmented Control + Shared Detail Panel)
  const stratTabs = document.querySelectorAll('.strat-tab-btn');
  const stratCards = document.querySelectorAll('.strategy-card');

  stratTabs.forEach(tab => {
    tab.addEventListener('click', function () {
      const target = this.getAttribute('data-strat');

      stratTabs.forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      this.classList.add('is-active');
      this.setAttribute('aria-selected', 'true');

      stratCards.forEach(card => {
        const cardStrat = card.getAttribute('data-strategy');
        if (cardStrat === target) {
          card.style.display = 'block';
          card.classList.add('is-active');
          card.setAttribute('aria-hidden', 'false');
        } else {
          card.style.display = 'none';
          card.classList.remove('is-active');
          card.setAttribute('aria-hidden', 'true');
        }
      });
    });
  });

  // Strategy Mandate Drawer (Progressive Disclosure)
  const drawerBtns = document.querySelectorAll('.strat-drawer-btn');
  drawerBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      const targetId = this.getAttribute('aria-controls');
      const targetContent = document.getElementById(targetId);

      this.setAttribute('aria-expanded', !expanded);
      const textSpan = this.querySelector('.drawer-btn-text');

      if (targetContent) {
        if (!expanded) {
          targetContent.hidden = false;
          if (textSpan) textSpan.textContent = 'Hide strategy details';
        } else {
          targetContent.hidden = true;
          if (textSpan) textSpan.textContent = 'Explore strategy details';
        }
      }
    });
  });

  // ==========================================================================
  // Integrated Performance Components Logic
  // ==========================================================================

  // 1. Performance Period Comparison (Component 2)
  const perfData = (typeof window !== 'undefined' && window.PERFORMANCE_DATA) ? window.PERFORMANCE_DATA : null;
  const periodBtns = Array.from(document.querySelectorAll('.perf-period-btn'));
  const perfBarBenchmark = document.getElementById('perfBarBenchmark');
  const perfBarScripbox = document.getElementById('perfBarScripbox');
  const perfValBenchmark = document.getElementById('perfValBenchmark');
  const perfValScripbox = document.getElementById('perfValScripbox');
  const perfLiveAnnouncement = document.getElementById('perfLiveAnnouncement');

  function updatePerformancePeriod(periodId) {
    if (!perfData || !perfData.periods[periodId]) return;
    const data = perfData.periods[periodId];

    // Fixed vertical axis scale: 0% to 35%
    const MAX_SCALE = 35.0;
    const benchmarkPct = (data.benchmark / MAX_SCALE) * 100;
    const scripboxPct = (data.scripbox / MAX_SCALE) * 100;

    if (perfBarBenchmark) {
      perfBarBenchmark.style.height = benchmarkPct.toFixed(1) + '%';
    }
    if (perfBarScripbox) {
      perfBarScripbox.style.height = scripboxPct.toFixed(1) + '%';
    }
    if (perfValBenchmark) {
      perfValBenchmark.textContent = data.displayBenchmark;
    }
    if (perfValScripbox) {
      perfValScripbox.textContent = data.displayScripbox;
    }

    // Update active button state
    periodBtns.forEach(btn => {
      const isCurrent = btn.getAttribute('data-period') === periodId;
      btn.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
      btn.setAttribute('tabindex', isCurrent ? '0' : '-1');
      if (isCurrent) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });

    // Screen reader announcement
    if (perfLiveAnnouncement) {
      perfLiveAnnouncement.textContent = `Selected ${data.label}: Scripbox Portfolio Optimiser ${data.displayScripbox}, Benchmark ${data.displayBenchmark}.`;
    }
  }

  if (periodBtns.length > 0) {
    periodBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const periodId = btn.getAttribute('data-period');
        updatePerformancePeriod(periodId);
      });

      // Arrow navigation for radiogroup accessibility
      btn.addEventListener('keydown', (e) => {
        let targetIndex = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          targetIndex = (index + 1) % periodBtns.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          targetIndex = (index - 1 + periodBtns.length) % periodBtns.length;
        }

        if (targetIndex >= 0) {
          e.preventDefault();
          const targetBtn = periodBtns[targetIndex];
          targetBtn.focus();
          const periodId = targetBtn.getAttribute('data-period');
          updatePerformancePeriod(periodId);
        }
      });
    });
  }

  // 2. Hero Wealth Accumulation Disclosure (Direct visible disclosure, no modal popup required)
  const btnHeroGrowthInfo = document.getElementById('btnHeroGrowthInfo') || document.getElementById('btnGrowthInfo');
  const heroGrowthPopup = document.getElementById('heroGrowthPopup') || document.getElementById('growthDisclaimerPopup');
  const btnHeroClosePopup = document.getElementById('btnHeroClosePopup') || document.getElementById('btnCloseDisclaimer');

  function openDisclaimerPopup() {
    if (!heroGrowthPopup || !btnHeroGrowthInfo) return;
    heroGrowthPopup.classList.remove('is-hidden');
    btnHeroGrowthInfo.setAttribute('aria-expanded', 'true');
    if (btnHeroClosePopup) {
      btnHeroClosePopup.focus();
    }
  }

  function closeDisclaimerPopup() {
    if (!heroGrowthPopup || !btnHeroGrowthInfo) return;
    heroGrowthPopup.classList.add('is-hidden');
    btnHeroGrowthInfo.setAttribute('aria-expanded', 'false');
    btnHeroGrowthInfo.focus();
  }

  if (btnHeroGrowthInfo) {
    btnHeroGrowthInfo.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = btnHeroGrowthInfo.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeDisclaimerPopup();
      } else {
        openDisclaimerPopup();
      }
    });

    if (btnHeroClosePopup) {
      btnHeroClosePopup.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDisclaimerPopup();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && heroGrowthPopup && !heroGrowthPopup.classList.contains('is-hidden')) {
        closeDisclaimerPopup();
      }
    });

    document.addEventListener('click', (e) => {
      if (heroGrowthPopup && !heroGrowthPopup.classList.contains('is-hidden')) {
        if (!heroGrowthPopup.contains(e.target) && e.target !== btnHeroGrowthInfo && !btnHeroGrowthInfo.contains(e.target)) {
          closeDisclaimerPopup();
        }
      }
    });
  }

  // 3. Mobile-Only Leadership Carousel Controller
  const leaderTrack = document.getElementById('leadershipCarouselTrack');
  const leaderCards = leaderTrack ? leaderTrack.querySelectorAll('.leadership-card') : [];
  const leaderDots = document.querySelectorAll('.carousel-dot-btn');
  const btnLeaderPrev = document.getElementById('btnLeaderPrev');
  const btnLeaderNext = document.getElementById('btnLeaderNext');

  let currentLeaderIndex = 0;

  function getLeaderCardOffset(index) {
    if (!leaderTrack || !leaderCards[index]) return 0;
    const card = leaderCards[index];
    return card.offsetLeft - leaderTrack.offsetLeft;
  }

  function scrollLeaderTo(index, instant) {
    if (!leaderTrack || index < 0 || index >= leaderCards.length) return;
    currentLeaderIndex = index;
    const targetLeft = getLeaderCardOffset(index);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    leaderTrack.scrollTo({
      left: targetLeft,
      behavior: instant || prefersReducedMotion ? 'auto' : 'smooth'
    });
    updateLeaderControls(index);
  }

  function updateLeaderControls(activeIndex) {
    currentLeaderIndex = activeIndex;
    leaderDots.forEach((dot, idx) => {
      const isActive = idx === activeIndex;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      dot.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    const leaderLiveStatus = document.getElementById('leaderLiveStatus');
    if (leaderLiveStatus && leaderCards[activeIndex]) {
      const leaderName = leaderCards[activeIndex].querySelector('.leader-name')?.textContent?.trim() || '';
      leaderLiveStatus.textContent = `Showing slide ${activeIndex + 1} of ${leaderCards.length}${leaderName ? ': ' + leaderName : ''}`;
    }

    if (btnLeaderPrev) {
      btnLeaderPrev.disabled = activeIndex <= 0;
    }
    if (btnLeaderNext) {
      btnLeaderNext.disabled = activeIndex >= leaderCards.length - 1;
    }
  }

  if (leaderTrack && leaderCards.length > 0) {
    let scrollTimeout = null;

    leaderTrack.addEventListener('scroll', () => {
      if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
      scrollTimeout = requestAnimationFrame(() => {
        const scrollLeft = leaderTrack.scrollLeft;
        let closestIndex = 0;
        let minDiff = Infinity;

        leaderCards.forEach((card, idx) => {
          const cardLeft = card.offsetLeft - leaderTrack.offsetLeft;
          const diff = Math.abs(cardLeft - scrollLeft);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = idx;
          }
        });

        if (closestIndex !== currentLeaderIndex) {
          updateLeaderControls(closestIndex);
        }
      });
    }, { passive: true });

    // Click on position dots
    leaderDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const targetIdx = parseInt(dot.getAttribute('data-slide-index'), 10);
        if (!isNaN(targetIdx)) {
          scrollLeaderTo(targetIdx);
        }
      });
    });

    // Arrow controls
    if (btnLeaderPrev) {
      btnLeaderPrev.addEventListener('click', () => {
        if (currentLeaderIndex > 0) {
          scrollLeaderTo(currentLeaderIndex - 1);
        }
      });
    }

    if (btnLeaderNext) {
      btnLeaderNext.addEventListener('click', () => {
        if (currentLeaderIndex < leaderCards.length - 1) {
          scrollLeaderTo(currentLeaderIndex + 1);
        }
      });
    }

    // Keyboard navigation on track
    leaderTrack.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        if (currentLeaderIndex < leaderCards.length - 1) {
          e.preventDefault();
          scrollLeaderTo(currentLeaderIndex + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentLeaderIndex > 0) {
          e.preventDefault();
          scrollLeaderTo(currentLeaderIndex - 1);
        }
      }
    });

    // Initial sync
    updateLeaderControls(0);
  }

  // GSAP Hero Animation: Message-Led Choreography
  function initHeroAnimation() {
    // 1. Fallback & Safe Degradation Check
    if (typeof gsap === 'undefined') {
      return null;
    }

    // 2. Accessibility & Reduced Motion Check
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Retain all elements in their 100% static computed states
      return null;
    }

    const heroHeadline = document.querySelector('.hero-headline');
    const heroCard = document.querySelector('.hero-card-container');
    const curveScripbox = document.querySelector('.curve-scripbox');
    const curveBenchmark = document.querySelector('.curve-benchmark');
    const curveFill = document.querySelector('.curve-fill');
    const nodeOrigin = document.querySelector('.node-origin');
    const nodeScripbox = document.querySelector('.node-scripbox');
    const nodeBenchmark = document.querySelector('.node-benchmark');
    const pillScripbox = document.querySelector('.pill-group-scripbox');
    const pillBenchmark = document.querySelector('.pill-group-benchmark');
    const heroStatSplit = document.querySelector('.hero-stat-split');
    const heroSubhead = document.querySelector('.hero-subhead');
    const heroCta = document.querySelector('.hero-cta-container');

    if (!heroHeadline || !heroCard) {
      return null;
    }

    // Single coordinated master timeline: Editorial Compounding Arc (~2.0s)
    const tl = gsap.timeline({
      defaults: {
        ease: 'power2.out'
      }
    });

    // =========================================================================
    // ACT 1 — ESTABLISH THE MESSAGE (0.00s – 0.55s)
    // =========================================================================

    // 1. Headline entrance: Restrained upward movement with opacity transition
    tl.fromTo(heroHeadline,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      0.0
    );

    // 2. Supporting copy: Fades in directly below headline
    if (heroSubhead) {
      tl.fromTo(heroSubhead,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
        0.20
      );
    }

    // [0.55s – 0.80s: Intentional anticipation pause for visitor comprehension]

    // =========================================================================
    // ACT 2 — REVEAL THE COMPOUNDING STORY (0.80s – 2.04s)
    // =========================================================================

    // 3. Chart origin point: 2022 origin starting node anchors the baseline
    if (nodeOrigin) {
      tl.fromTo(nodeOrigin,
        { opacity: 0, scale: 0.4, transformOrigin: 'center center' },
        { opacity: 1, scale: 1, duration: 0.20, ease: 'power2.out' },
        0.80
      );
    }

    // 4. Progressive curve drawing:
    // Benchmark curve traces steadily left to right across the 2022-2026 timeline
    if (curveBenchmark) {
      tl.fromTo(curveBenchmark,
        { strokeDashoffset: 100 },
        { strokeDashoffset: 0, duration: 0.66, ease: 'power2.inOut' },
        0.86
      );
    }

    // Scripbox performance curve draws progressively alongside, ascending toward the apex
    if (curveScripbox) {
      tl.fromTo(curveScripbox,
        { strokeDashoffset: 100 },
        { strokeDashoffset: 0, duration: 0.72, ease: 'power2.inOut' },
        0.86
      );
    }

    // Atmospheric muted sage gradient fill softly emerges as Scripbox outpaces benchmark
    if (curveFill) {
      tl.fromTo(curveFill,
        { opacity: 0 },
        { opacity: 1, duration: 0.46, ease: 'power1.out' },
        1.12
      );
    }

    // 5. Endpoint markers and values:
    // Terminal connection nodes land as curves arrive at their terminal coordinates
    if (nodeBenchmark) {
      tl.fromTo(nodeBenchmark,
        { opacity: 0, scale: 0.4, transformOrigin: 'center center' },
        { opacity: 1, scale: 1, duration: 0.18, ease: 'power2.out' },
        1.50
      );
    }
    if (nodeScripbox) {
      tl.fromTo(nodeScripbox,
        { opacity: 0, scale: 0.4, transformOrigin: 'center center' },
        { opacity: 1, scale: 1, duration: 0.20, ease: 'power2.out' },
        1.54
      );
    }

    // Performance summary values (₹2.47 Cr vs ₹1.62 Cr) resolve crisply at curve apex
    if (heroStatSplit) {
      tl.fromTo(heroStatSplit,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.34, ease: 'power2.out' },
        1.52
      );
    }

    // 6. Canonical CTA entrance: Brings focus and settles bottom anchor by ~2.00s
    if (heroCta) {
      tl.fromTo(heroCta,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.36, ease: 'power2.out' },
        1.68
      );
    }

    // Dynamic reduced-motion preference change listener
    if (window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleMotionChange = (e) => {
        if (e.matches) {
          tl.progress(1);
        }
      };
      if (typeof motionQuery.addEventListener === 'function') {
        motionQuery.addEventListener('change', handleMotionChange);
      } else if (typeof motionQuery.addListener === 'function') {
        motionQuery.addListener(handleMotionChange);
      }
    }

    return tl;
  }

  const heroTl = initHeroAnimation();

  // Expose state and functions for testing inspection
  window.__sbFormState = formState;
  window.__sbGoToStep = goToStep;
  window.__sbUpdatePerformancePeriod = updatePerformancePeriod;
  window.__sbOpenDisclaimerPopup = openDisclaimerPopup;
  window.__sbCloseDisclaimerPopup = closeDisclaimerPopup;
  window.__sbScrollLeadership = scrollLeaderTo;
  window.__sbHeroTimeline = heroTl;
})();
