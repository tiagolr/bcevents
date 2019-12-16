/* eslint-disable */
const datapay = require('datapay')
const EventSource = require('eventsource')
const CryptoJS = require('crypto-js')

module.exports = function ({
  protocol, // protocol id string
  pkey, // private key used to emit events
  fee, // fee to pay miners (default: 1000)
  rpc, // rpc used to emit events (default: 'https://api.bitindex.network')
  network, // planaria network listening to events (default: 'https://genesis.bitdb.network/s/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/')
  encKey, // key for AES encryption / decryption
  encrypt, // data => {}
  decrypt // data => {}
} = {}) {
  this.protocol = protocol || '12y1438HGvGrS9sbe4dcQZ2maYZTQ67EYK'
  this.pkey = pkey
  this.rpc = rpc || 'https://api.bitindex.network'
  this.network = network || 'https://genesis.bitdb.network/s/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/'
  this.fee = fee || 1000
  this.encKey = encKey && bsv.PrivateKey(bsv.crypto.Hash.sha256sha256(Buffer.from(encKey)).toString('hex'))
  this.encrypt = encrypt || (this.encKey ? data => AESencrypt(data, this.encKey) : data => data)
  this.decrypt = decrypt || (this.encKey ? data => AESdecrypt(data, this.encKey) : data => data)

  this.emit = (event, payload, cb, opts = {}) => {
    if (!this.pkey) {
      throw new Error('cannot emit event, private key not defined')
    }
    const data = [
      this.protocol,
      this.encrypt(event)
    ]
    if (payload) {
      data.push(this.encrypt(JSON.stringify(payload)))
    }
    datapay.send({
      data,
      pay: {
        key: this.pkey,
        rpc: this.rpc,
        fee: this.fee,
      }
    }, (err, tx) => {
      if (err) throw err
      if (cb) cb(tx)
    })
  }

  this.listeners = {}
  this.sockets = {}
  this.on = (event, cb, opts = {}) => {
    const listeners = this.listeners[event] = this.listeners[event] || [];
    listeners.push({ cb, opts })
    if (!this.sockets[event]) {
      const query = {
        v: 3,
        q: {
          find: {
            'out.s1': this.protocol
          }
        }
      }
      const req = Buffer.from(JSON.stringify(query)).toString('base64')
      this.sockets[event] = new EventSource(this.network + req)
      this.sockets[event].addEventListener('message', (e) => {
        e.parsed = JSON.parse(e.data)
        e.event = this.decrypt(e.parsed.data[0] && e.parsed.data[0].out[0].s2)
        try {
          e.from = e.parsed.data[0].in.length === 1 && e.parsed.data[0].in[0].e.a
          e.payload = e.parsed.data[0] && e.parsed.data[0].out[0].s3
          e.payload = JSON.parse(this.decrypt(e.payload))
        } catch (e) {
          //
        }
        (this.listeners[e.event] || []).slice().forEach((listener, i) => {
          listener.cb(e)
          if (listener.opts.once) {
            this.listeners[e.event].splice(i, 1)
          }
        })
      })
    }
  }

  this.once = (event, cb, opts) => this.on(event, cb, Object.assign({once: true}, opts))

  this.off = (event, cb) => {
    const index = this.listeners[event].findIndex(e => e.cb === cb)
    if (index > -1) {
      this.listeners[event].splice(index, 1)
      if (!this.listeners[event].length && this.sockets[event]) {
        this.sockets[event].close()
        this.sockets[event] = undefined
      }
    }
  }
}

const AESencrypt = function (plaintext, key) {
  if (!plaintext) return plaintext
  var keybuf = datapay.bsv.crypto.Hash.sha256(key.toBuffer())
  var key = CryptoJS.enc.Hex.parse(keybuf.slice(0, 8).toString('hex'));
  var iv = CryptoJS.enc.Hex.parse(keybuf.slice(8, 16).toString('hex'));
  var srcs = CryptoJS.enc.Utf8.parse(plaintext);
  var encrypted = CryptoJS.AES.encrypt(srcs, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return CryptoJS.enc.Base64.stringify(encrypted.ciphertext)
}

const AESdecrypt = function (ciphertext, key) {
  if (!ciphertext) return ciphertext
  var keybuf = datapay.bsv.crypto.Hash.sha256(key.toBuffer())
  var key = CryptoJS.enc.Hex.parse(keybuf.slice(0, 8).toString('hex'));
  var iv = CryptoJS.enc.Hex.parse(keybuf.slice(8, 16).toString('hex'));
  var decrypt = CryptoJS.AES.decrypt(ciphertext, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  var decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
  return decryptedStr.toString();
}

