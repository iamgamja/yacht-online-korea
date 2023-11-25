/** @typedef {{id: string, name: string, isadmin: boolean, score: (number|null)[], isleave: boolean}} obj */

/** @type {string | null} */
let id = null;
/** @type {obj | null} */
let obj = null;
/** @type {obj[] | null} */
let players = null;

let ismyturn = false;

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

  if (obj?.isadmin && !data.isplaying) {
    document.querySelector("#menubar").classList = [];
  } else {
    document.querySelector("#menubar").classList = ["hide"];
  }

  if (data.isplaying) {
    document.querySelector("#diceboard").classList = [];
  } else {
    document.querySelector("#diceboard").classList = ["hide"];
  }

  console.log("!", data.type, data);

  switch (data.type) {
    case "setid": {
      id = data.id;
      obj = players.find((p) => p.id === id);

      break;
    }

    case "start": {
      console.log("start!");

      break;
    }

    case "req-roll": {
      // 주사위, 리롤 횟수 표시
      for (let i = 0; i < 5; i++) {
        document.querySelector("#diceboard").children[i].children[1].innerText =
          data.dices[i];
      }
      document.querySelector("#remain").innerText = data.remain;

      // remain이 2일 때만 고정 초기화
      if (data.remain === 2) {
        [...document.querySelector("#diceboard").children].forEach((e) => {
          e.children[0].checked = false;
        });
      }

      if (data.target === id) {
        ismyturn = true;

        // 리롤 가능 횟수가 0이 아닐 때만 리롤 가능
        if (data.remain === 0)
          document.querySelector("#rerollbtn").setAttribute("disabled", "");
        else document.querySelector("#rerollbtn").removeAttribute("disabled");

        // 고정 가능
        [...document.querySelector("#diceboard").children].forEach((e) => {
          e.children[0].removeAttribute("disabled");
        });
      } else {
        // 리롤 안됨
        document.querySelector("#rerollbtn").setAttribute("disabled", "");

        // 고정 안됨
        [...document.querySelector("#diceboard").children].forEach((e) => {
          e.children[0].setAttribute("disabled", "");
        });
      }

      break;
    }

    case "user-update": {
      setScoreboard();

      break;
    }

    case "changePin": {
      for (let i = 0; i < 5; i++) {
        document.querySelector("#diceboard").children[i].children[0].checked =
          data.pin[i];
      }

      break;
    }

    case "end": {
      /** @todo 우승자 찾고 강조, 새로고침 버튼 추가 */

      break;
    }

    case "tick": {
      break;
    }
  }
};

/**
 * @param {number} scoreidx
 */
function scoreClickHandler(scoreidx) {
  if (!ismyturn) return;
  if (obj.score[scoreidx] !== null) return;

  connection.send(
    JSON.stringify({
      type: "confirm",
      value: scoreidx,
    })
  );

  ismyturn = false;
}

function setScoreboard() {
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
      if (p.id == id) tmp.addEventListener("click", () => scoreClickHandler(i));
      tmp.innerText = p.score[i] ?? "";
      scoreboard.children[i + 1].appendChild(tmp);
    }
  }
}

/** 점수만 업데이트 */
function updateScoreboard() {
  const scoreboard = document.querySelector("#scoreboard");

  // setScoreboard를 해야하는가
  if (scoreboard.children[0].children.length != players.length + 1)
    setScoreboard();

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
document.querySelector("#startbtn").addEventListener("click", () => {
  connection.send(
    JSON.stringify({
      type: "start",
    })
  );
});

document.querySelectorAll(".dice").forEach((e) => {
  e.addEventListener("click", () => {
    if (!ismyturn) return;

    connection.send(
      JSON.stringify({
        type: "changePin",
        pin: [0, 1, 2, 3, 4].map(
          (i) =>
            document.querySelector("#diceboard").children[i].children[0].checked
        ),
      })
    );
  });
});

document.querySelector("#rerollbtn").addEventListener("click", () => {
  if (!ismyturn) return;

  connection.send(
    JSON.stringify({
      type: "roll",
      roll: [0, 1, 2, 3, 4].filter(
        (i) =>
          !document.querySelector("#diceboard").children[i].children[0].checked
      ),
    })
  );

  ismyturn = false;
});

function loop() {
  if (players !== null) updateScoreboard();

  requestAnimationFrame(loop);
}

loop();
