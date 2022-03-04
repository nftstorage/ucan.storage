# UCAN.storage

This project defines a [specification][spec] for delegated authorization of decentralized storage services using [UCAN][ucan-intro], or User Controlled Authorization Networks.

UCAN.storage was designed to be used with [NFT.Storage](https://nft.storage) and [Web3.Storage](https://web3.storage), which both provide storage services backed by the [Filecoin](https://filecoin.io) network, with content retrieval via the [InterPlanetary File System (IPFS)](https://ipfs.io).

This repository also contains the reference implementation of the [spec][spec], in the form of a JavaScript package called `ucan-storage`. See the [Use cases](#use-cases) section below to see how it can be used, along with some code snippets.

## How it works

Authorization using UCANs works differently than many other authorization schemes, so it's worth taking a moment to understand the terms and concepts involved.

First, we have a **storage service**, for example, [NFT.Storage](https://nft.storage). Normally (without UCAN), when a user signs up for an account at NFT.Storage, the service will give them an API token to authenticate and authorize uploads. This is standard Web 2 auth, and it works great, but it has some limitations, especially if you want to use NFT.Storage to provide services for your own end users.

For example, if you're building an NFT marketplace and want users to upload art to NFT.Storage before minting, you can't put your API token into the source code for your web application without exposing it to the world. Since your API token includes more permissions than just uploading, like deleting uploads from your account, this isn't a great solution. You could work around this by running a proxy server that hides your token from your users and attaches it to storage requests, but this means you need to relay all traffic through your server and pay for bandwidth costs.

UCAN provides a way for the storage service to issue a special kind of authorization token called a UCAN token. UCAN tokens can be used to derive "child" UCAN tokens, which can have a subset of the permissions encoded in the "parent" UCAN.

UCAN tokens are standard [JSON Web Tokens (JWTs)][jwt] with some additional properties that allow the kind of delegated chains of authority we've been describing. The [UCAN data structure][ucan-data-structure] specifies some required properties of the JWT payload, some of which, like `iss` and `aud` are standard fields in the JWT spec.

Participants in the UCAN auth flow are identified by a **keypair**, which is a **private signing key** with a corresponding **public verification key**. Each user or service involved in the flow will have their own keypair. The public key for each user or service is encoded into a [Decentralized Identity Document (DID)][did-overview], using the [did:key method][did-key], which encodes the public key into a compact string of the form `did:key:<encoded-public-key>`. These DID strings are used to identify each of the participants in the UCAN flow.

The `iss` or "issuer" field contains the public key that issued the token, encoded as a DID. The public key can be used to verify the token's signature, which must be created with the corresponding private signing key.

The `aud` or "audience" field contains the public key that should _recieve_ the token.

The `nbf` or "not before" and `exp` or "expiry" fields contain [Unix timestamps][unix-ts] that can be used to control the time window during which the token should be considered valid.

The `prf` or "proof" field contains the "chain of proofs" that validates the delegated chain of authority.

The `att` or "attenuations" field specifies the permissions that the token should grant to the bearer. These are described in the [UCAN.Storage spec][spec] and can be hand-waved away for now.

To illustrate the authorization flow, let's walk through an example using NFT.Storage as the storage service and an NFT marketplace that wants to allow their users to upload to NFT.Storage.

First, the marketplace will generate a keypair and register their DID with the storage service, then ask the service to issue them a **root token**. The root token is a UCAN token that encodes all the permissions that the marketplace account is allowed to perform. The `iss` field of the root token will be the DID for the storage service, and the `aud` field will be the DID for the marketplace.

When an end-user logs into the marketplace and wants to upload to NFT.Storage, the marketplace can use their root token to create a **user token**. This time, the `iss` field contains the DID for the marketplace, since they are the one issuing the token, and the `aud` field contains the DID of the end user. The `prf` or "proof" field of the user token will contain a copy of the marketplace's root token, to verify that they actually have the permissions they're attempting to delegate. The root token is safe to share with the end-user, because it cannot be "redeemed" for storage services without the marketplace's private key.

When issuing the user token, the marketplace can choose to grant all the permissions that they have access to via the root token, or they can grant a subset of the permissions. The marketplace can also set an expiration time for the user tokens, so that a lost or compromised token will eventually "time out." See the [UCAN.Storage spec][spec] for more about the permissions available.

Once a marketplace end-user has a user token, they'll create one last token, a **request token** that authorizes their upload request to the NFT.Storage service. The request token is generated _by the user_, most likely in the browser with JavaScript, and it must include a signature from their private key.

The request token has the end-user's DID in the `iss` field, with the DID for the NFT.Storage service in the `aud` field. The `prf` field contains a copy of the user token that was issued by the marketplace, which in turn has the root token in its own `prf` field.

The request token is attached to the upload to NFT.Storage, which validates the chain of proofs encoded in the token and confirms the cryptographic identity of each participant by checking the token signatures. If the token is valid and the permissions encoded in the request token are sufficient to carry out the request, it will succeed.

## Installation and usage

You can install the `ucan-storage` package with your favorite JS dependency manager, e.g.:

```bash
npm install ucan-storage
```

The main exports are the [`build`][typdeoc-build] and [`validate`][typedoc-validate] methods, as well as the [`KeyPair` class][typedoc-keypair] used to manage signing keys.

```js
import { build, validate, KeyPair } from 'ucan-storage'
```

## Use cases

The `ucan-storage` JavaScript package supports the creation and verification of UCAN tokens, including the ability to create the "proof chains" that enable delgated authorization.

This README will walk through some common scenarios, to illustrate the main features of the `ucan-storage` library. For more details, see the [API reference documentation][ucan-storage-typedoc].

### Generating a keypair

To participate in the UCAN flow (both as a service, and as an end-user), you'll need a keypair.

To generate a keypair using `ucan-storage`, use the static [`KeyPair.create` method][typdeoc-keypair-create]:

```js
import { KeyPair } from 'ucan-storage'

// KeyPair.create returns a promise, so it should be called from an async function or resolved with `.then`
async function createNewKeypair() {
  const kp = await KeyPair.create()

  // log the DID string for the public key to the console:
  console.log(kp.did())
}
```

### Saving and loading keypairs

You can export your private key to a string that can be saved to disk with the [`export` method][typedoc-keypair-export] and load an exported key with the static [`fromExportedKey` method][typedoc-keypair-fromexportedkey]:

```js
import fs from 'fs'
import { KeyPair } from 'ucan-storage'

async function createAndSaveKeypair(outputFilename) {
  const kp = await KeyPair.create()
  await fs.promises.writeFile(kp)
  return kp
}

async function loadKeyPairFromFile(keypairFilename) {
  const exportedKey = await fs.promises.readFile(keypairFilename)
  return KeyPair.fromExportedKey(exportedKey)
}
```

**Important**: when saving to disk, take care to save your keys in a secure location!

### Creating a UCAN token

The [`build` function][typedoc-build] is used to create new UCAN tokens from a [`UcanStorageOptions` input object][typedoc-ucanstorageoptions].

The `issuer` option must be set to a [`KeyPair` object][typedoc-keypair-class]. The private key will be used to sign the token, and the public key will be used to set the `iss` field in the token payload.

The `audience` option must contain the DID string for the recipient's public key.

The `capabilities` option must contain one or more [`StorageCapability`][typedoc-storagecapability] objects that represent the capabilities the token enables. If you are creating a token that derives capabilities from a "parent" UCAN token, the `capabilities` you pass in must be a _subset_ of the capabilities granted by the parent UCAN. See the section on [Storage capabilities](#storage-capabilities) below to learn more.

When creating a "child" UCAN based on another "parent" UCAN, the parent token (in its JWT string form) should be included in the `proofs` array in the `UcanStorageOptions` object.

You can restrict the lifetime of the token by either setting an explicit `expiration` timestamp or setting a `lifetimeInSeconds` option. If both are set, `expiration` takes precedence.

You can also issue tokens that will become valid at a future date by setting the `notBefore` option to a timestamp in the future. If `notBefore` and `expiration` are both set, `notBefore` must be less than `expiration`.

Both timestamp options (`expiration` and `notBefore`) are Unix timestamps (seconds elapsed since the Unix epoch).

#### Storage capabilities

UCAN tokens encode permissions as a set of "capabilities," which are objects describing actions that the token holder can perform upon some "resource."

UCAN.Storage supports the `storage` capability, which represents access to operations over storage resources (e.g., uploading a file to NFT.Storage).

A capability object looks like this:

```json
{
  "with": "storage://did:key:<user-public-key>",
  "can": "upload/*"
}
```

The `with` field specifies the **resource pointer**, which in the case of UCAN.Storage is a string that includes the DID of the user to whom the token was issued. A `storage` resource pointer issued by a service that supports UCAN.Storage will always begin with the `storage://` prefix, followed by the DID that the token was issued to (the "audience" of the token).

When deriving child tokens for a new user, you should append the DID of the new user to the resource path, with `/` characters seperating the DID strings. For example, if your DID is `did:key:marketplace`, the token issued by the storage service would have the resource `storage://did:key:marketplace`. If you then issue a token to a user with the DID `did:key:user-1`, the new token should have a resource path of `storage://did:key:marketplace/did:key:user-1`.

The `can` field specifies what **action** the token holder is authorized to perform. UCAN.Storage currently supports two actions, `upload/*` and `upload/IMPORT`.

The `upload/*` or "upload all" action allows access to all upload operations under the given resource.

The `upload/IMPORT` action allows access to upload a specific Content Archive (CAR), identified by the [multihash][multihash] of the CAR data.

#### Creating a root token

You can create a "root token" with no parent by omitting the `proofs` field when calling the [`build` function][typedoc-build]. This is generally only used in production by storage service providers (e.g. NFT.Storage) to issue tokens to users and marketplaces, but it is useful for all participants when writing tests, etc.

```js
import { build } from 'ucan-storage'

async function makeRootToken(
  issuerKeyPair,
  audienceDID,
  actions = ['upload/*']
) {
  // make "capability" objects from the actions
  const capabilities = actions.map((action) => ({
    with: `storage://${audienceDID}`,
    can: action,
  }))

  const token = await build({
    issuer: issuerKeyPair,
    audience: audienceDID,
    capabilities,
  })
}
```

#### Deriving a child token

If you have a UCAN token, you can create a "child token" that derives capabilities from the parent token. To do so, include the parent token in the `proofs` array when calling [build][typedoc-build], and make sure that the `capabilities` you include do not exceed the capabilities in the parent token.

In this example, we first [validate](#validating-a-token) the parent token, which returns the parsed UCAN payload. From the payload, we can retrieve the capabilities from the `att` field and extend the resource path to include the DID of the "audience" for the new token.

```js
import { build, validate } from 'ucan-storage'

