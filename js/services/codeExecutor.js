// Code Spark Isolated Code Execution Engine Abstraction & Educational Assistant
(function() {
  window.CodeExecutor = {
    mode: 'backend', // 'backend' (isolated secure sandbox) | 'client' (browser interpreter)

    async run(code, inputs = [], timeout = 5) {
      if (!code || !code.trim()) {
        return {
          success: false,
          output: '',
          error: 'يرجى كتابة كود بايثون قبل الضغط على تشغيل',
          executionTimeMs: 0
        };
      }

      // Try Backend Isolated Sandbox First
      try {
        const res = await window.CodeSparkAPI.post('/code/run', { code, inputs, timeout });
        return res;
      } catch (err) {
        console.warn('Backend execution unavailable, using fallback interpreter:', err);
        // Fallback to client-side Python interpreter if offline
        if (window.PythonEngine && window.PythonEngine.run) {
          return await window.PythonEngine.run(code, inputs);
        }
        return {
          success: false,
          output: '',
          error: 'تعذر الاتصال بمحرك التنفيذ البرمجي: ' + err.message,
          executionTimeMs: 0
        };
      }
    },

    async explainError(code, errorMessage, errorType = null) {
      try {
        const res = await window.CodeSparkAPI.post('/code/explain-error', {
          code: code,
          error_message: errorMessage,
          error_type: errorType
        });
        return res;
      } catch (e) {
        return {
          success: false,
          meaning: 'تعذر الاتصال بخدمة التحليل التعليمي.',
          cause: errorMessage,
          guidance: 'راجع السطور الأخيرة في الكود وتأكد من صحة الصياغة.'
        };
      }
    },

    async getHint(lessonId, level = 1, code = '', topic = 'general') {
      try {
        const res = await window.CodeSparkAPI.post('/code/hint', {
          lesson_id: lessonId,
          level: level,
          code: code,
          topic: topic
        });
        return res;
      } catch (e) {
        return {
          success: false,
          hint: 'فكر في المطلوب بالمسألة واستخدم الدوال المناسبة لخطوات الحل.'
        };
      }
    },

    
    async explainCode(code) {
      try {
        const res = await window.CodeSparkAPI.post('/code/explain-code', { code });
        return res;
      } catch (e) {
        return {
          success: false,
          summary: 'تعذر تحليل الكود حالياً.',
          steps: ['تأكد من الاتصال بالخادم ثم أعد المحاولة.'],
          concepts: []
        };
      }
    },

    async improveCode(code) {
      try {
        const res = await window.CodeSparkAPI.post('/code/improve-code', { code });
        return res;
      } catch (e) {
        return {
          success: false,
          suggestions: ['تعذر جلب نصائح التحسين حالياً. راجع معايير PEP 8 يدويًا.']
        };
      }
    },

    async verifyExercise(lessonId, code) {
      if (!code || !code.trim()) {
        return {
          success: false,
          passed: false,
          output: '',
          error: 'يرجى كتابة كود بايثون للتحقق من الإجابة'
        };
      }

      try {
        const res = await window.CodeSparkAPI.post('/code/verify-exercise', {
          lesson_id: lessonId,
          code: code
        });
        return res;
      } catch (err) {
        console.warn('Backend exercise verification error, using local validation fallback:', err);
        if (window.PythonEngine && window.PythonEngine.run) {
          const localRes = await window.PythonEngine.run(code);
          return {
            success: localRes.success,
            passed: localRes.success && localRes.output && !localRes.error,
            output: localRes.output || '',
            error: localRes.error,
            message: localRes.success ? 'تم تنفيذ الكود محليًا بنجاح.' : 'حدث خطأ أثناء تشغيل الكود.'
          };
        }
        return {
          success: false,
          passed: false,
          output: '',
          error: err.message || 'تعذر التحقق من الإجابة'
        };
      }
    }
  };
})();
