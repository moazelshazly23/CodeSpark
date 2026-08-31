// Code Spark Main Application Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  console.log('⚡ Code Spark Educational Platform initializing...');
  
  // Initialize Database
  window.CodeSparkDB.load();

  // Initialize Client Router
  window.CodeSparkRouter.init();
});
