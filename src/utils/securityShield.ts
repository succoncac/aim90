/**
 * SecurityShield - Client-side Anti-DevTools, Anti-Scraping, Anti-Bot & Polymorphic Protection
 * Protects application source code, API pipelines, and state integrity.
 */

export interface SecurityStatus {
  isDevToolsOpen: boolean;
  isBotDetected: boolean;
  isTampered: boolean;
  threatLevel: 'CLEAN' | 'WARNING' | 'BREACH';
}

type SecurityListener = (status: SecurityStatus) => void;

class SecurityShieldEngine {
  private listeners: Set<SecurityListener> = new Set();
  private devToolsOpen = false;
  private botDetected = false;
  private tampered = false;
  private intervalId: number | null = null;
  private isInitialized = false;

  constructor() {
    // Lazy initialized on client mount
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    this.checkBotSignatures();
    this.bindKeyboardTraps();
    this.bindContextMenuTraps();
    this.startDetectionCycle();
  }

  public subscribe(listener: SecurityListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial status
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): SecurityStatus {
    const isThreat = this.devToolsOpen || this.botDetected || this.tampered;
    return {
      isDevToolsOpen: this.devToolsOpen,
      isBotDetected: this.botDetected,
      isTampered: this.tampered,
      threatLevel: this.tampered || this.botDetected ? 'BREACH' : this.devToolsOpen ? 'WARNING' : 'CLEAN',
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error(err);
      }
    });
  }

  /**
   * Detects Headless Browsers, Automated Scrapers, Selenium, Puppeteer, Playwright
   */
  private checkBotSignatures() {
    try {
      const nav = window.navigator as any;
      const ua = (nav.userAgent || '').toLowerCase();

      // Check 1: Webdriver flag
      if (nav.webdriver === true) {
        this.botDetected = true;
      }

      // Check 2: Headless UA keywords
      const botKeywords = [
        'headlesschrome',
        'phantomjs',
        'puppeteer',
        'playwright',
        'selenium',
        'bot',
        'crawl',
        'spider',
        'wget',
        'curl',
        'python-requests',
      ];
      if (botKeywords.some((kw) => ua.includes(kw))) {
        this.botDetected = true;
      }

      // Check 3: Automation properties injected into window
      const win = window as any;
      if (
        win._phantom ||
        win.callPhantom ||
        win.__nightmare ||
        win.cdc_adoQpoasnfa76pfcZLmcfl_Array ||
        win.document.__selenium_unwrapped ||
        win.document.__webdriver_evaluate ||
        win.document.__driver_evaluate
      ) {
        this.botDetected = true;
      }

      // Check 4: Missing standard plugins in full browser
      if (nav.plugins && nav.plugins.length === 0 && !ua.includes('mobile')) {
        // High likelihood of headless browser environment
        if (ua.includes('linux') || ua.includes('x11')) {
          this.botDetected = true;
        }
      }

      if (this.botDetected) {
        this.notify();
      }
    } catch {
      // Ignore detection errors in restricted environments
    }
  }

  /**
   * Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S, Cmd+Option+I, etc.
   */
  private bindKeyboardTraps() {
    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        const key = e.key;
        const code = e.keyCode || e.which;
        const isCtrlOrMeta = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const isAlt = e.altKey;

        // F12 key
        if (key === 'F12' || code === 123) {
          e.preventDefault();
          e.stopPropagation();
          this.triggerDevToolsTrap();
          return false;
        }

        // Ctrl + Shift + I (Inspect) or Cmd + Alt + I
        if (isCtrlOrMeta && (isShift || isAlt) && (key === 'I' || key === 'i' || code === 73)) {
          e.preventDefault();
          e.stopPropagation();
          this.triggerDevToolsTrap();
          return false;
        }

        // Ctrl + Shift + J (Console) or Cmd + Alt + J
        if (isCtrlOrMeta && (isShift || isAlt) && (key === 'J' || key === 'j' || code === 74)) {
          e.preventDefault();
          e.stopPropagation();
          this.triggerDevToolsTrap();
          return false;
        }

        // Ctrl + Shift + C (Element Inspector) or Cmd + Alt + C
        if (isCtrlOrMeta && (isShift || isAlt) && (key === 'C' || key === 'c' || code === 67)) {
          e.preventDefault();
          e.stopPropagation();
          this.triggerDevToolsTrap();
          return false;
        }

        // Ctrl + U / Cmd + U (View Source)
        if (isCtrlOrMeta && !isShift && (key === 'U' || key === 'u' || code === 85)) {
          e.preventDefault();
          e.stopPropagation();
          this.triggerDevToolsTrap();
          return false;
        }

        // Ctrl + S / Cmd + S (Save Page / Steal Assets)
        if (isCtrlOrMeta && !isShift && (key === 'S' || key === 's' || code === 83)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      },
      { capture: true }
    );
  }

  /**
   * Block right click contextmenu while allowing normal typing and input selection
   */
  private bindContextMenuTraps() {
    window.addEventListener(
      'contextmenu',
      (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        // Allow text contextmenu inside editable inputs / textareas if desired
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
      },
      { capture: true }
    );

    // Prevent drag and drop of sensitive code blocks to external inspector
    window.addEventListener('dragstart', (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('.code-block, pre, code')) {
        e.preventDefault();
      }
    });
  }

  private triggerDevToolsTrap() {
    this.devToolsOpen = true;
    this.notify();
  }

  /**
   * Continuous multi-vector DevTools & anti-tamper detection cycle
   */
  private startDetectionCycle() {
    if (this.intervalId) return;

    // Vector 1: Console Object Getter / toString trap
    const elementTrap = new Image();
    Object.defineProperty(elementTrap, 'id', {
      get: () => {
        if (!this.devToolsOpen) {
          this.devToolsOpen = true;
          this.notify();
        }
        return 'anti-tamper-id';
      },
      configurable: true,
    });

    const runChecks = () => {
      let isOpenNow = false;

      // Vector 1: Geometry difference (Docked DevTools)
      const widthDelta = window.outerWidth - window.innerWidth > 160;
      const heightDelta = window.outerHeight - window.innerHeight > 160;
      if (widthDelta || heightDelta) {
        isOpenNow = true;
      }

      // Vector 2: Timing trap (Debugger breakpoint stall)
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        isOpenNow = true;
      }

      // Update state
      if (isOpenNow !== this.devToolsOpen) {
        this.devToolsOpen = isOpenNow;
        this.notify();
      }
    };

    // Run periodically
    this.intervalId = window.setInterval(runChecks, 1500);
  }

  public destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}

export const securityShield = new SecurityShieldEngine();

/**
 * Polymorphic Noise Generator: generates randomized decoy structure
 * when an unauthorized inspection or scraping attempt is detected
 */
export function generatePolymorphicDecoy(): string {
  const chars = '0123456789ABCDEFabcdef_xX';
  const makeId = (len = 10) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  
  return `
    <div id="decoy-${makeId(8)}" class="obf-container-${makeId(6)}" style="padding: 2rem; font-family: monospace; color: #475569;">
      <div data-v="${makeId(16)}" class="noise-layer-${makeId(4)}">
        <!-- [SECURITY POLICIES ACTIVE] Virtual Decoy Node Tree -->
        <span class="x-${makeId(4)}">ENC_${makeId(32)}</span>
        <div class="scramble-block-${makeId(5)}">0x${makeId(64)}</div>
      </div>
    </div>
  `;
}
