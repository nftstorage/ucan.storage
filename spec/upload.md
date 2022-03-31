# upload@2.0 protocol

## Abstract

This specifiaction defines protocol for _access_ and _store_ services as set of operations in [IPLD Schema][] which can be executed via [UCAN invocation]. This has following implications:

1. Operations can be encoded as [IPLD][] blocks.
2. Operations can be addressed by a derived, globaly unique, identifiers - [CID][]s.
3. Requests _(containing multiple operations)_ can be efficiently transported using Content Archives ([CAR][]s) omitting redundant blocks (e.g. serivie issued UCANs, proofs that had already been transported).
4. Can work over libp2p or other long lived connections.


## Transport

Protocol is designed with a single HTTP endpoint in mind which client can `POST` requests with arbitrary number of operations packed as a single [CAR][] file.


That said specification is not tied to this design choice. Implementation MAY choose to encode operations as HTTP requests targeting different endpoints. Alternatively protocol may be exposed using GraphQL interface. More broadly as long as requests can be parsed into data structures corresponding to [operations](#Operations) transport format should not matter.

## Requests

Requests are represented as [UCAN invocation][]s in [IPLD][] encoding. Therefor they:

1. MAY contain one or more operations _(represented as [capabilities][UCAN capabilities])_.
2. MUST have cryptographic proofs of access.


Request is defined as a following `UCAN` type in [IPLD schema][]:

```ipldsch
type UCAN struct {
  capabilities [Capability]
  issuer DID
  audience DID
  expires optional Time
  begins optional Time
  proofs [&UCAN]
}


type Capability union {
  -- account access service
  | Identify  "access/identify"
  | Authorize "access/authorize"
  | Revoke    "access/revoke"
  -- storage service
  | Add       "store/add"
  | Remove    "store/remove"
} representation inline {
  discriminantKey "can"
}

type DID string -- did:key:pub_key
type Time int -- milliseconds since the UNIX epoch
```

## Responses

Service response is represenented as an IPLD map in which keys are `Operation` [CID][]s (V1 in DAG-CBOR encoding sha-256 multihash and base32 encoding) and values are corresponding responses

```ipldsch
type Response { CID: &Any }

-- V1 CID with sha-256 multihash in base32 
-- of DAG-CBOR encoding `Capability`
type CID string
```

Operations with no responses are omitted.

## Operations

### Identify

Operation identifies an "account" with a specific [did:key]. Account can be an arbitrary identifier e.g email address, wallet address etc. Serivce MAY associate [did:key] with that account accross sessions e.g. by persisting it.


```ipldsch
type Identify struct {
  -- did:key:user_pubkey
  with DID
  -- mailto:contact@email.com
  as ID
  
  can "access/identify"
}

type ID string
```

#### Constraints

Operation MUST be enclosed in a [UCAN][] with a following requirements:

1. UCAN `issuer` MUST be implicitly or explicitly **trusted** source _(e.g. trusted email verification service)_.

   > Implicitly trusted source implies that issuer DID is in some trusted partner service list.

1. UCAN `proofs` MUST contain a self-issued UCAN with identical capability.

   > This provides a proof that claimed `ID` owner has access to a private key corresponding to the `DID` 

1. If UCAN `issuer` is not implecitly **trusted** it MUST contain service issued `UCAN` token granting explicit trust.


#### Verification Service(s)

Identity verification service is intentionally decoupled from identification service to enable indpendent services take on job of out of bound verification e.g. send confirmation email to that user MUST click in order to obtain UCAN with `Identify` operation.

General flow is client self-issues `Identify` UCAN with _trusted verification_ service as an `audience`. Given that UCAN is issued by a DID it MUST be signed by corresponding private key _(which proves clients access)_. Service then performs out of bound verification _(e.g. confirmation email)_ and derives UCAN with exact same capability, but this time client DID as an `audience` and service `DID` as an issuer. Result as a UCAN chain loop proving that:

1. Client has access to claimed `DID` private key.
2. Service has verified that client has access to claimed `ID` (e.g. email)


If _verifier_ is **implicitly trusted** by a service UCAN issued by _verifier_ MAY be used with it. Otherwise verifier MAY obtain **expilicit** trust from service by getting _unrestricted_ UCAN with `Identify` capability and provide that in `proofs` 

```json
{
  "can": "access/identify",
  "with": "*",
  "as": "*"
}
```

> Issuing unrestricted `Identity` capabilties is out of scope for this protocol and probably should include building a trust. 


#### Invocation

Please not that `Identify` operation invocation MAY be performed by:

1. Client as after verification they have UCAN with a proof which they can address our service.
2. Verifier on clients behalf. Instead of returning client a UCAN back it could instead / additionally issue UCAN to a service and pass it on.
3. Any other intermidiery with access to the UCAN.

#### Verification without services

Verification service(s) CAN bridge the gap between web3 and web3 systems. In web3 native systems `Identify` UCANs can be self-issued. E.g In wallet base authentification system client MAY identify wallet address via `DID` by issueing first UCAN with DID private key and second via wallet key.

### Authorize

Client MAY invoke `Authorize` operation in order to obtain/recover [UCAN][] token from the service for a specific [did:key][] with specificed capabilities.

```ipldsch
type Authorize struct {
  -- did:key:public_key
  with DID
  can "access/authorize"
  capabilities optional [Capability]
  
  -- Self issued token or delegated one
  proof optional &UCAN
}

type Capability union {
  Add "store/add"
  Remove "store/remove"
} representation inline {
  discriminantKey "can"
}
```

#### Constraints

UCAN with `Authorize` capability MUST be either:

1. Self-issued _([UCAN][] issuer is the same [did:key][] as DID in `with` field)_
2. Delegated from self-issued UCAN _(E.g one could give rights to an admin to list capabilities or rotate UCANs)_

#### Response

Service MUST respond with [UCAN][] token containing requested capabilities if following conditions are met:

1. `Authorize` request is authorized _(is self-issued [UCAN][] or derived from self-issued)_ 
2. [did:key][] has requested or greater capabilities.

Service MAY respond with UCAN containing lesser capabilities than requested, but such a response SHOULD be marked as error and not a success.

Service MUST NOT respond with greater capabilities than requested, as it MAY lead to leaking capabilities during delegation.

If `capabilities` field is omited in a request it is up to a service to decide which capabilities to include in the response.

#### Capabilities

Service MUST support `Add` and `Remove` capabilities. We may add more capabilities over time.

##### Add

Capability to add content (by [CID][]) to a given [did:key][].


```ipldsch
type Add struct {
  can "store/add"
  -- did:key:pub_key
  with DID
  -- Maybe be restrited to a specific CID
  cid optional &Any
}
```

##### Remove

Capability to remove a content (by [CID][]) to a given [did:key][]

```ipldsch
type Remove struct {
  can "store/add"
  -- did:key:pub_key
  with DID
  -- MAY be restricted to a specific CID
  link optional &Any
}
```

### Add

Client MAY add content to a `DID` via request containing `Add` operation.

```ipldsch
type Add struct {
  can "store/add"
  -- did:key:user
  with DID
  link &Any
}
```

#### Constraints

[UCAN][] containing `Add` MUST:

- Include a proof with service issued `Add` capability.


Service MAY restrict [CID][] to specific coders and hashes.

> In the implementation of uploads@2.0 service we will only accept [CID]s witch [CAR][] code and sha256 multihash digest, so we could derive S3 presigned URLs for client uploads. In the future we may extend support for other types of CIDs.


#### Response

Service MUST respond to `Add` request with `AddResult`. `AddOk` variant represents a receipt that `Add` was completed succefully, which MAY happen if service already has such content available. `Upload` variant is returned with a URL where client should upload content to be added. `QuotaViolation` variant is returned if account associated with [did:key][] has not enough space.


```ipldsh
type AddResult union {
  Added "ok/add"
  Upload "need/upload"
  QuotaViolation "error/quota"
} representation inline {
  discriminantKey "can"
}

-- Receipt from service telling it is done.
type AddOk struct {
  can "ok/add"
  with DID
  link &Any
}

-- S3 presigned URL content should be uploaded to.
type Upload struct {
  can "need/upload"
  with DID
  link &Any
  to URL
}

type QuotaViolation struct {
 can "error/quota"
 with DID
 link &Any
}

type URL string
```

`Add` operation can be in 3 different states: `ok`, `pending`, `error`. Service receiving `Add` request SHOULD record:

1. `CID` of the content been added.
2. `DID` of content is been added to.
3. `status` of the operation which is either `ok` or `pending`


Here is the roughly the steps service is expected to perform

1. If service has content under different user & this user has necessary space set status to `ok` and reduce space accordingly.
1. If user has content under different [did:key] set status to `ok`.
1. If user has no space and does not has this content in any other [did:key] deny service.
1. If user has space and service has no such content set status to `pending` and return presigned URL.


### Remove

Client MAY remove content from a `DID` via request containing `Remove` operation.

```ipldsch
type Remove struct {
  can "store/add"
  -- did:key:user
  with DID
  link &Any
}
```

Remove operation can not fail and has no response.

[IPLD Schema]:https://ipld.io/docs/schemas/using/authoring-guide/
[ed25519]:https://ed25519.cr.yp.to/
[UCAN]:https://whitepaper.fission.codes/access-control/ucan
[did:key]:https://w3c-ccg.github.io/did-method-key/
[CAR]:https://ipld.io/specs/transport/car/carv1/
[IPLD]:https://ipld.io/
[CID]:https://docs.ipfs.io/concepts/content-addressing/
[UCAN capabilities]:https://github.com/ucan-wg/spec#325-attenuations
[UCAN invocation]:https://github.com/ucan-wg/spec#521-invocation-recipient-validation