const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");

const mobileWatchFolders = new Set([
  path.resolve(workspaceRoot, "node_modules"),
  path.resolve(__dirname),
  path.resolve(workspaceRoot, "packages/domain"),
  path.resolve(workspaceRoot, "packages/tokens")
]);

config.watchFolders = config.watchFolders.filter((folder) => mobileWatchFolders.has(folder));

module.exports = config;
