import type KeyPair from './keypair'

export type KeyType = 'rsa' | 'ed25519' | 'bls12-381'
export type Fact = Record<string, unknown>

/**
 * {
  "cap":"PUT"
  "id": "/uploads/did:key:gozala/"
}
 */
export type Capability = {
  // resource
  [rsc: string]: unknown
  // capability / operation
  cap: string
}

/**
 * ### Header
 *
 * `alg`, Algorithm, the type of signature.
 * `typ`, Type, the type of this data structure, JWT.
 * `ucv`, UCAN version.
 */
export type UcanHeader = {
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
export type UcanPayload<Prf = string> = {
  iss: string
  aud: string
  exp: number
  nbf?: number
  nnc?: string
  att: Array<Capability>
  fct?: Array<Fact>
  prf: Array<Prf>
}

export interface UcanParts<Prf = string> {
  header: UcanHeader
  payload: UcanPayload<Prf>
}

export type Ucan<Prf = string> = {
  header: UcanHeader
  payload: UcanPayload<Prf>
  signature: string
}

export interface BuildParams {
  //from
  issuer: KeyPair
  // to
  audience: string

  capabilities?: Array<Capability>
  // time bounds
  lifetimeInSeconds?: number // expiration overrides lifetimeInSeconds
  expiration?: number
  notBefore?: number

  // proofs / other info
  facts?: Array<Fact>
  proofs?: Array<string>
  addNonce?: boolean
  // in the weeds
  ucanVersion?: string
}

export interface BuildPartsParams {
  keyType: KeyType
  //from did string
  issuer: string
  // to
  audience: string

  capabilities?: Array<Capability>
  // time bounds
  lifetimeInSeconds?: number // expiration overrides lifetimeInSeconds
  expiration?: number
  notBefore?: number

  // proofs / other info
  facts?: Array<Fact>
  proofs?: Array<string>
  addNonce?: boolean
  // in the weeds
  ucanVersion?: string
}
