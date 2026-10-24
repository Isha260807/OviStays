import test from 'node:test'
import assert from 'node:assert'
import app from '../src/app.js'

test('GET /api/health', async () => {
  const server = app.listen(0)
  const { port } = server.address()
  const res = await fetch(`http://127.0.0.1:${port}/api/health`)
  assert.equal(res.status, 200)
  server.close()
})