async function deriveToken(parentUCAN, issuerKeyPair, audienceDID) {
  // validate the parent UCAN and extract the payload
  const { payload } = await validate(parentUCAN)

  // the `att` field contains the capabilities
  const { att } = payload

  // for each capability in the parent, keep everything except the
  // resource path, to which we append the DID for the new token's audience
  const capabilities = att.map((capability) => ({
    ...capability,
    with: [capability.with, audienceDID].join('/'),
  }))

  // include the parent UCAN JWT string in the proofs array
  const proofs = [parentUCAN]

  const token = await build({
    issuer: issuerKeyPair,
    audience: audienceDID,
    capabilities,
    proofs,
  })
}
```

#### Creating a request token to upload content

When uploading content to the storage service, the user will need to generate a UCAN token using their keypair and attach this "request token" to the upload request in a header.

This token must have the DID for the storage service as the `audience`, with the end-user's DID as the `issuer`.

The chain of `proofs` must include a UCAN token issued by the storage service, and the token must include capabilities sufficient to serve the request. This "proof token" may be issued by the storage service itself, or by a third party like an NFT marketplace who has [derived a child token](#deriving-a-child-token) to delegate storage services to end users.

```js
import { build } from 'ucan-storage'

// The DID for the storage service. In real code, you should obtain this from the service you're targetting.
const serviceDID = 'did:key:a-fake-service-did'

