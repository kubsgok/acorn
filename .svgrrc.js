// Figma exports include web-only attributes (style, preserveAspectRatio) that React Native rejects.
module.exports = {
  svgoConfig: {
    plugins: [
      {
        name: 'preset-default',
        params: { overrides: { removeViewBox: false } },
      },
      { name: 'removeAttrs', params: { attrs: '(style|preserveAspectRatio|overflow)' } },
    ],
  },
}
