import * as ucan from './ucan-storage.js'
import { UcanChain } from './ucan-chain.js'
import { KeyPair } from './keypair.js'
import { storageSemantics } from './semantics.js'

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
   * Validates UCAN for capability
   *
   * @param {string} encodedUcan
   * @param {import('./types.js').Capability} capability
   * @returns {Promise<UcanChain>} Returns the root ucan for capability
   */
  async validate(encodedUcan, capability) {
    const token = await UcanChain.fromToken(encodedUcan, {})

    if (token.audience() !== this.did()) {
      throw new Error('Invalid UCAN: Audience does not match this service.')
    }

    const origin = token.claim(capability, storageSemantics)

    if (origin.issuer() !== this.did()) {
      throw new Error('Invalid UCAN: Root issuer does not match this service.')
    }

    return origin
  }

  /**
   * @param {string} encodedUcan
   */
  async validateFromCaps(encodedUcan) {
    const token = await UcanChain.fromToken(encodedUcan, {})
    if (token.audience() !== this.did()) {
      throw new Error('Invalid UCAN: Audience does not match this service.')
    }

    const caps = token.caps(storageSemantics)

    if (caps[0].root.issuer() !== this.did()) {
      throw new Error('Invalid UCAN: Root issuer does not match this service.')
    }

    return caps[0]
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
