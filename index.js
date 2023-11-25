const express = require("express");
const app = express();

app.use(express.static("public"));

const server = app.listen(5125, function () {
  console.log("listen");
});

const websocket = require("ws");
const wsServer = new websocket.Server({ server });

/**
 *
 * @param {{type: string}} data
 */
function broadcast(data) {
  data.players = players;
  data.isplaying = isplaying;
  const tmp = JSON.stringify(data);

  wsServer.clients.forEach((client) => {
    if (client.readyState === websocket.OPEN) {
      client.send(tmp);
    }
  });
}

function senduserupdate() {
  broadcast({
    type: "user-update",
  });
}

function tick() {
  broadcast({
    type: "tick",
  });
}

/** @typedef {{id: string, name: string, isadmin: boolean, score: (number|null)[], isleave: boolean}} obj */

/** @type {obj[]} */
let players = [];

/** @type {{[id: string]: websocket}} */
let wsbyid = {};

let isplaying = false;

wsServer.on("connection", (ws) => {
  // 플레이중일 때는 추가하지 않는다, 관전
  if (isplaying) {
    tick(); // 들어온 사람이 화면 업데이트를 해야하니까
    return;
  }

  /** @type {obj} */
  const obj = {
    id: Math.random().toString(),
    name: "",
    isadmin:
      [...wsServer.clients].filter(
        (client) => client.readyState === websocket.OPEN
      ).length === 1,
    score: Array(11).fill(null),
    isleave: false,
  };
  players.push(obj);
  wsbyid[obj.id] = ws;

  senduserupdate();

  ws.on("message", (data_) => {
    const data = JSON.parse(data_);

    switch (data.type) {
      case "rename": {
        obj.name = data.name;
        ws.send(
          JSON.stringify({
            type: "setid",
            id: obj.id,

            players,
          })
        );

        senduserupdate();

        break;
      }

      case "start": {
        if (obj.isadmin && !isplaying) {
          isplaying = true;
          startgame();
        }

        break;
      }

      case "changePin": {
        broadcast({
          type: "changePin",
          pin: data.pin,
        });

        break;
      }
    }

    tick();
  });

  /** @todo 게임 진행중에 사람이 나가면 어떻게 되는가 */
  ws.on("close", () => {
    // 방장이 나갔을 때 첫번째 사람 방장으로
    if (obj.isadmin) {
      if (players.length) {
        players[0].isadmin = true;
      }
    }

    if (isplaying) {
      // 진행 중이다.
      // players는 수정하지 않는다
      obj.isleave = true;
    } else {
      // 진행 중이 아니다.
      const target = players.findIndex((p) => p.id === obj.id);
      if (target === -1) return;
      players.splice(target, 1);

      senduserupdate();
    }
  });
});

function calculateScore(scoreidx, dices) {
  function c(n) {
    return dices.filter((x) => x === n).length;
  }

  const scoreRules = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "3개",
    "4개",
    "풀하우스",
    "스트레이트",
    "야추",
  ];
  switch (scoreRules[scoreidx]) {
    case "1":
      return c(1) * 1;
    case "2":
      return c(2) * 2;
    case "3":
      return c(3) * 3;
    case "4":
      return c(4) * 4;
    case "5":
      return c(5) * 5;
    case "6":
      return c(6) * 6;

    case "3개":
      if (
        c(1) >= 3 ||
        c(2) >= 3 ||
        c(3) >= 3 ||
        c(4) >= 3 ||
        c(5) >= 3 ||
        c(6) >= 3
      )
        return dice.reduce((a, b) => a + b);
      return 0;
    case "4개":
      if (
        c(1) >= 4 ||
        c(2) >= 4 ||
        c(3) >= 4 ||
        c(4) >= 4 ||
        c(5) >= 4 ||
        c(6) >= 4
      )
        return dice.reduce((a, b) => a + b);
      return 0;
    case "풀하우스": {
      const tmp = [...dices].sort();
      if (
        tmp[0] === tmp[1] &&
        tmp[3] === tmp[4] &&
        (tmp[2] === tmp[0] || tmp[2] === tmp[4])
      )
        return 25;
      return 0;
    }
    case "스트레이트": {
      const tmp = [...dices].sort().join("");
      if (tmp === "12345" || tmp === "23456") return 40;
      return 0;
    }
    case "야추":
      if (c(dices[0]) === 5) return 50;
      return 0;
  }
}

function dice() {
  return Math.floor(Math.random() * 6) + 1;
}

async function startgame() {
  broadcast({
    type: "start",
  });

  for (let i = 0; i < 11; i++) {
    for (let now = 0; now < players.length; now++) {
      if (players[now].isleave) continue;

      /** @todo 현재 차례였던 사람이 나갔을 때, 계속 기다릴 듯 */

      const dices = [dice(), dice(), dice(), dice(), dice()];

      let remain = 2;

      while (1) {
        broadcast({
          type: "req-roll",
          dices,
          remain,
          target: players[now].id,
        });

        const promise = new Promise((res, rej) => {
          const handleRoll = (data_) => {
            const data = JSON.parse(data_);

            switch (data.type) {
              case "roll": {
                res([data.type, data.roll, handleRoll]);

                break;
              }

              case "confirm": {
                res([data.type, data.value, handleRoll]);

                break;
              }
            }
          };

          wsbyid[players[now].id].on("message", handleRoll);
        });

        const [choice, value, handleRoll] = await promise;
        wsbyid[players[now].id].off("message", handleRoll);
        if (choice === "roll") {
          for (let idx of value) {
            dices[idx] = dice();
          }

          remain--;
        } else {
          players[now].score[value] = calculateScore(value, dices);
          break;
        }
      }

      tick();
    }
  }

  // 게임이 끝남

  players = [];
  wsbyid = {};
  isplaying = false;

  broadcast({
    type: "end",
  });
}
