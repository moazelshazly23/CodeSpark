// Code Spark Authentication Views (Login, Register, Forgot Password, Verify OTP, Reset Password)
(function() {
  function maskEmail(email) {
    if (!email || !email.includes('@')) return email || '';
    const parts = email.split('@');
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
      return name[0] + '***@' + domain;
    }
    return name[0] + '***' + name[name.length - 1] + '@' + domain;
  }

  function calculatePasswordStrength(pass) {
    let score = 0;
    const checks = {
      length: pass.length >= 8,
      lower: /[a-z]/.test(pass),
      upper: /[A-Z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[^A-Za-z0-9]/.test(pass)
    };

    if (pass.length >= 6) score += 20;
    if (checks.length) score += 20;
    if (checks.lower && checks.upper) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;

    let label = 'ضعيفة جداً';
    let color = 'var(--danger)';

    if (score >= 80) {
      label = 'قوية جداً 🛡️';
      color = 'var(--cyan-glow)';
    } else if (score >= 60) {
      label = 'قوية ✅';
      color = 'var(--success)';
    } else if (score >= 40) {
      label = 'متوسطة ⚠️';
      color = 'var(--warning)';
    } else if (score >= 20) {
      label = 'ضعيفة ❌';
      color = 'var(--danger)';
    }

    return { score, label, color, checks };
  }

  window.AuthViews = {
    renderLogin() {
      return `
        <div class="public-layout" style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:2rem 1rem;">
          <div style="max-width:1050px; width:100%; display:grid; grid-template-columns: 1fr 1fr; background:var(--bg-surface); border:1px solid var(--border-card); border-radius:var(--radius-xl); overflow:hidden; box-shadow:var(--shadow-lg);" class="auth-split-container">
            
            <!-- Right: Login Form -->
            <div style="padding: 3rem 2.5rem; display:flex; flex-direction:column; justify-content:center;">
              <div style="margin-bottom:2rem;">
                <a href="#landing" style="display:inline-block; margin-bottom:1.5rem;">
                  <img src="assets/logos/logo-dark.svg" alt="Code Spark" style="height:34px;">
                </a>
                <h2 style="font-size:1.75rem; font-weight:800; margin-bottom:0.5rem;">تسجيل الدخول</h2>
                <p style="color:var(--text-muted); font-size:0.9375rem;">أهلاً بك مجددًا في منصة مذاكرة مادة البرمجة</p>
              </div>

              <div id="login-error" class="badge badge-danger" style="display:none; padding:0.75rem 1rem; border-radius:var(--radius-md); margin-bottom:1.25rem; font-size:0.875rem;"></div>

              <form id="login-form">
                <div class="form-group">
                  <label class="form-label" for="login-identifier">رقم الهاتف أو البريد الإلكتروني</label>
                  <input type="text" id="login-identifier" class="form-input" placeholder="010XXXXXXXX أو example@email.com" required >
                </div>

                <div class="form-group">
                  <div class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
                    <label for="login-password">كلمة المرور</label>
                    <a href="#forgot-password" class="auth-link-forgot" style="font-size:0.8125rem; color:var(--cyan); font-weight:700; text-decoration:none; transition:color 0.2s ease;">نسيت كلمة المرور؟</a>
                  </div>
                  <div class="input-with-icon">
                    <input type="password" id="login-password" class="form-input" placeholder="••••••••" required >
                    <button type="button" id="toggle-password" class="input-icon-btn" style="background:none; border:none; cursor:pointer;" aria-label="تبديل إظهار كلمة المرور">
                      ${Icons.eye('w-5 h-5')}
                    </button>
                  </div>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem;">
                  <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; color:var(--text-muted); cursor:pointer;">
                    <input type="checkbox" id="remember-me" checked style="accent-color:var(--cyan);">
                    تذكرني على هذا الجهاز
                  </label>
                </div>

                <button type="submit" id="login-submit-btn" class="btn btn-primary btn-glow" style="width:100%; padding:0.875rem;">
                  تسجيل الدخول ⚡
                </button>
              </form>



              <div style="margin-top:1.5rem; text-align:center; font-size:0.875rem; color:var(--text-muted);">
                ليس لديك حساب؟ <a href="#register" style="color:var(--cyan); font-weight:700;">إنشاء حساب جديد</a>
              </div>
            </div>

            <!-- Left: Visual Promo Card -->
            <div style="background:linear-gradient(135deg, #0F172A 0%, #152238 100%); border-right:1px solid var(--border-card); padding:3rem 2.5rem; display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden;" class="hide-on-mobile">
              <div style="position:absolute; top:-50px; left:-50px; width:250px; height:250px; background:radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%); filter:blur(30px);"></div>
              
              <div>
                <div class="badge badge-cyan" style="margin-bottom:1rem;">منصة المنهج الدراسي</div>
                <h3 style="font-size:1.75rem; font-weight:800; line-height:1.3; margin-bottom:1rem;">
                  مذاكرة البرمجة للمرحلة الثانوية أصبحت أسهل وأوضح
                </h3>
                <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.7;">
                  تابع دروس المنهج، اختبر فهمك بالأسئلة والتطبيقات المباشرة، وحقق الدرجة النهائية في امتحانات الثانوية.
                </p>
              </div>

              <div class="card card-glass" style="margin:2rem 0; padding:1.25rem; border-color:var(--border-glow);">
                <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                  <div class="stat-icon-wrapper stat-icon-green" style="width:36px; height:36px; font-size:1.1rem;">
                    ${Icons.check()}
                  </div>
                  <div>
                    <div style="font-weight:700; font-size:0.875rem;">تدريبات عملية بعد كل درس</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">أكثر من 100 تدريب وتطبيق</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:0.75rem;">
                  <div class="stat-icon-wrapper stat-icon-cyan" style="width:36px; height:36px; font-size:1.1rem;">
                    ${Icons.award()}
                  </div>
                  <div>
                    <div style="font-weight:700; font-size:0.875rem;">تقييم فوري وتصحيح تفصيلي</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">معرفة الإجابات النموذجية</div>
                  </div>
                </div>
              </div>

              <div style="font-size:0.8125rem; color:var(--text-subtle); display:flex; justify-content:space-between;">
                <span>Code Spark Education</span>
                <span>الصف الأول والثاني الثانوي</span>
              </div>
            </div>

          </div>
        </div>
      `;
    },

    initLoginEvents() {
      const form = document.getElementById('login-form');
      const errBox = document.getElementById('login-error');
      const toggleBtn = document.getElementById('toggle-password');
      const passInput = document.getElementById('login-password');
      const submitBtn = document.getElementById('login-submit-btn');

      if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', () => {
          if (window.SoundManager) window.SoundManager.playClick('default');
          const isPass = passInput.type === 'password';
          passInput.type = isPass ? 'text' : 'password';
          toggleBtn.innerHTML = isPass ? Icons.eyeOff('w-5 h-5') : Icons.eye('w-5 h-5');
        });
      }

      // 1-Click Demo Logins
      const demoStudentBtn = document.getElementById('demo-student-btn');
      demoStudentBtn?.addEventListener('click', async () => {
        if (window.SoundManager) window.SoundManager.playClick('default');
        if (demoStudentBtn) {
          demoStudentBtn.disabled = true;
          demoStudentBtn.innerText = 'جاري الدخول... ⏳';
        }
        if (errBox) errBox.style.display = 'none';

        try {
          const res = await window.CodeSparkAuth.quickDemoLogin('student');
          if (demoStudentBtn) {
            demoStudentBtn.disabled = false;
            demoStudentBtn.innerText = '👨🎓 حساب طالب (أحمد)';
          }
          if (res.success) {
            if (window.SoundManager) window.SoundManager.playClick('success');
            if (window.UI && window.UI.showToast) {
              window.UI.showToast(`أهلاً بك يا ${res.user.name}`, 'success');
            }
            window.location.hash = '#dashboard';
          } else {
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = res.message || 'فشل تسجيل الدخول التجريبي';
            }
          }
        } catch (err) {
          if (demoStudentBtn) {
            demoStudentBtn.disabled = false;
            demoStudentBtn.innerText = '👨🎓 حساب طالب (أحمد)';
          }
          if (errBox) {
            errBox.style.display = 'block';
            errBox.textContent = err.message || 'حدث خطأ أثناء تسجيل الدخول التجريبي';
          }
        }
      });

      const demoAdminBtn = document.getElementById('demo-admin-btn');
      demoAdminBtn?.addEventListener('click', async () => {
        if (window.SoundManager) window.SoundManager.playClick('default');
        if (demoAdminBtn) {
          demoAdminBtn.disabled = true;
          demoAdminBtn.innerText = 'جاري الدخول... ⏳';
        }
        if (errBox) errBox.style.display = 'none';

        try {
          const res = await window.CodeSparkAuth.quickDemoLogin('admin');
          if (demoAdminBtn) {
            demoAdminBtn.disabled = false;
            demoAdminBtn.innerText = '🛡️ لوحة المشرف (Admin)';
          }
          if (res.success) {
            if (window.SoundManager) window.SoundManager.playClick('success');
            if (window.UI && window.UI.showToast) {
              window.UI.showToast(`أهلاً بك يا ${res.user.name} في لوحة المشرف`, 'success');
            }
            window.location.hash = '#admin-dashboard';
          } else {
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = res.message || 'فشل تسجيل الدخول التجريبي';
            }
          }
        } catch (err) {
          if (demoAdminBtn) {
            demoAdminBtn.disabled = false;
            demoAdminBtn.innerText = '🛡️ لوحة المشرف (Admin)';
          }
          if (errBox) {
            errBox.style.display = 'block';
            errBox.textContent = err.message || 'حدث خطأ أثناء تسجيل الدخول التجريبي';
          }
        }
      });

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (window.SoundManager) window.SoundManager.playClick('default');
          if (errBox) errBox.style.display = 'none';
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'جاري التحقق من البيانات... ⏳';
          }

          const identifier = document.getElementById('login-identifier')?.value || '';
          const password = document.getElementById('login-password')?.value || '';
          const remember = document.getElementById('remember-me')?.checked ?? true;

          try {
            const res = await window.CodeSparkAuth.login(identifier, password, remember);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'تسجيل الدخول ⚡';
            }

            if (res.success) {
              if (window.SoundManager) window.SoundManager.playClick('success');
              if (window.UI && window.UI.showToast) {
                window.UI.showToast(`تم تسجيل الدخول بنجاح. أهلاً بك يا ${res.user.name}`, 'success');
              }
              const role = (res.user && res.user.role ? res.user.role.toUpperCase() : 'STUDENT');
              if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
                window.location.hash = '#admin-dashboard';
              } else if (role === 'ASSISTANT') {
                window.location.hash = '#assistant-dashboard';
              } else {
                window.location.hash = '#dashboard';
              }
            } else {
              if (errBox) {
                errBox.style.display = 'block';
                errBox.textContent = res.message || 'بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى.';
              }
            }
          } catch (err) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'تسجيل الدخول ⚡';
            }
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = err.message || 'حدث خطأ أثناء معالجة الطلب، يرجى المحاولة لاحقاً.';
            }
          }
        });
      }
    },

    renderRegister() {
      return `
        <div class="public-layout" style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:2rem 1rem;">
          <div style="max-width:850px; width:100%; background:var(--bg-surface); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:2.5rem; box-shadow:var(--shadow-lg);">
            
            <div style="text-align:center; margin-bottom:2rem;">
              <a href="#landing" style="display:inline-block; margin-bottom:1rem;">
                <img src="assets/logos/logo-dark.svg" alt="Code Spark" style="height:36px;">
              </a>
              <h2 style="font-size:1.75rem; font-weight:800; margin-bottom:0.5rem;">إنشاء حساب طالب جديد</h2>
              <p style="color:var(--text-muted); font-size:0.9375rem;">سجل بياناتك للبدء في مذاكرة مادة البرمجة وحل الاختبارات</p>
            </div>

            <div id="register-error" class="badge badge-danger" style="display:none; padding:0.75rem 1rem; border-radius:var(--radius-md); margin-bottom:1.5rem; font-size:0.875rem; width:100%;"></div>

            <form id="register-form">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.25rem;" class="form-grid">
                
                <!-- Full Name -->
                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label" for="reg-name">الاسم الكامل للطالب (ثلاثي على الأقل)</label>
                  <input type="text" id="reg-name" class="form-input" placeholder="مثال: أحمد محمد الشناوي" required>
                </div>

                <!-- Student Phone -->
                <div class="form-group">
                  <label class="form-label" for="reg-phone">رقم هاتف الطالب (واتساب)</label>
                  <input type="tel" id="reg-phone" class="form-input" placeholder="010XXXXXXXX" required>
                  <span style="font-size:0.75rem; color:var(--text-subtle);">يُستخدم لتسجيل الدخول والتواصل</span>
                </div>

                <!-- Parent Phone -->
                <div class="form-group">
                  <label class="form-label" for="reg-parent-phone">رقم هاتف ولي الأمر</label>
                  <input type="tel" id="reg-parent-phone" class="form-input" placeholder="011XXXXXXXX" required>
                  <span style="font-size:0.75rem; color:var(--text-subtle);">لمتابعة التقارير الشهرية والدرجات</span>
                </div>

                <!-- Academic Grade -->
                <div class="form-group">
                  <label class="form-label" for="reg-grade">الصف الدراسي</label>
                  <select id="reg-grade" class="form-select" required>
                    <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                    <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                    <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                  </select>
                </div>

                <!-- Optional Email -->
                <div class="form-group">
                  <label class="form-label" for="reg-email">البريد الإلكتروني <span class="optional">(اختياري)</span></label>
                  <input type="email" id="reg-email" class="form-input" placeholder="student@example.com">
                </div>

                <!-- Activation Code (Required) -->
                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label" for="reg-code">كود تفعيل الاشتراك <span style="color:var(--danger); font-weight:bold;">*</span></label>
                  <div style="position:relative;">
                    <input type="text" id="reg-code" class="form-input" placeholder="CS-8F4K-29XM" required style="letter-spacing:0.08em; font-weight:700; text-transform:uppercase;">
                    <div id="code-validation-status" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:0.875rem;"></div>
                  </div>
                  <div id="code-hint-msg" style="font-size:0.8125rem; margin-top:0.35rem; color:var(--text-subtle);">
                    كود تفعيل الاشتراك مطلوب لإنشاء الحساب (مثال: CS-8F4K-29XM أو SPARK-2026)
                  </div>
                </div>

                <!-- Password -->
                <div class="form-group">
                  <label class="form-label" for="reg-password">كلمة المرور</label>
                  <input type="password" id="reg-password" class="form-input" placeholder="6 أحرف على الأقل" required minlength="6">
                </div>

                <!-- Confirm Password -->
                <div class="form-group">
                  <label class="form-label" for="reg-confirm-password">تأكيد كلمة المرور</label>
                  <input type="password" id="reg-confirm-password" class="form-input" placeholder="أعد كتابة كلمة المرور" required minlength="6">
                </div>

              </div>

              <div style="margin-top:1.5rem;">
                <button type="submit" id="reg-submit-btn" class="btn btn-primary btn-lg btn-glow" style="width:100%;">
                  إنشاء الحساب وبدء التعلم ⚡
                </button>
              </div>

              <div style="margin-top:1.5rem; text-align:center; font-size:0.875rem; color:var(--text-muted);">
                لديك حساب بالفعل؟ <a href="#login" style="color:var(--cyan); font-weight:700;">تسجيل الدخول</a>
              </div>
            </form>

          </div>
        </div>
      `;
    },

    initRegisterEvents() {
      const form = document.getElementById('register-form');
      const errBox = document.getElementById('register-error');
      const submitBtn = document.getElementById('reg-submit-btn');
      const codeInput = document.getElementById('reg-code');
      const statusIndicator = document.getElementById('code-validation-status');
      const hintMsg = document.getElementById('code-hint-msg');

      if (codeInput) {
        let debounceTimer;
        const checkCode = async () => {
          const val = (codeInput.value || '').trim().toUpperCase();
          if (!val) {
            if (statusIndicator) statusIndicator.innerHTML = '';
            if (hintMsg) {
              hintMsg.style.color = 'var(--text-subtle)';
              hintMsg.textContent = 'كود تفعيل الاشتراك مطلوب لإنشاء الحساب (مثال: CS-8F4K-29XM)';
            }
            return;
          }
          try {
            if (window.AuthService && window.AuthService.verifySubscriptionCode) {
              const res = await window.AuthService.verifySubscriptionCode(val);
              if (res.valid) {
                if (statusIndicator) statusIndicator.innerHTML = '<span style="color:var(--success); font-size:1.1rem;">✓</span>';
                if (hintMsg) {
                  hintMsg.style.color = 'var(--success)';
                  hintMsg.textContent = `✓ ${res.message || 'كود اشتراك صالح ومتاح للتفعيل'}`;
                }
              } else {
                if (statusIndicator) statusIndicator.innerHTML = '<span style="color:var(--danger); font-size:1.1rem;">✕</span>';
                if (hintMsg) {
                  hintMsg.style.color = 'var(--danger)';
                  hintMsg.textContent = `✕ ${res.message || 'كود الاشتراك غير صالح'}`;
                }
              }
            }
          } catch (e) {
            if (statusIndicator) statusIndicator.innerHTML = '<span style="color:var(--danger); font-size:1.1rem;">✕</span>';
            if (hintMsg) {
              hintMsg.style.color = 'var(--danger)';
              hintMsg.textContent = `✕ ${e.message || 'كود الاشتراك غير صحيح'}`;
            }
          }
        };

        codeInput.addEventListener('input', () => {
          codeInput.value = codeInput.value.toUpperCase();
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(checkCode, 500);
        });
        codeInput.addEventListener('blur', checkCode);
      }

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (window.SoundManager) window.SoundManager.playClick('default');
          if (errBox) errBox.style.display = 'none';
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'جاري إنشاء الحساب وتفعيله... ⏳';
          }

          const userData = {
            name: document.getElementById('reg-name')?.value || '',
            phone: document.getElementById('reg-phone')?.value || '',
            parentPhone: document.getElementById('reg-parent-phone')?.value || '',
            grade: document.getElementById('reg-grade')?.value || '',
            email: document.getElementById('reg-email')?.value || '',
            subscriptionCode: document.getElementById('reg-code')?.value || '',
            password: document.getElementById('reg-password')?.value || '',
            confirmPassword: document.getElementById('reg-confirm-password')?.value || ''
          };

          try {
            const res = await window.CodeSparkAuth.register(userData);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'إنشاء الحساب وبدء التعلم ⚡';
            }

            if (res.success) {
              if (window.SoundManager) window.SoundManager.playClick('success');
              if (window.UI && window.UI.showToast) {
                window.UI.showToast(`تم إنشاء الحساب بنجاح! مرحبًا بك يا ${res.user.name}`, 'success');
              }
              window.location.hash = '#dashboard';
            } else {
              if (errBox) {
                errBox.style.display = 'block';
                errBox.textContent = res.message || 'فشل إنشاء الحساب، يرجى مراجعة البيانات المدخلة.';
                errBox.scrollIntoView({ behavior: 'smooth' });
              }
            }
          } catch (err) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'إنشاء الحساب وبدء التعلم ⚡';
            }
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = err.message || 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مجددًا.';
              errBox.scrollIntoView({ behavior: 'smooth' });
            }
          }
        });
      }
    },

    // 1. Forgot Password Page View
    renderForgotPassword() {
      return `
        <div class="public-layout" style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:2rem 1rem;">
          <div style="max-width:480px; width:100%; background:var(--bg-surface); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:2.5rem; box-shadow:var(--shadow-lg); position:relative; overflow:hidden;" class="card-glass">
            
            <div style="position:absolute; top:-40px; right:-40px; width:180px; height:180px; background:radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%); filter:blur(25px); pointer-events:none;"></div>

            <div style="text-align:center; margin-bottom:2rem; position:relative;">
              <a href="#landing" style="display:inline-block; margin-bottom:1.25rem;">
                <img src="assets/logos/logo-dark.svg" alt="Code Spark" style="height:36px;">
              </a>
              <div class="badge badge-cyan" style="margin-bottom:0.75rem;">استعادة الحساب</div>
              <h2 style="font-size:1.65rem; font-weight:800; margin-bottom:0.5rem; color:var(--text-main);">نسيت كلمة المرور؟</h2>
              <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.6;">
                أدخل البريد الإلكتروني المرتبط بحسابك وسنرسل لك رمز تحقق لإعادة تعيين كلمة المرور.
              </p>
            </div>

            <div id="forgot-error" class="badge badge-danger" style="display:none; padding:0.75rem 1rem; border-radius:var(--radius-md); margin-bottom:1.25rem; font-size:0.875rem; width:100%; text-align:right;"></div>

            <form id="forgot-form">
              <div class="form-group" style="margin-bottom:1.5rem;">
                <label class="form-label" for="forgot-email">البريد الإلكتروني</label>
                <div class="input-with-icon">
                  <input type="email" id="forgot-email" class="form-input" placeholder="student@example.com" required autocomplete="email" autofocus dir="ltr" style="text-align:right;">
                  <span class="input-icon-btn" style="pointer-events:none; color:var(--text-subtle);">
                    ${Icons.mail('w-5 h-5')}
                  </span>
                </div>
                <span style="font-size:0.75rem; color:var(--text-subtle); margin-top:0.35rem; display:block;">
                  سنرسل رمز تحقق مكون من 6 أرقام إلى هذا البريد
                </span>
              </div>

              <button type="submit" id="forgot-submit-btn" class="btn btn-primary btn-glow btn-lg" style="width:100%; padding:0.875rem;">
                إرسال رمز التحقق ⚡
              </button>

              <div style="margin-top:1.75rem; text-align:center; font-size:0.875rem; border-top:1px solid var(--border-subtle); padding-top:1.25rem;">
                <a href="#login" style="color:var(--text-muted); text-decoration:none; display:inline-flex; align-items:center; gap:0.4rem; transition:color 0.2s ease;">
                  ${Icons.arrowRight('w-4 h-4')} العودة إلى تسجيل الدخول
                </a>
              </div>
            </form>

          </div>
        </div>
      `;
    },

    initForgotEvents() {
      const form = document.getElementById('forgot-form');
      const emailInput = document.getElementById('forgot-email');
      const errBox = document.getElementById('forgot-error');
      const submitBtn = document.getElementById('forgot-submit-btn');

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (window.SoundManager) window.SoundManager.playClick('default');
          if (errBox) errBox.style.display = 'none';

          const email = (emailInput?.value || '').trim();
          if (!email) {
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = 'يرجى إدخال البريد الإلكتروني';
            }
            return;
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'جاري إرسال رمز التحقق... ⏳';
          }

          try {
            const res = await window.CodeSparkAuth.forgotPassword(email);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'إرسال رمز التحقق ⚡';
            }

            if (res.success) {
              if (window.SoundManager) window.SoundManager.playClick('success');
              if (window.UI && window.UI.showToast) {
                window.UI.showToast(res.message || 'تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح', 'success');
              }
              window.location.hash = '#verify-otp';
            } else {
              if (errBox) {
                errBox.style.display = 'block';
                errBox.textContent = res.message || 'تعذر إرسال رمز التحقق، يرجى المحاولة لاحقًا.';
              }
            }
          } catch (err) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'إرسال رمز التحقق ⚡';
            }
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = err.message || 'حدث خطأ أثناء معالجة الطلب، يرجى المحاولة مجددًا.';
            }
          }
        });
      }
    },

    // 2. OTP Verification Page View
    renderVerifyOtp(email = '') {
      const masked = maskEmail(email);
      return `
        <div class="public-layout" style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:2rem 1rem;">
          <div style="max-width:500px; width:100%; background:var(--bg-surface); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:2.5rem; box-shadow:var(--shadow-lg); position:relative; overflow:hidden;" class="card-glass">
            
            <div style="position:absolute; top:-40px; left:-40px; width:180px; height:180px; background:radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%); filter:blur(25px); pointer-events:none;"></div>

            <div style="text-align:center; margin-bottom:2rem; position:relative;">
              <a href="#landing" style="display:inline-block; margin-bottom:1.25rem;">
                <img src="assets/logos/logo-dark.svg" alt="Code Spark" style="height:36px;">
              </a>
              <div class="badge badge-cyan" style="margin-bottom:0.75rem;">تأكيد الهوية</div>
              <h2 style="font-size:1.65rem; font-weight:800; margin-bottom:0.5rem; color:var(--text-main);">أدخل رمز التحقق</h2>
              <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.6;">
                أدخل رمز التحقق المكون من 6 أرقام المرسل إلى:
                <br>
                <strong style="color:var(--cyan); font-family:var(--font-mono); direction:ltr; display:inline-block; margin-top:4px;">${masked}</strong>
                <a href="#forgot-password" style="font-size:0.75rem; color:var(--text-subtle); margin-right:6px; text-decoration:underline;">تغيير</a>
              </p>
            </div>

            <div id="verify-error" class="badge badge-danger" style="display:none; padding:0.75rem 1rem; border-radius:var(--radius-md); margin-bottom:1.25rem; font-size:0.875rem; width:100%; text-align:right;"></div>

            <form id="verify-otp-form">
              <!-- 6-digit OTP Inputs -->
              <div class="otp-inputs-container">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-input" id="otp-1" autocomplete="one-time-code" autofocus>
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-input" id="otp-2">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-input" id="otp-3">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-input" id="otp-4">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-input" id="otp-5">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-input" id="otp-6">
              </div>

              <!-- Expiration & Resend Countdown Box -->
              <div class="countdown-box" id="resend-countdown-box">
                <span>⏱️ صلاحية الرمز: 10 دقائق |</span>
                <span id="countdown-label">إعادة إرسال الرمز بعد</span>
                <span class="countdown-timer-value" id="countdown-timer">01:00</span>
              </div>

              <div style="text-align:center; margin-bottom:1.5rem;">
                <button type="button" id="resend-otp-btn" class="btn btn-outline btn-sm" style="display:none; margin:0 auto;" disabled>
                  ${Icons.refresh('w-4 h-4')} إعادة إرسال الرمز
                </button>
              </div>

              <button type="submit" id="verify-submit-btn" class="btn btn-primary btn-glow btn-lg" style="width:100%; padding:0.875rem;">
                التحقق من الرمز ⚡
              </button>

              <div style="margin-top:1.75rem; text-align:center; font-size:0.875rem; border-top:1px solid var(--border-subtle); padding-top:1.25rem;">
                <a href="#forgot-password" style="color:var(--text-muted); text-decoration:none; display:inline-flex; align-items:center; gap:0.4rem;">
                  ${Icons.arrowRight('w-4 h-4')} طلب رمز لبريد آخر
                </a>
              </div>
            </form>

          </div>
        </div>
      `;
    },

    initVerifyOtpEvents(email = '') {
      const form = document.getElementById('verify-otp-form');
      const errBox = document.getElementById('verify-error');
      const submitBtn = document.getElementById('verify-submit-btn');
      const inputs = Array.from(document.querySelectorAll('.otp-digit-input'));
      const resendBtn = document.getElementById('resend-otp-btn');
      const countdownBox = document.getElementById('resend-countdown-box');
      const timerDisplay = document.getElementById('countdown-timer');

      // Auto-focus first input
      if (inputs.length > 0) {
        inputs[0].focus();
      }

      // Input Event Handlers (Digit validation, auto-advance, backspace, paste)
      inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
          const val = input.value.replace(/[^0-9]/g, '');
          input.value = val;

          if (val) {
            input.classList.add('filled');
            if (index < inputs.length - 1) {
              inputs[index + 1].focus();
            }
          } else {
            input.classList.remove('filled');
          }

          // If all 6 digits are filled, check if ready to submit
          const fullCode = inputs.map(inp => inp.value).join('');
          if (fullCode.length === 6) {
            submitBtn?.focus();
          }
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace') {
            if (!input.value && index > 0) {
              inputs[index - 1].focus();
              inputs[index - 1].value = '';
              inputs[index - 1].classList.remove('filled');
            }
          } else if (e.key === 'ArrowLeft') {
            if (index < inputs.length - 1) inputs[index + 1].focus();
          } else if (e.key === 'ArrowRight') {
            if (index > 0) inputs[index - 1].focus();
          }
        });

        // Paste support: extracts 6 digits and auto distributes
        input.addEventListener('paste', (e) => {
          e.preventDefault();
          const pasteData = (e.clipboardData || window.clipboardData).getData('text');
          const digits = pasteData.replace(/[^0-9]/g, '').slice(0, 6);
          if (digits) {
            digits.split('').forEach((d, i) => {
              if (inputs[i]) {
                inputs[i].value = d;
                inputs[i].classList.add('filled');
              }
            });
            const focusIndex = Math.min(digits.length, inputs.length - 1);
            inputs[focusIndex].focus();

            if (digits.length === 6 && form) {
              // Trigger automatic submit on full code paste
              setTimeout(() => {
                form.dispatchEvent(new Event('submit'));
              }, 100);
            }
          }
        });
      });

      // Countdown Timer for Resend
      let cooldownSeconds = 60;
      let countdownInterval = null;

      function startCountdown() {
        cooldownSeconds = 60;
        if (resendBtn) {
          resendBtn.style.display = 'none';
          resendBtn.disabled = true;
        }
        if (countdownBox) countdownBox.style.display = 'flex';

        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
          cooldownSeconds--;
          if (cooldownSeconds <= 0) {
            clearInterval(countdownInterval);
            if (countdownBox) countdownBox.style.display = 'none';
            if (resendBtn) {
              resendBtn.style.display = 'inline-flex';
              resendBtn.disabled = false;
            }
          } else {
            const mins = String(Math.floor(cooldownSeconds / 60)).padStart(2, '0');
            const secs = String(cooldownSeconds % 60).padStart(2, '0');
            if (timerDisplay) timerDisplay.textContent = `${mins}:${secs}`;
          }
        }, 1000);
      }

      startCountdown();

      // Resend OTP button handler
      resendBtn?.addEventListener('click', async () => {
        if (window.SoundManager) window.SoundManager.playClick('default');
        if (errBox) errBox.style.display = 'none';
        resendBtn.disabled = true;
        resendBtn.innerHTML = 'جاري الإرسال... ⏳';

        try {
          const res = await window.CodeSparkAuth.resendOtp(email);
          resendBtn.innerHTML = `${Icons.refresh('w-4 h-4')} إعادة إرسال الرمز`;
          if (res.success) {
            if (window.SoundManager) window.SoundManager.playClick('success');
            if (window.UI && window.UI.showToast) {
              window.UI.showToast('تمت إعادة إرسال رمز التحقق بنجاح إلى بريدك الإلكتروني', 'info');
            }
            // Clear existing inputs
            inputs.forEach(inp => {
              inp.value = '';
              inp.classList.remove('filled', 'has-error');
            });
            inputs[0].focus();
            startCountdown();
          } else {
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = res.message || 'تعذر إعادة إرسال الرمز';
            }
          }
        } catch (err) {
          resendBtn.disabled = false;
          resendBtn.innerHTML = `${Icons.refresh('w-4 h-4')} إعادة إرسال الرمز`;
          if (errBox) {
            errBox.style.display = 'block';
            errBox.textContent = err.message || 'حدث خطأ أثناء إعادة إرسال الرمز';
          }
        }
      });

      // Submit Form Handler
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (window.SoundManager) window.SoundManager.playClick('default');
          if (errBox) errBox.style.display = 'none';

          const otp = inputs.map(inp => inp.value.trim()).join('');
          if (otp.length !== 6) {
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = 'يرجى إدخال رمز التحقق كاملًا المكون من 6 أرقام';
            }
            inputs.forEach(inp => {
              if (!inp.value) inp.classList.add('has-error');
            });
            return;
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'جاري التحقق من الرمز... ⏳';
          }

          try {
            const res = await window.CodeSparkAuth.verifyOtp(email, otp);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'التحقق من الرمز ⚡';
            }

            if (res.success && res.reset_token) {
              clearInterval(countdownInterval);
              if (window.SoundManager) window.SoundManager.playClick('success');
              if (window.UI && window.UI.showToast) {
                window.UI.showToast(res.message || 'تم التحقق من الرمز بنجاح', 'success');
              }
              window.location.hash = '#reset-password';
            } else {
              inputs.forEach(inp => inp.classList.add('has-error'));
              if (errBox) {
                errBox.style.display = 'block';
                errBox.textContent = res.message || 'رمز التحقق غير صحيح أو انتهت صلاحيته.';
              }
            }
          } catch (err) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'التحقق من الرمز ⚡';
            }
            inputs.forEach(inp => inp.classList.add('has-error'));
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = err.message || 'رمز التحقق غير صحيح، يرجى المحاولة مجددًا.';
            }
          }
        });
      }
    },

    // 3. Reset Password Page View
    renderResetPassword(resetToken = '') {
      return `
        <div class="public-layout" style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:2rem 1rem;">
          <div style="max-width:500px; width:100%; background:var(--bg-surface); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:2.5rem; box-shadow:var(--shadow-lg); position:relative; overflow:hidden;" class="card-glass">
            
            <div style="position:absolute; top:-40px; right:-40px; width:180px; height:180px; background:radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%); filter:blur(25px); pointer-events:none;"></div>

            <div style="text-align:center; margin-bottom:2rem; position:relative;">
              <a href="#landing" style="display:inline-block; margin-bottom:1.25rem;">
                <img src="assets/logos/logo-dark.svg" alt="Code Spark" style="height:36px;">
              </a>
              <div class="badge badge-cyan" style="margin-bottom:0.75rem;">تحديث الأمان</div>
              <h2 style="font-size:1.65rem; font-weight:800; margin-bottom:0.5rem; color:var(--text-main);">إنشاء كلمة مرور جديدة</h2>
              <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.6;">
                أدخل كلمة المرور الجديدة لحسابك وتأكد من حفظها جيدًا
              </p>
            </div>

            <div id="reset-error" class="badge badge-danger" style="display:none; padding:0.75rem 1rem; border-radius:var(--radius-md); margin-bottom:1.25rem; font-size:0.875rem; width:100%; text-align:right;"></div>

            <form id="reset-password-form">
              <!-- New Password -->
              <div class="form-group" style="margin-bottom:1rem;">
                <label class="form-label" for="new-password">كلمة المرور الجديدة</label>
                <div class="input-with-icon">
                  <input type="password" id="new-password" class="form-input" placeholder="••••••••" required minlength="6" autofocus>
                  <button type="button" id="toggle-new-pass" class="input-icon-btn" style="background:none; border:none; cursor:pointer;" aria-label="تبديل إظهار كلمة المرور">
                    ${Icons.eye('w-5 h-5')}
                  </button>
                </div>
              </div>

              <!-- Password Strength Meter -->
              <div class="password-strength-container">
                <div class="password-strength-label">
                  <span style="color:var(--text-muted);">قوة كلمة المرور:</span>
                  <span id="strength-text" style="color:var(--danger); font-weight:700;">ضعيفة جداً</span>
                </div>
                <div class="password-strength-bar">
                  <div class="password-strength-fill" id="strength-bar-fill"></div>
                </div>
                <div class="password-req-list">
                  <div class="password-req-item" id="req-len">
                    <span class="req-icon">○</span> 8 أحرف على الأقل
                  </div>
                  <div class="password-req-item" id="req-case">
                    <span class="req-icon">○</span> أحرف كبيرة وصغيرة
                  </div>
                  <div class="password-req-item" id="req-num">
                    <span class="req-icon">○</span> أرقام (0-9)
                  </div>
                  <div class="password-req-item" id="req-sym">
                    <span class="req-icon">○</span> رموز خاصة (!@#$)
                  </div>
                </div>
              </div>

              <!-- Confirm Password -->
              <div class="form-group" style="margin-bottom:1.5rem;">
                <div class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
                  <label for="confirm-password">تأكيد كلمة المرور</label>
                  <span id="match-status" style="font-size:0.75rem; font-weight:700;"></span>
                </div>
                <div class="input-with-icon">
                  <input type="password" id="confirm-password" class="form-input" placeholder="••••••••" required minlength="6">
                  <button type="button" id="toggle-confirm-pass" class="input-icon-btn" style="background:none; border:none; cursor:pointer;" aria-label="تبديل إظهار كلمة المرور">
                    ${Icons.eye('w-5 h-5')}
                  </button>
                </div>
              </div>

              <button type="submit" id="reset-submit-btn" class="btn btn-primary btn-glow btn-lg" style="width:100%; padding:0.875rem;">
                تغيير كلمة المرور 🔒
              </button>
            </form>

          </div>
        </div>
      `;
    },

    initResetPasswordEvents(resetToken = '') {
      const form = document.getElementById('reset-password-form');
      const errBox = document.getElementById('reset-error');
      const submitBtn = document.getElementById('reset-submit-btn');
      const newPassInput = document.getElementById('new-password');
      const confirmPassInput = document.getElementById('confirm-password');
      const toggleNewBtn = document.getElementById('toggle-new-pass');
      const toggleConfirmBtn = document.getElementById('toggle-confirm-pass');
      const strengthText = document.getElementById('strength-text');
      const strengthFill = document.getElementById('strength-bar-fill');
      const matchStatus = document.getElementById('match-status');

      // Check items
      const reqLen = document.getElementById('req-len');
      const reqCase = document.getElementById('req-case');
      const reqNum = document.getElementById('req-num');
      const reqSym = document.getElementById('req-sym');

      // Toggle Password Visibility
      toggleNewBtn?.addEventListener('click', () => {
        if (window.SoundManager) window.SoundManager.playClick('default');
        const isPass = newPassInput.type === 'password';
        newPassInput.type = isPass ? 'text' : 'password';
        toggleNewBtn.innerHTML = isPass ? Icons.eyeOff('w-5 h-5') : Icons.eye('w-5 h-5');
      });

      toggleConfirmBtn?.addEventListener('click', () => {
        if (window.SoundManager) window.SoundManager.playClick('default');
        const isPass = confirmPassInput.type === 'password';
        confirmPassInput.type = isPass ? 'text' : 'password';
        toggleConfirmBtn.innerHTML = isPass ? Icons.eyeOff('w-5 h-5') : Icons.eye('w-5 h-5');
      });

      // Real-time Strength Meter
      newPassInput?.addEventListener('input', () => {
        const val = newPassInput.value;
        const res = calculatePasswordStrength(val);

        if (strengthFill) {
          strengthFill.style.width = `${res.score}%`;
          strengthFill.style.backgroundColor = res.color;
        }
        if (strengthText) {
          strengthText.textContent = res.label;
          strengthText.style.color = res.color;
        }

        // Update requirement badges
        if (reqLen) {
          reqLen.classList.toggle('valid', res.checks.length);
          reqLen.querySelector('.req-icon').textContent = res.checks.length ? '✓' : '○';
        }
        if (reqCase) {
          const hasCase = res.checks.lower && res.checks.upper;
          reqCase.classList.toggle('valid', hasCase);
          reqCase.querySelector('.req-icon').textContent = hasCase ? '✓' : '○';
        }
        if (reqNum) {
          reqNum.classList.toggle('valid', res.checks.number);
          reqNum.querySelector('.req-icon').textContent = res.checks.number ? '✓' : '○';
        }
        if (reqSym) {
          reqSym.classList.toggle('valid', res.checks.special);
          reqSym.querySelector('.req-icon').textContent = res.checks.special ? '✓' : '○';
        }

        checkMatch();
      });

      function checkMatch() {
        const p1 = newPassInput?.value || '';
        const p2 = confirmPassInput?.value || '';
        if (!p2) {
          if (matchStatus) matchStatus.textContent = '';
          return;
        }
        if (p1 === p2) {
          if (matchStatus) {
            matchStatus.style.color = 'var(--success)';
            matchStatus.textContent = '✓ كلمتا المرور متطابقتان';
          }
        } else {
          if (matchStatus) {
            matchStatus.style.color = 'var(--danger)';
            matchStatus.textContent = '✕ غير متطابقتين';
          }
        }
      }

      confirmPassInput?.addEventListener('input', checkMatch);

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (window.SoundManager) window.SoundManager.playClick('default');
          if (errBox) errBox.style.display = 'none';

          const newPass = (newPassInput?.value || '').trim();
          const confirmPass = (confirmPassInput?.value || '').trim();

          if (newPass.length < 6) {
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل';
            }
            return;
          }

          if (newPass !== confirmPass) {
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = 'كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقتين';
            }
            return;
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'جاري تغيير كلمة المرور... ⏳';
          }

          try {
            const res = await window.CodeSparkAuth.resetPassword(resetToken, newPass, confirmPass);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'تغيير كلمة المرور 🔒';
            }

            if (res.success) {
              if (window.SoundManager) window.SoundManager.playClick('success');
              if (window.UI && window.UI.celebrateConfetti) {
                window.UI.celebrateConfetti();
              }
              window.location.hash = '#reset-password-success';
            } else {
              if (errBox) {
                errBox.style.display = 'block';
                errBox.textContent = res.message || 'فشل تغيير كلمة المرور، يرجى المحاولة مجددًا.';
              }
            }
          } catch (err) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'تغيير كلمة المرور 🔒';
            }
            if (errBox) {
              errBox.style.display = 'block';
              errBox.textContent = err.message || 'حدث خطأ أثناء معالجة الطلب، يرجى المحاولة لاحقًا.';
            }
          }
        });
      }
    },

    // 4. Success Page View
    renderResetPasswordSuccess() {
      return `
        <div class="public-layout" style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:2rem 1rem;">
          <div style="max-width:480px; width:100%; background:var(--bg-surface); border:1px solid var(--border-card); border-radius:var(--radius-xl); padding:3rem 2.5rem; box-shadow:var(--shadow-lg); text-align:center; position:relative; overflow:hidden;" class="card-glass">
            
            <div style="position:absolute; top:-40px; right:-40px; width:180px; height:180px; background:radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%); filter:blur(25px); pointer-events:none;"></div>

            <div class="success-badge-glow">
              <span style="font-size:2.5rem; color:var(--success);">✓</span>
            </div>

            <h2 style="font-size:1.65rem; font-weight:900; margin-bottom:0.75rem; color:var(--text-main);">
              تم تغيير كلمة المرور بنجاح! 🎉
            </h2>
            
            <p style="color:var(--text-muted); font-size:0.95rem; line-height:1.7; margin-bottom:2rem;">
              تم تحديث كلمة المرور الخاصة بحسابك بأمان. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة ومتابعة رحلتك التعليمية.
            </p>

            <a href="#login" id="success-login-btn" class="btn btn-primary btn-glow btn-lg" style="width:100%; padding:0.875rem; text-decoration:none; display:inline-block;">
              تسجيل الدخول ⚡
            </a>

            <div style="margin-top:1.5rem; font-size:0.8125rem; color:var(--text-subtle);">
              CodeSpark Education Platform
            </div>

          </div>
        </div>
      `;
    },

    initResetSuccessEvents() {
      const btn = document.getElementById('success-login-btn');
      btn?.addEventListener('click', () => {
        if (window.SoundManager) window.SoundManager.playClick('default');
      });
      if (window.UI && window.UI.celebrateConfetti) {
        window.UI.celebrateConfetti();
      }
    }
  };
})();
