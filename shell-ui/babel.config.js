if (process.env.NODE_ENV === 'test') {
  module.exports = {
    presets: [
      '@babel/preset-env',
      '@babel/preset-flow',
      [
        '@babel/preset-react',
        {
          runtime: 'automatic',
        },
      ],
    ],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  };
} else {
  module.exports = {
    plugins: [
      [
        'babel-plugin-styled-components',
        {
          namespace: 'shell-ui',
        },
      ],
    ],
    presets: [
      '@babel/preset-env',
      '@babel/preset-flow',
      [
        '@babel/preset-react',
        {
          runtime: 'automatic',
        },
      ],
    ],
  };
}
