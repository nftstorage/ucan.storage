import { test } from 'uvu'
import * as assert from 'uvu/assert'
import * as ed from '@noble/ed25519'
import { KeyPair } from '../src/keypair.js'
import { base64Pad } from '../src/encoding.js'
import { didToPublicKeyBytes } from '../src/did.js'

const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])

test('create keypair ed25519', async () => {
  const kp = await KeyPair.create()

  assert.instance(kp, KeyPair)
  assert.is(kp.publicKey.byteLength, 32)
  assert.is(kp.privateKey.byteLength, 32)
})

test('public key string', async () => {
  const kp = await KeyPair.create()

  assert.equal(kp.publicKey, base64Pad.decode(kp.publicKeyStr()))
})

test('did', async () => {
  const kp = await KeyPair.create()

  const did = kp.did()

  assert.equal(kp.publicKey, didToPublicKeyBytes(did))
})

test('should sign and verify', async () => {
  const kp = await KeyPair.create()
  const signature = await kp.sign(data)

  assert.ok(await ed.verify(signature, data, kp.publicKey))
})

test('should sign and verify', async () => {
  const kp = await KeyPair.create()
  const signature = await kp.sign(data)

  assert.ok(await ed.verify(signature, data, kp.publicKey))
})

test('should sign and verify from did', async () => {
  const kp = await KeyPair.create()
  const signature = await kp.sign(data)

  assert.ok(await ed.verify(signature, data, didToPublicKeyBytes(kp.did())))
})

test('should export/import', async () => {
  const kp = await KeyPair.create()

  const privateKeyHash = kp.export()

  const kp2 = await KeyPair.fromExportedKey(privateKeyHash)
  assert.is(kp.publicKeyStr, kp2.publicKeyStr)

  assert.equal(kp.privateKey, kp2.privateKey)
})

test.run()
