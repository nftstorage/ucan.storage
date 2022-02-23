import * as ucan from 'ucan-storage'
import * as ucans from 'ucans'
import { storageSemantics } from 'ucan-common'
import { UcanChain } from './ucan-chain.js'

export class Service {
  /**
   * @param {ucan.KeyPair} keypair
   */
  constructor(keypair) {
    this.keypair = keypair
  }

  /**
   * @param {string} key
   */
  static async fromPrivateKey(key) {
    const kp = await ucan.KeyPair.fromExportedKey(key)
    return new Service(kp)
  }

  static async create() {
    return new Service(await ucan.KeyPair.create())
  }

  /**
   * @param {string} encodedUcan
   * @param {import('ucan-storage/dist/src/types').ValidateOptions} options
   */
  async validate(encodedUcan, options) {
    const token = await UcanChain.fromToken(encodedUcan, options)

    if (token.audience() !== this.did()) {
      throw new Error('Invalid UCAN: Audience does not match this service.')
    }

    return token
  }

  /**
   * @param {ucans.Chained} ucan
   */
  static caps(ucan) {
    return ucans.capabilities(ucan, storageSemantics)
  }

  did() {
    return this.keypair.did()
  }

  /**
   * @param {any} did
   */
  ucan(did) {
    return ucan.Ucan({
      issuer: this.keypair,
      audience: did,
      capabilities: [{ with: `storage://${did}`, can: 'upload/*' }],
    })
  }
}
