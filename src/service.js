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
   * It checks the full validity of the chain, that root issuer and target audience is the service did.
   *
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
   * @param {string} did
   */
  ucan(did) {
    const ttl = 1_209_600 // 2 weeks

    return ucan.build({
      issuer: this.keypair,
      audience: did,
      capabilities: [{ with: `storage://${did}`, can: 'upload/*' }],
      lifetimeInSeconds: ttl,
    })
  }

  /**
   * @param {string} encodedUcan
   * @param {string} did
   */
  async refresh(encodedUcan, did) {
    const token = await UcanChain.fromToken(encodedUcan, {})

    if (token.issuer() !== did) {
      throw new Error('Issuer does not match this user in service.')
    }

    await this.validate(encodedUcan, {
      with: `storage://${did}`,
      can: 'upload/*',
    })

    return this.ucan(did)
  }
}
