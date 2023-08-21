const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    fontFamily: {
      'mono': ['"Cascadia Code NF"', 'monospace'],
    },
    colors: {
      'gray': '#191825',
      'purple': '#865DFF',
      'pink': '#E384FF',
      'blue': colors.blue,
      'red': colors.red,
      'white': colors.white,
      'black': colors.black,
    },
    extend: {},
    plugins: [],
  }
};
