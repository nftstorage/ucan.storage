import { test } from 'uvu'
import * as assert from 'uvu/assert'
import * as Ucan from '../src/index.js'
import { UcanChain } from '../src/ucan-chain.js'
import { storageSemantics } from '../src/semantics.js'

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

test('should fail claim with bad capability', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const kp3 = await Ucan.KeyPair.create()
  const token1 = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    capabilities: [
      {
        with: `storage://user1`,
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
    ],
    proofs: [token1.jwt],
  })

  const ucan = await UcanChain.fromToken(token2.jwt)

  assert.throws(() => {
    ucan.claim({ with: `storage://Special` }, storageSemantics)
  }, /"can" must be a string./)
})

test('should fail claim with wrong resource', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const kp3 = await Ucan.KeyPair.create()
  const token1 = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    capabilities: [
      {
        with: `storage://user1`,
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
    ],
    proofs: [token1.jwt],
  })

  const ucan = await UcanChain.fromToken(token2.jwt)

  assert.throws(() => {
    ucan.claim({ with: `storage://user2`, can: 'upload/*' }, storageSemantics)
  }, /Child resource does not match parent resource/)
})

test('should claim with prf:*', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const kp3 = await Ucan.KeyPair.create()
  const token1 = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    capabilities: [
      {
        with: `storage://user1`,
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
    ],
    proofs: [token1.jwt],
  })

  const ucan = await UcanChain.fromToken(token2.jwt)

  const r = ucan.claim(
    { with: `storage://user1`, can: 'upload/*' },
    storageSemantics
  )
  assert.is(r.issuer(), kp1.did())
  assert.is(r.audience(), kp2.did())
})

test('should claim with prf:0', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const kp3 = await Ucan.KeyPair.create()
  const token1 = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    capabilities: [
      {
        with: `storage://user1`,
        can: 'upload/*',
      },
    ],
  })

  const token2 = await Ucan.build({
    issuer: kp2,
    audience: kp3.did(),
    capabilities: [
      {
        with: 'prf:0',
      },
    ],
    proofs: [token1.jwt],
  })

  const ucan = await UcanChain.fromToken(token2.jwt)

  const r = ucan.claim(
    { with: `storage://user1`, can: 'upload/*' },
    storageSemantics
  )
  assert.is(r.issuer(), kp1.did())
  assert.is(r.audience(), kp2.did())
})

test('should claim with prf:1 with multiple proofs', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const kp3 = await Ucan.KeyPair.create()
  const token1 = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    capabilities: [
      {
        with: `storage://user1`,
        can: 'upload/*',
      },
    ],
  })

  const token2 = await Ucan.build({
    issuer: kp3,
    audience: kp2.did(),
    capabilities: [
      {
        with: `storage://special`,
        can: 'upload/IMPORT',
      },
    ],
  })

  const tokenFinal = await Ucan.build({
    issuer: kp2,
    audience: kp1.did(),
    capabilities: [
      {
        with: 'prf:1',
      },
    ],
    proofs: [token1.jwt, token2.jwt],
  })

  const ucan = await UcanChain.fromToken(tokenFinal.jwt)

  const r = ucan.claim(
    { with: `storage://special`, can: 'upload/IMPORT' },
    storageSemantics
  )
  assert.is(r.issuer(), kp3.did())
  assert.is(r.audience(), kp2.did())
})

test('should claim with extended resource path', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const kp3 = await Ucan.KeyPair.create()
  const token1 = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    capabilities: [
      {
        with: `storage://user1`,
        can: 'upload/*',
      },
    ],
  })

  const token2 = await Ucan.build({
    issuer: kp2,
    audience: kp3.did(),
    capabilities: [
      {
        with: `storage://user1/user2`,
        can: 'upload/IMPORT',
      },
    ],
    proofs: [token1.jwt],
  })

  const tokenFinal = await Ucan.build({
    issuer: kp3,
    audience: kp1.did(),
    capabilities: [
      {
        with: `storage://user1/user2/public`,
        can: 'upload/IMPORT',
      },
    ],
    proofs: [token2.jwt],
  })

  const ucan = await UcanChain.fromToken(tokenFinal.jwt)

  const r = ucan.claim(
    { with: `storage://user1/user2/public`, can: 'upload/IMPORT' },
    storageSemantics
  )
  assert.is(r.issuer(), kp1.did())
  assert.is(r.audience(), kp2.did())
})

// not supported yet
test.skip('should claim with multiple delegation with prf:*', async () => {
  const kp1 = await Ucan.KeyPair.create()
  const kp2 = await Ucan.KeyPair.create()
  const kp3 = await Ucan.KeyPair.create()
  const token1 = await Ucan.build({
    issuer: kp1,
    audience: kp2.did(),
    capabilities: [
      {
        with: `storage://user1`,
        can: 'upload/*',
      },
    ],
  })

  const token2 = await Ucan.build({
    issuer: kp2,
    audience: kp3.did(),
    capabilities: [
      {
        with: `prf:*`,
      },
    ],
    proofs: [token1.jwt],
  })

  const tokenFinal = await Ucan.build({
    issuer: kp3,
    audience: kp1.did(),
    capabilities: [
      {
        with: `prf:*`,
      },
    ],
    proofs: [token2.jwt],
  })

  const ucan = await UcanChain.fromToken(tokenFinal.jwt)

  const r = ucan.claim(
    { with: `storage://user1`, can: 'upload/IMPORT' },
    storageSemantics
  )
  assert.is(r.issuer(), kp1.did())
  assert.is(r.audience(), kp2.did())
})

test.run()
