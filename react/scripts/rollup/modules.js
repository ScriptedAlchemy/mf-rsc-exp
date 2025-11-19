'use strict';

const fs = require('fs');
const path = require('path');
const forks = require('./forks');

// For any external that is used in a DEV-only condition, explicitly
// specify whether it has side effects during import or not. This lets
// us know whether we can safely omit them when they are unused.
const HAS_NO_SIDE_EFFECTS_ON_IMPORT = false;
// const HAS_SIDE_EFFECTS_ON_IMPORT = true;
const importSideEffects = Object.freeze({
  fs: HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  'fs/promises': HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  path: HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  stream: HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  'prop-types/checkPropTypes': HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface':
    HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  scheduler: HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  react: HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  'react-dom/server': HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  'react/jsx-dev-runtime': HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  'react-dom': HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  url: HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  ReactNativeInternalFeatureFlags: HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  'webpack-sources/lib/helpers/createMappingsSerializer.js':
    HAS_NO_SIDE_EFFECTS_ON_IMPORT,
  'webpack-sources/lib/helpers/readMappings.js': HAS_NO_SIDE_EFFECTS_ON_IMPORT,
});

// Bundles exporting globals that other modules rely on.
const knownGlobals = Object.freeze({
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/server': 'ReactDOMServer',
  scheduler: 'Scheduler',
  'scheduler/unstable_mock': 'SchedulerMock',
  ReactNativeInternalFeatureFlags: 'ReactNativeInternalFeatureFlags',
});

// Given ['react'] in bundle externals, returns { 'react': 'React' }.
function getPeerGlobals(externals, bundleType) {
  const peerGlobals = {};
  externals.forEach(name => {
    peerGlobals[name] = knownGlobals[name];
  });
  return peerGlobals;
}

// Determines node_modules packages that are safe to assume will exist.
function resolvePackageJson(entry) {
  let resolvedEntry;
  try {
    resolvedEntry = require.resolve(entry);
  } catch (error) {
    resolvedEntry = entry;
  }
  let dir = path.dirname(resolvedEntry);
  while (true) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      return pkgPath;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not locate package.json for ${entry}`);
    }
    dir = parent;
  }
}

function getDependencies(bundleType, entry) {
  const packageJson = require(resolvePackageJson(entry));
  // Both deps and peerDeps are assumed as accessible.
  return Array.from(
    new Set([
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {}),
    ])
  );
}

// Hijacks some modules for optimization and integration reasons.
function getForks(bundleType, entry, moduleType, bundle) {
  const forksForBundle = {};
  Object.keys(forks).forEach(srcModule => {
    const dependencies = getDependencies(bundleType, entry);
    const targetModule = forks[srcModule](
      bundleType,
      entry,
      dependencies,
      moduleType,
      bundle
    );
    if (targetModule === null) {
      return;
    }
    forksForBundle[srcModule] = targetModule;
  });
  return forksForBundle;
}

function getImportSideEffects() {
  return importSideEffects;
}

module.exports = {
  getImportSideEffects,
  getPeerGlobals,
  getDependencies,
  getForks,
};