async function createRequestToken(parentUCAN, issuerKeyPair) {
  // we want to include the capabilities of the parent token in our request token
  // so we validate the parent token to extract the payload and copy over the capabilities
  const { payload } = await validate(parentUCAN)

  // the `att` field contains the capabilities we need for uploading
  const { att } = payload

  return build({
    issuer: issuerKeyPair,
    audience: serviceDID,
    capabilities: att,
  })
}
```

#### Setting an expiration date

When creating a UCAN, you can set it to expire at a certain date by setting the `lifetimeInSeconds` or `expiration` options when calling [`build`][typedoc-build].

The `expiration` option sets a point in time at which the token will expire. All parties in the UCAN flow should reject tokens with `expiration` dates in the past.

You can create tokens that will not be valid unitl a time in the future by setting the `notBefore` option.

Both `expiration` and `notBefore` are Unix timestamps, which record the number of seconds elapsed since the start of the Unix "epoch". JavaScript's `Date.now()` method returns epoch timestamps with millisecond resolution, so to get the correct value you must divide by 1000:

```js
// convert timestamp to seconds
const nowInSeconds = Math.floor(Date.now() / 1000)

// expire in one minute
const expiration = nowInSeconds + 60
```

The `lifetimeInSeconds` option is a helper to set the `expiration` date relative to the current time, or the `notBefore` time if specified.

#### Validating a token

TODO: how to validate, how to skip validation checks

## Using UCANs with NFT.Storage

<!-- this section should eventually migrate to the nft.storage docs site -->

TODO:

- [ ] how to register your DID with the service
- [ ] how to get your service's root token
- [ ] how to issue an expiring user token to your users

## Contributing

We use `pnpm` in this project and commit the `pnpm-lock.yaml` file.

### Install dependencies.

```bash
# install all dependencies in the mono-repo
pnpm
# setup git hooks
npx simple-git-hooks
```

[spec]: https://github.com/nftstorage/ucan.storage/blob/main/spec.md
[ucan-intro]: https://ucan.xyz/
[ucan-data-structure]: https://ucan.xyz/#the-ucan-data-structure
[did-overview]: https://www.w3.org/TR/did-core/
[did-key]: https://w3c-ccg.github.io/did-method-key/
[jwt]: https://jwt.io/
[unix-ts]: https://www.unixtimestamp.com/
[multihash]: https://github.com/multiformats/multihash
[ucan-storage-typedoc]: https://nftstorage.github.io/ucan.storage/
[typedoc-keypair-class]: https://nftstorage.github.io/ucan.storage/classes/keypair.KeyPair.html
[typdeoc-keypair-create]: https://nftstorage.github.io/ucan.storage/classes/keypair.KeyPair.html#create
[typedoc-keypair-export]: https://nftstorage.github.io/ucan.storage/classes/keypair.KeyPair.html#export
[typedoc-keypair-fromexportedkey]: https://nftstorage.github.io/ucan.storage/classes/keypair.KeyPair.html#fromExportedKey
[typedoc-ucan-storage-module]: https://nftstorage.github.io/ucan.storage/modules/ucan_storage.html
[typedoc-build]: https://nftstorage.github.io/ucan.storage/modules/ucan_storage.html#build
[typedoc-validate]: https://nftstorage.github.io/ucan.storage/modules/ucan_storage.html#validate
[typedoc-ucanstorageoptions]: https://nftstorage.github.io/ucan.storage/interfaces/ucan_storage._internal_.UcanStorageOptions.html
[typedoc-storagecapability]: https://nftstorage.github.io/ucan.storage/modules/ucan_storage._internal_.html#StorageCapability
[typedoc-uploadall]: https://nftstorage.github.io/ucan.storage/interfaces/ucan_storage._internal_.UploadAll.html
[typedoc-uploadimport]: https://nftstorage.github.io/ucan.storage/interfaces/ucan_storage._internal_.UploadImport.html
