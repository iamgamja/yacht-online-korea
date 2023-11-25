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
 * @param {string} data
 */
function broadcast(data) {
  wsServer.clients.forEach((client) => {
    if (client.readyState === websocket.OPEN) {
      client.send(data);
    }
  });
}

function senduserupdate() {
  broadcast(
    JSON.stringify({
      type: "user-update",

      players,
    })
  );
}

function tick() {
  broadcast(
    JSON.stringify({
      type: "tick",

      players,
    })
  );
}

/** @typedef {{id: string, name: string, isadmin: boolean, score: (number|null)[]}} obj */

/** @type {obj[]} */
const players = [];

/** @type {{[id: string]: websocket}} */
const wsbyid = {};

let isplaying = false;

wsServer.on("connection", (ws) => {
  // 플레이중일 때는 추가하지 않는다, 관전
  if (isplaying) return;

  /** @type {obj} */
  const obj = {
    id: Math.random().toString(),
    name: "",
    isadmin:
      [...wsServer.clients].filter(
        (client) => client.readyState === websocket.OPEN
      ).length === 1,
    score: Array(11).fill(null),
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
        if (obj.isadmin) {
          isplaying = true;
          startgame();
        }

        break;
      }
    }

    tick();
  });

  /** @todo 게임 진행중에 사람이 나가면 어떻게 되는가 */
  ws.on("close", () => {
    const isadmin = obj.isadmin;
    const target = players.findIndex((p) => p.id === obj.id);
    players.splice(target, 1);

    // 방장이 나갔을 때 첫번째 사람 방장으로
    if (isadmin) {
      if (players.length) {
        players[0].isadmin = true;
      }
    }

    senduserupdate();
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
  /** @todo fix score */
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
      const tmp = [...dice].sort();
      if (
        tmp[0] === tmp[1] &&
        tmp[3] === tmp[4] &&
        (tmp[2] === tmp[0] || tmp[2] === tmp[4])
      )
        return 25;
      return 0;
    }
    case "스트레이트": {
      const tmp = [...dice].sort().join("");
      if (tmp === "12345" || tmp === "23456") return 25;
      return 0;
    }
    case "야추":
      if (c(dices[0]) === 6) return 50;
      return 0;
  }
}

function dice() {
  return Math.floor(Math.random() * 6) + 1;
}

async function startgame() {
  broadcast(
    JSON.stringify({
      type: "start",

      players,
    })
  );

  for (let i = 0; i < 11; i++) {
    for (let now = 0; now < players.length; now++) {
      const dices = [dice(), dice(), dice(), dice(), dice(), dice()];

      let remain = 2;

      while (1) {
        broadcast(
          JSON.stringify({
            type: "req-roll",
            dices,
            remain,
            target: players[now].id,

            players,
          })
        );

        const promise = new Promise((res, rej) => {
          const handleRoll = (data_) => {
            const data = JSON.parse(data_);

            switch (data.type) {
              case "roll": {
                res([1, data.roll, handleRoll]);

                break;
              }

              case "confirm": {
                res([2, data.value, handleRoll]);

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
}
