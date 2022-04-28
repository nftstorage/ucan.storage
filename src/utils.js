import { base64url, utf8 } from './encoding.js'

/**
 * Concat Uint8Arrays
 *
 * @param {Uint8Array[]} arrays
 */
export function concatUint8(arrays) {
  let totalLength = 0
  for (const arr of arrays) {
    totalLength += arr.length
  }
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

/**
 * Returns true if the two passed Uint8Arrays have the same content
 *
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 */
export function equals(a, b) {
  if (a === b) {
    return true
  }

  if (a.byteLength !== b.byteLength) {
    return false
  }

  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }

  return true
}

/**
 * Serialise Object to JWT style string.
 *
 * @param {any} input - JSON input
 */
export function serialize(input) {
  return base64url.encode(utf8.decode(JSON.stringify(input)))
}

/**
 * Deserialise Object to JWT style string.
 *
 * @param {string} input
 */
export function deserialize(input) {
  let headerUtf8

  try {
    const decodedHeader = base64url.decode(input)
    headerUtf8 = utf8.encode(decodedHeader)
  } catch {
    throw new Error(`Can't parse: ${input}: Can't parse as base64url.`)
  }

  try {
    return JSON.parse(headerUtf8)
  } catch {
    throw new Error(
      `Can't parse: ${input}: Can't parse base64url encoded JSON inside.`
    )
  }
}

/**
 * JWT algorithm to be used in a JWT header.
 *
 * @param {import('./types.js').KeyType} keyType
 */
export function jwtAlgorithm(keyType) {
  switch (keyType) {
    case 'ed25519':
      return 'EdDSA'
    default:
      throw new Error(`Unknown KeyType "${keyType}"`)
  }
}

/**
 * Check if a UCAN is expired.
 *
 * @param {import('./types.js').UcanPayload} payload
 */
export function isExpired(payload) {
  return payload.exp <= Math.floor(Date.now() / 1000)
}

/**
 * Check if a UCAN is not active yet.
 *
 * @param {import('./types.js').UcanPayload} payload
 */
export function isTooEarly(payload) {
  if (!payload.nbf) {
    return false
  }
  return payload.nbf > Math.floor(Date.now() / 1000)
}
