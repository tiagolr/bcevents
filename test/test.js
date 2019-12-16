/* eslint-disable */
require('dotenv').config()
const bsv = require('bsv')
const Emitter = require('../index')
const assert = require('assert')
const pkey = process.env.pkey
const address = bsv.Address.fromPrivateKey(bsv.PrivateKey.fromString(pkey))
const protocol =  '1KFqhvHVRTgAYGeQdeBKRLZxLQgqyzGFTf'
const fee = 2000
let emitter


describe('bcevents', () => {
  afterEach(function() {
    emitter.close()
  });

  it('basics', done => {
    emitter = new Emitter({ pkey, protocol, fee })
    emitter.on('test', e => {
      assert(e.parsed)
      assert.equal(e.event, 'test')
      assert.equal(e.payload, 'some text')
      assert.equal(e.from, address)
      assert(emitter.listeners['test'].length === 1)
      assert(emitter.sockets['test'])
      done()
    })
    emitter.emit('test', 'some text')
  })

  it('once', done => {
    emitter = new Emitter({ pkey, protocol, fee })
    emitter.once('test-once', e => {
      assert(e.event)
      assert(!e.payload)
      assert(!emitter.listeners['test-once'].length)
      assert(!emitter.sockets['test-once'])
      done()
    })
    emitter.emit('test-once')
  })

  it('off', () => {
    emitter = new Emitter({ pkey, protocol, fee })
    const cb = () => {}
    const cc = () => {}
    emitter.on('a', cb)
    emitter.on('b', cb)
    emitter.on('b', cc)
    assert(emitter.listeners.a.length)
    assert(emitter.listeners.b.length == 2)
    emitter.off('a', cb)
    console.log(emitter.listeners.a)
    assert(!emitter.listeners.a)
    assert(emitter.listeners.b)
    emitter.off('b', cb)
    assert(emitter.listeners.b.length === 1)
    emitter.off('b', cc)
    assert(!emitter.listeners.c)
  })

  it('encrypt', done => {
    emitter = new Emitter({ pkey, protocol, fee, encKey: 'password' })
    emitter.on('test', e => {
      assert(e.parsed)
      assert.equal(e.event, 'test')
      assert.equal(e.payload, 'some text')
      assert.equal(e.from, address)
      assert(e.parsed.data[0].out[0].s2 !== 'test')
      assert(e.parsed.data[0].out[0].s2.length > 'test'.length)
      assert(e.parsed.data[0].out[0].s3 !== 'some text')
      assert(e.parsed.data[0].out[0].s3.length > 'some text'.length)
      done()
    })
    emitter.emit('test', 'some text')
  })
})
