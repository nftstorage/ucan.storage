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

UCAN provides a way for the storage service to issue a **root token** to the marketplace. With the root token, the marketplace can issue **user tokens** that contain a subset of the permissions that were encoded into the root token.

Once a marketplace end-user has a user token, they'll create one last token, a **request token** that authorizes their upload request to the NFT.Storage service. The request token is generated _by the user_, most likely in the browser with JavaScript, and it must include a signature from their private key. This token is attached to the upload to NFT.Storage, which validates the chain of "proofs" encoded in the token and confirms the cryptographic identity of the user and the marketplace.

_Identity_ in this context means a **keypair**, which is a **private signing key** with a corresponding **public verification key**. In our example so far, we have three participants that all have keypairs: the NFT.Storage service, the marketplace, and the end user. The public key for each user or service is encoded into a [Decentralized Identity Document (DID)][did-overview], which acts as a verfiable unique identifier.

TODO:

- [ ] talk about roles (issuer, audience, subject)
- [ ] talk about permissions (time scoping, etc)

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

[did-overview]: TODO: linky linky
