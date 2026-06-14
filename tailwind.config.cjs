/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          'surface-strong': 'var(--surface-strong)',
          'surface-soft': 'var(--surface-soft)',
          border: 'var(--border)',
          text: 'var(--text)',
          muted: 'var(--muted)',
          accent: 'var(--accent)',
          'accent-strong': 'var(--accent-strong)',
          danger: 'var(--danger)',
          positive: 'var(--positive)',
          warning: 'var(--warning)',
          info: 'var(--info)',
          chip: 'var(--chip-bg)',
          'chip-text': 'var(--chip-text)',
        },
      },
      borderRadius: {
        control: 'var(--radius-control)',
        panel: 'var(--radius-panel)',
      },
      boxShadow: {
        panel: 'var(--panel-shadow)',
        modal: 'var(--modal-shadow)',
      },
      minHeight: {
        control: 'var(--control-height)',
      },
      width: {
        icon: 'var(--icon-button-size)',
      },
      height: {
        icon: 'var(--icon-button-size)',
      },
    },
  },
  plugins: [],
};
