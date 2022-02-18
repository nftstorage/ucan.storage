import * as ucan from 'ucan-storage'
import * as ucans from 'ucans'
import { storageSemantics } from 'ucan-common'

export class Service {
  /**
   * @param {any} privateKey
   */
  constructor(privateKey) {
    this.privateKey = privateKey
  }

  /**
   * @param {any} did
   */
  async ucan(did) {}

  /**
   * @param {string} encodedUcan
   * @param {import('ucan-storage/dist/src/types').ValidateOptions} options
   */
  static async verify(encodedUcan, options) {
    const token = await UcanChained.fromToken(encodedUcan, options)

    return token
  }

  /**
   * @param {ucans.Chained} ucan
   */
  static caps(ucan) {
    return ucans.capabilities(ucan, storageSemantics)
  }
}

export class UcanChained {
  /**
   * @param {string} encoded
   * @param {import('ucan-storage/dist/src/types').Ucan<UcanChained>} decoded
   */
  constructor(encoded, decoded) {
    this._encoded = encoded
    this._decoded = decoded
  }

  /**
   * @param {string} encodedUcan
   * @param {import('ucan-storage/dist/src/types').ValidateOptions} options
   * @returns {Promise<UcanChained>}
   */
  static async fromToken(encodedUcan, options) {
    const token = await ucan.validate(encodedUcan, options)

    // parse proofs recursively
    const proofs = await Promise.all(
      token.payload.prf.map((encodedPrf) =>
        UcanChained.fromToken(encodedPrf, options)
      )
    )

    // check sender/receiver matchups. A parent ucan's audience must match the child ucan's issuer
    const incorrectProof = proofs.find(
      (proof) => proof.audience() !== token.payload.iss
    )
    if (incorrectProof) {
      throw new Error(
        `Invalid UCAN: Audience ${incorrectProof.audience()} doesn't match issuer ${
          token.payload.iss
        }`
      )
    }

    const ucanTransformed = {
      ...token,
      payload: {
        ...token.payload,
        prf: proofs,
      },
    }

    return new UcanChained(encodedUcan, ucanTransformed)
  }

  /**
   * A representation of delegated capabilities throughout all ucan chains
   *
   * @template A
   * @param {(ucan: import('ucan-storage/dist/src/types').Ucan, reducedProofs: () => Iterable<A>) => A} reduceLayer
   * @returns {A}
   */
  reduce(reduceLayer) {
    // eslint-disable-next-line unicorn/no-this-assignment
    const that = this

    function* reduceProofs() {
      for (const proof of that.proofs()) {
        // eslint-disable-next-line unicorn/no-array-reduce
        yield proof.reduce((accumulator, element) =>
          reduceLayer(accumulator, element)
        )
      }
    }

    return reduceLayer(this.payload(), reduceProofs)
  }

  /**
   * @returns { UcanChained[]} `prf`: Further UCANs possibly providing proof or origin for some capabilities in this UCAN.
   */
  proofs() {
    return this._decoded.payload.prf
  }

  /**
   *
   * This is the identity this UCAN transfers rights to.
   * It could e.g. be the DID of a service you're posting this UCAN as a JWT to,
   * or it could be the DID of something that'll use this UCAN as a proof to
   * continue the UCAN chain as an issuer.
   */
  audience() {
    return this._decoded.payload.aud
  }

  /**
   * The UCAN must be signed with the private key of the issuer to be valid.
   */
  issuer() {
    return this._decoded.payload.iss
  }

  /**
   * The payload the top level represented by this Chain element.
   * Its proofs are omitted. To access proofs, use `.proofs()`
   */
  payload() {
    return {
      ...this._decoded,
      payload: {
        ...this._decoded.payload,
        prf: [],
      },
    }
  }
}
