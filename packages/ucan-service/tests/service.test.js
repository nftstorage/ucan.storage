import { test } from 'uvu'
import * as assert from 'uvu/assert'
import * as Ucan from 'ucan-storage'
import { Service } from '../src/index.js'

test('should fail when audience is not service', async () => {
  const userKp = await Ucan.KeyPair.create()
  const service = await Service.create()

  const ucan = await service.ucan(userKp.did())

  try {
    await service.validate(ucan.jwt)
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(
      error.message,
      'Invalid UCAN: Audience does not match this service.'
    )
  }
})

test('should return caps for single ucan', async () => {
  const userKp = await Ucan.KeyPair.create()
  const service = await Service.create()

  const ucan = await service.ucan(userKp.did())

  const delegatedUcan = await Ucan.build({
    issuer: userKp,
    audience: service.did(),
    capabilities: [{ with: `storage://${userKp.did()}`, can: 'upload/*' }],
    proofs: [ucan.jwt],
  })

  const verifiedToken = await service.validate(delegatedUcan.jwt)
  const caps = [...Service.caps(verifiedToken)]
  // eslint-disable-next-line no-console
  console.log('🚀 ~ file: service.test.js ~ line 39 ~ test ~ caps', caps)

  // assert.is(cap.capability.can, 'upload/*')
  // assert.is(cap.capability.mh, undefined)
  // assert.is(cap.capability.with, `storage://${userKp.did()}`)
  // assert.is(cap.info.originator, service.did())
})

test.run()
