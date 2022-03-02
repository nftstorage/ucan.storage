/* eslint-disable no-console */
import { KeyPair } from './src/keypair.js'
import { build } from './src/index.js'
import * as ucan from 'ucans'

export const emailSemantics = {
  /**
   * @param {{ email: any; cap: string; }} cap
   */
  tryParsing(cap) {
    if (typeof cap.email === 'string' && cap.cap === 'SEND') {
      return {
        email: cap.email,
        cap: cap.cap,
      }
    }
  },

  /**
   * @param {{ email: any; }} parentCap
   * @param {{ email: any; }} childCap
   */
  tryDelegating(parentCap, childCap) {
    // potency is always "SEND" anyway, so doesn't need to be checked
    return childCap.email === parentCap.email ? childCap : undefined
  },
}

/**
 * @param {ucan.Chained} token
 */
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
    proofs: [u1.jwt],
  })
  console.log(user1KP.did())
  console.log(user2KP.did())

  // eslint-disable-next-line no-unused-vars
  const chained = await ucan.Chained.fromToken(u2.jwt)
  // const sss = chained.reduce((ucan, proofs) => {
  //   console.log(ucan, [...proofs()])
  //   return proofs
  // })

  // console.log([...emailCapabilities(chained)])
}

main()
