import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/services/api/axios.js'

// Loads data when the inputs change: { data, error, loading, reload, setData }.
// A slower earlier request can never overwrite the result of a newer one.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const run = useRef(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const load = useCallback(() => {
    const id = ++run.current
    setState((s) => ({ ...s, loading: true, error: '' }))
    return Promise.resolve()
      .then(() => fnRef.current())
      .then((data) => { if (id === run.current) setState({ data, error: '', loading: false }) })
      .catch((err) => { if (id === run.current) setState((s) => ({ data: s.data, error: errorMessage(err), loading: false })) })
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, deps)

  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) }
}
