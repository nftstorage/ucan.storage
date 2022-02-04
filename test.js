import KeyPair from './src/keypair.js'
import { build, encode } from './src/index.js'
import * as ucan from 'ucans'

export const emailSemantics = {
  tryParsing(cap) {
    if (typeof cap.email === 'string' && cap.cap === 'SEND') {
      return {
        email: cap.email,
        cap: cap.cap,
      }
    }
    return null
  },

  tryDelegating(parentCap, childCap) {
    // potency is always "SEND" anyway, so doesn't need to be checked
    return childCap.email === parentCap.email ? childCap : null
  },
}

export function emailCapabilities(token) {
  return ucan.capabilities(token, emailSemantics)
}

async function main() {
  const serviceKP = await KeyPair.create()
  const user1KP = await KeyPair.create()
  const user2KP = await KeyPair.create()

  const u1 = await build({
    issuer: serviceKP, // signing key
    audience: user1KP.did(), // recipient DID
    expiration: Date.now() / 1000 + 1000,
    capabilities: [
      {
        email: 'alice@email.com',
        cap: 'SEND',
      },
    ],
  })
  console.log(serviceKP.did())

  const u2 = await build({
    issuer: user1KP,
    audience: user2KP.did(),
    expiration: Date.now() / 1000 + 1000,
    capabilities: [
      {
        email: 'alice@email.com',
        cap: 'SEND',
      },
    ],
    proofs: [encode(u1)],
  })
  console.log(user1KP.did())
  console.log(user2KP.did())

  const chained = await ucan.Chained.fromToken(encode(u2))

  console.log(Array.from(emailCapabilities(chained)))
}

main()
