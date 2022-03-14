import type { KeyPair } from './keypair.js'
import type {
  CapabilityEscalationError,
  CapabilityParseError,
  CapabilityUnrelatedError,
} from './errors.js'

export type KeyType = 'rsa' | 'ed25519' | 'bls12-381'
export type Fact = Record<string, unknown>

/**
 * A Capability represents something that a token holder is authorized to do.
 * See [Capability Scope](https://github.com/ucan-wg/spec#24-capability-scope) in the UCAN spec.
 */
export interface Capability {
  /** A UCAN "resource pointer" that specifies what resource the user is authorized to manipulate. */
  with: string

  /** A action that the user is authorized to perform against the specified resource. */
  can: string

  /** Optional constraints (e.g. multihash of upload).
   * See [the UCAN.Storage spec](https://github.com/nftstorage/ucan.storage/blob/main/spec.md) for details. */
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

export interface UcanPayload<Prf = string> {
  /**
   * DID of the issuer
   */
  iss: string
  /**
   * Audience, the ID of who it's intended for
   */
  aud: string
  /**
   * Expiry, unix timestamp of when the jwt is no longer valid.
   */
  exp: number
  /**
   * Not Before, unix timestamp of when the jwt becomes valid.
   */
  nbf?: number
  /**
   * Nonce, a randomly generated string, used to ensure the uniqueness of the jwt.
   */
  nnc?: string
  /**
   * Attenuation, a list of resources and capabilities that the ucan grants.
   */
  att: Capability[]
  /**
   * Facts, an array of extra facts or information to attach to the jwt.
   */
  fct?: Fact[]
  /**
   * Proofs, nested tokens with equal or greater privileges.
   */
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

export interface UcanWithJWT extends Ucan {
  jwt: string
}

/**
 * Parameters for the internal `build` function, which creates new UCAN tokens.
 */
export interface BuildParams {
  /** Signing key for the token issuer (who the token is "from") */
  issuer: KeyPair

  /** DID string containing the public key of the recipient (who the token is "for") */
  audience: string

  /** Capabilities granted by the token */
  capabilities: Capability[]

  /** How long the token should be valid (in seconds). Ignored if `expiration` is set explicitly. */
  lifetimeInSeconds?: number

  /** Expiration time (as unix timestamp). If set, overrides `lifetimeInSeconds` */
  expiration?: number

  /**
   * Earliest time (as unix timestamp) that the token should be considered valid. If set, must be < `expiration`. If not set, any time before expiration will be considered valid.
   */
  notBefore?: number

  /** Optional collection of arbitrary "facts" attached to the token. */
  facts?: Fact[]

  /**
   * Array of "proofs" (encoded UCAN tokens) used to validate delegated UCAN chains.
   */
  proofs?: string[]

  /**
   * Reserved for future use.
   */
  addNonce?: boolean
}

export interface BuildPayload extends Omit<BuildParams, 'issuer'> {
  // from did string
  issuer: string
}

/**
 * Returned by the internal {@link sign} function. Contains UCAN in it's "object form", as well as the encoded JWT and signature buffer.
 */
export interface SignedUCAN<Prf = string> {
  header: UcanHeader
  payload: UcanPayload<Prf>
  signature: string
  jwt: string
}

/**
 * Validation options, used by the {@link validate} function to determine which validation checks to perform.
 *
 * Note that by default, {@link validate} will perform all checks. You may skip a validation check by setting one of
 * the ValidateOptions to `false`.
 */
export interface ValidateOptions {
  /** Check that the `iss` field contains a public key with the correct key type for the JWT signing algorithm. */
  checkIssuer?: boolean

  /** Check that the token's expiration time (if set) has not yet arrived. */
  checkIsExpired?: boolean

  /** Check that the token's "not before" time (if set) is in the past. */
  checkIsTooEarly?: boolean

  /** Check that the token's signature is valid. Please think carefully before you disable this! */
  checkSignature?: boolean
}

export interface ValidateResult {
  header: UcanHeader
  payload: UcanPayload<string>
  signature: Uint8Array
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

/** Capabilities for UCAN.Storage services (e.g. NFT.Storage, Web3.Storage) */
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
  mh?: string
}

/**
 * Options used by the {@link build} function when creating new UCAN tokens.
 */
export interface UcanStorageOptions extends Omit<BuildParams, 'capabilities'> {
  /** Capabilities (permissions) for storage services that should be granted by this UCAN token. */
  capabilities: StorageCapability[]
}
