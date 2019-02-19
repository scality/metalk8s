const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: ['@babel/polyfill', './src/index.js'],
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(['dist']),
        new HtmlWebpackPlugin({
            title: 'Auth Demo'
        })
    ],
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist')
    },
    devServer: {
        port: 8000,
        historyApiFallback: {
            rewrites: [
                {
                    from: /^\/$/,
                    to: '/index.html',
                },
                {
                    from: /^\/callback$/,
                    to: '/index.html',
                },
            ],
        },
    },
};
