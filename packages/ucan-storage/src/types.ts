import type { KeyPair } from './keypair'

export type KeyType = 'rsa' | 'ed25519' | 'bls12-381'
export type Fact = Record<string, unknown>

export interface Capability {
  with: string
  can: string
}

export type StorageCapability = UploadAll | UploadImport

/**
 * The `upload/*` action allows access to **ALL** upload operations under the specified resource in the `with` field.
 */
export interface UploadAll {
  with: string
  can: 'upload/*'
}

/**
 * The `upload/IMPORT` action allows access to importing a CARs under the specified resource in the `with` field.
 */
export interface UploadImport {
  with: string
  can: 'upload/IMPORT'
  /**
   * Constrain an import by [multihash](https://github.com/multiformats/multihash)
   */
  mh: string
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
  att: StorageCapability[]
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
  signature: string
}

export interface BuildParams {
  // from
  issuer: KeyPair
  // to
  audience: string

  capabilities: StorageCapability[]
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
