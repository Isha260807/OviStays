import { Router } from 'express'
import mongoose from 'mongoose'
import { badRequest, notFound } from '../../../utils/httpError.js'

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const pick = (obj = {}, keys = []) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]))

/**
 * Builds a REST router for one admin resource.
 *
 * cfg.model          mongoose model
 * cfg.searchFields   fields matched by ?search=
 * cfg.baseFilter     extra filter applied to every query
 * cfg.createFields / cfg.updateFields   whitelisted body fields
 * cfg.beforeCreate(data, req) / cfg.beforeUpdate(doc, data, req)   async hooks
 * cfg.toRow(doc)     shape of one row sent to the client
 * cfg.decorate(docs) async alternative to toRow for adding aggregated columns
 * cfg.optionLabel / cfg.optionValue   enable GET /options for select inputs
 * cfg.actions        subset of: list, get, create, update, delete
 */
export function createResourceRouter(cfg) {
  const router = Router()
  const actions = new Set(cfg.actions || ['list', 'get', 'create', 'update', 'delete'])
  const toRow = cfg.toRow || ((d) => {
    const { __v, ...rest } = d.toObject()
    return rest
  })
  const rowsOf = (docs) => (cfg.decorate ? cfg.decorate(docs) : docs.map(toRow))
  const baseFilter = () => ({ ...(cfg.baseFilter || {}) })
  const asText = (v) => (typeof v === 'string' ? v : '')

  if (cfg.optionLabel) {
    router.get('/options', async (req, res) => {
      const docs = await cfg.model.find(baseFilter()).sort({ createdAt: -1 }).limit(500)
      res.json({
        success: true,
        data: docs.map((d) => ({
          value: cfg.optionValue ? cfg.optionValue(d) : String(d._id),
          label: cfg.optionLabel(d),
        })),
      })
    })
  }

  if (actions.has('list')) {
    router.get('/', async (req, res) => {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
      const filter = baseFilter()

      const status = asText(req.query.status)
      if (status) filter.status = status

      const search = asText(req.query.search).trim()
      if (search && cfg.searchFields?.length) {
        const rx = new RegExp(escapeRegex(search), 'i')
        filter.$or = cfg.searchFields.map((f) => ({ [f]: rx }))
      }

      const [docs, total] = await Promise.all([
        cfg.model.find(filter).sort(cfg.sort || { createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        cfg.model.countDocuments(filter),
      ])
      res.json({
        success: true,
        data: { items: await rowsOf(docs), total, page, pages: Math.max(1, Math.ceil(total / limit)) },
      })
    })
  }

  const findOne = async (id) => {
    if (!mongoose.isValidObjectId(id)) throw notFound()
    const doc = await cfg.model.findOne({ _id: id, ...baseFilter() })
    if (!doc) throw notFound()
    return doc
  }

  if (actions.has('get')) {
    router.get('/:id', async (req, res) => {
      const doc = await findOne(req.params.id)
      const [row] = await rowsOf([doc])
      res.json({ success: true, data: row })
    })
  }

  if (actions.has('create')) {
    router.post('/', async (req, res) => {
      const data = pick(req.body, cfg.createFields)
      if (cfg.beforeCreate) await cfg.beforeCreate(data, req)
      const doc = await cfg.model.create(data)
      const [row] = await rowsOf([doc])
      res.status(201).json({ success: true, data: row })
    })
  }

  if (actions.has('update')) {
    router.patch('/:id', async (req, res) => {
      const doc = await findOne(req.params.id)
      const data = pick(req.body, cfg.updateFields)
      if (!Object.keys(data).length) throw badRequest('Nothing to update')
      if (cfg.beforeUpdate) await cfg.beforeUpdate(doc, data, req)
      doc.set(data)
      await doc.save()
      const [row] = await rowsOf([doc])
      res.json({ success: true, data: row })
    })
  }

  if (actions.has('delete')) {
    router.delete('/:id', async (req, res) => {
      const doc = await findOne(req.params.id)
      await doc.deleteOne()
      res.json({ success: true })
    })
  }

  return router
}
