import * as uint8arrays from 'uint8arrays'

export const BASE58_DID_PREFIX = 'did:key:z' // z is the multibase prefix for base58btc byte encoding
/** https://github.com/multiformats/multicodec/blob/e9ecf587558964715054a0afcc01f7ace220952c/table.csv#L94 */
export const EDWARDS_DID_PREFIX = new Uint8Array([0xed, 0x01])
/**
 * Convert a public key in bytes to a DID (did:key).
 *
 * @param {Uint8Array} publicKeyBytes
 * @param {import('./types').KeyType} type
 */
export function publicKeyBytesToDid(publicKeyBytes, type = 'ed25519') {
  const prefixedBytes = uint8arrays.concat([EDWARDS_DID_PREFIX, publicKeyBytes])

  // Encode prefixed
  return BASE58_DID_PREFIX + uint8arrays.toString(prefixedBytes, 'base58btc')
}
