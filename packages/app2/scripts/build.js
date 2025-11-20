/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const path = require('path');
const rimraf = require('rimraf');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactServerWebpackPlugin = require('react-server-dom-webpack/plugin');
const {ModuleFederationPlugin} = require('@module-federation/enhanced/webpack');
const {createSharedConfig} = require('../../module-federation.shared');
const pkg = require('../package.json');

const isProduction = process.env.NODE_ENV === 'production';
const shared = createSharedConfig(pkg);
const watchMode = process.env.WATCH === '1';
const buildDir = path.resolve(__dirname, '../build');
rimraf.sync(buildDir);

const compiler = webpack(
  {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
    entry: [path.resolve(__dirname, '../src/framework/bootstrap.js')],
    output: {
      path: buildDir,
      filename: 'main.js',
    },
    experiments: {
      layers: true,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: 'babel-loader',
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        inject: true,
        template: path.resolve(__dirname, '../public/index.html'),
      }),
      new ModuleFederationPlugin({
        name: pkg.name,
        filename: 'remoteEntry.js',
        remotes: {},
        exposes: {},
        shared,
        experiments: {
          asyncStartup: true,
        },
        manifest: false,
      }),
      new ReactServerWebpackPlugin({isServer: false}),
    ],
  }
);

const logStats = (err, stats) => {
  if (err) {
    console.error(err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    if (!watchMode) {
      process.exit(1);
    }
    return;
  }
  const info = stats.toJson();
  if (stats.hasErrors()) {
    console.log('Finished running webpack with errors.');
    info.errors.forEach(e => console.error(e));
    if (!watchMode) {
      process.exit(1);
    }
  } else {
    console.log('Finished running webpack.');
  }
};

if (watchMode) {
  compiler.watch({}, logStats);
} else {
  compiler.run((err, stats) => {
    logStats(err, stats);
    compiler.close(closeErr => {
      if (closeErr) {
        console.error(closeErr);
        process.exit(1);
      }
    });
  });
}
