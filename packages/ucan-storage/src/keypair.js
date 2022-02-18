import { base64Pad } from './rfc4648.js'
import * as ed from '@noble/ed25519'
import { publicKeyBytesToDid } from './did.js'

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

  static async create() {
    const privateKeyRaw = ed.utils.randomPrivateKey()
    const publicKey = await ed.getPublicKey(privateKeyRaw)

    return new KeyPair(
      //   concatKeys(privateKeyRaw, publicKey),
      privateKeyRaw,
      publicKey
    )
  }
}

// /**
//  * @param {Uint8Array} privateKeyRaw
//  * @param {Uint8Array} publicKey
//  */
// function concatKeys(privateKeyRaw, publicKey) {
//   const privateKey = new Uint8Array(64)
//   for (let i = 0; i < 32; i++) {
//     privateKey[i] = privateKeyRaw[i]
//     privateKey[32 + i] = publicKey[i]
//   }
//   return privateKey
// }

// async function main() {
//   await KeyPair.create()
// }
// main()
