const express = require('express')
const app = express()

app.use(express.static('public'))

const server = app.listen(5125, function() {
    console.log('listen')
})

const websocket = require('ws')
const wsServer = new websocket.Server({ server })

function broadcast(data) {
    wsServer.clients.forEach(client => {
        if (client.readyState === websocket.OPEN) {
            client.send(data)
        }
    })
}

const players = []

wsServer.on('connection', ws => {
    const obj = {
        id: Math.random().toString(),
        name: '',
        isadmin: [...wsServer.clients].filter(client => client.readyState === websocket.OPEN).length === 1,
    }
    players.push(obj)

    ws.on('message', data_ => {
        const data = JSON.parse(data_)

        switch (data.type) {
            case 'rename': {
                obj.name = data.name
                ws.send(JSON.stringify({
                    type: 'setid',
                    id: obj.id,

                    players
                }))
            }

            case 'start': {
                if (ws.isadmin) {
                    startgame()
                }
            }
        }

        broadcast(JSON.stringify({
            type: 'tick',

            players
        }))
    })

    ws.on('close', () => {
        const target = players.findIndex(p => p.id === obj.id)
        players.splice(target)
    })
})