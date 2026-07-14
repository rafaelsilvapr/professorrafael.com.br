(function () {
  'use strict';

  const config = window.__SITE_ANALYTICS__ || {};
  const preferenceKey = 'site_analytics_consent_v1';
  const gaId = String(config.ga4MeasurementId || '').trim();
  const cloudflareToken = String(config.cloudflareToken || '').trim();
  let gaLoaded = false;

  function loadCloudflare() {
    if (!cloudflareToken || document.querySelector('script[data-cf-beacon]')) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = JSON.stringify({ token: cloudflareToken });
    document.head.appendChild(script);
  }

  function loadGoogleAnalytics() {
    if (!gaId || gaLoaded) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId, {
      send_page_view: true,
      content_group: config.site || 'site',
      language: config.language || document.documentElement.lang || 'pt-BR'
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);
  }

  function preference() {
    try { return localStorage.getItem(preferenceKey); } catch { return null; }
  }

  function savePreference(value) {
    try { localStorage.setItem(preferenceKey, value); } catch { /* armazenamento indisponível */ }
  }

  function removeBanner() {
    document.querySelector('[data-analytics-consent]')?.remove();
  }

  function choose(value) {
    savePreference(value);
    removeBanner();
    if (value === 'granted') loadGoogleAnalytics();
  }

  function showBanner() {
    if (!gaId || document.querySelector('[data-analytics-consent]')) return;
    const banner = document.createElement('section');
    banner.className = 'privacy-banner';
    banner.dataset.analyticsConsent = '';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferências de privacidade');
    banner.innerHTML = `<div><strong>Métricas e privacidade</strong><p>Usamos métricas agregadas para entender o acesso. Com sua autorização, o Google Analytics também registra sessões e interações. Você pode aceitar ou recusar sem perder nenhuma função do site. <a href="/privacidade/">Saiba mais</a>.</p></div><div class="privacy-actions"><button type="button" class="privacy-reject" data-consent="denied">Recusar analytics</button><button type="button" class="privacy-accept" data-consent="granted">Aceitar analytics</button></div>`;
    banner.addEventListener('click', (event) => {
      const button = event.target.closest('[data-consent]');
      if (button) choose(button.dataset.consent);
    });
    document.body.appendChild(banner);
  }

  window.siteAnalyticsEvent = function (name, parameters = {}) {
    if (preference() !== 'granted' || !gaLoaded || typeof window.gtag !== 'function') return;
    window.gtag('event', name, {
      site_name: config.site || 'site',
      content_language: config.language || document.documentElement.lang || 'pt-BR',
      ...parameters
    });
  };

  function eventNameForLink(link) {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('mailto:')) return 'contact_click';
    if (/\.pdf(?:$|[?#])/i.test(href)) return 'file_download';
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return 'outbound_click';
      if (/\/(imagens|livros|conceitos)\//.test(url.pathname)) return 'item_open';
      if (/\/percursos\//.test(url.pathname)) return 'route_open';
    } catch { return null; }
    return null;
  }

  document.addEventListener('click', (event) => {
    const privacyButton = event.target.closest('[data-open-privacy]');
    if (privacyButton) {
      event.preventDefault();
      showBanner();
      return;
    }
    const link = event.target.closest('a[href]');
    if (!link) return;
    const eventName = link.dataset.analyticsEvent || eventNameForLink(link);
    if (!eventName) return;
    window.siteAnalyticsEvent(eventName, {
      link_url: link.href,
      link_text: (link.textContent || '').trim().slice(0, 120)
    });
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.matches('.signup')) window.siteAnalyticsEvent('newsletter_submit');
    if (form.matches('.hero-search')) {
      const query = new FormData(form).get('q');
      window.siteAnalyticsEvent('search', { search_term: String(query || '').trim().slice(0, 100) });
    }
  });

  loadCloudflare();
  if (preference() === 'granted') loadGoogleAnalytics();
  else if (preference() !== 'denied') showBanner();
}());
