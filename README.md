# bcevents

Sends and listens to events broadcasted on bitcoin transactions. Events can be used to trigger remote actions or send payloads to listeners.

## Install

```
npm install bcevents datapay bsv
```

## Get Started

```js
var Emitter = require('bcevents')
var emitter = new Emitter({ pkey: 'private key for tx fees' })

emitter.on('my-event', console.log) // prints 1234
emitter.emit('my-event', 1234, console.log) // prints tx hash
```

## Protocol

Everytime `emit()` is called, a new transaction is broadcasted with the *event* and *payload* inside the OP_RETURN:

* OP_RETURN
  * protocol_id
  * event
  * payload (optional)

The *protocol Id* should be set when creating emitters otherwise the events will be listened by any agent using the default protocol id.

```js
emitter = new Emitter({ protocol: 'my-unique-protocol-id' })
```

## Encryption

To Encrypt both *event*  and *payload* on transactions, use the *enkKey* field. When set, transaction data will be encrypted and decrypted using AES.

```js
var emitter = new Emitter({ encKey: 'my-password' })
```

To use a different encryption, both encrypt and decrypt function can be set:

```js
var emitter = new Emitter({
  encrypt: (data) => myEncrypt(data),
  decrypt: (data) => myDecrypt(data)
})
```

## Examples
### Ping-Pong
```js
// endless ping-pong between two agents
// oracle.js
var emitter = new Emitter({ pkey: 'oracle pkey', protocol: 'pingpongtest' })
emitter.on('ping' () => {
  emitter.emit('pong')
})

// client.js
var emitter = new Emitter({ pkey: 'client pkey', protocol: 'pingpongtest' })
emitter.on('pong', () => {
  emitter.emit('ping')
})
emitter.emit('ping')
```

### Whitelisting
```js
var whitelist = [addr1, addr2, ...] // addresses whitelist

emitter.on('some-event', (e) {
  if (!whitelist.includes(e.from)) {
    return
  }
  //
})
```