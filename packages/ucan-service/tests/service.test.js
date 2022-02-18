import { test } from 'uvu'
import * as assert from 'uvu/assert'
import * as ucan from 'ucan-storage'

import { Service } from '../src/index.js'

test('verify single ucan', async () => {
  const kp1 = await ucan.KeyPair.create()
  const kp2 = await ucan.KeyPair.create()
  const token = await ucan.build({
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

  const verifiedToken = await Service.verify(token.jwt)
  assert.is(verifiedToken.audience(), kp2.did())
  assert.is(verifiedToken.issuer(), kp1.did())
})

test('verify delegated ucan', async () => {
  const kp1 = await ucan.KeyPair.create()
  const kp2 = await ucan.KeyPair.create()
  const kp3 = await ucan.KeyPair.create()
  const token1 = await ucan.build({
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

  const token2 = await ucan.build({
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

  const verifiedToken = await Service.verify(token2.jwt)
  assert.is(verifiedToken.audience(), kp3.did())
  assert.is(verifiedToken.issuer(), kp2.did())

  const proofs = verifiedToken.proofs()

  assert.is(proofs[0].audience(), kp2.did())
  assert.is(proofs[0].issuer(), kp1.did())
})

test('should fail with unmatched from/to', async () => {
  const kp1 = await ucan.KeyPair.create()
  const kp2 = await ucan.KeyPair.create()
  const kp3 = await ucan.KeyPair.create()
  const token1 = await ucan.build({
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

  const token2 = await ucan.build({
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
    await Service.verify(token2.jwt)
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(error.message, 'Invalid UCAN: Audience')
  }
})

test('should return caps for single ucan', async () => {
  const kp1 = await ucan.KeyPair.create()
  const kp2 = await ucan.KeyPair.create()
  const token = await ucan.build({
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

  const verifiedToken = await Service.verify(token.jwt)
  const [cap] = [...Service.caps(verifiedToken)]

  assert.is(cap.capability.can, 'upload/*')
  assert.is(cap.capability.mh, undefined)
  assert.is(cap.capability.with, `storage://${kp2.did()}`)
  assert.is(cap.info.originator, kp1.did())
})

test.run()
