import { CachingCompiler } from 'meteor/caching-compiler'
import { parse, compileTemplate, compileScript, rewriteDefault } from '@vue/compiler-sfc'
import { createScopeId } from './helpers/createScopeId'

export default class VueCompiler extends CachingCompiler {

  options = {

  }

  constructor(userOptions = {}) {
    super({
      compilerName: 'vue',
      defaultCacheSize: 1024 * 1024 * 10
    })

    this.options = {
      // ...defaultOptions,
      // ...userOptions,
    }
  }

  compileResultSize(compileResult) {
    return compileResult.template.code.length + compileResult.script.content.length
  }

  compileOneFile(inputFile) {
    const arch = inputFile.getArch()
    const filename = inputFile.getPathInPackage()
    const contents = inputFile.getContentsAsString()
    const sourceRoot = process.cwd()
    const isSSR = arch.startsWith('os.')
    const isProduction = process.env.NODE_ENV === 'production'

    const { descriptor, errors } = parse(contents, {
      sourceMap: true,
      filename,
      sourceRoot,
    })

    const id = createScopeId(contents, sourceRoot, filename);
    // feature information
    // const hasScoped = descriptor.styles.some((s) => s.scoped)

    const templateCompilerOptions = {
      id,
      source: descriptor.template.content,
      ssr: isSSR,
      ssrCssVars: [],
      preprocessLang: descriptor.template.lang,
      isProd: isProduction,
      filename,
      compilerOptions: {
        scopeId: descriptor.styles.some((s) => s.scoped) ? `data-v-${id}` : null,
      },
    }

    const createSubFilename = (type: 'script' | 'template' | 'style') => (
        filename.replace('.vue', `--${type}.vue`)
    )

    const template = compileTemplate(templateCompilerOptions);

    const script = compileScript(descriptor, {
      id,
      isProd: isProduction,
      /**
       * Compile the template and inline the resulting render function
       * directly inside setup().
       * - Only affects <script setup>
       * - This should only be used in production because it prevents the template
       * from being hot-reloaded separately from component state.
       */
      inlineTemplate: isProduction,
      templateOptions: templateCompilerOptions
    })

    const mainFile = `
import script from '${createSubFilename('script')}'
// template compiled to render function
// import { render } from '${createSubFilename('template')}'
// css
// import '${createSubFilename('style')}'

// attach render function to script
script.render = render

// attach additional metadata
// some of these should be dev only
script.__file = '${filename}'
script.__scopeId = '${id}'

// additional tooling-specific HMR handling code
// using __VUE_HMR_API__ global

export default script
`

    return {
      mainFile,
      template,
      script
    }
  }


  addCompileResult(file, result) {
    const filename = file.getPathInPackage()

    const createSubFilename = (type: 'script' | 'template' | 'style') => (
        filename.replace('.vue', `--${type}.vue`)
    )

    file.addJavaScript({
      path: createSubFilename('script'),
      sourcePath: file.getPathInPackage(),
      data: result.script.content,
      sourceMap: result.script.map
    })

    file.addJavaScript({
      path: createSubFilename('template'),
      sourcePath: file.getPathInPackage(),
      data: result.script.content,
      sourceMap: result.script.map
    })

    file.addJavaScript({
      path: file.getPathInPackage(),
      sourcePath: file.getPathInPackage(),
      data: result.mainFile,
      // sourceMap: result.script.map
    })
  }
};
