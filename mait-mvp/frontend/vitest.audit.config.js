import config from './vitest.config';

export default {
  ...config,
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: { ...config.test, include: ['audit/**/*.test.{js,jsx}'], exclude: [] },
};
