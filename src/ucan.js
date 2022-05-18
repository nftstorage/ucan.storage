import { didKeyType, publicKeyBytesToDid, verify } from './did.js'
import { base64url, utf8 } from './encoding.js'
import {
  serialize,
  deserialize,
  jwtAlgorithm,
  isExpired,
  isTooEarly,
} from './utils.js'

const _TOKEN_TYPE = 'JWT'
const _UCAN_VERSION = '0.8.0'

export { KeyPair } from './keypair.js'

/**
 * Build a Ucan from the given parameters.
 *
 * @param {import("./types").BuildParams} params
 * @returns {Promise<import('./types').UcanWithJWT>}
 */
export async function build(params) {
  const keypair = params.issuer
  const didStr = publicKeyBytesToDid(keypair.publicKey)
  const payload = buildPayload({
    ...params,
    issuer: didStr,
  })
  return sign(payload, keypair)
}

/**
 * Build parts
 *
 * @param {import('./types').BuildPayload} params
 */
function buildPayload(params) {
  const {
    issuer,
    audience,
    capabilities = [],
    lifetimeInSeconds = 30,
    expiration,
    notBefore,
    facts,
    proofs = [],
    // addNonce = false,
  } = params

  // Timestamps
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)
  const exp = expiration || currentTimeInSeconds + lifetimeInSeconds

  /** @type {import('./types').UcanPayload} */
  const payload = {
    aud: audience,
    att: capabilities,
    exp,
    fct: facts,
    iss: issuer,
    nbf: notBefore,
    // nnc: addNonce ? util.generateNonce() : undefined,
    prf: proofs,
  }

  return payload
}

/**
 * Generate UCAN signature.
 *
 * @param {import("./types").UcanPayload<string>} payload
 * @param {import("./keypair.js").KeyPair} keypair
 *
 * @returns {Promise<import('./types').UcanWithJWT>}
 */
export async function sign(payload, keypair) {
  /** @type {import('./types').UcanHeader} */
  const header = {
    alg: 'EdDSA',
    typ: _TOKEN_TYPE,
    ucv: _UCAN_VERSION,
  }

  // Encode parts
  const encodedHeader = serialize(header)
  const encodedPayload = serialize(payload)
  const toSign = `${encodedHeader}.${encodedPayload}`

  // EdDSA signature
  const sig = await keypair.sign(utf8.decode(toSign))
  const encodedSig = base64url.encode(sig)
  return {
    header,
    payload,
    signature: sig,
    jwt: encodedHeader + '.' + encodedPayload + '.' + encodedSig,
  }
}

/**
 * @param {string} encodedUcan
 * @param {import('./types').ValidateOptions} [options]
 *
 * @returns {Promise<import('./types').Ucan>}
 */
export async function validate(encodedUcan, options = {}) {
  /** @type {import('./types').ValidateOptions} */
  const opts = {
    checkIssuer: true,
    checkIsExpired: true,
    checkIsTooEarly: true,
    checkSignature: true,
    ...options,
  }

  const [encodedHeader, encodedPayload, encodedSignature] =
    encodedUcan.split('.')
  if (
    encodedHeader === undefined ||
    encodedPayload === undefined ||
    encodedSignature === undefined
  ) {
    throw new Error(
      `Can't parse UCAN: ${encodedUcan}: Expected JWT format: 3 dot-separated base64url-encoded values.`
    )
  }

  const header = /** @type {import('./types').UcanHeader} */ (
    deserialize(encodedHeader)
  )
  const payload = /** @type {import('./types').UcanPayload} */ (
    deserialize(encodedPayload)
  )

  const signature = base64url.decode(encodedSignature)

  if (opts.checkIssuer) {
    const issuerKeyType = didKeyType(payload.iss)
    if (jwtAlgorithm(issuerKeyType) !== header.alg) {
      throw new Error(
        `Invalid UCAN: ${encodedUcan}: Issuer key type does not match UCAN's alg property.`
      )
    }
  }

  if (
    opts.checkSignature &&
    !(await verify(
      `${encodedHeader}.${encodedPayload}`,
      signature,
      payload.iss
    ))
  ) {
    throw new Error(`Invalid UCAN: ${encodedUcan}: Signature invalid.`)
  }

  if (opts.checkIsExpired && isExpired(payload)) {
    throw new Error(`Invalid UCAN: ${encodedUcan}: Expired.`)
  }

  if (opts.checkIsTooEarly && isTooEarly(payload)) {
    throw new Error(`Invalid UCAN: ${encodedUcan}: Not active yet (too early).`)
  }

  return { header, payload, signature }
}

/**
 * Check if input is a encoded UCAN
 *
 * @param {string} encodedUcan
 */
export function isUcan(encodedUcan) {
  const [encodedHeader, encodedPayload, encodedSignature] =
    encodedUcan.split('.')
  if (
    encodedHeader === undefined ||
    encodedPayload === undefined ||
    encodedSignature === undefined
  ) {
    return false
  }

  const header = /** @type {import('./types').UcanHeader} */ (
    deserialize(encodedHeader)
  )

  if (typeof header.ucv === 'string') {
    return true
  }

  return false
}
