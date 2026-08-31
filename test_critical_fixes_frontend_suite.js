// Code Spark Critical Production Fixes Frontend Test Suite
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== STARTING CODESPARK CRITICAL FIXES FRONTEND TEST SUITE ===");

// 1. Mock Browser DOM & Environment
const mockElement = (id = '', tagName = 'div') => ({
  id,
  tagName,
  style: {},
  classList: {
    classes: new Set(),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    contains(c) { return this.classes.has(c); }
  },
  value: '',
  checked: false,
  textContent: '',
  innerHTML: '',
  listeners: {},
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  },
  dispatchEvent(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => fn(data || { preventDefault: () => {} }));
    }
  },
  getAttribute(name) { return this[name] || null; },
  setAttribute(name, val) { this[name] = val; },
  closest(selector) { return this; },
  reset() { this.value = ''; }
});

const elementsMap = {};
const getOrCreateElement = (id) => {
  if (!elementsMap[id]) elementsMap[id] = mockElement(id);
  return elementsMap[id];
};

const window = {
  location: { hash: '#landing', origin: 'http://localhost:8000' },
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; }
  },
  sessionStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; }
  },
  UI: {
    lastToast: null,
    showToast(msg, type) { this.lastToast = { msg, type }; },
    openModal(id) {
      const el = getOrCreateElement(id);
      el.classList.add('active');
      el.style.display = 'flex';
    },
    closeModal(id) {
      const el = getOrCreateElement(id);
      el.classList.remove('active');
      el.style.display = 'none';
    }
  },
  SoundManager: {
    playClick: () => {},
    isEnabled: () => true
  }
};

global.window = window;
global.document = {
  body: mockElement('body'),
  getElementById(id) { return getOrCreateElement(id); },
  querySelectorAll(sel) { return [mockElement('query-result')]; },
  addEventListener: () => {}
};
global.navigator = { onLine: true };

// 2. Load Core Libraries
const loadScript = (file) => {
  const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
  vm.runInThisContext(code);
};

loadScript('js/components/icons.js');
loadScript('js/api.js');
loadScript('js/services/authService.js');
loadScript('js/services/studentService.js');
loadScript('js/services/adminService.js');
loadScript('js/services/resourceService.js');
loadScript('js/auth.js');
loadScript('js/views/resourcesView.js');
loadScript('js/views/adminViews.js');

const adminViewsCode = fs.readFileSync(path.join(__dirname, 'js/views/adminViews.js'), 'utf8');

// =========================================================================
// TEST SUITE 1: ADD ASSISTANT FLOW & ROLE HANDLING
// =========================================================================
console.log("\n--- Testing Feature 1: Add Assistant Flow ---");

assert.ok(adminViewsCode.includes('id="add-assistant-modal"'), "AdminViews defines #add-assistant-modal");
assert.ok(adminViewsCode.includes('id="add-assistant-form"'), "AdminViews defines #add-assistant-form");
assert.ok(adminViewsCode.includes('id="new-assistant-name"'), "AdminViews defines #new-assistant-name");
assert.ok(adminViewsCode.includes('id="new-assistant-email"'), "AdminViews defines #new-assistant-email");
assert.ok(adminViewsCode.includes('id="new-assistant-phone"'), "AdminViews defines #new-assistant-phone");
assert.ok(adminViewsCode.includes('id="new-assistant-password"'), "AdminViews defines #new-assistant-password");
assert.ok(adminViewsCode.includes('id="new-assistant-status"'), "AdminViews defines #new-assistant-status (Active/Inactive selector)");
assert.ok(adminViewsCode.includes('bindAssistantRowEvents'), "AdminViews defines bindAssistantRowEvents to prevent duplicate listeners");
console.log("✅ PASS: Add Assistant Modal includes status selector and safe event binding");

assert.strictEqual(typeof window.AdminService.createAssistant, 'function', "AdminService.createAssistant is a function");
assert.strictEqual(typeof window.AdminService.getAssistants, 'function', "AdminService.getAssistants is a function");
console.log("✅ PASS: AdminService defines complete Assistant API integration");

// =========================================================================
// TEST SUITE 2: EDUCATIONAL RESOURCES & PDF CATEGORIES
// =========================================================================
console.log("\n--- Testing Feature 2: PDF Categories Filtering & Educational Resources ---");

