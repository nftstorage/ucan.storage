import { test } from 'uvu'
import * as assert from 'uvu/assert'
import * as Ucan from 'ucan-storage'
import { UcanChain } from '../src/ucan-chain.js'
import { storageSemantics } from 'ucan-common'

test('verify single ucan', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const token = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    lifetimeInSeconds: 1000,
    capabilities: [
      {
        with: `storage://${kp2.did()}`,
        can: 'upload/*',
      },
    ],
  })

  const verifiedToken = await UcanChain.fromToken(token.jwt)
  assert.is(verifiedToken.audience(), kp2.did())
  assert.is(verifiedToken.issuer(), kp1.did())
})

test('verify delegated ucan', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const kp3 = await Ucan.KeyPair.create()
  const token1 = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    lifetimeInSeconds: 1000,
    capabilities: [
      {
        with: `storage://${kp2.did()}`,
        can: 'upload/*',
      },
    ],
  })

  const token2 = await Ucan.build({
    issuer: kp2,
    audience: kp3.did(),
    lifetimeInSeconds: 1000,
    capabilities: [
      {
        with: `storage://${kp2.did()}`,
        can: 'upload/*',
      },
    ],
    proofs: [token1.jwt],
  })

  const verifiedToken = await UcanChain.fromToken(token2.jwt)
  assert.is(verifiedToken.audience(), kp3.did())
  assert.is(verifiedToken.issuer(), kp2.did())

  const proofs = verifiedToken.proofs()

  assert.is(proofs[0].audience(), kp2.did())
  assert.is(proofs[0].issuer(), kp1.did())
})

test('should fail with unmatched from/to', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const kp3 = await Ucan.KeyPair.create()
  const token1 = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    lifetimeInSeconds: 1000,
    capabilities: [
      {
        with: `storage://${kp2.did()}`,
        can: 'upload/*',
      },
    ],
  })

  const token2 = await Ucan.build({
    issuer: kp1,
    audience: kp3.did(),
    lifetimeInSeconds: 1000,
    capabilities: [
      {
        with: `storage://${kp2.did()}`,
        can: 'upload/*',
      },
    ],
    proofs: [token1.jwt],
  })

  try {
    await UcanChain.fromToken(token2.jwt)
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(error.message, 'Invalid UCAN: Audience')
  }
})

test('should validate capability', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const kp3 = await Ucan.KeyPair.create()
  const token1 = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    capabilities: [
      {
        with: `storage://user1`,
        can: 'upload/IMPORT',
      },
      {
        with: `storage://user1`,
        can: 'upload/*',
      },
    ],
  })

  const tokenSpecial = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    capabilities: [
      {
        with: `storage://Special`,
        can: 'upload/*',
      },
    ],
  })

  const token2 = await Ucan.build({
    issuer: kp2,
    audience: kp3.did(),
    capabilities: [
      {
        with: 'prf:*',
      },
      // {
      //   with: `storage://user1/user2`,
      //   can: 'upload/IMPORT',
      // },
      // {
      //   with: `storage://user1/user2`,
      //   can: 'upload/*',
      // },
    ],
    proofs: [tokenSpecial.jwt, token1.jwt],
  })

  const ucan = await UcanChain.fromToken(token2.jwt)
  const r = ucan.claim(
    { with: `storage://Special`, can: 'upload/*' },
    storageSemantics
  )
  // eslint-disable-next-line no-console
  console.log(r.capabilities())

  // console.log(ucan.caps(storageSemantics))
})

test.run()
