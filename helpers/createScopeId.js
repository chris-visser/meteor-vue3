import hash from 'hash-sum'
import path from 'path'

const isProduction = process.env.NODE_ENV === 'production';

export const createScopeId = (contents, sourceRoot, filename) => {
  const shortFilePath = path
  .relative(sourceRoot, filename)
  .replace(/^(\.\.[\/\\])+/, '')
  .replace(/\\/g, '/');

  return hash(
    isProduction ? shortFilePath + '\n' + contents : shortFilePath
  )
}
