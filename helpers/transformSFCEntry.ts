import path from 'path';
import { parse } from '@vue/compiler-sfc';

import { Options } from '../types';

export const transformSFCEntry = (
    code: string,
    filename: string,
    options: Options,
    sourceRoot: string,
    isProduction: boolean,
    isServer: boolean,
    filterCustomBlock: (type: string) => boolean,
    // pluginContext: TransformPluginContext
) => {
    const { descriptor, errors } = parse(code, {
        sourceMap: true,
        filename,
        sourceRoot,
    })
    setDescriptor(filename, descriptor)

    if (errors.length) {
        errors.forEach((error) =>
            pluginContext.error(createRollupError(filename, error))
        )
        return null
    }

    const shortFilePath = path
        .relative(sourceRoot, filename)
        .replace(/^(\.\.[\/\\])+/, '')
        .replace(/\\/g, '/')
    const scopeId = hash(
        isProduction ? shortFilePath + '\n' + code : shortFilePath
    )
    // feature information
    const hasScoped = descriptor.styles.some((s) => s.scoped)

    const isTemplateInlined =
        descriptor.scriptSetup && !(descriptor.template && descriptor.template.src)
    const hasTemplateImport = descriptor.template && !isTemplateInlined

    const templateImport = hasTemplateImport
        ? genTemplateCode(descriptor, scopeId, isServer)
        : ''

    const renderReplace = hasTemplateImport
        ? isServer
            ? `script.ssrRender = ssrRender`
            : `script.render = render`
        : ''

    const scriptImport = genScriptCode(
        descriptor,
        scopeId,
        isProduction,
        isServer,
        options,
        pluginContext
    )
    const stylesCode = genStyleCode(descriptor, scopeId, options.preprocessStyles)
    const customBlocksCode = getCustomBlock(descriptor, filterCustomBlock)
    const output = [
        scriptImport,
        templateImport,
        stylesCode,
        customBlocksCode,
        renderReplace,
    ]
    if (hasScoped) {
        output.push(`script.__scopeId = ${JSON.stringify(`data-v-${scopeId}`)}`)
    }
    if (!isProduction) {
        output.push(`script.__file = ${JSON.stringify(shortFilePath)}`)
    } else if (options.exposeFilename) {
        output.push(
            `script.__file = ${JSON.stringify(path.basename(shortFilePath))}`
        )
    }
    output.push('export default script')
    return {
        code: output.join('\n'),
        map: {
            mappings: '',
        },
    }
}
