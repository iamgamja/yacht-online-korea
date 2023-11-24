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

function tick() {
    broadcast(JSON.stringify({
        type: 'tick',

        players
    }))
}

const players = []

wsServer.on('connection', ws => {
    const obj = {
        id: Math.random().toString(),
        name: '',
        isadmin: [...wsServer.clients].filter(client => client.readyState === websocket.OPEN).length === 1,
    }
    players.push(obj)
    tick()

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

        tick()
    })

    ws.on('close', () => {
        const isadmin = obj.isadmin
        const target = players.findIndex(p => p.id === obj.id)
        players.splice(target, 1)

        // 방장이 나갔을 때 첫번째 사람 방장으
        if (isadmin) {
            if (players.length) {
                players[0].isadmin = true
            }
        }

        tick()
    })
})