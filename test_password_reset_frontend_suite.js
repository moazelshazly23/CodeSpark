/**
 * CodeSpark Frontend Password Reset & OTP UI/UX Test Suite
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock Browser Environment
global.window = global;
global.window.addEventListener = () => {};
global.document = {
  getElementById: (id) => {
    return {
      id,
      value: '',
      innerHTML: '',
      textContent: '',
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
      },
      addEventListener: () => {},
      focus: () => {},
      dispatchEvent: () => {},
      querySelector: () => ({ textContent: '', classList: { toggle: () => {} } }),
      querySelectorAll: () => []
    };
  },
  querySelectorAll: (selector) => [],
  addEventListener: () => {},
  body: {
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    appendChild: () => {}
  }
};
global.sessionStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};

// Load Frontend Scripts
eval(fs.readFileSync(path.join(__dirname, 'js/components/icons.js'), 'utf-8'));
eval(fs.readFileSync(path.join(__dirname, 'js/sound.js'), 'utf-8'));
eval(fs.readFileSync(path.join(__dirname, 'js/api.js'), 'utf-8'));
eval(fs.readFileSync(path.join(__dirname, 'js/services/authService.js'), 'utf-8'));
eval(fs.readFileSync(path.join(__dirname, 'js/auth.js'), 'utf-8'));
eval(fs.readFileSync(path.join(__dirname, 'js/views/authViews.js'), 'utf-8'));

console.log('=== STARTING PASSWORD RESET FRONTEND TEST SUITE ===');

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`, err);
    process.exit(1);
  }
}

// 1. Login View Link Check
test('Login view contains "نسيت كلمة المرور؟" link pointing to #forgot-password', () => {
  const html = window.AuthViews.renderLogin();
  assert(html.includes('href="#forgot-password"'), 'Link to #forgot-password missing');
  assert(html.includes('نسيت كلمة المرور؟'), 'Arabic text "نسيت كلمة المرور؟" missing');
});

// 2. Forgot Password View Check
test('Forgot Password view renders properly with Arabic text and email input', () => {
  const html = window.AuthViews.renderForgotPassword();
  assert(html.includes('نسيت كلمة المرور؟'), 'Title missing');
  assert(html.includes('أدخل البريد الإلكتروني المرتبط بحسابك'), 'Subtitle text missing');
  assert(html.includes('id="forgot-email"'), 'Email input field missing');
  assert(html.includes('id="forgot-submit-btn"'), 'Submit button missing');
  assert(html.includes('إرسال رمز التحقق'), 'Submit button text missing');
  assert(html.includes('href="#login"'), 'Back to login link missing');
});

// 3. Verify OTP View Check
test('Verify OTP view renders 6 digit input boxes and countdown timer', () => {
  const html = window.AuthViews.renderVerifyOtp('student@example.com');
  assert(html.includes('أدخل رمز التحقق'), 'Title missing');
  assert(html.includes('otp-inputs-container'), 'OTP inputs container missing');
  assert(html.includes('id="otp-1"'), 'OTP input 1 missing');
  assert(html.includes('id="otp-2"'), 'OTP input 2 missing');
  assert(html.includes('id="otp-3"'), 'OTP input 3 missing');
  assert(html.includes('id="otp-4"'), 'OTP input 4 missing');
  assert(html.includes('id="otp-5"'), 'OTP input 5 missing');
  assert(html.includes('id="otp-6"'), 'OTP input 6 missing');
  assert(html.includes('countdown-timer'), 'Countdown timer missing');
  assert(html.includes('resend-otp-btn'), 'Resend OTP button missing');
  assert(html.includes('verify-submit-btn'), 'Verify submit button missing');
  assert(html.includes('s***t@example.com'), 'Masked email missing');
});

// 4. Reset Password View Check
test('Reset Password view renders password fields and strength meter', () => {
  const html = window.AuthViews.renderResetPassword('rst_test_token_123');
  assert(html.includes('إنشاء كلمة مرور جديدة'), 'Title missing');
  assert(html.includes('id="new-password"'), 'New password input missing');
  assert(html.includes('id="confirm-password"'), 'Confirm password input missing');
  assert(html.includes('password-strength-container'), 'Password strength meter missing');
  assert(html.includes('id="strength-bar-fill"'), 'Strength fill bar missing');
  assert(html.includes('id="req-len"'), 'Length requirement checklist missing');
  assert(html.includes('id="req-case"'), 'Case requirement checklist missing');
  assert(html.includes('id="req-num"'), 'Number requirement checklist missing');
  assert(html.includes('id="req-sym"'), 'Symbol requirement checklist missing');
  assert(html.includes('id="toggle-new-pass"'), 'Show/hide new password button missing');
  assert(html.includes('id="toggle-confirm-pass"'), 'Show/hide confirm password button missing');
  assert(html.includes('id="reset-submit-btn"'), 'Reset submit button missing');
  assert(html.includes('تغيير كلمة المرور'), 'Reset button text missing');
});

// 5. Success View Check
test('Success view renders confirmation message and login button', () => {
  const html = window.AuthViews.renderResetPasswordSuccess();
  assert(html.includes('تم تغيير كلمة المرور بنجاح! 🎉'), 'Success title missing');
  assert(html.includes('href="#login"'), 'Login button link missing');
  assert(html.includes('تسجيل الدخول'), 'Login button text missing');
});

// 6. Reset Flow State Storage
test('CodeSparkAuth manages session reset flow state safely', () => {
  window.CodeSparkAuth.clearResetState();
  assert.strictEqual(window.CodeSparkAuth.getResetState(), null);

  window.CodeSparkAuth.setResetState({ email: 'user@test.com', sentAt: 12345 });
  const state1 = window.CodeSparkAuth.getResetState();
  assert.strictEqual(state1.email, 'user@test.com');
  assert.strictEqual(state1.sentAt, 12345);

  window.CodeSparkAuth.setResetState({ resetToken: 'rst_abc123' });
  const state2 = window.CodeSparkAuth.getResetState();
  assert.strictEqual(state2.email, 'user@test.com');
  assert.strictEqual(state2.resetToken, 'rst_abc123');

  window.CodeSparkAuth.clearResetState();
  assert.strictEqual(window.CodeSparkAuth.getResetState(), null);
});

// 7. AuthService API Interface
test('AuthService defines forgotPassword, verifyOtp, resendOtp, and resetPassword methods', () => {
  assert(typeof window.AuthService.forgotPassword === 'function');
  assert(typeof window.AuthService.verifyOtp === 'function');
  assert(typeof window.AuthService.resendOtp === 'function');
  assert(typeof window.AuthService.resetPassword === 'function');
});

console.log(`\n=== ALL PASSWORD RESET FRONTEND TESTS PASSED (${passCount}/7) ===`);
