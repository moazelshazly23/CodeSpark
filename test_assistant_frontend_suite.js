/**
 * Code Spark - Assistant System & Frontend RBAC Automated Test Suite
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

class MockElement {
  constructor(id = '', tag = 'DIV') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this._classes = new Set();
    this.classList = {
      add: (...cls) => cls.forEach(c => this._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this._classes.delete(c)),
      toggle: (c, val) => {
        if (val === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (val) this._classes.add(c);
        else this._classes.delete(c);
      },
      contains: (c) => this._classes.has(c)
    };
    this.children = [];
    this.attributes = {};
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  addEventListener() {}
  reset() {}
  remove() {}
}

const mockDoc = {
  body: new MockElement('body', 'BODY'),
  getElementById(id) {
    if (id === 'app') return this._app || (this._app = new MockElement('app'));
    return new MockElement(id);
  },
  querySelectorAll() { return []; },
  addEventListener() {}
};

global.window = {
  location: { hash: '#landing' },
  scrollTo: () => {},
  addEventListener: () => {},
  sessionStorage: new MockStorage(),
  localStorage: new MockStorage(),
  UI: {
    showToast: () => {},
    openModal: () => {},
    closeModal: () => {}
  }
};
global.document = mockDoc;
global.navigator = {
  clipboard: { writeText: () => {} },
  onLine: true
};
global.sessionStorage = global.window.sessionStorage;
global.localStorage = global.window.localStorage;

// Load app scripts
require('./js/components/icons.js');
global.Icons = window.Icons;

require('./js/api.js');
require('./js/services/authService.js');
require('./js/services/adminService.js');
require('./js/services/assistantService.js');
require('./js/services/codeExecutor.js');
require('./js/auth.js');
require('./js/views/landingView.js');
require('./js/views/authViews.js');
require('./js/views/adminViews.js');
require('./js/views/assistantViews.js');
require('./js/views/studentDashboardView.js');
require('./js/router.js');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
  }
}

async function itAsync(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
  }
}

async function runTestSuite() {
  console.log('=== STARTING CODE SPARK ASSISTANT & RBAC FRONTEND TEST SUITE ===');

  // 1. Verify Demo Login Buttons are Removed from Login View
  it('Login view does NOT contain any direct demo login buttons or shortcuts', () => {
    const loginHtml = window.AuthViews.renderLogin();
    assert.strictEqual(loginHtml.includes('id="demo-student-btn"'), false, 'demo-student-btn should be completely removed');
    assert.strictEqual(loginHtml.includes('id="demo-admin-btn"'), false, 'demo-admin-btn should be completely removed');
    assert.strictEqual(loginHtml.includes('دخول تجريبي سريع'), false, 'Quick demo access title should be removed');
    assert.strictEqual(loginHtml.includes('Demo Student'), false);
    assert.strictEqual(loginHtml.includes('Demo Login'), false);
  });

  // 2. Verify AssistantViews module exists and defines required rendering methods
  it('AssistantViews defines all required view components', () => {
    assert.ok(window.AssistantViews, 'AssistantViews module is defined');
    assert.strictEqual(typeof window.AssistantViews.renderDashboard, 'function');
    assert.strictEqual(typeof window.AssistantViews.renderCodeGenerator, 'function');
    assert.strictEqual(typeof window.AssistantViews.renderStudentQuestions, 'function');
    assert.strictEqual(typeof window.AssistantViews.renderExams, 'function');
    assert.strictEqual(typeof window.AssistantViews.renderQuestionBank, 'function');
    assert.strictEqual(typeof window.AssistantViews.renderStudents, 'function');
    assert.strictEqual(typeof window.AssistantViews.renderGrades, 'function');
    assert.strictEqual(typeof window.AssistantViews.initEvents, 'function');
  });

  // 3. Verify Assistant Service defines methods
  it('AssistantService defines complete API integration layer', () => {
    assert.ok(window.AssistantService, 'AssistantService is defined');
    assert.strictEqual(typeof window.AssistantService.generateCode, 'function');
    assert.strictEqual(typeof window.AssistantService.runCode, 'function');
    assert.strictEqual(typeof window.AssistantService.getStudentQuestions, 'function');
    assert.strictEqual(typeof window.AssistantService.replyToStudentQuestion, 'function');
    assert.strictEqual(typeof window.AssistantService.getExams, 'function');
    assert.strictEqual(typeof window.AssistantService.createExam, 'function');
    assert.strictEqual(typeof window.AssistantService.getQuestions, 'function');
    assert.strictEqual(typeof window.AssistantService.createQuestion, 'function');
    assert.strictEqual(typeof window.AssistantService.getStudents, 'function');
    assert.strictEqual(typeof window.AssistantService.getGrades, 'function');
  });

  // 4. Test Assistant Dashboard Rendering
  await itAsync('Assistant Dashboard renders stats and quick action shortcuts', async () => {
    const mockAssistant = { id: 'assistant_demo', name: 'Assistant Demo', role: 'ASSISTANT', avatar: 'مس' };
    const html = await window.AssistantViews.renderDashboard(mockAssistant);
    assert.ok(html.includes('مرحبًا بك، Assistant Demo'), 'Dashboard displays assistant name');
    assert.ok(html.includes('توليد واختبار الأكواد'), 'Dashboard contains Code Generator card');
    assert.ok(html.includes('أسئلة واستفسارات الطلاب'), 'Dashboard contains Student Questions card');
    assert.ok(html.includes('إدارة نماذج الامتحانات'), 'Dashboard contains Exams card');
    assert.ok(html.includes('بنك الأسئلة الشامل'), 'Dashboard contains Question Bank card');
    assert.ok(html.includes('متابعة الطلاب والتقدم'), 'Dashboard contains Students card');
    assert.ok(html.includes('نتائج ودرجات الامتحانات'), 'Dashboard contains Grades card');
  });

  // 5. Test Code Generator View Rendering
  await itAsync('Code Generator view renders topic selector, IDE editor, and terminal output', async () => {
    const mockAssistant = { id: 'assistant_demo', name: 'Assistant Demo', role: 'ASSISTANT' };
    const html = await window.AssistantViews.renderCodeGenerator(mockAssistant);
    assert.ok(html.includes('id="gen-topic"'), 'Contains topic select dropdown');
    assert.ok(html.includes('id="gen-level"'), 'Contains level select dropdown');
    assert.ok(html.includes('id="trigger-gen-btn"'), 'Contains trigger generation button');
    assert.ok(html.includes('id="gen-code-editor"'), 'Contains code editor textarea');
    assert.ok(html.includes('id="run-code-btn"'), 'Contains run code button');
    assert.ok(html.includes('id="gen-terminal-output"'), 'Contains terminal output display');
  });

  // 6. Test Admin Assistants Management View
  await itAsync('Admin Views renders Assistants management section for Super Admin', async () => {
    const html = await window.AdminViews.renderAssistants();
    assert.ok(html.includes('إدارة حسابات المساعدين (Assistants)'), 'Contains header title');
    assert.ok(html.includes('id="add-assistant-btn"'), 'Contains add assistant button');
    assert.ok(html.includes('id="assistants-table-body"'), 'Contains assistants table');
    assert.ok(html.includes('id="add-assistant-modal"'), 'Contains add assistant modal');
    assert.ok(html.includes('id="edit-assistant-modal"'), 'Contains edit assistant modal');
    assert.ok(html.includes('id="reset-assistant-pw-modal"'), 'Contains reset password modal');
  });

  // 7. Test Admin Activity Logs View
  await itAsync('Admin Views renders Activity Logs section for Super Admin', async () => {
    const html = await window.AdminViews.renderActivityLogs();
    assert.ok(html.includes('سجل نشاطات وعمليات المنصة'), 'Contains activity log title');
    assert.ok(html.includes('id="log-search-input"'), 'Contains log search input');
    assert.ok(html.includes('id="log-action-filter"'), 'Contains log action filter');
    assert.ok(html.includes('id="activity-logs-table-body"'), 'Contains activity logs table');
  });

  // 8. Test Auth Role Detection
  it('CodeSparkAuth detects isSuperAdmin, isAssistant, isStaff, and isStudent accurately', () => {
    window.CodeSparkAPI.setStoredUser({ id: '1', name: 'معاذ', role: 'SUPER_ADMIN' }, true);
    assert.strictEqual(window.CodeSparkAuth.isSuperAdmin(), true);
    assert.strictEqual(window.CodeSparkAuth.isAssistant(), false);
    assert.strictEqual(window.CodeSparkAuth.isStaff(), true);

    window.CodeSparkAPI.setStoredUser({ id: '2', name: 'مساعد', role: 'ASSISTANT' }, true);
    assert.strictEqual(window.CodeSparkAuth.isSuperAdmin(), false);
    assert.strictEqual(window.CodeSparkAuth.isAssistant(), true);
    assert.strictEqual(window.CodeSparkAuth.isStaff(), true);

    window.CodeSparkAPI.setStoredUser({ id: '3', name: 'أحمد', role: 'STUDENT' }, true);
    assert.strictEqual(window.CodeSparkAuth.isSuperAdmin(), false);
    assert.strictEqual(window.CodeSparkAuth.isAssistant(), false);
    assert.strictEqual(window.CodeSparkAuth.isStaff(), false);
    assert.strictEqual(window.CodeSparkAuth.isStudent(), true);
  });

  // 9. Test Router Assistant Layout
  await itAsync('Router renders Assistant Sidebar and Topbar on #assistant-dashboard', async () => {
    const mockAssistant = { id: 'assistant_demo', name: 'Assistant Demo', role: 'ASSISTANT', avatar: 'مس' };
    window.CodeSparkAPI.setStoredUser(mockAssistant, true);
    
    const appRoot = document.getElementById('app');
    await window.CodeSparkRouter.renderAssistantLayout('#assistant-dashboard', null, mockAssistant, appRoot);
    
    assert.ok(appRoot.innerHTML.includes('ASSISTANT'), 'Assistant sidebar badge rendered');
    assert.ok(appRoot.innerHTML.includes('#assistant-dashboard'), 'Sidebar contains dashboard link');
    assert.ok(appRoot.innerHTML.includes('#assistant-code'), 'Sidebar contains code generator link');
    assert.ok(appRoot.innerHTML.includes('#assistant-questions'), 'Sidebar contains questions link');
    assert.ok(appRoot.innerHTML.includes('#assistant-exams'), 'Sidebar contains exams link');
    assert.ok(appRoot.innerHTML.includes('#assistant-bank'), 'Sidebar contains question bank link');
    assert.ok(appRoot.innerHTML.includes('#assistant-students'), 'Sidebar contains students link');
    assert.ok(appRoot.innerHTML.includes('#assistant-grades'), 'Sidebar contains grades link');
    assert.strictEqual(appRoot.innerHTML.includes('#admin-settings'), false, 'Assistant sidebar does NOT contain settings');
    assert.strictEqual(appRoot.innerHTML.includes('#admin-assistants'), false, 'Assistant sidebar does NOT contain assistants management');
  });

  console.log(`\n=== ALL ASSISTANT & RBAC FRONTEND TESTS PASSED (${passedTests}/${totalTests}) ===`);
}

runTestSuite().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
