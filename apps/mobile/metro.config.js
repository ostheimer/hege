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

// pnpm kann für Web- und Expo-Abhängigkeiten unterschiedliche React-Kopien
// auflösen. Alle nativen Module müssen dieselbe Instanz wie der Renderer nutzen.
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    return { type: "sourceFile", filePath: require.resolve(moduleName, { paths: [__dirname] }) };
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