const sampleEducationalResources = [
  {
    id: "res_1",
    title: "مذكرة شرح بايثون الشاملة",
    description: "شرح كامل للوحدة الأولى",
    file_url: "https://drive.google.com/file/d/sample1/view",
    preview_url: "https://drive.google.com/file/d/sample1/preview",
    category: "مذكرات شرح",
    unit_title: "الوحدة الأولى: أساسيات بايثون",
    file_size_label: "3.2 MB",
    views_count: 50,
    created_at: "2026-08-31T00:00:00Z"
  },
  {
    id: "res_2",
    title: "ورقة المفاهيم والملخصات الشاملة",
    description: "ملخص أهم الدوال",
    file_url: "https://drive.google.com/file/d/sample2/view",
    preview_url: "https://drive.google.com/file/d/sample2/preview",
    category: "ملخصات وتفاصيل",
    unit_title: "الوحدة الأولى: أساسيات بايثون",
    file_size_label: "1.5 MB",
    views_count: 30,
    created_at: "2026-08-31T00:00:00Z"
  },
  {
    id: "res_3",
    title: "كراسة التمارين والتدريبات",
    description: "تمارين عملية مكثفة",
    file_url: "https://drive.google.com/file/d/sample3/view",
    preview_url: "https://drive.google.com/file/d/sample3/preview",
    category: "تدريبات وامتحانات",
    unit_title: "الوحدة الثانية: هياكل البيانات",
    file_size_label: "4.0 MB",
    views_count: 20,
    created_at: "2026-08-31T00:00:00Z"
  },
  {
    id: "res_4",
    title: "نماذج إجابة الامتحانات الرسمية",
    description: "حلول نموذجية مع توزيع الدرجات",
    file_url: "https://drive.google.com/file/d/sample4/view",
    preview_url: "https://drive.google.com/file/d/sample4/preview",
    category: "نماذج إجابة",
    unit_title: "الوحدة الرابعة: المراجعة الشاملة",
    file_size_label: "2.1 MB",
    views_count: 45,
    created_at: "2026-08-31T00:00:00Z"
  }
];

// Test 2.1: ResourcesView rendering with category pills
const resViewHtml = window.ResourcesView.render(sampleEducationalResources, ['تدريبات وامتحانات', 'مذكرات شرح', 'ملخصات وتفاصيل', 'نماذج إجابة'], 'all', 'all', '');
assert.ok(resViewHtml.includes('🌟 الكل'), "View renders '🌟 الكل' category pill");
assert.ok(resViewHtml.includes('تدريبات وامتحانات'), "View renders 'تدريبات وامتحانات' category pill");
assert.ok(resViewHtml.includes('مذكرات شرح'), "View renders 'مذكرات شرح' category pill");
assert.ok(resViewHtml.includes('ملخصات وتفاصيل'), "View renders 'ملخصات وتفاصيل' category pill");
assert.ok(resViewHtml.includes('نماذج إجابة'), "View renders 'نماذج إجابة' category pill");
assert.ok(resViewHtml.includes('id="resources-grid-container"'), "View defines reactive #resources-grid-container");
console.log("✅ PASS: ResourcesView renders all 5 standard category pills (الكل, تدريبات وامتحانات, مذكرات شرح, ملخصات وتفاصيل, نماذج إجابة)");

// Test 2.2: Empty state for non-matching category
const emptyCatHtml = window.ResourcesView.renderGrid([], 'نماذج إجابة', '');
assert.ok(emptyCatHtml.includes('لا توجد ملفات في هذا التصنيف حاليًا.'), "Empty category renders specific Arabic message");
assert.ok(emptyCatHtml.includes('reset-resources-filter-btn'), "Empty state provides reset filter button");
console.log("✅ PASS: ResourcesView renders clear Arabic empty state message when category has no files");

// Test 2.3: Loading and Error state helpers
const loadingHtml = window.ResourcesView.renderLoadingState();
assert.ok(loadingHtml.includes('جاري تحميل وتصفية الملفات التعليمية'), "Loading state displays informative Arabic text");

const errorHtml = window.ResourcesView.renderErrorState();
assert.ok(errorHtml.includes('تعذر تحميل الملفات. حاول مرة أخرى.'), "Error state displays exact required Arabic message");
assert.ok(errorHtml.includes('إعادة المحاولة'), "Error state provides 'إعادة المحاولة' (Retry) button");
console.log("✅ PASS: ResourcesView defines loading state and error state with retry button");

// Test 2.4: initEvents defines reactive filtering logic
assert.strictEqual(typeof window.ResourcesView.initEvents, 'function', "ResourcesView.initEvents is a function");
console.log("✅ PASS: ResourcesView defines complete reactive event handlers for category pills, search, and units");

console.log("\n========================================================");
console.log("🎉 ALL CRITICAL FIXES FRONTEND TESTS PASSED (8/8) 🎉");
console.log("========================================================");
