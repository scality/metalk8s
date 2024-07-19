if (process.env.NODE_ENV === 'test') {
  module.exports = {
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
}
