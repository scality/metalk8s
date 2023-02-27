module.exports = {
  plugins: [
    ['@babel/plugin-proposal-optional-chaining', { loose: false }],
    ['@babel/plugin-proposal-nullish-coalescing-operator'],
    [
      '@babel/plugin-proposal-class-properties',
      {
        loose: true,
      },
    ],
  ],
  presets: [
    '@babel/preset-env',
    '@babel/preset-typescript',
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
  ],
};
