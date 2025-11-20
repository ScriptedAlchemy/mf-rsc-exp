'use strict';

const DEFAULT_SCOPE = 'default';
const CLIENT_LAYER = 'client';
const SERVER_LAYER = 'server';
const NON_SEMVER_PREFIXES = ['workspace:', 'link:', 'file:'];
function normalizeVersion(range) {
  if (!range) {
    return false;
  }
  const trimmed = range.trim();
  if (!trimmed || trimmed === '*' || trimmed.toLowerCase() === 'latest') {
    return false;
  }
  if (NON_SEMVER_PREFIXES.some(prefix => trimmed.startsWith(prefix))) {
    return false;
  }
  return trimmed;
}

function resolveVersion(pkg, dep) {
  return (
    normalizeVersion(pkg.dependencies?.[dep]) ||
    normalizeVersion(pkg.devDependencies?.[dep]) ||
    normalizeVersion(pkg.peerDependencies?.[dep]) ||
    false
  );
}

function createSharedConfig(pkg) {
  const versionOf = dep => resolveVersion(pkg, dep);

  const makeEntry = (request, options = {}) => {
    const versionSource = options.versionSource || request;
    const explicitRequired = options.requiredVersion;
    const resolvedVersion =
      explicitRequired === false
        ? false
        : explicitRequired || versionOf(versionSource);

    const strictVersion =
      typeof options.strictVersion === 'boolean'
        ? options.strictVersion
        : Boolean(resolvedVersion);

    return {
      import: options.import ?? request,
      shareKey: options.shareKey ?? request,
      shareScope: options.shareScope ?? DEFAULT_SCOPE,
      singleton: options.singleton ?? true,
      eager: false,
      layer: options.layer,
      issuerLayer: options.issuerLayer,
      allowNodeModulesSuffixMatch:
        options.allowNodeModulesSuffixMatch ?? true,
      requiredVersion: resolvedVersion,
      version: resolvedVersion,
      strictVersion,
    };
  };

  return {
    react: makeEntry('react'),
    'react-dom': makeEntry('react-dom'),
    'react-error-boundary': makeEntry('react-error-boundary', {
      singleton: false,
      strictVersion: false,
    }),
    'react-dom/client': makeEntry('react-dom/client', {
      versionSource: 'react-dom',
      shareScope: CLIENT_LAYER,
      layer: CLIENT_LAYER,
      issuerLayer: CLIENT_LAYER,
    }),
    'react-server-dom-webpack/client': makeEntry(
      'react-server-dom-webpack/client',
      {
        versionSource: 'react-server-dom-webpack',
        requiredVersion: false,
        strictVersion: false,
        shareScope: CLIENT_LAYER,
        layer: CLIENT_LAYER,
        issuerLayer: CLIENT_LAYER,
      }
    ),
    'react-server-dom-webpack/server': makeEntry(
      'react-server-dom-webpack/server',
      {
        versionSource: 'react-server-dom-webpack',
        requiredVersion: false,
        strictVersion: false,
        shareScope: SERVER_LAYER,
        layer: SERVER_LAYER,
        issuerLayer: SERVER_LAYER,
      }
    ),
  };
}

module.exports = {
  createSharedConfig,
  CLIENT_LAYER,
  SERVER_LAYER,
};
