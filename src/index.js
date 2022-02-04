import * as uint8arrays from 'uint8arrays'
import { publicKeyBytesToDid } from './did.js'

/**
 * @param {import("./types").BuildParams} params
 */
export async function build(params) {
  const keypair = params.issuer
  const didStr = publicKeyBytesToDid(keypair.publicKey, keypair.keyType)
  const { header, payload } = buildParts({
    ...params,
    issuer: didStr,
    keyType: keypair.keyType,
  })
  return sign(header, payload, keypair)
}

/**
 * Build parts
 *
 * @param {import('./types').BuildPartsParams} params
 */
export function buildParts(params) {
  const {
    keyType = 'ed25519',
    issuer,
    audience,
    capabilities = [],
    lifetimeInSeconds = 30,
    expiration,
    notBefore,
    facts,
    proofs = [],
    addNonce = false,
    ucanVersion = '0.7.0',
  } = params

  // Timestamps
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)
  const exp = expiration || currentTimeInSeconds + lifetimeInSeconds

  /** @type {import('./types').UcanHeader} */
  const header = {
    alg: 'EdDSA',
    typ: 'JWT',
    ucv: ucanVersion,
  }

  /** @type {import('./types').UcanPayload} */
  const payload = {
    aud: audience,
    att: capabilities,
    exp,
    fct: facts,
    iss: issuer,
    nbf: notBefore,
    prf: proofs,
  }

  if (addNonce) {
    // payload.nnc = util.generateNonce()
  }

  return { header, payload }
}

/**
 * Generate UCAN signature.
 *
 * @param {import("./types").UcanHeader} header
 * @param {import("./types").UcanPayload<string>} payload
 * @param {import("./keypair.js").default} keypair
 */
export async function sign(header, payload, keypair) {
  const encodedHeader = uint8arrays.toString(
    uint8arrays.fromString(JSON.stringify(header), 'utf8'),
    'base64url'
  )
  const encodedPayload = uint8arrays.toString(
    uint8arrays.fromString(JSON.stringify(payload), 'utf8'),
    'base64url'
  )
  const toSign = uint8arrays.fromString(
    `${encodedHeader}.${encodedPayload}`,
    'utf8'
  )

  // EdDSA signature
  const sig = await keypair.sign(toSign)
  return {
    header,
    payload,
    signature: uint8arrays.toString(sig, 'base64url'),
  }
}

/**
 * Encode the header of a UCAN.
 *
 * @param {import('./types').UcanHeader} header - The UcanHeader to encode
 */
export function encodeHeader(header) {
  return uint8arrays.toString(
    uint8arrays.fromString(JSON.stringify(header), 'utf8'),
    'base64url'
  )
}

/**
 * Encode the payload of a UCAN.
 *
 * @param {import('./types').UcanPayload} payload - The UcanPayload to encode
 */
export function encodePayload(payload) {
  return uint8arrays.toString(
    uint8arrays.fromString(JSON.stringify(payload), 'utf8'),
    'base64url'
  )
}

/**
 * Encode a UCAN.
 *
 * @param {import('./types').Ucan} ucan - The UCAN to encode
 */
export function encode(ucan) {
  const encodedHeader = encodeHeader(ucan.header)
  const encodedPayload = encodePayload(ucan.payload)

  return encodedHeader + '.' + encodedPayload + '.' + ucan.signature
}
