/**
 * Runtime Security & Anti-Scraping Protection
 * 
 * Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

class SecurityManager {
  private isProduction = import.meta.env.PROD;
  private allowedDomains = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'sync2gear.com',
    'www.sync2gear.com',
    'app.sync2gear.com',
    // Development domains (Vite, Figma, etc.)
    'figma.com',
    'bolt.new',
    // Add your production domains here
  ];
  
  private devToolsOpen = false;
  private integrityCheckInterval: number | null = null;

  constructor() {
    // Only run security in production builds
    if (this.isProduction) {
      this.initialize();
    }
  }

  /**
   * Initialize all security checks
   */
  private initialize() {
    this.checkDomain();
    this.detectDevTools();
    this.disableConsole();
    this.disableRightClick();
    this.preventTextSelection();
    this.startIntegrityCheck();
    this.addCopyrightNotice();
  }

  /**
   * Check if running on authorized domain
   */
  private checkDomain() {
    const currentDomain = window.location.hostname;
    const isAllowed = this.allowedDomains.some(domain => 
      currentDomain === domain || currentDomain.endsWith('.' + domain)
    );

    if (!isAllowed && this.isProduction) {
      console.error('Unauthorized domain detected');
      this.handleUnauthorizedAccess();
    }
  }

  /**
   * Detect if DevTools is open
   */
  private detectDevTools() {
    // Method 1: Console detection
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: () => {
        this.devToolsOpen = true;
        this.handleDevToolsOpen();
        return 'detected';
      }
    });

    // Method 2: Debugger detection
    setInterval(() => {
      const startTime = performance.now();
      debugger; // Will pause if DevTools is open
      const endTime = performance.now();
      
      if (endTime - startTime > 100) {
        this.devToolsOpen = true;
        this.handleDevToolsOpen();
      }
    }, 1000);

    // Method 3: Window size detection (DevTools changes window size)
    const checkResize = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        this.devToolsOpen = true;
        this.handleDevToolsOpen();
      }
    };

    window.addEventListener('resize', checkResize);
    checkResize();
  }

  /**
   * Handle DevTools being opened
   */
  private handleDevToolsOpen() {
    if (!this.isProduction) return;

    // Log to server (implement your logging endpoint)
    this.logSecurityEvent('devtools_opened');

    // Optional: Redirect or show warning
    // window.location.href = '/unauthorized';
    
    // For now, just clear the page
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; text-align: center; padding: 20px;">
        <div>
          <h1 style="color: #dc2626; margin-bottom: 16px;">Access Restricted</h1>
          <p style="color: #64748b; margin-bottom: 24px;">Developer tools are not permitted on this application.</p>
          <p style="color: #94a3b8; font-size: 14px;">
            © 2025 sync2gear Ltd. All Rights Reserved.<br>
            Unauthorized access attempts are logged and may be reported.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Handle unauthorized domain access
   */
  private handleUnauthorizedAccess() {
    this.logSecurityEvent('unauthorized_domain', {
      domain: window.location.hostname,
      url: window.location.href,
    });

    // Show unauthorized message
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; text-align: center; padding: 20px;">
        <div>
          <h1 style="color: #dc2626; margin-bottom: 16px;">Unauthorized Access</h1>
          <p style="color: #64748b; margin-bottom: 8px;">This software is licensed to sync2gear Ltd. only.</p>
          <p style="color: #64748b; margin-bottom: 24px;">Running on unauthorized domains is prohibited.</p>
          <p style="color: #94a3b8; font-size: 14px;">
            © 2025 sync2gear Ltd. All Rights Reserved.<br>
            Protected by copyright and trademark law.<br>
            <strong>This incident has been logged.</strong>
          </p>
        </div>
      </div>
    `;

    // Prevent any further execution
    throw new Error('Unauthorized domain');
  }

  /**
   * Disable console in production
   */
  private disableConsole() {
    if (!this.isProduction) return;

    const noop = () => {};
    const methods = ['log', 'debug', 'info', 'warn', 'error', 'trace', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'profile', 'profileEnd', 'clear', 'table'];
    
    methods.forEach(method => {
      (console as any)[method] = noop;
    });
  }

  /**
   * Disable right-click context menu
   */
  private disableRightClick() {
    if (!this.isProduction) return;

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
  }

  /**
   * Prevent text selection (makes copying harder)
   */
  private preventTextSelection() {
    if (!this.isProduction) return;

    // Add CSS to prevent selection
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      input, textarea {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
    `;
    document.head.appendChild(style);

    // Prevent keyboard shortcuts for inspect
    document.addEventListener('keydown', (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        return false;
      }
    });
  }

  /**
   * Check code integrity periodically
   */
  private startIntegrityCheck() {
    if (!this.isProduction) return;

    // Check every 30 seconds
    this.integrityCheckInterval = window.setInterval(() => {
      this.checkIntegrity();
    }, 30000);
  }

  /**
   * Verify code hasn't been tampered with
   */
  private checkIntegrity() {
    // Check if critical functions still exist
    const criticalFunctions = [
      'fetch',
      'XMLHttpRequest',
      'localStorage',
      'sessionStorage',
    ];

    for (const func of criticalFunctions) {
      if (typeof (window as any)[func] !== 'function' && typeof (window as any)[func] !== 'object') {
        this.logSecurityEvent('integrity_violation', { function: func });
      }
    }
  }

  /**
   * Add copyright notice to console
   */
  private addCopyrightNotice() {
    if (!this.isProduction) return;

    // This will be one of the last console logs before we disable it
    const style = 'color: #dc2626; font-size: 20px; font-weight: bold;';
    console.log('%c⚠️ WARNING', style);
    console.log('%cThis application is proprietary software.', 'font-size: 14px;');
    console.log('%c© 2025 sync2gear Ltd. All Rights Reserved.', 'font-size: 12px;');
    console.log('%cUnauthorized access, copying, or reverse engineering is prohibited.', 'font-size: 12px; color: #dc2626;');
    console.log('%cViolations will be prosecuted under copyright and computer fraud laws.', 'font-size: 12px; color: #dc2626;');
  }

  /**
   * Log security events (implement your endpoint)
   */
  private logSecurityEvent(event: string, data?: any) {
    // In production, send to your logging endpoint
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      domain: window.location.hostname,
    };

    // Send to your backend
    if (this.isProduction) {
      fetch('/api/security-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silently fail - don't expose logging mechanism
      });
    }

    // For development
    if (!this.isProduction) {
      console.warn('[Security Event]', payload);
    }
  }

  /**
   * Get security status
   */
  public getStatus() {
    return {
      isProduction: this.isProduction,
      devToolsOpen: this.devToolsOpen,
      domain: window.location.hostname,
      isAuthorizedDomain: this.allowedDomains.some(domain => 
        window.location.hostname === domain || 
        window.location.hostname.endsWith('.' + domain)
      ),
    };
  }

  /**
   * Cleanup
   */
  public destroy() {
    if (this.integrityCheckInterval) {
      clearInterval(this.integrityCheckInterval);
    }
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();

// Make it harder to access
Object.freeze(securityManager);