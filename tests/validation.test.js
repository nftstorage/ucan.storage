import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { base64url, utf8 } from '../src/encoding.js'
import { validate, KeyPair } from '../src/ucan.js'
import { serialize } from '../src/utils.js'

test('should fail with string "test"', async () => {
  try {
    await validate('test')
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(
      error.message,
      `Can't parse UCAN: test: Expected JWT format: 3 dot-separated base64url-encoded values.`
    )
  }
})

test('should fail with string "test.test"', async () => {
  try {
    await validate('test.test')
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(
      error.message,
      `Can't parse UCAN: test.test: Expected JWT format: 3 dot-separated base64url-encoded values.`
    )
  }
})

test('should fail with string bad json header', async () => {
  try {
    await validate('test.test.test')
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(
      error.message,
      `Can't parse: test: Can't parse base64url encoded JSON inside.`
    )
  }
})

test('should fail with non base64url header', async () => {
  try {
    await validate('test*.test.test')
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(error.message, `Can't parse: test*: Can't parse as base64url.`)
  }
})

test('should fail with non base64url payload', async () => {
  const header = serialize({ ss: 1 })
  try {
    await validate(`${header}.test*.test`)
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(error.message, `Can't parse: test*: Can't parse as base64url.`)
  }
})

test('should fail with bad json payload', async () => {
  const header = serialize({ ss: 1 })
  try {
    await validate(`${header}.test.test`)
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(
      error.message,
      `Can't parse: test: Can't parse base64url encoded JSON inside.`
    )
  }
})

test('should fail with non base64url signature', async () => {
  const header = serialize({ ss: 1 })
  const payload = serialize({ ss: 1 })
  try {
    await validate(`${header}.${payload}.test*`)
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, SyntaxError)
    assert.match(error.message, `Non-base64url character`)
  }
})

test('should fail with bad alg', async () => {
  const kp = await KeyPair.create()
  const header = serialize({ alg: 'EdDSAa' })
  const payload = serialize({ iss: kp.did() })

  const sig = await kp.sign(utf8.decode(`${header}.${payload}`))
  const jwt = `${header}.${payload}.${base64url.encode(sig)}`

  try {
    await validate(jwt)
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(
      error.message,
      `Invalid UCAN: ${jwt}: Issuer key type does not match UCAN's alg property.`
    )
  }
})

test('should fail with bad signature', async () => {
  const kp = await KeyPair.create()
  const header = serialize({ alg: 'EdDSA' })
  const payload = serialize({ iss: kp.did() })

  const sig = await kp.sign(utf8.decode(`${header}.${payload}BAD`))
  const jwt = `${header}.${payload}.${base64url.encode(sig)}`

  try {
    await validate(jwt)
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(error.message, `Invalid UCAN: ${jwt}: Signature invalid.`)
  }
})

test('should fail with expired jwt', async () => {
  const kp = await KeyPair.create()
  const header = serialize({ alg: 'EdDSA' })
  const payload = serialize({
    iss: kp.did(),
    exp: Math.floor(Date.now() / 1000) - 1000,
  })

  const sig = await kp.sign(utf8.decode(`${header}.${payload}`))
  const jwt = `${header}.${payload}.${base64url.encode(sig)}`

  try {
    await validate(jwt)
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(error.message, `Invalid UCAN: ${jwt}: Expired.`)
  }
})

test('should fail with not yet active jwt', async () => {
  const kp = await KeyPair.create()
  const header = serialize({ alg: 'EdDSA' })
  const payload = serialize({
    iss: kp.did(),
    nbf: Math.floor(Date.now() / 1000) + 1000,
  })

  const sig = await kp.sign(utf8.decode(`${header}.${payload}`))
  const jwt = `${header}.${payload}.${base64url.encode(sig)}`

  try {
    await validate(jwt)
    assert.unreachable('should have thrown')
  } catch (error) {
    assert.instance(error, Error)
    assert.match(
      error.message,
      `Invalid UCAN: ${jwt}: Not active yet (too early).`
    )
  }
})

test.run()
