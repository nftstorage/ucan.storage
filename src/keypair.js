import { base64Pad } from './rfc4648.js'
import * as ed from '@noble/ed25519'
import { publicKeyBytesToDid } from './did.js'

export default class KeyPair {
  /**
   * @param {Uint8Array} privateKey
   * @param {Uint8Array} publicKey
   * @param {import("./types").KeyType} keyType
   * @param {boolean} exportable
   */
  constructor(privateKey, publicKey, keyType = 'ed25519', exportable) {
    this.publicKey = publicKey
    this.keyType = keyType
    this.exportable = exportable
    this.privateKey = privateKey
  }

  publicKeyStr() {
    return base64Pad.encode(this.publicKey)
  }

  did() {
    return publicKeyBytesToDid(this.publicKey, this.keyType)
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
      publicKey,
      'ed25519',
      false
    )
  }
}

/**
 * @param {Uint8Array} privateKeyRaw
 * @param {Uint8Array} publicKey
 */
function concatKeys(privateKeyRaw, publicKey) {
  const privateKey = new Uint8Array(64)
  for (let i = 0; i < 32; i++) {
    privateKey[i] = privateKeyRaw[i]
    privateKey[32 + i] = publicKey[i]
  }
  return privateKey
}

async function main() {
  await KeyPair.create()
}
main()
