// Code Spark Landing Page View
(function() {
  window.LandingView = {
    render() {
      return `
        <div class="public-layout">
          <!-- Navbar -->
          <header class="public-header">
            <div class="logo-wrapper">
              <a href="#landing">
                <img src="assets/logos/logo-dark.svg" alt="Code Spark" class="logo-img" style="height:36px;">
              </a>
            </div>

            <nav style="display:flex; align-items:center; gap:1.5rem;" class="hide-on-mobile">
              <a href="#landing" style="color:var(--text-main); font-weight:700;">الرئيسية</a>
              <a href="#curriculum-preview" style="color:var(--text-muted); font-weight:600;">المنهج الدراسي</a>
              <a href="#features-preview" style="color:var(--text-muted); font-weight:600;">المميزات</a>
              <a href="#how-it-works" style="color:var(--text-muted); font-weight:600;">كيف تعمل المنصة؟</a>
              <a href="#faq-section" style="color:var(--text-muted); font-weight:600;">الأسئلة الشائعة</a>
            </nav>

            <div style="display:flex; align-items:center; gap:0.75rem;">
              <a href="#login" class="btn btn-outline btn-sm">تسجيل الدخول</a>
              <a href="#register" class="btn btn-primary btn-sm">ابدأ التعلم ⚡</a>
            </div>
          </header>

          <!-- Hero Section -->
          <section style="position:relative; padding: 4.5rem 2rem 3.5rem; max-width: 1300px; margin: 0 auto; width:100%; overflow:hidden;">
            <!-- Background glow -->
            <div style="position:absolute; top:-100px; right:10%; width:450px; height:450px; background:radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%); pointer-events:none; filter:blur(40px);"></div>
            <div style="position:absolute; bottom:0; left:10%; width:400px; height:400px; background:radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%); pointer-events:none; filter:blur(40px);"></div>

            <div style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap:3rem; align-items:center;" class="hero-grid">
              <div>
                <div class="badge badge-cyan" style="margin-bottom:1.25rem; font-size:0.875rem; padding:0.35rem 0.85rem;">
                  <span class="spark-dot"></span> المنصة المدرسية المتخصصة لطلاب المرحلة الثانوية
                </div>
                <h1 style="font-size: clamp(2.2rem, 4vw, 3.5rem); font-weight: 900; line-height: 1.25; margin-bottom: 1.25rem;">
                  اتعلم البرمجة... <br>
                  <span class="sparkle-text">بطريقة تفهمها ⚡</span>
                </h1>
                <p style="font-size: 1.125rem; color: var(--text-muted); line-height: 1.8; margin-bottom: 2rem; max-width: 540px;">
                  منصة <strong>Code Spark</strong> تساعدك على فهم ومذاكرة مادة البرمجة المقررة للمرحلة الثانوية من خلال شرح مبسط، تدريبات تفاعلية، بنك أسئلة واختبارات لضمان التفوق في الامتحانات.
                </p>

                <div style="display:flex; flex-wrap:wrap; gap:1rem; margin-bottom:2.5rem;">
                  <a href="#register" class="btn btn-primary btn-lg">
                    ابدأ التعلم مجانًا ${Icons.arrowLeft()}
                  </a>
                  <a href="#login" class="btn btn-secondary btn-lg">
                    ${Icons.user()} تسجيل الدخول
                  </a>
                </div>

                <div style="display:flex; gap:2rem; border-top:1px solid var(--border-subtle); padding-top:1.5rem;">
                  <div>
                    <div style="font-size:1.5rem; font-weight:800; color:var(--text-main); font-family:var(--font-sans);">4 وحدات</div>
                    <div style="font-size:0.8125rem; color:var(--text-muted);">شاملة المنهج الثانوي</div>
                  </div>
                  <div style="border-right:1px solid var(--border-subtle); padding-right:2rem;">
                    <div style="font-size:1.5rem; font-weight:800; color:var(--cyan); font-family:var(--font-sans);">100+ سؤال</div>
                    <div style="font-size:0.8125rem; color:var(--text-muted);">نماذج وتدريبات امتحانات</div>
                  </div>
                  <div style="border-right:1px solid var(--border-subtle); padding-right:2rem;">
                    <div style="font-size:1.5rem; font-weight:800; color:var(--success); font-family:var(--font-sans);">100% عملي</div>
                    <div style="font-size:0.8125rem; color:var(--text-muted);">محرر بايثون تفاعلي</div>
                  </div>
                </div>
              </div>

              <!-- Visual Hero Interactive Card -->
              <div style="position:relative;">
                <div class="card card-glass" style="border-color:var(--border-glow); box-shadow:var(--shadow-glow); padding:1.25rem;">
                  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border-subtle);">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                      <div class="editor-dot red"></div>
                      <div class="editor-dot yellow"></div>
                      <div class="editor-dot green"></div>
                      <span style="font-family:var(--font-mono); font-size:0.8125rem; color:var(--text-muted); margin-right:0.5rem;">secondary_exam_prep.py</span>
                    </div>
                    <span class="badge badge-primary">بايثون الثانوية</span>
                  </div>

                  <div class="code-block-static" style="margin:0 0 1rem 0; font-size:0.875rem;">
<span class="code-comment"># حساب تقدير الطالب في مادة البرمجة</span>
grade = 92

<span class="code-keyword">if</span> grade >= 90:
    <span class="code-func">print</span>(<span class="code-string">"التقدير: ممتاز 🎉 - جاهز للامتحان"</span>)
<span class="code-keyword">elif</span> grade >= 75:
    <span class="code-func">print</span>(<span class="code-string">"التقدير: جيد جدًا 👍"</span>)
<span class="code-keyword">else</span>:
    <span class="code-func">print</span>(<span class="code-string">"راجع درس الجمل الشرطية مرة أخرى"</span>)
                  </div>

                  <div style="background:#060A14; border-radius:var(--radius-md); padding:0.875rem; border:1px solid var(--border-subtle); font-family:var(--font-mono); font-size:0.8125rem;">
                    <div style="color:#64748B; font-size:0.7rem; margin-bottom:0.25rem;">شاشة المخرجات (Console Output):</div>
                    <div style="color:#34D399;">التقدير: ممتاز 🎉 - جاهز للامتحان</div>
                  </div>

                  <div style="display:flex; align-items:center; justify-content:space-between; margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--border-subtle); font-size:0.8125rem;">
                    <span style="color:var(--text-muted);">✨ تطبيق فوري ومباشر لجميع الأكواد</span>
                    <a href="#practice" class="btn btn-outline btn-sm">جرب المحرر الآن</a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Features Section -->
          <section id="features-preview" style="padding: 4rem 2rem; max-width: 1300px; margin: 0 auto; width:100%;">
            <div style="text-align:center; margin-bottom:3rem;">
              <div class="badge badge-primary" style="margin-bottom:0.75rem;">مميزات المنصة</div>
              <h2 style="font-size:2rem; font-weight:800; margin-bottom:0.75rem;">كل ما تحتاجه للدرجة النهائية في البرمجة</h2>
              <p style="color:var(--text-muted); max-width:600px; margin:0 auto;">صُممت المنصة خصيصًا لتناسب أسلوب مذاكرة طالب المرحلة الثانوية وطبيعة أسئلة الامتحانات.</p>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem;">
              <div class="card card-hover">
                <div class="stat-icon-wrapper stat-icon-blue" style="margin-bottom:1.25rem;">
                  ${Icons.book()}
                </div>
                <h3 style="font-size:1.125rem; font-weight:700; margin-bottom:0.5rem;">شرح مبسط ومركّز</h3>
                <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.7;">
                  شرح كل مفهوم برمجي بطريقة تناسب عقلية طالب الثانوي، بعيدًا عن التعقيد وبتركيز تام على جوهر المنهج المقرر.
                </p>
              </div>

              <div class="card card-hover">
                <div class="stat-icon-wrapper stat-icon-cyan" style="margin-bottom:1.25rem;">
                  ${Icons.code()}
                </div>
                <h3 style="font-size:1.125rem; font-weight:700; margin-bottom:0.5rem;">تدريبات تفاعلية ومحرر كود</h3>
                <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.7;">
                  لا تكتفِ بالقراءة النظرية! جرّب الكود بنفسك بعد كل فكرة واكتشف نتيجة تنفيذ البرنامج لحظة بلحظة.
                </p>
              </div>

              <div class="card card-hover">
                <div class="stat-icon-wrapper stat-icon-purple" style="margin-bottom:1.25rem;">
                  ${Icons.checkSquare()}
                </div>
                <h3 style="font-size:1.125rem; font-weight:700; margin-bottom:0.5rem;">اختبارات قصيرة وشاملة</h3>
                <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.7;">
                  اختبارات على كل درس ووحدة، بالإضافة لامتحانات تجريبية تحاكي نظام أسئلة الامتحانات الشهرية ونصف ونهاية العام.
                </p>
              </div>

              <div class="card card-hover">
                <div class="stat-icon-wrapper stat-icon-green" style="margin-bottom:1.25rem;">
                  ${Icons.trendingUp()}
                </div>
                <h3 style="font-size:1.125rem; font-weight:700; margin-bottom:0.5rem;">متابعة مستواك الدراسي</h3>
                <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.7;">
                  اعرف نسبة إنجازك في كل وحدة، ومتوسط درجاتك في الاختبارات، والنقاط التي تحتاج منك إلى إعادة مراجعة.
                </p>
              </div>

              <div class="card card-hover">
                <div class="stat-icon-wrapper stat-icon-blue" style="margin-bottom:1.25rem;">
                  ${Icons.fileText()}
                </div>
                <h3 style="font-size:1.125rem; font-weight:700; margin-bottom:0.5rem;">مراجعات ليلة الامتحان</h3>
                <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.7;">
                  ملخصات سريعة ومسائل تتبع الكود (Trace Tables) الشائعة في الامتحانات لترتيب أفكارك قبل دخول اللجنة.
                </p>
              </div>

              <div class="card card-hover">
                <div class="stat-icon-wrapper stat-icon-cyan" style="margin-bottom:1.25rem;">
                  ${Icons.zap()}
                </div>
                <h3 style="font-size:1.125rem; font-weight:700; margin-bottom:0.5rem;">تعلم خطوة بخطوة</h3>
                <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.7;">
                  تسلسل منطقي ينتقل بك من المفهوم البسيط، إلى المثال العملي، ثم التدريب المستقل، وصولاً للتقييم النهائي.
                </p>
              </div>
            </div>
          </section>

          <!-- Curriculum Snapshot -->
          <section id="curriculum-preview" style="padding: 4rem 2rem; background:rgba(15,23,42,0.5); border-top:1px solid var(--border-subtle); border-bottom:1px solid var(--border-subtle);">
            <div style="max-width: 1300px; margin: 0 auto; width:100%;">
              <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:2.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                  <div class="badge badge-cyan" style="margin-bottom:0.75rem;">المنهج الدراسي</div>
                  <h2 style="font-size:2rem; font-weight:800;">خطة المنهج المقررة</h2>
                  <p style="color:var(--text-muted);">مقسمة إلى 4 وحدات دراسية تغطي أساسيات البرمجة بلغة بايثون</p>
                </div>
                <a href="#register" class="btn btn-outline">تصفح المنهج كاملًا</a>
              </div>

              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
                <div class="card" style="border-right: 4px solid var(--cyan);">
                  <div class="badge badge-neutral" style="margin-bottom:0.75rem;">الوحدة الأولى</div>
                  <h3 style="font-size:1.0625rem; font-weight:700; margin-bottom:0.5rem;">أساسيات التفكير ولغة بايثون</h3>
                  <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">المتغيرات، أنواع البيانات (int, float, str, bool)، ودوال الطباعة والإدخال.</p>
                  <div style="display:flex; justify-content:space-between; font-size:0.8125rem; color:var(--text-subtle);">
                    <span>5 دروس</span>
                    <span>اختبار تقييمي</span>
                  </div>
                </div>

                <div class="card" style="border-right: 4px solid var(--primary);">
                  <div class="badge badge-neutral" style="margin-bottom:0.75rem;">الوحدة الثانية</div>
                  <h3 style="font-size:1.0625rem; font-weight:700; margin-bottom:0.5rem;">هياكل التحكم واتخاذ القرار</h3>
                  <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">الجمل الشرطية if, elif, else، المعاملات المنطقية، ومسائل درجات الطلاب.</p>
                  <div style="display:flex; justify-content:space-between; font-size:0.8125rem; color:var(--text-subtle);">
                    <span>4 دروس</span>
                    <span>اختبار تقييمي</span>
                  </div>
                </div>

                <div class="card" style="border-right: 4px solid var(--purple);">
                  <div class="badge badge-neutral" style="margin-bottom:0.75rem;">الوحدة الثالثة</div>
                  <h3 style="font-size:1.0625rem; font-weight:700; margin-bottom:0.5rem;">حلقات التكرار والدوران</h3>
                  <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">حلقات for و while، دالة range، وأوامر break و continue وتتبع الجداول.</p>
                  <div style="display:flex; justify-content:space-between; font-size:0.8125rem; color:var(--text-subtle);">
                    <span>4 دروس</span>
                    <span>اختبار تقييمي</span>
                  </div>
                </div>

                <div class="card" style="border-right: 4px solid var(--success);">
                  <div class="badge badge-neutral" style="margin-bottom:0.75rem;">الوحدة الرابعة</div>
                  <h3 style="font-size:1.0625rem; font-weight:700; margin-bottom:0.5rem;">هياكل البيانات والدوال</h3>
                  <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">القوائم Lists، تقطيع النصوص Slicing، الدوال Functions، ونماذج امتحانات شاملة.</p>
                  <div style="display:flex; justify-content:space-between; font-size:0.8125rem; color:var(--text-subtle);">
                    <span>5 دروس</span>
                    <span>امتحان تجريبي شامل</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- How it works -->
          <section id="how-it-works" style="padding: 4rem 2rem; max-width: 1300px; margin: 0 auto; width:100%;">
            <div style="text-align:center; margin-bottom:3rem;">
              <div class="badge badge-primary" style="margin-bottom:0.75rem;">رحلة المذاكرة</div>
              <h2 style="font-size:2rem; font-weight:800; margin-bottom:0.75rem;">كيف تذاكر مع Code Spark؟</h2>
              <p style="color:var(--text-muted);">مسار مرتب يقودك خطوة بخطوة للتمكن من المادة</p>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:1.5rem;">
              <div style="text-align:center; padding:1.5rem;">
                <div style="width:48px; height:48px; border-radius:50%; background:var(--gradient-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.25rem; margin:0 auto 1rem; box-shadow:0 0 15px rgba(37,99,235,0.4);">1</div>
                <h4 style="font-size:1.0625rem; font-weight:700; margin-bottom:0.5rem;">افهم الشرح</h4>
                <p style="color:var(--text-muted); font-size:0.875rem;">شاهد الشرح المصور واقرأ الملاحظات المنهجية المركزة.</p>
              </div>

              <div style="text-align:center; padding:1.5rem;">
                <div style="width:48px; height:48px; border-radius:50%; background:var(--gradient-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.25rem; margin:0 auto 1rem; box-shadow:0 0 15px rgba(6,182,212,0.4);">2</div>
                <h4 style="font-size:1.0625rem; font-weight:700; margin-bottom:0.5rem;">طبّق بنفسك</h4>
                <p style="color:var(--text-muted); font-size:0.875rem;">اكتب الكود وجربه في المحرر التفاعلي دون الحاجة لتثبيت برامج معقدة.</p>
              </div>

              <div style="text-align:center; padding:1.5rem;">
                <div style="width:48px; height:48px; border-radius:50%; background:var(--gradient-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.25rem; margin:0 auto 1rem; box-shadow:0 0 15px rgba(139,92,246,0.4);">3</div>
                <h4 style="font-size:1.0625rem; font-weight:700; margin-bottom:0.5rem;">حل الأسئلة والتدريبات</h4>
                <p style="color:var(--text-muted); font-size:0.875rem;">تدرّب على أسئلة الاختيار من متعدد وتتبع الأكواد ومسائل الامتحانات.</p>
              </div>

              <div style="text-align:center; padding:1.5rem;">
                <div style="width:48px; height:48px; border-radius:50%; background:var(--gradient-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.25rem; margin:0 auto 1rem; box-shadow:0 0 15px rgba(16,185,129,0.4);">4</div>
                <h4 style="font-size:1.0625rem; font-weight:700; margin-bottom:0.5rem;">قيّم مستواك</h4>
                <p style="color:var(--text-muted); font-size:0.875rem;">ادخل الاختبار التقييمي واعرف نتيجتك ونقاط القوة والضعف فورًا.</p>
              </div>
            </div>
          </section>

          <!-- FAQ Section -->
          <section id="faq-section" style="padding: 4rem 2rem; max-width: 900px; margin: 0 auto; width:100%;">
            <div style="text-align:center; margin-bottom:2.5rem;">
              <div class="badge badge-cyan" style="margin-bottom:0.75rem;">الأسئلة الشائعة</div>
              <h2 style="font-size:2rem; font-weight:800;">إجابات لأهم استفسارات الطلاب</h2>
            </div>

            <div style="display:flex; flex-direction:column; gap:1rem;">
              <div class="card" style="padding:1.25rem;">
                <h4 style="font-size:1rem; font-weight:700; color:var(--cyan); margin-bottom:0.5rem;">هل المنصة متوافقة مع منهج مادة البرمجة للثانوية العامة؟</h4>
                <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.6;">نعم، المنصة مخصصة بالكامل لشرح موضوعات وتطبيقات مادة البرمجة المقررة على طلاب المرحلة الثانوية، ولا تحتوي على أي موضوعات خارجية غير مقررة.</p>
              </div>

              <div class="card" style="padding:1.25rem;">
                <h4 style="font-size:1rem; font-weight:700; color:var(--cyan); margin-bottom:0.5rem;">هل أحتاج لتثبيت بايثون على جهازي لتطبيق الدروس؟</h4>
                <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.6;">لا، توفر منصة Code Spark محرر كود بايثون تفاعلي يعمل مباشرة داخل المتصفح على الكمبيوتر أو الموبايل والتابلت.</p>
              </div>

              <div class="card" style="padding:1.25rem;">
                <h4 style="font-size:1rem; font-weight:700; color:var(--cyan); margin-bottom:0.5rem;">كيف أتابع مستواي ودرجاتي في الامتحانات؟</h4>
                <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.6;">بمجرد تسجيل الدخول، تتيح لك لوحة التحكم صفحة "تقدمي" لمتابعة نسبة إنجاز كل وحدة، سجل درجاتك، والشرح التفصيلي لأي سؤال أخطأت فيه.</p>
              </div>
            </div>
          </section>

          <!-- CTA Banner -->
          <section style="padding: 4rem 2rem; max-width: 1200px; margin: 0 auto 3rem; width:100%;">
            <div class="card" style="background:linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(6,182,212,0.2) 100%); border-color:var(--border-glow); text-align:center; padding:3.5rem 2rem; position:relative; overflow:hidden;">
              <div style="position:relative; z-index:2; max-width:650px; margin:0 auto;">
                <h2 style="font-size:2.25rem; font-weight:900; margin-bottom:1rem;">جاهز للتفوق في مادة البرمجة؟</h2>
                <p style="color:var(--text-muted); font-size:1.0625rem; margin-bottom:2rem;">انضم الآن إلى منصة Code Spark وابدأ مذاكرة أول درس وحل التدريبات مجانًا.</p>
                <a href="#register" class="btn btn-primary btn-lg" style="box-shadow:0 0 25px rgba(6,182,212,0.5);">
                  إنشاء حساب طالب جديد ⚡
                </a>
              </div>
            </div>
          </section>

          <!-- Footer -->
          <footer style="border-top:1px solid var(--border-subtle); padding:2.5rem 2rem; background:rgba(11,17,32,0.95); margin-top:auto;">
            <div style="max-width:1300px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem;">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <img src="assets/logos/logo-dark.svg" alt="Code Spark" style="height:32px;">
              </div>
              <div style="color:var(--text-subtle); font-size:0.875rem;">
                منصة Code Spark التعليمية — مخصصة لتعليم وشرح مادة البرمجة للمرحلة الثانوية © 2026
              </div>
              <div style="display:flex; gap:1.25rem; font-size:0.875rem; color:var(--text-muted);">
                <a href="#landing">الرئيسية</a>
                <a href="#support">الدعم والمساعدة</a>
                <a href="#login">دخول المعلمين والمشرفين</a>
              </div>
            </div>
          </footer>
        </div>
      `;
    }
  };
})();
