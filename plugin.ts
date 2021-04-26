import { readFileSync } from 'fs'
import findUp from 'find-up'
import semver from 'semver'
import compiler from './VueCompiler'

const vueVersion = '3.0.2';

let options;
const pkgPath = findUp.sync('package.json');

// Read compiler options from `package.json`.
if (pkgPath) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  options = pkg['vue:compiler'];

  if (!pkg.dependencies || !pkg.dependencies.vue) {
    console.warn(`
WARNING: this package requires vue to be installed as npm peer dependency, but it is not specified in your package.json.
If you encounter error messages, consider running:
  meteor npm install --save vue@${vueVersion}
`);
  }
  else if (!semver.satisfies(vueVersion, pkg.dependencies.vue) ||
    semver.intersects(pkg.dependencies.vue, '<' + vueVersion)) {
    console.warn(`
WARNING: this package requires vue@${vueVersion} to be installed as npm peer dependency, but your package.json specifies:
  "vue": "${pkg.dependencies.vue}"
If you encounter error messages, consider running:
  meteor npm install --save vue@${vueVersion}
`);
  }
}

// @ts-ignore
Plugin.registerCompiler({
  extensions: ['vue']
  // extensions: (options && options.extensions) || ['vue'],
}, () => new compiler(options));
