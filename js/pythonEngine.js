// Code Spark Hybrid Python 3 Execution Engine (Backend Sandbox + Fallback Interpreter)
(function() {
  window.PythonEngine = {
    async run(code, inputCallback = null) {
      if (window.CodeExecutor && window.CodeExecutor.run) {
        try {
          const res = await window.CodeExecutor.run(code);
          if (res) return res;
        } catch (e) {
          console.warn('Backend execution fallback to browser engine:', e);
        }
      }
      return this.execute(code, inputCallback);
    },

    async execute(code, inputCallback = null) {
      const logs = [];
      let stepCount = 0;
      const MAX_STEPS = 10000;

      const customPrint = (...args) => {
        const formatted = args.map(arg => {
          if (arg === null) return 'None';
          if (arg === true) return 'True';
          if (arg === false) return 'False';
          if (typeof arg === 'object') {
            if (Array.isArray(arg)) {
              return '[' + arg.map(x => (typeof x === 'string' ? `'${x}'` : x)).join(', ') + ']';
            }
            return JSON.stringify(arg);
          }
          return String(arg);
        }).join(' ');
        logs.push(formatted);
      };

      const customInput = async (promptText = '') => {
        if (promptText) logs.push(promptText);
        if (inputCallback) {
          return await inputCallback(promptText);
        }
        const val = window.prompt(promptText || 'أدخل قيمة:');
        return val !== null ? val : '85';
      };

      try {
        const jsCode = this.transpile(code);
        
        const sandbox = {
          print: customPrint,
          input: customInput,
          len: (obj) => (obj && obj.length !== undefined ? obj.length : 0),
          type: (val) => {
            if (typeof val === 'number') return Number.isInteger(val) ? "<class 'int'>" : "<class 'float'>";
            if (typeof val === 'string') return "<class 'str'>";
            if (typeof val === 'boolean') return "<class 'bool'>";
            if (Array.isArray(val)) return "<class 'list'>";
            return `<class '${typeof val}'>`;
          },
          int: (val) => {
            const parsed = parseInt(val, 10);
            if (isNaN(parsed)) throw new Error(`ValueError: invalid literal for int() with base 10: '${val}'`);
            return parsed;
          },
          float: (val) => {
            const parsed = parseFloat(val);
            if (isNaN(parsed)) throw new Error(`ValueError: could not convert string to float: '${val}'`);
            return parsed;
          },
          str: (val) => {
            if (val === true) return 'True';
            if (val === false) return 'False';
            if (val === null) return 'None';
            return String(val);
          },
          bool: (val) => Boolean(val),
          sum: (arr) => Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0,
          max: (...args) => Array.isArray(args[0]) ? Math.max(...args[0]) : Math.max(...args),
          min: (...args) => Array.isArray(args[0]) ? Math.min(...args[0]) : Math.min(...args),
          range: function* (start, stop, step) {
            if (stop === undefined) {
              stop = start;
              start = 0;
            }
            step = step === undefined ? 1 : step;
            if (step === 0) throw new Error("ValueError: range() arg 3 must not be zero");
            if (step > 0) {
              for (let i = start; i < stop; i += step) {
                if (++stepCount > MAX_STEPS) throw new Error("RuntimeError: تم تجاوز الحد الأقصى للتكرار (تأكد من عدم وجود Infinite Loop)");
                yield i;
              }
            } else {
              for (let i = start; i > stop; i += step) {
                if (++stepCount > MAX_STEPS) throw new Error("RuntimeError: تم تجاوز الحد الأقصى للتكرار (تأكد من عدم وجود Infinite Loop)");
                yield i;
              }
            }
          },
          True: true,
          False: false,
          None: null,
          stepCheck: () => {
            if (++stepCount > MAX_STEPS) {
              throw new Error("RuntimeError: تم إيقاف البرنامج بسبب تكرار لانهائي (Infinite Loop)");
            }
          }
        };

        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const argNames = Object.keys(sandbox);
        const argValues = Object.values(sandbox);
        
        const fn = new AsyncFunction(...argNames, jsCode);
        await fn(...argValues);

        return {
          success: true,
          output: logs.join('\n'),
          error: null
        };
      } catch (err) {
        return {
          success: false,
          output: logs.join('\n'),
          error: this.formatError(err.message)
        };
      }
    },

    formatError(msg) {
      if (msg.includes('SyntaxError')) return `خطأ في الصياغة (SyntaxError):\n${msg}`;
      if (msg.includes('ReferenceError') || msg.includes('is not defined')) {
        const varName = msg.split(' ')[0] || 'المتغير';
        return `خطأ في اسم المتغير (NameError):\nالمتغير أو الدالة ${varName} غير معرّفة. تأكد من تهيئة المتغير قبل استخدامه.`;
      }
      if (msg.includes('RuntimeError')) return msg;
      return `خطأ أثناء التنفيذ (Execution Error):\n${msg}`;
    },

    transpile(py) {
      let lines = py.split('\n');
      let jsLines = [];
      let indentStack = [0];

      for (let idx = 0; idx < lines.length; idx++) {
        let line = lines[idx];
        let trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
          jsLines.push('// ' + trimmed);
          continue;
        }

        let indent = line.search(/\S/);
        if (indent === -1) indent = 0;

        while (indent < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          jsLines.push('}');
        }

        let l = trimmed;
        const commentIdx = l.indexOf('#');
        if (commentIdx !== -1) {
          l = l.substring(0, commentIdx).trim();
        }

        l = l.replace(/\band\b/g, '&&')
             .replace(/\bor\b/g, '||')
             .replace(/\bnot\b/g, '!')
             .replace(/\bTrue\b/g, 'true')
             .replace(/\bFalse\b/g, 'false')
             .replace(/\bNone\b/g, 'null')
             .replace(/\bis not\b/g, '!==')
             .replace(/\bis\b/g, '===');

        l = l.replace(/f(["'])(.*?)\1/g, (match, quote, content) => {
          return '`' + content.replace(/\{(.*?)\}/g, '${$1}') + '`';
        });

        l = l.replace(/\bprint\s*\(/g, 'print(');
        l = l.replace(/\binput\s*\(/g, 'await input(');

        if (l.startsWith('def ') && l.endsWith(':')) {
          const fnMatch = l.match(/^def\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*:$/);
          if (fnMatch) {
            l = `async function ${fnMatch[1]}(${fnMatch[2]}) {`;
            indentStack.push(indent + 1);
          }
        } else if (l.startsWith('if ') && l.endsWith(':')) {
          const cond = l.slice(3, -1).trim();
          l = `if (${cond}) { stepCheck();`;
          indentStack.push(indent + 1);
        } else if (l.startsWith('elif ') && l.endsWith(':')) {
          const cond = l.slice(5, -1).trim();
          l = `} else if (${cond}) { stepCheck();`;
        } else if (l === 'else:' || l.startsWith('else:')) {
          l = `} else { stepCheck();`;
        } else if (l.startsWith('for ') && l.includes(' in ') && l.endsWith(':')) {
          const forMatch = l.match(/^for\s+([a-zA-Z0-9_,\s]+)\s+in\s+(.*?)\s*:$/);
          if (forMatch) {
            const loopVar = forMatch[1].trim();
            const iter = forMatch[2].trim();
            l = `for (let ${loopVar} of ${iter}) { stepCheck();`;
            indentStack.push(indent + 1);
          }
        } else if (l.startsWith('while ') && l.endsWith(':')) {
          const cond = l.slice(6, -1).trim();
          l = `while (${cond}) { stepCheck();`;
          indentStack.push(indent + 1);
        } else if (l.endsWith(':')) {
          l = l.slice(0, -1) + ' {';
          indentStack.push(indent + 1);
        } else {
          if (/^[a-zA-Z0-9_]+,\s*[a-zA-Z0-9_]+\s*=/.test(l)) {
            const parts = l.split('=');
            const left = parts[0].split(',').map(x => x.trim());
            const right = parts[1].split(',').map(x => x.trim());
            l = `[${left.join(', ')}] = [${right.join(', ')}];`;
          } else if (/^[a-zA-Z0-9_]+\s*=\s*/.test(l)) {
            l = l + ';';
          } else {
            l = l + ';';
          }
        }

        l = l.replace(/\.append\s*\(/g, '.push(');
        l = l.replace(/([a-zA-Z0-9_]+)\[\s*-\s*([0-9]+)\s*\]/g, '$1[$1.length - $2]');
        jsLines.push(l);
      }

      while (indentStack.length > 1) {
        indentStack.pop();
        jsLines.push('}');
      }

      return `
        let student_name, student_grade, total_lessons, is_passed, price, tax_rate, total;
        let name, year_of_birth, current_year, age, length, width, area, remainder;
        let a, b, num, score, number, is_student, purchase_amount, x, y, i, count;
        let result, n, even_sum, grades, word, subject, res, my_scores, items, s;
        ${jsLines.join('\n')}
      `;
    }
  };
})();
