import { createTheme } from "@mantine/core";

export const theme = createTheme({
  /* Put your mantine theme override here */
  colors: {
    'guide-blue': [
      // "#39adf4",
      '#38a8ec',
      '#36a3e6',
      '#35a0e2',
      '#359fdf',
      '#359ddd',
      '#349bda',
      '#3499d7',
      '#3597d3',
      '#318ec7',
      '#2d82b6',
      //"#2875a4",
    ],
  },
  primaryColor: 'guide-blue',
  defaultRadius: 'md',
  fontFamily: 'Montserrat, sans-serif',
  fontFamilyMonospace: 'Ubuntu Mono, monospace',
});
