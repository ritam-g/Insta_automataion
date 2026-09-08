import express from 'express'
import helmet from 'helmet'

const app = express()

app.use(express.json())
app.use(helmet())

app.get('/', (req, res) => {
    res.send('Hello This is Ritam , i am working on it ')
})

export default app