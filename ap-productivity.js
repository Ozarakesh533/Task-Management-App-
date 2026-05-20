
/* assets/js/ap-productivity.js */

(() => {
  "use strict";

  const DASH = {
    views: {
      users: "vw_wp_user_master",
      kpi: "ap_productivity_daily_summary",
      facts: "vw_wp_activity_fact",
      exceptions: "vw_wp_exception_summary",
      parkingHold: "vw_wp_parking_hold_summary",
      offices: "officemaster"
    },

    refreshMs: 300000,
    refreshTimer: null,
    loading: false,
    supportingDataLoading: false,
    hasSearched: false,
    bootstrapLoaded: false,
    supportingDataLoaded: false,
    activePage: "regionPage",
    apiBase: (window.AP_DASHBOARD_API_BASE || "").replace(/\/$/, ""),

    charts: {},
    tables: {},

    users: [],
    kpiRows: [],
    previousKpiRows: [],
    factRows: [],
    exceptionRows: [],
    parkingHoldRows: [],
    officeRows: [],

    filters: {
      dateType: "indexed",
      dateFrom: "",
      dateTo: "",
      region: [],
      country: [],
      paymentOffice: [],
      location: [],
      supervisor: [],
      user: [],
      process: [],
      invoiceType: []
    },

    options: {
      region: [],
      country: [],
      paymentOffice: [],
      location: [],
      supervisor: [],
      user: [],
      process: [],
      invoiceType: []
    },

    bootstrapOptions: {
      region: [],
      country: [],
      paymentOffice: [],
      location: [],
      supervisor: [],
      user: [],
      process: ["Indexing", "Processing", "CSR", "BizCommon", "Parking"],
      invoiceType: []
    },

    dropdownSearch: {},
    userHourlyProcessFilter: ""
  };

  const COLORS = {
    magenta: "#bd1874",
    navy: "#6366F1",
    blue: "#1D4ED8",
    brightBlue: "#2563EB",
    cyan: "#06B6D4",
    green: "#16A34A",
    lightGreen: "#22C55E",
    amber: "#F59E0B",
    orange: "#F97316",
    red: "#EF4444",
    purple: "#7C3AED",
    teal: "#14B8A6",
    gray: "#64748B"
  };

  const PROCESS_COLORS = {
    Indexing: COLORS.brightBlue,
    Processing: COLORS.green,
    CSR: COLORS.orange,
    BizCommon: COLORS.teal,
    Parking: COLORS.purple,
    Approval: COLORS.cyan,
    Exception: COLORS.red
  };

  const FILTERS = {
    region: {
      wrapId: "filterRegionWrap",
      searchId: "filterRegionSearch",
      optionsId: "filterRegionOptions",
      summaryId: "filterRegionSummary",
      emptyText: "Select region"
    },
    country: {
      wrapId: "filterCountryWrap",
      searchId: "filterCountrySearch",
      optionsId: "filterCountryOptions",
      summaryId: "filterCountrySummary",
      emptyText: "Select country"
    },
    paymentOffice: {
      wrapId: "filterPaymentOfficeWrap",
      searchId: "filterPaymentOfficeSearch",
      optionsId: "filterPaymentOfficeOptions",
      summaryId: "filterPaymentOfficeSummary",
      emptyText: "Select payment office"
    },
    location: {
      wrapId: "filterLocationWrap",
      searchId: "filterLocationSearch",
      optionsId: "filterLocationOptions",
      summaryId: "filterLocationSummary",
      emptyText: "Select location"
    },
    supervisor: {
      wrapId: "filterSupervisorWrap",
      searchId: "filterSupervisorSearch",
      optionsId: "filterSupervisorOptions",
      summaryId: "filterSupervisorSummary",
      emptyText: "Select supervisor"
    },
    user: {
      wrapId: "filterUserWrap",
      searchId: "filterUserSearch",
      optionsId: "filterUserOptions",
      summaryId: "filterUserSummary",
      emptyText: "Select user"
    },
    process: {
      wrapId: "filterProcessWrap",
      searchId: "filterProcessSearch",
      optionsId: "filterProcessOptions",
      summaryId: "filterProcessSummary",
      emptyText: "Select process"
    },
    invoiceType: {
      wrapId: "filterInvoiceTypeWrap",
      searchId: "filterInvoiceTypeSearch",
      optionsId: "filterInvoiceTypeOptions",
      summaryId: "filterInvoiceTypeSummary",
      emptyText: "Select invoice type"
    },
  };

  window.AP_WORK_PRODUCTIVITY_DASHBOARD = DASH;
  window.refreshAPWorkProductivityDashboard = () => loadDashboard(true);

  document.addEventListener("DOMContentLoaded", initDashboard);

  async function initDashboard() {
    initOneApShell();
    setDefaultDateRange();
    bindStaticEvents();
    bindFilterDropdownEvents();
    bindDateTypeDropdown();
    bindTableSearchEvents();
    bindRowModalEvents();
    initEnterpriseSectionExperience();
    syncFilterDrawerUi();
    updateDashboardShellState();

    // Search-first production behavior: only filter metadata is loaded on open.
    openFilterDrawer();

    try {
      await loadFilterBootstrap();
    } catch (error) {
      console.warn("Filter bootstrap failed:", error);
      showToast("Filter metadata could not be fully loaded. You can still select date range and search.", "warning");
    }

    updateFilterChips();
    updateFilterSummary();
  }

  function setDefaultDateRange() {
    const today = new Date();
    const from = new Date();

    from.setDate(today.getDate() - 29);

    DASH.filters.dateFrom = toDateInput(from);
    DASH.filters.dateTo = toDateInput(today);

    setValue("filterDateType", DASH.filters.dateType);
    setDateTypeUi(DASH.filters.dateType);
    setValue("filterDateFrom", DASH.filters.dateFrom);
    setValue("filterDateTo", DASH.filters.dateTo);
  }

  function bindStaticEvents() {
    $("manualRefreshBtn")?.addEventListener("click", () => {
      if (!DASH.hasSearched) {
        openFilterDrawer();
        showToast("Select filters and click Search to load the dashboard.", "info");
        return;
      }
      loadDashboard(true);
    });

    $("exportDashboardBtn")?.addEventListener("click", exportActiveDashboardTable);

    $("showFilterBtn")?.addEventListener("click", toggleFilterDrawer);
    $("openFilterStudioBtn")?.addEventListener("click", openFilterDrawer);
    $("hideFilterBtn")?.addEventListener("click", closeFilterDrawer);
    $("drawerOverlay")?.addEventListener("click", closeFilterDrawer);

    $("applyFiltersBtn")?.addEventListener("click", () => {
      syncDateFilters();
      closeAllDropdowns();
      closeFilterDrawer();
      loadDashboard(true);
    });

    $("resetFiltersBtn")?.addEventListener("click", () => {
      resetFilters();
      clearDashboardData();
      openFilterDrawer();
    });

    $("clearDashboardFiltersBtn")?.addEventListener("click", () => {
      resetFilters();
      clearDashboardData();
      openFilterDrawer();
    });

    $("filterDateType")?.addEventListener("change", () => {
      syncDateFilters();
      setDateTypeUi(DASH.filters.dateType);
      updateFilterChips();
    });

    $("filterDateFrom")?.addEventListener("change", () => {
      syncDateFilters();
      updateFilterChips();
    });

    $("filterDateTo")?.addEventListener("change", () => {
      syncDateFilters();
      updateFilterChips();
    });

    document.querySelectorAll("[data-wp-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        switchTab(button.dataset.wpTab);
      });
    });

    document.querySelectorAll("[data-clear-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        clearFilter(button.dataset.clearFilter);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAllDropdowns();
        closeFilterDrawer();
        closeRowModal();
      }
    });
  }

  function bindFilterDropdownEvents() {
    Object.entries(FILTERS).forEach(([key, cfg]) => {
      const wrap = $(cfg.wrapId);
      const button = wrap?.querySelector(".ms-btn");
      const search = $(cfg.searchId);

      if (!wrap || !button) return;

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const shouldOpen = !wrap.classList.contains("open");

        closeAllDropdowns();

        if (shouldOpen) {
          wrap.classList.add("open");
          DASH.dropdownSearch[key] = "";

          if (search) search.value = "";

          renderFilterOptions(key);

          setTimeout(() => {
            search?.focus();
          }, 0);
        }
      });

      search?.addEventListener("input", () => {
        DASH.dropdownSearch[key] = search.value || "";
        renderFilterOptions(key);
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".ms-wrap")) {
        closeAllDropdowns();
      }
    });
  }


  function bindDateTypeDropdown() {
    const wrap = $("filterDateTypeWrap");
    const button = $("filterDateTypeBtn");

    if (!wrap || !button) return;

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const shouldOpen = !wrap.classList.contains("open");
      closeAllDropdowns();
      if (shouldOpen) wrap.classList.add("open");
    });

    wrap.querySelectorAll("[data-date-type-value]").forEach((option) => {
      option.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        DASH.filters.dateType = option.dataset.dateTypeValue || "indexed";
        setValue("filterDateType", DASH.filters.dateType);
        setDateTypeUi(DASH.filters.dateType);
        syncDateFilters();
        updateFilterChips();
        closeAllDropdowns();
      });
    });
  }

  function setDateTypeUi(value) {
    const normalized = value === "received" ? "received" : "indexed";
    const label = normalized === "received" ? "Received Date" : "Indexed Date";

    setValue("filterDateType", normalized);
    setText("filterDateTypeSummary", label);

    document.querySelectorAll("[data-date-type-value]").forEach((option) => {
      const selected = option.dataset.dateTypeValue === normalized;
      option.classList.toggle("is-selected", selected);
      const icon = option.querySelector(".date-type-check");
      if (icon) icon.textContent = selected ? "check_box" : "check_box_outline_blank";
    });
  }

  function bindTableSearchEvents() {
    document.querySelectorAll("[data-table-search]").forEach((input) => {
      input.addEventListener("input", () => {
        applyTableSearch(input.dataset.tableSearch, input.value);
      });
    });

    document.querySelectorAll("[data-table-clear]").forEach((button) => {
      button.addEventListener("click", () => {
        const tableId = button.dataset.tableClear;
        const input = document.querySelector(`[data-table-search="${tableId}"]`);

        if (input) input.value = "";

        applyTableSearch(tableId, "");
      });
    });
  }

  function bindRowModalEvents() {
    $("workforceRowDetailCloseBtn")?.addEventListener("click", closeRowModal);

    $("workforceRowDetailModal")?.addEventListener("click", (event) => {
      if (event.target === $("workforceRowDetailModal")) {
        closeRowModal();
      }
    });
  }

  function toggleFilterDrawer() {
    const drawer = $("dashboardFilterDrawer");

    if (drawer?.classList.contains("is-open")) {
      closeFilterDrawer();
      return;
    }

    openFilterDrawer();
  }

  function openFilterDrawer() {
    $("dashboardFilterDrawer")?.classList.add("is-open");
    $("drawerOverlay")?.classList.add("show");
    syncFilterDrawerUi();
    redrawVisualsAfterDrawerChange();
  }

  function closeFilterDrawer() {
    $("dashboardFilterDrawer")?.classList.remove("is-open");
    $("drawerOverlay")?.classList.remove("show");
    syncFilterDrawerUi();
    redrawVisualsAfterDrawerChange();
  }

  function syncFilterDrawerUi() {
    const drawer = $("dashboardFilterDrawer");
    const button = $("showFilterBtn");
    const isOpen = Boolean(drawer?.classList.contains("is-open"));

    $("drawerOverlay")?.classList.toggle("show", isOpen);

    if (!button) return;

    button.classList.toggle("is-active", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));

    const icon = button.querySelector(".material-symbols-outlined");
    const label = button.querySelector("[data-filter-toggle-label]") ||
      Array.from(button.querySelectorAll("span")).find((span) => {
        return !span.classList.contains("material-symbols-outlined");
      });

    if (icon) icon.textContent = isOpen ? "visibility_off" : "tune";
    if (label) label.textContent = isOpen ? "Hide Filters" : "Show Filters";
  }

  function redrawVisualsAfterDrawerChange() {
    setTimeout(() => {
      redrawCharts();
      redrawTables();
    }, 220);
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".ms-wrap.open").forEach((item) => {
      item.classList.remove("open");
    });
  }

  function switchTab(pageId) {
    if (!pageId || !$(pageId)) return;

    DASH.activePage = pageId;

    document.querySelectorAll(".tab-page").forEach((page) => {
      page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll("[data-wp-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.wpTab === pageId);
    });

    // Important: do not auto-select any user when the Individual tab is opened.
    // User-specific cards/charts load only after the user explicitly selects a user
    // or clicks a user row from Region Level Analysis.
    renderActivePage();
    updateEnterpriseSectionRail();
  }

  function startAutoRefresh() {
    if (DASH.refreshTimer) clearInterval(DASH.refreshTimer);

    DASH.refreshTimer = setInterval(() => {
      if (!document.hidden && !DASH.loading && DASH.hasSearched) {
        loadDashboard(false);
      }
    }, DASH.refreshMs);
  }

  async function loadDashboard(forceReload) {
    if (DASH.loading) return;

    DASH.loading = true;
    DASH.hasSearched = true;
    DASH.supportingDataLoaded = false;
    DASH.supportingDataLoading = false;

    // Reset all datasets before every Search/Refresh. This prevents old rows from
    // leaking into the new filter result while the fresh API calls are running.
    DASH.kpiRows = [];
    DASH.previousKpiRows = [];
    DASH.factRows = [];
    DASH.exceptionRows = [];
    DASH.parkingHoldRows = [];

    updateDashboardShellState();
    setLoading(true, "Loading dashboard...");
    hideError();

    try {
      ensureSelectData();
      syncDateFilters();

      if (!DASH.bootstrapLoaded) {
        await loadFilterBootstrap();
      }

      const previousRange = getPreviousRange(DASH.filters.dateFrom, DASH.filters.dateTo);

      // Production behavior after Search:
      // 1) Load user metadata + KPI cache first. This is the fast path.
      // 2) Do NOT block first render with heavy invoice/exception/parking detail views.
      // 3) If a single user is explicitly selected, load that user's supporting detail rows
      //    because the server-side user filter keeps the result small.
      const shouldLoadUserSupportingData = DASH.activePage === "userPage" && DASH.filters.user.length === 1;

      const results = await Promise.allSettled([
        fetchKpiRows(DASH.filters.dateFrom, DASH.filters.dateTo),
        fetchKpiRows(previousRange.from, previousRange.to),
        shouldLoadUserSupportingData ? fetchFactRows(DASH.filters.dateFrom, DASH.filters.dateTo) : Promise.resolve([]),
        shouldLoadUserSupportingData ? fetchExceptionRows(DASH.filters.dateFrom, DASH.filters.dateTo) : Promise.resolve([]),
        shouldLoadUserSupportingData ? fetchParkingHoldRows(DASH.filters.dateFrom, DASH.filters.dateTo) : Promise.resolve([])
      ]);
      
      const kpiResult = results[0];
      const previousKpiResult = results[1];
      const factResult = results[2];
      const exceptionResult = results[3];
      const parkingHoldResult = results[4];

      if (kpiResult.status !== "fulfilled") {
        throw kpiResult.reason || new Error("Dashboard KPI data could not be loaded.");
      }

      DASH.kpiRows = safeArray(kpiResult.value);
      mergeUsersFromKpiRows(DASH.kpiRows);
      applyShiftStatus();
      mergeUserOptions(DASH.users);
      DASH.previousKpiRows = readOptionalResult(previousKpiResult, []);
      DASH.factRows = readOptionalResult(factResult, []);
      DASH.exceptionRows = readOptionalResult(exceptionResult, []);
      DASH.parkingHoldRows = readOptionalResult(parkingHoldResult, []);
      DASH.supportingDataLoaded = shouldLoadUserSupportingData;

      hydrateFilterOptions();
      renderAllFilterOptions();
      updateFilterChips();
      renderActivePage();

      setText("lastRefreshText", new Date().toLocaleString());
      startAutoRefresh();

      if (!DASH.kpiRows.length) {
        showToast("No dashboard data found for the selected filters.", "warning");
      } else {
        showToast("Dashboard loaded for selected filters.", "success");
      }
    } catch (error) {
      console.error(error);
      showError(cleanError(error));
      renderEmptyState();
    } finally {
      DASH.loading = false;
      setLoading(false);

      setTimeout(() => {
        redrawCharts();
        redrawTables();
      }, 150);
    }
  }

  async function loadFilterBootstrap() {
    ensureSelectData();
    syncDateFilters();
  
    try {
      const options = await fetchDashboardFilterOptions();
  
      mergeBootstrapOptions(options);
  
      DASH.bootstrapLoaded = true;
      hydrateFilterOptions();
      renderAllFilterOptions();
      updateFilterChips();
      updateFilterSummary();
    } catch (error) {
      console.warn("Fast filter metadata failed:", error);
  
      DASH.bootstrapLoaded = true;
      hydrateFilterOptions();
      renderAllFilterOptions();
      updateFilterChips();
      updateFilterSummary();
  
      throw error;
    }
  }

  async function fetchDashboardFilterOptions() {
    const dateType = DASH.filters.dateType || "indexed";
    const fromDate = DASH.filters.dateFrom || toDateInput(offsetDate(-70));
    const toDate = DASH.filters.dateTo || toDateInput(new Date());

    // Fast path: PostgreSQL function reads only the summary table and returns one compact JSON object.
    // This avoids slow page-open calls to vw_wp_user_master and officemaster.
    try {
      const response = await callPostgrestRpc("get_ap_productivity_filter_options", {
        p_date_type: dateType,
        p_start_date: fromDate,
        p_end_date: toDate
      });

      const payload = Array.isArray(response) ? response[0] : response;
      const options = payload?.get_ap_productivity_filter_options || payload || {};

      if (hasAnyFilterOption(options)) return options;
    } catch (error) {
      console.warn("RPC filter options failed. Falling back to summary-table filter options.", error);
    }

    return fetchFilterOptionsFromSummaryTable(dateType, fromDate, toDate);
  }

  async function fetchFilterOptionsFromSummaryTable(dateType, fromDate, toDate) {
    const columns = [
      "region",
      "country",
      "payment_office",
      "location",
      "supervisor_name",
      "user_opusid",
      "user_name",
      "process",
      "invoice_type"
    ].join(",");

    const filters = [
      pgFilter("activity_date", "gte", fromDate),
      pgFilter("activity_date", "lte", toDate),
      pgFilter("date_type", "eq", dateType || "indexed")
    ].filter(Boolean).join("&");

    const response = await window.selectData(
      DASH.views.kpi,
      columns,
      filters,
      "order=region.asc,country.asc,user_name.asc&limit=50000"
    );

    assertSuccess(response, "Summary filter option query failed.");

    return buildFilterOptionsFromSummaryRows(safeArray(response.data));
  }

  function buildFilterOptionsFromSummaryRows(rows) {
    const region = new Set();
    const country = new Set();
    const paymentOffice = new Set();
    const location = new Set();
    const supervisor = new Set();
    const process = new Set();
    const invoiceType = new Set();
    const userMap = new Map();

    safeArray(rows).forEach((row) => {
      addCleanSet(region, read(row, "region"));
      addCleanSet(country, read(row, "country"));
      addCleanSet(paymentOffice, read(row, "payment_office"));
      addCleanSet(location, read(row, "location"));
      addCleanSet(supervisor, read(row, "supervisor_name"));
      addCleanSet(process, read(row, "process"));
      addCleanSet(invoiceType, read(row, "invoice_type"));

      const userOpusid = clean(read(row, "user_opusid"));
      if (!isRealUser(userOpusid)) return;

      const userName = clean(read(row, "user_name")) || userOpusid;
      userMap.set(userOpusid, {
        value: userOpusid,
        label: `${userName} (${userOpusid})`
      });
    });

    return {
      region: [...region].sort(localeSort),
      country: [...country].sort(localeSort),
      paymentOffice: [...paymentOffice].sort(localeSort),
      location: [...location].sort(localeSort),
      supervisor: [...supervisor].sort(localeSort),
      user: [...userMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
      process: [...process].sort(localeSort),
      invoiceType: [...invoiceType].sort(localeSort)
    };
  }

  function addCleanSet(set, value) {
    const cleaned = clean(value);
    if (!cleaned || cleaned === "Unknown") return;
    set.add(cleaned);
  }

  function localeSort(a, b) {
    return String(a).localeCompare(String(b));
  }

  function hasAnyFilterOption(options) {
    if (!options || typeof options !== "object") return false;
    return Object.values(options).some((value) => Array.isArray(value) && value.length > 0);
  }

  async function fetchOfficeOptions() {
    const columns = ["region", "country", "controloffice", "officelocation"].join(",");
    const response = await window.selectData(
      DASH.views.offices,
      columns,
      "",
      "order=region.asc,country.asc&limit=20000"
    );

    assertSuccess(response, "Office metadata query failed.");

    return safeArray(response.data).map((row) => ({
      region: clean(read(row, "region")),
      country: clean(read(row, "country")),
      controloffice: clean(read(row, "controloffice")),
      office_location: clean(read(row, "officelocation"))
    }));
  }

  function mergeBootstrapOptions(options) {
    if (!options || typeof options !== "object") return;

    Object.keys(DASH.bootstrapOptions).forEach((key) => {
      const incoming = safeArray(options[key]);
      if (!incoming.length) return;

      if (key === "user") {
        DASH.bootstrapOptions.user = mergeUserOptionList(DASH.bootstrapOptions.user, incoming);
      } else {
        DASH.bootstrapOptions[key] = unique([...DASH.bootstrapOptions[key], ...incoming.map(clean)]);
      }
    });
  }

  function mergeOfficeOptions(rows) {
    DASH.bootstrapOptions.region = unique([
      ...DASH.bootstrapOptions.region,
      ...rows.map((row) => row.region)
    ]);

    DASH.bootstrapOptions.country = unique([
      ...DASH.bootstrapOptions.country,
      ...rows.map((row) => row.country)
    ]);

    DASH.bootstrapOptions.paymentOffice = unique([
      ...DASH.bootstrapOptions.paymentOffice,
      ...rows.map((row) => row.controloffice)
    ]);

    DASH.bootstrapOptions.location = unique([
      ...DASH.bootstrapOptions.location,
      ...rows.map((row) => row.office_location)
    ]);
  }

  function mergeUserOptions(users) {
    DASH.bootstrapOptions.location = unique([
      ...DASH.bootstrapOptions.location,
      ...users.map((user) => user.location)
    ]);

    DASH.bootstrapOptions.supervisor = unique([
      ...DASH.bootstrapOptions.supervisor,
      ...users.map((user) => user.supervisor_name)
    ]);

    DASH.bootstrapOptions.user = mergeUserOptionList(
      DASH.bootstrapOptions.user,
      users
        .filter((user) => user.user_opusid)
        .map((user) => ({
          value: user.user_opusid,
          label: `${user.user_name || "Unknown"} (${user.user_opusid})`
        }))
    );
  }

  function mergeUsersFromKpiRows(kpiRows) {
    const map = new Map();

    safeArray(DASH.users).forEach((user) => {
      if (user.user_opusid) map.set(String(user.user_opusid).toLowerCase(), user);
    });

    safeArray(kpiRows).forEach((row) => {
      const userOpusid = clean(row.user_opusid);
      if (!isRealUser(userOpusid)) return;

      const key = userOpusid.toLowerCase();
      const existing = map.get(key) || {};

      map.set(key, {
        ...existing,
        user_opusid: userOpusid,
        user_name: clean(row.user_name) || existing.user_name || userOpusid,
        email: clean(row.user_email) || existing.email || "",
        employee_id: clean(row.employee_id) || existing.employee_id || "",
        location: clean(row.location) || existing.location || "Unknown",
        supervisor_name: clean(row.supervisor_name) || existing.supervisor_name || "Unknown",
        supervisor_email: clean(row.supervisor_email) || existing.supervisor_email || "",
        supervisor_id: clean(row.supervisor_id) || existing.supervisor_id || "",
        active_flag: row.active_flag !== undefined ? toBool(row.active_flag) : toBool(existing.active_flag),
        work_start_time: clean(row.work_start_time) || existing.work_start_time || "",
        work_end_time: clean(row.work_end_time) || existing.work_end_time || "",
        has_processing_access: row.has_processing_access !== undefined ? toBool(row.has_processing_access) : toBool(existing.has_processing_access),
        has_csr_access: row.has_csr_access !== undefined ? toBool(row.has_csr_access) : toBool(existing.has_csr_access),
        has_bizcommon_access: row.has_bizcommon_access !== undefined ? toBool(row.has_bizcommon_access) : toBool(existing.has_bizcommon_access),
        has_parking_access: row.has_parking_access !== undefined ? toBool(row.has_parking_access) : toBool(existing.has_parking_access),
        process_access: clean(row.process_access) || existing.process_access || "",
        shift_status: existing.shift_status || "Shift Not Set",
        working_minutes: existing.working_minutes || 0
      });
    });

    DASH.users = [...map.values()];
  }

  function mergeUserOptionList(existing, incoming) {
    const map = new Map();

    safeArray(existing).forEach((item) => {
      if (item?.value) map.set(item.value, item);
    });

    safeArray(incoming).forEach((item) => {
      const value = clean(item?.value || item?.user_opusid || item);
      if (!value) return;
      const label = clean(item?.label || item?.user_name || value);
      map.set(value, { value, label: label.includes(value) ? label : `${label} (${value})` });
    });

    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  async function loadSupportingDataOnce(reason = "section") {
    if (!DASH.hasSearched || DASH.supportingDataLoaded || DASH.supportingDataLoading) return;

    DASH.supportingDataLoading = true;
    setLoading(true, "Loading sections...");

    try {
      const results = await Promise.allSettled([
        fetchFactRows(DASH.filters.dateFrom, DASH.filters.dateTo),
        fetchExceptionRows(DASH.filters.dateFrom, DASH.filters.dateTo),
        fetchParkingHoldRows(DASH.filters.dateFrom, DASH.filters.dateTo)
      ]);

      DASH.factRows = readOptionalResult(results[0], []);
      DASH.exceptionRows = readOptionalResult(results[1], []);
      DASH.parkingHoldRows = readOptionalResult(results[2], []);
      DASH.supportingDataLoaded = true;

      hydrateFilterOptions();
      renderAllFilterOptions();
      renderActivePage();
      setText("lastRefreshText", new Date().toLocaleString());
    } catch (error) {
      console.error(`Supporting data load failed from ${reason}:`, error);
      showToast("Some lower sections could not be loaded.", "warning");
    } finally {
      DASH.supportingDataLoading = false;
      setLoading(false);
    }
  }

  function registerLazySectionLoading() {
    if (DASH.lazyObserver) {
      DASH.lazyObserver.disconnect();
      DASH.lazyObserver = null;
    }

    const lazyTargets = [
      "userQualityRateTable",
      "userPage",
      "userInvoiceDetailTable"
    ]
      .map((id) => $(id))
      .filter(Boolean);

    if (!lazyTargets.length || typeof IntersectionObserver === "undefined") return;

    DASH.lazyObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadSupportingDataOnce("intersection");
      }
    }, {
      root: $("main") || null,
      rootMargin: "220px 0px",
      threshold: 0.05
    });

    lazyTargets.forEach((target) => DASH.lazyObserver.observe(target));
  }

  function updateDashboardShellState() {
    document.body.classList.toggle("dashboard-searched", DASH.hasSearched);
    $("dashboardEmptyState")?.classList.toggle("hidden", DASH.hasSearched);
  }

  function clearDashboardData() {
    DASH.hasSearched = false;
    DASH.supportingDataLoaded = false;
    DASH.supportingDataLoading = false;
    DASH.kpiRows = [];
    DASH.previousKpiRows = [];
    DASH.factRows = [];
    DASH.exceptionRows = [];
    DASH.parkingHoldRows = [];
    updateDashboardShellState();
    renderEmptyState();
    hydrateFilterOptions();
    renderAllFilterOptions();
    updateFilterChips();
    updateFilterSummary();
    setText("lastRefreshText", "--");
  }

  function readOptionalResult(result, fallback) {
    if (result.status === "fulfilled") return safeArray(result.value);

    console.warn("Optional dashboard data failed:", result.reason);
    return fallback;
  }

  async function fetchUsers() {
    const columns = [
      "user_opusid",
      "user_name",
      "email",
      "employee_id",
      "location",
      "supervisor_name",
      "supervisor_email",
      "supervisor_id",
      "active_flag",
      "work_start_time",
      "work_end_time",
      "control_offices",
      "country_map",
      "has_csr_access",
      "has_processing_access",
      "has_bizcommon_access",
      "has_parking_access",
      "process_access"
    ].join(",");

    const response = await window.selectData(
      DASH.views.users,
      columns,
      "",
      "order=user_name.asc&limit=20000"
    );

    assertSuccess(response, "User master query failed.");

    return safeArray(response.data)
      .map(normalizeUser)
      .filter((user) => user.user_opusid || user.email);
  }

  async function fetchKpiRows(fromDate, toDate) {
    const columns = [
      "activity_date",
      "date_type",
      "report_year",
      "report_month",

      "region",
      "country",
      "control_office",
      "payment_office",
      "process",
      "user_opusid",
      "invoice_type",

      "user_name",
      "user_email",
      "employee_id",
      "location",
      "supervisor_name",
      "supervisor_email",
      "supervisor_id",
      "active_flag",
      "work_start_time",
      "work_end_time",
      "has_processing_access",
      "has_csr_access",
      "has_bizcommon_access",
      "has_parking_access",
      "process_access",

      "allocation_count",
      "processed_count",
      "pending_count",

      "raw_avg_aht_minutes",
      "total_aht_minutes",
      "aht_item_count",
      "avg_aht_minutes",
      "aht_data_issue_count",

      "raw_productivity_percent",
      "productivity_percent",

      "exception_count",
      "parking_count",
      "hold_count",
      "blocked_count",
      "exception_rate",

      "has_allocation",
      "has_processed",
      "has_pending",
      "has_exception",
      "has_blocked_work",

      "quality_status",
      "performance_category",
      "rank_score"
    ].join(",");

    const filter = buildKpiDbFilter(fromDate, toDate);

    const response = await window.selectData(
      DASH.views.kpi,
      columns,
      filter,
      "order=activity_date.desc&limit=50000"
    );

    assertSuccess(response, "KPI query failed.");

    return safeArray(response.data).map(normalizeKpi);
  }

  function getFactDateField() {
    return DASH.filters.dateType === "received" ? "received_date" : "allocated_date";
  }

  async function fetchFactRows(fromDate, toDate) {
    const columns = [
      "invoice_id",
      "invoice_number",
      "conversation_id",
      "sender",
      "supplier_code",
      "supplier_name",
      "invoice_type",
      "invoice_sub_type",
      "received_at",
      "received_date",
      "process",
      "user_opusid",
      "allocated_at",
      "allocated_date",
      "completed_at",
      "completed_date",
      "processed_time_minutes",
      "work_item_status",
      "work_item_state",
      "allocated_flag",
      "completed_flag",
      "pending_flag",
      "control_office",
      "payment_office",
      "mailbox",
      "region",
      "country",
      "office_location",
      "invoice_amount",
      "invoice_currency",
      "priority",
      "remarks",
      "cancel_reason"
    ].join(",");

    const dateField = getFactDateField();

    const filter = buildFactDbFilter(fromDate, toDate, dateField);

    const response = await window.selectData(
      DASH.views.facts,
      columns,
      filter,
      "order=allocated_at.desc&limit=25000"
    );

    assertSuccess(response, "Activity fact query failed.");

    return safeArray(response.data).map(normalizeFact);
  }

  async function fetchExceptionRows(fromDate, toDate) {
    const columns = [
      "exception_id",
      "row_id",
      "invoice_number",
      "conversation_id",
      "invoice_type",
      "exception_created_at",
      "exception_type",
      "exception_reason",
      "exception_status",
      "exception_comment",
      "exception_created_by",
      "exception_resolved_by",
      "exception_to_department",
      "exception_last_updated_by",
      "exception_last_updated_at",
      "exception_resolved_at",
      "pending_with_supplier",
      "pending_with_supplier_reason",
      "onshore_pic",
      "mapped_exception_reason",
      "mapped_exception_department"
    ].join(",");

    const filter = buildExceptionDbFilter(fromDate, toDate);

    const response = await window.selectData(
      DASH.views.exceptions,
      columns,
      filter,
      "order=exception_created_at.desc&limit=25000"
    );

    assertSuccess(response, "Exception query failed.");

    return safeArray(response.data).map(normalizeException);
  }

  async function fetchParkingHoldRows(fromDate, toDate) {
    const columns = [
      "event_type",
      "source_id",
      "main_id",
      "invoice_number",
      "conversation_id",
      "event_at",
      "user_opusid",
      "reason",
      "amount",
      "remarks",
      "invoice_type",
      "invoice_currency"
    ].join(",");

    const filter = buildParkingHoldDbFilter(fromDate, toDate);

    const response = await window.selectData(
      DASH.views.parkingHold,
      columns,
      filter,
      "order=event_at.desc&limit=25000"
    );

    assertSuccess(response, "Parking/Hold query failed.");

    return safeArray(response.data).map(normalizeParkingHold);
  }


  function buildKpiDbFilter(fromDate, toDate) {
    const filters = [
      pgFilter("activity_date", "gte", fromDate),
      pgFilter("activity_date", "lte", toDate),
      pgFilter("date_type", "eq", DASH.filters.dateType || "indexed"),
      pgInFilter("region", DASH.filters.region),
      pgInFilter("country", DASH.filters.country),
      pgInFilter("payment_office", DASH.filters.paymentOffice),
      pgInFilter("process", DASH.filters.process),
      pgInFilter("invoice_type", DASH.filters.invoiceType),
      pgInFilter("user_opusid", getUserFilterValuesForServer())
    ];
  
    return filters.filter(Boolean).join("&");
  }

  function buildFactDbFilter(fromDate, toDate, dateField) {
    const filters = [
      pgFilter(dateField, "gte", fromDate),
      pgFilter(dateField, "lte", toDate),
      pgInFilter("region", DASH.filters.region),
      pgInFilter("country", DASH.filters.country),
      pgInFilter("payment_office", DASH.filters.paymentOffice),
      pgInFilter("process", DASH.filters.process),
      pgInFilter("invoice_type", DASH.filters.invoiceType),
      pgInFilter("user_opusid", getUserFilterValuesForServer())
    ];

    return filters.filter(Boolean).join("&");
  }

  function buildExceptionDbFilter(fromDate, toDate) {
    const filters = [
      pgFilter("exception_created_at", "gte", `${fromDate}T00:00:00`),
      pgFilter("exception_created_at", "lte", `${toDate}T23:59:59`),
      pgInFilter("invoice_type", DASH.filters.invoiceType)
    ];

    return filters.filter(Boolean).join("&");
  }

  function buildParkingHoldDbFilter(fromDate, toDate) {
    const filters = [
      pgFilter("event_at", "gte", `${fromDate}T00:00:00`),
      pgFilter("event_at", "lte", `${toDate}T23:59:59`),
      pgInFilter("invoice_type", DASH.filters.invoiceType),
      pgInFilter("user_opusid", getUserFilterValuesForServer())
    ];

    return filters.filter(Boolean).join("&");
  }

  function getUserFilterValuesForServer() {
    if (DASH.filters.user.length) return DASH.filters.user;

    if (!DASH.filters.location.length && !DASH.filters.supervisor.length) return [];

    return DASH.users
      .filter((user) => {
        if (DASH.filters.location.length && !DASH.filters.location.includes(user.location)) return false;
        if (DASH.filters.supervisor.length && !DASH.filters.supervisor.includes(user.supervisor_name)) return false;
        return true;
      })
      .map((user) => user.user_opusid)
      .filter(Boolean)
      .slice(0, 250);
  }

  function pgFilter(column, operator, value) {
    if (value === null || value === undefined || value === "") return "";
    return `${column}=${operator}.${encodeURIComponent(value)}`;
  }

  function pgInFilter(column, values) {
    const cleanValues = unique(safeArray(values).map(clean).filter(Boolean));

    if (!cleanValues.length) return "";

    // PostgREST accepts quoted literals inside in.(...). Keep the filter readable and
    // avoid double-encoding because minipostgrest/selectData already builds the URL.
    const escaped = cleanValues
      .map((value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
      .join(",");

    return `${column}=in.(${escaped})`;
  }

  async function apiGet(path, params = {}) {
    if (!DASH.apiBase) throw new Error("Dashboard API base is not configured.");

    const url = new URL(`${DASH.apiBase}${path}`);

    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach((item) => url.searchParams.append(key, item));
      } else if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`API ${path} failed with ${response.status}`);
    }

    return response.json();
  }
  async function callPostgrestRpc(functionName, params = {}) {
    if (typeof window.callRpc === "function") {
      return window.callRpc(functionName, params);
    }
  
    if (typeof window.rpcData === "function") {
      return window.rpcData(functionName, params);
    }
  
    const base =
      window.POSTGREST_API_BASE ||
      window.POSTGREST_BASE_URL ||
      window.POSTGREST_BASE ||
      window.PGRST_BASE_URL ||
      window.AP_POSTGREST_BASE_URL ||
      window.AP_DASHBOARD_POSTGREST_BASE ||
      DASH.apiBase ||
      "";
  
    if (!base) {
      throw new Error(
        "PostgREST RPC base URL is missing. Set window.POSTGREST_API_BASE to the same PostgREST base URL used by minipostgrest.js."
      );
    }
  
    const url = new URL(`${String(base).replace(/\/$/, "")}/rpc/${functionName}`);
  
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  
    const response = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" }
    });
  
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`RPC ${functionName} failed with ${response.status}. ${text}`);
    }
  
    return response.json();
  }
  
  function offsetDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
  function normalizeUser(row) {
    const user = {
      user_opusid: clean(read(row, "user_opusid")),
      user_name: clean(read(row, "user_name")),
      email: clean(read(row, "email")),
      employee_id: clean(read(row, "employee_id")),
      location: clean(read(row, "location")),
      supervisor_name: clean(read(row, "supervisor_name")),
      supervisor_email: clean(read(row, "supervisor_email")),
      supervisor_id: clean(read(row, "supervisor_id")),
      active_flag: toBool(read(row, "active_flag")),
      work_start_time: clean(read(row, "work_start_time")),
      work_end_time: clean(read(row, "work_end_time")),
      control_offices: clean(read(row, "control_offices")),
      country_map: read(row, "country_map"),
      has_csr_access: toBool(read(row, "has_csr_access")),
      has_processing_access: toBool(read(row, "has_processing_access")),
      has_bizcommon_access: toBool(read(row, "has_bizcommon_access")),
      has_parking_access: toBool(read(row, "has_parking_access")),
      process_access: clean(read(row, "process_access")),
      shift_status: "Shift Not Set",
      working_minutes: 0
    };

    user.accessible_processes = getAccessibleProcessesFromUser(user);

    return user;
  }

  function normalizeKpi(row) {
    return {
      activity_date: clean(read(row, "activity_date")),
      date_type: clean(read(row, "date_type")) || "indexed",
      report_year: number(read(row, "report_year")),
      report_month: clean(read(row, "report_month")),

      region: clean(read(row, "region")) || "Unknown",
      country: clean(read(row, "country")) || "Unknown",
      control_office: clean(read(row, "control_office")) || "Unknown",
      payment_office: clean(read(row, "payment_office")) || "Unknown",
      process: normalizeProcess(read(row, "process")),
      user_opusid: clean(read(row, "user_opusid")),
      invoice_type: clean(read(row, "invoice_type")) || "Unknown",

      user_name: clean(read(row, "user_name")),
      user_email: clean(read(row, "user_email")),
      employee_id: clean(read(row, "employee_id")),
      location: clean(read(row, "location")) || "Unknown",
      supervisor_name: clean(read(row, "supervisor_name")) || "Unknown",
      supervisor_email: clean(read(row, "supervisor_email")),
      supervisor_id: clean(read(row, "supervisor_id")),
      active_flag: toBool(read(row, "active_flag")),
      work_start_time: clean(read(row, "work_start_time")),
      work_end_time: clean(read(row, "work_end_time")),
      has_processing_access: toBool(read(row, "has_processing_access")),
      has_csr_access: toBool(read(row, "has_csr_access")),
      has_bizcommon_access: toBool(read(row, "has_bizcommon_access")),
      has_parking_access: toBool(read(row, "has_parking_access")),
      process_access: clean(read(row, "process_access")),

      allocation_count: number(read(row, "allocation_count")),
      processed_count: number(read(row, "processed_count")),
      pending_count: number(read(row, "pending_count")),

      raw_avg_aht_minutes: number(read(row, "raw_avg_aht_minutes")),
      total_aht_minutes: number(read(row, "total_aht_minutes")),
      aht_item_count: number(read(row, "aht_item_count")),
      avg_aht_minutes: number(read(row, "avg_aht_minutes")),
      aht_data_issue_count: number(read(row, "aht_data_issue_count")),

      raw_productivity_percent: number(read(row, "raw_productivity_percent")),
      productivity_percent: number(read(row, "productivity_percent")),

      exception_count: number(read(row, "exception_count")),
      parking_count: number(read(row, "parking_count")),
      hold_count: number(read(row, "hold_count")),
      blocked_count: number(read(row, "blocked_count")),
      exception_rate: number(read(row, "exception_rate")),

      has_allocation: toBool(read(row, "has_allocation")),
      has_processed: toBool(read(row, "has_processed")),
      has_pending: toBool(read(row, "has_pending")),
      has_exception: toBool(read(row, "has_exception")),
      has_blocked_work: toBool(read(row, "has_blocked_work")),

      quality_status: clean(read(row, "quality_status")),
      performance_category: clean(read(row, "performance_category")),
      rank_score: number(read(row, "rank_score"))
    };
  }

  function normalizeFact(row) {
    return {
      invoice_id: clean(read(row, "invoice_id")),
      invoice_number: clean(read(row, "invoice_number")),
      conversation_id: clean(read(row, "conversation_id")),
      sender: clean(read(row, "sender")),
      supplier_code: clean(read(row, "supplier_code")),
      supplier_name: clean(read(row, "supplier_name")) || "Unknown",
      invoice_type: clean(read(row, "invoice_type")) || "Unknown",
      invoice_sub_type: clean(read(row, "invoice_sub_type")),
      received_at: clean(read(row, "received_at")),
      received_date: clean(read(row, "received_date")),
      process: normalizeProcess(read(row, "process")),
      user_opusid: clean(read(row, "user_opusid")),
      allocated_at: clean(read(row, "allocated_at")),
      allocated_date: clean(read(row, "allocated_date")),
      completed_at: clean(read(row, "completed_at")),
      completed_date: clean(read(row, "completed_date")),
      processed_time_minutes: number(read(row, "processed_time_minutes")),
      work_item_status: clean(read(row, "work_item_status")) || "Unknown",
      work_item_state: clean(read(row, "work_item_state")) || "Unknown",
      allocated_flag: toBool(read(row, "allocated_flag")),
      completed_flag: toBool(read(row, "completed_flag")),
      pending_flag: toBool(read(row, "pending_flag")),
      control_office: clean(read(row, "control_office")) || "Unknown",
      payment_office: clean(read(row, "payment_office")) || "Unknown",
      mailbox: clean(read(row, "mailbox")),
      region: clean(read(row, "region")) || "Unknown",
      country: clean(read(row, "country")) || "Unknown",
      office_location: clean(read(row, "office_location")),
      invoice_amount: number(read(row, "invoice_amount")),
      invoice_currency: clean(read(row, "invoice_currency")),
      priority: clean(read(row, "priority")),
      remarks: clean(read(row, "remarks")),
      cancel_reason: clean(read(row, "cancel_reason"))
    };
  }

  function normalizeException(row) {
    return {
      exception_id: clean(read(row, "exception_id")),
      row_id: clean(read(row, "row_id")),
      invoice_number: clean(read(row, "invoice_number")),
      conversation_id: clean(read(row, "conversation_id")),
      invoice_type: clean(read(row, "invoice_type")) || "Unknown",
      exception_created_at: clean(read(row, "exception_created_at")),
      exception_type: clean(read(row, "exception_type")),
      exception_reason:
        clean(read(row, "mapped_exception_reason")) ||
        clean(read(row, "exception_reason")) ||
        "Unknown",
      exception_status: clean(read(row, "exception_status")) || "Unknown",
      exception_comment: clean(read(row, "exception_comment")),
      exception_created_by: clean(read(row, "exception_created_by")),
      exception_resolved_by: clean(read(row, "exception_resolved_by")),
      exception_to_department:
        clean(read(row, "mapped_exception_department")) ||
        clean(read(row, "exception_to_department")) ||
        "Unknown",
      exception_last_updated_by: clean(read(row, "exception_last_updated_by")),
      exception_last_updated_at: clean(read(row, "exception_last_updated_at")),
      exception_resolved_at: clean(read(row, "exception_resolved_at")),
      pending_with_supplier: toBool(read(row, "pending_with_supplier")),
      pending_with_supplier_reason: clean(read(row, "pending_with_supplier_reason")),
      onshore_pic: clean(read(row, "onshore_pic"))
    };
  }

  function normalizeParkingHold(row) {
    return {
      event_type: clean(read(row, "event_type")) || "Unknown",
      source_id: clean(read(row, "source_id")),
      main_id: clean(read(row, "main_id")),
      invoice_number: clean(read(row, "invoice_number")),
      conversation_id: clean(read(row, "conversation_id")),
      event_at: clean(read(row, "event_at")),
      user_opusid: clean(read(row, "user_opusid")),
      reason: clean(read(row, "reason")) || "Unknown",
      amount: number(read(row, "amount")),
      remarks: clean(read(row, "remarks")),
      invoice_type: clean(read(row, "invoice_type")) || "Unknown",
      invoice_currency: clean(read(row, "invoice_currency"))
    };
  }

  function applyShiftStatus() {
    DASH.users = DASH.users.map((user) => {
      const shift = calculateShiftStatus(user.work_start_time, user.work_end_time);

      return {
        ...user,
        shift_status: shift.status,
        working_minutes: shift.minutes
      };
    });
  }

  function calculateShiftStatus(startValue, endValue) {
    const start = parseTime(startValue);
    const end = parseTime(endValue);

    if (start === null || end === null) {
      return {
        status: "Shift Not Set",
        minutes: 0
      };
    }

    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const overnight = start > end;

    const insideShift = overnight
      ? current >= start || current <= end
      : current >= start && current <= end;

    if (!insideShift) {
      const notStarted = overnight
        ? current > end && current < start
        : current < start;

      return {
        status: notStarted ? "Not Started" : "Shift Ended",
        minutes: notStarted ? 0 : shiftLength(start, end)
      };
    }

    return {
      status: "Working",
      minutes: current >= start ? current - start : 1440 - start + current
    };
  }

  function hydrateFilterOptions() {
    const kpiRows = getFilterBaseKpiRows();
    const factRows = getFilterBaseFactRows();
    const users = getFilterBaseUsers();

    DASH.options.region = unique([
      ...DASH.bootstrapOptions.region,
      ...kpiRows.map((row) => row.region),
      ...factRows.map((row) => row.region)
    ]);

    DASH.options.country = unique([
      ...DASH.bootstrapOptions.country,
      ...kpiRows.map((row) => row.country),
      ...factRows.map((row) => row.country)
    ]);

    DASH.options.paymentOffice = unique([
      ...DASH.bootstrapOptions.paymentOffice,
      ...kpiRows.map((row) => row.payment_office),
      ...factRows.map((row) => row.payment_office)
    ]);

    DASH.options.location = unique([
      ...DASH.bootstrapOptions.location,
      ...users.map((user) => user.location)
    ]);

    DASH.options.supervisor = unique([
      ...DASH.bootstrapOptions.supervisor,
      ...users.map((user) => user.supervisor_name)
    ]);

    DASH.options.user = mergeUserOptionList(
      DASH.bootstrapOptions.user,
      users
        .filter((user) => user.user_opusid)
        .map((user) => ({
          value: user.user_opusid,
          label: `${user.user_name || "Unknown"} (${user.user_opusid})`
        }))
    );

    DASH.options.process = unique([
      ...DASH.bootstrapOptions.process,
      ...kpiRows.map((row) => row.process),
      ...factRows.map((row) => row.process)
    ]);

    DASH.options.invoiceType = unique([
      ...DASH.bootstrapOptions.invoiceType,
      ...kpiRows.map((row) => row.invoice_type),
      ...factRows.map((row) => row.invoice_type)
    ]);

    preserveSelectedOptions();
  }

  function preserveSelectedOptions() {
    Object.keys(DASH.filters).forEach((key) => {
      if (!Array.isArray(DASH.filters[key])) return;
      if (!DASH.options[key]) return;

      DASH.filters[key].forEach((value) => {
        if (!value) return;

        if (key === "user") {
          const exists = DASH.options.user.some((item) => item.value === value);

          if (!exists) {
            DASH.options.user.unshift({
              value,
              label: value
            });
          }

          return;
        }

        if (!DASH.options[key].includes(value)) {
          DASH.options[key].unshift(value);
        }
      });
    });
  }

  function getFilterBaseKpiRows() {
    return DASH.kpiRows.filter((row) => {
      if (DASH.filters.location.length || DASH.filters.supervisor.length) {
        const user = userMapById().get(row.user_opusid);

        if (DASH.filters.location.length && !DASH.filters.location.includes(user?.location || "")) return false;
        if (DASH.filters.supervisor.length && !DASH.filters.supervisor.includes(user?.supervisor_name || "")) return false;
      }

      return true;
    });
  }

  function getFilterBaseFactRows() {
    return DASH.factRows.filter((row) => {
      const user = userMapById().get(row.user_opusid);

      if (DASH.filters.location.length && !DASH.filters.location.includes(user?.location || row.office_location || "")) return false;
      if (DASH.filters.supervisor.length && !DASH.filters.supervisor.includes(user?.supervisor_name || "")) return false;

      return true;
    });
  }

  function getFilterBaseUsers() {
    const userIds = new Set(DASH.kpiRows.map((row) => row.user_opusid).filter(Boolean));

    return DASH.users.filter((user) => {
      if (DASH.filters.location.length && !DASH.filters.location.includes(user.location)) return false;
      if (DASH.filters.supervisor.length && !DASH.filters.supervisor.includes(user.supervisor_name)) return false;
      if (userIds.size && !userIds.has(user.user_opusid)) return false;

      return true;
    });
  }

  function renderAllFilterOptions() {
    Object.keys(FILTERS).forEach((key) => {
      renderFilterOptions(key);
    });
  }

  function renderFilterOptions(key) {
    const cfg = FILTERS[key];
    const container = $(cfg.optionsId);

    if (!container) return;

    const searchText = clean(DASH.dropdownSearch[key]).toLowerCase();
    const selected = new Set(DASH.filters[key] || []);

    let options = safeArray(DASH.options[key]);

    if (key === "user") {
      options = options
        .filter((option) => {
          const text = `${option.label} ${option.value}`.toLowerCase();
          return !searchText || text.includes(searchText);
        })
        .map((option) => ({
          value: option.value,
          label: option.label
        }));
    } else {
      options = options
        .map(clean)
        .filter(Boolean)
        .filter((value) => !searchText || value.toLowerCase().includes(searchText))
        .map((value) => ({
          value,
          label: value
        }));
    }

    options.sort((a, b) => {
      const aSelected = selected.has(a.value);
      const bSelected = selected.has(b.value);

      if (aSelected !== bSelected) return aSelected ? -1 : 1;

      return a.label.localeCompare(b.label);
    });

    if (!options.length) {
      container.innerHTML = `<div class="ms-empty">No options found</div>`;
      updateFilterSummaryText(key);
      return;
    }

    container.innerHTML = options.map((option) => {
      const isSelected = selected.has(option.value);

      return `
        <button
          type="button"
          class="wp-ms-option"
          data-filter-key="${escapeAttr(key)}"
          data-filter-value="${escapeAttr(option.value)}"
          style="
            width:100%;
            border:0;
            border-bottom:1px solid #edf3f8;
            background:${isSelected ? "#eff6ff" : "#ffffff"};
            color:${isSelected ? "#1d4ed8" : "#20384f"};
            padding:9px 10px;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            font-size:13px;
            font-weight:${isSelected ? "900" : "700"};
            cursor:pointer;
            text-align:left;
          "
        >
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(option.label)}</span>
          <span class="material-symbols-outlined" style="font-size:18px;">
            ${isSelected ? "check_box" : "check_box_outline_blank"}
          </span>
        </button>
      `;
    }).join("");

    container.querySelectorAll(".wp-ms-option").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleFilter(button.dataset.filterKey, button.dataset.filterValue);
      });
    });

    updateFilterSummaryText(key);
  }

  function toggleFilter(key, value) {
    if (!key || !Array.isArray(DASH.filters[key])) return;

    const current = DASH.filters[key];

    DASH.filters[key] = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    hydrateFilterOptions();
    renderAllFilterOptions();
    updateFilterChips();

    renderActivePage();
  }

  function clearFilter(key) {
    if (key === "date") {
      setDefaultDateRange();
    } else if (key && Array.isArray(DASH.filters[key])) {
      DASH.filters[key] = [];
    }

    hydrateFilterOptions();
    renderAllFilterOptions();
    updateFilterChips();

    renderActivePage();
  }

  function resetFilters() {
    Object.keys(DASH.filters).forEach((key) => {
      if (Array.isArray(DASH.filters[key])) {
        DASH.filters[key] = [];
      }
    });

    DASH.filters.dateType = "indexed";
    setDefaultDateRange();
    closeAllDropdowns();
    updateFilterChips();
  }

  function syncDateFilters() {
    const dateType = $("filterDateType")?.value || DASH.filters.dateType || "indexed";
    const from = $("filterDateFrom")?.value || DASH.filters.dateFrom;
    const to = $("filterDateTo")?.value || DASH.filters.dateTo;

    DASH.filters.dateType = dateType;
    DASH.filters.dateFrom = from;
    DASH.filters.dateTo = to;

    if (DASH.filters.dateFrom > DASH.filters.dateTo) {
      const oldFrom = DASH.filters.dateFrom;
      DASH.filters.dateFrom = DASH.filters.dateTo;
      DASH.filters.dateTo = oldFrom;
    }

    const fromDate = new Date(DASH.filters.dateFrom + "T00:00:00");
    const toDate = new Date(DASH.filters.dateTo + "T00:00:00");
    const maxTo = new Date(fromDate);
    maxTo.setDate(maxTo.getDate() + 30);

    if (toDate > maxTo) {
      DASH.filters.dateTo = toDateInput(maxTo);
      showToast("Date range cannot exceed 31 days.", "warning");
    }

    setValue("filterDateType", DASH.filters.dateType);
    setDateTypeUi(DASH.filters.dateType);
    setValue("filterDateFrom", DASH.filters.dateFrom);
    setValue("filterDateTo", DASH.filters.dateTo);
  }

  function updateFilterSummaryText(key) {
    const cfg = FILTERS[key];
    const el = $(cfg.summaryId);

    if (!el) return;

    const selected = DASH.filters[key] || [];

    if (!selected.length) {
      el.textContent = cfg.emptyText;
      return;
    }

    if (key === "user") {
      const labelMap = new Map(DASH.options.user.map((item) => [item.value, item.label]));
      el.textContent = summarizeList(selected.map((value) => labelMap.get(value) || value));
      return;
    }

    el.textContent = summarizeList(selected);
  }

  function updateFilterChips() {
    const dateTypeLabel = DASH.filters.dateType === "received" ? "Received" : "Indexed";

    setText(
      "chipDateRange",
      `${dateTypeLabel}: ${formatShortDate(DASH.filters.dateFrom)} - ${formatShortDate(DASH.filters.dateTo)}`
    );

    setText(
      "headerDateRangeText",
      `${dateTypeLabel}: ${formatShortDate(DASH.filters.dateFrom)} - ${formatShortDate(DASH.filters.dateTo)}`
    );

    setText(
      "chipRegion",
      DASH.filters.region.length ? summarizeList(DASH.filters.region) : "All Regions"
    );

    setText(
      "chipProcess",
      DASH.filters.process.length ? summarizeList(DASH.filters.process) : "All Processes"
    );

    const count = Object.entries(DASH.filters)
      .filter(([key, value]) => Array.isArray(value) && !["region", "process"].includes(key))
      .reduce((sumValue, [, value]) => sumValue + value.length, 0);

    setText("chipFilterCount", count ? `${count} extra filter${count > 1 ? "s" : ""}` : "No extra filters");
  }

  function updateFilterSummary() {
    const kpiRows = getDashboardKpiRows();
    const users = getVisibleUsers();

    setText("filterSummaryRows", formatNumber(kpiRows.length));
    setText("filterSummaryUsers", formatNumber(users.length));
    setText("filterSummaryOffices", formatNumber(unique(kpiRows.map((row) => row.control_office)).length));
  }

  function renderActivePage() {
    updateDashboardShellState();

    if (!DASH.hasSearched) {
      renderEmptyState();
      updateFilterSummary();
      return;
    }

    if (DASH.activePage === "userPage") {
      renderUserPage();
    } else {
      renderRegionPage();
    }

    updateFilterSummary();

    setTimeout(() => {
      redrawCharts();
      redrawTables();
    }, 120);
  }

  function renderRegionPage() {
    const kpiRows = getDashboardKpiRows();
    const previousRows = getVisiblePreviousKpiRows();
    const users = getVisibleUsers();
    const factRows = getVisibleFactRows();
    const exceptions = getVisibleExceptions();
    const parkingHold = getVisibleParkingHold();

    renderRegionKpis(kpiRows, previousRows, users);
    renderRegionInsights(kpiRows, users, exceptions, parkingHold);

    // KPI-backed charts: fast and available immediately after Search.
    renderDailyVolumeChart(kpiRows);
    renderRegionRankingChart(kpiRows);
    renderWorkloadProductivityChart(kpiRows);
    renderProductivityBandChart(kpiRows, users);
    renderAllocationBalanceChart(kpiRows, users);
    renderProcessContributionChart(kpiRows);
    renderProcessSummaryByTypeChart(kpiRows);
    renderRegionHeatmap(kpiRows);

    // Detail-backed charts should never block the first Search render.
    // When detail rows are not loaded yet, use KPI-cache-backed fallback charts.
    if (factRows.length || exceptions.length || parkingHold.length) {
      renderStatusDonutChart(factRows, exceptions, parkingHold);
      renderPendingAgingChart(factRows);
      renderParkingHoldChart(parkingHold);
      renderVendorWorkloadChart(factRows);
    } else {
      renderStatusDonutFromKpiChart(kpiRows);
      renderPendingByProcessFromKpiChart(kpiRows);
      renderParkingHoldFromKpiChart(kpiRows);
      renderCountryWorkloadFromKpiChart(kpiRows);
    }

    renderExceptionParetoChart(exceptions, kpiRows);

    // Tables.
    renderProductivityAhtCoachTable(kpiRows, users);
    renderSupervisorTable(kpiRows, users);
    renderUserQualityRateTable(kpiRows, users, exceptions, parkingHold);
    renderUserRankingTable(kpiRows, users);
    renderDetailedPerformanceTable(kpiRows, users);

    updateFilterSummary();
  }

  function renderRegionKpis(kpiRows, previousRows, users) {
    const now = summarizeKpi(kpiRows);
    const previous = summarizeKpi(previousRows);
    const activity = getUserActivitySummary(kpiRows, users);
    const previousActivity = getUserActivitySummary(previousRows, users);
    const productivity = pct(now.processed, now.allocation);
    const previousProductivity = pct(previous.processed, previous.allocation);
    const exceptionPercent = pct(now.exceptions, now.processed || now.allocation);
    const previousExceptionPercent = pct(previous.exceptions, previous.processed || previous.allocation);
    const blockedWork = now.parking + now.hold;
    const previousBlockedWork = previous.parking + previous.hold;

    setText("kpiTotalUsers", formatNumber(users.length));
    setText("kpiActiveUsers", formatNumber(activity.activeUsers));
    setText("kpiIdleUsers", formatNumber(activity.idleUsers));
    setText("kpiTotalAllocation", formatNumber(now.allocation));
    setText("kpiTotalProcessed", formatNumber(now.processed));
    setText("kpiTotalPending", formatNumber(now.pending));
    setText("kpiProductivityPercent", `${formatDecimal(productivity, 1)}%`);
    setText("kpiAvgAhtMinutes", formatDecimal(now.avgAht, 1));
    setText("kpiExceptionPercent", `${formatDecimal(exceptionPercent, 1)}%`);
    setText("kpiBlockedCount", formatNumber(blockedWork));

    setTrend("kpiTotalUsersTrend", users.length, users.length);
    setTrend("kpiActiveUsersTrend", activity.activeUsers, previousActivity.activeUsers);
    setTrend("kpiIdleUsersTrend", activity.idleUsers, previousActivity.idleUsers, true);
    setTrend("kpiTotalAllocationTrend", now.allocation, previous.allocation);
    setTrend("kpiTotalProcessedTrend", now.processed, previous.processed);
    setTrend("kpiPendingTrend", now.pending, previous.pending, true);
    setTrend("kpiProductivityTrend", productivity, previousProductivity, false, "pp");
    setTrend("kpiAhtTrend", now.avgAht, previous.avgAht, true);
    setTrend("kpiExceptionTrend", exceptionPercent, previousExceptionPercent, true, "pp");
    setTrend("kpiBlockedTrend", blockedWork, previousBlockedWork, true);
  }

  function renderRegionInsights(kpiRows, users, exceptions, parkingHold = []) {
    const regionRows = groupKpi(kpiRows, "region")
      .map((row) => ({
        ...row,
        productivity: pct(row.processed, row.allocation)
      }))
      .sort((a, b) => b.productivity - a.productivity);

    const userRanking = buildUserRankingRows(kpiRows, users);
    const qualityRows = buildUserQualityRows(kpiRows, users, exceptions, parkingHold);
    const coachingFocus = qualityRows.find((row) => row.quality_status === "Critical")
      || userRanking.find((row) => row.category === "Critical")
      || userRanking[userRanking.length - 1];

    setText("insightBestRegion", regionRows[0]?.name || "--");
    setText("insightRiskRegion", regionRows.length ? regionRows[regionRows.length - 1].name : "--");
    setText("insightTopPerformer", userRanking[0]?.user_name || "--");
    setText("insightCoachingFocus", coachingFocus?.user_name || "--");
    setText("insightTopExceptionReason", coachingFocus?.user_name || "--");
  }

  function getUserActivitySummary(kpiRows, users) {
    const ranking = buildUserRankingRows(kpiRows, users);
    const outputUsers = new Set(ranking.filter((row) => row.processed > 0).map((row) => row.user_opusid));
    const assignedUsers = new Set(ranking.filter((row) => row.allocation > 0 || row.pending > 0).map((row) => row.user_opusid));
    const availableUsers = users.filter((user) => user.active_flag || assignedUsers.has(user.user_opusid) || outputUsers.has(user.user_opusid));

    return {
      activeUsers: outputUsers.size,
      idleUsers: availableUsers.filter((user) => !outputUsers.has(user.user_opusid)).length,
      assignedUsers: assignedUsers.size,
      availableUsers: availableUsers.length
    };
  }

  function renderProductivityBandChart(kpiRows, users) {
    const rows = buildUserRankingRows(kpiRows, users).filter((row) => row.allocation > 0 || row.processed > 0);
    const bands = [
      { name: "90%+ Excellent", min: 90, max: Infinity, color: COLORS.green },
      { name: "75-90% Good", min: 75, max: 90, color: COLORS.blue },
      { name: "50-75% Needs Attention", min: 50, max: 75, color: COLORS.amber },
      { name: "Below 50% Critical", min: -Infinity, max: 50, color: COLORS.red }
    ];

    const values = bands.map((band) => rows.filter((row) => row.productivity >= band.min && row.productivity < band.max).length);
    const total = values.reduce((sumValue, value) => sumValue + value, 0);
    const maxValue = Math.max(...values, 1);

    renderChart("userProductivityBandChart", {
      chart: { type: "bar", height: "100%", toolbar: { show: false } },
      title: chartTotalTitle(`Users: ${formatNumber(total)}`),
      series: [{ name: "Users", data: values }],
      colors: bands.map((band) => band.color),
      plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 7, barHeight: "44%", dataLabels: { position: "right" } } },
      xaxis: { categories: bands.map((band) => band.name), min: 0, max: Math.ceil(maxValue * 1.25), labels: { rotate: 0, formatter: (value) => formatNumber(value) } },
      dataLabels: {
        enabled: true,
        offsetX: 8,
        style: { fontSize: "10px", fontWeight: 900, colors: ["#0f172a"] },
        background: { enabled: true, opacity: 0.9, borderRadius: 4, foreColor: "#ffffff" },
        formatter(value) { return value ? `${formatNumber(value)} users · ${formatDecimal(pct(value, total), 1)}%` : ""; }
      },
      tooltip: { y: { formatter: (value) => `${formatNumber(value)} users (${formatDecimal(pct(value, total), 1)}%)` } },
      grid: { borderColor: "#e5e7eb", padding: { top: 30, right: 120, bottom: 14, left: 14 } },
      legend: { show: false },
      noData: { text: "No productivity distribution data" }
    });
  }

  function renderAllocationBalanceChart(kpiRows, users) {
    const rows = buildUserRankingRows(kpiRows, users)
      .filter((row) => row.allocation > 0 || row.processed > 0 || row.pending > 0)
      .sort((a, b) => (b.pending - a.pending) || (b.allocation - a.allocation) || (b.processed - a.processed))
      .slice(0, 8)
      .reverse();

    const categories = rows.map((row) => compactLabel(row.user_name || row.user_opusid || "User", 18));
    const totalAllocation = sum(rows, "allocation");
    const totalProcessed = sum(rows, "processed");
    const totalPending = sum(rows, "pending");

    renderChart("allocationBalanceChart", {
      chart: { type: "bar", height: "100%", stacked: false, toolbar: { show: false } },
      title: chartTotalTitle(`Top ${rows.length || 0} | Allocation: ${formatNumber(totalAllocation)} | Processed: ${formatNumber(totalProcessed)} | Pending: ${formatNumber(totalPending)}`),
      series: [
        { name: "Allocation", data: rows.map((row) => row.allocation) },
        { name: "Processed", data: rows.map((row) => row.processed) },
        { name: "Pending", data: rows.map((row) => row.pending) }
      ],
      colors: [COLORS.blue, COLORS.green, COLORS.orange],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "52%", dataLabels: { position: "right" } } },
      xaxis: { categories, labels: { rotate: 0, formatter: (value) => shortNumber(value) }, title: { text: "Invoice Count" } },
      dataLabels: { enabled: true, offsetX: 4, style: { fontSize: "9px", fontWeight: 900 }, formatter(value) { return value ? shortNumber(value) : ""; } },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        floating: false,
        offsetX: 8,
        offsetY: 0,
        fontSize: "11px",
        fontWeight: 800,
        itemMargin: {
          horizontal: 14,
          vertical: 0
        },
        markers: {
          width: 9,
          height: 9,
          radius: 9
        }
      },
      grid: { borderColor: "#e5e7eb", padding: { top: 34, right: 46, bottom: 18, left: 12 } },
      tooltip: { y: { formatter: (value) => formatNumber(value) } },
      noData: { text: "No allocation balance data" }
    });
  }

  function renderProductivityAhtCoachTable(kpiRows, users) {
    const rows = buildUserRankingRows(kpiRows, users)
      .filter((row) => row.allocation > 0 || row.processed > 0)
      .map((row) => {
        const highProductivity = row.productivity >= 75;
        const highAht = row.avg_aht >= 10;
        let coachingInsight = "Balanced";
        if (highProductivity && !highAht) coachingInsight = "Best performer";
        else if (highProductivity && highAht) coachingInsight = "Complex / quality-heavy work";
        else if (!highProductivity && !highAht) coachingInsight = "Check allocation / idle time";
        else coachingInsight = "Coaching needed";
        return { ...row, coaching_insight: coachingInsight, _rowFilter: { user: row.user_opusid, region: row.region, country: row.country } };
      })
      .sort((a, b) => {
        const riskA = (a.productivity < 50 ? 2 : a.productivity < 75 ? 1 : 0) + (a.avg_aht >= 10 ? 1 : 0) + (a.pending > 0 ? 0.5 : 0);
        const riskB = (b.productivity < 50 ? 2 : b.productivity < 75 ? 1 : 0) + (b.avg_aht >= 10 ? 1 : 0) + (b.pending > 0 ? 0.5 : 0);
        return riskB - riskA || b.processed - a.processed;
      });

    createTable("productivityAhtCoachTable", rows, [
      { title: "User", field: "user_name", minWidth: 145, frozen: true },
      { title: "Productivity", field: "productivity", width: 120, hozAlign: "right", formatter: pctBarFormatter },
      { title: "AHT", field: "avg_aht", width: 75, hozAlign: "right", formatter: decimalFormatter },
      { title: "Processed", field: "processed", width: 90, hozAlign: "right", formatter: numberFormatter },
      { title: "Pending", field: "pending", width: 82, hozAlign: "right", formatter: riskNumberFormatter },
      { title: "Coaching Insight", field: "coaching_insight", minWidth: 170, formatter: statusBadgeFormatter }
    ], { paginationSize: 8, layout: "fitColumns" });
  }

  function buildUserQualityRows(kpiRows, users, exceptions, parkingHold) {
    const exceptionByInvoice = new Map();
    exceptions.forEach((row) => {
      if (row.invoice_number) exceptionByInvoice.set(row.invoice_number, row);
    });

    const visibleFactRows = getVisibleFactRows();
    const exceptionByUser = new Map();
    visibleFactRows.forEach((row) => {
      if (!row.user_opusid || !row.invoice_number) return;
      if (!exceptionByInvoice.has(row.invoice_number)) return;
      exceptionByUser.set(row.user_opusid, (exceptionByUser.get(row.user_opusid) || 0) + 1);
    });

    const blockedByUser = new Map();
    parkingHold.forEach((row) => {
      if (!row.user_opusid) return;
      blockedByUser.set(row.user_opusid, (blockedByUser.get(row.user_opusid) || 0) + 1);
    });

    return buildUserRankingRows(kpiRows, users).map((row) => {
      const exceptionsCount = number(exceptionByUser.get(row.user_opusid) ?? row.exceptions);
      const blocked = number(blockedByUser.get(row.user_opusid)) + number(row.parking || 0) + number(row.hold || 0);
      const exceptionRate = pct(exceptionsCount, row.processed || row.allocation);
      const qualityStatus = exceptionRate >= 10 || blocked >= 10
        ? "Critical"
        : exceptionRate >= 5 || blocked >= 5
          ? "Needs Review"
          : "Healthy";

      return {
        ...row,
        exceptions: exceptionsCount,
        exception_rate: exceptionRate,
        blocked_work: blocked,
        quality_status: qualityStatus,
        _rowFilter: {
          user: row.user_opusid,
          region: row.region,
          country: row.country
        }
      };
    }).sort((a, b) => {
      if (b.exception_rate !== a.exception_rate) return b.exception_rate - a.exception_rate;
      return b.blocked_work - a.blocked_work;
    });
  }

  function renderUserQualityRateTable(kpiRows, users, exceptions, parkingHold) {
    const rows = buildUserQualityRows(kpiRows, users, exceptions, parkingHold);

    createTable("userQualityRateTable", rows, [
      { title: "User", field: "user_name", minWidth: 160, frozen: true },
      { title: "Processed", field: "processed", width: 95, hozAlign: "right", formatter: numberFormatter },
      { title: "Exceptions", field: "exceptions", width: 105, hozAlign: "right", formatter: riskNumberFormatter },
      { title: "Exception %", field: "exception_rate", width: 125, hozAlign: "right", formatter: pctBarFormatter },
      { title: "Parking/Hold", field: "blocked_work", width: 115, hozAlign: "right", formatter: riskNumberFormatter },
      { title: "Quality Status", field: "quality_status", minWidth: 140, formatter: statusBadgeFormatter }
    ], {
      paginationSize: 8,
      layout: "fitColumns"
    });
  }

  function statusBadgeFormatter(cell) {
    const value = clean(cell.getValue()) || "--";
    const color = value === "Healthy" || value === "Best performer" || value === "Balanced"
      ? "#16a34a"
      : value === "Needs Review" || value === "Check allocation / idle time" || value === "Complex / quality-heavy work"
        ? "#f59e0b"
        : value === "Critical" || value === "Coaching needed"
          ? "#ef4444"
          : "#64748b";

    return `<span style="display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;background:${color}18;color:${color};font-weight:900;font-size:11px;white-space:nowrap;">${escapeHtml(value)}</span>`;
  }


  function compactLabel(value, max = 16) {
    const text = clean(value);
    if (!text) return "--";
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  function apexNoDataText(rows, text = "No data found") {
    return safeArray(rows).some((row) => Object.values(row || {}).some((value) => number(value) > 0)) ? "" : text;
  }

  function buildAccessChips(title, icon, values, color, limit = 7) {
    const list = unique(safeArray(values).map(clean).filter((value) => value && value !== "Unknown"));
    if (!list.length) return "";
    const visible = list.slice(0, limit);
    const more = list.length - visible.length;
    return `
      <div class="access-section">
        <div class="access-section-label"><span class="material-symbols-outlined">${escapeHtml(icon)}</span>${escapeHtml(title)}</div>
        <div class="access-chips compact">
          ${visible.map((value) => `<span class="process-chip" style="--chip-color:${color};background:${color}18;color:${color};border:1px solid ${color}55;">${escapeHtml(compactLabel(value, 18))}</span>`).join("")}
          ${more > 0 ? `<span class="process-chip" style="--chip-color:#64748b;background:#f8fafc;color:#475569;border:1px solid #cbd5e1;">+${more} more</span>` : ""}
        </div>
      </div>
    `;
  }


  function renderDailyVolumeChart(kpiRows) {
    const rows = groupByDate(kpiRows);
    const totalAllocation = sum(rows, "allocation");
    const totalProcessed = sum(rows, "processed");
    const totalPending = sum(rows, "pending");
    const totalAll = totalAllocation;
    const categories = rows.map((row) => formatShortDate(row.date));
    const labelEvery = rows.length > 20 ? 4 : rows.length > 12 ? 2 : 1;
    ensureEnterpriseLegend("regionDailyVolumeChart", [
      { name: "Allocation", color: COLORS.blue },
      { name: "Processed", color: COLORS.green },
      { name: "Pending", color: COLORS.orange },
      { name: "Productivity %", color: COLORS.navy }
    ]);

    renderChart("regionDailyVolumeChart", {
      chart: { type: "line", height: "100%", toolbar: { show: false }, zoom: { enabled: false } },
      title: chartTotalTitle(`Total: ${formatNumber(totalAll)} | Allocation: ${formatNumber(totalAllocation)} | Processed: ${formatNumber(totalProcessed)} | Pending: ${formatNumber(totalPending)}`),
      series: [
        { name: "Allocation", type: "column", data: rows.map((row) => row.allocation) },
        { name: "Processed", type: "column", data: rows.map((row) => row.processed) },
        { name: "Pending", type: "column", data: rows.map((row) => row.pending) },
        { name: "Productivity %", type: "line", data: rows.map((row) => round(pct(row.processed, row.allocation), 1)) }
      ],
      colors: [COLORS.blue, COLORS.green, COLORS.orange, COLORS.navy],
      stroke: { width: [0, 0, 0, 3], curve: "smooth" },
      markers: { size: [0, 0, 0, rows.length <= 2 ? 5 : 3], strokeWidth: 2 },
      plotOptions: { bar: { borderRadius: 4, columnWidth: rows.length <= 2 ? "22%" : "46%", dataLabels: { position: "top" } } },
      xaxis: { categories, title: { text: "Date" }, labels: { rotate: rows.length > 7 ? -35 : 0, hideOverlappingLabels: true, trim: false } },
      yaxis: [
        { min: 0, forceNiceScale: true, title: { text: "Invoice Count" }, labels: { formatter: (value) => shortNumber(value) } },
        { min: 0, max: 100, opposite: true, title: { text: "Productivity %" }, labels: { formatter: (value) => `${formatDecimal(value, 0)}%` } }
      ],
      dataLabels: {
        enabled: true,
        enabledOnSeries: rows.length <= 2 ? [0, 1, 2, 3] : [0, 1, 2],
        offsetY: -4,
        background: { enabled: true, opacity: 0.86, borderRadius: 3 },
        style: { fontSize: "9px", fontWeight: 900 },
        formatter(value, opts) {
          if (!value) return "";
          if (rows.length > 2 && (opts.dataPointIndex || 0) % labelEvery !== 0) return "";
          return opts.seriesIndex === 3 ? `${formatDecimal(value, 0)}%` : shortNumber(value);
        }
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        floating: false,
        offsetX: 8,
        offsetY: 0,
        fontSize: "11px",
        fontWeight: 800,
        itemMargin: {
          horizontal: 14,
          vertical: 0
        },
        markers: {
          width: 9,
          height: 9,
          radius: 9
        }
      },
      grid: { borderColor: "#e5e7eb", padding: { top: 22, right: 30, bottom: 28, left: 12 } },
      tooltip: { shared: true, y: { formatter: (value, opts) => opts.seriesIndex === 3 ? `${formatDecimal(value, 1)}%` : formatNumber(value) } },
      noData: { text: "No trend data" }
    });
  }

  function renderRegionRankingChart(kpiRows) {
    const rows = groupKpi(kpiRows, "region")
      .map((row) => ({
        name: row.name,
        processed: row.processed,
        allocation: row.allocation,
        productivity: pct(row.processed, row.allocation)
      }))
      .sort((a, b) => b.productivity - a.productivity)
      .slice(0, 8)
      .reverse();

    const totalProcessed = sum(rows, "processed");
    const totalAllocation = sum(rows, "allocation");

    renderChart("regionProductivityRankingChart", {
      chart: { type: "bar", height: "100%", toolbar: { show: false }, zoom: { enabled: false } },
      title: chartTotalTitle(`Total processed: ${formatNumber(totalProcessed)} | Allocation: ${formatNumber(totalAllocation)}`),
      series: [{ name: "Productivity %", data: rows.map((row) => round(row.productivity, 1)) }],
      colors: [COLORS.green],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: rows.length <= 2 ? "34%" : "58%",
          dataLabels: { position: "right" },
          colors: {
            ranges: [
              { from: 0, to: 70, color: COLORS.red },
              { from: 70.01, to: 89.99, color: COLORS.amber },
              { from: 90, to: 100000, color: COLORS.green }
            ]
          }
        }
      },
      xaxis: { categories: rows.map((row) => compactLabel(row.name, 18)), min: 0, max: 100, title: { text: "Productivity %" }, labels: { formatter: (value) => `${formatDecimal(value, 0)}%`, rotate: 0 } },
      yaxis: { labels: { style: { fontWeight: 900 } } },
      dataLabels: {
        enabled: true,
        offsetX: 8,
        style: { fontSize: "11px", fontWeight: 900, colors: ["#0f172a"] },
        background: { enabled: true, opacity: 0.88, borderRadius: 4, foreColor: "#ffffff" },
        formatter(value, opts) {
          const row = rows[opts.dataPointIndex];
          return `${formatDecimal(value, 1)}% · ${formatNumber(row?.processed || 0)}`;
        }
      },
      grid: { borderColor: "#e5e7eb", padding: { top: 34, right: 100, bottom: 22, left: 18 } },
      tooltip: { y: { formatter: (value, opts) => `${formatDecimal(value, 1)}% productivity · ${formatNumber(rows[opts.dataPointIndex]?.processed || 0)} processed` } },
      noData: { text: "No ranking data" }
    });
  }

  function renderWorkloadProductivityChart(kpiRows) {
    const rows = groupKpi(kpiRows, "region")
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 12);

    const totalAllocation = sum(rows, "allocation");
    const totalProcessed = sum(rows, "processed");

    renderChart("regionWorkloadProductivityChart", {
      chart: {
        type: "line",
        height: "100%",
        stacked: false,
        toolbar: { show: false }
      },
      title: chartTotalTitle(`Total allocation: ${formatNumber(totalAllocation)} | Total processed: ${formatNumber(totalProcessed)}`),
      series: [
        {
          name: "Allocation",
          type: "column",
          data: rows.map((row) => row.allocation)
        },
        {
          name: "Processed",
          type: "column",
          data: rows.map((row) => row.processed)
        },
        {
          name: "Productivity %",
          type: "line",
          data: rows.map((row) => round(pct(row.processed, row.allocation), 1))
        }
      ],
      colors: [COLORS.blue, COLORS.green, COLORS.navy],
      stroke: {
        width: [0, 0, 3],
        curve: "smooth"
      },
      markers: { size: [0, 0, 4] },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: "52%",
          dataLabels: { position: "top" }
        }
      },
      xaxis: {
        categories: rows.map((row) => row.name)
      },
      yaxis: [
        {
          title: { text: "Count" },
          min: 0,
          labels: { formatter: (value) => shortNumber(value) }
        },
        {
          opposite: true,
          title: { text: "Productivity %" },
          min: 0,
          max: 100,
          labels: { formatter: (value) => `${formatDecimal(value, 0)}%` }
        }
      ],
      dataLabels: {
        enabled: true,
        enabledOnSeries: [0, 1, 2],
        offsetY: -4,
        style: { fontSize: "9px", fontWeight: 900 },
        background: { enabled: true, opacity: 0.75, borderRadius: 3 },
        formatter(value, opts) {
          if (!value) return "";
          return opts.seriesIndex === 2 ? `${formatDecimal(value, 0)}%` : shortNumber(value);
        }
      },
      legend: {
        position: "top",
        horizontalAlign: "left"
      },
      grid: {
        borderColor: "#e5e7eb",
        padding: { top: 26, right: 18, bottom: 12, left: 10 }
      },
      tooltip: {
        y: {
          formatter(value, opts) {
            return opts.seriesIndex === 2 ? `${formatDecimal(value, 1)}%` : formatNumber(value);
          }
        }
      },
      noData: {
        text: "No workload data"
      }
    });
  }

  function renderStatusDonutChart(factRows, exceptions, parkingHold) {
    const processed = factRows.filter((row) => row.completed_flag || row.completed_at).length;

    const pending = factRows.filter((row) => {
      return row.pending_flag || (row.allocated_at && !row.completed_at);
    }).length;

    const exception = exceptions.length;

    const parking = parkingHold.filter((row) => {
      return row.event_type.toLowerCase().includes("parking");
    }).length;

    const hold = parkingHold.filter((row) => {
      return row.event_type.toLowerCase().includes("hold");
    }).length;

    const labels = ["Processed", "Pending", "Exception", "Parking", "Hold"];
    const values = [processed, pending, exception, parking, hold];
    const total = values.reduce((a, b) => a + b, 0);

    renderChart("regionStatusDonutChart", {
      chart: {
        type: "donut",
        height: "100%",
        toolbar: { show: false }
      },
      title: chartTotalTitle(`Total work: ${formatNumber(total)}`),
      labels,
      series: values,
      colors: [COLORS.green, COLORS.orange, COLORS.red, COLORS.purple, COLORS.amber],
      plotOptions: {
        pie: {
          donut: {
            size: "64%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total Work",
                formatter() {
                  return formatNumber(total);
                }
              }
            }
          }
        }
      },
      legend: {
        position: "right"
      },
      dataLabels: {
        enabled: true,
        formatter(value, opts) {
          const count = values[opts.seriesIndex] || 0;
          return count ? `${formatDecimal(value, 1)}%` : "";
        }
      },
      tooltip: {
        y: {
          formatter(value) {
            return `${formatNumber(value)} (${formatDecimal(pct(value, total), 1)}%)`;
          }
        }
      },
      noData: {
        text: "No status data"
      }
    });
  }

  function renderUserRankingTable(kpiRows, users) {
    const rows = buildUserRankingRows(kpiRows, users);

    createTable("regionUserRankingTable", rows, [
      { title: "Rank", field: "rank", width: 70, hozAlign: "center", formatter: rankFormatter },
      { title: "User", field: "user_name", minWidth: 180 },
      { title: "Opus ID", field: "user_opusid", width: 120 },
      { title: "Region", field: "region", width: 110 },
      { title: "Supervisor", field: "supervisor_name", minWidth: 160 },
      { title: "Process", field: "process_label", minWidth: 160 },
      { title: "Allocation", field: "allocation", hozAlign: "right", width: 105, formatter: numberFormatter },
      { title: "Processed", field: "processed", hozAlign: "right", width: 105, formatter: numberFormatter },
      { title: "Pending", field: "pending", hozAlign: "right", width: 95, formatter: numberFormatter },
      { title: "Productivity %", field: "productivity", hozAlign: "right", width: 135, formatter: pctBarFormatter },
      { title: "AHT", field: "avg_aht", hozAlign: "right", width: 90, formatter: decimalFormatter },
      { title: "Exceptions", field: "exceptions", hozAlign: "right", width: 110, formatter: riskNumberFormatter },
      { title: "Category", field: "category", width: 120, formatter: categoryFormatter }
    ]);
  }

  function renderRegionHeatmap(kpiRows) {
    const dates = groupByDate(kpiRows).map((row) => row.date).slice(-14);
    const regions = groupKpi(kpiRows, "region")
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 8)
      .map((row) => row.name);

    const series = regions.map((region) => ({
      name: region,
      data: dates.map((date) => {
        const subset = kpiRows.filter((row) => row.region === region && row.activity_date === date);
        const summary = summarizeKpi(subset);
        return { x: formatShortDate(date), y: round(pct(summary.processed, summary.allocation), 1) };
      })
    }));

    renderChart("regionProductivityHeatmap", {
      chart: { type: "heatmap", height: "100%", toolbar: { show: false } },
      series,
      colors: [COLORS.green],
      dataLabels: { enabled: true, style: { fontSize: "10px", fontWeight: 900 }, formatter(value) { return `${formatDecimal(value, 0)}%`; } },
      xaxis: { title: { text: "Activity Date" }, labels: { rotate: -35, trim: false, hideOverlappingLabels: true } },
      yaxis: { title: { text: "Region" } },
      legend: { position: "bottom", horizontalAlign: "center" },
      plotOptions: {
        heatmap: {
          radius: 2,
          shadeIntensity: 0.45,
          colorScale: {
            ranges: [
              { from: 0, to: 70, name: "<70% Critical", color: COLORS.red },
              { from: 70.01, to: 89.99, name: "70-90% Average", color: COLORS.amber },
              { from: 90, to: 999, name: "90%+ Good", color: COLORS.green }
            ]
          }
        }
      },
      grid: { padding: { top: 18, right: 18, bottom: 34, left: 12 } },
      tooltip: { y: { formatter: (value) => `${formatDecimal(value, 1)}% productivity` } },
      noData: { text: "No heatmap data" }
    });
  }


  function renderStatusDonutFromKpiChart(kpiRows) {
    const summary = summarizeKpi(kpiRows);
    const parking = number(summary.parking || 0);
    const hold = number(summary.hold || 0);
    const values = [summary.processed, summary.pending, summary.exceptions, parking, hold];
    const labels = ["Processed", "Pending", "Exception", "Parking", "Hold"];
    const total = values.reduce((a, b) => a + number(b), 0);

    renderChart("regionStatusDonutChart", {
      chart: { type: "donut", height: "100%", toolbar: { show: false } },
      title: chartTotalTitle(`Total work from cache: ${formatNumber(total)}`),
      labels,
      series: values,
      colors: [COLORS.green, COLORS.orange, COLORS.red, COLORS.purple, COLORS.amber],
      plotOptions: {
        pie: {
          donut: {
            size: "64%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total Work",
                formatter() { return formatNumber(total); }
              }
            }
          }
        }
      },
      legend: { position: "right" },
      dataLabels: {
        enabled: true,
        formatter(value, opts) {
          const count = values[opts.seriesIndex] || 0;
          return count ? `${formatDecimal(value, 1)}%` : "";
        }
      },
      tooltip: { y: { formatter: (value) => `${formatNumber(value)} (${formatDecimal(pct(value, total), 1)}%)` } },
      noData: { text: "No status data" }
    });
  }

  function renderPendingByProcessFromKpiChart(kpiRows) {
    const rows = groupKpi(kpiRows, "process")
      .map((row) => ({ name: row.name, count: row.pending }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);

    const total = rows.reduce((sumValue, row) => sumValue + row.count, 0);

    renderChart("regionPendingAgingChart", {
      chart: { type: "bar", height: "100%", toolbar: { show: false } },
      title: chartTotalTitle(`Pending by process from cache: ${formatNumber(total)}`),
      series: [{ name: "Pending", data: rows.map((row) => row.count) }],
      colors: [COLORS.orange],
      plotOptions: { bar: { borderRadius: 5, columnWidth: "55%", dataLabels: { position: "top" } } },
      xaxis: { categories: rows.map((row) => row.name) },
      yaxis: { labels: { formatter: (value) => shortNumber(value) } },
      dataLabels: {
        enabled: true,
        offsetY: -5,
        style: { fontSize: "10px", fontWeight: 900 },
        formatter(value) { return value ? `${formatNumber(value)} (${formatDecimal(pct(value, total), 1)}%)` : ""; }
      },
      tooltip: { y: { formatter: (value) => `${formatNumber(value)} (${formatDecimal(pct(value, total), 1)}%)` } },
      grid: { borderColor: "#e5e7eb", padding: { top: 28, right: 18, bottom: 12, left: 10 } },
      noData: { text: "No pending data" }
    });
  }

  function renderParkingHoldFromKpiChart(kpiRows) {
    const grouped = groupKpi(kpiRows, "process").map((row) => ({
      name: row.name,
      parking: number(row.parking || 0),
      hold: number(row.hold || 0)
    })).filter((row) => row.parking || row.hold);

    const total = grouped.reduce((sumValue, row) => sumValue + row.parking + row.hold, 0);

    renderChart("regionParkingHoldChart", {
      chart: { type: "bar", height: "100%", stacked: true, toolbar: { show: false } },
      title: chartTotalTitle(`Blocked work from cache: ${formatNumber(total)}`),
      series: [
        { name: "Parking", data: grouped.map((row) => row.parking) },
        { name: "Hold", data: grouped.map((row) => row.hold) }
      ],
      colors: [COLORS.purple, COLORS.amber],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "58%" } },
      xaxis: { categories: grouped.map((row) => row.name), labels: { rotate: 0, formatter: (value) => shortNumber(value) } },
      dataLabels: {
        enabled: true,
        style: { fontSize: "10px", fontWeight: 900, colors: ["#ffffff"] },
        formatter(value) { return value ? formatNumber(value) : ""; }
      },
      legend: { show: false },
      grid: { borderColor: "#e5e7eb", padding: { top: 28, right: 24, bottom: 12, left: 10 } },
      tooltip: { y: { formatter: (value) => formatNumber(value) } },
      noData: { text: "No parking/hold data" }
    });
  }

  function renderCountryWorkloadFromKpiChart(kpiRows) {
    const rows = groupKpi(kpiRows, "country")
      .map((row) => ({ name: row.name, count: row.allocation }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const total = rows.reduce((sumValue, row) => sumValue + row.count, 0);

    renderChart("regionVendorWorkloadChart", {
      chart: { type: "bar", height: "100%", toolbar: { show: false } },
      title: chartTotalTitle(`Top country workload from cache: ${formatNumber(total)}`),
      series: [{ name: "Allocation", data: rows.map((row) => row.count) }],
      colors: [COLORS.magenta],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "58%" } },
      xaxis: { categories: rows.map((row) => row.name), labels: { rotate: 0, formatter: (value) => shortNumber(value) } },
      dataLabels: {
        enabled: true,
        style: { fontSize: "10px", fontWeight: 900 },
        formatter(value) { return value ? `${formatNumber(value)} · ${formatDecimal(pct(value, total), 1)}%` : ""; }
      },
      grid: { borderColor: "#e5e7eb", padding: { top: 28, right: 24, bottom: 12, left: 10 } },
      tooltip: { y: { formatter: (value) => `${formatNumber(value)} allocations (${formatDecimal(pct(value, total), 1)}% of top countries)` } },
      noData: { text: "No workload data" }
    });
  }

  function renderPendingAgingChart(factRows) {
    const buckets = ["0-1 Days", "2-3 Days", "4-7 Days", "8-15 Days", "15+ Days"];
    const bucketMap = Object.fromEntries(buckets.map((bucket) => [bucket, 0]));

    factRows
      .filter((row) => row.pending_flag || (row.allocated_at && !row.completed_at))
      .forEach((row) => {
        bucketMap[getAgingBucket(row.allocated_at)] += 1;
      });

    const values = buckets.map((bucket) => bucketMap[bucket]);
    const total = values.reduce((a, b) => a + b, 0);

    renderChart("regionPendingAgingChart", {
      chart: {
        type: "bar",
        height: "100%",
        toolbar: { show: false }
      },
      title: chartTotalTitle(`Total pending: ${formatNumber(total)}`),
      series: [
        {
          name: "Pending",
          data: values
        }
      ],
      colors: [COLORS.orange],
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: "55%",
          dataLabels: { position: "top" }
        }
      },
      xaxis: {
        categories: buckets
      },
      yaxis: { labels: { formatter: (value) => shortNumber(value) } },
      dataLabels: {
        enabled: true,
        offsetY: -5,
        style: { fontSize: "10px", fontWeight: 900 },
        formatter(value) {
          return value ? `${formatNumber(value)} (${formatDecimal(pct(value, total), 1)}%)` : "";
        }
      },
      tooltip: { y: { formatter: (value) => `${formatNumber(value)} (${formatDecimal(pct(value, total), 1)}%)` } },
      grid: {
        borderColor: "#e5e7eb",
        padding: { top: 28, right: 18, bottom: 12, left: 10 }
      },
      noData: {
        text: "No aging data"
      }
    });
  }

  function renderProcessContributionChart(kpiRows) {
    const regions = groupKpi(kpiRows, "region")
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 8)
      .map((row) => row.name);

    const processes = unique(kpiRows.map((row) => row.process));
    const regionTotals = new Map(regions.map((region) => [
      region,
      sum(kpiRows.filter((row) => row.region === region), "allocation_count")
    ]));
    const grandTotal = [...regionTotals.values()].reduce((a, b) => a + b, 0);

    const series = processes.map((process) => ({
      name: process,
      data: regions.map((region) => {
        return sum(
          kpiRows.filter((row) => row.region === region && row.process === process),
          "allocation_count"
        );
      })
    }));

    renderChart("regionProcessContributionChart", {
      chart: {
        type: "bar",
        height: "100%",
        stacked: true,
        toolbar: { show: false }
      },
      title: chartTotalTitle(`Total allocation: ${formatNumber(grandTotal)}`),
      series,
      colors: processes.map((process) => PROCESS_COLORS[process] || COLORS.gray),
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          barHeight: "58%"
        }
      },
      xaxis: {
        categories: regions,
        labels: { rotate: 0, formatter: (value) => shortNumber(value) }
      },
      dataLabels: {
        enabled: true,
        style: { fontSize: "9px", fontWeight: 900, colors: ["#ffffff"] },
        formatter(value, opts) {
          if (!value) return "";
          const region = regions[opts.dataPointIndex];
          const regionTotal = regionTotals.get(region) || 0;
          return `${shortNumber(value)} · ${formatDecimal(pct(value, regionTotal), 0)}%`;
        }
      },
      legend: {
        position: "top",
        horizontalAlign: "left"
      },
      grid: {
        borderColor: "#e5e7eb",
        padding: { top: 28, right: 18, bottom: 12, left: 10 }
      },
      tooltip: { y: { formatter: (value) => `${formatNumber(value)} (${formatDecimal(pct(value, grandTotal), 1)}% of total)` } },
      noData: {
        text: "No process data"
      }
    });
  }

  /**
   * renderProcessSummaryByTypeChart — NEW
   * Shows Allocated, Processed and Pending for each process type
   * (BizCommon, CSR, Indexing, Processing, Parking) so managers
   * can see the allocation / count / processed split at a glance.
   */
  function renderProcessSummaryByTypeChart(kpiRows) {
    const ordered = ["Indexing", "Processing", "CSR", "BizCommon", "Parking"];
    const processes = ordered.filter((p) =>
      kpiRows.some((r) => r.process === p)
    );

    if (!processes.length) return;

    const allocation = processes.map((p) =>
      sum(kpiRows.filter((r) => r.process === p), "allocation")
    );
    const processed = processes.map((p) =>
      sum(kpiRows.filter((r) => r.process === p), "processed")
    );
    const pending = processes.map((p) =>
      sum(kpiRows.filter((r) => r.process === p), "pending")
    );

    const grandAlloc = allocation.reduce((a, b) => a + b, 0);
    const grandProc  = processed.reduce((a, b) => a + b, 0);

    renderChart("regionProcessSummaryChart", {
      chart: { type: "bar", height: "100%", stacked: false, toolbar: { show: false } },
      title: chartTotalTitle(
        `Allocation: ${formatNumber(grandAlloc)} | Processed: ${formatNumber(grandProc)} | Rate: ${formatDecimal(pct(grandProc, grandAlloc), 1)}%`
      ),
      series: [
        { name: "Allocated",  data: allocation },
        { name: "Processed",  data: processed },
        { name: "Pending",    data: pending }
      ],
      colors: [COLORS.blue, COLORS.green, COLORS.orange],
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: "58%",
          dataLabels: { position: "top" }
        }
      },
      xaxis: {
        categories: processes,
        labels: { style: { fontSize: "11px", fontWeight: 800 } }
      },
      yaxis: {
        labels: { formatter: (value) => shortNumber(value) }
      },
      dataLabels: {
        enabled: true,
        offsetY: -5,
        style: { fontSize: "9px", fontWeight: 900 },
        formatter(value) { return value ? shortNumber(value) : ""; }
      },
      legend: { position: "top", horizontalAlign: "left" },
      grid: { borderColor: "#e5e7eb", padding: { top: 28, right: 18, bottom: 12, left: 10 } },
      tooltip: { y: { formatter: (value) => formatNumber(value) } },
      noData: { text: "No process data available" }
    });
  }

  function renderExceptionParetoChart(exceptions, kpiRows = []) {
    let rows = topCount(exceptions, "exception_reason", 8);
    let fallbackMode = false;

    if (!rows.length) {
      rows = groupKpi(kpiRows, "region")
        .map((row) => ({ name: row.name, count: row.exceptions }))
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      fallbackMode = rows.length > 0;
    }

    const total = rows.reduce((sumValue, row) => sumValue + row.count, 0);
    let running = 0;

    const cumulative = rows.map((row) => {
      running += row.count;
      return total ? round((running / total) * 100, 1) : 0;
    });

    renderChart("regionExceptionParetoChart", {
      chart: {
        type: "line",
        height: "100%",
        toolbar: { show: false }
      },
      title: chartTotalTitle(`${fallbackMode ? "Total exceptions by region" : "Total exceptions"}: ${formatNumber(total)}`),
      series: [
        {
          name: fallbackMode ? "Exception Count by Region" : "Exception Count",
          type: "column",
          data: rows.map((row) => row.count)
        },
        {
          name: "Cumulative %",
          type: "line",
          data: cumulative
        }
      ],
      colors: [COLORS.red, COLORS.navy],
      stroke: {
        width: [0, 3],
        curve: "smooth"
      },
      markers: { size: [0, 4] },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: "55%",
          dataLabels: { position: "top" }
        }
      },
      xaxis: {
        categories: rows.map((row) => row.name),
        labels: {
          rotate: -35,
          trim: true
        }
      },
      yaxis: [
        {
          title: { text: "Count" },
          min: 0,
          labels: { formatter: (value) => shortNumber(value) }
        },
        {
          opposite: true,
          title: { text: "Cumulative %" },
          min: 0,
          max: 100,
          labels: { formatter: (value) => `${formatDecimal(value, 0)}%` }
        }
      ],
      dataLabels: {
        enabled: true,
        enabledOnSeries: [0, 1],
        background: { enabled: true, opacity: 0.78, borderRadius: 3 },
        style: { fontSize: "9px", fontWeight: 900 },
        formatter(value, opts) {
          if (!value) return "";
          return opts.seriesIndex === 1 ? `${formatDecimal(value, 0)}%` : formatNumber(value);
        }
      },
      legend: {
        position: "top",
        horizontalAlign: "left"
      },
      grid: {
        borderColor: "#e5e7eb",
        padding: { top: 28, right: 18, bottom: 30, left: 10 }
      },
      tooltip: {
        y: {
          formatter(value, opts) {
            return opts.seriesIndex === 1 ? `${formatDecimal(value, 1)}%` : formatNumber(value);
          }
        }
      },
      noData: {
        text: "No exception data"
      }
    });
  }

  function renderParkingHoldChart(rows) {
    const data = topCount(rows, "reason", 8);
    const total = data.reduce((sumValue, row) => sumValue + row.count, 0);

    renderChart("regionParkingHoldChart", {
      chart: {
        type: "bar",
        height: "100%",
        toolbar: { show: false }
      },
      title: chartTotalTitle(`Total blocked: ${formatNumber(total)}`),
      series: [
        {
          name: "Count",
          data: data.map((row) => row.count)
        }
      ],
      colors: [COLORS.amber],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5,
          barHeight: "58%"
        }
      },
      xaxis: {
        categories: data.map((row) => row.name),
        labels: { rotate: 0, formatter: (value) => shortNumber(value) }
      },
      dataLabels: {
        enabled: true,
        style: { fontSize: "10px", fontWeight: 900 },
        formatter(value) {
          return value ? `${formatNumber(value)} · ${formatDecimal(pct(value, total), 1)}%` : "";
        }
      },
      grid: {
        borderColor: "#e5e7eb",
        padding: { top: 28, right: 24, bottom: 12, left: 10 }
      },
      tooltip: { y: { formatter: (value) => `${formatNumber(value)} (${formatDecimal(pct(value, total), 1)}%)` } },
      noData: {
        text: "No parking/hold data"
      }
    });
  }

  function renderVendorWorkloadChart(factRows) {
    const data = topCount(factRows, "supplier_name", 10);
    const total = data.reduce((sumValue, row) => sumValue + row.count, 0);

    renderChart("regionVendorWorkloadChart", {
      chart: {
        type: "bar",
        height: "100%",
        toolbar: { show: false }
      },
      title: chartTotalTitle(`Top vendor workload: ${formatNumber(total)}`),
      series: [
        {
          name: "Invoices",
          data: data.map((row) => row.count)
        }
      ],
      colors: [COLORS.magenta],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5,
          barHeight: "58%"
        }
      },
      xaxis: {
        categories: data.map((row) => row.name),
        labels: { rotate: 0, formatter: (value) => shortNumber(value) }
      },
      dataLabels: {
        enabled: true,
        style: { fontSize: "10px", fontWeight: 900 },
        formatter(value) {
          return value ? `${formatNumber(value)} · ${formatDecimal(pct(value, total), 1)}%` : "";
        }
      },
      grid: {
        borderColor: "#e5e7eb",
        padding: { top: 28, right: 24, bottom: 12, left: 10 }
      },
      tooltip: {
        y: {
          formatter(value) {
            return `${formatNumber(value)} invoices (${formatDecimal(pct(value, total), 1)}% of top vendors)`;
          }
        }
      },
      noData: {
        text: "No vendor data"
      }
    });
  }

  function renderSupervisorTable(kpiRows, users) {
    const usersMap = userMapById();
    const supervisorUsers = new Map();

    users.forEach((user) => {
      const supervisor = user.supervisor_name || "Unknown";
      if (!supervisorUsers.has(supervisor)) supervisorUsers.set(supervisor, new Set());
      if (user.user_opusid) supervisorUsers.get(supervisor).add(user.user_opusid);
    });

    const map = new Map();

    kpiRows.forEach((row) => {
      const user = usersMap.get(row.user_opusid);
      const supervisor = user?.supervisor_name || "Unknown";

      if (!map.has(supervisor)) {
        map.set(supervisor, {
          supervisor,
          users: new Set(supervisorUsers.get(supervisor) || []),
          activeUsers: new Set(),
          lowPerformers: new Set(),
          allocation: 0,
          processed: 0,
          pending: 0,
          exceptions: 0,
          ahtValues: []
        });
      }

      const item = map.get(supervisor);
      if (row.user_opusid) {
        item.users.add(row.user_opusid);
        if (row.processed_count > 0) item.activeUsers.add(row.user_opusid);
      }

      item.allocation += row.allocation_count;
      item.processed += row.processed_count;
      item.pending += row.pending_count;
      item.exceptions += row.exception_count;
      if (row.avg_aht_minutes) item.ahtValues.push(row.avg_aht_minutes);
    });

    buildUserRankingRows(kpiRows, users).forEach((row) => {
      const supervisor = row.supervisor_name || "Unknown";
      if (!map.has(supervisor)) {
        map.set(supervisor, {
          supervisor,
          users: new Set(supervisorUsers.get(supervisor) || []),
          activeUsers: new Set(),
          lowPerformers: new Set(),
          allocation: 0,
          processed: 0,
          pending: 0,
          exceptions: 0,
          ahtValues: []
        });
      }

      if (row.allocation > 0 && row.productivity < 50) {
        map.get(supervisor).lowPerformers.add(row.user_opusid);
      }
    });

    const rows = [...map.values()]
      .map((row) => {
        const idleUsers = [...row.users].filter((userId) => !row.activeUsers.has(userId)).length;

        return {
          supervisor: row.supervisor,
          users: row.users.size,
          active_users: row.activeUsers.size,
          allocation: row.allocation,
          processed: row.processed,
          pending: row.pending,
          pending_per_user: row.users.size ? row.pending / row.users.size : 0,
          productivity: pct(row.processed, row.allocation),
          avg_aht: avg(row.ahtValues),
          idle_users: idleUsers,
          low_performers: row.lowPerformers.size,
          exceptions: row.exceptions,
          _rowFilter: { supervisor: row.supervisor }
        };
      })
      .sort((a, b) => b.processed - a.processed);

    createTable("regionSupervisorSummaryTable", rows, [
      { title: "Supervisor", field: "supervisor", minWidth: 170, frozen: true },
      { title: "Users", field: "users", width: 75, hozAlign: "right", formatter: numberFormatter },
      { title: "Active", field: "active_users", width: 80, hozAlign: "right", formatter: numberFormatter },
      { title: "Allocation", field: "allocation", width: 100, hozAlign: "right", formatter: numberFormatter },
      { title: "Processed", field: "processed", width: 100, hozAlign: "right", formatter: numberFormatter },
      { title: "Pending/User", field: "pending_per_user", width: 110, hozAlign: "right", formatter: decimalFormatter },
      { title: "Productivity", field: "productivity", width: 125, hozAlign: "right", formatter: pctBarFormatter },
      { title: "Avg AHT", field: "avg_aht", width: 85, hozAlign: "right", formatter: decimalFormatter },
      { title: "Idle", field: "idle_users", width: 75, hozAlign: "right", formatter: riskNumberFormatter },
      { title: "Low Performers", field: "low_performers", width: 120, hozAlign: "right", formatter: riskNumberFormatter }
    ], {
      paginationSize: 8,
      layout: "fitColumns"
    });
  }

  function renderDetailedPerformanceTable(kpiRows, users) {
    const usersMap = userMapById();
    const map = new Map();

    kpiRows.forEach((row) => {
      const key = [
        row.region,
        row.country,
        row.user_opusid,
        row.process
      ].join("|");

      const user = usersMap.get(row.user_opusid);

      if (!map.has(key)) {
        map.set(key, {
          region: row.region,
          country: row.country,
          location: user?.location || "",
          supervisor_name: user?.supervisor_name || "",
          user_name: user?.user_name || row.user_opusid || "Unknown",
          user_opusid: row.user_opusid,
          process: row.process,
          allocation: 0,
          processed: 0,
          pending: 0,
          exceptions: 0,
          blocked: 0,
          ahtValues: [],
          last_action_date: row.activity_date
        });
      }

      const item = map.get(key);

      item.allocation += row.allocation_count;
      item.processed += row.processed_count;
      item.pending += row.pending_count;
      item.exceptions += row.exception_count;
      item.blocked += row.parking_count + row.hold_count;

      if (row.avg_aht_minutes) item.ahtValues.push(row.avg_aht_minutes);
      if (row.activity_date > item.last_action_date) item.last_action_date = row.activity_date;
    });

    const rows = [...map.values()]
      .map((row) => ({
        ...row,
        productivity: pct(row.processed, row.allocation),
        avg_aht: avg(row.ahtValues),
        _rowFilter: {
          region: row.region,
          country: row.country,
          user: row.user_opusid,
          process: row.process
        }
      }))
      .sort((a, b) => b.processed - a.processed);

    createTable("regionDetailedPerformanceTable", rows, [
      { title: "Region", field: "region", width: 100 },
      { title: "Country", field: "country", width: 120 },
      { title: "Location", field: "location", width: 120 },
      { title: "Supervisor", field: "supervisor_name", minWidth: 160 },
      { title: "User", field: "user_name", minWidth: 170 },
      { title: "Process", field: "process", width: 125, formatter: processFormatter },
      { title: "Allocation", field: "allocation", width: 105, hozAlign: "right", formatter: numberFormatter },
      { title: "Processed", field: "processed", width: 105, hozAlign: "right", formatter: numberFormatter },
      { title: "Pending", field: "pending", width: 95, hozAlign: "right", formatter: numberFormatter },
      { title: "Productivity %", field: "productivity", width: 135, hozAlign: "right", formatter: pctBarFormatter },
      { title: "AHT", field: "avg_aht", width: 90, hozAlign: "right", formatter: decimalFormatter },
      { title: "Exception", field: "exceptions", width: 105, hozAlign: "right", formatter: riskNumberFormatter },
      { title: "Blocked", field: "blocked", width: 95, hozAlign: "right", formatter: riskNumberFormatter },
      { title: "Last Action", field: "last_action_date", width: 120 }
    ]);
  }

  function getUserChartProcesses(access, kpiRows = [], factRows = []) {
    const ordered = ["Indexing", "Processing", "CSR", "BizCommon", "Parking"];
    const set = new Set();

    safeArray(access).forEach((process) => {
      const normalized = normalizeProcess(process);
      if (normalized) set.add(normalized);
    });

    safeArray(kpiRows).forEach((row) => {
      const normalized = normalizeProcess(row.process);
      if (normalized) set.add(normalized);
    });

    safeArray(factRows).forEach((row) => {
      const normalized = normalizeProcess(row.process);
      if (normalized) set.add(normalized);
    });

    return ordered.filter((process) => set.has(process));
  }

  function hourLabelFromDate(value) {
    const date = parseDate(value);
    return date ? `${String(date.getHours()).padStart(2, "0")}:00` : "";
  }

  function getUserHourlyWindow(factRows, processFilter = "") {
    const hours = new Set();

    safeArray(factRows).forEach((row) => {
      if (processFilter && row.process !== processFilter) return;
      const allocated = hourLabelFromDate(row.allocated_at);
      const completed = hourLabelFromDate(row.completed_at);
      if (allocated) hours.add(allocated);
      if (completed) hours.add(completed);
    });

    if (!hours.size) return [];

    const nums = [...hours].map((hour) => number(hour.slice(0, 2))).sort((a, b) => a - b);
    const start = Math.max(0, nums[0] - 1);
    const end = Math.min(23, nums[nums.length - 1] + 1);

    return Array.from({ length: end - start + 1 }, (_, index) => `${String(start + index).padStart(2, "0")}:00`);
  }

  function buildHourlyProductivityRows(factRows, processFilter = "") {
    const rows = safeArray(factRows).filter((row) => {
      if (processFilter && row.process !== processFilter) return false;
      return row.allocated_at || row.completed_at;
    });

    const hours = getUserHourlyWindow(rows, processFilter);
    let cumulativeReceived = 0;
    let cumulativeProcessed = 0;

    return hours.map((hour) => {
      const received = rows.filter((row) => hourLabelFromDate(row.allocated_at) === hour).length;
      const processed = rows.filter((row) => hourLabelFromDate(row.completed_at) === hour).length;
      cumulativeReceived += received;
      cumulativeProcessed += processed;

      return {
        hour,
        received,
        processed,
        cumulativeReceived,
        cumulativeProcessed,
        pendingGap: Math.max(cumulativeReceived - cumulativeProcessed, 0),
        productivity: round(pct(cumulativeProcessed, cumulativeReceived), 1)
      };
    });
  }

  function getDateRangeFromFilters() {
    const start = parseDateOnly(DASH.filters.dateFrom);
    const end = parseDateOnly(DASH.filters.dateTo);
    const dates = [];
    const cursor = new Date(start);

    while (cursor <= end && dates.length <= 31) {
      dates.push(toDateInput(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }

  function getProcessCellKey(process) {
    return `process_${String(process).replace(/[^a-z0-9]/gi, "_")}`;
  }

  function productivityStatus(value) {
    const pctValue = number(value);
    if (pctValue >= 85) return { label: "Strong", color: COLORS.green, bg: "#dcfce7", border: "#86efac" };
    if (pctValue >= 60) return { label: "Watch", color: COLORS.amber, bg: "#fffbeb", border: "#fde68a" };
    return { label: "Risk", color: COLORS.red, bg: "#fee2e2", border: "#fecaca" };
  }

  function miniProcessMatrixFormatter(cell) {
    const value = cell.getValue() || {};
    const received = number(value.received);
    const processed = number(value.processed);
    const pending = number(value.pending);
    const productivity = number(value.productivity);
    const maxValue = Math.max(received, processed, pending, 1);
    const status = productivityStatus(productivity);

    if (!received && !processed && !pending) {
      return `<div class="mini-matrix-empty">No work</div>`;
    }

    const bar = (label, count, color) => {
      const width = Math.max(3, Math.round((number(count) / maxValue) * 100));
      return `
        <div class="mini-matrix-row">
          <span>${label}</span>
          <div class="mini-matrix-track"><i style="width:${width}%;background:${color};"></i></div>
          <b>${formatNumber(count)}</b>
        </div>
      `;
    };

    return `
      <div class="mini-matrix-cell">
        ${bar("Received", received, COLORS.blue)}
        ${bar("Processed", processed, COLORS.green)}
        ${bar("Pending", pending, COLORS.orange)}
        <div class="mini-matrix-foot" style="background:${status.bg};border-color:${status.border};color:${status.color};">
          ${formatDecimal(productivity, 1)}% · ${status.label}
        </div>
      </div>
    `;
  }

  function ensureHourlyProcessSelect(processes) {
    const select = $("userHourlyProcessSelect");
    if (!select) return "";

    const current = DASH.userHourlyProcessFilter || "";
    const allowed = ["", ...safeArray(processes)];
    const nextValue = allowed.includes(current) ? current : "";

    select.innerHTML = [
      `<option value="">All Processes</option>`,
      ...safeArray(processes).map((process) => `<option value="${escapeAttr(process)}">${escapeHtml(process)}</option>`)
    ].join("");

    select.value = nextValue;
    DASH.userHourlyProcessFilter = nextValue;

    if (!select.dataset.boundUserHourlyProcess) {
      select.dataset.boundUserHourlyProcess = "1";
      select.addEventListener("change", () => {
        DASH.userHourlyProcessFilter = select.value || "";
        renderActivePage();
      });
    }

    return nextValue;
  }

  function minutesBetween(start, end) {
    const a = parseDate(start);
    const b = parseDate(end);
    if (!a || !b) return 0;
    return Math.max(0, (b.getTime() - a.getTime()) / 60000);
  }

  function pendingAgeHours(row) {
    const allocated = parseDate(row.allocated_at);
    if (!allocated) return 0;
    const completed = parseDate(row.completed_at);
    const end = completed || new Date();
    return Math.max(0, (end.getTime() - allocated.getTime()) / 3600000);
  }

  function pendingAgeLabel(row) {
    if (row.completed_at || row.completed_flag) return "--";
    const hours = pendingAgeHours(row);
    if (hours >= 24) return `${formatDecimal(hours / 24, 1)}d`;
    return `${formatDecimal(hours, 1)}h`;
  }

  function findInvoiceBlocker(row, exceptions = [], parkingHold = []) {
    const invoice = clean(row.invoice_number);
    const conv = clean(row.conversation_id);

    const exception = safeArray(exceptions).find((item) => {
      return (invoice && item.invoice_number === invoice) || (conv && item.conversation_id === conv);
    });

    if (exception) {
      if (exception.pending_with_supplier) return "Pending with Supplier";
      return exception.exception_reason || "Exception";
    }

    const blocked = safeArray(parkingHold).find((item) => {
      return (invoice && item.invoice_number === invoice) || (conv && item.conversation_id === conv);
    });

    if (blocked) return blocked.reason || blocked.event_type || "Parking/Hold";
    if (row.pending_flag && !row.completed_at) return "Pending";
    return "--";
  }

  function setCardVisible(cardId, visible) {
    const card = $(cardId);
    if (!card) return;
    card.classList.toggle("hidden", !visible);
  }

  function renderUserPage() {
    const selectedUserId = DASH.filters.user[0] || "";
    const user = selectedUserId ? userMapById().get(selectedUserId) || null : null;

    // Do not pick the first/top user automatically. The Individual tab remains
    // intentionally blank until the user selects a user filter or clicks a user row.
    if (!selectedUserId) {
      renderUserProfile(null, [], []);
      renderUserKpis([], [], []);
      renderUserInsights([], [], []);
      renderUserRunningChart([], []);
      renderUserHourlyProcessChart([], [], []);
      renderUserProcessTable([], []);
      renderUserMatrixTable([], []);
      renderUserDailyTrend([]);
      renderUserExceptionChart([]);
      renderUserParkingHoldChart([]);
      renderUserAhtTrend([], []);
      renderUserBenchmark([]);
      renderUserHeatmap([]);
      renderUserShiftUtilization(null, []);
      renderUserPendingAgingRisk([]);
      renderUserSameDayCarryover([]);
      renderUserAhtByProcess([], []);
      renderUserWorkSplitDonut([], []);
      renderUserProductivityBlockers([], [], [], []);
      renderUserSmartInsights([], [], [], [], null);
      renderUserInvoiceTable([], [], []);
      updateProcessCardVisibility([]);
      setText("userProfileName", "Select User");
      setText("userProfileSub", "Choose a user from AP Filter or click a user row from Region Level Analysis");
      updateFilterSummary();
      return;
    }

    const kpiRows = getDashboardKpiRows().filter((row) => row.user_opusid === selectedUserId);
    const previousRows = getVisiblePreviousKpiRows().filter((row) => row.user_opusid === selectedUserId);
    const factRows = getVisibleFactRows().filter((row) => row.user_opusid === selectedUserId);
    const exceptions = getVisibleExceptionsForUser(selectedUserId);
    const parkingHold = getVisibleParkingHold().filter((row) => row.user_opusid === selectedUserId);

    const access = getAccessibleProcesses(user, kpiRows);

    renderUserProfile(user, factRows, access);
    renderUserKpis(kpiRows, previousRows, access);
    renderUserInsights(kpiRows, factRows, exceptions);
    renderUserRunningChart(factRows, kpiRows);
    renderUserHourlyProcessChart(factRows, access, kpiRows);
    renderUserProcessTable(kpiRows, access);
    renderUserMatrixTable(kpiRows, access);
    renderUserDailyTrend(kpiRows);
    renderUserExceptionChart(exceptions);
    renderUserParkingHoldChart(parkingHold);
    renderUserAhtTrend(kpiRows, factRows);
    renderUserBenchmark(kpiRows);
    renderUserHeatmap(factRows);
    renderUserShiftUtilization(user, factRows);
    renderUserPendingAgingRisk(factRows);
    renderUserSameDayCarryover(factRows);
    renderUserAhtByProcess(factRows, kpiRows);
    renderUserWorkSplitDonut(kpiRows, factRows);
    renderUserProductivityBlockers(exceptions, parkingHold, factRows, kpiRows);
    renderUserSmartInsights(kpiRows, factRows, exceptions, parkingHold, user);
    renderUserInvoiceTable(factRows, exceptions, parkingHold);

    updateProcessCardVisibility(access);
    updateFilterSummary();
  }

  function ensureSelectedUser() {
    // Intentionally no-op. The dashboard must not select a user by default.
    // User-specific views load only when the user filter is explicitly populated.
  }

  function renderUserProfile(user, factRows, access) {
    const name = user?.user_name || "Select User";
    const safeFacts = safeArray(factRows);

    setText("userAvatarInitials", initials(name));
    setText("userProfileName", name);
    setText("userProfileSub", user?.email || "Individual Productivity Card");
    setText("userEmployeeId", user?.employee_id || "--");
    setText("userOpusid", user?.user_opusid || "--");
    setText("userRegion", summarizeList(unique(safeFacts.map((row) => row.region).filter(Boolean)).slice(0, 2)) || "--");
    setText("userLocation", summarizeList(unique([user?.location, ...safeFacts.map((row) => row.office_location)].filter(Boolean)).slice(0, 2)) || "--");
    setText("userSupervisor", user?.supervisor_name || "--");
    setText("userShift", formatShift(user?.work_start_time, user?.work_end_time));
    setText("userActiveDays", formatNumber(unique(safeFacts.map((row) => row.allocated_date)).length));
    setText("userFirstActionTime", formatDateTime(minDate(safeFacts.map((row) => row.allocated_at))));
    setText("userLastActionTime", formatDateTime(maxDate(safeFacts.map((row) => row.completed_at || row.allocated_at))));
    setText("userTotalWorkingTime", user?.working_minutes ? `${formatDecimal(user.working_minutes / 60, 1)} hrs` : "--");
    setText("userEmail", user?.email || "--");
    setText("userCurrentStatus", user?.shift_status || "--");

    const chips = $("userProcessAccessChips");
    if (!chips) return;

    const processHtml = safeArray(access).length
      ? safeArray(access).map((process) => `<span class="process-chip" style="--chip-color:${PROCESS_COLORS[process] || COLORS.gray};">${escapeHtml(process)}</span>`).join("")
      : `<span class="process-chip" style="--chip-color:#64748b;">No Access Found</span>`;

    const locations = unique([user?.location, ...safeFacts.map((row) => row.office_location), ...safeFacts.map((row) => row.location)].filter(Boolean));
    const countries = unique(safeFacts.map((row) => row.country).filter(Boolean));
    const offices = unique(safeFacts.map((row) => row.payment_office || row.control_office).filter(Boolean));

    chips.innerHTML = `
      <div class="access-section">
        <div class="access-section-label"><span class="material-symbols-outlined">shield_person</span>Process Access</div>
        <div class="access-chips compact">${processHtml}</div>
      </div>
      ${buildAccessChips("Location Access", "location_on", locations, COLORS.green, 6)}
      ${buildAccessChips("Country Access", "public", countries, COLORS.blue, 6)}
      ${buildAccessChips("Office Access", "business", offices, COLORS.orange, 7)}
    `;
  }

  function renderUserKpis(kpiRows, previousRows, access) {
    const now = summarizeKpi(kpiRows);
    const previous = summarizeKpi(previousRows);
    const productivity = pct(now.processed, now.allocation);

    setText("userKpiAllocation", formatNumber(now.allocation));
    setText("userKpiProcessed", formatNumber(now.processed));
    setText("userKpiPending", formatNumber(now.pending));
    setText("userKpiProductivityPercent", `${formatDecimal(productivity, 1)}%`);
    setText("userKpiExceptionCount", formatNumber(now.exceptions));
    setText("userKpiAhtMinutes", formatDecimal(now.avgAht, 1));

    setText("userKpiIndexingCount", formatNumber(sum(kpiRows.filter((row) => row.process === "Indexing"), "processed_count")));
    setText("userKpiProcessingCount", formatNumber(sum(kpiRows.filter((row) => row.process === "Processing"), "processed_count")));
    setText("userKpiCsrCount", formatNumber(sum(kpiRows.filter((row) => row.process === "CSR"), "processed_count")));
    setText("userKpiBizCommonCount", formatNumber(sum(kpiRows.filter((row) => row.process === "BizCommon"), "processed_count")));
    setText("userKpiParkingCount", formatNumber(now.parking));

    setTrend("userKpiAllocationTrend", now.allocation, previous.allocation);
    setTrend("userKpiProcessedTrend", now.processed, previous.processed);
    setTrend("userKpiPendingTrend", now.pending, previous.pending, true);
    setTrend("userKpiProductivityTrend", productivity, pct(previous.processed, previous.allocation), false, "pp");
    setTrend("userKpiExceptionTrend", now.exceptions, previous.exceptions, true);
    setTrend("userKpiAhtTrend", now.avgAht, previous.avgAht, true);
  }

  function renderUserInsights(kpiRows, factRows, exceptions) {
    const summary = summarizeKpi(kpiRows);
    const productivity = pct(summary.processed, summary.allocation);
    const bestHour = getBestHour(factRows);
    const topException = topCount(exceptions, "exception_reason", 1)[0];

    setText("userInsightProductivityStatus", getCategory(productivity));
    setText("userInsightBestHour", bestHour ? `${bestHour.hour} (${bestHour.count})` : "--");
    setText("userInsightMainException", topException ? `${topException.name} (${topException.count})` : "--");
    setText("userInsightTeamRank", getSelectedUserRank());
  }

  function renderUserRunningChart(factRows, kpiRows = []) {
    const rows = buildHourlyProductivityRows(factRows);
    const labelEvery = rows.length > 16 ? 3 : rows.length > 9 ? 2 : 1;
    ensureEnterpriseLegend("userRunningHourlyProductivityChart", [
      { name: "Received", color: COLORS.blue },
      { name: "Processed", color: COLORS.orange },
      { name: "Pending", color: COLORS.navy },
      { name: "Productivity %", color: COLORS.magenta }
    ]);
    renderChart("userRunningHourlyProductivityChart", {
      chart: { type: "line", height: "100%", toolbar: { show: false }, zoom: { enabled: false } },
      series: [
        { name: "Received", type: "column", data: rows.map((row) => row.cumulativeReceived) },
        { name: "Processed", type: "column", data: rows.map((row) => row.cumulativeProcessed) },
        { name: "Pending", type: "line", data: rows.map((row) => row.pendingGap) },
        { name: "Productivity %", type: "line", data: rows.map((row) => row.productivity) }
      ],
      colors: [COLORS.blue, COLORS.orange, COLORS.navy, COLORS.magenta],
      stroke: { width: [0, 0, 3, 3], curve: "smooth" },
      markers: { size: [0, 0, 3, 4], strokeWidth: 2 },
      plotOptions: { bar: { borderRadius: 4, columnWidth: rows.length <= 3 ? "22%" : "42%" } },
      xaxis: { categories: rows.map((row) => row.hour), title: { text: "Hour" }, labels: { rotate: 0, hideOverlappingLabels: true, trim: false } },
      yaxis: [
        { min: 0, forceNiceScale: true, title: { text: "Invoice Count" }, labels: { formatter: (value) => shortNumber(value) } },
        { min: 0, max: 100, opposite: true, title: { text: "Productivity %" }, labels: { formatter: (value) => `${formatDecimal(value, 0)}%` } }
      ],
      dataLabels: {
        enabled: true,
        enabledOnSeries: [0, 1, 2, 3],
        background: { enabled: true, opacity: 0.85, borderRadius: 3 },
        style: { fontSize: "9px", fontWeight: 900 },
        formatter(value, opts) {
          if (!value) return "";
          if ((opts.dataPointIndex || 0) % labelEvery !== 0) return "";
          const seriesName = opts.w.config.series[opts.seriesIndex]?.name || "";
          return seriesName.includes("Productivity") ? `${formatDecimal(value, 0)}%` : shortNumber(value);
        }
      },
      legend: { show: false },
      grid: { borderColor: "#e5e7eb", padding: { top: 24, right: 32, bottom: 22, left: 12 } },
      tooltip: { shared: true, y: { formatter: (value, opts) => opts.seriesIndex === 3 ? `${formatDecimal(value, 1)}%` : formatNumber(value) } },
      noData: { text: "No hourly received/processed data found" }
    });
  }

  function renderUserHourlyProcessChart(factRows, access, kpiRows = []) {
    const processes = getUserChartProcesses(access, kpiRows, factRows).filter((process) => process !== "Parking");
    const selectedProcess = ensureHourlyProcessSelect(processes);
    const rows = buildHourlyProductivityRows(factRows, selectedProcess);

    if (selectedProcess) {
      renderChart("userHourlyProcessOutputChart", {
        chart: { type: "line", height: "100%", toolbar: { show: false }, zoom: { enabled: false } },
        series: [
          { name: "Received / Allocated", type: "column", data: rows.map((row) => row.cumulativeReceived) },
          { name: "Processed", type: "column", data: rows.map((row) => row.cumulativeProcessed) },
          { name: "Pending Gap", type: "line", data: rows.map((row) => row.pendingGap) },
          { name: "Productivity %", type: "line", data: rows.map((row) => row.productivity) }
        ],
        colors: [COLORS.blue, PROCESS_COLORS[selectedProcess] || COLORS.green, COLORS.navy, COLORS.magenta],
        stroke: { width: [0, 0, 3, 3], curve: "smooth" },
        markers: { size: [0, 0, 3, 4] },
        plotOptions: { bar: { borderRadius: 4, columnWidth: "42%" } },
        xaxis: { categories: rows.map((row) => row.hour), title: { text: "Hour" }, labels: { rotate: -35, hideOverlappingLabels: true } },
        yaxis: [
          { min: 0, forceNiceScale: true, title: { text: "Invoice Count" }, labels: { formatter: (value) => shortNumber(value) } },
          { min: 0, max: 100, opposite: true, title: { text: "Productivity %" }, labels: { formatter: (value) => `${formatDecimal(value, 0)}%` } }
        ],
        dataLabels: {
          enabled: true,
          enabledOnSeries: [0, 1, 3],
          background: { enabled: true, opacity: 0.82, borderRadius: 3 },
          style: { fontSize: "9px", fontWeight: 900 },
          formatter(value, opts) {
            if (!value) return "";
            return opts.seriesIndex === 3 ? `${formatDecimal(value, 0)}%` : shortNumber(value);
          }
        },
        legend: { position: "top", horizontalAlign: "left" },
        grid: { borderColor: "#e5e7eb", padding: { top: 18, right: 20, bottom: 20, left: 10 } },
        tooltip: { shared: true },
        noData: { text: `No hourly data found for ${selectedProcess}` }
      });
      return;
    }

    const hours = getUserHourlyWindow(factRows);
    const series = processes.map((process) => ({
      name: process,
      data: hours.map((hour) => {
        return safeArray(factRows).filter((row) => row.process === process && hourLabelFromDate(row.completed_at) === hour).length;
      })
    })).filter((item) => item.data.some(Boolean));

    renderChart("userHourlyProcessOutputChart", {
      chart: { type: "bar", height: "100%", stacked: true, toolbar: { show: false } },
      series,
      colors: series.map((item) => PROCESS_COLORS[item.name] || COLORS.gray),
      plotOptions: { bar: { borderRadius: 4, columnWidth: "46%", dataLabels: { total: { enabled: true, style: { fontSize: "10px", fontWeight: 900 } } } } },
      xaxis: { categories: hours, title: { text: "Completed Hour" }, labels: { rotate: -35, hideOverlappingLabels: true } },
      yaxis: { min: 0, forceNiceScale: true, title: { text: "Processed Count" }, labels: { formatter: (value) => shortNumber(value) } },
      dataLabels: { enabled: true, style: { fontSize: "9px", fontWeight: 900 }, formatter(value) { return value ? shortNumber(value) : ""; } },
      legend: { position: "top", horizontalAlign: "left" },
      grid: { borderColor: "#e5e7eb", padding: { top: 18, right: 18, bottom: 22, left: 10 } },
      tooltip: { y: { formatter: (value) => formatNumber(value) } },
      noData: { text: "No hourly process output found" }
    });
  }

  function renderUserProcessTable(kpiRows, access) {
    const rows = access
      .filter((process) => process !== "Parking")
      .map((process) => {
        const summary = summarizeKpi(kpiRows.filter((row) => row.process === process));
        const productivity = pct(summary.processed, summary.allocation);

        return {
          process,
          allocation: summary.allocation,
          processed: summary.processed,
          productivity,
          status: getCategory(productivity),
          _rowFilter: {
            process
          }
        };
      });

    createTable("userProcessWiseProductivityTable", rows, [
      { title: "Process", field: "process", minWidth: 120, formatter: processFormatter },
      { title: "Allocation", field: "allocation", width: 95, hozAlign: "right", formatter: numberFormatter },
      { title: "Processed", field: "processed", width: 95, hozAlign: "right", formatter: numberFormatter },
      { title: "Productivity %", field: "productivity", width: 125, hozAlign: "right", formatter: pctBarFormatter },
      { title: "Status", field: "status", width: 110, formatter: categoryFormatter }
    ], {
      pagination: false
    });
  }

  function renderUserMatrixTable(kpiRows, access) {
    const processes = getUserChartProcesses(access, kpiRows).filter((process) => process !== "Parking");
    const dates = getDateRangeFromFilters().reverse();

    const rows = dates.map((date) => {
      const row = { date };
      let totalReceived = 0;
      let totalProcessed = 0;
      let totalPending = 0;
      processes.forEach((process) => {
        const subset = kpiRows.filter((item) => item.activity_date === date && item.process === process);
        const summary = summarizeKpi(subset);
        const cell = { received: summary.allocation, processed: summary.processed, pending: summary.pending, productivity: pct(summary.processed, summary.allocation) };
        row[getProcessCellKey(process)] = cell;
        totalReceived += cell.received;
        totalProcessed += cell.processed;
        totalPending += cell.pending;
      });
      row.overall = { received: totalReceived, processed: totalProcessed, pending: totalPending, productivity: pct(totalProcessed, totalReceived) };
      return row;
    });

    const columns = [{ title: "Date", field: "date", width: 115, frozen: true }];
    processes.forEach((process) => columns.push({ title: process, field: getProcessCellKey(process), minWidth: 190, formatter: miniProcessMatrixFormatter, headerSort: false }));
    columns.push({ title: "Overall", field: "overall", minWidth: 190, formatter: miniProcessMatrixFormatter, headerSort: false });

    createTable("userDateWiseMatrixTable", rows, columns, { pagination: false, layout: "fitDataStretch" });
  }

  function renderUserDailyTrend(kpiRows) {
    const rows = groupByDate(kpiRows);
    const labelEvery = rows.length > 14 ? 3 : rows.length > 8 ? 2 : 1;
    ensureEnterpriseLegend("userDailyTrendChart", [
      { name: "Allocation", color: COLORS.blue },
      { name: "Processed", color: COLORS.green },
      { name: "Pending", color: COLORS.orange },
      { name: "Productivity %", color: COLORS.navy }
    ]);

    renderChart("userDailyTrendChart", {
      chart: { type: "line", height: "100%", toolbar: { show: false }, zoom: { enabled: false } },
      series: [
        { name: "Allocation", type: "column", data: rows.map((row) => row.allocation) },
        { name: "Processed", type: "column", data: rows.map((row) => row.processed) },
        { name: "Pending", type: "column", data: rows.map((row) => row.pending) },
        { name: "Productivity %", type: "line", data: rows.map((row) => round(pct(row.processed, row.allocation), 1)) }
      ],
      colors: [COLORS.blue, COLORS.green, COLORS.orange, COLORS.navy],
      stroke: { width: [0, 0, 0, 3], curve: "smooth" },
      markers: { size: [0, 0, 0, rows.length <= 2 ? 5 : 3] },
      plotOptions: { bar: { borderRadius: 4, columnWidth: rows.length <= 2 ? "22%" : "48%", dataLabels: { position: "top" } } },
      xaxis: { categories: rows.map((row) => formatShortDate(row.date)), title: { text: "Date" }, labels: { rotate: rows.length > 7 ? -35 : 0, hideOverlappingLabels: true, trim: false } },
      yaxis: [
        { min: 0, title: { text: "Invoice Count" }, labels: { formatter: (value) => shortNumber(value) } },
        { min: 0, max: 100, opposite: true, title: { text: "Productivity %" }, labels: { formatter: (value) => `${formatDecimal(value, 0)}%` } }
      ],
      dataLabels: { enabled: true, enabledOnSeries: [0, 1, 2, 3], background: { enabled: true, opacity: 0.82 }, style: { fontSize: "9px", fontWeight: 900 }, formatter(value, opts) { if (!value) return ""; if ((opts.dataPointIndex || 0) % labelEvery !== 0) return ""; return opts.seriesIndex === 3 ? `${formatDecimal(value, 0)}%` : shortNumber(value); } },
      legend: { show: false },
      grid: { borderColor: "#e5e7eb", padding: { top: 18, right: 34, bottom: 30, left: 12 } },
      tooltip: { shared: true, y: { formatter: (value, opts) => opts.seriesIndex === 3 ? `${formatDecimal(value, 1)}%` : formatNumber(value) } },
      noData: { text: "No trend data" }
    });
  }

  function renderUserExceptionChart(exceptions) {
    const rows = topCount(exceptions, "exception_reason", 8);

    renderChart("userExceptionReasonChart", {
      chart: {
        type: "bar",
        height: "100%",
        toolbar: { show: false }
      },
      series: [
        {
          name: "Exceptions",
          data: rows.map((row) => row.count)
        }
      ],
      colors: [COLORS.red],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5
        }
      },
      xaxis: {
        categories: rows.map((row) => row.name)
      },
      dataLabels: {
        enabled: false
      },
      grid: {
        borderColor: "#e5e7eb"
      },
      noData: {
        text: "No exception data"
      }
    });
  }

  function renderUserParkingHoldChart(rows) {
    const data = topCount(rows, "reason", 8);

    renderChart("userParkingHoldReasonChart", {
      chart: {
        type: "donut",
        height: "100%",
        toolbar: { show: false }
      },
      labels: data.map((row) => row.name),
      series: data.map((row) => row.count),
      colors: [COLORS.amber, COLORS.purple, COLORS.orange, COLORS.red, COLORS.cyan],
      legend: {
        position: "right"
      },
      noData: {
        text: "No parking/hold data"
      }
    });
  }

  function renderUserAhtTrend(kpiRows, factRows = []) {
    const hourly = getUserHourlyWindow(factRows).map((hour) => {
      const values = safeArray(factRows)
        .filter((row) => hourLabelFromDate(row.completed_at) === hour)
        .map((row) => row.processed_time_minutes)
        .filter((value) => number(value) > 0 && number(value) <= 1440);

      return { hour, avgAht: avg(values) };
    });

    const rows = hourly.some((row) => row.avgAht > 0)
      ? hourly
      : groupByDate(kpiRows).map((row) => ({ hour: formatShortDate(row.date), avgAht: row.avgAht }));

    renderChart("userAhtTrendChart", {
      chart: { type: "line", height: "100%", toolbar: { show: false }, zoom: { enabled: false } },
      series: [{ name: "Avg Handling Minutes", data: rows.map((row) => round(row.avgAht, 1)) }],
      colors: [COLORS.blue],
      stroke: { width: 3, curve: "smooth" },
      markers: { size: 4 },
      xaxis: { categories: rows.map((row) => row.hour), title: { text: hourly.length ? "Completed Hour" : "Date" }, labels: { rotate: -30, hideOverlappingLabels: true } },
      yaxis: { min: 0, forceNiceScale: true, title: { text: "Minutes" }, labels: { formatter: (value) => formatDecimal(value, 0) } },
      dataLabels: { enabled: true, background: { enabled: true, opacity: 0.82 }, style: { fontSize: "9px", fontWeight: 900 }, formatter(value) { return value ? `${formatDecimal(value, 1)}m` : ""; } },
      grid: { borderColor: "#e5e7eb", padding: { top: 16, right: 18, bottom: 18, left: 10 } },
      tooltip: { y: { formatter: (value) => `${formatDecimal(value, 1)} minutes` } },
      noData: { text: "No AHT data found" }
    });
  }

  function renderUserBenchmark(userKpiRows) {
    const userSummary = summarizeKpi(userKpiRows);
    const allRows = getDashboardKpiRows();
    const userCountries = unique(userKpiRows.map((row) => row.country));
    const userRegions = unique(userKpiRows.map((row) => row.region));
    const teamRows = allRows;
    const countryRows = allRows.filter((row) => !userCountries.length || userCountries.includes(row.country));
    const regionRows = allRows.filter((row) => !userRegions.length || userRegions.includes(row.region));
    const usersByRows = (rows) => Math.max(unique(rows.map((row) => row.user_opusid)).length, 1);
    const metricSet = (rows, divisor = 1) => { const summary = summarizeKpi(rows); const activeDays = Math.max(unique(rows.map((row) => row.activity_date)).length, 1); return { productivity: pct(summary.processed, summary.allocation), avgAht: summary.avgAht, processedPerHour: summary.processed / Math.max(activeDays * 8 * divisor, 1), pendingPct: pct(summary.pending, summary.allocation) }; };
    const userMetrics = metricSet(userKpiRows, 1);
    const teamMetrics = metricSet(teamRows, usersByRows(teamRows));
    const countryMetrics = metricSet(countryRows, usersByRows(countryRows));
    const regionMetrics = metricSet(regionRows, usersByRows(regionRows));
    const metrics = ["Productivity %", "Avg AHT", "Processed / Hour", "Pending %"];
    renderChart("userBenchmarkComparisonChart", {
      chart: { type: "bar", height: "100%", toolbar: { show: false } },
      series: [
        { name: "Selected User", data: [round(userMetrics.productivity, 1), round(userMetrics.avgAht, 1), round(userMetrics.processedPerHour, 1), round(userMetrics.pendingPct, 1)] },
        { name: "Team Avg", data: [round(teamMetrics.productivity, 1), round(teamMetrics.avgAht, 1), round(teamMetrics.processedPerHour, 1), round(teamMetrics.pendingPct, 1)] },
        { name: "Country Avg", data: [round(countryMetrics.productivity, 1), round(countryMetrics.avgAht, 1), round(countryMetrics.processedPerHour, 1), round(countryMetrics.pendingPct, 1)] },
        { name: "Region Avg", data: [round(regionMetrics.productivity, 1), round(regionMetrics.avgAht, 1), round(regionMetrics.processedPerHour, 1), round(regionMetrics.pendingPct, 1)] }
      ],
      colors: [COLORS.magenta, COLORS.blue, COLORS.teal, COLORS.purple],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "50%", dataLabels: { position: "right" } } },
      xaxis: { categories: metrics, min: 0, labels: { formatter: (value) => formatDecimal(value, 1), rotate: 0 } },
      dataLabels: { enabled: true, offsetX: 8, style: { fontSize: "10px", fontWeight: 900, colors: ["#0f172a"] }, background: { enabled: true, opacity: 0.88, borderRadius: 3 }, formatter(value, opts) { return opts.dataPointIndex === 1 ? `${formatDecimal(value, 1)}m` : formatDecimal(value, 1); } },
      legend: { position: "top", horizontalAlign: "left" },
      grid: { borderColor: "#e5e7eb", padding: { top: 22, right: 86, bottom: 14, left: 12 } },
      tooltip: { y: { formatter: (value, opts) => opts.dataPointIndex === 1 ? `${formatDecimal(value, 1)} minutes` : formatDecimal(value, 1) } },
      noData: { text: "No benchmark data found" }
    });
  }

  function renderUserHeatmap(factRows) {
    const dates = unique(safeArray(factRows).map((row) => row.completed_date || row.allocated_date).filter(Boolean)).slice(-14);
    const hours = Array.from({ length: 12 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);
    const series = hours.map((hour) => ({ name: hour, data: dates.map((date) => { const count = safeArray(factRows).filter((row) => { const actionDate = parseDate(row.completed_at || row.allocated_at); const rowDate = row.completed_date || row.allocated_date; if (!actionDate) return false; const actionHour = `${String(actionDate.getHours()).padStart(2, "0")}:00`; return rowDate === date && actionHour === hour; }).length; return { x: formatShortDate(date), y: count }; }) }));
    renderChart("userProductivityHeatmap", {
      chart: { type: "heatmap", height: "100%", toolbar: { show: false } },
      series,
      colors: [COLORS.green],
      dataLabels: { enabled: false },
      xaxis: { title: { text: "Activity Date" }, labels: { rotate: -35, trim: false, hideOverlappingLabels: false } },
      yaxis: { title: { text: "Hour" } },
      legend: { position: "top", horizontalAlign: "center" },
      grid: { padding: { top: 14, right: 20, bottom: 42, left: 8 } },
      plotOptions: { heatmap: { shadeIntensity: 0.5, colorScale: { ranges: [ { from: 0, to: 0, color: "#e5e7eb", name: "No Work" }, { from: 1, to: 3, color: "#fde68a", name: "Low" }, { from: 4, to: 8, color: "#86efac", name: "Good" }, { from: 9, to: 999, color: COLORS.green, name: "High" } ] } } },
      noData: { text: "No heatmap data" }
    });
  }

  function renderUserShiftUtilization(user, factRows) {
    const el = $("userShiftUtilizationTimeline");
    if (!el) return;
    const start = parseTime(user?.work_start_time);
    const end = parseTime(user?.work_end_time);
    if (start === null || end === null) { el.innerHTML = `<div class="ops-empty-state">Shift timing not available</div>`; return; }
    const length = Math.max(shiftLength(start, end), 1);
    const activityMinutes = new Set();
    safeArray(factRows).forEach((row) => {
      [row.allocated_at, row.completed_at].forEach((value) => {
        const date = parseDate(value); if (!date) return;
        const minute = date.getHours() * 60 + date.getMinutes();
        let relative = minute - start; if (relative < 0) relative += 1440;
        if (relative >= 0 && relative <= length) activityMinutes.add(Math.floor(relative / 15) * 15);
      });
    });
    const slots = [];
    for (let minute = 0; minute < length; minute += 15) {
      const active = activityMinutes.has(minute);
      const nearActivity = activityMinutes.has(minute - 15) || activityMinutes.has(minute + 15);
      slots.push({ minute, status: active ? "active" : nearActivity ? "idle" : "none" });
    }
    let idleRun = 0;
    slots.forEach((slot) => { if (slot.status === "none") idleRun += 15; else idleRun = 0; if (idleRun >= 60) slot.status = "long-idle"; });
    const counts = slots.reduce((acc, slot) => { acc[slot.status] = (acc[slot.status] || 0) + 1; return acc; }, {});
    const labelAt = (relative) => { const absolute = (start + relative) % 1440; return `${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`; };
    el.innerHTML = `
      <div class="ops-timeline-legend"><span><i class="active"></i>Active ${counts.active || 0}</span><span><i class="idle"></i>Idle ${counts.idle || 0}</span><span><i class="none"></i>No Activity ${counts.none || 0}</span><span><i class="long-idle"></i>Long Idle ${counts["long-idle"] || 0}</span></div>
      <div class="ops-timeline-track" title="${escapeAttr(formatShift(user?.work_start_time, user?.work_end_time))}">${slots.map((slot) => `<span class="${slot.status}" style="width:${100 / Math.max(slots.length, 1)}%;"></span>`).join("")}</div>
      <div class="ops-timeline-axis"><span>${labelAt(0)}</span><span>${labelAt(Math.floor(length / 2))}</span><span>${labelAt(length)}</span></div>
    `;
  }

  function renderUserPendingAgingRisk(factRows) {
    const pendingRows = safeArray(factRows).filter((row) => row.pending_flag || (!row.completed_at && row.allocated_at));
    const buckets = [{ name: "0–2h", min: 0, max: 2 }, { name: "2–4h", min: 2, max: 4 }, { name: "4–8h", min: 4, max: 8 }, { name: "8–24h", min: 8, max: 24 }, { name: "24h+", min: 24, max: Infinity }];
    const values = buckets.map((bucket) => pendingRows.filter((row) => { const age = pendingAgeHours(row); return age >= bucket.min && age < bucket.max; }).length);
    const maxValue = Math.max(...values, 1);
    renderChart("userPendingAgingRiskChart", {
      chart: { type: "bar", height: "100%", toolbar: { show: false } },
      series: [{ name: "Pending Items", data: values }],
      colors: [COLORS.orange],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "48%", dataLabels: { position: "right" } } },
      xaxis: { categories: buckets.map((bucket) => bucket.name), min: 0, max: Math.ceil(maxValue * 1.12), title: { text: "Pending Count" }, labels: { formatter: (value) => shortNumber(value), rotate: 0 } },
      yaxis: { labels: { style: { fontWeight: 900 } } },
      dataLabels: { enabled: true, offsetX: 4, style: { fontSize: "10px", fontWeight: 900 }, formatter(value) { return value ? formatNumber(value) : ""; } },
      grid: { borderColor: "#e5e7eb", padding: { top: 14, right: 48, bottom: 30, left: 12 } },
      noData: { text: "No pending aging risk data" }
    });
  }

  function renderUserSameDayCarryover(factRows) {
    const dates = unique(safeArray(factRows).map((row) => row.allocated_date || row.completed_date).filter(Boolean)).sort();
    const rows = dates.map((date) => {
      const dayRows = factRows.filter((row) => (row.allocated_date || row.completed_date) === date);
      return {
        date,
        sameDay: dayRows.filter((row) => row.allocated_date && row.completed_date && row.allocated_date === row.completed_date).length,
        carryover: dayRows.filter((row) => row.allocated_date && row.completed_date && row.allocated_date < row.completed_date).length,
        pending: dayRows.filter((row) => row.allocated_at && !row.completed_at).length
      };
    });

    renderChart("userSameDayCarryoverChart", {
      chart: { type: "bar", height: "100%", stacked: true, toolbar: { show: false } },
      series: [
        { name: "Same-day Completed", data: rows.map((row) => row.sameDay) },
        { name: "Carryover Completed", data: rows.map((row) => row.carryover) },
        { name: "Still Pending", data: rows.map((row) => row.pending) }
      ],
      colors: [COLORS.green, COLORS.blue, COLORS.orange],
      plotOptions: { bar: { borderRadius: 4, columnWidth: "48%" } },
      xaxis: { categories: rows.map((row) => formatShortDate(row.date)), title: { text: "Allocated Date" }, labels: { rotate: -35, hideOverlappingLabels: true } },
      yaxis: { min: 0, forceNiceScale: true, title: { text: "Invoice Count" } },
      dataLabels: { enabled: true, style: { fontSize: "9px", fontWeight: 900 }, formatter(value) { return value ? shortNumber(value) : ""; } },
      legend: { position: "top", horizontalAlign: "left" },
      grid: { borderColor: "#e5e7eb", padding: { top: 18, right: 18, bottom: 20, left: 10 } },
      noData: { text: "No completion timing data" }
    });
  }

  function renderUserAhtByProcess(factRows, kpiRows) {
    const map = new Map();
    safeArray(factRows).forEach((row) => {
      const minutes = number(row.processed_time_minutes);
      if (!minutes || minutes > 1440) return;
      const key = `${row.process || "Unknown"} / ${row.invoice_type || "Unknown"}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(minutes);
    });
    if (!map.size) {
      safeArray(kpiRows).forEach((row) => {
        const minutes = number(row.avg_aht_minutes);
        if (!minutes || minutes > 1440) return;
        const key = `${row.process || "Unknown"} / ${row.invoice_type || "Unknown"}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(minutes);
      });
    }
    const rows = [...map.entries()].map(([name, values]) => ({ name, avgAht: avg(values) })).filter((row) => row.avgAht > 0).sort((a, b) => a.avgAht - b.avgAht).slice(-8);
    renderChart("userAhtByProcessChart", {
      chart: { type: "bar", height: "100%", toolbar: { show: false } },
      series: [{ name: "Avg Minutes", data: rows.map((row) => round(row.avgAht, 1)) }],
      colors: [COLORS.blue],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "48%", dataLabels: { position: "right" } } },
      xaxis: { categories: rows.map((row) => compactLabel(row.name, 24)), title: { text: "Avg Handling Minutes" }, labels: { rotate: 0, formatter: (value) => formatDecimal(value, 1) } },
      dataLabels: { enabled: true, offsetX: 5, style: { fontSize: "10px", fontWeight: 900 }, formatter(value) { return value ? `${formatDecimal(value, 1)}m` : ""; } },
      grid: { borderColor: "#e5e7eb", padding: { top: 14, right: 58, bottom: 30, left: 12 } },
      noData: { text: "No AHT by process/type data" }
    });
  }

  function renderUserWorkSplitDonut(kpiRows, factRows) {
    let rows = groupKpi(kpiRows, "process").map((row) => ({ name: row.name, count: row.processed || row.allocation })).filter((row) => row.count > 0);
    if (!rows.length) rows = topCount(factRows, "process", 8).map((row) => ({ name: row.name, count: row.count }));
    const total = sum(rows, "count");
    renderChart("userWorkSplitDonutChart", {
      chart: { type: "donut", height: "100%", toolbar: { show: false } },
      labels: rows.map((row) => row.name),
      series: rows.map((row) => row.count),
      colors: rows.map((row) => PROCESS_COLORS[row.name] || COLORS.gray),
      plotOptions: { pie: { donut: { size: "62%", labels: { show: true, name: { show: true }, value: { show: true, formatter: (value) => formatNumber(value) }, total: { show: true, label: "Total", formatter: () => formatNumber(total) } } } } },
      dataLabels: { enabled: true, formatter(value, opts) { return `${formatDecimal(value, 0)}%`; } },
      legend: { position: "bottom", fontSize: "10px" },
      tooltip: { y: { formatter: (value) => formatNumber(value) } },
      noData: { text: "No work split data" }
    });
  }

  function renderUserProductivityBlockers(exceptions, parkingHold, factRows, kpiRows) {
    const categories = new Map([
      ["Exception", safeArray(exceptions).length || sum(kpiRows, "exception_count")],
      ["Parking", safeArray(parkingHold).filter((row) => clean(row.event_type).toLowerCase().includes("park")).length || sum(kpiRows, "parking_count")],
      ["Hold", safeArray(parkingHold).filter((row) => clean(row.event_type).toLowerCase().includes("hold")).length || sum(kpiRows, "hold_count")],
      ["Pending with Supplier", safeArray(exceptions).filter((row) => row.pending_with_supplier).length],
      ["Missing Information", safeArray(exceptions).filter((row) => clean(row.exception_reason).toLowerCase().includes("missing")).length]
    ]);

    const rows = [...categories.entries()]
      .map(([name, count]) => ({ name, count: number(count) }))
      .filter((row) => row.count > 0)
      .sort((a, b) => a.count - b.count);

    renderChart("userProductivityBlockersChart", {
      chart: { type: "bar", height: "100%", toolbar: { show: false } },
      series: [{ name: "Items", data: rows.map((row) => row.count) }],
      colors: [COLORS.red],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: "58%" } },
      xaxis: { categories: rows.map((row) => row.name), title: { text: "Count" } },
      dataLabels: { enabled: true, style: { fontSize: "10px", fontWeight: 900 }, formatter(value) { return value ? formatNumber(value) : ""; } },
      grid: { borderColor: "#e5e7eb", padding: { top: 12, right: 25, bottom: 10, left: 10 } },
      noData: { text: "No blocker data found" }
    });
  }

  function renderUserSmartInsights(kpiRows, factRows, exceptions, parkingHold, user) {
    const el = $("userSmartInsightList");
    if (!el) return;

    const summary = summarizeKpi(kpiRows);
    const productivity = pct(summary.processed, summary.allocation);
    const processRows = groupKpi(kpiRows, "process").sort((a, b) => b.pending - a.pending);
    const bestHour = getBestHour(factRows);
    const pendingRows = safeArray(factRows).filter((row) => row.pending_flag || (!row.completed_at && row.allocated_at));
    const blockers = safeArray(exceptions).length + safeArray(parkingHold).length + summary.parking + summary.hold;

    const insights = [];

    if (summary.allocation > 0) {
      insights.push(`User processed ${formatNumber(summary.processed)} of ${formatNumber(summary.allocation)} received/allocated items (${formatDecimal(productivity, 1)}% productivity).`);
    } else {
      insights.push("No received/allocated work found for the selected period.");
    }

    if (processRows[0]?.pending > 0) {
      insights.push(`${processRows[0].name} has the highest pending count (${formatNumber(processRows[0].pending)}), so this is the first process to review.`);
    }

    if (bestHour) {
      insights.push(`Best completed-output hour is ${bestHour.hour} with ${formatNumber(bestHour.count)} completed item${bestHour.count === 1 ? "" : "s"}.`);
    }

    if (pendingRows.length) {
      const oldest = pendingRows.map(pendingAgeHours).sort((a, b) => b - a)[0];
      insights.push(`Pending aging risk exists: ${formatNumber(pendingRows.length)} pending item${pendingRows.length === 1 ? "" : "s"}; oldest age is about ${formatDecimal(oldest, 1)} hours.`);
    }

    if (blockers > 0) {
      insights.push(`Blockers are present (${formatNumber(blockers)} total exception/parking/hold signals). Review blocker chart before coaching productivity.`);
    } else if (summary.pending > 0) {
      insights.push("Pending work exists but no explicit exception/parking/hold blocker was found in the loaded rows.");
    }

    el.innerHTML = insights.slice(0, 5).map((text) => `
      <div class="smart-insight-item">
        <span class="material-symbols-outlined">tips_and_updates</span>
        <strong>${escapeHtml(text)}</strong>
      </div>
    `).join("");
  }

  function renderUserInvoiceTable(factRows, exceptions = [], parkingHold = []) {
    const columns = [
      { title: "Invoice No", field: "invoice_number", minWidth: 145 },
      { title: "Process", field: "process", width: 125, formatter: processFormatter },
      { title: "Invoice Type", field: "invoice_type", width: 115 },
      { title: "Allocated At", field: "allocated_at", minWidth: 160, formatter: dateTimeFormatter },
      { title: "Completed At", field: "completed_at", minWidth: 160, formatter: dateTimeFormatter },
      { title: "Minutes", field: "minutes", width: 95, hozAlign: "right", formatter: minuteFormatter },
      { title: "Status", field: "status", width: 120, formatter: statusFormatter },
      { title: "Pending Age", field: "pending_age", width: 115, formatter: statusBadgeFormatter },
      { title: "Blocker", field: "blocker", minWidth: 170, formatter: statusBadgeFormatter },
      { title: "Vendor", field: "vendor", minWidth: 180 },
      { title: "Entity", field: "entity", width: 120 }
    ];

    if (DASH.apiBase) {
      createServerSideInvoiceTable("userInvoiceDetailTable", columns);
      return;
    }

    const usersMap = userMapById();

    const rows = safeArray(factRows).map((row) => {
      const user = usersMap.get(row.user_opusid);
      const blocker = findInvoiceBlocker(row, exceptions, parkingHold);

      return {
        invoice_number: row.invoice_number || "--",
        vendor: row.supplier_name || "Unknown",
        entity: row.payment_office || "Unknown",
        process: row.process,
        invoice_type: row.invoice_type,
        allocated_at: row.allocated_at,
        completed_at: row.completed_at,
        minutes: row.processed_time_minutes,
        status: row.completed_at || row.completed_flag ? "Completed" : (row.work_item_status || "Pending"),
        pending_age: pendingAgeLabel(row),
        blocker,
        received_date: row.received_date,
        assigned_time: row.allocated_at,
        action_time: row.completed_at || row.allocated_at,
        processed_time: row.processed_time_minutes,
        last_action_date: row.completed_at || row.allocated_at,
        region: row.region,
        country: row.country,
        user_name: user?.user_name || row.user_opusid,
        user_opusid: row.user_opusid,
        _rowFilter: {
          user: row.user_opusid,
          process: row.process,
          region: row.region,
          country: row.country,
          invoiceNumber: row.invoice_number
        }
      };
    });

    createTable("userInvoiceDetailTable", rows, columns, { paginationSize: 12 });
  }

  function createServerSideInvoiceTable(id, columns) {
    const el = $(id);

    if (!el || typeof Tabulator === "undefined") return;

    const config = {
      columns,
      layout: "fitDataStretch",
      height: "100%",
      placeholder: "No invoice detail found",
      movableColumns: true,
      pagination: true,
      paginationMode: "remote",
      paginationSize: 50,
      ajaxURL: `${DASH.apiBase}/invoice-detail`,
      ajaxConfig: "GET",
      ajaxURLGenerator(_url, _config, params) {
        const url = new URL(`${DASH.apiBase}/invoice-detail`);
        const page = number(params.page) || 1;
        const size = number(params.size) || 50;

        appendDashboardParams(url);
        url.searchParams.set("limit", String(size));
        url.searchParams.set("offset", String((page - 1) * size));

        const search = clean($("userInvoiceDetailSearch")?.value);
        if (search) url.searchParams.set("search", search);

        return url.toString();
      },
      ajaxResponse(_url, _params, response) {
        const rows = safeArray(response?.data || response?.rows).map((row) => ({
          invoice_number: clean(row.invoice_number || row.invoiceNumber),
          vendor: clean(row.vendor || row.supplier_name || row.spName),
          entity: clean(row.entity || row.payment_office || row.paymentOffice),
          process: normalizeProcess(row.process),
          received_date: clean(row.received_date || row.receivedDate),
          assigned_time: clean(row.assigned_time || row.allocated_at),
          action_time: clean(row.action_time || row.completed_at),
          processed_time: number(row.processed_time || row.processed_time_minutes),
          minutes: number(row.minutes || row.processed_time || row.processed_time_minutes),
          status: clean(row.status || row.work_item_status),
          pending_age: clean(row.pending_age || row.pendingAge || "--"),
          blocker: clean(row.blocker || row.reason || "--"),
          completed_at: clean(row.completed_at || row.completedAt || row.action_time),
          allocated_at: clean(row.allocated_at || row.allocatedAt || row.assigned_time),
          invoice_type: clean(row.invoice_type || row.invoiceType),
          last_action_date: clean(row.last_action_date || row.completed_at || row.allocated_at),
          _rowFilter: row._rowFilter || {}
        }));

        return {
          data: rows,
          last_page: number(response?.last_page || response?.lastPage) || Math.max(1, Math.ceil(number(response?.total) / (number(response?.limit) || 50)))
        };
      },
      rowClick(_event, row) {
        applyRowFilter(row.getData(), id);
      },
      rowDblClick(_event, row) {
        openRowModal(id, row.getData());
      }
    };

    if (DASH.tables[id]) {
      DASH.tables[id].setColumns(columns);
      DASH.tables[id].setData();
      return;
    }

    DASH.tables[id] = new Tabulator(el, config);
  }

  function appendDashboardParams(url) {
    url.searchParams.set("dateType", DASH.filters.dateType);
    url.searchParams.set("fromDate", DASH.filters.dateFrom);
    url.searchParams.set("toDate", DASH.filters.dateTo);

    Object.entries({
      region: DASH.filters.region,
      country: DASH.filters.country,
      paymentOffice: DASH.filters.paymentOffice,
      location: DASH.filters.location,
      supervisor: DASH.filters.supervisor,
      user_opusid: DASH.filters.user,
      process: DASH.filters.process,
      invoiceType: DASH.filters.invoiceType
    }).forEach(([key, values]) => {
      safeArray(values).filter(Boolean).forEach((value) => url.searchParams.append(key, value));
    });
  }

  function getDashboardKpiRows() {
    return getVisibleKpiRows();
  }

  function getVisibleKpiRows() {
    return DASH.kpiRows.filter((row) => {
      return rowMatchesKpiFilters(row, true);
    });
  }

  function getVisiblePreviousKpiRows() {
    return DASH.previousKpiRows.filter((row) => {
      return rowMatchesKpiFilters(row, true);
    });
  }

  function getVisibleFactRows() {
    return DASH.factRows.filter((row) => {
      return rowMatchesFactFilters(row, true);
    });
  }

  function getVisibleUsers() {
    const visibleUserIds = new Set(
      getVisibleKpiRows()
        .map((row) => row.user_opusid)
        .filter(Boolean)
    );

    return DASH.users.filter((user) => {
      if (DASH.filters.user.length && !DASH.filters.user.includes(user.user_opusid)) return false;
      if (DASH.filters.location.length && !DASH.filters.location.includes(user.location)) return false;
      if (DASH.filters.supervisor.length && !DASH.filters.supervisor.includes(user.supervisor_name)) return false;

      if (visibleUserIds.size && !visibleUserIds.has(user.user_opusid)) return false;

      return true;
    });
  }

  function getVisibleExceptions() {
    const visibleInvoices = new Set(
      getVisibleFactRows()
        .map((row) => row.invoice_number)
        .filter(Boolean)
    );

    return DASH.exceptionRows.filter((row) => {
      if (DASH.filters.invoiceType.length && !DASH.filters.invoiceType.includes(row.invoice_type)) return false;

      if (visibleInvoices.size && row.invoice_number && !visibleInvoices.has(row.invoice_number)) return false;

      return true;
    });
  }

  function getVisibleExceptionsForUser(userId) {
    const invoices = new Set(
      getVisibleFactRows()
        .filter((row) => row.user_opusid === userId)
        .map((row) => row.invoice_number)
        .filter(Boolean)
    );

    return getVisibleExceptions().filter((row) => {
      if (!invoices.size) return false;
      return invoices.has(row.invoice_number);
    });
  }

  function getVisibleParkingHold() {
    const visibleInvoices = new Set(
      getVisibleFactRows()
        .map((row) => row.invoice_number)
        .filter(Boolean)
    );

    return DASH.parkingHoldRows.filter((row) => {
      if (DASH.filters.user.length && !DASH.filters.user.includes(row.user_opusid)) return false;
      if (DASH.filters.invoiceType.length && !DASH.filters.invoiceType.includes(row.invoice_type)) return false;

      if (visibleInvoices.size && row.invoice_number && !visibleInvoices.has(row.invoice_number)) return false;

      return true;
    });
  }

  function rowMatchesKpiFilters(row, applyUserFilter) {
    const user = userMapById().get(row.user_opusid);

    if (DASH.filters.region.length && !DASH.filters.region.includes(row.region)) return false;
    if (DASH.filters.country.length && !DASH.filters.country.includes(row.country)) return false;
    if (DASH.filters.paymentOffice.length && !DASH.filters.paymentOffice.includes(row.payment_office)) return false;
    if (DASH.filters.process.length && !DASH.filters.process.includes(row.process)) return false;
    if (DASH.filters.invoiceType.length && !DASH.filters.invoiceType.includes(row.invoice_type)) return false;

    if (applyUserFilter && DASH.filters.user.length && !DASH.filters.user.includes(row.user_opusid)) return false;

    if (DASH.filters.location.length && !DASH.filters.location.includes(user?.location || "")) return false;
    if (DASH.filters.supervisor.length && !DASH.filters.supervisor.includes(user?.supervisor_name || "")) return false;

    return true;
  }

  function rowMatchesFactFilters(row, applyUserFilter) {
    const user = userMapById().get(row.user_opusid);

    if (DASH.filters.region.length && !DASH.filters.region.includes(row.region)) return false;
    if (DASH.filters.country.length && !DASH.filters.country.includes(row.country)) return false;
    if (DASH.filters.paymentOffice.length && !DASH.filters.paymentOffice.includes(row.payment_office)) return false;
    if (DASH.filters.process.length && !DASH.filters.process.includes(row.process)) return false;
    if (DASH.filters.invoiceType.length && !DASH.filters.invoiceType.includes(row.invoice_type)) return false;

    if (applyUserFilter && DASH.filters.user.length && !DASH.filters.user.includes(row.user_opusid)) return false;

    if (DASH.filters.location.length && !DASH.filters.location.includes(user?.location || row.office_location || "")) return false;
    if (DASH.filters.supervisor.length && !DASH.filters.supervisor.includes(user?.supervisor_name || "")) return false;

    return true;
  }

  function deriveKpiRowsFromFacts(factRows) {
    const exceptionInvoiceSet = new Set(
      DASH.exceptionRows
        .map((row) => row.invoice_number)
        .filter(Boolean)
    );

    const parkingInvoiceSet = new Set(
      DASH.parkingHoldRows
        .filter((row) => row.event_type.toLowerCase().includes("parking"))
        .map((row) => row.invoice_number)
        .filter(Boolean)
    );

    const holdInvoiceSet = new Set(
      DASH.parkingHoldRows
        .filter((row) => row.event_type.toLowerCase().includes("hold"))
        .map((row) => row.invoice_number)
        .filter(Boolean)
    );

    const map = new Map();

    factRows.forEach((row) => {
      const activityDate = row.allocated_date || row.completed_date || row.received_date || "";
      const key = [
        activityDate,
        row.region,
        row.country,
        row.control_office,
        row.payment_office,
        row.process,
        row.user_opusid,
        row.invoice_type
      ].join("|");

      if (!map.has(key)) {
        map.set(key, {
          activity_date: activityDate,
          region: row.region,
          country: row.country,
          control_office: row.control_office,
          payment_office: row.payment_office,
          process: row.process,
          user_opusid: row.user_opusid,
          invoice_type: row.invoice_type,
          allocation_count: 0,
          processed_count: 0,
          pending_count: 0,
          avg_aht_minutes: 0,
          productivity_percent: 0,
          exception_count: 0,
          parking_count: 0,
          hold_count: 0,
          ahtValues: []
        });
      }

      const item = map.get(key);

      if (row.allocated_flag || row.allocated_at) item.allocation_count += 1;
      if (row.completed_flag || row.completed_at) item.processed_count += 1;
      if (row.pending_flag || (row.allocated_at && !row.completed_at)) item.pending_count += 1;

      if (row.processed_time_minutes > 0) item.ahtValues.push(row.processed_time_minutes);
      if (exceptionInvoiceSet.has(row.invoice_number)) item.exception_count += 1;
      if (parkingInvoiceSet.has(row.invoice_number)) item.parking_count += 1;
      if (holdInvoiceSet.has(row.invoice_number)) item.hold_count += 1;
    });

    return [...map.values()].map((row) => {
      row.avg_aht_minutes = avg(row.ahtValues);
      row.productivity_percent = pct(row.processed_count, row.allocation_count);
      delete row.ahtValues;
      return row;
    });
  }

  function buildUserRankingRows(kpiRows, users) {
    const usersMap = new Map(users.map((user) => [user.user_opusid, user]));
    const map = new Map();

    kpiRows.forEach((row) => {
      if (!isRealUser(row.user_opusid)) return;

      if (!map.has(row.user_opusid)) {
        const user = usersMap.get(row.user_opusid);

        map.set(row.user_opusid, {
          user_opusid: row.user_opusid,
          user_name: user?.user_name || row.user_name || row.user_opusid,
          region: row.region,
          country: row.country,
          supervisor_name: user?.supervisor_name || row.supervisor_name || "Unknown",
          location: user?.location || row.location || "Unknown",
          processSet: new Set(),
          allocation: 0,
          processed: 0,
          pending: 0,
          exceptions: 0,
          parking: 0,
          hold: 0,
          totalAhtMinutes: 0,
          ahtItemCount: 0,
          ahtValues: []
        });
      }

      const item = map.get(row.user_opusid);

      item.processSet.add(row.process);
      item.allocation += row.allocation_count;
      item.processed += row.processed_count;
      item.pending += row.pending_count;
      item.exceptions += row.exception_count;
      item.parking += row.parking_count;
      item.hold += row.hold_count;
      item.totalAhtMinutes += number(row.total_aht_minutes);
      item.ahtItemCount += number(row.aht_item_count);

      if (row.avg_aht_minutes) item.ahtValues.push(row.avg_aht_minutes);
    });

    const rows = [...map.values()]
      .map((row) => {
        const productivity = pct(row.processed, row.allocation);
        const avgAht = row.ahtItemCount > 0
          ? row.totalAhtMinutes / row.ahtItemCount
          : avg(row.ahtValues);

        return {
          ...row,
          process_label: [...row.processSet].join(", "),
          productivity,
          avg_aht: avgAht,
          blocked_work: row.parking + row.hold,
          score: calculateScore(productivity, avgAht, row.exceptions, row.allocation),
          category: getCategory(productivity),
          _rowFilter: {
            user: row.user_opusid,
            region: row.region,
            country: row.country
          }
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.processed - a.processed;
      });

    rows.forEach((row, index) => {
      row.rank = index + 1;
    });

    return rows;
  }

  function createTable(id, rows, columns, options = {}) {
    const el = $(id);

    if (!el || typeof Tabulator === "undefined") return;

    const bindTableEvents = (table) => {
      if (!table || typeof table.on !== "function") return;
      try { table.off("rowClick"); } catch (_) {}
      try { table.off("rowDblClick"); } catch (_) {}
      table.on("rowClick", (_event, row) => applyRowFilter(row.getData(), id));
      table.on("rowDblClick", (_event, row) => openRowModal(id, row.getData()));
    };

    const config = {
      data: rows || [],
      columns,
      layout: options.layout || "fitDataStretch",
      height: "100%",
      responsiveLayout: options.responsiveLayout || false,
      placeholder: "No data found",
      movableColumns: true,
      pagination: options.pagination === false ? false : "local",
      paginationSize: options.paginationSize || 10
    };

    if (DASH.tables[id]) {
      DASH.tables[id].setColumns(columns);
      DASH.tables[id].replaceData(rows || []);
      bindTableEvents(DASH.tables[id]);
      return;
    }

    DASH.tables[id] = new Tabulator(el, config);
    bindTableEvents(DASH.tables[id]);
  }

  function applyRowFilter(row, tableId = "row") {
    const detailOnlyTables = new Set([
      "userInvoiceDetailTable",
      "userDateWiseMatrixTable",
      "userProcessWiseProductivityTable"
    ]);

    if (detailOnlyTables.has(tableId)) {
      openRowModal(tableId, row);
      return;
    }

    const inferredFilter = inferRowFilter(row, tableId);
    const filter = { ...(row?._rowFilter || {}), ...inferredFilter };
    let changed = false;

    if (filter.region) {
      DASH.filters.region = [filter.region];
      changed = true;
    }

    if (filter.country) {
      DASH.filters.country = [filter.country];
      changed = true;
    }

    if (filter.user) {
      DASH.filters.user = [filter.user];
      // Individual Productivity is intentionally single-user, so remove wider people filters.
      DASH.filters.location = [];
      DASH.filters.supervisor = [];
      changed = true;
    }

    if (filter.process) {
      DASH.filters.process = [filter.process];
      changed = true;
    }

    if (filter.supervisor) {
      DASH.filters.supervisor = [filter.supervisor];
      changed = true;
    }

    if (!changed) {
      openRowModal(tableId, row);
      return;
    }

    hydrateFilterOptions();
    renderAllFilterOptions();
    updateFilterChips();

    if (filter.user) {
      markSelectedTableRow(tableId, filter.user);
      switchTab("userPage");
      if (DASH.hasSearched && !DASH.loading) {
        loadDashboard(true);
      } else {
        renderUserPage();
      }
    } else {
      renderRegionPage();
    }

    showToast(filter.user ? "User filter applied" : "Row filter applied", "success");
  }

  function inferRowFilter(row, tableId = "") {
    if (!row || typeof row !== "object") return {};

    const user = clean(
      row.user_opusid || row.userOpusid || row.opusId || row.OpusID || row.opusID ||
      row.User || row.user || row.email || row.user_email || row.Email || ""
    );

    const region = clean(row.region || row.Region || "");
    const country = clean(row.country || row.Country || "");
    const process = clean(row.process || row.Process || "");
    const supervisor = clean(row.supervisor_name || row.Supervisor || row.supervisor || "");

    const userTables = new Set([
      "productivityAhtCoachTable",
      "regionUserRankingTable",
      "regionDetailedPerformanceTable",
      "userQualityRateTable"
    ]);

    if (!user && !userTables.has(tableId)) return {};

    return { user, region, country, process, supervisor };
  }

  function markSelectedTableRow(tableId, userOpusid) {
    const table = DASH.tables?.[tableId];
    if (!table || !userOpusid) return;

    try {
      table.getRows().forEach((tabRow) => {
        const data = tabRow.getData() || {};
        const rowUser = clean(data.user_opusid || data._rowFilter?.user || "");
        tabRow.getElement()?.classList.toggle("ap-selected-user-row", rowUser === userOpusid);
      });
    } catch (_) {}
  }

  function openRowModal(tableId, data) {
    const modal = $("workforceRowDetailModal");
    const title = $("workforceRowDetailTitle");
    const grid = $("workforceRowDetailGrid");

    if (!modal || !title || !grid) return;

    title.innerHTML = `
      <span class="material-symbols-outlined">info</span>
      <span>Row Detail</span>
    `;

    const entries = Object.entries(data || {})
      .filter(([key, value]) => {
        if (key.startsWith("_")) return false;
        if (value === null || value === undefined) return false;
        if (typeof value === "object") return false;
        return true;
      })
      .slice(0, 48);

    grid.innerHTML = entries.map(([key, value]) => {
      return `
        <div class="row-detail-item">
          <span>${escapeHtml(labelize(key))}</span>
          <strong>${escapeHtml(formatModalValue(value))}</strong>
        </div>
      `;
    }).join("");

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeRowModal() {
    const modal = $("workforceRowDetailModal");

    if (!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  function applyTableSearch(id, query) {
    const table = DASH.tables[id];

    if (!table) return;

    if (id === "userInvoiceDetailTable" && DASH.apiBase) {
      table.setData();
      return;
    }

    const searchText = clean(query).toLowerCase();

    if (!searchText) {
      table.clearFilter(true);
      return;
    }

    table.setFilter((data) => {
      return Object.values(data || {}).some((value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === "object") return false;
        return String(value).toLowerCase().includes(searchText);
      });
    });
  }
  function ensureEnterpriseLegend(chartId, items) {
    const chartEl = $(chartId);
    if (!chartEl) return;
  
    const holder = chartEl.closest(".card-inner") || chartEl.parentElement;
    if (!holder) return;
  
    chartEl.classList.add("ap-hide-native-legend");
  
    const oldLegend = holder.querySelector(`.ap-enterprise-legend[data-chart-id="${chartId}"]`);
    if (oldLegend) oldLegend.remove();
  
    const cleanItems = safeArray(items).filter((item) => item && item.name && item.color);
    if (!cleanItems.length) return;
  
    const legend = document.createElement("div");
    legend.className = "ap-enterprise-legend";
    legend.dataset.chartId = chartId;
  
    legend.innerHTML = cleanItems.map((item) => {
      return `
        <span class="ap-enterprise-legend-item">
          <i class="ap-enterprise-legend-dot" style="background:${item.color};"></i>
          <span>${escapeHtml(item.name)}</span>
        </span>
      `;
    }).join("");
  
    holder.insertBefore(legend, chartEl);
  }

  function renderChart(id, options) {
    const el = $(id);

    if (!el || typeof ApexCharts === "undefined") return;

    const chartOptions = options.chart || {};
    const gridOptions = options.grid || {};
    const legendOptions = options.legend || {};
    const xaxisOptions = options.xaxis || {};

    const finalOptions = {
      ...options,
      chart: {
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
        width: "100%",
        animations: {
          enabled: true,
          speed: 250
        },
        ...chartOptions,
        fontFamily: "Roboto, Helvetica Neue, Arial, sans-serif"
      },
      grid: {
        padding: {
          top: 4,
          right: 18,
          bottom: 8,
          left: 10
        },
        ...gridOptions
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        floating: false,
        fontSize: "11px",
        fontWeight: 800,
        offsetX: 0,
        offsetY: 0,
        itemMargin: {
          horizontal: 10,
          vertical: 0
        },
        markers: {
          width: 9,
          height: 9,
          radius: 9,
          offsetX: 0,
          offsetY: 0
        },
        ...legendOptions
      },
      xaxis: {
        ...xaxisOptions,
        labels: {
          rotate: -35,
          trim: true,
          hideOverlappingLabels: true,
          style: {
            fontSize: "11px",
            fontWeight: 700
          },
          ...(xaxisOptions.labels || {})
        }
      },
      tooltip: {
        theme: "light",
        ...(options.tooltip || {})
      }
    };

    if (DASH.charts[id]) {
      DASH.charts[id].updateOptions(finalOptions, true, true);
      setTimeout(() => { try { DASH.charts[id].resize(); } catch (_) {} }, 80);
      return;
    }

    DASH.charts[id] = new ApexCharts(el, finalOptions);
    DASH.charts[id].render();
    setTimeout(() => { try { DASH.charts[id].resize(); } catch (_) {} }, 80);
  }

  function redrawCharts() {
    Object.values(DASH.charts).forEach((chart) => {
      try {
        chart.resize();
      } catch (_) {}
    });
  }

  function redrawTables() {
    Object.values(DASH.tables).forEach((table) => {
      try {
        table.redraw(true);
      } catch (_) {}
    });
  }

  function renderEmptyState() {
    Object.values(DASH.tables).forEach((table) => {
      try {
        table.replaceData([]);
      } catch (_) {}
    });

    Object.values(DASH.charts).forEach((chart) => {
      try {
        chart.updateSeries([]);
      } catch (_) {}
    });
  }

  function renderSectionLoading(ids) {
    safeArray(ids).forEach((id) => {
      const el = $(id);
      if (!el || el.dataset.loadedOnce === "true") return;

      el.innerHTML = `
        <div class="section-loading-shell">
          <div>
            <div><span class="material-symbols-outlined" style="font-size:24px;vertical-align:middle;">hourglass_top</span></div>
            <div>Section will load when visible.</div>
          </div>
        </div>
      `;
    });
  }

  function updateProcessCardVisibility(access) {
    const allowed = new Set(access || []);

    document.querySelectorAll("[data-process-card]").forEach((card) => {
      const process = card.dataset.processCard;
      card.style.display = allowed.has(process) ? "" : "none";
    });
  }

  function getAccessibleProcesses(user, kpiRows) {
    const set = new Set();

    getAccessibleProcessesFromUser(user).forEach((process) => set.add(process));

    kpiRows.forEach((row) => {
      if (row.process) set.add(row.process);
    });

    return [...set]
      .filter(Boolean)
      .sort(processSort);
  }

  function getAccessibleProcessesFromUser(user) {
    if (!user) return [];

    const set = new Set();

    clean(user.process_access)
      .split(/[,;/|]/)
      .map(normalizeProcess)
      .filter(Boolean)
      .forEach((process) => set.add(process));

    if (user.has_processing_access) set.add("Processing");
    if (user.has_csr_access) set.add("CSR");
    if (user.has_bizcommon_access) set.add("BizCommon");
    if (user.has_parking_access) set.add("Parking");

    return [...set]
      .filter(Boolean)
      .sort(processSort);
  }

  function processSort(a, b) {
    const order = ["Indexing", "Processing", "CSR", "BizCommon", "Parking", "Approval", "Exception"];
    const aIndex = order.indexOf(a) === -1 ? 999 : order.indexOf(a);
    const bIndex = order.indexOf(b) === -1 ? 999 : order.indexOf(b);

    return aIndex - bIndex;
  }

  function buildRunningHourlyRows(factRows) {
    const rows = [];

    for (let hour = 0; hour < 24; hour += 1) {
      rows.push({
        hour: `${String(hour).padStart(2, "0")}:00`,
        allocation: 0,
        processed: 0,
        cumulativeAllocation: 0,
        cumulativeProcessed: 0,
        productivity: 0
      });
    }

    factRows.forEach((row) => {
      const allocated = parseDate(row.allocated_at);
      const completed = parseDate(row.completed_at);

      if (allocated) rows[allocated.getHours()].allocation += 1;
      if (completed) rows[completed.getHours()].processed += 1;
    });

    let allocation = 0;
    let processed = 0;

    rows.forEach((row) => {
      allocation += row.allocation;
      processed += row.processed;

      row.cumulativeAllocation = allocation;
      row.cumulativeProcessed = processed;
      row.productivity = round(pct(processed, allocation), 1);
    });

    return rows;
  }

  function groupByDate(kpiRows) {
    const map = new Map();

    kpiRows.forEach((row) => {
      const date = row.activity_date;

      if (!date) return;

      if (!map.has(date)) {
        map.set(date, {
          date,
          allocation: 0,
          processed: 0,
          pending: 0,
          exceptions: 0,
          parking: 0,
          hold: 0,
          totalAhtMinutes: 0,
          ahtItemCount: 0,
          ahtValues: []
        });
      }

      const item = map.get(date);

      item.allocation += row.allocation_count;
      item.processed += row.processed_count;
      item.pending += row.pending_count;
      item.exceptions += row.exception_count;
      item.parking += row.parking_count;
      item.hold += row.hold_count;
      item.totalAhtMinutes += number(row.total_aht_minutes);
      item.ahtItemCount += number(row.aht_item_count);

      if (row.avg_aht_minutes) item.ahtValues.push(row.avg_aht_minutes);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        avgAht: row.ahtItemCount > 0 ? row.totalAhtMinutes / row.ahtItemCount : avg(row.ahtValues)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function groupKpi(kpiRows, field) {
    const map = new Map();

    kpiRows.forEach((row) => {
      const name = clean(row[field]) || "Unknown";

      if (!map.has(name)) {
        map.set(name, {
          name,
          allocation: 0,
          processed: 0,
          pending: 0,
          exceptions: 0,
          parking: 0,
          hold: 0,
          totalAhtMinutes: 0,
          ahtItemCount: 0,
          ahtValues: []
        });
      }

      const item = map.get(name);

      item.allocation += row.allocation_count;
      item.processed += row.processed_count;
      item.pending += row.pending_count;
      item.exceptions += row.exception_count;
      item.parking += row.parking_count;
      item.hold += row.hold_count;
      item.totalAhtMinutes += number(row.total_aht_minutes);
      item.ahtItemCount += number(row.aht_item_count);

      if (row.avg_aht_minutes) item.ahtValues.push(row.avg_aht_minutes);
    });

    return [...map.values()].map((row) => ({
      ...row,
      avgAht: row.ahtItemCount > 0 ? row.totalAhtMinutes / row.ahtItemCount : avg(row.ahtValues)
    }));
  }

  function summarizeKpi(kpiRows) {
    const totalAhtMinutes = sum(kpiRows, "total_aht_minutes");
    const ahtItemCount = sum(kpiRows, "aht_item_count");

    return {
      allocation: sum(kpiRows, "allocation_count"),
      processed: sum(kpiRows, "processed_count"),
      pending: sum(kpiRows, "pending_count"),
      exceptions: sum(kpiRows, "exception_count"),
      parking: sum(kpiRows, "parking_count"),
      hold: sum(kpiRows, "hold_count"),
      avgAht: ahtItemCount > 0
        ? totalAhtMinutes / ahtItemCount
        : avg(kpiRows.map((row) => row.avg_aht_minutes).filter((value) => value > 0))
    };
  }

  function getSelectedUserRank() {
    const userId = DASH.filters.user[0];

    if (!userId) return "--";

    const ranking = buildUserRankingRows(getDashboardKpiRows(), getVisibleUsers());
    const row = ranking.find((item) => item.user_opusid === userId);

    return row ? `${row.rank} of ${ranking.length}` : "--";
  }

  function getBestHour(factRows) {
    const map = new Map();

    factRows.forEach((row) => {
      const date = parseDate(row.completed_at);

      if (!date) return;

      const hour = `${String(date.getHours()).padStart(2, "0")}:00`;
      map.set(hour, (map.get(hour) || 0) + 1);
    });

    return [...map.entries()]
      .map(([hour, count]) => ({
        hour,
        count
      }))
      .sort((a, b) => b.count - a.count)[0];
  }

  function topCount(rows, field, limit) {
    const map = new Map();

    rows.forEach((row) => {
      const name = clean(row[field]) || "Unknown";

      if (!name || name === "Unknown") return;

      map.set(name, (map.get(name) || 0) + 1);
    });

    return [...map.entries()]
      .map(([name, count]) => ({
        name,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  function calculateScore(productivity, avgAht, exceptions, allocation) {
    const productivityScore = Math.min(productivity, 100) * 0.75;
    const qualityScore = Math.max(0, 100 - pct(exceptions, allocation)) * 0.15;
    const ahtScore = avgAht > 0 ? Math.max(0, 100 - avgAht) * 0.10 : 0;

    return round(productivityScore + qualityScore + ahtScore, 1);
  }

  function getCategory(productivity) {
    if (productivity >= 90) return "Excellent";
    if (productivity >= 80) return "Good";
    if (productivity >= 70) return "Average";
    if (productivity >= 50) return "At Risk";
    return "Critical";
  }

  function getAgingBucket(value) {
    const date = parseDate(value);

    if (!date) return "15+ Days";

    const days = Math.floor((Date.now() - date.getTime()) / 86400000);

    if (days <= 1) return "0-1 Days";
    if (days <= 3) return "2-3 Days";
    if (days <= 7) return "4-7 Days";
    if (days <= 15) return "8-15 Days";

    return "15+ Days";
  }

  function hasUserActivity(userId, rows) {
    return rows.some((row) => row.user_opusid === userId);
  }

  function isRealUser(userId) {
    const value = clean(userId).toLowerCase();

    if (!value) return false;

    return !["dontallocate", "system", "chorus", "null", "undefined", "-"].includes(value);
  }

  function userMapById() {
    return new Map(DASH.users.map((user) => [user.user_opusid, user]));
  }

  function getPreviousRange(from, to) {
    const fromDate = parseDateOnly(from);
    const toDate = parseDateOnly(to);
    const days = Math.max(1, Math.round((toDate - fromDate) / 86400000) + 1);

    const prevTo = new Date(fromDate);
    prevTo.setDate(prevTo.getDate() - 1);

    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - days + 1);

    return {
      from: toDateInput(prevFrom),
      to: toDateInput(prevTo)
    };
  }

  function setTrend(id, current, previous, inverseGood = false, suffix = "%") {
    const el = $(id);

    if (!el) return;

    current = number(current);
    previous = number(previous);

    let diff = 0;

    if (suffix === "pp") {
      diff = current - previous;
    } else if (previous) {
      diff = ((current - previous) / Math.abs(previous)) * 100;
    } else if (current) {
      diff = 100;
    }

    const good = inverseGood ? diff <= 0 : diff >= 0;

    el.classList.toggle("trend-up", good);
    el.classList.toggle("trend-down", !good);
    const suffixText = suffix === "%" ? "%" : ` ${suffix}`;
    el.textContent = `${diff >= 0 ? "▲" : "▼"} ${formatDecimal(Math.abs(diff), 1)}${suffixText}`;
  }

  function rankFormatter(cell) {
    const value = number(cell.getValue());
    const bg = value === 1 ? "#fff7ed" : value === 2 ? "#f1f5f9" : value === 3 ? "#fef3c7" : "#eef2ff";
    const color = value === 1 ? "#9a3412" : value === 2 ? "#334155" : value === 3 ? "#854d0e" : "#3730a3";

    return `
      <span style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:30px;
        height:22px;
        border-radius:999px;
        background:${bg};
        color:${color};
        font-size:11px;
        font-weight:900;
      ">
        ${value}
      </span>
    `;
  }

  function numberFormatter(cell) {
    return formatNumber(cell.getValue());
  }

  function decimalFormatter(cell) {
    return formatDecimal(cell.getValue(), 1);
  }

  function minuteFormatter(cell) {
    const value = number(cell.getValue());
    return value ? `${formatDecimal(value, 1)} min` : "--";
  }

  function dateTimeFormatter(cell) {
    return formatDateTime(cell.getValue());
  }

  function riskNumberFormatter(cell) {
    const value = number(cell.getValue());
    const color = value > 20 ? COLORS.red : value > 0 ? COLORS.orange : COLORS.green;

    return `<span style="font-weight:900;color:${color};">${formatNumber(value)}</span>`;
  }

  function pctBarFormatter(cell) {
    const value = number(cell.getValue());
    const color = value >= 90 ? COLORS.green : value >= 75 ? COLORS.amber : COLORS.red;

    return `
      <div style="display:flex;align-items:center;gap:7px;">
        <div style="flex:1;height:7px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
          <div style="width:${Math.min(value, 100)}%;height:100%;background:${color};border-radius:999px;"></div>
        </div>
        <span style="min-width:45px;text-align:right;font-weight:900;color:${color};">
          ${formatDecimal(value, 1)}%
        </span>
      </div>
    `;
  }

  function heatPctFormatter(cell) {
    const value = number(cell.getValue());
    const bg = value >= 90 ? "#dcfce7" : value >= 75 ? "#fef3c7" : "#fee2e2";
    const color = value >= 90 ? "#166534" : value >= 75 ? "#92400e" : "#991b1b";

    return `
      <span style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-width:58px;
        border-radius:999px;
        padding:4px 8px;
        background:${bg};
        color:${color};
        font-weight:900;
      ">
        ${formatDecimal(value, 1)}%
      </span>
    `;
  }

  function categoryFormatter(cell) {
    const value = clean(cell.getValue()) || "Unknown";

    const styles = {
      Excellent: ["#dcfce7", "#166534", "#bbf7d0"],
      Good: ["#dbeafe", "#1d4ed8", "#bfdbfe"],
      Average: ["#fef3c7", "#92400e", "#fde68a"],
      "At Risk": ["#ffedd5", "#c2410c", "#fed7aa"],
      Critical: ["#fee2e2", "#b91c1c", "#fecaca"]
    };

    const style = styles[value] || ["#f1f5f9", "#334155", "#cbd5e1"];
    const bg = style[0];
    const color = style[1];
    const border = style[2];

    return `
      <span style="
        display:inline-flex;
        border-radius:999px;
        padding:5px 9px;
        background:${bg};
        color:${color};
        border:1px solid ${border};
        font-size:11px;
        font-weight:900;
      ">
        ${escapeHtml(value)}
      </span>
    `;
  }

  function processFormatter(cell) {
    const value = clean(cell.getValue()) || "Unknown";
    const color = PROCESS_COLORS[value] || COLORS.gray;

    return `
      <span style="
        display:inline-flex;
        border-radius:999px;
        padding:5px 9px;
        background:${color};
        color:#fff;
        font-size:11px;
        font-weight:900;
      ">
        ${escapeHtml(value)}
      </span>
    `;
  }

  function statusFormatter(cell) {
    const value = clean(cell.getValue()) || "Unknown";
    const lower = value.toLowerCase();

    let bg = "#f1f5f9";
    let color = "#334155";
    let border = "#cbd5e1";

    if (lower.includes("process") || lower.includes("complete") || lower.includes("done")) {
      bg = "#dcfce7";
      color = "#166534";
      border = "#bbf7d0";
    } else if (lower.includes("pend")) {
      bg = "#fff7ed";
      color = "#c2410c";
      border = "#fed7aa";
    } else if (lower.includes("exception") || lower.includes("reject")) {
      bg = "#fee2e2";
      color = "#b91c1c";
      border = "#fecaca";
    } else if (lower.includes("hold") || lower.includes("park")) {
      bg = "#fef3c7";
      color = "#92400e";
      border = "#fde68a";
    }

    return `
      <span style="
        display:inline-flex;
        border-radius:999px;
        padding:5px 9px;
        background:${bg};
        color:${color};
        border:1px solid ${border};
        font-size:11px;
        font-weight:900;
      ">
        ${escapeHtml(value)}
      </span>
    `;
  }

  function parseTime(value) {
    const match = clean(value).match(/^(\d{1,2}):(\d{2})/);

    if (!match) return null;

    return number(match[1]) * 60 + number(match[2]);
  }

  function shiftLength(start, end) {
    return end >= start ? end - start : 1440 - start + end;
  }

  function normalizeProcess(value) {
    const text = clean(value);
    const lower = text.toLowerCase();

    if (!text) return "";
    if (lower.includes("index")) return "Indexing";
    if (lower.includes("process")) return "Processing";
    if (lower === "csr" || lower.includes("csr")) return "CSR";
    if (lower.includes("biz")) return "BizCommon";
    if (lower.includes("park")) return "Parking";
    if (lower.includes("approv")) return "Approval";
    if (lower.includes("exception")) return "Exception";

    return text;
  }

  function setLoading(isLoading, label = "Loading...") {
    const icon = $("manualRefreshIcon");
    const text = $("manualRefreshText");

    if (icon) icon.style.animation = isLoading ? "spin 0.8s linear infinite" : "";
    if (text) text.textContent = isLoading ? label : "Refresh";
  }

  function showError(message) {
    const el = $("dashboardError");

    if (!el) return;

    el.textContent = message;
    el.classList.remove("hidden");
  }

  function hideError() {
    $("dashboardError")?.classList.add("hidden");
  }

  function cleanError(error) {
    const message = clean(error?.message || error);

    if (message.includes("selectData")) {
      return "Database connection helper is missing. Check minipostgrest.js loading order.";
    }

    return message || "Dashboard could not be loaded.";
  }

  function ensureSelectData() {
    if (typeof window.selectData !== "function") {
      throw new Error("selectData is not available");
    }
  }

  function assertSuccess(response, message) {
    if (!response || response.status !== "success") {
      throw new Error(response?.message || response?.data || message);
    }
  }

  function showToast(message, type) {
    if (window.ToastManager?.show) {
      window.ToastManager.show(message, type || "info");
    } else {
      console.log(`[${type || "info"}] ${message}`);
    }
  }

  function read(row, key) {
    return row ? row[key] : undefined;
  }

  function clean(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function toBool(value) {
    if (typeof value === "boolean") return value;

    const text = clean(value).toLowerCase();

    return ["true", "t", "yes", "y", "1", "active"].includes(text);
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function unique(values) {
    return [...new Set(safeArray(values).map(clean).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  function sum(rows, field) {
    return safeArray(rows).reduce((total, row) => {
      return total + number(row[field]);
    }, 0);
  }

  function avg(values) {
    const nums = safeArray(values)
      .map(number)
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!nums.length) return 0;

    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  function pct(num, den) {
    num = number(num);
    den = number(den);

    if (!den) return 0;

    return (num / den) * 100;
  }

  function round(value, decimals = 0) {
    const factor = 10 ** decimals;

    return Math.round(number(value) * factor) / factor;
  }

  function first(values) {
    return safeArray(values).map(clean).find(Boolean) || "";
  }

  function parseDate(value) {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function parseDateOnly(value) {
    const parts = clean(value).split("-").map(Number);

    if (parts.length < 3) return new Date();

    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function minDate(values) {
    const dates = safeArray(values)
      .map(parseDate)
      .filter(Boolean);

    if (!dates.length) return null;

    return new Date(Math.min(...dates.map((date) => date.getTime())));
  }

  function maxDate(values) {
    const dates = safeArray(values)
      .map(parseDate)
      .filter(Boolean);

    if (!dates.length) return null;

    return new Date(Math.max(...dates.map((date) => date.getTime())));
  }

  function toDateInput(date) {
    const d = new Date(date);

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function formatShortDate(value) {
    const date = parseDateOnly(value);

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit"
    });
  }

  function formatDateTime(value) {
    const date = parseDate(value);

    return date ? date.toLocaleString() : "--";
  }

  function formatShift(start, end) {
    if (!start || !end) return "--";

    return `${clean(start).slice(0, 5)} - ${clean(end).slice(0, 5)}`;
  }

  function formatNumber(value) {
    return number(value).toLocaleString();
  }


  function shortNumber(value) {
    const n = number(value);

    if (Math.abs(n) >= 1000000) return `${formatDecimal(n / 1000000, 1)}M`;
    if (Math.abs(n) >= 1000) return `${formatDecimal(n / 1000, 1)}K`;

    return formatNumber(n);
  }

  function chartTotalTitle(text) {
    return {
      text,
      align: "right",
      margin: 6,
      offsetX: -4,
      offsetY: 0,
      style: {
        fontSize: "12px",
        fontWeight: 900,
        color: "#6b1648"
      }
    };
  }


  // ===============================
  // ONE AP shell: reference-aligned login/profile/sidebar/session wrapper
  // ===============================
  function initOneApShell() {
    bindOneApSidebar();
    bindOneApProfileMenu();
    startSessionTimerFallback();
    initOneApManagers();
  }


  function startSessionTimerFallback() {
    const target = $("session-time-left");
    if (!target) return;

    const ensureStart = () => {
      try {
        const key = "one_ap_session_started_at";
        let startedAt = Number(sessionStorage.getItem(key) || 0);
        if (!startedAt) {
          startedAt = Date.now();
          sessionStorage.setItem(key, String(startedAt));
        }
        return startedAt;
      } catch (_) {
        return Date.now();
      }
    };

    const startedAt = ensureStart();
    const render = () => {
      // If LoginStateManager has already written a real value, do not overwrite it.
      const current = clean(target.textContent);
      if (current && current !== "--:--" && !target.dataset.fallbackSession) return;

      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, 60 * 60 - elapsed);
      const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
      const secs = String(remaining % 60).padStart(2, "0");
      target.dataset.fallbackSession = "1";
      target.textContent = `${mins}:${secs}`;
    };

    setTimeout(render, 600);
    setInterval(render, 1000);
  }

  function bindOneApSidebar() {
    const toggle = $("sidebarToggleBtn");
    const sidebar = $("leftSidebar");
    const overlay = $("leftSidebarOverlay");

    const close = () => setLeftSidebarOpen(false);

    toggle?.addEventListener("click", (event) => {
      event.preventDefault();
      setLeftSidebarOpen(!sidebar?.classList.contains("is-open"));
    });

    overlay?.addEventListener("click", close);

    document.querySelectorAll("[data-shell-action='profile']").forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();
        close();
        setProfileMenuOpen(true);
      });
    });
  }

  function setLeftSidebarOpen(open) {
    const sidebar = $("leftSidebar");
    const overlay = $("leftSidebarOverlay");

    sidebar?.classList.toggle("is-open", !!open);
    sidebar?.setAttribute("aria-hidden", String(!open));
    overlay?.classList.toggle("show", !!open);
  }

  function bindOneApProfileMenu() {
    const button = $("profileToggleBtn");
    const menu = $("profileDropdownMenu");

    button?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setProfileMenuOpen(!menu?.classList.contains("show"));
    });

    $("profileLogoutBtn")?.addEventListener("click", () => {
      try {
        if (window.loginManager && typeof window.loginManager.handleLogout === "function") {
          window.loginManager.handleLogout();
          return;
        }
      } catch (error) {
        console.warn("Logout through LoginStateManager failed:", error);
      }

      try { firebase?.auth?.().signOut?.(); } catch (_) {}
      window.location.href = "/extras/landing.html";
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".ap-profile-wrap") && !event.target.closest("#profileDropdownMenu")) {
        setProfileMenuOpen(false);
      }
    });
  }

  function setProfileMenuOpen(open) {
    const button = $("profileToggleBtn");
    const menu = $("profileDropdownMenu");

    menu?.classList.toggle("show", !!open);
    menu?.setAttribute("aria-hidden", String(!open));
    button?.setAttribute("aria-expanded", String(!!open));
  }

  function initOneApManagers() {
    const createManagers = () => {
      try {
        if (!window.loginManager && typeof window.LoginStateManager === "function") {
          window.loginManager = new LoginStateManager();
        }
      } catch (error) {
        console.warn("LoginStateManager initialization failed:", error);
      }

      try {
        if (!window.profileManager && typeof window.ProfileManager === "function") {
          window.profileManager = new ProfileManager();
        }
      } catch (error) {
        console.warn("ProfileManager initialization failed:", error);
      }

      waitForOneApProfile();
    };

    if (window.jQuery && typeof window.jQuery === "function") {
      window.jQuery(createManagers);
    } else {
      createManagers();
    }
  }

  function waitForOneApProfile() {
    let lastSignature = "";

    const syncIfPossible = () => {
      const profile = getBestAvailableOneApProfile();
      const signature = JSON.stringify({
        email: profile?.onshorePOCEmail || profile?.email || profile?.userEmail || "",
        region: profile?.region || "",
        dept: profile?.spocDepartment || profile?.department || "",
        offices: profile?.offices || ""
      });

      if (signature !== lastSignature) {
        lastSignature = signature;
        syncOneApProfile(profile);
      }
    };

    syncIfPossible();

    // Keep watching because ProfileManager can finish after Firebase popup closes.
    const timer = setInterval(syncIfPossible, 1000);
    setTimeout(() => clearInterval(timer), 120000);

    try {
      if (window.firebase?.auth) {
        window.firebase.auth().onAuthStateChanged(() => syncIfPossible());
      }
    } catch (_) {}
  }

  function getBestAvailableOneApProfile() {
    const managerProfile = window.profileManager?.profile;
    if (hasUsefulOneApProfile(managerProfile)) return managerProfile;

    // Some helper builds expose profile under a different property while loading.
    const alternateManagerProfiles = [
      window.profileManager?.user,
      window.profileManager?.currentUser,
      window.profileManager?.portalProfile,
      window.profileManager?.data,
      window.loginManager?.profile,
      window.loginManager?.user
    ];

    for (const item of alternateManagerProfiles) {
      if (hasUsefulOneApProfile(item)) return item;
    }

    const stored = findStoredOneApProfile();
    if (stored) return stored;

    try {
      const user = window.firebase?.auth?.().currentUser;
      if (user?.email) {
        return {
          onshorePOCEmail: user.email,
          email: user.email,
          name: user.displayName || "",
          displayName: user.displayName || ""
        };
      }
    } catch (_) {}

    const simpleStoredProfile = findSimpleStoredOneApProfile();
    if (simpleStoredProfile) return simpleStoredProfile;

    return null;
  }

  function hasUsefulOneApProfile(profile) {
    if (!profile || typeof profile !== "object") return false;
    return Boolean(
      profile.onshorePOCEmail || profile.email || profile.userEmail || profile.user_email ||
      profile.spocDepartment || profile.department || profile.region || profile.countries ||
      profile.offices || profile.office || profile.controlOffice || profile.isAdmin
    );
  }

  function findStoredOneApProfile() {
    const stores = [];
    try { stores.push(window.localStorage); } catch (_) {}
    try { stores.push(window.sessionStorage); } catch (_) {}

    const profileHints = ["onshorePOCEmail", "spocDepartment", "profileCategory", "isAdmin", "countries", "offices", "region"];

    for (const store of stores) {
      if (!store) continue;

      const preferredKeys = [
        "oneap_profile", "profile", "userProfile", "one_ap_profile", "tasklink_profile",
        "profileManager.profile", "portal_profile", "currentProfile", "user_profile",
        "loggedInUser", "loginProfile", "oneapUser", "oneAPUser", "authProfile"
      ];

      for (const key of preferredKeys) {
        const obj = parseStoredJson(store.getItem(key));
        const profile = normalizePossibleStoredProfile(obj);
        if (profile) return profile;
      }

      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (!key) continue;
        const raw = store.getItem(key) || "";
        if (!profileHints.some((hint) => raw.includes(hint))) continue;
        const obj = parseStoredJson(raw);
        const profile = normalizePossibleStoredProfile(obj);
        if (profile) return profile;
      }
    }

    return null;
  }

  function findSimpleStoredOneApProfile() {
    const profile = {};
    const readStoreValue = (key) => {
      try { return window.localStorage?.getItem(key) || window.sessionStorage?.getItem(key) || ""; } catch (_) { return ""; }
    };

    const email = clean(
      readStoreValue("onshorePOCEmail") || readStoreValue("email") || readStoreValue("userEmail") || readStoreValue("user_email")
    );
    if (email) {
      profile.onshorePOCEmail = email;
      profile.email = email;
    }

    const department = clean(readStoreValue("spocDepartment") || readStoreValue("department") || readStoreValue("team"));
    if (department) profile.spocDepartment = department;

    const region = clean(readStoreValue("region"));
    if (region) profile.region = region;

    const countries = clean(readStoreValue("countries") || readStoreValue("country"));
    if (countries) profile.countries = countries;

    const offices = clean(readStoreValue("offices") || readStoreValue("office") || readStoreValue("controlOffice"));
    if (offices) profile.offices = offices;

    return hasUsefulOneApProfile(profile) ? profile : null;
  }

  function parseStoredJson(raw) {
    if (!raw || typeof raw !== "string") return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  function normalizePossibleStoredProfile(obj) {
    if (!obj || typeof obj !== "object") return null;

    const candidates = [
      obj,
      obj.profile,
      obj.user,
      obj.data,
      obj.currentUser,
      obj.portalProfile,
      Array.isArray(obj) ? obj.find((item) => item && typeof item === "object" && (item.onshorePOCEmail || item.spocDepartment || item.region)) : null
    ].filter(Boolean);

    for (const c of candidates) {
      if (!c || typeof c !== "object") continue;
      if (hasUsefulOneApProfile(c)) return c;
    }

    return null;
  }

  function syncOneApProfile(profile) {
    const p = profile || {};
    const email = clean(p.onshorePOCEmail || p.email || p.userEmail || p.user_email || "");
    const fallbackName = email ? email.split("@")[0] : "Profile";
    const name = clean(p.name || p.displayName || p.user_name || p.username || toTitleName(fallbackName)) || "Profile";
    const department = clean(p.spocDepartment || p.department || p.dept || p.team || "--");
    const region = clean(p.region || p.Region || "--");
    const countries = Array.isArray(p.countries) ? p.countries.join(", ") : clean(p.countries || p.country || p.Country || "--");
    const offices = Array.isArray(p.offices) ? p.offices.join(", ") : clean(p.offices || p.office || p.Office || p.controlOffice || "--");

    setText("profileUserName", name === "Profile" ? "Profile" : name.split(" ")[0]);
    setText("profileDropdownName", name);
    setText("profileDropdownEmail", email || "--");
    setText("profileDropdownDepartment", department || "--");
    setText("profileDropdownRegion", region || "--");
    setText("profileDropdownCountries", countries || "--");
    setText("profileDropdownOffices", offices || "--");
    $("profileAdminBadge")?.classList.toggle("show", !!p.isAdmin);

    renderOneApReports(resolveOneApReports(p));
  }

  function toTitleName(value) {
    return clean(value)
      .replace(/[._-]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  function resolveOneApReports(profile = null) {
    const all = window.SIDENAV_REPORTS || {};
    if (!all || typeof all !== "object") return [];

    const p = profile || window.profileManager?.profile || {};
    const region = p.region || "EUA";
    const showGlobalReports = p.profileCategory === "Level 4" || p.spocDepartment === "BPIT";

    if (showGlobalReports && Array.isArray(all.global) && all.global.length) return all.global;
    if (Array.isArray(all[region]) && all[region].length) return all[region];
    if (Array.isArray(all.EUA) && all.EUA.length) return all.EUA;
    return [];
  }

  function renderOneApReports(reports) {
    const host = $("sidebarReportLinks");
    if (!host) return;

    const rows = safeArray(reports);
    if (!rows.length) {
      host.innerHTML = `<div class="ap-left-link" style="color:#94a3b8;cursor:default;"><span class="material-symbols-outlined">dashboard</span><span>No reports configured</span></div>`;
      return;
    }

    host.innerHTML = rows.map((rep) => {
      const href = escapeAttr(resolveRelativeReportHref(rep.href || "#"));
      const label = escapeHtml(rep.label || "Report");
      const icon = escapeHtml(rep.icon || "dashboard");
      return `
        <a href="${href}" target="_blank" class="ap-left-link">
          <span class="material-symbols-outlined">${icon}</span><span>${label}</span>
          <span class="material-symbols-outlined" style="margin-left:auto;font-size:16px;opacity:.55;">open_in_new</span>
        </a>
      `;
    }).join("");
  }

  function resolveRelativeReportHref(href) {
    const value = String(href || "#");
    if (/^(https?:|mailto:|\/)/i.test(value)) return value;
    return value.startsWith("../") ? value : `../${value}`;
  }

  function exportActiveDashboardTable() {
    const tableId = DASH.activePage === "userPage"
      ? "userInvoiceDetailTable"
      : "regionUserRankingTable";

    const table = DASH.tables[tableId] || DASH.tables.regionDetailedPerformanceTable || Object.values(DASH.tables)[0];

    if (table && typeof table.download === "function") {
      const fileName = DASH.activePage === "userPage"
        ? "ap-user-productivity.csv"
        : "ap-region-productivity.csv";
      table.download("csv", fileName);
      return;
    }

    const rows = getVisibleKpiRows();
    if (!rows.length) {
      showToast("No table data available to export.", "warning");
      return;
    }

    downloadRowsAsCsv(rows, "ap-productivity-summary.csv");
  }

  function downloadRowsAsCsv(rows, fileName) {
    const data = safeArray(rows);
    if (!data.length) return;

    const headers = Object.keys(data[0]).filter((key) => !key.startsWith("_"));
    const csv = [headers.join(",")].concat(data.map((row) => {
      return headers.map((key) => csvCell(row[key])).join(",");
    })).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }



  /* ============================================================
     Enterprise Section Experience
     - Lightweight contextual rail like ChatGPT sidebar
     - Business-story sections for a large dashboard
     - Smooth jump navigation
     - Small plain-English insight text under every key chart/table
     - Lazy-friendly collapsed advanced areas
  ============================================================ */

  const ENTERPRISE_SECTIONS = {
    regionPage: [
      { id: "region-executive", label: "Executive Summary", icon: "dashboard", badge: "Health", subtitle: "Overall productivity health, volume movement and leadership signals." },
      { id: "region-workload", label: "Workload & Capacity", icon: "work_history", badge: "Next API", subtitle: "Open work, capacity pressure, overloaded users and SLA risk. This section is ready for rpt_ap_open_work_current." },
      { id: "region-user-performance", label: "User Productivity", icon: "groups", badge: "Users", subtitle: "Who is productive, who needs coaching, and how supervisors are performing." },
      { id: "region-process", label: "Process Bottlenecks", icon: "account_tree", badge: "Flow", subtitle: "Where work is slowing down across process stages, pending queues and AHT." },
      { id: "region-quality", label: "Exception & Quality", icon: "verified_user", badge: "Quality", subtitle: "Exception rate, blocked work, parking/hold and quality risk by user." },
      { id: "region-office", label: "Regional / Office Health", icon: "public", badge: "Geo", subtitle: "Country, region and office comparisons to locate low-productivity areas." },
      { id: "region-drilldown", label: "Drilldown Tables", icon: "table_view", badge: "Action", subtitle: "Detailed user-level records for investigation and export." }
    ],
    userPage: [
      { id: "user-profile", label: "User Snapshot", icon: "badge", badge: "Profile", subtitle: "Selected user identity, access, shift and overall contribution." },
      { id: "user-output", label: "Output & Trend", icon: "monitoring", badge: "Trend", subtitle: "Hourly and daily movement for received, processed, pending and productivity." },
      { id: "user-process", label: "Process Split", icon: "rule", badge: "Access", subtitle: "Process-wise productivity and date-wise matrix for the selected user." },
      { id: "user-workload", label: "Workload & Utilization", icon: "workspaces", badge: "Capacity", subtitle: "Shift utilization, carryover work, blockers and workload pressure." },
      { id: "user-quality", label: "Exception & Quality", icon: "report", badge: "Quality", subtitle: "Exceptions, parking, hold and quality reasons affecting the user." },
      { id: "user-drilldown", label: "Invoice Drilldown", icon: "receipt_long", badge: "Rows", subtitle: "Invoice-level details and user actions for operational follow-up." }
    ]
  };

  const INSIGHT_COPY = {
    regionDailyVolumeChart: "Use this to see whether processed output is keeping pace with allocation and pending work. A widening gap means backlog risk is increasing.",
    regionProductivityRankingChart: "Use this to quickly identify the best and weakest region based on productivity with processed volume context.",
    userProductivityBandChart: "This shows team health by productivity band. A large low-productivity band means coaching or allocation review is needed.",
    allocationBalanceChart: "This highlights users carrying more pending work than their processed output. These users are candidates for workload balancing.",
    productivityAhtCoachTable: "This table separates coaching cases from strong performers by combining productivity and AHT behavior.",
    regionSupervisorSummaryTable: "Use this to compare supervisor teams and find where idle users, low performers or allocation imbalance exist.",
    userQualityRateTable: "This identifies users creating higher quality impact through exceptions, parking, hold or blocked work.",
    regionUserRankingTable: "This is the main operational leaderboard. Use it to identify top performers, low performers and high-pending users.",
    regionProductivityHeatmap: "This makes regional productivity gaps visible by date. Use it to spot repeated low-performance patterns.",
    regionDetailedPerformanceTable: "This is the action table for drilldown, export and row-level investigation after the charts show an issue.",
    userRunningHourlyProductivityChart: "This shows how the selected user builds productivity during the day and whether pending work grows after certain hours.",
    userHourlyProcessOutputChart: "Use this to see which process contributes most to the user's hourly output or pending gap.",
    userProcessWiseProductivityTable: "This confirms which process the selected user is strongest or weakest in, based on actual access and activity.",
    userDateWiseMatrixTable: "This shows day-by-day consistency. Repeated weak days indicate a pattern, not a one-time issue.",
    userDailyTrendChart: "This summarizes the selected user's daily productivity, processed count and pending movement.",
    userInvoiceDetailTable: "This is the invoice-level evidence table for validating user productivity, exceptions and operational follow-up."
  };

  function initEnterpriseSectionExperience() {
    buildEnterpriseStorySections();
    renderEnterpriseSectionRail();
    addChartInsightText();
    bindEnterpriseSectionEvents();
    updateEnterpriseSectionRail();
  }

  function buildEnterpriseStorySections() {
    buildRegionStorySections();
    buildUserStorySections();
  }

  function buildRegionStorySections() {
    const page = $("regionPage");
    if (!page || page.dataset.storyReady === "true") return;

    const children = Array.from(page.children);
    const kpiGrid = children.find((el) => el.classList?.contains("kpi-grid"));
    const insightStrip = children.find((el) => el.classList?.contains("insight-strip"));
    const grids = children.filter((el) => el.classList?.contains("section-grid"));
    const drilldown = children.find((el) => el.querySelector?.("#regionDetailedPerformanceTable"));

    const sectionMap = {
      "region-executive": [kpiGrid, insightStrip, grids[0]],
      "region-workload": [createComingSoonGrid("Workload & Capacity", [
        ["User Capacity vs Open Work", "Needs rpt_ap_open_work_current + work_allocation."],
        ["Overloaded Users", "Current open work above planned capacity."],
        ["SLA Aging Risk", "0-2h, 2-4h, 4-8h, 8-24h and 24h+ pending buckets."],
        ["Idle / Underutilized Users", "Low allocation or no activity despite access."]
      ])],
      "region-user-performance": [grids[1], grids[2], grids[3]],
      "region-process": [createComingSoonGrid("Process Bottlenecks", [
        ["Processing / CSR / BizCommon Aging", "Pending and AHT by process stage."],
        ["Slow Process Signal", "Process with high AHT and growing pending."],
        ["Carryover by Process", "Work not completed within same operating window."],
        ["Process Capacity Gap", "Open queue compared with user access capacity."]
      ])],
      "region-quality": [createComingSoonGrid("Exception & Quality", [["Exception Root Cause", "Top exception types, reasons and users by selected filters."], ["Parking / Hold Reason", "Blocked work reason analysis from parking and hold summaries."], ["Quality Risk Users", "Users with high exception rate and high AHT impact."], ["Supplier Exception Signal", "Repeat suppliers causing operational rework."]])],
      "region-office": [grids[4]],
      "region-drilldown": [drilldown]
    };

    page.innerHTML = "";
    appendStorySections(page, "regionPage", sectionMap);
    page.dataset.storyReady = "true";
  }

  function buildUserStorySections() {
    const page = $("userPage");
    if (!page || page.dataset.storyReady === "true") return;

    const children = Array.from(page.children);
    const profile = children.find((el) => el.querySelector?.("#userProfileName"));
    const kpiGrid = children.find((el) => el.classList?.contains("kpi-grid"));
    const insightStrip = children.find((el) => el.classList?.contains("insight-strip"));
    const grids = children.filter((el) => el.classList?.contains("section-grid"));
    const invoice = children.find((el) => el.querySelector?.("#userInvoiceDetailTable"));

    const sectionMap = {
      "user-profile": [profile, kpiGrid, insightStrip],
      "user-output": [grids[0], grids[2]],
      "user-process": [grids[1]],
      "user-workload": [grids[3], grids[4]],
      "user-quality": [grids[5], grids[6]],
      "user-drilldown": [invoice]
    };

    page.innerHTML = "";
    appendStorySections(page, "userPage", sectionMap);
    page.dataset.storyReady = "true";
  }

  function appendStorySections(page, pageId, sectionMap) {
    const defs = ENTERPRISE_SECTIONS[pageId] || [];
    defs.forEach((def) => {
      const section = document.createElement("section");
      section.id = def.id;
      section.className = "ap-story-section";
      section.dataset.apStorySection = "true";
      section.dataset.sectionLabel = def.label;
      section.innerHTML = `
        <div class="ap-story-header">
          <div class="ap-story-title-wrap">
            <div class="ap-story-icon"><span class="material-symbols-outlined">${escapeHtml(def.icon)}</span></div>
            <div class="min-w-0">
              <div class="ap-story-title">${escapeHtml(def.label)}</div>
              <div class="ap-story-subtitle">${escapeHtml(def.subtitle)}</div>
            </div>
          </div>
          <div class="ap-story-actions">
            <span class="ap-story-chip">${escapeHtml(def.badge || "Section")}</span>
            <button class="ap-story-collapse" type="button" data-section-collapse="${escapeAttr(def.id)}" title="Collapse section">
              <span class="material-symbols-outlined">expand_less</span>
            </button>
          </div>
        </div>
        <div class="ap-story-body"></div>
      `;

      const body = section.querySelector(".ap-story-body");
      safeArray(sectionMap[def.id]).filter(Boolean).forEach((node) => body.appendChild(node));
      page.appendChild(section);
    });
  }

  function createComingSoonGrid(title, items) {
    const wrap = document.createElement("div");
    wrap.className = "ap-coming-soon-grid mb-4";
    safeArray(items).forEach(([heading, text]) => {
      const card = document.createElement("div");
      card.className = "ap-coming-card";
      card.innerHTML = `<strong>${escapeHtml(heading)}</strong><span>${escapeHtml(text)}</span>`;
      wrap.appendChild(card);
    });
    return wrap;
  }

  function renderEnterpriseSectionRail() {
    const railList = $("apSectionRailList");
    if (!railList) return;
    railList.innerHTML = "";
    safeArray(ENTERPRISE_SECTIONS[DASH.activePage]).forEach((section) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ap-section-link";
      btn.dataset.apSectionTarget = section.id;
      btn.innerHTML = `
        <span class="material-symbols-outlined">${escapeHtml(section.icon)}</span>
        <span class="ap-section-link-text">${escapeHtml(section.label)}</span>
        <span class="ap-section-link-badge">${escapeHtml(section.badge || "")}</span>
      `;
      railList.appendChild(btn);
    });
  }

  function bindEnterpriseSectionEvents() {
    $("apSectionRailToggle")?.addEventListener("click", () => {
      const open = !document.body.classList.contains("ap-section-rail-open");
      document.body.classList.toggle("ap-section-rail-open", open);
      $("apSectionRailToggle")?.setAttribute("aria-expanded", String(open));
    });

    $("apSectionRailList")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-ap-section-target]");
      if (!btn) return;
      scrollToEnterpriseSection(btn.dataset.apSectionTarget);
    });

    document.addEventListener("click", (event) => {
      const collapseBtn = event.target.closest("[data-section-collapse]");
      if (!collapseBtn) return;
      const section = $(collapseBtn.dataset.sectionCollapse);
      if (!section) return;
      const collapsed = !section.classList.contains("collapsed");
      section.classList.toggle("collapsed", collapsed);
      collapseBtn.querySelector(".material-symbols-outlined").textContent = collapsed ? "expand_more" : "expand_less";
    });

    const scrollRoot = document.querySelector(".main-shell") || window;
    scrollRoot.addEventListener("scroll", debounce(updateEnterpriseSectionRail, 80), { passive: true });
  }

  function scrollToEnterpriseSection(sectionId) {
    const section = $(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelectorAll(".ap-section-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.apSectionTarget === sectionId);
    });
  }

  function updateEnterpriseSectionRail() {
    renderEnterpriseSectionRail();
    const activeSections = safeArray(ENTERPRISE_SECTIONS[DASH.activePage]).map((section) => $(section.id)).filter(Boolean);
    if (!activeSections.length) return;

    let current = activeSections[0];
    const rootTop = (document.querySelector(".main-shell")?.getBoundingClientRect().top || 0) + 110;
    activeSections.forEach((section) => {
      if (section.getBoundingClientRect().top <= rootTop) current = section;
    });

    document.querySelectorAll(".ap-section-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.apSectionTarget === current.id);
    });
  }

  function addChartInsightText() {
    Object.entries(INSIGHT_COPY).forEach(([id, text]) => {
      const host = $(id);
      if (!host) return;
      const cardInner = host.closest(".card-inner");
      if (!cardInner || cardInner.querySelector(`[data-insight-for="${id}"]`)) return;
      const insight = document.createElement("div");
      insight.className = "ap-chart-insight";
      insight.dataset.insightFor = id;
      insight.innerHTML = `<span class="material-symbols-outlined">tips_and_updates</span><span>${escapeHtml(text)}</span>`;
      cardInner.appendChild(insight);
    });
  }

  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function formatDecimal(value, decimals) {
    return number(value).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function summarizeList(values) {
    const arr = safeArray(values).filter(Boolean);

    if (!arr.length) return "";
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]}, ${arr[1]}`;

    return `${arr[0]}, ${arr[1]} +${arr.length - 2}`;
  }

  function initials(name) {
    const parts = clean(name).split(/\s+/).filter(Boolean);

    if (!parts.length) return "--";

    return parts
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function labelize(key) {
    return clean(key)
      .replace(/^_+/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatModalValue(value) {
    if (value === null || value === undefined || value === "") return "--";
    if (typeof value === "number") return formatDecimal(value, Number.isInteger(value) ? 0 : 2);

    return String(value);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function setText(id, value) {
    const el = $(id);

    if (el) el.textContent = value ?? "";
  }

  function setValue(id, value) {
    const el = $(id);

    if (el) el.value = value ?? "";
  }

  function $(id) {
    return document.getElementById(id);
  }
})();
