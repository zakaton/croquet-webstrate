(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this,require("buffer").Buffer)

},{"base64-js":1,"buffer":3,"ieee754":4}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],7:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],8:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":7,"_process":5,"inherits":6}],9:[function(require,module,exports){
(function (global){
// This is for building jot for use in browsers. Expose
// the library in a global 'jot' object.
global.jot = require("../jot")
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../jot":12}],10:[function(require,module,exports){
/*  This module defines one operation:
	
	COPY([[source, target], ...])
	
	Clones values from source to target for each source-target pair.
	Source and target are strings that are paths in the JSON document
	to a value following the JSONPointer specification (RFC 6901).
	The paths must exist --- a final dash in a path to refer to the
	nonexistentent element after the end of an array is not valid.
	*/
	
var util = require("util");

var jot = require("./index.js");

var JSONPointer = require('jsonpatch').JSONPointer;

exports.module_name = 'copies'; // for serialization/deserialization

exports.COPY = function (pathpairs) {
	if (!Array.isArray(pathpairs)) throw new Error("argument must be a list");
	this.pathpairs = pathpairs.map(function(pathpair) {
		if (!Array.isArray(pathpair) || pathpair.length != 2)
			throw new Error("each element in pathpairs must be an array of two string elements")
		if (pathpair[0] instanceof JSONPointer && pathpair[1] instanceof JSONPointer) {
			// for internal calls only
			return pathpair;
		} else {
			if (typeof pathpair[0] != "string" || typeof pathpair[1] != "string")
				throw new Error("each element in pathpairs must be an array of two strings")
			if (pathpair[0] == pathpair[1])
				throw new Error("can't copy a path to itself")
			return [
				new JSONPointer(pathpair[0]),
				new JSONPointer(pathpair[1])
			]
		}
	});
	Object.freeze(this);
}
exports.COPY.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.COPY, exports, 'COPY');

function serialize_pointer(jp) {
    return (jp.path.map(function(part) { return "/" + part.replace(/~/g,'~0').replace(/\//g,'~1') })
    	.join(""));
}

exports.COPY.prototype.inspect = function(depth) {
	return util.format("<COPY %s>", this.pathpairs.map(function(pathpair) {
		return serialize_pointer(pathpair[0]) + " => " + serialize_pointer(pathpair[1]);
	}).join(", "));
}

exports.COPY.prototype.visit = function(visitor) {
	// A simple visitor paradigm. Replace this operation instance itself
	// and any operation within it with the value returned by calling
	// visitor on itself, or if the visitor returns anything falsey
	// (probably undefined) then return the operation unchanged.
	return visitor(this) || this;
}

exports.COPY.prototype.internalToJSON = function(json, protocol_version) {
	json.pathpairs = this.pathpairs.map(function(pathpair) {
		return [serialize_pointer(pathpair[0]), serialize_pointer(pathpair[1])];
	});
}

exports.COPY.internalFromJSON = function(json, protocol_version, op_map) {
	return new exports.COPY(json.pathpairs);
}

exports.COPY.prototype.apply = function (document) {
	/* Applies the operation to a document.*/
	this.pathpairs.forEach(function(pathpair) {
		var val = pathpair[0].get(document);
		document = pathpair[1].replace(document, val);
	});
	return document;
}

exports.COPY.prototype.simplify = function (aggressive) {
	// Simplifies the operation. Later targets in pathpairs overwrite
	// earlier ones at the same location or a descendant of the
	// location.
	// TODO.
	return this;
}

function parse_path(jp, document) {
	var path = [];
	for (var i = 0; i < jp.length; i++) {
		var p = jp.path[i];
		if (Array.isArray(document))
			p = parseInt(p)
		path.push(p);
		document = document[p];
	}
	return path;
}

function drilldown_op(jp, document, op) {
	var path = parse_path(jp, document);
	for (var i = 0; i < path.length; i++)
		op = op.drilldown(path[i]);
	return op;
}

function wrap_op_in_path(jp, document, op) {
	var path = parse_path(jp, document);
	var i = path.length-1;
	while (i >= 0) {
		if (typeof path[i] == "string")
			op = new jot.APPLY(path[i], op)
		else
			op = new jot.ATINDEX(path[i], op)
		i--;
	}
	return op;
}

exports.COPY.prototype.inverse = function (document) {
	// Create a SET operation for every target.
	return new jot.LIST(this.pathpairs.map(function(pathpair) {
		return wrap_op_in_path(pathpair[1], document, new jot.SET(pathpair[1].get(document)));
	}))
}

exports.COPY.prototype.atomic_compose = function (other) {
	// Return a single COPY that combines the effect of this
	// and other. Concatenate the pathpairs lists, then
	// run simplify().
	if (other instanceof exports.COPY)
		return new exports.COPY(this.pathpairs.concat(other.pathpairs)).simplify();
}

exports.rebase = function(base, ops, conflictless, debug) {
	
}

exports.COPY.prototype.clone_operation = function(op, document) {
	// Return a list of operations that includes op and
	// also for any way that op affects a copied path,
	// then an identical operation at the target path.
	var ret = [op];
	this.pathpairs.forEach(function(pathpair) {
		var src_op = drilldown_op(pathpair[0], document, op);
		if (src_op.isNoOp()) return;
		ret.push(wrap_op_in_path(pathpair[1], document, src_op));
	});
	return new jot.LIST(ret).simplify();
}

exports.COPY.prototype.drilldown = function(index_or_key) {
	// This method is supposed to return an operation that
	// has the same effect as this but is relative to index_or_key.
	// Can we do that? If a target is at or in index_or_key,
	// then we affect that location. If source is also at or
	// in index_or_key, we can drill-down both. But if source
	// is somewhere else in the document, we can't really do
	// this.
	throw "hmm";
}

function make_random_path(doc) {
	var path = [];
	if (typeof doc === "string" || Array.isArray(doc)) {
		if (doc.length == 0) return path;
		var idx = Math.floor(Math.random() * doc.length);
		path.push(""+idx);
		try {
			if (Math.random() < .5 && typeof doc !== "string")
				path = path.concat(make_random_path(doc[idx]));
		} catch (e) {
			// ignore - can't create path on inner value
		}
	} else if (typeof doc === "object" && doc !== null) {
		var keys = Object.keys(doc);
		if (keys.length == 0) return path;
		var key = keys[Math.floor(Math.random() * keys.length)];
		path.push(key);
		try {
			if (Math.random() < .5)
				path = path.concat(make_random_path(doc[key]));
		} catch (e) {
			// ignore - can't create path on inner value
		}
	} else {
		throw new Error("COPY cannot apply to this document type: " + doc);
	}
	return path;
}

exports.createRandomOp = function(doc, context) {
	// Create a random COPY that could apply to doc. Choose
	// a random path for a source and a target.
	var pathpairs = [];
	while (1) {
		var pp = [ serialize_pointer({ path: make_random_path(doc) }),
		           serialize_pointer({ path: make_random_path(doc) }) ];
		if (pp[0] != pp[1])
			pathpairs.push(pp);
		if (Math.random() < .5)
			break;
	}
	return new exports.COPY(pathpairs);
}

},{"./index.js":12,"jsonpatch":43,"util":8}],11:[function(require,module,exports){
// Construct JOT operations by performing a diff on
// standard data types.

var deepEqual = require("deep-equal");

var jot = require("./index.js");

function diff(a, b, options) {
	// Compares two JSON-able data instances and returns
	// information about the difference:
	//
	// {
	//   op:   a JOT operation representing the change from a to b
	//   pct:  a number from 0 to 1 representing the proportion
	//         of content that is different
	//   size: an integer representing the approximate size of the
	//         content in characters, which is used for weighting
	// }


	// Run the diff method appropriate for the pair of data types.
	// Do a type-check for valid types early, before deepEqual is called.
	// We can't call JSON.stringify below if we get a non-JSONable
	// data type.

	function typename(val) {
		if (typeof val == "undefined")
			throw new Error("Illegal argument: undefined passed to diff");
		if (val === null)
			return "null";
		if (typeof val == "string" || typeof val == "number" || typeof val == "boolean")
			return typeof val;
		if (Array.isArray(val))
			return "array";
		if (typeof val != "object")
			throw new Error("Illegal argument: " + typeof val + " passed to diff");
		return "object";
	}

	var ta = typename(a);
	var tb = typename(b);

	// Return fast if the objects are equal. This is muuuuuch
	// faster than doing our stuff recursively.

	if (deepEqual(a, b, { strict: true })) {
		return {
			op: new jot.NO_OP(),
			pct: 0.0,
			size: JSON.stringify(a).length
		};
	}
	
	if (ta == "string" && tb == "string")
		return diff_strings(a, b, options);

	if (ta == "array" && tb == "array")
		return diff_arrays(a, b, options);
	
	if (ta == "object" && tb == "object")
		return diff_objects(a, b, options);

	// If the data types of the two values are different,
	// or if we don't recognize the data type (which is
	// not good), then only an atomic SET operation is possible.
	return {
		op: new jot.SET(b),
		pct: 1.0,
		size: (JSON.stringify(a)+JSON.stringify(b)).length / 2
	}
}

exports.diff = function(a, b, options) {
	// Ensure options are defined.
	options = options || { };

	// Call diff() and just return the operation.
	return diff(a, b, options).op;
}

function diff_strings(a, b, options) {
	// Use the 'diff' package to compare two strings and convert
	// the output to a jot.LIST.
	var diff = require("diff");
	
	var method = "Chars";
	if (options.words)
		method = "Words";
	if (options.lines)
		method = "Lines";
	if (options.sentences)
		method = "Sentences";
	
	var total_content = 0;
	var changed_content = 0;

	var offset = 0;
	var hunks = diff["diff" + method](a, b)
		.map(function(change) {
			// Increment counter of total characters encountered.
			total_content += change.value.length;
			
			if (change.added || change.removed) {
				// Increment counter of changed characters.
				changed_content += change.value.length;

				// Create a hunk for this change.
				var length = 0, new_value = "";
				if (change.removed) length = change.value.length;
				if (change.added) new_value = change.value;
				var ret = { offset: offset, length: length, op: new jot.SET(new_value) };
				offset = 0;
				return ret;
			} else {
				// Advance character position index. Don't generate a hunk here.
				offset += change.value.length;
				return null;
			}
		})
		.filter(function(item) { return item != null; });

	// Form the PATCH operation.
	var op = new jot.PATCH(hunks).simplify();
	return {
		op: op,
		pct: (changed_content+1)/(total_content+1), // avoid divizion by zero
		size: total_content
	};
}

function diff_arrays(a, b, options) {
	// Use the 'generic-diff' package to compare two arrays,
	// but using a custom equality function. This gives us
	// a relation between the elements in the arrays. Then
	// we can compute the operations for the diffs for the
	// elements that are lined up (and INS/DEL operations
	// for elements that are added/removed).
	
	var generic_diff = require("generic-diff");

	// We'll run generic_diff over an array of indices
	// into a and b, rather than on the elements themselves.
	var ai = a.map(function(item, i) { return i });
	var bi = b.map(function(item, i) { return i });

	var ops = [ ];
	var total_content = 0;
	var changed_content = 0;
	var pos = 0;

	function do_diff(ai, bi, level) {
		// Run generic-diff using a custom equality function that
		// treats two things as equal if their difference percent
		// is less than or equal to level.
		//
		// We get back a sequence of add/remove/equal operations.
		// Merge these into changed/same hunks.

		var hunks = [];
		var a_index = 0;
		var b_index = 0;
		generic_diff(
			ai, bi,
			function(ai, bi) { return diff(a[ai], b[bi], options).pct <= level; }
			).forEach(function(change) {
				if (!change.removed && !change.added) {
					// Same.
					if (a_index+change.items.length > ai.length) throw new Error("out of range");
					if (b_index+change.items.length > bi.length) throw new Error("out of range");
					hunks.push({ type: 'equal', ai: ai.slice(a_index, a_index+change.items.length), bi: bi.slice(b_index, b_index+change.items.length) })
					a_index += change.items.length;
					b_index += change.items.length;
				} else {
					if (hunks.length == 0 || hunks[hunks.length-1].type == 'equal')
						hunks.push({ type: 'unequal', ai: [], bi: [] })
					if (change.added) {
						// Added.
						hunks[hunks.length-1].bi = hunks[hunks.length-1].bi.concat(change.items);
						b_index += change.items.length;
					} else if (change.removed) {
						// Removed.
						hunks[hunks.length-1].ai = hunks[hunks.length-1].ai.concat(change.items);
						a_index += change.items.length;
					}
				}
			});

		// Process each hunk.
		hunks.forEach(function(hunk) {
			//console.log(level, hunk.type, hunk.ai.map(function(i) { return a[i]; }), hunk.bi.map(function(i) { return b[i]; }));

			if (level < 1 && hunk.ai.length > 0 && hunk.bi.length > 0
				&& (level > 0 || hunk.type == "unequal")) {
				// Recurse at a less strict comparison level to
				// tease out more correspondences. We do this both
				// for 'equal' and 'unequal' hunks because even for
				// equal the pairs may not really correspond when
				// level > 0.
				do_diff(
					hunk.ai,
					hunk.bi,
					(level+1.1)/2);
				return;
			}

			if (hunk.ai.length != hunk.bi.length) {
				// The items aren't in correspondence, so we'll just return
				// a whole SPLICE from the left subsequence to the right
				// subsequence.
				var op = new jot.SPLICE(
					pos,
					hunk.ai.length,
					hunk.bi.map(function(i) { return b[i]; }));
				ops.push(op);
				//console.log(op);

				// Increment counters.
				var dd = (JSON.stringify(hunk.ai.map(function(i) { return a[i]; }))
				         + JSON.stringify(hunk.bi.map(function(i) { return b[i]; })));
				dd = dd.length/2;
				total_content += dd;
				changed_content += dd;

			} else {
				// The items in the arrays are in correspondence.
				// They may not be identical, however, if level > 0.
				for (var i = 0; i < hunk.ai.length; i++) {
					var d = diff(a[hunk.ai[i]], b[hunk.bi[i]], options);

					// Add an operation.
					if (!d.op.isNoOp())
						ops.push(new jot.ATINDEX(hunk.bi[i], d.op));

					// Increment counters.
					total_content += d.size;
					changed_content += d.size*d.pct;
				}
			}

			pos += hunk.bi.length;
		});
	}

	// Go.

	do_diff(ai, bi, 0);

	return {
		op: new jot.LIST(ops).simplify(),
		pct: (changed_content+1)/(total_content+1), // avoid divizion by zero
		size: total_content
	};		
}

function diff_objects(a, b, options) {
	// Compare two objects.

	var ops = [ ];
	var total_content = 0;
	var changed_content = 0;
	
	// If a key exists in both objects, then assume the key
	// has not been renamed.
	for (var key in a) {
		if (key in b) {
			// Compute diff.
			d = diff(a[key], b[key], options);

			// Add operation if there were any changes.
			if (!d.op.isNoOp())
				ops.push(new jot.APPLY(key, d.op));

			// Increment counters.
			total_content += d.size;
			changed_content += d.size*d.pct;
		}
	}

	// Do comparisons between all pairs of unmatched
	// keys to see what best lines up with what. Don't
	// store pairs with nothing in common.
	var pairs = [ ];
	/*
	for (var key1 in a) {
		if (key1 in b) continue;
		for (var key2 in b) {
			if (key2 in a) continue;
			var d = diff(a[key1], b[key2], options);
			if (d.pct == 1) continue;
			pairs.push({
				a_key: key1,
				b_key: key2,
				diff: d
			});
		}
	}
	*/

	// Sort the pairs to choose the best matches first.
	// (This is a greedy approach. May not be optimal.)
	var used_a = { };
	var used_b = { };
	pairs.sort(function(a,b) { return ((a.diff.pct*a.diff.size) - (b.diff.pct*b.diff.size)); })
	pairs.forEach(function(item) {
		// Have we already generated an operation renaming
		// the key in a or renaming something to the key in b?
		// If so, this pair can't be used.
		if (item.a_key in used_a) return;
		if (item.b_key in used_b) return;
		used_a[item.a_key] = 1;
		used_b[item.b_key] = 1;

		// Use this pair.
		ops.push(new jot.REN(item.a_key, item.b_key));
		if (!item.diff.op.isNoOp())
			ops.push(new jot.APPLY(item.b_key, item.diff.op));

		// Increment counters.
		total_content += item.diff.size;
		changed_content += item.diff.size*item.diff.pct;
	})

	// Delete/create any keys that didn't match up.
	for (var key in a) {
		if (key in b || key in used_a) continue;
		ops.push(new jot.REM(key));
	}
	for (var key in b) {
		if (key in a || key in used_b) continue;
		ops.push(new jot.PUT(key, b[key]));
	}

	return {
		op: new jot.LIST(ops).simplify(),
		pct: (changed_content+1)/(total_content+1), // avoid divizion by zero
		size: total_content
	};
}


},{"./index.js":12,"deep-equal":17,"diff":19,"generic-diff":26}],12:[function(require,module,exports){
/* Base functions for the operational transformation library. */

var util = require('util');
var shallow_clone = require('shallow-clone');

// Must define this ahead of any imports below so that this constructor
// is available to the operation classes.
exports.BaseOperation = function() {
}
exports.add_op = function(constructor, module, opname) {
	// utility.
	constructor.prototype.type = [module.module_name, opname];
	if (!('op_map' in module))
		module['op_map'] = { };
	module['op_map'][opname] = constructor;
}


// Expose the operation classes through the jot library.
var values = require("./values.js");
var sequences = require("./sequences.js");
var objects = require("./objects.js");
var lists = require("./lists.js");
var copies = require("./copies.js");

exports.NO_OP = values.NO_OP;
exports.SET = values.SET;
exports.MATH = values.MATH;
exports.PATCH = sequences.PATCH;
exports.SPLICE = sequences.SPLICE;
exports.ATINDEX = sequences.ATINDEX;
exports.MAP = sequences.MAP;
exports.PUT = objects.PUT;
exports.REM = objects.REM;
exports.APPLY = objects.APPLY;
exports.LIST = lists.LIST;
exports.COPY = copies.COPY;

// Expose the diff function too.
exports.diff = require('./diff.js').diff;

/////////////////////////////////////////////////////////////////////

exports.BaseOperation.prototype.isNoOp = function() {
	return this instanceof values.NO_OP;
}

exports.BaseOperation.prototype.visit = function(visitor) {
	// A simple visitor paradigm. Replace this operation instance itself
	// and any operation within it with the value returned by calling
	// visitor on itself, or if the visitor returns anything falsey
	// (probably undefined) then return the operation unchanged.
	return visitor(this) || this;
}

exports.BaseOperation.prototype.toJSON = function(__key__, protocol_version) {
	// The first argument __key__ is used when this function is called by
	// JSON.stringify. For reasons unclear, we get the name of the property
	// that this object is stored in in its parent? Doesn't matter. We
	// leave a slot so that this function can be correctly called by JSON.
	// stringify, but we don't use it.

	// The return value.
	var repr = { };

	// If protocol_version is unspecified, then this is a top-level call.
	// Choose the latest (and only) protocol version and write it into
	// the output data structure, and pass it down recursively.
	//
	// If protocol_version was specified, this is a recursive call and
	// we don't need to write it out. Sanity check it's a valid value.
	if (typeof protocol_version == "undefined") {
		protocol_version = 1;
		repr["_ver"] = protocol_version;
	} else {
		if (protocol_version !== 1) throw new Error("Invalid protocol version: " + protocol_version);
	}

	// Set the module and operation name.
	repr['_type'] = this.type[0] + "." + this.type[1];

	// Call the operation's toJSON function.
	this.internalToJSON(repr, protocol_version);

	// Return.
	return repr;
}

exports.opFromJSON = function(obj, protocol_version, op_map) {
	// Sanity check.
	if (typeof obj !== "object") throw new Error("Not an operation.");

	// If protocol_version is unspecified, then this is a top-level call.
	// The version must be encoded in the object, and we pass it down
	// recursively.
	//
	// If protocol_version is specified, this is a recursive call and
	// we don't need to read it from the object.
	if (typeof protocol_version === "undefined") {
		protocol_version = obj['_ver'];
		if (protocol_version !== 1)
			throw new Error("JOT serialized data structure is missing protocol version and one wasn't provided as an argument.");
	} else {
		if (protocol_version !== 1)
			throw new Error("Invalid protocol version provided: " + protocol_version)
		if ("_ver" in obj)
			throw new Error("JOT serialized data structure should not have protocol version because it was provided as an argument.");
	}

	// Create a default mapping from encoded types to constructors
	// allowing all operations to be deserialized.
	if (!op_map) {
		op_map = { };

		function extend_op_map(module) {
			op_map[module.module_name] = { };
			for (var key in module.op_map)
				op_map[module.module_name][key] = module.op_map[key];
		}

		extend_op_map(values);
		extend_op_map(sequences);
		extend_op_map(objects);
		extend_op_map(lists);
		extend_op_map(copies);
	}

	// Get the operation class.
	if (typeof obj['_type'] !== "string") throw new Error("Not an operation.");
	var dottedclassparts = obj._type.split(/\./g, 2);
	if (dottedclassparts.length != 2) throw new Error("Not an operation.");
	var clazz = op_map[dottedclassparts[0]][dottedclassparts[1]];

	// Call the deserializer function on the class.
	return clazz.internalFromJSON(obj, protocol_version, op_map);
}

exports.BaseOperation.prototype.serialize = function() {
	// JSON.stringify will use the object's toJSON method
	// implicitly.
	return JSON.stringify(this);
}
exports.deserialize = function(op_json) {
	return exports.opFromJSON(JSON.parse(op_json));
}

exports.BaseOperation.prototype.compose = function(other, no_list) {
	if (!(other instanceof exports.BaseOperation))
		throw new Error("Argument must be an operation.");

	// A NO_OP composed with anything just gives the other thing.
	if (this instanceof values.NO_OP)
		return other;

	// Composing with a NO_OP does nothing.
	if (other instanceof values.NO_OP)
		return this;

	// Composing with a SET obliterates this operation.
	if (other instanceof values.SET)
		return other;

	// Attempt an atomic composition if this defines the method.
	if (this.atomic_compose) {
		var op = this.atomic_compose(other);
		if (op != null)
			return op;
	}

	if (no_list)
		return null;

	// Fall back to creating a LIST. Call simplify() to weed out
	// anything equivalent to a NO_OP.
	return new lists.LIST([this, other]).simplify();
}

exports.BaseOperation.prototype.rebase = function(other, conflictless, debug) {
	/* Transforms this operation so that it can be composed *after* the other
	   operation to yield the same logical effect as if it had been executed
	   in parallel (rather than in sequence). Returns null on conflict.
	   If conflictless is true, tries extra hard to resolve a conflict in a
	   sensible way but possibly by killing one operation or the other.
	   Returns the rebased version of this. */

	// Run the rebase operation in a's prototype. If a doesn't define it,
	// check b's prototype. If neither define a rebase operation, then there
	// is a conflict.
	for (var i = 0; i < ((this.rebase_functions!=null) ? this.rebase_functions.length : 0); i++) {
		if (other instanceof this.rebase_functions[i][0]) {
			var r = this.rebase_functions[i][1].call(this, other, conflictless);
			if (r != null && r[0] != null) {
				if (debug) debug("rebase", this, "on", other, (conflictless ? "conflictless" : ""), ("document" in conflictless ? JSON.stringify(conflictless.document) : ""), "=>", r[0]);
				return r[0];
			}
		}
	}

	// Either a didn't define a rebase function for b's data type, or else
	// it returned null above. We can try running the same logic backwards on b.
	for (var i = 0; i < ((other.rebase_functions!=null) ? other.rebase_functions.length : 0); i++) {
		if (this instanceof other.rebase_functions[i][0]) {
			var r = other.rebase_functions[i][1].call(other, this, conflictless);
			if (r != null && r[1] != null) {
				if (debug) debug("rebase", this, "on", other, (conflictless ? "conflictless" : ""), ("document" in conflictless ? JSON.stringify(conflictless.document) : ""), "=>", r[0]);
				return r[1];
			}
		}
	}

	// Everything can rebase against a LIST and vice versa.
	// This has higher precedence than the this instanceof SET fallback.
	if (this instanceof lists.LIST || other instanceof lists.LIST) {
		var ret = lists.rebase(other, this, conflictless, debug);
		if (debug) debug("rebase", this, "on", other, "=>", ret);
		return ret;
	}

	if (conflictless) {
		// Everything can rebase against a COPY in conflictless mode when
		// a previous document content is given --- the document is needed
		// to parse a JSONPointer and know whether the path components are
		// for objects or arrays. If this's operation affects a path that
		// is copied, the operation is cloned to the target path.
		// This has higher precedence than the this instanceof SET fallback.
		if (other instanceof copies.COPY && typeof conflictless.document != "undefined")
			return other.clone_operation(this, conflictless.document);

		// Everything can rebase against a SET in a conflictless way.
		// Note that to resolve ties, SET rebased against SET is handled
		// in SET's rebase_functions.

		// The SET always wins!
		if (this instanceof values.SET) {
			if (debug) debug("rebase", this, "on", other, "=>", this);
			return this;
		}
		if (other instanceof values.SET) {
			if (debug) debug("rebase", this, "on", other, "=>", new values.NO_OP());
			return new values.NO_OP();
		}

		// If conflictless rebase would fail, raise an error.
		throw new Error("Rebase failed between " + this.inspect() + " and " + other.inspect() + ".");
	}

	return null;
}

exports.createRandomValue = function(depth) {
	var values = [];

	// null
	values.push(null);

	// boolean
	values.push(false);
	values.push(true);

	// number (integer, float)
	values.push(1000 * Math.floor(Math.random() - .5));
	values.push(Math.random() - .5);
	values.push(1000 * (Math.random() - .5));

	// string
	values.push(Math.random().toString(36).substring(7));

	// array (make nesting exponentially less likely at each level of recursion)
	if (Math.random() < Math.exp(-(depth||0))) {
		var n = Math.floor(Math.exp(3*Math.random()))-1;
		var array = [];
		while (array.length < n)
			array.push(exports.createRandomValue((depth||0)+1));
		values.push(array);
	}

	// object (make nesting exponentially less likely at each level of recursion)
	if (Math.random() < Math.exp(-(depth||0))) {
		var n = Math.floor(Math.exp(2.5*Math.random()))-1;
		var obj = { };
		while (Object.keys(obj).length < n)
			obj[Math.random().toString(36).substring(7)] = exports.createRandomValue((depth||0)+1);
		values.push(obj);
	}

	return values[Math.floor(Math.random() * values.length)];
}

exports.createRandomOp = function(doc, context) {
	// Creates a random operation that could apply to doc. Just
	// chain off to the modules that can handle the data type.

	var modules = [];

	// The values module can handle any data type.
	modules.push(values);

	// sequences applies to strings and arrays.
	if (typeof doc === "string" || Array.isArray(doc)) {
		modules.push(sequences);
		//modules.push(copies);
	}

	// objects applies to objects (but not Array objects or null)
	else if (typeof doc === "object" && doc !== null) {
		modules.push(objects);
		//modules.push(copies);
	}

	// the lists module only defines LIST which can also
	// be applied to any data type but gives us stack
	// overflows
	//modules.push(lists);

	return modules[Math.floor(Math.random() * modules.length)]
		.createRandomOp(doc, context);
}

exports.createRandomOpSequence = function(value, count) {
	// Create a random sequence of operations starting with a given value.
	var ops = [];
	while (ops.length < count) {
		// Create random operation.
		var op = exports.createRandomOp(value);

		// Make the result of applying the op the initial value
		// for the next operation. createRandomOp sometimes returns
		// invalid operations, in which case we'll try again.
		// TODO: Make createRandomOp always return a valid operation
		// and remove the try block.
		try {
			value = op.apply(value);
		} catch (e) {
			continue; // retry
		}

		ops.push(op);
	}
	return new lists.LIST(ops);
}

exports.type_name = function(x) {
	if (typeof x == 'object') {
		if (Array.isArray(x))
			return 'array';
		return 'object';
	}
	return typeof x;
}

// Utility function to compare values for the purposes of
// setting sort orders that resolve conflicts.
exports.cmp = function(a, b) {
	// For objects.MISSING, make sure we try object identity.
	if (a === b)
		return 0;

	// objects.MISSING has a lower sort order so that it tends to get clobbered.
	if (a === objects.MISSING)
		return -1;
	if (b === objects.MISSING)
		return 1;

	// Comparing strings to numbers, numbers to objects, etc.
	// just sort based on the type name.
	if (exports.type_name(a) != exports.type_name(b)) {
		return exports.cmp(exports.type_name(a), exports.type_name(b));
	
	} else if (typeof a == "number") {
		if (a < b)
			return -1;
		if (a > b)
			return 1;
		return 0;
		
	} else if (typeof a == "string") {
		return a.localeCompare(b);
	
	} else if (Array.isArray(a)) {
		// First compare on length.
		var x = exports.cmp(a.length, b.length);
		if (x != 0) return x;

		// Same length, compare on values.
		for (var i = 0; i < a.length; i++) {
			x = exports.cmp(a[i], b[i]);
			if (x != 0) return x;
		}

		return 0;
	}

	// Compare on strings.
	// TODO: Find a better way to sort objects.
	return JSON.stringify(a).localeCompare(JSON.stringify(b));
}


},{"./copies.js":10,"./diff.js":11,"./lists.js":13,"./objects.js":14,"./sequences.js":15,"./values.js":16,"shallow-clone":55,"util":8}],13:[function(require,module,exports){
/*  This module defines one operation:
	
	LIST([op1, op2, ...])
	
	A composition of zero or more operations, given as an array.

	*/
	
var util = require("util");

var shallow_clone = require('shallow-clone');

var jot = require("./index.js");
var values = require('./values.js');

exports.module_name = 'lists'; // for serialization/deserialization

exports.LIST = function (ops) {
	if (!Array.isArray(ops)) throw new Error("Argument must be an array.");
	ops.forEach(function(op) {
		if (!(op instanceof jot.BaseOperation))
			throw new Error("Argument must be an array containing operations (found " + op + ").");
	})
	this.ops = ops; // TODO: How to ensure this array is immutable?
	Object.freeze(this);
}
exports.LIST.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.LIST, exports, 'LIST');

exports.LIST.prototype.inspect = function(depth) {
	return util.format("<LIST [%s]>",
		this.ops.map(function(item) { return item.inspect(depth-1) }).join(", "));
}

exports.LIST.prototype.visit = function(visitor) {
	// A simple visitor paradigm. Replace this operation instance itself
	// and any operation within it with the value returned by calling
	// visitor on itself, or if the visitor returns anything falsey
	// (probably undefined) then return the operation unchanged.
	var ret = new exports.LIST(this.ops.map(function(op) { return op.visit(visitor); }));
	return visitor(ret) || ret;
}

exports.LIST.prototype.internalToJSON = function(json, protocol_version) {
	json.ops = this.ops.map(function(op) {
		return op.toJSON(undefined, protocol_version);
	});
}

exports.LIST.internalFromJSON = function(json, protocol_version, op_map) {
	var ops = json.ops.map(function(op) {
		return jot.opFromJSON(op, protocol_version, op_map);
	});
	return new exports.LIST(ops);
}

exports.LIST.prototype.apply = function (document) {
	/* Applies the operation to a document.*/
	for (var i = 0; i < this.ops.length; i++)
		document = this.ops[i].apply(document);
	return document;
}

exports.LIST.prototype.simplify = function (aggressive) {
	/* Returns a new operation that is a simpler version
	   of this operation. Composes consecutive operations where
	   possible and removes no-ops. Returns NO_OP if the result
	   would be an empty list of operations. Returns an
	   atomic (non-LIST) operation if possible. */
	var new_ops = [];
	for (var i = 0; i < this.ops.length; i++) {
		var op = this.ops[i];

		// simplify the inner op
		op = op.simplify();

		// if this isn't the first operation, try to atomic_compose the operation
		// with the previous one.
		while (new_ops.length > 0) {
			// Don't bother with atomic_compose if the op to add is a no-op.
			if (op.isNoOp())
				break;

			var c = new_ops[new_ops.length-1].compose(op, true);

			// If there is no atomic composition, there's nothing more we can do.
			if (!c)
				break;

			// The atomic composition was successful. Remove the old previous operation.
			new_ops.pop();

			// Use the atomic_composition as the next op to add. On the next iteration
			// try composing it with the new last element of new_ops.
			op = c;
		}

		// Don't add to the new list if it is a no-op.
		if (op.isNoOp())
			continue;

		// if it's the first operation, or atomic_compose failed, add it to the new_ops list
		new_ops.push(op);
	}

	if (new_ops.length == 0)
		return new values.NO_OP();
	if (new_ops.length == 1)
		return new_ops[0];

	return new exports.LIST(new_ops);
}

exports.LIST.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation:
	   the inverse of each operation in reverse order. */
	var new_ops = [];
	this.ops.forEach(function(op) {
		new_ops.push(op.inverse(document));
		document = op.apply(document);
	})
	new_ops.reverse();
	return new exports.LIST(new_ops);
}

exports.LIST.prototype.atomic_compose = function (other) {
	/* Returns a LIST operation that has the same result as this
	   and other applied in sequence (this first, other after). */

	// Nothing here anyway, return the other.
	if (this.ops.length == 0)
		return other;

	// the next operation is an empty list, so the composition is just this
	if (other instanceof exports.LIST) {
		if (other.ops.length == 0)
			return this;
		
		// concatenate
		return new exports.LIST(this.ops.concat(other.ops));
	}


	// append
	var new_ops = this.ops.slice(); // clone
	new_ops.push(other);
	return new exports.LIST(new_ops);
}

exports.rebase = function(base, ops, conflictless, debug) {
	// Ensure the operations are simplified, since rebase
	// is much more expensive than simplified.

	base = base.simplify();
	ops = ops.simplify();

	// Turn each argument into an array of operations.
	// If an argument is a LIST, unwrap it.

	if (base instanceof exports.LIST)
		base = base.ops;
	else
		base = [base];

	if (ops instanceof exports.LIST)
		ops = ops.ops;
	else
		ops = [ops];

	// Run the rebase algorithm.

	var ret = rebase_array(base, ops, conflictless, debug);

	// The rebase may have failed.
	if (ret == null) return null;

	// ...or yielded no operations --- turn it into a NO_OP operation.
	if (ret.length == 0) return new values.NO_OP();

	// ...or yielded a single operation --- return it.
	if (ret.length == 1) return ret[0];

	// ...or yielded a list of operations --- re-wrap it in a LIST operation.
	return new exports.LIST(ret).simplify();
}

function rebase_array(base, ops, conflictless, debug) {
	/* This is one of the core functions of the library: rebasing a sequence
	   of operations against another sequence of operations. */

	/*
	* To see the logic, it will help to put this in a symbolic form.
	*
	*   Let a + b == compose(a, b)
	*   and a / b == rebase(b, a)
	*
	* The contract of rebase has two parts;
	*
	* 	1) a + (b/a) == b + (a/b)
	* 	2) x/(a + b) == (x/a)/b
	*
	* Also note that the compose operator is associative, so
	*
	*	a + (b+c) == (a+b) + c
	*
	* Our return value here in symbolic form is:
	*
	*   (op1/base) + (op2/(base/op1))
	*   where ops = op1 + op2
	*
	* To see that we've implemented rebase correctly, let's look
	* at what happens when we compose our result with base as per
	* the rebase rule:
	*
	*   base + (ops/base)
	*
	* And then do some algebraic manipulations:
	*
	*   base + [ (op1/base) + (op2/(base/op1)) ]   (substituting our hypothesis for self/base)
	*   [ base + (op1/base) ] + (op2/(base/op1))   (associativity)
	*   [ op1 + (base/op1) ] + (op2/(base/op1))    (rebase's contract on the left side)
	*   op1 + [ (base/op1)  + (op2/(base/op1)) ]   (associativity)
	*   op1 + [ op2 + ((base/op1)/op2) ]           (rebase's contract on the right side)
	*   (op1 + op2) + ((base/op1)/op2)             (associativity)
	*   self + [(base/op1)/op2]                    (substituting self for (op1+op2))
	*   self + [base/(op1+op2)]                    (rebase's second contract)
	*   self + (base/self)                         (substitution)
	*
	* Thus we've proved that the rebase contract holds for our return value.
	*/

	if (ops.length == 0 || base.length == 0)
		return ops;

	if (ops.length == 1 && base.length == 1) {
		// This is the recursive base case: Rebasing a single operation against a single
		// operation. Wrap the result in an array.
		var op = ops[0].rebase(base[0], conflictless, debug);
		if (!op) return null; // conflict
		if (op instanceof jot.NO_OP) return [];
		if (op instanceof jot.LIST) return op.ops;
		return [op];
	}
	
	if (debug) {
		// Wrap the debug function to emit an extra argument to show depth.
		debug("rebasing", ops, "on", base, conflictless ? "conflictless" : "", "document" in conflictless ? JSON.stringify(conflictless.document) : "", "...");
		var original_debug = debug;
		debug = function() { var args = [">"].concat(Array.from(arguments)); original_debug.apply(null, args); }
	}
	
	if (base.length == 1) {
		// Rebase more than one operation (ops) against a single operation (base[0]).

		// Nothing to do if it is a no-op.
		if (base[0] instanceof values.NO_OP)
			return ops;

		// The result is the first operation in ops rebased against the base concatenated with
		// the remainder of ops rebased against the-base-rebased-against-the-first-operation:
		// (op1/base) + (op2/(base/op1))

		var op1 = ops.slice(0, 1); // first operation
		var op2 = ops.slice(1); // remaining operations
		
		var r1 = rebase_array(base, op1, conflictless, debug);
		if (r1 == null) return null; // rebase failed
		
		var r2 = rebase_array(op1, base, conflictless, debug);
		if (r2 == null) return null; // rebase failed (must be the same as r1, so this test should never succeed)
		
		// For the remainder operations, we have to adjust the 'conflictless' object.
		// If it provides the base document state, then we have to advance the document
		// for the application of op1.
		var conflictless2 = null;
		if (conflictless) {
			conflictless2 = shallow_clone(conflictless);
			if ("document" in conflictless2)
				conflictless2.document = op1[0].apply(conflictless2.document);
		}

		var r3 = rebase_array(r2, op2, conflictless2, debug);
		if (r3 == null) return null; // rebase failed
		
		// returns a new array
		return r1.concat(r3);

	} else {
		// Rebase one or more operations (ops) against more than one operation (base).
		//
		// From the second part of the rebase contract, we can rebase ops
		// against each operation in the base sequentially (base[0], base[1], ...).
		
		// shallow clone
		conflictless = !conflictless ? null : shallow_clone(conflictless);

		for (var i = 0; i < base.length; i++) {
			ops = rebase_array([base[i]], ops, conflictless, debug);
			if (ops == null) return null; // conflict

			// Adjust the 'conflictless' object if it provides the base document state
			// since for later operations we're assuming base[i] has now been applied.
			if (conflictless && "document" in conflictless)
				conflictless.document = base[i].apply(conflictless.document);
		}

		return ops;
	}
}

exports.LIST.prototype.drilldown = function(index_or_key) {
	return new exports.LIST(this.ops.map(function(op) {
		return op.drilldown(index_or_key)
	})).simplify();
}

exports.createRandomOp = function(doc, context) {
	// Create a random LIST that could apply to doc.
	var ops = [];
	while (ops.length == 0 || Math.random() < .75) {
		ops.push(jot.createRandomOp(doc, context));
		doc = ops[ops.length-1].apply(doc);
	}
	return new exports.LIST(ops);
}

},{"./index.js":12,"./values.js":16,"shallow-clone":55,"util":8}],14:[function(require,module,exports){
/* A library of operations for objects (i.e. JSON objects/Javascript associative arrays).

   new objects.PUT(key, value)
    
    Creates a property with the given value. This is an alias for
    new objects.APPLY(key, new values.SET(value)).

   new objects.REM(key)
    
    Removes a property from an object. This is an alias for
    new objects.APPLY(key, new values.SET(objects.MISSING)).

   new objects.APPLY(key, operation)
   new objects.APPLY({key: operation, ...})

    Applies any operation to a property, or multiple operations to various
    properties, on the object.

    Use any operation defined in any of the modules depending on the data type
    of the property. For instance, the operations in values.js can be
    applied to any property. The operations in sequences.js can be used
    if the property's value is a string or array. And the operations in
    this module can be used if the value is another object.

    Supports a conflictless rebase with itself with the inner operations
    themselves support a conflictless rebase. It does not generate conflicts
    with any other operations in this module.

    Example:
    
    To replace the value of a property with a new value:
    
      new objects.APPLY("key1", new values.SET("value"))

	or

      new objects.APPLY({ key1: new values.SET("value") })

   */
   
var util = require('util');

var deepEqual = require("deep-equal");
var shallow_clone = require('shallow-clone');

var jot = require("./index.js");
var values = require("./values.js");
var LIST = require("./lists.js").LIST;

//////////////////////////////////////////////////////////////////////////////

exports.module_name = 'objects'; // for serialization/deserialization

exports.APPLY = function () {
	if (arguments.length == 1 && typeof arguments[0] == "object") {
		// Dict form.
		this.ops = arguments[0];
	} else if (arguments.length == 2 && typeof arguments[0] == "string") {
		// key & operation form.
		this.ops = { };
		this.ops[arguments[0]] = arguments[1];
	} else {
		throw new Error("invalid arguments");
	}
	Object.freeze(this);
	Object.freeze(this.ops);
}
exports.APPLY.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.APPLY, exports, 'APPLY');

// The MISSING object is a sentinel to signal the state of an Object property
// that does not exist. It is the old_value to SET when adding a new property
// and the value when removing a property.
exports.MISSING = new Object();
Object.freeze(exports.MISSING);

exports.PUT = function (key, value) {
	exports.APPLY.apply(this, [key, new values.SET(value)]);
}
exports.PUT.prototype = Object.create(exports.APPLY.prototype); // inherit prototype

exports.REM = function (key) {
	exports.APPLY.apply(this, [key, new values.SET(exports.MISSING)]);
}
exports.REM.prototype = Object.create(exports.APPLY.prototype); // inherit prototype

//////////////////////////////////////////////////////////////////////////////

exports.APPLY.prototype.inspect = function(depth) {
	var inner = [];
	var ops = this.ops;
	Object.keys(ops).forEach(function(key) {
		inner.push(util.format("%j:%s", key, ops[key].inspect(depth-1)));
	});
	return util.format("<APPLY %s>", inner.join(", "));
}

exports.APPLY.prototype.visit = function(visitor) {
	// A simple visitor paradigm. Replace this operation instance itself
	// and any operation within it with the value returned by calling
	// visitor on itself, or if the visitor returns anything falsey
	// (probably undefined) then return the operation unchanged.
	var ops = { };
	for (var key in this.ops)
		ops[key] = this.ops[key].visit(visitor);
	var ret = new exports.APPLY(ops);
	return visitor(ret) || ret;
}

exports.APPLY.prototype.internalToJSON = function(json, protocol_version) {
	json.ops = { };
	for (var key in this.ops)
		json.ops[key] = this.ops[key].toJSON(undefined, protocol_version);
}

exports.APPLY.internalFromJSON = function(json, protocol_version, op_map) {
	var ops = { };
	for (var key in json.ops)
		ops[key] = jot.opFromJSON(json.ops[key], protocol_version, op_map);
	return new exports.APPLY(ops);
}

exports.APPLY.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns a new object that is
	   the same type as document but with the change made. */

	// Clone first.
	var d = { };
	for (var k in document)
		d[k] = document[k];

	// Apply. Pass the object and key down in the second argument
	// to apply so that values.SET can handle the special MISSING
	// value.
	for (var key in this.ops) {
		var value = this.ops[key].apply(d[key], [d, key]);
		if (value === exports.MISSING)
			delete d[key]; // key was removed
		else
			d[key] = value;
	}
	return d;
}

exports.APPLY.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
	   of this operation. If there is no sub-operation that is
	   not a NO_OP, then return a NO_OP. Otherwise, simplify all
	   of the sub-operations. */
	var new_ops = { };
	var had_non_noop = false;
	for (var key in this.ops) {
		new_ops[key] = this.ops[key].simplify();
		if (!(new_ops[key] instanceof values.NO_OP))
			// Remember that we have a substantive operation.
			had_non_noop = true;
		else
			// Drop internal NO_OPs.
			delete new_ops[key];
	}
	if (!had_non_noop)
		return new values.NO_OP();
	return new exports.APPLY(new_ops);
}

exports.APPLY.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	   given the state of the document before this operation applies. */
	var new_ops = { };
	for (var key in this.ops) {
		new_ops[key] = this.ops[key].inverse(key in document ? document[key] : exports.MISSING);
	}
	return new exports.APPLY(new_ops);
}

exports.APPLY.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
	   and other applied in sequence (this first, other after). Returns
	   null if no atomic operation is possible. */

	// two APPLYs
	if (other instanceof exports.APPLY) {
		// Start with a clone of this operation's suboperations.
		var new_ops = shallow_clone(this.ops);

		// Now compose with other.
		for (var key in other.ops) {
			if (!(key in new_ops)) {
				// Operation in other applies to a key not present
				// in this, so we can just merge - the operations
				// happen in parallel and don't affect each other.
				new_ops[key] = other.ops[key];
			} else {
				// Compose.
				var op2 = new_ops[key].compose(other.ops[key]);

				// They composed to a no-op, so delete the
				// first operation.
				if (op2 instanceof values.NO_OP)
					delete new_ops[key];

				else
					new_ops[key] = op2;
			}
		}

		return new exports.APPLY(new_ops).simplify();
	}

	// No composition possible.
	return null;
}

exports.APPLY.prototype.rebase_functions = [
	[exports.APPLY, function(other, conflictless) {
		// Rebase the sub-operations on corresponding keys.
		// If any rebase fails, the whole rebase fails.

		// When conflictless is supplied with a prior document state,
		// the state represents the object, so before we call rebase
		// on inner operations, we have to go in a level on the prior
		// document.
		function build_conflictless(key) {
			if (!conflictless || !("document" in conflictless))
				return conflictless;
			var ret = shallow_clone(conflictless);
			if (!(key in conflictless.document))
				// The key being modified isn't present yet.
				ret.document = exports.MISSING;
			else
				ret.document = conflictless.document[key];
			return ret;
		}

		var new_ops_left = { };
		for (var key in this.ops) {
			new_ops_left[key] = this.ops[key];
			if (key in other.ops)
				new_ops_left[key] = new_ops_left[key].rebase(other.ops[key], build_conflictless(key));
			if (new_ops_left[key] === null)
				return null;
		}

		var new_ops_right = { };
		for (var key in other.ops) {
			new_ops_right[key] = other.ops[key];
			if (key in this.ops)
				new_ops_right[key] = new_ops_right[key].rebase(this.ops[key], build_conflictless(key));
			if (new_ops_right[key] === null)
				return null;
		}

		return [
			new exports.APPLY(new_ops_left).simplify(),
			new exports.APPLY(new_ops_right).simplify()
		];
	}]
]

exports.APPLY.prototype.drilldown = function(index_or_key) {
	if (typeof index_or_key == "string" && index_or_key in this.ops)
		return this.ops[index_or_key];
	return new values.NO_OP();
}

exports.createRandomOp = function(doc, context) {
	// Create a random operation that could apply to doc.
	// Choose uniformly across various options.
	var ops = [];

	// Add a random key with a random value.
	ops.push(function() { return new exports.PUT("k"+Math.floor(1000*Math.random()), jot.createRandomValue()); });

	// Apply random operations to individual keys.
	Object.keys(doc).forEach(function(key) {
		ops.push(function() { return jot.createRandomOp(doc[key], "object") });
	});

	// Select randomly.
	return ops[Math.floor(Math.random() * ops.length)]();
}

},{"./index.js":12,"./lists.js":13,"./values.js":16,"deep-equal":17,"shallow-clone":55,"util":8}],15:[function(require,module,exports){
/* An operational transformation library for sequence-like objects,
   i.e. strings and arrays.

   The main operation provided by this library is PATCH, which represents
   a set of non-overlapping changes to a string or array. Each change,
   called a hunk, applies an operation to a subsequence -- i.e. a sub-string
   or a slice of the array. The operation's .apply method yields a new
   sub-sequence, and they are stitched together (along with unchanged elements)
   to form the new document that results from the PATCH operation.

   The internal structure of the PATCH operation is an array of hunks as
   follows:

   new sequences.PATCH(
     [
       { offset: ..., # unchanged elements to skip before this hunk
         length: ..., # length of subsequence modified by this hunk
         op: ...      # jot operation to apply to the subsequence
       },
       ...
     ]
    )

   The inner operation must be one of NO_OP, SET, and MAP (or any
   operation that defines "get_length_change" and "decompose" functions
   and whose rebase always yields an operation that also satisfies these
   same constraints.)


   This library also defines the MAP operation, which applies a jot
   operation to every element of a sequence. The MAP operation is
   also used with length-one hunks to apply an operation to a single
   element. On strings, the MAP operation only accepts inner operations
   that yield back single characters so that a MAP on a string does
   not change the string's length.

   The internal structure of the MAP operation is:

   new sequences.MAP(op)
 
   Shortcuts for constructing useful PATCH operations are provided:

		new sequences.SPLICE(pos, length, value)

			 Equivalent to:

			 PATCH([{
				 offset: pos,
				 length: length,
				 op: new values.SET(value)
				 }])
			 
			 i.e. replace elements with other elements
		
		new sequences.ATINDEX(pos, op)

			 Equivalent to:

			 PATCH([{
				 offset: pos,
				 length: 1,
				 op: new sequences.MAP(op)
				 }])
			 
			 i.e. apply the operation to the single element at pos

		new sequences.ATINDEX({ pos: op, ... })

			 Similar to the above but for multiple operations at once.

		Supports a conflictless rebase with other PATCH operations.

	 */
	 
var util = require('util');

var deepEqual = require("deep-equal");
var shallow_clone = require('shallow-clone');

var jot = require("./index.js");
var values = require("./values.js");
var LIST = require("./lists.js").LIST;

// utilities

function elem(seq, pos) {
	// get an element of the sequence
	if (typeof seq == "string")
		return seq.charAt(pos);
	else // is an array
		return seq[pos];
}
function concat2(item1, item2) {
	if (item1 instanceof String)
		return item1 + item2;
	return item1.concat(item2);
}
function concat3(item1, item2, item3) {
	if (item1 instanceof String)
		return item1 + item2 + item3;
	return item1.concat(item2).concat(item3);
}
function map_index(pos, move_op) {
	if (pos >= move_op.pos && pos < move_op.pos+move_op.count) return (pos-move_op.pos) + move_op.new_pos; // within the move
	if (pos < move_op.pos && pos < move_op.new_pos) return pos; // before the move
	if (pos < move_op.pos) return pos + move_op.count; // a moved around by from right to left
	if (pos > move_op.pos && pos >= move_op.new_pos) return pos; // after the move
	if (pos > move_op.pos) return pos - move_op.count; // a moved around by from left to right
	throw new Error("unhandled problem");
}

//////////////////////////////////////////////////////////////////////////////

exports.module_name = 'sequences'; // for serialization/deserialization

exports.PATCH = function () {
	/* An operation that replaces a subrange of the sequence with new elements. */
	if (arguments[0] === "__hmm__") return; // used for subclassing
	if (arguments.length != 1)
		throw new Error("Invaid Argument");

	this.hunks = arguments[0];

	// Sanity check & freeze hunks.
	if (!Array.isArray(this.hunks))
		throw new Error("Invaid Argument");
	this.hunks.forEach(function(hunk) {
		if (typeof hunk.offset != "number")
			throw new Error("Invalid Argument (hunk offset not a number)");
		if (hunk.offset < 0)
			throw new Error("Invalid Argument (hunk offset is negative)");
		if (typeof hunk.length != "number")
			throw new Error("Invalid Argument (hunk length is not a number)");
		if (hunk.length < 0)
			throw new Error("Invalid Argument (hunk length is negative)");
		if (!(hunk.op instanceof jot.BaseOperation))
			throw new Error("Invalid Argument (hunk operation is not an operation)");
		if (typeof hunk.op.get_length_change != "function")
			throw new Error("Invalid Argument (hunk operation " + hunk.op.inspect() + " does not support get_length_change)");
		if (typeof hunk.op.decompose != "function")
			throw new Error("Invalid Argument (hunk operation " + hunk.op.inspect() + " does not support decompose)");
		Object.freeze(hunk);
	});

	Object.freeze(this);
}
exports.PATCH.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.PATCH, exports, 'PATCH');

	// shortcuts

	exports.SPLICE = function (pos, length, value) {
		// value.slice(0,0) is a shorthand for constructing an empty string or empty list, generically
		exports.PATCH.apply(this, [[{
			offset: pos,
			length: length,
			op: new values.SET(value)
		}]]);
	}
	exports.SPLICE.prototype = new exports.PATCH("__hmm__"); // inherit prototype

	exports.ATINDEX = function () {
		var indexes;
		var op_map;
		if (arguments.length == 1) {
			// The argument is a mapping from indexes to operations to apply
			// at those indexes. Collect all of the integer indexes in sorted
			// order.
			op_map = arguments[0];
			indexes = [];
			Object.keys(op_map).forEach(function(index) { indexes.push(parseInt(index)); });
			indexes.sort();
		} else if (arguments.length == 2) {
			// The arguments are just a single position and operation.
			indexes = [arguments[0]];
			op_map = { };
			op_map[arguments[0]] = arguments[1];
		} else {
			throw new Error("Invalid Argument")
		}

		// Form hunks.
		var hunks = [];
		var offset = 0;
		indexes.forEach(function(index) {
			hunks.push({
				offset: index-offset,
				length: 1,
				op: new exports.MAP(op_map[index])
			})
			offset = index+1;
		});
		exports.PATCH.apply(this, [hunks]);
	}
	exports.ATINDEX.prototype = new exports.PATCH("__hmm__"); // inherit prototype

exports.MAP = function (op) {
	if (op == null) throw new Error("Invalid Argument");
	this.op = op;
	Object.freeze(this);
}
exports.MAP.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.MAP, exports, 'MAP');

//////////////////////////////////////////////////////////////////////////////

exports.PATCH.prototype.inspect = function(depth) {
	return util.format("<PATCH%s>",
		this.hunks.map(function(hunk) {
			if ((hunk.length == 1) && (hunk.op instanceof exports.MAP))
				// special format
				return util.format(" +%d %s",
					hunk.offset,
					hunk.op.op.inspect(depth-1));

			return util.format(" +%dx%d %s",
				hunk.offset,
				hunk.length,
				hunk.op instanceof values.SET
					? util.format("%j", hunk.op.value)
					: hunk.op.inspect(depth-1))
		}).join(","));
}

exports.PATCH.prototype.visit = function(visitor) {
	// A simple visitor paradigm. Replace this operation instance itself
	// and any operation within it with the value returned by calling
	// visitor on itself, or if the visitor returns anything falsey
	// (probably undefined) then return the operation unchanged.
	var ret = new exports.PATCH(this.hunks.map(function(hunk) {
		var ret = shallow_clone(hunk);
		ret.op = ret.op.visit(visitor);
		return ret;
	}));
	return visitor(ret) || ret;
}

exports.PATCH.prototype.internalToJSON = function(json, protocol_version) {
	json.hunks = this.hunks.map(function(hunk) {
		var ret = shallow_clone(hunk);
		ret.op = ret.op.toJSON(undefined, protocol_version);
		return ret;
	});
}

exports.PATCH.internalFromJSON = function(json, protocol_version, op_map) {
	var hunks = json.hunks.map(function(hunk) {
		var ret = shallow_clone(hunk);
		ret.op = jot.opFromJSON(hunk.op, protocol_version, op_map);
		return ret;
	});
	return new exports.PATCH(hunks);
}

exports.PATCH.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns a new sequence that is
		 the same type as document but with the hunks applied. */
	
	var index = 0;
	var ret = document.slice(0,0); // start with an empty document
	
	this.hunks.forEach(function(hunk) {
		if (index + hunk.offset + hunk.length > document.length)
			throw new Error("offset past end of document");

		// Append unchanged content before this hunk.
		ret = concat2(ret, document.slice(index, index+hunk.offset));
		index += hunk.offset;

		// Append new content.
		var new_value = hunk.op.apply(document.slice(index, index+hunk.length));

		if (typeof document == "string" && typeof new_value != "string")
			throw new Error("operation yielded invalid substring");
		if (Array.isArray(document) && !Array.isArray(new_value))
			throw new Error("operation yielded invalid subarray");

		ret = concat2(ret, new_value);

		// Advance counter.
		index += hunk.length;
	});
	
	// Append unchanged content after the last hunk.
	ret = concat2(ret, document.slice(index));
	
	return ret;
}

exports.PATCH.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
		 of this operation.*/

	// Simplify the hunks by removing any that don't make changes.
	// Adjust offsets.

	// Some of the composition methods require knowing if these operations
	// are operating on a string or an array. We might not know if the PATCH
	// only has sub-operations where we can't tell, like a MAP.
	var doctype = null;
	this.hunks.forEach(function (hunk) {
		if (hunk.op instanceof values.SET) {
			if (typeof hunk.op.value == "string")
				doctype = "string";
			else if (Array.isArray(hunk.op.value))
				doctype = "array";
		}
	});

	// Form a new set of merged hunks.

	var hunks = [];
	var doffset = 0;

	function handle_hunk(hunk) {
		var op = hunk.op.simplify();
		
		if (op.isNoOp()) {
			// Drop it, but adjust future offsets.
			doffset += hunk.offset + hunk.length;
			return;

		} else if (hunk.length == 0 && hunk.op.get_length_change(hunk.length) == 0) {
			// The hunk does nothing. Drop it, but adjust future offsets.
			doffset += hunk.offset;
			return;

		} else if (hunks.length > 0
			&& hunk.offset == 0
			&& doffset == 0
			) {
			
			// The hunks are adjacent. We can combine them
			// if one of the operations is a SET and the other
			// is a SET or a MAP containing a SET.
			// We can't combine two adjancent MAP->SET's because
			// we wouldn't know whether the combined value (in
			// a SET) should be a string or an array.
			if ((hunks[hunks.length-1].op instanceof values.SET
				|| (hunks[hunks.length-1].op instanceof exports.MAP && hunks[hunks.length-1].op.op instanceof values.SET))
			 && (hunk.op instanceof values.SET || 
			 	  (hunk.op instanceof exports.MAP && hunk.op.op instanceof values.SET) )
			 && doctype != null) {

				function get_value(hunk) {
				 	if (hunk.op instanceof values.SET) {
				 		// The value is just the SET's value.
				 		return hunk.op.value;
				 	} else {
				 		// The value is a sequence of the hunk's length
				 		// where each element is the value of the inner
				 		// SET's value.
					 	var value = [];
					 	for (var i = 0; i < hunk.length; i++)
					 		value.push(hunk.op.op.value);

					 	// If the outer value is a string, reform it as
					 	// a string.
					 	if (doctype == "string")
					 		value = value.join("");
					 	return value;
				 	}
				}

				hunks[hunks.length-1] = {
					offset: hunks[hunks.length-1].offset,
					length: hunks[hunks.length-1].length + hunk.length,
					op: new values.SET(
						concat2(
							get_value(hunks[hunks.length-1]),
							get_value(hunk))
						)
				};

				return;
			}

		}

		// Preserve but adjust offset.
		hunks.push({
			offset: hunk.offset+doffset,
			length: hunk.length,
			op: op
		});
		doffset = 0;
	}
	
	this.hunks.forEach(handle_hunk);
	if (hunks.length == 0)
		return new values.NO_OP();
	
	return new exports.PATCH(hunks);
}

exports.PATCH.prototype.drilldown = function(index_or_key) {
	if (!Number.isInteger(index_or_key) || index_or_key < 0)
		return new values.NO_OP();
	var index = 0;
	var ret = null;
	this.hunks.forEach(function(hunk) {
		index += hunk.offset;
		if (index <= index_or_key && index_or_key < index+hunk.length)
			ret = hunk.op.drilldown(index_or_key-index);
		index += hunk.length;
	})
	return ret ? ret : new values.NO_OP();
}

exports.PATCH.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	   given the state of the document before this operation applies.
	   The inverse simply inverts the operations on the hunks, but the
	   lengths have to be fixed. */
	var offset = 0;
	return new exports.PATCH(this.hunks.map(function(hunk) {
		var newhunk = {
			offset: hunk.offset,
			length: hunk.length + hunk.op.get_length_change(hunk.length),
			op: hunk.op.inverse(document.slice(offset+hunk.offset, offset+hunk.offset+hunk.length))
		}
		offset += hunk.offset + hunk.length;
		return newhunk;
	}));
}

function compose_patches(a, b) {
	// Compose two patches. We do this as if we are zipping up two sequences,
	// where the index into the (hypothetical) sequence that results *after*
	// a is applied lines up with the index into the (hypothetical) sequence
	// before b is applied.
	
	var hunks = [];
	var index = 0;

	function make_state(op, side) {
		return {
			index: 0,
			hunks: op.hunks.slice(), // clone
			empty: function() { return this.hunks.length == 0; },
			take: function() {
				var curend = this.end();
				var h = this.hunks.shift();
				hunks.push({
					offset: this.index + h.offset - index,
					length: h.length,
					op: h.op
				});
				this.index = curend;
				index = this.index;
			},
			skip: function() {
				this.index = this.end();
				this.hunks.shift();
			},
			start: function() {
				return this.index + this.hunks[0].offset;
			},
			end: function() {
				var h = this.hunks[0];
				var ret = this.index + h.offset + h.length;
				if (side == 0)
					ret += h.op.get_length_change(h.length);
				return ret;
			}
		}
	}
	
	var a_state = make_state(a, 0),
	    b_state = make_state(b, 1);
	
	while (!a_state.empty() || !b_state.empty()) {
		// Only operations in 'a' are remaining.
		if (b_state.empty()) {
			a_state.take();
			continue;
		}

		// Only operations in 'b' are remaining.
		if (a_state.empty()) {
			b_state.take();
			continue;
		}

		// The next hunk in 'a' precedes the next hunk in 'b'.
		if (a_state.end() <= b_state.start()) {
			a_state.take();
			continue;
		}

		// The next hunk in 'b' precedes the next hunk in 'a'.
		if (b_state.end() <= a_state.start()) {
			b_state.take();
			continue;
		}

		// There's overlap.

		var dx_start = b_state.start() - a_state.start();
		var dx_end = b_state.end() - a_state.end();
		if (dx_start >= 0 && dx_end <= 0) {
			// 'a' wholly encompasses 'b', including the case where they
			// changed the exact same elements.

			// Compose a's and b's suboperations using
			// atomic_compose. If the two hunks changed the exact same
			// elements, then we can compose the two operations directly.
			var b_op = b_state.hunks[0].op;
			var dx = b_op.get_length_change(b_state.hunks[0].length);
			if (dx_start != 0 || dx_end != 0) {
				// If a starts before b, wrap b_op in a PATCH operation
				// so that they can be considered to start at the same
				// location.
				b_op = new exports.PATCH([{ offset: dx_start, length: b_state.hunks[0].length, op: b_op }]);
			}

			// Try an atomic composition.
			var ab = a_state.hunks[0].op.atomic_compose(b_op);
			if (!ab && dx_start == 0 && dx_end == 0 && b_op instanceof exports.MAP && b_op.op instanceof values.SET)
				ab = b_op;

			if (ab) {
				// Replace the 'a' operation with itself composed with b's operation.
				// Don't take it yet because there could be more coming on b's
				// side that is within the range of 'a'.
				a_state.hunks[0] = {
					offset: a_state.hunks[0].offset,
					length: a_state.hunks[0].length,
					op: ab
				};

				// Since the a_state hunks have been rewritten, the indexing needs
				// to be adjusted.
				b_state.index += dx;

				// Drop b.
				b_state.skip();
				continue;
			}

			// If no atomic composition is possible, another case may work below
			// by decomposing the operations.
		}

		// There is some sort of other overlap. We can handle this by attempting
		// to decompose the operations.
		if (dx_start > 0) {
			// 'a' begins first. Attempt to decompose it into two operations.
			// Indexing of dx_start is based on the value *after* 'a' applies,
			// so we have to decompose it based on new-value indexes.
			var decomp = a_state.hunks[0].op.decompose(true, dx_start);

			// But we need to know the length of the original hunk so that
			// the operation causes its final length to be dx_start.
			var alen0;
			if (a_state.hunks[0].op.get_length_change(a_state.hunks[0].length) == 0)
				// This is probably a MAP. If the hunk's length is dx_start
				// and the operation causes no length change, then that's
				// the right length!
				alen0 = dx_start;
			else
				return null;

			// Take the left part of the decomposition.
			hunks.push({
				offset: a_state.index + a_state.hunks[0].offset - index,
				length: alen0,
				op: decomp[0]
			});
			a_state.index = a_state.start() + dx_start;
			index = a_state.index;

			// Return the right part of the decomposition to the hunks array.
			a_state.hunks[0] = {
				offset: 0,
				length: a_state.hunks[0].length - alen0,
				op: decomp[1]
			};
			continue;
		}

		if (dx_start < 0) {
			// 'b' begins first. Attempt to decompose it into two operations.
			var decomp = b_state.hunks[0].op.decompose(false, -dx_start);

			// Take the left part of the decomposition.
			hunks.push({
				offset: b_state.index + b_state.hunks[0].offset - index,
				length: (-dx_start),
				op: decomp[0]
			});
			b_state.index = b_state.start() + (-dx_start);
			index = b_state.index;

			// Return the right part of the decomposition to the hunks array.
			b_state.hunks[0] = {
				offset: 0,
				length: b_state.hunks[0].length - (-dx_start),
				op: decomp[1]
			};
			continue;
		}

		// The two hunks start at the same location but have different
		// lengths.
		if (dx_end > 0) {
			// 'b' wholly encompasses 'a'.
			if (b_state.hunks[0].op instanceof values.SET) {
				// 'b' is replacing everything 'a' touched with
				// new elements, so the changes in 'a' can be
				// dropped. But b's length has to be updated
				// if 'a' changed the length of its subsequence.
				var dx = a_state.hunks[0].op.get_length_change(a_state.hunks[0].length);
				b_state.hunks[0] = {
					offset: b_state.hunks[0].offset,
					length: b_state.hunks[0].length - dx,
					op: b_state.hunks[0].op
				};
				a_state.skip();
				a_state.index -= dx;
				continue;
			}
		}

		// TODO.

		// There is no atomic composition.
		return null;
	}

	return new exports.PATCH(hunks).simplify();
}

exports.PATCH.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
		 and other applied in sequence (this first, other after). Returns
		 null if no atomic operation is possible. */

	// a PATCH composes with a PATCH
	if (other instanceof exports.PATCH)
		return compose_patches(this, other);

	// No composition possible.
	return null;
}

function rebase_patches(a, b, conflictless) {
	// Rebasing two PATCHes works like compose, except that we are aligning
	// 'a' and 'b' both on the state of the document before each has applied.
	//
	// We do this as if we are zipping up two sequences, where the index into
	// the (hypothetical) sequence, before either operation applies, lines
	// up across the two operations.
	
	function make_state(op) {
		return {
			old_index: 0,
			old_hunks: op.hunks.slice(),
			dx_index: 0,
			new_hunks: [],
			empty: function() { return this.old_hunks.length == 0; },
			take: function(other, hold_dx_index) {
				var h = this.old_hunks.shift();
				this.new_hunks.push({
					offset: h.offset + this.dx_index,
					length: h.length+(h.dlength||0),
					op: h.op
				});
				this.dx_index = 0;
				this.old_index += h.offset + h.length;
				if (!hold_dx_index) other.dx_index += h.op.get_length_change(h.length);
			},
			skip: function() {
				this.old_index = this.end();
				this.old_hunks.shift();
			},
			start: function() {
				return this.old_index + this.old_hunks[0].offset;
			},
			end: function() {
				var h = this.old_hunks[0];
				return this.old_index + h.offset + h.length;
			}
		}
	}
	
	var a_state = make_state(a),
	    b_state = make_state(b);
	
	while (!a_state.empty() || !b_state.empty()) {
		// Only operations in 'a' are remaining.
		if (b_state.empty()) {
			a_state.take(b_state);
			continue;
		}

		// Only operations in 'b' are remaining.
		if (a_state.empty()) {
			b_state.take(a_state);
			continue;
		}

		// Two insertions at the same location.
		if (a_state.start() == b_state.start()
			&& a_state.old_hunks[0].length == 0
			&& b_state.old_hunks[0].length == 0) {
			
			// This is a conflict because we don't know which side
			// gets inserted first.
			if (!conflictless)
				return null;

			// Or we can resolve the conflict.
			if (jot.cmp(a_state.old_hunks[0].op, b_state.old_hunks[0].op) < 0) {
				a_state.take(b_state);
			} else {
				b_state.take(a_state);
			}
			continue;
		}


		// The next hunk in 'a' precedes the next hunk in 'b'.
		// Take 'a' and adjust b's next offset.
		if (a_state.end() <= b_state.start()) {
			a_state.take(b_state);
			continue;
		}

		// The next hunk in 'b' precedes the next hunk in 'a'.
		// Take 'b' and adjust a's next offset.
		if (b_state.end() <= a_state.start()) {
			b_state.take(a_state);
			continue;
		}

		// There's overlap.

		var dx_start = b_state.start() - a_state.start();
		var dx_end = b_state.end() - a_state.end();

		// They both affected the exact same region, so just rebase the
		// inner operations and update lengths.
		if (dx_start == 0 && dx_end == 0) {
			// When conflictless is supplied with a prior document state,
			// the state represents the sequence, so we have to dig into
			// it and pass an inner value
			var conflictless2 = !conflictless ? null : shallow_clone(conflictless);
			if (conflictless2 && "document" in conflictless2)
				conflictless2.document = conflictless2.document.slice(a_state.start(), a_state.end());

			var ar = a_state.old_hunks[0].op.rebase(b_state.old_hunks[0].op, conflictless2);
			var br = b_state.old_hunks[0].op.rebase(a_state.old_hunks[0].op, conflictless2);
			if (ar == null || br == null)
				return null;

			a_state.old_hunks[0] = {
				offset: a_state.old_hunks[0].offset,
				length: a_state.old_hunks[0].length,
				dlength: b_state.old_hunks[0].op.get_length_change(b_state.old_hunks[0].length),
				op: ar
			}
			b_state.old_hunks[0] = {
				offset: b_state.old_hunks[0].offset,
				length: b_state.old_hunks[0].length,
				dlength: a_state.old_hunks[0].op.get_length_change(a_state.old_hunks[0].length),
				op: br
			}
			a_state.take(b_state, true);
			b_state.take(a_state, true);
			continue;
		}

		// Other overlaps generate conflicts.
		if (!conflictless)
			return null;

		// Decompose whichever one starts first into two operations.
		if (dx_start > 0) {
			// a starts first.
			var hunk = a_state.old_hunks.shift();
			var decomp = hunk.op.decompose(false, dx_start);

			// Unshift the right half of the decomposition.
			a_state.old_hunks.unshift({
				offset: 0,
				length: hunk.length-dx_start,
				op: decomp[1]
			});

			// Unshift the left half of the decomposition.
			a_state.old_hunks.unshift({
				offset: hunk.offset,
				length: dx_start,
				op: decomp[0]
			});

			// Since we know the left half occurs first, take it.
			a_state.take(b_state)

			// Start the iteration over -- we should end up at the block
			// for two hunks that modify the exact same range.
			continue;

		} else if (dx_start < 0) {
			// b starts first.
			var hunk = b_state.old_hunks.shift();
			var decomp = hunk.op.decompose(false, -dx_start);

			// Unshift the right half of the decomposition.
			b_state.old_hunks.unshift({
				offset: 0,
				length: hunk.length+dx_start,
				op: decomp[1]
			});

			// Unshift the left half of the decomposition.
			b_state.old_hunks.unshift({
				offset: hunk.offset,
				length: -dx_start,
				op: decomp[0]
			});

			// Since we know the left half occurs first, take it.
			b_state.take(a_state)

			// Start the iteration over -- we should end up at the block
			// for two hunks that modify the exact same range.
			continue;
		}

		// They start at the same point, but don't end at the same
		// point. Decompose the longer one.
		else if (dx_end < 0) {
			// a is longer.
			var hunk = a_state.old_hunks.shift();
			var decomp = hunk.op.decompose(false, hunk.length+dx_end);

			// Unshift the right half of the decomposition.
			a_state.old_hunks.unshift({
				offset: 0,
				length: -dx_end,
				op: decomp[1]
			});

			// Unshift the left half of the decomposition.
			a_state.old_hunks.unshift({
				offset: hunk.offset,
				length: hunk.length+dx_end,
				op: decomp[0]
			});

			// Start the iteration over -- we should end up at the block
			// for two hunks that modify the exact same range.
			continue;
		} else if (dx_end > 0) {
			// b is longer.
			var hunk = b_state.old_hunks.shift();
			var decomp = hunk.op.decompose(false, hunk.length-dx_end);

			// Unshift the right half of the decomposition.
			b_state.old_hunks.unshift({
				offset: 0,
				length: dx_end,
				op: decomp[1]
			});

			// Unshift the left half of the decomposition.
			b_state.old_hunks.unshift({
				offset: hunk.offset,
				length: hunk.length-dx_end,
				op: decomp[0]
			});

			// Start the iteration over -- we should end up at the block
			// for two hunks that modify the exact same range.
			continue;
		}

		throw new Error("We thought this line was not reachable.");
	}

	return [
		new exports.PATCH(a_state.new_hunks).simplify(),
		new exports.PATCH(b_state.new_hunks).simplify() ];
}

exports.PATCH.prototype.rebase_functions = [
	/* Transforms this operation so that it can be composed *after* the other
		 operation to yield the same logical effect. Returns null on conflict. */

	[exports.PATCH, function(other, conflictless) {
		// Return the new operations.
		return rebase_patches(this, other, conflictless);
	}]
];


exports.PATCH.prototype.get_length_change = function (old_length) {
	// Support routine for PATCH that returns the change in
	// length to a sequence if this operation is applied to it.
	var dlen = 0;
	this.hunks.forEach(function(hunk) {
		dlen += hunk.op.get_length_change(hunk.length);
	});
	return dlen;
}

//////////////////////////////////////////////////////////////////////////////

exports.MAP.prototype.inspect = function(depth) {
	return util.format("<MAP %s>", this.op.inspect(depth-1));
}

exports.MAP.prototype.visit = function(visitor) {
	// A simple visitor paradigm. Replace this operation instance itself
	// and any operation within it with the value returned by calling
	// visitor on itself, or if the visitor returns anything falsey
	// (probably undefined) then return the operation unchanged.
	var ret = new exports.MAP(this.op.visit(visitor));
	return visitor(ret) || ret;
}

exports.MAP.prototype.internalToJSON = function(json, protocol_version) {
	json.op = this.op.toJSON(undefined, protocol_version);
}

exports.MAP.internalFromJSON = function(json, protocol_version, op_map) {
	return new exports.MAP(jot.opFromJSON(json.op, protocol_version, op_map));
}

exports.MAP.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns a new sequence that is
		 the same type as document but with the element modified. */

 	// Turn string into array of characters.
	var d;
	if (typeof document == 'string')
		d = document.split(/.{0}/)

	// Clone array.
	else
		d = document.slice(); // clone
	
	// Apply operation to each element.
	for (var i = 0; i < d.length; i++) {
		d[i] = this.op.apply(d[i])

		// An operation on strings must return a single character.
		if (typeof document == 'string' && (typeof d[i] != 'string' || d[i].length != 1))
			throw new Error("Invalid operation: String type or length changed.")
	}

	// Turn the array of characters back into a string.
	if (typeof document == 'string')
		return d.join("");

	return d;
}

exports.MAP.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
		 of this operation.*/
	var op = this.op.simplify();
	if (op instanceof values.NO_OP)
		return new values.NO_OP();	   
	return this;
}

exports.MAP.prototype.drilldown = function(index_or_key) {
	if (!Number.isInteger(index_or_key) || index_or_key < 0)
		new values.NO_OP();
	return this.op;
}

exports.MAP.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation. */

	if (document.length == 0)
		return new exports.NO_OP();
	if (document.length == 1)
		return new exports.MAP(this.op.inverse(document[0]));

	// Since the inverse depends on the value of the document and the
	// elements of document may not all be the same, we have to explode
	// this out into individual operations.
	var hunks = [];
	if (typeof document == 'string')
		document = document.split(/.{0}/);
	document.forEach(function(element) {
		hunks.append({
			offset: 0,
			length: 1,
			op: this.op.inverse(element)
		});
	});
	return new exports.PATCH(hunks);
}

exports.MAP.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
		 and other applied in sequence (this first, other after). Returns
		 null if no atomic operation is possible. */

	// two MAPs with atomically composable sub-operations
	if (other instanceof exports.MAP) {
		var op2 = this.op.atomic_compose(other.op);
		if (op2)
			return new exports.MAP(op2);
	}

	// No composition possible.
	return null;
}

exports.MAP.prototype.rebase_functions = [
	[exports.MAP, function(other, conflictless) {
		// Two MAPs. The rebase succeeds only if a rebase on the
		// inner operations succeeds.
		var opa;
		var opb;

		// If conflictless is null or there is no prior document
		// state, then it's safe to pass conflictless into the
		// inner operations.
		if (!conflictless || !("document" in conflictless)) {
			opa = this.op.rebase(other.op, conflictless);
			opb = other.op.rebase(this.op, conflictless);

		// If there is a single element in the prior document
		// state, then unwrap it for the inner operations.
		} else if (conflictless.document.length == 1) {
			var conflictless2 = shallow_clone(conflictless);
			conflictless2.document = conflictless2.document[0];

			opa = this.op.rebase(other.op, conflictless2);
			opb = other.op.rebase(this.op, conflictless2);

		// If the prior document state is an empty array, then
		// we know these operations are NO_OPs anyway.
		} else if (conflictless.document.length == 0) {
			return [
				new jot.NO_OP(),
				new jot.NO_OP()
			];

		// The prior document state is an array of more than one
		// element. In order to pass the prior document state into
		// the inner operations, we have to try it for each element
		// of the prior document state. If they all yield the same
		// operation, then we can use that operation. Otherwise the
		// rebases are too sensitive on prior document state and
		// we can't rebase.
		} else {
			var ok = true;
			for (var i = 0; i < conflictless.document.length; i++) {
				var conflictless2 = shallow_clone(conflictless);
				conflictless2.document = conflictless.document[i];

				var a = this.op.rebase(other.op, conflictless2);
				var b = other.op.rebase(this.op, conflictless2);
				if (i == 0) {
					opa = a;
					opb = b;
				} else {
					if (!deepEqual(opa, a, { strict: true }))
						ok = false;
					if (!deepEqual(opb, b, { strict: true }))
						ok = false;
				}
			}

			if (!ok) {
				// The rebases were not the same for all elements. Decompose
				// the MAPs into PATCHes with individual hunks for each index,
				// and then rebase those.
				var _this = this;
				opa = new exports.PATCH(
					conflictless.document.map(function(item) {
						return {
							offset: 0,
							length: 1,
							op: _this
						}
					}));
				opb = new exports.PATCH(
					conflictless.document.map(function(item) {
						return {
							offset: 0,
							length: 1,
							op: other
						}
					}));
				return rebase_patches(opa, opb, conflictless);
			}
		}


		if (opa && opb)
			return [
				(opa instanceof values.NO_OP) ? new values.NO_OP() : new exports.MAP(opa),
				(opb instanceof values.NO_OP) ? new values.NO_OP() : new exports.MAP(opb)
			];
	}],

	[exports.PATCH, function(other, conflictless) {
		// Rebase MAP and PATCH.

		// If the PATCH has no hunks, then the rebase is trivial.
		if (other.hunks.length == 0)
			return [this, other];

		// If the PATCH hunks are all MAP operations and the rebase
		// between this and the hunk operations are all the same,
		// *and* the rebase of this is the same as this, then we can
		// use that. If the rebase is different from this operation,
		// then we can't use it because it wouldn't have the same
		// effect on parts of the sequence that the PATCH does not
		// affect.
		var _this = this;
		var rebase_result;
		other.hunks.forEach(function(hunk) {
			if (!(hunk.op instanceof exports.MAP)) {
				// Rebase is not possible. Flag that it is not possible.
				rebase_result = null;
				return;
			}

			var r = _this.rebase_functions[0][1].call(_this, hunk.op);
			if (!r) {
				// Rebase failed. Flag it.
				rebase_result = null;
				return;
			}

			if (typeof rebase_result == "undefined") {
				// This is the first one.
				rebase_result = r;
				return;
			}

			// Check that it is equal to the last one. If not, flag.
			if (!deepEqual(rebase_result[0], r[0], { strict: true })
				|| !deepEqual(rebase_result[1], r[1], { strict: true }))
				rebase_result = null;
		})
		if (rebase_result != null && deepEqual(rebase_result[0], this, { strict: true })) {
			// Rebase was possible and the same for every operation.
			return [
				rebase_result[0],
				new exports.PATCH(other.hunks.map(function(hunk) {
					hunk = shallow_clone(hunk);
					hunk.op = rebase_result[1];
					return hunk;
				})),
			]
		}

		// Only a conflictless rebase is possible in other cases,
		// and prior document state is required.
		if (conflictless && "document" in conflictless) {
			// Wrap MAP in a PATCH that spans the whole sequence, and then
			// use rebase_patches. This will jump ahead to comparing the
			// MAP to the PATCH's inner operations.
			//
			// NOTE: Operations that are allowed inside PATCH (including MAP)
			// normally must not rebase to an operation that is not allowed
			// inside PATCH. Returning a PATCH here would therefore normally
			// not be valid. We've partially satisfied the contract for PATCH
			// by defining PATCH.get_length_change, but not PATCH.decompose.
			// That seems to be enough.
			return rebase_patches(
				new exports.PATCH([{ offset: 0, length: conflictless.document.length, op: this}]),
				other,
				conflictless);

			/*
			// Alternatively:
			// Since the MAP doesn't change the number of elements in the sequence,
			// it makes sense to have the MAP go first.
			// But we don't do this because we have to return a SET so that LIST.rebase
			// doesn't go into infinite recursion by returning a LIST from a rebase,
			// and SET loses logical structure.
			return [
				// MAP is coming second, so create an operation that undoes
				// the patch, applies the map, and then applies the patch.
				// See values.MATH.rebase for why we return a SET.
				new jot.SET(this.compose(other).apply(conflictless.document)),
				//other.inverse(conflictless.document).compose(this).compose(other),

				// PATCH is coming second, which is right
				other
			];
			*/
		}
	}]
];

exports.MAP.prototype.get_length_change = function (old_length) {
	// Support routine for PATCH that returns the change in
	// length to a sequence if this operation is applied to it.
	return 0;
}

exports.MAP.prototype.decompose = function (in_out, at_index) {
	// Support routine for when this operation is used as a hunk's
	// op in sequences.PATCH (i.e. its document is a string or array
	// sub-sequence) that returns a decomposition of the operation
	// into two operations, one that applies on the left of the
	// sequence and one on the right of the sequence, such that
	// the length of the input (if !in_out) or output (if in_out)
	// of the left operation is at_index, i.e. the split point
	// at_index is relative to the document either before (if
	// !in_out) or after (if in_out) this operation applies.
	//
	// Since MAP applies to all elements, the decomposition
	// is trivial.
	return [this, this];
}

////

exports.createRandomOp = function(doc, context) {
	// Not all inner operations are valid for PATCH and MAP. When they
	// apply to arrays, any inner operation is valid. But when they
	// apply to strings, the inner operations must yield a string
	// and the inner operation of a MAP must yield a length-one string.
	context = (typeof doc == "string") ? "string" : "array";

	// Create a random operation that could apply to doc.
	// Choose uniformly across various options.
	var ops = [];

	// Construct a PATCH.
	ops.push(function() {
		var hunks = [];
		var dx = 0;

		while (dx < doc.length) {
			// Construct a random hunk. First select a range in the
			// document to modify. We can start at any element index,
			// or one past the end to insert at the end.
			var start = dx + Math.floor(Math.random() * (doc.length+1-dx));
			var old_length = (start < doc.length) ? Math.floor(Math.random() * (doc.length - start + 1)) : 0;
			var old_value = doc.slice(start, start+old_length);

			// Choose an inner operation. Only ops in values can be used
			// because ops within PATCH must support get_length_change.
			var op = values.createRandomOp(old_value, context);

			// Push the hunk.
			hunks.push({
				offset: start-dx,
				length: old_length,
				op: op
			});

			dx = start + old_length;

			// Create another hunk?
			if (Math.random() < .25)
				break;
		}

		return new exports.PATCH(hunks);
	});

	// Construct a MAP.
	ops.push(function() {
		while (true) {
			// Choose a random element to use as the template for the
			// random operation. If the sequence is empty, use "?" or null.
			// Don't use an empty string because we can't replace an
			// element of the string with an empty string.
			var random_elem;
			if (doc.length == 0) {
				if (typeof doc === "string")
					random_elem = "?";
				else if (Array.isArray(doc))
					random_elem = null;
			} else {
				random_elem = elem(doc, Math.floor(Math.random() * doc.length));
			}

			// Construct a random operation.
			var op = values.createRandomOp(random_elem, context+"-elem");

			// Test that it is valid on all elements of doc.
			try {
				if (typeof doc === "string") doc = doc.split(''); // convert to array
				doc.forEach(function(item) {
					op.apply(item);
				});
				return new exports.MAP(op);
			} catch (e) {
				// It's invalid. Try again to find a valid operation
				// that can apply to all elements, looping indefinitely
				// until one can be found. SET is always valid and is
				// highly probable to be selected so this shouldn't
				// take long.
			}
		}
	});

	// Select randomly.
	return ops[Math.floor(Math.random() * ops.length)]();
}

},{"./index.js":12,"./lists.js":13,"./values.js":16,"deep-equal":17,"shallow-clone":55,"util":8}],16:[function(require,module,exports){
/*  An operational transformation library for atomic values.

	This library provides three operations: NO_OP (an operation
	that leaves the value unchanged), SET (replaces the value
	with a new value), and MATH (apply one of several mathematical
	functions to the value). These functions are generic over
	various sorts of atomic data types that they may apply to.


	new values.NO_OP()

	This operation does nothing. It is the return value of various
	functions throughout the library, e.g. when operations cancel
	out. NO_OP is conflictless: It never creates a conflict when
	rebased against or operations or when other operations are
	rebased against it.
	

	new values.SET(value)
	
	The atomic replacement of one value with another. Works for
	any data type. The SET operation supports a conflictless
	rebase with all other operations.
	

	new values.MATH(operator, operand)
	
	Applies a commutative arithmetic function to a number or boolean.
	
	"add": addition (use a negative number to decrement) (over numbers only)
	
	"mult": multiplication (use the reciprocal to divide) (over numbers only)
	
	"rot": addition followed by modulus (the operand is given
	       as a tuple of the increment and the modulus). The document
	       object must be a non-negative integer and less than the modulus.

	"and": bitwise and (over integers and booleans only)

	"or": bitwise or (over integers and booleans only)
	
	"xor": bitwise exclusive-or (over integers and booleans
	       only)

	"not": bitwise not (over integers and booleans only; the operand
	       is ignored)
	
	Note that by commutative we mean that the operation is commutative
	under composition, i.e. add(1)+add(2) == add(2)+add(1).

	The operators are also guaranteed to not change the data type of the
	document. Numbers remain numbers and booleans remain booleans.

	MATH supports a conflictless rebase with all other operations if
	prior document state is provided in the conflictless argument object.
	
	*/
	
var util = require('util');
var deepEqual = require("deep-equal");
var jot = require("./index.js");
var MISSING = require("./objects.js").MISSING;

//////////////////////////////////////////////////////////////////////////////

exports.module_name = 'values'; // for serialization/deserialization

exports.NO_OP = function() {
	/* An operation that makes no change to the document. */
	Object.freeze(this);
}
exports.NO_OP.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.NO_OP, exports, 'NO_OP');

exports.SET = function(value) {
	/* An operation that replaces the document with a new (atomic) value. */
	this.value = value;
	Object.freeze(this);
}
exports.SET.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.SET, exports, 'SET');

exports.MATH = function(operator, operand) {
	/* An operation that applies addition, multiplication, or rotation (modulus addition)
	   to a numeric document. */
	this.operator = operator;
	this.operand = operand;

	if (this.operator == "add" || this.operator == "mult") {
		if (typeof this.operand != "number")
			throw new Error("MATH[add] and MATH[mult]'s operand must be a number.")
	}

	if (this.operator == "and" || this.operator == "or" || this.operator == "xor") {
		if (!Number.isInteger(this.operand) && typeof this.operand != "boolean")
			throw new Error("MATH[and] and MATH[or] and MATH[xor]'s operand must be a boolean or integer.")
	}

	if (this.operator == "not") {
		if (this.operand !== null)
			throw new Error("MATH[not]'s operand must be null --- it is not used.")
	}

	if (this.operator == "rot") {
		if (   !Array.isArray(this.operand)
			|| this.operand.length != 2
			|| !Number.isInteger(this.operand[0])
			|| !Number.isInteger(this.operand[1]))
			throw new Error("MATH[rot] operand must be an array with two integer elements.")
		if (this.operand[1] <= 1)
			throw new Error("MATH[rot]'s second operand, the modulus, must be greater than one.")
		if (this.operand[0] >= Math.abs(this.operand[1]))
			throw new Error("MATH[rot]'s first operand, the increment, must be less than its second operand, the modulus.")
	}

	Object.freeze(this);
}
exports.MATH.prototype = Object.create(jot.BaseOperation.prototype); // inherit
jot.add_op(exports.MATH, exports, 'MATH');


//////////////////////////////////////////////////////////////////////////////

exports.NO_OP.prototype.inspect = function(depth) {
	return "<NO_OP>"
}

exports.NO_OP.prototype.internalToJSON = function(json, protocol_version) {
	// Nothing to set.
}

exports.NO_OP.internalFromJSON = function(json, protocol_version, op_map) {
	return new exports.NO_OP();
}

exports.NO_OP.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns the document
	   unchanged. */
	return document;
}

exports.NO_OP.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
	   of this operation.*/
	return this;
}

exports.NO_OP.prototype.drilldown = function(index_or_key) {
	return new values.NO_OP();
};

exports.NO_OP.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	given the state of the document before the operation applies. */
	return this;
}

exports.NO_OP.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
	   and other applied in sequence (this first, other after). Returns
	   null if no atomic operation is possible. */
	return other;
}

exports.NO_OP.prototype.rebase_functions = [
	[jot.BaseOperation, function(other, conflictless) {
		// NO_OP operations do not affect any other operation.
		return [this, other];
	}]
];

exports.NO_OP.prototype.get_length_change = function (old_length) {
	// Support routine for sequences.PATCH that returns the change in
	// length to a sequence if this operation is applied to it.
	return 0;
}

exports.NO_OP.prototype.decompose = function (in_out, at_index) {
	// Support routine for when this operation is used as a hunk's
	// op in sequences.PATCH (i.e. its document is a string or array
	// sub-sequence) that returns a decomposition of the operation
	// into two operations, one that applies on the left of the
	// sequence and one on the right of the sequence, such that
	// the length of the input (if !in_out) or output (if in_out)
	// of the left operation is at_index, i.e. the split point
	// at_index is relative to the document either before (if
	// !in_out) or after (if in_out) this operation applies.
	//
	// Since NO_OP has no effect, its decomposition is trivial.
	return [this, this];
}

//////////////////////////////////////////////////////////////////////////////

exports.SET.prototype.inspect = function(depth) {
	function str(v) {
		// Render the special MISSING value from objects.js
		// not as a JSON object.
		if (v === MISSING)
			return "~";

		// Render any other value as a JSON string.
		return util.format("%j", v);
	}
	return util.format("<SET %s>", str(this.value));
}

exports.SET.prototype.internalToJSON = function(json, protocol_version) {
	if (this.value === MISSING)
		json.value_missing = true;
	else
		json.value = this.value;
}

exports.SET.internalFromJSON = function(json, protocol_version, op_map) {
	if (json.value_missing)
		return new exports.SET(MISSING);
	else
		return new exports.SET(json.value);
}

exports.SET.prototype.apply = function (document) {
	/* Applies the operation to a document. Returns the new
	   value, regardless of the document. */
	return this.value;
}

exports.SET.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
	   of another operation. There is nothing to simplify for
	   a SET. */
	return this;
}

exports.SET.prototype.drilldown = function(index_or_key) {
	// If the SET sets an array or object value, then drilling down
	// sets the inner value to the element or property value.
	if (typeof this.value == "object" && Array.isArray(this.value))
		if (Number.isInteger(index_or_key) && index_or_key < this.value.length)
			return new exports.SET(this.value[index_or_key]);
	if (typeof this.value == "object" && !Array.isArray(this.value) && this.value !== null)
		if (typeof index_or_key == "string" && index_or_key in this.value)
			return new exports.SET(this.value[index_or_key]);

	// Signal that anything that used to be an array element or
	// object property is now nonexistent.
	return new exports.SET(MISSING);
};

exports.SET.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	   given the state of the document before this operation applies. */
	return new exports.SET(document);
}

exports.SET.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
	   and other applied in sequence (this first, other after). Returns
	   null if no atomic operation is possible.
	   Returns a new SET operation that simply sets the value to what
	   the value would be when the two operations are composed. */
	return new exports.SET(other.apply(this.value)).simplify();
}

exports.SET.prototype.rebase_functions = [
	// Rebase this against other and other against this.

	[exports.SET, function(other, conflictless) {
		// SET and SET.

		// If they both set the the document to the same value, then the one
		// applied second (the one being rebased) becomes a no-op. Since the
		// two parts of the return value are for each rebased against the
		// other, both are returned as no-ops.
		if (deepEqual(this.value, other.value, { strict: true }))
			return [new exports.NO_OP(), new exports.NO_OP()];
		
		// If they set the document to different values and conflictless is
		// true, then we clobber the one whose value has a lower sort order.
		if (conflictless && jot.cmp(this.value, other.value) < 0)
			return [new exports.NO_OP(), new exports.SET(other.value)];

		// cmp > 0 is handled by a call to this function with the arguments
		// reversed, so we don't need to explicltly code that logic.

		// If conflictless is false, then we can't rebase the operations
		// because we can't preserve the meaning of both. Return null to
		// signal conflict.
		return null;
	}],

	[exports.MATH, function(other, conflictless) {
		// SET (this) and MATH (other). To get a consistent effect no matter
		// which order the operations are applied in, we say the SET comes
		// second. i.e. If the SET is already applied, the MATH becomes a
		// no-op. If the MATH is already applied, the SET is applied unchanged.
		return [
			this,
			new exports.NO_OP()
			];
	}]
];

exports.SET.prototype.get_length_change = function (old_length) {
	// Support routine for sequences.PATCH that returns the change in
	// length to a sequence if this operation is applied to it.
	if (typeof this.value == "string" || Array.isArray(this.value))
		return this.value.length - old_length;
	throw new Error("not applicable: new value is of type " + typeof this.value);
}

exports.SET.prototype.decompose = function (in_out, at_index) {
	// Support routine for when this operation is used as a hunk's
	// op in sequences.PATCH (i.e. its document is a string or array
	// sub-sequence) that returns a decomposition of the operation
	// into two operations, one that applies on the left of the
	// sequence and one on the right of the sequence, such that
	// the length of the input (if !in_out) or output (if in_out)
	// of the left operation is at_index, i.e. the split point
	// at_index is relative to the document either before (if
	// !in_out) or after (if in_out) this operation applies.
	if (typeof this.value != "string" && !Array.isArray(this.value))
		throw new Error("invalid value type for call");
	if (!in_out) {
		// Decompose into a delete and a replace with the value
		// lumped on the right.
		return [
			new exports.SET(this.value.slice(0,0)), // create empty string or array
			this
		];
	} else {
		// Split the new value at the given index.
		return [
			new exports.SET(this.value.slice(0, at_index)),
			new exports.SET(this.value.slice(at_index))
		];
	}
}

//////////////////////////////////////////////////////////////////////////////

exports.MATH.prototype.inspect = function(depth) {
	return util.format("<MATH %s:%s>",
		this.operator,
			(typeof this.operand == "number" && (this.operator == "and" || this.operator == "or" || this.operator == "xor"))
			?
				("0x" + this.operand.toString(16))
			:
				util.format("%j", this.operand)
		);
}

exports.MATH.prototype.internalToJSON = function(json, protocol_version) {
	json.operator = this.operator;
	json.operand = this.operand;
}

exports.MATH.internalFromJSON = function(json, protocol_version, op_map) {
	return new exports.MATH(json.operator, json.operand);
}

exports.MATH.prototype.apply = function (document) {
	/* Applies the operation to this.operand. Applies the operator/operand
	   as a function to the document. */
	if (typeof document == "number") {
		if (this.operator == "add")
			return document + this.operand;
		if (this.operator == "mult")
			return document * this.operand;
		if (Number.isInteger(document)) {
			if (this.operator == "rot")
				return (document + this.operand[0]) % this.operand[1];
			if (this.operator == "and")
				return document & this.operand;
			if (this.operator == "or")
				return document | this.operand;
			if (this.operator == "xor")
				return document ^ this.operand;
			if (this.operator == "not")
				return ~document;
		}
		throw new Error("MATH operator " + this.operator + " cannot apply to " + document + ".");
	
	} else if (typeof document == "boolean") {
		if (this.operator == "and")
			return document && this.operand;
		if (this.operator == "or")
			return document || this.operand;
		if (this.operator == "xor")
			return !!(document ^ this.operand); // convert arithmetic result to boolean
		if (this.operator == "not")
			return !document;
		throw new Error("MATH operator " + this.operator + " does not apply to boolean values.")
	
	} else {
		throw new Error("MATH operations only apply to number and boolean values, not " + jot.type_name(document) + ".")
	}
}

exports.MATH.prototype.simplify = function () {
	/* Returns a new atomic operation that is a simpler version
	   of another operation. If the operation is a degenerate case,
	   return NO_OP. */
	if (this.operator == "add" && this.operand == 0)
		return new exports.NO_OP();
	if (this.operator == "rot" && this.operand[0] == 0)
		return new exports.NO_OP();
	if (this.operator == "mult" && this.operand == 1)
		return new exports.NO_OP();
	if (this.operator == "and" && this.operand === 0)
		return new exports.SET(0);
	if (this.operator == "and" && this.operand === false)
		return new exports.SET(false);
	if (this.operator == "or" && this.operand === 0)
		return new exports.NO_OP();
	if (this.operator == "or" && this.operand === false)
		return new exports.NO_OP();
	if (this.operator == "xor" && this.operand == 0)
		return new exports.NO_OP();
	return this;
}

exports.MATH.prototype.drilldown = function(index_or_key) {
	// MATH operations only apply to scalars, so drilling down
	// doesn't make any sense. But we can say a MATH operation
	// doesn't affect any sub-components of the value.
	return new exports.NO_OP();
};

exports.MATH.prototype.inverse = function (document) {
	/* Returns a new atomic operation that is the inverse of this operation,
	given the state of the document before the operation applies.
	For most of these operations the value of document doesn't
	matter. */
	if (this.operator == "add")
		return new exports.MATH("add", -this.operand);
	if (this.operator == "rot")
		return new exports.MATH("rot", [-this.operand[0], this.operand[1]]);
	if (this.operator == "mult")
		return new exports.MATH("mult", 1.0/this.operand);
	if (this.operator == "and")
		return new exports.MATH("or", document & (~this.operand));
	if (this.operator == "or")
		return new exports.MATH("xor", ~document & this.operand);
	if (this.operator == "xor")
		return this; // is its own inverse
	if (this.operator == "not")
		return this; // is its own inverse
}

exports.MATH.prototype.atomic_compose = function (other) {
	/* Creates a new atomic operation that has the same result as this
	   and other applied in sequence (this first, other after). Returns
	   null if no atomic operation is possible. */

	if (other instanceof exports.MATH) {
		// two adds just add the operands
		if (this.operator == other.operator && this.operator == "add")
			return new exports.MATH("add", this.operand + other.operand).simplify();

		// two rots with the same modulus add the operands
		if (this.operator == other.operator && this.operator == "rot" && this.operand[1] == other.operand[1])
			return new exports.MATH("rot", [this.operand[0] + other.operand[0], this.operand[1]]).simplify();

		// two multiplications multiply the operands
		if (this.operator == other.operator && this.operator == "mult")
			return new exports.MATH("mult", this.operand * other.operand).simplify();

		// two and's and the operands
		if (this.operator == other.operator && this.operator == "and" && typeof this.operand == typeof other.operand && typeof this.operand == "number")
			return new exports.MATH("and", this.operand & other.operand).simplify();
		if (this.operator == other.operator && this.operator == "and" && typeof this.operand == typeof other.operand && typeof this.operand == "boolean")
			return new exports.MATH("and", this.operand && other.operand).simplify();

		// two or's or the operands
		if (this.operator == other.operator && this.operator == "or" && typeof this.operand == typeof other.operand && typeof this.operand == "number")
			return new exports.MATH("or", this.operand | other.operand).simplify();
		if (this.operator == other.operator && this.operator == "or" && typeof this.operand == typeof other.operand && typeof this.operand == "boolean")
			return new exports.MATH("or", this.operand || other.operand).simplify();

		// two xor's xor the operands
		if (this.operator == other.operator && this.operator == "xor" && typeof this.operand == typeof other.operand && typeof this.operand == "number")
			return new exports.MATH("xor", this.operand ^ other.operand).simplify();
		if (this.operator == other.operator && this.operator == "xor" && typeof this.operand == typeof other.operand && typeof this.operand == "boolean")
			return new exports.MATH("xor", !!(this.operand ^ other.operand)).simplify();

		// two not's cancel each other out
		if (this.operator == other.operator && this.operator == "not")
			return new exports.NO_OP();

		// and+or with the same operand is SET(operand)
		if (this.operator == "and" && other.operator == "or" && this.operand === other.operand)
			return new exports.SET(this.operand);

		// or+xor with the same operand is AND(~operand)
		if (this.operator == "or" && other.operator == "xor" && this.operand === other.operand && typeof this.operand == "number")
			return new exports.MATH("and", ~this.operand);
		if (this.operator == "or" && other.operator == "xor" && this.operand === other.operand && typeof this.operand == "boolean")
			return new exports.MATH("and", !this.operand);

	}
	
	return null; // no composition is possible
}

exports.MATH.prototype.rebase_functions = [
	// Rebase this against other and other against this.

	[exports.MATH, function(other, conflictless) {
		// If this and other are MATH operations with the same operator (i.e. two
		// add's; two rot's with the same modulus), then since they are commutative
		// their order does not matter and the rebase returns each operation
		// unchanged.
		if (this.operator == other.operator
			&& (this.operator != "rot" || this.operand[1] == other.operand[1]))
				return [this, other];

		// When two different operators ocurr simultaneously, then the order matters.
		// Since operators preserve the data type of the document, we know that both
		// orders are valid. Choose an order based on the operations: We'll put this
		// first and other second.
		if (conflictless && "document" in conflictless) {
			if (jot.cmp([this.operator, this.operand], [other.operator, other.operand]) < 0) {
				return [
					// this came second, so replace it with an operation that
					// inverts the existing other operation, then applies this,
					// then re-applies other. Although a composition of operations
					// is logically sensible, returning a LIST will cause LIST.rebase
					// to go into an infinite regress in some cases.
					new exports.SET(this.compose(other).apply(conflictless.document)),
					//other.inverse(conflictless.document).compose(this).compose(other),

					// no need to rewrite other because it's supposed to come second
					other
				]
			}
		}

		// The other order is handled by the converse call handled by jot.rebase.
		return null;
	}]
];

exports.createRandomOp = function(doc, context) {
	// Create a random operation that could apply to doc.
	// Choose uniformly across various options depending on
	// the data type of doc.
	var ops = [];

	// NO_OP is always a possibility.
	ops.push(function() { return new exports.NO_OP() });

	// An identity SET is always a possibility.
	ops.push(function() { return new exports.SET(doc) });

	// Set to another random value of a different type.
	// Can't do this in a context where changing the type is not valid,
	// i.e. when in a PATCH or MAP operation on a string.
	if (context != "string-elem" && context != "string")
		ops.push(function() { return new exports.SET(jot.createRandomValue()) });

	// Clear the key, if we're in an object.
	if (context == "object")
		ops.push(function() { return new exports.SET(MISSING) });

	// Set to another value of the same type.
	if (typeof doc === "boolean")
		ops.push(function() { return new exports.SET(!doc) });
	if (typeof doc === "number") {
		if (Number.isInteger(doc)) {
			ops.push(function() { return new exports.SET(doc + Math.floor((Math.random()+.5) * 100)) });
		} else {
			ops.push(function() { return new exports.SET(doc * (Math.random()+.5)) });
		}
	}

	if ((typeof doc === "string" || Array.isArray(doc)) && context != "string-elem") {
		// Delete (if not already empty).
		if (doc.length > 0)
			ops.push(function() { return new exports.SET(doc.slice(0, 0)) });

		if (doc.length >= 1) {
			// shorten at start
			ops.push(function() { return new exports.SET(doc.slice(Math.floor(Math.random()*(doc.length-1)), doc.length)) });

			// shorten at end
			ops.push(function() { return new exports.SET(doc.slice(0, Math.floor(Math.random()*(doc.length-1)))) });
		}

		if (doc.length >= 2) {
			// shorten by on both sides
			var a = Math.floor(Math.random()*doc.length-1);
			var b = Math.floor(Math.random()*(doc.length-a));
			ops.push(function() { return new exports.SET(doc.slice(a, a+b)) });
		}

		if (doc.length > 0) {
			// expand by copying existing elements from document

			function concat2(item1, item2) {
				if (item1 instanceof String)
					return item1 + item2;
				return item1.concat(item2);
			}
			function concat3(item1, item2, item3) {
				if (item1 instanceof String)
					return item1 + item2 + item3;
				return item1.concat(item2).concat(item3);
			}
		
			// expand by elements at start
			ops.push(function() { return new exports.SET(concat2(doc.slice(0, 1+Math.floor(Math.random()*(doc.length-1))), doc)) });
			// expand by elements at end
			ops.push(function() { return new exports.SET(concat2(doc, doc.slice(0, 1+Math.floor(Math.random()*(doc.length-1))))); });
			// expand by elements on both sides
			ops.push(function() { return new exports.SET(concat3(doc.slice(0, 1+Math.floor(Math.random()*(doc.length-1))), doc, doc.slice(0, 1+Math.floor(Math.random()*(doc.length-1))))); });
		} else {
			// expand by generating new elements
			if (typeof doc === "string")
				ops.push(function() { return new exports.SET((Math.random()+"").slice(2)); });
			else if (Array.isArray(doc))
				ops.push(function() { return new exports.SET([null,null,null].map(function() { return Math.random() })); });
		}
	}

	if (typeof doc === "string") {
		// reverse
		if (doc != doc.split("").reverse().join(""))
			ops.push(function() { return new exports.SET(doc.split("").reverse().join("")); });

		// replace with new elements of the same length
		if (doc.length > 0) {
			var newvalue = "";
			for (var i = 0; i < doc.length; i++)
				newvalue += (Math.random()+"").slice(2, 3);
			ops.push(function() { return new exports.SET(newvalue); });
		}
	}

	// Math
	if (typeof doc === "number") {
		if (Number.isInteger(doc)) {
			ops.push(function() { return new exports.MATH("add", Math.floor(100 * (Math.random() - .25))); })
			ops.push(function() { return new exports.MATH("mult", Math.floor(Math.exp(Math.random()+.5))); })
			if (doc > 1)
				ops.push(function() { return new exports.MATH("rot", [1, Math.min(13, doc)]); })
			ops.push(function() { return new exports.MATH("and", 0xF1); })
			ops.push(function() { return new exports.MATH("or", 0xF1); })
			ops.push(function() { return new exports.MATH("xor", 0xF1); })
			ops.push(function() { return new exports.MATH("not", null); })
		} else {
			// floating point math yields inexact/inconsistent results if operation
			// order changes, so you may want to disable these in testing
			ops.push(function() { return new exports.MATH("add", 100 * (Math.random() - .25)); })
			ops.push(function() { return new exports.MATH("mult", Math.exp(Math.random()+.5)); })
		}
	}
	if (typeof doc === "boolean") {
		ops.push(function() { return new exports.MATH("and", true); })
		ops.push(function() { return new exports.MATH("and", false); })
		ops.push(function() { return new exports.MATH("or", true); })
		ops.push(function() { return new exports.MATH("or", false); })
		ops.push(function() { return new exports.MATH("xor", true); })
		ops.push(function() { return new exports.MATH("xor", false); })
		ops.push(function() { return new exports.MATH("not", null); })
	}

	// Select randomly.
	return ops[Math.floor(Math.random() * ops.length)]();
}

},{"./index.js":12,"./objects.js":14,"deep-equal":17,"util":8}],17:[function(require,module,exports){
var objectKeys = require('object-keys');
var isArguments = require('is-arguments');
var is = require('object-is');
var isRegex = require('is-regex');
var flags = require('regexp.prototype.flags');
var isArray = require('isarray');
var isDate = require('is-date-object');
var whichBoxedPrimitive = require('which-boxed-primitive');
var GetIntrinsic = require('es-abstract/GetIntrinsic');
var callBound = require('es-abstract/helpers/callBound');
var whichCollection = require('which-collection');
var getIterator = require('es-get-iterator');
var getSideChannel = require('side-channel');

var $getTime = callBound('Date.prototype.getTime');
var gPO = Object.getPrototypeOf;
var $objToString = callBound('Object.prototype.toString');

var $Set = GetIntrinsic('%Set%', true);
var $mapHas = callBound('Map.prototype.has', true);
var $mapGet = callBound('Map.prototype.get', true);
var $mapSize = callBound('Map.prototype.size', true);
var $setAdd = callBound('Set.prototype.add', true);
var $setDelete = callBound('Set.prototype.delete', true);
var $setHas = callBound('Set.prototype.has', true);
var $setSize = callBound('Set.prototype.size', true);

// taken from https://github.com/browserify/commonjs-assert/blob/bba838e9ba9e28edf3127ce6974624208502f6bc/internal/util/comparisons.js#L401-L414
function setHasEqualElement(set, val1, strict, channel) {
  var i = getIterator(set);
  var result;
  while ((result = i.next()) && !result.done) {
    if (internalDeepEqual(val1, result.value, strict, channel)) { // eslint-disable-line no-use-before-define
      // Remove the matching element to make sure we do not check that again.
      $setDelete(set, result.value);
      return true;
    }
  }

  return false;
}

// taken from https://github.com/browserify/commonjs-assert/blob/bba838e9ba9e28edf3127ce6974624208502f6bc/internal/util/comparisons.js#L416-L439
function findLooseMatchingPrimitives(prim) {
  if (typeof prim === 'undefined') {
    return null;
  }
  if (typeof prim === 'object') { // Only pass in null as object!
    return void 0;
  }
  if (typeof prim === 'symbol') {
    return false;
  }
  if (typeof prim === 'string' || typeof prim === 'number') {
    // Loose equal entries exist only if the string is possible to convert to a regular number and not NaN.
    return +prim === +prim; // eslint-disable-line no-implicit-coercion
  }
  return true;
}

// taken from https://github.com/browserify/commonjs-assert/blob/bba838e9ba9e28edf3127ce6974624208502f6bc/internal/util/comparisons.js#L449-L460
function mapMightHaveLoosePrim(a, b, prim, item, channel) {
  var altValue = findLooseMatchingPrimitives(prim);
  if (altValue != null) {
    return altValue;
  }
  var curB = $mapGet(b, altValue);
  // eslint-disable-next-line no-use-before-define
  if ((typeof curB === 'undefined' && !$mapHas(b, altValue)) || !internalDeepEqual(item, curB, false, channel)) {
    return false;
  }
  // eslint-disable-next-line no-use-before-define
  return !$mapHas(a, altValue) && internalDeepEqual(item, curB, false, channel);
}

// taken from https://github.com/browserify/commonjs-assert/blob/bba838e9ba9e28edf3127ce6974624208502f6bc/internal/util/comparisons.js#L441-L447
function setMightHaveLoosePrim(a, b, prim) {
  var altValue = findLooseMatchingPrimitives(prim);
  if (altValue != null) {
    return altValue;
  }

  return $setHas(b, altValue) && !$setHas(a, altValue);
}

// taken from https://github.com/browserify/commonjs-assert/blob/bba838e9ba9e28edf3127ce6974624208502f6bc/internal/util/comparisons.js#L518-L533
function mapHasEqualEntry(set, map, key1, item1, strict, channel) {
  var i = getIterator(set);
  var result;
  var key2;
  while ((result = i.next()) && !result.done) {
    key2 = result.value;
    if (
      // eslint-disable-next-line no-use-before-define
      internalDeepEqual(key1, key2, strict, channel)
      // eslint-disable-next-line no-use-before-define
      && internalDeepEqual(item1, $mapGet(map, key2), strict, channel)
    ) {
      $setDelete(set, key2);
      return true;
    }
  }

  return false;
}

function internalDeepEqual(actual, expected, options, channel) {
  var opts = options || {};

  // 7.1. All identical values are equivalent, as determined by ===.
  if (opts.strict ? is(actual, expected) : actual === expected) {
    return true;
  }

  var actualBoxed = whichBoxedPrimitive(actual);
  var expectedBoxed = whichBoxedPrimitive(expected);
  if (actualBoxed !== expectedBoxed) {
    return false;
  }

  // 7.3. Other pairs that do not both pass typeof value == 'object', equivalence is determined by ==.
  if (!actual || !expected || (typeof actual !== 'object' && typeof expected !== 'object')) {
    if ((actual === false && expected) || (actual && expected === false)) { return false; }
    return opts.strict ? is(actual, expected) : actual == expected; // eslint-disable-line eqeqeq
  }

  /*
   * 7.4. For all other Object pairs, including Array objects, equivalence is
   * determined by having the same number of owned properties (as verified
   * with Object.prototype.hasOwnProperty.call), the same set of keys
   * (although not necessarily the same order), equivalent values for every
   * corresponding key, and an identical 'prototype' property. Note: this
   * accounts for both named and indexed properties on Arrays.
   */
  // see https://github.com/nodejs/node/commit/d3aafd02efd3a403d646a3044adcf14e63a88d32 for memos/channel inspiration

  var hasActual = channel.has(actual);
  var hasExpected = channel.has(expected);
  var sentinel;
  if (hasActual && hasExpected) {
    if (channel.get(actual) === channel.get(expected)) {
      return true;
    }
  } else {
    sentinel = {};
  }
  if (!hasActual) { channel.set(actual, sentinel); }
  if (!hasExpected) { channel.set(expected, sentinel); }

  // eslint-disable-next-line no-use-before-define
  return objEquiv(actual, expected, opts, channel);
}

function isBuffer(x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') {
    return false;
  }
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') {
    return false;
  }
  return true;
}

function setEquiv(a, b, opts, channel) {
  if ($setSize(a) !== $setSize(b)) {
    return false;
  }
  var iA = getIterator(a);
  var iB = getIterator(b);
  var resultA;
  var resultB;
  var set;
  while ((resultA = iA.next()) && !resultA.done) {
    if (resultA.value && typeof resultA.value === 'object') {
      if (!set) { set = new $Set(); }
      $setAdd(set, resultA.value);
    } else if (!$setHas(b, resultA.value)) {
      if (opts.strict) { return false; }
      if (!setMightHaveLoosePrim(a, b, resultA.value)) {
        return false;
      }
      if (!set) { set = new $Set(); }
      $setAdd(set, resultA.value);
    }
  }
  if (set) {
    while ((resultB = iB.next()) && !resultB.done) {
      // We have to check if a primitive value is already matching and only if it's not, go hunting for it.
      if (resultB.value && typeof resultB.value === 'object') {
        if (!setHasEqualElement(set, resultB.value, opts.strict, channel)) {
          return false;
        }
      } else if (
        !opts.strict
        && !$setHas(a, resultB.value)
        && !setHasEqualElement(set, resultB.value, opts.strict, channel)
      ) {
        return false;
      }
    }
    return $setSize(set) === 0;
  }
  return true;
}

function mapEquiv(a, b, opts, channel) {
  if ($mapSize(a) !== $mapSize(b)) {
    return false;
  }
  var iA = getIterator(a);
  var iB = getIterator(b);
  var resultA;
  var resultB;
  var set;
  var key;
  var item1;
  var item2;
  while ((resultA = iA.next()) && !resultA.done) {
    key = resultA.value[0];
    item1 = resultA.value[1];
    if (key && typeof key === 'object') {
      if (!set) { set = new $Set(); }
      $setAdd(set, key);
    } else {
      item2 = $mapGet(b, key);
      // if (typeof curB === 'undefined' && !$mapHas(b, altValue) || !internalDeepEqual(item, curB, false, channel)) {
      if ((typeof item2 === 'undefined' && !$mapHas(b, key)) || !internalDeepEqual(item1, item2, opts.strict, channel)) {
        if (opts.strict) {
          return false;
        }
        if (!mapMightHaveLoosePrim(a, b, key, item1, channel)) {
          return false;
        }
        if (!set) { set = new $Set(); }
        $setAdd(set, key);
      }
    }
  }

  if (set) {
    while ((resultB = iB.next()) && !resultB.done) {
      key = resultB.value[0];
      item1 = resultB.value[1];
      if (key && typeof key === 'object') {
        if (!mapHasEqualEntry(set, a, key, item1, opts.strict, channel)) {
          return false;
        }
      } else if (
        !opts.strict
        && (!a.has(key) || !internalDeepEqual($mapGet(a, key), item1, false, channel))
        && !mapHasEqualEntry(set, a, key, item1, false, channel)
      ) {
        return false;
      }
    }
    return $setSize(set) === 0;
  }
  return true;
}

function objEquiv(a, b, opts, channel) {
  /* eslint max-statements: [2, 100], max-lines-per-function: [2, 120], max-depth: [2, 5] */
  var i, key;

  if (typeof a !== typeof b) { return false; }
  if (a == null || b == null) { return false; }

  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) { return false; }

  if ($objToString(a) !== $objToString(b)) { return false; }

  if (isArguments(a) !== isArguments(b)) { return false; }

  var aIsArray = isArray(a);
  var bIsArray = isArray(b);
  if (aIsArray !== bIsArray) { return false; }

  // TODO: replace when a cross-realm brand check is available
  var aIsError = a instanceof Error;
  var bIsError = b instanceof Error;
  if (aIsError !== bIsError) { return false; }
  if (aIsError || bIsError) {
    if (a.name !== b.name || a.message !== b.message) { return false; }
  }

  var aIsRegex = isRegex(a);
  var bIsRegex = isRegex(b);
  if (aIsRegex !== bIsRegex) { return false; }
  if ((aIsRegex || bIsRegex) && (a.source !== b.source || flags(a) !== flags(b))) {
    return false;
  }

  var aIsDate = isDate(a);
  var bIsDate = isDate(b);
  if (aIsDate !== bIsDate) { return false; }
  if (aIsDate || bIsDate) { // && would work too, because both are true or both false here
    if ($getTime(a) !== $getTime(b)) { return false; }
  }
  if (opts.strict && gPO && gPO(a) !== gPO(b)) { return false; }

  var aIsBuffer = isBuffer(a);
  var bIsBuffer = isBuffer(b);
  if (aIsBuffer !== bIsBuffer) { return false; }
  if (aIsBuffer || bIsBuffer) { // && would work too, because both are true or both false here
    if (a.length !== b.length) { return false; }
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) { return false; }
    }
    return true;
  }

  if (typeof a !== typeof b) { return false; }

  try {
    var ka = objectKeys(a);
    var kb = objectKeys(b);
  } catch (e) { // happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates hasOwnProperty)
  if (ka.length !== kb.length) { return false; }

  // the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  // ~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i]) { return false; } // eslint-disable-line eqeqeq
  }

  // equivalent values for every corresponding key, and ~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!internalDeepEqual(a[key], b[key], opts, channel)) { return false; }
  }

  var aCollection = whichCollection(a);
  var bCollection = whichCollection(b);
  if (aCollection !== bCollection) {
    return false;
  }
  if (aCollection === 'Set' || bCollection === 'Set') { // aCollection === bCollection
    return setEquiv(a, b, opts, channel);
  }
  if (aCollection === 'Map') { // aCollection === bCollection
    return mapEquiv(a, b, opts, channel);
  }

  return true;
}

module.exports = function deepEqual(a, b, opts) {
  return internalDeepEqual(a, b, opts, getSideChannel());
};

},{"es-abstract/GetIntrinsic":20,"es-abstract/helpers/callBound":22,"es-get-iterator":23,"is-arguments":30,"is-date-object":33,"is-regex":36,"isarray":42,"object-is":47,"object-keys":49,"regexp.prototype.flags":52,"side-channel":56,"which-boxed-primitive":57,"which-collection":58}],18:[function(require,module,exports){
'use strict';

var keys = require('object-keys');
var hasSymbols = typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol';

var toStr = Object.prototype.toString;
var concat = Array.prototype.concat;
var origDefineProperty = Object.defineProperty;

var isFunction = function (fn) {
	return typeof fn === 'function' && toStr.call(fn) === '[object Function]';
};

var arePropertyDescriptorsSupported = function () {
	var obj = {};
	try {
		origDefineProperty(obj, 'x', { enumerable: false, value: obj });
		// eslint-disable-next-line no-unused-vars, no-restricted-syntax
		for (var _ in obj) { // jscs:ignore disallowUnusedVariables
			return false;
		}
		return obj.x === obj;
	} catch (e) { /* this is IE 8. */
		return false;
	}
};
var supportsDescriptors = origDefineProperty && arePropertyDescriptorsSupported();

var defineProperty = function (object, name, value, predicate) {
	if (name in object && (!isFunction(predicate) || !predicate())) {
		return;
	}
	if (supportsDescriptors) {
		origDefineProperty(object, name, {
			configurable: true,
			enumerable: false,
			value: value,
			writable: true
		});
	} else {
		object[name] = value;
	}
};

var defineProperties = function (object, map) {
	var predicates = arguments.length > 2 ? arguments[2] : {};
	var props = keys(map);
	if (hasSymbols) {
		props = concat.call(props, Object.getOwnPropertySymbols(map));
	}
	for (var i = 0; i < props.length; i += 1) {
		defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
	}
};

defineProperties.supportsDescriptors = !!supportsDescriptors;

module.exports = defineProperties;

},{"object-keys":49}],19:[function(require,module,exports){
/*!

 diff v4.0.1

Software License Agreement (BSD License)

Copyright (c) 2009-2015, Kevin Decker <kpdecker@gmail.com>

All rights reserved.

Redistribution and use of this software in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of Kevin Decker nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
@license
*/
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.Diff = {}));
}(this, function (exports) { 'use strict';

  function Diff() {}
  Diff.prototype = {
    diff: function diff(oldString, newString) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var callback = options.callback;

      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      this.options = options;
      var self = this;

      function done(value) {
        if (callback) {
          setTimeout(function () {
            callback(undefined, value);
          }, 0);
          return true;
        } else {
          return value;
        }
      } // Allow subclasses to massage the input prior to running


      oldString = this.castInput(oldString);
      newString = this.castInput(newString);
      oldString = this.removeEmpty(this.tokenize(oldString));
      newString = this.removeEmpty(this.tokenize(newString));
      var newLen = newString.length,
          oldLen = oldString.length;
      var editLength = 1;
      var maxEditLength = newLen + oldLen;
      var bestPath = [{
        newPos: -1,
        components: []
      }]; // Seed editLength = 0, i.e. the content starts with the same values

      var oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);

      if (bestPath[0].newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
        // Identity per the equality and tokenizer
        return done([{
          value: this.join(newString),
          count: newString.length
        }]);
      } // Main worker method. checks all permutations of a given edit length for acceptance.


      function execEditLength() {
        for (var diagonalPath = -1 * editLength; diagonalPath <= editLength; diagonalPath += 2) {
          var basePath = void 0;

          var addPath = bestPath[diagonalPath - 1],
              removePath = bestPath[diagonalPath + 1],
              _oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;

          if (addPath) {
            // No one else is going to attempt to use this value, clear it
            bestPath[diagonalPath - 1] = undefined;
          }

          var canAdd = addPath && addPath.newPos + 1 < newLen,
              canRemove = removePath && 0 <= _oldPos && _oldPos < oldLen;

          if (!canAdd && !canRemove) {
            // If this path is a terminal then prune
            bestPath[diagonalPath] = undefined;
            continue;
          } // Select the diagonal that we want to branch from. We select the prior
          // path whose position in the new string is the farthest from the origin
          // and does not pass the bounds of the diff graph


          if (!canAdd || canRemove && addPath.newPos < removePath.newPos) {
            basePath = clonePath(removePath);
            self.pushComponent(basePath.components, undefined, true);
          } else {
            basePath = addPath; // No need to clone, we've pulled it from the list

            basePath.newPos++;
            self.pushComponent(basePath.components, true, undefined);
          }

          _oldPos = self.extractCommon(basePath, newString, oldString, diagonalPath); // If we have hit the end of both strings, then we are done

          if (basePath.newPos + 1 >= newLen && _oldPos + 1 >= oldLen) {
            return done(buildValues(self, basePath.components, newString, oldString, self.useLongestToken));
          } else {
            // Otherwise track this path as a potential candidate and continue.
            bestPath[diagonalPath] = basePath;
          }
        }

        editLength++;
      } // Performs the length of edit iteration. Is a bit fugly as this has to support the
      // sync and async mode which is never fun. Loops over execEditLength until a value
      // is produced.


      if (callback) {
        (function exec() {
          setTimeout(function () {
            // This should not happen, but we want to be safe.

            /* istanbul ignore next */
            if (editLength > maxEditLength) {
              return callback();
            }

            if (!execEditLength()) {
              exec();
            }
          }, 0);
        })();
      } else {
        while (editLength <= maxEditLength) {
          var ret = execEditLength();

          if (ret) {
            return ret;
          }
        }
      }
    },
    pushComponent: function pushComponent(components, added, removed) {
      var last = components[components.length - 1];

      if (last && last.added === added && last.removed === removed) {
        // We need to clone here as the component clone operation is just
        // as shallow array clone
        components[components.length - 1] = {
          count: last.count + 1,
          added: added,
          removed: removed
        };
      } else {
        components.push({
          count: 1,
          added: added,
          removed: removed
        });
      }
    },
    extractCommon: function extractCommon(basePath, newString, oldString, diagonalPath) {
      var newLen = newString.length,
          oldLen = oldString.length,
          newPos = basePath.newPos,
          oldPos = newPos - diagonalPath,
          commonCount = 0;

      while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newString[newPos + 1], oldString[oldPos + 1])) {
        newPos++;
        oldPos++;
        commonCount++;
      }

      if (commonCount) {
        basePath.components.push({
          count: commonCount
        });
      }

      basePath.newPos = newPos;
      return oldPos;
    },
    equals: function equals(left, right) {
      if (this.options.comparator) {
        return this.options.comparator(left, right);
      } else {
        return left === right || this.options.ignoreCase && left.toLowerCase() === right.toLowerCase();
      }
    },
    removeEmpty: function removeEmpty(array) {
      var ret = [];

      for (var i = 0; i < array.length; i++) {
        if (array[i]) {
          ret.push(array[i]);
        }
      }

      return ret;
    },
    castInput: function castInput(value) {
      return value;
    },
    tokenize: function tokenize(value) {
      return value.split('');
    },
    join: function join(chars) {
      return chars.join('');
    }
  };

  function buildValues(diff, components, newString, oldString, useLongestToken) {
    var componentPos = 0,
        componentLen = components.length,
        newPos = 0,
        oldPos = 0;

    for (; componentPos < componentLen; componentPos++) {
      var component = components[componentPos];

      if (!component.removed) {
        if (!component.added && useLongestToken) {
          var value = newString.slice(newPos, newPos + component.count);
          value = value.map(function (value, i) {
            var oldValue = oldString[oldPos + i];
            return oldValue.length > value.length ? oldValue : value;
          });
          component.value = diff.join(value);
        } else {
          component.value = diff.join(newString.slice(newPos, newPos + component.count));
        }

        newPos += component.count; // Common case

        if (!component.added) {
          oldPos += component.count;
        }
      } else {
        component.value = diff.join(oldString.slice(oldPos, oldPos + component.count));
        oldPos += component.count; // Reverse add and remove so removes are output first to match common convention
        // The diffing algorithm is tied to add then remove output and this is the simplest
        // route to get the desired output with minimal overhead.

        if (componentPos && components[componentPos - 1].added) {
          var tmp = components[componentPos - 1];
          components[componentPos - 1] = components[componentPos];
          components[componentPos] = tmp;
        }
      }
    } // Special case handle for when one terminal is ignored (i.e. whitespace).
    // For this case we merge the terminal into the prior string and drop the change.
    // This is only available for string mode.


    var lastComponent = components[componentLen - 1];

    if (componentLen > 1 && typeof lastComponent.value === 'string' && (lastComponent.added || lastComponent.removed) && diff.equals('', lastComponent.value)) {
      components[componentLen - 2].value += lastComponent.value;
      components.pop();
    }

    return components;
  }

  function clonePath(path) {
    return {
      newPos: path.newPos,
      components: path.components.slice(0)
    };
  }

  var characterDiff = new Diff();
  function diffChars(oldStr, newStr, options) {
    return characterDiff.diff(oldStr, newStr, options);
  }

  function generateOptions(options, defaults) {
    if (typeof options === 'function') {
      defaults.callback = options;
    } else if (options) {
      for (var name in options) {
        /* istanbul ignore else */
        if (options.hasOwnProperty(name)) {
          defaults[name] = options[name];
        }
      }
    }

    return defaults;
  }

  //
  // Ranges and exceptions:
  // Latin-1 Supplement, 0080–00FF
  //  - U+00D7  × Multiplication sign
  //  - U+00F7  ÷ Division sign
  // Latin Extended-A, 0100–017F
  // Latin Extended-B, 0180–024F
  // IPA Extensions, 0250–02AF
  // Spacing Modifier Letters, 02B0–02FF
  //  - U+02C7  ˇ &#711;  Caron
  //  - U+02D8  ˘ &#728;  Breve
  //  - U+02D9  ˙ &#729;  Dot Above
  //  - U+02DA  ˚ &#730;  Ring Above
  //  - U+02DB  ˛ &#731;  Ogonek
  //  - U+02DC  ˜ &#732;  Small Tilde
  //  - U+02DD  ˝ &#733;  Double Acute Accent
  // Latin Extended Additional, 1E00–1EFF

  var extendedWordChars = /^[A-Za-z\xC0-\u02C6\u02C8-\u02D7\u02DE-\u02FF\u1E00-\u1EFF]+$/;
  var reWhitespace = /\S/;
  var wordDiff = new Diff();

  wordDiff.equals = function (left, right) {
    if (this.options.ignoreCase) {
      left = left.toLowerCase();
      right = right.toLowerCase();
    }

    return left === right || this.options.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right);
  };

  wordDiff.tokenize = function (value) {
    var tokens = value.split(/(\s+|[()[\]{}'"]|\b)/); // Join the boundary splits that we do not consider to be boundaries. This is primarily the extended Latin character set.

    for (var i = 0; i < tokens.length - 1; i++) {
      // If we have an empty string in the next field and we have only word chars before and after, merge
      if (!tokens[i + 1] && tokens[i + 2] && extendedWordChars.test(tokens[i]) && extendedWordChars.test(tokens[i + 2])) {
        tokens[i] += tokens[i + 2];
        tokens.splice(i + 1, 2);
        i--;
      }
    }

    return tokens;
  };

  function diffWords(oldStr, newStr, options) {
    options = generateOptions(options, {
      ignoreWhitespace: true
    });
    return wordDiff.diff(oldStr, newStr, options);
  }
  function diffWordsWithSpace(oldStr, newStr, options) {
    return wordDiff.diff(oldStr, newStr, options);
  }

  var lineDiff = new Diff();

  lineDiff.tokenize = function (value) {
    var retLines = [],
        linesAndNewlines = value.split(/(\n|\r\n)/); // Ignore the final empty token that occurs if the string ends with a new line

    if (!linesAndNewlines[linesAndNewlines.length - 1]) {
      linesAndNewlines.pop();
    } // Merge the content and line separators into single tokens


    for (var i = 0; i < linesAndNewlines.length; i++) {
      var line = linesAndNewlines[i];

      if (i % 2 && !this.options.newlineIsToken) {
        retLines[retLines.length - 1] += line;
      } else {
        if (this.options.ignoreWhitespace) {
          line = line.trim();
        }

        retLines.push(line);
      }
    }

    return retLines;
  };

  function diffLines(oldStr, newStr, callback) {
    return lineDiff.diff(oldStr, newStr, callback);
  }
  function diffTrimmedLines(oldStr, newStr, callback) {
    var options = generateOptions(callback, {
      ignoreWhitespace: true
    });
    return lineDiff.diff(oldStr, newStr, options);
  }

  var sentenceDiff = new Diff();

  sentenceDiff.tokenize = function (value) {
    return value.split(/(\S.+?[.!?])(?=\s+|$)/);
  };

  function diffSentences(oldStr, newStr, callback) {
    return sentenceDiff.diff(oldStr, newStr, callback);
  }

  var cssDiff = new Diff();

  cssDiff.tokenize = function (value) {
    return value.split(/([{}:;,]|\s+)/);
  };

  function diffCss(oldStr, newStr, callback) {
    return cssDiff.diff(oldStr, newStr, callback);
  }

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  var objectPrototypeToString = Object.prototype.toString;
  var jsonDiff = new Diff(); // Discriminate between two lines of pretty-printed, serialized JSON where one of them has a
  // dangling comma and the other doesn't. Turns out including the dangling comma yields the nicest output:

  jsonDiff.useLongestToken = true;
  jsonDiff.tokenize = lineDiff.tokenize;

  jsonDiff.castInput = function (value) {
    var _this$options = this.options,
        undefinedReplacement = _this$options.undefinedReplacement,
        _this$options$stringi = _this$options.stringifyReplacer,
        stringifyReplacer = _this$options$stringi === void 0 ? function (k, v) {
      return typeof v === 'undefined' ? undefinedReplacement : v;
    } : _this$options$stringi;
    return typeof value === 'string' ? value : JSON.stringify(canonicalize(value, null, null, stringifyReplacer), stringifyReplacer, '  ');
  };

  jsonDiff.equals = function (left, right) {
    return Diff.prototype.equals.call(jsonDiff, left.replace(/,([\r\n])/g, '$1'), right.replace(/,([\r\n])/g, '$1'));
  };

  function diffJson(oldObj, newObj, options) {
    return jsonDiff.diff(oldObj, newObj, options);
  } // This function handles the presence of circular references by bailing out when encountering an
  // object that is already on the "stack" of items being processed. Accepts an optional replacer

  function canonicalize(obj, stack, replacementStack, replacer, key) {
    stack = stack || [];
    replacementStack = replacementStack || [];

    if (replacer) {
      obj = replacer(key, obj);
    }

    var i;

    for (i = 0; i < stack.length; i += 1) {
      if (stack[i] === obj) {
        return replacementStack[i];
      }
    }

    var canonicalizedObj;

    if ('[object Array]' === objectPrototypeToString.call(obj)) {
      stack.push(obj);
      canonicalizedObj = new Array(obj.length);
      replacementStack.push(canonicalizedObj);

      for (i = 0; i < obj.length; i += 1) {
        canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack, replacer, key);
      }

      stack.pop();
      replacementStack.pop();
      return canonicalizedObj;
    }

    if (obj && obj.toJSON) {
      obj = obj.toJSON();
    }

    if (_typeof(obj) === 'object' && obj !== null) {
      stack.push(obj);
      canonicalizedObj = {};
      replacementStack.push(canonicalizedObj);

      var sortedKeys = [],
          _key;

      for (_key in obj) {
        /* istanbul ignore else */
        if (obj.hasOwnProperty(_key)) {
          sortedKeys.push(_key);
        }
      }

      sortedKeys.sort();

      for (i = 0; i < sortedKeys.length; i += 1) {
        _key = sortedKeys[i];
        canonicalizedObj[_key] = canonicalize(obj[_key], stack, replacementStack, replacer, _key);
      }

      stack.pop();
      replacementStack.pop();
    } else {
      canonicalizedObj = obj;
    }

    return canonicalizedObj;
  }

  var arrayDiff = new Diff();

  arrayDiff.tokenize = function (value) {
    return value.slice();
  };

  arrayDiff.join = arrayDiff.removeEmpty = function (value) {
    return value;
  };

  function diffArrays(oldArr, newArr, callback) {
    return arrayDiff.diff(oldArr, newArr, callback);
  }

  function parsePatch(uniDiff) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var diffstr = uniDiff.split(/\r\n|[\n\v\f\r\x85]/),
        delimiters = uniDiff.match(/\r\n|[\n\v\f\r\x85]/g) || [],
        list = [],
        i = 0;

    function parseIndex() {
      var index = {};
      list.push(index); // Parse diff metadata

      while (i < diffstr.length) {
        var line = diffstr[i]; // File header found, end parsing diff metadata

        if (/^(\-\-\-|\+\+\+|@@)\s/.test(line)) {
          break;
        } // Diff index


        var header = /^(?:Index:|diff(?: -r \w+)+)\s+(.+?)\s*$/.exec(line);

        if (header) {
          index.index = header[1];
        }

        i++;
      } // Parse file headers if they are defined. Unified diff requires them, but
      // there's no technical issues to have an isolated hunk without file header


      parseFileHeader(index);
      parseFileHeader(index); // Parse hunks

      index.hunks = [];

      while (i < diffstr.length) {
        var _line = diffstr[i];

        if (/^(Index:|diff|\-\-\-|\+\+\+)\s/.test(_line)) {
          break;
        } else if (/^@@/.test(_line)) {
          index.hunks.push(parseHunk());
        } else if (_line && options.strict) {
          // Ignore unexpected content unless in strict mode
          throw new Error('Unknown line ' + (i + 1) + ' ' + JSON.stringify(_line));
        } else {
          i++;
        }
      }
    } // Parses the --- and +++ headers, if none are found, no lines
    // are consumed.


    function parseFileHeader(index) {
      var fileHeader = /^(---|\+\+\+)\s+(.*)$/.exec(diffstr[i]);

      if (fileHeader) {
        var keyPrefix = fileHeader[1] === '---' ? 'old' : 'new';
        var data = fileHeader[2].split('\t', 2);
        var fileName = data[0].replace(/\\\\/g, '\\');

        if (/^".*"$/.test(fileName)) {
          fileName = fileName.substr(1, fileName.length - 2);
        }

        index[keyPrefix + 'FileName'] = fileName;
        index[keyPrefix + 'Header'] = (data[1] || '').trim();
        i++;
      }
    } // Parses a hunk
    // This assumes that we are at the start of a hunk.


    function parseHunk() {
      var chunkHeaderIndex = i,
          chunkHeaderLine = diffstr[i++],
          chunkHeader = chunkHeaderLine.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      var hunk = {
        oldStart: +chunkHeader[1],
        oldLines: +chunkHeader[2] || 1,
        newStart: +chunkHeader[3],
        newLines: +chunkHeader[4] || 1,
        lines: [],
        linedelimiters: []
      };
      var addCount = 0,
          removeCount = 0;

      for (; i < diffstr.length; i++) {
        // Lines starting with '---' could be mistaken for the "remove line" operation
        // But they could be the header for the next file. Therefore prune such cases out.
        if (diffstr[i].indexOf('--- ') === 0 && i + 2 < diffstr.length && diffstr[i + 1].indexOf('+++ ') === 0 && diffstr[i + 2].indexOf('@@') === 0) {
          break;
        }

        var operation = diffstr[i].length == 0 && i != diffstr.length - 1 ? ' ' : diffstr[i][0];

        if (operation === '+' || operation === '-' || operation === ' ' || operation === '\\') {
          hunk.lines.push(diffstr[i]);
          hunk.linedelimiters.push(delimiters[i] || '\n');

          if (operation === '+') {
            addCount++;
          } else if (operation === '-') {
            removeCount++;
          } else if (operation === ' ') {
            addCount++;
            removeCount++;
          }
        } else {
          break;
        }
      } // Handle the empty block count case


      if (!addCount && hunk.newLines === 1) {
        hunk.newLines = 0;
      }

      if (!removeCount && hunk.oldLines === 1) {
        hunk.oldLines = 0;
      } // Perform optional sanity checking


      if (options.strict) {
        if (addCount !== hunk.newLines) {
          throw new Error('Added line count did not match for hunk at line ' + (chunkHeaderIndex + 1));
        }

        if (removeCount !== hunk.oldLines) {
          throw new Error('Removed line count did not match for hunk at line ' + (chunkHeaderIndex + 1));
        }
      }

      return hunk;
    }

    while (i < diffstr.length) {
      parseIndex();
    }

    return list;
  }

  // Iterator that traverses in the range of [min, max], stepping
  // by distance from a given start position. I.e. for [0, 4], with
  // start of 2, this will iterate 2, 3, 1, 4, 0.
  function distanceIterator (start, minLine, maxLine) {
    var wantForward = true,
        backwardExhausted = false,
        forwardExhausted = false,
        localOffset = 1;
    return function iterator() {
      if (wantForward && !forwardExhausted) {
        if (backwardExhausted) {
          localOffset++;
        } else {
          wantForward = false;
        } // Check if trying to fit beyond text length, and if not, check it fits
        // after offset location (or desired location on first iteration)


        if (start + localOffset <= maxLine) {
          return localOffset;
        }

        forwardExhausted = true;
      }

      if (!backwardExhausted) {
        if (!forwardExhausted) {
          wantForward = true;
        } // Check if trying to fit before text beginning, and if not, check it fits
        // before offset location


        if (minLine <= start - localOffset) {
          return -localOffset++;
        }

        backwardExhausted = true;
        return iterator();
      } // We tried to fit hunk before text beginning and beyond text length, then
      // hunk can't fit on the text. Return undefined

    };
  }

  function applyPatch(source, uniDiff) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    if (typeof uniDiff === 'string') {
      uniDiff = parsePatch(uniDiff);
    }

    if (Array.isArray(uniDiff)) {
      if (uniDiff.length > 1) {
        throw new Error('applyPatch only works with a single input.');
      }

      uniDiff = uniDiff[0];
    } // Apply the diff to the input


    var lines = source.split(/\r\n|[\n\v\f\r\x85]/),
        delimiters = source.match(/\r\n|[\n\v\f\r\x85]/g) || [],
        hunks = uniDiff.hunks,
        compareLine = options.compareLine || function (lineNumber, line, operation, patchContent) {
      return line === patchContent;
    },
        errorCount = 0,
        fuzzFactor = options.fuzzFactor || 0,
        minLine = 0,
        offset = 0,
        removeEOFNL,
        addEOFNL;
    /**
     * Checks if the hunk exactly fits on the provided location
     */


    function hunkFits(hunk, toPos) {
      for (var j = 0; j < hunk.lines.length; j++) {
        var line = hunk.lines[j],
            operation = line.length > 0 ? line[0] : ' ',
            content = line.length > 0 ? line.substr(1) : line;

        if (operation === ' ' || operation === '-') {
          // Context sanity check
          if (!compareLine(toPos + 1, lines[toPos], operation, content)) {
            errorCount++;

            if (errorCount > fuzzFactor) {
              return false;
            }
          }

          toPos++;
        }
      }

      return true;
    } // Search best fit offsets for each hunk based on the previous ones


    for (var i = 0; i < hunks.length; i++) {
      var hunk = hunks[i],
          maxLine = lines.length - hunk.oldLines,
          localOffset = 0,
          toPos = offset + hunk.oldStart - 1;
      var iterator = distanceIterator(toPos, minLine, maxLine);

      for (; localOffset !== undefined; localOffset = iterator()) {
        if (hunkFits(hunk, toPos + localOffset)) {
          hunk.offset = offset += localOffset;
          break;
        }
      }

      if (localOffset === undefined) {
        return false;
      } // Set lower text limit to end of the current hunk, so next ones don't try
      // to fit over already patched text


      minLine = hunk.offset + hunk.oldStart + hunk.oldLines;
    } // Apply patch hunks


    var diffOffset = 0;

    for (var _i = 0; _i < hunks.length; _i++) {
      var _hunk = hunks[_i],
          _toPos = _hunk.oldStart + _hunk.offset + diffOffset - 1;

      diffOffset += _hunk.newLines - _hunk.oldLines;

      if (_toPos < 0) {
        // Creating a new file
        _toPos = 0;
      }

      for (var j = 0; j < _hunk.lines.length; j++) {
        var line = _hunk.lines[j],
            operation = line.length > 0 ? line[0] : ' ',
            content = line.length > 0 ? line.substr(1) : line,
            delimiter = _hunk.linedelimiters[j];

        if (operation === ' ') {
          _toPos++;
        } else if (operation === '-') {
          lines.splice(_toPos, 1);
          delimiters.splice(_toPos, 1);
          /* istanbul ignore else */
        } else if (operation === '+') {
          lines.splice(_toPos, 0, content);
          delimiters.splice(_toPos, 0, delimiter);
          _toPos++;
        } else if (operation === '\\') {
          var previousOperation = _hunk.lines[j - 1] ? _hunk.lines[j - 1][0] : null;

          if (previousOperation === '+') {
            removeEOFNL = true;
          } else if (previousOperation === '-') {
            addEOFNL = true;
          }
        }
      }
    } // Handle EOFNL insertion/removal


    if (removeEOFNL) {
      while (!lines[lines.length - 1]) {
        lines.pop();
        delimiters.pop();
      }
    } else if (addEOFNL) {
      lines.push('');
      delimiters.push('\n');
    }

    for (var _k = 0; _k < lines.length - 1; _k++) {
      lines[_k] = lines[_k] + delimiters[_k];
    }

    return lines.join('');
  } // Wrapper that supports multiple file patches via callbacks.

  function applyPatches(uniDiff, options) {
    if (typeof uniDiff === 'string') {
      uniDiff = parsePatch(uniDiff);
    }

    var currentIndex = 0;

    function processIndex() {
      var index = uniDiff[currentIndex++];

      if (!index) {
        return options.complete();
      }

      options.loadFile(index, function (err, data) {
        if (err) {
          return options.complete(err);
        }

        var updatedContent = applyPatch(data, index, options);
        options.patched(index, updatedContent, function (err) {
          if (err) {
            return options.complete(err);
          }

          processIndex();
        });
      });
    }

    processIndex();
  }

  function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
    if (!options) {
      options = {};
    }

    if (typeof options.context === 'undefined') {
      options.context = 4;
    }

    var diff = diffLines(oldStr, newStr, options);
    diff.push({
      value: '',
      lines: []
    }); // Append an empty value to make cleanup easier

    function contextLines(lines) {
      return lines.map(function (entry) {
        return ' ' + entry;
      });
    }

    var hunks = [];
    var oldRangeStart = 0,
        newRangeStart = 0,
        curRange = [],
        oldLine = 1,
        newLine = 1;

    var _loop = function _loop(i) {
      var current = diff[i],
          lines = current.lines || current.value.replace(/\n$/, '').split('\n');
      current.lines = lines;

      if (current.added || current.removed) {
        var _curRange;

        // If we have previous context, start with that
        if (!oldRangeStart) {
          var prev = diff[i - 1];
          oldRangeStart = oldLine;
          newRangeStart = newLine;

          if (prev) {
            curRange = options.context > 0 ? contextLines(prev.lines.slice(-options.context)) : [];
            oldRangeStart -= curRange.length;
            newRangeStart -= curRange.length;
          }
        } // Output our changes


        (_curRange = curRange).push.apply(_curRange, _toConsumableArray(lines.map(function (entry) {
          return (current.added ? '+' : '-') + entry;
        }))); // Track the updated file position


        if (current.added) {
          newLine += lines.length;
        } else {
          oldLine += lines.length;
        }
      } else {
        // Identical context lines. Track line changes
        if (oldRangeStart) {
          // Close out any changes that have been output (or join overlapping)
          if (lines.length <= options.context * 2 && i < diff.length - 2) {
            var _curRange2;

            // Overlapping
            (_curRange2 = curRange).push.apply(_curRange2, _toConsumableArray(contextLines(lines)));
          } else {
            var _curRange3;

            // end the range and output
            var contextSize = Math.min(lines.length, options.context);

            (_curRange3 = curRange).push.apply(_curRange3, _toConsumableArray(contextLines(lines.slice(0, contextSize))));

            var hunk = {
              oldStart: oldRangeStart,
              oldLines: oldLine - oldRangeStart + contextSize,
              newStart: newRangeStart,
              newLines: newLine - newRangeStart + contextSize,
              lines: curRange
            };

            if (i >= diff.length - 2 && lines.length <= options.context) {
              // EOF is inside this hunk
              var oldEOFNewline = /\n$/.test(oldStr);
              var newEOFNewline = /\n$/.test(newStr);
              var noNlBeforeAdds = lines.length == 0 && curRange.length > hunk.oldLines;

              if (!oldEOFNewline && noNlBeforeAdds) {
                // special case: old has no eol and no trailing context; no-nl can end up before adds
                curRange.splice(hunk.oldLines, 0, '\\ No newline at end of file');
              }

              if (!oldEOFNewline && !noNlBeforeAdds || !newEOFNewline) {
                curRange.push('\\ No newline at end of file');
              }
            }

            hunks.push(hunk);
            oldRangeStart = 0;
            newRangeStart = 0;
            curRange = [];
          }
        }

        oldLine += lines.length;
        newLine += lines.length;
      }
    };

    for (var i = 0; i < diff.length; i++) {
      _loop(i);
    }

    return {
      oldFileName: oldFileName,
      newFileName: newFileName,
      oldHeader: oldHeader,
      newHeader: newHeader,
      hunks: hunks
    };
  }
  function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
    var diff = structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options);
    var ret = [];

    if (oldFileName == newFileName) {
      ret.push('Index: ' + oldFileName);
    }

    ret.push('===================================================================');
    ret.push('--- ' + diff.oldFileName + (typeof diff.oldHeader === 'undefined' ? '' : '\t' + diff.oldHeader));
    ret.push('+++ ' + diff.newFileName + (typeof diff.newHeader === 'undefined' ? '' : '\t' + diff.newHeader));

    for (var i = 0; i < diff.hunks.length; i++) {
      var hunk = diff.hunks[i];
      ret.push('@@ -' + hunk.oldStart + ',' + hunk.oldLines + ' +' + hunk.newStart + ',' + hunk.newLines + ' @@');
      ret.push.apply(ret, hunk.lines);
    }

    return ret.join('\n') + '\n';
  }
  function createPatch(fileName, oldStr, newStr, oldHeader, newHeader, options) {
    return createTwoFilesPatch(fileName, fileName, oldStr, newStr, oldHeader, newHeader, options);
  }

  function arrayEqual(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    return arrayStartsWith(a, b);
  }
  function arrayStartsWith(array, start) {
    if (start.length > array.length) {
      return false;
    }

    for (var i = 0; i < start.length; i++) {
      if (start[i] !== array[i]) {
        return false;
      }
    }

    return true;
  }

  function calcLineCount(hunk) {
    var _calcOldNewLineCount = calcOldNewLineCount(hunk.lines),
        oldLines = _calcOldNewLineCount.oldLines,
        newLines = _calcOldNewLineCount.newLines;

    if (oldLines !== undefined) {
      hunk.oldLines = oldLines;
    } else {
      delete hunk.oldLines;
    }

    if (newLines !== undefined) {
      hunk.newLines = newLines;
    } else {
      delete hunk.newLines;
    }
  }
  function merge(mine, theirs, base) {
    mine = loadPatch(mine, base);
    theirs = loadPatch(theirs, base);
    var ret = {}; // For index we just let it pass through as it doesn't have any necessary meaning.
    // Leaving sanity checks on this to the API consumer that may know more about the
    // meaning in their own context.

    if (mine.index || theirs.index) {
      ret.index = mine.index || theirs.index;
    }

    if (mine.newFileName || theirs.newFileName) {
      if (!fileNameChanged(mine)) {
        // No header or no change in ours, use theirs (and ours if theirs does not exist)
        ret.oldFileName = theirs.oldFileName || mine.oldFileName;
        ret.newFileName = theirs.newFileName || mine.newFileName;
        ret.oldHeader = theirs.oldHeader || mine.oldHeader;
        ret.newHeader = theirs.newHeader || mine.newHeader;
      } else if (!fileNameChanged(theirs)) {
        // No header or no change in theirs, use ours
        ret.oldFileName = mine.oldFileName;
        ret.newFileName = mine.newFileName;
        ret.oldHeader = mine.oldHeader;
        ret.newHeader = mine.newHeader;
      } else {
        // Both changed... figure it out
        ret.oldFileName = selectField(ret, mine.oldFileName, theirs.oldFileName);
        ret.newFileName = selectField(ret, mine.newFileName, theirs.newFileName);
        ret.oldHeader = selectField(ret, mine.oldHeader, theirs.oldHeader);
        ret.newHeader = selectField(ret, mine.newHeader, theirs.newHeader);
      }
    }

    ret.hunks = [];
    var mineIndex = 0,
        theirsIndex = 0,
        mineOffset = 0,
        theirsOffset = 0;

    while (mineIndex < mine.hunks.length || theirsIndex < theirs.hunks.length) {
      var mineCurrent = mine.hunks[mineIndex] || {
        oldStart: Infinity
      },
          theirsCurrent = theirs.hunks[theirsIndex] || {
        oldStart: Infinity
      };

      if (hunkBefore(mineCurrent, theirsCurrent)) {
        // This patch does not overlap with any of the others, yay.
        ret.hunks.push(cloneHunk(mineCurrent, mineOffset));
        mineIndex++;
        theirsOffset += mineCurrent.newLines - mineCurrent.oldLines;
      } else if (hunkBefore(theirsCurrent, mineCurrent)) {
        // This patch does not overlap with any of the others, yay.
        ret.hunks.push(cloneHunk(theirsCurrent, theirsOffset));
        theirsIndex++;
        mineOffset += theirsCurrent.newLines - theirsCurrent.oldLines;
      } else {
        // Overlap, merge as best we can
        var mergedHunk = {
          oldStart: Math.min(mineCurrent.oldStart, theirsCurrent.oldStart),
          oldLines: 0,
          newStart: Math.min(mineCurrent.newStart + mineOffset, theirsCurrent.oldStart + theirsOffset),
          newLines: 0,
          lines: []
        };
        mergeLines(mergedHunk, mineCurrent.oldStart, mineCurrent.lines, theirsCurrent.oldStart, theirsCurrent.lines);
        theirsIndex++;
        mineIndex++;
        ret.hunks.push(mergedHunk);
      }
    }

    return ret;
  }

  function loadPatch(param, base) {
    if (typeof param === 'string') {
      if (/^@@/m.test(param) || /^Index:/m.test(param)) {
        return parsePatch(param)[0];
      }

      if (!base) {
        throw new Error('Must provide a base reference or pass in a patch');
      }

      return structuredPatch(undefined, undefined, base, param);
    }

    return param;
  }

  function fileNameChanged(patch) {
    return patch.newFileName && patch.newFileName !== patch.oldFileName;
  }

  function selectField(index, mine, theirs) {
    if (mine === theirs) {
      return mine;
    } else {
      index.conflict = true;
      return {
        mine: mine,
        theirs: theirs
      };
    }
  }

  function hunkBefore(test, check) {
    return test.oldStart < check.oldStart && test.oldStart + test.oldLines < check.oldStart;
  }

  function cloneHunk(hunk, offset) {
    return {
      oldStart: hunk.oldStart,
      oldLines: hunk.oldLines,
      newStart: hunk.newStart + offset,
      newLines: hunk.newLines,
      lines: hunk.lines
    };
  }

  function mergeLines(hunk, mineOffset, mineLines, theirOffset, theirLines) {
    // This will generally result in a conflicted hunk, but there are cases where the context
    // is the only overlap where we can successfully merge the content here.
    var mine = {
      offset: mineOffset,
      lines: mineLines,
      index: 0
    },
        their = {
      offset: theirOffset,
      lines: theirLines,
      index: 0
    }; // Handle any leading content

    insertLeading(hunk, mine, their);
    insertLeading(hunk, their, mine); // Now in the overlap content. Scan through and select the best changes from each.

    while (mine.index < mine.lines.length && their.index < their.lines.length) {
      var mineCurrent = mine.lines[mine.index],
          theirCurrent = their.lines[their.index];

      if ((mineCurrent[0] === '-' || mineCurrent[0] === '+') && (theirCurrent[0] === '-' || theirCurrent[0] === '+')) {
        // Both modified ...
        mutualChange(hunk, mine, their);
      } else if (mineCurrent[0] === '+' && theirCurrent[0] === ' ') {
        var _hunk$lines;

        // Mine inserted
        (_hunk$lines = hunk.lines).push.apply(_hunk$lines, _toConsumableArray(collectChange(mine)));
      } else if (theirCurrent[0] === '+' && mineCurrent[0] === ' ') {
        var _hunk$lines2;

        // Theirs inserted
        (_hunk$lines2 = hunk.lines).push.apply(_hunk$lines2, _toConsumableArray(collectChange(their)));
      } else if (mineCurrent[0] === '-' && theirCurrent[0] === ' ') {
        // Mine removed or edited
        removal(hunk, mine, their);
      } else if (theirCurrent[0] === '-' && mineCurrent[0] === ' ') {
        // Their removed or edited
        removal(hunk, their, mine, true);
      } else if (mineCurrent === theirCurrent) {
        // Context identity
        hunk.lines.push(mineCurrent);
        mine.index++;
        their.index++;
      } else {
        // Context mismatch
        conflict(hunk, collectChange(mine), collectChange(their));
      }
    } // Now push anything that may be remaining


    insertTrailing(hunk, mine);
    insertTrailing(hunk, their);
    calcLineCount(hunk);
  }

  function mutualChange(hunk, mine, their) {
    var myChanges = collectChange(mine),
        theirChanges = collectChange(their);

    if (allRemoves(myChanges) && allRemoves(theirChanges)) {
      // Special case for remove changes that are supersets of one another
      if (arrayStartsWith(myChanges, theirChanges) && skipRemoveSuperset(their, myChanges, myChanges.length - theirChanges.length)) {
        var _hunk$lines3;

        (_hunk$lines3 = hunk.lines).push.apply(_hunk$lines3, _toConsumableArray(myChanges));

        return;
      } else if (arrayStartsWith(theirChanges, myChanges) && skipRemoveSuperset(mine, theirChanges, theirChanges.length - myChanges.length)) {
        var _hunk$lines4;

        (_hunk$lines4 = hunk.lines).push.apply(_hunk$lines4, _toConsumableArray(theirChanges));

        return;
      }
    } else if (arrayEqual(myChanges, theirChanges)) {
      var _hunk$lines5;

      (_hunk$lines5 = hunk.lines).push.apply(_hunk$lines5, _toConsumableArray(myChanges));

      return;
    }

    conflict(hunk, myChanges, theirChanges);
  }

  function removal(hunk, mine, their, swap) {
    var myChanges = collectChange(mine),
        theirChanges = collectContext(their, myChanges);

    if (theirChanges.merged) {
      var _hunk$lines6;

      (_hunk$lines6 = hunk.lines).push.apply(_hunk$lines6, _toConsumableArray(theirChanges.merged));
    } else {
      conflict(hunk, swap ? theirChanges : myChanges, swap ? myChanges : theirChanges);
    }
  }

  function conflict(hunk, mine, their) {
    hunk.conflict = true;
    hunk.lines.push({
      conflict: true,
      mine: mine,
      theirs: their
    });
  }

  function insertLeading(hunk, insert, their) {
    while (insert.offset < their.offset && insert.index < insert.lines.length) {
      var line = insert.lines[insert.index++];
      hunk.lines.push(line);
      insert.offset++;
    }
  }

  function insertTrailing(hunk, insert) {
    while (insert.index < insert.lines.length) {
      var line = insert.lines[insert.index++];
      hunk.lines.push(line);
    }
  }

  function collectChange(state) {
    var ret = [],
        operation = state.lines[state.index][0];

    while (state.index < state.lines.length) {
      var line = state.lines[state.index]; // Group additions that are immediately after subtractions and treat them as one "atomic" modify change.

      if (operation === '-' && line[0] === '+') {
        operation = '+';
      }

      if (operation === line[0]) {
        ret.push(line);
        state.index++;
      } else {
        break;
      }
    }

    return ret;
  }

  function collectContext(state, matchChanges) {
    var changes = [],
        merged = [],
        matchIndex = 0,
        contextChanges = false,
        conflicted = false;

    while (matchIndex < matchChanges.length && state.index < state.lines.length) {
      var change = state.lines[state.index],
          match = matchChanges[matchIndex]; // Once we've hit our add, then we are done

      if (match[0] === '+') {
        break;
      }

      contextChanges = contextChanges || change[0] !== ' ';
      merged.push(match);
      matchIndex++; // Consume any additions in the other block as a conflict to attempt
      // to pull in the remaining context after this

      if (change[0] === '+') {
        conflicted = true;

        while (change[0] === '+') {
          changes.push(change);
          change = state.lines[++state.index];
        }
      }

      if (match.substr(1) === change.substr(1)) {
        changes.push(change);
        state.index++;
      } else {
        conflicted = true;
      }
    }

    if ((matchChanges[matchIndex] || '')[0] === '+' && contextChanges) {
      conflicted = true;
    }

    if (conflicted) {
      return changes;
    }

    while (matchIndex < matchChanges.length) {
      merged.push(matchChanges[matchIndex++]);
    }

    return {
      merged: merged,
      changes: changes
    };
  }

  function allRemoves(changes) {
    return changes.reduce(function (prev, change) {
      return prev && change[0] === '-';
    }, true);
  }

  function skipRemoveSuperset(state, removeChanges, delta) {
    for (var i = 0; i < delta; i++) {
      var changeContent = removeChanges[removeChanges.length - delta + i].substr(1);

      if (state.lines[state.index + i] !== ' ' + changeContent) {
        return false;
      }
    }

    state.index += delta;
    return true;
  }

  function calcOldNewLineCount(lines) {
    var oldLines = 0;
    var newLines = 0;
    lines.forEach(function (line) {
      if (typeof line !== 'string') {
        var myCount = calcOldNewLineCount(line.mine);
        var theirCount = calcOldNewLineCount(line.theirs);

        if (oldLines !== undefined) {
          if (myCount.oldLines === theirCount.oldLines) {
            oldLines += myCount.oldLines;
          } else {
            oldLines = undefined;
          }
        }

        if (newLines !== undefined) {
          if (myCount.newLines === theirCount.newLines) {
            newLines += myCount.newLines;
          } else {
            newLines = undefined;
          }
        }
      } else {
        if (newLines !== undefined && (line[0] === '+' || line[0] === ' ')) {
          newLines++;
        }

        if (oldLines !== undefined && (line[0] === '-' || line[0] === ' ')) {
          oldLines++;
        }
      }
    });
    return {
      oldLines: oldLines,
      newLines: newLines
    };
  }

  // See: http://code.google.com/p/google-diff-match-patch/wiki/API
  function convertChangesToDMP(changes) {
    var ret = [],
        change,
        operation;

    for (var i = 0; i < changes.length; i++) {
      change = changes[i];

      if (change.added) {
        operation = 1;
      } else if (change.removed) {
        operation = -1;
      } else {
        operation = 0;
      }

      ret.push([operation, change.value]);
    }

    return ret;
  }

  function convertChangesToXML(changes) {
    var ret = [];

    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];

      if (change.added) {
        ret.push('<ins>');
      } else if (change.removed) {
        ret.push('<del>');
      }

      ret.push(escapeHTML(change.value));

      if (change.added) {
        ret.push('</ins>');
      } else if (change.removed) {
        ret.push('</del>');
      }
    }

    return ret.join('');
  }

  function escapeHTML(s) {
    var n = s;
    n = n.replace(/&/g, '&amp;');
    n = n.replace(/</g, '&lt;');
    n = n.replace(/>/g, '&gt;');
    n = n.replace(/"/g, '&quot;');
    return n;
  }

  /* See LICENSE file for terms of use */

  exports.Diff = Diff;
  exports.diffChars = diffChars;
  exports.diffWords = diffWords;
  exports.diffWordsWithSpace = diffWordsWithSpace;
  exports.diffLines = diffLines;
  exports.diffTrimmedLines = diffTrimmedLines;
  exports.diffSentences = diffSentences;
  exports.diffCss = diffCss;
  exports.diffJson = diffJson;
  exports.diffArrays = diffArrays;
  exports.structuredPatch = structuredPatch;
  exports.createTwoFilesPatch = createTwoFilesPatch;
  exports.createPatch = createPatch;
  exports.applyPatch = applyPatch;
  exports.applyPatches = applyPatches;
  exports.parsePatch = parsePatch;
  exports.merge = merge;
  exports.convertChangesToDMP = convertChangesToDMP;
  exports.convertChangesToXML = convertChangesToXML;
  exports.canonicalize = canonicalize;

  Object.defineProperty(exports, '__esModule', { value: true });

}));

},{}],20:[function(require,module,exports){
'use strict';

/* globals
	Atomics,
	SharedArrayBuffer,
*/

var undefined;

var $TypeError = TypeError;

var $gOPD = Object.getOwnPropertyDescriptor;
if ($gOPD) {
	try {
		$gOPD({}, '');
	} catch (e) {
		$gOPD = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () { throw new $TypeError(); };
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = require('has-symbols')();

var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

var generator; // = function * () {};
var generatorFunction = generator ? getProto(generator) : undefined;
var asyncFn; // async function() {};
var asyncFunction = asyncFn ? asyncFn.constructor : undefined;
var asyncGen; // async function * () {};
var asyncGenFunction = asyncGen ? getProto(asyncGen) : undefined;
var asyncGenIterator = asyncGen ? asyncGen() : undefined;

var TypedArray = typeof Uint8Array === 'undefined' ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayBufferPrototype%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer.prototype,
	'%ArrayIteratorPrototype%': hasSymbols ? getProto([][Symbol.iterator]()) : undefined,
	'%ArrayPrototype%': Array.prototype,
	'%ArrayProto_entries%': Array.prototype.entries,
	'%ArrayProto_forEach%': Array.prototype.forEach,
	'%ArrayProto_keys%': Array.prototype.keys,
	'%ArrayProto_values%': Array.prototype.values,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': asyncFunction,
	'%AsyncFunctionPrototype%': asyncFunction ? asyncFunction.prototype : undefined,
	'%AsyncGenerator%': asyncGen ? getProto(asyncGenIterator) : undefined,
	'%AsyncGeneratorFunction%': asyncGenFunction,
	'%AsyncGeneratorPrototype%': asyncGenFunction ? asyncGenFunction.prototype : undefined,
	'%AsyncIteratorPrototype%': asyncGenIterator && hasSymbols && Symbol.asyncIterator ? asyncGenIterator[Symbol.asyncIterator]() : undefined,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%Boolean%': Boolean,
	'%BooleanPrototype%': Boolean.prototype,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%DataViewPrototype%': typeof DataView === 'undefined' ? undefined : DataView.prototype,
	'%Date%': Date,
	'%DatePrototype%': Date.prototype,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': Error,
	'%ErrorPrototype%': Error.prototype,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': EvalError,
	'%EvalErrorPrototype%': EvalError.prototype,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float32ArrayPrototype%': typeof Float32Array === 'undefined' ? undefined : Float32Array.prototype,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%Float64ArrayPrototype%': typeof Float64Array === 'undefined' ? undefined : Float64Array.prototype,
	'%Function%': Function,
	'%FunctionPrototype%': Function.prototype,
	'%Generator%': generator ? getProto(generator()) : undefined,
	'%GeneratorFunction%': generatorFunction,
	'%GeneratorPrototype%': generatorFunction ? generatorFunction.prototype : undefined,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int8ArrayPrototype%': typeof Int8Array === 'undefined' ? undefined : Int8Array.prototype,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int16ArrayPrototype%': typeof Int16Array === 'undefined' ? undefined : Int8Array.prototype,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%Int32ArrayPrototype%': typeof Int32Array === 'undefined' ? undefined : Int32Array.prototype,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%JSONParse%': typeof JSON === 'object' ? JSON.parse : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%MapPrototype%': typeof Map === 'undefined' ? undefined : Map.prototype,
	'%Math%': Math,
	'%Number%': Number,
	'%NumberPrototype%': Number.prototype,
	'%Object%': Object,
	'%ObjectPrototype%': Object.prototype,
	'%ObjProto_toString%': Object.prototype.toString,
	'%ObjProto_valueOf%': Object.prototype.valueOf,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%PromisePrototype%': typeof Promise === 'undefined' ? undefined : Promise.prototype,
	'%PromiseProto_then%': typeof Promise === 'undefined' ? undefined : Promise.prototype.then,
	'%Promise_all%': typeof Promise === 'undefined' ? undefined : Promise.all,
	'%Promise_reject%': typeof Promise === 'undefined' ? undefined : Promise.reject,
	'%Promise_resolve%': typeof Promise === 'undefined' ? undefined : Promise.resolve,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': RangeError,
	'%RangeErrorPrototype%': RangeError.prototype,
	'%ReferenceError%': ReferenceError,
	'%ReferenceErrorPrototype%': ReferenceError.prototype,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%RegExpPrototype%': RegExp.prototype,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SetPrototype%': typeof Set === 'undefined' ? undefined : Set.prototype,
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%SharedArrayBufferPrototype%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer.prototype,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols ? getProto(''[Symbol.iterator]()) : undefined,
	'%StringPrototype%': String.prototype,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SymbolPrototype%': hasSymbols ? Symbol.prototype : undefined,
	'%SyntaxError%': SyntaxError,
	'%SyntaxErrorPrototype%': SyntaxError.prototype,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypedArrayPrototype%': TypedArray ? TypedArray.prototype : undefined,
	'%TypeError%': $TypeError,
	'%TypeErrorPrototype%': $TypeError.prototype,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ArrayPrototype%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array.prototype,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint8ClampedArrayPrototype%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray.prototype,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint16ArrayPrototype%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array.prototype,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%Uint32ArrayPrototype%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array.prototype,
	'%URIError%': URIError,
	'%URIErrorPrototype%': URIError.prototype,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakMapPrototype%': typeof WeakMap === 'undefined' ? undefined : WeakMap.prototype,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet,
	'%WeakSetPrototype%': typeof WeakSet === 'undefined' ? undefined : WeakSet.prototype
};

var bind = require('function-bind');
var $replace = bind.call(Function.call, String.prototype.replace);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : (number || match);
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	if (!(name in INTRINSICS)) {
		throw new SyntaxError('intrinsic ' + name + ' does not exist!');
	}

	// istanbul ignore if // hopefully this is impossible to test :-)
	if (typeof INTRINSICS[name] === 'undefined' && !allowMissing) {
		throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
	}

	return INTRINSICS[name];
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new TypeError('"allowMissing" argument must be a boolean');
	}

	var parts = stringToPath(name);

	var value = getBaseIntrinsic('%' + (parts.length > 0 ? parts[0] : '') + '%', allowMissing);
	for (var i = 1; i < parts.length; i += 1) {
		if (value != null) {
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, parts[i]);
				if (!allowMissing && !(parts[i] in value)) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				value = desc ? (desc.get || desc.value) : value[parts[i]];
			} else {
				value = value[parts[i]];
			}
		}
	}
	return value;
};

},{"function-bind":25,"has-symbols":27}],21:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

var GetIntrinsic = require('../GetIntrinsic');

var $Function = GetIntrinsic('%Function%');
var $apply = $Function.apply;
var $call = $Function.call;

module.exports = function callBind() {
	return bind.apply($call, arguments);
};

module.exports.apply = function applyBind() {
	return bind.apply($apply, arguments);
};

},{"../GetIntrinsic":20,"function-bind":25}],22:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('../GetIntrinsic');

var callBind = require('./callBind');

var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

module.exports = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.')) {
		return callBind(intrinsic);
	}
	return intrinsic;
};

},{"../GetIntrinsic":20,"./callBind":21}],23:[function(require,module,exports){
(function (process){
'use strict';

/* eslint global-require: 0 */
// the code is structured this way so that bundlers can
// alias out `has-symbols` to `() => true` or `() => false` if your target
// environments' Symbol capabilities are known, and then use
// dead code elimination on the rest of this module.
//
// Similarly, `isarray` can be aliased to `Array.isArray` if
// available in all target environments.

var isArguments = require('is-arguments');

if (require('has-symbols')() || require('has-symbols/shams')()) {
	var $iterator = Symbol.iterator;
	// Symbol is available natively or shammed
	// natively:
	//  - Chrome >= 38
	//  - Edge 12-14?, Edge >= 15 for sure
	//  - FF >= 36
	//  - Safari >= 9
	//  - node >= 0.12
	module.exports = function getIterator(iterable) {
		// alternatively, `iterable[$iterator]?.()`
		if (iterable != null && typeof iterable[$iterator] !== 'undefined') {
			return iterable[$iterator]();
		}
		if (isArguments(iterable)) {
			// arguments objects lack Symbol.iterator
			// - node 0.12
			return Array.prototype[$iterator].call(iterable);
		}
	};
} else {
	// Symbol is not available, native or shammed
	var isArray = require('isarray');
	var isString = require('is-string');
	var GetIntrinsic = require('es-abstract/GetIntrinsic');
	var $Map = GetIntrinsic('%Map%', true);
	var $Set = GetIntrinsic('%Set%', true);
	var callBound = require('es-abstract/helpers/callBound');
	var $arrayPush = callBound('Array.prototype.push');
	var $charCodeAt = callBound('String.prototype.charCodeAt');
	var $stringSlice = callBound('String.prototype.slice');

	var advanceStringIndex = function advanceStringIndex(S, index) {
		var length = S.length;
		if ((index + 1) >= length) {
			return index + 1;
		}

		var first = $charCodeAt(S, index);
		if (first < 0xD800 || first > 0xDBFF) {
			return index + 1;
		}

		var second = $charCodeAt(S, index + 1);
		if (second < 0xDC00 || second > 0xDFFF) {
			return index + 1;
		}

		return index + 2;
	};

	var getArrayIterator = function getArrayIterator(arraylike) {
		var i = 0;
		return {
			next: function next() {
				var done = i >= arraylike.length;
				var value;
				if (!done) {
					value = arraylike[i];
					i += 1;
				}
				return {
					done: done,
					value: value
				};
			}
		};
	};

	var getNonCollectionIterator = function getNonCollectionIterator(iterable) {
		if (isArray(iterable) || isArguments(iterable)) {
			return getArrayIterator(iterable);
		}
		if (isString(iterable)) {
			var i = 0;
			return {
				next: function next() {
					var nextIndex = advanceStringIndex(iterable, i);
					var value = $stringSlice(iterable, i, nextIndex);
					i = nextIndex;
					return {
						done: nextIndex > iterable.length,
						value: value
					};
				}
			};
		}
	};

	if (!$Map && !$Set) {
		// the only language iterables are Array, String, arguments
		// - Safari <= 6.0
		// - Chrome < 38
		// - node < 0.12
		// - FF < 13
		// - IE < 11
		// - Edge < 11

		module.exports = getNonCollectionIterator;
	} else {
		// either Map or Set are available, but Symbol is not
		// - es6-shim on an ES5 browser
		// - Safari 6.2 (maybe 6.1?)
		// - FF v[13, 36)
		// - IE 11
		// - Edge 11
		// - Safari v[6, 9)

		var isMap = require('is-map');
		var isSet = require('is-set');

		// Firefox >= 27, IE 11, Safari 6.2 - 9, Edge 11, es6-shim in older envs, all have forEach
		var $mapForEach = callBound('Map.prototype.forEach', true);
		var $setForEach = callBound('Set.prototype.forEach', true);
		if (typeof process === 'undefined' || !process.versions || !process.versions.node) { // "if is not node"

			// Firefox 17 - 26 has `.iterator()`, whose iterator `.next()` either
			// returns a value, or throws a StopIteration object. These browsers
			// do not have any other mechanism for iteration.
			var $mapIterator = callBound('Map.prototype.iterator', true);
			var $setIterator = callBound('Set.prototype.iterator', true);
			var getStopIterationIterator = function (iterator) {
				var done = false;
				return {
					next: function next() {
						try {
							return {
								done: done,
								value: done ? undefined : iterator.next()
							};
						} catch (e) {
							done = true;
							return {
								done: true,
								value: undefined
							};
						}
					}
				};
			};
		}
		// Firefox 27-35, and some older es6-shim versions, use a string "@@iterator" property
		// this returns a proper iterator object, so we should use it instead of forEach.
		// newer es6-shim versions use a string "_es6-shim iterator_" property.
		var $mapAtAtIterator = callBound('Map.prototype.@@iterator', true) || callBound('Map.prototype._es6-shim iterator_', true);
		var $setAtAtIterator = callBound('Set.prototype.@@iterator', true) || callBound('Set.prototype._es6-shim iterator_', true);

		var getCollectionIterator = function getCollectionIterator(iterable) {
			if (isMap(iterable)) {
				if ($mapIterator) {
					return getStopIterationIterator($mapIterator(iterable));
				}
				if ($mapAtAtIterator) {
					return $mapAtAtIterator(iterable);
				}
				if ($mapForEach) {
					var entries = [];
					$mapForEach(iterable, function (v, k) {
						$arrayPush(entries, [k, v]);
					});
					return getArrayIterator(entries);
				}
			}
			if (isSet(iterable)) {
				if ($setIterator) {
					return getStopIterationIterator($setIterator(iterable));
				}
				if ($setAtAtIterator) {
					return $setAtAtIterator(iterable);
				}
				if ($setForEach) {
					var values = [];
					$setForEach(iterable, function (v) {
						$arrayPush(values, v);
					});
					return getArrayIterator(values);
				}
			}
		};

		module.exports = function getIterator(iterable) {
			return getCollectionIterator(iterable) || getNonCollectionIterator(iterable);
		};
	}
}

}).call(this,require('_process'))

},{"_process":5,"es-abstract/GetIntrinsic":20,"es-abstract/helpers/callBound":22,"has-symbols":27,"has-symbols/shams":28,"is-arguments":30,"is-map":34,"is-set":37,"is-string":38,"isarray":42}],24:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],25:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":24}],26:[function(require,module,exports){
'use strict'

module.exports = diff

var assign = require('object-assign')

/**
 * diff(a, b [, eql]) diffs the array-like objects `a` and `b`, returning
 * a summary of the edits made. By default, strict equality (`===`) is
 * used to compare items in `a` and `b`; if this will not work (for example,
 * if the items in `a` and `b` are objects), a custom equality function,
 * `eql`, may be passed as a third argument.
 *
 * @param {Array} a
 * @param {Array} b
 * @param {Function} eql
 * @return {Array}
 */
function diff (a, b, eql) {
  eql = eql || strictEqual

  var N = a.length
  var M = b.length
  var MAX = N + M

  var V = {}
  var Vs = []

  V[1] = 0
  for (var D = 0; D <= MAX; D += 1) {
    for (var k = -D; k <= D; k += 2) {
      var x, y

      if (k === -D || (k !== D && V[k - 1] < V[k + 1])) {
        x = V[k + 1]
      } else {
        x = V[k - 1] + 1
      }

      y = x - k
      while (x < N && y < M && eql(a[x], b[y])) {
        x += 1
        y += 1
      }

      V[k] = x
      if (x >= N && y >= M) {
        Vs[D] = assign({}, V)
        return buildEdits(Vs, a, b)
      }
    }

    Vs[D] = assign({}, V)
  }

  // ?
  throw Error('Unreachable diff path reached')
}

// Used when no equality function is given to diff()
function strictEqual (a, b) {
  return a === b
}

/**
 * buildEdits(Vs, a, b) builds an array of edits from the edit graph,
 * `Vs`, of `a` and `b`.
 *
 * @param {Array} Vs
 * @param {Array} a
 * @param {Array} b
 * @return {Array}
 */
function buildEdits (Vs, a, b) {
  var edits = []

  var p = { x: a.length, y: b.length }
  for (var D = Vs.length - 1; p.x > 0 || p.y > 0; D -= 1) {
    var V = Vs[D]
    var k = p.x - p.y

    var xEnd = V[k]

    var down = (k === -D || (k !== D && V[k - 1] < V[k + 1]))
    var kPrev = down ? k + 1 : k - 1

    var xStart = V[kPrev]
    var yStart = xStart - kPrev

    var xMid = down ? xStart : xStart + 1

    while (xEnd > xMid) {
      pushEdit(edits, a[xEnd - 1], false, false)
      xEnd -= 1
    }

    if (yStart < 0) break

    if (down) {
      pushEdit(edits, b[yStart], true, false)
    } else {
      pushEdit(edits, a[xStart], false, true)
    }

    p.x = xStart
    p.y = yStart
  }

  return edits.reverse()
}

/**
 * pushEdit(edits, item, added, removed) adds the given item to the array
 * of edits. Similar edits are grouped together for conciseness.
 *
 * @param {Array} edits
 * @param {*} item
 * @param {Boolean} added
 * @param {Boolean} removed
 */
function pushEdit (edits, item, added, removed) {
  var last = edits[edits.length - 1]

  if (last && last.added === added && last.removed === removed) {
    last.items.unshift(item) // Not push: edits get reversed later
  } else {
    edits.push({
      items: [item],
      added: added,
      removed: removed
    })
  }
}

},{"object-assign":45}],27:[function(require,module,exports){
(function (global){
'use strict';

var origSymbol = global.Symbol;
var hasSymbolSham = require('./shams');

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./shams":28}],28:[function(require,module,exports){
'use strict';

/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

},{}],29:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":25}],30:[function(require,module,exports){
'use strict';

var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
var toStr = Object.prototype.toString;

var isStandardArguments = function isArguments(value) {
	if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
		return false;
	}
	return toStr.call(value) === '[object Arguments]';
};

var isLegacyArguments = function isArguments(value) {
	if (isStandardArguments(value)) {
		return true;
	}
	return value !== null &&
		typeof value === 'object' &&
		typeof value.length === 'number' &&
		value.length >= 0 &&
		toStr.call(value) !== '[object Array]' &&
		toStr.call(value.callee) === '[object Function]';
};

var supportsStandardArguments = (function () {
	return isStandardArguments(arguments);
}());

isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;

},{}],31:[function(require,module,exports){
'use strict';

if (typeof BigInt === 'function') {
	var bigIntValueOf = BigInt.prototype.valueOf;
	var tryBigInt = function tryBigIntObject(value) {
		try {
			bigIntValueOf.call(value);
			return true;
		} catch (e) {
		}
		return false;
	};

	module.exports = function isBigInt(value) {
		if (
			value === null
			|| typeof value === 'undefined'
			|| typeof value === 'boolean'
			|| typeof value === 'string'
			|| typeof value === 'number'
			|| typeof value === 'symbol'
			|| typeof value === 'function'
		) {
			return false;
		}
		if (typeof value === 'bigint') { // eslint-disable-line valid-typeof
			return true;
		}

		return tryBigInt(value);
	};
} else {
	module.exports = function isBigInt(value) {
		return false && value;
	};
}

},{}],32:[function(require,module,exports){
'use strict';

var boolToStr = Boolean.prototype.toString;

var tryBooleanObject = function booleanBrandCheck(value) {
	try {
		boolToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var boolClass = '[object Boolean]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isBoolean(value) {
	if (typeof value === 'boolean') {
		return true;
	}
	if (value === null || typeof value !== 'object') {
		return false;
	}
	return hasToStringTag && Symbol.toStringTag in value ? tryBooleanObject(value) : toStr.call(value) === boolClass;
};

},{}],33:[function(require,module,exports){
'use strict';

var getDay = Date.prototype.getDay;
var tryDateObject = function tryDateGetDayCall(value) {
	try {
		getDay.call(value);
		return true;
	} catch (e) {
		return false;
	}
};

var toStr = Object.prototype.toString;
var dateClass = '[object Date]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isDateObject(value) {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	return hasToStringTag ? tryDateObject(value) : toStr.call(value) === dateClass;
};

},{}],34:[function(require,module,exports){
'use strict';

var $Map = typeof Map === 'function' && Map.prototype ? Map : null;
var $Set = typeof Set === 'function' && Set.prototype ? Set : null;

var exported;

if (!$Map) {
	// eslint-disable-next-line no-unused-vars
	exported = function isMap(x) {
		// `Map` is not present in this environment.
		return false;
	};
}

var $mapHas = $Map ? Map.prototype.has : null;
var $setHas = $Set ? Set.prototype.has : null;
if (!exported && !$mapHas) {
	// eslint-disable-next-line no-unused-vars
	exported = function isMap(x) {
		// `Map` does not have a `has` method
		return false;
	};
}

module.exports = exported || function isMap(x) {
	if (!x || typeof x !== 'object') {
		return false;
	}
	try {
		$mapHas.call(x);
		if ($setHas) {
			try {
				$setHas.call(x);
			} catch (e) {
				return true;
			}
		}
		return x instanceof $Map; // core-js workaround, pre-v2.5.0
	} catch (e) {}
	return false;
};

},{}],35:[function(require,module,exports){
'use strict';

var numToStr = Number.prototype.toString;
var tryNumberObject = function tryNumberObject(value) {
	try {
		numToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var numClass = '[object Number]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isNumberObject(value) {
	if (typeof value === 'number') {
		return true;
	}
	if (typeof value !== 'object') {
		return false;
	}
	return hasToStringTag ? tryNumberObject(value) : toStr.call(value) === numClass;
};

},{}],36:[function(require,module,exports){
'use strict';

var has = require('has');
var regexExec = RegExp.prototype.exec;
var gOPD = Object.getOwnPropertyDescriptor;

var tryRegexExecCall = function tryRegexExec(value) {
	try {
		var lastIndex = value.lastIndex;
		value.lastIndex = 0; // eslint-disable-line no-param-reassign

		regexExec.call(value);
		return true;
	} catch (e) {
		return false;
	} finally {
		value.lastIndex = lastIndex; // eslint-disable-line no-param-reassign
	}
};
var toStr = Object.prototype.toString;
var regexClass = '[object RegExp]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isRegex(value) {
	if (!value || typeof value !== 'object') {
		return false;
	}
	if (!hasToStringTag) {
		return toStr.call(value) === regexClass;
	}

	var descriptor = gOPD(value, 'lastIndex');
	var hasLastIndexDataProperty = descriptor && has(descriptor, 'value');
	if (!hasLastIndexDataProperty) {
		return false;
	}

	return tryRegexExecCall(value);
};

},{"has":29}],37:[function(require,module,exports){
'use strict';

var $Map = typeof Map === 'function' && Map.prototype ? Map : null;
var $Set = typeof Set === 'function' && Set.prototype ? Set : null;

var exported;

if (!$Set) {
	// eslint-disable-next-line no-unused-vars
	exported = function isSet(x) {
		// `Set` is not present in this environment.
		return false;
	};
}

var $mapHas = $Map ? Map.prototype.has : null;
var $setHas = $Set ? Set.prototype.has : null;
if (!exported && !$setHas) {
	// eslint-disable-next-line no-unused-vars
	exported = function isSet(x) {
		// `Set` does not have a `has` method
		return false;
	};
}

module.exports = exported || function isSet(x) {
	if (!x || typeof x !== 'object') {
		return false;
	}
	try {
		$setHas.call(x);
		if ($mapHas) {
			try {
				$mapHas.call(x);
			} catch (e) {
				return true;
			}
		}
		return x instanceof $Set; // core-js workaround, pre-v2.5.0
	} catch (e) {}
	return false;
};

},{}],38:[function(require,module,exports){
'use strict';

var strValue = String.prototype.valueOf;
var tryStringObject = function tryStringObject(value) {
	try {
		strValue.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var strClass = '[object String]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isString(value) {
	if (typeof value === 'string') {
		return true;
	}
	if (typeof value !== 'object') {
		return false;
	}
	return hasToStringTag ? tryStringObject(value) : toStr.call(value) === strClass;
};

},{}],39:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;
var hasSymbols = require('has-symbols')();

if (hasSymbols) {
	var symToStr = Symbol.prototype.toString;
	var symStringRegex = /^Symbol\(.*\)$/;
	var isSymbolObject = function isRealSymbolObject(value) {
		if (typeof value.valueOf() !== 'symbol') {
			return false;
		}
		return symStringRegex.test(symToStr.call(value));
	};

	module.exports = function isSymbol(value) {
		if (typeof value === 'symbol') {
			return true;
		}
		if (toStr.call(value) !== '[object Symbol]') {
			return false;
		}
		try {
			return isSymbolObject(value);
		} catch (e) {
			return false;
		}
	};
} else {

	module.exports = function isSymbol(value) {
		// this environment does not support Symbols.
		return false && value;
	};
}

},{"has-symbols":27}],40:[function(require,module,exports){
'use strict';

var $WeakMap = typeof WeakMap === 'function' && WeakMap.prototype ? WeakMap : null;
var $WeakSet = typeof WeakSet === 'function' && WeakSet.prototype ? WeakSet : null;

var exported;

if (!$WeakMap) {
	// eslint-disable-next-line no-unused-vars
	exported = function isWeakMap(x) {
		// `WeakMap` is not present in this environment.
		return false;
	};
}

var $mapHas = $WeakMap ? $WeakMap.prototype.has : null;
var $setHas = $WeakSet ? $WeakSet.prototype.has : null;
if (!exported && !$mapHas) {
	// eslint-disable-next-line no-unused-vars
	exported = function isWeakMap(x) {
		// `WeakMap` does not have a `has` method
		return false;
	};
}

module.exports = exported || function isWeakMap(x) {
	if (!x || typeof x !== 'object') {
		return false;
	}
	try {
		$mapHas.call(x, $mapHas);
		if ($setHas) {
			try {
				$setHas.call(x, $setHas);
			} catch (e) {
				return true;
			}
		}
		return x instanceof $WeakMap; // core-js workaround, pre-v3
	} catch (e) {}
	return false;
};

},{}],41:[function(require,module,exports){
'use strict';

var $WeakMap = typeof WeakMap === 'function' && WeakMap.prototype ? WeakMap : null;
var $WeakSet = typeof WeakSet === 'function' && WeakSet.prototype ? WeakSet : null;

var exported;

if (!$WeakMap) {
	// eslint-disable-next-line no-unused-vars
	exported = function isWeakSet(x) {
		// `WeakSet` is not present in this environment.
		return false;
	};
}

var $mapHas = $WeakMap ? $WeakMap.prototype.has : null;
var $setHas = $WeakSet ? $WeakSet.prototype.has : null;
if (!exported && !$setHas) {
	// eslint-disable-next-line no-unused-vars
	module.exports = function isWeakSet(x) {
		// `WeakSet` does not have a `has` method
		return false;
	};
}

module.exports = exported || function isWeakSet(x) {
	if (!x || typeof x !== 'object') {
		return false;
	}
	try {
		$setHas.call(x, $setHas);
		if ($mapHas) {
			try {
				$mapHas.call(x, $mapHas);
			} catch (e) {
				return true;
			}
		}
		return x instanceof $WeakSet; // core-js workaround, pre-v3
	} catch (e) {}
	return false;
};

},{}],42:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],43:[function(require,module,exports){
/* @preserve
 * JSONPatch.js
 *
 * A Dharmafly project written by Thomas Parslow
 * <tom@almostobsolete.net> and released with the kind permission of
 * NetDev.
 *
 * Copyright 2011-2013 Thomas Parslow. All rights reserved.
 * Permission is hereby granted,y free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 * Implements the JSON Patch IETF RFC 6902 as specified at:
 *
 *   http://tools.ietf.org/html/rfc6902
 *
 * Also implements the JSON Pointer IETF RFC 6901 as specified at:
 *
 *   http://tools.ietf.org/html/rfc6901
 *
 */

(function (root, factory) {
    if (typeof exports === 'object') {
        // Node
        factory(module.exports);
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports'], factory);
    } else {
        // Browser globals (root is window)
        root.jsonpatch = {};
        root.returnExports = factory(root.jsonpatch);
  }
}(this, function (exports) {
  var apply_patch, JSONPatch, JSONPointer,_operationRequired,isArray;

  // Taken from underscore.js
  isArray = Array.isArray || function(obj) {
    return Object.prototype.toString.call(obj) == '[object Array]';
  };

  /* Public: Shortcut to apply a patch the document without having to
   * create a patch object first. Returns the patched document. Does
   * not damage the original document, but will reuse parts of its
   * structure in the new one.
   *
   * doc - The target document to which the patch should be applied.
   * patch - A JSON Patch document specifying the changes to the
   *         target documentment
   *
   * Example (node.js)
   *
   *    jsonpatch = require('jsonpatch');
   *    doc = JSON.parse(sourceJSON);
   *    doc = jsonpatch.apply_patch(doc, thepatch);
   *    destJSON = JSON.stringify(doc);
   *
   * Example (in browser)
   *
   *     <script src="jsonpatch.js" type="text/javascript"></script>
   *     <script type="application/javascript">
   *      doc = JSON.parse(sourceJSON);
   *      doc = jsonpatch.apply_patch(doc, thepatch);
   *      destJSON = JSON.stringify(doc);
   *     </script>
   *
   * Returns the patched document
   */
  exports.apply_patch = apply_patch = function (doc, patch) {
    return (new JSONPatch(patch)).apply(doc);
  };

  /* Public: Error thrown if the patch supplied is invalid.
   */
  function InvalidPatch(message) {
    Error.call(this, message); this.message = message;
  }
  exports.InvalidPatch = InvalidPatch;
  InvalidPatch.prototype = new Error();
  /* Public: Error thrown if the patch can not be apllied to the given document
   */
  function PatchApplyError(message) {
    Error.call(this, message); this.message = message;
  }
  exports.PatchApplyError = PatchApplyError;
  PatchApplyError.prototype = new Error();

  /* Public: A class representing a JSON Pointer. A JSON Pointer is
   * used to point to a specific sub-item within a JSON document.
   *
   * Example (node.js);
   *
   *     jsonpatch = require('jsonpatch');
   *     var pointer = new jsonpatch.JSONPointer('/path/to/item');
   *     var item = pointer.follow(doc)
   *
   */
  exports.JSONPointer = JSONPointer = function JSONPointer (pathStr) {
    var i,split,path=[];
    // Split up the path
    split = pathStr.split('/');
    if ('' !== split[0]) {
      throw new InvalidPatch('JSONPointer must start with a slash (or be an empty string)!');
    }
    for (i = 1; i < split.length; i++) {
      path[i-1] = split[i].replace(/~1/g,'/').replace(/~0/g,'~');
    }
    this.path = path;
    this.length = path.length;
  };

  /* Private: Get a segment of the pointer given a current doc
   * context.
   */
  JSONPointer.prototype._get_segment = function (index, node) {
    var segment = this.path[index];
    if(isArray(node)) {
      if ('-' === segment) {
        segment = node.length;
      } else {
        // Must be a non-negative integer in base-10
        if (!segment.match(/^[0-9]*$/)) {
          throw new PatchApplyError('Expected a number to segment an array');
        }
        segment = parseInt(segment,10);
      }
    }
    return segment;
  };

  // Return a shallow copy of an object
  function clone(o) {
    var cloned, key;
    if (isArray(o)) {
      return o.slice();
    // typeof null is "object", but we want to copy it as null
    } if (o === null) {
      return o;
    } else if (typeof o === "object") {
      cloned = {};
      for(key in o) {
        if (Object.hasOwnProperty.call(o, key)) {
          cloned[key] = o[key];
        }
      }
      return cloned;
    } else {
      return o;
    }
  }

  /* Private: Follow the pointer to its penultimate segment then call
   * the handler with the current doc and the last key (converted to
   * an int if the current doc is an array). The handler is expected to
   * return a new copy of the penultimate part.
   *
   * doc - The document to search within
   * handler - The callback function to handle the last part
   *
   * Returns the result of calling the handler
   */
  JSONPointer.prototype._action = function (doc, handler, mutate) {
    var that = this;
    function follow_pointer(node, index) {
      var segment, subnode;
      if (!mutate) {
        node = clone(node);
      }
      segment = that._get_segment(index, node);
      // Is this the last segment?
      if (index == that.path.length-1) {
        node = handler(node, segment);
      } else {
        // Make sure we can follow the segment
        if (isArray(node)) {
          if (node.length <= segment) {
            throw new PatchApplyError('Path not found in document');
          }
        } else if (typeof node === "object") {
          if (!Object.hasOwnProperty.call(node, segment)) {
            throw new PatchApplyError('Path not found in document');
          }
        } else {
          throw new PatchApplyError('Path not found in document');
        }
        subnode = follow_pointer(node[segment], index+1);
        if (!mutate) {
          node[segment] = subnode;
        }
      }
      return node;
    }
    return follow_pointer(doc, 0);
  };

  /* Public: Takes a JSON document and a value and adds the value into
   * the doc at the position pointed to. If the position pointed to is
   * in an array then the existing element at that position (if any)
   * and all that follow it have their position incremented to make
   * room. It is an error to add to a parent object that doesn't exist
   * or to try to replace an existing value in an object.
   *
   * doc - The document to operate against. Will be mutated so should
   * not be reused after the call.
   * value - The value to insert at the position pointed to
   *
   * Examples
   *
   *    var doc = new JSONPointer("/obj/new").add({obj: {old: "hello"}}, "world");
   *    // doc now equals {obj: {old: "hello", new: "world"}}
   *
   * Returns the updated doc (the value passed in may also have been mutated)
   */
  JSONPointer.prototype.add = function (doc, value, mutate) {
    // Special case for a pointer to the root
    if (0 === this.length) {
      return value;
    }
    return this._action(doc, function (node, lastSegment) {
      if (isArray(node)) {
        if (lastSegment > node.length) {
          throw new PatchApplyError('Add operation must not attempt to create a sparse array!');
        }
        node.splice(lastSegment, 0, value);
      } else {
        node[lastSegment] = value;
      }
      return node;
    }, mutate);
  };


  /* Public: Takes a JSON document and removes the value pointed to.
   * It is an error to attempt to remove a value that doesn't exist.
   *
   * doc - The document to operate against. May be mutated so should
   * not be reused after the call.
   *
   * Examples
   *
   *    var doc = new JSONPointer("/obj/old").add({obj: {old: "hello"}});
   *    // doc now equals {obj: {}}
   *
   * Returns the updated doc (the value passed in may also have been mutated)
   */
  JSONPointer.prototype.remove = function (doc, mutate) {
    // Special case for a pointer to the root
    if (0 === this.length) {
      // Removing the root makes the whole value undefined.
      // NOTE: Should it be an error to remove the root if it is
      // ALREADY undefined? I'm not sure...
      return undefined;
    }
    return this._action(doc, function (node, lastSegment) {
        if (!Object.hasOwnProperty.call(node,lastSegment)) {
          throw new PatchApplyError('Remove operation must point to an existing value!');
        }
        if (isArray(node)) {
          node.splice(lastSegment, 1);
        } else {
          delete node[lastSegment];
        }
      return node;
    }, mutate);
  };

  /* Public: Semantically equivalent to a remove followed by an add
   * except when the pointer points to the root element in which case
   * the whole document is replaced.
   *
   * doc - The document to operate against. May be mutated so should
   * not be reused after the call.
   *
   * Examples
   *
   *    var doc = new JSONPointer("/obj/old").replace({obj: {old: "hello"}}, "world");
   *    // doc now equals {obj: {old: "world"}}
   *
   * Returns the updated doc (the value passed in may also have been mutated)
   */
  JSONPointer.prototype.replace = function (doc, value, mutate) {
    // Special case for a pointer to the root
    if (0 === this.length) {
      return value;
    }
    return this._action(doc, function (node, lastSegment) {
        if (!Object.hasOwnProperty.call(node,lastSegment)) {
          throw new PatchApplyError('Replace operation must point to an existing value!');
        }
        if (isArray(node)) {
          node.splice(lastSegment, 1, value);
        } else {
          node[lastSegment] = value;
        }
      return node;
    }, mutate);
  };

  /* Public: Returns the value pointed to by the pointer in the given doc.
   *
   * doc - The document to operate against.
   *
   * Examples
   *
   *    var value = new JSONPointer("/obj/value").get({obj: {value: "hello"}});
   *    // value now equals 'hello'
   *
   * Returns the value
   */
  JSONPointer.prototype.get = function (doc) {
    var value;
    if (0 === this.length) {
      return doc;
    }
    this._action(doc, function (node, lastSegment) {
      if (!Object.hasOwnProperty.call(node,lastSegment)) {
        throw new PatchApplyError('Path not found in document');
      }
      value = node[lastSegment];
      return node;
    }, true);
    return value;
  };


  /* Public: returns true if this pointer points to a child of the
   * other pointer given. Returns true if both point to the same place.
   *
   * otherPointer - Another JSONPointer object
   *
   * Examples
   *
   *    var pointer1 = new JSONPointer('/animals/mammals/cats/holly');
   *    var pointer2 = new JSONPointer('/animals/mammals/cats');
   *    var isChild = pointer1.subsetOf(pointer2);
   *
   * Returns a boolean
   */
  JSONPointer.prototype.subsetOf = function (otherPointer) {
    if (this.length <= otherPointer.length) {
      return false;
    }
    for (var i = 0; i < otherPointer.length; i++) {
      if (otherPointer.path[i] !== this.path[i]) {
        return false;
      }
    }
    return true;
  };

  _operationRequired = {
    add: ['value'],
    replace: ['value'],
    test: ['value'],
    remove: [],
    move: ['from'],
    copy: ['from']
  };

  // Check if a is deep equal to b (by the rules given in the
  // JSONPatch spec)
  function deepEqual(a,b) {
    var key;
    if (a === b) {
      return true;
    } else if (typeof a !== typeof b) {
      return false;
    } else if ('object' === typeof(a)) {
      var aIsArray = isArray(a),
          bIsArray = isArray(b);
      if (aIsArray !== bIsArray) {
        return false;
      } else if (aIsArray) {
        // Both are arrays
        if (a.length != b.length) {
          return false;
        } else {
          for (var i = 0; i < a.length; i++) {
            return deepEqual(a[i], b[i]);
          }
        }
      } else {
        // Check each key of the object recursively
        for(key in a) {
          if (Object.hasOwnProperty(a, key)) {
            if (!(Object.hasOwnProperty(b,key) && deepEqual(a[key], b[key]))) {
              return false;
            }
          }
        }
        for(key in b) {
          if(Object.hasOwnProperty(b,key) && !Object.hasOwnProperty(a, key)) {
            return false;
          }
        }
        return true;
      }
    } else {
      return false;
    }
  }

  function validateOp(operation) {
    var i, required;
    if (!operation.op) {
      throw new InvalidPatch('Operation missing!');
    }
    if (!_operationRequired.hasOwnProperty(operation.op)) {
      throw new InvalidPatch('Invalid operation!');
    }
    if (!('path' in operation)) {
      throw new InvalidPatch('Path missing!');
    }

    required = _operationRequired[operation.op];

    // Check that all required keys are present
    for(i = 0; i < required.length; i++) {
      if(!(required[i] in operation)) {
        throw new InvalidPatch(operation.op + ' must have key ' + required[i]);
      }
    }
  }

  function compileOperation(operation, mutate) {
    validateOp(operation);
    var op = operation.op;
    var path = new JSONPointer(operation.path);
    var value = operation.value;
    var from = operation.from ? new JSONPointer(operation.from) : null;

    switch (op) {
    case 'add':
      return function (doc) {
        return path.add(doc, value, mutate);
      };
    case 'remove':
      return function (doc) {
        return path.remove(doc, mutate);
      };
    case 'replace':
      return function (doc) {
        return path.replace(doc, value, mutate);
      };
    case 'move':
      // Check that destination isn't inside the source
      if (path.subsetOf(from)) {
        throw new InvalidPatch('destination must not be a child of source');
      }
      return function (doc) {
        var value = from.get(doc);
        var intermediate = from.remove(doc, mutate);
        return path.add(intermediate, value, mutate);
      };
    case 'copy':
      return function (doc) {
        var value = from.get(doc);
        return path.add(doc, value, mutate);
      };
    case 'test':
      return function (doc) {
        if (!deepEqual(path.get(doc), value)) {
          throw new PatchApplyError("Test operation failed. Value did not match.");
        }
        return doc;
      };
    }
  }

  /* Public: A class representing a patch.
   *
   *  patch - The patch as an array or as a JSON string (containing an
   *          array)
   *  mutate - Indicates that input documents should be mutated
   *           (default is for the input to be unaffected.) This will
   *           not work correctly if the patch replaces the root of
   *           the document.
   */
  exports.JSONPatch = JSONPatch = function JSONPatch(patch, mutate) {
    this._compile(patch, mutate);
  };

  JSONPatch.prototype._compile = function (patch, mutate) {
    var i, _this = this;
    this.compiledOps = [];

    if ('string' === typeof patch) {
      patch = JSON.parse(patch);
    }
    if(!isArray(patch)) {
      throw new InvalidPatch('Patch must be an array of operations');
    }
    for(i = 0; i < patch.length; i++) {
      var compiled = compileOperation(patch[i], mutate);
      _this.compiledOps.push(compiled);
    }
  };

  /* Public: Apply the patch to a document and returns the patched
   * document.
   *
   * doc - The document to which the patch should be applied.
   *
   * Returns the patched document
   */
  exports.JSONPatch.prototype.apply = function (doc) {
    var i;
    for(i = 0; i < this.compiledOps.length; i++) {
      doc = this.compiledOps[i](doc);
    }
    return doc;
  };

}));

},{}],44:[function(require,module,exports){
var toString = Object.prototype.toString;

module.exports = function kindOf(val) {
  if (val === void 0) return 'undefined';
  if (val === null) return 'null';

  var type = typeof val;
  if (type === 'boolean') return 'boolean';
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'symbol') return 'symbol';
  if (type === 'function') {
    return isGeneratorFn(val) ? 'generatorfunction' : 'function';
  }

  if (isArray(val)) return 'array';
  if (isBuffer(val)) return 'buffer';
  if (isArguments(val)) return 'arguments';
  if (isDate(val)) return 'date';
  if (isError(val)) return 'error';
  if (isRegexp(val)) return 'regexp';

  switch (ctorName(val)) {
    case 'Symbol': return 'symbol';
    case 'Promise': return 'promise';

    // Set, Map, WeakSet, WeakMap
    case 'WeakMap': return 'weakmap';
    case 'WeakSet': return 'weakset';
    case 'Map': return 'map';
    case 'Set': return 'set';

    // 8-bit typed arrays
    case 'Int8Array': return 'int8array';
    case 'Uint8Array': return 'uint8array';
    case 'Uint8ClampedArray': return 'uint8clampedarray';

    // 16-bit typed arrays
    case 'Int16Array': return 'int16array';
    case 'Uint16Array': return 'uint16array';

    // 32-bit typed arrays
    case 'Int32Array': return 'int32array';
    case 'Uint32Array': return 'uint32array';
    case 'Float32Array': return 'float32array';
    case 'Float64Array': return 'float64array';
  }

  if (isGeneratorObj(val)) {
    return 'generator';
  }

  // Non-plain objects
  type = toString.call(val);
  switch (type) {
    case '[object Object]': return 'object';
    // iterators
    case '[object Map Iterator]': return 'mapiterator';
    case '[object Set Iterator]': return 'setiterator';
    case '[object String Iterator]': return 'stringiterator';
    case '[object Array Iterator]': return 'arrayiterator';
  }

  // other
  return type.slice(8, -1).toLowerCase().replace(/\s/g, '');
};

function ctorName(val) {
  return typeof val.constructor === 'function' ? val.constructor.name : null;
}

function isArray(val) {
  if (Array.isArray) return Array.isArray(val);
  return val instanceof Array;
}

function isError(val) {
  return val instanceof Error || (typeof val.message === 'string' && val.constructor && typeof val.constructor.stackTraceLimit === 'number');
}

function isDate(val) {
  if (val instanceof Date) return true;
  return typeof val.toDateString === 'function'
    && typeof val.getDate === 'function'
    && typeof val.setDate === 'function';
}

function isRegexp(val) {
  if (val instanceof RegExp) return true;
  return typeof val.flags === 'string'
    && typeof val.ignoreCase === 'boolean'
    && typeof val.multiline === 'boolean'
    && typeof val.global === 'boolean';
}

function isGeneratorFn(name, val) {
  return ctorName(name) === 'GeneratorFunction';
}

function isGeneratorObj(val) {
  return typeof val.throw === 'function'
    && typeof val.return === 'function'
    && typeof val.next === 'function';
}

function isArguments(val) {
  try {
    if (typeof val.length === 'number' && typeof val.callee === 'function') {
      return true;
    }
  } catch (err) {
    if (err.message.indexOf('callee') !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * If you need to support Safari 5-7 (8-10 yr-old browser),
 * take a look at https://github.com/feross/is-buffer
 */

function isBuffer(val) {
  if (val.constructor && typeof val.constructor.isBuffer === 'function') {
    return val.constructor.isBuffer(val);
  }
  return false;
}

},{}],45:[function(require,module,exports){
'use strict';

function ToObject(val) {
	if (val == null) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var keys;
	var to = ToObject(target);

	for (var s = 1; s < arguments.length; s++) {
		from = arguments[s];
		keys = Object.keys(Object(from));

		for (var i = 0; i < keys.length; i++) {
			to[keys[i]] = from[keys[i]];
		}
	}

	return to;
};

},{}],46:[function(require,module,exports){
var hasMap = typeof Map === 'function' && Map.prototype;
var mapSizeDescriptor = Object.getOwnPropertyDescriptor && hasMap ? Object.getOwnPropertyDescriptor(Map.prototype, 'size') : null;
var mapSize = hasMap && mapSizeDescriptor && typeof mapSizeDescriptor.get === 'function' ? mapSizeDescriptor.get : null;
var mapForEach = hasMap && Map.prototype.forEach;
var hasSet = typeof Set === 'function' && Set.prototype;
var setSizeDescriptor = Object.getOwnPropertyDescriptor && hasSet ? Object.getOwnPropertyDescriptor(Set.prototype, 'size') : null;
var setSize = hasSet && setSizeDescriptor && typeof setSizeDescriptor.get === 'function' ? setSizeDescriptor.get : null;
var setForEach = hasSet && Set.prototype.forEach;
var hasWeakMap = typeof WeakMap === 'function' && WeakMap.prototype;
var weakMapHas = hasWeakMap ? WeakMap.prototype.has : null;
var hasWeakSet = typeof WeakSet === 'function' && WeakSet.prototype;
var weakSetHas = hasWeakSet ? WeakSet.prototype.has : null;
var booleanValueOf = Boolean.prototype.valueOf;
var objectToString = Object.prototype.toString;
var match = String.prototype.match;
var bigIntValueOf = typeof BigInt === 'function' ? BigInt.prototype.valueOf : null;

var inspectCustom = require('./util.inspect').custom;
var inspectSymbol = inspectCustom && isSymbol(inspectCustom) ? inspectCustom : null;

module.exports = function inspect_(obj, options, depth, seen) {
    var opts = options || {};

    if (has(opts, 'quoteStyle') && (opts.quoteStyle !== 'single' && opts.quoteStyle !== 'double')) {
        throw new TypeError('option "quoteStyle" must be "single" or "double"');
    }

    if (typeof obj === 'undefined') {
        return 'undefined';
    }
    if (obj === null) {
        return 'null';
    }
    if (typeof obj === 'boolean') {
        return obj ? 'true' : 'false';
    }

    if (typeof obj === 'string') {
        return inspectString(obj, opts);
    }
    if (typeof obj === 'number') {
        if (obj === 0) {
            return Infinity / obj > 0 ? '0' : '-0';
        }
        return String(obj);
    }
    if (typeof obj === 'bigint') { // eslint-disable-line valid-typeof
        return String(obj) + 'n';
    }

    var maxDepth = typeof opts.depth === 'undefined' ? 5 : opts.depth;
    if (typeof depth === 'undefined') { depth = 0; }
    if (depth >= maxDepth && maxDepth > 0 && typeof obj === 'object') {
        return '[Object]';
    }

    if (typeof seen === 'undefined') {
        seen = [];
    } else if (indexOf(seen, obj) >= 0) {
        return '[Circular]';
    }

    function inspect(value, from) {
        if (from) {
            seen = seen.slice();
            seen.push(from);
        }
        return inspect_(value, opts, depth + 1, seen);
    }

    if (typeof obj === 'function') {
        var name = nameOf(obj);
        return '[Function' + (name ? ': ' + name : '') + ']';
    }
    if (isSymbol(obj)) {
        var symString = Symbol.prototype.toString.call(obj);
        return typeof obj === 'object' ? markBoxed(symString) : symString;
    }
    if (isElement(obj)) {
        var s = '<' + String(obj.nodeName).toLowerCase();
        var attrs = obj.attributes || [];
        for (var i = 0; i < attrs.length; i++) {
            s += ' ' + attrs[i].name + '=' + wrapQuotes(quote(attrs[i].value), 'double', opts);
        }
        s += '>';
        if (obj.childNodes && obj.childNodes.length) { s += '...'; }
        s += '</' + String(obj.nodeName).toLowerCase() + '>';
        return s;
    }
    if (isArray(obj)) {
        if (obj.length === 0) { return '[]'; }
        return '[ ' + arrObjKeys(obj, inspect).join(', ') + ' ]';
    }
    if (isError(obj)) {
        var parts = arrObjKeys(obj, inspect);
        if (parts.length === 0) { return '[' + String(obj) + ']'; }
        return '{ [' + String(obj) + '] ' + parts.join(', ') + ' }';
    }
    if (typeof obj === 'object') {
        if (inspectSymbol && typeof obj[inspectSymbol] === 'function') {
            return obj[inspectSymbol]();
        } else if (typeof obj.inspect === 'function') {
            return obj.inspect();
        }
    }
    if (isMap(obj)) {
        var mapParts = [];
        mapForEach.call(obj, function (value, key) {
            mapParts.push(inspect(key, obj) + ' => ' + inspect(value, obj));
        });
        return collectionOf('Map', mapSize.call(obj), mapParts);
    }
    if (isSet(obj)) {
        var setParts = [];
        setForEach.call(obj, function (value) {
            setParts.push(inspect(value, obj));
        });
        return collectionOf('Set', setSize.call(obj), setParts);
    }
    if (isWeakMap(obj)) {
        return weakCollectionOf('WeakMap');
    }
    if (isWeakSet(obj)) {
        return weakCollectionOf('WeakSet');
    }
    if (isNumber(obj)) {
        return markBoxed(inspect(Number(obj)));
    }
    if (isBigInt(obj)) {
        return markBoxed(inspect(bigIntValueOf.call(obj)));
    }
    if (isBoolean(obj)) {
        return markBoxed(booleanValueOf.call(obj));
    }
    if (isString(obj)) {
        return markBoxed(inspect(String(obj)));
    }
    if (!isDate(obj) && !isRegExp(obj)) {
        var xs = arrObjKeys(obj, inspect);
        if (xs.length === 0) { return '{}'; }
        return '{ ' + xs.join(', ') + ' }';
    }
    return String(obj);
};

function wrapQuotes(s, defaultStyle, opts) {
    var quoteChar = (opts.quoteStyle || defaultStyle) === 'double' ? '"' : "'";
    return quoteChar + s + quoteChar;
}

function quote(s) {
    return String(s).replace(/"/g, '&quot;');
}

function isArray(obj) { return toStr(obj) === '[object Array]'; }
function isDate(obj) { return toStr(obj) === '[object Date]'; }
function isRegExp(obj) { return toStr(obj) === '[object RegExp]'; }
function isError(obj) { return toStr(obj) === '[object Error]'; }
function isSymbol(obj) { return toStr(obj) === '[object Symbol]'; }
function isString(obj) { return toStr(obj) === '[object String]'; }
function isNumber(obj) { return toStr(obj) === '[object Number]'; }
function isBigInt(obj) { return toStr(obj) === '[object BigInt]'; }
function isBoolean(obj) { return toStr(obj) === '[object Boolean]'; }

var hasOwn = Object.prototype.hasOwnProperty || function (key) { return key in this; };
function has(obj, key) {
    return hasOwn.call(obj, key);
}

function toStr(obj) {
    return objectToString.call(obj);
}

function nameOf(f) {
    if (f.name) { return f.name; }
    var m = match.call(f, /^function\s*([\w$]+)/);
    if (m) { return m[1]; }
    return null;
}

function indexOf(xs, x) {
    if (xs.indexOf) { return xs.indexOf(x); }
    for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) { return i; }
    }
    return -1;
}

function isMap(x) {
    if (!mapSize || !x || typeof x !== 'object') {
        return false;
    }
    try {
        mapSize.call(x);
        try {
            setSize.call(x);
        } catch (s) {
            return true;
        }
        return x instanceof Map; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakMap(x) {
    if (!weakMapHas || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakMapHas.call(x, weakMapHas);
        try {
            weakSetHas.call(x, weakSetHas);
        } catch (s) {
            return true;
        }
        return x instanceof WeakMap; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isSet(x) {
    if (!setSize || !x || typeof x !== 'object') {
        return false;
    }
    try {
        setSize.call(x);
        try {
            mapSize.call(x);
        } catch (m) {
            return true;
        }
        return x instanceof Set; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakSet(x) {
    if (!weakSetHas || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakSetHas.call(x, weakSetHas);
        try {
            weakMapHas.call(x, weakMapHas);
        } catch (s) {
            return true;
        }
        return x instanceof WeakSet; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isElement(x) {
    if (!x || typeof x !== 'object') { return false; }
    if (typeof HTMLElement !== 'undefined' && x instanceof HTMLElement) {
        return true;
    }
    return typeof x.nodeName === 'string' && typeof x.getAttribute === 'function';
}

function inspectString(str, opts) {
    // eslint-disable-next-line no-control-regex
    var s = str.replace(/(['\\])/g, '\\$1').replace(/[\x00-\x1f]/g, lowbyte);
    return wrapQuotes(s, 'single', opts);
}

function lowbyte(c) {
    var n = c.charCodeAt(0);
    var x = {
        8: 'b', 9: 't', 10: 'n', 12: 'f', 13: 'r'
    }[n];
    if (x) { return '\\' + x; }
    return '\\x' + (n < 0x10 ? '0' : '') + n.toString(16);
}

function markBoxed(str) {
    return 'Object(' + str + ')';
}

function weakCollectionOf(type) {
    return type + ' { ? }';
}

function collectionOf(type, size, entries) {
    return type + ' (' + size + ') {' + entries.join(', ') + '}';
}

function arrObjKeys(obj, inspect) {
    var isArr = isArray(obj);
    var xs = [];
    if (isArr) {
        xs.length = obj.length;
        for (var i = 0; i < obj.length; i++) {
            xs[i] = has(obj, i) ? inspect(obj[i], obj) : '';
        }
    }
    for (var key in obj) { // eslint-disable-line no-restricted-syntax
        if (!has(obj, key)) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
        if (isArr && String(Number(key)) === key && key < obj.length) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
        if ((/[^\w$]/).test(key)) {
            xs.push(inspect(key, obj) + ': ' + inspect(obj[key], obj));
        } else {
            xs.push(key + ': ' + inspect(obj[key], obj));
        }
    }
    return xs;
}

},{"./util.inspect":2}],47:[function(require,module,exports){
'use strict';

// http://www.ecma-international.org/ecma-262/6.0/#sec-object.is

var numberIsNaN = function (value) {
	return value !== value;
};

module.exports = function is(a, b) {
	if (a === 0 && b === 0) {
		return 1 / a === 1 / b;
	}
	if (a === b) {
		return true;
	}
	if (numberIsNaN(a) && numberIsNaN(b)) {
		return true;
	}
	return false;
};


},{}],48:[function(require,module,exports){
'use strict';

var keysShim;
if (!Object.keys) {
	// modified from https://github.com/es-shims/es5-shim
	var has = Object.prototype.hasOwnProperty;
	var toStr = Object.prototype.toString;
	var isArgs = require('./isArguments'); // eslint-disable-line global-require
	var isEnumerable = Object.prototype.propertyIsEnumerable;
	var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
	var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
	var dontEnums = [
		'toString',
		'toLocaleString',
		'valueOf',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'constructor'
	];
	var equalsConstructorPrototype = function (o) {
		var ctor = o.constructor;
		return ctor && ctor.prototype === o;
	};
	var excludedKeys = {
		$applicationCache: true,
		$console: true,
		$external: true,
		$frame: true,
		$frameElement: true,
		$frames: true,
		$innerHeight: true,
		$innerWidth: true,
		$onmozfullscreenchange: true,
		$onmozfullscreenerror: true,
		$outerHeight: true,
		$outerWidth: true,
		$pageXOffset: true,
		$pageYOffset: true,
		$parent: true,
		$scrollLeft: true,
		$scrollTop: true,
		$scrollX: true,
		$scrollY: true,
		$self: true,
		$webkitIndexedDB: true,
		$webkitStorageInfo: true,
		$window: true
	};
	var hasAutomationEqualityBug = (function () {
		/* global window */
		if (typeof window === 'undefined') { return false; }
		for (var k in window) {
			try {
				if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
					try {
						equalsConstructorPrototype(window[k]);
					} catch (e) {
						return true;
					}
				}
			} catch (e) {
				return true;
			}
		}
		return false;
	}());
	var equalsConstructorPrototypeIfNotBuggy = function (o) {
		/* global window */
		if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
			return equalsConstructorPrototype(o);
		}
		try {
			return equalsConstructorPrototype(o);
		} catch (e) {
			return false;
		}
	};

	keysShim = function keys(object) {
		var isObject = object !== null && typeof object === 'object';
		var isFunction = toStr.call(object) === '[object Function]';
		var isArguments = isArgs(object);
		var isString = isObject && toStr.call(object) === '[object String]';
		var theKeys = [];

		if (!isObject && !isFunction && !isArguments) {
			throw new TypeError('Object.keys called on a non-object');
		}

		var skipProto = hasProtoEnumBug && isFunction;
		if (isString && object.length > 0 && !has.call(object, 0)) {
			for (var i = 0; i < object.length; ++i) {
				theKeys.push(String(i));
			}
		}

		if (isArguments && object.length > 0) {
			for (var j = 0; j < object.length; ++j) {
				theKeys.push(String(j));
			}
		} else {
			for (var name in object) {
				if (!(skipProto && name === 'prototype') && has.call(object, name)) {
					theKeys.push(String(name));
				}
			}
		}

		if (hasDontEnumBug) {
			var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

			for (var k = 0; k < dontEnums.length; ++k) {
				if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
					theKeys.push(dontEnums[k]);
				}
			}
		}
		return theKeys;
	};
}
module.exports = keysShim;

},{"./isArguments":50}],49:[function(require,module,exports){
'use strict';

var slice = Array.prototype.slice;
var isArgs = require('./isArguments');

var origKeys = Object.keys;
var keysShim = origKeys ? function keys(o) { return origKeys(o); } : require('./implementation');

var originalKeys = Object.keys;

keysShim.shim = function shimObjectKeys() {
	if (Object.keys) {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			var args = Object.keys(arguments);
			return args && args.length === arguments.length;
		}(1, 2));
		if (!keysWorksWithArguments) {
			Object.keys = function keys(object) { // eslint-disable-line func-name-matching
				if (isArgs(object)) {
					return originalKeys(slice.call(object));
				}
				return originalKeys(object);
			};
		}
	} else {
		Object.keys = keysShim;
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;

},{"./implementation":48,"./isArguments":50}],50:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

},{}],51:[function(require,module,exports){
'use strict';

var $Object = Object;
var $TypeError = TypeError;

module.exports = function flags() {
	if (this != null && this !== $Object(this)) {
		throw new $TypeError('RegExp.prototype.flags getter called on non-object');
	}
	var result = '';
	if (this.global) {
		result += 'g';
	}
	if (this.ignoreCase) {
		result += 'i';
	}
	if (this.multiline) {
		result += 'm';
	}
	if (this.dotAll) {
		result += 's';
	}
	if (this.unicode) {
		result += 'u';
	}
	if (this.sticky) {
		result += 'y';
	}
	return result;
};

},{}],52:[function(require,module,exports){
'use strict';

var define = require('define-properties');
var callBind = require('es-abstract/helpers/callBind');

var implementation = require('./implementation');
var getPolyfill = require('./polyfill');
var shim = require('./shim');

var flagsBound = callBind(implementation);

define(flagsBound, {
	getPolyfill: getPolyfill,
	implementation: implementation,
	shim: shim
});

module.exports = flagsBound;

},{"./implementation":51,"./polyfill":53,"./shim":54,"define-properties":18,"es-abstract/helpers/callBind":21}],53:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

var supportsDescriptors = require('define-properties').supportsDescriptors;
var $gOPD = Object.getOwnPropertyDescriptor;
var $TypeError = TypeError;

module.exports = function getPolyfill() {
	if (!supportsDescriptors) {
		throw new $TypeError('RegExp.prototype.flags requires a true ES5 environment that supports property descriptors');
	}
	if ((/a/mig).flags === 'gim') {
		var descriptor = $gOPD(RegExp.prototype, 'flags');
		if (descriptor && typeof descriptor.get === 'function' && typeof (/a/).dotAll === 'boolean') {
			return descriptor.get;
		}
	}
	return implementation;
};

},{"./implementation":51,"define-properties":18}],54:[function(require,module,exports){
'use strict';

var supportsDescriptors = require('define-properties').supportsDescriptors;
var getPolyfill = require('./polyfill');
var gOPD = Object.getOwnPropertyDescriptor;
var defineProperty = Object.defineProperty;
var TypeErr = TypeError;
var getProto = Object.getPrototypeOf;
var regex = /a/;

module.exports = function shimFlags() {
	if (!supportsDescriptors || !getProto) {
		throw new TypeErr('RegExp.prototype.flags requires a true ES5 environment that supports property descriptors');
	}
	var polyfill = getPolyfill();
	var proto = getProto(regex);
	var descriptor = gOPD(proto, 'flags');
	if (!descriptor || descriptor.get !== polyfill) {
		defineProperty(proto, 'flags', {
			configurable: true,
			enumerable: false,
			get: polyfill
		});
	}
	return polyfill;
};

},{"./polyfill":53,"define-properties":18}],55:[function(require,module,exports){
(function (Buffer){
/*!
 * shallow-clone <https://github.com/jonschlinkert/shallow-clone>
 *
 * Copyright (c) 2015-present, Jon Schlinkert.
 * Released under the MIT License.
 */

'use strict';

const valueOf = Symbol.prototype.valueOf;
const typeOf = require('kind-of');

function clone(val, deep) {
  switch (typeOf(val)) {
    case 'array':
      return val.slice();
    case 'object':
      return Object.assign({}, val);
    case 'date':
      return new val.constructor(Number(val));
    case 'map':
      return new Map(val);
    case 'set':
      return new Set(val);
    case 'buffer':
      return cloneBuffer(val);
    case 'symbol':
      return cloneSymbol(val);
    case 'arraybuffer':
      return cloneArrayBuffer(val);
    case 'float32array':
    case 'float64array':
    case 'int16array':
    case 'int32array':
    case 'int8array':
    case 'uint16array':
    case 'uint32array':
    case 'uint8clampedarray':
    case 'uint8array':
      return cloneTypedArray(val);
    case 'regexp':
      return cloneRegExp(val);
    case 'error':
      return Object.create(val);
    default: {
      return val;
    }
  }
}

function cloneRegExp(val) {
  const flags = val.flags !== void 0 ? val.flags : (/\w+$/.exec(val) || void 0);
  const re = new val.constructor(val.source, flags);
  re.lastIndex = val.lastIndex;
  return re;
}

function cloneArrayBuffer(val) {
  const res = new val.constructor(val.byteLength);
  new Uint8Array(res).set(new Uint8Array(val));
  return res;
}

function cloneTypedArray(val, deep) {
  return new val.constructor(val.buffer, val.byteOffset, val.length);
}

function cloneBuffer(val) {
  const len = val.length;
  const buf = Buffer.allocUnsafe ? Buffer.allocUnsafe(len) : Buffer.from(len);
  val.copy(buf);
  return buf;
}

function cloneSymbol(val) {
  return valueOf ? Object(valueOf.call(val)) : {};
}

/**
 * Expose `clone`
 */

module.exports = clone;

}).call(this,require("buffer").Buffer)

},{"buffer":3,"kind-of":44}],56:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('es-abstract/GetIntrinsic');
var callBound = require('es-abstract/helpers/callBound');
var inspect = require('object-inspect');

var $TypeError = GetIntrinsic('%TypeError%');
var $WeakMap = GetIntrinsic('%WeakMap%', true);
var $Map = GetIntrinsic('%Map%', true);
var $push = callBound('Array.prototype.push');

var $weakMapGet = callBound('WeakMap.prototype.get', true);
var $weakMapSet = callBound('WeakMap.prototype.set', true);
var $weakMapHas = callBound('WeakMap.prototype.has', true);
var $mapGet = callBound('Map.prototype.get', true);
var $mapSet = callBound('Map.prototype.set', true);
var $mapHas = callBound('Map.prototype.has', true);
var objectGet = function (objects, key) { // eslint-disable-line consistent-return
	for (var i = 0; i < objects.length; i += 1) {
		if (objects[i].key === key) {
			return objects[i].value;
		}
	}
};
var objectSet = function (objects, key, value) {
	for (var i = 0; i < objects.length; i += 1) {
		if (objects[i].key === key) {
			objects[i].value = value; // eslint-disable-line no-param-reassign
			return;
		}
	}
	$push(objects, {
		key: key,
		value: value
	});
};
var objectHas = function (objects, key) {
	for (var i = 0; i < objects.length; i += 1) {
		if (objects[i].key === key) {
			return true;
		}
	}
	return false;
};

module.exports = function getSideChannel() {
	var $wm;
	var $m;
	var $o;
	var channel = {
		assert: function (key) {
			if (!channel.has(key)) {
				throw new $TypeError('Side channel does not contain ' + inspect(key));
			}
		},
		get: function (key) { // eslint-disable-line consistent-return
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapGet($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapGet($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					return objectGet($o, key);
				}
			}
		},
		has: function (key) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapHas($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapHas($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					return objectHas($o, key);
				}
			}
			return false;
		},
		set: function (key, value) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if (!$wm) {
					$wm = new $WeakMap();
				}
				$weakMapSet($wm, key, value);
			} else if ($Map) {
				if (!$m) {
					$m = new $Map();
				}
				$mapSet($m, key, value);
			} else {
				if (!$o) {
					$o = [];
				}
				objectSet($o, key, value);
			}
		}
	};
	return channel;
};

},{"es-abstract/GetIntrinsic":20,"es-abstract/helpers/callBound":22,"object-inspect":46}],57:[function(require,module,exports){
'use strict';

var isString = require('is-string');
var isNumber = require('is-number-object');
var isBoolean = require('is-boolean-object');
var isSymbol = require('is-symbol');
var isBigInt = require('is-bigint');

// eslint-disable-next-line consistent-return
module.exports = function whichBoxedPrimitive(value) {
	// eslint-disable-next-line eqeqeq
	if (value == null || (typeof value !== 'object' && typeof value !== 'function')) {
		return null;
	}
	if (isString(value)) {
		return 'String';
	}
	if (isNumber(value)) {
		return 'Number';
	}
	if (isBoolean(value)) {
		return 'Boolean';
	}
	if (isSymbol(value)) {
		return 'Symbol';
	}
	if (isBigInt(value)) {
		return 'BigInt';
	}
};

},{"is-bigint":31,"is-boolean-object":32,"is-number-object":35,"is-string":38,"is-symbol":39}],58:[function(require,module,exports){
'use strict';

var isMap = require('is-map');
var isSet = require('is-set');
var isWeakMap = require('is-weakmap');
var isWeakSet = require('is-weakset');

module.exports = function whichCollection(value) {
	if (value && typeof value === 'object') {
		if (isMap(value)) {
			return 'Map';
		}
		if (isSet(value)) {
			return 'Set';
		}
		if (isWeakMap(value)) {
			return 'WeakMap';
		}
		if (isWeakSet(value)) {
			return 'WeakSet';
		}
	}
	return false;
};

},{"is-map":34,"is-set":37,"is-weakmap":40,"is-weakset":41}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL2NhcnRvL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIkM6L1VzZXJzL2NhcnRvL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9pbmRleC5qcyIsIkM6L1VzZXJzL2NhcnRvL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9lbXB0eS5qcyIsIkM6L1VzZXJzL2NhcnRvL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIkM6L1VzZXJzL2NhcnRvL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJDOi9Vc2Vycy9jYXJ0by9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJDOi9Vc2Vycy9jYXJ0by9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiQzovVXNlcnMvY2FydG8vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIkM6L1VzZXJzL2NhcnRvL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyIsImJyb3dzZXJfZXhhbXBsZS9icm93c2VyZnlfcm9vdC5qcyIsImpvdC9jb3BpZXMuanMiLCJqb3QvZGlmZi5qcyIsImpvdC9pbmRleC5qcyIsImpvdC9saXN0cy5qcyIsImpvdC9vYmplY3RzLmpzIiwiam90L3NlcXVlbmNlcy5qcyIsImpvdC92YWx1ZXMuanMiLCJub2RlX21vZHVsZXMvZGVlcC1lcXVhbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWZpbmUtcHJvcGVydGllcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kaWZmL2Rpc3QvZGlmZi5qcyIsIm5vZGVfbW9kdWxlcy9lcy1hYnN0cmFjdC9HZXRJbnRyaW5zaWMuanMiLCJub2RlX21vZHVsZXMvZXMtYWJzdHJhY3QvaGVscGVycy9jYWxsQmluZC5qcyIsIm5vZGVfbW9kdWxlcy9lcy1hYnN0cmFjdC9oZWxwZXJzL2NhbGxCb3VuZC5qcyIsIm5vZGVfbW9kdWxlcy9lcy1nZXQtaXRlcmF0b3IvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZnVuY3Rpb24tYmluZC9pbXBsZW1lbnRhdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9mdW5jdGlvbi1iaW5kL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dlbmVyaWMtZGlmZi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oYXMtc3ltYm9scy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oYXMtc3ltYm9scy9zaGFtcy5qcyIsIm5vZGVfbW9kdWxlcy9oYXMvc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2lzLWFyZ3VtZW50cy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pcy1iaWdpbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaXMtYm9vbGVhbi1vYmplY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaXMtZGF0ZS1vYmplY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaXMtbWFwL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2lzLW51bWJlci1vYmplY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaXMtcmVnZXgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaXMtc2V0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2lzLXN0cmluZy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pcy1zeW1ib2wvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaXMtd2Vha21hcC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pcy13ZWFrc2V0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvanNvbnBhdGNoL2xpYi9qc29ucGF0Y2guanMiLCJub2RlX21vZHVsZXMva2luZC1vZi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3QtYXNzaWduL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29iamVjdC1pbnNwZWN0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29iamVjdC1pcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pbXBsZW1lbnRhdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pc0FyZ3VtZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9yZWdleHAucHJvdG90eXBlLmZsYWdzL2ltcGxlbWVudGF0aW9uLmpzIiwibm9kZV9tb2R1bGVzL3JlZ2V4cC5wcm90b3R5cGUuZmxhZ3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVnZXhwLnByb3RvdHlwZS5mbGFncy9wb2x5ZmlsbC5qcyIsIm5vZGVfbW9kdWxlcy9yZWdleHAucHJvdG90eXBlLmZsYWdzL3NoaW0uanMiLCJub2RlX21vZHVsZXMvc2hhbGxvdy1jbG9uZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9zaWRlLWNoYW5uZWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2hpY2gtYm94ZWQtcHJpbWl0aXZlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3doaWNoLWNvbGxlY3Rpb24vaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN2d0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxa0JBO0FBQ0E7QUFDQTs7OztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9NQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN0TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25UQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxudmFyIGNvZGUgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLydcbmZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgcmV2TG9va3VwW2NvZGUuY2hhckNvZGVBdChpKV0gPSBpXG59XG5cbi8vIFN1cHBvcnQgZGVjb2RpbmcgVVJMLXNhZmUgYmFzZTY0IHN0cmluZ3MsIGFzIE5vZGUuanMgZG9lcy5cbi8vIFNlZTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQmFzZTY0I1VSTF9hcHBsaWNhdGlvbnNcbnJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxucmV2TG9va3VwWydfJy5jaGFyQ29kZUF0KDApXSA9IDYzXG5cbmZ1bmN0aW9uIGdldExlbnMgKGI2NCkge1xuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyBUcmltIG9mZiBleHRyYSBieXRlcyBhZnRlciBwbGFjZWhvbGRlciBieXRlcyBhcmUgZm91bmRcbiAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYmVhdGdhbW1pdC9iYXNlNjQtanMvaXNzdWVzLzQyXG4gIHZhciB2YWxpZExlbiA9IGI2NC5pbmRleE9mKCc9JylcbiAgaWYgKHZhbGlkTGVuID09PSAtMSkgdmFsaWRMZW4gPSBsZW5cblxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gdmFsaWRMZW4gPT09IGxlblxuICAgID8gMFxuICAgIDogNCAtICh2YWxpZExlbiAlIDQpXG5cbiAgcmV0dXJuIFt2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuXVxufVxuXG4vLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKGI2NCkge1xuICB2YXIgbGVucyA9IGdldExlbnMoYjY0KVxuICB2YXIgdmFsaWRMZW4gPSBsZW5zWzBdXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSBsZW5zWzFdXG4gIHJldHVybiAoKHZhbGlkTGVuICsgcGxhY2VIb2xkZXJzTGVuKSAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0xlblxufVxuXG5mdW5jdGlvbiBfYnl0ZUxlbmd0aCAoYjY0LCB2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuKSB7XG4gIHJldHVybiAoKHZhbGlkTGVuICsgcGxhY2VIb2xkZXJzTGVuKSAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0xlblxufVxuXG5mdW5jdGlvbiB0b0J5dGVBcnJheSAoYjY0KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbnMgPSBnZXRMZW5zKGI2NClcbiAgdmFyIHZhbGlkTGVuID0gbGVuc1swXVxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gbGVuc1sxXVxuXG4gIHZhciBhcnIgPSBuZXcgQXJyKF9ieXRlTGVuZ3RoKGI2NCwgdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbikpXG5cbiAgdmFyIGN1ckJ5dGUgPSAwXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICB2YXIgbGVuID0gcGxhY2VIb2xkZXJzTGVuID4gMFxuICAgID8gdmFsaWRMZW4gLSA0XG4gICAgOiB2YWxpZExlblxuXG4gIHZhciBpXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxOCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfFxuICAgICAgcmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAzKV1cbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gMTYpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnNMZW4gPT09IDIpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAxKSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gPj4gNiAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID1cbiAgICAgICgodWludDhbaV0gPDwgMTYpICYgMHhGRjAwMDApICtcbiAgICAgICgodWludDhbaSArIDFdIDw8IDgpICYgMHhGRjAwKSArXG4gICAgICAodWludDhbaSArIDJdICYgMHhGRilcbiAgICBvdXRwdXQucHVzaCh0cmlwbGV0VG9CYXNlNjQodG1wKSlcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGZyb21CeXRlQXJyYXkgKHVpbnQ4KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbiA9IHVpbnQ4Lmxlbmd0aFxuICB2YXIgZXh0cmFCeXRlcyA9IGxlbiAlIDMgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayhcbiAgICAgIHVpbnQ4LCBpLCAoaSArIG1heENodW5rTGVuZ3RoKSA+IGxlbjIgPyBsZW4yIDogKGkgKyBtYXhDaHVua0xlbmd0aClcbiAgICApKVxuICB9XG5cbiAgLy8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICBpZiAoZXh0cmFCeXRlcyA9PT0gMSkge1xuICAgIHRtcCA9IHVpbnQ4W2xlbiAtIDFdXG4gICAgcGFydHMucHVzaChcbiAgICAgIGxvb2t1cFt0bXAgPj4gMl0gK1xuICAgICAgbG9va3VwWyh0bXAgPDwgNCkgJiAweDNGXSArXG4gICAgICAnPT0nXG4gICAgKVxuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyB1aW50OFtsZW4gLSAxXVxuICAgIHBhcnRzLnB1c2goXG4gICAgICBsb29rdXBbdG1wID4+IDEwXSArXG4gICAgICBsb29rdXBbKHRtcCA+PiA0KSAmIDB4M0ZdICtcbiAgICAgIGxvb2t1cFsodG1wIDw8IDIpICYgMHgzRl0gK1xuICAgICAgJz0nXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpXG59XG4iLCIiLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG52YXIgY3VzdG9tSW5zcGVjdFN5bWJvbCA9XG4gICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBTeW1ib2wuZm9yID09PSAnZnVuY3Rpb24nKVxuICAgID8gU3ltYm9sLmZvcignbm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b20nKVxuICAgIDogbnVsbFxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5cbnZhciBLX01BWF9MRU5HVEggPSAweDdmZmZmZmZmXG5leHBvcnRzLmtNYXhMZW5ndGggPSBLX01BWF9MRU5HVEhcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgUHJpbnQgd2FybmluZyBhbmQgcmVjb21tZW5kIHVzaW5nIGBidWZmZXJgIHY0Lnggd2hpY2ggaGFzIGFuIE9iamVjdFxuICogICAgICAgICAgICAgICBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogV2UgcmVwb3J0IHRoYXQgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0eXBlZCBhcnJheXMgaWYgdGhlIGFyZSBub3Qgc3ViY2xhc3NhYmxlXG4gKiB1c2luZyBfX3Byb3RvX18uIEZpcmVmb3ggNC0yOSBsYWNrcyBzdXBwb3J0IGZvciBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgXG4gKiAoU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzgpLiBJRSAxMCBsYWNrcyBzdXBwb3J0XG4gKiBmb3IgX19wcm90b19fIGFuZCBoYXMgYSBidWdneSB0eXBlZCBhcnJheSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGNvbnNvbGUuZXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgY29uc29sZS5lcnJvcihcbiAgICAnVGhpcyBicm93c2VyIGxhY2tzIHR5cGVkIGFycmF5IChVaW50OEFycmF5KSBzdXBwb3J0IHdoaWNoIGlzIHJlcXVpcmVkIGJ5ICcgK1xuICAgICdgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LidcbiAgKVxufVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIC8vIENhbiB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZD9cbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICB2YXIgcHJvdG8gPSB7IGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfSB9XG4gICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHByb3RvLCBVaW50OEFycmF5LnByb3RvdHlwZSlcbiAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YoYXJyLCBwcm90bylcbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MlxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdwYXJlbnQnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyXG4gIH1cbn0pXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCAnb2Zmc2V0Jywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0aGlzKSkgcmV0dXJuIHVuZGVmaW5lZFxuICAgIHJldHVybiB0aGlzLmJ5dGVPZmZzZXRcbiAgfVxufSlcblxuZnVuY3Rpb24gY3JlYXRlQnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKGxlbmd0aCA+IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgXCInICsgbGVuZ3RoICsgJ1wiIGlzIGludmFsaWQgZm9yIG9wdGlvbiBcInNpemVcIicpXG4gIH1cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgT2JqZWN0LnNldFByb3RvdHlwZU9mKGJ1ZiwgQnVmZmVyLnByb3RvdHlwZSlcbiAgcmV0dXJuIGJ1ZlxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdUaGUgXCJzdHJpbmdcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLiBSZWNlaXZlZCB0eXBlIG51bWJlcidcbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIGFsbG9jVW5zYWZlKGFyZylcbiAgfVxuICByZXR1cm4gZnJvbShhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbmlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAhPSBudWxsICYmXG4gICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgdmFsdWU6IG51bGwsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmYWxzZVxuICB9KVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuZnVuY3Rpb24gZnJvbSAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0KVxuICB9XG5cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh2YWx1ZSlcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAnICtcbiAgICAgICdvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB2YWx1ZSlcbiAgICApXG4gIH1cblxuICBpZiAoaXNJbnN0YW5jZSh2YWx1ZSwgQXJyYXlCdWZmZXIpIHx8XG4gICAgICAodmFsdWUgJiYgaXNJbnN0YW5jZSh2YWx1ZS5idWZmZXIsIEFycmF5QnVmZmVyKSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBvZiB0eXBlIG51bWJlci4gUmVjZWl2ZWQgdHlwZSBudW1iZXInXG4gICAgKVxuICB9XG5cbiAgdmFyIHZhbHVlT2YgPSB2YWx1ZS52YWx1ZU9mICYmIHZhbHVlLnZhbHVlT2YoKVxuICBpZiAodmFsdWVPZiAhPSBudWxsICYmIHZhbHVlT2YgIT09IHZhbHVlKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlT2YsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIHZhciBiID0gZnJvbU9iamVjdCh2YWx1ZSlcbiAgaWYgKGIpIHJldHVybiBiXG5cbiAgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1ByaW1pdGl2ZSAhPSBudWxsICYmXG4gICAgICB0eXBlb2YgdmFsdWVbU3ltYm9sLnRvUHJpbWl0aXZlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShcbiAgICAgIHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0oJ3N0cmluZycpLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGhcbiAgICApXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICdUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAnICtcbiAgICAnb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJyArICh0eXBlb2YgdmFsdWUpXG4gIClcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbSh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBOb3RlOiBDaGFuZ2UgcHJvdG90eXBlICphZnRlciogQnVmZmVyLmZyb20gaXMgZGVmaW5lZCB0byB3b3JrYXJvdW5kIENocm9tZSBidWc6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzE0OFxuT2JqZWN0LnNldFByb3RvdHlwZU9mKEJ1ZmZlci5wcm90b3R5cGUsIFVpbnQ4QXJyYXkucHJvdG90eXBlKVxuT2JqZWN0LnNldFByb3RvdHlwZU9mKEJ1ZmZlciwgVWludDhBcnJheSlcblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIG51bWJlcicpXG4gIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlIFwiJyArIHNpemUgKyAnXCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwic2l6ZVwiJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2Moc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlIChzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbn1cblxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIEJ1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIFNsb3dCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlU2xvdyA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgfVxuXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcblxuICB2YXIgYWN0dWFsID0gYnVmLndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG5cbiAgaWYgKGFjdHVhbCAhPT0gbGVuZ3RoKSB7XG4gICAgLy8gV3JpdGluZyBhIGhleCBzdHJpbmcsIGZvciBleGFtcGxlLCB0aGF0IGNvbnRhaW5zIGludmFsaWQgY2hhcmFjdGVycyB3aWxsXG4gICAgLy8gY2F1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgZmlyc3QgaW52YWxpZCBjaGFyYWN0ZXIgdG8gYmUgaWdub3JlZC4gKGUuZy5cbiAgICAvLyAnYWJ4eGNkJyB3aWxsIGJlIHRyZWF0ZWQgYXMgJ2FiJylcbiAgICBidWYgPSBidWYuc2xpY2UoMCwgYWN0dWFsKVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlIChhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgYnVmW2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAoYnl0ZU9mZnNldCA8IDAgfHwgYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJvZmZzZXRcIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0ICsgKGxlbmd0aCB8fCAwKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcImxlbmd0aFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICB2YXIgYnVmXG4gIGlmIChieXRlT2Zmc2V0ID09PSB1bmRlZmluZWQgJiYgbGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSlcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBPYmplY3Quc2V0UHJvdG90eXBlT2YoYnVmLCBCdWZmZXIucHJvdG90eXBlKVxuXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAob2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuKVxuXG4gICAgaWYgKGJ1Zi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBidWZcbiAgICB9XG5cbiAgICBvYmouY29weShidWYsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gYnVmXG4gIH1cblxuICBpZiAob2JqLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHR5cGVvZiBvYmoubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hTihvYmoubGVuZ3RoKSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcigwKVxuICAgIH1cbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmopXG4gIH1cblxuICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIEFycmF5LmlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqLmRhdGEpXG4gIH1cbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IEtfTUFYX0xFTkdUSGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsgS19NQVhfTEVOR1RILnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyID09PSB0cnVlICYmXG4gICAgYiAhPT0gQnVmZmVyLnByb3RvdHlwZSAvLyBzbyBCdWZmZXIuaXNCdWZmZXIoQnVmZmVyLnByb3RvdHlwZSkgd2lsbCBiZSBmYWxzZVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKGlzSW5zdGFuY2UoYSwgVWludDhBcnJheSkpIGEgPSBCdWZmZXIuZnJvbShhLCBhLm9mZnNldCwgYS5ieXRlTGVuZ3RoKVxuICBpZiAoaXNJbnN0YW5jZShiLCBVaW50OEFycmF5KSkgYiA9IEJ1ZmZlci5mcm9tKGIsIGIub2Zmc2V0LCBiLmJ5dGVMZW5ndGgpXG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcImJ1ZjFcIiwgXCJidWYyXCIgYXJndW1lbnRzIG11c3QgYmUgb25lIG9mIHR5cGUgQnVmZmVyIG9yIFVpbnQ4QXJyYXknXG4gICAgKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdsYXRpbjEnOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gIH1cblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBidWYgPSBsaXN0W2ldXG4gICAgaWYgKGlzSW5zdGFuY2UoYnVmLCBVaW50OEFycmF5KSkge1xuICAgICAgYnVmID0gQnVmZmVyLmZyb20oYnVmKVxuICAgIH1cbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICAgIH1cbiAgICBidWYuY29weShidWZmZXIsIHBvcylcbiAgICBwb3MgKz0gYnVmLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZmZXJcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nLmxlbmd0aFxuICB9XG4gIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoc3RyaW5nKSB8fCBpc0luc3RhbmNlKHN0cmluZywgQXJyYXlCdWZmZXIpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJzdHJpbmdcIiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBvciBBcnJheUJ1ZmZlci4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgdHlwZW9mIHN0cmluZ1xuICAgIClcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBtdXN0TWF0Y2ggPSAoYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdID09PSB0cnVlKVxuICBpZiAoIW11c3RNYXRjaCAmJiBsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHtcbiAgICAgICAgICByZXR1cm4gbXVzdE1hdGNoID8gLTEgOiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICB9XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhpcyBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIChhbmQgdGhlIGBpcy1idWZmZXJgIG5wbSBwYWNrYWdlKVxuLy8gdG8gZGV0ZWN0IGEgQnVmZmVyIGluc3RhbmNlLiBJdCdzIG5vdCBwb3NzaWJsZSB0byB1c2UgYGluc3RhbmNlb2YgQnVmZmVyYFxuLy8gcmVsaWFibHkgaW4gYSBicm93c2VyaWZ5IGNvbnRleHQgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBkaWZmZXJlbnRcbi8vIGNvcGllcyBvZiB0aGUgJ2J1ZmZlcicgcGFja2FnZSBpbiB1c2UuIFRoaXMgbWV0aG9kIHdvcmtzIGV2ZW4gZm9yIEJ1ZmZlclxuLy8gaW5zdGFuY2VzIHRoYXQgd2VyZSBjcmVhdGVkIGZyb20gYW5vdGhlciBjb3B5IG9mIHRoZSBgYnVmZmVyYCBwYWNrYWdlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTU0XG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuZnVuY3Rpb24gc3dhcCAoYiwgbiwgbSkge1xuICB2YXIgaSA9IGJbbl1cbiAgYltuXSA9IGJbbV1cbiAgYlttXSA9IGlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMTYgPSBmdW5jdGlvbiBzd2FwMTYgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDIgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAxKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDMyID0gZnVuY3Rpb24gc3dhcDMyICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgMilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXA2NCA9IGZ1bmN0aW9uIHN3YXA2NCAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgOCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gOCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDcpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDYpXG4gICAgc3dhcCh0aGlzLCBpICsgMiwgaSArIDUpXG4gICAgc3dhcCh0aGlzLCBpICsgMywgaSArIDQpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvTG9jYWxlU3RyaW5nID0gQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZ1xuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLnJlcGxhY2UoLyguezJ9KS9nLCAnJDEgJykudHJpbSgpXG4gIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cbmlmIChjdXN0b21JbnNwZWN0U3ltYm9sKSB7XG4gIEJ1ZmZlci5wcm90b3R5cGVbY3VzdG9tSW5zcGVjdFN5bWJvbF0gPSBCdWZmZXIucHJvdG90eXBlLmluc3BlY3Rcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAodGFyZ2V0LCBzdGFydCwgZW5kLCB0aGlzU3RhcnQsIHRoaXNFbmQpIHtcbiAgaWYgKGlzSW5zdGFuY2UodGFyZ2V0LCBVaW50OEFycmF5KSkge1xuICAgIHRhcmdldCA9IEJ1ZmZlci5mcm9tKHRhcmdldCwgdGFyZ2V0Lm9mZnNldCwgdGFyZ2V0LmJ5dGVMZW5ndGgpXG4gIH1cbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidGFyZ2V0XCIgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheS4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB0YXJnZXQpXG4gICAgKVxuICB9XG5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSB0YXJnZXQgPyB0YXJnZXQubGVuZ3RoIDogMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNTdGFydCA9IDBcbiAgfVxuICBpZiAodGhpc0VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc0VuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IGVuZCA+IHRhcmdldC5sZW5ndGggfHwgdGhpc1N0YXJ0IDwgMCB8fCB0aGlzRW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCAmJiBzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgc3RhcnQgPj4+PSAwXG4gIGVuZCA+Pj49IDBcbiAgdGhpc1N0YXJ0ID4+Pj0gMFxuICB0aGlzRW5kID4+Pj0gMFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQpIHJldHVybiAwXG5cbiAgdmFyIHggPSB0aGlzRW5kIC0gdGhpc1N0YXJ0XG4gIHZhciB5ID0gZW5kIC0gc3RhcnRcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG5cbiAgdmFyIHRoaXNDb3B5ID0gdGhpcy5zbGljZSh0aGlzU3RhcnQsIHRoaXNFbmQpXG4gIHZhciB0YXJnZXRDb3B5ID0gdGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICh0aGlzQ29weVtpXSAhPT0gdGFyZ2V0Q29weVtpXSkge1xuICAgICAgeCA9IHRoaXNDb3B5W2ldXG4gICAgICB5ID0gdGFyZ2V0Q29weVtpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbi8vIEZpbmRzIGVpdGhlciB0aGUgZmlyc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0ID49IGBieXRlT2Zmc2V0YCxcbi8vIE9SIHRoZSBsYXN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA8PSBgYnl0ZU9mZnNldGAuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gLSBidWZmZXIgLSBhIEJ1ZmZlciB0byBzZWFyY2hcbi8vIC0gdmFsIC0gYSBzdHJpbmcsIEJ1ZmZlciwgb3IgbnVtYmVyXG4vLyAtIGJ5dGVPZmZzZXQgLSBhbiBpbmRleCBpbnRvIGBidWZmZXJgOyB3aWxsIGJlIGNsYW1wZWQgdG8gYW4gaW50MzJcbi8vIC0gZW5jb2RpbmcgLSBhbiBvcHRpb25hbCBlbmNvZGluZywgcmVsZXZhbnQgaXMgdmFsIGlzIGEgc3RyaW5nXG4vLyAtIGRpciAtIHRydWUgZm9yIGluZGV4T2YsIGZhbHNlIGZvciBsYXN0SW5kZXhPZlxuZnVuY3Rpb24gYmlkaXJlY3Rpb25hbEluZGV4T2YgKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIC8vIEVtcHR5IGJ1ZmZlciBtZWFucyBubyBtYXRjaFxuICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXRcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPSArYnl0ZU9mZnNldCAvLyBDb2VyY2UgdG8gTnVtYmVyLlxuICBpZiAobnVtYmVySXNOYU4oYnl0ZU9mZnNldCkpIHtcbiAgICAvLyBieXRlT2Zmc2V0OiBpdCBpdCdzIHVuZGVmaW5lZCwgbnVsbCwgTmFOLCBcImZvb1wiLCBldGMsIHNlYXJjaCB3aG9sZSBidWZmZXJcbiAgICBieXRlT2Zmc2V0ID0gZGlyID8gMCA6IChidWZmZXIubGVuZ3RoIC0gMSlcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0OiBuZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggKyBieXRlT2Zmc2V0XG4gIGlmIChieXRlT2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBpZiAoZGlyKSByZXR1cm4gLTFcbiAgICBlbHNlIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoIC0gMVxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAwKSB7XG4gICAgaWYgKGRpcikgYnl0ZU9mZnNldCA9IDBcbiAgICBlbHNlIHJldHVybiAtMVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIHZhbFxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWwgPSBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICB9XG5cbiAgLy8gRmluYWxseSwgc2VhcmNoIGVpdGhlciBpbmRleE9mIChpZiBkaXIgaXMgdHJ1ZSkgb3IgbGFzdEluZGV4T2ZcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcvYnVmZmVyIGFsd2F5cyBmYWlsc1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDB4RkYgLy8gU2VhcmNoIGZvciBhIGJ5dGUgdmFsdWUgWzAtMjU1XVxuICAgIGlmICh0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRpcikge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCBbdmFsXSwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGRpcikge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpIDwgYXJyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChyZWFkKGFyciwgaSkgPT09IHJlYWQodmFsLCBmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleCkpIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWxMZW5ndGgpIHJldHVybiBmb3VuZEluZGV4ICogaW5kZXhTaXplXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChieXRlT2Zmc2V0ICsgdmFsTGVuZ3RoID4gYXJyTGVuZ3RoKSBieXRlT2Zmc2V0ID0gYXJyTGVuZ3RoIC0gdmFsTGVuZ3RoXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBmb3VuZCA9IHRydWVcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHJlYWQoYXJyLCBpICsgaikgIT09IHJlYWQodmFsLCBqKSkge1xuICAgICAgICAgIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQpIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbiBpbmNsdWRlcyAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gdGhpcy5pbmRleE9mKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpICE9PSAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCB0cnVlKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24gbGFzdEluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKG51bWJlcklzTmFOKHBhcnNlZCkpIHJldHVybiBpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBsYXRpbjFXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoID4+PiAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBsYXRpbjFTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgb3V0ICs9IGhleFNsaWNlTG9va3VwVGFibGVbYnVmW2ldXVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyAoYnl0ZXNbaSArIDFdICogMjU2KSlcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBPYmplY3Quc2V0UHJvdG90eXBlT2YobmV3QnVmLCBCdWZmZXIucHJvdG90eXBlKVxuXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBzaG91bGQgYmUgYSBCdWZmZXInKVxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiB0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuY29weVdpdGhpbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFVzZSBidWlsdC1pbiB3aGVuIGF2YWlsYWJsZSwgbWlzc2luZyBmcm9tIElFMTFcbiAgICB0aGlzLmNvcHlXaXRoaW4odGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpXG4gIH0gZWxzZSBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKHZhciBpID0gbGVuIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmICgoZW5jb2RpbmcgPT09ICd1dGY4JyAmJiBjb2RlIDwgMTI4KSB8fFxuICAgICAgICAgIGVuY29kaW5nID09PSAnbGF0aW4xJykge1xuICAgICAgICAvLyBGYXN0IHBhdGg6IElmIGB2YWxgIGZpdHMgaW50byBhIHNpbmdsZSBieXRlLCB1c2UgdGhhdCBudW1lcmljIHZhbHVlLlxuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgdmFsID0gTnVtYmVyKHZhbClcbiAgfVxuXG4gIC8vIEludmFsaWQgcmFuZ2VzIGFyZSBub3Qgc2V0IHRvIGEgZGVmYXVsdCwgc28gY2FuIHJhbmdlIGNoZWNrIGVhcmx5LlxuICBpZiAoc3RhcnQgPCAwIHx8IHRoaXMubGVuZ3RoIDwgc3RhcnQgfHwgdGhpcy5sZW5ndGggPCBlbmQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignT3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhcnQgPSBzdGFydCA+Pj4gMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCF2YWwpIHZhbCA9IDBcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgICB0aGlzW2ldID0gdmFsXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IEJ1ZmZlci5pc0J1ZmZlcih2YWwpXG4gICAgICA/IHZhbFxuICAgICAgOiBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBpZiAobGVuID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgdmFsdWUgXCInICsgdmFsICtcbiAgICAgICAgJ1wiIGlzIGludmFsaWQgZm9yIGFyZ3VtZW50IFwidmFsdWVcIicpXG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgKytpKSB7XG4gICAgICB0aGlzW2kgKyBzdGFydF0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teKy8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgdGFrZXMgZXF1YWwgc2lnbnMgYXMgZW5kIG9mIHRoZSBCYXNlNjQgZW5jb2RpbmdcbiAgc3RyID0gc3RyLnNwbGl0KCc9JylbMF1cbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0ci50cmltKCkucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSAobGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCkgKyAweDEwMDAwXG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICB9XG5cbiAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuLy8gQXJyYXlCdWZmZXIgb3IgVWludDhBcnJheSBvYmplY3RzIGZyb20gb3RoZXIgY29udGV4dHMgKGkuZS4gaWZyYW1lcykgZG8gbm90IHBhc3Ncbi8vIHRoZSBgaW5zdGFuY2VvZmAgY2hlY2sgYnV0IHRoZXkgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgb2YgdGhhdCB0eXBlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTY2XG5mdW5jdGlvbiBpc0luc3RhbmNlIChvYmosIHR5cGUpIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIHR5cGUgfHxcbiAgICAob2JqICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgIT0gbnVsbCAmJlxuICAgICAgb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09IHR5cGUubmFtZSlcbn1cbmZ1bmN0aW9uIG51bWJlcklzTmFOIChvYmopIHtcbiAgLy8gRm9yIElFMTEgc3VwcG9ydFxuICByZXR1cm4gb2JqICE9PSBvYmogLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcbn1cblxuLy8gQ3JlYXRlIGxvb2t1cCB0YWJsZSBmb3IgYHRvU3RyaW5nKCdoZXgnKWBcbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzIxOVxudmFyIGhleFNsaWNlTG9va3VwVGFibGUgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgYWxwaGFiZXQgPSAnMDEyMzQ1Njc4OWFiY2RlZidcbiAgdmFyIHRhYmxlID0gbmV3IEFycmF5KDI1NilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNjsgKytpKSB7XG4gICAgdmFyIGkxNiA9IGkgKiAxNlxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgMTY7ICsraikge1xuICAgICAgdGFibGVbaTE2ICsgal0gPSBhbHBoYWJldFtpXSArIGFscGhhYmV0W2pdXG4gICAgfVxuICB9XG4gIHJldHVybiB0YWJsZVxufSkoKVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSAoZSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSAobSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICgodmFsdWUgKiBjKSAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiIsIi8vIFRoaXMgaXMgZm9yIGJ1aWxkaW5nIGpvdCBmb3IgdXNlIGluIGJyb3dzZXJzLiBFeHBvc2VcclxuLy8gdGhlIGxpYnJhcnkgaW4gYSBnbG9iYWwgJ2pvdCcgb2JqZWN0LlxyXG5nbG9iYWwuam90ID0gcmVxdWlyZShcIi4uL2pvdFwiKSIsIi8qICBUaGlzIG1vZHVsZSBkZWZpbmVzIG9uZSBvcGVyYXRpb246XHJcblx0XHJcblx0Q09QWShbW3NvdXJjZSwgdGFyZ2V0XSwgLi4uXSlcclxuXHRcclxuXHRDbG9uZXMgdmFsdWVzIGZyb20gc291cmNlIHRvIHRhcmdldCBmb3IgZWFjaCBzb3VyY2UtdGFyZ2V0IHBhaXIuXHJcblx0U291cmNlIGFuZCB0YXJnZXQgYXJlIHN0cmluZ3MgdGhhdCBhcmUgcGF0aHMgaW4gdGhlIEpTT04gZG9jdW1lbnRcclxuXHR0byBhIHZhbHVlIGZvbGxvd2luZyB0aGUgSlNPTlBvaW50ZXIgc3BlY2lmaWNhdGlvbiAoUkZDIDY5MDEpLlxyXG5cdFRoZSBwYXRocyBtdXN0IGV4aXN0IC0tLSBhIGZpbmFsIGRhc2ggaW4gYSBwYXRoIHRvIHJlZmVyIHRvIHRoZVxyXG5cdG5vbmV4aXN0ZW50ZW50IGVsZW1lbnQgYWZ0ZXIgdGhlIGVuZCBvZiBhbiBhcnJheSBpcyBub3QgdmFsaWQuXHJcblx0Ki9cclxuXHRcclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxuXHJcbnZhciBqb3QgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKTtcclxuXHJcbnZhciBKU09OUG9pbnRlciA9IHJlcXVpcmUoJ2pzb25wYXRjaCcpLkpTT05Qb2ludGVyO1xyXG5cclxuZXhwb3J0cy5tb2R1bGVfbmFtZSA9ICdjb3BpZXMnOyAvLyBmb3Igc2VyaWFsaXphdGlvbi9kZXNlcmlhbGl6YXRpb25cclxuXHJcbmV4cG9ydHMuQ09QWSA9IGZ1bmN0aW9uIChwYXRocGFpcnMpIHtcclxuXHRpZiAoIUFycmF5LmlzQXJyYXkocGF0aHBhaXJzKSkgdGhyb3cgbmV3IEVycm9yKFwiYXJndW1lbnQgbXVzdCBiZSBhIGxpc3RcIik7XHJcblx0dGhpcy5wYXRocGFpcnMgPSBwYXRocGFpcnMubWFwKGZ1bmN0aW9uKHBhdGhwYWlyKSB7XHJcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkocGF0aHBhaXIpIHx8IHBhdGhwYWlyLmxlbmd0aCAhPSAyKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJlYWNoIGVsZW1lbnQgaW4gcGF0aHBhaXJzIG11c3QgYmUgYW4gYXJyYXkgb2YgdHdvIHN0cmluZyBlbGVtZW50c1wiKVxyXG5cdFx0aWYgKHBhdGhwYWlyWzBdIGluc3RhbmNlb2YgSlNPTlBvaW50ZXIgJiYgcGF0aHBhaXJbMV0gaW5zdGFuY2VvZiBKU09OUG9pbnRlcikge1xyXG5cdFx0XHQvLyBmb3IgaW50ZXJuYWwgY2FsbHMgb25seVxyXG5cdFx0XHRyZXR1cm4gcGF0aHBhaXI7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRpZiAodHlwZW9mIHBhdGhwYWlyWzBdICE9IFwic3RyaW5nXCIgfHwgdHlwZW9mIHBhdGhwYWlyWzFdICE9IFwic3RyaW5nXCIpXHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiZWFjaCBlbGVtZW50IGluIHBhdGhwYWlycyBtdXN0IGJlIGFuIGFycmF5IG9mIHR3byBzdHJpbmdzXCIpXHJcblx0XHRcdGlmIChwYXRocGFpclswXSA9PSBwYXRocGFpclsxXSlcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJjYW4ndCBjb3B5IGEgcGF0aCB0byBpdHNlbGZcIilcclxuXHRcdFx0cmV0dXJuIFtcclxuXHRcdFx0XHRuZXcgSlNPTlBvaW50ZXIocGF0aHBhaXJbMF0pLFxyXG5cdFx0XHRcdG5ldyBKU09OUG9pbnRlcihwYXRocGFpclsxXSlcclxuXHRcdFx0XVxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cdE9iamVjdC5mcmVlemUodGhpcyk7XHJcbn1cclxuZXhwb3J0cy5DT1BZLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoam90LkJhc2VPcGVyYXRpb24ucHJvdG90eXBlKTsgLy8gaW5oZXJpdFxyXG5qb3QuYWRkX29wKGV4cG9ydHMuQ09QWSwgZXhwb3J0cywgJ0NPUFknKTtcclxuXHJcbmZ1bmN0aW9uIHNlcmlhbGl6ZV9wb2ludGVyKGpwKSB7XHJcbiAgICByZXR1cm4gKGpwLnBhdGgubWFwKGZ1bmN0aW9uKHBhcnQpIHsgcmV0dXJuIFwiL1wiICsgcGFydC5yZXBsYWNlKC9+L2csJ34wJykucmVwbGFjZSgvXFwvL2csJ34xJykgfSlcclxuICAgIFx0LmpvaW4oXCJcIikpO1xyXG59XHJcblxyXG5leHBvcnRzLkNPUFkucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbihkZXB0aCkge1xyXG5cdHJldHVybiB1dGlsLmZvcm1hdChcIjxDT1BZICVzPlwiLCB0aGlzLnBhdGhwYWlycy5tYXAoZnVuY3Rpb24ocGF0aHBhaXIpIHtcclxuXHRcdHJldHVybiBzZXJpYWxpemVfcG9pbnRlcihwYXRocGFpclswXSkgKyBcIiA9PiBcIiArIHNlcmlhbGl6ZV9wb2ludGVyKHBhdGhwYWlyWzFdKTtcclxuXHR9KS5qb2luKFwiLCBcIikpO1xyXG59XHJcblxyXG5leHBvcnRzLkNPUFkucHJvdG90eXBlLnZpc2l0ID0gZnVuY3Rpb24odmlzaXRvcikge1xyXG5cdC8vIEEgc2ltcGxlIHZpc2l0b3IgcGFyYWRpZ20uIFJlcGxhY2UgdGhpcyBvcGVyYXRpb24gaW5zdGFuY2UgaXRzZWxmXHJcblx0Ly8gYW5kIGFueSBvcGVyYXRpb24gd2l0aGluIGl0IHdpdGggdGhlIHZhbHVlIHJldHVybmVkIGJ5IGNhbGxpbmdcclxuXHQvLyB2aXNpdG9yIG9uIGl0c2VsZiwgb3IgaWYgdGhlIHZpc2l0b3IgcmV0dXJucyBhbnl0aGluZyBmYWxzZXlcclxuXHQvLyAocHJvYmFibHkgdW5kZWZpbmVkKSB0aGVuIHJldHVybiB0aGUgb3BlcmF0aW9uIHVuY2hhbmdlZC5cclxuXHRyZXR1cm4gdmlzaXRvcih0aGlzKSB8fCB0aGlzO1xyXG59XHJcblxyXG5leHBvcnRzLkNPUFkucHJvdG90eXBlLmludGVybmFsVG9KU09OID0gZnVuY3Rpb24oanNvbiwgcHJvdG9jb2xfdmVyc2lvbikge1xyXG5cdGpzb24ucGF0aHBhaXJzID0gdGhpcy5wYXRocGFpcnMubWFwKGZ1bmN0aW9uKHBhdGhwYWlyKSB7XHJcblx0XHRyZXR1cm4gW3NlcmlhbGl6ZV9wb2ludGVyKHBhdGhwYWlyWzBdKSwgc2VyaWFsaXplX3BvaW50ZXIocGF0aHBhaXJbMV0pXTtcclxuXHR9KTtcclxufVxyXG5cclxuZXhwb3J0cy5DT1BZLmludGVybmFsRnJvbUpTT04gPSBmdW5jdGlvbihqc29uLCBwcm90b2NvbF92ZXJzaW9uLCBvcF9tYXApIHtcclxuXHRyZXR1cm4gbmV3IGV4cG9ydHMuQ09QWShqc29uLnBhdGhwYWlycyk7XHJcbn1cclxuXHJcbmV4cG9ydHMuQ09QWS5wcm90b3R5cGUuYXBwbHkgPSBmdW5jdGlvbiAoZG9jdW1lbnQpIHtcclxuXHQvKiBBcHBsaWVzIHRoZSBvcGVyYXRpb24gdG8gYSBkb2N1bWVudC4qL1xyXG5cdHRoaXMucGF0aHBhaXJzLmZvckVhY2goZnVuY3Rpb24ocGF0aHBhaXIpIHtcclxuXHRcdHZhciB2YWwgPSBwYXRocGFpclswXS5nZXQoZG9jdW1lbnQpO1xyXG5cdFx0ZG9jdW1lbnQgPSBwYXRocGFpclsxXS5yZXBsYWNlKGRvY3VtZW50LCB2YWwpO1xyXG5cdH0pO1xyXG5cdHJldHVybiBkb2N1bWVudDtcclxufVxyXG5cclxuZXhwb3J0cy5DT1BZLnByb3RvdHlwZS5zaW1wbGlmeSA9IGZ1bmN0aW9uIChhZ2dyZXNzaXZlKSB7XHJcblx0Ly8gU2ltcGxpZmllcyB0aGUgb3BlcmF0aW9uLiBMYXRlciB0YXJnZXRzIGluIHBhdGhwYWlycyBvdmVyd3JpdGVcclxuXHQvLyBlYXJsaWVyIG9uZXMgYXQgdGhlIHNhbWUgbG9jYXRpb24gb3IgYSBkZXNjZW5kYW50IG9mIHRoZVxyXG5cdC8vIGxvY2F0aW9uLlxyXG5cdC8vIFRPRE8uXHJcblx0cmV0dXJuIHRoaXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlX3BhdGgoanAsIGRvY3VtZW50KSB7XHJcblx0dmFyIHBhdGggPSBbXTtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGpwLmxlbmd0aDsgaSsrKSB7XHJcblx0XHR2YXIgcCA9IGpwLnBhdGhbaV07XHJcblx0XHRpZiAoQXJyYXkuaXNBcnJheShkb2N1bWVudCkpXHJcblx0XHRcdHAgPSBwYXJzZUludChwKVxyXG5cdFx0cGF0aC5wdXNoKHApO1xyXG5cdFx0ZG9jdW1lbnQgPSBkb2N1bWVudFtwXTtcclxuXHR9XHJcblx0cmV0dXJuIHBhdGg7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyaWxsZG93bl9vcChqcCwgZG9jdW1lbnQsIG9wKSB7XHJcblx0dmFyIHBhdGggPSBwYXJzZV9wYXRoKGpwLCBkb2N1bWVudCk7XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwYXRoLmxlbmd0aDsgaSsrKVxyXG5cdFx0b3AgPSBvcC5kcmlsbGRvd24ocGF0aFtpXSk7XHJcblx0cmV0dXJuIG9wO1xyXG59XHJcblxyXG5mdW5jdGlvbiB3cmFwX29wX2luX3BhdGgoanAsIGRvY3VtZW50LCBvcCkge1xyXG5cdHZhciBwYXRoID0gcGFyc2VfcGF0aChqcCwgZG9jdW1lbnQpO1xyXG5cdHZhciBpID0gcGF0aC5sZW5ndGgtMTtcclxuXHR3aGlsZSAoaSA+PSAwKSB7XHJcblx0XHRpZiAodHlwZW9mIHBhdGhbaV0gPT0gXCJzdHJpbmdcIilcclxuXHRcdFx0b3AgPSBuZXcgam90LkFQUExZKHBhdGhbaV0sIG9wKVxyXG5cdFx0ZWxzZVxyXG5cdFx0XHRvcCA9IG5ldyBqb3QuQVRJTkRFWChwYXRoW2ldLCBvcClcclxuXHRcdGktLTtcclxuXHR9XHJcblx0cmV0dXJuIG9wO1xyXG59XHJcblxyXG5leHBvcnRzLkNPUFkucHJvdG90eXBlLmludmVyc2UgPSBmdW5jdGlvbiAoZG9jdW1lbnQpIHtcclxuXHQvLyBDcmVhdGUgYSBTRVQgb3BlcmF0aW9uIGZvciBldmVyeSB0YXJnZXQuXHJcblx0cmV0dXJuIG5ldyBqb3QuTElTVCh0aGlzLnBhdGhwYWlycy5tYXAoZnVuY3Rpb24ocGF0aHBhaXIpIHtcclxuXHRcdHJldHVybiB3cmFwX29wX2luX3BhdGgocGF0aHBhaXJbMV0sIGRvY3VtZW50LCBuZXcgam90LlNFVChwYXRocGFpclsxXS5nZXQoZG9jdW1lbnQpKSk7XHJcblx0fSkpXHJcbn1cclxuXHJcbmV4cG9ydHMuQ09QWS5wcm90b3R5cGUuYXRvbWljX2NvbXBvc2UgPSBmdW5jdGlvbiAob3RoZXIpIHtcclxuXHQvLyBSZXR1cm4gYSBzaW5nbGUgQ09QWSB0aGF0IGNvbWJpbmVzIHRoZSBlZmZlY3Qgb2YgdGhpc1xyXG5cdC8vIGFuZCBvdGhlci4gQ29uY2F0ZW5hdGUgdGhlIHBhdGhwYWlycyBsaXN0cywgdGhlblxyXG5cdC8vIHJ1biBzaW1wbGlmeSgpLlxyXG5cdGlmIChvdGhlciBpbnN0YW5jZW9mIGV4cG9ydHMuQ09QWSlcclxuXHRcdHJldHVybiBuZXcgZXhwb3J0cy5DT1BZKHRoaXMucGF0aHBhaXJzLmNvbmNhdChvdGhlci5wYXRocGFpcnMpKS5zaW1wbGlmeSgpO1xyXG59XHJcblxyXG5leHBvcnRzLnJlYmFzZSA9IGZ1bmN0aW9uKGJhc2UsIG9wcywgY29uZmxpY3RsZXNzLCBkZWJ1Zykge1xyXG5cdFxyXG59XHJcblxyXG5leHBvcnRzLkNPUFkucHJvdG90eXBlLmNsb25lX29wZXJhdGlvbiA9IGZ1bmN0aW9uKG9wLCBkb2N1bWVudCkge1xyXG5cdC8vIFJldHVybiBhIGxpc3Qgb2Ygb3BlcmF0aW9ucyB0aGF0IGluY2x1ZGVzIG9wIGFuZFxyXG5cdC8vIGFsc28gZm9yIGFueSB3YXkgdGhhdCBvcCBhZmZlY3RzIGEgY29waWVkIHBhdGgsXHJcblx0Ly8gdGhlbiBhbiBpZGVudGljYWwgb3BlcmF0aW9uIGF0IHRoZSB0YXJnZXQgcGF0aC5cclxuXHR2YXIgcmV0ID0gW29wXTtcclxuXHR0aGlzLnBhdGhwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKHBhdGhwYWlyKSB7XHJcblx0XHR2YXIgc3JjX29wID0gZHJpbGxkb3duX29wKHBhdGhwYWlyWzBdLCBkb2N1bWVudCwgb3ApO1xyXG5cdFx0aWYgKHNyY19vcC5pc05vT3AoKSkgcmV0dXJuO1xyXG5cdFx0cmV0LnB1c2god3JhcF9vcF9pbl9wYXRoKHBhdGhwYWlyWzFdLCBkb2N1bWVudCwgc3JjX29wKSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIG5ldyBqb3QuTElTVChyZXQpLnNpbXBsaWZ5KCk7XHJcbn1cclxuXHJcbmV4cG9ydHMuQ09QWS5wcm90b3R5cGUuZHJpbGxkb3duID0gZnVuY3Rpb24oaW5kZXhfb3Jfa2V5KSB7XHJcblx0Ly8gVGhpcyBtZXRob2QgaXMgc3VwcG9zZWQgdG8gcmV0dXJuIGFuIG9wZXJhdGlvbiB0aGF0XHJcblx0Ly8gaGFzIHRoZSBzYW1lIGVmZmVjdCBhcyB0aGlzIGJ1dCBpcyByZWxhdGl2ZSB0byBpbmRleF9vcl9rZXkuXHJcblx0Ly8gQ2FuIHdlIGRvIHRoYXQ/IElmIGEgdGFyZ2V0IGlzIGF0IG9yIGluIGluZGV4X29yX2tleSxcclxuXHQvLyB0aGVuIHdlIGFmZmVjdCB0aGF0IGxvY2F0aW9uLiBJZiBzb3VyY2UgaXMgYWxzbyBhdCBvclxyXG5cdC8vIGluIGluZGV4X29yX2tleSwgd2UgY2FuIGRyaWxsLWRvd24gYm90aC4gQnV0IGlmIHNvdXJjZVxyXG5cdC8vIGlzIHNvbWV3aGVyZSBlbHNlIGluIHRoZSBkb2N1bWVudCwgd2UgY2FuJ3QgcmVhbGx5IGRvXHJcblx0Ly8gdGhpcy5cclxuXHR0aHJvdyBcImhtbVwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtYWtlX3JhbmRvbV9wYXRoKGRvYykge1xyXG5cdHZhciBwYXRoID0gW107XHJcblx0aWYgKHR5cGVvZiBkb2MgPT09IFwic3RyaW5nXCIgfHwgQXJyYXkuaXNBcnJheShkb2MpKSB7XHJcblx0XHRpZiAoZG9jLmxlbmd0aCA9PSAwKSByZXR1cm4gcGF0aDtcclxuXHRcdHZhciBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBkb2MubGVuZ3RoKTtcclxuXHRcdHBhdGgucHVzaChcIlwiK2lkeCk7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRpZiAoTWF0aC5yYW5kb20oKSA8IC41ICYmIHR5cGVvZiBkb2MgIT09IFwic3RyaW5nXCIpXHJcblx0XHRcdFx0cGF0aCA9IHBhdGguY29uY2F0KG1ha2VfcmFuZG9tX3BhdGgoZG9jW2lkeF0pKTtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Ly8gaWdub3JlIC0gY2FuJ3QgY3JlYXRlIHBhdGggb24gaW5uZXIgdmFsdWVcclxuXHRcdH1cclxuXHR9IGVsc2UgaWYgKHR5cGVvZiBkb2MgPT09IFwib2JqZWN0XCIgJiYgZG9jICE9PSBudWxsKSB7XHJcblx0XHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKGRvYyk7XHJcblx0XHRpZiAoa2V5cy5sZW5ndGggPT0gMCkgcmV0dXJuIHBhdGg7XHJcblx0XHR2YXIga2V5ID0ga2V5c1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBrZXlzLmxlbmd0aCldO1xyXG5cdFx0cGF0aC5wdXNoKGtleSk7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRpZiAoTWF0aC5yYW5kb20oKSA8IC41KVxyXG5cdFx0XHRcdHBhdGggPSBwYXRoLmNvbmNhdChtYWtlX3JhbmRvbV9wYXRoKGRvY1trZXldKSk7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdC8vIGlnbm9yZSAtIGNhbid0IGNyZWF0ZSBwYXRoIG9uIGlubmVyIHZhbHVlXHJcblx0XHR9XHJcblx0fSBlbHNlIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkNPUFkgY2Fubm90IGFwcGx5IHRvIHRoaXMgZG9jdW1lbnQgdHlwZTogXCIgKyBkb2MpO1xyXG5cdH1cclxuXHRyZXR1cm4gcGF0aDtcclxufVxyXG5cclxuZXhwb3J0cy5jcmVhdGVSYW5kb21PcCA9IGZ1bmN0aW9uKGRvYywgY29udGV4dCkge1xyXG5cdC8vIENyZWF0ZSBhIHJhbmRvbSBDT1BZIHRoYXQgY291bGQgYXBwbHkgdG8gZG9jLiBDaG9vc2VcclxuXHQvLyBhIHJhbmRvbSBwYXRoIGZvciBhIHNvdXJjZSBhbmQgYSB0YXJnZXQuXHJcblx0dmFyIHBhdGhwYWlycyA9IFtdO1xyXG5cdHdoaWxlICgxKSB7XHJcblx0XHR2YXIgcHAgPSBbIHNlcmlhbGl6ZV9wb2ludGVyKHsgcGF0aDogbWFrZV9yYW5kb21fcGF0aChkb2MpIH0pLFxyXG5cdFx0ICAgICAgICAgICBzZXJpYWxpemVfcG9pbnRlcih7IHBhdGg6IG1ha2VfcmFuZG9tX3BhdGgoZG9jKSB9KSBdO1xyXG5cdFx0aWYgKHBwWzBdICE9IHBwWzFdKVxyXG5cdFx0XHRwYXRocGFpcnMucHVzaChwcCk7XHJcblx0XHRpZiAoTWF0aC5yYW5kb20oKSA8IC41KVxyXG5cdFx0XHRicmVhaztcclxuXHR9XHJcblx0cmV0dXJuIG5ldyBleHBvcnRzLkNPUFkocGF0aHBhaXJzKTtcclxufVxyXG4iLCIvLyBDb25zdHJ1Y3QgSk9UIG9wZXJhdGlvbnMgYnkgcGVyZm9ybWluZyBhIGRpZmYgb25cclxuLy8gc3RhbmRhcmQgZGF0YSB0eXBlcy5cclxuXHJcbnZhciBkZWVwRXF1YWwgPSByZXF1aXJlKFwiZGVlcC1lcXVhbFwiKTtcclxuXHJcbnZhciBqb3QgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKTtcclxuXHJcbmZ1bmN0aW9uIGRpZmYoYSwgYiwgb3B0aW9ucykge1xyXG5cdC8vIENvbXBhcmVzIHR3byBKU09OLWFibGUgZGF0YSBpbnN0YW5jZXMgYW5kIHJldHVybnNcclxuXHQvLyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZGlmZmVyZW5jZTpcclxuXHQvL1xyXG5cdC8vIHtcclxuXHQvLyAgIG9wOiAgIGEgSk9UIG9wZXJhdGlvbiByZXByZXNlbnRpbmcgdGhlIGNoYW5nZSBmcm9tIGEgdG8gYlxyXG5cdC8vICAgcGN0OiAgYSBudW1iZXIgZnJvbSAwIHRvIDEgcmVwcmVzZW50aW5nIHRoZSBwcm9wb3J0aW9uXHJcblx0Ly8gICAgICAgICBvZiBjb250ZW50IHRoYXQgaXMgZGlmZmVyZW50XHJcblx0Ly8gICBzaXplOiBhbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgYXBwcm94aW1hdGUgc2l6ZSBvZiB0aGVcclxuXHQvLyAgICAgICAgIGNvbnRlbnQgaW4gY2hhcmFjdGVycywgd2hpY2ggaXMgdXNlZCBmb3Igd2VpZ2h0aW5nXHJcblx0Ly8gfVxyXG5cclxuXHJcblx0Ly8gUnVuIHRoZSBkaWZmIG1ldGhvZCBhcHByb3ByaWF0ZSBmb3IgdGhlIHBhaXIgb2YgZGF0YSB0eXBlcy5cclxuXHQvLyBEbyBhIHR5cGUtY2hlY2sgZm9yIHZhbGlkIHR5cGVzIGVhcmx5LCBiZWZvcmUgZGVlcEVxdWFsIGlzIGNhbGxlZC5cclxuXHQvLyBXZSBjYW4ndCBjYWxsIEpTT04uc3RyaW5naWZ5IGJlbG93IGlmIHdlIGdldCBhIG5vbi1KU09OYWJsZVxyXG5cdC8vIGRhdGEgdHlwZS5cclxuXHJcblx0ZnVuY3Rpb24gdHlwZW5hbWUodmFsKSB7XHJcblx0XHRpZiAodHlwZW9mIHZhbCA9PSBcInVuZGVmaW5lZFwiKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbGxlZ2FsIGFyZ3VtZW50OiB1bmRlZmluZWQgcGFzc2VkIHRvIGRpZmZcIik7XHJcblx0XHRpZiAodmFsID09PSBudWxsKVxyXG5cdFx0XHRyZXR1cm4gXCJudWxsXCI7XHJcblx0XHRpZiAodHlwZW9mIHZhbCA9PSBcInN0cmluZ1wiIHx8IHR5cGVvZiB2YWwgPT0gXCJudW1iZXJcIiB8fCB0eXBlb2YgdmFsID09IFwiYm9vbGVhblwiKVxyXG5cdFx0XHRyZXR1cm4gdHlwZW9mIHZhbDtcclxuXHRcdGlmIChBcnJheS5pc0FycmF5KHZhbCkpXHJcblx0XHRcdHJldHVybiBcImFycmF5XCI7XHJcblx0XHRpZiAodHlwZW9mIHZhbCAhPSBcIm9iamVjdFwiKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbGxlZ2FsIGFyZ3VtZW50OiBcIiArIHR5cGVvZiB2YWwgKyBcIiBwYXNzZWQgdG8gZGlmZlwiKTtcclxuXHRcdHJldHVybiBcIm9iamVjdFwiO1xyXG5cdH1cclxuXHJcblx0dmFyIHRhID0gdHlwZW5hbWUoYSk7XHJcblx0dmFyIHRiID0gdHlwZW5hbWUoYik7XHJcblxyXG5cdC8vIFJldHVybiBmYXN0IGlmIHRoZSBvYmplY3RzIGFyZSBlcXVhbC4gVGhpcyBpcyBtdXV1dXVjaFxyXG5cdC8vIGZhc3RlciB0aGFuIGRvaW5nIG91ciBzdHVmZiByZWN1cnNpdmVseS5cclxuXHJcblx0aWYgKGRlZXBFcXVhbChhLCBiLCB7IHN0cmljdDogdHJ1ZSB9KSkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0b3A6IG5ldyBqb3QuTk9fT1AoKSxcclxuXHRcdFx0cGN0OiAwLjAsXHJcblx0XHRcdHNpemU6IEpTT04uc3RyaW5naWZ5KGEpLmxlbmd0aFxyXG5cdFx0fTtcclxuXHR9XHJcblx0XHJcblx0aWYgKHRhID09IFwic3RyaW5nXCIgJiYgdGIgPT0gXCJzdHJpbmdcIilcclxuXHRcdHJldHVybiBkaWZmX3N0cmluZ3MoYSwgYiwgb3B0aW9ucyk7XHJcblxyXG5cdGlmICh0YSA9PSBcImFycmF5XCIgJiYgdGIgPT0gXCJhcnJheVwiKVxyXG5cdFx0cmV0dXJuIGRpZmZfYXJyYXlzKGEsIGIsIG9wdGlvbnMpO1xyXG5cdFxyXG5cdGlmICh0YSA9PSBcIm9iamVjdFwiICYmIHRiID09IFwib2JqZWN0XCIpXHJcblx0XHRyZXR1cm4gZGlmZl9vYmplY3RzKGEsIGIsIG9wdGlvbnMpO1xyXG5cclxuXHQvLyBJZiB0aGUgZGF0YSB0eXBlcyBvZiB0aGUgdHdvIHZhbHVlcyBhcmUgZGlmZmVyZW50LFxyXG5cdC8vIG9yIGlmIHdlIGRvbid0IHJlY29nbml6ZSB0aGUgZGF0YSB0eXBlICh3aGljaCBpc1xyXG5cdC8vIG5vdCBnb29kKSwgdGhlbiBvbmx5IGFuIGF0b21pYyBTRVQgb3BlcmF0aW9uIGlzIHBvc3NpYmxlLlxyXG5cdHJldHVybiB7XHJcblx0XHRvcDogbmV3IGpvdC5TRVQoYiksXHJcblx0XHRwY3Q6IDEuMCxcclxuXHRcdHNpemU6IChKU09OLnN0cmluZ2lmeShhKStKU09OLnN0cmluZ2lmeShiKSkubGVuZ3RoIC8gMlxyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0cy5kaWZmID0gZnVuY3Rpb24oYSwgYiwgb3B0aW9ucykge1xyXG5cdC8vIEVuc3VyZSBvcHRpb25zIGFyZSBkZWZpbmVkLlxyXG5cdG9wdGlvbnMgPSBvcHRpb25zIHx8IHsgfTtcclxuXHJcblx0Ly8gQ2FsbCBkaWZmKCkgYW5kIGp1c3QgcmV0dXJuIHRoZSBvcGVyYXRpb24uXHJcblx0cmV0dXJuIGRpZmYoYSwgYiwgb3B0aW9ucykub3A7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpZmZfc3RyaW5ncyhhLCBiLCBvcHRpb25zKSB7XHJcblx0Ly8gVXNlIHRoZSAnZGlmZicgcGFja2FnZSB0byBjb21wYXJlIHR3byBzdHJpbmdzIGFuZCBjb252ZXJ0XHJcblx0Ly8gdGhlIG91dHB1dCB0byBhIGpvdC5MSVNULlxyXG5cdHZhciBkaWZmID0gcmVxdWlyZShcImRpZmZcIik7XHJcblx0XHJcblx0dmFyIG1ldGhvZCA9IFwiQ2hhcnNcIjtcclxuXHRpZiAob3B0aW9ucy53b3JkcylcclxuXHRcdG1ldGhvZCA9IFwiV29yZHNcIjtcclxuXHRpZiAob3B0aW9ucy5saW5lcylcclxuXHRcdG1ldGhvZCA9IFwiTGluZXNcIjtcclxuXHRpZiAob3B0aW9ucy5zZW50ZW5jZXMpXHJcblx0XHRtZXRob2QgPSBcIlNlbnRlbmNlc1wiO1xyXG5cdFxyXG5cdHZhciB0b3RhbF9jb250ZW50ID0gMDtcclxuXHR2YXIgY2hhbmdlZF9jb250ZW50ID0gMDtcclxuXHJcblx0dmFyIG9mZnNldCA9IDA7XHJcblx0dmFyIGh1bmtzID0gZGlmZltcImRpZmZcIiArIG1ldGhvZF0oYSwgYilcclxuXHRcdC5tYXAoZnVuY3Rpb24oY2hhbmdlKSB7XHJcblx0XHRcdC8vIEluY3JlbWVudCBjb3VudGVyIG9mIHRvdGFsIGNoYXJhY3RlcnMgZW5jb3VudGVyZWQuXHJcblx0XHRcdHRvdGFsX2NvbnRlbnQgKz0gY2hhbmdlLnZhbHVlLmxlbmd0aDtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChjaGFuZ2UuYWRkZWQgfHwgY2hhbmdlLnJlbW92ZWQpIHtcclxuXHRcdFx0XHQvLyBJbmNyZW1lbnQgY291bnRlciBvZiBjaGFuZ2VkIGNoYXJhY3RlcnMuXHJcblx0XHRcdFx0Y2hhbmdlZF9jb250ZW50ICs9IGNoYW5nZS52YWx1ZS5sZW5ndGg7XHJcblxyXG5cdFx0XHRcdC8vIENyZWF0ZSBhIGh1bmsgZm9yIHRoaXMgY2hhbmdlLlxyXG5cdFx0XHRcdHZhciBsZW5ndGggPSAwLCBuZXdfdmFsdWUgPSBcIlwiO1xyXG5cdFx0XHRcdGlmIChjaGFuZ2UucmVtb3ZlZCkgbGVuZ3RoID0gY2hhbmdlLnZhbHVlLmxlbmd0aDtcclxuXHRcdFx0XHRpZiAoY2hhbmdlLmFkZGVkKSBuZXdfdmFsdWUgPSBjaGFuZ2UudmFsdWU7XHJcblx0XHRcdFx0dmFyIHJldCA9IHsgb2Zmc2V0OiBvZmZzZXQsIGxlbmd0aDogbGVuZ3RoLCBvcDogbmV3IGpvdC5TRVQobmV3X3ZhbHVlKSB9O1xyXG5cdFx0XHRcdG9mZnNldCA9IDA7XHJcblx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBBZHZhbmNlIGNoYXJhY3RlciBwb3NpdGlvbiBpbmRleC4gRG9uJ3QgZ2VuZXJhdGUgYSBodW5rIGhlcmUuXHJcblx0XHRcdFx0b2Zmc2V0ICs9IGNoYW5nZS52YWx1ZS5sZW5ndGg7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH1cclxuXHRcdH0pXHJcblx0XHQuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHsgcmV0dXJuIGl0ZW0gIT0gbnVsbDsgfSk7XHJcblxyXG5cdC8vIEZvcm0gdGhlIFBBVENIIG9wZXJhdGlvbi5cclxuXHR2YXIgb3AgPSBuZXcgam90LlBBVENIKGh1bmtzKS5zaW1wbGlmeSgpO1xyXG5cdHJldHVybiB7XHJcblx0XHRvcDogb3AsXHJcblx0XHRwY3Q6IChjaGFuZ2VkX2NvbnRlbnQrMSkvKHRvdGFsX2NvbnRlbnQrMSksIC8vIGF2b2lkIGRpdml6aW9uIGJ5IHplcm9cclxuXHRcdHNpemU6IHRvdGFsX2NvbnRlbnRcclxuXHR9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaWZmX2FycmF5cyhhLCBiLCBvcHRpb25zKSB7XHJcblx0Ly8gVXNlIHRoZSAnZ2VuZXJpYy1kaWZmJyBwYWNrYWdlIHRvIGNvbXBhcmUgdHdvIGFycmF5cyxcclxuXHQvLyBidXQgdXNpbmcgYSBjdXN0b20gZXF1YWxpdHkgZnVuY3Rpb24uIFRoaXMgZ2l2ZXMgdXNcclxuXHQvLyBhIHJlbGF0aW9uIGJldHdlZW4gdGhlIGVsZW1lbnRzIGluIHRoZSBhcnJheXMuIFRoZW5cclxuXHQvLyB3ZSBjYW4gY29tcHV0ZSB0aGUgb3BlcmF0aW9ucyBmb3IgdGhlIGRpZmZzIGZvciB0aGVcclxuXHQvLyBlbGVtZW50cyB0aGF0IGFyZSBsaW5lZCB1cCAoYW5kIElOUy9ERUwgb3BlcmF0aW9uc1xyXG5cdC8vIGZvciBlbGVtZW50cyB0aGF0IGFyZSBhZGRlZC9yZW1vdmVkKS5cclxuXHRcclxuXHR2YXIgZ2VuZXJpY19kaWZmID0gcmVxdWlyZShcImdlbmVyaWMtZGlmZlwiKTtcclxuXHJcblx0Ly8gV2UnbGwgcnVuIGdlbmVyaWNfZGlmZiBvdmVyIGFuIGFycmF5IG9mIGluZGljZXNcclxuXHQvLyBpbnRvIGEgYW5kIGIsIHJhdGhlciB0aGFuIG9uIHRoZSBlbGVtZW50cyB0aGVtc2VsdmVzLlxyXG5cdHZhciBhaSA9IGEubWFwKGZ1bmN0aW9uKGl0ZW0sIGkpIHsgcmV0dXJuIGkgfSk7XHJcblx0dmFyIGJpID0gYi5tYXAoZnVuY3Rpb24oaXRlbSwgaSkgeyByZXR1cm4gaSB9KTtcclxuXHJcblx0dmFyIG9wcyA9IFsgXTtcclxuXHR2YXIgdG90YWxfY29udGVudCA9IDA7XHJcblx0dmFyIGNoYW5nZWRfY29udGVudCA9IDA7XHJcblx0dmFyIHBvcyA9IDA7XHJcblxyXG5cdGZ1bmN0aW9uIGRvX2RpZmYoYWksIGJpLCBsZXZlbCkge1xyXG5cdFx0Ly8gUnVuIGdlbmVyaWMtZGlmZiB1c2luZyBhIGN1c3RvbSBlcXVhbGl0eSBmdW5jdGlvbiB0aGF0XHJcblx0XHQvLyB0cmVhdHMgdHdvIHRoaW5ncyBhcyBlcXVhbCBpZiB0aGVpciBkaWZmZXJlbmNlIHBlcmNlbnRcclxuXHRcdC8vIGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0byBsZXZlbC5cclxuXHRcdC8vXHJcblx0XHQvLyBXZSBnZXQgYmFjayBhIHNlcXVlbmNlIG9mIGFkZC9yZW1vdmUvZXF1YWwgb3BlcmF0aW9ucy5cclxuXHRcdC8vIE1lcmdlIHRoZXNlIGludG8gY2hhbmdlZC9zYW1lIGh1bmtzLlxyXG5cclxuXHRcdHZhciBodW5rcyA9IFtdO1xyXG5cdFx0dmFyIGFfaW5kZXggPSAwO1xyXG5cdFx0dmFyIGJfaW5kZXggPSAwO1xyXG5cdFx0Z2VuZXJpY19kaWZmKFxyXG5cdFx0XHRhaSwgYmksXHJcblx0XHRcdGZ1bmN0aW9uKGFpLCBiaSkgeyByZXR1cm4gZGlmZihhW2FpXSwgYltiaV0sIG9wdGlvbnMpLnBjdCA8PSBsZXZlbDsgfVxyXG5cdFx0XHQpLmZvckVhY2goZnVuY3Rpb24oY2hhbmdlKSB7XHJcblx0XHRcdFx0aWYgKCFjaGFuZ2UucmVtb3ZlZCAmJiAhY2hhbmdlLmFkZGVkKSB7XHJcblx0XHRcdFx0XHQvLyBTYW1lLlxyXG5cdFx0XHRcdFx0aWYgKGFfaW5kZXgrY2hhbmdlLml0ZW1zLmxlbmd0aCA+IGFpLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKFwib3V0IG9mIHJhbmdlXCIpO1xyXG5cdFx0XHRcdFx0aWYgKGJfaW5kZXgrY2hhbmdlLml0ZW1zLmxlbmd0aCA+IGJpLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKFwib3V0IG9mIHJhbmdlXCIpO1xyXG5cdFx0XHRcdFx0aHVua3MucHVzaCh7IHR5cGU6ICdlcXVhbCcsIGFpOiBhaS5zbGljZShhX2luZGV4LCBhX2luZGV4K2NoYW5nZS5pdGVtcy5sZW5ndGgpLCBiaTogYmkuc2xpY2UoYl9pbmRleCwgYl9pbmRleCtjaGFuZ2UuaXRlbXMubGVuZ3RoKSB9KVxyXG5cdFx0XHRcdFx0YV9pbmRleCArPSBjaGFuZ2UuaXRlbXMubGVuZ3RoO1xyXG5cdFx0XHRcdFx0Yl9pbmRleCArPSBjaGFuZ2UuaXRlbXMubGVuZ3RoO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpZiAoaHVua3MubGVuZ3RoID09IDAgfHwgaHVua3NbaHVua3MubGVuZ3RoLTFdLnR5cGUgPT0gJ2VxdWFsJylcclxuXHRcdFx0XHRcdFx0aHVua3MucHVzaCh7IHR5cGU6ICd1bmVxdWFsJywgYWk6IFtdLCBiaTogW10gfSlcclxuXHRcdFx0XHRcdGlmIChjaGFuZ2UuYWRkZWQpIHtcclxuXHRcdFx0XHRcdFx0Ly8gQWRkZWQuXHJcblx0XHRcdFx0XHRcdGh1bmtzW2h1bmtzLmxlbmd0aC0xXS5iaSA9IGh1bmtzW2h1bmtzLmxlbmd0aC0xXS5iaS5jb25jYXQoY2hhbmdlLml0ZW1zKTtcclxuXHRcdFx0XHRcdFx0Yl9pbmRleCArPSBjaGFuZ2UuaXRlbXMubGVuZ3RoO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChjaGFuZ2UucmVtb3ZlZCkge1xyXG5cdFx0XHRcdFx0XHQvLyBSZW1vdmVkLlxyXG5cdFx0XHRcdFx0XHRodW5rc1todW5rcy5sZW5ndGgtMV0uYWkgPSBodW5rc1todW5rcy5sZW5ndGgtMV0uYWkuY29uY2F0KGNoYW5nZS5pdGVtcyk7XHJcblx0XHRcdFx0XHRcdGFfaW5kZXggKz0gY2hhbmdlLml0ZW1zLmxlbmd0aDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFByb2Nlc3MgZWFjaCBodW5rLlxyXG5cdFx0aHVua3MuZm9yRWFjaChmdW5jdGlvbihodW5rKSB7XHJcblx0XHRcdC8vY29uc29sZS5sb2cobGV2ZWwsIGh1bmsudHlwZSwgaHVuay5haS5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gYVtpXTsgfSksIGh1bmsuYmkubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIGJbaV07IH0pKTtcclxuXHJcblx0XHRcdGlmIChsZXZlbCA8IDEgJiYgaHVuay5haS5sZW5ndGggPiAwICYmIGh1bmsuYmkubGVuZ3RoID4gMFxyXG5cdFx0XHRcdCYmIChsZXZlbCA+IDAgfHwgaHVuay50eXBlID09IFwidW5lcXVhbFwiKSkge1xyXG5cdFx0XHRcdC8vIFJlY3Vyc2UgYXQgYSBsZXNzIHN0cmljdCBjb21wYXJpc29uIGxldmVsIHRvXHJcblx0XHRcdFx0Ly8gdGVhc2Ugb3V0IG1vcmUgY29ycmVzcG9uZGVuY2VzLiBXZSBkbyB0aGlzIGJvdGhcclxuXHRcdFx0XHQvLyBmb3IgJ2VxdWFsJyBhbmQgJ3VuZXF1YWwnIGh1bmtzIGJlY2F1c2UgZXZlbiBmb3JcclxuXHRcdFx0XHQvLyBlcXVhbCB0aGUgcGFpcnMgbWF5IG5vdCByZWFsbHkgY29ycmVzcG9uZCB3aGVuXHJcblx0XHRcdFx0Ly8gbGV2ZWwgPiAwLlxyXG5cdFx0XHRcdGRvX2RpZmYoXHJcblx0XHRcdFx0XHRodW5rLmFpLFxyXG5cdFx0XHRcdFx0aHVuay5iaSxcclxuXHRcdFx0XHRcdChsZXZlbCsxLjEpLzIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGh1bmsuYWkubGVuZ3RoICE9IGh1bmsuYmkubGVuZ3RoKSB7XHJcblx0XHRcdFx0Ly8gVGhlIGl0ZW1zIGFyZW4ndCBpbiBjb3JyZXNwb25kZW5jZSwgc28gd2UnbGwganVzdCByZXR1cm5cclxuXHRcdFx0XHQvLyBhIHdob2xlIFNQTElDRSBmcm9tIHRoZSBsZWZ0IHN1YnNlcXVlbmNlIHRvIHRoZSByaWdodFxyXG5cdFx0XHRcdC8vIHN1YnNlcXVlbmNlLlxyXG5cdFx0XHRcdHZhciBvcCA9IG5ldyBqb3QuU1BMSUNFKFxyXG5cdFx0XHRcdFx0cG9zLFxyXG5cdFx0XHRcdFx0aHVuay5haS5sZW5ndGgsXHJcblx0XHRcdFx0XHRodW5rLmJpLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBiW2ldOyB9KSk7XHJcblx0XHRcdFx0b3BzLnB1c2gob3ApO1xyXG5cdFx0XHRcdC8vY29uc29sZS5sb2cob3ApO1xyXG5cclxuXHRcdFx0XHQvLyBJbmNyZW1lbnQgY291bnRlcnMuXHJcblx0XHRcdFx0dmFyIGRkID0gKEpTT04uc3RyaW5naWZ5KGh1bmsuYWkubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIGFbaV07IH0pKVxyXG5cdFx0XHRcdCAgICAgICAgICsgSlNPTi5zdHJpbmdpZnkoaHVuay5iaS5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gYltpXTsgfSkpKTtcclxuXHRcdFx0XHRkZCA9IGRkLmxlbmd0aC8yO1xyXG5cdFx0XHRcdHRvdGFsX2NvbnRlbnQgKz0gZGQ7XHJcblx0XHRcdFx0Y2hhbmdlZF9jb250ZW50ICs9IGRkO1xyXG5cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBUaGUgaXRlbXMgaW4gdGhlIGFycmF5cyBhcmUgaW4gY29ycmVzcG9uZGVuY2UuXHJcblx0XHRcdFx0Ly8gVGhleSBtYXkgbm90IGJlIGlkZW50aWNhbCwgaG93ZXZlciwgaWYgbGV2ZWwgPiAwLlxyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaHVuay5haS5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0dmFyIGQgPSBkaWZmKGFbaHVuay5haVtpXV0sIGJbaHVuay5iaVtpXV0sIG9wdGlvbnMpO1xyXG5cclxuXHRcdFx0XHRcdC8vIEFkZCBhbiBvcGVyYXRpb24uXHJcblx0XHRcdFx0XHRpZiAoIWQub3AuaXNOb09wKCkpXHJcblx0XHRcdFx0XHRcdG9wcy5wdXNoKG5ldyBqb3QuQVRJTkRFWChodW5rLmJpW2ldLCBkLm9wKSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSW5jcmVtZW50IGNvdW50ZXJzLlxyXG5cdFx0XHRcdFx0dG90YWxfY29udGVudCArPSBkLnNpemU7XHJcblx0XHRcdFx0XHRjaGFuZ2VkX2NvbnRlbnQgKz0gZC5zaXplKmQucGN0O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cG9zICs9IGh1bmsuYmkubGVuZ3RoO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBHby5cclxuXHJcblx0ZG9fZGlmZihhaSwgYmksIDApO1xyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0b3A6IG5ldyBqb3QuTElTVChvcHMpLnNpbXBsaWZ5KCksXHJcblx0XHRwY3Q6IChjaGFuZ2VkX2NvbnRlbnQrMSkvKHRvdGFsX2NvbnRlbnQrMSksIC8vIGF2b2lkIGRpdml6aW9uIGJ5IHplcm9cclxuXHRcdHNpemU6IHRvdGFsX2NvbnRlbnRcclxuXHR9O1x0XHRcclxufVxyXG5cclxuZnVuY3Rpb24gZGlmZl9vYmplY3RzKGEsIGIsIG9wdGlvbnMpIHtcclxuXHQvLyBDb21wYXJlIHR3byBvYmplY3RzLlxyXG5cclxuXHR2YXIgb3BzID0gWyBdO1xyXG5cdHZhciB0b3RhbF9jb250ZW50ID0gMDtcclxuXHR2YXIgY2hhbmdlZF9jb250ZW50ID0gMDtcclxuXHRcclxuXHQvLyBJZiBhIGtleSBleGlzdHMgaW4gYm90aCBvYmplY3RzLCB0aGVuIGFzc3VtZSB0aGUga2V5XHJcblx0Ly8gaGFzIG5vdCBiZWVuIHJlbmFtZWQuXHJcblx0Zm9yICh2YXIga2V5IGluIGEpIHtcclxuXHRcdGlmIChrZXkgaW4gYikge1xyXG5cdFx0XHQvLyBDb21wdXRlIGRpZmYuXHJcblx0XHRcdGQgPSBkaWZmKGFba2V5XSwgYltrZXldLCBvcHRpb25zKTtcclxuXHJcblx0XHRcdC8vIEFkZCBvcGVyYXRpb24gaWYgdGhlcmUgd2VyZSBhbnkgY2hhbmdlcy5cclxuXHRcdFx0aWYgKCFkLm9wLmlzTm9PcCgpKVxyXG5cdFx0XHRcdG9wcy5wdXNoKG5ldyBqb3QuQVBQTFkoa2V5LCBkLm9wKSk7XHJcblxyXG5cdFx0XHQvLyBJbmNyZW1lbnQgY291bnRlcnMuXHJcblx0XHRcdHRvdGFsX2NvbnRlbnQgKz0gZC5zaXplO1xyXG5cdFx0XHRjaGFuZ2VkX2NvbnRlbnQgKz0gZC5zaXplKmQucGN0O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gRG8gY29tcGFyaXNvbnMgYmV0d2VlbiBhbGwgcGFpcnMgb2YgdW5tYXRjaGVkXHJcblx0Ly8ga2V5cyB0byBzZWUgd2hhdCBiZXN0IGxpbmVzIHVwIHdpdGggd2hhdC4gRG9uJ3RcclxuXHQvLyBzdG9yZSBwYWlycyB3aXRoIG5vdGhpbmcgaW4gY29tbW9uLlxyXG5cdHZhciBwYWlycyA9IFsgXTtcclxuXHQvKlxyXG5cdGZvciAodmFyIGtleTEgaW4gYSkge1xyXG5cdFx0aWYgKGtleTEgaW4gYikgY29udGludWU7XHJcblx0XHRmb3IgKHZhciBrZXkyIGluIGIpIHtcclxuXHRcdFx0aWYgKGtleTIgaW4gYSkgY29udGludWU7XHJcblx0XHRcdHZhciBkID0gZGlmZihhW2tleTFdLCBiW2tleTJdLCBvcHRpb25zKTtcclxuXHRcdFx0aWYgKGQucGN0ID09IDEpIGNvbnRpbnVlO1xyXG5cdFx0XHRwYWlycy5wdXNoKHtcclxuXHRcdFx0XHRhX2tleToga2V5MSxcclxuXHRcdFx0XHRiX2tleToga2V5MixcclxuXHRcdFx0XHRkaWZmOiBkXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHQqL1xyXG5cclxuXHQvLyBTb3J0IHRoZSBwYWlycyB0byBjaG9vc2UgdGhlIGJlc3QgbWF0Y2hlcyBmaXJzdC5cclxuXHQvLyAoVGhpcyBpcyBhIGdyZWVkeSBhcHByb2FjaC4gTWF5IG5vdCBiZSBvcHRpbWFsLilcclxuXHR2YXIgdXNlZF9hID0geyB9O1xyXG5cdHZhciB1c2VkX2IgPSB7IH07XHJcblx0cGFpcnMuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuICgoYS5kaWZmLnBjdCphLmRpZmYuc2l6ZSkgLSAoYi5kaWZmLnBjdCpiLmRpZmYuc2l6ZSkpOyB9KVxyXG5cdHBhaXJzLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xyXG5cdFx0Ly8gSGF2ZSB3ZSBhbHJlYWR5IGdlbmVyYXRlZCBhbiBvcGVyYXRpb24gcmVuYW1pbmdcclxuXHRcdC8vIHRoZSBrZXkgaW4gYSBvciByZW5hbWluZyBzb21ldGhpbmcgdG8gdGhlIGtleSBpbiBiP1xyXG5cdFx0Ly8gSWYgc28sIHRoaXMgcGFpciBjYW4ndCBiZSB1c2VkLlxyXG5cdFx0aWYgKGl0ZW0uYV9rZXkgaW4gdXNlZF9hKSByZXR1cm47XHJcblx0XHRpZiAoaXRlbS5iX2tleSBpbiB1c2VkX2IpIHJldHVybjtcclxuXHRcdHVzZWRfYVtpdGVtLmFfa2V5XSA9IDE7XHJcblx0XHR1c2VkX2JbaXRlbS5iX2tleV0gPSAxO1xyXG5cclxuXHRcdC8vIFVzZSB0aGlzIHBhaXIuXHJcblx0XHRvcHMucHVzaChuZXcgam90LlJFTihpdGVtLmFfa2V5LCBpdGVtLmJfa2V5KSk7XHJcblx0XHRpZiAoIWl0ZW0uZGlmZi5vcC5pc05vT3AoKSlcclxuXHRcdFx0b3BzLnB1c2gobmV3IGpvdC5BUFBMWShpdGVtLmJfa2V5LCBpdGVtLmRpZmYub3ApKTtcclxuXHJcblx0XHQvLyBJbmNyZW1lbnQgY291bnRlcnMuXHJcblx0XHR0b3RhbF9jb250ZW50ICs9IGl0ZW0uZGlmZi5zaXplO1xyXG5cdFx0Y2hhbmdlZF9jb250ZW50ICs9IGl0ZW0uZGlmZi5zaXplKml0ZW0uZGlmZi5wY3Q7XHJcblx0fSlcclxuXHJcblx0Ly8gRGVsZXRlL2NyZWF0ZSBhbnkga2V5cyB0aGF0IGRpZG4ndCBtYXRjaCB1cC5cclxuXHRmb3IgKHZhciBrZXkgaW4gYSkge1xyXG5cdFx0aWYgKGtleSBpbiBiIHx8IGtleSBpbiB1c2VkX2EpIGNvbnRpbnVlO1xyXG5cdFx0b3BzLnB1c2gobmV3IGpvdC5SRU0oa2V5KSk7XHJcblx0fVxyXG5cdGZvciAodmFyIGtleSBpbiBiKSB7XHJcblx0XHRpZiAoa2V5IGluIGEgfHwga2V5IGluIHVzZWRfYikgY29udGludWU7XHJcblx0XHRvcHMucHVzaChuZXcgam90LlBVVChrZXksIGJba2V5XSkpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdG9wOiBuZXcgam90LkxJU1Qob3BzKS5zaW1wbGlmeSgpLFxyXG5cdFx0cGN0OiAoY2hhbmdlZF9jb250ZW50KzEpLyh0b3RhbF9jb250ZW50KzEpLCAvLyBhdm9pZCBkaXZpemlvbiBieSB6ZXJvXHJcblx0XHRzaXplOiB0b3RhbF9jb250ZW50XHJcblx0fTtcclxufVxyXG5cclxuIiwiLyogQmFzZSBmdW5jdGlvbnMgZm9yIHRoZSBvcGVyYXRpb25hbCB0cmFuc2Zvcm1hdGlvbiBsaWJyYXJ5LiAqL1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XHJcbnZhciBzaGFsbG93X2Nsb25lID0gcmVxdWlyZSgnc2hhbGxvdy1jbG9uZScpO1xyXG5cclxuLy8gTXVzdCBkZWZpbmUgdGhpcyBhaGVhZCBvZiBhbnkgaW1wb3J0cyBiZWxvdyBzbyB0aGF0IHRoaXMgY29uc3RydWN0b3JcclxuLy8gaXMgYXZhaWxhYmxlIHRvIHRoZSBvcGVyYXRpb24gY2xhc3Nlcy5cclxuZXhwb3J0cy5CYXNlT3BlcmF0aW9uID0gZnVuY3Rpb24oKSB7XHJcbn1cclxuZXhwb3J0cy5hZGRfb3AgPSBmdW5jdGlvbihjb25zdHJ1Y3RvciwgbW9kdWxlLCBvcG5hbWUpIHtcclxuXHQvLyB1dGlsaXR5LlxyXG5cdGNvbnN0cnVjdG9yLnByb3RvdHlwZS50eXBlID0gW21vZHVsZS5tb2R1bGVfbmFtZSwgb3BuYW1lXTtcclxuXHRpZiAoISgnb3BfbWFwJyBpbiBtb2R1bGUpKVxyXG5cdFx0bW9kdWxlWydvcF9tYXAnXSA9IHsgfTtcclxuXHRtb2R1bGVbJ29wX21hcCddW29wbmFtZV0gPSBjb25zdHJ1Y3RvcjtcclxufVxyXG5cclxuXHJcbi8vIEV4cG9zZSB0aGUgb3BlcmF0aW9uIGNsYXNzZXMgdGhyb3VnaCB0aGUgam90IGxpYnJhcnkuXHJcbnZhciB2YWx1ZXMgPSByZXF1aXJlKFwiLi92YWx1ZXMuanNcIik7XHJcbnZhciBzZXF1ZW5jZXMgPSByZXF1aXJlKFwiLi9zZXF1ZW5jZXMuanNcIik7XHJcbnZhciBvYmplY3RzID0gcmVxdWlyZShcIi4vb2JqZWN0cy5qc1wiKTtcclxudmFyIGxpc3RzID0gcmVxdWlyZShcIi4vbGlzdHMuanNcIik7XHJcbnZhciBjb3BpZXMgPSByZXF1aXJlKFwiLi9jb3BpZXMuanNcIik7XHJcblxyXG5leHBvcnRzLk5PX09QID0gdmFsdWVzLk5PX09QO1xyXG5leHBvcnRzLlNFVCA9IHZhbHVlcy5TRVQ7XHJcbmV4cG9ydHMuTUFUSCA9IHZhbHVlcy5NQVRIO1xyXG5leHBvcnRzLlBBVENIID0gc2VxdWVuY2VzLlBBVENIO1xyXG5leHBvcnRzLlNQTElDRSA9IHNlcXVlbmNlcy5TUExJQ0U7XHJcbmV4cG9ydHMuQVRJTkRFWCA9IHNlcXVlbmNlcy5BVElOREVYO1xyXG5leHBvcnRzLk1BUCA9IHNlcXVlbmNlcy5NQVA7XHJcbmV4cG9ydHMuUFVUID0gb2JqZWN0cy5QVVQ7XHJcbmV4cG9ydHMuUkVNID0gb2JqZWN0cy5SRU07XHJcbmV4cG9ydHMuQVBQTFkgPSBvYmplY3RzLkFQUExZO1xyXG5leHBvcnRzLkxJU1QgPSBsaXN0cy5MSVNUO1xyXG5leHBvcnRzLkNPUFkgPSBjb3BpZXMuQ09QWTtcclxuXHJcbi8vIEV4cG9zZSB0aGUgZGlmZiBmdW5jdGlvbiB0b28uXHJcbmV4cG9ydHMuZGlmZiA9IHJlcXVpcmUoJy4vZGlmZi5qcycpLmRpZmY7XHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmV4cG9ydHMuQmFzZU9wZXJhdGlvbi5wcm90b3R5cGUuaXNOb09wID0gZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHRoaXMgaW5zdGFuY2VvZiB2YWx1ZXMuTk9fT1A7XHJcbn1cclxuXHJcbmV4cG9ydHMuQmFzZU9wZXJhdGlvbi5wcm90b3R5cGUudmlzaXQgPSBmdW5jdGlvbih2aXNpdG9yKSB7XHJcblx0Ly8gQSBzaW1wbGUgdmlzaXRvciBwYXJhZGlnbS4gUmVwbGFjZSB0aGlzIG9wZXJhdGlvbiBpbnN0YW5jZSBpdHNlbGZcclxuXHQvLyBhbmQgYW55IG9wZXJhdGlvbiB3aXRoaW4gaXQgd2l0aCB0aGUgdmFsdWUgcmV0dXJuZWQgYnkgY2FsbGluZ1xyXG5cdC8vIHZpc2l0b3Igb24gaXRzZWxmLCBvciBpZiB0aGUgdmlzaXRvciByZXR1cm5zIGFueXRoaW5nIGZhbHNleVxyXG5cdC8vIChwcm9iYWJseSB1bmRlZmluZWQpIHRoZW4gcmV0dXJuIHRoZSBvcGVyYXRpb24gdW5jaGFuZ2VkLlxyXG5cdHJldHVybiB2aXNpdG9yKHRoaXMpIHx8IHRoaXM7XHJcbn1cclxuXHJcbmV4cG9ydHMuQmFzZU9wZXJhdGlvbi5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oX19rZXlfXywgcHJvdG9jb2xfdmVyc2lvbikge1xyXG5cdC8vIFRoZSBmaXJzdCBhcmd1bWVudCBfX2tleV9fIGlzIHVzZWQgd2hlbiB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBieVxyXG5cdC8vIEpTT04uc3RyaW5naWZ5LiBGb3IgcmVhc29ucyB1bmNsZWFyLCB3ZSBnZXQgdGhlIG5hbWUgb2YgdGhlIHByb3BlcnR5XHJcblx0Ly8gdGhhdCB0aGlzIG9iamVjdCBpcyBzdG9yZWQgaW4gaW4gaXRzIHBhcmVudD8gRG9lc24ndCBtYXR0ZXIuIFdlXHJcblx0Ly8gbGVhdmUgYSBzbG90IHNvIHRoYXQgdGhpcyBmdW5jdGlvbiBjYW4gYmUgY29ycmVjdGx5IGNhbGxlZCBieSBKU09OLlxyXG5cdC8vIHN0cmluZ2lmeSwgYnV0IHdlIGRvbid0IHVzZSBpdC5cclxuXHJcblx0Ly8gVGhlIHJldHVybiB2YWx1ZS5cclxuXHR2YXIgcmVwciA9IHsgfTtcclxuXHJcblx0Ly8gSWYgcHJvdG9jb2xfdmVyc2lvbiBpcyB1bnNwZWNpZmllZCwgdGhlbiB0aGlzIGlzIGEgdG9wLWxldmVsIGNhbGwuXHJcblx0Ly8gQ2hvb3NlIHRoZSBsYXRlc3QgKGFuZCBvbmx5KSBwcm90b2NvbCB2ZXJzaW9uIGFuZCB3cml0ZSBpdCBpbnRvXHJcblx0Ly8gdGhlIG91dHB1dCBkYXRhIHN0cnVjdHVyZSwgYW5kIHBhc3MgaXQgZG93biByZWN1cnNpdmVseS5cclxuXHQvL1xyXG5cdC8vIElmIHByb3RvY29sX3ZlcnNpb24gd2FzIHNwZWNpZmllZCwgdGhpcyBpcyBhIHJlY3Vyc2l2ZSBjYWxsIGFuZFxyXG5cdC8vIHdlIGRvbid0IG5lZWQgdG8gd3JpdGUgaXQgb3V0LiBTYW5pdHkgY2hlY2sgaXQncyBhIHZhbGlkIHZhbHVlLlxyXG5cdGlmICh0eXBlb2YgcHJvdG9jb2xfdmVyc2lvbiA9PSBcInVuZGVmaW5lZFwiKSB7XHJcblx0XHRwcm90b2NvbF92ZXJzaW9uID0gMTtcclxuXHRcdHJlcHJbXCJfdmVyXCJdID0gcHJvdG9jb2xfdmVyc2lvbjtcclxuXHR9IGVsc2Uge1xyXG5cdFx0aWYgKHByb3RvY29sX3ZlcnNpb24gIT09IDEpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcHJvdG9jb2wgdmVyc2lvbjogXCIgKyBwcm90b2NvbF92ZXJzaW9uKTtcclxuXHR9XHJcblxyXG5cdC8vIFNldCB0aGUgbW9kdWxlIGFuZCBvcGVyYXRpb24gbmFtZS5cclxuXHRyZXByWydfdHlwZSddID0gdGhpcy50eXBlWzBdICsgXCIuXCIgKyB0aGlzLnR5cGVbMV07XHJcblxyXG5cdC8vIENhbGwgdGhlIG9wZXJhdGlvbidzIHRvSlNPTiBmdW5jdGlvbi5cclxuXHR0aGlzLmludGVybmFsVG9KU09OKHJlcHIsIHByb3RvY29sX3ZlcnNpb24pO1xyXG5cclxuXHQvLyBSZXR1cm4uXHJcblx0cmV0dXJuIHJlcHI7XHJcbn1cclxuXHJcbmV4cG9ydHMub3BGcm9tSlNPTiA9IGZ1bmN0aW9uKG9iaiwgcHJvdG9jb2xfdmVyc2lvbiwgb3BfbWFwKSB7XHJcblx0Ly8gU2FuaXR5IGNoZWNrLlxyXG5cdGlmICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgYW4gb3BlcmF0aW9uLlwiKTtcclxuXHJcblx0Ly8gSWYgcHJvdG9jb2xfdmVyc2lvbiBpcyB1bnNwZWNpZmllZCwgdGhlbiB0aGlzIGlzIGEgdG9wLWxldmVsIGNhbGwuXHJcblx0Ly8gVGhlIHZlcnNpb24gbXVzdCBiZSBlbmNvZGVkIGluIHRoZSBvYmplY3QsIGFuZCB3ZSBwYXNzIGl0IGRvd25cclxuXHQvLyByZWN1cnNpdmVseS5cclxuXHQvL1xyXG5cdC8vIElmIHByb3RvY29sX3ZlcnNpb24gaXMgc3BlY2lmaWVkLCB0aGlzIGlzIGEgcmVjdXJzaXZlIGNhbGwgYW5kXHJcblx0Ly8gd2UgZG9uJ3QgbmVlZCB0byByZWFkIGl0IGZyb20gdGhlIG9iamVjdC5cclxuXHRpZiAodHlwZW9mIHByb3RvY29sX3ZlcnNpb24gPT09IFwidW5kZWZpbmVkXCIpIHtcclxuXHRcdHByb3RvY29sX3ZlcnNpb24gPSBvYmpbJ192ZXInXTtcclxuXHRcdGlmIChwcm90b2NvbF92ZXJzaW9uICE9PSAxKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJKT1Qgc2VyaWFsaXplZCBkYXRhIHN0cnVjdHVyZSBpcyBtaXNzaW5nIHByb3RvY29sIHZlcnNpb24gYW5kIG9uZSB3YXNuJ3QgcHJvdmlkZWQgYXMgYW4gYXJndW1lbnQuXCIpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHRpZiAocHJvdG9jb2xfdmVyc2lvbiAhPT0gMSlcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBwcm90b2NvbCB2ZXJzaW9uIHByb3ZpZGVkOiBcIiArIHByb3RvY29sX3ZlcnNpb24pXHJcblx0XHRpZiAoXCJfdmVyXCIgaW4gb2JqKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJKT1Qgc2VyaWFsaXplZCBkYXRhIHN0cnVjdHVyZSBzaG91bGQgbm90IGhhdmUgcHJvdG9jb2wgdmVyc2lvbiBiZWNhdXNlIGl0IHdhcyBwcm92aWRlZCBhcyBhbiBhcmd1bWVudC5cIik7XHJcblx0fVxyXG5cclxuXHQvLyBDcmVhdGUgYSBkZWZhdWx0IG1hcHBpbmcgZnJvbSBlbmNvZGVkIHR5cGVzIHRvIGNvbnN0cnVjdG9yc1xyXG5cdC8vIGFsbG93aW5nIGFsbCBvcGVyYXRpb25zIHRvIGJlIGRlc2VyaWFsaXplZC5cclxuXHRpZiAoIW9wX21hcCkge1xyXG5cdFx0b3BfbWFwID0geyB9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGV4dGVuZF9vcF9tYXAobW9kdWxlKSB7XHJcblx0XHRcdG9wX21hcFttb2R1bGUubW9kdWxlX25hbWVdID0geyB9O1xyXG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gbW9kdWxlLm9wX21hcClcclxuXHRcdFx0XHRvcF9tYXBbbW9kdWxlLm1vZHVsZV9uYW1lXVtrZXldID0gbW9kdWxlLm9wX21hcFtrZXldO1xyXG5cdFx0fVxyXG5cclxuXHRcdGV4dGVuZF9vcF9tYXAodmFsdWVzKTtcclxuXHRcdGV4dGVuZF9vcF9tYXAoc2VxdWVuY2VzKTtcclxuXHRcdGV4dGVuZF9vcF9tYXAob2JqZWN0cyk7XHJcblx0XHRleHRlbmRfb3BfbWFwKGxpc3RzKTtcclxuXHRcdGV4dGVuZF9vcF9tYXAoY29waWVzKTtcclxuXHR9XHJcblxyXG5cdC8vIEdldCB0aGUgb3BlcmF0aW9uIGNsYXNzLlxyXG5cdGlmICh0eXBlb2Ygb2JqWydfdHlwZSddICE9PSBcInN0cmluZ1wiKSB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgYW4gb3BlcmF0aW9uLlwiKTtcclxuXHR2YXIgZG90dGVkY2xhc3NwYXJ0cyA9IG9iai5fdHlwZS5zcGxpdCgvXFwuL2csIDIpO1xyXG5cdGlmIChkb3R0ZWRjbGFzc3BhcnRzLmxlbmd0aCAhPSAyKSB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgYW4gb3BlcmF0aW9uLlwiKTtcclxuXHR2YXIgY2xhenogPSBvcF9tYXBbZG90dGVkY2xhc3NwYXJ0c1swXV1bZG90dGVkY2xhc3NwYXJ0c1sxXV07XHJcblxyXG5cdC8vIENhbGwgdGhlIGRlc2VyaWFsaXplciBmdW5jdGlvbiBvbiB0aGUgY2xhc3MuXHJcblx0cmV0dXJuIGNsYXp6LmludGVybmFsRnJvbUpTT04ob2JqLCBwcm90b2NvbF92ZXJzaW9uLCBvcF9tYXApO1xyXG59XHJcblxyXG5leHBvcnRzLkJhc2VPcGVyYXRpb24ucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIEpTT04uc3RyaW5naWZ5IHdpbGwgdXNlIHRoZSBvYmplY3QncyB0b0pTT04gbWV0aG9kXHJcblx0Ly8gaW1wbGljaXRseS5cclxuXHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcyk7XHJcbn1cclxuZXhwb3J0cy5kZXNlcmlhbGl6ZSA9IGZ1bmN0aW9uKG9wX2pzb24pIHtcclxuXHRyZXR1cm4gZXhwb3J0cy5vcEZyb21KU09OKEpTT04ucGFyc2Uob3BfanNvbikpO1xyXG59XHJcblxyXG5leHBvcnRzLkJhc2VPcGVyYXRpb24ucHJvdG90eXBlLmNvbXBvc2UgPSBmdW5jdGlvbihvdGhlciwgbm9fbGlzdCkge1xyXG5cdGlmICghKG90aGVyIGluc3RhbmNlb2YgZXhwb3J0cy5CYXNlT3BlcmF0aW9uKSlcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IG11c3QgYmUgYW4gb3BlcmF0aW9uLlwiKTtcclxuXHJcblx0Ly8gQSBOT19PUCBjb21wb3NlZCB3aXRoIGFueXRoaW5nIGp1c3QgZ2l2ZXMgdGhlIG90aGVyIHRoaW5nLlxyXG5cdGlmICh0aGlzIGluc3RhbmNlb2YgdmFsdWVzLk5PX09QKVxyXG5cdFx0cmV0dXJuIG90aGVyO1xyXG5cclxuXHQvLyBDb21wb3Npbmcgd2l0aCBhIE5PX09QIGRvZXMgbm90aGluZy5cclxuXHRpZiAob3RoZXIgaW5zdGFuY2VvZiB2YWx1ZXMuTk9fT1ApXHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHJcblx0Ly8gQ29tcG9zaW5nIHdpdGggYSBTRVQgb2JsaXRlcmF0ZXMgdGhpcyBvcGVyYXRpb24uXHJcblx0aWYgKG90aGVyIGluc3RhbmNlb2YgdmFsdWVzLlNFVClcclxuXHRcdHJldHVybiBvdGhlcjtcclxuXHJcblx0Ly8gQXR0ZW1wdCBhbiBhdG9taWMgY29tcG9zaXRpb24gaWYgdGhpcyBkZWZpbmVzIHRoZSBtZXRob2QuXHJcblx0aWYgKHRoaXMuYXRvbWljX2NvbXBvc2UpIHtcclxuXHRcdHZhciBvcCA9IHRoaXMuYXRvbWljX2NvbXBvc2Uob3RoZXIpO1xyXG5cdFx0aWYgKG9wICE9IG51bGwpXHJcblx0XHRcdHJldHVybiBvcDtcclxuXHR9XHJcblxyXG5cdGlmIChub19saXN0KVxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblxyXG5cdC8vIEZhbGwgYmFjayB0byBjcmVhdGluZyBhIExJU1QuIENhbGwgc2ltcGxpZnkoKSB0byB3ZWVkIG91dFxyXG5cdC8vIGFueXRoaW5nIGVxdWl2YWxlbnQgdG8gYSBOT19PUC5cclxuXHRyZXR1cm4gbmV3IGxpc3RzLkxJU1QoW3RoaXMsIG90aGVyXSkuc2ltcGxpZnkoKTtcclxufVxyXG5cclxuZXhwb3J0cy5CYXNlT3BlcmF0aW9uLnByb3RvdHlwZS5yZWJhc2UgPSBmdW5jdGlvbihvdGhlciwgY29uZmxpY3RsZXNzLCBkZWJ1Zykge1xyXG5cdC8qIFRyYW5zZm9ybXMgdGhpcyBvcGVyYXRpb24gc28gdGhhdCBpdCBjYW4gYmUgY29tcG9zZWQgKmFmdGVyKiB0aGUgb3RoZXJcclxuXHQgICBvcGVyYXRpb24gdG8geWllbGQgdGhlIHNhbWUgbG9naWNhbCBlZmZlY3QgYXMgaWYgaXQgaGFkIGJlZW4gZXhlY3V0ZWRcclxuXHQgICBpbiBwYXJhbGxlbCAocmF0aGVyIHRoYW4gaW4gc2VxdWVuY2UpLiBSZXR1cm5zIG51bGwgb24gY29uZmxpY3QuXHJcblx0ICAgSWYgY29uZmxpY3RsZXNzIGlzIHRydWUsIHRyaWVzIGV4dHJhIGhhcmQgdG8gcmVzb2x2ZSBhIGNvbmZsaWN0IGluIGFcclxuXHQgICBzZW5zaWJsZSB3YXkgYnV0IHBvc3NpYmx5IGJ5IGtpbGxpbmcgb25lIG9wZXJhdGlvbiBvciB0aGUgb3RoZXIuXHJcblx0ICAgUmV0dXJucyB0aGUgcmViYXNlZCB2ZXJzaW9uIG9mIHRoaXMuICovXHJcblxyXG5cdC8vIFJ1biB0aGUgcmViYXNlIG9wZXJhdGlvbiBpbiBhJ3MgcHJvdG90eXBlLiBJZiBhIGRvZXNuJ3QgZGVmaW5lIGl0LFxyXG5cdC8vIGNoZWNrIGIncyBwcm90b3R5cGUuIElmIG5laXRoZXIgZGVmaW5lIGEgcmViYXNlIG9wZXJhdGlvbiwgdGhlbiB0aGVyZVxyXG5cdC8vIGlzIGEgY29uZmxpY3QuXHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCAoKHRoaXMucmViYXNlX2Z1bmN0aW9ucyE9bnVsbCkgPyB0aGlzLnJlYmFzZV9mdW5jdGlvbnMubGVuZ3RoIDogMCk7IGkrKykge1xyXG5cdFx0aWYgKG90aGVyIGluc3RhbmNlb2YgdGhpcy5yZWJhc2VfZnVuY3Rpb25zW2ldWzBdKSB7XHJcblx0XHRcdHZhciByID0gdGhpcy5yZWJhc2VfZnVuY3Rpb25zW2ldWzFdLmNhbGwodGhpcywgb3RoZXIsIGNvbmZsaWN0bGVzcyk7XHJcblx0XHRcdGlmIChyICE9IG51bGwgJiYgclswXSAhPSBudWxsKSB7XHJcblx0XHRcdFx0aWYgKGRlYnVnKSBkZWJ1ZyhcInJlYmFzZVwiLCB0aGlzLCBcIm9uXCIsIG90aGVyLCAoY29uZmxpY3RsZXNzID8gXCJjb25mbGljdGxlc3NcIiA6IFwiXCIpLCAoXCJkb2N1bWVudFwiIGluIGNvbmZsaWN0bGVzcyA/IEpTT04uc3RyaW5naWZ5KGNvbmZsaWN0bGVzcy5kb2N1bWVudCkgOiBcIlwiKSwgXCI9PlwiLCByWzBdKTtcclxuXHRcdFx0XHRyZXR1cm4gclswXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gRWl0aGVyIGEgZGlkbid0IGRlZmluZSBhIHJlYmFzZSBmdW5jdGlvbiBmb3IgYidzIGRhdGEgdHlwZSwgb3IgZWxzZVxyXG5cdC8vIGl0IHJldHVybmVkIG51bGwgYWJvdmUuIFdlIGNhbiB0cnkgcnVubmluZyB0aGUgc2FtZSBsb2dpYyBiYWNrd2FyZHMgb24gYi5cclxuXHRmb3IgKHZhciBpID0gMDsgaSA8ICgob3RoZXIucmViYXNlX2Z1bmN0aW9ucyE9bnVsbCkgPyBvdGhlci5yZWJhc2VfZnVuY3Rpb25zLmxlbmd0aCA6IDApOyBpKyspIHtcclxuXHRcdGlmICh0aGlzIGluc3RhbmNlb2Ygb3RoZXIucmViYXNlX2Z1bmN0aW9uc1tpXVswXSkge1xyXG5cdFx0XHR2YXIgciA9IG90aGVyLnJlYmFzZV9mdW5jdGlvbnNbaV1bMV0uY2FsbChvdGhlciwgdGhpcywgY29uZmxpY3RsZXNzKTtcclxuXHRcdFx0aWYgKHIgIT0gbnVsbCAmJiByWzFdICE9IG51bGwpIHtcclxuXHRcdFx0XHRpZiAoZGVidWcpIGRlYnVnKFwicmViYXNlXCIsIHRoaXMsIFwib25cIiwgb3RoZXIsIChjb25mbGljdGxlc3MgPyBcImNvbmZsaWN0bGVzc1wiIDogXCJcIiksIChcImRvY3VtZW50XCIgaW4gY29uZmxpY3RsZXNzID8gSlNPTi5zdHJpbmdpZnkoY29uZmxpY3RsZXNzLmRvY3VtZW50KSA6IFwiXCIpLCBcIj0+XCIsIHJbMF0pO1xyXG5cdFx0XHRcdHJldHVybiByWzFdO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBFdmVyeXRoaW5nIGNhbiByZWJhc2UgYWdhaW5zdCBhIExJU1QgYW5kIHZpY2UgdmVyc2EuXHJcblx0Ly8gVGhpcyBoYXMgaGlnaGVyIHByZWNlZGVuY2UgdGhhbiB0aGUgdGhpcyBpbnN0YW5jZW9mIFNFVCBmYWxsYmFjay5cclxuXHRpZiAodGhpcyBpbnN0YW5jZW9mIGxpc3RzLkxJU1QgfHwgb3RoZXIgaW5zdGFuY2VvZiBsaXN0cy5MSVNUKSB7XHJcblx0XHR2YXIgcmV0ID0gbGlzdHMucmViYXNlKG90aGVyLCB0aGlzLCBjb25mbGljdGxlc3MsIGRlYnVnKTtcclxuXHRcdGlmIChkZWJ1ZykgZGVidWcoXCJyZWJhc2VcIiwgdGhpcywgXCJvblwiLCBvdGhlciwgXCI9PlwiLCByZXQpO1xyXG5cdFx0cmV0dXJuIHJldDtcclxuXHR9XHJcblxyXG5cdGlmIChjb25mbGljdGxlc3MpIHtcclxuXHRcdC8vIEV2ZXJ5dGhpbmcgY2FuIHJlYmFzZSBhZ2FpbnN0IGEgQ09QWSBpbiBjb25mbGljdGxlc3MgbW9kZSB3aGVuXHJcblx0XHQvLyBhIHByZXZpb3VzIGRvY3VtZW50IGNvbnRlbnQgaXMgZ2l2ZW4gLS0tIHRoZSBkb2N1bWVudCBpcyBuZWVkZWRcclxuXHRcdC8vIHRvIHBhcnNlIGEgSlNPTlBvaW50ZXIgYW5kIGtub3cgd2hldGhlciB0aGUgcGF0aCBjb21wb25lbnRzIGFyZVxyXG5cdFx0Ly8gZm9yIG9iamVjdHMgb3IgYXJyYXlzLiBJZiB0aGlzJ3Mgb3BlcmF0aW9uIGFmZmVjdHMgYSBwYXRoIHRoYXRcclxuXHRcdC8vIGlzIGNvcGllZCwgdGhlIG9wZXJhdGlvbiBpcyBjbG9uZWQgdG8gdGhlIHRhcmdldCBwYXRoLlxyXG5cdFx0Ly8gVGhpcyBoYXMgaGlnaGVyIHByZWNlZGVuY2UgdGhhbiB0aGUgdGhpcyBpbnN0YW5jZW9mIFNFVCBmYWxsYmFjay5cclxuXHRcdGlmIChvdGhlciBpbnN0YW5jZW9mIGNvcGllcy5DT1BZICYmIHR5cGVvZiBjb25mbGljdGxlc3MuZG9jdW1lbnQgIT0gXCJ1bmRlZmluZWRcIilcclxuXHRcdFx0cmV0dXJuIG90aGVyLmNsb25lX29wZXJhdGlvbih0aGlzLCBjb25mbGljdGxlc3MuZG9jdW1lbnQpO1xyXG5cclxuXHRcdC8vIEV2ZXJ5dGhpbmcgY2FuIHJlYmFzZSBhZ2FpbnN0IGEgU0VUIGluIGEgY29uZmxpY3RsZXNzIHdheS5cclxuXHRcdC8vIE5vdGUgdGhhdCB0byByZXNvbHZlIHRpZXMsIFNFVCByZWJhc2VkIGFnYWluc3QgU0VUIGlzIGhhbmRsZWRcclxuXHRcdC8vIGluIFNFVCdzIHJlYmFzZV9mdW5jdGlvbnMuXHJcblxyXG5cdFx0Ly8gVGhlIFNFVCBhbHdheXMgd2lucyFcclxuXHRcdGlmICh0aGlzIGluc3RhbmNlb2YgdmFsdWVzLlNFVCkge1xyXG5cdFx0XHRpZiAoZGVidWcpIGRlYnVnKFwicmViYXNlXCIsIHRoaXMsIFwib25cIiwgb3RoZXIsIFwiPT5cIiwgdGhpcyk7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG90aGVyIGluc3RhbmNlb2YgdmFsdWVzLlNFVCkge1xyXG5cdFx0XHRpZiAoZGVidWcpIGRlYnVnKFwicmViYXNlXCIsIHRoaXMsIFwib25cIiwgb3RoZXIsIFwiPT5cIiwgbmV3IHZhbHVlcy5OT19PUCgpKTtcclxuXHRcdFx0cmV0dXJuIG5ldyB2YWx1ZXMuTk9fT1AoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBjb25mbGljdGxlc3MgcmViYXNlIHdvdWxkIGZhaWwsIHJhaXNlIGFuIGVycm9yLlxyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiUmViYXNlIGZhaWxlZCBiZXR3ZWVuIFwiICsgdGhpcy5pbnNwZWN0KCkgKyBcIiBhbmQgXCIgKyBvdGhlci5pbnNwZWN0KCkgKyBcIi5cIik7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZXhwb3J0cy5jcmVhdGVSYW5kb21WYWx1ZSA9IGZ1bmN0aW9uKGRlcHRoKSB7XHJcblx0dmFyIHZhbHVlcyA9IFtdO1xyXG5cclxuXHQvLyBudWxsXHJcblx0dmFsdWVzLnB1c2gobnVsbCk7XHJcblxyXG5cdC8vIGJvb2xlYW5cclxuXHR2YWx1ZXMucHVzaChmYWxzZSk7XHJcblx0dmFsdWVzLnB1c2godHJ1ZSk7XHJcblxyXG5cdC8vIG51bWJlciAoaW50ZWdlciwgZmxvYXQpXHJcblx0dmFsdWVzLnB1c2goMTAwMCAqIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAtIC41KSk7XHJcblx0dmFsdWVzLnB1c2goTWF0aC5yYW5kb20oKSAtIC41KTtcclxuXHR2YWx1ZXMucHVzaCgxMDAwICogKE1hdGgucmFuZG9tKCkgLSAuNSkpO1xyXG5cclxuXHQvLyBzdHJpbmdcclxuXHR2YWx1ZXMucHVzaChNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNykpO1xyXG5cclxuXHQvLyBhcnJheSAobWFrZSBuZXN0aW5nIGV4cG9uZW50aWFsbHkgbGVzcyBsaWtlbHkgYXQgZWFjaCBsZXZlbCBvZiByZWN1cnNpb24pXHJcblx0aWYgKE1hdGgucmFuZG9tKCkgPCBNYXRoLmV4cCgtKGRlcHRofHwwKSkpIHtcclxuXHRcdHZhciBuID0gTWF0aC5mbG9vcihNYXRoLmV4cCgzKk1hdGgucmFuZG9tKCkpKS0xO1xyXG5cdFx0dmFyIGFycmF5ID0gW107XHJcblx0XHR3aGlsZSAoYXJyYXkubGVuZ3RoIDwgbilcclxuXHRcdFx0YXJyYXkucHVzaChleHBvcnRzLmNyZWF0ZVJhbmRvbVZhbHVlKChkZXB0aHx8MCkrMSkpO1xyXG5cdFx0dmFsdWVzLnB1c2goYXJyYXkpO1xyXG5cdH1cclxuXHJcblx0Ly8gb2JqZWN0IChtYWtlIG5lc3RpbmcgZXhwb25lbnRpYWxseSBsZXNzIGxpa2VseSBhdCBlYWNoIGxldmVsIG9mIHJlY3Vyc2lvbilcclxuXHRpZiAoTWF0aC5yYW5kb20oKSA8IE1hdGguZXhwKC0oZGVwdGh8fDApKSkge1xyXG5cdFx0dmFyIG4gPSBNYXRoLmZsb29yKE1hdGguZXhwKDIuNSpNYXRoLnJhbmRvbSgpKSktMTtcclxuXHRcdHZhciBvYmogPSB7IH07XHJcblx0XHR3aGlsZSAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPCBuKVxyXG5cdFx0XHRvYmpbTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpXSA9IGV4cG9ydHMuY3JlYXRlUmFuZG9tVmFsdWUoKGRlcHRofHwwKSsxKTtcclxuXHRcdHZhbHVlcy5wdXNoKG9iaik7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdmFsdWVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHZhbHVlcy5sZW5ndGgpXTtcclxufVxyXG5cclxuZXhwb3J0cy5jcmVhdGVSYW5kb21PcCA9IGZ1bmN0aW9uKGRvYywgY29udGV4dCkge1xyXG5cdC8vIENyZWF0ZXMgYSByYW5kb20gb3BlcmF0aW9uIHRoYXQgY291bGQgYXBwbHkgdG8gZG9jLiBKdXN0XHJcblx0Ly8gY2hhaW4gb2ZmIHRvIHRoZSBtb2R1bGVzIHRoYXQgY2FuIGhhbmRsZSB0aGUgZGF0YSB0eXBlLlxyXG5cclxuXHR2YXIgbW9kdWxlcyA9IFtdO1xyXG5cclxuXHQvLyBUaGUgdmFsdWVzIG1vZHVsZSBjYW4gaGFuZGxlIGFueSBkYXRhIHR5cGUuXHJcblx0bW9kdWxlcy5wdXNoKHZhbHVlcyk7XHJcblxyXG5cdC8vIHNlcXVlbmNlcyBhcHBsaWVzIHRvIHN0cmluZ3MgYW5kIGFycmF5cy5cclxuXHRpZiAodHlwZW9mIGRvYyA9PT0gXCJzdHJpbmdcIiB8fCBBcnJheS5pc0FycmF5KGRvYykpIHtcclxuXHRcdG1vZHVsZXMucHVzaChzZXF1ZW5jZXMpO1xyXG5cdFx0Ly9tb2R1bGVzLnB1c2goY29waWVzKTtcclxuXHR9XHJcblxyXG5cdC8vIG9iamVjdHMgYXBwbGllcyB0byBvYmplY3RzIChidXQgbm90IEFycmF5IG9iamVjdHMgb3IgbnVsbClcclxuXHRlbHNlIGlmICh0eXBlb2YgZG9jID09PSBcIm9iamVjdFwiICYmIGRvYyAhPT0gbnVsbCkge1xyXG5cdFx0bW9kdWxlcy5wdXNoKG9iamVjdHMpO1xyXG5cdFx0Ly9tb2R1bGVzLnB1c2goY29waWVzKTtcclxuXHR9XHJcblxyXG5cdC8vIHRoZSBsaXN0cyBtb2R1bGUgb25seSBkZWZpbmVzIExJU1Qgd2hpY2ggY2FuIGFsc29cclxuXHQvLyBiZSBhcHBsaWVkIHRvIGFueSBkYXRhIHR5cGUgYnV0IGdpdmVzIHVzIHN0YWNrXHJcblx0Ly8gb3ZlcmZsb3dzXHJcblx0Ly9tb2R1bGVzLnB1c2gobGlzdHMpO1xyXG5cclxuXHRyZXR1cm4gbW9kdWxlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtb2R1bGVzLmxlbmd0aCldXHJcblx0XHQuY3JlYXRlUmFuZG9tT3AoZG9jLCBjb250ZXh0KTtcclxufVxyXG5cclxuZXhwb3J0cy5jcmVhdGVSYW5kb21PcFNlcXVlbmNlID0gZnVuY3Rpb24odmFsdWUsIGNvdW50KSB7XHJcblx0Ly8gQ3JlYXRlIGEgcmFuZG9tIHNlcXVlbmNlIG9mIG9wZXJhdGlvbnMgc3RhcnRpbmcgd2l0aCBhIGdpdmVuIHZhbHVlLlxyXG5cdHZhciBvcHMgPSBbXTtcclxuXHR3aGlsZSAob3BzLmxlbmd0aCA8IGNvdW50KSB7XHJcblx0XHQvLyBDcmVhdGUgcmFuZG9tIG9wZXJhdGlvbi5cclxuXHRcdHZhciBvcCA9IGV4cG9ydHMuY3JlYXRlUmFuZG9tT3AodmFsdWUpO1xyXG5cclxuXHRcdC8vIE1ha2UgdGhlIHJlc3VsdCBvZiBhcHBseWluZyB0aGUgb3AgdGhlIGluaXRpYWwgdmFsdWVcclxuXHRcdC8vIGZvciB0aGUgbmV4dCBvcGVyYXRpb24uIGNyZWF0ZVJhbmRvbU9wIHNvbWV0aW1lcyByZXR1cm5zXHJcblx0XHQvLyBpbnZhbGlkIG9wZXJhdGlvbnMsIGluIHdoaWNoIGNhc2Ugd2UnbGwgdHJ5IGFnYWluLlxyXG5cdFx0Ly8gVE9ETzogTWFrZSBjcmVhdGVSYW5kb21PcCBhbHdheXMgcmV0dXJuIGEgdmFsaWQgb3BlcmF0aW9uXHJcblx0XHQvLyBhbmQgcmVtb3ZlIHRoZSB0cnkgYmxvY2suXHJcblx0XHR0cnkge1xyXG5cdFx0XHR2YWx1ZSA9IG9wLmFwcGx5KHZhbHVlKTtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29udGludWU7IC8vIHJldHJ5XHJcblx0XHR9XHJcblxyXG5cdFx0b3BzLnB1c2gob3ApO1xyXG5cdH1cclxuXHRyZXR1cm4gbmV3IGxpc3RzLkxJU1Qob3BzKTtcclxufVxyXG5cclxuZXhwb3J0cy50eXBlX25hbWUgPSBmdW5jdGlvbih4KSB7XHJcblx0aWYgKHR5cGVvZiB4ID09ICdvYmplY3QnKSB7XHJcblx0XHRpZiAoQXJyYXkuaXNBcnJheSh4KSlcclxuXHRcdFx0cmV0dXJuICdhcnJheSc7XHJcblx0XHRyZXR1cm4gJ29iamVjdCc7XHJcblx0fVxyXG5cdHJldHVybiB0eXBlb2YgeDtcclxufVxyXG5cclxuLy8gVXRpbGl0eSBmdW5jdGlvbiB0byBjb21wYXJlIHZhbHVlcyBmb3IgdGhlIHB1cnBvc2VzIG9mXHJcbi8vIHNldHRpbmcgc29ydCBvcmRlcnMgdGhhdCByZXNvbHZlIGNvbmZsaWN0cy5cclxuZXhwb3J0cy5jbXAgPSBmdW5jdGlvbihhLCBiKSB7XHJcblx0Ly8gRm9yIG9iamVjdHMuTUlTU0lORywgbWFrZSBzdXJlIHdlIHRyeSBvYmplY3QgaWRlbnRpdHkuXHJcblx0aWYgKGEgPT09IGIpXHJcblx0XHRyZXR1cm4gMDtcclxuXHJcblx0Ly8gb2JqZWN0cy5NSVNTSU5HIGhhcyBhIGxvd2VyIHNvcnQgb3JkZXIgc28gdGhhdCBpdCB0ZW5kcyB0byBnZXQgY2xvYmJlcmVkLlxyXG5cdGlmIChhID09PSBvYmplY3RzLk1JU1NJTkcpXHJcblx0XHRyZXR1cm4gLTE7XHJcblx0aWYgKGIgPT09IG9iamVjdHMuTUlTU0lORylcclxuXHRcdHJldHVybiAxO1xyXG5cclxuXHQvLyBDb21wYXJpbmcgc3RyaW5ncyB0byBudW1iZXJzLCBudW1iZXJzIHRvIG9iamVjdHMsIGV0Yy5cclxuXHQvLyBqdXN0IHNvcnQgYmFzZWQgb24gdGhlIHR5cGUgbmFtZS5cclxuXHRpZiAoZXhwb3J0cy50eXBlX25hbWUoYSkgIT0gZXhwb3J0cy50eXBlX25hbWUoYikpIHtcclxuXHRcdHJldHVybiBleHBvcnRzLmNtcChleHBvcnRzLnR5cGVfbmFtZShhKSwgZXhwb3J0cy50eXBlX25hbWUoYikpO1xyXG5cdFxyXG5cdH0gZWxzZSBpZiAodHlwZW9mIGEgPT0gXCJudW1iZXJcIikge1xyXG5cdFx0aWYgKGEgPCBiKVxyXG5cdFx0XHRyZXR1cm4gLTE7XHJcblx0XHRpZiAoYSA+IGIpXHJcblx0XHRcdHJldHVybiAxO1xyXG5cdFx0cmV0dXJuIDA7XHJcblx0XHRcclxuXHR9IGVsc2UgaWYgKHR5cGVvZiBhID09IFwic3RyaW5nXCIpIHtcclxuXHRcdHJldHVybiBhLmxvY2FsZUNvbXBhcmUoYik7XHJcblx0XHJcblx0fSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGEpKSB7XHJcblx0XHQvLyBGaXJzdCBjb21wYXJlIG9uIGxlbmd0aC5cclxuXHRcdHZhciB4ID0gZXhwb3J0cy5jbXAoYS5sZW5ndGgsIGIubGVuZ3RoKTtcclxuXHRcdGlmICh4ICE9IDApIHJldHVybiB4O1xyXG5cclxuXHRcdC8vIFNhbWUgbGVuZ3RoLCBjb21wYXJlIG9uIHZhbHVlcy5cclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHR4ID0gZXhwb3J0cy5jbXAoYVtpXSwgYltpXSk7XHJcblx0XHRcdGlmICh4ICE9IDApIHJldHVybiB4O1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiAwO1xyXG5cdH1cclxuXHJcblx0Ly8gQ29tcGFyZSBvbiBzdHJpbmdzLlxyXG5cdC8vIFRPRE86IEZpbmQgYSBiZXR0ZXIgd2F5IHRvIHNvcnQgb2JqZWN0cy5cclxuXHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkoYSkubG9jYWxlQ29tcGFyZShKU09OLnN0cmluZ2lmeShiKSk7XHJcbn1cclxuXHJcbiIsIi8qICBUaGlzIG1vZHVsZSBkZWZpbmVzIG9uZSBvcGVyYXRpb246XHJcblx0XHJcblx0TElTVChbb3AxLCBvcDIsIC4uLl0pXHJcblx0XHJcblx0QSBjb21wb3NpdGlvbiBvZiB6ZXJvIG9yIG1vcmUgb3BlcmF0aW9ucywgZ2l2ZW4gYXMgYW4gYXJyYXkuXHJcblxyXG5cdCovXHJcblx0XHJcbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XHJcblxyXG52YXIgc2hhbGxvd19jbG9uZSA9IHJlcXVpcmUoJ3NoYWxsb3ctY2xvbmUnKTtcclxuXHJcbnZhciBqb3QgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKTtcclxudmFyIHZhbHVlcyA9IHJlcXVpcmUoJy4vdmFsdWVzLmpzJyk7XHJcblxyXG5leHBvcnRzLm1vZHVsZV9uYW1lID0gJ2xpc3RzJzsgLy8gZm9yIHNlcmlhbGl6YXRpb24vZGVzZXJpYWxpemF0aW9uXHJcblxyXG5leHBvcnRzLkxJU1QgPSBmdW5jdGlvbiAob3BzKSB7XHJcblx0aWYgKCFBcnJheS5pc0FycmF5KG9wcykpIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IG11c3QgYmUgYW4gYXJyYXkuXCIpO1xyXG5cdG9wcy5mb3JFYWNoKGZ1bmN0aW9uKG9wKSB7XHJcblx0XHRpZiAoIShvcCBpbnN0YW5jZW9mIGpvdC5CYXNlT3BlcmF0aW9uKSlcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgbXVzdCBiZSBhbiBhcnJheSBjb250YWluaW5nIG9wZXJhdGlvbnMgKGZvdW5kIFwiICsgb3AgKyBcIikuXCIpO1xyXG5cdH0pXHJcblx0dGhpcy5vcHMgPSBvcHM7IC8vIFRPRE86IEhvdyB0byBlbnN1cmUgdGhpcyBhcnJheSBpcyBpbW11dGFibGU/XHJcblx0T2JqZWN0LmZyZWV6ZSh0aGlzKTtcclxufVxyXG5leHBvcnRzLkxJU1QucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShqb3QuQmFzZU9wZXJhdGlvbi5wcm90b3R5cGUpOyAvLyBpbmhlcml0XHJcbmpvdC5hZGRfb3AoZXhwb3J0cy5MSVNULCBleHBvcnRzLCAnTElTVCcpO1xyXG5cclxuZXhwb3J0cy5MSVNULnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24oZGVwdGgpIHtcclxuXHRyZXR1cm4gdXRpbC5mb3JtYXQoXCI8TElTVCBbJXNdPlwiLFxyXG5cdFx0dGhpcy5vcHMubWFwKGZ1bmN0aW9uKGl0ZW0pIHsgcmV0dXJuIGl0ZW0uaW5zcGVjdChkZXB0aC0xKSB9KS5qb2luKFwiLCBcIikpO1xyXG59XHJcblxyXG5leHBvcnRzLkxJU1QucHJvdG90eXBlLnZpc2l0ID0gZnVuY3Rpb24odmlzaXRvcikge1xyXG5cdC8vIEEgc2ltcGxlIHZpc2l0b3IgcGFyYWRpZ20uIFJlcGxhY2UgdGhpcyBvcGVyYXRpb24gaW5zdGFuY2UgaXRzZWxmXHJcblx0Ly8gYW5kIGFueSBvcGVyYXRpb24gd2l0aGluIGl0IHdpdGggdGhlIHZhbHVlIHJldHVybmVkIGJ5IGNhbGxpbmdcclxuXHQvLyB2aXNpdG9yIG9uIGl0c2VsZiwgb3IgaWYgdGhlIHZpc2l0b3IgcmV0dXJucyBhbnl0aGluZyBmYWxzZXlcclxuXHQvLyAocHJvYmFibHkgdW5kZWZpbmVkKSB0aGVuIHJldHVybiB0aGUgb3BlcmF0aW9uIHVuY2hhbmdlZC5cclxuXHR2YXIgcmV0ID0gbmV3IGV4cG9ydHMuTElTVCh0aGlzLm9wcy5tYXAoZnVuY3Rpb24ob3ApIHsgcmV0dXJuIG9wLnZpc2l0KHZpc2l0b3IpOyB9KSk7XHJcblx0cmV0dXJuIHZpc2l0b3IocmV0KSB8fCByZXQ7XHJcbn1cclxuXHJcbmV4cG9ydHMuTElTVC5wcm90b3R5cGUuaW50ZXJuYWxUb0pTT04gPSBmdW5jdGlvbihqc29uLCBwcm90b2NvbF92ZXJzaW9uKSB7XHJcblx0anNvbi5vcHMgPSB0aGlzLm9wcy5tYXAoZnVuY3Rpb24ob3ApIHtcclxuXHRcdHJldHVybiBvcC50b0pTT04odW5kZWZpbmVkLCBwcm90b2NvbF92ZXJzaW9uKTtcclxuXHR9KTtcclxufVxyXG5cclxuZXhwb3J0cy5MSVNULmludGVybmFsRnJvbUpTT04gPSBmdW5jdGlvbihqc29uLCBwcm90b2NvbF92ZXJzaW9uLCBvcF9tYXApIHtcclxuXHR2YXIgb3BzID0ganNvbi5vcHMubWFwKGZ1bmN0aW9uKG9wKSB7XHJcblx0XHRyZXR1cm4gam90Lm9wRnJvbUpTT04ob3AsIHByb3RvY29sX3ZlcnNpb24sIG9wX21hcCk7XHJcblx0fSk7XHJcblx0cmV0dXJuIG5ldyBleHBvcnRzLkxJU1Qob3BzKTtcclxufVxyXG5cclxuZXhwb3J0cy5MSVNULnByb3RvdHlwZS5hcHBseSA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xyXG5cdC8qIEFwcGxpZXMgdGhlIG9wZXJhdGlvbiB0byBhIGRvY3VtZW50LiovXHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm9wcy5sZW5ndGg7IGkrKylcclxuXHRcdGRvY3VtZW50ID0gdGhpcy5vcHNbaV0uYXBwbHkoZG9jdW1lbnQpO1xyXG5cdHJldHVybiBkb2N1bWVudDtcclxufVxyXG5cclxuZXhwb3J0cy5MSVNULnByb3RvdHlwZS5zaW1wbGlmeSA9IGZ1bmN0aW9uIChhZ2dyZXNzaXZlKSB7XHJcblx0LyogUmV0dXJucyBhIG5ldyBvcGVyYXRpb24gdGhhdCBpcyBhIHNpbXBsZXIgdmVyc2lvblxyXG5cdCAgIG9mIHRoaXMgb3BlcmF0aW9uLiBDb21wb3NlcyBjb25zZWN1dGl2ZSBvcGVyYXRpb25zIHdoZXJlXHJcblx0ICAgcG9zc2libGUgYW5kIHJlbW92ZXMgbm8tb3BzLiBSZXR1cm5zIE5PX09QIGlmIHRoZSByZXN1bHRcclxuXHQgICB3b3VsZCBiZSBhbiBlbXB0eSBsaXN0IG9mIG9wZXJhdGlvbnMuIFJldHVybnMgYW5cclxuXHQgICBhdG9taWMgKG5vbi1MSVNUKSBvcGVyYXRpb24gaWYgcG9zc2libGUuICovXHJcblx0dmFyIG5ld19vcHMgPSBbXTtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMub3BzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHR2YXIgb3AgPSB0aGlzLm9wc1tpXTtcclxuXHJcblx0XHQvLyBzaW1wbGlmeSB0aGUgaW5uZXIgb3BcclxuXHRcdG9wID0gb3Auc2ltcGxpZnkoKTtcclxuXHJcblx0XHQvLyBpZiB0aGlzIGlzbid0IHRoZSBmaXJzdCBvcGVyYXRpb24sIHRyeSB0byBhdG9taWNfY29tcG9zZSB0aGUgb3BlcmF0aW9uXHJcblx0XHQvLyB3aXRoIHRoZSBwcmV2aW91cyBvbmUuXHJcblx0XHR3aGlsZSAobmV3X29wcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdC8vIERvbid0IGJvdGhlciB3aXRoIGF0b21pY19jb21wb3NlIGlmIHRoZSBvcCB0byBhZGQgaXMgYSBuby1vcC5cclxuXHRcdFx0aWYgKG9wLmlzTm9PcCgpKVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0dmFyIGMgPSBuZXdfb3BzW25ld19vcHMubGVuZ3RoLTFdLmNvbXBvc2Uob3AsIHRydWUpO1xyXG5cclxuXHRcdFx0Ly8gSWYgdGhlcmUgaXMgbm8gYXRvbWljIGNvbXBvc2l0aW9uLCB0aGVyZSdzIG5vdGhpbmcgbW9yZSB3ZSBjYW4gZG8uXHJcblx0XHRcdGlmICghYylcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdC8vIFRoZSBhdG9taWMgY29tcG9zaXRpb24gd2FzIHN1Y2Nlc3NmdWwuIFJlbW92ZSB0aGUgb2xkIHByZXZpb3VzIG9wZXJhdGlvbi5cclxuXHRcdFx0bmV3X29wcy5wb3AoKTtcclxuXHJcblx0XHRcdC8vIFVzZSB0aGUgYXRvbWljX2NvbXBvc2l0aW9uIGFzIHRoZSBuZXh0IG9wIHRvIGFkZC4gT24gdGhlIG5leHQgaXRlcmF0aW9uXHJcblx0XHRcdC8vIHRyeSBjb21wb3NpbmcgaXQgd2l0aCB0aGUgbmV3IGxhc3QgZWxlbWVudCBvZiBuZXdfb3BzLlxyXG5cdFx0XHRvcCA9IGM7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRG9uJ3QgYWRkIHRvIHRoZSBuZXcgbGlzdCBpZiBpdCBpcyBhIG5vLW9wLlxyXG5cdFx0aWYgKG9wLmlzTm9PcCgpKVxyXG5cdFx0XHRjb250aW51ZTtcclxuXHJcblx0XHQvLyBpZiBpdCdzIHRoZSBmaXJzdCBvcGVyYXRpb24sIG9yIGF0b21pY19jb21wb3NlIGZhaWxlZCwgYWRkIGl0IHRvIHRoZSBuZXdfb3BzIGxpc3RcclxuXHRcdG5ld19vcHMucHVzaChvcCk7XHJcblx0fVxyXG5cclxuXHRpZiAobmV3X29wcy5sZW5ndGggPT0gMClcclxuXHRcdHJldHVybiBuZXcgdmFsdWVzLk5PX09QKCk7XHJcblx0aWYgKG5ld19vcHMubGVuZ3RoID09IDEpXHJcblx0XHRyZXR1cm4gbmV3X29wc1swXTtcclxuXHJcblx0cmV0dXJuIG5ldyBleHBvcnRzLkxJU1QobmV3X29wcyk7XHJcbn1cclxuXHJcbmV4cG9ydHMuTElTVC5wcm90b3R5cGUuaW52ZXJzZSA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xyXG5cdC8qIFJldHVybnMgYSBuZXcgYXRvbWljIG9wZXJhdGlvbiB0aGF0IGlzIHRoZSBpbnZlcnNlIG9mIHRoaXMgb3BlcmF0aW9uOlxyXG5cdCAgIHRoZSBpbnZlcnNlIG9mIGVhY2ggb3BlcmF0aW9uIGluIHJldmVyc2Ugb3JkZXIuICovXHJcblx0dmFyIG5ld19vcHMgPSBbXTtcclxuXHR0aGlzLm9wcy5mb3JFYWNoKGZ1bmN0aW9uKG9wKSB7XHJcblx0XHRuZXdfb3BzLnB1c2gob3AuaW52ZXJzZShkb2N1bWVudCkpO1xyXG5cdFx0ZG9jdW1lbnQgPSBvcC5hcHBseShkb2N1bWVudCk7XHJcblx0fSlcclxuXHRuZXdfb3BzLnJldmVyc2UoKTtcclxuXHRyZXR1cm4gbmV3IGV4cG9ydHMuTElTVChuZXdfb3BzKTtcclxufVxyXG5cclxuZXhwb3J0cy5MSVNULnByb3RvdHlwZS5hdG9taWNfY29tcG9zZSA9IGZ1bmN0aW9uIChvdGhlcikge1xyXG5cdC8qIFJldHVybnMgYSBMSVNUIG9wZXJhdGlvbiB0aGF0IGhhcyB0aGUgc2FtZSByZXN1bHQgYXMgdGhpc1xyXG5cdCAgIGFuZCBvdGhlciBhcHBsaWVkIGluIHNlcXVlbmNlICh0aGlzIGZpcnN0LCBvdGhlciBhZnRlcikuICovXHJcblxyXG5cdC8vIE5vdGhpbmcgaGVyZSBhbnl3YXksIHJldHVybiB0aGUgb3RoZXIuXHJcblx0aWYgKHRoaXMub3BzLmxlbmd0aCA9PSAwKVxyXG5cdFx0cmV0dXJuIG90aGVyO1xyXG5cclxuXHQvLyB0aGUgbmV4dCBvcGVyYXRpb24gaXMgYW4gZW1wdHkgbGlzdCwgc28gdGhlIGNvbXBvc2l0aW9uIGlzIGp1c3QgdGhpc1xyXG5cdGlmIChvdGhlciBpbnN0YW5jZW9mIGV4cG9ydHMuTElTVCkge1xyXG5cdFx0aWYgKG90aGVyLm9wcy5sZW5ndGggPT0gMClcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHRcclxuXHRcdC8vIGNvbmNhdGVuYXRlXHJcblx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTElTVCh0aGlzLm9wcy5jb25jYXQob3RoZXIub3BzKSk7XHJcblx0fVxyXG5cclxuXHJcblx0Ly8gYXBwZW5kXHJcblx0dmFyIG5ld19vcHMgPSB0aGlzLm9wcy5zbGljZSgpOyAvLyBjbG9uZVxyXG5cdG5ld19vcHMucHVzaChvdGhlcik7XHJcblx0cmV0dXJuIG5ldyBleHBvcnRzLkxJU1QobmV3X29wcyk7XHJcbn1cclxuXHJcbmV4cG9ydHMucmViYXNlID0gZnVuY3Rpb24oYmFzZSwgb3BzLCBjb25mbGljdGxlc3MsIGRlYnVnKSB7XHJcblx0Ly8gRW5zdXJlIHRoZSBvcGVyYXRpb25zIGFyZSBzaW1wbGlmaWVkLCBzaW5jZSByZWJhc2VcclxuXHQvLyBpcyBtdWNoIG1vcmUgZXhwZW5zaXZlIHRoYW4gc2ltcGxpZmllZC5cclxuXHJcblx0YmFzZSA9IGJhc2Uuc2ltcGxpZnkoKTtcclxuXHRvcHMgPSBvcHMuc2ltcGxpZnkoKTtcclxuXHJcblx0Ly8gVHVybiBlYWNoIGFyZ3VtZW50IGludG8gYW4gYXJyYXkgb2Ygb3BlcmF0aW9ucy5cclxuXHQvLyBJZiBhbiBhcmd1bWVudCBpcyBhIExJU1QsIHVud3JhcCBpdC5cclxuXHJcblx0aWYgKGJhc2UgaW5zdGFuY2VvZiBleHBvcnRzLkxJU1QpXHJcblx0XHRiYXNlID0gYmFzZS5vcHM7XHJcblx0ZWxzZVxyXG5cdFx0YmFzZSA9IFtiYXNlXTtcclxuXHJcblx0aWYgKG9wcyBpbnN0YW5jZW9mIGV4cG9ydHMuTElTVClcclxuXHRcdG9wcyA9IG9wcy5vcHM7XHJcblx0ZWxzZVxyXG5cdFx0b3BzID0gW29wc107XHJcblxyXG5cdC8vIFJ1biB0aGUgcmViYXNlIGFsZ29yaXRobS5cclxuXHJcblx0dmFyIHJldCA9IHJlYmFzZV9hcnJheShiYXNlLCBvcHMsIGNvbmZsaWN0bGVzcywgZGVidWcpO1xyXG5cclxuXHQvLyBUaGUgcmViYXNlIG1heSBoYXZlIGZhaWxlZC5cclxuXHRpZiAocmV0ID09IG51bGwpIHJldHVybiBudWxsO1xyXG5cclxuXHQvLyAuLi5vciB5aWVsZGVkIG5vIG9wZXJhdGlvbnMgLS0tIHR1cm4gaXQgaW50byBhIE5PX09QIG9wZXJhdGlvbi5cclxuXHRpZiAocmV0Lmxlbmd0aCA9PSAwKSByZXR1cm4gbmV3IHZhbHVlcy5OT19PUCgpO1xyXG5cclxuXHQvLyAuLi5vciB5aWVsZGVkIGEgc2luZ2xlIG9wZXJhdGlvbiAtLS0gcmV0dXJuIGl0LlxyXG5cdGlmIChyZXQubGVuZ3RoID09IDEpIHJldHVybiByZXRbMF07XHJcblxyXG5cdC8vIC4uLm9yIHlpZWxkZWQgYSBsaXN0IG9mIG9wZXJhdGlvbnMgLS0tIHJlLXdyYXAgaXQgaW4gYSBMSVNUIG9wZXJhdGlvbi5cclxuXHRyZXR1cm4gbmV3IGV4cG9ydHMuTElTVChyZXQpLnNpbXBsaWZ5KCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYmFzZV9hcnJheShiYXNlLCBvcHMsIGNvbmZsaWN0bGVzcywgZGVidWcpIHtcclxuXHQvKiBUaGlzIGlzIG9uZSBvZiB0aGUgY29yZSBmdW5jdGlvbnMgb2YgdGhlIGxpYnJhcnk6IHJlYmFzaW5nIGEgc2VxdWVuY2VcclxuXHQgICBvZiBvcGVyYXRpb25zIGFnYWluc3QgYW5vdGhlciBzZXF1ZW5jZSBvZiBvcGVyYXRpb25zLiAqL1xyXG5cclxuXHQvKlxyXG5cdCogVG8gc2VlIHRoZSBsb2dpYywgaXQgd2lsbCBoZWxwIHRvIHB1dCB0aGlzIGluIGEgc3ltYm9saWMgZm9ybS5cclxuXHQqXHJcblx0KiAgIExldCBhICsgYiA9PSBjb21wb3NlKGEsIGIpXHJcblx0KiAgIGFuZCBhIC8gYiA9PSByZWJhc2UoYiwgYSlcclxuXHQqXHJcblx0KiBUaGUgY29udHJhY3Qgb2YgcmViYXNlIGhhcyB0d28gcGFydHM7XHJcblx0KlxyXG5cdCogXHQxKSBhICsgKGIvYSkgPT0gYiArIChhL2IpXHJcblx0KiBcdDIpIHgvKGEgKyBiKSA9PSAoeC9hKS9iXHJcblx0KlxyXG5cdCogQWxzbyBub3RlIHRoYXQgdGhlIGNvbXBvc2Ugb3BlcmF0b3IgaXMgYXNzb2NpYXRpdmUsIHNvXHJcblx0KlxyXG5cdCpcdGEgKyAoYitjKSA9PSAoYStiKSArIGNcclxuXHQqXHJcblx0KiBPdXIgcmV0dXJuIHZhbHVlIGhlcmUgaW4gc3ltYm9saWMgZm9ybSBpczpcclxuXHQqXHJcblx0KiAgIChvcDEvYmFzZSkgKyAob3AyLyhiYXNlL29wMSkpXHJcblx0KiAgIHdoZXJlIG9wcyA9IG9wMSArIG9wMlxyXG5cdCpcclxuXHQqIFRvIHNlZSB0aGF0IHdlJ3ZlIGltcGxlbWVudGVkIHJlYmFzZSBjb3JyZWN0bHksIGxldCdzIGxvb2tcclxuXHQqIGF0IHdoYXQgaGFwcGVucyB3aGVuIHdlIGNvbXBvc2Ugb3VyIHJlc3VsdCB3aXRoIGJhc2UgYXMgcGVyXHJcblx0KiB0aGUgcmViYXNlIHJ1bGU6XHJcblx0KlxyXG5cdCogICBiYXNlICsgKG9wcy9iYXNlKVxyXG5cdCpcclxuXHQqIEFuZCB0aGVuIGRvIHNvbWUgYWxnZWJyYWljIG1hbmlwdWxhdGlvbnM6XHJcblx0KlxyXG5cdCogICBiYXNlICsgWyAob3AxL2Jhc2UpICsgKG9wMi8oYmFzZS9vcDEpKSBdICAgKHN1YnN0aXR1dGluZyBvdXIgaHlwb3RoZXNpcyBmb3Igc2VsZi9iYXNlKVxyXG5cdCogICBbIGJhc2UgKyAob3AxL2Jhc2UpIF0gKyAob3AyLyhiYXNlL29wMSkpICAgKGFzc29jaWF0aXZpdHkpXHJcblx0KiAgIFsgb3AxICsgKGJhc2Uvb3AxKSBdICsgKG9wMi8oYmFzZS9vcDEpKSAgICAocmViYXNlJ3MgY29udHJhY3Qgb24gdGhlIGxlZnQgc2lkZSlcclxuXHQqICAgb3AxICsgWyAoYmFzZS9vcDEpICArIChvcDIvKGJhc2Uvb3AxKSkgXSAgIChhc3NvY2lhdGl2aXR5KVxyXG5cdCogICBvcDEgKyBbIG9wMiArICgoYmFzZS9vcDEpL29wMikgXSAgICAgICAgICAgKHJlYmFzZSdzIGNvbnRyYWN0IG9uIHRoZSByaWdodCBzaWRlKVxyXG5cdCogICAob3AxICsgb3AyKSArICgoYmFzZS9vcDEpL29wMikgICAgICAgICAgICAgKGFzc29jaWF0aXZpdHkpXHJcblx0KiAgIHNlbGYgKyBbKGJhc2Uvb3AxKS9vcDJdICAgICAgICAgICAgICAgICAgICAoc3Vic3RpdHV0aW5nIHNlbGYgZm9yIChvcDErb3AyKSlcclxuXHQqICAgc2VsZiArIFtiYXNlLyhvcDErb3AyKV0gICAgICAgICAgICAgICAgICAgIChyZWJhc2UncyBzZWNvbmQgY29udHJhY3QpXHJcblx0KiAgIHNlbGYgKyAoYmFzZS9zZWxmKSAgICAgICAgICAgICAgICAgICAgICAgICAoc3Vic3RpdHV0aW9uKVxyXG5cdCpcclxuXHQqIFRodXMgd2UndmUgcHJvdmVkIHRoYXQgdGhlIHJlYmFzZSBjb250cmFjdCBob2xkcyBmb3Igb3VyIHJldHVybiB2YWx1ZS5cclxuXHQqL1xyXG5cclxuXHRpZiAob3BzLmxlbmd0aCA9PSAwIHx8IGJhc2UubGVuZ3RoID09IDApXHJcblx0XHRyZXR1cm4gb3BzO1xyXG5cclxuXHRpZiAob3BzLmxlbmd0aCA9PSAxICYmIGJhc2UubGVuZ3RoID09IDEpIHtcclxuXHRcdC8vIFRoaXMgaXMgdGhlIHJlY3Vyc2l2ZSBiYXNlIGNhc2U6IFJlYmFzaW5nIGEgc2luZ2xlIG9wZXJhdGlvbiBhZ2FpbnN0IGEgc2luZ2xlXHJcblx0XHQvLyBvcGVyYXRpb24uIFdyYXAgdGhlIHJlc3VsdCBpbiBhbiBhcnJheS5cclxuXHRcdHZhciBvcCA9IG9wc1swXS5yZWJhc2UoYmFzZVswXSwgY29uZmxpY3RsZXNzLCBkZWJ1Zyk7XHJcblx0XHRpZiAoIW9wKSByZXR1cm4gbnVsbDsgLy8gY29uZmxpY3RcclxuXHRcdGlmIChvcCBpbnN0YW5jZW9mIGpvdC5OT19PUCkgcmV0dXJuIFtdO1xyXG5cdFx0aWYgKG9wIGluc3RhbmNlb2Ygam90LkxJU1QpIHJldHVybiBvcC5vcHM7XHJcblx0XHRyZXR1cm4gW29wXTtcclxuXHR9XHJcblx0XHJcblx0aWYgKGRlYnVnKSB7XHJcblx0XHQvLyBXcmFwIHRoZSBkZWJ1ZyBmdW5jdGlvbiB0byBlbWl0IGFuIGV4dHJhIGFyZ3VtZW50IHRvIHNob3cgZGVwdGguXHJcblx0XHRkZWJ1ZyhcInJlYmFzaW5nXCIsIG9wcywgXCJvblwiLCBiYXNlLCBjb25mbGljdGxlc3MgPyBcImNvbmZsaWN0bGVzc1wiIDogXCJcIiwgXCJkb2N1bWVudFwiIGluIGNvbmZsaWN0bGVzcyA/IEpTT04uc3RyaW5naWZ5KGNvbmZsaWN0bGVzcy5kb2N1bWVudCkgOiBcIlwiLCBcIi4uLlwiKTtcclxuXHRcdHZhciBvcmlnaW5hbF9kZWJ1ZyA9IGRlYnVnO1xyXG5cdFx0ZGVidWcgPSBmdW5jdGlvbigpIHsgdmFyIGFyZ3MgPSBbXCI+XCJdLmNvbmNhdChBcnJheS5mcm9tKGFyZ3VtZW50cykpOyBvcmlnaW5hbF9kZWJ1Zy5hcHBseShudWxsLCBhcmdzKTsgfVxyXG5cdH1cclxuXHRcclxuXHRpZiAoYmFzZS5sZW5ndGggPT0gMSkge1xyXG5cdFx0Ly8gUmViYXNlIG1vcmUgdGhhbiBvbmUgb3BlcmF0aW9uIChvcHMpIGFnYWluc3QgYSBzaW5nbGUgb3BlcmF0aW9uIChiYXNlWzBdKS5cclxuXHJcblx0XHQvLyBOb3RoaW5nIHRvIGRvIGlmIGl0IGlzIGEgbm8tb3AuXHJcblx0XHRpZiAoYmFzZVswXSBpbnN0YW5jZW9mIHZhbHVlcy5OT19PUClcclxuXHRcdFx0cmV0dXJuIG9wcztcclxuXHJcblx0XHQvLyBUaGUgcmVzdWx0IGlzIHRoZSBmaXJzdCBvcGVyYXRpb24gaW4gb3BzIHJlYmFzZWQgYWdhaW5zdCB0aGUgYmFzZSBjb25jYXRlbmF0ZWQgd2l0aFxyXG5cdFx0Ly8gdGhlIHJlbWFpbmRlciBvZiBvcHMgcmViYXNlZCBhZ2FpbnN0IHRoZS1iYXNlLXJlYmFzZWQtYWdhaW5zdC10aGUtZmlyc3Qtb3BlcmF0aW9uOlxyXG5cdFx0Ly8gKG9wMS9iYXNlKSArIChvcDIvKGJhc2Uvb3AxKSlcclxuXHJcblx0XHR2YXIgb3AxID0gb3BzLnNsaWNlKDAsIDEpOyAvLyBmaXJzdCBvcGVyYXRpb25cclxuXHRcdHZhciBvcDIgPSBvcHMuc2xpY2UoMSk7IC8vIHJlbWFpbmluZyBvcGVyYXRpb25zXHJcblx0XHRcclxuXHRcdHZhciByMSA9IHJlYmFzZV9hcnJheShiYXNlLCBvcDEsIGNvbmZsaWN0bGVzcywgZGVidWcpO1xyXG5cdFx0aWYgKHIxID09IG51bGwpIHJldHVybiBudWxsOyAvLyByZWJhc2UgZmFpbGVkXHJcblx0XHRcclxuXHRcdHZhciByMiA9IHJlYmFzZV9hcnJheShvcDEsIGJhc2UsIGNvbmZsaWN0bGVzcywgZGVidWcpO1xyXG5cdFx0aWYgKHIyID09IG51bGwpIHJldHVybiBudWxsOyAvLyByZWJhc2UgZmFpbGVkIChtdXN0IGJlIHRoZSBzYW1lIGFzIHIxLCBzbyB0aGlzIHRlc3Qgc2hvdWxkIG5ldmVyIHN1Y2NlZWQpXHJcblx0XHRcclxuXHRcdC8vIEZvciB0aGUgcmVtYWluZGVyIG9wZXJhdGlvbnMsIHdlIGhhdmUgdG8gYWRqdXN0IHRoZSAnY29uZmxpY3RsZXNzJyBvYmplY3QuXHJcblx0XHQvLyBJZiBpdCBwcm92aWRlcyB0aGUgYmFzZSBkb2N1bWVudCBzdGF0ZSwgdGhlbiB3ZSBoYXZlIHRvIGFkdmFuY2UgdGhlIGRvY3VtZW50XHJcblx0XHQvLyBmb3IgdGhlIGFwcGxpY2F0aW9uIG9mIG9wMS5cclxuXHRcdHZhciBjb25mbGljdGxlc3MyID0gbnVsbDtcclxuXHRcdGlmIChjb25mbGljdGxlc3MpIHtcclxuXHRcdFx0Y29uZmxpY3RsZXNzMiA9IHNoYWxsb3dfY2xvbmUoY29uZmxpY3RsZXNzKTtcclxuXHRcdFx0aWYgKFwiZG9jdW1lbnRcIiBpbiBjb25mbGljdGxlc3MyKVxyXG5cdFx0XHRcdGNvbmZsaWN0bGVzczIuZG9jdW1lbnQgPSBvcDFbMF0uYXBwbHkoY29uZmxpY3RsZXNzMi5kb2N1bWVudCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHIzID0gcmViYXNlX2FycmF5KHIyLCBvcDIsIGNvbmZsaWN0bGVzczIsIGRlYnVnKTtcclxuXHRcdGlmIChyMyA9PSBudWxsKSByZXR1cm4gbnVsbDsgLy8gcmViYXNlIGZhaWxlZFxyXG5cdFx0XHJcblx0XHQvLyByZXR1cm5zIGEgbmV3IGFycmF5XHJcblx0XHRyZXR1cm4gcjEuY29uY2F0KHIzKTtcclxuXHJcblx0fSBlbHNlIHtcclxuXHRcdC8vIFJlYmFzZSBvbmUgb3IgbW9yZSBvcGVyYXRpb25zIChvcHMpIGFnYWluc3QgbW9yZSB0aGFuIG9uZSBvcGVyYXRpb24gKGJhc2UpLlxyXG5cdFx0Ly9cclxuXHRcdC8vIEZyb20gdGhlIHNlY29uZCBwYXJ0IG9mIHRoZSByZWJhc2UgY29udHJhY3QsIHdlIGNhbiByZWJhc2Ugb3BzXHJcblx0XHQvLyBhZ2FpbnN0IGVhY2ggb3BlcmF0aW9uIGluIHRoZSBiYXNlIHNlcXVlbnRpYWxseSAoYmFzZVswXSwgYmFzZVsxXSwgLi4uKS5cclxuXHRcdFxyXG5cdFx0Ly8gc2hhbGxvdyBjbG9uZVxyXG5cdFx0Y29uZmxpY3RsZXNzID0gIWNvbmZsaWN0bGVzcyA/IG51bGwgOiBzaGFsbG93X2Nsb25lKGNvbmZsaWN0bGVzcyk7XHJcblxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBiYXNlLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdG9wcyA9IHJlYmFzZV9hcnJheShbYmFzZVtpXV0sIG9wcywgY29uZmxpY3RsZXNzLCBkZWJ1Zyk7XHJcblx0XHRcdGlmIChvcHMgPT0gbnVsbCkgcmV0dXJuIG51bGw7IC8vIGNvbmZsaWN0XHJcblxyXG5cdFx0XHQvLyBBZGp1c3QgdGhlICdjb25mbGljdGxlc3MnIG9iamVjdCBpZiBpdCBwcm92aWRlcyB0aGUgYmFzZSBkb2N1bWVudCBzdGF0ZVxyXG5cdFx0XHQvLyBzaW5jZSBmb3IgbGF0ZXIgb3BlcmF0aW9ucyB3ZSdyZSBhc3N1bWluZyBiYXNlW2ldIGhhcyBub3cgYmVlbiBhcHBsaWVkLlxyXG5cdFx0XHRpZiAoY29uZmxpY3RsZXNzICYmIFwiZG9jdW1lbnRcIiBpbiBjb25mbGljdGxlc3MpXHJcblx0XHRcdFx0Y29uZmxpY3RsZXNzLmRvY3VtZW50ID0gYmFzZVtpXS5hcHBseShjb25mbGljdGxlc3MuZG9jdW1lbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBvcHM7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnRzLkxJU1QucHJvdG90eXBlLmRyaWxsZG93biA9IGZ1bmN0aW9uKGluZGV4X29yX2tleSkge1xyXG5cdHJldHVybiBuZXcgZXhwb3J0cy5MSVNUKHRoaXMub3BzLm1hcChmdW5jdGlvbihvcCkge1xyXG5cdFx0cmV0dXJuIG9wLmRyaWxsZG93bihpbmRleF9vcl9rZXkpXHJcblx0fSkpLnNpbXBsaWZ5KCk7XHJcbn1cclxuXHJcbmV4cG9ydHMuY3JlYXRlUmFuZG9tT3AgPSBmdW5jdGlvbihkb2MsIGNvbnRleHQpIHtcclxuXHQvLyBDcmVhdGUgYSByYW5kb20gTElTVCB0aGF0IGNvdWxkIGFwcGx5IHRvIGRvYy5cclxuXHR2YXIgb3BzID0gW107XHJcblx0d2hpbGUgKG9wcy5sZW5ndGggPT0gMCB8fCBNYXRoLnJhbmRvbSgpIDwgLjc1KSB7XHJcblx0XHRvcHMucHVzaChqb3QuY3JlYXRlUmFuZG9tT3AoZG9jLCBjb250ZXh0KSk7XHJcblx0XHRkb2MgPSBvcHNbb3BzLmxlbmd0aC0xXS5hcHBseShkb2MpO1xyXG5cdH1cclxuXHRyZXR1cm4gbmV3IGV4cG9ydHMuTElTVChvcHMpO1xyXG59XHJcbiIsIi8qIEEgbGlicmFyeSBvZiBvcGVyYXRpb25zIGZvciBvYmplY3RzIChpLmUuIEpTT04gb2JqZWN0cy9KYXZhc2NyaXB0IGFzc29jaWF0aXZlIGFycmF5cykuXHJcblxyXG4gICBuZXcgb2JqZWN0cy5QVVQoa2V5LCB2YWx1ZSlcclxuICAgIFxyXG4gICAgQ3JlYXRlcyBhIHByb3BlcnR5IHdpdGggdGhlIGdpdmVuIHZhbHVlLiBUaGlzIGlzIGFuIGFsaWFzIGZvclxyXG4gICAgbmV3IG9iamVjdHMuQVBQTFkoa2V5LCBuZXcgdmFsdWVzLlNFVCh2YWx1ZSkpLlxyXG5cclxuICAgbmV3IG9iamVjdHMuUkVNKGtleSlcclxuICAgIFxyXG4gICAgUmVtb3ZlcyBhIHByb3BlcnR5IGZyb20gYW4gb2JqZWN0LiBUaGlzIGlzIGFuIGFsaWFzIGZvclxyXG4gICAgbmV3IG9iamVjdHMuQVBQTFkoa2V5LCBuZXcgdmFsdWVzLlNFVChvYmplY3RzLk1JU1NJTkcpKS5cclxuXHJcbiAgIG5ldyBvYmplY3RzLkFQUExZKGtleSwgb3BlcmF0aW9uKVxyXG4gICBuZXcgb2JqZWN0cy5BUFBMWSh7a2V5OiBvcGVyYXRpb24sIC4uLn0pXHJcblxyXG4gICAgQXBwbGllcyBhbnkgb3BlcmF0aW9uIHRvIGEgcHJvcGVydHksIG9yIG11bHRpcGxlIG9wZXJhdGlvbnMgdG8gdmFyaW91c1xyXG4gICAgcHJvcGVydGllcywgb24gdGhlIG9iamVjdC5cclxuXHJcbiAgICBVc2UgYW55IG9wZXJhdGlvbiBkZWZpbmVkIGluIGFueSBvZiB0aGUgbW9kdWxlcyBkZXBlbmRpbmcgb24gdGhlIGRhdGEgdHlwZVxyXG4gICAgb2YgdGhlIHByb3BlcnR5LiBGb3IgaW5zdGFuY2UsIHRoZSBvcGVyYXRpb25zIGluIHZhbHVlcy5qcyBjYW4gYmVcclxuICAgIGFwcGxpZWQgdG8gYW55IHByb3BlcnR5LiBUaGUgb3BlcmF0aW9ucyBpbiBzZXF1ZW5jZXMuanMgY2FuIGJlIHVzZWRcclxuICAgIGlmIHRoZSBwcm9wZXJ0eSdzIHZhbHVlIGlzIGEgc3RyaW5nIG9yIGFycmF5LiBBbmQgdGhlIG9wZXJhdGlvbnMgaW5cclxuICAgIHRoaXMgbW9kdWxlIGNhbiBiZSB1c2VkIGlmIHRoZSB2YWx1ZSBpcyBhbm90aGVyIG9iamVjdC5cclxuXHJcbiAgICBTdXBwb3J0cyBhIGNvbmZsaWN0bGVzcyByZWJhc2Ugd2l0aCBpdHNlbGYgd2l0aCB0aGUgaW5uZXIgb3BlcmF0aW9uc1xyXG4gICAgdGhlbXNlbHZlcyBzdXBwb3J0IGEgY29uZmxpY3RsZXNzIHJlYmFzZS4gSXQgZG9lcyBub3QgZ2VuZXJhdGUgY29uZmxpY3RzXHJcbiAgICB3aXRoIGFueSBvdGhlciBvcGVyYXRpb25zIGluIHRoaXMgbW9kdWxlLlxyXG5cclxuICAgIEV4YW1wbGU6XHJcbiAgICBcclxuICAgIFRvIHJlcGxhY2UgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgd2l0aCBhIG5ldyB2YWx1ZTpcclxuICAgIFxyXG4gICAgICBuZXcgb2JqZWN0cy5BUFBMWShcImtleTFcIiwgbmV3IHZhbHVlcy5TRVQoXCJ2YWx1ZVwiKSlcclxuXHJcblx0b3JcclxuXHJcbiAgICAgIG5ldyBvYmplY3RzLkFQUExZKHsga2V5MTogbmV3IHZhbHVlcy5TRVQoXCJ2YWx1ZVwiKSB9KVxyXG5cclxuICAgKi9cclxuICAgXHJcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xyXG5cclxudmFyIGRlZXBFcXVhbCA9IHJlcXVpcmUoXCJkZWVwLWVxdWFsXCIpO1xyXG52YXIgc2hhbGxvd19jbG9uZSA9IHJlcXVpcmUoJ3NoYWxsb3ctY2xvbmUnKTtcclxuXHJcbnZhciBqb3QgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKTtcclxudmFyIHZhbHVlcyA9IHJlcXVpcmUoXCIuL3ZhbHVlcy5qc1wiKTtcclxudmFyIExJU1QgPSByZXF1aXJlKFwiLi9saXN0cy5qc1wiKS5MSVNUO1xyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5leHBvcnRzLm1vZHVsZV9uYW1lID0gJ29iamVjdHMnOyAvLyBmb3Igc2VyaWFsaXphdGlvbi9kZXNlcmlhbGl6YXRpb25cclxuXHJcbmV4cG9ydHMuQVBQTFkgPSBmdW5jdGlvbiAoKSB7XHJcblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSAmJiB0eXBlb2YgYXJndW1lbnRzWzBdID09IFwib2JqZWN0XCIpIHtcclxuXHRcdC8vIERpY3QgZm9ybS5cclxuXHRcdHRoaXMub3BzID0gYXJndW1lbnRzWzBdO1xyXG5cdH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAyICYmIHR5cGVvZiBhcmd1bWVudHNbMF0gPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0Ly8ga2V5ICYgb3BlcmF0aW9uIGZvcm0uXHJcblx0XHR0aGlzLm9wcyA9IHsgfTtcclxuXHRcdHRoaXMub3BzW2FyZ3VtZW50c1swXV0gPSBhcmd1bWVudHNbMV07XHJcblx0fSBlbHNlIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcImludmFsaWQgYXJndW1lbnRzXCIpO1xyXG5cdH1cclxuXHRPYmplY3QuZnJlZXplKHRoaXMpO1xyXG5cdE9iamVjdC5mcmVlemUodGhpcy5vcHMpO1xyXG59XHJcbmV4cG9ydHMuQVBQTFkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShqb3QuQmFzZU9wZXJhdGlvbi5wcm90b3R5cGUpOyAvLyBpbmhlcml0XHJcbmpvdC5hZGRfb3AoZXhwb3J0cy5BUFBMWSwgZXhwb3J0cywgJ0FQUExZJyk7XHJcblxyXG4vLyBUaGUgTUlTU0lORyBvYmplY3QgaXMgYSBzZW50aW5lbCB0byBzaWduYWwgdGhlIHN0YXRlIG9mIGFuIE9iamVjdCBwcm9wZXJ0eVxyXG4vLyB0aGF0IGRvZXMgbm90IGV4aXN0LiBJdCBpcyB0aGUgb2xkX3ZhbHVlIHRvIFNFVCB3aGVuIGFkZGluZyBhIG5ldyBwcm9wZXJ0eVxyXG4vLyBhbmQgdGhlIHZhbHVlIHdoZW4gcmVtb3ZpbmcgYSBwcm9wZXJ0eS5cclxuZXhwb3J0cy5NSVNTSU5HID0gbmV3IE9iamVjdCgpO1xyXG5PYmplY3QuZnJlZXplKGV4cG9ydHMuTUlTU0lORyk7XHJcblxyXG5leHBvcnRzLlBVVCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XHJcblx0ZXhwb3J0cy5BUFBMWS5hcHBseSh0aGlzLCBba2V5LCBuZXcgdmFsdWVzLlNFVCh2YWx1ZSldKTtcclxufVxyXG5leHBvcnRzLlBVVC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKGV4cG9ydHMuQVBQTFkucHJvdG90eXBlKTsgLy8gaW5oZXJpdCBwcm90b3R5cGVcclxuXHJcbmV4cG9ydHMuUkVNID0gZnVuY3Rpb24gKGtleSkge1xyXG5cdGV4cG9ydHMuQVBQTFkuYXBwbHkodGhpcywgW2tleSwgbmV3IHZhbHVlcy5TRVQoZXhwb3J0cy5NSVNTSU5HKV0pO1xyXG59XHJcbmV4cG9ydHMuUkVNLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoZXhwb3J0cy5BUFBMWS5wcm90b3R5cGUpOyAvLyBpbmhlcml0IHByb3RvdHlwZVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5leHBvcnRzLkFQUExZLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24oZGVwdGgpIHtcclxuXHR2YXIgaW5uZXIgPSBbXTtcclxuXHR2YXIgb3BzID0gdGhpcy5vcHM7XHJcblx0T2JqZWN0LmtleXMob3BzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xyXG5cdFx0aW5uZXIucHVzaCh1dGlsLmZvcm1hdChcIiVqOiVzXCIsIGtleSwgb3BzW2tleV0uaW5zcGVjdChkZXB0aC0xKSkpO1xyXG5cdH0pO1xyXG5cdHJldHVybiB1dGlsLmZvcm1hdChcIjxBUFBMWSAlcz5cIiwgaW5uZXIuam9pbihcIiwgXCIpKTtcclxufVxyXG5cclxuZXhwb3J0cy5BUFBMWS5wcm90b3R5cGUudmlzaXQgPSBmdW5jdGlvbih2aXNpdG9yKSB7XHJcblx0Ly8gQSBzaW1wbGUgdmlzaXRvciBwYXJhZGlnbS4gUmVwbGFjZSB0aGlzIG9wZXJhdGlvbiBpbnN0YW5jZSBpdHNlbGZcclxuXHQvLyBhbmQgYW55IG9wZXJhdGlvbiB3aXRoaW4gaXQgd2l0aCB0aGUgdmFsdWUgcmV0dXJuZWQgYnkgY2FsbGluZ1xyXG5cdC8vIHZpc2l0b3Igb24gaXRzZWxmLCBvciBpZiB0aGUgdmlzaXRvciByZXR1cm5zIGFueXRoaW5nIGZhbHNleVxyXG5cdC8vIChwcm9iYWJseSB1bmRlZmluZWQpIHRoZW4gcmV0dXJuIHRoZSBvcGVyYXRpb24gdW5jaGFuZ2VkLlxyXG5cdHZhciBvcHMgPSB7IH07XHJcblx0Zm9yICh2YXIga2V5IGluIHRoaXMub3BzKVxyXG5cdFx0b3BzW2tleV0gPSB0aGlzLm9wc1trZXldLnZpc2l0KHZpc2l0b3IpO1xyXG5cdHZhciByZXQgPSBuZXcgZXhwb3J0cy5BUFBMWShvcHMpO1xyXG5cdHJldHVybiB2aXNpdG9yKHJldCkgfHwgcmV0O1xyXG59XHJcblxyXG5leHBvcnRzLkFQUExZLnByb3RvdHlwZS5pbnRlcm5hbFRvSlNPTiA9IGZ1bmN0aW9uKGpzb24sIHByb3RvY29sX3ZlcnNpb24pIHtcclxuXHRqc29uLm9wcyA9IHsgfTtcclxuXHRmb3IgKHZhciBrZXkgaW4gdGhpcy5vcHMpXHJcblx0XHRqc29uLm9wc1trZXldID0gdGhpcy5vcHNba2V5XS50b0pTT04odW5kZWZpbmVkLCBwcm90b2NvbF92ZXJzaW9uKTtcclxufVxyXG5cclxuZXhwb3J0cy5BUFBMWS5pbnRlcm5hbEZyb21KU09OID0gZnVuY3Rpb24oanNvbiwgcHJvdG9jb2xfdmVyc2lvbiwgb3BfbWFwKSB7XHJcblx0dmFyIG9wcyA9IHsgfTtcclxuXHRmb3IgKHZhciBrZXkgaW4ganNvbi5vcHMpXHJcblx0XHRvcHNba2V5XSA9IGpvdC5vcEZyb21KU09OKGpzb24ub3BzW2tleV0sIHByb3RvY29sX3ZlcnNpb24sIG9wX21hcCk7XHJcblx0cmV0dXJuIG5ldyBleHBvcnRzLkFQUExZKG9wcyk7XHJcbn1cclxuXHJcbmV4cG9ydHMuQVBQTFkucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24gKGRvY3VtZW50KSB7XHJcblx0LyogQXBwbGllcyB0aGUgb3BlcmF0aW9uIHRvIGEgZG9jdW1lbnQuIFJldHVybnMgYSBuZXcgb2JqZWN0IHRoYXQgaXNcclxuXHQgICB0aGUgc2FtZSB0eXBlIGFzIGRvY3VtZW50IGJ1dCB3aXRoIHRoZSBjaGFuZ2UgbWFkZS4gKi9cclxuXHJcblx0Ly8gQ2xvbmUgZmlyc3QuXHJcblx0dmFyIGQgPSB7IH07XHJcblx0Zm9yICh2YXIgayBpbiBkb2N1bWVudClcclxuXHRcdGRba10gPSBkb2N1bWVudFtrXTtcclxuXHJcblx0Ly8gQXBwbHkuIFBhc3MgdGhlIG9iamVjdCBhbmQga2V5IGRvd24gaW4gdGhlIHNlY29uZCBhcmd1bWVudFxyXG5cdC8vIHRvIGFwcGx5IHNvIHRoYXQgdmFsdWVzLlNFVCBjYW4gaGFuZGxlIHRoZSBzcGVjaWFsIE1JU1NJTkdcclxuXHQvLyB2YWx1ZS5cclxuXHRmb3IgKHZhciBrZXkgaW4gdGhpcy5vcHMpIHtcclxuXHRcdHZhciB2YWx1ZSA9IHRoaXMub3BzW2tleV0uYXBwbHkoZFtrZXldLCBbZCwga2V5XSk7XHJcblx0XHRpZiAodmFsdWUgPT09IGV4cG9ydHMuTUlTU0lORylcclxuXHRcdFx0ZGVsZXRlIGRba2V5XTsgLy8ga2V5IHdhcyByZW1vdmVkXHJcblx0XHRlbHNlXHJcblx0XHRcdGRba2V5XSA9IHZhbHVlO1xyXG5cdH1cclxuXHRyZXR1cm4gZDtcclxufVxyXG5cclxuZXhwb3J0cy5BUFBMWS5wcm90b3R5cGUuc2ltcGxpZnkgPSBmdW5jdGlvbiAoKSB7XHJcblx0LyogUmV0dXJucyBhIG5ldyBhdG9taWMgb3BlcmF0aW9uIHRoYXQgaXMgYSBzaW1wbGVyIHZlcnNpb25cclxuXHQgICBvZiB0aGlzIG9wZXJhdGlvbi4gSWYgdGhlcmUgaXMgbm8gc3ViLW9wZXJhdGlvbiB0aGF0IGlzXHJcblx0ICAgbm90IGEgTk9fT1AsIHRoZW4gcmV0dXJuIGEgTk9fT1AuIE90aGVyd2lzZSwgc2ltcGxpZnkgYWxsXHJcblx0ICAgb2YgdGhlIHN1Yi1vcGVyYXRpb25zLiAqL1xyXG5cdHZhciBuZXdfb3BzID0geyB9O1xyXG5cdHZhciBoYWRfbm9uX25vb3AgPSBmYWxzZTtcclxuXHRmb3IgKHZhciBrZXkgaW4gdGhpcy5vcHMpIHtcclxuXHRcdG5ld19vcHNba2V5XSA9IHRoaXMub3BzW2tleV0uc2ltcGxpZnkoKTtcclxuXHRcdGlmICghKG5ld19vcHNba2V5XSBpbnN0YW5jZW9mIHZhbHVlcy5OT19PUCkpXHJcblx0XHRcdC8vIFJlbWVtYmVyIHRoYXQgd2UgaGF2ZSBhIHN1YnN0YW50aXZlIG9wZXJhdGlvbi5cclxuXHRcdFx0aGFkX25vbl9ub29wID0gdHJ1ZTtcclxuXHRcdGVsc2VcclxuXHRcdFx0Ly8gRHJvcCBpbnRlcm5hbCBOT19PUHMuXHJcblx0XHRcdGRlbGV0ZSBuZXdfb3BzW2tleV07XHJcblx0fVxyXG5cdGlmICghaGFkX25vbl9ub29wKVxyXG5cdFx0cmV0dXJuIG5ldyB2YWx1ZXMuTk9fT1AoKTtcclxuXHRyZXR1cm4gbmV3IGV4cG9ydHMuQVBQTFkobmV3X29wcyk7XHJcbn1cclxuXHJcbmV4cG9ydHMuQVBQTFkucHJvdG90eXBlLmludmVyc2UgPSBmdW5jdGlvbiAoZG9jdW1lbnQpIHtcclxuXHQvKiBSZXR1cm5zIGEgbmV3IGF0b21pYyBvcGVyYXRpb24gdGhhdCBpcyB0aGUgaW52ZXJzZSBvZiB0aGlzIG9wZXJhdGlvbixcclxuXHQgICBnaXZlbiB0aGUgc3RhdGUgb2YgdGhlIGRvY3VtZW50IGJlZm9yZSB0aGlzIG9wZXJhdGlvbiBhcHBsaWVzLiAqL1xyXG5cdHZhciBuZXdfb3BzID0geyB9O1xyXG5cdGZvciAodmFyIGtleSBpbiB0aGlzLm9wcykge1xyXG5cdFx0bmV3X29wc1trZXldID0gdGhpcy5vcHNba2V5XS5pbnZlcnNlKGtleSBpbiBkb2N1bWVudCA/IGRvY3VtZW50W2tleV0gOiBleHBvcnRzLk1JU1NJTkcpO1xyXG5cdH1cclxuXHRyZXR1cm4gbmV3IGV4cG9ydHMuQVBQTFkobmV3X29wcyk7XHJcbn1cclxuXHJcbmV4cG9ydHMuQVBQTFkucHJvdG90eXBlLmF0b21pY19jb21wb3NlID0gZnVuY3Rpb24gKG90aGVyKSB7XHJcblx0LyogQ3JlYXRlcyBhIG5ldyBhdG9taWMgb3BlcmF0aW9uIHRoYXQgaGFzIHRoZSBzYW1lIHJlc3VsdCBhcyB0aGlzXHJcblx0ICAgYW5kIG90aGVyIGFwcGxpZWQgaW4gc2VxdWVuY2UgKHRoaXMgZmlyc3QsIG90aGVyIGFmdGVyKS4gUmV0dXJuc1xyXG5cdCAgIG51bGwgaWYgbm8gYXRvbWljIG9wZXJhdGlvbiBpcyBwb3NzaWJsZS4gKi9cclxuXHJcblx0Ly8gdHdvIEFQUExZc1xyXG5cdGlmIChvdGhlciBpbnN0YW5jZW9mIGV4cG9ydHMuQVBQTFkpIHtcclxuXHRcdC8vIFN0YXJ0IHdpdGggYSBjbG9uZSBvZiB0aGlzIG9wZXJhdGlvbidzIHN1Ym9wZXJhdGlvbnMuXHJcblx0XHR2YXIgbmV3X29wcyA9IHNoYWxsb3dfY2xvbmUodGhpcy5vcHMpO1xyXG5cclxuXHRcdC8vIE5vdyBjb21wb3NlIHdpdGggb3RoZXIuXHJcblx0XHRmb3IgKHZhciBrZXkgaW4gb3RoZXIub3BzKSB7XHJcblx0XHRcdGlmICghKGtleSBpbiBuZXdfb3BzKSkge1xyXG5cdFx0XHRcdC8vIE9wZXJhdGlvbiBpbiBvdGhlciBhcHBsaWVzIHRvIGEga2V5IG5vdCBwcmVzZW50XHJcblx0XHRcdFx0Ly8gaW4gdGhpcywgc28gd2UgY2FuIGp1c3QgbWVyZ2UgLSB0aGUgb3BlcmF0aW9uc1xyXG5cdFx0XHRcdC8vIGhhcHBlbiBpbiBwYXJhbGxlbCBhbmQgZG9uJ3QgYWZmZWN0IGVhY2ggb3RoZXIuXHJcblx0XHRcdFx0bmV3X29wc1trZXldID0gb3RoZXIub3BzW2tleV07XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gQ29tcG9zZS5cclxuXHRcdFx0XHR2YXIgb3AyID0gbmV3X29wc1trZXldLmNvbXBvc2Uob3RoZXIub3BzW2tleV0pO1xyXG5cclxuXHRcdFx0XHQvLyBUaGV5IGNvbXBvc2VkIHRvIGEgbm8tb3AsIHNvIGRlbGV0ZSB0aGVcclxuXHRcdFx0XHQvLyBmaXJzdCBvcGVyYXRpb24uXHJcblx0XHRcdFx0aWYgKG9wMiBpbnN0YW5jZW9mIHZhbHVlcy5OT19PUClcclxuXHRcdFx0XHRcdGRlbGV0ZSBuZXdfb3BzW2tleV07XHJcblxyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdG5ld19vcHNba2V5XSA9IG9wMjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBuZXcgZXhwb3J0cy5BUFBMWShuZXdfb3BzKS5zaW1wbGlmeSgpO1xyXG5cdH1cclxuXHJcblx0Ly8gTm8gY29tcG9zaXRpb24gcG9zc2libGUuXHJcblx0cmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydHMuQVBQTFkucHJvdG90eXBlLnJlYmFzZV9mdW5jdGlvbnMgPSBbXHJcblx0W2V4cG9ydHMuQVBQTFksIGZ1bmN0aW9uKG90aGVyLCBjb25mbGljdGxlc3MpIHtcclxuXHRcdC8vIFJlYmFzZSB0aGUgc3ViLW9wZXJhdGlvbnMgb24gY29ycmVzcG9uZGluZyBrZXlzLlxyXG5cdFx0Ly8gSWYgYW55IHJlYmFzZSBmYWlscywgdGhlIHdob2xlIHJlYmFzZSBmYWlscy5cclxuXHJcblx0XHQvLyBXaGVuIGNvbmZsaWN0bGVzcyBpcyBzdXBwbGllZCB3aXRoIGEgcHJpb3IgZG9jdW1lbnQgc3RhdGUsXHJcblx0XHQvLyB0aGUgc3RhdGUgcmVwcmVzZW50cyB0aGUgb2JqZWN0LCBzbyBiZWZvcmUgd2UgY2FsbCByZWJhc2VcclxuXHRcdC8vIG9uIGlubmVyIG9wZXJhdGlvbnMsIHdlIGhhdmUgdG8gZ28gaW4gYSBsZXZlbCBvbiB0aGUgcHJpb3JcclxuXHRcdC8vIGRvY3VtZW50LlxyXG5cdFx0ZnVuY3Rpb24gYnVpbGRfY29uZmxpY3RsZXNzKGtleSkge1xyXG5cdFx0XHRpZiAoIWNvbmZsaWN0bGVzcyB8fCAhKFwiZG9jdW1lbnRcIiBpbiBjb25mbGljdGxlc3MpKVxyXG5cdFx0XHRcdHJldHVybiBjb25mbGljdGxlc3M7XHJcblx0XHRcdHZhciByZXQgPSBzaGFsbG93X2Nsb25lKGNvbmZsaWN0bGVzcyk7XHJcblx0XHRcdGlmICghKGtleSBpbiBjb25mbGljdGxlc3MuZG9jdW1lbnQpKVxyXG5cdFx0XHRcdC8vIFRoZSBrZXkgYmVpbmcgbW9kaWZpZWQgaXNuJ3QgcHJlc2VudCB5ZXQuXHJcblx0XHRcdFx0cmV0LmRvY3VtZW50ID0gZXhwb3J0cy5NSVNTSU5HO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0cmV0LmRvY3VtZW50ID0gY29uZmxpY3RsZXNzLmRvY3VtZW50W2tleV07XHJcblx0XHRcdHJldHVybiByZXQ7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIG5ld19vcHNfbGVmdCA9IHsgfTtcclxuXHRcdGZvciAodmFyIGtleSBpbiB0aGlzLm9wcykge1xyXG5cdFx0XHRuZXdfb3BzX2xlZnRba2V5XSA9IHRoaXMub3BzW2tleV07XHJcblx0XHRcdGlmIChrZXkgaW4gb3RoZXIub3BzKVxyXG5cdFx0XHRcdG5ld19vcHNfbGVmdFtrZXldID0gbmV3X29wc19sZWZ0W2tleV0ucmViYXNlKG90aGVyLm9wc1trZXldLCBidWlsZF9jb25mbGljdGxlc3Moa2V5KSk7XHJcblx0XHRcdGlmIChuZXdfb3BzX2xlZnRba2V5XSA9PT0gbnVsbClcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbmV3X29wc19yaWdodCA9IHsgfTtcclxuXHRcdGZvciAodmFyIGtleSBpbiBvdGhlci5vcHMpIHtcclxuXHRcdFx0bmV3X29wc19yaWdodFtrZXldID0gb3RoZXIub3BzW2tleV07XHJcblx0XHRcdGlmIChrZXkgaW4gdGhpcy5vcHMpXHJcblx0XHRcdFx0bmV3X29wc19yaWdodFtrZXldID0gbmV3X29wc19yaWdodFtrZXldLnJlYmFzZSh0aGlzLm9wc1trZXldLCBidWlsZF9jb25mbGljdGxlc3Moa2V5KSk7XHJcblx0XHRcdGlmIChuZXdfb3BzX3JpZ2h0W2tleV0gPT09IG51bGwpXHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0bmV3IGV4cG9ydHMuQVBQTFkobmV3X29wc19sZWZ0KS5zaW1wbGlmeSgpLFxyXG5cdFx0XHRuZXcgZXhwb3J0cy5BUFBMWShuZXdfb3BzX3JpZ2h0KS5zaW1wbGlmeSgpXHJcblx0XHRdO1xyXG5cdH1dXHJcbl1cclxuXHJcbmV4cG9ydHMuQVBQTFkucHJvdG90eXBlLmRyaWxsZG93biA9IGZ1bmN0aW9uKGluZGV4X29yX2tleSkge1xyXG5cdGlmICh0eXBlb2YgaW5kZXhfb3Jfa2V5ID09IFwic3RyaW5nXCIgJiYgaW5kZXhfb3Jfa2V5IGluIHRoaXMub3BzKVxyXG5cdFx0cmV0dXJuIHRoaXMub3BzW2luZGV4X29yX2tleV07XHJcblx0cmV0dXJuIG5ldyB2YWx1ZXMuTk9fT1AoKTtcclxufVxyXG5cclxuZXhwb3J0cy5jcmVhdGVSYW5kb21PcCA9IGZ1bmN0aW9uKGRvYywgY29udGV4dCkge1xyXG5cdC8vIENyZWF0ZSBhIHJhbmRvbSBvcGVyYXRpb24gdGhhdCBjb3VsZCBhcHBseSB0byBkb2MuXHJcblx0Ly8gQ2hvb3NlIHVuaWZvcm1seSBhY3Jvc3MgdmFyaW91cyBvcHRpb25zLlxyXG5cdHZhciBvcHMgPSBbXTtcclxuXHJcblx0Ly8gQWRkIGEgcmFuZG9tIGtleSB3aXRoIGEgcmFuZG9tIHZhbHVlLlxyXG5cdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuUFVUKFwia1wiK01hdGguZmxvb3IoMTAwMCpNYXRoLnJhbmRvbSgpKSwgam90LmNyZWF0ZVJhbmRvbVZhbHVlKCkpOyB9KTtcclxuXHJcblx0Ly8gQXBwbHkgcmFuZG9tIG9wZXJhdGlvbnMgdG8gaW5kaXZpZHVhbCBrZXlzLlxyXG5cdE9iamVjdC5rZXlzKGRvYykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcclxuXHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gam90LmNyZWF0ZVJhbmRvbU9wKGRvY1trZXldLCBcIm9iamVjdFwiKSB9KTtcclxuXHR9KTtcclxuXHJcblx0Ly8gU2VsZWN0IHJhbmRvbWx5LlxyXG5cdHJldHVybiBvcHNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogb3BzLmxlbmd0aCldKCk7XHJcbn1cclxuIiwiLyogQW4gb3BlcmF0aW9uYWwgdHJhbnNmb3JtYXRpb24gbGlicmFyeSBmb3Igc2VxdWVuY2UtbGlrZSBvYmplY3RzLFxyXG4gICBpLmUuIHN0cmluZ3MgYW5kIGFycmF5cy5cclxuXHJcbiAgIFRoZSBtYWluIG9wZXJhdGlvbiBwcm92aWRlZCBieSB0aGlzIGxpYnJhcnkgaXMgUEFUQ0gsIHdoaWNoIHJlcHJlc2VudHNcclxuICAgYSBzZXQgb2Ygbm9uLW92ZXJsYXBwaW5nIGNoYW5nZXMgdG8gYSBzdHJpbmcgb3IgYXJyYXkuIEVhY2ggY2hhbmdlLFxyXG4gICBjYWxsZWQgYSBodW5rLCBhcHBsaWVzIGFuIG9wZXJhdGlvbiB0byBhIHN1YnNlcXVlbmNlIC0tIGkuZS4gYSBzdWItc3RyaW5nXHJcbiAgIG9yIGEgc2xpY2Ugb2YgdGhlIGFycmF5LiBUaGUgb3BlcmF0aW9uJ3MgLmFwcGx5IG1ldGhvZCB5aWVsZHMgYSBuZXdcclxuICAgc3ViLXNlcXVlbmNlLCBhbmQgdGhleSBhcmUgc3RpdGNoZWQgdG9nZXRoZXIgKGFsb25nIHdpdGggdW5jaGFuZ2VkIGVsZW1lbnRzKVxyXG4gICB0byBmb3JtIHRoZSBuZXcgZG9jdW1lbnQgdGhhdCByZXN1bHRzIGZyb20gdGhlIFBBVENIIG9wZXJhdGlvbi5cclxuXHJcbiAgIFRoZSBpbnRlcm5hbCBzdHJ1Y3R1cmUgb2YgdGhlIFBBVENIIG9wZXJhdGlvbiBpcyBhbiBhcnJheSBvZiBodW5rcyBhc1xyXG4gICBmb2xsb3dzOlxyXG5cclxuICAgbmV3IHNlcXVlbmNlcy5QQVRDSChcclxuICAgICBbXHJcbiAgICAgICB7IG9mZnNldDogLi4uLCAjIHVuY2hhbmdlZCBlbGVtZW50cyB0byBza2lwIGJlZm9yZSB0aGlzIGh1bmtcclxuICAgICAgICAgbGVuZ3RoOiAuLi4sICMgbGVuZ3RoIG9mIHN1YnNlcXVlbmNlIG1vZGlmaWVkIGJ5IHRoaXMgaHVua1xyXG4gICAgICAgICBvcDogLi4uICAgICAgIyBqb3Qgb3BlcmF0aW9uIHRvIGFwcGx5IHRvIHRoZSBzdWJzZXF1ZW5jZVxyXG4gICAgICAgfSxcclxuICAgICAgIC4uLlxyXG4gICAgIF1cclxuICAgIClcclxuXHJcbiAgIFRoZSBpbm5lciBvcGVyYXRpb24gbXVzdCBiZSBvbmUgb2YgTk9fT1AsIFNFVCwgYW5kIE1BUCAob3IgYW55XHJcbiAgIG9wZXJhdGlvbiB0aGF0IGRlZmluZXMgXCJnZXRfbGVuZ3RoX2NoYW5nZVwiIGFuZCBcImRlY29tcG9zZVwiIGZ1bmN0aW9uc1xyXG4gICBhbmQgd2hvc2UgcmViYXNlIGFsd2F5cyB5aWVsZHMgYW4gb3BlcmF0aW9uIHRoYXQgYWxzbyBzYXRpc2ZpZXMgdGhlc2VcclxuICAgc2FtZSBjb25zdHJhaW50cy4pXHJcblxyXG5cclxuICAgVGhpcyBsaWJyYXJ5IGFsc28gZGVmaW5lcyB0aGUgTUFQIG9wZXJhdGlvbiwgd2hpY2ggYXBwbGllcyBhIGpvdFxyXG4gICBvcGVyYXRpb24gdG8gZXZlcnkgZWxlbWVudCBvZiBhIHNlcXVlbmNlLiBUaGUgTUFQIG9wZXJhdGlvbiBpc1xyXG4gICBhbHNvIHVzZWQgd2l0aCBsZW5ndGgtb25lIGh1bmtzIHRvIGFwcGx5IGFuIG9wZXJhdGlvbiB0byBhIHNpbmdsZVxyXG4gICBlbGVtZW50LiBPbiBzdHJpbmdzLCB0aGUgTUFQIG9wZXJhdGlvbiBvbmx5IGFjY2VwdHMgaW5uZXIgb3BlcmF0aW9uc1xyXG4gICB0aGF0IHlpZWxkIGJhY2sgc2luZ2xlIGNoYXJhY3RlcnMgc28gdGhhdCBhIE1BUCBvbiBhIHN0cmluZyBkb2VzXHJcbiAgIG5vdCBjaGFuZ2UgdGhlIHN0cmluZydzIGxlbmd0aC5cclxuXHJcbiAgIFRoZSBpbnRlcm5hbCBzdHJ1Y3R1cmUgb2YgdGhlIE1BUCBvcGVyYXRpb24gaXM6XHJcblxyXG4gICBuZXcgc2VxdWVuY2VzLk1BUChvcClcclxuIFxyXG4gICBTaG9ydGN1dHMgZm9yIGNvbnN0cnVjdGluZyB1c2VmdWwgUEFUQ0ggb3BlcmF0aW9ucyBhcmUgcHJvdmlkZWQ6XHJcblxyXG5cdFx0bmV3IHNlcXVlbmNlcy5TUExJQ0UocG9zLCBsZW5ndGgsIHZhbHVlKVxyXG5cclxuXHRcdFx0IEVxdWl2YWxlbnQgdG86XHJcblxyXG5cdFx0XHQgUEFUQ0goW3tcclxuXHRcdFx0XHQgb2Zmc2V0OiBwb3MsXHJcblx0XHRcdFx0IGxlbmd0aDogbGVuZ3RoLFxyXG5cdFx0XHRcdCBvcDogbmV3IHZhbHVlcy5TRVQodmFsdWUpXHJcblx0XHRcdFx0IH1dKVxyXG5cdFx0XHQgXHJcblx0XHRcdCBpLmUuIHJlcGxhY2UgZWxlbWVudHMgd2l0aCBvdGhlciBlbGVtZW50c1xyXG5cdFx0XHJcblx0XHRuZXcgc2VxdWVuY2VzLkFUSU5ERVgocG9zLCBvcClcclxuXHJcblx0XHRcdCBFcXVpdmFsZW50IHRvOlxyXG5cclxuXHRcdFx0IFBBVENIKFt7XHJcblx0XHRcdFx0IG9mZnNldDogcG9zLFxyXG5cdFx0XHRcdCBsZW5ndGg6IDEsXHJcblx0XHRcdFx0IG9wOiBuZXcgc2VxdWVuY2VzLk1BUChvcClcclxuXHRcdFx0XHQgfV0pXHJcblx0XHRcdCBcclxuXHRcdFx0IGkuZS4gYXBwbHkgdGhlIG9wZXJhdGlvbiB0byB0aGUgc2luZ2xlIGVsZW1lbnQgYXQgcG9zXHJcblxyXG5cdFx0bmV3IHNlcXVlbmNlcy5BVElOREVYKHsgcG9zOiBvcCwgLi4uIH0pXHJcblxyXG5cdFx0XHQgU2ltaWxhciB0byB0aGUgYWJvdmUgYnV0IGZvciBtdWx0aXBsZSBvcGVyYXRpb25zIGF0IG9uY2UuXHJcblxyXG5cdFx0U3VwcG9ydHMgYSBjb25mbGljdGxlc3MgcmViYXNlIHdpdGggb3RoZXIgUEFUQ0ggb3BlcmF0aW9ucy5cclxuXHJcblx0ICovXHJcblx0IFxyXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcclxuXHJcbnZhciBkZWVwRXF1YWwgPSByZXF1aXJlKFwiZGVlcC1lcXVhbFwiKTtcclxudmFyIHNoYWxsb3dfY2xvbmUgPSByZXF1aXJlKCdzaGFsbG93LWNsb25lJyk7XHJcblxyXG52YXIgam90ID0gcmVxdWlyZShcIi4vaW5kZXguanNcIik7XHJcbnZhciB2YWx1ZXMgPSByZXF1aXJlKFwiLi92YWx1ZXMuanNcIik7XHJcbnZhciBMSVNUID0gcmVxdWlyZShcIi4vbGlzdHMuanNcIikuTElTVDtcclxuXHJcbi8vIHV0aWxpdGllc1xyXG5cclxuZnVuY3Rpb24gZWxlbShzZXEsIHBvcykge1xyXG5cdC8vIGdldCBhbiBlbGVtZW50IG9mIHRoZSBzZXF1ZW5jZVxyXG5cdGlmICh0eXBlb2Ygc2VxID09IFwic3RyaW5nXCIpXHJcblx0XHRyZXR1cm4gc2VxLmNoYXJBdChwb3MpO1xyXG5cdGVsc2UgLy8gaXMgYW4gYXJyYXlcclxuXHRcdHJldHVybiBzZXFbcG9zXTtcclxufVxyXG5mdW5jdGlvbiBjb25jYXQyKGl0ZW0xLCBpdGVtMikge1xyXG5cdGlmIChpdGVtMSBpbnN0YW5jZW9mIFN0cmluZylcclxuXHRcdHJldHVybiBpdGVtMSArIGl0ZW0yO1xyXG5cdHJldHVybiBpdGVtMS5jb25jYXQoaXRlbTIpO1xyXG59XHJcbmZ1bmN0aW9uIGNvbmNhdDMoaXRlbTEsIGl0ZW0yLCBpdGVtMykge1xyXG5cdGlmIChpdGVtMSBpbnN0YW5jZW9mIFN0cmluZylcclxuXHRcdHJldHVybiBpdGVtMSArIGl0ZW0yICsgaXRlbTM7XHJcblx0cmV0dXJuIGl0ZW0xLmNvbmNhdChpdGVtMikuY29uY2F0KGl0ZW0zKTtcclxufVxyXG5mdW5jdGlvbiBtYXBfaW5kZXgocG9zLCBtb3ZlX29wKSB7XHJcblx0aWYgKHBvcyA+PSBtb3ZlX29wLnBvcyAmJiBwb3MgPCBtb3ZlX29wLnBvcyttb3ZlX29wLmNvdW50KSByZXR1cm4gKHBvcy1tb3ZlX29wLnBvcykgKyBtb3ZlX29wLm5ld19wb3M7IC8vIHdpdGhpbiB0aGUgbW92ZVxyXG5cdGlmIChwb3MgPCBtb3ZlX29wLnBvcyAmJiBwb3MgPCBtb3ZlX29wLm5ld19wb3MpIHJldHVybiBwb3M7IC8vIGJlZm9yZSB0aGUgbW92ZVxyXG5cdGlmIChwb3MgPCBtb3ZlX29wLnBvcykgcmV0dXJuIHBvcyArIG1vdmVfb3AuY291bnQ7IC8vIGEgbW92ZWQgYXJvdW5kIGJ5IGZyb20gcmlnaHQgdG8gbGVmdFxyXG5cdGlmIChwb3MgPiBtb3ZlX29wLnBvcyAmJiBwb3MgPj0gbW92ZV9vcC5uZXdfcG9zKSByZXR1cm4gcG9zOyAvLyBhZnRlciB0aGUgbW92ZVxyXG5cdGlmIChwb3MgPiBtb3ZlX29wLnBvcykgcmV0dXJuIHBvcyAtIG1vdmVfb3AuY291bnQ7IC8vIGEgbW92ZWQgYXJvdW5kIGJ5IGZyb20gbGVmdCB0byByaWdodFxyXG5cdHRocm93IG5ldyBFcnJvcihcInVuaGFuZGxlZCBwcm9ibGVtXCIpO1xyXG59XHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmV4cG9ydHMubW9kdWxlX25hbWUgPSAnc2VxdWVuY2VzJzsgLy8gZm9yIHNlcmlhbGl6YXRpb24vZGVzZXJpYWxpemF0aW9uXHJcblxyXG5leHBvcnRzLlBBVENIID0gZnVuY3Rpb24gKCkge1xyXG5cdC8qIEFuIG9wZXJhdGlvbiB0aGF0IHJlcGxhY2VzIGEgc3VicmFuZ2Ugb2YgdGhlIHNlcXVlbmNlIHdpdGggbmV3IGVsZW1lbnRzLiAqL1xyXG5cdGlmIChhcmd1bWVudHNbMF0gPT09IFwiX19obW1fX1wiKSByZXR1cm47IC8vIHVzZWQgZm9yIHN1YmNsYXNzaW5nXHJcblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggIT0gMSlcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFpZCBBcmd1bWVudFwiKTtcclxuXHJcblx0dGhpcy5odW5rcyA9IGFyZ3VtZW50c1swXTtcclxuXHJcblx0Ly8gU2FuaXR5IGNoZWNrICYgZnJlZXplIGh1bmtzLlxyXG5cdGlmICghQXJyYXkuaXNBcnJheSh0aGlzLmh1bmtzKSlcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFpZCBBcmd1bWVudFwiKTtcclxuXHR0aGlzLmh1bmtzLmZvckVhY2goZnVuY3Rpb24oaHVuaykge1xyXG5cdFx0aWYgKHR5cGVvZiBodW5rLm9mZnNldCAhPSBcIm51bWJlclwiKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIEFyZ3VtZW50IChodW5rIG9mZnNldCBub3QgYSBudW1iZXIpXCIpO1xyXG5cdFx0aWYgKGh1bmsub2Zmc2V0IDwgMClcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBBcmd1bWVudCAoaHVuayBvZmZzZXQgaXMgbmVnYXRpdmUpXCIpO1xyXG5cdFx0aWYgKHR5cGVvZiBodW5rLmxlbmd0aCAhPSBcIm51bWJlclwiKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIEFyZ3VtZW50IChodW5rIGxlbmd0aCBpcyBub3QgYSBudW1iZXIpXCIpO1xyXG5cdFx0aWYgKGh1bmsubGVuZ3RoIDwgMClcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBBcmd1bWVudCAoaHVuayBsZW5ndGggaXMgbmVnYXRpdmUpXCIpO1xyXG5cdFx0aWYgKCEoaHVuay5vcCBpbnN0YW5jZW9mIGpvdC5CYXNlT3BlcmF0aW9uKSlcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBBcmd1bWVudCAoaHVuayBvcGVyYXRpb24gaXMgbm90IGFuIG9wZXJhdGlvbilcIik7XHJcblx0XHRpZiAodHlwZW9mIGh1bmsub3AuZ2V0X2xlbmd0aF9jaGFuZ2UgIT0gXCJmdW5jdGlvblwiKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIEFyZ3VtZW50IChodW5rIG9wZXJhdGlvbiBcIiArIGh1bmsub3AuaW5zcGVjdCgpICsgXCIgZG9lcyBub3Qgc3VwcG9ydCBnZXRfbGVuZ3RoX2NoYW5nZSlcIik7XHJcblx0XHRpZiAodHlwZW9mIGh1bmsub3AuZGVjb21wb3NlICE9IFwiZnVuY3Rpb25cIilcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBBcmd1bWVudCAoaHVuayBvcGVyYXRpb24gXCIgKyBodW5rLm9wLmluc3BlY3QoKSArIFwiIGRvZXMgbm90IHN1cHBvcnQgZGVjb21wb3NlKVwiKTtcclxuXHRcdE9iamVjdC5mcmVlemUoaHVuayk7XHJcblx0fSk7XHJcblxyXG5cdE9iamVjdC5mcmVlemUodGhpcyk7XHJcbn1cclxuZXhwb3J0cy5QQVRDSC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKGpvdC5CYXNlT3BlcmF0aW9uLnByb3RvdHlwZSk7IC8vIGluaGVyaXRcclxuam90LmFkZF9vcChleHBvcnRzLlBBVENILCBleHBvcnRzLCAnUEFUQ0gnKTtcclxuXHJcblx0Ly8gc2hvcnRjdXRzXHJcblxyXG5cdGV4cG9ydHMuU1BMSUNFID0gZnVuY3Rpb24gKHBvcywgbGVuZ3RoLCB2YWx1ZSkge1xyXG5cdFx0Ly8gdmFsdWUuc2xpY2UoMCwwKSBpcyBhIHNob3J0aGFuZCBmb3IgY29uc3RydWN0aW5nIGFuIGVtcHR5IHN0cmluZyBvciBlbXB0eSBsaXN0LCBnZW5lcmljYWxseVxyXG5cdFx0ZXhwb3J0cy5QQVRDSC5hcHBseSh0aGlzLCBbW3tcclxuXHRcdFx0b2Zmc2V0OiBwb3MsXHJcblx0XHRcdGxlbmd0aDogbGVuZ3RoLFxyXG5cdFx0XHRvcDogbmV3IHZhbHVlcy5TRVQodmFsdWUpXHJcblx0XHR9XV0pO1xyXG5cdH1cclxuXHRleHBvcnRzLlNQTElDRS5wcm90b3R5cGUgPSBuZXcgZXhwb3J0cy5QQVRDSChcIl9faG1tX19cIik7IC8vIGluaGVyaXQgcHJvdG90eXBlXHJcblxyXG5cdGV4cG9ydHMuQVRJTkRFWCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBpbmRleGVzO1xyXG5cdFx0dmFyIG9wX21hcDtcclxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpIHtcclxuXHRcdFx0Ly8gVGhlIGFyZ3VtZW50IGlzIGEgbWFwcGluZyBmcm9tIGluZGV4ZXMgdG8gb3BlcmF0aW9ucyB0byBhcHBseVxyXG5cdFx0XHQvLyBhdCB0aG9zZSBpbmRleGVzLiBDb2xsZWN0IGFsbCBvZiB0aGUgaW50ZWdlciBpbmRleGVzIGluIHNvcnRlZFxyXG5cdFx0XHQvLyBvcmRlci5cclxuXHRcdFx0b3BfbWFwID0gYXJndW1lbnRzWzBdO1xyXG5cdFx0XHRpbmRleGVzID0gW107XHJcblx0XHRcdE9iamVjdC5rZXlzKG9wX21hcCkuZm9yRWFjaChmdW5jdGlvbihpbmRleCkgeyBpbmRleGVzLnB1c2gocGFyc2VJbnQoaW5kZXgpKTsgfSk7XHJcblx0XHRcdGluZGV4ZXMuc29ydCgpO1xyXG5cdFx0fSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDIpIHtcclxuXHRcdFx0Ly8gVGhlIGFyZ3VtZW50cyBhcmUganVzdCBhIHNpbmdsZSBwb3NpdGlvbiBhbmQgb3BlcmF0aW9uLlxyXG5cdFx0XHRpbmRleGVzID0gW2FyZ3VtZW50c1swXV07XHJcblx0XHRcdG9wX21hcCA9IHsgfTtcclxuXHRcdFx0b3BfbWFwW2FyZ3VtZW50c1swXV0gPSBhcmd1bWVudHNbMV07XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIEFyZ3VtZW50XCIpXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRm9ybSBodW5rcy5cclxuXHRcdHZhciBodW5rcyA9IFtdO1xyXG5cdFx0dmFyIG9mZnNldCA9IDA7XHJcblx0XHRpbmRleGVzLmZvckVhY2goZnVuY3Rpb24oaW5kZXgpIHtcclxuXHRcdFx0aHVua3MucHVzaCh7XHJcblx0XHRcdFx0b2Zmc2V0OiBpbmRleC1vZmZzZXQsXHJcblx0XHRcdFx0bGVuZ3RoOiAxLFxyXG5cdFx0XHRcdG9wOiBuZXcgZXhwb3J0cy5NQVAob3BfbWFwW2luZGV4XSlcclxuXHRcdFx0fSlcclxuXHRcdFx0b2Zmc2V0ID0gaW5kZXgrMTtcclxuXHRcdH0pO1xyXG5cdFx0ZXhwb3J0cy5QQVRDSC5hcHBseSh0aGlzLCBbaHVua3NdKTtcclxuXHR9XHJcblx0ZXhwb3J0cy5BVElOREVYLnByb3RvdHlwZSA9IG5ldyBleHBvcnRzLlBBVENIKFwiX19obW1fX1wiKTsgLy8gaW5oZXJpdCBwcm90b3R5cGVcclxuXHJcbmV4cG9ydHMuTUFQID0gZnVuY3Rpb24gKG9wKSB7XHJcblx0aWYgKG9wID09IG51bGwpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgQXJndW1lbnRcIik7XHJcblx0dGhpcy5vcCA9IG9wO1xyXG5cdE9iamVjdC5mcmVlemUodGhpcyk7XHJcbn1cclxuZXhwb3J0cy5NQVAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShqb3QuQmFzZU9wZXJhdGlvbi5wcm90b3R5cGUpOyAvLyBpbmhlcml0XHJcbmpvdC5hZGRfb3AoZXhwb3J0cy5NQVAsIGV4cG9ydHMsICdNQVAnKTtcclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZXhwb3J0cy5QQVRDSC5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uKGRlcHRoKSB7XHJcblx0cmV0dXJuIHV0aWwuZm9ybWF0KFwiPFBBVENIJXM+XCIsXHJcblx0XHR0aGlzLmh1bmtzLm1hcChmdW5jdGlvbihodW5rKSB7XHJcblx0XHRcdGlmICgoaHVuay5sZW5ndGggPT0gMSkgJiYgKGh1bmsub3AgaW5zdGFuY2VvZiBleHBvcnRzLk1BUCkpXHJcblx0XHRcdFx0Ly8gc3BlY2lhbCBmb3JtYXRcclxuXHRcdFx0XHRyZXR1cm4gdXRpbC5mb3JtYXQoXCIgKyVkICVzXCIsXHJcblx0XHRcdFx0XHRodW5rLm9mZnNldCxcclxuXHRcdFx0XHRcdGh1bmsub3Aub3AuaW5zcGVjdChkZXB0aC0xKSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gdXRpbC5mb3JtYXQoXCIgKyVkeCVkICVzXCIsXHJcblx0XHRcdFx0aHVuay5vZmZzZXQsXHJcblx0XHRcdFx0aHVuay5sZW5ndGgsXHJcblx0XHRcdFx0aHVuay5vcCBpbnN0YW5jZW9mIHZhbHVlcy5TRVRcclxuXHRcdFx0XHRcdD8gdXRpbC5mb3JtYXQoXCIlalwiLCBodW5rLm9wLnZhbHVlKVxyXG5cdFx0XHRcdFx0OiBodW5rLm9wLmluc3BlY3QoZGVwdGgtMSkpXHJcblx0XHR9KS5qb2luKFwiLFwiKSk7XHJcbn1cclxuXHJcbmV4cG9ydHMuUEFUQ0gucHJvdG90eXBlLnZpc2l0ID0gZnVuY3Rpb24odmlzaXRvcikge1xyXG5cdC8vIEEgc2ltcGxlIHZpc2l0b3IgcGFyYWRpZ20uIFJlcGxhY2UgdGhpcyBvcGVyYXRpb24gaW5zdGFuY2UgaXRzZWxmXHJcblx0Ly8gYW5kIGFueSBvcGVyYXRpb24gd2l0aGluIGl0IHdpdGggdGhlIHZhbHVlIHJldHVybmVkIGJ5IGNhbGxpbmdcclxuXHQvLyB2aXNpdG9yIG9uIGl0c2VsZiwgb3IgaWYgdGhlIHZpc2l0b3IgcmV0dXJucyBhbnl0aGluZyBmYWxzZXlcclxuXHQvLyAocHJvYmFibHkgdW5kZWZpbmVkKSB0aGVuIHJldHVybiB0aGUgb3BlcmF0aW9uIHVuY2hhbmdlZC5cclxuXHR2YXIgcmV0ID0gbmV3IGV4cG9ydHMuUEFUQ0godGhpcy5odW5rcy5tYXAoZnVuY3Rpb24oaHVuaykge1xyXG5cdFx0dmFyIHJldCA9IHNoYWxsb3dfY2xvbmUoaHVuayk7XHJcblx0XHRyZXQub3AgPSByZXQub3AudmlzaXQodmlzaXRvcik7XHJcblx0XHRyZXR1cm4gcmV0O1xyXG5cdH0pKTtcclxuXHRyZXR1cm4gdmlzaXRvcihyZXQpIHx8IHJldDtcclxufVxyXG5cclxuZXhwb3J0cy5QQVRDSC5wcm90b3R5cGUuaW50ZXJuYWxUb0pTT04gPSBmdW5jdGlvbihqc29uLCBwcm90b2NvbF92ZXJzaW9uKSB7XHJcblx0anNvbi5odW5rcyA9IHRoaXMuaHVua3MubWFwKGZ1bmN0aW9uKGh1bmspIHtcclxuXHRcdHZhciByZXQgPSBzaGFsbG93X2Nsb25lKGh1bmspO1xyXG5cdFx0cmV0Lm9wID0gcmV0Lm9wLnRvSlNPTih1bmRlZmluZWQsIHByb3RvY29sX3ZlcnNpb24pO1xyXG5cdFx0cmV0dXJuIHJldDtcclxuXHR9KTtcclxufVxyXG5cclxuZXhwb3J0cy5QQVRDSC5pbnRlcm5hbEZyb21KU09OID0gZnVuY3Rpb24oanNvbiwgcHJvdG9jb2xfdmVyc2lvbiwgb3BfbWFwKSB7XHJcblx0dmFyIGh1bmtzID0ganNvbi5odW5rcy5tYXAoZnVuY3Rpb24oaHVuaykge1xyXG5cdFx0dmFyIHJldCA9IHNoYWxsb3dfY2xvbmUoaHVuayk7XHJcblx0XHRyZXQub3AgPSBqb3Qub3BGcm9tSlNPTihodW5rLm9wLCBwcm90b2NvbF92ZXJzaW9uLCBvcF9tYXApO1xyXG5cdFx0cmV0dXJuIHJldDtcclxuXHR9KTtcclxuXHRyZXR1cm4gbmV3IGV4cG9ydHMuUEFUQ0goaHVua3MpO1xyXG59XHJcblxyXG5leHBvcnRzLlBBVENILnByb3RvdHlwZS5hcHBseSA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xyXG5cdC8qIEFwcGxpZXMgdGhlIG9wZXJhdGlvbiB0byBhIGRvY3VtZW50LiBSZXR1cm5zIGEgbmV3IHNlcXVlbmNlIHRoYXQgaXNcclxuXHRcdCB0aGUgc2FtZSB0eXBlIGFzIGRvY3VtZW50IGJ1dCB3aXRoIHRoZSBodW5rcyBhcHBsaWVkLiAqL1xyXG5cdFxyXG5cdHZhciBpbmRleCA9IDA7XHJcblx0dmFyIHJldCA9IGRvY3VtZW50LnNsaWNlKDAsMCk7IC8vIHN0YXJ0IHdpdGggYW4gZW1wdHkgZG9jdW1lbnRcclxuXHRcclxuXHR0aGlzLmh1bmtzLmZvckVhY2goZnVuY3Rpb24oaHVuaykge1xyXG5cdFx0aWYgKGluZGV4ICsgaHVuay5vZmZzZXQgKyBodW5rLmxlbmd0aCA+IGRvY3VtZW50Lmxlbmd0aClcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwib2Zmc2V0IHBhc3QgZW5kIG9mIGRvY3VtZW50XCIpO1xyXG5cclxuXHRcdC8vIEFwcGVuZCB1bmNoYW5nZWQgY29udGVudCBiZWZvcmUgdGhpcyBodW5rLlxyXG5cdFx0cmV0ID0gY29uY2F0MihyZXQsIGRvY3VtZW50LnNsaWNlKGluZGV4LCBpbmRleCtodW5rLm9mZnNldCkpO1xyXG5cdFx0aW5kZXggKz0gaHVuay5vZmZzZXQ7XHJcblxyXG5cdFx0Ly8gQXBwZW5kIG5ldyBjb250ZW50LlxyXG5cdFx0dmFyIG5ld192YWx1ZSA9IGh1bmsub3AuYXBwbHkoZG9jdW1lbnQuc2xpY2UoaW5kZXgsIGluZGV4K2h1bmsubGVuZ3RoKSk7XHJcblxyXG5cdFx0aWYgKHR5cGVvZiBkb2N1bWVudCA9PSBcInN0cmluZ1wiICYmIHR5cGVvZiBuZXdfdmFsdWUgIT0gXCJzdHJpbmdcIilcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwib3BlcmF0aW9uIHlpZWxkZWQgaW52YWxpZCBzdWJzdHJpbmdcIik7XHJcblx0XHRpZiAoQXJyYXkuaXNBcnJheShkb2N1bWVudCkgJiYgIUFycmF5LmlzQXJyYXkobmV3X3ZhbHVlKSlcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwib3BlcmF0aW9uIHlpZWxkZWQgaW52YWxpZCBzdWJhcnJheVwiKTtcclxuXHJcblx0XHRyZXQgPSBjb25jYXQyKHJldCwgbmV3X3ZhbHVlKTtcclxuXHJcblx0XHQvLyBBZHZhbmNlIGNvdW50ZXIuXHJcblx0XHRpbmRleCArPSBodW5rLmxlbmd0aDtcclxuXHR9KTtcclxuXHRcclxuXHQvLyBBcHBlbmQgdW5jaGFuZ2VkIGNvbnRlbnQgYWZ0ZXIgdGhlIGxhc3QgaHVuay5cclxuXHRyZXQgPSBjb25jYXQyKHJldCwgZG9jdW1lbnQuc2xpY2UoaW5kZXgpKTtcclxuXHRcclxuXHRyZXR1cm4gcmV0O1xyXG59XHJcblxyXG5leHBvcnRzLlBBVENILnByb3RvdHlwZS5zaW1wbGlmeSA9IGZ1bmN0aW9uICgpIHtcclxuXHQvKiBSZXR1cm5zIGEgbmV3IGF0b21pYyBvcGVyYXRpb24gdGhhdCBpcyBhIHNpbXBsZXIgdmVyc2lvblxyXG5cdFx0IG9mIHRoaXMgb3BlcmF0aW9uLiovXHJcblxyXG5cdC8vIFNpbXBsaWZ5IHRoZSBodW5rcyBieSByZW1vdmluZyBhbnkgdGhhdCBkb24ndCBtYWtlIGNoYW5nZXMuXHJcblx0Ly8gQWRqdXN0IG9mZnNldHMuXHJcblxyXG5cdC8vIFNvbWUgb2YgdGhlIGNvbXBvc2l0aW9uIG1ldGhvZHMgcmVxdWlyZSBrbm93aW5nIGlmIHRoZXNlIG9wZXJhdGlvbnNcclxuXHQvLyBhcmUgb3BlcmF0aW5nIG9uIGEgc3RyaW5nIG9yIGFuIGFycmF5LiBXZSBtaWdodCBub3Qga25vdyBpZiB0aGUgUEFUQ0hcclxuXHQvLyBvbmx5IGhhcyBzdWItb3BlcmF0aW9ucyB3aGVyZSB3ZSBjYW4ndCB0ZWxsLCBsaWtlIGEgTUFQLlxyXG5cdHZhciBkb2N0eXBlID0gbnVsbDtcclxuXHR0aGlzLmh1bmtzLmZvckVhY2goZnVuY3Rpb24gKGh1bmspIHtcclxuXHRcdGlmIChodW5rLm9wIGluc3RhbmNlb2YgdmFsdWVzLlNFVCkge1xyXG5cdFx0XHRpZiAodHlwZW9mIGh1bmsub3AudmFsdWUgPT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRkb2N0eXBlID0gXCJzdHJpbmdcIjtcclxuXHRcdFx0ZWxzZSBpZiAoQXJyYXkuaXNBcnJheShodW5rLm9wLnZhbHVlKSlcclxuXHRcdFx0XHRkb2N0eXBlID0gXCJhcnJheVwiO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQvLyBGb3JtIGEgbmV3IHNldCBvZiBtZXJnZWQgaHVua3MuXHJcblxyXG5cdHZhciBodW5rcyA9IFtdO1xyXG5cdHZhciBkb2Zmc2V0ID0gMDtcclxuXHJcblx0ZnVuY3Rpb24gaGFuZGxlX2h1bmsoaHVuaykge1xyXG5cdFx0dmFyIG9wID0gaHVuay5vcC5zaW1wbGlmeSgpO1xyXG5cdFx0XHJcblx0XHRpZiAob3AuaXNOb09wKCkpIHtcclxuXHRcdFx0Ly8gRHJvcCBpdCwgYnV0IGFkanVzdCBmdXR1cmUgb2Zmc2V0cy5cclxuXHRcdFx0ZG9mZnNldCArPSBodW5rLm9mZnNldCArIGh1bmsubGVuZ3RoO1xyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0fSBlbHNlIGlmIChodW5rLmxlbmd0aCA9PSAwICYmIGh1bmsub3AuZ2V0X2xlbmd0aF9jaGFuZ2UoaHVuay5sZW5ndGgpID09IDApIHtcclxuXHRcdFx0Ly8gVGhlIGh1bmsgZG9lcyBub3RoaW5nLiBEcm9wIGl0LCBidXQgYWRqdXN0IGZ1dHVyZSBvZmZzZXRzLlxyXG5cdFx0XHRkb2Zmc2V0ICs9IGh1bmsub2Zmc2V0O1xyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0fSBlbHNlIGlmIChodW5rcy5sZW5ndGggPiAwXHJcblx0XHRcdCYmIGh1bmsub2Zmc2V0ID09IDBcclxuXHRcdFx0JiYgZG9mZnNldCA9PSAwXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gVGhlIGh1bmtzIGFyZSBhZGphY2VudC4gV2UgY2FuIGNvbWJpbmUgdGhlbVxyXG5cdFx0XHQvLyBpZiBvbmUgb2YgdGhlIG9wZXJhdGlvbnMgaXMgYSBTRVQgYW5kIHRoZSBvdGhlclxyXG5cdFx0XHQvLyBpcyBhIFNFVCBvciBhIE1BUCBjb250YWluaW5nIGEgU0VULlxyXG5cdFx0XHQvLyBXZSBjYW4ndCBjb21iaW5lIHR3byBhZGphbmNlbnQgTUFQLT5TRVQncyBiZWNhdXNlXHJcblx0XHRcdC8vIHdlIHdvdWxkbid0IGtub3cgd2hldGhlciB0aGUgY29tYmluZWQgdmFsdWUgKGluXHJcblx0XHRcdC8vIGEgU0VUKSBzaG91bGQgYmUgYSBzdHJpbmcgb3IgYW4gYXJyYXkuXHJcblx0XHRcdGlmICgoaHVua3NbaHVua3MubGVuZ3RoLTFdLm9wIGluc3RhbmNlb2YgdmFsdWVzLlNFVFxyXG5cdFx0XHRcdHx8IChodW5rc1todW5rcy5sZW5ndGgtMV0ub3AgaW5zdGFuY2VvZiBleHBvcnRzLk1BUCAmJiBodW5rc1todW5rcy5sZW5ndGgtMV0ub3Aub3AgaW5zdGFuY2VvZiB2YWx1ZXMuU0VUKSlcclxuXHRcdFx0ICYmIChodW5rLm9wIGluc3RhbmNlb2YgdmFsdWVzLlNFVCB8fCBcclxuXHRcdFx0IFx0ICAoaHVuay5vcCBpbnN0YW5jZW9mIGV4cG9ydHMuTUFQICYmIGh1bmsub3Aub3AgaW5zdGFuY2VvZiB2YWx1ZXMuU0VUKSApXHJcblx0XHRcdCAmJiBkb2N0eXBlICE9IG51bGwpIHtcclxuXHJcblx0XHRcdFx0ZnVuY3Rpb24gZ2V0X3ZhbHVlKGh1bmspIHtcclxuXHRcdFx0XHQgXHRpZiAoaHVuay5vcCBpbnN0YW5jZW9mIHZhbHVlcy5TRVQpIHtcclxuXHRcdFx0XHQgXHRcdC8vIFRoZSB2YWx1ZSBpcyBqdXN0IHRoZSBTRVQncyB2YWx1ZS5cclxuXHRcdFx0XHQgXHRcdHJldHVybiBodW5rLm9wLnZhbHVlO1xyXG5cdFx0XHRcdCBcdH0gZWxzZSB7XHJcblx0XHRcdFx0IFx0XHQvLyBUaGUgdmFsdWUgaXMgYSBzZXF1ZW5jZSBvZiB0aGUgaHVuaydzIGxlbmd0aFxyXG5cdFx0XHRcdCBcdFx0Ly8gd2hlcmUgZWFjaCBlbGVtZW50IGlzIHRoZSB2YWx1ZSBvZiB0aGUgaW5uZXJcclxuXHRcdFx0XHQgXHRcdC8vIFNFVCdzIHZhbHVlLlxyXG5cdFx0XHRcdFx0IFx0dmFyIHZhbHVlID0gW107XHJcblx0XHRcdFx0XHQgXHRmb3IgKHZhciBpID0gMDsgaSA8IGh1bmsubGVuZ3RoOyBpKyspXHJcblx0XHRcdFx0XHQgXHRcdHZhbHVlLnB1c2goaHVuay5vcC5vcC52YWx1ZSk7XHJcblxyXG5cdFx0XHRcdFx0IFx0Ly8gSWYgdGhlIG91dGVyIHZhbHVlIGlzIGEgc3RyaW5nLCByZWZvcm0gaXQgYXNcclxuXHRcdFx0XHRcdCBcdC8vIGEgc3RyaW5nLlxyXG5cdFx0XHRcdFx0IFx0aWYgKGRvY3R5cGUgPT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRcdCBcdFx0dmFsdWUgPSB2YWx1ZS5qb2luKFwiXCIpO1xyXG5cdFx0XHRcdFx0IFx0cmV0dXJuIHZhbHVlO1xyXG5cdFx0XHRcdCBcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGh1bmtzW2h1bmtzLmxlbmd0aC0xXSA9IHtcclxuXHRcdFx0XHRcdG9mZnNldDogaHVua3NbaHVua3MubGVuZ3RoLTFdLm9mZnNldCxcclxuXHRcdFx0XHRcdGxlbmd0aDogaHVua3NbaHVua3MubGVuZ3RoLTFdLmxlbmd0aCArIGh1bmsubGVuZ3RoLFxyXG5cdFx0XHRcdFx0b3A6IG5ldyB2YWx1ZXMuU0VUKFxyXG5cdFx0XHRcdFx0XHRjb25jYXQyKFxyXG5cdFx0XHRcdFx0XHRcdGdldF92YWx1ZShodW5rc1todW5rcy5sZW5ndGgtMV0pLFxyXG5cdFx0XHRcdFx0XHRcdGdldF92YWx1ZShodW5rKSlcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcmVzZXJ2ZSBidXQgYWRqdXN0IG9mZnNldC5cclxuXHRcdGh1bmtzLnB1c2goe1xyXG5cdFx0XHRvZmZzZXQ6IGh1bmsub2Zmc2V0K2RvZmZzZXQsXHJcblx0XHRcdGxlbmd0aDogaHVuay5sZW5ndGgsXHJcblx0XHRcdG9wOiBvcFxyXG5cdFx0fSk7XHJcblx0XHRkb2Zmc2V0ID0gMDtcclxuXHR9XHJcblx0XHJcblx0dGhpcy5odW5rcy5mb3JFYWNoKGhhbmRsZV9odW5rKTtcclxuXHRpZiAoaHVua3MubGVuZ3RoID09IDApXHJcblx0XHRyZXR1cm4gbmV3IHZhbHVlcy5OT19PUCgpO1xyXG5cdFxyXG5cdHJldHVybiBuZXcgZXhwb3J0cy5QQVRDSChodW5rcyk7XHJcbn1cclxuXHJcbmV4cG9ydHMuUEFUQ0gucHJvdG90eXBlLmRyaWxsZG93biA9IGZ1bmN0aW9uKGluZGV4X29yX2tleSkge1xyXG5cdGlmICghTnVtYmVyLmlzSW50ZWdlcihpbmRleF9vcl9rZXkpIHx8IGluZGV4X29yX2tleSA8IDApXHJcblx0XHRyZXR1cm4gbmV3IHZhbHVlcy5OT19PUCgpO1xyXG5cdHZhciBpbmRleCA9IDA7XHJcblx0dmFyIHJldCA9IG51bGw7XHJcblx0dGhpcy5odW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGh1bmspIHtcclxuXHRcdGluZGV4ICs9IGh1bmsub2Zmc2V0O1xyXG5cdFx0aWYgKGluZGV4IDw9IGluZGV4X29yX2tleSAmJiBpbmRleF9vcl9rZXkgPCBpbmRleCtodW5rLmxlbmd0aClcclxuXHRcdFx0cmV0ID0gaHVuay5vcC5kcmlsbGRvd24oaW5kZXhfb3Jfa2V5LWluZGV4KTtcclxuXHRcdGluZGV4ICs9IGh1bmsubGVuZ3RoO1xyXG5cdH0pXHJcblx0cmV0dXJuIHJldCA/IHJldCA6IG5ldyB2YWx1ZXMuTk9fT1AoKTtcclxufVxyXG5cclxuZXhwb3J0cy5QQVRDSC5wcm90b3R5cGUuaW52ZXJzZSA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xyXG5cdC8qIFJldHVybnMgYSBuZXcgYXRvbWljIG9wZXJhdGlvbiB0aGF0IGlzIHRoZSBpbnZlcnNlIG9mIHRoaXMgb3BlcmF0aW9uLFxyXG5cdCAgIGdpdmVuIHRoZSBzdGF0ZSBvZiB0aGUgZG9jdW1lbnQgYmVmb3JlIHRoaXMgb3BlcmF0aW9uIGFwcGxpZXMuXHJcblx0ICAgVGhlIGludmVyc2Ugc2ltcGx5IGludmVydHMgdGhlIG9wZXJhdGlvbnMgb24gdGhlIGh1bmtzLCBidXQgdGhlXHJcblx0ICAgbGVuZ3RocyBoYXZlIHRvIGJlIGZpeGVkLiAqL1xyXG5cdHZhciBvZmZzZXQgPSAwO1xyXG5cdHJldHVybiBuZXcgZXhwb3J0cy5QQVRDSCh0aGlzLmh1bmtzLm1hcChmdW5jdGlvbihodW5rKSB7XHJcblx0XHR2YXIgbmV3aHVuayA9IHtcclxuXHRcdFx0b2Zmc2V0OiBodW5rLm9mZnNldCxcclxuXHRcdFx0bGVuZ3RoOiBodW5rLmxlbmd0aCArIGh1bmsub3AuZ2V0X2xlbmd0aF9jaGFuZ2UoaHVuay5sZW5ndGgpLFxyXG5cdFx0XHRvcDogaHVuay5vcC5pbnZlcnNlKGRvY3VtZW50LnNsaWNlKG9mZnNldCtodW5rLm9mZnNldCwgb2Zmc2V0K2h1bmsub2Zmc2V0K2h1bmsubGVuZ3RoKSlcclxuXHRcdH1cclxuXHRcdG9mZnNldCArPSBodW5rLm9mZnNldCArIGh1bmsubGVuZ3RoO1xyXG5cdFx0cmV0dXJuIG5ld2h1bms7XHJcblx0fSkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb21wb3NlX3BhdGNoZXMoYSwgYikge1xyXG5cdC8vIENvbXBvc2UgdHdvIHBhdGNoZXMuIFdlIGRvIHRoaXMgYXMgaWYgd2UgYXJlIHppcHBpbmcgdXAgdHdvIHNlcXVlbmNlcyxcclxuXHQvLyB3aGVyZSB0aGUgaW5kZXggaW50byB0aGUgKGh5cG90aGV0aWNhbCkgc2VxdWVuY2UgdGhhdCByZXN1bHRzICphZnRlcipcclxuXHQvLyBhIGlzIGFwcGxpZWQgbGluZXMgdXAgd2l0aCB0aGUgaW5kZXggaW50byB0aGUgKGh5cG90aGV0aWNhbCkgc2VxdWVuY2VcclxuXHQvLyBiZWZvcmUgYiBpcyBhcHBsaWVkLlxyXG5cdFxyXG5cdHZhciBodW5rcyA9IFtdO1xyXG5cdHZhciBpbmRleCA9IDA7XHJcblxyXG5cdGZ1bmN0aW9uIG1ha2Vfc3RhdGUob3AsIHNpZGUpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGluZGV4OiAwLFxyXG5cdFx0XHRodW5rczogb3AuaHVua3Muc2xpY2UoKSwgLy8gY2xvbmVcclxuXHRcdFx0ZW1wdHk6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5odW5rcy5sZW5ndGggPT0gMDsgfSxcclxuXHRcdFx0dGFrZTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0dmFyIGN1cmVuZCA9IHRoaXMuZW5kKCk7XHJcblx0XHRcdFx0dmFyIGggPSB0aGlzLmh1bmtzLnNoaWZ0KCk7XHJcblx0XHRcdFx0aHVua3MucHVzaCh7XHJcblx0XHRcdFx0XHRvZmZzZXQ6IHRoaXMuaW5kZXggKyBoLm9mZnNldCAtIGluZGV4LFxyXG5cdFx0XHRcdFx0bGVuZ3RoOiBoLmxlbmd0aCxcclxuXHRcdFx0XHRcdG9wOiBoLm9wXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGhpcy5pbmRleCA9IGN1cmVuZDtcclxuXHRcdFx0XHRpbmRleCA9IHRoaXMuaW5kZXg7XHJcblx0XHRcdH0sXHJcblx0XHRcdHNraXA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHRoaXMuaW5kZXggPSB0aGlzLmVuZCgpO1xyXG5cdFx0XHRcdHRoaXMuaHVua3Muc2hpZnQoKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0c3RhcnQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmluZGV4ICsgdGhpcy5odW5rc1swXS5vZmZzZXQ7XHJcblx0XHRcdH0sXHJcblx0XHRcdGVuZDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0dmFyIGggPSB0aGlzLmh1bmtzWzBdO1xyXG5cdFx0XHRcdHZhciByZXQgPSB0aGlzLmluZGV4ICsgaC5vZmZzZXQgKyBoLmxlbmd0aDtcclxuXHRcdFx0XHRpZiAoc2lkZSA9PSAwKVxyXG5cdFx0XHRcdFx0cmV0ICs9IGgub3AuZ2V0X2xlbmd0aF9jaGFuZ2UoaC5sZW5ndGgpO1xyXG5cdFx0XHRcdHJldHVybiByZXQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0dmFyIGFfc3RhdGUgPSBtYWtlX3N0YXRlKGEsIDApLFxyXG5cdCAgICBiX3N0YXRlID0gbWFrZV9zdGF0ZShiLCAxKTtcclxuXHRcclxuXHR3aGlsZSAoIWFfc3RhdGUuZW1wdHkoKSB8fCAhYl9zdGF0ZS5lbXB0eSgpKSB7XHJcblx0XHQvLyBPbmx5IG9wZXJhdGlvbnMgaW4gJ2EnIGFyZSByZW1haW5pbmcuXHJcblx0XHRpZiAoYl9zdGF0ZS5lbXB0eSgpKSB7XHJcblx0XHRcdGFfc3RhdGUudGFrZSgpO1xyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBPbmx5IG9wZXJhdGlvbnMgaW4gJ2InIGFyZSByZW1haW5pbmcuXHJcblx0XHRpZiAoYV9zdGF0ZS5lbXB0eSgpKSB7XHJcblx0XHRcdGJfc3RhdGUudGFrZSgpO1xyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBUaGUgbmV4dCBodW5rIGluICdhJyBwcmVjZWRlcyB0aGUgbmV4dCBodW5rIGluICdiJy5cclxuXHRcdGlmIChhX3N0YXRlLmVuZCgpIDw9IGJfc3RhdGUuc3RhcnQoKSkge1xyXG5cdFx0XHRhX3N0YXRlLnRha2UoKTtcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVGhlIG5leHQgaHVuayBpbiAnYicgcHJlY2VkZXMgdGhlIG5leHQgaHVuayBpbiAnYScuXHJcblx0XHRpZiAoYl9zdGF0ZS5lbmQoKSA8PSBhX3N0YXRlLnN0YXJ0KCkpIHtcclxuXHRcdFx0Yl9zdGF0ZS50YWtlKCk7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRoZXJlJ3Mgb3ZlcmxhcC5cclxuXHJcblx0XHR2YXIgZHhfc3RhcnQgPSBiX3N0YXRlLnN0YXJ0KCkgLSBhX3N0YXRlLnN0YXJ0KCk7XHJcblx0XHR2YXIgZHhfZW5kID0gYl9zdGF0ZS5lbmQoKSAtIGFfc3RhdGUuZW5kKCk7XHJcblx0XHRpZiAoZHhfc3RhcnQgPj0gMCAmJiBkeF9lbmQgPD0gMCkge1xyXG5cdFx0XHQvLyAnYScgd2hvbGx5IGVuY29tcGFzc2VzICdiJywgaW5jbHVkaW5nIHRoZSBjYXNlIHdoZXJlIHRoZXlcclxuXHRcdFx0Ly8gY2hhbmdlZCB0aGUgZXhhY3Qgc2FtZSBlbGVtZW50cy5cclxuXHJcblx0XHRcdC8vIENvbXBvc2UgYSdzIGFuZCBiJ3Mgc3Vib3BlcmF0aW9ucyB1c2luZ1xyXG5cdFx0XHQvLyBhdG9taWNfY29tcG9zZS4gSWYgdGhlIHR3byBodW5rcyBjaGFuZ2VkIHRoZSBleGFjdCBzYW1lXHJcblx0XHRcdC8vIGVsZW1lbnRzLCB0aGVuIHdlIGNhbiBjb21wb3NlIHRoZSB0d28gb3BlcmF0aW9ucyBkaXJlY3RseS5cclxuXHRcdFx0dmFyIGJfb3AgPSBiX3N0YXRlLmh1bmtzWzBdLm9wO1xyXG5cdFx0XHR2YXIgZHggPSBiX29wLmdldF9sZW5ndGhfY2hhbmdlKGJfc3RhdGUuaHVua3NbMF0ubGVuZ3RoKTtcclxuXHRcdFx0aWYgKGR4X3N0YXJ0ICE9IDAgfHwgZHhfZW5kICE9IDApIHtcclxuXHRcdFx0XHQvLyBJZiBhIHN0YXJ0cyBiZWZvcmUgYiwgd3JhcCBiX29wIGluIGEgUEFUQ0ggb3BlcmF0aW9uXHJcblx0XHRcdFx0Ly8gc28gdGhhdCB0aGV5IGNhbiBiZSBjb25zaWRlcmVkIHRvIHN0YXJ0IGF0IHRoZSBzYW1lXHJcblx0XHRcdFx0Ly8gbG9jYXRpb24uXHJcblx0XHRcdFx0Yl9vcCA9IG5ldyBleHBvcnRzLlBBVENIKFt7IG9mZnNldDogZHhfc3RhcnQsIGxlbmd0aDogYl9zdGF0ZS5odW5rc1swXS5sZW5ndGgsIG9wOiBiX29wIH1dKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVHJ5IGFuIGF0b21pYyBjb21wb3NpdGlvbi5cclxuXHRcdFx0dmFyIGFiID0gYV9zdGF0ZS5odW5rc1swXS5vcC5hdG9taWNfY29tcG9zZShiX29wKTtcclxuXHRcdFx0aWYgKCFhYiAmJiBkeF9zdGFydCA9PSAwICYmIGR4X2VuZCA9PSAwICYmIGJfb3AgaW5zdGFuY2VvZiBleHBvcnRzLk1BUCAmJiBiX29wLm9wIGluc3RhbmNlb2YgdmFsdWVzLlNFVClcclxuXHRcdFx0XHRhYiA9IGJfb3A7XHJcblxyXG5cdFx0XHRpZiAoYWIpIHtcclxuXHRcdFx0XHQvLyBSZXBsYWNlIHRoZSAnYScgb3BlcmF0aW9uIHdpdGggaXRzZWxmIGNvbXBvc2VkIHdpdGggYidzIG9wZXJhdGlvbi5cclxuXHRcdFx0XHQvLyBEb24ndCB0YWtlIGl0IHlldCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG1vcmUgY29taW5nIG9uIGInc1xyXG5cdFx0XHRcdC8vIHNpZGUgdGhhdCBpcyB3aXRoaW4gdGhlIHJhbmdlIG9mICdhJy5cclxuXHRcdFx0XHRhX3N0YXRlLmh1bmtzWzBdID0ge1xyXG5cdFx0XHRcdFx0b2Zmc2V0OiBhX3N0YXRlLmh1bmtzWzBdLm9mZnNldCxcclxuXHRcdFx0XHRcdGxlbmd0aDogYV9zdGF0ZS5odW5rc1swXS5sZW5ndGgsXHJcblx0XHRcdFx0XHRvcDogYWJcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQvLyBTaW5jZSB0aGUgYV9zdGF0ZSBodW5rcyBoYXZlIGJlZW4gcmV3cml0dGVuLCB0aGUgaW5kZXhpbmcgbmVlZHNcclxuXHRcdFx0XHQvLyB0byBiZSBhZGp1c3RlZC5cclxuXHRcdFx0XHRiX3N0YXRlLmluZGV4ICs9IGR4O1xyXG5cclxuXHRcdFx0XHQvLyBEcm9wIGIuXHJcblx0XHRcdFx0Yl9zdGF0ZS5za2lwKCk7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIG5vIGF0b21pYyBjb21wb3NpdGlvbiBpcyBwb3NzaWJsZSwgYW5vdGhlciBjYXNlIG1heSB3b3JrIGJlbG93XHJcblx0XHRcdC8vIGJ5IGRlY29tcG9zaW5nIHRoZSBvcGVyYXRpb25zLlxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRoZXJlIGlzIHNvbWUgc29ydCBvZiBvdGhlciBvdmVybGFwLiBXZSBjYW4gaGFuZGxlIHRoaXMgYnkgYXR0ZW1wdGluZ1xyXG5cdFx0Ly8gdG8gZGVjb21wb3NlIHRoZSBvcGVyYXRpb25zLlxyXG5cdFx0aWYgKGR4X3N0YXJ0ID4gMCkge1xyXG5cdFx0XHQvLyAnYScgYmVnaW5zIGZpcnN0LiBBdHRlbXB0IHRvIGRlY29tcG9zZSBpdCBpbnRvIHR3byBvcGVyYXRpb25zLlxyXG5cdFx0XHQvLyBJbmRleGluZyBvZiBkeF9zdGFydCBpcyBiYXNlZCBvbiB0aGUgdmFsdWUgKmFmdGVyKiAnYScgYXBwbGllcyxcclxuXHRcdFx0Ly8gc28gd2UgaGF2ZSB0byBkZWNvbXBvc2UgaXQgYmFzZWQgb24gbmV3LXZhbHVlIGluZGV4ZXMuXHJcblx0XHRcdHZhciBkZWNvbXAgPSBhX3N0YXRlLmh1bmtzWzBdLm9wLmRlY29tcG9zZSh0cnVlLCBkeF9zdGFydCk7XHJcblxyXG5cdFx0XHQvLyBCdXQgd2UgbmVlZCB0byBrbm93IHRoZSBsZW5ndGggb2YgdGhlIG9yaWdpbmFsIGh1bmsgc28gdGhhdFxyXG5cdFx0XHQvLyB0aGUgb3BlcmF0aW9uIGNhdXNlcyBpdHMgZmluYWwgbGVuZ3RoIHRvIGJlIGR4X3N0YXJ0LlxyXG5cdFx0XHR2YXIgYWxlbjA7XHJcblx0XHRcdGlmIChhX3N0YXRlLmh1bmtzWzBdLm9wLmdldF9sZW5ndGhfY2hhbmdlKGFfc3RhdGUuaHVua3NbMF0ubGVuZ3RoKSA9PSAwKVxyXG5cdFx0XHRcdC8vIFRoaXMgaXMgcHJvYmFibHkgYSBNQVAuIElmIHRoZSBodW5rJ3MgbGVuZ3RoIGlzIGR4X3N0YXJ0XHJcblx0XHRcdFx0Ly8gYW5kIHRoZSBvcGVyYXRpb24gY2F1c2VzIG5vIGxlbmd0aCBjaGFuZ2UsIHRoZW4gdGhhdCdzXHJcblx0XHRcdFx0Ly8gdGhlIHJpZ2h0IGxlbmd0aCFcclxuXHRcdFx0XHRhbGVuMCA9IGR4X3N0YXJ0O1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblxyXG5cdFx0XHQvLyBUYWtlIHRoZSBsZWZ0IHBhcnQgb2YgdGhlIGRlY29tcG9zaXRpb24uXHJcblx0XHRcdGh1bmtzLnB1c2goe1xyXG5cdFx0XHRcdG9mZnNldDogYV9zdGF0ZS5pbmRleCArIGFfc3RhdGUuaHVua3NbMF0ub2Zmc2V0IC0gaW5kZXgsXHJcblx0XHRcdFx0bGVuZ3RoOiBhbGVuMCxcclxuXHRcdFx0XHRvcDogZGVjb21wWzBdXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRhX3N0YXRlLmluZGV4ID0gYV9zdGF0ZS5zdGFydCgpICsgZHhfc3RhcnQ7XHJcblx0XHRcdGluZGV4ID0gYV9zdGF0ZS5pbmRleDtcclxuXHJcblx0XHRcdC8vIFJldHVybiB0aGUgcmlnaHQgcGFydCBvZiB0aGUgZGVjb21wb3NpdGlvbiB0byB0aGUgaHVua3MgYXJyYXkuXHJcblx0XHRcdGFfc3RhdGUuaHVua3NbMF0gPSB7XHJcblx0XHRcdFx0b2Zmc2V0OiAwLFxyXG5cdFx0XHRcdGxlbmd0aDogYV9zdGF0ZS5odW5rc1swXS5sZW5ndGggLSBhbGVuMCxcclxuXHRcdFx0XHRvcDogZGVjb21wWzFdXHJcblx0XHRcdH07XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChkeF9zdGFydCA8IDApIHtcclxuXHRcdFx0Ly8gJ2InIGJlZ2lucyBmaXJzdC4gQXR0ZW1wdCB0byBkZWNvbXBvc2UgaXQgaW50byB0d28gb3BlcmF0aW9ucy5cclxuXHRcdFx0dmFyIGRlY29tcCA9IGJfc3RhdGUuaHVua3NbMF0ub3AuZGVjb21wb3NlKGZhbHNlLCAtZHhfc3RhcnQpO1xyXG5cclxuXHRcdFx0Ly8gVGFrZSB0aGUgbGVmdCBwYXJ0IG9mIHRoZSBkZWNvbXBvc2l0aW9uLlxyXG5cdFx0XHRodW5rcy5wdXNoKHtcclxuXHRcdFx0XHRvZmZzZXQ6IGJfc3RhdGUuaW5kZXggKyBiX3N0YXRlLmh1bmtzWzBdLm9mZnNldCAtIGluZGV4LFxyXG5cdFx0XHRcdGxlbmd0aDogKC1keF9zdGFydCksXHJcblx0XHRcdFx0b3A6IGRlY29tcFswXVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Yl9zdGF0ZS5pbmRleCA9IGJfc3RhdGUuc3RhcnQoKSArICgtZHhfc3RhcnQpO1xyXG5cdFx0XHRpbmRleCA9IGJfc3RhdGUuaW5kZXg7XHJcblxyXG5cdFx0XHQvLyBSZXR1cm4gdGhlIHJpZ2h0IHBhcnQgb2YgdGhlIGRlY29tcG9zaXRpb24gdG8gdGhlIGh1bmtzIGFycmF5LlxyXG5cdFx0XHRiX3N0YXRlLmh1bmtzWzBdID0ge1xyXG5cdFx0XHRcdG9mZnNldDogMCxcclxuXHRcdFx0XHRsZW5ndGg6IGJfc3RhdGUuaHVua3NbMF0ubGVuZ3RoIC0gKC1keF9zdGFydCksXHJcblx0XHRcdFx0b3A6IGRlY29tcFsxXVxyXG5cdFx0XHR9O1xyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBUaGUgdHdvIGh1bmtzIHN0YXJ0IGF0IHRoZSBzYW1lIGxvY2F0aW9uIGJ1dCBoYXZlIGRpZmZlcmVudFxyXG5cdFx0Ly8gbGVuZ3Rocy5cclxuXHRcdGlmIChkeF9lbmQgPiAwKSB7XHJcblx0XHRcdC8vICdiJyB3aG9sbHkgZW5jb21wYXNzZXMgJ2EnLlxyXG5cdFx0XHRpZiAoYl9zdGF0ZS5odW5rc1swXS5vcCBpbnN0YW5jZW9mIHZhbHVlcy5TRVQpIHtcclxuXHRcdFx0XHQvLyAnYicgaXMgcmVwbGFjaW5nIGV2ZXJ5dGhpbmcgJ2EnIHRvdWNoZWQgd2l0aFxyXG5cdFx0XHRcdC8vIG5ldyBlbGVtZW50cywgc28gdGhlIGNoYW5nZXMgaW4gJ2EnIGNhbiBiZVxyXG5cdFx0XHRcdC8vIGRyb3BwZWQuIEJ1dCBiJ3MgbGVuZ3RoIGhhcyB0byBiZSB1cGRhdGVkXHJcblx0XHRcdFx0Ly8gaWYgJ2EnIGNoYW5nZWQgdGhlIGxlbmd0aCBvZiBpdHMgc3Vic2VxdWVuY2UuXHJcblx0XHRcdFx0dmFyIGR4ID0gYV9zdGF0ZS5odW5rc1swXS5vcC5nZXRfbGVuZ3RoX2NoYW5nZShhX3N0YXRlLmh1bmtzWzBdLmxlbmd0aCk7XHJcblx0XHRcdFx0Yl9zdGF0ZS5odW5rc1swXSA9IHtcclxuXHRcdFx0XHRcdG9mZnNldDogYl9zdGF0ZS5odW5rc1swXS5vZmZzZXQsXHJcblx0XHRcdFx0XHRsZW5ndGg6IGJfc3RhdGUuaHVua3NbMF0ubGVuZ3RoIC0gZHgsXHJcblx0XHRcdFx0XHRvcDogYl9zdGF0ZS5odW5rc1swXS5vcFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0YV9zdGF0ZS5za2lwKCk7XHJcblx0XHRcdFx0YV9zdGF0ZS5pbmRleCAtPSBkeDtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRPRE8uXHJcblxyXG5cdFx0Ly8gVGhlcmUgaXMgbm8gYXRvbWljIGNvbXBvc2l0aW9uLlxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbmV3IGV4cG9ydHMuUEFUQ0goaHVua3MpLnNpbXBsaWZ5KCk7XHJcbn1cclxuXHJcbmV4cG9ydHMuUEFUQ0gucHJvdG90eXBlLmF0b21pY19jb21wb3NlID0gZnVuY3Rpb24gKG90aGVyKSB7XHJcblx0LyogQ3JlYXRlcyBhIG5ldyBhdG9taWMgb3BlcmF0aW9uIHRoYXQgaGFzIHRoZSBzYW1lIHJlc3VsdCBhcyB0aGlzXHJcblx0XHQgYW5kIG90aGVyIGFwcGxpZWQgaW4gc2VxdWVuY2UgKHRoaXMgZmlyc3QsIG90aGVyIGFmdGVyKS4gUmV0dXJuc1xyXG5cdFx0IG51bGwgaWYgbm8gYXRvbWljIG9wZXJhdGlvbiBpcyBwb3NzaWJsZS4gKi9cclxuXHJcblx0Ly8gYSBQQVRDSCBjb21wb3NlcyB3aXRoIGEgUEFUQ0hcclxuXHRpZiAob3RoZXIgaW5zdGFuY2VvZiBleHBvcnRzLlBBVENIKVxyXG5cdFx0cmV0dXJuIGNvbXBvc2VfcGF0Y2hlcyh0aGlzLCBvdGhlcik7XHJcblxyXG5cdC8vIE5vIGNvbXBvc2l0aW9uIHBvc3NpYmxlLlxyXG5cdHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWJhc2VfcGF0Y2hlcyhhLCBiLCBjb25mbGljdGxlc3MpIHtcclxuXHQvLyBSZWJhc2luZyB0d28gUEFUQ0hlcyB3b3JrcyBsaWtlIGNvbXBvc2UsIGV4Y2VwdCB0aGF0IHdlIGFyZSBhbGlnbmluZ1xyXG5cdC8vICdhJyBhbmQgJ2InIGJvdGggb24gdGhlIHN0YXRlIG9mIHRoZSBkb2N1bWVudCBiZWZvcmUgZWFjaCBoYXMgYXBwbGllZC5cclxuXHQvL1xyXG5cdC8vIFdlIGRvIHRoaXMgYXMgaWYgd2UgYXJlIHppcHBpbmcgdXAgdHdvIHNlcXVlbmNlcywgd2hlcmUgdGhlIGluZGV4IGludG9cclxuXHQvLyB0aGUgKGh5cG90aGV0aWNhbCkgc2VxdWVuY2UsIGJlZm9yZSBlaXRoZXIgb3BlcmF0aW9uIGFwcGxpZXMsIGxpbmVzXHJcblx0Ly8gdXAgYWNyb3NzIHRoZSB0d28gb3BlcmF0aW9ucy5cclxuXHRcclxuXHRmdW5jdGlvbiBtYWtlX3N0YXRlKG9wKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRvbGRfaW5kZXg6IDAsXHJcblx0XHRcdG9sZF9odW5rczogb3AuaHVua3Muc2xpY2UoKSxcclxuXHRcdFx0ZHhfaW5kZXg6IDAsXHJcblx0XHRcdG5ld19odW5rczogW10sXHJcblx0XHRcdGVtcHR5OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMub2xkX2h1bmtzLmxlbmd0aCA9PSAwOyB9LFxyXG5cdFx0XHR0YWtlOiBmdW5jdGlvbihvdGhlciwgaG9sZF9keF9pbmRleCkge1xyXG5cdFx0XHRcdHZhciBoID0gdGhpcy5vbGRfaHVua3Muc2hpZnQoKTtcclxuXHRcdFx0XHR0aGlzLm5ld19odW5rcy5wdXNoKHtcclxuXHRcdFx0XHRcdG9mZnNldDogaC5vZmZzZXQgKyB0aGlzLmR4X2luZGV4LFxyXG5cdFx0XHRcdFx0bGVuZ3RoOiBoLmxlbmd0aCsoaC5kbGVuZ3RofHwwKSxcclxuXHRcdFx0XHRcdG9wOiBoLm9wXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGhpcy5keF9pbmRleCA9IDA7XHJcblx0XHRcdFx0dGhpcy5vbGRfaW5kZXggKz0gaC5vZmZzZXQgKyBoLmxlbmd0aDtcclxuXHRcdFx0XHRpZiAoIWhvbGRfZHhfaW5kZXgpIG90aGVyLmR4X2luZGV4ICs9IGgub3AuZ2V0X2xlbmd0aF9jaGFuZ2UoaC5sZW5ndGgpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRza2lwOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR0aGlzLm9sZF9pbmRleCA9IHRoaXMuZW5kKCk7XHJcblx0XHRcdFx0dGhpcy5vbGRfaHVua3Muc2hpZnQoKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0c3RhcnQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLm9sZF9pbmRleCArIHRoaXMub2xkX2h1bmtzWzBdLm9mZnNldDtcclxuXHRcdFx0fSxcclxuXHRcdFx0ZW5kOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR2YXIgaCA9IHRoaXMub2xkX2h1bmtzWzBdO1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLm9sZF9pbmRleCArIGgub2Zmc2V0ICsgaC5sZW5ndGg7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0dmFyIGFfc3RhdGUgPSBtYWtlX3N0YXRlKGEpLFxyXG5cdCAgICBiX3N0YXRlID0gbWFrZV9zdGF0ZShiKTtcclxuXHRcclxuXHR3aGlsZSAoIWFfc3RhdGUuZW1wdHkoKSB8fCAhYl9zdGF0ZS5lbXB0eSgpKSB7XHJcblx0XHQvLyBPbmx5IG9wZXJhdGlvbnMgaW4gJ2EnIGFyZSByZW1haW5pbmcuXHJcblx0XHRpZiAoYl9zdGF0ZS5lbXB0eSgpKSB7XHJcblx0XHRcdGFfc3RhdGUudGFrZShiX3N0YXRlKTtcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gT25seSBvcGVyYXRpb25zIGluICdiJyBhcmUgcmVtYWluaW5nLlxyXG5cdFx0aWYgKGFfc3RhdGUuZW1wdHkoKSkge1xyXG5cdFx0XHRiX3N0YXRlLnRha2UoYV9zdGF0ZSk7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFR3byBpbnNlcnRpb25zIGF0IHRoZSBzYW1lIGxvY2F0aW9uLlxyXG5cdFx0aWYgKGFfc3RhdGUuc3RhcnQoKSA9PSBiX3N0YXRlLnN0YXJ0KClcclxuXHRcdFx0JiYgYV9zdGF0ZS5vbGRfaHVua3NbMF0ubGVuZ3RoID09IDBcclxuXHRcdFx0JiYgYl9zdGF0ZS5vbGRfaHVua3NbMF0ubGVuZ3RoID09IDApIHtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFRoaXMgaXMgYSBjb25mbGljdCBiZWNhdXNlIHdlIGRvbid0IGtub3cgd2hpY2ggc2lkZVxyXG5cdFx0XHQvLyBnZXRzIGluc2VydGVkIGZpcnN0LlxyXG5cdFx0XHRpZiAoIWNvbmZsaWN0bGVzcylcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHJcblx0XHRcdC8vIE9yIHdlIGNhbiByZXNvbHZlIHRoZSBjb25mbGljdC5cclxuXHRcdFx0aWYgKGpvdC5jbXAoYV9zdGF0ZS5vbGRfaHVua3NbMF0ub3AsIGJfc3RhdGUub2xkX2h1bmtzWzBdLm9wKSA8IDApIHtcclxuXHRcdFx0XHRhX3N0YXRlLnRha2UoYl9zdGF0ZSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Yl9zdGF0ZS50YWtlKGFfc3RhdGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHJcblx0XHQvLyBUaGUgbmV4dCBodW5rIGluICdhJyBwcmVjZWRlcyB0aGUgbmV4dCBodW5rIGluICdiJy5cclxuXHRcdC8vIFRha2UgJ2EnIGFuZCBhZGp1c3QgYidzIG5leHQgb2Zmc2V0LlxyXG5cdFx0aWYgKGFfc3RhdGUuZW5kKCkgPD0gYl9zdGF0ZS5zdGFydCgpKSB7XHJcblx0XHRcdGFfc3RhdGUudGFrZShiX3N0YXRlKTtcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVGhlIG5leHQgaHVuayBpbiAnYicgcHJlY2VkZXMgdGhlIG5leHQgaHVuayBpbiAnYScuXHJcblx0XHQvLyBUYWtlICdiJyBhbmQgYWRqdXN0IGEncyBuZXh0IG9mZnNldC5cclxuXHRcdGlmIChiX3N0YXRlLmVuZCgpIDw9IGFfc3RhdGUuc3RhcnQoKSkge1xyXG5cdFx0XHRiX3N0YXRlLnRha2UoYV9zdGF0ZSk7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRoZXJlJ3Mgb3ZlcmxhcC5cclxuXHJcblx0XHR2YXIgZHhfc3RhcnQgPSBiX3N0YXRlLnN0YXJ0KCkgLSBhX3N0YXRlLnN0YXJ0KCk7XHJcblx0XHR2YXIgZHhfZW5kID0gYl9zdGF0ZS5lbmQoKSAtIGFfc3RhdGUuZW5kKCk7XHJcblxyXG5cdFx0Ly8gVGhleSBib3RoIGFmZmVjdGVkIHRoZSBleGFjdCBzYW1lIHJlZ2lvbiwgc28ganVzdCByZWJhc2UgdGhlXHJcblx0XHQvLyBpbm5lciBvcGVyYXRpb25zIGFuZCB1cGRhdGUgbGVuZ3Rocy5cclxuXHRcdGlmIChkeF9zdGFydCA9PSAwICYmIGR4X2VuZCA9PSAwKSB7XHJcblx0XHRcdC8vIFdoZW4gY29uZmxpY3RsZXNzIGlzIHN1cHBsaWVkIHdpdGggYSBwcmlvciBkb2N1bWVudCBzdGF0ZSxcclxuXHRcdFx0Ly8gdGhlIHN0YXRlIHJlcHJlc2VudHMgdGhlIHNlcXVlbmNlLCBzbyB3ZSBoYXZlIHRvIGRpZyBpbnRvXHJcblx0XHRcdC8vIGl0IGFuZCBwYXNzIGFuIGlubmVyIHZhbHVlXHJcblx0XHRcdHZhciBjb25mbGljdGxlc3MyID0gIWNvbmZsaWN0bGVzcyA/IG51bGwgOiBzaGFsbG93X2Nsb25lKGNvbmZsaWN0bGVzcyk7XHJcblx0XHRcdGlmIChjb25mbGljdGxlc3MyICYmIFwiZG9jdW1lbnRcIiBpbiBjb25mbGljdGxlc3MyKVxyXG5cdFx0XHRcdGNvbmZsaWN0bGVzczIuZG9jdW1lbnQgPSBjb25mbGljdGxlc3MyLmRvY3VtZW50LnNsaWNlKGFfc3RhdGUuc3RhcnQoKSwgYV9zdGF0ZS5lbmQoKSk7XHJcblxyXG5cdFx0XHR2YXIgYXIgPSBhX3N0YXRlLm9sZF9odW5rc1swXS5vcC5yZWJhc2UoYl9zdGF0ZS5vbGRfaHVua3NbMF0ub3AsIGNvbmZsaWN0bGVzczIpO1xyXG5cdFx0XHR2YXIgYnIgPSBiX3N0YXRlLm9sZF9odW5rc1swXS5vcC5yZWJhc2UoYV9zdGF0ZS5vbGRfaHVua3NbMF0ub3AsIGNvbmZsaWN0bGVzczIpO1xyXG5cdFx0XHRpZiAoYXIgPT0gbnVsbCB8fCBiciA9PSBudWxsKVxyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cclxuXHRcdFx0YV9zdGF0ZS5vbGRfaHVua3NbMF0gPSB7XHJcblx0XHRcdFx0b2Zmc2V0OiBhX3N0YXRlLm9sZF9odW5rc1swXS5vZmZzZXQsXHJcblx0XHRcdFx0bGVuZ3RoOiBhX3N0YXRlLm9sZF9odW5rc1swXS5sZW5ndGgsXHJcblx0XHRcdFx0ZGxlbmd0aDogYl9zdGF0ZS5vbGRfaHVua3NbMF0ub3AuZ2V0X2xlbmd0aF9jaGFuZ2UoYl9zdGF0ZS5vbGRfaHVua3NbMF0ubGVuZ3RoKSxcclxuXHRcdFx0XHRvcDogYXJcclxuXHRcdFx0fVxyXG5cdFx0XHRiX3N0YXRlLm9sZF9odW5rc1swXSA9IHtcclxuXHRcdFx0XHRvZmZzZXQ6IGJfc3RhdGUub2xkX2h1bmtzWzBdLm9mZnNldCxcclxuXHRcdFx0XHRsZW5ndGg6IGJfc3RhdGUub2xkX2h1bmtzWzBdLmxlbmd0aCxcclxuXHRcdFx0XHRkbGVuZ3RoOiBhX3N0YXRlLm9sZF9odW5rc1swXS5vcC5nZXRfbGVuZ3RoX2NoYW5nZShhX3N0YXRlLm9sZF9odW5rc1swXS5sZW5ndGgpLFxyXG5cdFx0XHRcdG9wOiBiclxyXG5cdFx0XHR9XHJcblx0XHRcdGFfc3RhdGUudGFrZShiX3N0YXRlLCB0cnVlKTtcclxuXHRcdFx0Yl9zdGF0ZS50YWtlKGFfc3RhdGUsIHRydWUpO1xyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBPdGhlciBvdmVybGFwcyBnZW5lcmF0ZSBjb25mbGljdHMuXHJcblx0XHRpZiAoIWNvbmZsaWN0bGVzcylcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblxyXG5cdFx0Ly8gRGVjb21wb3NlIHdoaWNoZXZlciBvbmUgc3RhcnRzIGZpcnN0IGludG8gdHdvIG9wZXJhdGlvbnMuXHJcblx0XHRpZiAoZHhfc3RhcnQgPiAwKSB7XHJcblx0XHRcdC8vIGEgc3RhcnRzIGZpcnN0LlxyXG5cdFx0XHR2YXIgaHVuayA9IGFfc3RhdGUub2xkX2h1bmtzLnNoaWZ0KCk7XHJcblx0XHRcdHZhciBkZWNvbXAgPSBodW5rLm9wLmRlY29tcG9zZShmYWxzZSwgZHhfc3RhcnQpO1xyXG5cclxuXHRcdFx0Ly8gVW5zaGlmdCB0aGUgcmlnaHQgaGFsZiBvZiB0aGUgZGVjb21wb3NpdGlvbi5cclxuXHRcdFx0YV9zdGF0ZS5vbGRfaHVua3MudW5zaGlmdCh7XHJcblx0XHRcdFx0b2Zmc2V0OiAwLFxyXG5cdFx0XHRcdGxlbmd0aDogaHVuay5sZW5ndGgtZHhfc3RhcnQsXHJcblx0XHRcdFx0b3A6IGRlY29tcFsxXVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFVuc2hpZnQgdGhlIGxlZnQgaGFsZiBvZiB0aGUgZGVjb21wb3NpdGlvbi5cclxuXHRcdFx0YV9zdGF0ZS5vbGRfaHVua3MudW5zaGlmdCh7XHJcblx0XHRcdFx0b2Zmc2V0OiBodW5rLm9mZnNldCxcclxuXHRcdFx0XHRsZW5ndGg6IGR4X3N0YXJ0LFxyXG5cdFx0XHRcdG9wOiBkZWNvbXBbMF1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTaW5jZSB3ZSBrbm93IHRoZSBsZWZ0IGhhbGYgb2NjdXJzIGZpcnN0LCB0YWtlIGl0LlxyXG5cdFx0XHRhX3N0YXRlLnRha2UoYl9zdGF0ZSlcclxuXHJcblx0XHRcdC8vIFN0YXJ0IHRoZSBpdGVyYXRpb24gb3ZlciAtLSB3ZSBzaG91bGQgZW5kIHVwIGF0IHRoZSBibG9ja1xyXG5cdFx0XHQvLyBmb3IgdHdvIGh1bmtzIHRoYXQgbW9kaWZ5IHRoZSBleGFjdCBzYW1lIHJhbmdlLlxyXG5cdFx0XHRjb250aW51ZTtcclxuXHJcblx0XHR9IGVsc2UgaWYgKGR4X3N0YXJ0IDwgMCkge1xyXG5cdFx0XHQvLyBiIHN0YXJ0cyBmaXJzdC5cclxuXHRcdFx0dmFyIGh1bmsgPSBiX3N0YXRlLm9sZF9odW5rcy5zaGlmdCgpO1xyXG5cdFx0XHR2YXIgZGVjb21wID0gaHVuay5vcC5kZWNvbXBvc2UoZmFsc2UsIC1keF9zdGFydCk7XHJcblxyXG5cdFx0XHQvLyBVbnNoaWZ0IHRoZSByaWdodCBoYWxmIG9mIHRoZSBkZWNvbXBvc2l0aW9uLlxyXG5cdFx0XHRiX3N0YXRlLm9sZF9odW5rcy51bnNoaWZ0KHtcclxuXHRcdFx0XHRvZmZzZXQ6IDAsXHJcblx0XHRcdFx0bGVuZ3RoOiBodW5rLmxlbmd0aCtkeF9zdGFydCxcclxuXHRcdFx0XHRvcDogZGVjb21wWzFdXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gVW5zaGlmdCB0aGUgbGVmdCBoYWxmIG9mIHRoZSBkZWNvbXBvc2l0aW9uLlxyXG5cdFx0XHRiX3N0YXRlLm9sZF9odW5rcy51bnNoaWZ0KHtcclxuXHRcdFx0XHRvZmZzZXQ6IGh1bmsub2Zmc2V0LFxyXG5cdFx0XHRcdGxlbmd0aDogLWR4X3N0YXJ0LFxyXG5cdFx0XHRcdG9wOiBkZWNvbXBbMF1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTaW5jZSB3ZSBrbm93IHRoZSBsZWZ0IGhhbGYgb2NjdXJzIGZpcnN0LCB0YWtlIGl0LlxyXG5cdFx0XHRiX3N0YXRlLnRha2UoYV9zdGF0ZSlcclxuXHJcblx0XHRcdC8vIFN0YXJ0IHRoZSBpdGVyYXRpb24gb3ZlciAtLSB3ZSBzaG91bGQgZW5kIHVwIGF0IHRoZSBibG9ja1xyXG5cdFx0XHQvLyBmb3IgdHdvIGh1bmtzIHRoYXQgbW9kaWZ5IHRoZSBleGFjdCBzYW1lIHJhbmdlLlxyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBUaGV5IHN0YXJ0IGF0IHRoZSBzYW1lIHBvaW50LCBidXQgZG9uJ3QgZW5kIGF0IHRoZSBzYW1lXHJcblx0XHQvLyBwb2ludC4gRGVjb21wb3NlIHRoZSBsb25nZXIgb25lLlxyXG5cdFx0ZWxzZSBpZiAoZHhfZW5kIDwgMCkge1xyXG5cdFx0XHQvLyBhIGlzIGxvbmdlci5cclxuXHRcdFx0dmFyIGh1bmsgPSBhX3N0YXRlLm9sZF9odW5rcy5zaGlmdCgpO1xyXG5cdFx0XHR2YXIgZGVjb21wID0gaHVuay5vcC5kZWNvbXBvc2UoZmFsc2UsIGh1bmsubGVuZ3RoK2R4X2VuZCk7XHJcblxyXG5cdFx0XHQvLyBVbnNoaWZ0IHRoZSByaWdodCBoYWxmIG9mIHRoZSBkZWNvbXBvc2l0aW9uLlxyXG5cdFx0XHRhX3N0YXRlLm9sZF9odW5rcy51bnNoaWZ0KHtcclxuXHRcdFx0XHRvZmZzZXQ6IDAsXHJcblx0XHRcdFx0bGVuZ3RoOiAtZHhfZW5kLFxyXG5cdFx0XHRcdG9wOiBkZWNvbXBbMV1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBVbnNoaWZ0IHRoZSBsZWZ0IGhhbGYgb2YgdGhlIGRlY29tcG9zaXRpb24uXHJcblx0XHRcdGFfc3RhdGUub2xkX2h1bmtzLnVuc2hpZnQoe1xyXG5cdFx0XHRcdG9mZnNldDogaHVuay5vZmZzZXQsXHJcblx0XHRcdFx0bGVuZ3RoOiBodW5rLmxlbmd0aCtkeF9lbmQsXHJcblx0XHRcdFx0b3A6IGRlY29tcFswXVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFN0YXJ0IHRoZSBpdGVyYXRpb24gb3ZlciAtLSB3ZSBzaG91bGQgZW5kIHVwIGF0IHRoZSBibG9ja1xyXG5cdFx0XHQvLyBmb3IgdHdvIGh1bmtzIHRoYXQgbW9kaWZ5IHRoZSBleGFjdCBzYW1lIHJhbmdlLlxyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH0gZWxzZSBpZiAoZHhfZW5kID4gMCkge1xyXG5cdFx0XHQvLyBiIGlzIGxvbmdlci5cclxuXHRcdFx0dmFyIGh1bmsgPSBiX3N0YXRlLm9sZF9odW5rcy5zaGlmdCgpO1xyXG5cdFx0XHR2YXIgZGVjb21wID0gaHVuay5vcC5kZWNvbXBvc2UoZmFsc2UsIGh1bmsubGVuZ3RoLWR4X2VuZCk7XHJcblxyXG5cdFx0XHQvLyBVbnNoaWZ0IHRoZSByaWdodCBoYWxmIG9mIHRoZSBkZWNvbXBvc2l0aW9uLlxyXG5cdFx0XHRiX3N0YXRlLm9sZF9odW5rcy51bnNoaWZ0KHtcclxuXHRcdFx0XHRvZmZzZXQ6IDAsXHJcblx0XHRcdFx0bGVuZ3RoOiBkeF9lbmQsXHJcblx0XHRcdFx0b3A6IGRlY29tcFsxXVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFVuc2hpZnQgdGhlIGxlZnQgaGFsZiBvZiB0aGUgZGVjb21wb3NpdGlvbi5cclxuXHRcdFx0Yl9zdGF0ZS5vbGRfaHVua3MudW5zaGlmdCh7XHJcblx0XHRcdFx0b2Zmc2V0OiBodW5rLm9mZnNldCxcclxuXHRcdFx0XHRsZW5ndGg6IGh1bmsubGVuZ3RoLWR4X2VuZCxcclxuXHRcdFx0XHRvcDogZGVjb21wWzBdXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gU3RhcnQgdGhlIGl0ZXJhdGlvbiBvdmVyIC0tIHdlIHNob3VsZCBlbmQgdXAgYXQgdGhlIGJsb2NrXHJcblx0XHRcdC8vIGZvciB0d28gaHVua3MgdGhhdCBtb2RpZnkgdGhlIGV4YWN0IHNhbWUgcmFuZ2UuXHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRocm93IG5ldyBFcnJvcihcIldlIHRob3VnaHQgdGhpcyBsaW5lIHdhcyBub3QgcmVhY2hhYmxlLlwiKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBbXHJcblx0XHRuZXcgZXhwb3J0cy5QQVRDSChhX3N0YXRlLm5ld19odW5rcykuc2ltcGxpZnkoKSxcclxuXHRcdG5ldyBleHBvcnRzLlBBVENIKGJfc3RhdGUubmV3X2h1bmtzKS5zaW1wbGlmeSgpIF07XHJcbn1cclxuXHJcbmV4cG9ydHMuUEFUQ0gucHJvdG90eXBlLnJlYmFzZV9mdW5jdGlvbnMgPSBbXHJcblx0LyogVHJhbnNmb3JtcyB0aGlzIG9wZXJhdGlvbiBzbyB0aGF0IGl0IGNhbiBiZSBjb21wb3NlZCAqYWZ0ZXIqIHRoZSBvdGhlclxyXG5cdFx0IG9wZXJhdGlvbiB0byB5aWVsZCB0aGUgc2FtZSBsb2dpY2FsIGVmZmVjdC4gUmV0dXJucyBudWxsIG9uIGNvbmZsaWN0LiAqL1xyXG5cclxuXHRbZXhwb3J0cy5QQVRDSCwgZnVuY3Rpb24ob3RoZXIsIGNvbmZsaWN0bGVzcykge1xyXG5cdFx0Ly8gUmV0dXJuIHRoZSBuZXcgb3BlcmF0aW9ucy5cclxuXHRcdHJldHVybiByZWJhc2VfcGF0Y2hlcyh0aGlzLCBvdGhlciwgY29uZmxpY3RsZXNzKTtcclxuXHR9XVxyXG5dO1xyXG5cclxuXHJcbmV4cG9ydHMuUEFUQ0gucHJvdG90eXBlLmdldF9sZW5ndGhfY2hhbmdlID0gZnVuY3Rpb24gKG9sZF9sZW5ndGgpIHtcclxuXHQvLyBTdXBwb3J0IHJvdXRpbmUgZm9yIFBBVENIIHRoYXQgcmV0dXJucyB0aGUgY2hhbmdlIGluXHJcblx0Ly8gbGVuZ3RoIHRvIGEgc2VxdWVuY2UgaWYgdGhpcyBvcGVyYXRpb24gaXMgYXBwbGllZCB0byBpdC5cclxuXHR2YXIgZGxlbiA9IDA7XHJcblx0dGhpcy5odW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGh1bmspIHtcclxuXHRcdGRsZW4gKz0gaHVuay5vcC5nZXRfbGVuZ3RoX2NoYW5nZShodW5rLmxlbmd0aCk7XHJcblx0fSk7XHJcblx0cmV0dXJuIGRsZW47XHJcbn1cclxuXHJcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuZXhwb3J0cy5NQVAucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbihkZXB0aCkge1xyXG5cdHJldHVybiB1dGlsLmZvcm1hdChcIjxNQVAgJXM+XCIsIHRoaXMub3AuaW5zcGVjdChkZXB0aC0xKSk7XHJcbn1cclxuXHJcbmV4cG9ydHMuTUFQLnByb3RvdHlwZS52aXNpdCA9IGZ1bmN0aW9uKHZpc2l0b3IpIHtcclxuXHQvLyBBIHNpbXBsZSB2aXNpdG9yIHBhcmFkaWdtLiBSZXBsYWNlIHRoaXMgb3BlcmF0aW9uIGluc3RhbmNlIGl0c2VsZlxyXG5cdC8vIGFuZCBhbnkgb3BlcmF0aW9uIHdpdGhpbiBpdCB3aXRoIHRoZSB2YWx1ZSByZXR1cm5lZCBieSBjYWxsaW5nXHJcblx0Ly8gdmlzaXRvciBvbiBpdHNlbGYsIG9yIGlmIHRoZSB2aXNpdG9yIHJldHVybnMgYW55dGhpbmcgZmFsc2V5XHJcblx0Ly8gKHByb2JhYmx5IHVuZGVmaW5lZCkgdGhlbiByZXR1cm4gdGhlIG9wZXJhdGlvbiB1bmNoYW5nZWQuXHJcblx0dmFyIHJldCA9IG5ldyBleHBvcnRzLk1BUCh0aGlzLm9wLnZpc2l0KHZpc2l0b3IpKTtcclxuXHRyZXR1cm4gdmlzaXRvcihyZXQpIHx8IHJldDtcclxufVxyXG5cclxuZXhwb3J0cy5NQVAucHJvdG90eXBlLmludGVybmFsVG9KU09OID0gZnVuY3Rpb24oanNvbiwgcHJvdG9jb2xfdmVyc2lvbikge1xyXG5cdGpzb24ub3AgPSB0aGlzLm9wLnRvSlNPTih1bmRlZmluZWQsIHByb3RvY29sX3ZlcnNpb24pO1xyXG59XHJcblxyXG5leHBvcnRzLk1BUC5pbnRlcm5hbEZyb21KU09OID0gZnVuY3Rpb24oanNvbiwgcHJvdG9jb2xfdmVyc2lvbiwgb3BfbWFwKSB7XHJcblx0cmV0dXJuIG5ldyBleHBvcnRzLk1BUChqb3Qub3BGcm9tSlNPTihqc29uLm9wLCBwcm90b2NvbF92ZXJzaW9uLCBvcF9tYXApKTtcclxufVxyXG5cclxuZXhwb3J0cy5NQVAucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24gKGRvY3VtZW50KSB7XHJcblx0LyogQXBwbGllcyB0aGUgb3BlcmF0aW9uIHRvIGEgZG9jdW1lbnQuIFJldHVybnMgYSBuZXcgc2VxdWVuY2UgdGhhdCBpc1xyXG5cdFx0IHRoZSBzYW1lIHR5cGUgYXMgZG9jdW1lbnQgYnV0IHdpdGggdGhlIGVsZW1lbnQgbW9kaWZpZWQuICovXHJcblxyXG4gXHQvLyBUdXJuIHN0cmluZyBpbnRvIGFycmF5IG9mIGNoYXJhY3RlcnMuXHJcblx0dmFyIGQ7XHJcblx0aWYgKHR5cGVvZiBkb2N1bWVudCA9PSAnc3RyaW5nJylcclxuXHRcdGQgPSBkb2N1bWVudC5zcGxpdCgvLnswfS8pXHJcblxyXG5cdC8vIENsb25lIGFycmF5LlxyXG5cdGVsc2VcclxuXHRcdGQgPSBkb2N1bWVudC5zbGljZSgpOyAvLyBjbG9uZVxyXG5cdFxyXG5cdC8vIEFwcGx5IG9wZXJhdGlvbiB0byBlYWNoIGVsZW1lbnQuXHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRkW2ldID0gdGhpcy5vcC5hcHBseShkW2ldKVxyXG5cclxuXHRcdC8vIEFuIG9wZXJhdGlvbiBvbiBzdHJpbmdzIG11c3QgcmV0dXJuIGEgc2luZ2xlIGNoYXJhY3Rlci5cclxuXHRcdGlmICh0eXBlb2YgZG9jdW1lbnQgPT0gJ3N0cmluZycgJiYgKHR5cGVvZiBkW2ldICE9ICdzdHJpbmcnIHx8IGRbaV0ubGVuZ3RoICE9IDEpKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIG9wZXJhdGlvbjogU3RyaW5nIHR5cGUgb3IgbGVuZ3RoIGNoYW5nZWQuXCIpXHJcblx0fVxyXG5cclxuXHQvLyBUdXJuIHRoZSBhcnJheSBvZiBjaGFyYWN0ZXJzIGJhY2sgaW50byBhIHN0cmluZy5cclxuXHRpZiAodHlwZW9mIGRvY3VtZW50ID09ICdzdHJpbmcnKVxyXG5cdFx0cmV0dXJuIGQuam9pbihcIlwiKTtcclxuXHJcblx0cmV0dXJuIGQ7XHJcbn1cclxuXHJcbmV4cG9ydHMuTUFQLnByb3RvdHlwZS5zaW1wbGlmeSA9IGZ1bmN0aW9uICgpIHtcclxuXHQvKiBSZXR1cm5zIGEgbmV3IGF0b21pYyBvcGVyYXRpb24gdGhhdCBpcyBhIHNpbXBsZXIgdmVyc2lvblxyXG5cdFx0IG9mIHRoaXMgb3BlcmF0aW9uLiovXHJcblx0dmFyIG9wID0gdGhpcy5vcC5zaW1wbGlmeSgpO1xyXG5cdGlmIChvcCBpbnN0YW5jZW9mIHZhbHVlcy5OT19PUClcclxuXHRcdHJldHVybiBuZXcgdmFsdWVzLk5PX09QKCk7XHQgICBcclxuXHRyZXR1cm4gdGhpcztcclxufVxyXG5cclxuZXhwb3J0cy5NQVAucHJvdG90eXBlLmRyaWxsZG93biA9IGZ1bmN0aW9uKGluZGV4X29yX2tleSkge1xyXG5cdGlmICghTnVtYmVyLmlzSW50ZWdlcihpbmRleF9vcl9rZXkpIHx8IGluZGV4X29yX2tleSA8IDApXHJcblx0XHRuZXcgdmFsdWVzLk5PX09QKCk7XHJcblx0cmV0dXJuIHRoaXMub3A7XHJcbn1cclxuXHJcbmV4cG9ydHMuTUFQLnByb3RvdHlwZS5pbnZlcnNlID0gZnVuY3Rpb24gKGRvY3VtZW50KSB7XHJcblx0LyogUmV0dXJucyBhIG5ldyBhdG9taWMgb3BlcmF0aW9uIHRoYXQgaXMgdGhlIGludmVyc2Ugb2YgdGhpcyBvcGVyYXRpb24uICovXHJcblxyXG5cdGlmIChkb2N1bWVudC5sZW5ndGggPT0gMClcclxuXHRcdHJldHVybiBuZXcgZXhwb3J0cy5OT19PUCgpO1xyXG5cdGlmIChkb2N1bWVudC5sZW5ndGggPT0gMSlcclxuXHRcdHJldHVybiBuZXcgZXhwb3J0cy5NQVAodGhpcy5vcC5pbnZlcnNlKGRvY3VtZW50WzBdKSk7XHJcblxyXG5cdC8vIFNpbmNlIHRoZSBpbnZlcnNlIGRlcGVuZHMgb24gdGhlIHZhbHVlIG9mIHRoZSBkb2N1bWVudCBhbmQgdGhlXHJcblx0Ly8gZWxlbWVudHMgb2YgZG9jdW1lbnQgbWF5IG5vdCBhbGwgYmUgdGhlIHNhbWUsIHdlIGhhdmUgdG8gZXhwbG9kZVxyXG5cdC8vIHRoaXMgb3V0IGludG8gaW5kaXZpZHVhbCBvcGVyYXRpb25zLlxyXG5cdHZhciBodW5rcyA9IFtdO1xyXG5cdGlmICh0eXBlb2YgZG9jdW1lbnQgPT0gJ3N0cmluZycpXHJcblx0XHRkb2N1bWVudCA9IGRvY3VtZW50LnNwbGl0KC8uezB9Lyk7XHJcblx0ZG9jdW1lbnQuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KSB7XHJcblx0XHRodW5rcy5hcHBlbmQoe1xyXG5cdFx0XHRvZmZzZXQ6IDAsXHJcblx0XHRcdGxlbmd0aDogMSxcclxuXHRcdFx0b3A6IHRoaXMub3AuaW52ZXJzZShlbGVtZW50KVxyXG5cdFx0fSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIG5ldyBleHBvcnRzLlBBVENIKGh1bmtzKTtcclxufVxyXG5cclxuZXhwb3J0cy5NQVAucHJvdG90eXBlLmF0b21pY19jb21wb3NlID0gZnVuY3Rpb24gKG90aGVyKSB7XHJcblx0LyogQ3JlYXRlcyBhIG5ldyBhdG9taWMgb3BlcmF0aW9uIHRoYXQgaGFzIHRoZSBzYW1lIHJlc3VsdCBhcyB0aGlzXHJcblx0XHQgYW5kIG90aGVyIGFwcGxpZWQgaW4gc2VxdWVuY2UgKHRoaXMgZmlyc3QsIG90aGVyIGFmdGVyKS4gUmV0dXJuc1xyXG5cdFx0IG51bGwgaWYgbm8gYXRvbWljIG9wZXJhdGlvbiBpcyBwb3NzaWJsZS4gKi9cclxuXHJcblx0Ly8gdHdvIE1BUHMgd2l0aCBhdG9taWNhbGx5IGNvbXBvc2FibGUgc3ViLW9wZXJhdGlvbnNcclxuXHRpZiAob3RoZXIgaW5zdGFuY2VvZiBleHBvcnRzLk1BUCkge1xyXG5cdFx0dmFyIG9wMiA9IHRoaXMub3AuYXRvbWljX2NvbXBvc2Uob3RoZXIub3ApO1xyXG5cdFx0aWYgKG9wMilcclxuXHRcdFx0cmV0dXJuIG5ldyBleHBvcnRzLk1BUChvcDIpO1xyXG5cdH1cclxuXHJcblx0Ly8gTm8gY29tcG9zaXRpb24gcG9zc2libGUuXHJcblx0cmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydHMuTUFQLnByb3RvdHlwZS5yZWJhc2VfZnVuY3Rpb25zID0gW1xyXG5cdFtleHBvcnRzLk1BUCwgZnVuY3Rpb24ob3RoZXIsIGNvbmZsaWN0bGVzcykge1xyXG5cdFx0Ly8gVHdvIE1BUHMuIFRoZSByZWJhc2Ugc3VjY2VlZHMgb25seSBpZiBhIHJlYmFzZSBvbiB0aGVcclxuXHRcdC8vIGlubmVyIG9wZXJhdGlvbnMgc3VjY2VlZHMuXHJcblx0XHR2YXIgb3BhO1xyXG5cdFx0dmFyIG9wYjtcclxuXHJcblx0XHQvLyBJZiBjb25mbGljdGxlc3MgaXMgbnVsbCBvciB0aGVyZSBpcyBubyBwcmlvciBkb2N1bWVudFxyXG5cdFx0Ly8gc3RhdGUsIHRoZW4gaXQncyBzYWZlIHRvIHBhc3MgY29uZmxpY3RsZXNzIGludG8gdGhlXHJcblx0XHQvLyBpbm5lciBvcGVyYXRpb25zLlxyXG5cdFx0aWYgKCFjb25mbGljdGxlc3MgfHwgIShcImRvY3VtZW50XCIgaW4gY29uZmxpY3RsZXNzKSkge1xyXG5cdFx0XHRvcGEgPSB0aGlzLm9wLnJlYmFzZShvdGhlci5vcCwgY29uZmxpY3RsZXNzKTtcclxuXHRcdFx0b3BiID0gb3RoZXIub3AucmViYXNlKHRoaXMub3AsIGNvbmZsaWN0bGVzcyk7XHJcblxyXG5cdFx0Ly8gSWYgdGhlcmUgaXMgYSBzaW5nbGUgZWxlbWVudCBpbiB0aGUgcHJpb3IgZG9jdW1lbnRcclxuXHRcdC8vIHN0YXRlLCB0aGVuIHVud3JhcCBpdCBmb3IgdGhlIGlubmVyIG9wZXJhdGlvbnMuXHJcblx0XHR9IGVsc2UgaWYgKGNvbmZsaWN0bGVzcy5kb2N1bWVudC5sZW5ndGggPT0gMSkge1xyXG5cdFx0XHR2YXIgY29uZmxpY3RsZXNzMiA9IHNoYWxsb3dfY2xvbmUoY29uZmxpY3RsZXNzKTtcclxuXHRcdFx0Y29uZmxpY3RsZXNzMi5kb2N1bWVudCA9IGNvbmZsaWN0bGVzczIuZG9jdW1lbnRbMF07XHJcblxyXG5cdFx0XHRvcGEgPSB0aGlzLm9wLnJlYmFzZShvdGhlci5vcCwgY29uZmxpY3RsZXNzMik7XHJcblx0XHRcdG9wYiA9IG90aGVyLm9wLnJlYmFzZSh0aGlzLm9wLCBjb25mbGljdGxlc3MyKTtcclxuXHJcblx0XHQvLyBJZiB0aGUgcHJpb3IgZG9jdW1lbnQgc3RhdGUgaXMgYW4gZW1wdHkgYXJyYXksIHRoZW5cclxuXHRcdC8vIHdlIGtub3cgdGhlc2Ugb3BlcmF0aW9ucyBhcmUgTk9fT1BzIGFueXdheS5cclxuXHRcdH0gZWxzZSBpZiAoY29uZmxpY3RsZXNzLmRvY3VtZW50Lmxlbmd0aCA9PSAwKSB7XHJcblx0XHRcdHJldHVybiBbXHJcblx0XHRcdFx0bmV3IGpvdC5OT19PUCgpLFxyXG5cdFx0XHRcdG5ldyBqb3QuTk9fT1AoKVxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdC8vIFRoZSBwcmlvciBkb2N1bWVudCBzdGF0ZSBpcyBhbiBhcnJheSBvZiBtb3JlIHRoYW4gb25lXHJcblx0XHQvLyBlbGVtZW50LiBJbiBvcmRlciB0byBwYXNzIHRoZSBwcmlvciBkb2N1bWVudCBzdGF0ZSBpbnRvXHJcblx0XHQvLyB0aGUgaW5uZXIgb3BlcmF0aW9ucywgd2UgaGF2ZSB0byB0cnkgaXQgZm9yIGVhY2ggZWxlbWVudFxyXG5cdFx0Ly8gb2YgdGhlIHByaW9yIGRvY3VtZW50IHN0YXRlLiBJZiB0aGV5IGFsbCB5aWVsZCB0aGUgc2FtZVxyXG5cdFx0Ly8gb3BlcmF0aW9uLCB0aGVuIHdlIGNhbiB1c2UgdGhhdCBvcGVyYXRpb24uIE90aGVyd2lzZSB0aGVcclxuXHRcdC8vIHJlYmFzZXMgYXJlIHRvbyBzZW5zaXRpdmUgb24gcHJpb3IgZG9jdW1lbnQgc3RhdGUgYW5kXHJcblx0XHQvLyB3ZSBjYW4ndCByZWJhc2UuXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR2YXIgb2sgPSB0cnVlO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbmZsaWN0bGVzcy5kb2N1bWVudC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBjb25mbGljdGxlc3MyID0gc2hhbGxvd19jbG9uZShjb25mbGljdGxlc3MpO1xyXG5cdFx0XHRcdGNvbmZsaWN0bGVzczIuZG9jdW1lbnQgPSBjb25mbGljdGxlc3MuZG9jdW1lbnRbaV07XHJcblxyXG5cdFx0XHRcdHZhciBhID0gdGhpcy5vcC5yZWJhc2Uob3RoZXIub3AsIGNvbmZsaWN0bGVzczIpO1xyXG5cdFx0XHRcdHZhciBiID0gb3RoZXIub3AucmViYXNlKHRoaXMub3AsIGNvbmZsaWN0bGVzczIpO1xyXG5cdFx0XHRcdGlmIChpID09IDApIHtcclxuXHRcdFx0XHRcdG9wYSA9IGE7XHJcblx0XHRcdFx0XHRvcGIgPSBiO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpZiAoIWRlZXBFcXVhbChvcGEsIGEsIHsgc3RyaWN0OiB0cnVlIH0pKVxyXG5cdFx0XHRcdFx0XHRvayA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0aWYgKCFkZWVwRXF1YWwob3BiLCBiLCB7IHN0cmljdDogdHJ1ZSB9KSlcclxuXHRcdFx0XHRcdFx0b2sgPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICghb2spIHtcclxuXHRcdFx0XHQvLyBUaGUgcmViYXNlcyB3ZXJlIG5vdCB0aGUgc2FtZSBmb3IgYWxsIGVsZW1lbnRzLiBEZWNvbXBvc2VcclxuXHRcdFx0XHQvLyB0aGUgTUFQcyBpbnRvIFBBVENIZXMgd2l0aCBpbmRpdmlkdWFsIGh1bmtzIGZvciBlYWNoIGluZGV4LFxyXG5cdFx0XHRcdC8vIGFuZCB0aGVuIHJlYmFzZSB0aG9zZS5cclxuXHRcdFx0XHR2YXIgX3RoaXMgPSB0aGlzO1xyXG5cdFx0XHRcdG9wYSA9IG5ldyBleHBvcnRzLlBBVENIKFxyXG5cdFx0XHRcdFx0Y29uZmxpY3RsZXNzLmRvY3VtZW50Lm1hcChmdW5jdGlvbihpdGVtKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0b2Zmc2V0OiAwLFxyXG5cdFx0XHRcdFx0XHRcdGxlbmd0aDogMSxcclxuXHRcdFx0XHRcdFx0XHRvcDogX3RoaXNcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSkpO1xyXG5cdFx0XHRcdG9wYiA9IG5ldyBleHBvcnRzLlBBVENIKFxyXG5cdFx0XHRcdFx0Y29uZmxpY3RsZXNzLmRvY3VtZW50Lm1hcChmdW5jdGlvbihpdGVtKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0b2Zmc2V0OiAwLFxyXG5cdFx0XHRcdFx0XHRcdGxlbmd0aDogMSxcclxuXHRcdFx0XHRcdFx0XHRvcDogb3RoZXJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSkpO1xyXG5cdFx0XHRcdHJldHVybiByZWJhc2VfcGF0Y2hlcyhvcGEsIG9wYiwgY29uZmxpY3RsZXNzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHJcblx0XHRpZiAob3BhICYmIG9wYilcclxuXHRcdFx0cmV0dXJuIFtcclxuXHRcdFx0XHQob3BhIGluc3RhbmNlb2YgdmFsdWVzLk5PX09QKSA/IG5ldyB2YWx1ZXMuTk9fT1AoKSA6IG5ldyBleHBvcnRzLk1BUChvcGEpLFxyXG5cdFx0XHRcdChvcGIgaW5zdGFuY2VvZiB2YWx1ZXMuTk9fT1ApID8gbmV3IHZhbHVlcy5OT19PUCgpIDogbmV3IGV4cG9ydHMuTUFQKG9wYilcclxuXHRcdFx0XTtcclxuXHR9XSxcclxuXHJcblx0W2V4cG9ydHMuUEFUQ0gsIGZ1bmN0aW9uKG90aGVyLCBjb25mbGljdGxlc3MpIHtcclxuXHRcdC8vIFJlYmFzZSBNQVAgYW5kIFBBVENILlxyXG5cclxuXHRcdC8vIElmIHRoZSBQQVRDSCBoYXMgbm8gaHVua3MsIHRoZW4gdGhlIHJlYmFzZSBpcyB0cml2aWFsLlxyXG5cdFx0aWYgKG90aGVyLmh1bmtzLmxlbmd0aCA9PSAwKVxyXG5cdFx0XHRyZXR1cm4gW3RoaXMsIG90aGVyXTtcclxuXHJcblx0XHQvLyBJZiB0aGUgUEFUQ0ggaHVua3MgYXJlIGFsbCBNQVAgb3BlcmF0aW9ucyBhbmQgdGhlIHJlYmFzZVxyXG5cdFx0Ly8gYmV0d2VlbiB0aGlzIGFuZCB0aGUgaHVuayBvcGVyYXRpb25zIGFyZSBhbGwgdGhlIHNhbWUsXHJcblx0XHQvLyAqYW5kKiB0aGUgcmViYXNlIG9mIHRoaXMgaXMgdGhlIHNhbWUgYXMgdGhpcywgdGhlbiB3ZSBjYW5cclxuXHRcdC8vIHVzZSB0aGF0LiBJZiB0aGUgcmViYXNlIGlzIGRpZmZlcmVudCBmcm9tIHRoaXMgb3BlcmF0aW9uLFxyXG5cdFx0Ly8gdGhlbiB3ZSBjYW4ndCB1c2UgaXQgYmVjYXVzZSBpdCB3b3VsZG4ndCBoYXZlIHRoZSBzYW1lXHJcblx0XHQvLyBlZmZlY3Qgb24gcGFydHMgb2YgdGhlIHNlcXVlbmNlIHRoYXQgdGhlIFBBVENIIGRvZXMgbm90XHJcblx0XHQvLyBhZmZlY3QuXHJcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xyXG5cdFx0dmFyIHJlYmFzZV9yZXN1bHQ7XHJcblx0XHRvdGhlci5odW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGh1bmspIHtcclxuXHRcdFx0aWYgKCEoaHVuay5vcCBpbnN0YW5jZW9mIGV4cG9ydHMuTUFQKSkge1xyXG5cdFx0XHRcdC8vIFJlYmFzZSBpcyBub3QgcG9zc2libGUuIEZsYWcgdGhhdCBpdCBpcyBub3QgcG9zc2libGUuXHJcblx0XHRcdFx0cmViYXNlX3Jlc3VsdCA9IG51bGw7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgciA9IF90aGlzLnJlYmFzZV9mdW5jdGlvbnNbMF1bMV0uY2FsbChfdGhpcywgaHVuay5vcCk7XHJcblx0XHRcdGlmICghcikge1xyXG5cdFx0XHRcdC8vIFJlYmFzZSBmYWlsZWQuIEZsYWcgaXQuXHJcblx0XHRcdFx0cmViYXNlX3Jlc3VsdCA9IG51bGw7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodHlwZW9mIHJlYmFzZV9yZXN1bHQgPT0gXCJ1bmRlZmluZWRcIikge1xyXG5cdFx0XHRcdC8vIFRoaXMgaXMgdGhlIGZpcnN0IG9uZS5cclxuXHRcdFx0XHRyZWJhc2VfcmVzdWx0ID0gcjtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIHRoYXQgaXQgaXMgZXF1YWwgdG8gdGhlIGxhc3Qgb25lLiBJZiBub3QsIGZsYWcuXHJcblx0XHRcdGlmICghZGVlcEVxdWFsKHJlYmFzZV9yZXN1bHRbMF0sIHJbMF0sIHsgc3RyaWN0OiB0cnVlIH0pXHJcblx0XHRcdFx0fHwgIWRlZXBFcXVhbChyZWJhc2VfcmVzdWx0WzFdLCByWzFdLCB7IHN0cmljdDogdHJ1ZSB9KSlcclxuXHRcdFx0XHRyZWJhc2VfcmVzdWx0ID0gbnVsbDtcclxuXHRcdH0pXHJcblx0XHRpZiAocmViYXNlX3Jlc3VsdCAhPSBudWxsICYmIGRlZXBFcXVhbChyZWJhc2VfcmVzdWx0WzBdLCB0aGlzLCB7IHN0cmljdDogdHJ1ZSB9KSkge1xyXG5cdFx0XHQvLyBSZWJhc2Ugd2FzIHBvc3NpYmxlIGFuZCB0aGUgc2FtZSBmb3IgZXZlcnkgb3BlcmF0aW9uLlxyXG5cdFx0XHRyZXR1cm4gW1xyXG5cdFx0XHRcdHJlYmFzZV9yZXN1bHRbMF0sXHJcblx0XHRcdFx0bmV3IGV4cG9ydHMuUEFUQ0gob3RoZXIuaHVua3MubWFwKGZ1bmN0aW9uKGh1bmspIHtcclxuXHRcdFx0XHRcdGh1bmsgPSBzaGFsbG93X2Nsb25lKGh1bmspO1xyXG5cdFx0XHRcdFx0aHVuay5vcCA9IHJlYmFzZV9yZXN1bHRbMV07XHJcblx0XHRcdFx0XHRyZXR1cm4gaHVuaztcclxuXHRcdFx0XHR9KSksXHJcblx0XHRcdF1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBPbmx5IGEgY29uZmxpY3RsZXNzIHJlYmFzZSBpcyBwb3NzaWJsZSBpbiBvdGhlciBjYXNlcyxcclxuXHRcdC8vIGFuZCBwcmlvciBkb2N1bWVudCBzdGF0ZSBpcyByZXF1aXJlZC5cclxuXHRcdGlmIChjb25mbGljdGxlc3MgJiYgXCJkb2N1bWVudFwiIGluIGNvbmZsaWN0bGVzcykge1xyXG5cdFx0XHQvLyBXcmFwIE1BUCBpbiBhIFBBVENIIHRoYXQgc3BhbnMgdGhlIHdob2xlIHNlcXVlbmNlLCBhbmQgdGhlblxyXG5cdFx0XHQvLyB1c2UgcmViYXNlX3BhdGNoZXMuIFRoaXMgd2lsbCBqdW1wIGFoZWFkIHRvIGNvbXBhcmluZyB0aGVcclxuXHRcdFx0Ly8gTUFQIHRvIHRoZSBQQVRDSCdzIGlubmVyIG9wZXJhdGlvbnMuXHJcblx0XHRcdC8vXHJcblx0XHRcdC8vIE5PVEU6IE9wZXJhdGlvbnMgdGhhdCBhcmUgYWxsb3dlZCBpbnNpZGUgUEFUQ0ggKGluY2x1ZGluZyBNQVApXHJcblx0XHRcdC8vIG5vcm1hbGx5IG11c3Qgbm90IHJlYmFzZSB0byBhbiBvcGVyYXRpb24gdGhhdCBpcyBub3QgYWxsb3dlZFxyXG5cdFx0XHQvLyBpbnNpZGUgUEFUQ0guIFJldHVybmluZyBhIFBBVENIIGhlcmUgd291bGQgdGhlcmVmb3JlIG5vcm1hbGx5XHJcblx0XHRcdC8vIG5vdCBiZSB2YWxpZC4gV2UndmUgcGFydGlhbGx5IHNhdGlzZmllZCB0aGUgY29udHJhY3QgZm9yIFBBVENIXHJcblx0XHRcdC8vIGJ5IGRlZmluaW5nIFBBVENILmdldF9sZW5ndGhfY2hhbmdlLCBidXQgbm90IFBBVENILmRlY29tcG9zZS5cclxuXHRcdFx0Ly8gVGhhdCBzZWVtcyB0byBiZSBlbm91Z2guXHJcblx0XHRcdHJldHVybiByZWJhc2VfcGF0Y2hlcyhcclxuXHRcdFx0XHRuZXcgZXhwb3J0cy5QQVRDSChbeyBvZmZzZXQ6IDAsIGxlbmd0aDogY29uZmxpY3RsZXNzLmRvY3VtZW50Lmxlbmd0aCwgb3A6IHRoaXN9XSksXHJcblx0XHRcdFx0b3RoZXIsXHJcblx0XHRcdFx0Y29uZmxpY3RsZXNzKTtcclxuXHJcblx0XHRcdC8qXHJcblx0XHRcdC8vIEFsdGVybmF0aXZlbHk6XHJcblx0XHRcdC8vIFNpbmNlIHRoZSBNQVAgZG9lc24ndCBjaGFuZ2UgdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiB0aGUgc2VxdWVuY2UsXHJcblx0XHRcdC8vIGl0IG1ha2VzIHNlbnNlIHRvIGhhdmUgdGhlIE1BUCBnbyBmaXJzdC5cclxuXHRcdFx0Ly8gQnV0IHdlIGRvbid0IGRvIHRoaXMgYmVjYXVzZSB3ZSBoYXZlIHRvIHJldHVybiBhIFNFVCBzbyB0aGF0IExJU1QucmViYXNlXHJcblx0XHRcdC8vIGRvZXNuJ3QgZ28gaW50byBpbmZpbml0ZSByZWN1cnNpb24gYnkgcmV0dXJuaW5nIGEgTElTVCBmcm9tIGEgcmViYXNlLFxyXG5cdFx0XHQvLyBhbmQgU0VUIGxvc2VzIGxvZ2ljYWwgc3RydWN0dXJlLlxyXG5cdFx0XHRyZXR1cm4gW1xyXG5cdFx0XHRcdC8vIE1BUCBpcyBjb21pbmcgc2Vjb25kLCBzbyBjcmVhdGUgYW4gb3BlcmF0aW9uIHRoYXQgdW5kb2VzXHJcblx0XHRcdFx0Ly8gdGhlIHBhdGNoLCBhcHBsaWVzIHRoZSBtYXAsIGFuZCB0aGVuIGFwcGxpZXMgdGhlIHBhdGNoLlxyXG5cdFx0XHRcdC8vIFNlZSB2YWx1ZXMuTUFUSC5yZWJhc2UgZm9yIHdoeSB3ZSByZXR1cm4gYSBTRVQuXHJcblx0XHRcdFx0bmV3IGpvdC5TRVQodGhpcy5jb21wb3NlKG90aGVyKS5hcHBseShjb25mbGljdGxlc3MuZG9jdW1lbnQpKSxcclxuXHRcdFx0XHQvL290aGVyLmludmVyc2UoY29uZmxpY3RsZXNzLmRvY3VtZW50KS5jb21wb3NlKHRoaXMpLmNvbXBvc2Uob3RoZXIpLFxyXG5cclxuXHRcdFx0XHQvLyBQQVRDSCBpcyBjb21pbmcgc2Vjb25kLCB3aGljaCBpcyByaWdodFxyXG5cdFx0XHRcdG90aGVyXHJcblx0XHRcdF07XHJcblx0XHRcdCovXHJcblx0XHR9XHJcblx0fV1cclxuXTtcclxuXHJcbmV4cG9ydHMuTUFQLnByb3RvdHlwZS5nZXRfbGVuZ3RoX2NoYW5nZSA9IGZ1bmN0aW9uIChvbGRfbGVuZ3RoKSB7XHJcblx0Ly8gU3VwcG9ydCByb3V0aW5lIGZvciBQQVRDSCB0aGF0IHJldHVybnMgdGhlIGNoYW5nZSBpblxyXG5cdC8vIGxlbmd0aCB0byBhIHNlcXVlbmNlIGlmIHRoaXMgb3BlcmF0aW9uIGlzIGFwcGxpZWQgdG8gaXQuXHJcblx0cmV0dXJuIDA7XHJcbn1cclxuXHJcbmV4cG9ydHMuTUFQLnByb3RvdHlwZS5kZWNvbXBvc2UgPSBmdW5jdGlvbiAoaW5fb3V0LCBhdF9pbmRleCkge1xyXG5cdC8vIFN1cHBvcnQgcm91dGluZSBmb3Igd2hlbiB0aGlzIG9wZXJhdGlvbiBpcyB1c2VkIGFzIGEgaHVuaydzXHJcblx0Ly8gb3AgaW4gc2VxdWVuY2VzLlBBVENIIChpLmUuIGl0cyBkb2N1bWVudCBpcyBhIHN0cmluZyBvciBhcnJheVxyXG5cdC8vIHN1Yi1zZXF1ZW5jZSkgdGhhdCByZXR1cm5zIGEgZGVjb21wb3NpdGlvbiBvZiB0aGUgb3BlcmF0aW9uXHJcblx0Ly8gaW50byB0d28gb3BlcmF0aW9ucywgb25lIHRoYXQgYXBwbGllcyBvbiB0aGUgbGVmdCBvZiB0aGVcclxuXHQvLyBzZXF1ZW5jZSBhbmQgb25lIG9uIHRoZSByaWdodCBvZiB0aGUgc2VxdWVuY2UsIHN1Y2ggdGhhdFxyXG5cdC8vIHRoZSBsZW5ndGggb2YgdGhlIGlucHV0IChpZiAhaW5fb3V0KSBvciBvdXRwdXQgKGlmIGluX291dClcclxuXHQvLyBvZiB0aGUgbGVmdCBvcGVyYXRpb24gaXMgYXRfaW5kZXgsIGkuZS4gdGhlIHNwbGl0IHBvaW50XHJcblx0Ly8gYXRfaW5kZXggaXMgcmVsYXRpdmUgdG8gdGhlIGRvY3VtZW50IGVpdGhlciBiZWZvcmUgKGlmXHJcblx0Ly8gIWluX291dCkgb3IgYWZ0ZXIgKGlmIGluX291dCkgdGhpcyBvcGVyYXRpb24gYXBwbGllcy5cclxuXHQvL1xyXG5cdC8vIFNpbmNlIE1BUCBhcHBsaWVzIHRvIGFsbCBlbGVtZW50cywgdGhlIGRlY29tcG9zaXRpb25cclxuXHQvLyBpcyB0cml2aWFsLlxyXG5cdHJldHVybiBbdGhpcywgdGhpc107XHJcbn1cclxuXHJcbi8vLy9cclxuXHJcbmV4cG9ydHMuY3JlYXRlUmFuZG9tT3AgPSBmdW5jdGlvbihkb2MsIGNvbnRleHQpIHtcclxuXHQvLyBOb3QgYWxsIGlubmVyIG9wZXJhdGlvbnMgYXJlIHZhbGlkIGZvciBQQVRDSCBhbmQgTUFQLiBXaGVuIHRoZXlcclxuXHQvLyBhcHBseSB0byBhcnJheXMsIGFueSBpbm5lciBvcGVyYXRpb24gaXMgdmFsaWQuIEJ1dCB3aGVuIHRoZXlcclxuXHQvLyBhcHBseSB0byBzdHJpbmdzLCB0aGUgaW5uZXIgb3BlcmF0aW9ucyBtdXN0IHlpZWxkIGEgc3RyaW5nXHJcblx0Ly8gYW5kIHRoZSBpbm5lciBvcGVyYXRpb24gb2YgYSBNQVAgbXVzdCB5aWVsZCBhIGxlbmd0aC1vbmUgc3RyaW5nLlxyXG5cdGNvbnRleHQgPSAodHlwZW9mIGRvYyA9PSBcInN0cmluZ1wiKSA/IFwic3RyaW5nXCIgOiBcImFycmF5XCI7XHJcblxyXG5cdC8vIENyZWF0ZSBhIHJhbmRvbSBvcGVyYXRpb24gdGhhdCBjb3VsZCBhcHBseSB0byBkb2MuXHJcblx0Ly8gQ2hvb3NlIHVuaWZvcm1seSBhY3Jvc3MgdmFyaW91cyBvcHRpb25zLlxyXG5cdHZhciBvcHMgPSBbXTtcclxuXHJcblx0Ly8gQ29uc3RydWN0IGEgUEFUQ0guXHJcblx0b3BzLnB1c2goZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgaHVua3MgPSBbXTtcclxuXHRcdHZhciBkeCA9IDA7XHJcblxyXG5cdFx0d2hpbGUgKGR4IDwgZG9jLmxlbmd0aCkge1xyXG5cdFx0XHQvLyBDb25zdHJ1Y3QgYSByYW5kb20gaHVuay4gRmlyc3Qgc2VsZWN0IGEgcmFuZ2UgaW4gdGhlXHJcblx0XHRcdC8vIGRvY3VtZW50IHRvIG1vZGlmeS4gV2UgY2FuIHN0YXJ0IGF0IGFueSBlbGVtZW50IGluZGV4LFxyXG5cdFx0XHQvLyBvciBvbmUgcGFzdCB0aGUgZW5kIHRvIGluc2VydCBhdCB0aGUgZW5kLlxyXG5cdFx0XHR2YXIgc3RhcnQgPSBkeCArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChkb2MubGVuZ3RoKzEtZHgpKTtcclxuXHRcdFx0dmFyIG9sZF9sZW5ndGggPSAoc3RhcnQgPCBkb2MubGVuZ3RoKSA/IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChkb2MubGVuZ3RoIC0gc3RhcnQgKyAxKSkgOiAwO1xyXG5cdFx0XHR2YXIgb2xkX3ZhbHVlID0gZG9jLnNsaWNlKHN0YXJ0LCBzdGFydCtvbGRfbGVuZ3RoKTtcclxuXHJcblx0XHRcdC8vIENob29zZSBhbiBpbm5lciBvcGVyYXRpb24uIE9ubHkgb3BzIGluIHZhbHVlcyBjYW4gYmUgdXNlZFxyXG5cdFx0XHQvLyBiZWNhdXNlIG9wcyB3aXRoaW4gUEFUQ0ggbXVzdCBzdXBwb3J0IGdldF9sZW5ndGhfY2hhbmdlLlxyXG5cdFx0XHR2YXIgb3AgPSB2YWx1ZXMuY3JlYXRlUmFuZG9tT3Aob2xkX3ZhbHVlLCBjb250ZXh0KTtcclxuXHJcblx0XHRcdC8vIFB1c2ggdGhlIGh1bmsuXHJcblx0XHRcdGh1bmtzLnB1c2goe1xyXG5cdFx0XHRcdG9mZnNldDogc3RhcnQtZHgsXHJcblx0XHRcdFx0bGVuZ3RoOiBvbGRfbGVuZ3RoLFxyXG5cdFx0XHRcdG9wOiBvcFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGR4ID0gc3RhcnQgKyBvbGRfbGVuZ3RoO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGFub3RoZXIgaHVuaz9cclxuXHRcdFx0aWYgKE1hdGgucmFuZG9tKCkgPCAuMjUpXHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG5ldyBleHBvcnRzLlBBVENIKGh1bmtzKTtcclxuXHR9KTtcclxuXHJcblx0Ly8gQ29uc3RydWN0IGEgTUFQLlxyXG5cdG9wcy5wdXNoKGZ1bmN0aW9uKCkge1xyXG5cdFx0d2hpbGUgKHRydWUpIHtcclxuXHRcdFx0Ly8gQ2hvb3NlIGEgcmFuZG9tIGVsZW1lbnQgdG8gdXNlIGFzIHRoZSB0ZW1wbGF0ZSBmb3IgdGhlXHJcblx0XHRcdC8vIHJhbmRvbSBvcGVyYXRpb24uIElmIHRoZSBzZXF1ZW5jZSBpcyBlbXB0eSwgdXNlIFwiP1wiIG9yIG51bGwuXHJcblx0XHRcdC8vIERvbid0IHVzZSBhbiBlbXB0eSBzdHJpbmcgYmVjYXVzZSB3ZSBjYW4ndCByZXBsYWNlIGFuXHJcblx0XHRcdC8vIGVsZW1lbnQgb2YgdGhlIHN0cmluZyB3aXRoIGFuIGVtcHR5IHN0cmluZy5cclxuXHRcdFx0dmFyIHJhbmRvbV9lbGVtO1xyXG5cdFx0XHRpZiAoZG9jLmxlbmd0aCA9PSAwKSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBkb2MgPT09IFwic3RyaW5nXCIpXHJcblx0XHRcdFx0XHRyYW5kb21fZWxlbSA9IFwiP1wiO1xyXG5cdFx0XHRcdGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZG9jKSlcclxuXHRcdFx0XHRcdHJhbmRvbV9lbGVtID0gbnVsbDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyYW5kb21fZWxlbSA9IGVsZW0oZG9jLCBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBkb2MubGVuZ3RoKSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENvbnN0cnVjdCBhIHJhbmRvbSBvcGVyYXRpb24uXHJcblx0XHRcdHZhciBvcCA9IHZhbHVlcy5jcmVhdGVSYW5kb21PcChyYW5kb21fZWxlbSwgY29udGV4dCtcIi1lbGVtXCIpO1xyXG5cclxuXHRcdFx0Ly8gVGVzdCB0aGF0IGl0IGlzIHZhbGlkIG9uIGFsbCBlbGVtZW50cyBvZiBkb2MuXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBkb2MgPT09IFwic3RyaW5nXCIpIGRvYyA9IGRvYy5zcGxpdCgnJyk7IC8vIGNvbnZlcnQgdG8gYXJyYXlcclxuXHRcdFx0XHRkb2MuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XHJcblx0XHRcdFx0XHRvcC5hcHBseShpdGVtKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTUFQKG9wKTtcclxuXHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdC8vIEl0J3MgaW52YWxpZC4gVHJ5IGFnYWluIHRvIGZpbmQgYSB2YWxpZCBvcGVyYXRpb25cclxuXHRcdFx0XHQvLyB0aGF0IGNhbiBhcHBseSB0byBhbGwgZWxlbWVudHMsIGxvb3BpbmcgaW5kZWZpbml0ZWx5XHJcblx0XHRcdFx0Ly8gdW50aWwgb25lIGNhbiBiZSBmb3VuZC4gU0VUIGlzIGFsd2F5cyB2YWxpZCBhbmQgaXNcclxuXHRcdFx0XHQvLyBoaWdobHkgcHJvYmFibGUgdG8gYmUgc2VsZWN0ZWQgc28gdGhpcyBzaG91bGRuJ3RcclxuXHRcdFx0XHQvLyB0YWtlIGxvbmcuXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Ly8gU2VsZWN0IHJhbmRvbWx5LlxyXG5cdHJldHVybiBvcHNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogb3BzLmxlbmd0aCldKCk7XHJcbn1cclxuIiwiLyogIEFuIG9wZXJhdGlvbmFsIHRyYW5zZm9ybWF0aW9uIGxpYnJhcnkgZm9yIGF0b21pYyB2YWx1ZXMuXHJcblxyXG5cdFRoaXMgbGlicmFyeSBwcm92aWRlcyB0aHJlZSBvcGVyYXRpb25zOiBOT19PUCAoYW4gb3BlcmF0aW9uXHJcblx0dGhhdCBsZWF2ZXMgdGhlIHZhbHVlIHVuY2hhbmdlZCksIFNFVCAocmVwbGFjZXMgdGhlIHZhbHVlXHJcblx0d2l0aCBhIG5ldyB2YWx1ZSksIGFuZCBNQVRIIChhcHBseSBvbmUgb2Ygc2V2ZXJhbCBtYXRoZW1hdGljYWxcclxuXHRmdW5jdGlvbnMgdG8gdGhlIHZhbHVlKS4gVGhlc2UgZnVuY3Rpb25zIGFyZSBnZW5lcmljIG92ZXJcclxuXHR2YXJpb3VzIHNvcnRzIG9mIGF0b21pYyBkYXRhIHR5cGVzIHRoYXQgdGhleSBtYXkgYXBwbHkgdG8uXHJcblxyXG5cclxuXHRuZXcgdmFsdWVzLk5PX09QKClcclxuXHJcblx0VGhpcyBvcGVyYXRpb24gZG9lcyBub3RoaW5nLiBJdCBpcyB0aGUgcmV0dXJuIHZhbHVlIG9mIHZhcmlvdXNcclxuXHRmdW5jdGlvbnMgdGhyb3VnaG91dCB0aGUgbGlicmFyeSwgZS5nLiB3aGVuIG9wZXJhdGlvbnMgY2FuY2VsXHJcblx0b3V0LiBOT19PUCBpcyBjb25mbGljdGxlc3M6IEl0IG5ldmVyIGNyZWF0ZXMgYSBjb25mbGljdCB3aGVuXHJcblx0cmViYXNlZCBhZ2FpbnN0IG9yIG9wZXJhdGlvbnMgb3Igd2hlbiBvdGhlciBvcGVyYXRpb25zIGFyZVxyXG5cdHJlYmFzZWQgYWdhaW5zdCBpdC5cclxuXHRcclxuXHJcblx0bmV3IHZhbHVlcy5TRVQodmFsdWUpXHJcblx0XHJcblx0VGhlIGF0b21pYyByZXBsYWNlbWVudCBvZiBvbmUgdmFsdWUgd2l0aCBhbm90aGVyLiBXb3JrcyBmb3JcclxuXHRhbnkgZGF0YSB0eXBlLiBUaGUgU0VUIG9wZXJhdGlvbiBzdXBwb3J0cyBhIGNvbmZsaWN0bGVzc1xyXG5cdHJlYmFzZSB3aXRoIGFsbCBvdGhlciBvcGVyYXRpb25zLlxyXG5cdFxyXG5cclxuXHRuZXcgdmFsdWVzLk1BVEgob3BlcmF0b3IsIG9wZXJhbmQpXHJcblx0XHJcblx0QXBwbGllcyBhIGNvbW11dGF0aXZlIGFyaXRobWV0aWMgZnVuY3Rpb24gdG8gYSBudW1iZXIgb3IgYm9vbGVhbi5cclxuXHRcclxuXHRcImFkZFwiOiBhZGRpdGlvbiAodXNlIGEgbmVnYXRpdmUgbnVtYmVyIHRvIGRlY3JlbWVudCkgKG92ZXIgbnVtYmVycyBvbmx5KVxyXG5cdFxyXG5cdFwibXVsdFwiOiBtdWx0aXBsaWNhdGlvbiAodXNlIHRoZSByZWNpcHJvY2FsIHRvIGRpdmlkZSkgKG92ZXIgbnVtYmVycyBvbmx5KVxyXG5cdFxyXG5cdFwicm90XCI6IGFkZGl0aW9uIGZvbGxvd2VkIGJ5IG1vZHVsdXMgKHRoZSBvcGVyYW5kIGlzIGdpdmVuXHJcblx0ICAgICAgIGFzIGEgdHVwbGUgb2YgdGhlIGluY3JlbWVudCBhbmQgdGhlIG1vZHVsdXMpLiBUaGUgZG9jdW1lbnRcclxuXHQgICAgICAgb2JqZWN0IG11c3QgYmUgYSBub24tbmVnYXRpdmUgaW50ZWdlciBhbmQgbGVzcyB0aGFuIHRoZSBtb2R1bHVzLlxyXG5cclxuXHRcImFuZFwiOiBiaXR3aXNlIGFuZCAob3ZlciBpbnRlZ2VycyBhbmQgYm9vbGVhbnMgb25seSlcclxuXHJcblx0XCJvclwiOiBiaXR3aXNlIG9yIChvdmVyIGludGVnZXJzIGFuZCBib29sZWFucyBvbmx5KVxyXG5cdFxyXG5cdFwieG9yXCI6IGJpdHdpc2UgZXhjbHVzaXZlLW9yIChvdmVyIGludGVnZXJzIGFuZCBib29sZWFuc1xyXG5cdCAgICAgICBvbmx5KVxyXG5cclxuXHRcIm5vdFwiOiBiaXR3aXNlIG5vdCAob3ZlciBpbnRlZ2VycyBhbmQgYm9vbGVhbnMgb25seTsgdGhlIG9wZXJhbmRcclxuXHQgICAgICAgaXMgaWdub3JlZClcclxuXHRcclxuXHROb3RlIHRoYXQgYnkgY29tbXV0YXRpdmUgd2UgbWVhbiB0aGF0IHRoZSBvcGVyYXRpb24gaXMgY29tbXV0YXRpdmVcclxuXHR1bmRlciBjb21wb3NpdGlvbiwgaS5lLiBhZGQoMSkrYWRkKDIpID09IGFkZCgyKSthZGQoMSkuXHJcblxyXG5cdFRoZSBvcGVyYXRvcnMgYXJlIGFsc28gZ3VhcmFudGVlZCB0byBub3QgY2hhbmdlIHRoZSBkYXRhIHR5cGUgb2YgdGhlXHJcblx0ZG9jdW1lbnQuIE51bWJlcnMgcmVtYWluIG51bWJlcnMgYW5kIGJvb2xlYW5zIHJlbWFpbiBib29sZWFucy5cclxuXHJcblx0TUFUSCBzdXBwb3J0cyBhIGNvbmZsaWN0bGVzcyByZWJhc2Ugd2l0aCBhbGwgb3RoZXIgb3BlcmF0aW9ucyBpZlxyXG5cdHByaW9yIGRvY3VtZW50IHN0YXRlIGlzIHByb3ZpZGVkIGluIHRoZSBjb25mbGljdGxlc3MgYXJndW1lbnQgb2JqZWN0LlxyXG5cdFxyXG5cdCovXHJcblx0XHJcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xyXG52YXIgZGVlcEVxdWFsID0gcmVxdWlyZShcImRlZXAtZXF1YWxcIik7XHJcbnZhciBqb3QgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKTtcclxudmFyIE1JU1NJTkcgPSByZXF1aXJlKFwiLi9vYmplY3RzLmpzXCIpLk1JU1NJTkc7XHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmV4cG9ydHMubW9kdWxlX25hbWUgPSAndmFsdWVzJzsgLy8gZm9yIHNlcmlhbGl6YXRpb24vZGVzZXJpYWxpemF0aW9uXHJcblxyXG5leHBvcnRzLk5PX09QID0gZnVuY3Rpb24oKSB7XHJcblx0LyogQW4gb3BlcmF0aW9uIHRoYXQgbWFrZXMgbm8gY2hhbmdlIHRvIHRoZSBkb2N1bWVudC4gKi9cclxuXHRPYmplY3QuZnJlZXplKHRoaXMpO1xyXG59XHJcbmV4cG9ydHMuTk9fT1AucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShqb3QuQmFzZU9wZXJhdGlvbi5wcm90b3R5cGUpOyAvLyBpbmhlcml0XHJcbmpvdC5hZGRfb3AoZXhwb3J0cy5OT19PUCwgZXhwb3J0cywgJ05PX09QJyk7XHJcblxyXG5leHBvcnRzLlNFVCA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0LyogQW4gb3BlcmF0aW9uIHRoYXQgcmVwbGFjZXMgdGhlIGRvY3VtZW50IHdpdGggYSBuZXcgKGF0b21pYykgdmFsdWUuICovXHJcblx0dGhpcy52YWx1ZSA9IHZhbHVlO1xyXG5cdE9iamVjdC5mcmVlemUodGhpcyk7XHJcbn1cclxuZXhwb3J0cy5TRVQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShqb3QuQmFzZU9wZXJhdGlvbi5wcm90b3R5cGUpOyAvLyBpbmhlcml0XHJcbmpvdC5hZGRfb3AoZXhwb3J0cy5TRVQsIGV4cG9ydHMsICdTRVQnKTtcclxuXHJcbmV4cG9ydHMuTUFUSCA9IGZ1bmN0aW9uKG9wZXJhdG9yLCBvcGVyYW5kKSB7XHJcblx0LyogQW4gb3BlcmF0aW9uIHRoYXQgYXBwbGllcyBhZGRpdGlvbiwgbXVsdGlwbGljYXRpb24sIG9yIHJvdGF0aW9uIChtb2R1bHVzIGFkZGl0aW9uKVxyXG5cdCAgIHRvIGEgbnVtZXJpYyBkb2N1bWVudC4gKi9cclxuXHR0aGlzLm9wZXJhdG9yID0gb3BlcmF0b3I7XHJcblx0dGhpcy5vcGVyYW5kID0gb3BlcmFuZDtcclxuXHJcblx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJhZGRcIiB8fCB0aGlzLm9wZXJhdG9yID09IFwibXVsdFwiKSB7XHJcblx0XHRpZiAodHlwZW9mIHRoaXMub3BlcmFuZCAhPSBcIm51bWJlclwiKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJNQVRIW2FkZF0gYW5kIE1BVEhbbXVsdF0ncyBvcGVyYW5kIG11c3QgYmUgYSBudW1iZXIuXCIpXHJcblx0fVxyXG5cclxuXHRpZiAodGhpcy5vcGVyYXRvciA9PSBcImFuZFwiIHx8IHRoaXMub3BlcmF0b3IgPT0gXCJvclwiIHx8IHRoaXMub3BlcmF0b3IgPT0gXCJ4b3JcIikge1xyXG5cdFx0aWYgKCFOdW1iZXIuaXNJbnRlZ2VyKHRoaXMub3BlcmFuZCkgJiYgdHlwZW9mIHRoaXMub3BlcmFuZCAhPSBcImJvb2xlYW5cIilcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTUFUSFthbmRdIGFuZCBNQVRIW29yXSBhbmQgTUFUSFt4b3JdJ3Mgb3BlcmFuZCBtdXN0IGJlIGEgYm9vbGVhbiBvciBpbnRlZ2VyLlwiKVxyXG5cdH1cclxuXHJcblx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJub3RcIikge1xyXG5cdFx0aWYgKHRoaXMub3BlcmFuZCAhPT0gbnVsbClcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTUFUSFtub3RdJ3Mgb3BlcmFuZCBtdXN0IGJlIG51bGwgLS0tIGl0IGlzIG5vdCB1c2VkLlwiKVxyXG5cdH1cclxuXHJcblx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJyb3RcIikge1xyXG5cdFx0aWYgKCAgICFBcnJheS5pc0FycmF5KHRoaXMub3BlcmFuZClcclxuXHRcdFx0fHwgdGhpcy5vcGVyYW5kLmxlbmd0aCAhPSAyXHJcblx0XHRcdHx8ICFOdW1iZXIuaXNJbnRlZ2VyKHRoaXMub3BlcmFuZFswXSlcclxuXHRcdFx0fHwgIU51bWJlci5pc0ludGVnZXIodGhpcy5vcGVyYW5kWzFdKSlcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTUFUSFtyb3RdIG9wZXJhbmQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3byBpbnRlZ2VyIGVsZW1lbnRzLlwiKVxyXG5cdFx0aWYgKHRoaXMub3BlcmFuZFsxXSA8PSAxKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJNQVRIW3JvdF0ncyBzZWNvbmQgb3BlcmFuZCwgdGhlIG1vZHVsdXMsIG11c3QgYmUgZ3JlYXRlciB0aGFuIG9uZS5cIilcclxuXHRcdGlmICh0aGlzLm9wZXJhbmRbMF0gPj0gTWF0aC5hYnModGhpcy5vcGVyYW5kWzFdKSlcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTUFUSFtyb3RdJ3MgZmlyc3Qgb3BlcmFuZCwgdGhlIGluY3JlbWVudCwgbXVzdCBiZSBsZXNzIHRoYW4gaXRzIHNlY29uZCBvcGVyYW5kLCB0aGUgbW9kdWx1cy5cIilcclxuXHR9XHJcblxyXG5cdE9iamVjdC5mcmVlemUodGhpcyk7XHJcbn1cclxuZXhwb3J0cy5NQVRILnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoam90LkJhc2VPcGVyYXRpb24ucHJvdG90eXBlKTsgLy8gaW5oZXJpdFxyXG5qb3QuYWRkX29wKGV4cG9ydHMuTUFUSCwgZXhwb3J0cywgJ01BVEgnKTtcclxuXHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmV4cG9ydHMuTk9fT1AucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbihkZXB0aCkge1xyXG5cdHJldHVybiBcIjxOT19PUD5cIlxyXG59XHJcblxyXG5leHBvcnRzLk5PX09QLnByb3RvdHlwZS5pbnRlcm5hbFRvSlNPTiA9IGZ1bmN0aW9uKGpzb24sIHByb3RvY29sX3ZlcnNpb24pIHtcclxuXHQvLyBOb3RoaW5nIHRvIHNldC5cclxufVxyXG5cclxuZXhwb3J0cy5OT19PUC5pbnRlcm5hbEZyb21KU09OID0gZnVuY3Rpb24oanNvbiwgcHJvdG9jb2xfdmVyc2lvbiwgb3BfbWFwKSB7XHJcblx0cmV0dXJuIG5ldyBleHBvcnRzLk5PX09QKCk7XHJcbn1cclxuXHJcbmV4cG9ydHMuTk9fT1AucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24gKGRvY3VtZW50KSB7XHJcblx0LyogQXBwbGllcyB0aGUgb3BlcmF0aW9uIHRvIGEgZG9jdW1lbnQuIFJldHVybnMgdGhlIGRvY3VtZW50XHJcblx0ICAgdW5jaGFuZ2VkLiAqL1xyXG5cdHJldHVybiBkb2N1bWVudDtcclxufVxyXG5cclxuZXhwb3J0cy5OT19PUC5wcm90b3R5cGUuc2ltcGxpZnkgPSBmdW5jdGlvbiAoKSB7XHJcblx0LyogUmV0dXJucyBhIG5ldyBhdG9taWMgb3BlcmF0aW9uIHRoYXQgaXMgYSBzaW1wbGVyIHZlcnNpb25cclxuXHQgICBvZiB0aGlzIG9wZXJhdGlvbi4qL1xyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5leHBvcnRzLk5PX09QLnByb3RvdHlwZS5kcmlsbGRvd24gPSBmdW5jdGlvbihpbmRleF9vcl9rZXkpIHtcclxuXHRyZXR1cm4gbmV3IHZhbHVlcy5OT19PUCgpO1xyXG59O1xyXG5cclxuZXhwb3J0cy5OT19PUC5wcm90b3R5cGUuaW52ZXJzZSA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xyXG5cdC8qIFJldHVybnMgYSBuZXcgYXRvbWljIG9wZXJhdGlvbiB0aGF0IGlzIHRoZSBpbnZlcnNlIG9mIHRoaXMgb3BlcmF0aW9uLFxyXG5cdGdpdmVuIHRoZSBzdGF0ZSBvZiB0aGUgZG9jdW1lbnQgYmVmb3JlIHRoZSBvcGVyYXRpb24gYXBwbGllcy4gKi9cclxuXHRyZXR1cm4gdGhpcztcclxufVxyXG5cclxuZXhwb3J0cy5OT19PUC5wcm90b3R5cGUuYXRvbWljX2NvbXBvc2UgPSBmdW5jdGlvbiAob3RoZXIpIHtcclxuXHQvKiBDcmVhdGVzIGEgbmV3IGF0b21pYyBvcGVyYXRpb24gdGhhdCBoYXMgdGhlIHNhbWUgcmVzdWx0IGFzIHRoaXNcclxuXHQgICBhbmQgb3RoZXIgYXBwbGllZCBpbiBzZXF1ZW5jZSAodGhpcyBmaXJzdCwgb3RoZXIgYWZ0ZXIpLiBSZXR1cm5zXHJcblx0ICAgbnVsbCBpZiBubyBhdG9taWMgb3BlcmF0aW9uIGlzIHBvc3NpYmxlLiAqL1xyXG5cdHJldHVybiBvdGhlcjtcclxufVxyXG5cclxuZXhwb3J0cy5OT19PUC5wcm90b3R5cGUucmViYXNlX2Z1bmN0aW9ucyA9IFtcclxuXHRbam90LkJhc2VPcGVyYXRpb24sIGZ1bmN0aW9uKG90aGVyLCBjb25mbGljdGxlc3MpIHtcclxuXHRcdC8vIE5PX09QIG9wZXJhdGlvbnMgZG8gbm90IGFmZmVjdCBhbnkgb3RoZXIgb3BlcmF0aW9uLlxyXG5cdFx0cmV0dXJuIFt0aGlzLCBvdGhlcl07XHJcblx0fV1cclxuXTtcclxuXHJcbmV4cG9ydHMuTk9fT1AucHJvdG90eXBlLmdldF9sZW5ndGhfY2hhbmdlID0gZnVuY3Rpb24gKG9sZF9sZW5ndGgpIHtcclxuXHQvLyBTdXBwb3J0IHJvdXRpbmUgZm9yIHNlcXVlbmNlcy5QQVRDSCB0aGF0IHJldHVybnMgdGhlIGNoYW5nZSBpblxyXG5cdC8vIGxlbmd0aCB0byBhIHNlcXVlbmNlIGlmIHRoaXMgb3BlcmF0aW9uIGlzIGFwcGxpZWQgdG8gaXQuXHJcblx0cmV0dXJuIDA7XHJcbn1cclxuXHJcbmV4cG9ydHMuTk9fT1AucHJvdG90eXBlLmRlY29tcG9zZSA9IGZ1bmN0aW9uIChpbl9vdXQsIGF0X2luZGV4KSB7XHJcblx0Ly8gU3VwcG9ydCByb3V0aW5lIGZvciB3aGVuIHRoaXMgb3BlcmF0aW9uIGlzIHVzZWQgYXMgYSBodW5rJ3NcclxuXHQvLyBvcCBpbiBzZXF1ZW5jZXMuUEFUQ0ggKGkuZS4gaXRzIGRvY3VtZW50IGlzIGEgc3RyaW5nIG9yIGFycmF5XHJcblx0Ly8gc3ViLXNlcXVlbmNlKSB0aGF0IHJldHVybnMgYSBkZWNvbXBvc2l0aW9uIG9mIHRoZSBvcGVyYXRpb25cclxuXHQvLyBpbnRvIHR3byBvcGVyYXRpb25zLCBvbmUgdGhhdCBhcHBsaWVzIG9uIHRoZSBsZWZ0IG9mIHRoZVxyXG5cdC8vIHNlcXVlbmNlIGFuZCBvbmUgb24gdGhlIHJpZ2h0IG9mIHRoZSBzZXF1ZW5jZSwgc3VjaCB0aGF0XHJcblx0Ly8gdGhlIGxlbmd0aCBvZiB0aGUgaW5wdXQgKGlmICFpbl9vdXQpIG9yIG91dHB1dCAoaWYgaW5fb3V0KVxyXG5cdC8vIG9mIHRoZSBsZWZ0IG9wZXJhdGlvbiBpcyBhdF9pbmRleCwgaS5lLiB0aGUgc3BsaXQgcG9pbnRcclxuXHQvLyBhdF9pbmRleCBpcyByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQgZWl0aGVyIGJlZm9yZSAoaWZcclxuXHQvLyAhaW5fb3V0KSBvciBhZnRlciAoaWYgaW5fb3V0KSB0aGlzIG9wZXJhdGlvbiBhcHBsaWVzLlxyXG5cdC8vXHJcblx0Ly8gU2luY2UgTk9fT1AgaGFzIG5vIGVmZmVjdCwgaXRzIGRlY29tcG9zaXRpb24gaXMgdHJpdmlhbC5cclxuXHRyZXR1cm4gW3RoaXMsIHRoaXNdO1xyXG59XHJcblxyXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbmV4cG9ydHMuU0VULnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24oZGVwdGgpIHtcclxuXHRmdW5jdGlvbiBzdHIodikge1xyXG5cdFx0Ly8gUmVuZGVyIHRoZSBzcGVjaWFsIE1JU1NJTkcgdmFsdWUgZnJvbSBvYmplY3RzLmpzXHJcblx0XHQvLyBub3QgYXMgYSBKU09OIG9iamVjdC5cclxuXHRcdGlmICh2ID09PSBNSVNTSU5HKVxyXG5cdFx0XHRyZXR1cm4gXCJ+XCI7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIGFueSBvdGhlciB2YWx1ZSBhcyBhIEpTT04gc3RyaW5nLlxyXG5cdFx0cmV0dXJuIHV0aWwuZm9ybWF0KFwiJWpcIiwgdik7XHJcblx0fVxyXG5cdHJldHVybiB1dGlsLmZvcm1hdChcIjxTRVQgJXM+XCIsIHN0cih0aGlzLnZhbHVlKSk7XHJcbn1cclxuXHJcbmV4cG9ydHMuU0VULnByb3RvdHlwZS5pbnRlcm5hbFRvSlNPTiA9IGZ1bmN0aW9uKGpzb24sIHByb3RvY29sX3ZlcnNpb24pIHtcclxuXHRpZiAodGhpcy52YWx1ZSA9PT0gTUlTU0lORylcclxuXHRcdGpzb24udmFsdWVfbWlzc2luZyA9IHRydWU7XHJcblx0ZWxzZVxyXG5cdFx0anNvbi52YWx1ZSA9IHRoaXMudmFsdWU7XHJcbn1cclxuXHJcbmV4cG9ydHMuU0VULmludGVybmFsRnJvbUpTT04gPSBmdW5jdGlvbihqc29uLCBwcm90b2NvbF92ZXJzaW9uLCBvcF9tYXApIHtcclxuXHRpZiAoanNvbi52YWx1ZV9taXNzaW5nKVxyXG5cdFx0cmV0dXJuIG5ldyBleHBvcnRzLlNFVChNSVNTSU5HKTtcclxuXHRlbHNlXHJcblx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuU0VUKGpzb24udmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnRzLlNFVC5wcm90b3R5cGUuYXBwbHkgPSBmdW5jdGlvbiAoZG9jdW1lbnQpIHtcclxuXHQvKiBBcHBsaWVzIHRoZSBvcGVyYXRpb24gdG8gYSBkb2N1bWVudC4gUmV0dXJucyB0aGUgbmV3XHJcblx0ICAgdmFsdWUsIHJlZ2FyZGxlc3Mgb2YgdGhlIGRvY3VtZW50LiAqL1xyXG5cdHJldHVybiB0aGlzLnZhbHVlO1xyXG59XHJcblxyXG5leHBvcnRzLlNFVC5wcm90b3R5cGUuc2ltcGxpZnkgPSBmdW5jdGlvbiAoKSB7XHJcblx0LyogUmV0dXJucyBhIG5ldyBhdG9taWMgb3BlcmF0aW9uIHRoYXQgaXMgYSBzaW1wbGVyIHZlcnNpb25cclxuXHQgICBvZiBhbm90aGVyIG9wZXJhdGlvbi4gVGhlcmUgaXMgbm90aGluZyB0byBzaW1wbGlmeSBmb3JcclxuXHQgICBhIFNFVC4gKi9cclxuXHRyZXR1cm4gdGhpcztcclxufVxyXG5cclxuZXhwb3J0cy5TRVQucHJvdG90eXBlLmRyaWxsZG93biA9IGZ1bmN0aW9uKGluZGV4X29yX2tleSkge1xyXG5cdC8vIElmIHRoZSBTRVQgc2V0cyBhbiBhcnJheSBvciBvYmplY3QgdmFsdWUsIHRoZW4gZHJpbGxpbmcgZG93blxyXG5cdC8vIHNldHMgdGhlIGlubmVyIHZhbHVlIHRvIHRoZSBlbGVtZW50IG9yIHByb3BlcnR5IHZhbHVlLlxyXG5cdGlmICh0eXBlb2YgdGhpcy52YWx1ZSA9PSBcIm9iamVjdFwiICYmIEFycmF5LmlzQXJyYXkodGhpcy52YWx1ZSkpXHJcblx0XHRpZiAoTnVtYmVyLmlzSW50ZWdlcihpbmRleF9vcl9rZXkpICYmIGluZGV4X29yX2tleSA8IHRoaXMudmFsdWUubGVuZ3RoKVxyXG5cdFx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuU0VUKHRoaXMudmFsdWVbaW5kZXhfb3Jfa2V5XSk7XHJcblx0aWYgKHR5cGVvZiB0aGlzLnZhbHVlID09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkodGhpcy52YWx1ZSkgJiYgdGhpcy52YWx1ZSAhPT0gbnVsbClcclxuXHRcdGlmICh0eXBlb2YgaW5kZXhfb3Jfa2V5ID09IFwic3RyaW5nXCIgJiYgaW5kZXhfb3Jfa2V5IGluIHRoaXMudmFsdWUpXHJcblx0XHRcdHJldHVybiBuZXcgZXhwb3J0cy5TRVQodGhpcy52YWx1ZVtpbmRleF9vcl9rZXldKTtcclxuXHJcblx0Ly8gU2lnbmFsIHRoYXQgYW55dGhpbmcgdGhhdCB1c2VkIHRvIGJlIGFuIGFycmF5IGVsZW1lbnQgb3JcclxuXHQvLyBvYmplY3QgcHJvcGVydHkgaXMgbm93IG5vbmV4aXN0ZW50LlxyXG5cdHJldHVybiBuZXcgZXhwb3J0cy5TRVQoTUlTU0lORyk7XHJcbn07XHJcblxyXG5leHBvcnRzLlNFVC5wcm90b3R5cGUuaW52ZXJzZSA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xyXG5cdC8qIFJldHVybnMgYSBuZXcgYXRvbWljIG9wZXJhdGlvbiB0aGF0IGlzIHRoZSBpbnZlcnNlIG9mIHRoaXMgb3BlcmF0aW9uLFxyXG5cdCAgIGdpdmVuIHRoZSBzdGF0ZSBvZiB0aGUgZG9jdW1lbnQgYmVmb3JlIHRoaXMgb3BlcmF0aW9uIGFwcGxpZXMuICovXHJcblx0cmV0dXJuIG5ldyBleHBvcnRzLlNFVChkb2N1bWVudCk7XHJcbn1cclxuXHJcbmV4cG9ydHMuU0VULnByb3RvdHlwZS5hdG9taWNfY29tcG9zZSA9IGZ1bmN0aW9uIChvdGhlcikge1xyXG5cdC8qIENyZWF0ZXMgYSBuZXcgYXRvbWljIG9wZXJhdGlvbiB0aGF0IGhhcyB0aGUgc2FtZSByZXN1bHQgYXMgdGhpc1xyXG5cdCAgIGFuZCBvdGhlciBhcHBsaWVkIGluIHNlcXVlbmNlICh0aGlzIGZpcnN0LCBvdGhlciBhZnRlcikuIFJldHVybnNcclxuXHQgICBudWxsIGlmIG5vIGF0b21pYyBvcGVyYXRpb24gaXMgcG9zc2libGUuXHJcblx0ICAgUmV0dXJucyBhIG5ldyBTRVQgb3BlcmF0aW9uIHRoYXQgc2ltcGx5IHNldHMgdGhlIHZhbHVlIHRvIHdoYXRcclxuXHQgICB0aGUgdmFsdWUgd291bGQgYmUgd2hlbiB0aGUgdHdvIG9wZXJhdGlvbnMgYXJlIGNvbXBvc2VkLiAqL1xyXG5cdHJldHVybiBuZXcgZXhwb3J0cy5TRVQob3RoZXIuYXBwbHkodGhpcy52YWx1ZSkpLnNpbXBsaWZ5KCk7XHJcbn1cclxuXHJcbmV4cG9ydHMuU0VULnByb3RvdHlwZS5yZWJhc2VfZnVuY3Rpb25zID0gW1xyXG5cdC8vIFJlYmFzZSB0aGlzIGFnYWluc3Qgb3RoZXIgYW5kIG90aGVyIGFnYWluc3QgdGhpcy5cclxuXHJcblx0W2V4cG9ydHMuU0VULCBmdW5jdGlvbihvdGhlciwgY29uZmxpY3RsZXNzKSB7XHJcblx0XHQvLyBTRVQgYW5kIFNFVC5cclxuXHJcblx0XHQvLyBJZiB0aGV5IGJvdGggc2V0IHRoZSB0aGUgZG9jdW1lbnQgdG8gdGhlIHNhbWUgdmFsdWUsIHRoZW4gdGhlIG9uZVxyXG5cdFx0Ly8gYXBwbGllZCBzZWNvbmQgKHRoZSBvbmUgYmVpbmcgcmViYXNlZCkgYmVjb21lcyBhIG5vLW9wLiBTaW5jZSB0aGVcclxuXHRcdC8vIHR3byBwYXJ0cyBvZiB0aGUgcmV0dXJuIHZhbHVlIGFyZSBmb3IgZWFjaCByZWJhc2VkIGFnYWluc3QgdGhlXHJcblx0XHQvLyBvdGhlciwgYm90aCBhcmUgcmV0dXJuZWQgYXMgbm8tb3BzLlxyXG5cdFx0aWYgKGRlZXBFcXVhbCh0aGlzLnZhbHVlLCBvdGhlci52YWx1ZSwgeyBzdHJpY3Q6IHRydWUgfSkpXHJcblx0XHRcdHJldHVybiBbbmV3IGV4cG9ydHMuTk9fT1AoKSwgbmV3IGV4cG9ydHMuTk9fT1AoKV07XHJcblx0XHRcclxuXHRcdC8vIElmIHRoZXkgc2V0IHRoZSBkb2N1bWVudCB0byBkaWZmZXJlbnQgdmFsdWVzIGFuZCBjb25mbGljdGxlc3MgaXNcclxuXHRcdC8vIHRydWUsIHRoZW4gd2UgY2xvYmJlciB0aGUgb25lIHdob3NlIHZhbHVlIGhhcyBhIGxvd2VyIHNvcnQgb3JkZXIuXHJcblx0XHRpZiAoY29uZmxpY3RsZXNzICYmIGpvdC5jbXAodGhpcy52YWx1ZSwgb3RoZXIudmFsdWUpIDwgMClcclxuXHRcdFx0cmV0dXJuIFtuZXcgZXhwb3J0cy5OT19PUCgpLCBuZXcgZXhwb3J0cy5TRVQob3RoZXIudmFsdWUpXTtcclxuXHJcblx0XHQvLyBjbXAgPiAwIGlzIGhhbmRsZWQgYnkgYSBjYWxsIHRvIHRoaXMgZnVuY3Rpb24gd2l0aCB0aGUgYXJndW1lbnRzXHJcblx0XHQvLyByZXZlcnNlZCwgc28gd2UgZG9uJ3QgbmVlZCB0byBleHBsaWNsdGx5IGNvZGUgdGhhdCBsb2dpYy5cclxuXHJcblx0XHQvLyBJZiBjb25mbGljdGxlc3MgaXMgZmFsc2UsIHRoZW4gd2UgY2FuJ3QgcmViYXNlIHRoZSBvcGVyYXRpb25zXHJcblx0XHQvLyBiZWNhdXNlIHdlIGNhbid0IHByZXNlcnZlIHRoZSBtZWFuaW5nIG9mIGJvdGguIFJldHVybiBudWxsIHRvXHJcblx0XHQvLyBzaWduYWwgY29uZmxpY3QuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XSxcclxuXHJcblx0W2V4cG9ydHMuTUFUSCwgZnVuY3Rpb24ob3RoZXIsIGNvbmZsaWN0bGVzcykge1xyXG5cdFx0Ly8gU0VUICh0aGlzKSBhbmQgTUFUSCAob3RoZXIpLiBUbyBnZXQgYSBjb25zaXN0ZW50IGVmZmVjdCBubyBtYXR0ZXJcclxuXHRcdC8vIHdoaWNoIG9yZGVyIHRoZSBvcGVyYXRpb25zIGFyZSBhcHBsaWVkIGluLCB3ZSBzYXkgdGhlIFNFVCBjb21lc1xyXG5cdFx0Ly8gc2Vjb25kLiBpLmUuIElmIHRoZSBTRVQgaXMgYWxyZWFkeSBhcHBsaWVkLCB0aGUgTUFUSCBiZWNvbWVzIGFcclxuXHRcdC8vIG5vLW9wLiBJZiB0aGUgTUFUSCBpcyBhbHJlYWR5IGFwcGxpZWQsIHRoZSBTRVQgaXMgYXBwbGllZCB1bmNoYW5nZWQuXHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHR0aGlzLFxyXG5cdFx0XHRuZXcgZXhwb3J0cy5OT19PUCgpXHJcblx0XHRcdF07XHJcblx0fV1cclxuXTtcclxuXHJcbmV4cG9ydHMuU0VULnByb3RvdHlwZS5nZXRfbGVuZ3RoX2NoYW5nZSA9IGZ1bmN0aW9uIChvbGRfbGVuZ3RoKSB7XHJcblx0Ly8gU3VwcG9ydCByb3V0aW5lIGZvciBzZXF1ZW5jZXMuUEFUQ0ggdGhhdCByZXR1cm5zIHRoZSBjaGFuZ2UgaW5cclxuXHQvLyBsZW5ndGggdG8gYSBzZXF1ZW5jZSBpZiB0aGlzIG9wZXJhdGlvbiBpcyBhcHBsaWVkIHRvIGl0LlxyXG5cdGlmICh0eXBlb2YgdGhpcy52YWx1ZSA9PSBcInN0cmluZ1wiIHx8IEFycmF5LmlzQXJyYXkodGhpcy52YWx1ZSkpXHJcblx0XHRyZXR1cm4gdGhpcy52YWx1ZS5sZW5ndGggLSBvbGRfbGVuZ3RoO1xyXG5cdHRocm93IG5ldyBFcnJvcihcIm5vdCBhcHBsaWNhYmxlOiBuZXcgdmFsdWUgaXMgb2YgdHlwZSBcIiArIHR5cGVvZiB0aGlzLnZhbHVlKTtcclxufVxyXG5cclxuZXhwb3J0cy5TRVQucHJvdG90eXBlLmRlY29tcG9zZSA9IGZ1bmN0aW9uIChpbl9vdXQsIGF0X2luZGV4KSB7XHJcblx0Ly8gU3VwcG9ydCByb3V0aW5lIGZvciB3aGVuIHRoaXMgb3BlcmF0aW9uIGlzIHVzZWQgYXMgYSBodW5rJ3NcclxuXHQvLyBvcCBpbiBzZXF1ZW5jZXMuUEFUQ0ggKGkuZS4gaXRzIGRvY3VtZW50IGlzIGEgc3RyaW5nIG9yIGFycmF5XHJcblx0Ly8gc3ViLXNlcXVlbmNlKSB0aGF0IHJldHVybnMgYSBkZWNvbXBvc2l0aW9uIG9mIHRoZSBvcGVyYXRpb25cclxuXHQvLyBpbnRvIHR3byBvcGVyYXRpb25zLCBvbmUgdGhhdCBhcHBsaWVzIG9uIHRoZSBsZWZ0IG9mIHRoZVxyXG5cdC8vIHNlcXVlbmNlIGFuZCBvbmUgb24gdGhlIHJpZ2h0IG9mIHRoZSBzZXF1ZW5jZSwgc3VjaCB0aGF0XHJcblx0Ly8gdGhlIGxlbmd0aCBvZiB0aGUgaW5wdXQgKGlmICFpbl9vdXQpIG9yIG91dHB1dCAoaWYgaW5fb3V0KVxyXG5cdC8vIG9mIHRoZSBsZWZ0IG9wZXJhdGlvbiBpcyBhdF9pbmRleCwgaS5lLiB0aGUgc3BsaXQgcG9pbnRcclxuXHQvLyBhdF9pbmRleCBpcyByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQgZWl0aGVyIGJlZm9yZSAoaWZcclxuXHQvLyAhaW5fb3V0KSBvciBhZnRlciAoaWYgaW5fb3V0KSB0aGlzIG9wZXJhdGlvbiBhcHBsaWVzLlxyXG5cdGlmICh0eXBlb2YgdGhpcy52YWx1ZSAhPSBcInN0cmluZ1wiICYmICFBcnJheS5pc0FycmF5KHRoaXMudmFsdWUpKVxyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCB2YWx1ZSB0eXBlIGZvciBjYWxsXCIpO1xyXG5cdGlmICghaW5fb3V0KSB7XHJcblx0XHQvLyBEZWNvbXBvc2UgaW50byBhIGRlbGV0ZSBhbmQgYSByZXBsYWNlIHdpdGggdGhlIHZhbHVlXHJcblx0XHQvLyBsdW1wZWQgb24gdGhlIHJpZ2h0LlxyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0bmV3IGV4cG9ydHMuU0VUKHRoaXMudmFsdWUuc2xpY2UoMCwwKSksIC8vIGNyZWF0ZSBlbXB0eSBzdHJpbmcgb3IgYXJyYXlcclxuXHRcdFx0dGhpc1xyXG5cdFx0XTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0Ly8gU3BsaXQgdGhlIG5ldyB2YWx1ZSBhdCB0aGUgZ2l2ZW4gaW5kZXguXHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHRuZXcgZXhwb3J0cy5TRVQodGhpcy52YWx1ZS5zbGljZSgwLCBhdF9pbmRleCkpLFxyXG5cdFx0XHRuZXcgZXhwb3J0cy5TRVQodGhpcy52YWx1ZS5zbGljZShhdF9pbmRleCkpXHJcblx0XHRdO1xyXG5cdH1cclxufVxyXG5cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG5leHBvcnRzLk1BVEgucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbihkZXB0aCkge1xyXG5cdHJldHVybiB1dGlsLmZvcm1hdChcIjxNQVRIICVzOiVzPlwiLFxyXG5cdFx0dGhpcy5vcGVyYXRvcixcclxuXHRcdFx0KHR5cGVvZiB0aGlzLm9wZXJhbmQgPT0gXCJudW1iZXJcIiAmJiAodGhpcy5vcGVyYXRvciA9PSBcImFuZFwiIHx8IHRoaXMub3BlcmF0b3IgPT0gXCJvclwiIHx8IHRoaXMub3BlcmF0b3IgPT0gXCJ4b3JcIikpXHJcblx0XHRcdD9cclxuXHRcdFx0XHQoXCIweFwiICsgdGhpcy5vcGVyYW5kLnRvU3RyaW5nKDE2KSlcclxuXHRcdFx0OlxyXG5cdFx0XHRcdHV0aWwuZm9ybWF0KFwiJWpcIiwgdGhpcy5vcGVyYW5kKVxyXG5cdFx0KTtcclxufVxyXG5cclxuZXhwb3J0cy5NQVRILnByb3RvdHlwZS5pbnRlcm5hbFRvSlNPTiA9IGZ1bmN0aW9uKGpzb24sIHByb3RvY29sX3ZlcnNpb24pIHtcclxuXHRqc29uLm9wZXJhdG9yID0gdGhpcy5vcGVyYXRvcjtcclxuXHRqc29uLm9wZXJhbmQgPSB0aGlzLm9wZXJhbmQ7XHJcbn1cclxuXHJcbmV4cG9ydHMuTUFUSC5pbnRlcm5hbEZyb21KU09OID0gZnVuY3Rpb24oanNvbiwgcHJvdG9jb2xfdmVyc2lvbiwgb3BfbWFwKSB7XHJcblx0cmV0dXJuIG5ldyBleHBvcnRzLk1BVEgoanNvbi5vcGVyYXRvciwganNvbi5vcGVyYW5kKTtcclxufVxyXG5cclxuZXhwb3J0cy5NQVRILnByb3RvdHlwZS5hcHBseSA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xyXG5cdC8qIEFwcGxpZXMgdGhlIG9wZXJhdGlvbiB0byB0aGlzLm9wZXJhbmQuIEFwcGxpZXMgdGhlIG9wZXJhdG9yL29wZXJhbmRcclxuXHQgICBhcyBhIGZ1bmN0aW9uIHRvIHRoZSBkb2N1bWVudC4gKi9cclxuXHRpZiAodHlwZW9mIGRvY3VtZW50ID09IFwibnVtYmVyXCIpIHtcclxuXHRcdGlmICh0aGlzLm9wZXJhdG9yID09IFwiYWRkXCIpXHJcblx0XHRcdHJldHVybiBkb2N1bWVudCArIHRoaXMub3BlcmFuZDtcclxuXHRcdGlmICh0aGlzLm9wZXJhdG9yID09IFwibXVsdFwiKVxyXG5cdFx0XHRyZXR1cm4gZG9jdW1lbnQgKiB0aGlzLm9wZXJhbmQ7XHJcblx0XHRpZiAoTnVtYmVyLmlzSW50ZWdlcihkb2N1bWVudCkpIHtcclxuXHRcdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJyb3RcIilcclxuXHRcdFx0XHRyZXR1cm4gKGRvY3VtZW50ICsgdGhpcy5vcGVyYW5kWzBdKSAlIHRoaXMub3BlcmFuZFsxXTtcclxuXHRcdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJhbmRcIilcclxuXHRcdFx0XHRyZXR1cm4gZG9jdW1lbnQgJiB0aGlzLm9wZXJhbmQ7XHJcblx0XHRcdGlmICh0aGlzLm9wZXJhdG9yID09IFwib3JcIilcclxuXHRcdFx0XHRyZXR1cm4gZG9jdW1lbnQgfCB0aGlzLm9wZXJhbmQ7XHJcblx0XHRcdGlmICh0aGlzLm9wZXJhdG9yID09IFwieG9yXCIpXHJcblx0XHRcdFx0cmV0dXJuIGRvY3VtZW50IF4gdGhpcy5vcGVyYW5kO1xyXG5cdFx0XHRpZiAodGhpcy5vcGVyYXRvciA9PSBcIm5vdFwiKVxyXG5cdFx0XHRcdHJldHVybiB+ZG9jdW1lbnQ7XHJcblx0XHR9XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJNQVRIIG9wZXJhdG9yIFwiICsgdGhpcy5vcGVyYXRvciArIFwiIGNhbm5vdCBhcHBseSB0byBcIiArIGRvY3VtZW50ICsgXCIuXCIpO1xyXG5cdFxyXG5cdH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50ID09IFwiYm9vbGVhblwiKSB7XHJcblx0XHRpZiAodGhpcy5vcGVyYXRvciA9PSBcImFuZFwiKVxyXG5cdFx0XHRyZXR1cm4gZG9jdW1lbnQgJiYgdGhpcy5vcGVyYW5kO1xyXG5cdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJvclwiKVxyXG5cdFx0XHRyZXR1cm4gZG9jdW1lbnQgfHwgdGhpcy5vcGVyYW5kO1xyXG5cdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJ4b3JcIilcclxuXHRcdFx0cmV0dXJuICEhKGRvY3VtZW50IF4gdGhpcy5vcGVyYW5kKTsgLy8gY29udmVydCBhcml0aG1ldGljIHJlc3VsdCB0byBib29sZWFuXHJcblx0XHRpZiAodGhpcy5vcGVyYXRvciA9PSBcIm5vdFwiKVxyXG5cdFx0XHRyZXR1cm4gIWRvY3VtZW50O1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTUFUSCBvcGVyYXRvciBcIiArIHRoaXMub3BlcmF0b3IgKyBcIiBkb2VzIG5vdCBhcHBseSB0byBib29sZWFuIHZhbHVlcy5cIilcclxuXHRcclxuXHR9IGVsc2Uge1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTUFUSCBvcGVyYXRpb25zIG9ubHkgYXBwbHkgdG8gbnVtYmVyIGFuZCBib29sZWFuIHZhbHVlcywgbm90IFwiICsgam90LnR5cGVfbmFtZShkb2N1bWVudCkgKyBcIi5cIilcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydHMuTUFUSC5wcm90b3R5cGUuc2ltcGxpZnkgPSBmdW5jdGlvbiAoKSB7XHJcblx0LyogUmV0dXJucyBhIG5ldyBhdG9taWMgb3BlcmF0aW9uIHRoYXQgaXMgYSBzaW1wbGVyIHZlcnNpb25cclxuXHQgICBvZiBhbm90aGVyIG9wZXJhdGlvbi4gSWYgdGhlIG9wZXJhdGlvbiBpcyBhIGRlZ2VuZXJhdGUgY2FzZSxcclxuXHQgICByZXR1cm4gTk9fT1AuICovXHJcblx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJhZGRcIiAmJiB0aGlzLm9wZXJhbmQgPT0gMClcclxuXHRcdHJldHVybiBuZXcgZXhwb3J0cy5OT19PUCgpO1xyXG5cdGlmICh0aGlzLm9wZXJhdG9yID09IFwicm90XCIgJiYgdGhpcy5vcGVyYW5kWzBdID09IDApXHJcblx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTk9fT1AoKTtcclxuXHRpZiAodGhpcy5vcGVyYXRvciA9PSBcIm11bHRcIiAmJiB0aGlzLm9wZXJhbmQgPT0gMSlcclxuXHRcdHJldHVybiBuZXcgZXhwb3J0cy5OT19PUCgpO1xyXG5cdGlmICh0aGlzLm9wZXJhdG9yID09IFwiYW5kXCIgJiYgdGhpcy5vcGVyYW5kID09PSAwKVxyXG5cdFx0cmV0dXJuIG5ldyBleHBvcnRzLlNFVCgwKTtcclxuXHRpZiAodGhpcy5vcGVyYXRvciA9PSBcImFuZFwiICYmIHRoaXMub3BlcmFuZCA9PT0gZmFsc2UpXHJcblx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuU0VUKGZhbHNlKTtcclxuXHRpZiAodGhpcy5vcGVyYXRvciA9PSBcIm9yXCIgJiYgdGhpcy5vcGVyYW5kID09PSAwKVxyXG5cdFx0cmV0dXJuIG5ldyBleHBvcnRzLk5PX09QKCk7XHJcblx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJvclwiICYmIHRoaXMub3BlcmFuZCA9PT0gZmFsc2UpXHJcblx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTk9fT1AoKTtcclxuXHRpZiAodGhpcy5vcGVyYXRvciA9PSBcInhvclwiICYmIHRoaXMub3BlcmFuZCA9PSAwKVxyXG5cdFx0cmV0dXJuIG5ldyBleHBvcnRzLk5PX09QKCk7XHJcblx0cmV0dXJuIHRoaXM7XHJcbn1cclxuXHJcbmV4cG9ydHMuTUFUSC5wcm90b3R5cGUuZHJpbGxkb3duID0gZnVuY3Rpb24oaW5kZXhfb3Jfa2V5KSB7XHJcblx0Ly8gTUFUSCBvcGVyYXRpb25zIG9ubHkgYXBwbHkgdG8gc2NhbGFycywgc28gZHJpbGxpbmcgZG93blxyXG5cdC8vIGRvZXNuJ3QgbWFrZSBhbnkgc2Vuc2UuIEJ1dCB3ZSBjYW4gc2F5IGEgTUFUSCBvcGVyYXRpb25cclxuXHQvLyBkb2Vzbid0IGFmZmVjdCBhbnkgc3ViLWNvbXBvbmVudHMgb2YgdGhlIHZhbHVlLlxyXG5cdHJldHVybiBuZXcgZXhwb3J0cy5OT19PUCgpO1xyXG59O1xyXG5cclxuZXhwb3J0cy5NQVRILnByb3RvdHlwZS5pbnZlcnNlID0gZnVuY3Rpb24gKGRvY3VtZW50KSB7XHJcblx0LyogUmV0dXJucyBhIG5ldyBhdG9taWMgb3BlcmF0aW9uIHRoYXQgaXMgdGhlIGludmVyc2Ugb2YgdGhpcyBvcGVyYXRpb24sXHJcblx0Z2l2ZW4gdGhlIHN0YXRlIG9mIHRoZSBkb2N1bWVudCBiZWZvcmUgdGhlIG9wZXJhdGlvbiBhcHBsaWVzLlxyXG5cdEZvciBtb3N0IG9mIHRoZXNlIG9wZXJhdGlvbnMgdGhlIHZhbHVlIG9mIGRvY3VtZW50IGRvZXNuJ3RcclxuXHRtYXR0ZXIuICovXHJcblx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJhZGRcIilcclxuXHRcdHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwiYWRkXCIsIC10aGlzLm9wZXJhbmQpO1xyXG5cdGlmICh0aGlzLm9wZXJhdG9yID09IFwicm90XCIpXHJcblx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcInJvdFwiLCBbLXRoaXMub3BlcmFuZFswXSwgdGhpcy5vcGVyYW5kWzFdXSk7XHJcblx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJtdWx0XCIpXHJcblx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcIm11bHRcIiwgMS4wL3RoaXMub3BlcmFuZCk7XHJcblx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJhbmRcIilcclxuXHRcdHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwib3JcIiwgZG9jdW1lbnQgJiAofnRoaXMub3BlcmFuZCkpO1xyXG5cdGlmICh0aGlzLm9wZXJhdG9yID09IFwib3JcIilcclxuXHRcdHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwieG9yXCIsIH5kb2N1bWVudCAmIHRoaXMub3BlcmFuZCk7XHJcblx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJ4b3JcIilcclxuXHRcdHJldHVybiB0aGlzOyAvLyBpcyBpdHMgb3duIGludmVyc2VcclxuXHRpZiAodGhpcy5vcGVyYXRvciA9PSBcIm5vdFwiKVxyXG5cdFx0cmV0dXJuIHRoaXM7IC8vIGlzIGl0cyBvd24gaW52ZXJzZVxyXG59XHJcblxyXG5leHBvcnRzLk1BVEgucHJvdG90eXBlLmF0b21pY19jb21wb3NlID0gZnVuY3Rpb24gKG90aGVyKSB7XHJcblx0LyogQ3JlYXRlcyBhIG5ldyBhdG9taWMgb3BlcmF0aW9uIHRoYXQgaGFzIHRoZSBzYW1lIHJlc3VsdCBhcyB0aGlzXHJcblx0ICAgYW5kIG90aGVyIGFwcGxpZWQgaW4gc2VxdWVuY2UgKHRoaXMgZmlyc3QsIG90aGVyIGFmdGVyKS4gUmV0dXJuc1xyXG5cdCAgIG51bGwgaWYgbm8gYXRvbWljIG9wZXJhdGlvbiBpcyBwb3NzaWJsZS4gKi9cclxuXHJcblx0aWYgKG90aGVyIGluc3RhbmNlb2YgZXhwb3J0cy5NQVRIKSB7XHJcblx0XHQvLyB0d28gYWRkcyBqdXN0IGFkZCB0aGUgb3BlcmFuZHNcclxuXHRcdGlmICh0aGlzLm9wZXJhdG9yID09IG90aGVyLm9wZXJhdG9yICYmIHRoaXMub3BlcmF0b3IgPT0gXCJhZGRcIilcclxuXHRcdFx0cmV0dXJuIG5ldyBleHBvcnRzLk1BVEgoXCJhZGRcIiwgdGhpcy5vcGVyYW5kICsgb3RoZXIub3BlcmFuZCkuc2ltcGxpZnkoKTtcclxuXHJcblx0XHQvLyB0d28gcm90cyB3aXRoIHRoZSBzYW1lIG1vZHVsdXMgYWRkIHRoZSBvcGVyYW5kc1xyXG5cdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gb3RoZXIub3BlcmF0b3IgJiYgdGhpcy5vcGVyYXRvciA9PSBcInJvdFwiICYmIHRoaXMub3BlcmFuZFsxXSA9PSBvdGhlci5vcGVyYW5kWzFdKVxyXG5cdFx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcInJvdFwiLCBbdGhpcy5vcGVyYW5kWzBdICsgb3RoZXIub3BlcmFuZFswXSwgdGhpcy5vcGVyYW5kWzFdXSkuc2ltcGxpZnkoKTtcclxuXHJcblx0XHQvLyB0d28gbXVsdGlwbGljYXRpb25zIG11bHRpcGx5IHRoZSBvcGVyYW5kc1xyXG5cdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gb3RoZXIub3BlcmF0b3IgJiYgdGhpcy5vcGVyYXRvciA9PSBcIm11bHRcIilcclxuXHRcdFx0cmV0dXJuIG5ldyBleHBvcnRzLk1BVEgoXCJtdWx0XCIsIHRoaXMub3BlcmFuZCAqIG90aGVyLm9wZXJhbmQpLnNpbXBsaWZ5KCk7XHJcblxyXG5cdFx0Ly8gdHdvIGFuZCdzIGFuZCB0aGUgb3BlcmFuZHNcclxuXHRcdGlmICh0aGlzLm9wZXJhdG9yID09IG90aGVyLm9wZXJhdG9yICYmIHRoaXMub3BlcmF0b3IgPT0gXCJhbmRcIiAmJiB0eXBlb2YgdGhpcy5vcGVyYW5kID09IHR5cGVvZiBvdGhlci5vcGVyYW5kICYmIHR5cGVvZiB0aGlzLm9wZXJhbmQgPT0gXCJudW1iZXJcIilcclxuXHRcdFx0cmV0dXJuIG5ldyBleHBvcnRzLk1BVEgoXCJhbmRcIiwgdGhpcy5vcGVyYW5kICYgb3RoZXIub3BlcmFuZCkuc2ltcGxpZnkoKTtcclxuXHRcdGlmICh0aGlzLm9wZXJhdG9yID09IG90aGVyLm9wZXJhdG9yICYmIHRoaXMub3BlcmF0b3IgPT0gXCJhbmRcIiAmJiB0eXBlb2YgdGhpcy5vcGVyYW5kID09IHR5cGVvZiBvdGhlci5vcGVyYW5kICYmIHR5cGVvZiB0aGlzLm9wZXJhbmQgPT0gXCJib29sZWFuXCIpXHJcblx0XHRcdHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwiYW5kXCIsIHRoaXMub3BlcmFuZCAmJiBvdGhlci5vcGVyYW5kKS5zaW1wbGlmeSgpO1xyXG5cclxuXHRcdC8vIHR3byBvcidzIG9yIHRoZSBvcGVyYW5kc1xyXG5cdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gb3RoZXIub3BlcmF0b3IgJiYgdGhpcy5vcGVyYXRvciA9PSBcIm9yXCIgJiYgdHlwZW9mIHRoaXMub3BlcmFuZCA9PSB0eXBlb2Ygb3RoZXIub3BlcmFuZCAmJiB0eXBlb2YgdGhpcy5vcGVyYW5kID09IFwibnVtYmVyXCIpXHJcblx0XHRcdHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwib3JcIiwgdGhpcy5vcGVyYW5kIHwgb3RoZXIub3BlcmFuZCkuc2ltcGxpZnkoKTtcclxuXHRcdGlmICh0aGlzLm9wZXJhdG9yID09IG90aGVyLm9wZXJhdG9yICYmIHRoaXMub3BlcmF0b3IgPT0gXCJvclwiICYmIHR5cGVvZiB0aGlzLm9wZXJhbmQgPT0gdHlwZW9mIG90aGVyLm9wZXJhbmQgJiYgdHlwZW9mIHRoaXMub3BlcmFuZCA9PSBcImJvb2xlYW5cIilcclxuXHRcdFx0cmV0dXJuIG5ldyBleHBvcnRzLk1BVEgoXCJvclwiLCB0aGlzLm9wZXJhbmQgfHwgb3RoZXIub3BlcmFuZCkuc2ltcGxpZnkoKTtcclxuXHJcblx0XHQvLyB0d28geG9yJ3MgeG9yIHRoZSBvcGVyYW5kc1xyXG5cdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gb3RoZXIub3BlcmF0b3IgJiYgdGhpcy5vcGVyYXRvciA9PSBcInhvclwiICYmIHR5cGVvZiB0aGlzLm9wZXJhbmQgPT0gdHlwZW9mIG90aGVyLm9wZXJhbmQgJiYgdHlwZW9mIHRoaXMub3BlcmFuZCA9PSBcIm51bWJlclwiKVxyXG5cdFx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcInhvclwiLCB0aGlzLm9wZXJhbmQgXiBvdGhlci5vcGVyYW5kKS5zaW1wbGlmeSgpO1xyXG5cdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gb3RoZXIub3BlcmF0b3IgJiYgdGhpcy5vcGVyYXRvciA9PSBcInhvclwiICYmIHR5cGVvZiB0aGlzLm9wZXJhbmQgPT0gdHlwZW9mIG90aGVyLm9wZXJhbmQgJiYgdHlwZW9mIHRoaXMub3BlcmFuZCA9PSBcImJvb2xlYW5cIilcclxuXHRcdFx0cmV0dXJuIG5ldyBleHBvcnRzLk1BVEgoXCJ4b3JcIiwgISEodGhpcy5vcGVyYW5kIF4gb3RoZXIub3BlcmFuZCkpLnNpbXBsaWZ5KCk7XHJcblxyXG5cdFx0Ly8gdHdvIG5vdCdzIGNhbmNlbCBlYWNoIG90aGVyIG91dFxyXG5cdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gb3RoZXIub3BlcmF0b3IgJiYgdGhpcy5vcGVyYXRvciA9PSBcIm5vdFwiKVxyXG5cdFx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTk9fT1AoKTtcclxuXHJcblx0XHQvLyBhbmQrb3Igd2l0aCB0aGUgc2FtZSBvcGVyYW5kIGlzIFNFVChvcGVyYW5kKVxyXG5cdFx0aWYgKHRoaXMub3BlcmF0b3IgPT0gXCJhbmRcIiAmJiBvdGhlci5vcGVyYXRvciA9PSBcIm9yXCIgJiYgdGhpcy5vcGVyYW5kID09PSBvdGhlci5vcGVyYW5kKVxyXG5cdFx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuU0VUKHRoaXMub3BlcmFuZCk7XHJcblxyXG5cdFx0Ly8gb3IreG9yIHdpdGggdGhlIHNhbWUgb3BlcmFuZCBpcyBBTkQofm9wZXJhbmQpXHJcblx0XHRpZiAodGhpcy5vcGVyYXRvciA9PSBcIm9yXCIgJiYgb3RoZXIub3BlcmF0b3IgPT0gXCJ4b3JcIiAmJiB0aGlzLm9wZXJhbmQgPT09IG90aGVyLm9wZXJhbmQgJiYgdHlwZW9mIHRoaXMub3BlcmFuZCA9PSBcIm51bWJlclwiKVxyXG5cdFx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcImFuZFwiLCB+dGhpcy5vcGVyYW5kKTtcclxuXHRcdGlmICh0aGlzLm9wZXJhdG9yID09IFwib3JcIiAmJiBvdGhlci5vcGVyYXRvciA9PSBcInhvclwiICYmIHRoaXMub3BlcmFuZCA9PT0gb3RoZXIub3BlcmFuZCAmJiB0eXBlb2YgdGhpcy5vcGVyYW5kID09IFwiYm9vbGVhblwiKVxyXG5cdFx0XHRyZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcImFuZFwiLCAhdGhpcy5vcGVyYW5kKTtcclxuXHJcblx0fVxyXG5cdFxyXG5cdHJldHVybiBudWxsOyAvLyBubyBjb21wb3NpdGlvbiBpcyBwb3NzaWJsZVxyXG59XHJcblxyXG5leHBvcnRzLk1BVEgucHJvdG90eXBlLnJlYmFzZV9mdW5jdGlvbnMgPSBbXHJcblx0Ly8gUmViYXNlIHRoaXMgYWdhaW5zdCBvdGhlciBhbmQgb3RoZXIgYWdhaW5zdCB0aGlzLlxyXG5cclxuXHRbZXhwb3J0cy5NQVRILCBmdW5jdGlvbihvdGhlciwgY29uZmxpY3RsZXNzKSB7XHJcblx0XHQvLyBJZiB0aGlzIGFuZCBvdGhlciBhcmUgTUFUSCBvcGVyYXRpb25zIHdpdGggdGhlIHNhbWUgb3BlcmF0b3IgKGkuZS4gdHdvXHJcblx0XHQvLyBhZGQnczsgdHdvIHJvdCdzIHdpdGggdGhlIHNhbWUgbW9kdWx1cyksIHRoZW4gc2luY2UgdGhleSBhcmUgY29tbXV0YXRpdmVcclxuXHRcdC8vIHRoZWlyIG9yZGVyIGRvZXMgbm90IG1hdHRlciBhbmQgdGhlIHJlYmFzZSByZXR1cm5zIGVhY2ggb3BlcmF0aW9uXHJcblx0XHQvLyB1bmNoYW5nZWQuXHJcblx0XHRpZiAodGhpcy5vcGVyYXRvciA9PSBvdGhlci5vcGVyYXRvclxyXG5cdFx0XHQmJiAodGhpcy5vcGVyYXRvciAhPSBcInJvdFwiIHx8IHRoaXMub3BlcmFuZFsxXSA9PSBvdGhlci5vcGVyYW5kWzFdKSlcclxuXHRcdFx0XHRyZXR1cm4gW3RoaXMsIG90aGVyXTtcclxuXHJcblx0XHQvLyBXaGVuIHR3byBkaWZmZXJlbnQgb3BlcmF0b3JzIG9jdXJyIHNpbXVsdGFuZW91c2x5LCB0aGVuIHRoZSBvcmRlciBtYXR0ZXJzLlxyXG5cdFx0Ly8gU2luY2Ugb3BlcmF0b3JzIHByZXNlcnZlIHRoZSBkYXRhIHR5cGUgb2YgdGhlIGRvY3VtZW50LCB3ZSBrbm93IHRoYXQgYm90aFxyXG5cdFx0Ly8gb3JkZXJzIGFyZSB2YWxpZC4gQ2hvb3NlIGFuIG9yZGVyIGJhc2VkIG9uIHRoZSBvcGVyYXRpb25zOiBXZSdsbCBwdXQgdGhpc1xyXG5cdFx0Ly8gZmlyc3QgYW5kIG90aGVyIHNlY29uZC5cclxuXHRcdGlmIChjb25mbGljdGxlc3MgJiYgXCJkb2N1bWVudFwiIGluIGNvbmZsaWN0bGVzcykge1xyXG5cdFx0XHRpZiAoam90LmNtcChbdGhpcy5vcGVyYXRvciwgdGhpcy5vcGVyYW5kXSwgW290aGVyLm9wZXJhdG9yLCBvdGhlci5vcGVyYW5kXSkgPCAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIFtcclxuXHRcdFx0XHRcdC8vIHRoaXMgY2FtZSBzZWNvbmQsIHNvIHJlcGxhY2UgaXQgd2l0aCBhbiBvcGVyYXRpb24gdGhhdFxyXG5cdFx0XHRcdFx0Ly8gaW52ZXJ0cyB0aGUgZXhpc3Rpbmcgb3RoZXIgb3BlcmF0aW9uLCB0aGVuIGFwcGxpZXMgdGhpcyxcclxuXHRcdFx0XHRcdC8vIHRoZW4gcmUtYXBwbGllcyBvdGhlci4gQWx0aG91Z2ggYSBjb21wb3NpdGlvbiBvZiBvcGVyYXRpb25zXHJcblx0XHRcdFx0XHQvLyBpcyBsb2dpY2FsbHkgc2Vuc2libGUsIHJldHVybmluZyBhIExJU1Qgd2lsbCBjYXVzZSBMSVNULnJlYmFzZVxyXG5cdFx0XHRcdFx0Ly8gdG8gZ28gaW50byBhbiBpbmZpbml0ZSByZWdyZXNzIGluIHNvbWUgY2FzZXMuXHJcblx0XHRcdFx0XHRuZXcgZXhwb3J0cy5TRVQodGhpcy5jb21wb3NlKG90aGVyKS5hcHBseShjb25mbGljdGxlc3MuZG9jdW1lbnQpKSxcclxuXHRcdFx0XHRcdC8vb3RoZXIuaW52ZXJzZShjb25mbGljdGxlc3MuZG9jdW1lbnQpLmNvbXBvc2UodGhpcykuY29tcG9zZShvdGhlciksXHJcblxyXG5cdFx0XHRcdFx0Ly8gbm8gbmVlZCB0byByZXdyaXRlIG90aGVyIGJlY2F1c2UgaXQncyBzdXBwb3NlZCB0byBjb21lIHNlY29uZFxyXG5cdFx0XHRcdFx0b3RoZXJcclxuXHRcdFx0XHRdXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBUaGUgb3RoZXIgb3JkZXIgaXMgaGFuZGxlZCBieSB0aGUgY29udmVyc2UgY2FsbCBoYW5kbGVkIGJ5IGpvdC5yZWJhc2UuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XVxyXG5dO1xyXG5cclxuZXhwb3J0cy5jcmVhdGVSYW5kb21PcCA9IGZ1bmN0aW9uKGRvYywgY29udGV4dCkge1xyXG5cdC8vIENyZWF0ZSBhIHJhbmRvbSBvcGVyYXRpb24gdGhhdCBjb3VsZCBhcHBseSB0byBkb2MuXHJcblx0Ly8gQ2hvb3NlIHVuaWZvcm1seSBhY3Jvc3MgdmFyaW91cyBvcHRpb25zIGRlcGVuZGluZyBvblxyXG5cdC8vIHRoZSBkYXRhIHR5cGUgb2YgZG9jLlxyXG5cdHZhciBvcHMgPSBbXTtcclxuXHJcblx0Ly8gTk9fT1AgaXMgYWx3YXlzIGEgcG9zc2liaWxpdHkuXHJcblx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5OT19PUCgpIH0pO1xyXG5cclxuXHQvLyBBbiBpZGVudGl0eSBTRVQgaXMgYWx3YXlzIGEgcG9zc2liaWxpdHkuXHJcblx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5TRVQoZG9jKSB9KTtcclxuXHJcblx0Ly8gU2V0IHRvIGFub3RoZXIgcmFuZG9tIHZhbHVlIG9mIGEgZGlmZmVyZW50IHR5cGUuXHJcblx0Ly8gQ2FuJ3QgZG8gdGhpcyBpbiBhIGNvbnRleHQgd2hlcmUgY2hhbmdpbmcgdGhlIHR5cGUgaXMgbm90IHZhbGlkLFxyXG5cdC8vIGkuZS4gd2hlbiBpbiBhIFBBVENIIG9yIE1BUCBvcGVyYXRpb24gb24gYSBzdHJpbmcuXHJcblx0aWYgKGNvbnRleHQgIT0gXCJzdHJpbmctZWxlbVwiICYmIGNvbnRleHQgIT0gXCJzdHJpbmdcIilcclxuXHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuU0VUKGpvdC5jcmVhdGVSYW5kb21WYWx1ZSgpKSB9KTtcclxuXHJcblx0Ly8gQ2xlYXIgdGhlIGtleSwgaWYgd2UncmUgaW4gYW4gb2JqZWN0LlxyXG5cdGlmIChjb250ZXh0ID09IFwib2JqZWN0XCIpXHJcblx0XHRvcHMucHVzaChmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBleHBvcnRzLlNFVChNSVNTSU5HKSB9KTtcclxuXHJcblx0Ly8gU2V0IHRvIGFub3RoZXIgdmFsdWUgb2YgdGhlIHNhbWUgdHlwZS5cclxuXHRpZiAodHlwZW9mIGRvYyA9PT0gXCJib29sZWFuXCIpXHJcblx0XHRvcHMucHVzaChmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBleHBvcnRzLlNFVCghZG9jKSB9KTtcclxuXHRpZiAodHlwZW9mIGRvYyA9PT0gXCJudW1iZXJcIikge1xyXG5cdFx0aWYgKE51bWJlci5pc0ludGVnZXIoZG9jKSkge1xyXG5cdFx0XHRvcHMucHVzaChmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBleHBvcnRzLlNFVChkb2MgKyBNYXRoLmZsb29yKChNYXRoLnJhbmRvbSgpKy41KSAqIDEwMCkpIH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5TRVQoZG9jICogKE1hdGgucmFuZG9tKCkrLjUpKSB9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGlmICgodHlwZW9mIGRvYyA9PT0gXCJzdHJpbmdcIiB8fCBBcnJheS5pc0FycmF5KGRvYykpICYmIGNvbnRleHQgIT0gXCJzdHJpbmctZWxlbVwiKSB7XHJcblx0XHQvLyBEZWxldGUgKGlmIG5vdCBhbHJlYWR5IGVtcHR5KS5cclxuXHRcdGlmIChkb2MubGVuZ3RoID4gMClcclxuXHRcdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5TRVQoZG9jLnNsaWNlKDAsIDApKSB9KTtcclxuXHJcblx0XHRpZiAoZG9jLmxlbmd0aCA+PSAxKSB7XHJcblx0XHRcdC8vIHNob3J0ZW4gYXQgc3RhcnRcclxuXHRcdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5TRVQoZG9jLnNsaWNlKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSooZG9jLmxlbmd0aC0xKSksIGRvYy5sZW5ndGgpKSB9KTtcclxuXHJcblx0XHRcdC8vIHNob3J0ZW4gYXQgZW5kXHJcblx0XHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuU0VUKGRvYy5zbGljZSgwLCBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqKGRvYy5sZW5ndGgtMSkpKSkgfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGRvYy5sZW5ndGggPj0gMikge1xyXG5cdFx0XHQvLyBzaG9ydGVuIGJ5IG9uIGJvdGggc2lkZXNcclxuXHRcdFx0dmFyIGEgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqZG9jLmxlbmd0aC0xKTtcclxuXHRcdFx0dmFyIGIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqKGRvYy5sZW5ndGgtYSkpO1xyXG5cdFx0XHRvcHMucHVzaChmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBleHBvcnRzLlNFVChkb2Muc2xpY2UoYSwgYStiKSkgfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGRvYy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdC8vIGV4cGFuZCBieSBjb3B5aW5nIGV4aXN0aW5nIGVsZW1lbnRzIGZyb20gZG9jdW1lbnRcclxuXHJcblx0XHRcdGZ1bmN0aW9uIGNvbmNhdDIoaXRlbTEsIGl0ZW0yKSB7XHJcblx0XHRcdFx0aWYgKGl0ZW0xIGluc3RhbmNlb2YgU3RyaW5nKVxyXG5cdFx0XHRcdFx0cmV0dXJuIGl0ZW0xICsgaXRlbTI7XHJcblx0XHRcdFx0cmV0dXJuIGl0ZW0xLmNvbmNhdChpdGVtMik7XHJcblx0XHRcdH1cclxuXHRcdFx0ZnVuY3Rpb24gY29uY2F0MyhpdGVtMSwgaXRlbTIsIGl0ZW0zKSB7XHJcblx0XHRcdFx0aWYgKGl0ZW0xIGluc3RhbmNlb2YgU3RyaW5nKVxyXG5cdFx0XHRcdFx0cmV0dXJuIGl0ZW0xICsgaXRlbTIgKyBpdGVtMztcclxuXHRcdFx0XHRyZXR1cm4gaXRlbTEuY29uY2F0KGl0ZW0yKS5jb25jYXQoaXRlbTMpO1xyXG5cdFx0XHR9XHJcblx0XHRcclxuXHRcdFx0Ly8gZXhwYW5kIGJ5IGVsZW1lbnRzIGF0IHN0YXJ0XHJcblx0XHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuU0VUKGNvbmNhdDIoZG9jLnNsaWNlKDAsIDErTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKihkb2MubGVuZ3RoLTEpKSksIGRvYykpIH0pO1xyXG5cdFx0XHQvLyBleHBhbmQgYnkgZWxlbWVudHMgYXQgZW5kXHJcblx0XHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuU0VUKGNvbmNhdDIoZG9jLCBkb2Muc2xpY2UoMCwgMStNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqKGRvYy5sZW5ndGgtMSkpKSkpOyB9KTtcclxuXHRcdFx0Ly8gZXhwYW5kIGJ5IGVsZW1lbnRzIG9uIGJvdGggc2lkZXNcclxuXHRcdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5TRVQoY29uY2F0Myhkb2Muc2xpY2UoMCwgMStNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqKGRvYy5sZW5ndGgtMSkpKSwgZG9jLCBkb2Muc2xpY2UoMCwgMStNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqKGRvYy5sZW5ndGgtMSkpKSkpOyB9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIGV4cGFuZCBieSBnZW5lcmF0aW5nIG5ldyBlbGVtZW50c1xyXG5cdFx0XHRpZiAodHlwZW9mIGRvYyA9PT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRvcHMucHVzaChmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBleHBvcnRzLlNFVCgoTWF0aC5yYW5kb20oKStcIlwiKS5zbGljZSgyKSk7IH0pO1xyXG5cdFx0XHRlbHNlIGlmIChBcnJheS5pc0FycmF5KGRvYykpXHJcblx0XHRcdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5TRVQoW251bGwsbnVsbCxudWxsXS5tYXAoZnVuY3Rpb24oKSB7IHJldHVybiBNYXRoLnJhbmRvbSgpIH0pKTsgfSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRpZiAodHlwZW9mIGRvYyA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0Ly8gcmV2ZXJzZVxyXG5cdFx0aWYgKGRvYyAhPSBkb2Muc3BsaXQoXCJcIikucmV2ZXJzZSgpLmpvaW4oXCJcIikpXHJcblx0XHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuU0VUKGRvYy5zcGxpdChcIlwiKS5yZXZlcnNlKCkuam9pbihcIlwiKSk7IH0pO1xyXG5cclxuXHRcdC8vIHJlcGxhY2Ugd2l0aCBuZXcgZWxlbWVudHMgb2YgdGhlIHNhbWUgbGVuZ3RoXHJcblx0XHRpZiAoZG9jLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dmFyIG5ld3ZhbHVlID0gXCJcIjtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkb2MubGVuZ3RoOyBpKyspXHJcblx0XHRcdFx0bmV3dmFsdWUgKz0gKE1hdGgucmFuZG9tKCkrXCJcIikuc2xpY2UoMiwgMyk7XHJcblx0XHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuU0VUKG5ld3ZhbHVlKTsgfSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBNYXRoXHJcblx0aWYgKHR5cGVvZiBkb2MgPT09IFwibnVtYmVyXCIpIHtcclxuXHRcdGlmIChOdW1iZXIuaXNJbnRlZ2VyKGRvYykpIHtcclxuXHRcdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwiYWRkXCIsIE1hdGguZmxvb3IoMTAwICogKE1hdGgucmFuZG9tKCkgLSAuMjUpKSk7IH0pXHJcblx0XHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcIm11bHRcIiwgTWF0aC5mbG9vcihNYXRoLmV4cChNYXRoLnJhbmRvbSgpKy41KSkpOyB9KVxyXG5cdFx0XHRpZiAoZG9jID4gMSlcclxuXHRcdFx0XHRvcHMucHVzaChmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBleHBvcnRzLk1BVEgoXCJyb3RcIiwgWzEsIE1hdGgubWluKDEzLCBkb2MpXSk7IH0pXHJcblx0XHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcImFuZFwiLCAweEYxKTsgfSlcclxuXHRcdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwib3JcIiwgMHhGMSk7IH0pXHJcblx0XHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcInhvclwiLCAweEYxKTsgfSlcclxuXHRcdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwibm90XCIsIG51bGwpOyB9KVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gZmxvYXRpbmcgcG9pbnQgbWF0aCB5aWVsZHMgaW5leGFjdC9pbmNvbnNpc3RlbnQgcmVzdWx0cyBpZiBvcGVyYXRpb25cclxuXHRcdFx0Ly8gb3JkZXIgY2hhbmdlcywgc28geW91IG1heSB3YW50IHRvIGRpc2FibGUgdGhlc2UgaW4gdGVzdGluZ1xyXG5cdFx0XHRvcHMucHVzaChmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBleHBvcnRzLk1BVEgoXCJhZGRcIiwgMTAwICogKE1hdGgucmFuZG9tKCkgLSAuMjUpKTsgfSlcclxuXHRcdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwibXVsdFwiLCBNYXRoLmV4cChNYXRoLnJhbmRvbSgpKy41KSk7IH0pXHJcblx0XHR9XHJcblx0fVxyXG5cdGlmICh0eXBlb2YgZG9jID09PSBcImJvb2xlYW5cIikge1xyXG5cdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwiYW5kXCIsIHRydWUpOyB9KVxyXG5cdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwiYW5kXCIsIGZhbHNlKTsgfSlcclxuXHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcIm9yXCIsIHRydWUpOyB9KVxyXG5cdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwib3JcIiwgZmFsc2UpOyB9KVxyXG5cdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwieG9yXCIsIHRydWUpOyB9KVxyXG5cdFx0b3BzLnB1c2goZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgZXhwb3J0cy5NQVRIKFwieG9yXCIsIGZhbHNlKTsgfSlcclxuXHRcdG9wcy5wdXNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IGV4cG9ydHMuTUFUSChcIm5vdFwiLCBudWxsKTsgfSlcclxuXHR9XHJcblxyXG5cdC8vIFNlbGVjdCByYW5kb21seS5cclxuXHRyZXR1cm4gb3BzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG9wcy5sZW5ndGgpXSgpO1xyXG59XHJcbiIsInZhciBvYmplY3RLZXlzID0gcmVxdWlyZSgnb2JqZWN0LWtleXMnKTtcbnZhciBpc0FyZ3VtZW50cyA9IHJlcXVpcmUoJ2lzLWFyZ3VtZW50cycpO1xudmFyIGlzID0gcmVxdWlyZSgnb2JqZWN0LWlzJyk7XG52YXIgaXNSZWdleCA9IHJlcXVpcmUoJ2lzLXJlZ2V4Jyk7XG52YXIgZmxhZ3MgPSByZXF1aXJlKCdyZWdleHAucHJvdG90eXBlLmZsYWdzJyk7XG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzYXJyYXknKTtcbnZhciBpc0RhdGUgPSByZXF1aXJlKCdpcy1kYXRlLW9iamVjdCcpO1xudmFyIHdoaWNoQm94ZWRQcmltaXRpdmUgPSByZXF1aXJlKCd3aGljaC1ib3hlZC1wcmltaXRpdmUnKTtcbnZhciBHZXRJbnRyaW5zaWMgPSByZXF1aXJlKCdlcy1hYnN0cmFjdC9HZXRJbnRyaW5zaWMnKTtcbnZhciBjYWxsQm91bmQgPSByZXF1aXJlKCdlcy1hYnN0cmFjdC9oZWxwZXJzL2NhbGxCb3VuZCcpO1xudmFyIHdoaWNoQ29sbGVjdGlvbiA9IHJlcXVpcmUoJ3doaWNoLWNvbGxlY3Rpb24nKTtcbnZhciBnZXRJdGVyYXRvciA9IHJlcXVpcmUoJ2VzLWdldC1pdGVyYXRvcicpO1xudmFyIGdldFNpZGVDaGFubmVsID0gcmVxdWlyZSgnc2lkZS1jaGFubmVsJyk7XG5cbnZhciAkZ2V0VGltZSA9IGNhbGxCb3VuZCgnRGF0ZS5wcm90b3R5cGUuZ2V0VGltZScpO1xudmFyIGdQTyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcbnZhciAkb2JqVG9TdHJpbmcgPSBjYWxsQm91bmQoJ09iamVjdC5wcm90b3R5cGUudG9TdHJpbmcnKTtcblxudmFyICRTZXQgPSBHZXRJbnRyaW5zaWMoJyVTZXQlJywgdHJ1ZSk7XG52YXIgJG1hcEhhcyA9IGNhbGxCb3VuZCgnTWFwLnByb3RvdHlwZS5oYXMnLCB0cnVlKTtcbnZhciAkbWFwR2V0ID0gY2FsbEJvdW5kKCdNYXAucHJvdG90eXBlLmdldCcsIHRydWUpO1xudmFyICRtYXBTaXplID0gY2FsbEJvdW5kKCdNYXAucHJvdG90eXBlLnNpemUnLCB0cnVlKTtcbnZhciAkc2V0QWRkID0gY2FsbEJvdW5kKCdTZXQucHJvdG90eXBlLmFkZCcsIHRydWUpO1xudmFyICRzZXREZWxldGUgPSBjYWxsQm91bmQoJ1NldC5wcm90b3R5cGUuZGVsZXRlJywgdHJ1ZSk7XG52YXIgJHNldEhhcyA9IGNhbGxCb3VuZCgnU2V0LnByb3RvdHlwZS5oYXMnLCB0cnVlKTtcbnZhciAkc2V0U2l6ZSA9IGNhbGxCb3VuZCgnU2V0LnByb3RvdHlwZS5zaXplJywgdHJ1ZSk7XG5cbi8vIHRha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Jyb3dzZXJpZnkvY29tbW9uanMtYXNzZXJ0L2Jsb2IvYmJhODM4ZTliYTllMjhlZGYzMTI3Y2U2OTc0NjI0MjA4NTAyZjZiYy9pbnRlcm5hbC91dGlsL2NvbXBhcmlzb25zLmpzI0w0MDEtTDQxNFxuZnVuY3Rpb24gc2V0SGFzRXF1YWxFbGVtZW50KHNldCwgdmFsMSwgc3RyaWN0LCBjaGFubmVsKSB7XG4gIHZhciBpID0gZ2V0SXRlcmF0b3Ioc2V0KTtcbiAgdmFyIHJlc3VsdDtcbiAgd2hpbGUgKChyZXN1bHQgPSBpLm5leHQoKSkgJiYgIXJlc3VsdC5kb25lKSB7XG4gICAgaWYgKGludGVybmFsRGVlcEVxdWFsKHZhbDEsIHJlc3VsdC52YWx1ZSwgc3RyaWN0LCBjaGFubmVsKSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVzZS1iZWZvcmUtZGVmaW5lXG4gICAgICAvLyBSZW1vdmUgdGhlIG1hdGNoaW5nIGVsZW1lbnQgdG8gbWFrZSBzdXJlIHdlIGRvIG5vdCBjaGVjayB0aGF0IGFnYWluLlxuICAgICAgJHNldERlbGV0ZShzZXQsIHJlc3VsdC52YWx1ZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIHRha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Jyb3dzZXJpZnkvY29tbW9uanMtYXNzZXJ0L2Jsb2IvYmJhODM4ZTliYTllMjhlZGYzMTI3Y2U2OTc0NjI0MjA4NTAyZjZiYy9pbnRlcm5hbC91dGlsL2NvbXBhcmlzb25zLmpzI0w0MTYtTDQzOVxuZnVuY3Rpb24gZmluZExvb3NlTWF0Y2hpbmdQcmltaXRpdmVzKHByaW0pIHtcbiAgaWYgKHR5cGVvZiBwcmltID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmICh0eXBlb2YgcHJpbSA9PT0gJ29iamVjdCcpIHsgLy8gT25seSBwYXNzIGluIG51bGwgYXMgb2JqZWN0IVxuICAgIHJldHVybiB2b2lkIDA7XG4gIH1cbiAgaWYgKHR5cGVvZiBwcmltID09PSAnc3ltYm9sJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAodHlwZW9mIHByaW0gPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBwcmltID09PSAnbnVtYmVyJykge1xuICAgIC8vIExvb3NlIGVxdWFsIGVudHJpZXMgZXhpc3Qgb25seSBpZiB0aGUgc3RyaW5nIGlzIHBvc3NpYmxlIHRvIGNvbnZlcnQgdG8gYSByZWd1bGFyIG51bWJlciBhbmQgbm90IE5hTi5cbiAgICByZXR1cm4gK3ByaW0gPT09ICtwcmltOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWltcGxpY2l0LWNvZXJjaW9uXG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIHRha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Jyb3dzZXJpZnkvY29tbW9uanMtYXNzZXJ0L2Jsb2IvYmJhODM4ZTliYTllMjhlZGYzMTI3Y2U2OTc0NjI0MjA4NTAyZjZiYy9pbnRlcm5hbC91dGlsL2NvbXBhcmlzb25zLmpzI0w0NDktTDQ2MFxuZnVuY3Rpb24gbWFwTWlnaHRIYXZlTG9vc2VQcmltKGEsIGIsIHByaW0sIGl0ZW0sIGNoYW5uZWwpIHtcbiAgdmFyIGFsdFZhbHVlID0gZmluZExvb3NlTWF0Y2hpbmdQcmltaXRpdmVzKHByaW0pO1xuICBpZiAoYWx0VmFsdWUgIT0gbnVsbCkge1xuICAgIHJldHVybiBhbHRWYWx1ZTtcbiAgfVxuICB2YXIgY3VyQiA9ICRtYXBHZXQoYiwgYWx0VmFsdWUpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdXNlLWJlZm9yZS1kZWZpbmVcbiAgaWYgKCh0eXBlb2YgY3VyQiA9PT0gJ3VuZGVmaW5lZCcgJiYgISRtYXBIYXMoYiwgYWx0VmFsdWUpKSB8fCAhaW50ZXJuYWxEZWVwRXF1YWwoaXRlbSwgY3VyQiwgZmFsc2UsIGNoYW5uZWwpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11c2UtYmVmb3JlLWRlZmluZVxuICByZXR1cm4gISRtYXBIYXMoYSwgYWx0VmFsdWUpICYmIGludGVybmFsRGVlcEVxdWFsKGl0ZW0sIGN1ckIsIGZhbHNlLCBjaGFubmVsKTtcbn1cblxuLy8gdGFrZW4gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vYnJvd3NlcmlmeS9jb21tb25qcy1hc3NlcnQvYmxvYi9iYmE4MzhlOWJhOWUyOGVkZjMxMjdjZTY5NzQ2MjQyMDg1MDJmNmJjL2ludGVybmFsL3V0aWwvY29tcGFyaXNvbnMuanMjTDQ0MS1MNDQ3XG5mdW5jdGlvbiBzZXRNaWdodEhhdmVMb29zZVByaW0oYSwgYiwgcHJpbSkge1xuICB2YXIgYWx0VmFsdWUgPSBmaW5kTG9vc2VNYXRjaGluZ1ByaW1pdGl2ZXMocHJpbSk7XG4gIGlmIChhbHRWYWx1ZSAhPSBudWxsKSB7XG4gICAgcmV0dXJuIGFsdFZhbHVlO1xuICB9XG5cbiAgcmV0dXJuICRzZXRIYXMoYiwgYWx0VmFsdWUpICYmICEkc2V0SGFzKGEsIGFsdFZhbHVlKTtcbn1cblxuLy8gdGFrZW4gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vYnJvd3NlcmlmeS9jb21tb25qcy1hc3NlcnQvYmxvYi9iYmE4MzhlOWJhOWUyOGVkZjMxMjdjZTY5NzQ2MjQyMDg1MDJmNmJjL2ludGVybmFsL3V0aWwvY29tcGFyaXNvbnMuanMjTDUxOC1MNTMzXG5mdW5jdGlvbiBtYXBIYXNFcXVhbEVudHJ5KHNldCwgbWFwLCBrZXkxLCBpdGVtMSwgc3RyaWN0LCBjaGFubmVsKSB7XG4gIHZhciBpID0gZ2V0SXRlcmF0b3Ioc2V0KTtcbiAgdmFyIHJlc3VsdDtcbiAgdmFyIGtleTI7XG4gIHdoaWxlICgocmVzdWx0ID0gaS5uZXh0KCkpICYmICFyZXN1bHQuZG9uZSkge1xuICAgIGtleTIgPSByZXN1bHQudmFsdWU7XG4gICAgaWYgKFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVzZS1iZWZvcmUtZGVmaW5lXG4gICAgICBpbnRlcm5hbERlZXBFcXVhbChrZXkxLCBrZXkyLCBzdHJpY3QsIGNoYW5uZWwpXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdXNlLWJlZm9yZS1kZWZpbmVcbiAgICAgICYmIGludGVybmFsRGVlcEVxdWFsKGl0ZW0xLCAkbWFwR2V0KG1hcCwga2V5MiksIHN0cmljdCwgY2hhbm5lbClcbiAgICApIHtcbiAgICAgICRzZXREZWxldGUoc2V0LCBrZXkyKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaW50ZXJuYWxEZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgb3B0aW9ucywgY2hhbm5lbCkge1xuICB2YXIgb3B0cyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gNy4xLiBBbGwgaWRlbnRpY2FsIHZhbHVlcyBhcmUgZXF1aXZhbGVudCwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4gIGlmIChvcHRzLnN0cmljdCA/IGlzKGFjdHVhbCwgZXhwZWN0ZWQpIDogYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgdmFyIGFjdHVhbEJveGVkID0gd2hpY2hCb3hlZFByaW1pdGl2ZShhY3R1YWwpO1xuICB2YXIgZXhwZWN0ZWRCb3hlZCA9IHdoaWNoQm94ZWRQcmltaXRpdmUoZXhwZWN0ZWQpO1xuICBpZiAoYWN0dWFsQm94ZWQgIT09IGV4cGVjdGVkQm94ZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyA3LjMuIE90aGVyIHBhaXJzIHRoYXQgZG8gbm90IGJvdGggcGFzcyB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcsIGVxdWl2YWxlbmNlIGlzIGRldGVybWluZWQgYnkgPT0uXG4gIGlmICghYWN0dWFsIHx8ICFleHBlY3RlZCB8fCAodHlwZW9mIGFjdHVhbCAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIGV4cGVjdGVkICE9PSAnb2JqZWN0JykpIHtcbiAgICBpZiAoKGFjdHVhbCA9PT0gZmFsc2UgJiYgZXhwZWN0ZWQpIHx8IChhY3R1YWwgJiYgZXhwZWN0ZWQgPT09IGZhbHNlKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICByZXR1cm4gb3B0cy5zdHJpY3QgPyBpcyhhY3R1YWwsIGV4cGVjdGVkKSA6IGFjdHVhbCA9PSBleHBlY3RlZDsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgfVxuXG4gIC8qXG4gICAqIDcuNC4gRm9yIGFsbCBvdGhlciBPYmplY3QgcGFpcnMsIGluY2x1ZGluZyBBcnJheSBvYmplY3RzLCBlcXVpdmFsZW5jZSBpc1xuICAgKiBkZXRlcm1pbmVkIGJ5IGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoYXMgdmVyaWZpZWRcbiAgICogd2l0aCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwpLCB0aGUgc2FtZSBzZXQgb2Yga2V5c1xuICAgKiAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSwgZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5XG4gICAqIGNvcnJlc3BvbmRpbmcga2V5LCBhbmQgYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LiBOb3RlOiB0aGlzXG4gICAqIGFjY291bnRzIGZvciBib3RoIG5hbWVkIGFuZCBpbmRleGVkIHByb3BlcnRpZXMgb24gQXJyYXlzLlxuICAgKi9cbiAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9jb21taXQvZDNhYWZkMDJlZmQzYTQwM2Q2NDZhMzA0NGFkY2YxNGU2M2E4OGQzMiBmb3IgbWVtb3MvY2hhbm5lbCBpbnNwaXJhdGlvblxuXG4gIHZhciBoYXNBY3R1YWwgPSBjaGFubmVsLmhhcyhhY3R1YWwpO1xuICB2YXIgaGFzRXhwZWN0ZWQgPSBjaGFubmVsLmhhcyhleHBlY3RlZCk7XG4gIHZhciBzZW50aW5lbDtcbiAgaWYgKGhhc0FjdHVhbCAmJiBoYXNFeHBlY3RlZCkge1xuICAgIGlmIChjaGFubmVsLmdldChhY3R1YWwpID09PSBjaGFubmVsLmdldChleHBlY3RlZCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBzZW50aW5lbCA9IHt9O1xuICB9XG4gIGlmICghaGFzQWN0dWFsKSB7IGNoYW5uZWwuc2V0KGFjdHVhbCwgc2VudGluZWwpOyB9XG4gIGlmICghaGFzRXhwZWN0ZWQpIHsgY2hhbm5lbC5zZXQoZXhwZWN0ZWQsIHNlbnRpbmVsKTsgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11c2UtYmVmb3JlLWRlZmluZVxuICByZXR1cm4gb2JqRXF1aXYoYWN0dWFsLCBleHBlY3RlZCwgb3B0cywgY2hhbm5lbCk7XG59XG5cbmZ1bmN0aW9uIGlzQnVmZmVyKHgpIHtcbiAgaWYgKCF4IHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0JyB8fCB0eXBlb2YgeC5sZW5ndGggIT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICh0eXBlb2YgeC5jb3B5ICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiB4LnNsaWNlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICh4Lmxlbmd0aCA+IDAgJiYgdHlwZW9mIHhbMF0gIT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBzZXRFcXVpdihhLCBiLCBvcHRzLCBjaGFubmVsKSB7XG4gIGlmICgkc2V0U2l6ZShhKSAhPT0gJHNldFNpemUoYikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIGlBID0gZ2V0SXRlcmF0b3IoYSk7XG4gIHZhciBpQiA9IGdldEl0ZXJhdG9yKGIpO1xuICB2YXIgcmVzdWx0QTtcbiAgdmFyIHJlc3VsdEI7XG4gIHZhciBzZXQ7XG4gIHdoaWxlICgocmVzdWx0QSA9IGlBLm5leHQoKSkgJiYgIXJlc3VsdEEuZG9uZSkge1xuICAgIGlmIChyZXN1bHRBLnZhbHVlICYmIHR5cGVvZiByZXN1bHRBLnZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKCFzZXQpIHsgc2V0ID0gbmV3ICRTZXQoKTsgfVxuICAgICAgJHNldEFkZChzZXQsIHJlc3VsdEEudmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoISRzZXRIYXMoYiwgcmVzdWx0QS52YWx1ZSkpIHtcbiAgICAgIGlmIChvcHRzLnN0cmljdCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgIGlmICghc2V0TWlnaHRIYXZlTG9vc2VQcmltKGEsIGIsIHJlc3VsdEEudmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghc2V0KSB7IHNldCA9IG5ldyAkU2V0KCk7IH1cbiAgICAgICRzZXRBZGQoc2V0LCByZXN1bHRBLnZhbHVlKTtcbiAgICB9XG4gIH1cbiAgaWYgKHNldCkge1xuICAgIHdoaWxlICgocmVzdWx0QiA9IGlCLm5leHQoKSkgJiYgIXJlc3VsdEIuZG9uZSkge1xuICAgICAgLy8gV2UgaGF2ZSB0byBjaGVjayBpZiBhIHByaW1pdGl2ZSB2YWx1ZSBpcyBhbHJlYWR5IG1hdGNoaW5nIGFuZCBvbmx5IGlmIGl0J3Mgbm90LCBnbyBodW50aW5nIGZvciBpdC5cbiAgICAgIGlmIChyZXN1bHRCLnZhbHVlICYmIHR5cGVvZiByZXN1bHRCLnZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAoIXNldEhhc0VxdWFsRWxlbWVudChzZXQsIHJlc3VsdEIudmFsdWUsIG9wdHMuc3RyaWN0LCBjaGFubmVsKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgIW9wdHMuc3RyaWN0XG4gICAgICAgICYmICEkc2V0SGFzKGEsIHJlc3VsdEIudmFsdWUpXG4gICAgICAgICYmICFzZXRIYXNFcXVhbEVsZW1lbnQoc2V0LCByZXN1bHRCLnZhbHVlLCBvcHRzLnN0cmljdCwgY2hhbm5lbClcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAkc2V0U2l6ZShzZXQpID09PSAwO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBtYXBFcXVpdihhLCBiLCBvcHRzLCBjaGFubmVsKSB7XG4gIGlmICgkbWFwU2l6ZShhKSAhPT0gJG1hcFNpemUoYikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIGlBID0gZ2V0SXRlcmF0b3IoYSk7XG4gIHZhciBpQiA9IGdldEl0ZXJhdG9yKGIpO1xuICB2YXIgcmVzdWx0QTtcbiAgdmFyIHJlc3VsdEI7XG4gIHZhciBzZXQ7XG4gIHZhciBrZXk7XG4gIHZhciBpdGVtMTtcbiAgdmFyIGl0ZW0yO1xuICB3aGlsZSAoKHJlc3VsdEEgPSBpQS5uZXh0KCkpICYmICFyZXN1bHRBLmRvbmUpIHtcbiAgICBrZXkgPSByZXN1bHRBLnZhbHVlWzBdO1xuICAgIGl0ZW0xID0gcmVzdWx0QS52YWx1ZVsxXTtcbiAgICBpZiAoa2V5ICYmIHR5cGVvZiBrZXkgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoIXNldCkgeyBzZXQgPSBuZXcgJFNldCgpOyB9XG4gICAgICAkc2V0QWRkKHNldCwga2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaXRlbTIgPSAkbWFwR2V0KGIsIGtleSk7XG4gICAgICAvLyBpZiAodHlwZW9mIGN1ckIgPT09ICd1bmRlZmluZWQnICYmICEkbWFwSGFzKGIsIGFsdFZhbHVlKSB8fCAhaW50ZXJuYWxEZWVwRXF1YWwoaXRlbSwgY3VyQiwgZmFsc2UsIGNoYW5uZWwpKSB7XG4gICAgICBpZiAoKHR5cGVvZiBpdGVtMiA9PT0gJ3VuZGVmaW5lZCcgJiYgISRtYXBIYXMoYiwga2V5KSkgfHwgIWludGVybmFsRGVlcEVxdWFsKGl0ZW0xLCBpdGVtMiwgb3B0cy5zdHJpY3QsIGNoYW5uZWwpKSB7XG4gICAgICAgIGlmIChvcHRzLnN0cmljdCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1hcE1pZ2h0SGF2ZUxvb3NlUHJpbShhLCBiLCBrZXksIGl0ZW0xLCBjaGFubmVsKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNldCkgeyBzZXQgPSBuZXcgJFNldCgpOyB9XG4gICAgICAgICRzZXRBZGQoc2V0LCBrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChzZXQpIHtcbiAgICB3aGlsZSAoKHJlc3VsdEIgPSBpQi5uZXh0KCkpICYmICFyZXN1bHRCLmRvbmUpIHtcbiAgICAgIGtleSA9IHJlc3VsdEIudmFsdWVbMF07XG4gICAgICBpdGVtMSA9IHJlc3VsdEIudmFsdWVbMV07XG4gICAgICBpZiAoa2V5ICYmIHR5cGVvZiBrZXkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmICghbWFwSGFzRXF1YWxFbnRyeShzZXQsIGEsIGtleSwgaXRlbTEsIG9wdHMuc3RyaWN0LCBjaGFubmVsKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgIW9wdHMuc3RyaWN0XG4gICAgICAgICYmICghYS5oYXMoa2V5KSB8fCAhaW50ZXJuYWxEZWVwRXF1YWwoJG1hcEdldChhLCBrZXkpLCBpdGVtMSwgZmFsc2UsIGNoYW5uZWwpKVxuICAgICAgICAmJiAhbWFwSGFzRXF1YWxFbnRyeShzZXQsIGEsIGtleSwgaXRlbTEsIGZhbHNlLCBjaGFubmVsKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuICRzZXRTaXplKHNldCkgPT09IDA7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIG9iakVxdWl2KGEsIGIsIG9wdHMsIGNoYW5uZWwpIHtcbiAgLyogZXNsaW50IG1heC1zdGF0ZW1lbnRzOiBbMiwgMTAwXSwgbWF4LWxpbmVzLXBlci1mdW5jdGlvbjogWzIsIDEyMF0sIG1heC1kZXB0aDogWzIsIDVdICovXG4gIHZhciBpLCBrZXk7XG5cbiAgaWYgKHR5cGVvZiBhICE9PSB0eXBlb2YgYikgeyByZXR1cm4gZmFsc2U7IH1cbiAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgLy8gYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LlxuICBpZiAoYS5wcm90b3R5cGUgIT09IGIucHJvdG90eXBlKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gIGlmICgkb2JqVG9TdHJpbmcoYSkgIT09ICRvYmpUb1N0cmluZyhiKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICBpZiAoaXNBcmd1bWVudHMoYSkgIT09IGlzQXJndW1lbnRzKGIpKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gIHZhciBhSXNBcnJheSA9IGlzQXJyYXkoYSk7XG4gIHZhciBiSXNBcnJheSA9IGlzQXJyYXkoYik7XG4gIGlmIChhSXNBcnJheSAhPT0gYklzQXJyYXkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgLy8gVE9ETzogcmVwbGFjZSB3aGVuIGEgY3Jvc3MtcmVhbG0gYnJhbmQgY2hlY2sgaXMgYXZhaWxhYmxlXG4gIHZhciBhSXNFcnJvciA9IGEgaW5zdGFuY2VvZiBFcnJvcjtcbiAgdmFyIGJJc0Vycm9yID0gYiBpbnN0YW5jZW9mIEVycm9yO1xuICBpZiAoYUlzRXJyb3IgIT09IGJJc0Vycm9yKSB7IHJldHVybiBmYWxzZTsgfVxuICBpZiAoYUlzRXJyb3IgfHwgYklzRXJyb3IpIHtcbiAgICBpZiAoYS5uYW1lICE9PSBiLm5hbWUgfHwgYS5tZXNzYWdlICE9PSBiLm1lc3NhZ2UpIHsgcmV0dXJuIGZhbHNlOyB9XG4gIH1cblxuICB2YXIgYUlzUmVnZXggPSBpc1JlZ2V4KGEpO1xuICB2YXIgYklzUmVnZXggPSBpc1JlZ2V4KGIpO1xuICBpZiAoYUlzUmVnZXggIT09IGJJc1JlZ2V4KSB7IHJldHVybiBmYWxzZTsgfVxuICBpZiAoKGFJc1JlZ2V4IHx8IGJJc1JlZ2V4KSAmJiAoYS5zb3VyY2UgIT09IGIuc291cmNlIHx8IGZsYWdzKGEpICE9PSBmbGFncyhiKSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB2YXIgYUlzRGF0ZSA9IGlzRGF0ZShhKTtcbiAgdmFyIGJJc0RhdGUgPSBpc0RhdGUoYik7XG4gIGlmIChhSXNEYXRlICE9PSBiSXNEYXRlKSB7IHJldHVybiBmYWxzZTsgfVxuICBpZiAoYUlzRGF0ZSB8fCBiSXNEYXRlKSB7IC8vICYmIHdvdWxkIHdvcmsgdG9vLCBiZWNhdXNlIGJvdGggYXJlIHRydWUgb3IgYm90aCBmYWxzZSBoZXJlXG4gICAgaWYgKCRnZXRUaW1lKGEpICE9PSAkZ2V0VGltZShiKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgfVxuICBpZiAob3B0cy5zdHJpY3QgJiYgZ1BPICYmIGdQTyhhKSAhPT0gZ1BPKGIpKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gIHZhciBhSXNCdWZmZXIgPSBpc0J1ZmZlcihhKTtcbiAgdmFyIGJJc0J1ZmZlciA9IGlzQnVmZmVyKGIpO1xuICBpZiAoYUlzQnVmZmVyICE9PSBiSXNCdWZmZXIpIHsgcmV0dXJuIGZhbHNlOyB9XG4gIGlmIChhSXNCdWZmZXIgfHwgYklzQnVmZmVyKSB7IC8vICYmIHdvdWxkIHdvcmsgdG9vLCBiZWNhdXNlIGJvdGggYXJlIHRydWUgb3IgYm90aCBmYWxzZSBoZXJlXG4gICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFbaV0gIT09IGJbaV0pIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBhICE9PSB0eXBlb2YgYikgeyByZXR1cm4gZmFsc2U7IH1cblxuICB0cnkge1xuICAgIHZhciBrYSA9IG9iamVjdEtleXMoYSk7XG4gICAgdmFyIGtiID0gb2JqZWN0S2V5cyhiKTtcbiAgfSBjYXRjaCAoZSkgeyAvLyBoYXBwZW5zIHdoZW4gb25lIGlzIGEgc3RyaW5nIGxpdGVyYWwgYW5kIHRoZSBvdGhlciBpc24ndFxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvLyBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGtleXMgaW5jb3Jwb3JhdGVzIGhhc093blByb3BlcnR5KVxuICBpZiAoa2EubGVuZ3RoICE9PSBrYi5sZW5ndGgpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgLy8gdGhlIHNhbWUgc2V0IG9mIGtleXMgKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksXG4gIGthLnNvcnQoKTtcbiAga2Iuc29ydCgpO1xuICAvLyB+fn5jaGVhcCBrZXkgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGlmIChrYVtpXSAhPSBrYltpXSkgeyByZXR1cm4gZmFsc2U7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgfVxuXG4gIC8vIGVxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeSBjb3JyZXNwb25kaW5nIGtleSwgYW5kIH5+fnBvc3NpYmx5IGV4cGVuc2l2ZSBkZWVwIHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBrZXkgPSBrYVtpXTtcbiAgICBpZiAoIWludGVybmFsRGVlcEVxdWFsKGFba2V5XSwgYltrZXldLCBvcHRzLCBjaGFubmVsKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgfVxuXG4gIHZhciBhQ29sbGVjdGlvbiA9IHdoaWNoQ29sbGVjdGlvbihhKTtcbiAgdmFyIGJDb2xsZWN0aW9uID0gd2hpY2hDb2xsZWN0aW9uKGIpO1xuICBpZiAoYUNvbGxlY3Rpb24gIT09IGJDb2xsZWN0aW9uKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChhQ29sbGVjdGlvbiA9PT0gJ1NldCcgfHwgYkNvbGxlY3Rpb24gPT09ICdTZXQnKSB7IC8vIGFDb2xsZWN0aW9uID09PSBiQ29sbGVjdGlvblxuICAgIHJldHVybiBzZXRFcXVpdihhLCBiLCBvcHRzLCBjaGFubmVsKTtcbiAgfVxuICBpZiAoYUNvbGxlY3Rpb24gPT09ICdNYXAnKSB7IC8vIGFDb2xsZWN0aW9uID09PSBiQ29sbGVjdGlvblxuICAgIHJldHVybiBtYXBFcXVpdihhLCBiLCBvcHRzLCBjaGFubmVsKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRlZXBFcXVhbChhLCBiLCBvcHRzKSB7XG4gIHJldHVybiBpbnRlcm5hbERlZXBFcXVhbChhLCBiLCBvcHRzLCBnZXRTaWRlQ2hhbm5lbCgpKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBrZXlzID0gcmVxdWlyZSgnb2JqZWN0LWtleXMnKTtcbnZhciBoYXNTeW1ib2xzID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sKCdmb28nKSA9PT0gJ3N5bWJvbCc7XG5cbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgY29uY2F0ID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdDtcbnZhciBvcmlnRGVmaW5lUHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG5cbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gKGZuKSB7XG5cdHJldHVybiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicgJiYgdG9TdHIuY2FsbChmbikgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59O1xuXG52YXIgYXJlUHJvcGVydHlEZXNjcmlwdG9yc1N1cHBvcnRlZCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIG9iaiA9IHt9O1xuXHR0cnkge1xuXHRcdG9yaWdEZWZpbmVQcm9wZXJ0eShvYmosICd4JywgeyBlbnVtZXJhYmxlOiBmYWxzZSwgdmFsdWU6IG9iaiB9KTtcblx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLXZhcnMsIG5vLXJlc3RyaWN0ZWQtc3ludGF4XG5cdFx0Zm9yICh2YXIgXyBpbiBvYmopIHsgLy8ganNjczppZ25vcmUgZGlzYWxsb3dVbnVzZWRWYXJpYWJsZXNcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIG9iai54ID09PSBvYmo7XG5cdH0gY2F0Y2ggKGUpIHsgLyogdGhpcyBpcyBJRSA4LiAqL1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTtcbnZhciBzdXBwb3J0c0Rlc2NyaXB0b3JzID0gb3JpZ0RlZmluZVByb3BlcnR5ICYmIGFyZVByb3BlcnR5RGVzY3JpcHRvcnNTdXBwb3J0ZWQoKTtcblxudmFyIGRlZmluZVByb3BlcnR5ID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgdmFsdWUsIHByZWRpY2F0ZSkge1xuXHRpZiAobmFtZSBpbiBvYmplY3QgJiYgKCFpc0Z1bmN0aW9uKHByZWRpY2F0ZSkgfHwgIXByZWRpY2F0ZSgpKSkge1xuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuXHRcdG9yaWdEZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHtcblx0XHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0dmFsdWU6IHZhbHVlLFxuXHRcdFx0d3JpdGFibGU6IHRydWVcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRvYmplY3RbbmFtZV0gPSB2YWx1ZTtcblx0fVxufTtcblxudmFyIGRlZmluZVByb3BlcnRpZXMgPSBmdW5jdGlvbiAob2JqZWN0LCBtYXApIHtcblx0dmFyIHByZWRpY2F0ZXMgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IHt9O1xuXHR2YXIgcHJvcHMgPSBrZXlzKG1hcCk7XG5cdGlmIChoYXNTeW1ib2xzKSB7XG5cdFx0cHJvcHMgPSBjb25jYXQuY2FsbChwcm9wcywgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhtYXApKTtcblx0fVxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0ZGVmaW5lUHJvcGVydHkob2JqZWN0LCBwcm9wc1tpXSwgbWFwW3Byb3BzW2ldXSwgcHJlZGljYXRlc1twcm9wc1tpXV0pO1xuXHR9XG59O1xuXG5kZWZpbmVQcm9wZXJ0aWVzLnN1cHBvcnRzRGVzY3JpcHRvcnMgPSAhIXN1cHBvcnRzRGVzY3JpcHRvcnM7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmaW5lUHJvcGVydGllcztcbiIsIi8qIVxuXG4gZGlmZiB2NC4wLjFcblxuU29mdHdhcmUgTGljZW5zZSBBZ3JlZW1lbnQgKEJTRCBMaWNlbnNlKVxuXG5Db3B5cmlnaHQgKGMpIDIwMDktMjAxNSwgS2V2aW4gRGVja2VyIDxrcGRlY2tlckBnbWFpbC5jb20+XG5cbkFsbCByaWdodHMgcmVzZXJ2ZWQuXG5cblJlZGlzdHJpYnV0aW9uIGFuZCB1c2Ugb2YgdGhpcyBzb2Z0d2FyZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0IG1vZGlmaWNhdGlvbixcbmFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcblxuKiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlXG4gIGNvcHlyaWdodCBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGVcbiAgZm9sbG93aW5nIGRpc2NsYWltZXIuXG5cbiogUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZVxuICBjb3B5cmlnaHQgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlXG4gIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZSBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlclxuICBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuXG4qIE5laXRoZXIgdGhlIG5hbWUgb2YgS2V2aW4gRGVja2VyIG5vciB0aGUgbmFtZXMgb2YgaXRzXG4gIGNvbnRyaWJ1dG9ycyBtYXkgYmUgdXNlZCB0byBlbmRvcnNlIG9yIHByb21vdGUgcHJvZHVjdHNcbiAgZGVyaXZlZCBmcm9tIHRoaXMgc29mdHdhcmUgd2l0aG91dCBzcGVjaWZpYyBwcmlvclxuICB3cml0dGVuIHBlcm1pc3Npb24uXG5cblRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiIEFORCBBTlkgRVhQUkVTUyBPUlxuSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIENPUFlSSUdIVCBPV05FUiBPUlxuQ09OVFJJQlVUT1JTIEJFIExJQUJMRSBGT1IgQU5ZIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTFxuREFNQUdFUyAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7IExPU1MgT0YgVVNFLFxuREFUQSwgT1IgUFJPRklUUzsgT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKSBIT1dFVkVSIENBVVNFRCBBTkQgT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVJcbklOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVRcbk9GIFRIRSBVU0UgT0YgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbkBsaWNlbnNlXG4qL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG4gIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuICAoZ2xvYmFsID0gZ2xvYmFsIHx8IHNlbGYsIGZhY3RvcnkoZ2xvYmFsLkRpZmYgPSB7fSkpO1xufSh0aGlzLCBmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cbiAgZnVuY3Rpb24gRGlmZigpIHt9XG4gIERpZmYucHJvdG90eXBlID0ge1xuICAgIGRpZmY6IGZ1bmN0aW9uIGRpZmYob2xkU3RyaW5nLCBuZXdTdHJpbmcpIHtcbiAgICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiB7fTtcbiAgICAgIHZhciBjYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2s7XG5cbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgZnVuY3Rpb24gZG9uZSh2YWx1ZSkge1xuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdmFsdWUpO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfSAvLyBBbGxvdyBzdWJjbGFzc2VzIHRvIG1hc3NhZ2UgdGhlIGlucHV0IHByaW9yIHRvIHJ1bm5pbmdcblxuXG4gICAgICBvbGRTdHJpbmcgPSB0aGlzLmNhc3RJbnB1dChvbGRTdHJpbmcpO1xuICAgICAgbmV3U3RyaW5nID0gdGhpcy5jYXN0SW5wdXQobmV3U3RyaW5nKTtcbiAgICAgIG9sZFN0cmluZyA9IHRoaXMucmVtb3ZlRW1wdHkodGhpcy50b2tlbml6ZShvbGRTdHJpbmcpKTtcbiAgICAgIG5ld1N0cmluZyA9IHRoaXMucmVtb3ZlRW1wdHkodGhpcy50b2tlbml6ZShuZXdTdHJpbmcpKTtcbiAgICAgIHZhciBuZXdMZW4gPSBuZXdTdHJpbmcubGVuZ3RoLFxuICAgICAgICAgIG9sZExlbiA9IG9sZFN0cmluZy5sZW5ndGg7XG4gICAgICB2YXIgZWRpdExlbmd0aCA9IDE7XG4gICAgICB2YXIgbWF4RWRpdExlbmd0aCA9IG5ld0xlbiArIG9sZExlbjtcbiAgICAgIHZhciBiZXN0UGF0aCA9IFt7XG4gICAgICAgIG5ld1BvczogLTEsXG4gICAgICAgIGNvbXBvbmVudHM6IFtdXG4gICAgICB9XTsgLy8gU2VlZCBlZGl0TGVuZ3RoID0gMCwgaS5lLiB0aGUgY29udGVudCBzdGFydHMgd2l0aCB0aGUgc2FtZSB2YWx1ZXNcblxuICAgICAgdmFyIG9sZFBvcyA9IHRoaXMuZXh0cmFjdENvbW1vbihiZXN0UGF0aFswXSwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIDApO1xuXG4gICAgICBpZiAoYmVzdFBhdGhbMF0ubmV3UG9zICsgMSA+PSBuZXdMZW4gJiYgb2xkUG9zICsgMSA+PSBvbGRMZW4pIHtcbiAgICAgICAgLy8gSWRlbnRpdHkgcGVyIHRoZSBlcXVhbGl0eSBhbmQgdG9rZW5pemVyXG4gICAgICAgIHJldHVybiBkb25lKFt7XG4gICAgICAgICAgdmFsdWU6IHRoaXMuam9pbihuZXdTdHJpbmcpLFxuICAgICAgICAgIGNvdW50OiBuZXdTdHJpbmcubGVuZ3RoXG4gICAgICAgIH1dKTtcbiAgICAgIH0gLy8gTWFpbiB3b3JrZXIgbWV0aG9kLiBjaGVja3MgYWxsIHBlcm11dGF0aW9ucyBvZiBhIGdpdmVuIGVkaXQgbGVuZ3RoIGZvciBhY2NlcHRhbmNlLlxuXG5cbiAgICAgIGZ1bmN0aW9uIGV4ZWNFZGl0TGVuZ3RoKCkge1xuICAgICAgICBmb3IgKHZhciBkaWFnb25hbFBhdGggPSAtMSAqIGVkaXRMZW5ndGg7IGRpYWdvbmFsUGF0aCA8PSBlZGl0TGVuZ3RoOyBkaWFnb25hbFBhdGggKz0gMikge1xuICAgICAgICAgIHZhciBiYXNlUGF0aCA9IHZvaWQgMDtcblxuICAgICAgICAgIHZhciBhZGRQYXRoID0gYmVzdFBhdGhbZGlhZ29uYWxQYXRoIC0gMV0sXG4gICAgICAgICAgICAgIHJlbW92ZVBhdGggPSBiZXN0UGF0aFtkaWFnb25hbFBhdGggKyAxXSxcbiAgICAgICAgICAgICAgX29sZFBvcyA9IChyZW1vdmVQYXRoID8gcmVtb3ZlUGF0aC5uZXdQb3MgOiAwKSAtIGRpYWdvbmFsUGF0aDtcblxuICAgICAgICAgIGlmIChhZGRQYXRoKSB7XG4gICAgICAgICAgICAvLyBObyBvbmUgZWxzZSBpcyBnb2luZyB0byBhdHRlbXB0IHRvIHVzZSB0aGlzIHZhbHVlLCBjbGVhciBpdFxuICAgICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoIC0gMV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGNhbkFkZCA9IGFkZFBhdGggJiYgYWRkUGF0aC5uZXdQb3MgKyAxIDwgbmV3TGVuLFxuICAgICAgICAgICAgICBjYW5SZW1vdmUgPSByZW1vdmVQYXRoICYmIDAgPD0gX29sZFBvcyAmJiBfb2xkUG9zIDwgb2xkTGVuO1xuXG4gICAgICAgICAgaWYgKCFjYW5BZGQgJiYgIWNhblJlbW92ZSkge1xuICAgICAgICAgICAgLy8gSWYgdGhpcyBwYXRoIGlzIGEgdGVybWluYWwgdGhlbiBwcnVuZVxuICAgICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH0gLy8gU2VsZWN0IHRoZSBkaWFnb25hbCB0aGF0IHdlIHdhbnQgdG8gYnJhbmNoIGZyb20uIFdlIHNlbGVjdCB0aGUgcHJpb3JcbiAgICAgICAgICAvLyBwYXRoIHdob3NlIHBvc2l0aW9uIGluIHRoZSBuZXcgc3RyaW5nIGlzIHRoZSBmYXJ0aGVzdCBmcm9tIHRoZSBvcmlnaW5cbiAgICAgICAgICAvLyBhbmQgZG9lcyBub3QgcGFzcyB0aGUgYm91bmRzIG9mIHRoZSBkaWZmIGdyYXBoXG5cblxuICAgICAgICAgIGlmICghY2FuQWRkIHx8IGNhblJlbW92ZSAmJiBhZGRQYXRoLm5ld1BvcyA8IHJlbW92ZVBhdGgubmV3UG9zKSB7XG4gICAgICAgICAgICBiYXNlUGF0aCA9IGNsb25lUGF0aChyZW1vdmVQYXRoKTtcbiAgICAgICAgICAgIHNlbGYucHVzaENvbXBvbmVudChiYXNlUGF0aC5jb21wb25lbnRzLCB1bmRlZmluZWQsIHRydWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBiYXNlUGF0aCA9IGFkZFBhdGg7IC8vIE5vIG5lZWQgdG8gY2xvbmUsIHdlJ3ZlIHB1bGxlZCBpdCBmcm9tIHRoZSBsaXN0XG5cbiAgICAgICAgICAgIGJhc2VQYXRoLm5ld1BvcysrO1xuICAgICAgICAgICAgc2VsZi5wdXNoQ29tcG9uZW50KGJhc2VQYXRoLmNvbXBvbmVudHMsIHRydWUsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgX29sZFBvcyA9IHNlbGYuZXh0cmFjdENvbW1vbihiYXNlUGF0aCwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIGRpYWdvbmFsUGF0aCk7IC8vIElmIHdlIGhhdmUgaGl0IHRoZSBlbmQgb2YgYm90aCBzdHJpbmdzLCB0aGVuIHdlIGFyZSBkb25lXG5cbiAgICAgICAgICBpZiAoYmFzZVBhdGgubmV3UG9zICsgMSA+PSBuZXdMZW4gJiYgX29sZFBvcyArIDEgPj0gb2xkTGVuKSB7XG4gICAgICAgICAgICByZXR1cm4gZG9uZShidWlsZFZhbHVlcyhzZWxmLCBiYXNlUGF0aC5jb21wb25lbnRzLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgc2VsZi51c2VMb25nZXN0VG9rZW4pKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIHRyYWNrIHRoaXMgcGF0aCBhcyBhIHBvdGVudGlhbCBjYW5kaWRhdGUgYW5kIGNvbnRpbnVlLlxuICAgICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoXSA9IGJhc2VQYXRoO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGVkaXRMZW5ndGgrKztcbiAgICAgIH0gLy8gUGVyZm9ybXMgdGhlIGxlbmd0aCBvZiBlZGl0IGl0ZXJhdGlvbi4gSXMgYSBiaXQgZnVnbHkgYXMgdGhpcyBoYXMgdG8gc3VwcG9ydCB0aGVcbiAgICAgIC8vIHN5bmMgYW5kIGFzeW5jIG1vZGUgd2hpY2ggaXMgbmV2ZXIgZnVuLiBMb29wcyBvdmVyIGV4ZWNFZGl0TGVuZ3RoIHVudGlsIGEgdmFsdWVcbiAgICAgIC8vIGlzIHByb2R1Y2VkLlxuXG5cbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAoZnVuY3Rpb24gZXhlYygpIHtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgc2hvdWxkIG5vdCBoYXBwZW4sIGJ1dCB3ZSB3YW50IHRvIGJlIHNhZmUuXG5cbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgICAgICBpZiAoZWRpdExlbmd0aCA+IG1heEVkaXRMZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZXhlY0VkaXRMZW5ndGgoKSkge1xuICAgICAgICAgICAgICBleGVjKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0pKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3aGlsZSAoZWRpdExlbmd0aCA8PSBtYXhFZGl0TGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHJldCA9IGV4ZWNFZGl0TGVuZ3RoKCk7XG5cbiAgICAgICAgICBpZiAocmV0KSB7XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgcHVzaENvbXBvbmVudDogZnVuY3Rpb24gcHVzaENvbXBvbmVudChjb21wb25lbnRzLCBhZGRlZCwgcmVtb3ZlZCkge1xuICAgICAgdmFyIGxhc3QgPSBjb21wb25lbnRzW2NvbXBvbmVudHMubGVuZ3RoIC0gMV07XG5cbiAgICAgIGlmIChsYXN0ICYmIGxhc3QuYWRkZWQgPT09IGFkZGVkICYmIGxhc3QucmVtb3ZlZCA9PT0gcmVtb3ZlZCkge1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGNsb25lIGhlcmUgYXMgdGhlIGNvbXBvbmVudCBjbG9uZSBvcGVyYXRpb24gaXMganVzdFxuICAgICAgICAvLyBhcyBzaGFsbG93IGFycmF5IGNsb25lXG4gICAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50cy5sZW5ndGggLSAxXSA9IHtcbiAgICAgICAgICBjb3VudDogbGFzdC5jb3VudCArIDEsXG4gICAgICAgICAgYWRkZWQ6IGFkZGVkLFxuICAgICAgICAgIHJlbW92ZWQ6IHJlbW92ZWRcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBvbmVudHMucHVzaCh7XG4gICAgICAgICAgY291bnQ6IDEsXG4gICAgICAgICAgYWRkZWQ6IGFkZGVkLFxuICAgICAgICAgIHJlbW92ZWQ6IHJlbW92ZWRcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBleHRyYWN0Q29tbW9uOiBmdW5jdGlvbiBleHRyYWN0Q29tbW9uKGJhc2VQYXRoLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgZGlhZ29uYWxQYXRoKSB7XG4gICAgICB2YXIgbmV3TGVuID0gbmV3U3RyaW5nLmxlbmd0aCxcbiAgICAgICAgICBvbGRMZW4gPSBvbGRTdHJpbmcubGVuZ3RoLFxuICAgICAgICAgIG5ld1BvcyA9IGJhc2VQYXRoLm5ld1BvcyxcbiAgICAgICAgICBvbGRQb3MgPSBuZXdQb3MgLSBkaWFnb25hbFBhdGgsXG4gICAgICAgICAgY29tbW9uQ291bnQgPSAwO1xuXG4gICAgICB3aGlsZSAobmV3UG9zICsgMSA8IG5ld0xlbiAmJiBvbGRQb3MgKyAxIDwgb2xkTGVuICYmIHRoaXMuZXF1YWxzKG5ld1N0cmluZ1tuZXdQb3MgKyAxXSwgb2xkU3RyaW5nW29sZFBvcyArIDFdKSkge1xuICAgICAgICBuZXdQb3MrKztcbiAgICAgICAgb2xkUG9zKys7XG4gICAgICAgIGNvbW1vbkNvdW50Kys7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb21tb25Db3VudCkge1xuICAgICAgICBiYXNlUGF0aC5jb21wb25lbnRzLnB1c2goe1xuICAgICAgICAgIGNvdW50OiBjb21tb25Db3VudFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgYmFzZVBhdGgubmV3UG9zID0gbmV3UG9zO1xuICAgICAgcmV0dXJuIG9sZFBvcztcbiAgICB9LFxuICAgIGVxdWFsczogZnVuY3Rpb24gZXF1YWxzKGxlZnQsIHJpZ2h0KSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhcmF0b3IpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5jb21wYXJhdG9yKGxlZnQsIHJpZ2h0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBsZWZ0ID09PSByaWdodCB8fCB0aGlzLm9wdGlvbnMuaWdub3JlQ2FzZSAmJiBsZWZ0LnRvTG93ZXJDYXNlKCkgPT09IHJpZ2h0LnRvTG93ZXJDYXNlKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICByZW1vdmVFbXB0eTogZnVuY3Rpb24gcmVtb3ZlRW1wdHkoYXJyYXkpIHtcbiAgICAgIHZhciByZXQgPSBbXTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJyYXlbaV0pIHtcbiAgICAgICAgICByZXQucHVzaChhcnJheVtpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuICAgIGNhc3RJbnB1dDogZnVuY3Rpb24gY2FzdElucHV0KHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSxcbiAgICB0b2tlbml6ZTogZnVuY3Rpb24gdG9rZW5pemUodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5zcGxpdCgnJyk7XG4gICAgfSxcbiAgICBqb2luOiBmdW5jdGlvbiBqb2luKGNoYXJzKSB7XG4gICAgICByZXR1cm4gY2hhcnMuam9pbignJyk7XG4gICAgfVxuICB9O1xuXG4gIGZ1bmN0aW9uIGJ1aWxkVmFsdWVzKGRpZmYsIGNvbXBvbmVudHMsIG5ld1N0cmluZywgb2xkU3RyaW5nLCB1c2VMb25nZXN0VG9rZW4pIHtcbiAgICB2YXIgY29tcG9uZW50UG9zID0gMCxcbiAgICAgICAgY29tcG9uZW50TGVuID0gY29tcG9uZW50cy5sZW5ndGgsXG4gICAgICAgIG5ld1BvcyA9IDAsXG4gICAgICAgIG9sZFBvcyA9IDA7XG5cbiAgICBmb3IgKDsgY29tcG9uZW50UG9zIDwgY29tcG9uZW50TGVuOyBjb21wb25lbnRQb3MrKykge1xuICAgICAgdmFyIGNvbXBvbmVudCA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zXTtcblxuICAgICAgaWYgKCFjb21wb25lbnQucmVtb3ZlZCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5hZGRlZCAmJiB1c2VMb25nZXN0VG9rZW4pIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBuZXdTdHJpbmcuc2xpY2UobmV3UG9zLCBuZXdQb3MgKyBjb21wb25lbnQuY291bnQpO1xuICAgICAgICAgIHZhbHVlID0gdmFsdWUubWFwKGZ1bmN0aW9uICh2YWx1ZSwgaSkge1xuICAgICAgICAgICAgdmFyIG9sZFZhbHVlID0gb2xkU3RyaW5nW29sZFBvcyArIGldO1xuICAgICAgICAgICAgcmV0dXJuIG9sZFZhbHVlLmxlbmd0aCA+IHZhbHVlLmxlbmd0aCA/IG9sZFZhbHVlIDogdmFsdWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29tcG9uZW50LnZhbHVlID0gZGlmZi5qb2luKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb21wb25lbnQudmFsdWUgPSBkaWZmLmpvaW4obmV3U3RyaW5nLnNsaWNlKG5ld1BvcywgbmV3UG9zICsgY29tcG9uZW50LmNvdW50KSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdQb3MgKz0gY29tcG9uZW50LmNvdW50OyAvLyBDb21tb24gY2FzZVxuXG4gICAgICAgIGlmICghY29tcG9uZW50LmFkZGVkKSB7XG4gICAgICAgICAgb2xkUG9zICs9IGNvbXBvbmVudC5jb3VudDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcG9uZW50LnZhbHVlID0gZGlmZi5qb2luKG9sZFN0cmluZy5zbGljZShvbGRQb3MsIG9sZFBvcyArIGNvbXBvbmVudC5jb3VudCkpO1xuICAgICAgICBvbGRQb3MgKz0gY29tcG9uZW50LmNvdW50OyAvLyBSZXZlcnNlIGFkZCBhbmQgcmVtb3ZlIHNvIHJlbW92ZXMgYXJlIG91dHB1dCBmaXJzdCB0byBtYXRjaCBjb21tb24gY29udmVudGlvblxuICAgICAgICAvLyBUaGUgZGlmZmluZyBhbGdvcml0aG0gaXMgdGllZCB0byBhZGQgdGhlbiByZW1vdmUgb3V0cHV0IGFuZCB0aGlzIGlzIHRoZSBzaW1wbGVzdFxuICAgICAgICAvLyByb3V0ZSB0byBnZXQgdGhlIGRlc2lyZWQgb3V0cHV0IHdpdGggbWluaW1hbCBvdmVyaGVhZC5cblxuICAgICAgICBpZiAoY29tcG9uZW50UG9zICYmIGNvbXBvbmVudHNbY29tcG9uZW50UG9zIC0gMV0uYWRkZWQpIHtcbiAgICAgICAgICB2YXIgdG1wID0gY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXTtcbiAgICAgICAgICBjb21wb25lbnRzW2NvbXBvbmVudFBvcyAtIDFdID0gY29tcG9uZW50c1tjb21wb25lbnRQb3NdO1xuICAgICAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50UG9zXSA9IHRtcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gLy8gU3BlY2lhbCBjYXNlIGhhbmRsZSBmb3Igd2hlbiBvbmUgdGVybWluYWwgaXMgaWdub3JlZCAoaS5lLiB3aGl0ZXNwYWNlKS5cbiAgICAvLyBGb3IgdGhpcyBjYXNlIHdlIG1lcmdlIHRoZSB0ZXJtaW5hbCBpbnRvIHRoZSBwcmlvciBzdHJpbmcgYW5kIGRyb3AgdGhlIGNoYW5nZS5cbiAgICAvLyBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGZvciBzdHJpbmcgbW9kZS5cblxuXG4gICAgdmFyIGxhc3RDb21wb25lbnQgPSBjb21wb25lbnRzW2NvbXBvbmVudExlbiAtIDFdO1xuXG4gICAgaWYgKGNvbXBvbmVudExlbiA+IDEgJiYgdHlwZW9mIGxhc3RDb21wb25lbnQudmFsdWUgPT09ICdzdHJpbmcnICYmIChsYXN0Q29tcG9uZW50LmFkZGVkIHx8IGxhc3RDb21wb25lbnQucmVtb3ZlZCkgJiYgZGlmZi5lcXVhbHMoJycsIGxhc3RDb21wb25lbnQudmFsdWUpKSB7XG4gICAgICBjb21wb25lbnRzW2NvbXBvbmVudExlbiAtIDJdLnZhbHVlICs9IGxhc3RDb21wb25lbnQudmFsdWU7XG4gICAgICBjb21wb25lbnRzLnBvcCgpO1xuICAgIH1cblxuICAgIHJldHVybiBjb21wb25lbnRzO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xvbmVQYXRoKHBhdGgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmV3UG9zOiBwYXRoLm5ld1BvcyxcbiAgICAgIGNvbXBvbmVudHM6IHBhdGguY29tcG9uZW50cy5zbGljZSgwKVxuICAgIH07XG4gIH1cblxuICB2YXIgY2hhcmFjdGVyRGlmZiA9IG5ldyBEaWZmKCk7XG4gIGZ1bmN0aW9uIGRpZmZDaGFycyhvbGRTdHIsIG5ld1N0ciwgb3B0aW9ucykge1xuICAgIHJldHVybiBjaGFyYWN0ZXJEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2VuZXJhdGVPcHRpb25zKG9wdGlvbnMsIGRlZmF1bHRzKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBkZWZhdWx0cy5jYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zKSB7XG4gICAgICBmb3IgKHZhciBuYW1lIGluIG9wdGlvbnMpIHtcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICBkZWZhdWx0c1tuYW1lXSA9IG9wdGlvbnNbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVmYXVsdHM7XG4gIH1cblxuICAvL1xuICAvLyBSYW5nZXMgYW5kIGV4Y2VwdGlvbnM6XG4gIC8vIExhdGluLTEgU3VwcGxlbWVudCwgMDA4MOKAkzAwRkZcbiAgLy8gIC0gVSswMEQ3ICDDlyBNdWx0aXBsaWNhdGlvbiBzaWduXG4gIC8vICAtIFUrMDBGNyAgw7cgRGl2aXNpb24gc2lnblxuICAvLyBMYXRpbiBFeHRlbmRlZC1BLCAwMTAw4oCTMDE3RlxuICAvLyBMYXRpbiBFeHRlbmRlZC1CLCAwMTgw4oCTMDI0RlxuICAvLyBJUEEgRXh0ZW5zaW9ucywgMDI1MOKAkzAyQUZcbiAgLy8gU3BhY2luZyBNb2RpZmllciBMZXR0ZXJzLCAwMkIw4oCTMDJGRlxuICAvLyAgLSBVKzAyQzcgIMuHICYjNzExOyAgQ2Fyb25cbiAgLy8gIC0gVSswMkQ4ICDLmCAmIzcyODsgIEJyZXZlXG4gIC8vICAtIFUrMDJEOSAgy5kgJiM3Mjk7ICBEb3QgQWJvdmVcbiAgLy8gIC0gVSswMkRBICDLmiAmIzczMDsgIFJpbmcgQWJvdmVcbiAgLy8gIC0gVSswMkRCICDLmyAmIzczMTsgIE9nb25la1xuICAvLyAgLSBVKzAyREMgIMucICYjNzMyOyAgU21hbGwgVGlsZGVcbiAgLy8gIC0gVSswMkREICDLnSAmIzczMzsgIERvdWJsZSBBY3V0ZSBBY2NlbnRcbiAgLy8gTGF0aW4gRXh0ZW5kZWQgQWRkaXRpb25hbCwgMUUwMOKAkzFFRkZcblxuICB2YXIgZXh0ZW5kZWRXb3JkQ2hhcnMgPSAvXltBLVphLXpcXHhDMC1cXHUwMkM2XFx1MDJDOC1cXHUwMkQ3XFx1MDJERS1cXHUwMkZGXFx1MUUwMC1cXHUxRUZGXSskLztcbiAgdmFyIHJlV2hpdGVzcGFjZSA9IC9cXFMvO1xuICB2YXIgd29yZERpZmYgPSBuZXcgRGlmZigpO1xuXG4gIHdvcmREaWZmLmVxdWFscyA9IGZ1bmN0aW9uIChsZWZ0LCByaWdodCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuaWdub3JlQ2FzZSkge1xuICAgICAgbGVmdCA9IGxlZnQudG9Mb3dlckNhc2UoKTtcbiAgICAgIHJpZ2h0ID0gcmlnaHQudG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgfHwgdGhpcy5vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UgJiYgIXJlV2hpdGVzcGFjZS50ZXN0KGxlZnQpICYmICFyZVdoaXRlc3BhY2UudGVzdChyaWdodCk7XG4gIH07XG5cbiAgd29yZERpZmYudG9rZW5pemUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgdG9rZW5zID0gdmFsdWUuc3BsaXQoLyhcXHMrfFsoKVtcXF17fSdcIl18XFxiKS8pOyAvLyBKb2luIHRoZSBib3VuZGFyeSBzcGxpdHMgdGhhdCB3ZSBkbyBub3QgY29uc2lkZXIgdG8gYmUgYm91bmRhcmllcy4gVGhpcyBpcyBwcmltYXJpbHkgdGhlIGV4dGVuZGVkIExhdGluIGNoYXJhY3RlciBzZXQuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgYW4gZW1wdHkgc3RyaW5nIGluIHRoZSBuZXh0IGZpZWxkIGFuZCB3ZSBoYXZlIG9ubHkgd29yZCBjaGFycyBiZWZvcmUgYW5kIGFmdGVyLCBtZXJnZVxuICAgICAgaWYgKCF0b2tlbnNbaSArIDFdICYmIHRva2Vuc1tpICsgMl0gJiYgZXh0ZW5kZWRXb3JkQ2hhcnMudGVzdCh0b2tlbnNbaV0pICYmIGV4dGVuZGVkV29yZENoYXJzLnRlc3QodG9rZW5zW2kgKyAyXSkpIHtcbiAgICAgICAgdG9rZW5zW2ldICs9IHRva2Vuc1tpICsgMl07XG4gICAgICAgIHRva2Vucy5zcGxpY2UoaSArIDEsIDIpO1xuICAgICAgICBpLS07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRva2VucztcbiAgfTtcblxuICBmdW5jdGlvbiBkaWZmV29yZHMob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gZ2VuZXJhdGVPcHRpb25zKG9wdGlvbnMsIHtcbiAgICAgIGlnbm9yZVdoaXRlc3BhY2U6IHRydWVcbiAgICB9KTtcbiAgICByZXR1cm4gd29yZERpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgb3B0aW9ucyk7XG4gIH1cbiAgZnVuY3Rpb24gZGlmZldvcmRzV2l0aFNwYWNlKG9sZFN0ciwgbmV3U3RyLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHdvcmREaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpO1xuICB9XG5cbiAgdmFyIGxpbmVEaWZmID0gbmV3IERpZmYoKTtcblxuICBsaW5lRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciByZXRMaW5lcyA9IFtdLFxuICAgICAgICBsaW5lc0FuZE5ld2xpbmVzID0gdmFsdWUuc3BsaXQoLyhcXG58XFxyXFxuKS8pOyAvLyBJZ25vcmUgdGhlIGZpbmFsIGVtcHR5IHRva2VuIHRoYXQgb2NjdXJzIGlmIHRoZSBzdHJpbmcgZW5kcyB3aXRoIGEgbmV3IGxpbmVcblxuICAgIGlmICghbGluZXNBbmROZXdsaW5lc1tsaW5lc0FuZE5ld2xpbmVzLmxlbmd0aCAtIDFdKSB7XG4gICAgICBsaW5lc0FuZE5ld2xpbmVzLnBvcCgpO1xuICAgIH0gLy8gTWVyZ2UgdGhlIGNvbnRlbnQgYW5kIGxpbmUgc2VwYXJhdG9ycyBpbnRvIHNpbmdsZSB0b2tlbnNcblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lc0FuZE5ld2xpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbGluZSA9IGxpbmVzQW5kTmV3bGluZXNbaV07XG5cbiAgICAgIGlmIChpICUgMiAmJiAhdGhpcy5vcHRpb25zLm5ld2xpbmVJc1Rva2VuKSB7XG4gICAgICAgIHJldExpbmVzW3JldExpbmVzLmxlbmd0aCAtIDFdICs9IGxpbmU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UpIHtcbiAgICAgICAgICBsaW5lID0gbGluZS50cmltKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXRMaW5lcy5wdXNoKGxpbmUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXRMaW5lcztcbiAgfTtcblxuICBmdW5jdGlvbiBkaWZmTGluZXMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGxpbmVEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTtcbiAgfVxuICBmdW5jdGlvbiBkaWZmVHJpbW1lZExpbmVzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICAgIHZhciBvcHRpb25zID0gZ2VuZXJhdGVPcHRpb25zKGNhbGxiYWNrLCB7XG4gICAgICBpZ25vcmVXaGl0ZXNwYWNlOiB0cnVlXG4gICAgfSk7XG4gICAgcmV0dXJuIGxpbmVEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpO1xuICB9XG5cbiAgdmFyIHNlbnRlbmNlRGlmZiA9IG5ldyBEaWZmKCk7XG5cbiAgc2VudGVuY2VEaWZmLnRva2VuaXplID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlLnNwbGl0KC8oXFxTLis/Wy4hP10pKD89XFxzK3wkKS8pO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGRpZmZTZW50ZW5jZXMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHNlbnRlbmNlRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7XG4gIH1cblxuICB2YXIgY3NzRGlmZiA9IG5ldyBEaWZmKCk7XG5cbiAgY3NzRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5zcGxpdCgvKFt7fTo7LF18XFxzKykvKTtcbiAgfTtcblxuICBmdW5jdGlvbiBkaWZmQ3NzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICAgIHJldHVybiBjc3NEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7XG4gICAgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7XG4gICAgICBfdHlwZW9mID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9iajtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIF90eXBlb2YgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gX3R5cGVvZihvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gX3RvQ29uc3VtYWJsZUFycmF5KGFycikge1xuICAgIHJldHVybiBfYXJyYXlXaXRob3V0SG9sZXMoYXJyKSB8fCBfaXRlcmFibGVUb0FycmF5KGFycikgfHwgX25vbkl0ZXJhYmxlU3ByZWFkKCk7XG4gIH1cblxuICBmdW5jdGlvbiBfYXJyYXlXaXRob3V0SG9sZXMoYXJyKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBuZXcgQXJyYXkoYXJyLmxlbmd0aCk7IGkgPCBhcnIubGVuZ3RoOyBpKyspIGFycjJbaV0gPSBhcnJbaV07XG5cbiAgICAgIHJldHVybiBhcnIyO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIF9pdGVyYWJsZVRvQXJyYXkoaXRlcikge1xuICAgIGlmIChTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KGl0ZXIpIHx8IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpdGVyKSA9PT0gXCJbb2JqZWN0IEFyZ3VtZW50c11cIikgcmV0dXJuIEFycmF5LmZyb20oaXRlcik7XG4gIH1cblxuICBmdW5jdGlvbiBfbm9uSXRlcmFibGVTcHJlYWQoKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgYXR0ZW1wdCB0byBzcHJlYWQgbm9uLWl0ZXJhYmxlIGluc3RhbmNlXCIpO1xuICB9XG5cbiAgdmFyIG9iamVjdFByb3RvdHlwZVRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgdmFyIGpzb25EaWZmID0gbmV3IERpZmYoKTsgLy8gRGlzY3JpbWluYXRlIGJldHdlZW4gdHdvIGxpbmVzIG9mIHByZXR0eS1wcmludGVkLCBzZXJpYWxpemVkIEpTT04gd2hlcmUgb25lIG9mIHRoZW0gaGFzIGFcbiAgLy8gZGFuZ2xpbmcgY29tbWEgYW5kIHRoZSBvdGhlciBkb2Vzbid0LiBUdXJucyBvdXQgaW5jbHVkaW5nIHRoZSBkYW5nbGluZyBjb21tYSB5aWVsZHMgdGhlIG5pY2VzdCBvdXRwdXQ6XG5cbiAganNvbkRpZmYudXNlTG9uZ2VzdFRva2VuID0gdHJ1ZTtcbiAganNvbkRpZmYudG9rZW5pemUgPSBsaW5lRGlmZi50b2tlbml6ZTtcblxuICBqc29uRGlmZi5jYXN0SW5wdXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgX3RoaXMkb3B0aW9ucyA9IHRoaXMub3B0aW9ucyxcbiAgICAgICAgdW5kZWZpbmVkUmVwbGFjZW1lbnQgPSBfdGhpcyRvcHRpb25zLnVuZGVmaW5lZFJlcGxhY2VtZW50LFxuICAgICAgICBfdGhpcyRvcHRpb25zJHN0cmluZ2kgPSBfdGhpcyRvcHRpb25zLnN0cmluZ2lmeVJlcGxhY2VyLFxuICAgICAgICBzdHJpbmdpZnlSZXBsYWNlciA9IF90aGlzJG9wdGlvbnMkc3RyaW5naSA9PT0gdm9pZCAwID8gZnVuY3Rpb24gKGssIHYpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgdiA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWRSZXBsYWNlbWVudCA6IHY7XG4gICAgfSA6IF90aGlzJG9wdGlvbnMkc3RyaW5naTtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlIDogSlNPTi5zdHJpbmdpZnkoY2Fub25pY2FsaXplKHZhbHVlLCBudWxsLCBudWxsLCBzdHJpbmdpZnlSZXBsYWNlciksIHN0cmluZ2lmeVJlcGxhY2VyLCAnICAnKTtcbiAgfTtcblxuICBqc29uRGlmZi5lcXVhbHMgPSBmdW5jdGlvbiAobGVmdCwgcmlnaHQpIHtcbiAgICByZXR1cm4gRGlmZi5wcm90b3R5cGUuZXF1YWxzLmNhbGwoanNvbkRpZmYsIGxlZnQucmVwbGFjZSgvLChbXFxyXFxuXSkvZywgJyQxJyksIHJpZ2h0LnJlcGxhY2UoLywoW1xcclxcbl0pL2csICckMScpKTtcbiAgfTtcblxuICBmdW5jdGlvbiBkaWZmSnNvbihvbGRPYmosIG5ld09iaiwgb3B0aW9ucykge1xuICAgIHJldHVybiBqc29uRGlmZi5kaWZmKG9sZE9iaiwgbmV3T2JqLCBvcHRpb25zKTtcbiAgfSAvLyBUaGlzIGZ1bmN0aW9uIGhhbmRsZXMgdGhlIHByZXNlbmNlIG9mIGNpcmN1bGFyIHJlZmVyZW5jZXMgYnkgYmFpbGluZyBvdXQgd2hlbiBlbmNvdW50ZXJpbmcgYW5cbiAgLy8gb2JqZWN0IHRoYXQgaXMgYWxyZWFkeSBvbiB0aGUgXCJzdGFja1wiIG9mIGl0ZW1zIGJlaW5nIHByb2Nlc3NlZC4gQWNjZXB0cyBhbiBvcHRpb25hbCByZXBsYWNlclxuXG4gIGZ1bmN0aW9uIGNhbm9uaWNhbGl6ZShvYmosIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrLCByZXBsYWNlciwga2V5KSB7XG4gICAgc3RhY2sgPSBzdGFjayB8fCBbXTtcbiAgICByZXBsYWNlbWVudFN0YWNrID0gcmVwbGFjZW1lbnRTdGFjayB8fCBbXTtcblxuICAgIGlmIChyZXBsYWNlcikge1xuICAgICAgb2JqID0gcmVwbGFjZXIoa2V5LCBvYmopO1xuICAgIH1cblxuICAgIHZhciBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHN0YWNrLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBpZiAoc3RhY2tbaV0gPT09IG9iaikge1xuICAgICAgICByZXR1cm4gcmVwbGFjZW1lbnRTdGFja1tpXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY2Fub25pY2FsaXplZE9iajtcblxuICAgIGlmICgnW29iamVjdCBBcnJheV0nID09PSBvYmplY3RQcm90b3R5cGVUb1N0cmluZy5jYWxsKG9iaikpIHtcbiAgICAgIHN0YWNrLnB1c2gob2JqKTtcbiAgICAgIGNhbm9uaWNhbGl6ZWRPYmogPSBuZXcgQXJyYXkob2JqLmxlbmd0aCk7XG4gICAgICByZXBsYWNlbWVudFN0YWNrLnB1c2goY2Fub25pY2FsaXplZE9iaik7XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY2Fub25pY2FsaXplZE9ialtpXSA9IGNhbm9uaWNhbGl6ZShvYmpbaV0sIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrLCByZXBsYWNlciwga2V5KTtcbiAgICAgIH1cblxuICAgICAgc3RhY2sucG9wKCk7XG4gICAgICByZXBsYWNlbWVudFN0YWNrLnBvcCgpO1xuICAgICAgcmV0dXJuIGNhbm9uaWNhbGl6ZWRPYmo7XG4gICAgfVxuXG4gICAgaWYgKG9iaiAmJiBvYmoudG9KU09OKSB7XG4gICAgICBvYmogPSBvYmoudG9KU09OKCk7XG4gICAgfVxuXG4gICAgaWYgKF90eXBlb2Yob2JqKSA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsKSB7XG4gICAgICBzdGFjay5wdXNoKG9iaik7XG4gICAgICBjYW5vbmljYWxpemVkT2JqID0ge307XG4gICAgICByZXBsYWNlbWVudFN0YWNrLnB1c2goY2Fub25pY2FsaXplZE9iaik7XG5cbiAgICAgIHZhciBzb3J0ZWRLZXlzID0gW10sXG4gICAgICAgICAgX2tleTtcblxuICAgICAgZm9yIChfa2V5IGluIG9iaikge1xuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KF9rZXkpKSB7XG4gICAgICAgICAgc29ydGVkS2V5cy5wdXNoKF9rZXkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHNvcnRlZEtleXMuc29ydCgpO1xuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgc29ydGVkS2V5cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBfa2V5ID0gc29ydGVkS2V5c1tpXTtcbiAgICAgICAgY2Fub25pY2FsaXplZE9ialtfa2V5XSA9IGNhbm9uaWNhbGl6ZShvYmpbX2tleV0sIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrLCByZXBsYWNlciwgX2tleSk7XG4gICAgICB9XG5cbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgcmVwbGFjZW1lbnRTdGFjay5wb3AoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2Fub25pY2FsaXplZE9iaiA9IG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gY2Fub25pY2FsaXplZE9iajtcbiAgfVxuXG4gIHZhciBhcnJheURpZmYgPSBuZXcgRGlmZigpO1xuXG4gIGFycmF5RGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5zbGljZSgpO1xuICB9O1xuXG4gIGFycmF5RGlmZi5qb2luID0gYXJyYXlEaWZmLnJlbW92ZUVtcHR5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGRpZmZBcnJheXMob2xkQXJyLCBuZXdBcnIsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGFycmF5RGlmZi5kaWZmKG9sZEFyciwgbmV3QXJyLCBjYWxsYmFjayk7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVBhdGNoKHVuaURpZmYpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDoge307XG4gICAgdmFyIGRpZmZzdHIgPSB1bmlEaWZmLnNwbGl0KC9cXHJcXG58W1xcblxcdlxcZlxcclxceDg1XS8pLFxuICAgICAgICBkZWxpbWl0ZXJzID0gdW5pRGlmZi5tYXRjaCgvXFxyXFxufFtcXG5cXHZcXGZcXHJcXHg4NV0vZykgfHwgW10sXG4gICAgICAgIGxpc3QgPSBbXSxcbiAgICAgICAgaSA9IDA7XG5cbiAgICBmdW5jdGlvbiBwYXJzZUluZGV4KCkge1xuICAgICAgdmFyIGluZGV4ID0ge307XG4gICAgICBsaXN0LnB1c2goaW5kZXgpOyAvLyBQYXJzZSBkaWZmIG1ldGFkYXRhXG5cbiAgICAgIHdoaWxlIChpIDwgZGlmZnN0ci5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGxpbmUgPSBkaWZmc3RyW2ldOyAvLyBGaWxlIGhlYWRlciBmb3VuZCwgZW5kIHBhcnNpbmcgZGlmZiBtZXRhZGF0YVxuXG4gICAgICAgIGlmICgvXihcXC1cXC1cXC18XFwrXFwrXFwrfEBAKVxccy8udGVzdChsaW5lKSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IC8vIERpZmYgaW5kZXhcblxuXG4gICAgICAgIHZhciBoZWFkZXIgPSAvXig/OkluZGV4OnxkaWZmKD86IC1yIFxcdyspKylcXHMrKC4rPylcXHMqJC8uZXhlYyhsaW5lKTtcblxuICAgICAgICBpZiAoaGVhZGVyKSB7XG4gICAgICAgICAgaW5kZXguaW5kZXggPSBoZWFkZXJbMV07XG4gICAgICAgIH1cblxuICAgICAgICBpKys7XG4gICAgICB9IC8vIFBhcnNlIGZpbGUgaGVhZGVycyBpZiB0aGV5IGFyZSBkZWZpbmVkLiBVbmlmaWVkIGRpZmYgcmVxdWlyZXMgdGhlbSwgYnV0XG4gICAgICAvLyB0aGVyZSdzIG5vIHRlY2huaWNhbCBpc3N1ZXMgdG8gaGF2ZSBhbiBpc29sYXRlZCBodW5rIHdpdGhvdXQgZmlsZSBoZWFkZXJcblxuXG4gICAgICBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpO1xuICAgICAgcGFyc2VGaWxlSGVhZGVyKGluZGV4KTsgLy8gUGFyc2UgaHVua3NcblxuICAgICAgaW5kZXguaHVua3MgPSBbXTtcblxuICAgICAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgICAgICB2YXIgX2xpbmUgPSBkaWZmc3RyW2ldO1xuXG4gICAgICAgIGlmICgvXihJbmRleDp8ZGlmZnxcXC1cXC1cXC18XFwrXFwrXFwrKVxccy8udGVzdChfbGluZSkpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSBlbHNlIGlmICgvXkBALy50ZXN0KF9saW5lKSkge1xuICAgICAgICAgIGluZGV4Lmh1bmtzLnB1c2gocGFyc2VIdW5rKCkpO1xuICAgICAgICB9IGVsc2UgaWYgKF9saW5lICYmIG9wdGlvbnMuc3RyaWN0KSB7XG4gICAgICAgICAgLy8gSWdub3JlIHVuZXhwZWN0ZWQgY29udGVudCB1bmxlc3MgaW4gc3RyaWN0IG1vZGVcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbGluZSAnICsgKGkgKyAxKSArICcgJyArIEpTT04uc3RyaW5naWZ5KF9saW5lKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSAvLyBQYXJzZXMgdGhlIC0tLSBhbmQgKysrIGhlYWRlcnMsIGlmIG5vbmUgYXJlIGZvdW5kLCBubyBsaW5lc1xuICAgIC8vIGFyZSBjb25zdW1lZC5cblxuXG4gICAgZnVuY3Rpb24gcGFyc2VGaWxlSGVhZGVyKGluZGV4KSB7XG4gICAgICB2YXIgZmlsZUhlYWRlciA9IC9eKC0tLXxcXCtcXCtcXCspXFxzKyguKikkLy5leGVjKGRpZmZzdHJbaV0pO1xuXG4gICAgICBpZiAoZmlsZUhlYWRlcikge1xuICAgICAgICB2YXIga2V5UHJlZml4ID0gZmlsZUhlYWRlclsxXSA9PT0gJy0tLScgPyAnb2xkJyA6ICduZXcnO1xuICAgICAgICB2YXIgZGF0YSA9IGZpbGVIZWFkZXJbMl0uc3BsaXQoJ1xcdCcsIDIpO1xuICAgICAgICB2YXIgZmlsZU5hbWUgPSBkYXRhWzBdLnJlcGxhY2UoL1xcXFxcXFxcL2csICdcXFxcJyk7XG5cbiAgICAgICAgaWYgKC9eXCIuKlwiJC8udGVzdChmaWxlTmFtZSkpIHtcbiAgICAgICAgICBmaWxlTmFtZSA9IGZpbGVOYW1lLnN1YnN0cigxLCBmaWxlTmFtZS5sZW5ndGggLSAyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluZGV4W2tleVByZWZpeCArICdGaWxlTmFtZSddID0gZmlsZU5hbWU7XG4gICAgICAgIGluZGV4W2tleVByZWZpeCArICdIZWFkZXInXSA9IChkYXRhWzFdIHx8ICcnKS50cmltKCk7XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICB9IC8vIFBhcnNlcyBhIGh1bmtcbiAgICAvLyBUaGlzIGFzc3VtZXMgdGhhdCB3ZSBhcmUgYXQgdGhlIHN0YXJ0IG9mIGEgaHVuay5cblxuXG4gICAgZnVuY3Rpb24gcGFyc2VIdW5rKCkge1xuICAgICAgdmFyIGNodW5rSGVhZGVySW5kZXggPSBpLFxuICAgICAgICAgIGNodW5rSGVhZGVyTGluZSA9IGRpZmZzdHJbaSsrXSxcbiAgICAgICAgICBjaHVua0hlYWRlciA9IGNodW5rSGVhZGVyTGluZS5zcGxpdCgvQEAgLShcXGQrKSg/OiwoXFxkKykpPyBcXCsoXFxkKykoPzosKFxcZCspKT8gQEAvKTtcbiAgICAgIHZhciBodW5rID0ge1xuICAgICAgICBvbGRTdGFydDogK2NodW5rSGVhZGVyWzFdLFxuICAgICAgICBvbGRMaW5lczogK2NodW5rSGVhZGVyWzJdIHx8IDEsXG4gICAgICAgIG5ld1N0YXJ0OiArY2h1bmtIZWFkZXJbM10sXG4gICAgICAgIG5ld0xpbmVzOiArY2h1bmtIZWFkZXJbNF0gfHwgMSxcbiAgICAgICAgbGluZXM6IFtdLFxuICAgICAgICBsaW5lZGVsaW1pdGVyczogW11cbiAgICAgIH07XG4gICAgICB2YXIgYWRkQ291bnQgPSAwLFxuICAgICAgICAgIHJlbW92ZUNvdW50ID0gMDtcblxuICAgICAgZm9yICg7IGkgPCBkaWZmc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIExpbmVzIHN0YXJ0aW5nIHdpdGggJy0tLScgY291bGQgYmUgbWlzdGFrZW4gZm9yIHRoZSBcInJlbW92ZSBsaW5lXCIgb3BlcmF0aW9uXG4gICAgICAgIC8vIEJ1dCB0aGV5IGNvdWxkIGJlIHRoZSBoZWFkZXIgZm9yIHRoZSBuZXh0IGZpbGUuIFRoZXJlZm9yZSBwcnVuZSBzdWNoIGNhc2VzIG91dC5cbiAgICAgICAgaWYgKGRpZmZzdHJbaV0uaW5kZXhPZignLS0tICcpID09PSAwICYmIGkgKyAyIDwgZGlmZnN0ci5sZW5ndGggJiYgZGlmZnN0cltpICsgMV0uaW5kZXhPZignKysrICcpID09PSAwICYmIGRpZmZzdHJbaSArIDJdLmluZGV4T2YoJ0BAJykgPT09IDApIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvcGVyYXRpb24gPSBkaWZmc3RyW2ldLmxlbmd0aCA9PSAwICYmIGkgIT0gZGlmZnN0ci5sZW5ndGggLSAxID8gJyAnIDogZGlmZnN0cltpXVswXTtcblxuICAgICAgICBpZiAob3BlcmF0aW9uID09PSAnKycgfHwgb3BlcmF0aW9uID09PSAnLScgfHwgb3BlcmF0aW9uID09PSAnICcgfHwgb3BlcmF0aW9uID09PSAnXFxcXCcpIHtcbiAgICAgICAgICBodW5rLmxpbmVzLnB1c2goZGlmZnN0cltpXSk7XG4gICAgICAgICAgaHVuay5saW5lZGVsaW1pdGVycy5wdXNoKGRlbGltaXRlcnNbaV0gfHwgJ1xcbicpO1xuXG4gICAgICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgICAgICBhZGRDb3VudCsrO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgICAgIHJlbW92ZUNvdW50Kys7XG4gICAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICcgJykge1xuICAgICAgICAgICAgYWRkQ291bnQrKztcbiAgICAgICAgICAgIHJlbW92ZUNvdW50Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9IC8vIEhhbmRsZSB0aGUgZW1wdHkgYmxvY2sgY291bnQgY2FzZVxuXG5cbiAgICAgIGlmICghYWRkQ291bnQgJiYgaHVuay5uZXdMaW5lcyA9PT0gMSkge1xuICAgICAgICBodW5rLm5ld0xpbmVzID0gMDtcbiAgICAgIH1cblxuICAgICAgaWYgKCFyZW1vdmVDb3VudCAmJiBodW5rLm9sZExpbmVzID09PSAxKSB7XG4gICAgICAgIGh1bmsub2xkTGluZXMgPSAwO1xuICAgICAgfSAvLyBQZXJmb3JtIG9wdGlvbmFsIHNhbml0eSBjaGVja2luZ1xuXG5cbiAgICAgIGlmIChvcHRpb25zLnN0cmljdCkge1xuICAgICAgICBpZiAoYWRkQ291bnQgIT09IGh1bmsubmV3TGluZXMpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FkZGVkIGxpbmUgY291bnQgZGlkIG5vdCBtYXRjaCBmb3IgaHVuayBhdCBsaW5lICcgKyAoY2h1bmtIZWFkZXJJbmRleCArIDEpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZW1vdmVDb3VudCAhPT0gaHVuay5vbGRMaW5lcykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUmVtb3ZlZCBsaW5lIGNvdW50IGRpZCBub3QgbWF0Y2ggZm9yIGh1bmsgYXQgbGluZSAnICsgKGNodW5rSGVhZGVySW5kZXggKyAxKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGh1bms7XG4gICAgfVxuXG4gICAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgICAgcGFyc2VJbmRleCgpO1xuICAgIH1cblxuICAgIHJldHVybiBsaXN0O1xuICB9XG5cbiAgLy8gSXRlcmF0b3IgdGhhdCB0cmF2ZXJzZXMgaW4gdGhlIHJhbmdlIG9mIFttaW4sIG1heF0sIHN0ZXBwaW5nXG4gIC8vIGJ5IGRpc3RhbmNlIGZyb20gYSBnaXZlbiBzdGFydCBwb3NpdGlvbi4gSS5lLiBmb3IgWzAsIDRdLCB3aXRoXG4gIC8vIHN0YXJ0IG9mIDIsIHRoaXMgd2lsbCBpdGVyYXRlIDIsIDMsIDEsIDQsIDAuXG4gIGZ1bmN0aW9uIGRpc3RhbmNlSXRlcmF0b3IgKHN0YXJ0LCBtaW5MaW5lLCBtYXhMaW5lKSB7XG4gICAgdmFyIHdhbnRGb3J3YXJkID0gdHJ1ZSxcbiAgICAgICAgYmFja3dhcmRFeGhhdXN0ZWQgPSBmYWxzZSxcbiAgICAgICAgZm9yd2FyZEV4aGF1c3RlZCA9IGZhbHNlLFxuICAgICAgICBsb2NhbE9mZnNldCA9IDE7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGl0ZXJhdG9yKCkge1xuICAgICAgaWYgKHdhbnRGb3J3YXJkICYmICFmb3J3YXJkRXhoYXVzdGVkKSB7XG4gICAgICAgIGlmIChiYWNrd2FyZEV4aGF1c3RlZCkge1xuICAgICAgICAgIGxvY2FsT2Zmc2V0Kys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd2FudEZvcndhcmQgPSBmYWxzZTtcbiAgICAgICAgfSAvLyBDaGVjayBpZiB0cnlpbmcgdG8gZml0IGJleW9uZCB0ZXh0IGxlbmd0aCwgYW5kIGlmIG5vdCwgY2hlY2sgaXQgZml0c1xuICAgICAgICAvLyBhZnRlciBvZmZzZXQgbG9jYXRpb24gKG9yIGRlc2lyZWQgbG9jYXRpb24gb24gZmlyc3QgaXRlcmF0aW9uKVxuXG5cbiAgICAgICAgaWYgKHN0YXJ0ICsgbG9jYWxPZmZzZXQgPD0gbWF4TGluZSkge1xuICAgICAgICAgIHJldHVybiBsb2NhbE9mZnNldDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvcndhcmRFeGhhdXN0ZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWJhY2t3YXJkRXhoYXVzdGVkKSB7XG4gICAgICAgIGlmICghZm9yd2FyZEV4aGF1c3RlZCkge1xuICAgICAgICAgIHdhbnRGb3J3YXJkID0gdHJ1ZTtcbiAgICAgICAgfSAvLyBDaGVjayBpZiB0cnlpbmcgdG8gZml0IGJlZm9yZSB0ZXh0IGJlZ2lubmluZywgYW5kIGlmIG5vdCwgY2hlY2sgaXQgZml0c1xuICAgICAgICAvLyBiZWZvcmUgb2Zmc2V0IGxvY2F0aW9uXG5cblxuICAgICAgICBpZiAobWluTGluZSA8PSBzdGFydCAtIGxvY2FsT2Zmc2V0KSB7XG4gICAgICAgICAgcmV0dXJuIC1sb2NhbE9mZnNldCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgYmFja3dhcmRFeGhhdXN0ZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gaXRlcmF0b3IoKTtcbiAgICAgIH0gLy8gV2UgdHJpZWQgdG8gZml0IGh1bmsgYmVmb3JlIHRleHQgYmVnaW5uaW5nIGFuZCBiZXlvbmQgdGV4dCBsZW5ndGgsIHRoZW5cbiAgICAgIC8vIGh1bmsgY2FuJ3QgZml0IG9uIHRoZSB0ZXh0LiBSZXR1cm4gdW5kZWZpbmVkXG5cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gYXBwbHlQYXRjaChzb3VyY2UsIHVuaURpZmYpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDoge307XG5cbiAgICBpZiAodHlwZW9mIHVuaURpZmYgPT09ICdzdHJpbmcnKSB7XG4gICAgICB1bmlEaWZmID0gcGFyc2VQYXRjaCh1bmlEaWZmKTtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh1bmlEaWZmKSkge1xuICAgICAgaWYgKHVuaURpZmYubGVuZ3RoID4gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FwcGx5UGF0Y2ggb25seSB3b3JrcyB3aXRoIGEgc2luZ2xlIGlucHV0LicpO1xuICAgICAgfVxuXG4gICAgICB1bmlEaWZmID0gdW5pRGlmZlswXTtcbiAgICB9IC8vIEFwcGx5IHRoZSBkaWZmIHRvIHRoZSBpbnB1dFxuXG5cbiAgICB2YXIgbGluZXMgPSBzb3VyY2Uuc3BsaXQoL1xcclxcbnxbXFxuXFx2XFxmXFxyXFx4ODVdLyksXG4gICAgICAgIGRlbGltaXRlcnMgPSBzb3VyY2UubWF0Y2goL1xcclxcbnxbXFxuXFx2XFxmXFxyXFx4ODVdL2cpIHx8IFtdLFxuICAgICAgICBodW5rcyA9IHVuaURpZmYuaHVua3MsXG4gICAgICAgIGNvbXBhcmVMaW5lID0gb3B0aW9ucy5jb21wYXJlTGluZSB8fCBmdW5jdGlvbiAobGluZU51bWJlciwgbGluZSwgb3BlcmF0aW9uLCBwYXRjaENvbnRlbnQpIHtcbiAgICAgIHJldHVybiBsaW5lID09PSBwYXRjaENvbnRlbnQ7XG4gICAgfSxcbiAgICAgICAgZXJyb3JDb3VudCA9IDAsXG4gICAgICAgIGZ1enpGYWN0b3IgPSBvcHRpb25zLmZ1enpGYWN0b3IgfHwgMCxcbiAgICAgICAgbWluTGluZSA9IDAsXG4gICAgICAgIG9mZnNldCA9IDAsXG4gICAgICAgIHJlbW92ZUVPRk5MLFxuICAgICAgICBhZGRFT0ZOTDtcbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIGh1bmsgZXhhY3RseSBmaXRzIG9uIHRoZSBwcm92aWRlZCBsb2NhdGlvblxuICAgICAqL1xuXG5cbiAgICBmdW5jdGlvbiBodW5rRml0cyhodW5rLCB0b1Bvcykge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBodW5rLmxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBsaW5lID0gaHVuay5saW5lc1tqXSxcbiAgICAgICAgICAgIG9wZXJhdGlvbiA9IGxpbmUubGVuZ3RoID4gMCA/IGxpbmVbMF0gOiAnICcsXG4gICAgICAgICAgICBjb250ZW50ID0gbGluZS5sZW5ndGggPiAwID8gbGluZS5zdWJzdHIoMSkgOiBsaW5lO1xuXG4gICAgICAgIGlmIChvcGVyYXRpb24gPT09ICcgJyB8fCBvcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAgIC8vIENvbnRleHQgc2FuaXR5IGNoZWNrXG4gICAgICAgICAgaWYgKCFjb21wYXJlTGluZSh0b1BvcyArIDEsIGxpbmVzW3RvUG9zXSwgb3BlcmF0aW9uLCBjb250ZW50KSkge1xuICAgICAgICAgICAgZXJyb3JDb3VudCsrO1xuXG4gICAgICAgICAgICBpZiAoZXJyb3JDb3VudCA+IGZ1enpGYWN0b3IpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHRvUG9zKys7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSAvLyBTZWFyY2ggYmVzdCBmaXQgb2Zmc2V0cyBmb3IgZWFjaCBodW5rIGJhc2VkIG9uIHRoZSBwcmV2aW91cyBvbmVzXG5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBodW5rID0gaHVua3NbaV0sXG4gICAgICAgICAgbWF4TGluZSA9IGxpbmVzLmxlbmd0aCAtIGh1bmsub2xkTGluZXMsXG4gICAgICAgICAgbG9jYWxPZmZzZXQgPSAwLFxuICAgICAgICAgIHRvUG9zID0gb2Zmc2V0ICsgaHVuay5vbGRTdGFydCAtIDE7XG4gICAgICB2YXIgaXRlcmF0b3IgPSBkaXN0YW5jZUl0ZXJhdG9yKHRvUG9zLCBtaW5MaW5lLCBtYXhMaW5lKTtcblxuICAgICAgZm9yICg7IGxvY2FsT2Zmc2V0ICE9PSB1bmRlZmluZWQ7IGxvY2FsT2Zmc2V0ID0gaXRlcmF0b3IoKSkge1xuICAgICAgICBpZiAoaHVua0ZpdHMoaHVuaywgdG9Qb3MgKyBsb2NhbE9mZnNldCkpIHtcbiAgICAgICAgICBodW5rLm9mZnNldCA9IG9mZnNldCArPSBsb2NhbE9mZnNldDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAobG9jYWxPZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IC8vIFNldCBsb3dlciB0ZXh0IGxpbWl0IHRvIGVuZCBvZiB0aGUgY3VycmVudCBodW5rLCBzbyBuZXh0IG9uZXMgZG9uJ3QgdHJ5XG4gICAgICAvLyB0byBmaXQgb3ZlciBhbHJlYWR5IHBhdGNoZWQgdGV4dFxuXG5cbiAgICAgIG1pbkxpbmUgPSBodW5rLm9mZnNldCArIGh1bmsub2xkU3RhcnQgKyBodW5rLm9sZExpbmVzO1xuICAgIH0gLy8gQXBwbHkgcGF0Y2ggaHVua3NcblxuXG4gICAgdmFyIGRpZmZPZmZzZXQgPSAwO1xuXG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGh1bmtzLmxlbmd0aDsgX2krKykge1xuICAgICAgdmFyIF9odW5rID0gaHVua3NbX2ldLFxuICAgICAgICAgIF90b1BvcyA9IF9odW5rLm9sZFN0YXJ0ICsgX2h1bmsub2Zmc2V0ICsgZGlmZk9mZnNldCAtIDE7XG5cbiAgICAgIGRpZmZPZmZzZXQgKz0gX2h1bmsubmV3TGluZXMgLSBfaHVuay5vbGRMaW5lcztcblxuICAgICAgaWYgKF90b1BvcyA8IDApIHtcbiAgICAgICAgLy8gQ3JlYXRpbmcgYSBuZXcgZmlsZVxuICAgICAgICBfdG9Qb3MgPSAwO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IF9odW5rLmxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBsaW5lID0gX2h1bmsubGluZXNbal0sXG4gICAgICAgICAgICBvcGVyYXRpb24gPSBsaW5lLmxlbmd0aCA+IDAgPyBsaW5lWzBdIDogJyAnLFxuICAgICAgICAgICAgY29udGVudCA9IGxpbmUubGVuZ3RoID4gMCA/IGxpbmUuc3Vic3RyKDEpIDogbGluZSxcbiAgICAgICAgICAgIGRlbGltaXRlciA9IF9odW5rLmxpbmVkZWxpbWl0ZXJzW2pdO1xuXG4gICAgICAgIGlmIChvcGVyYXRpb24gPT09ICcgJykge1xuICAgICAgICAgIF90b1BvcysrO1xuICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgICAgbGluZXMuc3BsaWNlKF90b1BvcywgMSk7XG4gICAgICAgICAgZGVsaW1pdGVycy5zcGxpY2UoX3RvUG9zLCAxKTtcbiAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgICAgbGluZXMuc3BsaWNlKF90b1BvcywgMCwgY29udGVudCk7XG4gICAgICAgICAgZGVsaW1pdGVycy5zcGxpY2UoX3RvUG9zLCAwLCBkZWxpbWl0ZXIpO1xuICAgICAgICAgIF90b1BvcysrO1xuICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgdmFyIHByZXZpb3VzT3BlcmF0aW9uID0gX2h1bmsubGluZXNbaiAtIDFdID8gX2h1bmsubGluZXNbaiAtIDFdWzBdIDogbnVsbDtcblxuICAgICAgICAgIGlmIChwcmV2aW91c09wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgICAgICByZW1vdmVFT0ZOTCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChwcmV2aW91c09wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgICAgICBhZGRFT0ZOTCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSAvLyBIYW5kbGUgRU9GTkwgaW5zZXJ0aW9uL3JlbW92YWxcblxuXG4gICAgaWYgKHJlbW92ZUVPRk5MKSB7XG4gICAgICB3aGlsZSAoIWxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdKSB7XG4gICAgICAgIGxpbmVzLnBvcCgpO1xuICAgICAgICBkZWxpbWl0ZXJzLnBvcCgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYWRkRU9GTkwpIHtcbiAgICAgIGxpbmVzLnB1c2goJycpO1xuICAgICAgZGVsaW1pdGVycy5wdXNoKCdcXG4nKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBfayA9IDA7IF9rIDwgbGluZXMubGVuZ3RoIC0gMTsgX2srKykge1xuICAgICAgbGluZXNbX2tdID0gbGluZXNbX2tdICsgZGVsaW1pdGVyc1tfa107XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oJycpO1xuICB9IC8vIFdyYXBwZXIgdGhhdCBzdXBwb3J0cyBtdWx0aXBsZSBmaWxlIHBhdGNoZXMgdmlhIGNhbGxiYWNrcy5cblxuICBmdW5jdGlvbiBhcHBseVBhdGNoZXModW5pRGlmZiwgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgdW5pRGlmZiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHVuaURpZmYgPSBwYXJzZVBhdGNoKHVuaURpZmYpO1xuICAgIH1cblxuICAgIHZhciBjdXJyZW50SW5kZXggPSAwO1xuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc0luZGV4KCkge1xuICAgICAgdmFyIGluZGV4ID0gdW5pRGlmZltjdXJyZW50SW5kZXgrK107XG5cbiAgICAgIGlmICghaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuY29tcGxldGUoKTtcbiAgICAgIH1cblxuICAgICAgb3B0aW9ucy5sb2FkRmlsZShpbmRleCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIG9wdGlvbnMuY29tcGxldGUoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB1cGRhdGVkQ29udGVudCA9IGFwcGx5UGF0Y2goZGF0YSwgaW5kZXgsIG9wdGlvbnMpO1xuICAgICAgICBvcHRpb25zLnBhdGNoZWQoaW5kZXgsIHVwZGF0ZWRDb250ZW50LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuY29tcGxldGUoZXJyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwcm9jZXNzSW5kZXgoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBwcm9jZXNzSW5kZXgoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0cnVjdHVyZWRQYXRjaChvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jb250ZXh0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgb3B0aW9ucy5jb250ZXh0ID0gNDtcbiAgICB9XG5cbiAgICB2YXIgZGlmZiA9IGRpZmZMaW5lcyhvbGRTdHIsIG5ld1N0ciwgb3B0aW9ucyk7XG4gICAgZGlmZi5wdXNoKHtcbiAgICAgIHZhbHVlOiAnJyxcbiAgICAgIGxpbmVzOiBbXVxuICAgIH0pOyAvLyBBcHBlbmQgYW4gZW1wdHkgdmFsdWUgdG8gbWFrZSBjbGVhbnVwIGVhc2llclxuXG4gICAgZnVuY3Rpb24gY29udGV4dExpbmVzKGxpbmVzKSB7XG4gICAgICByZXR1cm4gbGluZXMubWFwKGZ1bmN0aW9uIChlbnRyeSkge1xuICAgICAgICByZXR1cm4gJyAnICsgZW50cnk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgaHVua3MgPSBbXTtcbiAgICB2YXIgb2xkUmFuZ2VTdGFydCA9IDAsXG4gICAgICAgIG5ld1JhbmdlU3RhcnQgPSAwLFxuICAgICAgICBjdXJSYW5nZSA9IFtdLFxuICAgICAgICBvbGRMaW5lID0gMSxcbiAgICAgICAgbmV3TGluZSA9IDE7XG5cbiAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiBfbG9vcChpKSB7XG4gICAgICB2YXIgY3VycmVudCA9IGRpZmZbaV0sXG4gICAgICAgICAgbGluZXMgPSBjdXJyZW50LmxpbmVzIHx8IGN1cnJlbnQudmFsdWUucmVwbGFjZSgvXFxuJC8sICcnKS5zcGxpdCgnXFxuJyk7XG4gICAgICBjdXJyZW50LmxpbmVzID0gbGluZXM7XG5cbiAgICAgIGlmIChjdXJyZW50LmFkZGVkIHx8IGN1cnJlbnQucmVtb3ZlZCkge1xuICAgICAgICB2YXIgX2N1clJhbmdlO1xuXG4gICAgICAgIC8vIElmIHdlIGhhdmUgcHJldmlvdXMgY29udGV4dCwgc3RhcnQgd2l0aCB0aGF0XG4gICAgICAgIGlmICghb2xkUmFuZ2VTdGFydCkge1xuICAgICAgICAgIHZhciBwcmV2ID0gZGlmZltpIC0gMV07XG4gICAgICAgICAgb2xkUmFuZ2VTdGFydCA9IG9sZExpbmU7XG4gICAgICAgICAgbmV3UmFuZ2VTdGFydCA9IG5ld0xpbmU7XG5cbiAgICAgICAgICBpZiAocHJldikge1xuICAgICAgICAgICAgY3VyUmFuZ2UgPSBvcHRpb25zLmNvbnRleHQgPiAwID8gY29udGV4dExpbmVzKHByZXYubGluZXMuc2xpY2UoLW9wdGlvbnMuY29udGV4dCkpIDogW107XG4gICAgICAgICAgICBvbGRSYW5nZVN0YXJ0IC09IGN1clJhbmdlLmxlbmd0aDtcbiAgICAgICAgICAgIG5ld1JhbmdlU3RhcnQgLT0gY3VyUmFuZ2UubGVuZ3RoO1xuICAgICAgICAgIH1cbiAgICAgICAgfSAvLyBPdXRwdXQgb3VyIGNoYW5nZXNcblxuXG4gICAgICAgIChfY3VyUmFuZ2UgPSBjdXJSYW5nZSkucHVzaC5hcHBseShfY3VyUmFuZ2UsIF90b0NvbnN1bWFibGVBcnJheShsaW5lcy5tYXAoZnVuY3Rpb24gKGVudHJ5KSB7XG4gICAgICAgICAgcmV0dXJuIChjdXJyZW50LmFkZGVkID8gJysnIDogJy0nKSArIGVudHJ5O1xuICAgICAgICB9KSkpOyAvLyBUcmFjayB0aGUgdXBkYXRlZCBmaWxlIHBvc2l0aW9uXG5cblxuICAgICAgICBpZiAoY3VycmVudC5hZGRlZCkge1xuICAgICAgICAgIG5ld0xpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9sZExpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZGVudGljYWwgY29udGV4dCBsaW5lcy4gVHJhY2sgbGluZSBjaGFuZ2VzXG4gICAgICAgIGlmIChvbGRSYW5nZVN0YXJ0KSB7XG4gICAgICAgICAgLy8gQ2xvc2Ugb3V0IGFueSBjaGFuZ2VzIHRoYXQgaGF2ZSBiZWVuIG91dHB1dCAob3Igam9pbiBvdmVybGFwcGluZylcbiAgICAgICAgICBpZiAobGluZXMubGVuZ3RoIDw9IG9wdGlvbnMuY29udGV4dCAqIDIgJiYgaSA8IGRpZmYubGVuZ3RoIC0gMikge1xuICAgICAgICAgICAgdmFyIF9jdXJSYW5nZTI7XG5cbiAgICAgICAgICAgIC8vIE92ZXJsYXBwaW5nXG4gICAgICAgICAgICAoX2N1clJhbmdlMiA9IGN1clJhbmdlKS5wdXNoLmFwcGx5KF9jdXJSYW5nZTIsIF90b0NvbnN1bWFibGVBcnJheShjb250ZXh0TGluZXMobGluZXMpKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBfY3VyUmFuZ2UzO1xuXG4gICAgICAgICAgICAvLyBlbmQgdGhlIHJhbmdlIGFuZCBvdXRwdXRcbiAgICAgICAgICAgIHZhciBjb250ZXh0U2l6ZSA9IE1hdGgubWluKGxpbmVzLmxlbmd0aCwgb3B0aW9ucy5jb250ZXh0KTtcblxuICAgICAgICAgICAgKF9jdXJSYW5nZTMgPSBjdXJSYW5nZSkucHVzaC5hcHBseShfY3VyUmFuZ2UzLCBfdG9Db25zdW1hYmxlQXJyYXkoY29udGV4dExpbmVzKGxpbmVzLnNsaWNlKDAsIGNvbnRleHRTaXplKSkpKTtcblxuICAgICAgICAgICAgdmFyIGh1bmsgPSB7XG4gICAgICAgICAgICAgIG9sZFN0YXJ0OiBvbGRSYW5nZVN0YXJ0LFxuICAgICAgICAgICAgICBvbGRMaW5lczogb2xkTGluZSAtIG9sZFJhbmdlU3RhcnQgKyBjb250ZXh0U2l6ZSxcbiAgICAgICAgICAgICAgbmV3U3RhcnQ6IG5ld1JhbmdlU3RhcnQsXG4gICAgICAgICAgICAgIG5ld0xpbmVzOiBuZXdMaW5lIC0gbmV3UmFuZ2VTdGFydCArIGNvbnRleHRTaXplLFxuICAgICAgICAgICAgICBsaW5lczogY3VyUmFuZ2VcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChpID49IGRpZmYubGVuZ3RoIC0gMiAmJiBsaW5lcy5sZW5ndGggPD0gb3B0aW9ucy5jb250ZXh0KSB7XG4gICAgICAgICAgICAgIC8vIEVPRiBpcyBpbnNpZGUgdGhpcyBodW5rXG4gICAgICAgICAgICAgIHZhciBvbGRFT0ZOZXdsaW5lID0gL1xcbiQvLnRlc3Qob2xkU3RyKTtcbiAgICAgICAgICAgICAgdmFyIG5ld0VPRk5ld2xpbmUgPSAvXFxuJC8udGVzdChuZXdTdHIpO1xuICAgICAgICAgICAgICB2YXIgbm9ObEJlZm9yZUFkZHMgPSBsaW5lcy5sZW5ndGggPT0gMCAmJiBjdXJSYW5nZS5sZW5ndGggPiBodW5rLm9sZExpbmVzO1xuXG4gICAgICAgICAgICAgIGlmICghb2xkRU9GTmV3bGluZSAmJiBub05sQmVmb3JlQWRkcykge1xuICAgICAgICAgICAgICAgIC8vIHNwZWNpYWwgY2FzZTogb2xkIGhhcyBubyBlb2wgYW5kIG5vIHRyYWlsaW5nIGNvbnRleHQ7IG5vLW5sIGNhbiBlbmQgdXAgYmVmb3JlIGFkZHNcbiAgICAgICAgICAgICAgICBjdXJSYW5nZS5zcGxpY2UoaHVuay5vbGRMaW5lcywgMCwgJ1xcXFwgTm8gbmV3bGluZSBhdCBlbmQgb2YgZmlsZScpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKCFvbGRFT0ZOZXdsaW5lICYmICFub05sQmVmb3JlQWRkcyB8fCAhbmV3RU9GTmV3bGluZSkge1xuICAgICAgICAgICAgICAgIGN1clJhbmdlLnB1c2goJ1xcXFwgTm8gbmV3bGluZSBhdCBlbmQgb2YgZmlsZScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGh1bmtzLnB1c2goaHVuayk7XG4gICAgICAgICAgICBvbGRSYW5nZVN0YXJ0ID0gMDtcbiAgICAgICAgICAgIG5ld1JhbmdlU3RhcnQgPSAwO1xuICAgICAgICAgICAgY3VyUmFuZ2UgPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBvbGRMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgICAgbmV3TGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGlmZi5sZW5ndGg7IGkrKykge1xuICAgICAgX2xvb3AoaSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG9sZEZpbGVOYW1lOiBvbGRGaWxlTmFtZSxcbiAgICAgIG5ld0ZpbGVOYW1lOiBuZXdGaWxlTmFtZSxcbiAgICAgIG9sZEhlYWRlcjogb2xkSGVhZGVyLFxuICAgICAgbmV3SGVhZGVyOiBuZXdIZWFkZXIsXG4gICAgICBodW5rczogaHVua3NcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gob2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpIHtcbiAgICB2YXIgZGlmZiA9IHN0cnVjdHVyZWRQYXRjaChvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucyk7XG4gICAgdmFyIHJldCA9IFtdO1xuXG4gICAgaWYgKG9sZEZpbGVOYW1lID09IG5ld0ZpbGVOYW1lKSB7XG4gICAgICByZXQucHVzaCgnSW5kZXg6ICcgKyBvbGRGaWxlTmFtZSk7XG4gICAgfVxuXG4gICAgcmV0LnB1c2goJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0nKTtcbiAgICByZXQucHVzaCgnLS0tICcgKyBkaWZmLm9sZEZpbGVOYW1lICsgKHR5cGVvZiBkaWZmLm9sZEhlYWRlciA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6ICdcXHQnICsgZGlmZi5vbGRIZWFkZXIpKTtcbiAgICByZXQucHVzaCgnKysrICcgKyBkaWZmLm5ld0ZpbGVOYW1lICsgKHR5cGVvZiBkaWZmLm5ld0hlYWRlciA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6ICdcXHQnICsgZGlmZi5uZXdIZWFkZXIpKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGlmZi5odW5rcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGh1bmsgPSBkaWZmLmh1bmtzW2ldO1xuICAgICAgcmV0LnB1c2goJ0BAIC0nICsgaHVuay5vbGRTdGFydCArICcsJyArIGh1bmsub2xkTGluZXMgKyAnICsnICsgaHVuay5uZXdTdGFydCArICcsJyArIGh1bmsubmV3TGluZXMgKyAnIEBAJyk7XG4gICAgICByZXQucHVzaC5hcHBseShyZXQsIGh1bmsubGluZXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQuam9pbignXFxuJykgKyAnXFxuJztcbiAgfVxuICBmdW5jdGlvbiBjcmVhdGVQYXRjaChmaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVR3b0ZpbGVzUGF0Y2goZmlsZU5hbWUsIGZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpO1xuICB9XG5cbiAgZnVuY3Rpb24gYXJyYXlFcXVhbChhLCBiKSB7XG4gICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheVN0YXJ0c1dpdGgoYSwgYik7XG4gIH1cbiAgZnVuY3Rpb24gYXJyYXlTdGFydHNXaXRoKGFycmF5LCBzdGFydCkge1xuICAgIGlmIChzdGFydC5sZW5ndGggPiBhcnJheS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXJ0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoc3RhcnRbaV0gIT09IGFycmF5W2ldKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbGNMaW5lQ291bnQoaHVuaykge1xuICAgIHZhciBfY2FsY09sZE5ld0xpbmVDb3VudCA9IGNhbGNPbGROZXdMaW5lQ291bnQoaHVuay5saW5lcyksXG4gICAgICAgIG9sZExpbmVzID0gX2NhbGNPbGROZXdMaW5lQ291bnQub2xkTGluZXMsXG4gICAgICAgIG5ld0xpbmVzID0gX2NhbGNPbGROZXdMaW5lQ291bnQubmV3TGluZXM7XG5cbiAgICBpZiAob2xkTGluZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaHVuay5vbGRMaW5lcyA9IG9sZExpbmVzO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWxldGUgaHVuay5vbGRMaW5lcztcbiAgICB9XG5cbiAgICBpZiAobmV3TGluZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaHVuay5uZXdMaW5lcyA9IG5ld0xpbmVzO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWxldGUgaHVuay5uZXdMaW5lcztcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gbWVyZ2UobWluZSwgdGhlaXJzLCBiYXNlKSB7XG4gICAgbWluZSA9IGxvYWRQYXRjaChtaW5lLCBiYXNlKTtcbiAgICB0aGVpcnMgPSBsb2FkUGF0Y2godGhlaXJzLCBiYXNlKTtcbiAgICB2YXIgcmV0ID0ge307IC8vIEZvciBpbmRleCB3ZSBqdXN0IGxldCBpdCBwYXNzIHRocm91Z2ggYXMgaXQgZG9lc24ndCBoYXZlIGFueSBuZWNlc3NhcnkgbWVhbmluZy5cbiAgICAvLyBMZWF2aW5nIHNhbml0eSBjaGVja3Mgb24gdGhpcyB0byB0aGUgQVBJIGNvbnN1bWVyIHRoYXQgbWF5IGtub3cgbW9yZSBhYm91dCB0aGVcbiAgICAvLyBtZWFuaW5nIGluIHRoZWlyIG93biBjb250ZXh0LlxuXG4gICAgaWYgKG1pbmUuaW5kZXggfHwgdGhlaXJzLmluZGV4KSB7XG4gICAgICByZXQuaW5kZXggPSBtaW5lLmluZGV4IHx8IHRoZWlycy5pbmRleDtcbiAgICB9XG5cbiAgICBpZiAobWluZS5uZXdGaWxlTmFtZSB8fCB0aGVpcnMubmV3RmlsZU5hbWUpIHtcbiAgICAgIGlmICghZmlsZU5hbWVDaGFuZ2VkKG1pbmUpKSB7XG4gICAgICAgIC8vIE5vIGhlYWRlciBvciBubyBjaGFuZ2UgaW4gb3VycywgdXNlIHRoZWlycyAoYW5kIG91cnMgaWYgdGhlaXJzIGRvZXMgbm90IGV4aXN0KVxuICAgICAgICByZXQub2xkRmlsZU5hbWUgPSB0aGVpcnMub2xkRmlsZU5hbWUgfHwgbWluZS5vbGRGaWxlTmFtZTtcbiAgICAgICAgcmV0Lm5ld0ZpbGVOYW1lID0gdGhlaXJzLm5ld0ZpbGVOYW1lIHx8IG1pbmUubmV3RmlsZU5hbWU7XG4gICAgICAgIHJldC5vbGRIZWFkZXIgPSB0aGVpcnMub2xkSGVhZGVyIHx8IG1pbmUub2xkSGVhZGVyO1xuICAgICAgICByZXQubmV3SGVhZGVyID0gdGhlaXJzLm5ld0hlYWRlciB8fCBtaW5lLm5ld0hlYWRlcjtcbiAgICAgIH0gZWxzZSBpZiAoIWZpbGVOYW1lQ2hhbmdlZCh0aGVpcnMpKSB7XG4gICAgICAgIC8vIE5vIGhlYWRlciBvciBubyBjaGFuZ2UgaW4gdGhlaXJzLCB1c2Ugb3Vyc1xuICAgICAgICByZXQub2xkRmlsZU5hbWUgPSBtaW5lLm9sZEZpbGVOYW1lO1xuICAgICAgICByZXQubmV3RmlsZU5hbWUgPSBtaW5lLm5ld0ZpbGVOYW1lO1xuICAgICAgICByZXQub2xkSGVhZGVyID0gbWluZS5vbGRIZWFkZXI7XG4gICAgICAgIHJldC5uZXdIZWFkZXIgPSBtaW5lLm5ld0hlYWRlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJvdGggY2hhbmdlZC4uLiBmaWd1cmUgaXQgb3V0XG4gICAgICAgIHJldC5vbGRGaWxlTmFtZSA9IHNlbGVjdEZpZWxkKHJldCwgbWluZS5vbGRGaWxlTmFtZSwgdGhlaXJzLm9sZEZpbGVOYW1lKTtcbiAgICAgICAgcmV0Lm5ld0ZpbGVOYW1lID0gc2VsZWN0RmllbGQocmV0LCBtaW5lLm5ld0ZpbGVOYW1lLCB0aGVpcnMubmV3RmlsZU5hbWUpO1xuICAgICAgICByZXQub2xkSGVhZGVyID0gc2VsZWN0RmllbGQocmV0LCBtaW5lLm9sZEhlYWRlciwgdGhlaXJzLm9sZEhlYWRlcik7XG4gICAgICAgIHJldC5uZXdIZWFkZXIgPSBzZWxlY3RGaWVsZChyZXQsIG1pbmUubmV3SGVhZGVyLCB0aGVpcnMubmV3SGVhZGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXQuaHVua3MgPSBbXTtcbiAgICB2YXIgbWluZUluZGV4ID0gMCxcbiAgICAgICAgdGhlaXJzSW5kZXggPSAwLFxuICAgICAgICBtaW5lT2Zmc2V0ID0gMCxcbiAgICAgICAgdGhlaXJzT2Zmc2V0ID0gMDtcblxuICAgIHdoaWxlIChtaW5lSW5kZXggPCBtaW5lLmh1bmtzLmxlbmd0aCB8fCB0aGVpcnNJbmRleCA8IHRoZWlycy5odW5rcy5sZW5ndGgpIHtcbiAgICAgIHZhciBtaW5lQ3VycmVudCA9IG1pbmUuaHVua3NbbWluZUluZGV4XSB8fCB7XG4gICAgICAgIG9sZFN0YXJ0OiBJbmZpbml0eVxuICAgICAgfSxcbiAgICAgICAgICB0aGVpcnNDdXJyZW50ID0gdGhlaXJzLmh1bmtzW3RoZWlyc0luZGV4XSB8fCB7XG4gICAgICAgIG9sZFN0YXJ0OiBJbmZpbml0eVxuICAgICAgfTtcblxuICAgICAgaWYgKGh1bmtCZWZvcmUobWluZUN1cnJlbnQsIHRoZWlyc0N1cnJlbnQpKSB7XG4gICAgICAgIC8vIFRoaXMgcGF0Y2ggZG9lcyBub3Qgb3ZlcmxhcCB3aXRoIGFueSBvZiB0aGUgb3RoZXJzLCB5YXkuXG4gICAgICAgIHJldC5odW5rcy5wdXNoKGNsb25lSHVuayhtaW5lQ3VycmVudCwgbWluZU9mZnNldCkpO1xuICAgICAgICBtaW5lSW5kZXgrKztcbiAgICAgICAgdGhlaXJzT2Zmc2V0ICs9IG1pbmVDdXJyZW50Lm5ld0xpbmVzIC0gbWluZUN1cnJlbnQub2xkTGluZXM7XG4gICAgICB9IGVsc2UgaWYgKGh1bmtCZWZvcmUodGhlaXJzQ3VycmVudCwgbWluZUN1cnJlbnQpKSB7XG4gICAgICAgIC8vIFRoaXMgcGF0Y2ggZG9lcyBub3Qgb3ZlcmxhcCB3aXRoIGFueSBvZiB0aGUgb3RoZXJzLCB5YXkuXG4gICAgICAgIHJldC5odW5rcy5wdXNoKGNsb25lSHVuayh0aGVpcnNDdXJyZW50LCB0aGVpcnNPZmZzZXQpKTtcbiAgICAgICAgdGhlaXJzSW5kZXgrKztcbiAgICAgICAgbWluZU9mZnNldCArPSB0aGVpcnNDdXJyZW50Lm5ld0xpbmVzIC0gdGhlaXJzQ3VycmVudC5vbGRMaW5lcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE92ZXJsYXAsIG1lcmdlIGFzIGJlc3Qgd2UgY2FuXG4gICAgICAgIHZhciBtZXJnZWRIdW5rID0ge1xuICAgICAgICAgIG9sZFN0YXJ0OiBNYXRoLm1pbihtaW5lQ3VycmVudC5vbGRTdGFydCwgdGhlaXJzQ3VycmVudC5vbGRTdGFydCksXG4gICAgICAgICAgb2xkTGluZXM6IDAsXG4gICAgICAgICAgbmV3U3RhcnQ6IE1hdGgubWluKG1pbmVDdXJyZW50Lm5ld1N0YXJ0ICsgbWluZU9mZnNldCwgdGhlaXJzQ3VycmVudC5vbGRTdGFydCArIHRoZWlyc09mZnNldCksXG4gICAgICAgICAgbmV3TGluZXM6IDAsXG4gICAgICAgICAgbGluZXM6IFtdXG4gICAgICAgIH07XG4gICAgICAgIG1lcmdlTGluZXMobWVyZ2VkSHVuaywgbWluZUN1cnJlbnQub2xkU3RhcnQsIG1pbmVDdXJyZW50LmxpbmVzLCB0aGVpcnNDdXJyZW50Lm9sZFN0YXJ0LCB0aGVpcnNDdXJyZW50LmxpbmVzKTtcbiAgICAgICAgdGhlaXJzSW5kZXgrKztcbiAgICAgICAgbWluZUluZGV4Kys7XG4gICAgICAgIHJldC5odW5rcy5wdXNoKG1lcmdlZEh1bmspO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBmdW5jdGlvbiBsb2FkUGF0Y2gocGFyYW0sIGJhc2UpIHtcbiAgICBpZiAodHlwZW9mIHBhcmFtID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKC9eQEAvbS50ZXN0KHBhcmFtKSB8fCAvXkluZGV4Oi9tLnRlc3QocGFyYW0pKSB7XG4gICAgICAgIHJldHVybiBwYXJzZVBhdGNoKHBhcmFtKVswXTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFiYXNlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTXVzdCBwcm92aWRlIGEgYmFzZSByZWZlcmVuY2Ugb3IgcGFzcyBpbiBhIHBhdGNoJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdHJ1Y3R1cmVkUGF0Y2godW5kZWZpbmVkLCB1bmRlZmluZWQsIGJhc2UsIHBhcmFtKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyYW07XG4gIH1cblxuICBmdW5jdGlvbiBmaWxlTmFtZUNoYW5nZWQocGF0Y2gpIHtcbiAgICByZXR1cm4gcGF0Y2gubmV3RmlsZU5hbWUgJiYgcGF0Y2gubmV3RmlsZU5hbWUgIT09IHBhdGNoLm9sZEZpbGVOYW1lO1xuICB9XG5cbiAgZnVuY3Rpb24gc2VsZWN0RmllbGQoaW5kZXgsIG1pbmUsIHRoZWlycykge1xuICAgIGlmIChtaW5lID09PSB0aGVpcnMpIHtcbiAgICAgIHJldHVybiBtaW5lO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbmRleC5jb25mbGljdCA9IHRydWU7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtaW5lOiBtaW5lLFxuICAgICAgICB0aGVpcnM6IHRoZWlyc1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBodW5rQmVmb3JlKHRlc3QsIGNoZWNrKSB7XG4gICAgcmV0dXJuIHRlc3Qub2xkU3RhcnQgPCBjaGVjay5vbGRTdGFydCAmJiB0ZXN0Lm9sZFN0YXJ0ICsgdGVzdC5vbGRMaW5lcyA8IGNoZWNrLm9sZFN0YXJ0O1xuICB9XG5cbiAgZnVuY3Rpb24gY2xvbmVIdW5rKGh1bmssIG9mZnNldCkge1xuICAgIHJldHVybiB7XG4gICAgICBvbGRTdGFydDogaHVuay5vbGRTdGFydCxcbiAgICAgIG9sZExpbmVzOiBodW5rLm9sZExpbmVzLFxuICAgICAgbmV3U3RhcnQ6IGh1bmsubmV3U3RhcnQgKyBvZmZzZXQsXG4gICAgICBuZXdMaW5lczogaHVuay5uZXdMaW5lcyxcbiAgICAgIGxpbmVzOiBodW5rLmxpbmVzXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1lcmdlTGluZXMoaHVuaywgbWluZU9mZnNldCwgbWluZUxpbmVzLCB0aGVpck9mZnNldCwgdGhlaXJMaW5lcykge1xuICAgIC8vIFRoaXMgd2lsbCBnZW5lcmFsbHkgcmVzdWx0IGluIGEgY29uZmxpY3RlZCBodW5rLCBidXQgdGhlcmUgYXJlIGNhc2VzIHdoZXJlIHRoZSBjb250ZXh0XG4gICAgLy8gaXMgdGhlIG9ubHkgb3ZlcmxhcCB3aGVyZSB3ZSBjYW4gc3VjY2Vzc2Z1bGx5IG1lcmdlIHRoZSBjb250ZW50IGhlcmUuXG4gICAgdmFyIG1pbmUgPSB7XG4gICAgICBvZmZzZXQ6IG1pbmVPZmZzZXQsXG4gICAgICBsaW5lczogbWluZUxpbmVzLFxuICAgICAgaW5kZXg6IDBcbiAgICB9LFxuICAgICAgICB0aGVpciA9IHtcbiAgICAgIG9mZnNldDogdGhlaXJPZmZzZXQsXG4gICAgICBsaW5lczogdGhlaXJMaW5lcyxcbiAgICAgIGluZGV4OiAwXG4gICAgfTsgLy8gSGFuZGxlIGFueSBsZWFkaW5nIGNvbnRlbnRcblxuICAgIGluc2VydExlYWRpbmcoaHVuaywgbWluZSwgdGhlaXIpO1xuICAgIGluc2VydExlYWRpbmcoaHVuaywgdGhlaXIsIG1pbmUpOyAvLyBOb3cgaW4gdGhlIG92ZXJsYXAgY29udGVudC4gU2NhbiB0aHJvdWdoIGFuZCBzZWxlY3QgdGhlIGJlc3QgY2hhbmdlcyBmcm9tIGVhY2guXG5cbiAgICB3aGlsZSAobWluZS5pbmRleCA8IG1pbmUubGluZXMubGVuZ3RoICYmIHRoZWlyLmluZGV4IDwgdGhlaXIubGluZXMubGVuZ3RoKSB7XG4gICAgICB2YXIgbWluZUN1cnJlbnQgPSBtaW5lLmxpbmVzW21pbmUuaW5kZXhdLFxuICAgICAgICAgIHRoZWlyQ3VycmVudCA9IHRoZWlyLmxpbmVzW3RoZWlyLmluZGV4XTtcblxuICAgICAgaWYgKChtaW5lQ3VycmVudFswXSA9PT0gJy0nIHx8IG1pbmVDdXJyZW50WzBdID09PSAnKycpICYmICh0aGVpckN1cnJlbnRbMF0gPT09ICctJyB8fCB0aGVpckN1cnJlbnRbMF0gPT09ICcrJykpIHtcbiAgICAgICAgLy8gQm90aCBtb2RpZmllZCAuLi5cbiAgICAgICAgbXV0dWFsQ2hhbmdlKGh1bmssIG1pbmUsIHRoZWlyKTtcbiAgICAgIH0gZWxzZSBpZiAobWluZUN1cnJlbnRbMF0gPT09ICcrJyAmJiB0aGVpckN1cnJlbnRbMF0gPT09ICcgJykge1xuICAgICAgICB2YXIgX2h1bmskbGluZXM7XG5cbiAgICAgICAgLy8gTWluZSBpbnNlcnRlZFxuICAgICAgICAoX2h1bmskbGluZXMgPSBodW5rLmxpbmVzKS5wdXNoLmFwcGx5KF9odW5rJGxpbmVzLCBfdG9Db25zdW1hYmxlQXJyYXkoY29sbGVjdENoYW5nZShtaW5lKSkpO1xuICAgICAgfSBlbHNlIGlmICh0aGVpckN1cnJlbnRbMF0gPT09ICcrJyAmJiBtaW5lQ3VycmVudFswXSA9PT0gJyAnKSB7XG4gICAgICAgIHZhciBfaHVuayRsaW5lczI7XG5cbiAgICAgICAgLy8gVGhlaXJzIGluc2VydGVkXG4gICAgICAgIChfaHVuayRsaW5lczIgPSBodW5rLmxpbmVzKS5wdXNoLmFwcGx5KF9odW5rJGxpbmVzMiwgX3RvQ29uc3VtYWJsZUFycmF5KGNvbGxlY3RDaGFuZ2UodGhlaXIpKSk7XG4gICAgICB9IGVsc2UgaWYgKG1pbmVDdXJyZW50WzBdID09PSAnLScgJiYgdGhlaXJDdXJyZW50WzBdID09PSAnICcpIHtcbiAgICAgICAgLy8gTWluZSByZW1vdmVkIG9yIGVkaXRlZFxuICAgICAgICByZW1vdmFsKGh1bmssIG1pbmUsIHRoZWlyKTtcbiAgICAgIH0gZWxzZSBpZiAodGhlaXJDdXJyZW50WzBdID09PSAnLScgJiYgbWluZUN1cnJlbnRbMF0gPT09ICcgJykge1xuICAgICAgICAvLyBUaGVpciByZW1vdmVkIG9yIGVkaXRlZFxuICAgICAgICByZW1vdmFsKGh1bmssIHRoZWlyLCBtaW5lLCB0cnVlKTtcbiAgICAgIH0gZWxzZSBpZiAobWluZUN1cnJlbnQgPT09IHRoZWlyQ3VycmVudCkge1xuICAgICAgICAvLyBDb250ZXh0IGlkZW50aXR5XG4gICAgICAgIGh1bmsubGluZXMucHVzaChtaW5lQ3VycmVudCk7XG4gICAgICAgIG1pbmUuaW5kZXgrKztcbiAgICAgICAgdGhlaXIuaW5kZXgrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENvbnRleHQgbWlzbWF0Y2hcbiAgICAgICAgY29uZmxpY3QoaHVuaywgY29sbGVjdENoYW5nZShtaW5lKSwgY29sbGVjdENoYW5nZSh0aGVpcikpO1xuICAgICAgfVxuICAgIH0gLy8gTm93IHB1c2ggYW55dGhpbmcgdGhhdCBtYXkgYmUgcmVtYWluaW5nXG5cblxuICAgIGluc2VydFRyYWlsaW5nKGh1bmssIG1pbmUpO1xuICAgIGluc2VydFRyYWlsaW5nKGh1bmssIHRoZWlyKTtcbiAgICBjYWxjTGluZUNvdW50KGh1bmspO1xuICB9XG5cbiAgZnVuY3Rpb24gbXV0dWFsQ2hhbmdlKGh1bmssIG1pbmUsIHRoZWlyKSB7XG4gICAgdmFyIG15Q2hhbmdlcyA9IGNvbGxlY3RDaGFuZ2UobWluZSksXG4gICAgICAgIHRoZWlyQ2hhbmdlcyA9IGNvbGxlY3RDaGFuZ2UodGhlaXIpO1xuXG4gICAgaWYgKGFsbFJlbW92ZXMobXlDaGFuZ2VzKSAmJiBhbGxSZW1vdmVzKHRoZWlyQ2hhbmdlcykpIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgcmVtb3ZlIGNoYW5nZXMgdGhhdCBhcmUgc3VwZXJzZXRzIG9mIG9uZSBhbm90aGVyXG4gICAgICBpZiAoYXJyYXlTdGFydHNXaXRoKG15Q2hhbmdlcywgdGhlaXJDaGFuZ2VzKSAmJiBza2lwUmVtb3ZlU3VwZXJzZXQodGhlaXIsIG15Q2hhbmdlcywgbXlDaGFuZ2VzLmxlbmd0aCAtIHRoZWlyQ2hhbmdlcy5sZW5ndGgpKSB7XG4gICAgICAgIHZhciBfaHVuayRsaW5lczM7XG5cbiAgICAgICAgKF9odW5rJGxpbmVzMyA9IGh1bmsubGluZXMpLnB1c2guYXBwbHkoX2h1bmskbGluZXMzLCBfdG9Db25zdW1hYmxlQXJyYXkobXlDaGFuZ2VzKSk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmIChhcnJheVN0YXJ0c1dpdGgodGhlaXJDaGFuZ2VzLCBteUNoYW5nZXMpICYmIHNraXBSZW1vdmVTdXBlcnNldChtaW5lLCB0aGVpckNoYW5nZXMsIHRoZWlyQ2hhbmdlcy5sZW5ndGggLSBteUNoYW5nZXMubGVuZ3RoKSkge1xuICAgICAgICB2YXIgX2h1bmskbGluZXM0O1xuXG4gICAgICAgIChfaHVuayRsaW5lczQgPSBodW5rLmxpbmVzKS5wdXNoLmFwcGx5KF9odW5rJGxpbmVzNCwgX3RvQ29uc3VtYWJsZUFycmF5KHRoZWlyQ2hhbmdlcykpO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFycmF5RXF1YWwobXlDaGFuZ2VzLCB0aGVpckNoYW5nZXMpKSB7XG4gICAgICB2YXIgX2h1bmskbGluZXM1O1xuXG4gICAgICAoX2h1bmskbGluZXM1ID0gaHVuay5saW5lcykucHVzaC5hcHBseShfaHVuayRsaW5lczUsIF90b0NvbnN1bWFibGVBcnJheShteUNoYW5nZXMpKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbmZsaWN0KGh1bmssIG15Q2hhbmdlcywgdGhlaXJDaGFuZ2VzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92YWwoaHVuaywgbWluZSwgdGhlaXIsIHN3YXApIHtcbiAgICB2YXIgbXlDaGFuZ2VzID0gY29sbGVjdENoYW5nZShtaW5lKSxcbiAgICAgICAgdGhlaXJDaGFuZ2VzID0gY29sbGVjdENvbnRleHQodGhlaXIsIG15Q2hhbmdlcyk7XG5cbiAgICBpZiAodGhlaXJDaGFuZ2VzLm1lcmdlZCkge1xuICAgICAgdmFyIF9odW5rJGxpbmVzNjtcblxuICAgICAgKF9odW5rJGxpbmVzNiA9IGh1bmsubGluZXMpLnB1c2guYXBwbHkoX2h1bmskbGluZXM2LCBfdG9Db25zdW1hYmxlQXJyYXkodGhlaXJDaGFuZ2VzLm1lcmdlZCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25mbGljdChodW5rLCBzd2FwID8gdGhlaXJDaGFuZ2VzIDogbXlDaGFuZ2VzLCBzd2FwID8gbXlDaGFuZ2VzIDogdGhlaXJDaGFuZ2VzKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjb25mbGljdChodW5rLCBtaW5lLCB0aGVpcikge1xuICAgIGh1bmsuY29uZmxpY3QgPSB0cnVlO1xuICAgIGh1bmsubGluZXMucHVzaCh7XG4gICAgICBjb25mbGljdDogdHJ1ZSxcbiAgICAgIG1pbmU6IG1pbmUsXG4gICAgICB0aGVpcnM6IHRoZWlyXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBpbnNlcnRMZWFkaW5nKGh1bmssIGluc2VydCwgdGhlaXIpIHtcbiAgICB3aGlsZSAoaW5zZXJ0Lm9mZnNldCA8IHRoZWlyLm9mZnNldCAmJiBpbnNlcnQuaW5kZXggPCBpbnNlcnQubGluZXMubGVuZ3RoKSB7XG4gICAgICB2YXIgbGluZSA9IGluc2VydC5saW5lc1tpbnNlcnQuaW5kZXgrK107XG4gICAgICBodW5rLmxpbmVzLnB1c2gobGluZSk7XG4gICAgICBpbnNlcnQub2Zmc2V0Kys7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5zZXJ0VHJhaWxpbmcoaHVuaywgaW5zZXJ0KSB7XG4gICAgd2hpbGUgKGluc2VydC5pbmRleCA8IGluc2VydC5saW5lcy5sZW5ndGgpIHtcbiAgICAgIHZhciBsaW5lID0gaW5zZXJ0LmxpbmVzW2luc2VydC5pbmRleCsrXTtcbiAgICAgIGh1bmsubGluZXMucHVzaChsaW5lKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjb2xsZWN0Q2hhbmdlKHN0YXRlKSB7XG4gICAgdmFyIHJldCA9IFtdLFxuICAgICAgICBvcGVyYXRpb24gPSBzdGF0ZS5saW5lc1tzdGF0ZS5pbmRleF1bMF07XG5cbiAgICB3aGlsZSAoc3RhdGUuaW5kZXggPCBzdGF0ZS5saW5lcy5sZW5ndGgpIHtcbiAgICAgIHZhciBsaW5lID0gc3RhdGUubGluZXNbc3RhdGUuaW5kZXhdOyAvLyBHcm91cCBhZGRpdGlvbnMgdGhhdCBhcmUgaW1tZWRpYXRlbHkgYWZ0ZXIgc3VidHJhY3Rpb25zIGFuZCB0cmVhdCB0aGVtIGFzIG9uZSBcImF0b21pY1wiIG1vZGlmeSBjaGFuZ2UuXG5cbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICctJyAmJiBsaW5lWzBdID09PSAnKycpIHtcbiAgICAgICAgb3BlcmF0aW9uID0gJysnO1xuICAgICAgfVxuXG4gICAgICBpZiAob3BlcmF0aW9uID09PSBsaW5lWzBdKSB7XG4gICAgICAgIHJldC5wdXNoKGxpbmUpO1xuICAgICAgICBzdGF0ZS5pbmRleCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbGxlY3RDb250ZXh0KHN0YXRlLCBtYXRjaENoYW5nZXMpIHtcbiAgICB2YXIgY2hhbmdlcyA9IFtdLFxuICAgICAgICBtZXJnZWQgPSBbXSxcbiAgICAgICAgbWF0Y2hJbmRleCA9IDAsXG4gICAgICAgIGNvbnRleHRDaGFuZ2VzID0gZmFsc2UsXG4gICAgICAgIGNvbmZsaWN0ZWQgPSBmYWxzZTtcblxuICAgIHdoaWxlIChtYXRjaEluZGV4IDwgbWF0Y2hDaGFuZ2VzLmxlbmd0aCAmJiBzdGF0ZS5pbmRleCA8IHN0YXRlLmxpbmVzLmxlbmd0aCkge1xuICAgICAgdmFyIGNoYW5nZSA9IHN0YXRlLmxpbmVzW3N0YXRlLmluZGV4XSxcbiAgICAgICAgICBtYXRjaCA9IG1hdGNoQ2hhbmdlc1ttYXRjaEluZGV4XTsgLy8gT25jZSB3ZSd2ZSBoaXQgb3VyIGFkZCwgdGhlbiB3ZSBhcmUgZG9uZVxuXG4gICAgICBpZiAobWF0Y2hbMF0gPT09ICcrJykge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY29udGV4dENoYW5nZXMgPSBjb250ZXh0Q2hhbmdlcyB8fCBjaGFuZ2VbMF0gIT09ICcgJztcbiAgICAgIG1lcmdlZC5wdXNoKG1hdGNoKTtcbiAgICAgIG1hdGNoSW5kZXgrKzsgLy8gQ29uc3VtZSBhbnkgYWRkaXRpb25zIGluIHRoZSBvdGhlciBibG9jayBhcyBhIGNvbmZsaWN0IHRvIGF0dGVtcHRcbiAgICAgIC8vIHRvIHB1bGwgaW4gdGhlIHJlbWFpbmluZyBjb250ZXh0IGFmdGVyIHRoaXNcblxuICAgICAgaWYgKGNoYW5nZVswXSA9PT0gJysnKSB7XG4gICAgICAgIGNvbmZsaWN0ZWQgPSB0cnVlO1xuXG4gICAgICAgIHdoaWxlIChjaGFuZ2VbMF0gPT09ICcrJykge1xuICAgICAgICAgIGNoYW5nZXMucHVzaChjaGFuZ2UpO1xuICAgICAgICAgIGNoYW5nZSA9IHN0YXRlLmxpbmVzWysrc3RhdGUuaW5kZXhdO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChtYXRjaC5zdWJzdHIoMSkgPT09IGNoYW5nZS5zdWJzdHIoMSkpIHtcbiAgICAgICAgY2hhbmdlcy5wdXNoKGNoYW5nZSk7XG4gICAgICAgIHN0YXRlLmluZGV4Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25mbGljdGVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKG1hdGNoQ2hhbmdlc1ttYXRjaEluZGV4XSB8fCAnJylbMF0gPT09ICcrJyAmJiBjb250ZXh0Q2hhbmdlcykge1xuICAgICAgY29uZmxpY3RlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZsaWN0ZWQpIHtcbiAgICAgIHJldHVybiBjaGFuZ2VzO1xuICAgIH1cblxuICAgIHdoaWxlIChtYXRjaEluZGV4IDwgbWF0Y2hDaGFuZ2VzLmxlbmd0aCkge1xuICAgICAgbWVyZ2VkLnB1c2gobWF0Y2hDaGFuZ2VzW21hdGNoSW5kZXgrK10pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBtZXJnZWQ6IG1lcmdlZCxcbiAgICAgIGNoYW5nZXM6IGNoYW5nZXNcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gYWxsUmVtb3ZlcyhjaGFuZ2VzKSB7XG4gICAgcmV0dXJuIGNoYW5nZXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjaGFuZ2UpIHtcbiAgICAgIHJldHVybiBwcmV2ICYmIGNoYW5nZVswXSA9PT0gJy0nO1xuICAgIH0sIHRydWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2tpcFJlbW92ZVN1cGVyc2V0KHN0YXRlLCByZW1vdmVDaGFuZ2VzLCBkZWx0YSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGVsdGE7IGkrKykge1xuICAgICAgdmFyIGNoYW5nZUNvbnRlbnQgPSByZW1vdmVDaGFuZ2VzW3JlbW92ZUNoYW5nZXMubGVuZ3RoIC0gZGVsdGEgKyBpXS5zdWJzdHIoMSk7XG5cbiAgICAgIGlmIChzdGF0ZS5saW5lc1tzdGF0ZS5pbmRleCArIGldICE9PSAnICcgKyBjaGFuZ2VDb250ZW50KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzdGF0ZS5pbmRleCArPSBkZWx0YTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbGNPbGROZXdMaW5lQ291bnQobGluZXMpIHtcbiAgICB2YXIgb2xkTGluZXMgPSAwO1xuICAgIHZhciBuZXdMaW5lcyA9IDA7XG4gICAgbGluZXMuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgICAgaWYgKHR5cGVvZiBsaW5lICE9PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgbXlDb3VudCA9IGNhbGNPbGROZXdMaW5lQ291bnQobGluZS5taW5lKTtcbiAgICAgICAgdmFyIHRoZWlyQ291bnQgPSBjYWxjT2xkTmV3TGluZUNvdW50KGxpbmUudGhlaXJzKTtcblxuICAgICAgICBpZiAob2xkTGluZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChteUNvdW50Lm9sZExpbmVzID09PSB0aGVpckNvdW50Lm9sZExpbmVzKSB7XG4gICAgICAgICAgICBvbGRMaW5lcyArPSBteUNvdW50Lm9sZExpbmVzO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvbGRMaW5lcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV3TGluZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChteUNvdW50Lm5ld0xpbmVzID09PSB0aGVpckNvdW50Lm5ld0xpbmVzKSB7XG4gICAgICAgICAgICBuZXdMaW5lcyArPSBteUNvdW50Lm5ld0xpbmVzO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXdMaW5lcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChuZXdMaW5lcyAhPT0gdW5kZWZpbmVkICYmIChsaW5lWzBdID09PSAnKycgfHwgbGluZVswXSA9PT0gJyAnKSkge1xuICAgICAgICAgIG5ld0xpbmVzKys7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob2xkTGluZXMgIT09IHVuZGVmaW5lZCAmJiAobGluZVswXSA9PT0gJy0nIHx8IGxpbmVbMF0gPT09ICcgJykpIHtcbiAgICAgICAgICBvbGRMaW5lcysrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9sZExpbmVzOiBvbGRMaW5lcyxcbiAgICAgIG5ld0xpbmVzOiBuZXdMaW5lc1xuICAgIH07XG4gIH1cblxuICAvLyBTZWU6IGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9nb29nbGUtZGlmZi1tYXRjaC1wYXRjaC93aWtpL0FQSVxuICBmdW5jdGlvbiBjb252ZXJ0Q2hhbmdlc1RvRE1QKGNoYW5nZXMpIHtcbiAgICB2YXIgcmV0ID0gW10sXG4gICAgICAgIGNoYW5nZSxcbiAgICAgICAgb3BlcmF0aW9uO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGFuZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFuZ2UgPSBjaGFuZ2VzW2ldO1xuXG4gICAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICAgIG9wZXJhdGlvbiA9IDE7XG4gICAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICAgIG9wZXJhdGlvbiA9IC0xO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3BlcmF0aW9uID0gMDtcbiAgICAgIH1cblxuICAgICAgcmV0LnB1c2goW29wZXJhdGlvbiwgY2hhbmdlLnZhbHVlXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnZlcnRDaGFuZ2VzVG9YTUwoY2hhbmdlcykge1xuICAgIHZhciByZXQgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNoYW5nZSA9IGNoYW5nZXNbaV07XG5cbiAgICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgICAgcmV0LnB1c2goJzxpbnM+Jyk7XG4gICAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICAgIHJldC5wdXNoKCc8ZGVsPicpO1xuICAgICAgfVxuXG4gICAgICByZXQucHVzaChlc2NhcGVIVE1MKGNoYW5nZS52YWx1ZSkpO1xuXG4gICAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICAgIHJldC5wdXNoKCc8L2lucz4nKTtcbiAgICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgICAgcmV0LnB1c2goJzwvZGVsPicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXQuam9pbignJyk7XG4gIH1cblxuICBmdW5jdGlvbiBlc2NhcGVIVE1MKHMpIHtcbiAgICB2YXIgbiA9IHM7XG4gICAgbiA9IG4ucmVwbGFjZSgvJi9nLCAnJmFtcDsnKTtcbiAgICBuID0gbi5yZXBsYWNlKC88L2csICcmbHQ7Jyk7XG4gICAgbiA9IG4ucmVwbGFjZSgvPi9nLCAnJmd0OycpO1xuICAgIG4gPSBuLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcbiAgICByZXR1cm4gbjtcbiAgfVxuXG4gIC8qIFNlZSBMSUNFTlNFIGZpbGUgZm9yIHRlcm1zIG9mIHVzZSAqL1xuXG4gIGV4cG9ydHMuRGlmZiA9IERpZmY7XG4gIGV4cG9ydHMuZGlmZkNoYXJzID0gZGlmZkNoYXJzO1xuICBleHBvcnRzLmRpZmZXb3JkcyA9IGRpZmZXb3JkcztcbiAgZXhwb3J0cy5kaWZmV29yZHNXaXRoU3BhY2UgPSBkaWZmV29yZHNXaXRoU3BhY2U7XG4gIGV4cG9ydHMuZGlmZkxpbmVzID0gZGlmZkxpbmVzO1xuICBleHBvcnRzLmRpZmZUcmltbWVkTGluZXMgPSBkaWZmVHJpbW1lZExpbmVzO1xuICBleHBvcnRzLmRpZmZTZW50ZW5jZXMgPSBkaWZmU2VudGVuY2VzO1xuICBleHBvcnRzLmRpZmZDc3MgPSBkaWZmQ3NzO1xuICBleHBvcnRzLmRpZmZKc29uID0gZGlmZkpzb247XG4gIGV4cG9ydHMuZGlmZkFycmF5cyA9IGRpZmZBcnJheXM7XG4gIGV4cG9ydHMuc3RydWN0dXJlZFBhdGNoID0gc3RydWN0dXJlZFBhdGNoO1xuICBleHBvcnRzLmNyZWF0ZVR3b0ZpbGVzUGF0Y2ggPSBjcmVhdGVUd29GaWxlc1BhdGNoO1xuICBleHBvcnRzLmNyZWF0ZVBhdGNoID0gY3JlYXRlUGF0Y2g7XG4gIGV4cG9ydHMuYXBwbHlQYXRjaCA9IGFwcGx5UGF0Y2g7XG4gIGV4cG9ydHMuYXBwbHlQYXRjaGVzID0gYXBwbHlQYXRjaGVzO1xuICBleHBvcnRzLnBhcnNlUGF0Y2ggPSBwYXJzZVBhdGNoO1xuICBleHBvcnRzLm1lcmdlID0gbWVyZ2U7XG4gIGV4cG9ydHMuY29udmVydENoYW5nZXNUb0RNUCA9IGNvbnZlcnRDaGFuZ2VzVG9ETVA7XG4gIGV4cG9ydHMuY29udmVydENoYW5nZXNUb1hNTCA9IGNvbnZlcnRDaGFuZ2VzVG9YTUw7XG4gIGV4cG9ydHMuY2Fub25pY2FsaXplID0gY2Fub25pY2FsaXplO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsc1xuXHRBdG9taWNzLFxuXHRTaGFyZWRBcnJheUJ1ZmZlcixcbiovXG5cbnZhciB1bmRlZmluZWQ7XG5cbnZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuXG52YXIgJGdPUEQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xuaWYgKCRnT1BEKSB7XG5cdHRyeSB7XG5cdFx0JGdPUEQoe30sICcnKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdCRnT1BEID0gbnVsbDsgLy8gdGhpcyBpcyBJRSA4LCB3aGljaCBoYXMgYSBicm9rZW4gZ09QRFxuXHR9XG59XG5cbnZhciB0aHJvd1R5cGVFcnJvciA9IGZ1bmN0aW9uICgpIHsgdGhyb3cgbmV3ICRUeXBlRXJyb3IoKTsgfTtcbnZhciBUaHJvd1R5cGVFcnJvciA9ICRnT1BEXG5cdD8gKGZ1bmN0aW9uICgpIHtcblx0XHR0cnkge1xuXHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC1leHByZXNzaW9ucywgbm8tY2FsbGVyLCBuby1yZXN0cmljdGVkLXByb3BlcnRpZXNcblx0XHRcdGFyZ3VtZW50cy5jYWxsZWU7IC8vIElFIDggZG9lcyBub3QgdGhyb3cgaGVyZVxuXHRcdFx0cmV0dXJuIHRocm93VHlwZUVycm9yO1xuXHRcdH0gY2F0Y2ggKGNhbGxlZVRocm93cykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Ly8gSUUgOCB0aHJvd3Mgb24gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihhcmd1bWVudHMsICcnKVxuXHRcdFx0XHRyZXR1cm4gJGdPUEQoYXJndW1lbnRzLCAnY2FsbGVlJykuZ2V0O1xuXHRcdFx0fSBjYXRjaCAoZ09QRHRocm93cykge1xuXHRcdFx0XHRyZXR1cm4gdGhyb3dUeXBlRXJyb3I7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KCkpXG5cdDogdGhyb3dUeXBlRXJyb3I7XG5cbnZhciBoYXNTeW1ib2xzID0gcmVxdWlyZSgnaGFzLXN5bWJvbHMnKSgpO1xuXG52YXIgZ2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHguX19wcm90b19fOyB9OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXByb3RvXG5cbnZhciBnZW5lcmF0b3I7IC8vID0gZnVuY3Rpb24gKiAoKSB7fTtcbnZhciBnZW5lcmF0b3JGdW5jdGlvbiA9IGdlbmVyYXRvciA/IGdldFByb3RvKGdlbmVyYXRvcikgOiB1bmRlZmluZWQ7XG52YXIgYXN5bmNGbjsgLy8gYXN5bmMgZnVuY3Rpb24oKSB7fTtcbnZhciBhc3luY0Z1bmN0aW9uID0gYXN5bmNGbiA/IGFzeW5jRm4uY29uc3RydWN0b3IgOiB1bmRlZmluZWQ7XG52YXIgYXN5bmNHZW47IC8vIGFzeW5jIGZ1bmN0aW9uICogKCkge307XG52YXIgYXN5bmNHZW5GdW5jdGlvbiA9IGFzeW5jR2VuID8gZ2V0UHJvdG8oYXN5bmNHZW4pIDogdW5kZWZpbmVkO1xudmFyIGFzeW5jR2VuSXRlcmF0b3IgPSBhc3luY0dlbiA/IGFzeW5jR2VuKCkgOiB1bmRlZmluZWQ7XG5cbnZhciBUeXBlZEFycmF5ID0gdHlwZW9mIFVpbnQ4QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogZ2V0UHJvdG8oVWludDhBcnJheSk7XG5cbnZhciBJTlRSSU5TSUNTID0ge1xuXHQnJUFycmF5JSc6IEFycmF5LFxuXHQnJUFycmF5QnVmZmVyJSc6IHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBBcnJheUJ1ZmZlcixcblx0JyVBcnJheUJ1ZmZlclByb3RvdHlwZSUnOiB0eXBlb2YgQXJyYXlCdWZmZXIgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogQXJyYXlCdWZmZXIucHJvdG90eXBlLFxuXHQnJUFycmF5SXRlcmF0b3JQcm90b3R5cGUlJzogaGFzU3ltYm9scyA/IGdldFByb3RvKFtdW1N5bWJvbC5pdGVyYXRvcl0oKSkgOiB1bmRlZmluZWQsXG5cdCclQXJyYXlQcm90b3R5cGUlJzogQXJyYXkucHJvdG90eXBlLFxuXHQnJUFycmF5UHJvdG9fZW50cmllcyUnOiBBcnJheS5wcm90b3R5cGUuZW50cmllcyxcblx0JyVBcnJheVByb3RvX2ZvckVhY2glJzogQXJyYXkucHJvdG90eXBlLmZvckVhY2gsXG5cdCclQXJyYXlQcm90b19rZXlzJSc6IEFycmF5LnByb3RvdHlwZS5rZXlzLFxuXHQnJUFycmF5UHJvdG9fdmFsdWVzJSc6IEFycmF5LnByb3RvdHlwZS52YWx1ZXMsXG5cdCclQXN5bmNGcm9tU3luY0l0ZXJhdG9yUHJvdG90eXBlJSc6IHVuZGVmaW5lZCxcblx0JyVBc3luY0Z1bmN0aW9uJSc6IGFzeW5jRnVuY3Rpb24sXG5cdCclQXN5bmNGdW5jdGlvblByb3RvdHlwZSUnOiBhc3luY0Z1bmN0aW9uID8gYXN5bmNGdW5jdGlvbi5wcm90b3R5cGUgOiB1bmRlZmluZWQsXG5cdCclQXN5bmNHZW5lcmF0b3IlJzogYXN5bmNHZW4gPyBnZXRQcm90byhhc3luY0dlbkl0ZXJhdG9yKSA6IHVuZGVmaW5lZCxcblx0JyVBc3luY0dlbmVyYXRvckZ1bmN0aW9uJSc6IGFzeW5jR2VuRnVuY3Rpb24sXG5cdCclQXN5bmNHZW5lcmF0b3JQcm90b3R5cGUlJzogYXN5bmNHZW5GdW5jdGlvbiA/IGFzeW5jR2VuRnVuY3Rpb24ucHJvdG90eXBlIDogdW5kZWZpbmVkLFxuXHQnJUFzeW5jSXRlcmF0b3JQcm90b3R5cGUlJzogYXN5bmNHZW5JdGVyYXRvciAmJiBoYXNTeW1ib2xzICYmIFN5bWJvbC5hc3luY0l0ZXJhdG9yID8gYXN5bmNHZW5JdGVyYXRvcltTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSA6IHVuZGVmaW5lZCxcblx0JyVBdG9taWNzJSc6IHR5cGVvZiBBdG9taWNzID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEF0b21pY3MsXG5cdCclQm9vbGVhbiUnOiBCb29sZWFuLFxuXHQnJUJvb2xlYW5Qcm90b3R5cGUlJzogQm9vbGVhbi5wcm90b3R5cGUsXG5cdCclRGF0YVZpZXclJzogdHlwZW9mIERhdGFWaWV3ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IERhdGFWaWV3LFxuXHQnJURhdGFWaWV3UHJvdG90eXBlJSc6IHR5cGVvZiBEYXRhVmlldyA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBEYXRhVmlldy5wcm90b3R5cGUsXG5cdCclRGF0ZSUnOiBEYXRlLFxuXHQnJURhdGVQcm90b3R5cGUlJzogRGF0ZS5wcm90b3R5cGUsXG5cdCclZGVjb2RlVVJJJSc6IGRlY29kZVVSSSxcblx0JyVkZWNvZGVVUklDb21wb25lbnQlJzogZGVjb2RlVVJJQ29tcG9uZW50LFxuXHQnJWVuY29kZVVSSSUnOiBlbmNvZGVVUkksXG5cdCclZW5jb2RlVVJJQ29tcG9uZW50JSc6IGVuY29kZVVSSUNvbXBvbmVudCxcblx0JyVFcnJvciUnOiBFcnJvcixcblx0JyVFcnJvclByb3RvdHlwZSUnOiBFcnJvci5wcm90b3R5cGUsXG5cdCclZXZhbCUnOiBldmFsLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWV2YWxcblx0JyVFdmFsRXJyb3IlJzogRXZhbEVycm9yLFxuXHQnJUV2YWxFcnJvclByb3RvdHlwZSUnOiBFdmFsRXJyb3IucHJvdG90eXBlLFxuXHQnJUZsb2F0MzJBcnJheSUnOiB0eXBlb2YgRmxvYXQzMkFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEZsb2F0MzJBcnJheSxcblx0JyVGbG9hdDMyQXJyYXlQcm90b3R5cGUlJzogdHlwZW9mIEZsb2F0MzJBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBGbG9hdDMyQXJyYXkucHJvdG90eXBlLFxuXHQnJUZsb2F0NjRBcnJheSUnOiB0eXBlb2YgRmxvYXQ2NEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEZsb2F0NjRBcnJheSxcblx0JyVGbG9hdDY0QXJyYXlQcm90b3R5cGUlJzogdHlwZW9mIEZsb2F0NjRBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBGbG9hdDY0QXJyYXkucHJvdG90eXBlLFxuXHQnJUZ1bmN0aW9uJSc6IEZ1bmN0aW9uLFxuXHQnJUZ1bmN0aW9uUHJvdG90eXBlJSc6IEZ1bmN0aW9uLnByb3RvdHlwZSxcblx0JyVHZW5lcmF0b3IlJzogZ2VuZXJhdG9yID8gZ2V0UHJvdG8oZ2VuZXJhdG9yKCkpIDogdW5kZWZpbmVkLFxuXHQnJUdlbmVyYXRvckZ1bmN0aW9uJSc6IGdlbmVyYXRvckZ1bmN0aW9uLFxuXHQnJUdlbmVyYXRvclByb3RvdHlwZSUnOiBnZW5lcmF0b3JGdW5jdGlvbiA/IGdlbmVyYXRvckZ1bmN0aW9uLnByb3RvdHlwZSA6IHVuZGVmaW5lZCxcblx0JyVJbnQ4QXJyYXklJzogdHlwZW9mIEludDhBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBJbnQ4QXJyYXksXG5cdCclSW50OEFycmF5UHJvdG90eXBlJSc6IHR5cGVvZiBJbnQ4QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogSW50OEFycmF5LnByb3RvdHlwZSxcblx0JyVJbnQxNkFycmF5JSc6IHR5cGVvZiBJbnQxNkFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEludDE2QXJyYXksXG5cdCclSW50MTZBcnJheVByb3RvdHlwZSUnOiB0eXBlb2YgSW50MTZBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBJbnQ4QXJyYXkucHJvdG90eXBlLFxuXHQnJUludDMyQXJyYXklJzogdHlwZW9mIEludDMyQXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogSW50MzJBcnJheSxcblx0JyVJbnQzMkFycmF5UHJvdG90eXBlJSc6IHR5cGVvZiBJbnQzMkFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEludDMyQXJyYXkucHJvdG90eXBlLFxuXHQnJWlzRmluaXRlJSc6IGlzRmluaXRlLFxuXHQnJWlzTmFOJSc6IGlzTmFOLFxuXHQnJUl0ZXJhdG9yUHJvdG90eXBlJSc6IGhhc1N5bWJvbHMgPyBnZXRQcm90byhnZXRQcm90byhbXVtTeW1ib2wuaXRlcmF0b3JdKCkpKSA6IHVuZGVmaW5lZCxcblx0JyVKU09OJSc6IHR5cGVvZiBKU09OID09PSAnb2JqZWN0JyA/IEpTT04gOiB1bmRlZmluZWQsXG5cdCclSlNPTlBhcnNlJSc6IHR5cGVvZiBKU09OID09PSAnb2JqZWN0JyA/IEpTT04ucGFyc2UgOiB1bmRlZmluZWQsXG5cdCclTWFwJSc6IHR5cGVvZiBNYXAgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogTWFwLFxuXHQnJU1hcEl0ZXJhdG9yUHJvdG90eXBlJSc6IHR5cGVvZiBNYXAgPT09ICd1bmRlZmluZWQnIHx8ICFoYXNTeW1ib2xzID8gdW5kZWZpbmVkIDogZ2V0UHJvdG8obmV3IE1hcCgpW1N5bWJvbC5pdGVyYXRvcl0oKSksXG5cdCclTWFwUHJvdG90eXBlJSc6IHR5cGVvZiBNYXAgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogTWFwLnByb3RvdHlwZSxcblx0JyVNYXRoJSc6IE1hdGgsXG5cdCclTnVtYmVyJSc6IE51bWJlcixcblx0JyVOdW1iZXJQcm90b3R5cGUlJzogTnVtYmVyLnByb3RvdHlwZSxcblx0JyVPYmplY3QlJzogT2JqZWN0LFxuXHQnJU9iamVjdFByb3RvdHlwZSUnOiBPYmplY3QucHJvdG90eXBlLFxuXHQnJU9ialByb3RvX3RvU3RyaW5nJSc6IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdCclT2JqUHJvdG9fdmFsdWVPZiUnOiBPYmplY3QucHJvdG90eXBlLnZhbHVlT2YsXG5cdCclcGFyc2VGbG9hdCUnOiBwYXJzZUZsb2F0LFxuXHQnJXBhcnNlSW50JSc6IHBhcnNlSW50LFxuXHQnJVByb21pc2UlJzogdHlwZW9mIFByb21pc2UgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUHJvbWlzZSxcblx0JyVQcm9taXNlUHJvdG90eXBlJSc6IHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFByb21pc2UucHJvdG90eXBlLFxuXHQnJVByb21pc2VQcm90b190aGVuJSc6IHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFByb21pc2UucHJvdG90eXBlLnRoZW4sXG5cdCclUHJvbWlzZV9hbGwlJzogdHlwZW9mIFByb21pc2UgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUHJvbWlzZS5hbGwsXG5cdCclUHJvbWlzZV9yZWplY3QlJzogdHlwZW9mIFByb21pc2UgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUHJvbWlzZS5yZWplY3QsXG5cdCclUHJvbWlzZV9yZXNvbHZlJSc6IHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFByb21pc2UucmVzb2x2ZSxcblx0JyVQcm94eSUnOiB0eXBlb2YgUHJveHkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUHJveHksXG5cdCclUmFuZ2VFcnJvciUnOiBSYW5nZUVycm9yLFxuXHQnJVJhbmdlRXJyb3JQcm90b3R5cGUlJzogUmFuZ2VFcnJvci5wcm90b3R5cGUsXG5cdCclUmVmZXJlbmNlRXJyb3IlJzogUmVmZXJlbmNlRXJyb3IsXG5cdCclUmVmZXJlbmNlRXJyb3JQcm90b3R5cGUlJzogUmVmZXJlbmNlRXJyb3IucHJvdG90eXBlLFxuXHQnJVJlZmxlY3QlJzogdHlwZW9mIFJlZmxlY3QgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUmVmbGVjdCxcblx0JyVSZWdFeHAlJzogUmVnRXhwLFxuXHQnJVJlZ0V4cFByb3RvdHlwZSUnOiBSZWdFeHAucHJvdG90eXBlLFxuXHQnJVNldCUnOiB0eXBlb2YgU2V0ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFNldCxcblx0JyVTZXRJdGVyYXRvclByb3RvdHlwZSUnOiB0eXBlb2YgU2V0ID09PSAndW5kZWZpbmVkJyB8fCAhaGFzU3ltYm9scyA/IHVuZGVmaW5lZCA6IGdldFByb3RvKG5ldyBTZXQoKVtTeW1ib2wuaXRlcmF0b3JdKCkpLFxuXHQnJVNldFByb3RvdHlwZSUnOiB0eXBlb2YgU2V0ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFNldC5wcm90b3R5cGUsXG5cdCclU2hhcmVkQXJyYXlCdWZmZXIlJzogdHlwZW9mIFNoYXJlZEFycmF5QnVmZmVyID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFNoYXJlZEFycmF5QnVmZmVyLFxuXHQnJVNoYXJlZEFycmF5QnVmZmVyUHJvdG90eXBlJSc6IHR5cGVvZiBTaGFyZWRBcnJheUJ1ZmZlciA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBTaGFyZWRBcnJheUJ1ZmZlci5wcm90b3R5cGUsXG5cdCclU3RyaW5nJSc6IFN0cmluZyxcblx0JyVTdHJpbmdJdGVyYXRvclByb3RvdHlwZSUnOiBoYXNTeW1ib2xzID8gZ2V0UHJvdG8oJydbU3ltYm9sLml0ZXJhdG9yXSgpKSA6IHVuZGVmaW5lZCxcblx0JyVTdHJpbmdQcm90b3R5cGUlJzogU3RyaW5nLnByb3RvdHlwZSxcblx0JyVTeW1ib2wlJzogaGFzU3ltYm9scyA/IFN5bWJvbCA6IHVuZGVmaW5lZCxcblx0JyVTeW1ib2xQcm90b3R5cGUlJzogaGFzU3ltYm9scyA/IFN5bWJvbC5wcm90b3R5cGUgOiB1bmRlZmluZWQsXG5cdCclU3ludGF4RXJyb3IlJzogU3ludGF4RXJyb3IsXG5cdCclU3ludGF4RXJyb3JQcm90b3R5cGUlJzogU3ludGF4RXJyb3IucHJvdG90eXBlLFxuXHQnJVRocm93VHlwZUVycm9yJSc6IFRocm93VHlwZUVycm9yLFxuXHQnJVR5cGVkQXJyYXklJzogVHlwZWRBcnJheSxcblx0JyVUeXBlZEFycmF5UHJvdG90eXBlJSc6IFR5cGVkQXJyYXkgPyBUeXBlZEFycmF5LnByb3RvdHlwZSA6IHVuZGVmaW5lZCxcblx0JyVUeXBlRXJyb3IlJzogJFR5cGVFcnJvcixcblx0JyVUeXBlRXJyb3JQcm90b3R5cGUlJzogJFR5cGVFcnJvci5wcm90b3R5cGUsXG5cdCclVWludDhBcnJheSUnOiB0eXBlb2YgVWludDhBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50OEFycmF5LFxuXHQnJVVpbnQ4QXJyYXlQcm90b3R5cGUlJzogdHlwZW9mIFVpbnQ4QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogVWludDhBcnJheS5wcm90b3R5cGUsXG5cdCclVWludDhDbGFtcGVkQXJyYXklJzogdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQ4Q2xhbXBlZEFycmF5LFxuXHQnJVVpbnQ4Q2xhbXBlZEFycmF5UHJvdG90eXBlJSc6IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50OENsYW1wZWRBcnJheS5wcm90b3R5cGUsXG5cdCclVWludDE2QXJyYXklJzogdHlwZW9mIFVpbnQxNkFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQxNkFycmF5LFxuXHQnJVVpbnQxNkFycmF5UHJvdG90eXBlJSc6IHR5cGVvZiBVaW50MTZBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50MTZBcnJheS5wcm90b3R5cGUsXG5cdCclVWludDMyQXJyYXklJzogdHlwZW9mIFVpbnQzMkFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQzMkFycmF5LFxuXHQnJVVpbnQzMkFycmF5UHJvdG90eXBlJSc6IHR5cGVvZiBVaW50MzJBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50MzJBcnJheS5wcm90b3R5cGUsXG5cdCclVVJJRXJyb3IlJzogVVJJRXJyb3IsXG5cdCclVVJJRXJyb3JQcm90b3R5cGUlJzogVVJJRXJyb3IucHJvdG90eXBlLFxuXHQnJVdlYWtNYXAlJzogdHlwZW9mIFdlYWtNYXAgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogV2Vha01hcCxcblx0JyVXZWFrTWFwUHJvdG90eXBlJSc6IHR5cGVvZiBXZWFrTWFwID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFdlYWtNYXAucHJvdG90eXBlLFxuXHQnJVdlYWtTZXQlJzogdHlwZW9mIFdlYWtTZXQgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogV2Vha1NldCxcblx0JyVXZWFrU2V0UHJvdG90eXBlJSc6IHR5cGVvZiBXZWFrU2V0ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFdlYWtTZXQucHJvdG90eXBlXG59O1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJ2Z1bmN0aW9uLWJpbmQnKTtcbnZhciAkcmVwbGFjZSA9IGJpbmQuY2FsbChGdW5jdGlvbi5jYWxsLCBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2UpO1xuXG4vKiBhZGFwdGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2xvZGFzaC9sb2Rhc2gvYmxvYi80LjE3LjE1L2Rpc3QvbG9kYXNoLmpzI0w2NzM1LUw2NzQ0ICovXG52YXIgcmVQcm9wTmFtZSA9IC9bXiUuW1xcXV0rfFxcWyg/OigtP1xcZCsoPzpcXC5cXGQrKT8pfChbXCInXSkoKD86KD8hXFwyKVteXFxcXF18XFxcXC4pKj8pXFwyKVxcXXwoPz0oPzpcXC58XFxbXFxdKSg/OlxcLnxcXFtcXF18JSQpKS9nO1xudmFyIHJlRXNjYXBlQ2hhciA9IC9cXFxcKFxcXFwpPy9nOyAvKiogVXNlZCB0byBtYXRjaCBiYWNrc2xhc2hlcyBpbiBwcm9wZXJ0eSBwYXRocy4gKi9cbnZhciBzdHJpbmdUb1BhdGggPSBmdW5jdGlvbiBzdHJpbmdUb1BhdGgoc3RyaW5nKSB7XG5cdHZhciByZXN1bHQgPSBbXTtcblx0JHJlcGxhY2Uoc3RyaW5nLCByZVByb3BOYW1lLCBmdW5jdGlvbiAobWF0Y2gsIG51bWJlciwgcXVvdGUsIHN1YlN0cmluZykge1xuXHRcdHJlc3VsdFtyZXN1bHQubGVuZ3RoXSA9IHF1b3RlID8gJHJlcGxhY2Uoc3ViU3RyaW5nLCByZUVzY2FwZUNoYXIsICckMScpIDogKG51bWJlciB8fCBtYXRjaCk7XG5cdH0pO1xuXHRyZXR1cm4gcmVzdWx0O1xufTtcbi8qIGVuZCBhZGFwdGF0aW9uICovXG5cbnZhciBnZXRCYXNlSW50cmluc2ljID0gZnVuY3Rpb24gZ2V0QmFzZUludHJpbnNpYyhuYW1lLCBhbGxvd01pc3NpbmcpIHtcblx0aWYgKCEobmFtZSBpbiBJTlRSSU5TSUNTKSkge1xuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcignaW50cmluc2ljICcgKyBuYW1lICsgJyBkb2VzIG5vdCBleGlzdCEnKTtcblx0fVxuXG5cdC8vIGlzdGFuYnVsIGlnbm9yZSBpZiAvLyBob3BlZnVsbHkgdGhpcyBpcyBpbXBvc3NpYmxlIHRvIHRlc3QgOi0pXG5cdGlmICh0eXBlb2YgSU5UUklOU0lDU1tuYW1lXSA9PT0gJ3VuZGVmaW5lZCcgJiYgIWFsbG93TWlzc2luZykge1xuXHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdpbnRyaW5zaWMgJyArIG5hbWUgKyAnIGV4aXN0cywgYnV0IGlzIG5vdCBhdmFpbGFibGUuIFBsZWFzZSBmaWxlIGFuIGlzc3VlIScpO1xuXHR9XG5cblx0cmV0dXJuIElOVFJJTlNJQ1NbbmFtZV07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIEdldEludHJpbnNpYyhuYW1lLCBhbGxvd01pc3NpbmcpIHtcblx0aWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJyB8fCBuYW1lLmxlbmd0aCA9PT0gMCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2ludHJpbnNpYyBuYW1lIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nJyk7XG5cdH1cblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIHR5cGVvZiBhbGxvd01pc3NpbmcgIT09ICdib29sZWFuJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiYWxsb3dNaXNzaW5nXCIgYXJndW1lbnQgbXVzdCBiZSBhIGJvb2xlYW4nKTtcblx0fVxuXG5cdHZhciBwYXJ0cyA9IHN0cmluZ1RvUGF0aChuYW1lKTtcblxuXHR2YXIgdmFsdWUgPSBnZXRCYXNlSW50cmluc2ljKCclJyArIChwYXJ0cy5sZW5ndGggPiAwID8gcGFydHNbMF0gOiAnJykgKyAnJScsIGFsbG93TWlzc2luZyk7XG5cdGZvciAodmFyIGkgPSAxOyBpIDwgcGFydHMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRpZiAodmFsdWUgIT0gbnVsbCkge1xuXHRcdFx0aWYgKCRnT1BEICYmIChpICsgMSkgPj0gcGFydHMubGVuZ3RoKSB7XG5cdFx0XHRcdHZhciBkZXNjID0gJGdPUEQodmFsdWUsIHBhcnRzW2ldKTtcblx0XHRcdFx0aWYgKCFhbGxvd01pc3NpbmcgJiYgIShwYXJ0c1tpXSBpbiB2YWx1ZSkpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYmFzZSBpbnRyaW5zaWMgZm9yICcgKyBuYW1lICsgJyBleGlzdHMsIGJ1dCB0aGUgcHJvcGVydHkgaXMgbm90IGF2YWlsYWJsZS4nKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YWx1ZSA9IGRlc2MgPyAoZGVzYy5nZXQgfHwgZGVzYy52YWx1ZSkgOiB2YWx1ZVtwYXJ0c1tpXV07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YWx1ZSA9IHZhbHVlW3BhcnRzW2ldXTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIHZhbHVlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGJpbmQgPSByZXF1aXJlKCdmdW5jdGlvbi1iaW5kJyk7XG5cbnZhciBHZXRJbnRyaW5zaWMgPSByZXF1aXJlKCcuLi9HZXRJbnRyaW5zaWMnKTtcblxudmFyICRGdW5jdGlvbiA9IEdldEludHJpbnNpYygnJUZ1bmN0aW9uJScpO1xudmFyICRhcHBseSA9ICRGdW5jdGlvbi5hcHBseTtcbnZhciAkY2FsbCA9ICRGdW5jdGlvbi5jYWxsO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNhbGxCaW5kKCkge1xuXHRyZXR1cm4gYmluZC5hcHBseSgkY2FsbCwgYXJndW1lbnRzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmFwcGx5ID0gZnVuY3Rpb24gYXBwbHlCaW5kKCkge1xuXHRyZXR1cm4gYmluZC5hcHBseSgkYXBwbHksIGFyZ3VtZW50cyk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgR2V0SW50cmluc2ljID0gcmVxdWlyZSgnLi4vR2V0SW50cmluc2ljJyk7XG5cbnZhciBjYWxsQmluZCA9IHJlcXVpcmUoJy4vY2FsbEJpbmQnKTtcblxudmFyICRpbmRleE9mID0gY2FsbEJpbmQoR2V0SW50cmluc2ljKCdTdHJpbmcucHJvdG90eXBlLmluZGV4T2YnKSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY2FsbEJvdW5kSW50cmluc2ljKG5hbWUsIGFsbG93TWlzc2luZykge1xuXHR2YXIgaW50cmluc2ljID0gR2V0SW50cmluc2ljKG5hbWUsICEhYWxsb3dNaXNzaW5nKTtcblx0aWYgKHR5cGVvZiBpbnRyaW5zaWMgPT09ICdmdW5jdGlvbicgJiYgJGluZGV4T2YobmFtZSwgJy5wcm90b3R5cGUuJykpIHtcblx0XHRyZXR1cm4gY2FsbEJpbmQoaW50cmluc2ljKTtcblx0fVxuXHRyZXR1cm4gaW50cmluc2ljO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZXNsaW50IGdsb2JhbC1yZXF1aXJlOiAwICovXG4vLyB0aGUgY29kZSBpcyBzdHJ1Y3R1cmVkIHRoaXMgd2F5IHNvIHRoYXQgYnVuZGxlcnMgY2FuXG4vLyBhbGlhcyBvdXQgYGhhcy1zeW1ib2xzYCB0byBgKCkgPT4gdHJ1ZWAgb3IgYCgpID0+IGZhbHNlYCBpZiB5b3VyIHRhcmdldFxuLy8gZW52aXJvbm1lbnRzJyBTeW1ib2wgY2FwYWJpbGl0aWVzIGFyZSBrbm93biwgYW5kIHRoZW4gdXNlXG4vLyBkZWFkIGNvZGUgZWxpbWluYXRpb24gb24gdGhlIHJlc3Qgb2YgdGhpcyBtb2R1bGUuXG4vL1xuLy8gU2ltaWxhcmx5LCBgaXNhcnJheWAgY2FuIGJlIGFsaWFzZWQgdG8gYEFycmF5LmlzQXJyYXlgIGlmXG4vLyBhdmFpbGFibGUgaW4gYWxsIHRhcmdldCBlbnZpcm9ubWVudHMuXG5cbnZhciBpc0FyZ3VtZW50cyA9IHJlcXVpcmUoJ2lzLWFyZ3VtZW50cycpO1xuXG5pZiAocmVxdWlyZSgnaGFzLXN5bWJvbHMnKSgpIHx8IHJlcXVpcmUoJ2hhcy1zeW1ib2xzL3NoYW1zJykoKSkge1xuXHR2YXIgJGl0ZXJhdG9yID0gU3ltYm9sLml0ZXJhdG9yO1xuXHQvLyBTeW1ib2wgaXMgYXZhaWxhYmxlIG5hdGl2ZWx5IG9yIHNoYW1tZWRcblx0Ly8gbmF0aXZlbHk6XG5cdC8vICAtIENocm9tZSA+PSAzOFxuXHQvLyAgLSBFZGdlIDEyLTE0PywgRWRnZSA+PSAxNSBmb3Igc3VyZVxuXHQvLyAgLSBGRiA+PSAzNlxuXHQvLyAgLSBTYWZhcmkgPj0gOVxuXHQvLyAgLSBub2RlID49IDAuMTJcblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZXRJdGVyYXRvcihpdGVyYWJsZSkge1xuXHRcdC8vIGFsdGVybmF0aXZlbHksIGBpdGVyYWJsZVskaXRlcmF0b3JdPy4oKWBcblx0XHRpZiAoaXRlcmFibGUgIT0gbnVsbCAmJiB0eXBlb2YgaXRlcmFibGVbJGl0ZXJhdG9yXSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHJldHVybiBpdGVyYWJsZVskaXRlcmF0b3JdKCk7XG5cdFx0fVxuXHRcdGlmIChpc0FyZ3VtZW50cyhpdGVyYWJsZSkpIHtcblx0XHRcdC8vIGFyZ3VtZW50cyBvYmplY3RzIGxhY2sgU3ltYm9sLml0ZXJhdG9yXG5cdFx0XHQvLyAtIG5vZGUgMC4xMlxuXHRcdFx0cmV0dXJuIEFycmF5LnByb3RvdHlwZVskaXRlcmF0b3JdLmNhbGwoaXRlcmFibGUpO1xuXHRcdH1cblx0fTtcbn0gZWxzZSB7XG5cdC8vIFN5bWJvbCBpcyBub3QgYXZhaWxhYmxlLCBuYXRpdmUgb3Igc2hhbW1lZFxuXHR2YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzYXJyYXknKTtcblx0dmFyIGlzU3RyaW5nID0gcmVxdWlyZSgnaXMtc3RyaW5nJyk7XG5cdHZhciBHZXRJbnRyaW5zaWMgPSByZXF1aXJlKCdlcy1hYnN0cmFjdC9HZXRJbnRyaW5zaWMnKTtcblx0dmFyICRNYXAgPSBHZXRJbnRyaW5zaWMoJyVNYXAlJywgdHJ1ZSk7XG5cdHZhciAkU2V0ID0gR2V0SW50cmluc2ljKCclU2V0JScsIHRydWUpO1xuXHR2YXIgY2FsbEJvdW5kID0gcmVxdWlyZSgnZXMtYWJzdHJhY3QvaGVscGVycy9jYWxsQm91bmQnKTtcblx0dmFyICRhcnJheVB1c2ggPSBjYWxsQm91bmQoJ0FycmF5LnByb3RvdHlwZS5wdXNoJyk7XG5cdHZhciAkY2hhckNvZGVBdCA9IGNhbGxCb3VuZCgnU3RyaW5nLnByb3RvdHlwZS5jaGFyQ29kZUF0Jyk7XG5cdHZhciAkc3RyaW5nU2xpY2UgPSBjYWxsQm91bmQoJ1N0cmluZy5wcm90b3R5cGUuc2xpY2UnKTtcblxuXHR2YXIgYWR2YW5jZVN0cmluZ0luZGV4ID0gZnVuY3Rpb24gYWR2YW5jZVN0cmluZ0luZGV4KFMsIGluZGV4KSB7XG5cdFx0dmFyIGxlbmd0aCA9IFMubGVuZ3RoO1xuXHRcdGlmICgoaW5kZXggKyAxKSA+PSBsZW5ndGgpIHtcblx0XHRcdHJldHVybiBpbmRleCArIDE7XG5cdFx0fVxuXG5cdFx0dmFyIGZpcnN0ID0gJGNoYXJDb2RlQXQoUywgaW5kZXgpO1xuXHRcdGlmIChmaXJzdCA8IDB4RDgwMCB8fCBmaXJzdCA+IDB4REJGRikge1xuXHRcdFx0cmV0dXJuIGluZGV4ICsgMTtcblx0XHR9XG5cblx0XHR2YXIgc2Vjb25kID0gJGNoYXJDb2RlQXQoUywgaW5kZXggKyAxKTtcblx0XHRpZiAoc2Vjb25kIDwgMHhEQzAwIHx8IHNlY29uZCA+IDB4REZGRikge1xuXHRcdFx0cmV0dXJuIGluZGV4ICsgMTtcblx0XHR9XG5cblx0XHRyZXR1cm4gaW5kZXggKyAyO1xuXHR9O1xuXG5cdHZhciBnZXRBcnJheUl0ZXJhdG9yID0gZnVuY3Rpb24gZ2V0QXJyYXlJdGVyYXRvcihhcnJheWxpa2UpIHtcblx0XHR2YXIgaSA9IDA7XG5cdFx0cmV0dXJuIHtcblx0XHRcdG5leHQ6IGZ1bmN0aW9uIG5leHQoKSB7XG5cdFx0XHRcdHZhciBkb25lID0gaSA+PSBhcnJheWxpa2UubGVuZ3RoO1xuXHRcdFx0XHR2YXIgdmFsdWU7XG5cdFx0XHRcdGlmICghZG9uZSkge1xuXHRcdFx0XHRcdHZhbHVlID0gYXJyYXlsaWtlW2ldO1xuXHRcdFx0XHRcdGkgKz0gMTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGRvbmU6IGRvbmUsXG5cdFx0XHRcdFx0dmFsdWU6IHZhbHVlXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fTtcblx0fTtcblxuXHR2YXIgZ2V0Tm9uQ29sbGVjdGlvbkl0ZXJhdG9yID0gZnVuY3Rpb24gZ2V0Tm9uQ29sbGVjdGlvbkl0ZXJhdG9yKGl0ZXJhYmxlKSB7XG5cdFx0aWYgKGlzQXJyYXkoaXRlcmFibGUpIHx8IGlzQXJndW1lbnRzKGl0ZXJhYmxlKSkge1xuXHRcdFx0cmV0dXJuIGdldEFycmF5SXRlcmF0b3IoaXRlcmFibGUpO1xuXHRcdH1cblx0XHRpZiAoaXNTdHJpbmcoaXRlcmFibGUpKSB7XG5cdFx0XHR2YXIgaSA9IDA7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRuZXh0OiBmdW5jdGlvbiBuZXh0KCkge1xuXHRcdFx0XHRcdHZhciBuZXh0SW5kZXggPSBhZHZhbmNlU3RyaW5nSW5kZXgoaXRlcmFibGUsIGkpO1xuXHRcdFx0XHRcdHZhciB2YWx1ZSA9ICRzdHJpbmdTbGljZShpdGVyYWJsZSwgaSwgbmV4dEluZGV4KTtcblx0XHRcdFx0XHRpID0gbmV4dEluZGV4O1xuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRkb25lOiBuZXh0SW5kZXggPiBpdGVyYWJsZS5sZW5ndGgsXG5cdFx0XHRcdFx0XHR2YWx1ZTogdmFsdWVcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblx0fTtcblxuXHRpZiAoISRNYXAgJiYgISRTZXQpIHtcblx0XHQvLyB0aGUgb25seSBsYW5ndWFnZSBpdGVyYWJsZXMgYXJlIEFycmF5LCBTdHJpbmcsIGFyZ3VtZW50c1xuXHRcdC8vIC0gU2FmYXJpIDw9IDYuMFxuXHRcdC8vIC0gQ2hyb21lIDwgMzhcblx0XHQvLyAtIG5vZGUgPCAwLjEyXG5cdFx0Ly8gLSBGRiA8IDEzXG5cdFx0Ly8gLSBJRSA8IDExXG5cdFx0Ly8gLSBFZGdlIDwgMTFcblxuXHRcdG1vZHVsZS5leHBvcnRzID0gZ2V0Tm9uQ29sbGVjdGlvbkl0ZXJhdG9yO1xuXHR9IGVsc2Uge1xuXHRcdC8vIGVpdGhlciBNYXAgb3IgU2V0IGFyZSBhdmFpbGFibGUsIGJ1dCBTeW1ib2wgaXMgbm90XG5cdFx0Ly8gLSBlczYtc2hpbSBvbiBhbiBFUzUgYnJvd3NlclxuXHRcdC8vIC0gU2FmYXJpIDYuMiAobWF5YmUgNi4xPylcblx0XHQvLyAtIEZGIHZbMTMsIDM2KVxuXHRcdC8vIC0gSUUgMTFcblx0XHQvLyAtIEVkZ2UgMTFcblx0XHQvLyAtIFNhZmFyaSB2WzYsIDkpXG5cblx0XHR2YXIgaXNNYXAgPSByZXF1aXJlKCdpcy1tYXAnKTtcblx0XHR2YXIgaXNTZXQgPSByZXF1aXJlKCdpcy1zZXQnKTtcblxuXHRcdC8vIEZpcmVmb3ggPj0gMjcsIElFIDExLCBTYWZhcmkgNi4yIC0gOSwgRWRnZSAxMSwgZXM2LXNoaW0gaW4gb2xkZXIgZW52cywgYWxsIGhhdmUgZm9yRWFjaFxuXHRcdHZhciAkbWFwRm9yRWFjaCA9IGNhbGxCb3VuZCgnTWFwLnByb3RvdHlwZS5mb3JFYWNoJywgdHJ1ZSk7XG5cdFx0dmFyICRzZXRGb3JFYWNoID0gY2FsbEJvdW5kKCdTZXQucHJvdG90eXBlLmZvckVhY2gnLCB0cnVlKTtcblx0XHRpZiAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8ICFwcm9jZXNzLnZlcnNpb25zIHx8ICFwcm9jZXNzLnZlcnNpb25zLm5vZGUpIHsgLy8gXCJpZiBpcyBub3Qgbm9kZVwiXG5cblx0XHRcdC8vIEZpcmVmb3ggMTcgLSAyNiBoYXMgYC5pdGVyYXRvcigpYCwgd2hvc2UgaXRlcmF0b3IgYC5uZXh0KClgIGVpdGhlclxuXHRcdFx0Ly8gcmV0dXJucyBhIHZhbHVlLCBvciB0aHJvd3MgYSBTdG9wSXRlcmF0aW9uIG9iamVjdC4gVGhlc2UgYnJvd3NlcnNcblx0XHRcdC8vIGRvIG5vdCBoYXZlIGFueSBvdGhlciBtZWNoYW5pc20gZm9yIGl0ZXJhdGlvbi5cblx0XHRcdHZhciAkbWFwSXRlcmF0b3IgPSBjYWxsQm91bmQoJ01hcC5wcm90b3R5cGUuaXRlcmF0b3InLCB0cnVlKTtcblx0XHRcdHZhciAkc2V0SXRlcmF0b3IgPSBjYWxsQm91bmQoJ1NldC5wcm90b3R5cGUuaXRlcmF0b3InLCB0cnVlKTtcblx0XHRcdHZhciBnZXRTdG9wSXRlcmF0aW9uSXRlcmF0b3IgPSBmdW5jdGlvbiAoaXRlcmF0b3IpIHtcblx0XHRcdFx0dmFyIGRvbmUgPSBmYWxzZTtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRuZXh0OiBmdW5jdGlvbiBuZXh0KCkge1xuXHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0XHRkb25lOiBkb25lLFxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBkb25lID8gdW5kZWZpbmVkIDogaXRlcmF0b3IubmV4dCgpXG5cdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0XHRcdGRvbmUgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRcdGRvbmU6IHRydWUsXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IHVuZGVmaW5lZFxuXHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdH07XG5cdFx0fVxuXHRcdC8vIEZpcmVmb3ggMjctMzUsIGFuZCBzb21lIG9sZGVyIGVzNi1zaGltIHZlcnNpb25zLCB1c2UgYSBzdHJpbmcgXCJAQGl0ZXJhdG9yXCIgcHJvcGVydHlcblx0XHQvLyB0aGlzIHJldHVybnMgYSBwcm9wZXIgaXRlcmF0b3Igb2JqZWN0LCBzbyB3ZSBzaG91bGQgdXNlIGl0IGluc3RlYWQgb2YgZm9yRWFjaC5cblx0XHQvLyBuZXdlciBlczYtc2hpbSB2ZXJzaW9ucyB1c2UgYSBzdHJpbmcgXCJfZXM2LXNoaW0gaXRlcmF0b3JfXCIgcHJvcGVydHkuXG5cdFx0dmFyICRtYXBBdEF0SXRlcmF0b3IgPSBjYWxsQm91bmQoJ01hcC5wcm90b3R5cGUuQEBpdGVyYXRvcicsIHRydWUpIHx8IGNhbGxCb3VuZCgnTWFwLnByb3RvdHlwZS5fZXM2LXNoaW0gaXRlcmF0b3JfJywgdHJ1ZSk7XG5cdFx0dmFyICRzZXRBdEF0SXRlcmF0b3IgPSBjYWxsQm91bmQoJ1NldC5wcm90b3R5cGUuQEBpdGVyYXRvcicsIHRydWUpIHx8IGNhbGxCb3VuZCgnU2V0LnByb3RvdHlwZS5fZXM2LXNoaW0gaXRlcmF0b3JfJywgdHJ1ZSk7XG5cblx0XHR2YXIgZ2V0Q29sbGVjdGlvbkl0ZXJhdG9yID0gZnVuY3Rpb24gZ2V0Q29sbGVjdGlvbkl0ZXJhdG9yKGl0ZXJhYmxlKSB7XG5cdFx0XHRpZiAoaXNNYXAoaXRlcmFibGUpKSB7XG5cdFx0XHRcdGlmICgkbWFwSXRlcmF0b3IpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0U3RvcEl0ZXJhdGlvbkl0ZXJhdG9yKCRtYXBJdGVyYXRvcihpdGVyYWJsZSkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICgkbWFwQXRBdEl0ZXJhdG9yKSB7XG5cdFx0XHRcdFx0cmV0dXJuICRtYXBBdEF0SXRlcmF0b3IoaXRlcmFibGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICgkbWFwRm9yRWFjaCkge1xuXHRcdFx0XHRcdHZhciBlbnRyaWVzID0gW107XG5cdFx0XHRcdFx0JG1hcEZvckVhY2goaXRlcmFibGUsIGZ1bmN0aW9uICh2LCBrKSB7XG5cdFx0XHRcdFx0XHQkYXJyYXlQdXNoKGVudHJpZXMsIFtrLCB2XSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0cmV0dXJuIGdldEFycmF5SXRlcmF0b3IoZW50cmllcyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChpc1NldChpdGVyYWJsZSkpIHtcblx0XHRcdFx0aWYgKCRzZXRJdGVyYXRvcikge1xuXHRcdFx0XHRcdHJldHVybiBnZXRTdG9wSXRlcmF0aW9uSXRlcmF0b3IoJHNldEl0ZXJhdG9yKGl0ZXJhYmxlKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCRzZXRBdEF0SXRlcmF0b3IpIHtcblx0XHRcdFx0XHRyZXR1cm4gJHNldEF0QXRJdGVyYXRvcihpdGVyYWJsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCRzZXRGb3JFYWNoKSB7XG5cdFx0XHRcdFx0dmFyIHZhbHVlcyA9IFtdO1xuXHRcdFx0XHRcdCRzZXRGb3JFYWNoKGl0ZXJhYmxlLCBmdW5jdGlvbiAodikge1xuXHRcdFx0XHRcdFx0JGFycmF5UHVzaCh2YWx1ZXMsIHYpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHJldHVybiBnZXRBcnJheUl0ZXJhdG9yKHZhbHVlcyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZXRJdGVyYXRvcihpdGVyYWJsZSkge1xuXHRcdFx0cmV0dXJuIGdldENvbGxlY3Rpb25JdGVyYXRvcihpdGVyYWJsZSkgfHwgZ2V0Tm9uQ29sbGVjdGlvbkl0ZXJhdG9yKGl0ZXJhYmxlKTtcblx0XHR9O1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludCBuby1pbnZhbGlkLXRoaXM6IDEgKi9cblxudmFyIEVSUk9SX01FU1NBR0UgPSAnRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgY2FsbGVkIG9uIGluY29tcGF0aWJsZSAnO1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciBmdW5jVHlwZSA9ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYmluZCh0aGF0KSB7XG4gICAgdmFyIHRhcmdldCA9IHRoaXM7XG4gICAgaWYgKHR5cGVvZiB0YXJnZXQgIT09ICdmdW5jdGlvbicgfHwgdG9TdHIuY2FsbCh0YXJnZXQpICE9PSBmdW5jVHlwZSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEVSUk9SX01FU1NBR0UgKyB0YXJnZXQpO1xuICAgIH1cbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgIHZhciBib3VuZDtcbiAgICB2YXIgYmluZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcyBpbnN0YW5jZW9mIGJvdW5kKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gdGFyZ2V0LmFwcGx5KFxuICAgICAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICAgICAgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmIChPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldC5hcHBseShcbiAgICAgICAgICAgICAgICB0aGF0LFxuICAgICAgICAgICAgICAgIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGJvdW5kTGVuZ3RoID0gTWF0aC5tYXgoMCwgdGFyZ2V0Lmxlbmd0aCAtIGFyZ3MubGVuZ3RoKTtcbiAgICB2YXIgYm91bmRBcmdzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib3VuZExlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJvdW5kQXJncy5wdXNoKCckJyArIGkpO1xuICAgIH1cblxuICAgIGJvdW5kID0gRnVuY3Rpb24oJ2JpbmRlcicsICdyZXR1cm4gZnVuY3Rpb24gKCcgKyBib3VuZEFyZ3Muam9pbignLCcpICsgJyl7IHJldHVybiBiaW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpOyB9JykoYmluZGVyKTtcblxuICAgIGlmICh0YXJnZXQucHJvdG90eXBlKSB7XG4gICAgICAgIHZhciBFbXB0eSA9IGZ1bmN0aW9uIEVtcHR5KCkge307XG4gICAgICAgIEVtcHR5LnByb3RvdHlwZSA9IHRhcmdldC5wcm90b3R5cGU7XG4gICAgICAgIGJvdW5kLnByb3RvdHlwZSA9IG5ldyBFbXB0eSgpO1xuICAgICAgICBFbXB0eS5wcm90b3R5cGUgPSBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBib3VuZDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbXBsZW1lbnRhdGlvbiA9IHJlcXVpcmUoJy4vaW1wbGVtZW50YXRpb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCB8fCBpbXBsZW1lbnRhdGlvbjtcbiIsIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRpZmZcblxudmFyIGFzc2lnbiA9IHJlcXVpcmUoJ29iamVjdC1hc3NpZ24nKVxuXG4vKipcbiAqIGRpZmYoYSwgYiBbLCBlcWxdKSBkaWZmcyB0aGUgYXJyYXktbGlrZSBvYmplY3RzIGBhYCBhbmQgYGJgLCByZXR1cm5pbmdcbiAqIGEgc3VtbWFyeSBvZiB0aGUgZWRpdHMgbWFkZS4gQnkgZGVmYXVsdCwgc3RyaWN0IGVxdWFsaXR5IChgPT09YCkgaXNcbiAqIHVzZWQgdG8gY29tcGFyZSBpdGVtcyBpbiBgYWAgYW5kIGBiYDsgaWYgdGhpcyB3aWxsIG5vdCB3b3JrIChmb3IgZXhhbXBsZSxcbiAqIGlmIHRoZSBpdGVtcyBpbiBgYWAgYW5kIGBiYCBhcmUgb2JqZWN0cyksIGEgY3VzdG9tIGVxdWFsaXR5IGZ1bmN0aW9uLFxuICogYGVxbGAsIG1heSBiZSBwYXNzZWQgYXMgYSB0aGlyZCBhcmd1bWVudC5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBhXG4gKiBAcGFyYW0ge0FycmF5fSBiXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBlcWxcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5mdW5jdGlvbiBkaWZmIChhLCBiLCBlcWwpIHtcbiAgZXFsID0gZXFsIHx8IHN0cmljdEVxdWFsXG5cbiAgdmFyIE4gPSBhLmxlbmd0aFxuICB2YXIgTSA9IGIubGVuZ3RoXG4gIHZhciBNQVggPSBOICsgTVxuXG4gIHZhciBWID0ge31cbiAgdmFyIFZzID0gW11cblxuICBWWzFdID0gMFxuICBmb3IgKHZhciBEID0gMDsgRCA8PSBNQVg7IEQgKz0gMSkge1xuICAgIGZvciAodmFyIGsgPSAtRDsgayA8PSBEOyBrICs9IDIpIHtcbiAgICAgIHZhciB4LCB5XG5cbiAgICAgIGlmIChrID09PSAtRCB8fCAoayAhPT0gRCAmJiBWW2sgLSAxXSA8IFZbayArIDFdKSkge1xuICAgICAgICB4ID0gVltrICsgMV1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHggPSBWW2sgLSAxXSArIDFcbiAgICAgIH1cblxuICAgICAgeSA9IHggLSBrXG4gICAgICB3aGlsZSAoeCA8IE4gJiYgeSA8IE0gJiYgZXFsKGFbeF0sIGJbeV0pKSB7XG4gICAgICAgIHggKz0gMVxuICAgICAgICB5ICs9IDFcbiAgICAgIH1cblxuICAgICAgVltrXSA9IHhcbiAgICAgIGlmICh4ID49IE4gJiYgeSA+PSBNKSB7XG4gICAgICAgIFZzW0RdID0gYXNzaWduKHt9LCBWKVxuICAgICAgICByZXR1cm4gYnVpbGRFZGl0cyhWcywgYSwgYilcbiAgICAgIH1cbiAgICB9XG5cbiAgICBWc1tEXSA9IGFzc2lnbih7fSwgVilcbiAgfVxuXG4gIC8vID9cbiAgdGhyb3cgRXJyb3IoJ1VucmVhY2hhYmxlIGRpZmYgcGF0aCByZWFjaGVkJylcbn1cblxuLy8gVXNlZCB3aGVuIG5vIGVxdWFsaXR5IGZ1bmN0aW9uIGlzIGdpdmVuIHRvIGRpZmYoKVxuZnVuY3Rpb24gc3RyaWN0RXF1YWwgKGEsIGIpIHtcbiAgcmV0dXJuIGEgPT09IGJcbn1cblxuLyoqXG4gKiBidWlsZEVkaXRzKFZzLCBhLCBiKSBidWlsZHMgYW4gYXJyYXkgb2YgZWRpdHMgZnJvbSB0aGUgZWRpdCBncmFwaCxcbiAqIGBWc2AsIG9mIGBhYCBhbmQgYGJgLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IFZzXG4gKiBAcGFyYW0ge0FycmF5fSBhXG4gKiBAcGFyYW0ge0FycmF5fSBiXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gYnVpbGRFZGl0cyAoVnMsIGEsIGIpIHtcbiAgdmFyIGVkaXRzID0gW11cblxuICB2YXIgcCA9IHsgeDogYS5sZW5ndGgsIHk6IGIubGVuZ3RoIH1cbiAgZm9yICh2YXIgRCA9IFZzLmxlbmd0aCAtIDE7IHAueCA+IDAgfHwgcC55ID4gMDsgRCAtPSAxKSB7XG4gICAgdmFyIFYgPSBWc1tEXVxuICAgIHZhciBrID0gcC54IC0gcC55XG5cbiAgICB2YXIgeEVuZCA9IFZba11cblxuICAgIHZhciBkb3duID0gKGsgPT09IC1EIHx8IChrICE9PSBEICYmIFZbayAtIDFdIDwgVltrICsgMV0pKVxuICAgIHZhciBrUHJldiA9IGRvd24gPyBrICsgMSA6IGsgLSAxXG5cbiAgICB2YXIgeFN0YXJ0ID0gVltrUHJldl1cbiAgICB2YXIgeVN0YXJ0ID0geFN0YXJ0IC0ga1ByZXZcblxuICAgIHZhciB4TWlkID0gZG93biA/IHhTdGFydCA6IHhTdGFydCArIDFcblxuICAgIHdoaWxlICh4RW5kID4geE1pZCkge1xuICAgICAgcHVzaEVkaXQoZWRpdHMsIGFbeEVuZCAtIDFdLCBmYWxzZSwgZmFsc2UpXG4gICAgICB4RW5kIC09IDFcbiAgICB9XG5cbiAgICBpZiAoeVN0YXJ0IDwgMCkgYnJlYWtcblxuICAgIGlmIChkb3duKSB7XG4gICAgICBwdXNoRWRpdChlZGl0cywgYlt5U3RhcnRdLCB0cnVlLCBmYWxzZSlcbiAgICB9IGVsc2Uge1xuICAgICAgcHVzaEVkaXQoZWRpdHMsIGFbeFN0YXJ0XSwgZmFsc2UsIHRydWUpXG4gICAgfVxuXG4gICAgcC54ID0geFN0YXJ0XG4gICAgcC55ID0geVN0YXJ0XG4gIH1cblxuICByZXR1cm4gZWRpdHMucmV2ZXJzZSgpXG59XG5cbi8qKlxuICogcHVzaEVkaXQoZWRpdHMsIGl0ZW0sIGFkZGVkLCByZW1vdmVkKSBhZGRzIHRoZSBnaXZlbiBpdGVtIHRvIHRoZSBhcnJheVxuICogb2YgZWRpdHMuIFNpbWlsYXIgZWRpdHMgYXJlIGdyb3VwZWQgdG9nZXRoZXIgZm9yIGNvbmNpc2VuZXNzLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGVkaXRzXG4gKiBAcGFyYW0geyp9IGl0ZW1cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gYWRkZWRcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVtb3ZlZFxuICovXG5mdW5jdGlvbiBwdXNoRWRpdCAoZWRpdHMsIGl0ZW0sIGFkZGVkLCByZW1vdmVkKSB7XG4gIHZhciBsYXN0ID0gZWRpdHNbZWRpdHMubGVuZ3RoIC0gMV1cblxuICBpZiAobGFzdCAmJiBsYXN0LmFkZGVkID09PSBhZGRlZCAmJiBsYXN0LnJlbW92ZWQgPT09IHJlbW92ZWQpIHtcbiAgICBsYXN0Lml0ZW1zLnVuc2hpZnQoaXRlbSkgLy8gTm90IHB1c2g6IGVkaXRzIGdldCByZXZlcnNlZCBsYXRlclxuICB9IGVsc2Uge1xuICAgIGVkaXRzLnB1c2goe1xuICAgICAgaXRlbXM6IFtpdGVtXSxcbiAgICAgIGFkZGVkOiBhZGRlZCxcbiAgICAgIHJlbW92ZWQ6IHJlbW92ZWRcbiAgICB9KVxuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvcmlnU3ltYm9sID0gZ2xvYmFsLlN5bWJvbDtcbnZhciBoYXNTeW1ib2xTaGFtID0gcmVxdWlyZSgnLi9zaGFtcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGhhc05hdGl2ZVN5bWJvbHMoKSB7XG5cdGlmICh0eXBlb2Ygb3JpZ1N5bWJvbCAhPT0gJ2Z1bmN0aW9uJykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKHR5cGVvZiBTeW1ib2wgIT09ICdmdW5jdGlvbicpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmICh0eXBlb2Ygb3JpZ1N5bWJvbCgnZm9vJykgIT09ICdzeW1ib2wnKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAodHlwZW9mIFN5bWJvbCgnYmFyJykgIT09ICdzeW1ib2wnKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdHJldHVybiBoYXNTeW1ib2xTaGFtKCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBlc2xpbnQgY29tcGxleGl0eTogWzIsIDE4XSwgbWF4LXN0YXRlbWVudHM6IFsyLCAzM10gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaGFzU3ltYm9scygpIHtcblx0aWYgKHR5cGVvZiBTeW1ib2wgIT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgIT09ICdmdW5jdGlvbicpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmICh0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSAnc3ltYm9sJykgeyByZXR1cm4gdHJ1ZTsgfVxuXG5cdHZhciBvYmogPSB7fTtcblx0dmFyIHN5bSA9IFN5bWJvbCgndGVzdCcpO1xuXHR2YXIgc3ltT2JqID0gT2JqZWN0KHN5bSk7XG5cdGlmICh0eXBlb2Ygc3ltID09PSAnc3RyaW5nJykgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN5bSkgIT09ICdbb2JqZWN0IFN5bWJvbF0nKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN5bU9iaikgIT09ICdbb2JqZWN0IFN5bWJvbF0nKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdC8vIHRlbXAgZGlzYWJsZWQgcGVyIGh0dHBzOi8vZ2l0aHViLmNvbS9samhhcmIvb2JqZWN0LmFzc2lnbi9pc3N1ZXMvMTdcblx0Ly8gaWYgKHN5bSBpbnN0YW5jZW9mIFN5bWJvbCkgeyByZXR1cm4gZmFsc2U7IH1cblx0Ly8gdGVtcCBkaXNhYmxlZCBwZXIgaHR0cHM6Ly9naXRodWIuY29tL1dlYlJlZmxlY3Rpb24vZ2V0LW93bi1wcm9wZXJ0eS1zeW1ib2xzL2lzc3Vlcy80XG5cdC8vIGlmICghKHN5bU9iaiBpbnN0YW5jZW9mIFN5bWJvbCkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0Ly8gaWYgKHR5cGVvZiBTeW1ib2wucHJvdG90eXBlLnRvU3RyaW5nICE9PSAnZnVuY3Rpb24nKSB7IHJldHVybiBmYWxzZTsgfVxuXHQvLyBpZiAoU3RyaW5nKHN5bSkgIT09IFN5bWJvbC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzeW0pKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdHZhciBzeW1WYWwgPSA0Mjtcblx0b2JqW3N5bV0gPSBzeW1WYWw7XG5cdGZvciAoc3ltIGluIG9iaikgeyByZXR1cm4gZmFsc2U7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1yZXN0cmljdGVkLXN5bnRheFxuXHRpZiAodHlwZW9mIE9iamVjdC5rZXlzID09PSAnZnVuY3Rpb24nICYmIE9iamVjdC5rZXlzKG9iaikubGVuZ3RoICE9PSAwKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdGlmICh0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgPT09ICdmdW5jdGlvbicgJiYgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqKS5sZW5ndGggIT09IDApIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0dmFyIHN5bXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iaik7XG5cdGlmIChzeW1zLmxlbmd0aCAhPT0gMSB8fCBzeW1zWzBdICE9PSBzeW0pIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0aWYgKCFPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwob2JqLCBzeW0pKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdGlmICh0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIHN5bSk7XG5cdFx0aWYgKGRlc2NyaXB0b3IudmFsdWUgIT09IHN5bVZhbCB8fCBkZXNjcmlwdG9yLmVudW1lcmFibGUgIT09IHRydWUpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBiaW5kID0gcmVxdWlyZSgnZnVuY3Rpb24tYmluZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmQuY2FsbChGdW5jdGlvbi5jYWxsLCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhc1RvU3RyaW5nVGFnID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sLnRvU3RyaW5nVGFnID09PSAnc3ltYm9sJztcbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbnZhciBpc1N0YW5kYXJkQXJndW1lbnRzID0gZnVuY3Rpb24gaXNBcmd1bWVudHModmFsdWUpIHtcblx0aWYgKGhhc1RvU3RyaW5nVGFnICYmIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnIGluIHZhbHVlKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0b1N0ci5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG59O1xuXG52YXIgaXNMZWdhY3lBcmd1bWVudHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuXHRpZiAoaXNTdGFuZGFyZEFyZ3VtZW50cyh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gdmFsdWUgIT09IG51bGwgJiZcblx0XHR0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmXG5cdFx0dHlwZW9mIHZhbHVlLmxlbmd0aCA9PT0gJ251bWJlcicgJiZcblx0XHR2YWx1ZS5sZW5ndGggPj0gMCAmJlxuXHRcdHRvU3RyLmNhbGwodmFsdWUpICE9PSAnW29iamVjdCBBcnJheV0nICYmXG5cdFx0dG9TdHIuY2FsbCh2YWx1ZS5jYWxsZWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xufTtcblxudmFyIHN1cHBvcnRzU3RhbmRhcmRBcmd1bWVudHMgPSAoZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gaXNTdGFuZGFyZEFyZ3VtZW50cyhhcmd1bWVudHMpO1xufSgpKTtcblxuaXNTdGFuZGFyZEFyZ3VtZW50cy5pc0xlZ2FjeUFyZ3VtZW50cyA9IGlzTGVnYWN5QXJndW1lbnRzOyAvLyBmb3IgdGVzdHNcblxubW9kdWxlLmV4cG9ydHMgPSBzdXBwb3J0c1N0YW5kYXJkQXJndW1lbnRzID8gaXNTdGFuZGFyZEFyZ3VtZW50cyA6IGlzTGVnYWN5QXJndW1lbnRzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pZiAodHlwZW9mIEJpZ0ludCA9PT0gJ2Z1bmN0aW9uJykge1xuXHR2YXIgYmlnSW50VmFsdWVPZiA9IEJpZ0ludC5wcm90b3R5cGUudmFsdWVPZjtcblx0dmFyIHRyeUJpZ0ludCA9IGZ1bmN0aW9uIHRyeUJpZ0ludE9iamVjdCh2YWx1ZSkge1xuXHRcdHRyeSB7XG5cdFx0XHRiaWdJbnRWYWx1ZU9mLmNhbGwodmFsdWUpO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0JpZ0ludCh2YWx1ZSkge1xuXHRcdGlmIChcblx0XHRcdHZhbHVlID09PSBudWxsXG5cdFx0XHR8fCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnXG5cdFx0XHR8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJ1xuXHRcdFx0fHwgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJ1xuXHRcdFx0fHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJ1xuXHRcdFx0fHwgdHlwZW9mIHZhbHVlID09PSAnc3ltYm9sJ1xuXHRcdFx0fHwgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nXG5cdFx0KSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdmFsdWUgPT09ICdiaWdpbnQnKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgdmFsaWQtdHlwZW9mXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ5QmlnSW50KHZhbHVlKTtcblx0fTtcbn0gZWxzZSB7XG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCaWdJbnQodmFsdWUpIHtcblx0XHRyZXR1cm4gZmFsc2UgJiYgdmFsdWU7XG5cdH07XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBib29sVG9TdHIgPSBCb29sZWFuLnByb3RvdHlwZS50b1N0cmluZztcblxudmFyIHRyeUJvb2xlYW5PYmplY3QgPSBmdW5jdGlvbiBib29sZWFuQnJhbmRDaGVjayh2YWx1ZSkge1xuXHR0cnkge1xuXHRcdGJvb2xUb1N0ci5jYWxsKHZhbHVlKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTtcbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgYm9vbENsYXNzID0gJ1tvYmplY3QgQm9vbGVhbl0nO1xudmFyIGhhc1RvU3RyaW5nVGFnID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sLnRvU3RyaW5nVGFnID09PSAnc3ltYm9sJztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0Jvb2xlYW4odmFsdWUpIHtcblx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0aWYgKHZhbHVlID09PSBudWxsIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIGhhc1RvU3RyaW5nVGFnICYmIFN5bWJvbC50b1N0cmluZ1RhZyBpbiB2YWx1ZSA/IHRyeUJvb2xlYW5PYmplY3QodmFsdWUpIDogdG9TdHIuY2FsbCh2YWx1ZSkgPT09IGJvb2xDbGFzcztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBnZXREYXkgPSBEYXRlLnByb3RvdHlwZS5nZXREYXk7XG52YXIgdHJ5RGF0ZU9iamVjdCA9IGZ1bmN0aW9uIHRyeURhdGVHZXREYXlDYWxsKHZhbHVlKSB7XG5cdHRyeSB7XG5cdFx0Z2V0RGF5LmNhbGwodmFsdWUpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59O1xuXG52YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIGRhdGVDbGFzcyA9ICdbb2JqZWN0IERhdGVdJztcbnZhciBoYXNUb1N0cmluZ1RhZyA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIFN5bWJvbC50b1N0cmluZ1RhZyA9PT0gJ3N5bWJvbCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNEYXRlT2JqZWN0KHZhbHVlKSB7XG5cdGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnIHx8IHZhbHVlID09PSBudWxsKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiBoYXNUb1N0cmluZ1RhZyA/IHRyeURhdGVPYmplY3QodmFsdWUpIDogdG9TdHIuY2FsbCh2YWx1ZSkgPT09IGRhdGVDbGFzcztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciAkTWFwID0gdHlwZW9mIE1hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBNYXAucHJvdG90eXBlID8gTWFwIDogbnVsbDtcbnZhciAkU2V0ID0gdHlwZW9mIFNldCA9PT0gJ2Z1bmN0aW9uJyAmJiBTZXQucHJvdG90eXBlID8gU2V0IDogbnVsbDtcblxudmFyIGV4cG9ydGVkO1xuXG5pZiAoISRNYXApIHtcblx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC12YXJzXG5cdGV4cG9ydGVkID0gZnVuY3Rpb24gaXNNYXAoeCkge1xuXHRcdC8vIGBNYXBgIGlzIG5vdCBwcmVzZW50IGluIHRoaXMgZW52aXJvbm1lbnQuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9O1xufVxuXG52YXIgJG1hcEhhcyA9ICRNYXAgPyBNYXAucHJvdG90eXBlLmhhcyA6IG51bGw7XG52YXIgJHNldEhhcyA9ICRTZXQgPyBTZXQucHJvdG90eXBlLmhhcyA6IG51bGw7XG5pZiAoIWV4cG9ydGVkICYmICEkbWFwSGFzKSB7XG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtdmFyc1xuXHRleHBvcnRlZCA9IGZ1bmN0aW9uIGlzTWFwKHgpIHtcblx0XHQvLyBgTWFwYCBkb2VzIG5vdCBoYXZlIGEgYGhhc2AgbWV0aG9kXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydGVkIHx8IGZ1bmN0aW9uIGlzTWFwKHgpIHtcblx0aWYgKCF4IHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHR0cnkge1xuXHRcdCRtYXBIYXMuY2FsbCh4KTtcblx0XHRpZiAoJHNldEhhcykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0JHNldEhhcy5jYWxsKHgpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHggaW5zdGFuY2VvZiAkTWFwOyAvLyBjb3JlLWpzIHdvcmthcm91bmQsIHByZS12Mi41LjBcblx0fSBjYXRjaCAoZSkge31cblx0cmV0dXJuIGZhbHNlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG51bVRvU3RyID0gTnVtYmVyLnByb3RvdHlwZS50b1N0cmluZztcbnZhciB0cnlOdW1iZXJPYmplY3QgPSBmdW5jdGlvbiB0cnlOdW1iZXJPYmplY3QodmFsdWUpIHtcblx0dHJ5IHtcblx0XHRudW1Ub1N0ci5jYWxsKHZhbHVlKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTtcbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgbnVtQ2xhc3MgPSAnW29iamVjdCBOdW1iZXJdJztcbnZhciBoYXNUb1N0cmluZ1RhZyA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIFN5bWJvbC50b1N0cmluZ1RhZyA9PT0gJ3N5bWJvbCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNOdW1iZXJPYmplY3QodmFsdWUpIHtcblx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gaGFzVG9TdHJpbmdUYWcgPyB0cnlOdW1iZXJPYmplY3QodmFsdWUpIDogdG9TdHIuY2FsbCh2YWx1ZSkgPT09IG51bUNsYXNzO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhcyA9IHJlcXVpcmUoJ2hhcycpO1xudmFyIHJlZ2V4RXhlYyA9IFJlZ0V4cC5wcm90b3R5cGUuZXhlYztcbnZhciBnT1BEID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcblxudmFyIHRyeVJlZ2V4RXhlY0NhbGwgPSBmdW5jdGlvbiB0cnlSZWdleEV4ZWModmFsdWUpIHtcblx0dHJ5IHtcblx0XHR2YXIgbGFzdEluZGV4ID0gdmFsdWUubGFzdEluZGV4O1xuXHRcdHZhbHVlLmxhc3RJbmRleCA9IDA7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cblxuXHRcdHJlZ2V4RXhlYy5jYWxsKHZhbHVlKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSBmaW5hbGx5IHtcblx0XHR2YWx1ZS5sYXN0SW5kZXggPSBsYXN0SW5kZXg7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cblx0fVxufTtcbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgcmVnZXhDbGFzcyA9ICdbb2JqZWN0IFJlZ0V4cF0nO1xudmFyIGhhc1RvU3RyaW5nVGFnID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sLnRvU3RyaW5nVGFnID09PSAnc3ltYm9sJztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc1JlZ2V4KHZhbHVlKSB7XG5cdGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRpZiAoIWhhc1RvU3RyaW5nVGFnKSB7XG5cdFx0cmV0dXJuIHRvU3RyLmNhbGwodmFsdWUpID09PSByZWdleENsYXNzO1xuXHR9XG5cblx0dmFyIGRlc2NyaXB0b3IgPSBnT1BEKHZhbHVlLCAnbGFzdEluZGV4Jyk7XG5cdHZhciBoYXNMYXN0SW5kZXhEYXRhUHJvcGVydHkgPSBkZXNjcmlwdG9yICYmIGhhcyhkZXNjcmlwdG9yLCAndmFsdWUnKTtcblx0aWYgKCFoYXNMYXN0SW5kZXhEYXRhUHJvcGVydHkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRyZXR1cm4gdHJ5UmVnZXhFeGVjQ2FsbCh2YWx1ZSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgJE1hcCA9IHR5cGVvZiBNYXAgPT09ICdmdW5jdGlvbicgJiYgTWFwLnByb3RvdHlwZSA/IE1hcCA6IG51bGw7XG52YXIgJFNldCA9IHR5cGVvZiBTZXQgPT09ICdmdW5jdGlvbicgJiYgU2V0LnByb3RvdHlwZSA/IFNldCA6IG51bGw7XG5cbnZhciBleHBvcnRlZDtcblxuaWYgKCEkU2V0KSB7XG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtdmFyc1xuXHRleHBvcnRlZCA9IGZ1bmN0aW9uIGlzU2V0KHgpIHtcblx0XHQvLyBgU2V0YCBpcyBub3QgcHJlc2VudCBpbiB0aGlzIGVudmlyb25tZW50LlxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcbn1cblxudmFyICRtYXBIYXMgPSAkTWFwID8gTWFwLnByb3RvdHlwZS5oYXMgOiBudWxsO1xudmFyICRzZXRIYXMgPSAkU2V0ID8gU2V0LnByb3RvdHlwZS5oYXMgOiBudWxsO1xuaWYgKCFleHBvcnRlZCAmJiAhJHNldEhhcykge1xuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLXZhcnNcblx0ZXhwb3J0ZWQgPSBmdW5jdGlvbiBpc1NldCh4KSB7XG5cdFx0Ly8gYFNldGAgZG9lcyBub3QgaGF2ZSBhIGBoYXNgIG1ldGhvZFxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRlZCB8fCBmdW5jdGlvbiBpc1NldCh4KSB7XG5cdGlmICgheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0dHJ5IHtcblx0XHQkc2V0SGFzLmNhbGwoeCk7XG5cdFx0aWYgKCRtYXBIYXMpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdCRtYXBIYXMuY2FsbCh4KTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB4IGluc3RhbmNlb2YgJFNldDsgLy8gY29yZS1qcyB3b3JrYXJvdW5kLCBwcmUtdjIuNS4wXG5cdH0gY2F0Y2ggKGUpIHt9XG5cdHJldHVybiBmYWxzZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzdHJWYWx1ZSA9IFN0cmluZy5wcm90b3R5cGUudmFsdWVPZjtcbnZhciB0cnlTdHJpbmdPYmplY3QgPSBmdW5jdGlvbiB0cnlTdHJpbmdPYmplY3QodmFsdWUpIHtcblx0dHJ5IHtcblx0XHRzdHJWYWx1ZS5jYWxsKHZhbHVlKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTtcbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgc3RyQ2xhc3MgPSAnW29iamVjdCBTdHJpbmddJztcbnZhciBoYXNUb1N0cmluZ1RhZyA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIFN5bWJvbC50b1N0cmluZ1RhZyA9PT0gJ3N5bWJvbCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcblx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gaGFzVG9TdHJpbmdUYWcgPyB0cnlTdHJpbmdPYmplY3QodmFsdWUpIDogdG9TdHIuY2FsbCh2YWx1ZSkgPT09IHN0ckNsYXNzO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciBoYXNTeW1ib2xzID0gcmVxdWlyZSgnaGFzLXN5bWJvbHMnKSgpO1xuXG5pZiAoaGFzU3ltYm9scykge1xuXHR2YXIgc3ltVG9TdHIgPSBTeW1ib2wucHJvdG90eXBlLnRvU3RyaW5nO1xuXHR2YXIgc3ltU3RyaW5nUmVnZXggPSAvXlN5bWJvbFxcKC4qXFwpJC87XG5cdHZhciBpc1N5bWJvbE9iamVjdCA9IGZ1bmN0aW9uIGlzUmVhbFN5bWJvbE9iamVjdCh2YWx1ZSkge1xuXHRcdGlmICh0eXBlb2YgdmFsdWUudmFsdWVPZigpICE9PSAnc3ltYm9sJykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gc3ltU3RyaW5nUmVnZXgudGVzdChzeW1Ub1N0ci5jYWxsKHZhbHVlKSk7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc1N5bWJvbCh2YWx1ZSkge1xuXHRcdGlmICh0eXBlb2YgdmFsdWUgPT09ICdzeW1ib2wnKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKHRvU3RyLmNhbGwodmFsdWUpICE9PSAnW29iamVjdCBTeW1ib2xdJykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIGlzU3ltYm9sT2JqZWN0KHZhbHVlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9O1xufSBlbHNlIHtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzU3ltYm9sKHZhbHVlKSB7XG5cdFx0Ly8gdGhpcyBlbnZpcm9ubWVudCBkb2VzIG5vdCBzdXBwb3J0IFN5bWJvbHMuXG5cdFx0cmV0dXJuIGZhbHNlICYmIHZhbHVlO1xuXHR9O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgJFdlYWtNYXAgPSB0eXBlb2YgV2Vha01hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBXZWFrTWFwLnByb3RvdHlwZSA/IFdlYWtNYXAgOiBudWxsO1xudmFyICRXZWFrU2V0ID0gdHlwZW9mIFdlYWtTZXQgPT09ICdmdW5jdGlvbicgJiYgV2Vha1NldC5wcm90b3R5cGUgPyBXZWFrU2V0IDogbnVsbDtcblxudmFyIGV4cG9ydGVkO1xuXG5pZiAoISRXZWFrTWFwKSB7XG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtdmFyc1xuXHRleHBvcnRlZCA9IGZ1bmN0aW9uIGlzV2Vha01hcCh4KSB7XG5cdFx0Ly8gYFdlYWtNYXBgIGlzIG5vdCBwcmVzZW50IGluIHRoaXMgZW52aXJvbm1lbnQuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9O1xufVxuXG52YXIgJG1hcEhhcyA9ICRXZWFrTWFwID8gJFdlYWtNYXAucHJvdG90eXBlLmhhcyA6IG51bGw7XG52YXIgJHNldEhhcyA9ICRXZWFrU2V0ID8gJFdlYWtTZXQucHJvdG90eXBlLmhhcyA6IG51bGw7XG5pZiAoIWV4cG9ydGVkICYmICEkbWFwSGFzKSB7XG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtdmFyc1xuXHRleHBvcnRlZCA9IGZ1bmN0aW9uIGlzV2Vha01hcCh4KSB7XG5cdFx0Ly8gYFdlYWtNYXBgIGRvZXMgbm90IGhhdmUgYSBgaGFzYCBtZXRob2Rcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0ZWQgfHwgZnVuY3Rpb24gaXNXZWFrTWFwKHgpIHtcblx0aWYgKCF4IHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHR0cnkge1xuXHRcdCRtYXBIYXMuY2FsbCh4LCAkbWFwSGFzKTtcblx0XHRpZiAoJHNldEhhcykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0JHNldEhhcy5jYWxsKHgsICRzZXRIYXMpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHggaW5zdGFuY2VvZiAkV2Vha01hcDsgLy8gY29yZS1qcyB3b3JrYXJvdW5kLCBwcmUtdjNcblx0fSBjYXRjaCAoZSkge31cblx0cmV0dXJuIGZhbHNlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyICRXZWFrTWFwID0gdHlwZW9mIFdlYWtNYXAgPT09ICdmdW5jdGlvbicgJiYgV2Vha01hcC5wcm90b3R5cGUgPyBXZWFrTWFwIDogbnVsbDtcbnZhciAkV2Vha1NldCA9IHR5cGVvZiBXZWFrU2V0ID09PSAnZnVuY3Rpb24nICYmIFdlYWtTZXQucHJvdG90eXBlID8gV2Vha1NldCA6IG51bGw7XG5cbnZhciBleHBvcnRlZDtcblxuaWYgKCEkV2Vha01hcCkge1xuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLXZhcnNcblx0ZXhwb3J0ZWQgPSBmdW5jdGlvbiBpc1dlYWtTZXQoeCkge1xuXHRcdC8vIGBXZWFrU2V0YCBpcyBub3QgcHJlc2VudCBpbiB0aGlzIGVudmlyb25tZW50LlxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcbn1cblxudmFyICRtYXBIYXMgPSAkV2Vha01hcCA/ICRXZWFrTWFwLnByb3RvdHlwZS5oYXMgOiBudWxsO1xudmFyICRzZXRIYXMgPSAkV2Vha1NldCA/ICRXZWFrU2V0LnByb3RvdHlwZS5oYXMgOiBudWxsO1xuaWYgKCFleHBvcnRlZCAmJiAhJHNldEhhcykge1xuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLXZhcnNcblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc1dlYWtTZXQoeCkge1xuXHRcdC8vIGBXZWFrU2V0YCBkb2VzIG5vdCBoYXZlIGEgYGhhc2AgbWV0aG9kXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydGVkIHx8IGZ1bmN0aW9uIGlzV2Vha1NldCh4KSB7XG5cdGlmICgheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0dHJ5IHtcblx0XHQkc2V0SGFzLmNhbGwoeCwgJHNldEhhcyk7XG5cdFx0aWYgKCRtYXBIYXMpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdCRtYXBIYXMuY2FsbCh4LCAkbWFwSGFzKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB4IGluc3RhbmNlb2YgJFdlYWtTZXQ7IC8vIGNvcmUtanMgd29ya2Fyb3VuZCwgcHJlLXYzXG5cdH0gY2F0Y2ggKGUpIHt9XG5cdHJldHVybiBmYWxzZTtcbn07XG4iLCJ2YXIgdG9TdHJpbmcgPSB7fS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8qIEBwcmVzZXJ2ZVxuICogSlNPTlBhdGNoLmpzXG4gKlxuICogQSBEaGFybWFmbHkgcHJvamVjdCB3cml0dGVuIGJ5IFRob21hcyBQYXJzbG93XG4gKiA8dG9tQGFsbW9zdG9ic29sZXRlLm5ldD4gYW5kIHJlbGVhc2VkIHdpdGggdGhlIGtpbmQgcGVybWlzc2lvbiBvZlxuICogTmV0RGV2LlxuICpcbiAqIENvcHlyaWdodCAyMDExLTIwMTMgVGhvbWFzIFBhcnNsb3cuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLHkgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG9cbiAqIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlXG4gKiByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3JcbiAqIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkdcbiAqIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1NcbiAqIElOIFRIRSBTT0ZUV0FSRS5cbiAqXG4gKiBJbXBsZW1lbnRzIHRoZSBKU09OIFBhdGNoIElFVEYgUkZDIDY5MDIgYXMgc3BlY2lmaWVkIGF0OlxuICpcbiAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMlxuICpcbiAqIEFsc28gaW1wbGVtZW50cyB0aGUgSlNPTiBQb2ludGVyIElFVEYgUkZDIDY5MDEgYXMgc3BlY2lmaWVkIGF0OlxuICpcbiAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMVxuICpcbiAqL1xuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIC8vIE5vZGVcbiAgICAgICAgZmFjdG9yeShtb2R1bGUuZXhwb3J0cyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgICAgICBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgICAgIHJvb3QuanNvbnBhdGNoID0ge307XG4gICAgICAgIHJvb3QucmV0dXJuRXhwb3J0cyA9IGZhY3Rvcnkocm9vdC5qc29ucGF0Y2gpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uIChleHBvcnRzKSB7XG4gIHZhciBhcHBseV9wYXRjaCwgSlNPTlBhdGNoLCBKU09OUG9pbnRlcixfb3BlcmF0aW9uUmVxdWlyZWQsaXNBcnJheTtcblxuICAvLyBUYWtlbiBmcm9tIHVuZGVyc2NvcmUuanNcbiAgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLyogUHVibGljOiBTaG9ydGN1dCB0byBhcHBseSBhIHBhdGNoIHRoZSBkb2N1bWVudCB3aXRob3V0IGhhdmluZyB0b1xuICAgKiBjcmVhdGUgYSBwYXRjaCBvYmplY3QgZmlyc3QuIFJldHVybnMgdGhlIHBhdGNoZWQgZG9jdW1lbnQuIERvZXNcbiAgICogbm90IGRhbWFnZSB0aGUgb3JpZ2luYWwgZG9jdW1lbnQsIGJ1dCB3aWxsIHJldXNlIHBhcnRzIG9mIGl0c1xuICAgKiBzdHJ1Y3R1cmUgaW4gdGhlIG5ldyBvbmUuXG4gICAqXG4gICAqIGRvYyAtIFRoZSB0YXJnZXQgZG9jdW1lbnQgdG8gd2hpY2ggdGhlIHBhdGNoIHNob3VsZCBiZSBhcHBsaWVkLlxuICAgKiBwYXRjaCAtIEEgSlNPTiBQYXRjaCBkb2N1bWVudCBzcGVjaWZ5aW5nIHRoZSBjaGFuZ2VzIHRvIHRoZVxuICAgKiAgICAgICAgIHRhcmdldCBkb2N1bWVudG1lbnRcbiAgICpcbiAgICogRXhhbXBsZSAobm9kZS5qcylcbiAgICpcbiAgICogICAganNvbnBhdGNoID0gcmVxdWlyZSgnanNvbnBhdGNoJyk7XG4gICAqICAgIGRvYyA9IEpTT04ucGFyc2Uoc291cmNlSlNPTik7XG4gICAqICAgIGRvYyA9IGpzb25wYXRjaC5hcHBseV9wYXRjaChkb2MsIHRoZXBhdGNoKTtcbiAgICogICAgZGVzdEpTT04gPSBKU09OLnN0cmluZ2lmeShkb2MpO1xuICAgKlxuICAgKiBFeGFtcGxlIChpbiBicm93c2VyKVxuICAgKlxuICAgKiAgICAgPHNjcmlwdCBzcmM9XCJqc29ucGF0Y2guanNcIiB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCI+PC9zY3JpcHQ+XG4gICAqICAgICA8c2NyaXB0IHR5cGU9XCJhcHBsaWNhdGlvbi9qYXZhc2NyaXB0XCI+XG4gICAqICAgICAgZG9jID0gSlNPTi5wYXJzZShzb3VyY2VKU09OKTtcbiAgICogICAgICBkb2MgPSBqc29ucGF0Y2guYXBwbHlfcGF0Y2goZG9jLCB0aGVwYXRjaCk7XG4gICAqICAgICAgZGVzdEpTT04gPSBKU09OLnN0cmluZ2lmeShkb2MpO1xuICAgKiAgICAgPC9zY3JpcHQ+XG4gICAqXG4gICAqIFJldHVybnMgdGhlIHBhdGNoZWQgZG9jdW1lbnRcbiAgICovXG4gIGV4cG9ydHMuYXBwbHlfcGF0Y2ggPSBhcHBseV9wYXRjaCA9IGZ1bmN0aW9uIChkb2MsIHBhdGNoKSB7XG4gICAgcmV0dXJuIChuZXcgSlNPTlBhdGNoKHBhdGNoKSkuYXBwbHkoZG9jKTtcbiAgfTtcblxuICAvKiBQdWJsaWM6IEVycm9yIHRocm93biBpZiB0aGUgcGF0Y2ggc3VwcGxpZWQgaXMgaW52YWxpZC5cbiAgICovXG4gIGZ1bmN0aW9uIEludmFsaWRQYXRjaChtZXNzYWdlKSB7XG4gICAgRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlKTsgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgfVxuICBleHBvcnRzLkludmFsaWRQYXRjaCA9IEludmFsaWRQYXRjaDtcbiAgSW52YWxpZFBhdGNoLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuICAvKiBQdWJsaWM6IEVycm9yIHRocm93biBpZiB0aGUgcGF0Y2ggY2FuIG5vdCBiZSBhcGxsaWVkIHRvIHRoZSBnaXZlbiBkb2N1bWVudFxuICAgKi9cbiAgZnVuY3Rpb24gUGF0Y2hBcHBseUVycm9yKG1lc3NhZ2UpIHtcbiAgICBFcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UpOyB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB9XG4gIGV4cG9ydHMuUGF0Y2hBcHBseUVycm9yID0gUGF0Y2hBcHBseUVycm9yO1xuICBQYXRjaEFwcGx5RXJyb3IucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbiAgLyogUHVibGljOiBBIGNsYXNzIHJlcHJlc2VudGluZyBhIEpTT04gUG9pbnRlci4gQSBKU09OIFBvaW50ZXIgaXNcbiAgICogdXNlZCB0byBwb2ludCB0byBhIHNwZWNpZmljIHN1Yi1pdGVtIHdpdGhpbiBhIEpTT04gZG9jdW1lbnQuXG4gICAqXG4gICAqIEV4YW1wbGUgKG5vZGUuanMpO1xuICAgKlxuICAgKiAgICAganNvbnBhdGNoID0gcmVxdWlyZSgnanNvbnBhdGNoJyk7XG4gICAqICAgICB2YXIgcG9pbnRlciA9IG5ldyBqc29ucGF0Y2guSlNPTlBvaW50ZXIoJy9wYXRoL3RvL2l0ZW0nKTtcbiAgICogICAgIHZhciBpdGVtID0gcG9pbnRlci5mb2xsb3coZG9jKVxuICAgKlxuICAgKi9cbiAgZXhwb3J0cy5KU09OUG9pbnRlciA9IEpTT05Qb2ludGVyID0gZnVuY3Rpb24gSlNPTlBvaW50ZXIgKHBhdGhTdHIpIHtcbiAgICB2YXIgaSxzcGxpdCxwYXRoPVtdO1xuICAgIC8vIFNwbGl0IHVwIHRoZSBwYXRoXG4gICAgc3BsaXQgPSBwYXRoU3RyLnNwbGl0KCcvJyk7XG4gICAgaWYgKCcnICE9PSBzcGxpdFswXSkge1xuICAgICAgdGhyb3cgbmV3IEludmFsaWRQYXRjaCgnSlNPTlBvaW50ZXIgbXVzdCBzdGFydCB3aXRoIGEgc2xhc2ggKG9yIGJlIGFuIGVtcHR5IHN0cmluZykhJyk7XG4gICAgfVxuICAgIGZvciAoaSA9IDE7IGkgPCBzcGxpdC5sZW5ndGg7IGkrKykge1xuICAgICAgcGF0aFtpLTFdID0gc3BsaXRbaV0ucmVwbGFjZSgvfjEvZywnLycpLnJlcGxhY2UoL34wL2csJ34nKTtcbiAgICB9XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLmxlbmd0aCA9IHBhdGgubGVuZ3RoO1xuICB9O1xuXG4gIC8qIFByaXZhdGU6IEdldCBhIHNlZ21lbnQgb2YgdGhlIHBvaW50ZXIgZ2l2ZW4gYSBjdXJyZW50IGRvY1xuICAgKiBjb250ZXh0LlxuICAgKi9cbiAgSlNPTlBvaW50ZXIucHJvdG90eXBlLl9nZXRfc2VnbWVudCA9IGZ1bmN0aW9uIChpbmRleCwgbm9kZSkge1xuICAgIHZhciBzZWdtZW50ID0gdGhpcy5wYXRoW2luZGV4XTtcbiAgICBpZihpc0FycmF5KG5vZGUpKSB7XG4gICAgICBpZiAoJy0nID09PSBzZWdtZW50KSB7XG4gICAgICAgIHNlZ21lbnQgPSBub2RlLmxlbmd0aDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE11c3QgYmUgYSBub24tbmVnYXRpdmUgaW50ZWdlciBpbiBiYXNlLTEwXG4gICAgICAgIGlmICghc2VnbWVudC5tYXRjaCgvXlswLTldKiQvKSkge1xuICAgICAgICAgIHRocm93IG5ldyBQYXRjaEFwcGx5RXJyb3IoJ0V4cGVjdGVkIGEgbnVtYmVyIHRvIHNlZ21lbnQgYW4gYXJyYXknKTtcbiAgICAgICAgfVxuICAgICAgICBzZWdtZW50ID0gcGFyc2VJbnQoc2VnbWVudCwxMCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzZWdtZW50O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNoYWxsb3cgY29weSBvZiBhbiBvYmplY3RcbiAgZnVuY3Rpb24gY2xvbmUobykge1xuICAgIHZhciBjbG9uZWQsIGtleTtcbiAgICBpZiAoaXNBcnJheShvKSkge1xuICAgICAgcmV0dXJuIG8uc2xpY2UoKTtcbiAgICAvLyB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBidXQgd2Ugd2FudCB0byBjb3B5IGl0IGFzIG51bGxcbiAgICB9IGlmIChvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBvID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBjbG9uZWQgPSB7fTtcbiAgICAgIGZvcihrZXkgaW4gbykge1xuICAgICAgICBpZiAoT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobywga2V5KSkge1xuICAgICAgICAgIGNsb25lZFtrZXldID0gb1trZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gY2xvbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbztcbiAgICB9XG4gIH1cblxuICAvKiBQcml2YXRlOiBGb2xsb3cgdGhlIHBvaW50ZXIgdG8gaXRzIHBlbnVsdGltYXRlIHNlZ21lbnQgdGhlbiBjYWxsXG4gICAqIHRoZSBoYW5kbGVyIHdpdGggdGhlIGN1cnJlbnQgZG9jIGFuZCB0aGUgbGFzdCBrZXkgKGNvbnZlcnRlZCB0b1xuICAgKiBhbiBpbnQgaWYgdGhlIGN1cnJlbnQgZG9jIGlzIGFuIGFycmF5KS4gVGhlIGhhbmRsZXIgaXMgZXhwZWN0ZWQgdG9cbiAgICogcmV0dXJuIGEgbmV3IGNvcHkgb2YgdGhlIHBlbnVsdGltYXRlIHBhcnQuXG4gICAqXG4gICAqIGRvYyAtIFRoZSBkb2N1bWVudCB0byBzZWFyY2ggd2l0aGluXG4gICAqIGhhbmRsZXIgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSBsYXN0IHBhcnRcbiAgICpcbiAgICogUmV0dXJucyB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIGhhbmRsZXJcbiAgICovXG4gIEpTT05Qb2ludGVyLnByb3RvdHlwZS5fYWN0aW9uID0gZnVuY3Rpb24gKGRvYywgaGFuZGxlciwgbXV0YXRlKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGZ1bmN0aW9uIGZvbGxvd19wb2ludGVyKG5vZGUsIGluZGV4KSB7XG4gICAgICB2YXIgc2VnbWVudCwgc3Vibm9kZTtcbiAgICAgIGlmICghbXV0YXRlKSB7XG4gICAgICAgIG5vZGUgPSBjbG9uZShub2RlKTtcbiAgICAgIH1cbiAgICAgIHNlZ21lbnQgPSB0aGF0Ll9nZXRfc2VnbWVudChpbmRleCwgbm9kZSk7XG4gICAgICAvLyBJcyB0aGlzIHRoZSBsYXN0IHNlZ21lbnQ/XG4gICAgICBpZiAoaW5kZXggPT0gdGhhdC5wYXRoLmxlbmd0aC0xKSB7XG4gICAgICAgIG5vZGUgPSBoYW5kbGVyKG5vZGUsIHNlZ21lbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGNhbiBmb2xsb3cgdGhlIHNlZ21lbnRcbiAgICAgICAgaWYgKGlzQXJyYXkobm9kZSkpIHtcbiAgICAgICAgICBpZiAobm9kZS5sZW5ndGggPD0gc2VnbWVudCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFBhdGNoQXBwbHlFcnJvcignUGF0aCBub3QgZm91bmQgaW4gZG9jdW1lbnQnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5vZGUgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICBpZiAoIU9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKG5vZGUsIHNlZ21lbnQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUGF0Y2hBcHBseUVycm9yKCdQYXRoIG5vdCBmb3VuZCBpbiBkb2N1bWVudCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUGF0Y2hBcHBseUVycm9yKCdQYXRoIG5vdCBmb3VuZCBpbiBkb2N1bWVudCcpO1xuICAgICAgICB9XG4gICAgICAgIHN1Ym5vZGUgPSBmb2xsb3dfcG9pbnRlcihub2RlW3NlZ21lbnRdLCBpbmRleCsxKTtcbiAgICAgICAgaWYgKCFtdXRhdGUpIHtcbiAgICAgICAgICBub2RlW3NlZ21lbnRdID0gc3Vibm9kZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIHJldHVybiBmb2xsb3dfcG9pbnRlcihkb2MsIDApO1xuICB9O1xuXG4gIC8qIFB1YmxpYzogVGFrZXMgYSBKU09OIGRvY3VtZW50IGFuZCBhIHZhbHVlIGFuZCBhZGRzIHRoZSB2YWx1ZSBpbnRvXG4gICAqIHRoZSBkb2MgYXQgdGhlIHBvc2l0aW9uIHBvaW50ZWQgdG8uIElmIHRoZSBwb3NpdGlvbiBwb2ludGVkIHRvIGlzXG4gICAqIGluIGFuIGFycmF5IHRoZW4gdGhlIGV4aXN0aW5nIGVsZW1lbnQgYXQgdGhhdCBwb3NpdGlvbiAoaWYgYW55KVxuICAgKiBhbmQgYWxsIHRoYXQgZm9sbG93IGl0IGhhdmUgdGhlaXIgcG9zaXRpb24gaW5jcmVtZW50ZWQgdG8gbWFrZVxuICAgKiByb29tLiBJdCBpcyBhbiBlcnJvciB0byBhZGQgdG8gYSBwYXJlbnQgb2JqZWN0IHRoYXQgZG9lc24ndCBleGlzdFxuICAgKiBvciB0byB0cnkgdG8gcmVwbGFjZSBhbiBleGlzdGluZyB2YWx1ZSBpbiBhbiBvYmplY3QuXG4gICAqXG4gICAqIGRvYyAtIFRoZSBkb2N1bWVudCB0byBvcGVyYXRlIGFnYWluc3QuIFdpbGwgYmUgbXV0YXRlZCBzbyBzaG91bGRcbiAgICogbm90IGJlIHJldXNlZCBhZnRlciB0aGUgY2FsbC5cbiAgICogdmFsdWUgLSBUaGUgdmFsdWUgdG8gaW5zZXJ0IGF0IHRoZSBwb3NpdGlvbiBwb2ludGVkIHRvXG4gICAqXG4gICAqIEV4YW1wbGVzXG4gICAqXG4gICAqICAgIHZhciBkb2MgPSBuZXcgSlNPTlBvaW50ZXIoXCIvb2JqL25ld1wiKS5hZGQoe29iajoge29sZDogXCJoZWxsb1wifX0sIFwid29ybGRcIik7XG4gICAqICAgIC8vIGRvYyBub3cgZXF1YWxzIHtvYmo6IHtvbGQ6IFwiaGVsbG9cIiwgbmV3OiBcIndvcmxkXCJ9fVxuICAgKlxuICAgKiBSZXR1cm5zIHRoZSB1cGRhdGVkIGRvYyAodGhlIHZhbHVlIHBhc3NlZCBpbiBtYXkgYWxzbyBoYXZlIGJlZW4gbXV0YXRlZClcbiAgICovXG4gIEpTT05Qb2ludGVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAoZG9jLCB2YWx1ZSwgbXV0YXRlKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlIGZvciBhIHBvaW50ZXIgdG8gdGhlIHJvb3RcbiAgICBpZiAoMCA9PT0gdGhpcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FjdGlvbihkb2MsIGZ1bmN0aW9uIChub2RlLCBsYXN0U2VnbWVudCkge1xuICAgICAgaWYgKGlzQXJyYXkobm9kZSkpIHtcbiAgICAgICAgaWYgKGxhc3RTZWdtZW50ID4gbm9kZS5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUGF0Y2hBcHBseUVycm9yKCdBZGQgb3BlcmF0aW9uIG11c3Qgbm90IGF0dGVtcHQgdG8gY3JlYXRlIGEgc3BhcnNlIGFycmF5IScpO1xuICAgICAgICB9XG4gICAgICAgIG5vZGUuc3BsaWNlKGxhc3RTZWdtZW50LCAwLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlW2xhc3RTZWdtZW50XSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSwgbXV0YXRlKTtcbiAgfTtcblxuXG4gIC8qIFB1YmxpYzogVGFrZXMgYSBKU09OIGRvY3VtZW50IGFuZCByZW1vdmVzIHRoZSB2YWx1ZSBwb2ludGVkIHRvLlxuICAgKiBJdCBpcyBhbiBlcnJvciB0byBhdHRlbXB0IHRvIHJlbW92ZSBhIHZhbHVlIHRoYXQgZG9lc24ndCBleGlzdC5cbiAgICpcbiAgICogZG9jIC0gVGhlIGRvY3VtZW50IHRvIG9wZXJhdGUgYWdhaW5zdC4gTWF5IGJlIG11dGF0ZWQgc28gc2hvdWxkXG4gICAqIG5vdCBiZSByZXVzZWQgYWZ0ZXIgdGhlIGNhbGwuXG4gICAqXG4gICAqIEV4YW1wbGVzXG4gICAqXG4gICAqICAgIHZhciBkb2MgPSBuZXcgSlNPTlBvaW50ZXIoXCIvb2JqL29sZFwiKS5hZGQoe29iajoge29sZDogXCJoZWxsb1wifX0pO1xuICAgKiAgICAvLyBkb2Mgbm93IGVxdWFscyB7b2JqOiB7fX1cbiAgICpcbiAgICogUmV0dXJucyB0aGUgdXBkYXRlZCBkb2MgKHRoZSB2YWx1ZSBwYXNzZWQgaW4gbWF5IGFsc28gaGF2ZSBiZWVuIG11dGF0ZWQpXG4gICAqL1xuICBKU09OUG9pbnRlci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKGRvYywgbXV0YXRlKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlIGZvciBhIHBvaW50ZXIgdG8gdGhlIHJvb3RcbiAgICBpZiAoMCA9PT0gdGhpcy5sZW5ndGgpIHtcbiAgICAgIC8vIFJlbW92aW5nIHRoZSByb290IG1ha2VzIHRoZSB3aG9sZSB2YWx1ZSB1bmRlZmluZWQuXG4gICAgICAvLyBOT1RFOiBTaG91bGQgaXQgYmUgYW4gZXJyb3IgdG8gcmVtb3ZlIHRoZSByb290IGlmIGl0IGlzXG4gICAgICAvLyBBTFJFQURZIHVuZGVmaW5lZD8gSSdtIG5vdCBzdXJlLi4uXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fYWN0aW9uKGRvYywgZnVuY3Rpb24gKG5vZGUsIGxhc3RTZWdtZW50KSB7XG4gICAgICAgIGlmICghT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobm9kZSxsYXN0U2VnbWVudCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUGF0Y2hBcHBseUVycm9yKCdSZW1vdmUgb3BlcmF0aW9uIG11c3QgcG9pbnQgdG8gYW4gZXhpc3RpbmcgdmFsdWUhJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzQXJyYXkobm9kZSkpIHtcbiAgICAgICAgICBub2RlLnNwbGljZShsYXN0U2VnbWVudCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG5vZGVbbGFzdFNlZ21lbnRdO1xuICAgICAgICB9XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9LCBtdXRhdGUpO1xuICB9O1xuXG4gIC8qIFB1YmxpYzogU2VtYW50aWNhbGx5IGVxdWl2YWxlbnQgdG8gYSByZW1vdmUgZm9sbG93ZWQgYnkgYW4gYWRkXG4gICAqIGV4Y2VwdCB3aGVuIHRoZSBwb2ludGVyIHBvaW50cyB0byB0aGUgcm9vdCBlbGVtZW50IGluIHdoaWNoIGNhc2VcbiAgICogdGhlIHdob2xlIGRvY3VtZW50IGlzIHJlcGxhY2VkLlxuICAgKlxuICAgKiBkb2MgLSBUaGUgZG9jdW1lbnQgdG8gb3BlcmF0ZSBhZ2FpbnN0LiBNYXkgYmUgbXV0YXRlZCBzbyBzaG91bGRcbiAgICogbm90IGJlIHJldXNlZCBhZnRlciB0aGUgY2FsbC5cbiAgICpcbiAgICogRXhhbXBsZXNcbiAgICpcbiAgICogICAgdmFyIGRvYyA9IG5ldyBKU09OUG9pbnRlcihcIi9vYmovb2xkXCIpLnJlcGxhY2Uoe29iajoge29sZDogXCJoZWxsb1wifX0sIFwid29ybGRcIik7XG4gICAqICAgIC8vIGRvYyBub3cgZXF1YWxzIHtvYmo6IHtvbGQ6IFwid29ybGRcIn19XG4gICAqXG4gICAqIFJldHVybnMgdGhlIHVwZGF0ZWQgZG9jICh0aGUgdmFsdWUgcGFzc2VkIGluIG1heSBhbHNvIGhhdmUgYmVlbiBtdXRhdGVkKVxuICAgKi9cbiAgSlNPTlBvaW50ZXIucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbiAoZG9jLCB2YWx1ZSwgbXV0YXRlKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlIGZvciBhIHBvaW50ZXIgdG8gdGhlIHJvb3RcbiAgICBpZiAoMCA9PT0gdGhpcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FjdGlvbihkb2MsIGZ1bmN0aW9uIChub2RlLCBsYXN0U2VnbWVudCkge1xuICAgICAgICBpZiAoIU9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKG5vZGUsbGFzdFNlZ21lbnQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFBhdGNoQXBwbHlFcnJvcignUmVwbGFjZSBvcGVyYXRpb24gbXVzdCBwb2ludCB0byBhbiBleGlzdGluZyB2YWx1ZSEnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNBcnJheShub2RlKSkge1xuICAgICAgICAgIG5vZGUuc3BsaWNlKGxhc3RTZWdtZW50LCAxLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbm9kZVtsYXN0U2VnbWVudF0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSwgbXV0YXRlKTtcbiAgfTtcblxuICAvKiBQdWJsaWM6IFJldHVybnMgdGhlIHZhbHVlIHBvaW50ZWQgdG8gYnkgdGhlIHBvaW50ZXIgaW4gdGhlIGdpdmVuIGRvYy5cbiAgICpcbiAgICogZG9jIC0gVGhlIGRvY3VtZW50IHRvIG9wZXJhdGUgYWdhaW5zdC5cbiAgICpcbiAgICogRXhhbXBsZXNcbiAgICpcbiAgICogICAgdmFyIHZhbHVlID0gbmV3IEpTT05Qb2ludGVyKFwiL29iai92YWx1ZVwiKS5nZXQoe29iajoge3ZhbHVlOiBcImhlbGxvXCJ9fSk7XG4gICAqICAgIC8vIHZhbHVlIG5vdyBlcXVhbHMgJ2hlbGxvJ1xuICAgKlxuICAgKiBSZXR1cm5zIHRoZSB2YWx1ZVxuICAgKi9cbiAgSlNPTlBvaW50ZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChkb2MpIHtcbiAgICB2YXIgdmFsdWU7XG4gICAgaWYgKDAgPT09IHRoaXMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZG9jO1xuICAgIH1cbiAgICB0aGlzLl9hY3Rpb24oZG9jLCBmdW5jdGlvbiAobm9kZSwgbGFzdFNlZ21lbnQpIHtcbiAgICAgIGlmICghT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobm9kZSxsYXN0U2VnbWVudCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGNoQXBwbHlFcnJvcignUGF0aCBub3QgZm91bmQgaW4gZG9jdW1lbnQnKTtcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gbm9kZVtsYXN0U2VnbWVudF07XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9LCB0cnVlKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cblxuICAvKiBQdWJsaWM6IHJldHVybnMgdHJ1ZSBpZiB0aGlzIHBvaW50ZXIgcG9pbnRzIHRvIGEgY2hpbGQgb2YgdGhlXG4gICAqIG90aGVyIHBvaW50ZXIgZ2l2ZW4uIFJldHVybnMgdHJ1ZSBpZiBib3RoIHBvaW50IHRvIHRoZSBzYW1lIHBsYWNlLlxuICAgKlxuICAgKiBvdGhlclBvaW50ZXIgLSBBbm90aGVyIEpTT05Qb2ludGVyIG9iamVjdFxuICAgKlxuICAgKiBFeGFtcGxlc1xuICAgKlxuICAgKiAgICB2YXIgcG9pbnRlcjEgPSBuZXcgSlNPTlBvaW50ZXIoJy9hbmltYWxzL21hbW1hbHMvY2F0cy9ob2xseScpO1xuICAgKiAgICB2YXIgcG9pbnRlcjIgPSBuZXcgSlNPTlBvaW50ZXIoJy9hbmltYWxzL21hbW1hbHMvY2F0cycpO1xuICAgKiAgICB2YXIgaXNDaGlsZCA9IHBvaW50ZXIxLnN1YnNldE9mKHBvaW50ZXIyKTtcbiAgICpcbiAgICogUmV0dXJucyBhIGJvb2xlYW5cbiAgICovXG4gIEpTT05Qb2ludGVyLnByb3RvdHlwZS5zdWJzZXRPZiA9IGZ1bmN0aW9uIChvdGhlclBvaW50ZXIpIHtcbiAgICBpZiAodGhpcy5sZW5ndGggPD0gb3RoZXJQb2ludGVyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG90aGVyUG9pbnRlci5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKG90aGVyUG9pbnRlci5wYXRoW2ldICE9PSB0aGlzLnBhdGhbaV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICBfb3BlcmF0aW9uUmVxdWlyZWQgPSB7XG4gICAgYWRkOiBbJ3ZhbHVlJ10sXG4gICAgcmVwbGFjZTogWyd2YWx1ZSddLFxuICAgIHRlc3Q6IFsndmFsdWUnXSxcbiAgICByZW1vdmU6IFtdLFxuICAgIG1vdmU6IFsnZnJvbSddLFxuICAgIGNvcHk6IFsnZnJvbSddXG4gIH07XG5cbiAgLy8gQ2hlY2sgaWYgYSBpcyBkZWVwIGVxdWFsIHRvIGIgKGJ5IHRoZSBydWxlcyBnaXZlbiBpbiB0aGVcbiAgLy8gSlNPTlBhdGNoIHNwZWMpXG4gIGZ1bmN0aW9uIGRlZXBFcXVhbChhLGIpIHtcbiAgICB2YXIga2V5O1xuICAgIGlmIChhID09PSBiKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhICE9PSB0eXBlb2YgYikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT09IHR5cGVvZihhKSkge1xuICAgICAgdmFyIGFJc0FycmF5ID0gaXNBcnJheShhKSxcbiAgICAgICAgICBiSXNBcnJheSA9IGlzQXJyYXkoYik7XG4gICAgICBpZiAoYUlzQXJyYXkgIT09IGJJc0FycmF5KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAoYUlzQXJyYXkpIHtcbiAgICAgICAgLy8gQm90aCBhcmUgYXJyYXlzXG4gICAgICAgIGlmIChhLmxlbmd0aCAhPSBiLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHJldHVybiBkZWVwRXF1YWwoYVtpXSwgYltpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDaGVjayBlYWNoIGtleSBvZiB0aGUgb2JqZWN0IHJlY3Vyc2l2ZWx5XG4gICAgICAgIGZvcihrZXkgaW4gYSkge1xuICAgICAgICAgIGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkoYSwga2V5KSkge1xuICAgICAgICAgICAgaWYgKCEoT2JqZWN0Lmhhc093blByb3BlcnR5KGIsa2V5KSAmJiBkZWVwRXF1YWwoYVtrZXldLCBiW2tleV0pKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvcihrZXkgaW4gYikge1xuICAgICAgICAgIGlmKE9iamVjdC5oYXNPd25Qcm9wZXJ0eShiLGtleSkgJiYgIU9iamVjdC5oYXNPd25Qcm9wZXJ0eShhLCBrZXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVPcChvcGVyYXRpb24pIHtcbiAgICB2YXIgaSwgcmVxdWlyZWQ7XG4gICAgaWYgKCFvcGVyYXRpb24ub3ApIHtcbiAgICAgIHRocm93IG5ldyBJbnZhbGlkUGF0Y2goJ09wZXJhdGlvbiBtaXNzaW5nIScpO1xuICAgIH1cbiAgICBpZiAoIV9vcGVyYXRpb25SZXF1aXJlZC5oYXNPd25Qcm9wZXJ0eShvcGVyYXRpb24ub3ApKSB7XG4gICAgICB0aHJvdyBuZXcgSW52YWxpZFBhdGNoKCdJbnZhbGlkIG9wZXJhdGlvbiEnKTtcbiAgICB9XG4gICAgaWYgKCEoJ3BhdGgnIGluIG9wZXJhdGlvbikpIHtcbiAgICAgIHRocm93IG5ldyBJbnZhbGlkUGF0Y2goJ1BhdGggbWlzc2luZyEnKTtcbiAgICB9XG5cbiAgICByZXF1aXJlZCA9IF9vcGVyYXRpb25SZXF1aXJlZFtvcGVyYXRpb24ub3BdO1xuXG4gICAgLy8gQ2hlY2sgdGhhdCBhbGwgcmVxdWlyZWQga2V5cyBhcmUgcHJlc2VudFxuICAgIGZvcihpID0gMDsgaSA8IHJlcXVpcmVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZighKHJlcXVpcmVkW2ldIGluIG9wZXJhdGlvbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRQYXRjaChvcGVyYXRpb24ub3AgKyAnIG11c3QgaGF2ZSBrZXkgJyArIHJlcXVpcmVkW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjb21waWxlT3BlcmF0aW9uKG9wZXJhdGlvbiwgbXV0YXRlKSB7XG4gICAgdmFsaWRhdGVPcChvcGVyYXRpb24pO1xuICAgIHZhciBvcCA9IG9wZXJhdGlvbi5vcDtcbiAgICB2YXIgcGF0aCA9IG5ldyBKU09OUG9pbnRlcihvcGVyYXRpb24ucGF0aCk7XG4gICAgdmFyIHZhbHVlID0gb3BlcmF0aW9uLnZhbHVlO1xuICAgIHZhciBmcm9tID0gb3BlcmF0aW9uLmZyb20gPyBuZXcgSlNPTlBvaW50ZXIob3BlcmF0aW9uLmZyb20pIDogbnVsbDtcblxuICAgIHN3aXRjaCAob3ApIHtcbiAgICBjYXNlICdhZGQnOlxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmV0dXJuIHBhdGguYWRkKGRvYywgdmFsdWUsIG11dGF0ZSk7XG4gICAgICB9O1xuICAgIGNhc2UgJ3JlbW92ZSc6XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGRvYykge1xuICAgICAgICByZXR1cm4gcGF0aC5yZW1vdmUoZG9jLCBtdXRhdGUpO1xuICAgICAgfTtcbiAgICBjYXNlICdyZXBsYWNlJzpcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHJldHVybiBwYXRoLnJlcGxhY2UoZG9jLCB2YWx1ZSwgbXV0YXRlKTtcbiAgICAgIH07XG4gICAgY2FzZSAnbW92ZSc6XG4gICAgICAvLyBDaGVjayB0aGF0IGRlc3RpbmF0aW9uIGlzbid0IGluc2lkZSB0aGUgc291cmNlXG4gICAgICBpZiAocGF0aC5zdWJzZXRPZihmcm9tKSkge1xuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZFBhdGNoKCdkZXN0aW5hdGlvbiBtdXN0IG5vdCBiZSBhIGNoaWxkIG9mIHNvdXJjZScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZnJvbS5nZXQoZG9jKTtcbiAgICAgICAgdmFyIGludGVybWVkaWF0ZSA9IGZyb20ucmVtb3ZlKGRvYywgbXV0YXRlKTtcbiAgICAgICAgcmV0dXJuIHBhdGguYWRkKGludGVybWVkaWF0ZSwgdmFsdWUsIG11dGF0ZSk7XG4gICAgICB9O1xuICAgIGNhc2UgJ2NvcHknOlxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZnJvbS5nZXQoZG9jKTtcbiAgICAgICAgcmV0dXJuIHBhdGguYWRkKGRvYywgdmFsdWUsIG11dGF0ZSk7XG4gICAgICB9O1xuICAgIGNhc2UgJ3Rlc3QnOlxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgaWYgKCFkZWVwRXF1YWwocGF0aC5nZXQoZG9jKSwgdmFsdWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFBhdGNoQXBwbHlFcnJvcihcIlRlc3Qgb3BlcmF0aW9uIGZhaWxlZC4gVmFsdWUgZGlkIG5vdCBtYXRjaC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRvYztcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyogUHVibGljOiBBIGNsYXNzIHJlcHJlc2VudGluZyBhIHBhdGNoLlxuICAgKlxuICAgKiAgcGF0Y2ggLSBUaGUgcGF0Y2ggYXMgYW4gYXJyYXkgb3IgYXMgYSBKU09OIHN0cmluZyAoY29udGFpbmluZyBhblxuICAgKiAgICAgICAgICBhcnJheSlcbiAgICogIG11dGF0ZSAtIEluZGljYXRlcyB0aGF0IGlucHV0IGRvY3VtZW50cyBzaG91bGQgYmUgbXV0YXRlZFxuICAgKiAgICAgICAgICAgKGRlZmF1bHQgaXMgZm9yIHRoZSBpbnB1dCB0byBiZSB1bmFmZmVjdGVkLikgVGhpcyB3aWxsXG4gICAqICAgICAgICAgICBub3Qgd29yayBjb3JyZWN0bHkgaWYgdGhlIHBhdGNoIHJlcGxhY2VzIHRoZSByb290IG9mXG4gICAqICAgICAgICAgICB0aGUgZG9jdW1lbnQuXG4gICAqL1xuICBleHBvcnRzLkpTT05QYXRjaCA9IEpTT05QYXRjaCA9IGZ1bmN0aW9uIEpTT05QYXRjaChwYXRjaCwgbXV0YXRlKSB7XG4gICAgdGhpcy5fY29tcGlsZShwYXRjaCwgbXV0YXRlKTtcbiAgfTtcblxuICBKU09OUGF0Y2gucHJvdG90eXBlLl9jb21waWxlID0gZnVuY3Rpb24gKHBhdGNoLCBtdXRhdGUpIHtcbiAgICB2YXIgaSwgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuY29tcGlsZWRPcHMgPSBbXTtcblxuICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHBhdGNoKSB7XG4gICAgICBwYXRjaCA9IEpTT04ucGFyc2UocGF0Y2gpO1xuICAgIH1cbiAgICBpZighaXNBcnJheShwYXRjaCkpIHtcbiAgICAgIHRocm93IG5ldyBJbnZhbGlkUGF0Y2goJ1BhdGNoIG11c3QgYmUgYW4gYXJyYXkgb2Ygb3BlcmF0aW9ucycpO1xuICAgIH1cbiAgICBmb3IoaSA9IDA7IGkgPCBwYXRjaC5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNvbXBpbGVkID0gY29tcGlsZU9wZXJhdGlvbihwYXRjaFtpXSwgbXV0YXRlKTtcbiAgICAgIF90aGlzLmNvbXBpbGVkT3BzLnB1c2goY29tcGlsZWQpO1xuICAgIH1cbiAgfTtcblxuICAvKiBQdWJsaWM6IEFwcGx5IHRoZSBwYXRjaCB0byBhIGRvY3VtZW50IGFuZCByZXR1cm5zIHRoZSBwYXRjaGVkXG4gICAqIGRvY3VtZW50LlxuICAgKlxuICAgKiBkb2MgLSBUaGUgZG9jdW1lbnQgdG8gd2hpY2ggdGhlIHBhdGNoIHNob3VsZCBiZSBhcHBsaWVkLlxuICAgKlxuICAgKiBSZXR1cm5zIHRoZSBwYXRjaGVkIGRvY3VtZW50XG4gICAqL1xuICBleHBvcnRzLkpTT05QYXRjaC5wcm90b3R5cGUuYXBwbHkgPSBmdW5jdGlvbiAoZG9jKSB7XG4gICAgdmFyIGk7XG4gICAgZm9yKGkgPSAwOyBpIDwgdGhpcy5jb21waWxlZE9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgZG9jID0gdGhpcy5jb21waWxlZE9wc1tpXShkb2MpO1xuICAgIH1cbiAgICByZXR1cm4gZG9jO1xuICB9O1xuXG59KSk7XG4iLCJ2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGtpbmRPZih2YWwpIHtcbiAgaWYgKHZhbCA9PT0gdm9pZCAwKSByZXR1cm4gJ3VuZGVmaW5lZCc7XG4gIGlmICh2YWwgPT09IG51bGwpIHJldHVybiAnbnVsbCc7XG5cbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsO1xuICBpZiAodHlwZSA9PT0gJ2Jvb2xlYW4nKSByZXR1cm4gJ2Jvb2xlYW4nO1xuICBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHJldHVybiAnc3RyaW5nJztcbiAgaWYgKHR5cGUgPT09ICdudW1iZXInKSByZXR1cm4gJ251bWJlcic7XG4gIGlmICh0eXBlID09PSAnc3ltYm9sJykgcmV0dXJuICdzeW1ib2wnO1xuICBpZiAodHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBpc0dlbmVyYXRvckZuKHZhbCkgPyAnZ2VuZXJhdG9yZnVuY3Rpb24nIDogJ2Z1bmN0aW9uJztcbiAgfVxuXG4gIGlmIChpc0FycmF5KHZhbCkpIHJldHVybiAnYXJyYXknO1xuICBpZiAoaXNCdWZmZXIodmFsKSkgcmV0dXJuICdidWZmZXInO1xuICBpZiAoaXNBcmd1bWVudHModmFsKSkgcmV0dXJuICdhcmd1bWVudHMnO1xuICBpZiAoaXNEYXRlKHZhbCkpIHJldHVybiAnZGF0ZSc7XG4gIGlmIChpc0Vycm9yKHZhbCkpIHJldHVybiAnZXJyb3InO1xuICBpZiAoaXNSZWdleHAodmFsKSkgcmV0dXJuICdyZWdleHAnO1xuXG4gIHN3aXRjaCAoY3Rvck5hbWUodmFsKSkge1xuICAgIGNhc2UgJ1N5bWJvbCc6IHJldHVybiAnc3ltYm9sJztcbiAgICBjYXNlICdQcm9taXNlJzogcmV0dXJuICdwcm9taXNlJztcblxuICAgIC8vIFNldCwgTWFwLCBXZWFrU2V0LCBXZWFrTWFwXG4gICAgY2FzZSAnV2Vha01hcCc6IHJldHVybiAnd2Vha21hcCc7XG4gICAgY2FzZSAnV2Vha1NldCc6IHJldHVybiAnd2Vha3NldCc7XG4gICAgY2FzZSAnTWFwJzogcmV0dXJuICdtYXAnO1xuICAgIGNhc2UgJ1NldCc6IHJldHVybiAnc2V0JztcblxuICAgIC8vIDgtYml0IHR5cGVkIGFycmF5c1xuICAgIGNhc2UgJ0ludDhBcnJheSc6IHJldHVybiAnaW50OGFycmF5JztcbiAgICBjYXNlICdVaW50OEFycmF5JzogcmV0dXJuICd1aW50OGFycmF5JztcbiAgICBjYXNlICdVaW50OENsYW1wZWRBcnJheSc6IHJldHVybiAndWludDhjbGFtcGVkYXJyYXknO1xuXG4gICAgLy8gMTYtYml0IHR5cGVkIGFycmF5c1xuICAgIGNhc2UgJ0ludDE2QXJyYXknOiByZXR1cm4gJ2ludDE2YXJyYXknO1xuICAgIGNhc2UgJ1VpbnQxNkFycmF5JzogcmV0dXJuICd1aW50MTZhcnJheSc7XG5cbiAgICAvLyAzMi1iaXQgdHlwZWQgYXJyYXlzXG4gICAgY2FzZSAnSW50MzJBcnJheSc6IHJldHVybiAnaW50MzJhcnJheSc7XG4gICAgY2FzZSAnVWludDMyQXJyYXknOiByZXR1cm4gJ3VpbnQzMmFycmF5JztcbiAgICBjYXNlICdGbG9hdDMyQXJyYXknOiByZXR1cm4gJ2Zsb2F0MzJhcnJheSc7XG4gICAgY2FzZSAnRmxvYXQ2NEFycmF5JzogcmV0dXJuICdmbG9hdDY0YXJyYXknO1xuICB9XG5cbiAgaWYgKGlzR2VuZXJhdG9yT2JqKHZhbCkpIHtcbiAgICByZXR1cm4gJ2dlbmVyYXRvcic7XG4gIH1cblxuICAvLyBOb24tcGxhaW4gb2JqZWN0c1xuICB0eXBlID0gdG9TdHJpbmcuY2FsbCh2YWwpO1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICdbb2JqZWN0IE9iamVjdF0nOiByZXR1cm4gJ29iamVjdCc7XG4gICAgLy8gaXRlcmF0b3JzXG4gICAgY2FzZSAnW29iamVjdCBNYXAgSXRlcmF0b3JdJzogcmV0dXJuICdtYXBpdGVyYXRvcic7XG4gICAgY2FzZSAnW29iamVjdCBTZXQgSXRlcmF0b3JdJzogcmV0dXJuICdzZXRpdGVyYXRvcic7XG4gICAgY2FzZSAnW29iamVjdCBTdHJpbmcgSXRlcmF0b3JdJzogcmV0dXJuICdzdHJpbmdpdGVyYXRvcic7XG4gICAgY2FzZSAnW29iamVjdCBBcnJheSBJdGVyYXRvcl0nOiByZXR1cm4gJ2FycmF5aXRlcmF0b3InO1xuICB9XG5cbiAgLy8gb3RoZXJcbiAgcmV0dXJuIHR5cGUuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXFxzL2csICcnKTtcbn07XG5cbmZ1bmN0aW9uIGN0b3JOYW1lKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbC5jb25zdHJ1Y3RvciA9PT0gJ2Z1bmN0aW9uJyA/IHZhbC5jb25zdHJ1Y3Rvci5uYW1lIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNBcnJheSh2YWwpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkpIHJldHVybiBBcnJheS5pc0FycmF5KHZhbCk7XG4gIHJldHVybiB2YWwgaW5zdGFuY2VvZiBBcnJheTtcbn1cblxuZnVuY3Rpb24gaXNFcnJvcih2YWwpIHtcbiAgcmV0dXJuIHZhbCBpbnN0YW5jZW9mIEVycm9yIHx8ICh0eXBlb2YgdmFsLm1lc3NhZ2UgPT09ICdzdHJpbmcnICYmIHZhbC5jb25zdHJ1Y3RvciAmJiB0eXBlb2YgdmFsLmNvbnN0cnVjdG9yLnN0YWNrVHJhY2VMaW1pdCA9PT0gJ251bWJlcicpO1xufVxuXG5mdW5jdGlvbiBpc0RhdGUodmFsKSB7XG4gIGlmICh2YWwgaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIHR5cGVvZiB2YWwudG9EYXRlU3RyaW5nID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIHZhbC5nZXREYXRlID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIHZhbC5zZXREYXRlID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc1JlZ2V4cCh2YWwpIHtcbiAgaWYgKHZhbCBpbnN0YW5jZW9mIFJlZ0V4cCkgcmV0dXJuIHRydWU7XG4gIHJldHVybiB0eXBlb2YgdmFsLmZsYWdzID09PSAnc3RyaW5nJ1xuICAgICYmIHR5cGVvZiB2YWwuaWdub3JlQ2FzZSA9PT0gJ2Jvb2xlYW4nXG4gICAgJiYgdHlwZW9mIHZhbC5tdWx0aWxpbmUgPT09ICdib29sZWFuJ1xuICAgICYmIHR5cGVvZiB2YWwuZ2xvYmFsID09PSAnYm9vbGVhbic7XG59XG5cbmZ1bmN0aW9uIGlzR2VuZXJhdG9yRm4obmFtZSwgdmFsKSB7XG4gIHJldHVybiBjdG9yTmFtZShuYW1lKSA9PT0gJ0dlbmVyYXRvckZ1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNHZW5lcmF0b3JPYmoodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsLnRocm93ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIHZhbC5yZXR1cm4gPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgdmFsLm5leHQgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbCkge1xuICB0cnkge1xuICAgIGlmICh0eXBlb2YgdmFsLmxlbmd0aCA9PT0gJ251bWJlcicgJiYgdHlwZW9mIHZhbC5jYWxsZWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyci5tZXNzYWdlLmluZGV4T2YoJ2NhbGxlZScpICE9PSAtMSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBJZiB5b3UgbmVlZCB0byBzdXBwb3J0IFNhZmFyaSA1LTcgKDgtMTAgeXItb2xkIGJyb3dzZXIpLFxuICogdGFrZSBhIGxvb2sgYXQgaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9pcy1idWZmZXJcbiAqL1xuXG5mdW5jdGlvbiBpc0J1ZmZlcih2YWwpIHtcbiAgaWYgKHZhbC5jb25zdHJ1Y3RvciAmJiB0eXBlb2YgdmFsLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHZhbC5jb25zdHJ1Y3Rvci5pc0J1ZmZlcih2YWwpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVG9PYmplY3QodmFsKSB7XG5cdGlmICh2YWwgPT0gbnVsbCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ09iamVjdC5hc3NpZ24gY2Fubm90IGJlIGNhbGxlZCB3aXRoIG51bGwgb3IgdW5kZWZpbmVkJyk7XG5cdH1cblxuXHRyZXR1cm4gT2JqZWN0KHZhbCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcblx0dmFyIGZyb207XG5cdHZhciBrZXlzO1xuXHR2YXIgdG8gPSBUb09iamVjdCh0YXJnZXQpO1xuXG5cdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG5cdFx0ZnJvbSA9IGFyZ3VtZW50c1tzXTtcblx0XHRrZXlzID0gT2JqZWN0LmtleXMoT2JqZWN0KGZyb20pKTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dG9ba2V5c1tpXV0gPSBmcm9tW2tleXNbaV1dO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0bztcbn07XG4iLCJ2YXIgaGFzTWFwID0gdHlwZW9mIE1hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBNYXAucHJvdG90eXBlO1xudmFyIG1hcFNpemVEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciAmJiBoYXNNYXAgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKE1hcC5wcm90b3R5cGUsICdzaXplJykgOiBudWxsO1xudmFyIG1hcFNpemUgPSBoYXNNYXAgJiYgbWFwU2l6ZURlc2NyaXB0b3IgJiYgdHlwZW9mIG1hcFNpemVEZXNjcmlwdG9yLmdldCA9PT0gJ2Z1bmN0aW9uJyA/IG1hcFNpemVEZXNjcmlwdG9yLmdldCA6IG51bGw7XG52YXIgbWFwRm9yRWFjaCA9IGhhc01hcCAmJiBNYXAucHJvdG90eXBlLmZvckVhY2g7XG52YXIgaGFzU2V0ID0gdHlwZW9mIFNldCA9PT0gJ2Z1bmN0aW9uJyAmJiBTZXQucHJvdG90eXBlO1xudmFyIHNldFNpemVEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciAmJiBoYXNTZXQgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKFNldC5wcm90b3R5cGUsICdzaXplJykgOiBudWxsO1xudmFyIHNldFNpemUgPSBoYXNTZXQgJiYgc2V0U2l6ZURlc2NyaXB0b3IgJiYgdHlwZW9mIHNldFNpemVEZXNjcmlwdG9yLmdldCA9PT0gJ2Z1bmN0aW9uJyA/IHNldFNpemVEZXNjcmlwdG9yLmdldCA6IG51bGw7XG52YXIgc2V0Rm9yRWFjaCA9IGhhc1NldCAmJiBTZXQucHJvdG90eXBlLmZvckVhY2g7XG52YXIgaGFzV2Vha01hcCA9IHR5cGVvZiBXZWFrTWFwID09PSAnZnVuY3Rpb24nICYmIFdlYWtNYXAucHJvdG90eXBlO1xudmFyIHdlYWtNYXBIYXMgPSBoYXNXZWFrTWFwID8gV2Vha01hcC5wcm90b3R5cGUuaGFzIDogbnVsbDtcbnZhciBoYXNXZWFrU2V0ID0gdHlwZW9mIFdlYWtTZXQgPT09ICdmdW5jdGlvbicgJiYgV2Vha1NldC5wcm90b3R5cGU7XG52YXIgd2Vha1NldEhhcyA9IGhhc1dlYWtTZXQgPyBXZWFrU2V0LnByb3RvdHlwZS5oYXMgOiBudWxsO1xudmFyIGJvb2xlYW5WYWx1ZU9mID0gQm9vbGVhbi5wcm90b3R5cGUudmFsdWVPZjtcbnZhciBvYmplY3RUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgbWF0Y2ggPSBTdHJpbmcucHJvdG90eXBlLm1hdGNoO1xudmFyIGJpZ0ludFZhbHVlT2YgPSB0eXBlb2YgQmlnSW50ID09PSAnZnVuY3Rpb24nID8gQmlnSW50LnByb3RvdHlwZS52YWx1ZU9mIDogbnVsbDtcblxudmFyIGluc3BlY3RDdXN0b20gPSByZXF1aXJlKCcuL3V0aWwuaW5zcGVjdCcpLmN1c3RvbTtcbnZhciBpbnNwZWN0U3ltYm9sID0gaW5zcGVjdEN1c3RvbSAmJiBpc1N5bWJvbChpbnNwZWN0Q3VzdG9tKSA/IGluc3BlY3RDdXN0b20gOiBudWxsO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluc3BlY3RfKG9iaiwgb3B0aW9ucywgZGVwdGgsIHNlZW4pIHtcbiAgICB2YXIgb3B0cyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBpZiAoaGFzKG9wdHMsICdxdW90ZVN0eWxlJykgJiYgKG9wdHMucXVvdGVTdHlsZSAhPT0gJ3NpbmdsZScgJiYgb3B0cy5xdW90ZVN0eWxlICE9PSAnZG91YmxlJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9uIFwicXVvdGVTdHlsZVwiIG11c3QgYmUgXCJzaW5nbGVcIiBvciBcImRvdWJsZVwiJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiAndW5kZWZpbmVkJztcbiAgICB9XG4gICAgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gJ251bGwnO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHJldHVybiBvYmogPyAndHJ1ZScgOiAnZmFsc2UnO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gaW5zcGVjdFN0cmluZyhvYmosIG9wdHMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgaWYgKG9iaiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIEluZmluaXR5IC8gb2JqID4gMCA/ICcwJyA6ICctMCc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmluZyhvYmopO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ2JpZ2ludCcpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSB2YWxpZC10eXBlb2ZcbiAgICAgICAgcmV0dXJuIFN0cmluZyhvYmopICsgJ24nO1xuICAgIH1cblxuICAgIHZhciBtYXhEZXB0aCA9IHR5cGVvZiBvcHRzLmRlcHRoID09PSAndW5kZWZpbmVkJyA/IDUgOiBvcHRzLmRlcHRoO1xuICAgIGlmICh0eXBlb2YgZGVwdGggPT09ICd1bmRlZmluZWQnKSB7IGRlcHRoID0gMDsgfVxuICAgIGlmIChkZXB0aCA+PSBtYXhEZXB0aCAmJiBtYXhEZXB0aCA+IDAgJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuICdbT2JqZWN0XSc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzZWVuID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBzZWVuID0gW107XG4gICAgfSBlbHNlIGlmIChpbmRleE9mKHNlZW4sIG9iaikgPj0gMCkge1xuICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3BlY3QodmFsdWUsIGZyb20pIHtcbiAgICAgICAgaWYgKGZyb20pIHtcbiAgICAgICAgICAgIHNlZW4gPSBzZWVuLnNsaWNlKCk7XG4gICAgICAgICAgICBzZWVuLnB1c2goZnJvbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluc3BlY3RfKHZhbHVlLCBvcHRzLCBkZXB0aCArIDEsIHNlZW4pO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhciBuYW1lID0gbmFtZU9mKG9iaik7XG4gICAgICAgIHJldHVybiAnW0Z1bmN0aW9uJyArIChuYW1lID8gJzogJyArIG5hbWUgOiAnJykgKyAnXSc7XG4gICAgfVxuICAgIGlmIChpc1N5bWJvbChvYmopKSB7XG4gICAgICAgIHZhciBzeW1TdHJpbmcgPSBTeW1ib2wucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKTtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnID8gbWFya0JveGVkKHN5bVN0cmluZykgOiBzeW1TdHJpbmc7XG4gICAgfVxuICAgIGlmIChpc0VsZW1lbnQob2JqKSkge1xuICAgICAgICB2YXIgcyA9ICc8JyArIFN0cmluZyhvYmoubm9kZU5hbWUpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHZhciBhdHRycyA9IG9iai5hdHRyaWJ1dGVzIHx8IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGF0dHJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBzICs9ICcgJyArIGF0dHJzW2ldLm5hbWUgKyAnPScgKyB3cmFwUXVvdGVzKHF1b3RlKGF0dHJzW2ldLnZhbHVlKSwgJ2RvdWJsZScsIG9wdHMpO1xuICAgICAgICB9XG4gICAgICAgIHMgKz0gJz4nO1xuICAgICAgICBpZiAob2JqLmNoaWxkTm9kZXMgJiYgb2JqLmNoaWxkTm9kZXMubGVuZ3RoKSB7IHMgKz0gJy4uLic7IH1cbiAgICAgICAgcyArPSAnPC8nICsgU3RyaW5nKG9iai5ub2RlTmFtZSkudG9Mb3dlckNhc2UoKSArICc+JztcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAgICAgaWYgKG9iai5sZW5ndGggPT09IDApIHsgcmV0dXJuICdbXSc7IH1cbiAgICAgICAgcmV0dXJuICdbICcgKyBhcnJPYmpLZXlzKG9iaiwgaW5zcGVjdCkuam9pbignLCAnKSArICcgXSc7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKG9iaikpIHtcbiAgICAgICAgdmFyIHBhcnRzID0gYXJyT2JqS2V5cyhvYmosIGluc3BlY3QpO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoID09PSAwKSB7IHJldHVybiAnWycgKyBTdHJpbmcob2JqKSArICddJzsgfVxuICAgICAgICByZXR1cm4gJ3sgWycgKyBTdHJpbmcob2JqKSArICddICcgKyBwYXJ0cy5qb2luKCcsICcpICsgJyB9JztcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmIChpbnNwZWN0U3ltYm9sICYmIHR5cGVvZiBvYmpbaW5zcGVjdFN5bWJvbF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmpbaW5zcGVjdFN5bWJvbF0oKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqLmluc3BlY3QgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmouaW5zcGVjdCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpc01hcChvYmopKSB7XG4gICAgICAgIHZhciBtYXBQYXJ0cyA9IFtdO1xuICAgICAgICBtYXBGb3JFYWNoLmNhbGwob2JqLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgbWFwUGFydHMucHVzaChpbnNwZWN0KGtleSwgb2JqKSArICcgPT4gJyArIGluc3BlY3QodmFsdWUsIG9iaikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb25PZignTWFwJywgbWFwU2l6ZS5jYWxsKG9iaiksIG1hcFBhcnRzKTtcbiAgICB9XG4gICAgaWYgKGlzU2V0KG9iaikpIHtcbiAgICAgICAgdmFyIHNldFBhcnRzID0gW107XG4gICAgICAgIHNldEZvckVhY2guY2FsbChvYmosIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgc2V0UGFydHMucHVzaChpbnNwZWN0KHZhbHVlLCBvYmopKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uT2YoJ1NldCcsIHNldFNpemUuY2FsbChvYmopLCBzZXRQYXJ0cyk7XG4gICAgfVxuICAgIGlmIChpc1dlYWtNYXAob2JqKSkge1xuICAgICAgICByZXR1cm4gd2Vha0NvbGxlY3Rpb25PZignV2Vha01hcCcpO1xuICAgIH1cbiAgICBpZiAoaXNXZWFrU2V0KG9iaikpIHtcbiAgICAgICAgcmV0dXJuIHdlYWtDb2xsZWN0aW9uT2YoJ1dlYWtTZXQnKTtcbiAgICB9XG4gICAgaWYgKGlzTnVtYmVyKG9iaikpIHtcbiAgICAgICAgcmV0dXJuIG1hcmtCb3hlZChpbnNwZWN0KE51bWJlcihvYmopKSk7XG4gICAgfVxuICAgIGlmIChpc0JpZ0ludChvYmopKSB7XG4gICAgICAgIHJldHVybiBtYXJrQm94ZWQoaW5zcGVjdChiaWdJbnRWYWx1ZU9mLmNhbGwob2JqKSkpO1xuICAgIH1cbiAgICBpZiAoaXNCb29sZWFuKG9iaikpIHtcbiAgICAgICAgcmV0dXJuIG1hcmtCb3hlZChib29sZWFuVmFsdWVPZi5jYWxsKG9iaikpO1xuICAgIH1cbiAgICBpZiAoaXNTdHJpbmcob2JqKSkge1xuICAgICAgICByZXR1cm4gbWFya0JveGVkKGluc3BlY3QoU3RyaW5nKG9iaikpKTtcbiAgICB9XG4gICAgaWYgKCFpc0RhdGUob2JqKSAmJiAhaXNSZWdFeHAob2JqKSkge1xuICAgICAgICB2YXIgeHMgPSBhcnJPYmpLZXlzKG9iaiwgaW5zcGVjdCk7XG4gICAgICAgIGlmICh4cy5sZW5ndGggPT09IDApIHsgcmV0dXJuICd7fSc7IH1cbiAgICAgICAgcmV0dXJuICd7ICcgKyB4cy5qb2luKCcsICcpICsgJyB9JztcbiAgICB9XG4gICAgcmV0dXJuIFN0cmluZyhvYmopO1xufTtcblxuZnVuY3Rpb24gd3JhcFF1b3RlcyhzLCBkZWZhdWx0U3R5bGUsIG9wdHMpIHtcbiAgICB2YXIgcXVvdGVDaGFyID0gKG9wdHMucXVvdGVTdHlsZSB8fCBkZWZhdWx0U3R5bGUpID09PSAnZG91YmxlJyA/ICdcIicgOiBcIidcIjtcbiAgICByZXR1cm4gcXVvdGVDaGFyICsgcyArIHF1b3RlQ2hhcjtcbn1cblxuZnVuY3Rpb24gcXVvdGUocykge1xuICAgIHJldHVybiBTdHJpbmcocykucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJzsgfVxuZnVuY3Rpb24gaXNEYXRlKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgRGF0ZV0nOyB9XG5mdW5jdGlvbiBpc1JlZ0V4cChvYmopIHsgcmV0dXJuIHRvU3RyKG9iaikgPT09ICdbb2JqZWN0IFJlZ0V4cF0nOyB9XG5mdW5jdGlvbiBpc0Vycm9yKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgRXJyb3JdJzsgfVxuZnVuY3Rpb24gaXNTeW1ib2wob2JqKSB7IHJldHVybiB0b1N0cihvYmopID09PSAnW29iamVjdCBTeW1ib2xdJzsgfVxuZnVuY3Rpb24gaXNTdHJpbmcob2JqKSB7IHJldHVybiB0b1N0cihvYmopID09PSAnW29iamVjdCBTdHJpbmddJzsgfVxuZnVuY3Rpb24gaXNOdW1iZXIob2JqKSB7IHJldHVybiB0b1N0cihvYmopID09PSAnW29iamVjdCBOdW1iZXJdJzsgfVxuZnVuY3Rpb24gaXNCaWdJbnQob2JqKSB7IHJldHVybiB0b1N0cihvYmopID09PSAnW29iamVjdCBCaWdJbnRdJzsgfVxuZnVuY3Rpb24gaXNCb29sZWFuKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nOyB9XG5cbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5IHx8IGZ1bmN0aW9uIChrZXkpIHsgcmV0dXJuIGtleSBpbiB0aGlzOyB9O1xuZnVuY3Rpb24gaGFzKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn1cblxuZnVuY3Rpb24gdG9TdHIob2JqKSB7XG4gICAgcmV0dXJuIG9iamVjdFRvU3RyaW5nLmNhbGwob2JqKTtcbn1cblxuZnVuY3Rpb24gbmFtZU9mKGYpIHtcbiAgICBpZiAoZi5uYW1lKSB7IHJldHVybiBmLm5hbWU7IH1cbiAgICB2YXIgbSA9IG1hdGNoLmNhbGwoZiwgL15mdW5jdGlvblxccyooW1xcdyRdKykvKTtcbiAgICBpZiAobSkgeyByZXR1cm4gbVsxXTsgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBpbmRleE9mKHhzLCB4KSB7XG4gICAgaWYgKHhzLmluZGV4T2YpIHsgcmV0dXJuIHhzLmluZGV4T2YoeCk7IH1cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHhzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZiAoeHNbaV0gPT09IHgpIHsgcmV0dXJuIGk7IH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBpc01hcCh4KSB7XG4gICAgaWYgKCFtYXBTaXplIHx8ICF4IHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIG1hcFNpemUuY2FsbCh4KTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHNldFNpemUuY2FsbCh4KTtcbiAgICAgICAgfSBjYXRjaCAocykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHggaW5zdGFuY2VvZiBNYXA7IC8vIGNvcmUtanMgd29ya2Fyb3VuZCwgcHJlLXYyLjUuMFxuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1dlYWtNYXAoeCkge1xuICAgIGlmICghd2Vha01hcEhhcyB8fCAheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICB3ZWFrTWFwSGFzLmNhbGwoeCwgd2Vha01hcEhhcyk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB3ZWFrU2V0SGFzLmNhbGwoeCwgd2Vha1NldEhhcyk7XG4gICAgICAgIH0gY2F0Y2ggKHMpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB4IGluc3RhbmNlb2YgV2Vha01hcDsgLy8gY29yZS1qcyB3b3JrYXJvdW5kLCBwcmUtdjIuNS4wXG4gICAgfSBjYXRjaCAoZSkge31cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzU2V0KHgpIHtcbiAgICBpZiAoIXNldFNpemUgfHwgIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgc2V0U2l6ZS5jYWxsKHgpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWFwU2l6ZS5jYWxsKHgpO1xuICAgICAgICB9IGNhdGNoIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCBpbnN0YW5jZW9mIFNldDsgLy8gY29yZS1qcyB3b3JrYXJvdW5kLCBwcmUtdjIuNS4wXG4gICAgfSBjYXRjaCAoZSkge31cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzV2Vha1NldCh4KSB7XG4gICAgaWYgKCF3ZWFrU2V0SGFzIHx8ICF4IHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHdlYWtTZXRIYXMuY2FsbCh4LCB3ZWFrU2V0SGFzKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHdlYWtNYXBIYXMuY2FsbCh4LCB3ZWFrTWFwSGFzKTtcbiAgICAgICAgfSBjYXRjaCAocykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHggaW5zdGFuY2VvZiBXZWFrU2V0OyAvLyBjb3JlLWpzIHdvcmthcm91bmQsIHByZS12Mi41LjBcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNFbGVtZW50KHgpIHtcbiAgICBpZiAoIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIGlmICh0eXBlb2YgSFRNTEVsZW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHggaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVvZiB4Lm5vZGVOYW1lID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgeC5nZXRBdHRyaWJ1dGUgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGluc3BlY3RTdHJpbmcoc3RyLCBvcHRzKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnRyb2wtcmVnZXhcbiAgICB2YXIgcyA9IHN0ci5yZXBsYWNlKC8oWydcXFxcXSkvZywgJ1xcXFwkMScpLnJlcGxhY2UoL1tcXHgwMC1cXHgxZl0vZywgbG93Ynl0ZSk7XG4gICAgcmV0dXJuIHdyYXBRdW90ZXMocywgJ3NpbmdsZScsIG9wdHMpO1xufVxuXG5mdW5jdGlvbiBsb3dieXRlKGMpIHtcbiAgICB2YXIgbiA9IGMuY2hhckNvZGVBdCgwKTtcbiAgICB2YXIgeCA9IHtcbiAgICAgICAgODogJ2InLCA5OiAndCcsIDEwOiAnbicsIDEyOiAnZicsIDEzOiAncidcbiAgICB9W25dO1xuICAgIGlmICh4KSB7IHJldHVybiAnXFxcXCcgKyB4OyB9XG4gICAgcmV0dXJuICdcXFxceCcgKyAobiA8IDB4MTAgPyAnMCcgOiAnJykgKyBuLnRvU3RyaW5nKDE2KTtcbn1cblxuZnVuY3Rpb24gbWFya0JveGVkKHN0cikge1xuICAgIHJldHVybiAnT2JqZWN0KCcgKyBzdHIgKyAnKSc7XG59XG5cbmZ1bmN0aW9uIHdlYWtDb2xsZWN0aW9uT2YodHlwZSkge1xuICAgIHJldHVybiB0eXBlICsgJyB7ID8gfSc7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3Rpb25PZih0eXBlLCBzaXplLCBlbnRyaWVzKSB7XG4gICAgcmV0dXJuIHR5cGUgKyAnICgnICsgc2l6ZSArICcpIHsnICsgZW50cmllcy5qb2luKCcsICcpICsgJ30nO1xufVxuXG5mdW5jdGlvbiBhcnJPYmpLZXlzKG9iaiwgaW5zcGVjdCkge1xuICAgIHZhciBpc0FyciA9IGlzQXJyYXkob2JqKTtcbiAgICB2YXIgeHMgPSBbXTtcbiAgICBpZiAoaXNBcnIpIHtcbiAgICAgICAgeHMubGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHhzW2ldID0gaGFzKG9iaiwgaSkgPyBpbnNwZWN0KG9ialtpXSwgb2JqKSA6ICcnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1yZXN0cmljdGVkLXN5bnRheFxuICAgICAgICBpZiAoIWhhcyhvYmosIGtleSkpIHsgY29udGludWU7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1yZXN0cmljdGVkLXN5bnRheCwgbm8tY29udGludWVcbiAgICAgICAgaWYgKGlzQXJyICYmIFN0cmluZyhOdW1iZXIoa2V5KSkgPT09IGtleSAmJiBrZXkgPCBvYmoubGVuZ3RoKSB7IGNvbnRpbnVlOyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcmVzdHJpY3RlZC1zeW50YXgsIG5vLWNvbnRpbnVlXG4gICAgICAgIGlmICgoL1teXFx3JF0vKS50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgIHhzLnB1c2goaW5zcGVjdChrZXksIG9iaikgKyAnOiAnICsgaW5zcGVjdChvYmpba2V5XSwgb2JqKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4cy5wdXNoKGtleSArICc6ICcgKyBpbnNwZWN0KG9ialtrZXldLCBvYmopKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geHM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1vYmplY3QuaXNcblxudmFyIG51bWJlcklzTmFOID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdHJldHVybiB2YWx1ZSAhPT0gdmFsdWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzKGEsIGIpIHtcblx0aWYgKGEgPT09IDAgJiYgYiA9PT0gMCkge1xuXHRcdHJldHVybiAxIC8gYSA9PT0gMSAvIGI7XG5cdH1cblx0aWYgKGEgPT09IGIpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRpZiAobnVtYmVySXNOYU4oYSkgJiYgbnVtYmVySXNOYU4oYikpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBrZXlzU2hpbTtcbmlmICghT2JqZWN0LmtleXMpIHtcblx0Ly8gbW9kaWZpZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vZXMtc2hpbXMvZXM1LXNoaW1cblx0dmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cdHZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cdHZhciBpc0FyZ3MgPSByZXF1aXJlKCcuL2lzQXJndW1lbnRzJyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZ2xvYmFsLXJlcXVpcmVcblx0dmFyIGlzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cdHZhciBoYXNEb250RW51bUJ1ZyA9ICFpc0VudW1lcmFibGUuY2FsbCh7IHRvU3RyaW5nOiBudWxsIH0sICd0b1N0cmluZycpO1xuXHR2YXIgaGFzUHJvdG9FbnVtQnVnID0gaXNFbnVtZXJhYmxlLmNhbGwoZnVuY3Rpb24gKCkge30sICdwcm90b3R5cGUnKTtcblx0dmFyIGRvbnRFbnVtcyA9IFtcblx0XHQndG9TdHJpbmcnLFxuXHRcdCd0b0xvY2FsZVN0cmluZycsXG5cdFx0J3ZhbHVlT2YnLFxuXHRcdCdoYXNPd25Qcm9wZXJ0eScsXG5cdFx0J2lzUHJvdG90eXBlT2YnLFxuXHRcdCdwcm9wZXJ0eUlzRW51bWVyYWJsZScsXG5cdFx0J2NvbnN0cnVjdG9yJ1xuXHRdO1xuXHR2YXIgZXF1YWxzQ29uc3RydWN0b3JQcm90b3R5cGUgPSBmdW5jdGlvbiAobykge1xuXHRcdHZhciBjdG9yID0gby5jb25zdHJ1Y3Rvcjtcblx0XHRyZXR1cm4gY3RvciAmJiBjdG9yLnByb3RvdHlwZSA9PT0gbztcblx0fTtcblx0dmFyIGV4Y2x1ZGVkS2V5cyA9IHtcblx0XHQkYXBwbGljYXRpb25DYWNoZTogdHJ1ZSxcblx0XHQkY29uc29sZTogdHJ1ZSxcblx0XHQkZXh0ZXJuYWw6IHRydWUsXG5cdFx0JGZyYW1lOiB0cnVlLFxuXHRcdCRmcmFtZUVsZW1lbnQ6IHRydWUsXG5cdFx0JGZyYW1lczogdHJ1ZSxcblx0XHQkaW5uZXJIZWlnaHQ6IHRydWUsXG5cdFx0JGlubmVyV2lkdGg6IHRydWUsXG5cdFx0JG9ubW96ZnVsbHNjcmVlbmNoYW5nZTogdHJ1ZSxcblx0XHQkb25tb3pmdWxsc2NyZWVuZXJyb3I6IHRydWUsXG5cdFx0JG91dGVySGVpZ2h0OiB0cnVlLFxuXHRcdCRvdXRlcldpZHRoOiB0cnVlLFxuXHRcdCRwYWdlWE9mZnNldDogdHJ1ZSxcblx0XHQkcGFnZVlPZmZzZXQ6IHRydWUsXG5cdFx0JHBhcmVudDogdHJ1ZSxcblx0XHQkc2Nyb2xsTGVmdDogdHJ1ZSxcblx0XHQkc2Nyb2xsVG9wOiB0cnVlLFxuXHRcdCRzY3JvbGxYOiB0cnVlLFxuXHRcdCRzY3JvbGxZOiB0cnVlLFxuXHRcdCRzZWxmOiB0cnVlLFxuXHRcdCR3ZWJraXRJbmRleGVkREI6IHRydWUsXG5cdFx0JHdlYmtpdFN0b3JhZ2VJbmZvOiB0cnVlLFxuXHRcdCR3aW5kb3c6IHRydWVcblx0fTtcblx0dmFyIGhhc0F1dG9tYXRpb25FcXVhbGl0eUJ1ZyA9IChmdW5jdGlvbiAoKSB7XG5cdFx0LyogZ2xvYmFsIHdpbmRvdyAqL1xuXHRcdGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykgeyByZXR1cm4gZmFsc2U7IH1cblx0XHRmb3IgKHZhciBrIGluIHdpbmRvdykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKCFleGNsdWRlZEtleXNbJyQnICsga10gJiYgaGFzLmNhbGwod2luZG93LCBrKSAmJiB3aW5kb3dba10gIT09IG51bGwgJiYgdHlwZW9mIHdpbmRvd1trXSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZXF1YWxzQ29uc3RydWN0b3JQcm90b3R5cGUod2luZG93W2tdKTtcblx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSgpKTtcblx0dmFyIGVxdWFsc0NvbnN0cnVjdG9yUHJvdG90eXBlSWZOb3RCdWdneSA9IGZ1bmN0aW9uIChvKSB7XG5cdFx0LyogZ2xvYmFsIHdpbmRvdyAqL1xuXHRcdGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyB8fCAhaGFzQXV0b21hdGlvbkVxdWFsaXR5QnVnKSB7XG5cdFx0XHRyZXR1cm4gZXF1YWxzQ29uc3RydWN0b3JQcm90b3R5cGUobyk7XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gZXF1YWxzQ29uc3RydWN0b3JQcm90b3R5cGUobyk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fTtcblxuXHRrZXlzU2hpbSA9IGZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG5cdFx0dmFyIGlzT2JqZWN0ID0gb2JqZWN0ICE9PSBudWxsICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnO1xuXHRcdHZhciBpc0Z1bmN0aW9uID0gdG9TdHIuY2FsbChvYmplY3QpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHRcdHZhciBpc0FyZ3VtZW50cyA9IGlzQXJncyhvYmplY3QpO1xuXHRcdHZhciBpc1N0cmluZyA9IGlzT2JqZWN0ICYmIHRvU3RyLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgU3RyaW5nXSc7XG5cdFx0dmFyIHRoZUtleXMgPSBbXTtcblxuXHRcdGlmICghaXNPYmplY3QgJiYgIWlzRnVuY3Rpb24gJiYgIWlzQXJndW1lbnRzKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3Qua2V5cyBjYWxsZWQgb24gYSBub24tb2JqZWN0Jyk7XG5cdFx0fVxuXG5cdFx0dmFyIHNraXBQcm90byA9IGhhc1Byb3RvRW51bUJ1ZyAmJiBpc0Z1bmN0aW9uO1xuXHRcdGlmIChpc1N0cmluZyAmJiBvYmplY3QubGVuZ3RoID4gMCAmJiAhaGFzLmNhbGwob2JqZWN0LCAwKSkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3QubGVuZ3RoOyArK2kpIHtcblx0XHRcdFx0dGhlS2V5cy5wdXNoKFN0cmluZyhpKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGlzQXJndW1lbnRzICYmIG9iamVjdC5sZW5ndGggPiAwKSB7XG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IG9iamVjdC5sZW5ndGg7ICsraikge1xuXHRcdFx0XHR0aGVLZXlzLnB1c2goU3RyaW5nKGopKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yICh2YXIgbmFtZSBpbiBvYmplY3QpIHtcblx0XHRcdFx0aWYgKCEoc2tpcFByb3RvICYmIG5hbWUgPT09ICdwcm90b3R5cGUnKSAmJiBoYXMuY2FsbChvYmplY3QsIG5hbWUpKSB7XG5cdFx0XHRcdFx0dGhlS2V5cy5wdXNoKFN0cmluZyhuYW1lKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoaGFzRG9udEVudW1CdWcpIHtcblx0XHRcdHZhciBza2lwQ29uc3RydWN0b3IgPSBlcXVhbHNDb25zdHJ1Y3RvclByb3RvdHlwZUlmTm90QnVnZ3kob2JqZWN0KTtcblxuXHRcdFx0Zm9yICh2YXIgayA9IDA7IGsgPCBkb250RW51bXMubGVuZ3RoOyArK2spIHtcblx0XHRcdFx0aWYgKCEoc2tpcENvbnN0cnVjdG9yICYmIGRvbnRFbnVtc1trXSA9PT0gJ2NvbnN0cnVjdG9yJykgJiYgaGFzLmNhbGwob2JqZWN0LCBkb250RW51bXNba10pKSB7XG5cdFx0XHRcdFx0dGhlS2V5cy5wdXNoKGRvbnRFbnVtc1trXSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoZUtleXM7XG5cdH07XG59XG5tb2R1bGUuZXhwb3J0cyA9IGtleXNTaGltO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG52YXIgaXNBcmdzID0gcmVxdWlyZSgnLi9pc0FyZ3VtZW50cycpO1xuXG52YXIgb3JpZ0tleXMgPSBPYmplY3Qua2V5cztcbnZhciBrZXlzU2hpbSA9IG9yaWdLZXlzID8gZnVuY3Rpb24ga2V5cyhvKSB7IHJldHVybiBvcmlnS2V5cyhvKTsgfSA6IHJlcXVpcmUoJy4vaW1wbGVtZW50YXRpb24nKTtcblxudmFyIG9yaWdpbmFsS2V5cyA9IE9iamVjdC5rZXlzO1xuXG5rZXlzU2hpbS5zaGltID0gZnVuY3Rpb24gc2hpbU9iamVjdEtleXMoKSB7XG5cdGlmIChPYmplY3Qua2V5cykge1xuXHRcdHZhciBrZXlzV29ya3NXaXRoQXJndW1lbnRzID0gKGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vIFNhZmFyaSA1LjAgYnVnXG5cdFx0XHR2YXIgYXJncyA9IE9iamVjdC5rZXlzKGFyZ3VtZW50cyk7XG5cdFx0XHRyZXR1cm4gYXJncyAmJiBhcmdzLmxlbmd0aCA9PT0gYXJndW1lbnRzLmxlbmd0aDtcblx0XHR9KDEsIDIpKTtcblx0XHRpZiAoIWtleXNXb3Jrc1dpdGhBcmd1bWVudHMpIHtcblx0XHRcdE9iamVjdC5rZXlzID0gZnVuY3Rpb24ga2V5cyhvYmplY3QpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmdW5jLW5hbWUtbWF0Y2hpbmdcblx0XHRcdFx0aWYgKGlzQXJncyhvYmplY3QpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG9yaWdpbmFsS2V5cyhzbGljZS5jYWxsKG9iamVjdCkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBvcmlnaW5hbEtleXMob2JqZWN0KTtcblx0XHRcdH07XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdE9iamVjdC5rZXlzID0ga2V5c1NoaW07XG5cdH1cblx0cmV0dXJuIE9iamVjdC5rZXlzIHx8IGtleXNTaGltO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBrZXlzU2hpbTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuXHR2YXIgc3RyID0gdG9TdHIuY2FsbCh2YWx1ZSk7XG5cdHZhciBpc0FyZ3MgPSBzdHIgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuXHRpZiAoIWlzQXJncykge1xuXHRcdGlzQXJncyA9IHN0ciAhPT0gJ1tvYmplY3QgQXJyYXldJyAmJlxuXHRcdFx0dmFsdWUgIT09IG51bGwgJiZcblx0XHRcdHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiZcblx0XHRcdHR5cGVvZiB2YWx1ZS5sZW5ndGggPT09ICdudW1iZXInICYmXG5cdFx0XHR2YWx1ZS5sZW5ndGggPj0gMCAmJlxuXHRcdFx0dG9TdHIuY2FsbCh2YWx1ZS5jYWxsZWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHR9XG5cdHJldHVybiBpc0FyZ3M7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgJE9iamVjdCA9IE9iamVjdDtcbnZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZsYWdzKCkge1xuXHRpZiAodGhpcyAhPSBudWxsICYmIHRoaXMgIT09ICRPYmplY3QodGhpcykpIHtcblx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignUmVnRXhwLnByb3RvdHlwZS5mbGFncyBnZXR0ZXIgY2FsbGVkIG9uIG5vbi1vYmplY3QnKTtcblx0fVxuXHR2YXIgcmVzdWx0ID0gJyc7XG5cdGlmICh0aGlzLmdsb2JhbCkge1xuXHRcdHJlc3VsdCArPSAnZyc7XG5cdH1cblx0aWYgKHRoaXMuaWdub3JlQ2FzZSkge1xuXHRcdHJlc3VsdCArPSAnaSc7XG5cdH1cblx0aWYgKHRoaXMubXVsdGlsaW5lKSB7XG5cdFx0cmVzdWx0ICs9ICdtJztcblx0fVxuXHRpZiAodGhpcy5kb3RBbGwpIHtcblx0XHRyZXN1bHQgKz0gJ3MnO1xuXHR9XG5cdGlmICh0aGlzLnVuaWNvZGUpIHtcblx0XHRyZXN1bHQgKz0gJ3UnO1xuXHR9XG5cdGlmICh0aGlzLnN0aWNreSkge1xuXHRcdHJlc3VsdCArPSAneSc7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZWZpbmUgPSByZXF1aXJlKCdkZWZpbmUtcHJvcGVydGllcycpO1xudmFyIGNhbGxCaW5kID0gcmVxdWlyZSgnZXMtYWJzdHJhY3QvaGVscGVycy9jYWxsQmluZCcpO1xuXG52YXIgaW1wbGVtZW50YXRpb24gPSByZXF1aXJlKCcuL2ltcGxlbWVudGF0aW9uJyk7XG52YXIgZ2V0UG9seWZpbGwgPSByZXF1aXJlKCcuL3BvbHlmaWxsJyk7XG52YXIgc2hpbSA9IHJlcXVpcmUoJy4vc2hpbScpO1xuXG52YXIgZmxhZ3NCb3VuZCA9IGNhbGxCaW5kKGltcGxlbWVudGF0aW9uKTtcblxuZGVmaW5lKGZsYWdzQm91bmQsIHtcblx0Z2V0UG9seWZpbGw6IGdldFBvbHlmaWxsLFxuXHRpbXBsZW1lbnRhdGlvbjogaW1wbGVtZW50YXRpb24sXG5cdHNoaW06IHNoaW1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZsYWdzQm91bmQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbXBsZW1lbnRhdGlvbiA9IHJlcXVpcmUoJy4vaW1wbGVtZW50YXRpb24nKTtcblxudmFyIHN1cHBvcnRzRGVzY3JpcHRvcnMgPSByZXF1aXJlKCdkZWZpbmUtcHJvcGVydGllcycpLnN1cHBvcnRzRGVzY3JpcHRvcnM7XG52YXIgJGdPUEQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xudmFyICRUeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2V0UG9seWZpbGwoKSB7XG5cdGlmICghc3VwcG9ydHNEZXNjcmlwdG9ycykge1xuXHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdSZWdFeHAucHJvdG90eXBlLmZsYWdzIHJlcXVpcmVzIGEgdHJ1ZSBFUzUgZW52aXJvbm1lbnQgdGhhdCBzdXBwb3J0cyBwcm9wZXJ0eSBkZXNjcmlwdG9ycycpO1xuXHR9XG5cdGlmICgoL2EvbWlnKS5mbGFncyA9PT0gJ2dpbScpIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9ICRnT1BEKFJlZ0V4cC5wcm90b3R5cGUsICdmbGFncycpO1xuXHRcdGlmIChkZXNjcmlwdG9yICYmIHR5cGVvZiBkZXNjcmlwdG9yLmdldCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgKC9hLykuZG90QWxsID09PSAnYm9vbGVhbicpIHtcblx0XHRcdHJldHVybiBkZXNjcmlwdG9yLmdldDtcblx0XHR9XG5cdH1cblx0cmV0dXJuIGltcGxlbWVudGF0aW9uO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHN1cHBvcnRzRGVzY3JpcHRvcnMgPSByZXF1aXJlKCdkZWZpbmUtcHJvcGVydGllcycpLnN1cHBvcnRzRGVzY3JpcHRvcnM7XG52YXIgZ2V0UG9seWZpbGwgPSByZXF1aXJlKCcuL3BvbHlmaWxsJyk7XG52YXIgZ09QRCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG52YXIgZGVmaW5lUHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG52YXIgVHlwZUVyciA9IFR5cGVFcnJvcjtcbnZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcbnZhciByZWdleCA9IC9hLztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzaGltRmxhZ3MoKSB7XG5cdGlmICghc3VwcG9ydHNEZXNjcmlwdG9ycyB8fCAhZ2V0UHJvdG8pIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycignUmVnRXhwLnByb3RvdHlwZS5mbGFncyByZXF1aXJlcyBhIHRydWUgRVM1IGVudmlyb25tZW50IHRoYXQgc3VwcG9ydHMgcHJvcGVydHkgZGVzY3JpcHRvcnMnKTtcblx0fVxuXHR2YXIgcG9seWZpbGwgPSBnZXRQb2x5ZmlsbCgpO1xuXHR2YXIgcHJvdG8gPSBnZXRQcm90byhyZWdleCk7XG5cdHZhciBkZXNjcmlwdG9yID0gZ09QRChwcm90bywgJ2ZsYWdzJyk7XG5cdGlmICghZGVzY3JpcHRvciB8fCBkZXNjcmlwdG9yLmdldCAhPT0gcG9seWZpbGwpIHtcblx0XHRkZWZpbmVQcm9wZXJ0eShwcm90bywgJ2ZsYWdzJywge1xuXHRcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRnZXQ6IHBvbHlmaWxsXG5cdFx0fSk7XG5cdH1cblx0cmV0dXJuIHBvbHlmaWxsO1xufTtcbiIsIi8qIVxuICogc2hhbGxvdy1jbG9uZSA8aHR0cHM6Ly9naXRodWIuY29tL2pvbnNjaGxpbmtlcnQvc2hhbGxvdy1jbG9uZT5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUtcHJlc2VudCwgSm9uIFNjaGxpbmtlcnQuXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB2YWx1ZU9mID0gU3ltYm9sLnByb3RvdHlwZS52YWx1ZU9mO1xuY29uc3QgdHlwZU9mID0gcmVxdWlyZSgna2luZC1vZicpO1xuXG5mdW5jdGlvbiBjbG9uZSh2YWwsIGRlZXApIHtcbiAgc3dpdGNoICh0eXBlT2YodmFsKSkge1xuICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgIHJldHVybiB2YWwuc2xpY2UoKTtcbiAgICBjYXNlICdvYmplY3QnOlxuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHZhbCk7XG4gICAgY2FzZSAnZGF0ZSc6XG4gICAgICByZXR1cm4gbmV3IHZhbC5jb25zdHJ1Y3RvcihOdW1iZXIodmFsKSk7XG4gICAgY2FzZSAnbWFwJzpcbiAgICAgIHJldHVybiBuZXcgTWFwKHZhbCk7XG4gICAgY2FzZSAnc2V0JzpcbiAgICAgIHJldHVybiBuZXcgU2V0KHZhbCk7XG4gICAgY2FzZSAnYnVmZmVyJzpcbiAgICAgIHJldHVybiBjbG9uZUJ1ZmZlcih2YWwpO1xuICAgIGNhc2UgJ3N5bWJvbCc6XG4gICAgICByZXR1cm4gY2xvbmVTeW1ib2wodmFsKTtcbiAgICBjYXNlICdhcnJheWJ1ZmZlcic6XG4gICAgICByZXR1cm4gY2xvbmVBcnJheUJ1ZmZlcih2YWwpO1xuICAgIGNhc2UgJ2Zsb2F0MzJhcnJheSc6XG4gICAgY2FzZSAnZmxvYXQ2NGFycmF5JzpcbiAgICBjYXNlICdpbnQxNmFycmF5JzpcbiAgICBjYXNlICdpbnQzMmFycmF5JzpcbiAgICBjYXNlICdpbnQ4YXJyYXknOlxuICAgIGNhc2UgJ3VpbnQxNmFycmF5JzpcbiAgICBjYXNlICd1aW50MzJhcnJheSc6XG4gICAgY2FzZSAndWludDhjbGFtcGVkYXJyYXknOlxuICAgIGNhc2UgJ3VpbnQ4YXJyYXknOlxuICAgICAgcmV0dXJuIGNsb25lVHlwZWRBcnJheSh2YWwpO1xuICAgIGNhc2UgJ3JlZ2V4cCc6XG4gICAgICByZXR1cm4gY2xvbmVSZWdFeHAodmFsKTtcbiAgICBjYXNlICdlcnJvcic6XG4gICAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZSh2YWwpO1xuICAgIGRlZmF1bHQ6IHtcbiAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNsb25lUmVnRXhwKHZhbCkge1xuICBjb25zdCBmbGFncyA9IHZhbC5mbGFncyAhPT0gdm9pZCAwID8gdmFsLmZsYWdzIDogKC9cXHcrJC8uZXhlYyh2YWwpIHx8IHZvaWQgMCk7XG4gIGNvbnN0IHJlID0gbmV3IHZhbC5jb25zdHJ1Y3Rvcih2YWwuc291cmNlLCBmbGFncyk7XG4gIHJlLmxhc3RJbmRleCA9IHZhbC5sYXN0SW5kZXg7XG4gIHJldHVybiByZTtcbn1cblxuZnVuY3Rpb24gY2xvbmVBcnJheUJ1ZmZlcih2YWwpIHtcbiAgY29uc3QgcmVzID0gbmV3IHZhbC5jb25zdHJ1Y3Rvcih2YWwuYnl0ZUxlbmd0aCk7XG4gIG5ldyBVaW50OEFycmF5KHJlcykuc2V0KG5ldyBVaW50OEFycmF5KHZhbCkpO1xuICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBjbG9uZVR5cGVkQXJyYXkodmFsLCBkZWVwKSB7XG4gIHJldHVybiBuZXcgdmFsLmNvbnN0cnVjdG9yKHZhbC5idWZmZXIsIHZhbC5ieXRlT2Zmc2V0LCB2YWwubGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gY2xvbmVCdWZmZXIodmFsKSB7XG4gIGNvbnN0IGxlbiA9IHZhbC5sZW5ndGg7XG4gIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5hbGxvY1Vuc2FmZSA/IEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW4pIDogQnVmZmVyLmZyb20obGVuKTtcbiAgdmFsLmNvcHkoYnVmKTtcbiAgcmV0dXJuIGJ1Zjtcbn1cblxuZnVuY3Rpb24gY2xvbmVTeW1ib2wodmFsKSB7XG4gIHJldHVybiB2YWx1ZU9mID8gT2JqZWN0KHZhbHVlT2YuY2FsbCh2YWwpKSA6IHt9O1xufVxuXG4vKipcbiAqIEV4cG9zZSBgY2xvbmVgXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBjbG9uZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEdldEludHJpbnNpYyA9IHJlcXVpcmUoJ2VzLWFic3RyYWN0L0dldEludHJpbnNpYycpO1xudmFyIGNhbGxCb3VuZCA9IHJlcXVpcmUoJ2VzLWFic3RyYWN0L2hlbHBlcnMvY2FsbEJvdW5kJyk7XG52YXIgaW5zcGVjdCA9IHJlcXVpcmUoJ29iamVjdC1pbnNwZWN0Jyk7XG5cbnZhciAkVHlwZUVycm9yID0gR2V0SW50cmluc2ljKCclVHlwZUVycm9yJScpO1xudmFyICRXZWFrTWFwID0gR2V0SW50cmluc2ljKCclV2Vha01hcCUnLCB0cnVlKTtcbnZhciAkTWFwID0gR2V0SW50cmluc2ljKCclTWFwJScsIHRydWUpO1xudmFyICRwdXNoID0gY2FsbEJvdW5kKCdBcnJheS5wcm90b3R5cGUucHVzaCcpO1xuXG52YXIgJHdlYWtNYXBHZXQgPSBjYWxsQm91bmQoJ1dlYWtNYXAucHJvdG90eXBlLmdldCcsIHRydWUpO1xudmFyICR3ZWFrTWFwU2V0ID0gY2FsbEJvdW5kKCdXZWFrTWFwLnByb3RvdHlwZS5zZXQnLCB0cnVlKTtcbnZhciAkd2Vha01hcEhhcyA9IGNhbGxCb3VuZCgnV2Vha01hcC5wcm90b3R5cGUuaGFzJywgdHJ1ZSk7XG52YXIgJG1hcEdldCA9IGNhbGxCb3VuZCgnTWFwLnByb3RvdHlwZS5nZXQnLCB0cnVlKTtcbnZhciAkbWFwU2V0ID0gY2FsbEJvdW5kKCdNYXAucHJvdG90eXBlLnNldCcsIHRydWUpO1xudmFyICRtYXBIYXMgPSBjYWxsQm91bmQoJ01hcC5wcm90b3R5cGUuaGFzJywgdHJ1ZSk7XG52YXIgb2JqZWN0R2V0ID0gZnVuY3Rpb24gKG9iamVjdHMsIGtleSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGNvbnNpc3RlbnQtcmV0dXJuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0cy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdGlmIChvYmplY3RzW2ldLmtleSA9PT0ga2V5KSB7XG5cdFx0XHRyZXR1cm4gb2JqZWN0c1tpXS52YWx1ZTtcblx0XHR9XG5cdH1cbn07XG52YXIgb2JqZWN0U2V0ID0gZnVuY3Rpb24gKG9iamVjdHMsIGtleSwgdmFsdWUpIHtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3RzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0aWYgKG9iamVjdHNbaV0ua2V5ID09PSBrZXkpIHtcblx0XHRcdG9iamVjdHNbaV0udmFsdWUgPSB2YWx1ZTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXHQkcHVzaChvYmplY3RzLCB7XG5cdFx0a2V5OiBrZXksXG5cdFx0dmFsdWU6IHZhbHVlXG5cdH0pO1xufTtcbnZhciBvYmplY3RIYXMgPSBmdW5jdGlvbiAob2JqZWN0cywga2V5KSB7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0cy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdGlmIChvYmplY3RzW2ldLmtleSA9PT0ga2V5KSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZXRTaWRlQ2hhbm5lbCgpIHtcblx0dmFyICR3bTtcblx0dmFyICRtO1xuXHR2YXIgJG87XG5cdHZhciBjaGFubmVsID0ge1xuXHRcdGFzc2VydDogZnVuY3Rpb24gKGtleSkge1xuXHRcdFx0aWYgKCFjaGFubmVsLmhhcyhrZXkpKSB7XG5cdFx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdTaWRlIGNoYW5uZWwgZG9lcyBub3QgY29udGFpbiAnICsgaW5zcGVjdChrZXkpKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGdldDogZnVuY3Rpb24gKGtleSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGNvbnNpc3RlbnQtcmV0dXJuXG5cdFx0XHRpZiAoJFdlYWtNYXAgJiYga2V5ICYmICh0eXBlb2Yga2V5ID09PSAnb2JqZWN0JyB8fCB0eXBlb2Yga2V5ID09PSAnZnVuY3Rpb24nKSkge1xuXHRcdFx0XHRpZiAoJHdtKSB7XG5cdFx0XHRcdFx0cmV0dXJuICR3ZWFrTWFwR2V0KCR3bSwga2V5KTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICgkTWFwKSB7XG5cdFx0XHRcdGlmICgkbSkge1xuXHRcdFx0XHRcdHJldHVybiAkbWFwR2V0KCRtLCBrZXkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAoJG8pIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1sb25lbHktaWZcblx0XHRcdFx0XHRyZXR1cm4gb2JqZWN0R2V0KCRvLCBrZXkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRoYXM6IGZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdGlmICgkV2Vha01hcCAmJiBrZXkgJiYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBrZXkgPT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHRcdGlmICgkd20pIHtcblx0XHRcdFx0XHRyZXR1cm4gJHdlYWtNYXBIYXMoJHdtLCBrZXkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKCRNYXApIHtcblx0XHRcdFx0aWYgKCRtKSB7XG5cdFx0XHRcdFx0cmV0dXJuICRtYXBIYXMoJG0sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICgkbykgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWxvbmVseS1pZlxuXHRcdFx0XHRcdHJldHVybiBvYmplY3RIYXMoJG8sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LFxuXHRcdHNldDogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcblx0XHRcdGlmICgkV2Vha01hcCAmJiBrZXkgJiYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBrZXkgPT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHRcdGlmICghJHdtKSB7XG5cdFx0XHRcdFx0JHdtID0gbmV3ICRXZWFrTWFwKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JHdlYWtNYXBTZXQoJHdtLCBrZXksIHZhbHVlKTtcblx0XHRcdH0gZWxzZSBpZiAoJE1hcCkge1xuXHRcdFx0XHRpZiAoISRtKSB7XG5cdFx0XHRcdFx0JG0gPSBuZXcgJE1hcCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCRtYXBTZXQoJG0sIGtleSwgdmFsdWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCEkbykge1xuXHRcdFx0XHRcdCRvID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0b2JqZWN0U2V0KCRvLCBrZXksIHZhbHVlKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cdHJldHVybiBjaGFubmVsO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGlzU3RyaW5nID0gcmVxdWlyZSgnaXMtc3RyaW5nJyk7XG52YXIgaXNOdW1iZXIgPSByZXF1aXJlKCdpcy1udW1iZXItb2JqZWN0Jyk7XG52YXIgaXNCb29sZWFuID0gcmVxdWlyZSgnaXMtYm9vbGVhbi1vYmplY3QnKTtcbnZhciBpc1N5bWJvbCA9IHJlcXVpcmUoJ2lzLXN5bWJvbCcpO1xudmFyIGlzQmlnSW50ID0gcmVxdWlyZSgnaXMtYmlnaW50Jyk7XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb25zaXN0ZW50LXJldHVyblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGljaEJveGVkUHJpbWl0aXZlKHZhbHVlKSB7XG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBlcWVxZXFcblx0aWYgKHZhbHVlID09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbHVlICE9PSAnZnVuY3Rpb24nKSkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cdGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gJ1N0cmluZyc7XG5cdH1cblx0aWYgKGlzTnVtYmVyKHZhbHVlKSkge1xuXHRcdHJldHVybiAnTnVtYmVyJztcblx0fVxuXHRpZiAoaXNCb29sZWFuKHZhbHVlKSkge1xuXHRcdHJldHVybiAnQm9vbGVhbic7XG5cdH1cblx0aWYgKGlzU3ltYm9sKHZhbHVlKSkge1xuXHRcdHJldHVybiAnU3ltYm9sJztcblx0fVxuXHRpZiAoaXNCaWdJbnQodmFsdWUpKSB7XG5cdFx0cmV0dXJuICdCaWdJbnQnO1xuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXNNYXAgPSByZXF1aXJlKCdpcy1tYXAnKTtcbnZhciBpc1NldCA9IHJlcXVpcmUoJ2lzLXNldCcpO1xudmFyIGlzV2Vha01hcCA9IHJlcXVpcmUoJ2lzLXdlYWttYXAnKTtcbnZhciBpc1dlYWtTZXQgPSByZXF1aXJlKCdpcy13ZWFrc2V0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2hpY2hDb2xsZWN0aW9uKHZhbHVlKSB7XG5cdGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG5cdFx0aWYgKGlzTWFwKHZhbHVlKSkge1xuXHRcdFx0cmV0dXJuICdNYXAnO1xuXHRcdH1cblx0XHRpZiAoaXNTZXQodmFsdWUpKSB7XG5cdFx0XHRyZXR1cm4gJ1NldCc7XG5cdFx0fVxuXHRcdGlmIChpc1dlYWtNYXAodmFsdWUpKSB7XG5cdFx0XHRyZXR1cm4gJ1dlYWtNYXAnO1xuXHRcdH1cblx0XHRpZiAoaXNXZWFrU2V0KHZhbHVlKSkge1xuXHRcdFx0cmV0dXJuICdXZWFrU2V0Jztcblx0XHR9XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufTtcbiJdfQ==
