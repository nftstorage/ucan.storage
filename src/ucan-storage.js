import * as Ucan from './index.js'
import { storageSemantics } from './semantics.js'

/**
 *
 * @param {import('./types').UcanStorageOptions} params
 */
export async function build(params) {
  const { capabilities } = params

  for (const cap of capabilities) {
    const parsed = storageSemantics.tryParsing(cap)
    if (parsed instanceof Error) {
      throw parsed
    }
  }

  const { jwt } = await Ucan.build(params)
  return jwt
}

/**
 *
 * @param {string} jwt
 * @param {import('./types').ValidateOptions} [options]
 */
export function validate(jwt, options) {
  return Ucan.validate(jwt, options)
}
