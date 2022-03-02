import * as ucan from './ucan-storage.js'
import { UcanChain } from './ucan-chain.js'
import { KeyPair } from './keypair.js'

export class Service {
  /**
   * @param {KeyPair} keypair
   */
  constructor(keypair) {
    this.keypair = keypair
  }

  /**
   * @param {string} key
   */
  static async fromPrivateKey(key) {
    const kp = await KeyPair.fromExportedKey(key)
    return new Service(kp)
  }

  static async create() {
    return new Service(await KeyPair.create())
  }

  /**
   * @param {string} encodedUcan
   * @param {import('./types').ValidateOptions} options
   */
  async validate(encodedUcan, options) {
    const token = await UcanChain.fromToken(encodedUcan, options)

    if (token.audience() !== this.did()) {
      throw new Error('Invalid UCAN: Audience does not match this service.')
    }

    return token
  }

  /**
   * @param {UcanChain} ucan
   */
  static caps(ucan) {
    // return ucans.capabilities(ucan, storageSemantics)
  }

  did() {
    return this.keypair.did()
  }

  /**
   * @param {any} did
   */
  ucan(did) {
    return ucan.build({
      issuer: this.keypair,
      audience: did,
      capabilities: [{ with: `storage://${did}`, can: 'upload/*' }],
    })
  }
}
