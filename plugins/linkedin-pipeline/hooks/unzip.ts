// A small zip reader (stored and deflate entries) for LinkedIn's .xlsx and .zip
// exports. Mods run with no Node and no DecompressionStream, so this is a plain
// implementation of DEFLATE (RFC 1951), in the style of zlib's puff.c.

type Huffman = { count: Uint16Array; symbol: Uint16Array }

const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
const DBASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193,
  12289, 16385, 24577,
]
const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
const ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]

function build(lengths: ArrayLike<number>, n: number): Huffman {
  const count = new Uint16Array(16)
  for (let i = 0; i < n; i++) count[lengths[i] ?? 0]! += 1
  const offs = new Uint16Array(16)
  for (let len = 1; len < 15; len++) offs[len + 1] = offs[len]! + count[len]!
  const symbol = new Uint16Array(n)
  for (let sym = 0; sym < n; sym++) {
    const len = lengths[sym] ?? 0
    if (len) symbol[offs[len]!++] = sym
  }
  return { count, symbol }
}

export function inflateRaw(data: Uint8Array, sizeHint = 0): Uint8Array {
  let pos = 0
  let bitBuf = 0
  let bitCnt = 0
  let out = new Uint8Array(Math.max(1024, sizeHint))
  let outLen = 0

  const need = (n: number) => {
    if (outLen + n <= out.length) return
    let size = out.length * 2
    while (size < outLen + n) size *= 2
    const grown = new Uint8Array(size)
    grown.set(out.subarray(0, outLen))
    out = grown
  }
  const bits = (n: number): number => {
    while (bitCnt < n) {
      if (pos >= data.length) throw new Error('The file ends too early (damaged zip).')
      bitBuf |= data[pos++]! << bitCnt
      bitCnt += 8
    }
    const v = bitBuf & ((1 << n) - 1)
    bitBuf >>>= n
    bitCnt -= n
    return v
  }
  const decode = (h: Huffman): number => {
    let code = 0
    let first = 0
    let index = 0
    for (let len = 1; len <= 15; len++) {
      code |= bits(1)
      const count = h.count[len]!
      if (code - count < first) return h.symbol[index + (code - first)]!
      index += count
      first += count
      first <<= 1
      code <<= 1
    }
    throw new Error('Bad compressed data.')
  }
  const codes = (lencode: Huffman, distcode: Huffman) => {
    for (;;) {
      let sym = decode(lencode)
      if (sym < 256) {
        need(1)
        out[outLen++] = sym
      } else if (sym === 256) {
        return
      } else {
        sym -= 257
        if (sym >= 29) throw new Error('Bad length code.')
        const len = LBASE[sym]! + bits(LEXT[sym]!)
        const dsym = decode(distcode)
        if (dsym >= 30) throw new Error('Bad distance code.')
        const dist = DBASE[dsym]! + bits(DEXT[dsym]!)
        if (dist > outLen) throw new Error('Bad distance.')
        need(len)
        for (let i = 0; i < len; i++) {
          out[outLen] = out[outLen - dist]!
          outLen++
        }
      }
    }
  }

  let fixedLen: Huffman | undefined
  let fixedDist: Huffman | undefined
  let last = 0
  do {
    last = bits(1)
    const type = bits(2)
    if (type === 0) {
      bitBuf = 0
      bitCnt = 0
      if (pos + 4 > data.length) throw new Error('The file ends too early (damaged zip).')
      const len = data[pos]! | (data[pos + 1]! << 8)
      pos += 4
      if (pos + len > data.length) throw new Error('The file ends too early (damaged zip).')
      need(len)
      out.set(data.subarray(pos, pos + len), outLen)
      outLen += len
      pos += len
    } else if (type === 1) {
      if (!fixedLen || !fixedDist) {
        const l = new Uint8Array(288)
        l.fill(8, 0, 144)
        l.fill(9, 144, 256)
        l.fill(7, 256, 280)
        l.fill(8, 280, 288)
        fixedLen = build(l, 288)
        fixedDist = build(new Uint8Array(30).fill(5), 30)
      }
      codes(fixedLen, fixedDist)
    } else if (type === 2) {
      const nlen = bits(5) + 257
      const ndist = bits(5) + 1
      const ncode = bits(4) + 4
      const lengths = new Uint8Array(320)
      for (let i = 0; i < ncode; i++) lengths[ORDER[i]!] = bits(3)
      const lencode = build(lengths, 19)
      const all = new Uint8Array(nlen + ndist)
      let index = 0
      while (index < nlen + ndist) {
        const sym = decode(lencode)
        if (sym < 16) {
          all[index++] = sym
        } else {
          let len = 0
          let rep: number
          if (sym === 16) {
            if (index === 0) throw new Error('Bad code lengths.')
            len = all[index - 1]!
            rep = 3 + bits(2)
          } else if (sym === 17) rep = 3 + bits(3)
          else rep = 11 + bits(7)
          if (index + rep > nlen + ndist) throw new Error('Bad code lengths.')
          while (rep--) all[index++] = len
        }
      }
      codes(build(all.subarray(0, nlen), nlen), build(all.subarray(nlen), ndist))
    } else {
      throw new Error('Bad block type.')
    }
  } while (!last)
  return out.slice(0, outLen)
}

export type ZipEntry = { name: string; read: () => Uint8Array }

const u16 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8)
const u32 = (b: Uint8Array, i: number) => (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24)) >>> 0

export function isZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4
}

// The entries of a zip file, read through its central directory
export function readZip(bytes: Uint8Array): ZipEntry[] {
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (u32(bytes, i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('This is not a zip file, or it is damaged.')
  const total = u16(bytes, eocd + 10)
  let p = u32(bytes, eocd + 16)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []
  for (let n = 0; n < total; n++) {
    if (u32(bytes, p) !== 0x02014b50) throw new Error('The zip directory is damaged.')
    const method = u16(bytes, p + 10)
    const csize = u32(bytes, p + 20)
    const usize = u32(bytes, p + 24)
    const nameLen = u16(bytes, p + 28)
    const extraLen = u16(bytes, p + 30)
    const commentLen = u16(bytes, p + 32)
    const local = u32(bytes, p + 42)
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extraLen + commentLen
    entries.push({
      name,
      read: () => {
        const start = local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28)
        const raw = bytes.subarray(start, start + csize)
        if (method === 0) return raw.slice()
        if (method === 8) return inflateRaw(raw, usize)
        throw new Error(`${name} uses a compression this mod cannot read.`)
      },
    })
  }
  return entries
}

// Base64 (what $.fs.read gives for bytes) to bytes
export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
