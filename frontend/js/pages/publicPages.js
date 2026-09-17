/**
 * CodeSpark - Public Pages (Landing, About, Curriculum, Pricing, Contact, Reset)
 * Clean, responsive, modern Arabic-first educational interface.
 */
import ApiClient from '../api/apiClient.js';
import { Toast } from '../components/ui.js';

export class PublicPages {
  // ---------------------------------------------------------------------------
  // 1. Landing Page
  // ---------------------------------------------------------------------------
  static async renderLanding(container) {
    container.innerHTML = `
      <div class="public-landing">
        <!-- Hero Section -->
        <section class="hero-section text-center">
          <div class="hero-badge animate-pulse">⚡ منصة البرمجة الأولى لطلاب المرحلة الثانوية في مصر</div>
          <h1 class="hero-title">تعلم البرمجة من الصفر حتى الاحتراف مع <span class="gradient-text">CodeSpark</span></h1>
          <p class="hero-subtitle">
            منهج متكامل مصمم خصيصاً لطلاب المدارس الثانوية المصرية لتعليم لغة بايثون وتطوير الويب وحل المشكلات البرمجية خطوة بخطوة.
          </p>
          <div class="hero-actions">
            <a href="#/register" class="btn btn-primary btn-lg glow-effect">🚀 ابدأ التعلم الآن مجاناً</a>
            <a href="#/curriculum" class="btn btn-secondary btn-lg">📚 استعرض محتوى المنهج</a>
          </div>
          <div class="hero-stats-grid">
            <div class="stat-box">
              <div class="stat-number">100%</div>
              <div class="stat-label">مطابق للمنهج الوزاري المصري</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">+1,500</div>
              <div class="stat-label">طالب وطالبة في المرحلة الثانوية</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">24/7</div>
              <div class="stat-label">محرر أكواد سحابي وتصحيح فوري</div>
            </div>
          </div>
        </section>

        <!-- Features Showcase -->
        <section class="landing-section">
          <div class="section-header text-center">
            <h2 class="section-title">لماذا يفضل طلاب الثانوية منصة CodeSpark؟</h2>
            <p class="section-desc">صممنا بيئة تعليمية تجمع بين متعة التطبيق العملي وعمق الشرح الأكاديمي</p>
          </div>

          <div class="grid grid-3">
            <div class="card feature-card">
              <div class="feature-icon">💻</div>
              <h3>محرر أكواد سحابي مدمج</h3>
              <p>اكتب وجرب كود بايثون وجافاسكريبت و HTML مباشرة من المتصفح دون الحاجة لتثبيت أي برامج معقدة على جهازك.</p>
            </div>
            <div class="card feature-card">
              <div class="feature-icon">📚</div>
              <h3>شرح فيديو ومذكرات PDF</h3>
              <p>شروحات فيديو تفصيلية عالية الدقة مع روابط مباشرة لمذكرات Google Drive تلخص كل درس بأسلوب مبسط وممتع.</p>
            </div>
            <div class="card feature-card">
              <div class="feature-icon">📝</div>
              <h3>امتحانات وتصحيح تلقائي</h3>
              <p>بنك أسئلة شامل يحاكي امتحانات التابلت ونماذج الوزارة مع تقييم لحظي وشرح نموذجي لجميع الإجابات.</p>
            </div>
            <div class="card feature-card">
              <div class="feature-icon">🏆</div>
              <h3>نظام تحفيز ونقاط خبرة (XP)</h3>
              <p>اجمع النقاط وافتح الشارات التعليمية وحافظ على سلسلة أيام التعلم المستمرة لمنافسة زملائك على لوحة الصدارة.</p>
            </div>
            <div class="card feature-card">
              <div class="feature-icon">🧑‍🏫</div>
              <h3>متابعة مستمرة مع المساعدين</h3>
              <p>فريق من المساعدين التعليميين المتخصصين للرد الفوري على أسئلتك وحل المشكلات البرمجية التي تواجهك.</p>
            </div>
            <div class="card feature-card">
              <div class="feature-icon">💳</div>
              <h3>طرق دفع سهلة وآمنة</h3>
              <p>تفعيل فوري للاشتراكات عبر فودافون كاش وإنستاباي مع أسعار رمزية تناسب جميع طلاب المدارس.</p>
            </div>
          </div>
        </section>

        <!-- Dynamic Offers & Plans Preview -->
        <section class="landing-section">
          <div class="section-header text-center">
            <h2 class="section-title">باقات الاشتراك والعروض الحالية 🌟</h2>
            <p class="section-desc">اختر الباقة المناسبة لاحتياجاتك وابدأ رحلتك البرمجية فوراً</p>
          </div>
          <div id="landing-plans-container" class="grid grid-3">
            <div class="text-center" style="grid-column:1/-1;padding:2rem;">جاري تحميل باقات الاشتراك...</div>
          </div>
        </section>

        <!-- CTA Section -->
        <section class="cta-banner text-center">
          <h2>مستعد لبدء أول كود لك اليوم؟</h2>
          <p>انضم الآن لمئات الطلاب واكتشف سهولة البرمجة مع كود سبارك</p>
          <a href="#/register" class="btn btn-primary btn-lg glow-effect">سجل حسابك مجاناً الآن ⚡</a>
        </section>
      </div>
    `;

    // Load dynamic plans
    try {
      const res = await ApiClient.get('/subscriptions/plans');
      const plans = ApiClient.extractList(res, 'plans');
      const containerEl = document.getElementById('landing-plans-container');
      if (containerEl && plans.length > 0) {
        containerEl.innerHTML = plans.map(p => `
          <div class="card plan-card ${p.duration_months === 3 ? 'plan-featured' : ''}">
            ${p.duration_months === 3 ? '<div class="plan-badge">الأكثر طلباً ⭐</div>' : ''}
            <h3 class="plan-title">${p.name}</h3>
            <div class="plan-price">
              <span class="price-amount">${p.price}</span>
              <span class="price-currency">ج.م</span>
            </div>
            <div class="plan-duration">لمدة ${p.duration_months} شهر</div>
            <ul class="plan-features">
              ${(p.features || []).map(f => `<li>✓ ${f}</li>`).join('')}
            </ul>
            <a href="#/register" class="btn ${p.duration_months === 3 ? 'btn-primary' : 'btn-secondary'} btn-block">اشترك الآن</a>
          </div>
        `).join('');
      }
    } catch (e) {
      console.warn('Could not load landing plans:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. About Page
  // ---------------------------------------------------------------------------
  static renderAbout(container) {
    container.innerHTML = `
      <div class="public-page-container">
        <div class="card content-card">
          <div class="page-badge">عن المنصة ورؤيتنا</div>
          <h1 class="page-title">مرحباً بك في منصة CodeSpark التعليمية ⚡</h1>
          <p class="lead-text">
            CodeSpark هي منصة تعليمية مصرية رائدة متخصصة في تبسيط وتدريس علوم الحاسب ولغات البرمجة لطلاب المرحلة الثانوية العامة واللغات.
          </p>

          <div class="about-grid">
            <div class="about-block">
              <h3>🎯 رسالتنا</h3>
              <p>تمكين جيل الشباب المصري من فهم أسس التفكير المنطقي والخوارزميات، وتأهيلهم لمواكبة متطلبات المستقبل وسوق العمل التكنولوجي العالمي.</p>
            </div>
            <div class="about-block">
              <h3>📖 التوافق مع المنهج المدرسي</h3>
              <p>تم إعداد المحتوى بعناية ليتطابق مع المقررات الدراسية المعتمدة لوزارة التربية والتعليم المصرية في مادة الحاسب الآلي والبرمجة، مع إثرائه بتطبيقات عملية ومشروعات حقيقية.</p>
            </div>
          </div>

          <div class="instructor-card card mt-4">
            <div class="instructor-header">
              <div class="instructor-avatar">👨‍💻</div>
              <div>
                <h2>المهندس معاذ محمود الشاذلي</h2>
                <div class="instructor-title">المشرف العام ومؤسس منصة CodeSpark</div>
              </div>
            </div>
            <p class="mt-2">
              مهندس برمجيات متخصص ومدرب معتمد لعلوم الحاسب والذكاء الاصطناعي. شغوف بتمكين طلاب المدارس من كتابة أول كود برمجي بثقة وبناء حلول تكنولوجية مبتكرة.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // 3. Curriculum Overview Page
  // ---------------------------------------------------------------------------
  static async renderCurriculum(container) {
    container.innerHTML = `
      <div class="public-page-container">
        <div class="section-header text-center">
          <div class="page-badge">الخطة الدراسية</div>
          <h1 class="page-title">منهج البرمجة للمرحلة الثانوية 📚</h1>
          <p class="section-desc">استعرض المسارات والوحدات التعليمية المتاحة على المنصة</p>
        </div>

        <div id="curriculum-list" class="mt-4">
          <div class="text-center" style="padding:2rem;">جاري تحميل قائمة المناهج...</div>
        </div>
      </div>
    `;

    try {
      const res = await ApiClient.get('/courses');
      const courses = ApiClient.extractList(res, 'courses');
      const listEl = document.getElementById('curriculum-list');

      if (!courses || courses.length === 0) {
        listEl.innerHTML = '<div class="card text-center" style="padding:2rem;">لا توجد مناهج معروضة حالياً.</div>';
        return;
      }

      listEl.innerHTML = courses.map(c => `
        <div class="card course-card mb-4">
          <div class="course-header">
            <div>
              <span class="badge badge-primary">${c.academic_term || 'الفصل الدراسي'}</span>
              <h2 class="course-title mt-1">${c.title}</h2>
              <p class="text-muted">${c.description || ''}</p>
            </div>
            <a href="#/register" class="btn btn-primary">انضم للدورة مجاناً 🚀</a>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error loading curriculum:', err);
      document.getElementById('curriculum-list').innerHTML = '<div class="card text-danger text-center">تعذر تحميل قائمة المناهج.</div>';
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Pricing & Offers Page
  // ---------------------------------------------------------------------------
  static async renderPricing(container) {
    container.innerHTML = `
      <div class="public-page-container">
        <div class="section-header text-center">
          <div class="page-badge">خطط الاشتراك والأسعار</div>
          <h1 class="page-title">باقات اشتراك تناسب كل طالب 💳</h1>
          <p class="section-desc">اشتراك رمزي يشمل الفيديوهات، محرر الأكواد، المذكرات، وبنك الأسئلة</p>
        </div>

        <div id="payment-notice-banner" class="alert alert-info text-center mb-4" style="display:none;"></div>

        <div id="pricing-plans-grid" class="grid grid-3">
          <div class="text-center" style="grid-column:1/-1;padding:2rem;">جاري تحميل الباقات وطرق الدفع...</div>
        </div>

        <!-- Payment Instructions Card -->
        <div class="card mt-4 p-4">
          <h3 class="mb-3">طرق الدفع المعتمدة لدى CodeSpark 📱</h3>
          <div class="payment-methods-grid">
            <div class="payment-box">
              <div class="box-title">🔴 فودافون كاش (Vodafone Cash)</div>
              <div class="box-content">
                تحويل المبلغ المطلوب على الرقم:
                <div class="phone-highlight" id="public-voda-phone">+20159159038</div>
              </div>
            </div>
            <div class="payment-box">
              <div class="box-title">⚡ تطبيق إنستاباي (InstaPay)</div>
              <div class="box-content">
                التحويل عبر رقم الهاتف أو الرابط المباشر:
                <div class="phone-highlight" id="public-insta-phone">+20159159038</div>
                <a id="public-insta-link" href="https://ipn.eg/S/moazasem/instapay/27DsGj" target="_blank" class="btn btn-sm btn-outline-cyan mt-2">افتح إنستاباي للدفع المباشر 🔗</a>
              </div>
            </div>
          </div>
          <p class="text-muted mt-3" style="font-size:0.9rem;">
            * بعد إتمام التحويل، يرجى تسجيل الدخول إلى حسابك ورفع تفاصيل المعاملة من صفحة الاشتراكات، أو إدخال كود التفعيل الممنوح لك.
          </p>
        </div>
      </div>
    `;

    try {
      const [plansRes, payRes] = await Promise.all([
        ApiClient.get('/subscriptions/plans'),
        ApiClient.get('/payment-settings').catch(() => ({}))
      ]);

      const plans = ApiClient.extractList(plansRes, 'plans');
      const gridEl = document.getElementById('pricing-plans-grid');

      if (payRes) {
        if (payRes.offers_visible && payRes.offer_banner_text) {
          const bannerEl = document.getElementById('payment-notice-banner');
          bannerEl.textContent = payRes.offer_banner_text;
          bannerEl.style.display = 'block';
        }
        if (payRes.vodafone_cash) {
          const vp = document.getElementById('public-voda-phone');
          if (vp) vp.textContent = payRes.vodafone_cash;
        }
        if (payRes.instapay_phone) {
          const ip = document.getElementById('public-insta-phone');
          if (ip) ip.textContent = payRes.instapay_phone;
        }
        if (payRes.instapay_link) {
          const il = document.getElementById('public-insta-link');
          if (il) il.href = payRes.instapay_link;
        }
      }

      if (gridEl && plans.length > 0) {
        gridEl.innerHTML = plans.map(p => `
          <div class="card plan-card ${p.duration_months === 3 ? 'plan-featured' : ''}">
            ${p.duration_months === 3 ? '<div class="plan-badge">الأكثر طلباً ⭐</div>' : ''}
            <h3 class="plan-title">${p.name}</h3>
            <div class="plan-price">
              <span class="price-amount">${p.price}</span>
              <span class="price-currency">ج.م</span>
            </div>
            <div class="plan-duration">لمدة ${p.duration_months} شهر</div>
            <ul class="plan-features">
              ${(p.features || []).map(f => `<li>✓ ${f}</li>`).join('')}
            </ul>
            <a href="#/register" class="btn ${p.duration_months === 3 ? 'btn-primary' : 'btn-secondary'} btn-block">اختر الباقة واشترك</a>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Pricing page loading error:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Contact & Support Page
  // ---------------------------------------------------------------------------
  static renderContact(container) {
    container.innerHTML = `
      <div class="public-page-container">
        <div class="card content-card">
          <div class="page-badge">تواصل معنا</div>
          <h1 class="page-title">فريق دعم CodeSpark في خدمتك دائماً 💬</h1>
          <p class="lead-text">هل لديك استفسار حول المنهج الدراسي، تفعيل الأكواد، أو طرق الدفع؟ نحن هنا لمساعدتك.</p>

          <div class="contact-channels-grid mt-4">
            <div class="contact-box">
              <div class="contact-icon">📱</div>
              <h3>واتساب المتابعة والدعم الفني</h3>
              <p>تواصل مباشرة مع المشرفين والمساعدين التعليميين عبر واتساب:</p>
              <a href="https://wa.me/20159159038" target="_blank" class="btn btn-primary mt-2">مراسلة واتساب (+20159159038)</a>
            </div>

            <div class="contact-box">
              <div class="contact-icon">✉️</div>
              <h3>البريد الإلكتروني الرسمي</h3>
              <p>للاستفسارات الرسمية والشكاوى والمقترحات:</p>
              <div class="phone-highlight mt-2">support@codespark.edu</div>
            </div>
          </div>

          <div class="card mt-4 p-4 bg-surface">
            <h3>ساعات العمل والدعم</h3>
            <p class="text-muted">فريق المساعدين التعليميين متواجد يومياً من الساعة 10:00 صباحاً حتى 10:00 مساءً بتوقيت القاهرة للرد على أسئلة الطلاب وحل المشكلات البرمجية.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // 6. Forgot Password Page
  // ---------------------------------------------------------------------------
  static renderForgotPassword(container) {
    container.innerHTML = `
      <div class="public-page-container" style="max-width:550px;">
        <div class="card auth-card">
          <h2 class="auth-title">استعادة كلمة المرور 🔑</h2>
          <p class="text-muted mb-4">أدخل اسم المستخدم أو البريد الإلكتروني المسجل لدينا لإعادة تعيين كلمة المرور.</p>
          
          <form id="form-forgot-pw">
            <div class="form-group">
              <label class="form-label" for="forgot-ident">اسم المستخدم أو البريد الإلكتروني</label>
              <input type="text" id="forgot-ident" class="form-input" placeholder="student@example.com" required autofocus>
            </div>
            <button type="submit" class="btn btn-primary btn-block">إرسال طلب الاستعادة</button>
          </form>

          <div class="alert alert-info mt-3" id="forgot-feedback" style="display:none;"></div>

          <div class="auth-footer mt-4">
            <a href="#/login">العودة لصفحة تسجيل الدخول</a>
          </div>
        </div>
      </div>
    `;

    document.getElementById('form-forgot-pw')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fb = document.getElementById('forgot-feedback');
      fb.style.display = 'block';
      fb.innerHTML = `
        تم تسجيل طلبك بنجاح! لضمان أمان حسابك، يرجى التواصل مع الدعم الفني عبر واتساب 
        <a href="https://wa.me/20159159038" target="_blank" style="color:var(--color-cyan-accent);font-weight:bold;">(+20159159038)</a> 
        لإعادة تعيين كلمة المرور فورياً بعد تأكيد هويتك.
      `;
    });
  }
}
