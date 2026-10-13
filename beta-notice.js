(function initSharedBetaNotice() {
  "use strict";

  const STORAGE_KEY = "uk-aq-beta-notice-dismissed";
  const LEGACY_STORAGE_KEY = "uk-aq-hex-map-beta-notice-minimised";
  const DISMISSED_VALUE = "true";
  const EXPANDED_VALUE = "false";
  const mounts = Array.from(document.querySelectorAll("[data-ukaq-beta-notice-mount]"));

  if (!mounts.length) return;

  const attribution = window.UkAqSourceAttribution;
  let sources = [];

  function sourceHtml() {
    if (!sources.length) return "";
    const links = sources.map((source) =>
      '<a href="' + source.href + '" target="_blank" rel="noopener noreferrer">' + source.name + '</a>');
    const names = links.length === 1 ? links[0]
      : links.length === 2 ? links.join(" and ")
        : links.slice(0, -1).join(", ") + ", and " + links[links.length - 1];
    return " For authoritative readings, refer to the source networks: " + names + ".";
  }

  function updateSources(codes) {
    sources = attribution.sourcesFor(codes);
    // Updating only this span preserves the current pill/expanded state and
    // keyboard focus, including a dismissal made while resolution was pending.
    mounts.forEach((mount) => {
      const sourceText = mount.querySelector("[data-ukaq-beta-notice-sources]");
      if (sourceText) sourceText.innerHTML = sourceHtml();
    });
  }

  const safeStorage = (() => {
    try {
      const storage = window.localStorage;
      const testKey = "__ukaq_beta_notice_test__";
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return storage;
    } catch (_) {
      return null;
    }
  })();

  function readDismissed() {
    if (!safeStorage) return false;
    const current = safeStorage.getItem(STORAGE_KEY);
    if (current === DISMISSED_VALUE) return true;
    if (current === EXPANDED_VALUE) return false;
    const legacy = safeStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === DISMISSED_VALUE) {
      safeStorage.setItem(STORAGE_KEY, DISMISSED_VALUE);
      return true;
    }
    return false;
  }

  function writeDismissed(isDismissed) {
    if (!safeStorage) return;
    safeStorage.setItem(STORAGE_KEY, isDismissed ? DISMISSED_VALUE : EXPANDED_VALUE);
  }

  function noticeHtml() {
    return '<section class="ukaq-beta-notice ukaq-beta-notice--expanded" aria-label="Beta data notice">' +
      '<div class="ukaq-beta-notice__header">' +
      '<span class="ukaq-beta-notice__title">Beta notice</span>' +
      '<button type="button" class="ukaq-beta-notice__dismiss" data-ukaq-beta-notice-dismiss aria-expanded="true" aria-label="Dismiss beta notice">Dismiss</button>' +
      '</div>' +
      '<div class="ukaq-beta-notice__body">' +
      'Sensor data shown here is provisional and may change. Do not cite it as official data.' +
      '<span data-ukaq-beta-notice-sources>' + sourceHtml() + '</span>' +
      '</div>' +
      '</section>';
  }

  function pillHtml() {
    return '<button type="button" class="ukaq-beta-notice ukaq-beta-notice__pill" data-ukaq-beta-notice-expand aria-expanded="false" aria-label="Expand beta notice">Beta notice</button>';
  }

  function render(isDismissed, focusSelector) {
    mounts.forEach((mount) => {
      mount.innerHTML = isDismissed ? pillHtml() : noticeHtml();
      if (focusSelector) {
        mount.querySelector(focusSelector)?.focus({ preventScroll: true });
      }
    });
  }

  let dismissed = readDismissed();
  render(dismissed);

  if (attribution) {
    const resolveSources = () => { void attribution.resolveCodes().then(updateSources); };
    // Deferred page modules can publish/load the shared client before we decide
    // whether a direct metadata request is needed (notably on the Hex Map).
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", resolveSources, { once: true });
    } else {
      resolveSources();
    }
    window.addEventListener("ukaq:public-network-catalog", (event) => {
      try {
        updateSources(attribution.normaliseCodes(event.detail?.rows, event.detail?.contractVersion));
      } catch (_) {
        // Keep the resolved source list when a later catalogue is rejected.
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-ukaq-beta-notice-dismiss]")) {
      dismissed = true;
      writeDismissed(dismissed);
      render(dismissed, "[data-ukaq-beta-notice-expand]");
    } else if (event.target.closest("[data-ukaq-beta-notice-expand]")) {
      dismissed = false;
      writeDismissed(dismissed);
      render(dismissed, "[data-ukaq-beta-notice-dismiss]");
    }
  });
})();
