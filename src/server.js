const express = require('express')
const path = require('path')
const cors = require('cors')
const app = express()

const port = process.env.PORT || 3000

app.use(cors())

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'))
})

app.listen(port)
