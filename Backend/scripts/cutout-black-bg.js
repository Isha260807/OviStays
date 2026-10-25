import sharp from 'sharp'

const inputPath = 'C:/Users/Ishaa/.gemini/antigravity-ide/brain/69d35158-70c4-4f73-b894-f2f4670df92a/.user_uploaded/media_1792843587353.jpg'
const outputPath = '../Frontend/public/assets/auth/traveler_hero.png'

const img = sharp(inputPath)
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
const w = info.width, h = info.height, c = info.channels

const alpha = new Uint8Array(w * h).fill(255)
const visited = new Uint8Array(w * h)
const queue = []

// Push all boundary pixels (outer perimeter)
for (let x = 0; x < w; x++) {
  queue.push(x, 0)
  queue.push(x, h - 1)
  visited[x] = 1
  visited[(h - 1) * w + x] = 1
}
for (let y = 0; y < h; y++) {
  queue.push(0, y)
  queue.push(w - 1, y)
  visited[y * w] = 1
  visited[y * w + w - 1] = 1
}

// Background is pure black 0,0,0
const blackThreshold = 2
const featherThreshold = 10

let head = 0
while (head < queue.length) {
  const x = queue[head++]
  const y = queue[head++]
  const idx = (y * w + x) * c
  const r = data[idx], g = data[idx + 1], b = data[idx + 2]
  const maxVal = Math.max(r, g, b)

  if (maxVal < featherThreshold) {
    if (maxVal <= blackThreshold) {
      alpha[y * w + x] = 0
    } else {
      const factor = (maxVal - blackThreshold) / (featherThreshold - blackThreshold)
      alpha[y * w + x] = Math.round(factor * 255)
    }

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

// Construct RGBA buffer - pure colors preserved untouched
const outData = Buffer.alloc(w * h * 4)
for (let i = 0; i < w * h; i++) {
  const srcIdx = i * c
  outData[i * 4] = data[srcIdx]
  outData[i * 4 + 1] = data[srcIdx + 1]
  outData[i * 4 + 2] = data[srcIdx + 2]
  outData[i * 4 + 3] = alpha[i]
}

await sharp(outData, { raw: { width: w, height: h, channels: 4 } })
  .png({ quality: 100, compressionLevel: 9 })
  .toFile(outputPath)

console.log('Successfully created flawless transparent PNG:', outputPath)
