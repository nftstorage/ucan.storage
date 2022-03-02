import { concatUint8, equals } from './utils.js'
import * as ed from '@noble/ed25519'
import { base58btc, utf8 } from './encoding.js'

export const BASE58_DID_PREFIX = 'did:key:z' // z is the multibase prefix for base58btc byte encoding
/** https://github.com/multiformats/multicodec/blob/e9ecf587558964715054a0afcc01f7ace220952c/table.csv#L94 */
export const EDWARDS_DID_PREFIX = new Uint8Array([0xed, 0x01])

/**
 * Convert a public key in bytes to a DID (did:key).
 *
 * @param {Uint8Array} publicKeyBytes
 */
export function publicKeyBytesToDid(publicKeyBytes) {
  const prefixedBytes = concatUint8([EDWARDS_DID_PREFIX, publicKeyBytes])

  // Encode prefixed
  return BASE58_DID_PREFIX + base58btc.encode(prefixedBytes)
}

/**
 * Convert DID to public in bytes
 *
 * @param {string} did
 */
export function didToPublicKeyBytes(did) {
  if (!did.startsWith(BASE58_DID_PREFIX)) {
    throw new Error('Please use a base58-encoded DID formatted `did:key:z...`')
  }

  const didWithoutPrefix = did.slice(BASE58_DID_PREFIX.length)
  const magicBytes = base58btc.decode(didWithoutPrefix)

  return parseMagicBytes(magicBytes).keyBytes
}

/**
 * Get did key type
 *
 * @param {string} did
 */
export function didKeyType(did) {
  const didWithoutPrefix = did.slice(BASE58_DID_PREFIX.length)
  const magicBytes = base58btc.decode(didWithoutPrefix)
  return parseMagicBytes(magicBytes).type
}

/**
 * @param {Uint8Array} key
 * @returns {{keyBytes: Uint8Array, type: import('./types.js').KeyType}}
 */
export function parseMagicBytes(key) {
  if (hasPrefix(key, EDWARDS_DID_PREFIX)) {
    return {
      keyBytes: key.slice(EDWARDS_DID_PREFIX.byteLength),
      type: 'ed25519',
    }
  }

  throw new Error('Unsupported key algorithm. Try using ed25519.')
}

/**
 * Determines if a Uint8Array has a given indeterminate length-prefix.
 *
 * @param {Uint8Array} prefixedKey
 * @param {Uint8Array} prefix
 */
export function hasPrefix(prefixedKey, prefix) {
  return equals(prefix, prefixedKey.subarray(0, prefix.byteLength))
}

/**
 * @param {string } data
 * @param {Uint8Array} signature
 * @param {string} did
 */
export function verify(data, signature, did) {
  return ed.verify(signature, utf8.decode(data), didToPublicKeyBytes(did))
}
