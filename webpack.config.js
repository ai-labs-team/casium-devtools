const { resolve } = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ChromeExtensionReloader = require('webpack-chrome-extension-reloader');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

const extractSass = new ExtractTextPlugin({
  filename: 'style.css'
});

module.exports = {
  entry: {
    'content-script': './src/content-script.ts',
    'injected-script': './src/injected-script.ts',
    'background': './src/background.ts',
    'devtools': './src/devtools.ts',
    'panel': './src/panel.ts',
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },

  devtool: isProd ? false : 'source-map',

  output: {
    path: resolve(__dirname, './dist'),
    filename: '[name].js'
  },

  module: {
    rules: [{
      test: /\.tsx?$/,
      use: [{
        loader: 'awesome-typescript-loader',
      }]
    }, {
      test: /.scss$/,
      use: extractSass.extract({
        use: [{
          loader: 'css-loader'
        }, {
          loader: 'sass-loader'
        }],

        fallback: 'style-loader'
      })
    }, {
      test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
      loader: "url-loader?limit=10000&mimetype=application/font-woff"
    }, {
      test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
      loader: "url-loader?limit=10000&mimetype=application/font-woff"
    }, {
      test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
      loader: "url-loader?limit=10000&mimetype=application/octet-stream"
    }, {
      test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
      loader: "file-loader"
    }, {
      test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
      loader: "url-loader?limit=10000&mimetype=image/svg+xml"
    }]
  },

  plugins: [
    extractSass,
    isProd ? null : new ChromeExtensionReloader(),
    isProd ? new UglifyJsPlugin() : null,
    isProd ? null : new CopyWebpackPlugin([{ from: './node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map', flatten: true }]),
    new CopyWebpackPlugin([
      { from: './src/*.png', flatten: true },
      { from: './node_modules/webextension-polyfill/dist/browser-polyfill.min.js', flatten: true },
      { from: './src/manifest.json', flatten: true },
      { from: './src/devtools.html', flatten: true },
      { from: './src/panel.html', flatten: true },
    ]),
  ].filter(plugin => !!plugin)
};
