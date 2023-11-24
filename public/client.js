let id = null
let obj = null
let players = null


const wsprotocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
const connection = new WebSocket(`${wsprotocol}://${window.location.hostname}:${window.location.port}`)

connection.onopen = () => {
    console.log('connect')

    connection.send(JSON.stringify({
        type: 'rename',
        name: prompt('nickname')
    }))

    startupdate()
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

        case 'start': {
            break
        }

        case 'req-roll': {
            if (data.target === id) {
                const i = players.findIndex(x => x.id === id)+1

                const table = document.querySelector('#scoreboard')

                const trs = [...table.children[0].children].slice(1)
                for (let l of trs) {
                    l.children[i].innerHTML = '<button></button>'
                    // todo: add eventlistener
                }
            }
        }

        case 'tick': {
            break
        }
    }
}

function setScoreboard() {
    const table = document.querySelector('#scoreboard')

    let tmp = '<tbody>'

    tmp = '<tbody>'

    tmp += '<th></th>'
    for (let p of players) tmp += `<th>${p.name}</th>`

    const scoreRules = ['1', '2', '3', '4', '5', '6', '3개', '4개', '풀하우스', '스트레이트', '야추']
    for (let i in scoreRules) {
        const r = scoreRules[i]
        tmp += '<tr>'
        tmp += `<td>${r}</td>`
        for (let p of players) {
            tmp += `<td>${p.score[i] ?? ''}</td>`
        }
        tmp += '</tr>'
    }

    tmp += '</tbody>'

    table.innerHTML = tmp
}

// update view
function startupdate() {
    document.querySelector('#startbtn').addEventListener('click', () => {
        connection.send(JSON.stringify({
            type: 'start'
        }))
    })

    setScoreboard()

    function loop() {
        if (id !== null) {
            // do
        }

        requestAnimationFrame(loop)
    }

    loop()
}