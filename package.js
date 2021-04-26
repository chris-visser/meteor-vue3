Package.describe({
  name: 'vue',
  version: '3.0.0',
  summary: 'Vue 3 for Meteor',
  git: 'https://github.com/chris-visser/meteor-vue.git',
  documentation: 'README.md'
});

Package.registerBuildPlugin({
  name: 'vue-compiler',
  use: [
    'babel-compiler@7.3.4',
    'caching-compiler@1.2.1',
    'ecmascript@0.12.7',
    'typescript'
  ],
  sources: [
    'VueCompiler.ts',
    'plugin.ts'
  ],
  npmDependencies: {
    'path': '0.12.7',
    '@babel/runtime': '7.4.3',
    'hash-sum': '2.0.0',
    'find-up': '3.0.0',
    'source-map': '0.5.6',
    '@vue/compiler-sfc': '3.0.2',
    '@vue/compiler-dom': '3.0.2',
    semver: '5.5.0',
  }
});

Package.onUse(function (api) {
  api.versionsFrom('1.8');
  api.use('isobuild:compiler-plugin@1.0.0');

  // Dependencies for compiled Vue components (taken from `ecmascript`).
  api.imply([
    'modules',
    'ecmascript-runtime',
    'babel-runtime',
    'promise'
  ]);
});
