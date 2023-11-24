let id = null;
let obj = null;
let players = null;

const wsprotocol = window.location.protocol === "https:" ? "wss" : "ws";
const connection = new WebSocket(
  `${wsprotocol}://${window.location.hostname}:${window.location.port}`
);

connection.onopen = () => {
  console.log("connect");

  connection.send(
    JSON.stringify({
      type: "rename",
      name: prompt("nickname"),
    })
  );
};

connection.onmessage = (message) => {
  const data = JSON.parse(message.data);

  players = data.players;

  if (id !== null) {
    obj = players.find((p) => p.id === id);
  }

  switch (data.type) {
    case "setid": {
      id = data.id;
      obj = players.find((p) => p.id === id);

      startupdate();

      break;
    }

    case "start": {
      break;
    }

    case "req-roll": {
      if (data.target === id) {
        alert(data.dices.join(""));
        const playeridx = players.findIndex((x) => x.id === id);

        const handlers = [];

        const scoreboard = document.querySelector("#scoreboard");

        for (let i = 0; i < 11; i++) {
          const handler = function () {
            connection.send(
              JSON.stringify({
                type: "confirm",
                value: i,
              })
            );

            handlers.forEach((h, i) =>
              scoreboard.children[i + 1].removeEventListener("click", h)
            );
          };

          handlers.push(handler);
          scoreboard.children[i + 1].children[playeridx + 1].addEventListener(
            "click",
            handler
          );
        }
      }
    }

    case "user-update": {
      setScoreboard();
    }

    case "tick": {
      break;
    }
  }
};

function setScoreboard() {
  console.log(players);
  const scoreboard = document.querySelector("#scoreboard");

  scoreboard.innerHTML = "<p></p>".repeat(12); // 먼저 초기화

  scoreboard.children[0].appendChild(document.createElement("span"));

  for (let p of players) {
    const tmp = document.createElement("span");
    tmp.innerText = p.name;
    scoreboard.children[0].appendChild(tmp);
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
  for (let i = 0; i < scoreRules.length; i++) {
    const r = scoreRules[i];

    const tmp = document.createElement("span");
    tmp.innerText = r;
    scoreboard.children[i + 1].appendChild(tmp);

    for (let p of players) {
      const tmp = document.createElement("span");
      scoreboard.children[i + 1].appendChild(tmp);
    }
  }
}

/** 점수만 업데이트 */
function updateScoreboard() {
  const scoreboard = document.querySelector("#scoreboard");

  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < players.length; x++) {
      if (
        scoreboard.children[y + 1].children[x + 1].innerText !==
        players[x].score[y]
      )
        scoreboard.children[y + 1].children[x + 1].innerText =
          players[x].score[y];
    }
  }
}

// update view
function startupdate() {
  if (obj.isadmin) {
    document.querySelector("#startbtn").classList = [];

    document.querySelector("#startbtn").addEventListener("click", () => {
      connection.send(
        JSON.stringify({
          type: "start",
        })
      );
    });
  }

  setScoreboard();

  function loop() {
    if (id !== null) {
      // do
      updateScoreboard();
    }

    requestAnimationFrame(loop);
  }

  loop();
}
