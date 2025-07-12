import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type YouTubeData = {
  contentDetails?: object
  etag: string
  id: string
  kind: string
  snippet?: object
}

type YouTubeDataCacheEntry = {
  data: YouTubeData
  timestamp: number
}

interface SaveGraphDB extends DBSchema {
  'youtube-data-cache': {
    key: string
    value: YouTubeDataCacheEntry
  }
}

let dbPromise: Promise<IDBPDatabase<SaveGraphDB>>

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<SaveGraphDB>('save-graph-db', 1, {
      upgrade(db) {
        db.createObjectStore('youtube-data-cache', { keyPath: 'data.id' })
      },
    })
  }
  return dbPromise
}

export function useYouTube() {
  const getAuthToken = async () => {
    const { token, grantedScopes } = await chrome.identity.getAuthToken({ interactive: true })
    if (!token || !grantedScopes?.includes('https://www.googleapis.com/auth/youtube.readonly')) {
      throw new Error('Did not receive OAuth token or required scopes not granted')
    }
    return token
  }

  const fetchMany = async (ids: string[]) => {
    const token = await getAuthToken()

    const idsChunks: string[][] = []
    for (let i = 0; i < ids.length; i += 50) {
      idsChunks.push(ids.slice(i, i + 50))
    }

    const results = await Promise.all(idsChunks.map(async (idsChunk) => {
      const reqUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
      reqUrl.searchParams.set('id', idsChunk.join())
      reqUrl.searchParams.set('part', 'snippet,contentDetails')

      try {
        const res = await fetch(reqUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        const items = data.items
        if (!Array.isArray(items)) {
          throw new Error('Items array missing from response')
        }
        return items
          .filter(item => item.id && typeof item.id === 'string')
          .map(item => ({ id: item.id, data: item }))
      } catch (error) {
        console.error(error)
        return []
      }
    }))

    return results.flat()
  }

  const fetchOne = async (id: string) => {
    const token = await getAuthToken()
    const reqUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    reqUrl.searchParams.set('id', id)
    reqUrl.searchParams.set('part', 'snippet,contentDetails')

    try {
      const res = await fetch(reqUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      const items = data.items
      if (!Array.isArray(items)) {
        throw new Error('Items array missing from response')
      }
      const result: YouTubeData | undefined = items.at(0)
      return result
    } catch (error) {
      console.error(error)
      return undefined
    }
  }

  const getMany = async (ids: string[]) => {
    const db = await getDB()
    const readTx = db.transaction('youtube-data-cache')
    const readStore = readTx.objectStore('youtube-data-cache')
    const cacheEntries = await Promise.all(ids.map(async (id) => {
      const cacheEntry = await readStore.get(id)
      return { id, cacheEntry }
    }))
    await readTx.done

    const results = new Map<string, YouTubeData>()

    const missing: string[] = [];

    for (const { id, cacheEntry } of cacheEntries) {
      if (cacheEntry !== undefined) {
        results.set(id, cacheEntry.data)
      } else {
        missing.push(id);
      }
    }

    if (missing.length > 0) {
      const fetchedData = await fetchMany(missing)
      for (const { id, data } of fetchedData) {
        results.set(id, data)
      }

      queueMicrotask(async () => {
        const writeTx = db.transaction('youtube-data-cache', 'readwrite')
        const writeStore = writeTx.objectStore('youtube-data-cache')
        const timestamp = Date.now()
        for (const { data } of fetchedData) {
          writeStore.put({ data, timestamp })
        }
        await writeTx.done
      })
    }

    return results
  }

  const get = async (id: string) => {
    const db = await getDB()
    const cacheEntry = await db.get('youtube-data-cache', id)
    if (cacheEntry !== undefined) {
      return cacheEntry.data
    }

    const data = await fetchOne(id)
    if (data !== undefined) {
      db.put('youtube-data-cache', { data, timestamp: Date.now() })
    }
    return data
  }

  return { getMany, get }
}
