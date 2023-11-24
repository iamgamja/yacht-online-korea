let nickname = null
let id = null
let obj = null
let players = null


const wsprotocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
const connection = new WebSocket(`${wsprotocol}://${window.location.hostname}:${window.location.port}`)

connection.onopen = () => {
    console.log('connect')

    nickname = prompt('nickname')
    connection.send(JSON.stringify({
        type: 'rename',
        name: nickname
    }))

    startgame()
}

connection.onmessage = message => {
    const data = JSON.parse(message.data)

    players = data.players

    if (id !== null) {
        obj = players.find(p => p.id === id)
    }

    switch (data.type) {
        case 'setid': {
            id = data.id
            obj = players.find(p => p.id === id)

            break
        }

        case 'tick': {
            break
        }
    }
}

function startgame() {
    function loop() {
        if (id !== null) {
            document.querySelector('#id').innerText = id
            document.querySelector('#name').innerText = nickname
            document.querySelector('#players').innerText = JSON.stringify(players)
        }

        requestAnimationFrame(loop)
    }

    loop()
}