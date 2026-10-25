import sharp from 'sharp'

const inputPath = 'C:/Users/Ishaa/.gemini/antigravity-ide/brain/69d35158-70c4-4f73-b894-f2f4670df92a/.user_uploaded/media_1792842624860.png'
const outputPath = '../Frontend/public/assets/auth/traveler_hero.png'

const img = sharp(inputPath)
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
const w = info.width, h = info.height, c = info.channels

const bgR = 255, bgG = 248, bgB = 244

function isBgPixel(r, g, b) {
  const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)
  if (dist < 32) return true
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (min > 215 && (max - min) < 26) return true
  return false
}

const alpha = new Uint8Array(w * h).fill(255)
const visited = new Uint8Array(w * h)
const queue = []

for (let x = 0; x < w; x++) {
  queue.push(x, 0)
  visited[x] = 1
  for (let y = 0; y < 15; y++) {
    queue.push(x, y)
    visited[y * w + x] = 1
  }
}
for (let y = 0; y < h; y++) {
  queue.push(0, y)
  queue.push(w - 1, y)
  visited[y * w] = 1
  visited[y * w + w - 1] = 1
}

let head = 0
while (head < queue.length) {
  const x = queue[head++]
  const y = queue[head++]
  const idx = (y * w + x) * c
  const r = data[idx], g = data[idx + 1], b = data[idx + 2]

  const isBrownDot = r > 150 && r < 200 && g > 100 && g < 150 && b > 60 && b < 100
  if (isBrownDot) continue

  if (isBgPixel(r, g, b)) {
    alpha[y * w + x] = 0

    const neighbors = [
      [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ]
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const npos = ny * w + nx
        if (!visited[npos]) {
          visited[npos] = 1
          queue.push(nx, ny)
        }
      }
    }
  }
}

// Remove any remaining bottom card artifacts
for (let y = 265; y < h; y++) {
  for (let x = 0; x < 260; x++) {
    alpha[y * w + x] = 0
  }
}

// Feather alpha edges slightly for smooth look
const smoothAlpha = new Uint8Array(alpha)
for (let y = 1; y < h - 1; y++) {
  for (let x = 1; x < w - 1; x++) {
    const pos = y * w + x
    if (alpha[pos] > 0) {
      let zeroCount = 0
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if (alpha[(y + dy) * w + (x + dx)] === 0) zeroCount++
      }
      if (zeroCount >= 2) {
        smoothAlpha[pos] = 130
      } else if (zeroCount === 1) {
        smoothAlpha[pos] = 210
      }
    }
  }
}

const outData = Buffer.alloc(w * h * 4)
for (let i = 0; i < w * h; i++) {
  outData[i * 4] = data[i * c]
  outData[i * 4 + 1] = data[i * c + 1]
  outData[i * 4 + 2] = data[i * c + 2]
  outData[i * 4 + 3] = smoothAlpha[i]
}

await sharp(outData, { raw: { width: w, height: h, channels: 4 } })
  .png()
  .toFile(outputPath)

console.log('Refined transparent PNG successfully saved to', outputPath)
