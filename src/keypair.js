import * as ed from '@noble/ed25519'
import { publicKeyBytesToDid } from './did.js'
import { base64Pad } from './encoding.js'

/**
 * A private Ed25519 signing key and its corresponding public key.
 */
export class KeyPair {
  /**
   * Create a new KeyPair object from raw key byte buffers.
   *
   * See {@link create} for key generation, and {@link fromExportedKey} to load previously generated keys.
   *
   * @param {Uint8Array} privateKey - private key bytes
   * @param {Uint8Array} publicKey - public key bytes
   */
  constructor(privateKey, publicKey) {
    this.publicKey = publicKey
    this.privateKey = privateKey
    this.pubStr = undefined
  }

  /**
   * Generate a new KeyPair.
   *
   * @returns {Promise<KeyPair>} a Promise that resolves to the generated KeyPair
   */
  static async create() {
    const privateKeyRaw = ed.utils.randomPrivateKey()
    const publicKey = await ed.getPublicKey(privateKeyRaw)

    return new KeyPair(privateKeyRaw, publicKey)
  }

  /**
   * Create a KeyPair from exported private key (see {@link export}).
   *
   * @param {string} key - a private key, as encoded by {@link export}
   * @returns {Promise<KeyPair>} a Promise that resolves to the loaded KeyPair object
   */
  static async fromExportedKey(key) {
    const privateKey = base64Pad.decode(key)
    return new KeyPair(privateKey, await ed.getPublicKey(privateKey))
  }

  /**
   * Return the Base64 encoded public key
   *
   * @returns {string} the public key, as a base64 encoded string (padded).
   */
  publicKeyStr() {
    if (this.pubStr === undefined) {
      this.pubStr = base64Pad.encode(this.publicKey)
    }
    return this.pubStr
  }

  /**
   * Create did from public key
   *
   * @returns {string} the public key, encoded into a `did:key:` DID string.
   */
  did() {
    return publicKeyBytesToDid(this.publicKey)
  }

  /**
   * Create a signature of `msg` using the private signing key.
   *
   * @param {Uint8Array} msg - a message to sign
   * @returns {Promise<Uint8Array>} a Promise that resolves to the signature (as a Uint8Array)
   */
  sign(msg) {
    return ed.sign(msg, this.privateKey)
  }

  /**
   * Export the private key (e.g. to save to disk). If saving to disk, MUST be stored securely!
   * See {@link fromExportedKey} for loading a KeyPair from an exported key.
   *
   * @returns {string} the encoded private key string
   */
  export() {
    return base64Pad.encode(this.privateKey)
  }
}
