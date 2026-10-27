export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message)
    this.status = status
    if (extra) this.extra = extra
  }
}

export const badRequest = (message) => new HttpError(400, message)
export const notFound = (message = 'Not found') => new HttpError(404, message)
