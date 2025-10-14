import express from 'express'
resolve(null)
req.destroy()
return
}
const metaint = parseInt(metaintHeader, 10)
let bytesRead = 0
const chunks = []
res.on('data', (chunk) => {
if (bytesRead < metaint) {
bytesRead += chunk.length
// wait until we've read metaint bytes, then read metadata length byte
} else {
// metadata block begins here
const metaLengthByte = chunk[0]
const metaLength = metaLengthByte * 16
if (metaLength > 0) {
const meta = chunk.slice(1, 1 + metaLength).toString('utf8')
const m = /StreamTitle='([^']*)'/.exec(meta)
if (m) resolve(m[1])
else resolve(null)
} else resolve(null)
req.destroy()
}
})
res.on('end', () => resolve(null))
})
req.on('error', () => resolve(null))
req.on('timeout', () => { req.destroy(); resolve(null) })
req.end()
} catch (e) {
resolve(null)
}
})
}


router.get('/now-playing', async (req, res) => {
try {
let title = await getFromStatusJson()
if (!title) {
title = await readIcyMetadata(STREAM_URL)
}
if (!title) title = 'Live — RicalgenFM'
res.json({ title })
} catch (e) {
res.status(500).json({ title: 'Live — RicalgenFM' })
}
})


export default router