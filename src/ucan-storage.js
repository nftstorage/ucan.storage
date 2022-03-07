import * as Ucan from './ucan.js'
import { storageSemantics } from './semantics.js'

/**
 * Construct and sign a new UCAN token with the given {@link UcanStorageOptions}.
 *
 * @param {import('./types').UcanStorageOptions} params
 * @returns {Promise<string>} a Promise that resolves to the encoded JWT representation of the signed UCAN token.
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
 * Validate the given encoded UCAN token.
 *
 * You may optionally skip parts of the validation process by passing in {@link ValidateOptions}. By default,
 * all validation checks are performed.
 *
 * If the token is valid, returns a {@link ValidateResult} containing the parsed
 * {@link UcanHeader} and {@link UcanPayload}, as well as the signature `Uint8Array`.
 *
 * @param {string} jwt - a UCAN token, encoded as a JWT string
 * @param {import('./types').ValidateOptions} [options] - flags to optionally skip portions of the validation process. If not set, all flags default to `true`, meaning checks will be performed.
 * @returns {Promise<import('./types').ValidateResult>} a Promise that resolves to a {@link ValidateResult} if the token is valid, or rejects with an `Error` if validation fails.
 */
export function validate(jwt, options) {
  return Ucan.validate(jwt, options)
}

export { isUcan } from './ucan.js'
