import * as ed from '@noble/ed25519'
import { publicKeyBytesToDid } from './did.js'
import { base64Pad } from './encoding.js'

export class KeyPair {
  /**
   * @param {Uint8Array} privateKey
   * @param {Uint8Array} publicKey
   */
  constructor(privateKey, publicKey) {
    this.publicKey = publicKey
    this.privateKey = privateKey
    this.pubStr = undefined
  }

  static async create() {
    const privateKeyRaw = ed.utils.randomPrivateKey()
    const publicKey = await ed.getPublicKey(privateKeyRaw)

    return new KeyPair(privateKeyRaw, publicKey)
  }

  /**
   * Create keypair from exported private key
   *
   * @param {string} key
   */
  static async fromExportedKey(key) {
    const privateKey = base64Pad.decode(key)
    return new KeyPair(privateKey, await ed.getPublicKey(privateKey))
  }

  publicKeyStr() {
    if (this.pubStr === undefined) {
      this.pubStr = base64Pad.encode(this.publicKey)
    }
    return this.pubStr
  }

  did() {
    return publicKeyBytesToDid(this.publicKey)
  }

  /**
   *
   * @param {Uint8Array} msg
   */
  sign(msg) {
    return ed.sign(msg, this.privateKey)
  }

  export() {
    return base64Pad.encode(this.privateKey)
  }
}
