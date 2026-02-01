/**
 * theme-provider.js
 * Script anti-FOUC para aplicar el tema lo antes posible.
 */
(function() {
  function getResolvedTheme(theme) {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  function applyTheme(theme) {
    const resolved = getResolvedTheme(theme);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    // Soporte para aplicaciones que aún usan .dark-mode
    document.documentElement.classList.toggle('dark-mode', resolved === 'dark');
  }

  const storedTheme = localStorage.getItem('theme') || 'system';
  applyTheme(storedTheme);

  // Exponer para el contexto de React
  window.__setTheme = function(newTheme) {
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  // Escuchar cambios del sistema si está en modo system
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (localStorage.getItem('theme') === 'system' || !localStorage.getItem('theme')) {
      applyTheme('system');
    }
  });
})();
