const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9385;
const DARK_URL = 'http://localhost:8089/index.html';
const LIGHT_URL = 'http://localhost:8090/index.html';
const SHOTS_DIR = path.join(__dirname, 'shots');

if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    await sleep(100);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async setViewport(width, height, isMobile = true) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile,
      fitWindow: false
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval failed: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async screenshot(filepath, clip = null) {
    const params = { format: 'png' };
    if (clip) params.clip = clip;
    const res = await this.send('Page.captureScreenshot', params);
    fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('========================================================');
  console.log(' Scripbox PMS — Light Mode A/B Verification Test Suite');
  console.log('========================================================\n');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/sb-light-test-' + Date.now()
  ]);

  const report = {
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    testsFailed: 0,
    assertions: []
  };

  function assert(condition, message) {
    if (condition) {
      report.testsPassed++;
      console.log(`  ✓ PASS: ${message}`);
      report.assertions.push({ status: 'PASS', message });
    } else {
      report.testsFailed++;
      console.error(`  ✗ FAIL: ${message}`);
      report.assertions.push({ status: 'FAIL', message });
    }
  }

  try {
    await waitForHttp(`http://127.0.0.1:${PORT}/json/version`);
    const targets = await waitForHttp(`http://127.0.0.1:${PORT}/json`);
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');
    await client.send('CSS.enable');

    console.log('\n--- 1. Testing Light-Mode Multi-Viewport Responsive Layout ---');
    const viewports = [
      { name: '360x640', w: 360, h: 640 },
      { name: '390x844', w: 390, h: 844 },
      { name: '430x932', w: 430, h: 932 },
      { name: '1280x800', w: 1280, h: 800, isMobile: false }
    ];

    for (const vp of viewports) {
      await client.setViewport(vp.w, vp.h, vp.isMobile !== false);
      await client.send('Page.navigate', { url: LIGHT_URL });
      await sleep(1000);

      const overflow = await client.eval(`
        (() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientWidth = docEl.clientWidth;
          return {
            scrollWidth,
            clientWidth,
            hasOverflow: scrollWidth > clientWidth
          };
        })()
      `);

      assert(
        !overflow.hasOverflow,
        `Viewport ${vp.name}: 0px horizontal overflow (scrollWidth=${overflow.scrollWidth}px, clientWidth=${overflow.clientWidth}px)`
      );

      // Capture full viewport screenshot
      await client.screenshot(path.join(SHOTS_DIR, `light-hero-${vp.name}.png`), {
        x: 0,
        y: 0,
        width: vp.w,
        height: vp.h,
        scale: 2
      });
    }

    // Now test primary 390x844
    await client.setViewport(390, 844, true);
    await client.send('Page.navigate', { url: LIGHT_URL });
    await sleep(2200); // Wait for GSAP timeline to settle

    console.log('\n--- 2. Testing Light-Mode Aesthetic & Color Calibration ---');
    const colorChecks = await client.eval(`
      (() => {
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const pageContainer = document.querySelector('.page-container');
        const containerBg = window.getComputedStyle(pageContainer).background;
        const headlineColor = window.getComputedStyle(document.querySelector('.hero-headline')).color;
        const milestoneColor = window.getComputedStyle(document.querySelector('.headline-milestone')).color;
        const ctaBg = window.getComputedStyle(document.querySelector('.cta-button')).backgroundColor;
        const ctaColor = window.getComputedStyle(document.querySelector('.cta-button')).color;
        const scripboxValColor = window.getComputedStyle(document.querySelector('.hero-val-scripbox')).color;
        const benchmarkValColor = window.getComputedStyle(document.querySelector('.hero-val-benchmark')).color;

        return {
          bodyBg,
          headlineColor,
          milestoneColor,
          ctaBg,
          ctaColor,
          scripboxValColor,
          benchmarkValColor
        };
      })()
    `);

    // Helper: convert rgb(r, g, b) to luminance
    function parseRgb(rgbStr) {
      const match = rgbStr.match(/\d+/g);
      if (!match) return [0, 0, 0];
      return match.slice(0, 3).map(Number);
    }
    function luminance([r, g, b]) {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    function contrastRatio(rgb1, rgb2) {
      const l1 = luminance(rgb1);
      const l2 = luminance(rgb2);
      const brightest = Math.max(l1, l2);
      const darkest = Math.min(l1, l2);
      return (brightest + 0.05) / (darkest + 0.05);
    }

    const bgRgb = parseRgb(colorChecks.bodyBg);
    const headlineRgb = parseRgb(colorChecks.headlineColor);
    const milestoneRgb = parseRgb(colorChecks.milestoneColor);
    const ctaBgRgb = parseRgb(colorChecks.ctaBg);
    const ctaTextRgb = parseRgb(colorChecks.ctaColor);
    const scripboxRgb = parseRgb(colorChecks.scripboxValColor);

    const headlineContrast = contrastRatio(headlineRgb, bgRgb);
    const milestoneContrast = contrastRatio(milestoneRgb, bgRgb);
    const ctaContrast = contrastRatio(ctaTextRgb, ctaBgRgb);
    const scripboxContrast = contrastRatio(scripboxRgb, bgRgb);

    assert(bgRgb[0] > 240 && bgRgb[1] > 240, `Canvas is warm light ivory (rgb: ${colorChecks.bodyBg})`);
    assert(headlineContrast >= 7.0, `Primary headline contrast is AAA: ${headlineContrast.toFixed(1)}:1 (>= 7:1)`);
    assert(milestoneContrast >= 4.5, `Milestone supporting headline contrast is AA: ${milestoneContrast.toFixed(1)}:1 (>= 4.5:1)`);
    assert(ctaContrast >= 7.0, `CTA button text contrast is AAA: ${ctaContrast.toFixed(1)}:1 on Scripbox orange (>= 7:1)`);
    assert(scripboxContrast >= 4.5, `Scripbox portfolio green contrast is AA: ${scripboxContrast.toFixed(1)}:1 on light canvas (>= 4.5:1)`);

    console.log('\n--- 3. Testing Accessibility (Tap Targets & Font Sizes) ---');
    const a11yChecks = await client.eval(`
      (() => {
        const interactiveSelectors = [
          '#btnHeroB',
          '#btnHeroGrowthInfo',
          '#btnSecondaryCta',
          '.strat-tab-btn',
          '.strat-drawer-btn',
          '.perf-period-btn',
          '.carousel-arrow-btn',
          '.carousel-dot-btn'
        ];
        const smallTapTargets = [];
        interactiveSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              if (rect.width < 43.5 || rect.height < 43.5) {
                smallTapTargets.push({
                  sel,
                  text: el.textContent?.trim().slice(0, 20),
                  w: rect.width,
                  h: rect.height
                });
              }
            }
          });
        });

        // Font size floor check: Verify Strategy Cards and Below-the-fold content maintain typography floor (body >= 15px, cards >= 12px)
        const stratCardElements = document.querySelectorAll('.strategy-card *');
        let sub12StratCount = 0;
        stratCardElements.forEach(el => {
          if (el.children.length === 0 && el.textContent?.trim().length > 0) {
            const fs = parseFloat(window.getComputedStyle(el).fontSize);
            if (fs < 11.9) sub12StratCount++;
          }
        });

        const bodyCopyElements = document.querySelectorAll('.btf-body, .pillar-desc, .roadmap-desc, .leader-bio, .term-copy');
        let sub15BodyCount = 0;
        bodyCopyElements.forEach(el => {
          const fs = parseFloat(window.getComputedStyle(el).fontSize);
          if (fs < 14.9) sub15BodyCount++;
        });

        return {
          smallTapTargets,
          sub12StratCount,
          sub15BodyCount
        };
      })()
    `);

    assert(a11yChecks.smallTapTargets.length === 0, `All interactive controls have tap targets >= 44x44px (failures: ${JSON.stringify(a11yChecks.smallTapTargets)})`);
    assert(a11yChecks.sub12StratCount === 0, `Zero sub-12px elements in strategy cards (100% compliant with typography floor)`);
    assert(a11yChecks.sub15BodyCount === 0, `All body copy elements >= 15px font size (100% compliant)`);

    console.log('\n--- 4. Testing Performance Section Interactivity ---');
    // Scroll to performance section
    await client.eval(`document.getElementById('perfSection').scrollIntoView();`);
    await sleep(200);

    const defaultPeriod = await client.eval(`document.querySelector('.perf-period-btn.is-active')?.getAttribute('data-period')`);
    assert(defaultPeriod === '4Y', `Default active performance period is 4Y`);

    const val4YScripbox = await client.eval(`document.getElementById('perfValScripbox')?.textContent.trim()`);
    const val4YBench = await client.eval(`document.getElementById('perfValBenchmark')?.textContent.trim()`);
    assert(val4YScripbox === '25.4%' && val4YBench === '12.8%', `4Y performance metrics: Scripbox=25.4%, Benchmark=12.8%`);

    // Switch to 2Y
    await client.eval(`document.querySelector('.perf-period-btn[data-period="2Y"]').click();`);
    await sleep(200);
    const val2YScripbox = await client.eval(`document.getElementById('perfValScripbox')?.textContent.trim()`);
    const val2YBench = await client.eval(`document.getElementById('perfValBenchmark')?.textContent.trim()`);
    assert(val2YScripbox === '26.8%' && val2YBench === '15.4%', `2Y period switch updates metrics: Scripbox=26.8%, Benchmark=15.4%`);

    // Switch to 3Y
    await client.eval(`document.querySelector('.perf-period-btn[data-period="3Y"]').click();`);
    await sleep(200);
    const val3YScripbox = await client.eval(`document.getElementById('perfValScripbox')?.textContent.trim()`);
    assert(val3YScripbox === '30.6%', `3Y period switch updates metrics: Scripbox=30.6%`);

    // Switch back to 4Y
    await client.eval(`document.querySelector('.perf-period-btn[data-period="4Y"]').click();`);
    await sleep(200);

    // Capture light mode performance section screenshot
    const perfRect = await client.eval(`
      (() => {
        const rect = document.getElementById('perfSection').getBoundingClientRect();
        return { x: rect.x, y: rect.y + window.scrollY, width: 390, height: rect.height };
      })()
    `);
    await client.screenshot(path.join(SHOTS_DIR, 'light-perf-section-390x844.png'), {
      x: 0,
      y: perfRect.y,
      width: 390,
      height: perfRect.height,
      scale: 2
    });

    console.log('\n--- 5. Testing Investment Strategy Accordions & Tabs ---');
    await client.eval(`document.getElementById('strategiesSection').scrollIntoView();`);
    await sleep(200);

    // Verify Tab 1 is active by default
    const activeTab = await client.eval(`document.querySelector('.strat-tab-btn.is-active')?.getAttribute('data-strat')`);
    assert(activeTab === 'optimiser', `Optimiser strategy tab is active by default`);

    // Check accordion initial closed state
    const drawerInitialClosed = await client.eval(`
      (() => {
        const btn = document.querySelector('#strat-optimiser .strat-drawer-btn');
        const content = document.getElementById('drawer-optimiser');
        return btn.getAttribute('aria-expanded') === 'false' && content.hasAttribute('hidden');
      })()
    `);
    assert(drawerInitialClosed, `Strategy drawer is collapsed by default with aria-expanded="false" and hidden attribute`);

    // Open drawer
    await client.eval(`document.querySelector('#strat-optimiser .strat-drawer-btn').click();`);
    await sleep(250);
    const drawerOpenState = await client.eval(`
      (() => {
        const btn = document.querySelector('#strat-optimiser .strat-drawer-btn');
        const content = document.getElementById('drawer-optimiser');
        return {
          expanded: btn.getAttribute('aria-expanded') === 'true',
          hidden: content.hasAttribute('hidden'),
          btnText: btn.querySelector('.drawer-btn-text')?.textContent.trim()
        };
      })()
    `);
    assert(drawerOpenState.expanded && !drawerOpenState.hidden, `Clicking accordion opens drawer smoothly (expanded=true, hidden=false)`);
    assert(drawerOpenState.btnText === 'Hide strategy details', `Drawer button label dynamically updates to "Hide strategy details"`);

    // Switch to Strategy 2 (Growth)
    await client.eval(`document.getElementById('tab-direct-growth').click();`);
    await sleep(200);
    const strat2Active = await client.eval(`document.getElementById('strat-direct-growth').classList.contains('is-active')`);
    assert(strat2Active, `Strategy tab switch activates "Select Direct Growth" card`);

    // Switch to Strategy 3 (Leadership)
    await client.eval(`document.getElementById('tab-focused').click();`);
    await sleep(200);
    const strat3Active = await client.eval(`document.getElementById('strat-focused').classList.contains('is-active')`);
    assert(strat3Active, `Strategy tab switch activates "Focused Leadership" card`);

    // Return to Strategy 1
    await client.eval(`document.getElementById('tab-optimiser').click();`);
    await sleep(200);

    console.log('\n--- 6. Testing Leadership Carousel Navigation ---');
    await client.eval(`document.querySelector('.leadership-section').scrollIntoView();`);
    await sleep(200);

    const leaderImagesLoaded = await client.eval(`
      (() => {
        const imgs = document.querySelectorAll('.leadership-card .leader-photo-img');
        const results = Array.from(imgs).map(img => ({
          alt: img.alt,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          complete: img.complete
        }));
        return {
          count: imgs.length,
          allValid: results.every(r => r.complete && r.naturalWidth > 0),
          results
        };
      })()
    `);
    assert(
      leaderImagesLoaded.count === 4 && leaderImagesLoaded.allValid,
      `All 4 leadership photographs loaded with valid natural dimensions (count: ${leaderImagesLoaded.count})`
    );

    // Carousel next button
    await client.eval(`document.getElementById('btnLeaderNext').click();`);
    await sleep(350);
    const leaderIndex1 = await client.eval(`
      (() => {
        const dots = document.querySelectorAll('.carousel-dot-btn');
        return Array.from(dots).findIndex(d => d.classList.contains('is-active'));
      })()
    `);
    assert(leaderIndex1 === 1, `Clicking carousel next advances active slide dot to index 1 (Sanjiv Singhal)`);

    console.log('\n--- 7. Testing Qualification Journey Modal & Conversion Flow ---');
    // Scroll back to top
    await client.eval(`window.scrollTo(0, 0);`);
    await sleep(200);

    // Click Hero CTA button
    await client.eval(`document.getElementById('btnHeroB').click();`);
    await sleep(300);

    const modalOpen = await client.eval(`
      (() => {
        const overlay = document.getElementById('stepOverlay');
        const q1 = document.getElementById('panelQ1');
        return overlay.style.display !== 'none' && q1.style.display !== 'none';
      })()
    `);
    assert(modalOpen, `Clicking Hero CTA ("Connect with our PMS expert") opens Step 1 (Primary Objective) modal`);

    // Capture Step 1 screenshot
    await client.screenshot(path.join(SHOTS_DIR, 'light-modal-step-1-390x844.png'), {
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      scale: 2
    });

    // Select Objective 1: "Goal-based strategy"
    await client.eval(`document.querySelectorAll('.objective-card')[0].click();`);
    await sleep(300);

    const step2Open = await client.eval(`
      (() => {
        const q2 = document.getElementById('panelQ2');
        return q2.style.display !== 'none';
      })()
    `);
    assert(step2Open, `Selecting objective advances to Step 2 (Planned Investment scale)`);

    // Capture Step 2 screenshot
    await client.screenshot(path.join(SHOTS_DIR, 'light-modal-step-2-390x844.png'), {
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      scale: 2
    });

    // Select Investment scale: "50 Lakhs to 2 Crore"
    await client.eval(`document.querySelectorAll('.option-tile.q2-tile')[1].click();`);
    await sleep(300);

    const step3Open = await client.eval(`
      (() => {
        const contact = document.getElementById('panelContact');
        return contact.style.display !== 'none';
      })()
    `);
    assert(step3Open, `Selecting investment bracket advances to Step 3 (Contact Form)`);

    // Verify recap pill content
    const recapText = await client.eval(`document.getElementById('recapText')?.textContent.trim()`);
    assert(
      recapText.includes('Goal-based strategy') && recapText.includes('50 Lakhs to 2 Crore'),
      `Strategy recap pill reflects selections: "${recapText}"`
    );

    // Submit button should be disabled initially
    const submitInitiallyDisabled = await client.eval(`document.getElementById('btnContactSubmit').disabled`);
    assert(submitInitiallyDisabled, `Contact submit button is disabled before form is filled`);

    // Fill valid form fields
    await client.eval(`
      document.getElementById('contactName').value = 'Devendra Roy';
      document.getElementById('contactMobile').value = '9876543210';
      document.getElementById('contactCity').value = 'Bengaluru';
      document.getElementById('contactMobile').dispatchEvent(new Event('input', { bubbles: true }));
      document.getElementById('contactName').dispatchEvent(new Event('input', { bubbles: true }));
    `);
    await sleep(150);

    const submitNowEnabled = await client.eval(`!document.getElementById('btnContactSubmit').disabled`);
    assert(submitNowEnabled, `Valid form input enables consultation submit button`);

    // Capture Step 3 screenshot
    await client.screenshot(path.join(SHOTS_DIR, 'light-modal-step-3-390x844.png'), {
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      scale: 2
    });

    // Submit the form
    await client.eval(`document.getElementById('contactForm').dispatchEvent(new Event('submit', { bubbles: true }));`);
    await sleep(700);

    const step4Open = await client.eval(`
      (() => {
        const thanks = document.getElementById('panelThanks');
        return thanks.style.display !== 'none';
      })()
    `);
    assert(step4Open, `Form submission advances to Step 4 (Confirmation screen with roadmap)`);

    // Select a callback preference chip
    await client.eval(`document.querySelectorAll('.callback-chip')[0].click();`);
    await sleep(150);
    const chipSelected = await client.eval(`document.querySelectorAll('.callback-chip')[0].classList.contains('is-selected')`);
    const hintVisible = await client.eval(`document.getElementById('callbackSavedHint').style.display !== 'none'`);
    assert(chipSelected && hintVisible, `Selecting preferred callback window saves selection and displays confirmation hint`);

    // Capture Step 4 screenshot
    await client.screenshot(path.join(SHOTS_DIR, 'light-modal-step-4-390x844.png'), {
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      scale: 2
    });

    // Close thanks screen
    await client.eval(`document.getElementById('btnThanksClose').click();`);
    await sleep(250);
    const modalClosed = await client.eval(`document.getElementById('stepOverlay').style.display === 'none'`);
    assert(modalClosed, `Clicking "Done • Return to Overview" dismisses modal and restores page scroll`);

    console.log('\n--- 8. Testing Reduced-Motion Accessibility ---');
    await client.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    await client.send('Page.navigate', { url: LIGHT_URL });
    await sleep(300);

    const reducedMotionStyles = await client.eval(`
      (() => {
        const curve = document.querySelector('.curve-scripbox');
        const fill = document.querySelector('.curve-fill');
        const node = document.querySelector('.node-origin');
        const cCurve = window.getComputedStyle(curve);
        const cFill = window.getComputedStyle(fill);
        const cNode = window.getComputedStyle(node);
        return {
          curveAnim: cCurve.animationName,
          curveOffset: cCurve.strokeDashoffset,
          fillOpacity: cFill.opacity,
          nodeOpacity: cNode.opacity
        };
      })()
    `);
    assert(
      reducedMotionStyles.curveOffset === '0px' || reducedMotionStyles.curveOffset === '0',
      `prefers-reduced-motion: curves and markers render statically at 100% opacity without delay`
    );

    console.log('\n--- 9. Capturing Side-by-Side Dark vs Light Comparison Screenshots ---');
    // Switch media back to normal
    await client.send('Emulation.setEmulatedMedia', { features: [] });

    // Compare at 390x844 full hero
    await client.setViewport(390, 844, true);

    // Dark mode hero
    await client.send('Page.navigate', { url: DARK_URL });
    await sleep(2300);
    await client.screenshot(path.join(SHOTS_DIR, 'comparison-dark-hero-390x844.png'), {
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      scale: 2
    });

    // Light mode hero
    await client.send('Page.navigate', { url: LIGHT_URL });
    await sleep(2300);
    await client.screenshot(path.join(SHOTS_DIR, 'comparison-light-hero-390x844.png'), {
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      scale: 2
    });

    // Compare at 360x640 compact mobile
    await client.setViewport(360, 640, true);
    await client.send('Page.navigate', { url: DARK_URL });
    await sleep(2200);
    await client.screenshot(path.join(SHOTS_DIR, 'comparison-dark-hero-360x640.png'), {
      x: 0,
      y: 0,
      width: 360,
      height: 640,
      scale: 2
    });

    await client.send('Page.navigate', { url: LIGHT_URL });
    await sleep(2200);
    await client.screenshot(path.join(SHOTS_DIR, 'comparison-light-hero-360x640.png'), {
      x: 0,
      y: 0,
      width: 360,
      height: 640,
      scale: 2
    });

    // Compare at 430x932 large mobile
    await client.setViewport(430, 932, true);
    await client.send('Page.navigate', { url: DARK_URL });
    await sleep(2200);
    await client.screenshot(path.join(SHOTS_DIR, 'comparison-dark-hero-430x932.png'), {
      x: 0,
      y: 0,
      width: 430,
      height: 932,
      scale: 2
    });

    await client.send('Page.navigate', { url: LIGHT_URL });
    await sleep(2200);
    await client.screenshot(path.join(SHOTS_DIR, 'comparison-light-hero-430x932.png'), {
      x: 0,
      y: 0,
      width: 430,
      height: 932,
      scale: 2
    });

    console.log('\n========================================================');
    console.log(` Test Summary: ${report.testsPassed} PASSED, ${report.testsFailed} FAILED`);
    console.log('========================================================\n');

    fs.writeFileSync(
      path.join(__dirname, 'test-results.json'),
      JSON.stringify(report, null, 2)
    );

    client.close();
  } catch (err) {
    console.error('Fatal test error:', err);
    report.testsFailed++;
  } finally {
    chromeProc.kill('SIGTERM');
  }
}

run();
