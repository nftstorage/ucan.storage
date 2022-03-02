import type { KeyPair } from './keypair.js'
import type {
  CapabilityEscalationError,
  CapabilityParseError,
  CapabilityUnrelatedError,
} from './errors.js'

export type KeyType = 'rsa' | 'ed25519' | 'bls12-381'
export type Fact = Record<string, unknown>

export interface Capability {
  with: string
  can: string
  [constrain: string]: unknown
}

/**
 * ### Header
 *
 * `alg`, Algorithm, the type of signature.
 * `typ`, Type, the type of this data structure, JWT.
 * `ucv`, UCAN version.
 */
export interface UcanHeader {
  alg: string
  typ: string
  ucv: string
}

/**
 * ### Payload
 *
 * `aud`, Audience, the ID of who it's intended for.
 * `exp`, Expiry, unix timestamp of when the jwt is no longer valid.
 * `fct`, Facts, an array of extra facts or information to attach to the jwt.
 * `iss`, Issuer, the ID of who sent this.
 * `nbf`, Not Before, unix timestamp of when the jwt becomes valid.
 * `nnc`, Nonce, a randomly generated string, used to ensure the uniqueness of the jwt.
 * `prf`, Proofs, nested tokens with equal or greater privileges.
 * `att`, Attenuation, a list of resources and capabilities that the ucan grants.
 */
export interface UcanPayload<Prf = string> {
  iss: string
  aud: string
  exp: number
  nbf?: number
  nnc?: string
  att: Capability[]
  fct?: Fact[]
  prf: Prf[]
}

export interface UcanParts<Prf = string> {
  header: UcanHeader
  payload: UcanPayload<Prf>
}

export interface Ucan<Prf = string> {
  header: UcanHeader
  payload: UcanPayload<Prf>
  signature: Uint8Array
}

export interface BuildParams {
  // from
  issuer: KeyPair
  // to
  audience: string

  capabilities: Capability[]
  // time bounds
  lifetimeInSeconds?: number // expiration overrides lifetimeInSeconds
  expiration?: number
  notBefore?: number

  // proofs / other info
  facts?: Fact[]
  proofs?: string[]
  addNonce?: boolean
}

export interface BuildPayload extends Omit<BuildParams, 'issuer'> {
  // from did string
  issuer: string
}

/**
 * Validation options
 */
export interface ValidateOptions {
  checkIssuer?: boolean
  checkIsExpired?: boolean
  checkIsTooEarly?: boolean
  checkSignature?: boolean
}

export interface CapabilitySemantics<A> {
  /**
   * Try to parse a capability into a representation used for
   * delegation & returning in the `capabilities` call.
   */
  tryParsing: (cap: Capability) => A | CapabilityParseError
  /**
   * This figures out whether a given `childCap` can be delegated from `parentCap`.
   * There are three possible results with three return types respectively:
   * - `A`: The delegation is possible and results in the rights returned.
   * - `CapabilityUnrelatedError<A>`: The capabilities from `parentCap` and `childCap` are unrelated and can't be compared nor delegated.
   * - `CapabilityEscalationError<A>`: It's clear that `childCap` is meant to be delegated from `parentCap`, but there's a rights escalation.
   */
  tryDelegating: (
    parentCap: A,
    childCap: A
  ) => A | CapabilityUnrelatedError<A> | CapabilityEscalationError<A>
  // TODO builders
}

/**
 * Storage Semantics
 */

export interface StorageSemantics {
  with: string
  can: 'upload/IMPORT' | 'upload/*'
  /**
   * Constrain an import by [multihash](https://github.com/multiformats/multihash)
   */
  mh?: string
}

export type StorageCapability = UploadAll | UploadImport

/**
 * The `upload/*` action allows access to **ALL** upload operations under the specified resource in the `with` field.
 */
export interface UploadAll extends Capability {
  with: string
  can: 'upload/*'
}

/**
 * The `upload/IMPORT` action allows access to importing a CARs under the specified resource in the `with` field.
 */
export interface UploadImport extends Capability {
  with: string
  can: 'upload/IMPORT'
  /**
   * Constrain an import by [multihash](https://github.com/multiformats/multihash)
   */
  mh: string
}

export interface UcanStorageOptions extends Omit<BuildParams, 'capabilities'> {
  // from did string
  capabilities: StorageCapability[]
}
