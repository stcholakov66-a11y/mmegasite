/**
 * MMEGA.NET — Main Application Controller
 * Features:
 * - Light-First Modern Theme & WCAG 2.1 AA/AAA Accessibility Suite
 * - Restricted Project Management (Strictly authorized ONLY for stoyan@mmega.net)
 * - Bilingual Support (BG / EN)
 * - Google Analytics 4 (GA4) Consent Mode v2 & Custom Event Tracking
 */

(function () {
  "use strict";

  const AUTHORIZED_ADMIN_EMAIL = "stoyan@mmega.net";
  const DEFAULT_ADMIN_PASS = "mmega2026";
  const DEFAULT_GA_ID = "G-MMEGA2026X";

  const STORAGE_KEYS = {
    PROJECTS: "mmega_projects_v5",
    LANG: "mmega_lang",
    A11Y: "mmega_a11y_prefs_v2",
    COOKIE_CONSENT: "mmega_cookie_consent",
    GA_ID: "mmega_ga_measurement_id",
    ADMIN_SESSION: "mmega_admin_session_email",
    ADMIN_PASS: "mmega_admin_pass_v1"
  };

  const state = {
    lang: localStorage.getItem(STORAGE_KEYS.LANG) || "bg",
    projects: [],
    activeFilter: "all",
    searchQuery: "",
    editingProjectId: null,
    adminEmail: sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) || "",
    gaId: localStorage.getItem(STORAGE_KEYS.GA_ID) || DEFAULT_GA_ID,
    a11y: {
      theme: "light", // Светла гама по подразбиране
      highContrast: false,
      largeFont: false,
      wideSpacing: false,
      reduceMotion: false
    }
  };

  function isAuthorizedAdmin() {
    return state.adminEmail.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL;
  }

  /* ==========================================================================
     1. GOOGLE ANALYTICS 4 (GA4) & CONSENT MANAGEMENT
     ========================================================================== */
  function initGoogleAnalytics() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    const consentStatus = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);

    window.gtag("consent", "default", {
      analytics_storage: consentStatus === "accepted" ? "granted" : "denied",
      ad_storage: "denied",
      wait_for_update: 500
    });

    window.gtag("js", new Date());
    window.gtag("config", state.gaId, {
      anonymize_ip: true,
      page_title: document.title,
      page_location: window.location.href
    });

    loadGtagScript(state.gaId);

    const cookieBanner = document.getElementById("cookieBanner");
    if (!consentStatus && cookieBanner) {
      cookieBanner.hidden = false;
    }
  }

  function loadGtagScript(measurementId) {
    if (!measurementId || !measurementId.startsWith("G-")) return;
    const existing = document.getElementById("ga4-gtag-script");
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = "ga4-gtag-script";
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function trackEvent(eventName, params = {}) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }
  }

  function handleCookieConsent(accepted) {
    localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, accepted ? "accepted" : "declined");
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: accepted ? "granted" : "denied"
      });
    }
    const cookieBanner = document.getElementById("cookieBanner");
    if (cookieBanner) {
      cookieBanner.hidden = true;
    }
    trackEvent("cookie_consent_updated", { status: accepted ? "accepted" : "declined" });
  }

  /* ==========================================================================
     2. ACCESSIBILITY (WCAG 2.1 AA/AAA) SUITE
     ========================================================================== */
  function loadA11yPrefs() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.A11Y);
      if (saved) {
        state.a11y = Object.assign({}, state.a11y, JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not read accessibility preferences:", e);
    }
    applyA11yPrefs();
  }

  function saveA11yPrefs() {
    localStorage.setItem(STORAGE_KEYS.A11Y, JSON.stringify(state.a11y));
    applyA11yPrefs();
  }

  function applyA11yPrefs() {
    const root = document.documentElement;
    root.setAttribute("data-theme", state.a11y.theme || "light");
    root.classList.toggle("a11y-high-contrast", !!state.a11y.highContrast);
    root.classList.toggle("a11y-large-font", !!state.a11y.largeFont);
    root.classList.toggle("a11y-wide-spacing", !!state.a11y.wideSpacing);
    root.classList.toggle("a11y-reduce-motion", !!state.a11y.reduceMotion);

    const btnTheme = document.getElementById("a11yToggleTheme");
    const btnContrast = document.getElementById("a11yToggleContrast");
    const btnFont = document.getElementById("a11yToggleFont");
    const btnSpacing = document.getElementById("a11yToggleSpacing");
    const btnMotion = document.getElementById("a11yToggleMotion");

    if (btnTheme) btnTheme.setAttribute("aria-pressed", String(state.a11y.theme === "dark"));
    if (btnContrast) btnContrast.setAttribute("aria-pressed", String(!!state.a11y.highContrast));
    if (btnFont) btnFont.setAttribute("aria-pressed", String(!!state.a11y.largeFont));
    if (btnSpacing) btnSpacing.setAttribute("aria-pressed", String(!!state.a11y.wideSpacing));
    if (btnMotion) btnMotion.setAttribute("aria-pressed", String(!!state.a11y.reduceMotion));
  }

  function resetA11yPrefs() {
    state.a11y = {
      theme: "light",
      highContrast: false,
      largeFont: false,
      wideSpacing: false,
      reduceMotion: false
    };
    saveA11yPrefs();
    trackEvent("a11y_reset");
  }

  /* ==========================================================================
     3. ADMIN AUTHENTICATION (Strictly restricted to stoyan@mmega.net)
     ========================================================================== */
  function syncAdminVisibility() {
    const authorized = isAuthorizedAdmin();
    document.querySelectorAll("[data-admin-only]").forEach((el) => {
      el.hidden = !authorized;
    });
    const footerAdminBtn = document.getElementById("footerAdminLoginBtn");
    if (footerAdminBtn) {
      footerAdminBtn.hidden = authorized;
    }
    renderProjects();
  }

  function openAdminLoginModal() {
    if (isAuthorizedAdmin()) return;
    const modal = document.getElementById("adminLoginModal");
    const errEl = document.getElementById("adminLoginError");
    const form = document.getElementById("adminLoginForm");
    if (!modal) return;
    if (form) form.reset();
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    modal.hidden = false;
    const emailInput = document.getElementById("adminEmailInput");
    if (emailInput) emailInput.focus();
  }

  function closeAdminLoginModal() {
    const modal = document.getElementById("adminLoginModal");
    if (modal) modal.hidden = true;
  }

  function handleAdminLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById("adminEmailInput");
    const passInput = document.getElementById("adminPasswordInput");
    const errEl = document.getElementById("adminLoginError");

    const enteredEmail = (emailInput ? emailInput.value : "").trim().toLowerCase();
    const enteredPass = passInput ? passInput.value : "";

    if (enteredEmail !== AUTHORIZED_ADMIN_EMAIL) {
      if (errEl) {
        errEl.textContent = t("adminErrorUnauthorized");
        errEl.hidden = false;
      }
      trackEvent("admin_login_denied", { reason: "unauthorized_email" });
      return;
    }

    const storedPass = localStorage.getItem(STORAGE_KEYS.ADMIN_PASS) || DEFAULT_ADMIN_PASS;
    if (enteredPass !== storedPass) {
      if (errEl) {
        errEl.textContent = t("adminErrorWrongPass");
        errEl.hidden = false;
      }
      trackEvent("admin_login_denied", { reason: "wrong_password" });
      return;
    }

    state.adminEmail = AUTHORIZED_ADMIN_EMAIL;
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, AUTHORIZED_ADMIN_EMAIL);
    closeAdminLoginModal();
    syncAdminVisibility();
    showToast(t("toastAdminLoggedIn"));
    trackEvent("admin_login_success", { admin: AUTHORIZED_ADMIN_EMAIL });
  }

  function handleAdminLogout() {
    state.adminEmail = "";
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    closeProjectModal();
    const dataModal = document.getElementById("dataSettingsModal");
    if (dataModal) dataModal.hidden = true;
    syncAdminVisibility();
    showToast(t("toastAdminLoggedOut"));
  }

  /* ==========================================================================
     4. INTERNATIONALIZATION (BG / EN)
     ========================================================================== */
  function t(key) {
    const dict = window.MMEGA_I18N[state.lang] || window.MMEGA_I18N.bg;
    return dict[key] || key;
  }

  function applyLanguage(lang) {
    state.lang = lang === "en" ? "en" : "bg";
    localStorage.setItem(STORAGE_KEYS.LANG, state.lang);
    document.documentElement.lang = state.lang;

    const langBtn = document.getElementById("langSwitchBtn");
    if (langBtn) {
      langBtn.textContent = state.lang === "bg" ? "EN" : "БГ";
      langBtn.setAttribute(
        "aria-label",
        state.lang === "bg" ? "Switch language to English" : "Превключи езика на Български"
      );
    }

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) {
        el.textContent = t(key);
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) {
        el.setAttribute("placeholder", t(key));
      }
    });

    renderProjects();
  }

  /* ==========================================================================
     5. PROJECTS LOADING, FILTERING & RENDERING
     ========================================================================== */
  async function loadProjects() {
    const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.projects = parsed;
          renderProjects();
          updateProjectStats();
          return;
        }
      } catch (e) {
        console.warn("Invalid stored projects, loading default...", e);
      }
    }

    try {
      const response = await fetch("data/projects.json", { cache: "no-cache" });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          state.projects = data;
          saveProjectsToStorage();
          renderProjects();
          updateProjectStats();
          return;
        }
      }
    } catch (err) {
      // Fallback for file:// protocol
    }

    state.projects = JSON.parse(JSON.stringify(window.MMEGA_DEFAULT_PROJECTS || []));
    saveProjectsToStorage();
    renderProjects();
    updateProjectStats();
  }

  function saveProjectsToStorage() {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(state.projects));
    updateProjectStats();
  }

  function updateProjectStats() {
    const countEl = document.getElementById("statProjectCount");
    if (countEl) {
      countEl.textContent = state.projects.length + "+";
    }
  }

  function extractHostname(urlStr) {
    try {
      const url = new URL(urlStr);
      return url.hostname;
    } catch (e) {
      return urlStr.replace(/^https?:\/\//i, "").split("/")[0] || "mmega.net";
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getFilteredProjects() {
    const query = state.searchQuery.trim().toLowerCase();
    const canSeeInternal = isAuthorizedAdmin();
    return state.projects.filter((proj) => {
      if (proj.status === "internal" && !canSeeInternal) return false;
      const matchesCat = state.activeFilter === "all" || proj.category === state.activeFilter;
      if (!matchesCat) return false;
      if (!query) return true;

      const titleBg = (proj.titleBg || "").toLowerCase();
      const titleEn = (proj.titleEn || "").toLowerCase();
      const descBg = (proj.descriptionBg || "").toLowerCase();
      const descEn = (proj.descriptionEn || "").toLowerCase();
      const url = (proj.url || "").toLowerCase();
      const tags = (proj.tags || []).join(" ").toLowerCase();

      return (
        titleBg.includes(query) ||
        titleEn.includes(query) ||
        descBg.includes(query) ||
        descEn.includes(query) ||
        url.includes(query) ||
        tags.includes(query)
      );
    });
  }

  function getStatusLabelAndClass(status) {
    if (status === "maintenance") {
      return { label: t("statusMaintenance"), cls: "status-maintenance" };
    }
    if (status === "internal") {
      return { label: t("statusInternal"), cls: "status-internal" };
    }
    return { label: t("statusLive"), cls: "status-live" };
  }

  function renderProjects() {
    const grid = document.getElementById("projectsGrid");
    if (!grid) return;

    const filtered = getFilteredProjects();
    const canManage = isAuthorizedAdmin();

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" role="status">
          <h3 style="margin-bottom:8px;">${escapeHtml(t("emptyProjectsTitle"))}</h3>
          <p style="color:var(--text-secondary);">${escapeHtml(t("emptyProjectsSub"))}</p>
        </div>
      `;
      return;
    }

    const sorted = filtered.slice().sort((a, b) => Number(!!b.featured) - Number(!!a.featured));

    grid.innerHTML = sorted
      .map((proj) => {
        const title =
          state.lang === "en" ? proj.titleEn || proj.titleBg : proj.titleBg || proj.titleEn;
        const desc =
          state.lang === "en"
            ? proj.descriptionEn || proj.descriptionBg
            : proj.descriptionBg || proj.descriptionEn;
        const hostname = extractHostname(proj.url);
        const statusInfo = getStatusLabelAndClass(proj.status);
        const accent = proj.accentColor || "#393185";
        const tagsHtml = (proj.tags || [])
          .map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`)
          .join("");

        const highlightsList =
          state.lang === "en"
            ? proj.highlightsEn || proj.highlightsBg || []
            : proj.highlightsBg || proj.highlightsEn || [];

        const highlightsHtml =
          Array.isArray(highlightsList) && highlightsList.length > 0
            ? `<ul class="project-highlights">
                ${highlightsList
                  .map(
                    (item) => `
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>${escapeHtml(item)}</span>
                  </li>`
                  )
                  .join("")}
              </ul>`
            : "";

        const demoBtnHtml = proj.demoUrl
          ? `<a href="${escapeHtml(proj.demoUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" data-track-project="${escapeHtml(proj.id)}">
              <span>${escapeHtml(t("demoProject"))}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </a>`
          : "";

        const imageHtml = proj.imageUrl
          ? `<img src="${escapeHtml(proj.imageUrl)}" alt="${escapeHtml(title)}" class="project-thumb" loading="lazy" />`
          : "";

        const featuredHtml = proj.featured
          ? `<span class="featured-pill">★ ${escapeHtml(t("featuredBadge"))}</span>`
          : "";

        // Admin controls are rendered ONLY when stoyan@mmega.net is logged in
        const adminControlsHtml = canManage
          ? `
            <div class="project-admin-controls">
              <button type="button" class="icon-btn" data-edit-project="${escapeHtml(proj.id)}" aria-label="${escapeHtml(t("editProject"))}: ${escapeHtml(title)}">
                ✎ ${escapeHtml(t("editProject"))}
              </button>
              <button type="button" class="icon-btn delete-btn" data-delete-project="${escapeHtml(proj.id)}" aria-label="${escapeHtml(t("deleteProject"))}: ${escapeHtml(title)}">
                ✕
              </button>
            </div>
          `
          : "";

        return `
          <article class="project-card" style="--card-accent: ${escapeHtml(accent)};">
            <div>
              <div class="project-accent-bar" aria-hidden="true"></div>
              <div class="project-card-body">
                <div class="project-meta-top">
                  <span class="project-domain-badge" title="${escapeHtml(proj.url)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    ${escapeHtml(hostname)}
                  </span>
                  <div class="project-badges-right">
                    ${featuredHtml}
                    <span class="status-badge ${statusInfo.cls}">${escapeHtml(statusInfo.label)}</span>
                  </div>
                </div>

                ${imageHtml}

                <h3 class="project-title">
                  <a href="${escapeHtml(proj.url)}" target="_blank" rel="noopener noreferrer" data-track-project="${escapeHtml(proj.id)}">
                    ${escapeHtml(title)}
                  </a>
                </h3>

                <p class="project-desc">${escapeHtml(desc)}</p>

                ${highlightsHtml}

                <div class="project-tags" aria-label="Technologies">
                  ${tagsHtml}
                </div>
              </div>
            </div>

            <div class="project-card-footer">
              <div class="project-cta-links">
                <a href="${escapeHtml(proj.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" data-track-project="${escapeHtml(proj.id)}">
                  <span>${escapeHtml(t("visitProject"))}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
                ${demoBtnHtml}
              </div>
              ${adminControlsHtml}
            </div>
          </article>
        `;
      })
      .join("");
  }

  /* ==========================================================================
     6. PROJECT MODAL (ADD / EDIT) & JSON IMPORT/EXPORT (Guarded for stoyan@mmega.net)
     ========================================================================== */
  function openProjectModal(projectId = null) {
    if (!isAuthorizedAdmin()) {
      openAdminLoginModal();
      return;
    }

    const modal = document.getElementById("projectModal");
    const modalTitle = document.getElementById("projectModalTitle");
    const form = document.getElementById("projectForm");
    if (!modal || !form) return;

    form.reset();
    state.editingProjectId = projectId;

    if (projectId) {
      const existing = state.projects.find((p) => p.id === projectId);
      if (existing) {
        if (modalTitle) modalTitle.textContent = t("modalEditTitle");
        document.getElementById("projTitleBg").value = existing.titleBg || "";
        document.getElementById("projTitleEn").value = existing.titleEn || "";
        document.getElementById("projUrl").value = existing.url || "";
        document.getElementById("projCategory").value = existing.category || "web";
        document.getElementById("projStatus").value = existing.status || "live";
        document.getElementById("projDescBg").value = existing.descriptionBg || "";
        document.getElementById("projDescEn").value = existing.descriptionEn || "";
        document.getElementById("projTags").value = (existing.tags || []).join(", ");
        document.getElementById("projAccent").value = existing.accentColor || "#0284c7";
        document.getElementById("projImage").value = existing.imageUrl || "";
        document.getElementById("projFeatured").checked = !!existing.featured;
      }
    } else {
      if (modalTitle) modalTitle.textContent = t("modalAddTitle");
      document.getElementById("projAccent").value = "#0284c7";
    }

    modal.hidden = false;
    document.getElementById("projTitleBg").focus();
  }

  function closeProjectModal() {
    const modal = document.getElementById("projectModal");
    if (modal) modal.hidden = true;
    state.editingProjectId = null;
  }

  function handleSaveProject(e) {
    e.preventDefault();
    if (!isAuthorizedAdmin()) return;

    const titleBg = document.getElementById("projTitleBg").value.trim();
    const titleEn = document.getElementById("projTitleEn").value.trim() || titleBg;
    let url = document.getElementById("projUrl").value.trim();
    const category = document.getElementById("projCategory").value;
    const status = document.getElementById("projStatus").value;
    const descriptionBg = document.getElementById("projDescBg").value.trim();
    const descriptionEn = document.getElementById("projDescEn").value.trim() || descriptionBg;
    const tagsRaw = document.getElementById("projTags").value;
    const accentColor = document.getElementById("projAccent").value || "#0284c7";
    const imageUrl = document.getElementById("projImage").value.trim();
    const featured = document.getElementById("projFeatured").checked;

    if (!titleBg || !url || !descriptionBg) return;

    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    const tags = tagsRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (state.editingProjectId) {
      const idx = state.projects.findIndex((p) => p.id === state.editingProjectId);
      if (idx !== -1) {
        state.projects[idx] = Object.assign({}, state.projects[idx], {
          titleBg,
          titleEn,
          url,
          category,
          status,
          descriptionBg,
          descriptionEn,
          tags,
          accentColor,
          imageUrl,
          featured
        });
      }
      trackEvent("project_edited", { project_id: state.editingProjectId, url });
    } else {
      const newProj = {
        id: "proj-" + Date.now(),
        titleBg,
        titleEn,
        url,
        category,
        status,
        featured,
        descriptionBg,
        descriptionEn,
        tags: tags.length ? tags : ["IT Project"],
        accentColor,
        imageUrl,
        createdAt: new Date().toISOString().split("T")[0]
      };
      state.projects.unshift(newProj);
      trackEvent("project_added", { project_id: newProj.id, url });
    }

    saveProjectsToStorage();
    renderProjects();
    closeProjectModal();
    showToast(t("toastProjectSaved"));
  }

  function handleDeleteProject(projectId) {
    if (!isAuthorizedAdmin()) return;
    const idx = state.projects.findIndex((p) => p.id === projectId);
    if (idx === -1) return;
    state.projects.splice(idx, 1);
    saveProjectsToStorage();
    renderProjects();
    trackEvent("project_deleted", { project_id: projectId });
    showToast(t("toastProjectDeleted"));
  }

  function exportProjectsJson() {
    if (!isAuthorizedAdmin()) return;
    const jsonString = JSON.stringify(state.projects, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    trackEvent("projects_json_exported", { count: state.projects.length });
  }

  function importProjectsJson(file) {
    if (!isAuthorizedAdmin() || !file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (Array.isArray(parsed)) {
          state.projects = parsed;
          saveProjectsToStorage();
          renderProjects();
          showToast(t("toastJsonImported"));
          trackEvent("projects_json_imported", { count: parsed.length });
        }
      } catch (err) {
        alert("Невалиден JSON файл / Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  }

  function resetProjectsToDefault() {
    if (!isAuthorizedAdmin()) return;
    state.projects = JSON.parse(JSON.stringify(window.MMEGA_DEFAULT_PROJECTS || []));
    saveProjectsToStorage();
    renderProjects();
    showToast(t("toastProjectsReset"));
    trackEvent("projects_reset_default");
  }

  /* ==========================================================================
     7. TOAST NOTIFICATIONS (ARIA-LIVE)
     ========================================================================== */
  function showToast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  /* ==========================================================================
     8. EVENT LISTENERS & INITIALIZATION
     ========================================================================== */
  function bindEvents() {
    // Mobile Menu
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mainNav = document.getElementById("mainNav");
    if (mobileMenuBtn && mainNav) {
      mobileMenuBtn.addEventListener("click", () => {
        const isOpen = mainNav.classList.toggle("open");
        mobileMenuBtn.setAttribute("aria-expanded", String(isOpen));
      });
    }

    // Language Switcher
    const langSwitchBtn = document.getElementById("langSwitchBtn");
    if (langSwitchBtn) {
      langSwitchBtn.addEventListener("click", () => {
        const nextLang = state.lang === "bg" ? "en" : "bg";
        applyLanguage(nextLang);
        trackEvent("language_switched", { language: nextLang });
      });
    }

    // Accessibility Panel Toggle
    const a11yMenuBtn = document.getElementById("a11yMenuBtn");
    const a11yPanel = document.getElementById("a11yPanel");
    if (a11yMenuBtn && a11yPanel) {
      a11yMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = a11yPanel.hidden;
        a11yPanel.hidden = !isHidden;
        a11yMenuBtn.setAttribute("aria-expanded", String(isHidden));
      });

      document.addEventListener("click", (e) => {
        if (!a11yPanel.hidden && !a11yPanel.contains(e.target) && e.target !== a11yMenuBtn) {
          a11yPanel.hidden = true;
          a11yMenuBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Accessibility Option Buttons
    const btnTheme = document.getElementById("a11yToggleTheme");
    if (btnTheme) {
      btnTheme.addEventListener("click", () => {
        state.a11y.theme = state.a11y.theme === "dark" ? "light" : "dark";
        saveA11yPrefs();
        trackEvent("a11y_theme_change", { theme: state.a11y.theme });
      });
    }

    const btnContrast = document.getElementById("a11yToggleContrast");
    if (btnContrast) {
      btnContrast.addEventListener("click", () => {
        state.a11y.highContrast = !state.a11y.highContrast;
        saveA11yPrefs();
        trackEvent("a11y_high_contrast", { enabled: state.a11y.highContrast });
      });
    }

    const btnFont = document.getElementById("a11yToggleFont");
    if (btnFont) {
      btnFont.addEventListener("click", () => {
        state.a11y.largeFont = !state.a11y.largeFont;
        saveA11yPrefs();
      });
    }

    const btnSpacing = document.getElementById("a11yToggleSpacing");
    if (btnSpacing) {
      btnSpacing.addEventListener("click", () => {
        state.a11y.wideSpacing = !state.a11y.wideSpacing;
        saveA11yPrefs();
      });
    }

    const btnMotion = document.getElementById("a11yToggleMotion");
    if (btnMotion) {
      btnMotion.addEventListener("click", () => {
        state.a11y.reduceMotion = !state.a11y.reduceMotion;
        saveA11yPrefs();
      });
    }

    const btnResetA11y = document.getElementById("a11yResetBtn");
    if (btnResetA11y) {
      btnResetA11y.addEventListener("click", resetA11yPrefs);
    }

    // Search & Category Filters
    const searchInput = document.getElementById("projectSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        renderProjects();
      });
    }

    document.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-filter]").forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        state.activeFilter = btn.getAttribute("data-filter") || "all";
        renderProjects();
        trackEvent("project_filter_selected", { category: state.activeFilter });
      });
    });

    // Admin Login & Logout Triggers
    const footerAdminLoginBtn = document.getElementById("footerAdminLoginBtn");
    if (footerAdminLoginBtn) {
      footerAdminLoginBtn.addEventListener("click", openAdminLoginModal);
    }

    const adminLoginForm = document.getElementById("adminLoginForm");
    if (adminLoginForm) {
      adminLoginForm.addEventListener("submit", handleAdminLogin);
    }

    document.querySelectorAll("[data-close-admin-login]").forEach((btn) => {
      btn.addEventListener("click", closeAdminLoginModal);
    });

    const adminLogoutBtn = document.getElementById("adminLogoutBtn");
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener("click", handleAdminLogout);
    }

    // Open Add Project Modal Triggers (Guarded for stoyan@mmega.net)
    document.querySelectorAll("[data-open-add-project]").forEach((btn) => {
      btn.addEventListener("click", () => openProjectModal(null));
    });

    // Project Card Delegated Actions
    const projectsGrid = document.getElementById("projectsGrid");
    if (projectsGrid) {
      projectsGrid.addEventListener("click", (e) => {
        const editBtn = e.target.closest("[data-edit-project]");
        if (editBtn) {
          const id = editBtn.getAttribute("data-edit-project");
          openProjectModal(id);
          return;
        }

        const deleteBtn = e.target.closest("[data-delete-project]");
        if (deleteBtn) {
          const id = deleteBtn.getAttribute("data-delete-project");
          handleDeleteProject(id);
          return;
        }

        const outboundLink = e.target.closest("[data-track-project]");
        if (outboundLink) {
          const id = outboundLink.getAttribute("data-track-project");
          const proj = state.projects.find((p) => p.id === id);
          if (proj) {
            trackEvent("project_link_click", {
              project_id: proj.id,
              project_title: proj.titleBg,
              destination_url: proj.url
            });
          }
        }
      });
    }

    // Project Form Save & Close
    const projectForm = document.getElementById("projectForm");
    if (projectForm) {
      projectForm.addEventListener("submit", handleSaveProject);
    }

    document.querySelectorAll("[data-close-project-modal]").forEach((btn) => {
      btn.addEventListener("click", closeProjectModal);
    });

    // Data / JSON & GA4 Settings Modal (Guarded for stoyan@mmega.net)
    const dataModal = document.getElementById("dataSettingsModal");
    document.querySelectorAll("[data-open-data-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!isAuthorizedAdmin()) return;
        const gaInput = document.getElementById("gaMeasurementIdInput");
        if (gaInput) gaInput.value = state.gaId;
        dataModal.hidden = false;
      });
    });

    document.querySelectorAll("[data-close-data-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (dataModal) dataModal.hidden = true;
      });
    });

    const btnExportJson = document.getElementById("btnExportJson");
    if (btnExportJson) {
      btnExportJson.addEventListener("click", exportProjectsJson);
    }

    const jsonFileInput = document.getElementById("jsonFileInput");
    const btnImportJson = document.getElementById("btnImportJson");
    if (btnImportJson && jsonFileInput) {
      btnImportJson.addEventListener("click", () => jsonFileInput.click());
      jsonFileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          importProjectsJson(e.target.files[0]);
          e.target.value = "";
        }
      });
    }

    const btnResetDefault = document.getElementById("btnResetDefaultProjects");
    if (btnResetDefault) {
      btnResetDefault.addEventListener("click", resetProjectsToDefault);
    }

    const btnSaveGa = document.getElementById("btnSaveGaId");
    if (btnSaveGa) {
      btnSaveGa.addEventListener("click", () => {
        if (!isAuthorizedAdmin()) return;
        const gaInput = document.getElementById("gaMeasurementIdInput");
        if (gaInput && gaInput.value.trim()) {
          state.gaId = gaInput.value.trim();
          localStorage.setItem(STORAGE_KEYS.GA_ID, state.gaId);
          loadGtagScript(state.gaId);
          showToast(t("toastGaSaved"));
        }
      });
    }

    const btnSaveNewPass = document.getElementById("btnSaveNewPass");
    if (btnSaveNewPass) {
      btnSaveNewPass.addEventListener("click", () => {
        if (!isAuthorizedAdmin()) return;
        const passInput = document.getElementById("newAdminPassInput");
        if (passInput && passInput.value.trim().length >= 4) {
          localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, passInput.value.trim());
          passInput.value = "";
          showToast(t("toastPassSaved"));
        }
      });
    }

    // Contact Form Submission
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
      contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("contactName").value.trim();
        const email = document.getElementById("contactEmail").value.trim();
        const service = document.getElementById("contactService").value;
        const message = document.getElementById("contactMessage").value.trim();

        trackEvent("service_inquiry_submitted", { service_category: service });
        showToast(t("toastFormSent"));

        const subject = encodeURIComponent(`[mmega.net] Запитване от ${name}`);
        const body = encodeURIComponent(
          `Име / Компания: ${name}\nИмейл: ${email}\nУслуга: ${service}\n\nСъобщение:\n${message}`
        );
        window.location.href = `mailto:stoyan@mmega.net?subject=${subject}&body=${body}`;
        contactForm.reset();
      });
    }

    // Cookie Banner Buttons & Reopen Trigger
    const cookieAcceptBtn = document.getElementById("cookieAcceptBtn");
    const cookieDeclineBtn = document.getElementById("cookieDeclineBtn");
    const openCookieSettingsBtn = document.getElementById("openCookieSettingsBtn");
    if (cookieAcceptBtn) {
      cookieAcceptBtn.addEventListener("click", () => handleCookieConsent(true));
    }
    if (cookieDeclineBtn) {
      cookieDeclineBtn.addEventListener("click", () => handleCookieConsent(false));
    }
    if (openCookieSettingsBtn) {
      openCookieSettingsBtn.addEventListener("click", () => {
        const cookieBanner = document.getElementById("cookieBanner");
        if (cookieBanner) {
          cookieBanner.hidden = false;
        }
      });
    }

    // Legal / GDPR / Accessibility Modal
    const legalModal = document.getElementById("legalModal");
    document.querySelectorAll("[data-open-legal-modal]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (legalModal) {
          legalModal.hidden = false;
          const sectionId = btn.getAttribute("data-open-legal-modal");
          if (sectionId) {
            const targetEl = document.getElementById(sectionId);
            if (targetEl) {
              setTimeout(() => targetEl.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
            }
          }
        }
      });
    });

    document.querySelectorAll("[data-close-legal-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (legalModal) legalModal.hidden = true;
      });
    });

    // Keyboard Shortcuts (Escape to close modals, Ctrl+Shift+A for Admin Login)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeProjectModal();
        closeAdminLoginModal();
        if (dataModal) dataModal.hidden = true;
        if (legalModal) legalModal.hidden = true;
        if (a11yPanel) {
          a11yPanel.hidden = true;
          if (a11yMenuBtn) a11yMenuBtn.setAttribute("aria-expanded", "false");
        }
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        openAdminLoginModal();
      }
    });

    // Check URL hash #admin to open login modal
    if (window.location.hash === "#admin") {
      openAdminLoginModal();
    }
    window.addEventListener("hashchange", () => {
      if (window.location.hash === "#admin") {
        openAdminLoginModal();
      }
    });
  }

  // Initialize on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    loadA11yPrefs();
    initGoogleAnalytics();
    bindEvents();
    syncAdminVisibility();
    applyLanguage(state.lang);
    loadProjects();
  });
})();
