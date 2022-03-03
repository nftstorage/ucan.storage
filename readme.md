# UCAN.storage

This project defines a [specification][spec] for delegated authorization of decentralized storage services using [UCAN][ucan-intro], or User Controlled Authorization Networks.

UCAN.storage was designed to be used with [NFT.Storage](https://nft.storage) and [Web3.Storage](https://web3.storage), which both provide storage services backed by the [Filecoin](https://filecoin.io) network, with content retrieval via the [InterPlanetary File System (IPFS)](https://ipfs.io). See the [Use cases](#use-cases) section below to see how it can be used.

This repository also contains the reference implementation of the [spec][spec], in the form of a JavaScript package called `ucan-storage`.

## Getting Started

We use `pnpm` in this project and commit the `pnpm-lock.yaml` file.

### Install dependencies.

```bash
# install all dependencies in the mono-repo
pnpm
# setup git hooks
npx simple-git-hooks
```

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

Once a marketplace end-user has a user token, they'll create one last token, a **request token** that authorizes their upload request to the NFT.Storage service. The request token is generated _by the user_, most likely in the browser with JavaScript, and it must include a signature from their private key.

The request token has the end-user's DID in the `iss` field, with the DID for the NFT.Storage service in the `aud` field. The `prf` field contains a copy of the user token that was issued by the marketplace, which in turn has the root token in its own `prf` field.

The request token is attached to the upload to NFT.Storage, which validates the chain of proofs encoded in the token and confirms the cryptographic identity of each participant by checking the token signatures. If the token is valid and the permissions encoded in the request token are sufficient to carry out the request, it will succeed.

## Use cases

TODO: write up key use cases for the library:

- [ ] generating a keypair & getting your DID
- [ ] creating child UCANs for end users
  - [ ] restricting permissions (e.g. expiration limits, maybe content hash, etc)
  - [ ] highlight that you need the user's DID to issue their tokens
- [ ] validating tokens

## Using UCANs with NFT.Storage

<!-- this section should eventually migrate to the nft.storage docs site -->

TODO:

- [ ] how to register your DID with the service
- [ ] how to get your service's root token
- [ ] how to issue an expiring user token to your users

[spec]: ./spec.md
[ucan-intro]: https://ucan.xyz/
[ucan-data-structure]: https://ucan.xyz/#the-ucan-data-structure
[did-overview]: https://www.w3.org/TR/did-core/
[did-key]: https://w3c-ccg.github.io/did-method-key/
[jwt]: https://jwt.io/
[unix-ts]: https://www.unixtimestamp.com/
