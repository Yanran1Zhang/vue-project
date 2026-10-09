import {defineStore} from 'pinia';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: 'light', // 默认为浅色主题
  }),

  actions: {
    setTheme(currentTheme) {
      this.theme = currentTheme;
    },
  },

  getters: {
    themeData: (state) => state.theme,
  },
});
