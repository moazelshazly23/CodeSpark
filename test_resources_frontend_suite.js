// Code Spark Educational Resources Frontend Test Suite
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== STARTING EDUCATIONAL RESOURCES FRONTEND TEST SUITE ===");

// 1. Mock Browser Environment
const window = {
  location: { hash: '#landing', origin: 'http://localhost:8000' },
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  UI: {
    showToast: () => {}
  },
  SoundManager: {
    playClick: () => {},
    isEnabled: () => true
  }
};
global.window = window;
global.document = {
  body: {
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    }
  },
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.navigator = { onLine: true };

// 2. Load Core Components & Views
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
loadScript('js/views/assistantViews.js');

// Test 1: ResourceService definition
assert.ok(window.ResourceService, "ResourceService is defined on window");
assert.strictEqual(typeof window.ResourceService.getResources, 'function', "ResourceService.getResources is a function");
assert.strictEqual(typeof window.ResourceService.getAdminResources, 'function', "ResourceService.getAdminResources is a function");
assert.strictEqual(typeof window.ResourceService.createResource, 'function', "ResourceService.createResource is a function");
assert.strictEqual(typeof window.ResourceService.updateResource, 'function', "ResourceService.updateResource is a function");
assert.strictEqual(typeof window.ResourceService.toggleResourceStatus, 'function', "ResourceService.toggleResourceStatus is a function");
assert.strictEqual(typeof window.ResourceService.deleteResource, 'function', "ResourceService.deleteResource is a function");
assert.strictEqual(typeof window.ResourceService.validateUrl, 'function', "ResourceService.validateUrl is a function");
console.log("✅ PASS: ResourceService defines complete API integration layer");

// Test 2: ResourcesView student library view
const sampleResources = [
  {
    id: "res_test_1",
    title: "مذكرة أساسيات بايثون الشاملة",
    description: "شرح وتمارين لغة بايثون",
    file_url: "https://drive.google.com/file/d/sample123/view",
    preview_url: "https://drive.google.com/file/d/sample123/preview",
    download_url: "https://drive.google.com/uc?export=download&id=sample123",
    category: "مذكرات شرح",
    unit_title: "الوحدة الأولى",
    file_size_label: "3.2 MB",
    views_count: 24,
    is_google_drive: true,
    status: "active",
    is_active: 1,
    created_at: "2026-08-31T00:00:00Z"
  }
];

const studentHtml = window.ResourcesView.render(sampleResources, ['مذكرات شرح', 'ملخصات وقوانين'], 'all', 'all', '');
assert.ok(studentHtml.includes("مذكرات وملخصات مادة البرمجة"), "Student view contains main heading");
assert.ok(studentHtml.includes("مذكرة أساسيات بايثون الشاملة"), "Student view renders resource title");
assert.ok(studentHtml.includes("3.2 MB"), "Student view displays file size");
assert.ok(studentHtml.includes("👁️ فتح ومعاينة"), "Student view contains preview button");
assert.ok(studentHtml.includes("Google Drive ↗"), "Student view contains direct Google Drive link");
assert.ok(studentHtml.includes("pdf-viewer-modal"), "Student view defines embedded PDF viewer modal");
assert.ok(studentHtml.includes("pdf-modal-iframe"), "Student view defines iframe for embedded Google Drive preview");
console.log("✅ PASS: ResourcesView renders modern PDF library cards & modal viewer");

// Test 3: Admin Educational Resources Management View
const adminHtml = window.AdminViews.renderResourceRows(sampleResources);
assert.ok(adminHtml.includes("مذكرة أساسيات بايثون الشاملة"), "Admin table rows render resource title");
assert.ok(adminHtml.includes("🟢 نشط"), "Admin table renders active status badge");
assert.ok(adminHtml.includes("edit-resource-btn"), "Admin table renders edit action button");
assert.ok(adminHtml.includes("toggle-resource-btn"), "Admin table renders status toggle action button");
assert.ok(adminHtml.includes("delete-resource-btn"), "Admin table renders delete action button");
console.log("✅ PASS: Admin Views renders complete resources table with CRUD actions");

// Test 4: Check Router Sidebars & Routes
const routerCode = fs.readFileSync(path.join(__dirname, 'js/router.js'), 'utf8');
assert.ok(routerCode.includes("case '#resources':"), "Router defines #resources student route");
assert.ok(routerCode.includes("case '#admin-resources':"), "Router defines #admin-resources admin route");
assert.ok(routerCode.includes("case '#assistant-resources':"), "Router defines #assistant-resources assistant route");
assert.ok(routerCode.includes('href="#resources"'), "Student sidebar includes link to #resources");
assert.ok(routerCode.includes('href="#admin-resources"'), "Admin sidebar includes link to #admin-resources");
assert.ok(routerCode.includes('href="#assistant-resources"'), "Assistant sidebar includes link to #assistant-resources");
console.log("✅ PASS: Router and Sidebars wire up #resources and #admin-resources seamlessly");

// Test 5: Check Lesson View linked resources
const lessonViewCode = fs.readFileSync(path.join(__dirname, 'js/views/lessonView.js'), 'utf8');
assert.ok(lessonViewCode.includes("section-resources"), "Lesson view defines linked educational resources section");
assert.ok(lessonViewCode.includes("مذكرات وملفات مرتبطة بهذا الدرس"), "Lesson view displays header for linked PDFs");
console.log("✅ PASS: Lesson View seamlessly integrates in-lesson linked PDF resources");

// Test 6: Check index.html script tags
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert.ok(indexHtml.includes("js/services/resourceService.js"), "index.html imports resourceService.js");
assert.ok(indexHtml.includes("js/views/resourcesView.js"), "index.html imports resourcesView.js");
console.log("✅ PASS: index.html loads all required resource scripts");

console.log("\n=== ALL EDUCATIONAL RESOURCES FRONTEND TESTS PASSED (6/6) ===");
