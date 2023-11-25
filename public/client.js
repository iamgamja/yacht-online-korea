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
    document.querySelector("#menubar").classList.remove("hide");
  } else {
    document.querySelector("#menubar").classList.add("hide");
  }

  if (data.isplaying) {
    document.querySelector("#diceboard").classList.remove("hide");
  } else {
    document.querySelector("#diceboard").classList.add("hide");
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
      previewScoreboard(
        players.findIndex((p) => p.id === data.target),
        data.dices
      );
      styleScoreboard(players.findIndex((p) => p.id === data.target));

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
      resetStyleScoreboard();
      resetPreviewScoreboard();

      // 우승자 강조
      const max_score = Math.max(
        ...players.map((p) => p.score.reduce((a, b) => a + b))
      );
      const winners = players.filter(
        (p) => p.score.reduce((a, b) => a + b) === max_score
      );
      winners.forEach((winner) => {
        const idx = players.findIndex((p) => p.id === winner.id);
        document
          .querySelector("#scoreboard")
          .children[0].children[idx + 1].classList.add("winner");
      });

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

  scoreboard.innerHTML = "<p></p>".repeat(13); // 먼저 초기화

  const tmp = document.createElement("span");
  tmp.classList.add("blank");
  scoreboard.children[0].appendChild(tmp);

  for (let p of players) {
    const tmp = document.createElement("span");
    tmp.innerText = p.name;
    tmp.classList.add("nickname");
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
    "풀하",
    "스트",
    "야추",
  ];
  for (let i = 0; i < scoreRules.length; i++) {
    const r = scoreRules[i];

    const tmp = document.createElement("span");
    tmp.innerText = r;
    tmp.classList.add("scorename");
    scoreboard.children[i + 1].appendChild(tmp);

    for (let p of players) {
      const tmp = document.createElement("span");
      if (p.id == id) tmp.addEventListener("click", () => scoreClickHandler(i));
      tmp.innerText = p.score[i] ?? "";
      tmp.classList.add("scorebutton");
      scoreboard.children[i + 1].appendChild(tmp);
    }
  }

  const tmp2 = document.createElement("span");
  tmp2.innerText = "합계";
  tmp2.classList.add("scorename");
  scoreboard.children[12].appendChild(tmp2);

  for (let p of players) {
    const tmp = document.createElement("span");
    tmp.innerText = p.score.reduce((a, b) => a + b);
    tmp.classList.add("sum");
    scoreboard.children[12].appendChild(tmp);
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

  for (let i = 0; i < players.length; i++) {
    scoreboard.children[12].children[i + 1].innerText = players[i].score.reduce(
      (a, b) => a + b
    );
  }
}

/**
 * @param {number} playeridx
 */
function styleScoreboard(playeridx) {
  const scoreboard = document.querySelector("#scoreboard");

  // 현재 플레이어를 강조한다
  for (let x = 0; x < players.length; x++) {
    if (x === playeridx) {
      scoreboard.children[0].children[x + 1].classList.add("now");
    } else {
      scoreboard.children[0].children[x + 1].classList.remove("now");
    }
  }

  // 나간 사람을 회색으로 처리한다
  for (let x = 0; x < players.length; x++) {
    if (players[x].isleave) {
      scoreboard.children[0].children[x + 1].classList.add("leave");
      for (let y = 0; y < 11; y++) {
        scoreboard.children[y + 1].children[x + 1].classList.add("leave");
      }
      scoreboard.children[12].children[x + 1].classList.add("leave");
    }
  }
}

function resetStyleScoreboard() {
  const scoreboard = document.querySelector("#scoreboard");

  for (let x = 0; x < players.length; x++) {
    scoreboard.children[0].children[x + 1].classList.remove("now");
  }
}

function resetPreviewScoreboard() {
  const scoreboard = document.querySelector("#scoreboard");

  updateScoreboard(); // innerText 초기화

  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < players.length; x++) {
      scoreboard.children[y + 1].children[x + 1].classList.remove("preview"); // preview class 초기화
    }
  }
}

/**
 * @param {number} playeridx
 * @param {number[]} dices
 */
function previewScoreboard(playeridx, dices) {
  const scoreboard = document.querySelector("#scoreboard");

  resetPreviewScoreboard();

  // 그 다음 미리보기를 보여준다
  for (let i = 0; i < 11; i++) {
    if (players[playeridx].score[i] !== null) continue;

    scoreboard.children[i + 1].children[playeridx + 1].innerText =
      calculateScore(i, dices);
    scoreboard.children[i + 1].children[playeridx + 1].classList.add("preview");
  }
}

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
    "풀하",
    "스트",
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
        return dices.reduce((a, b) => a + b);
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
        return dices.reduce((a, b) => a + b);
      return 0;
    case "풀하": {
      const tmp = [...dices].sort();
      if (
        tmp[0] === tmp[1] &&
        tmp[3] === tmp[4] &&
        (tmp[2] === tmp[0] || tmp[2] === tmp[4])
      )
        return 25;
      return 0;
    }
    case "스트": {
      const tmp = [...dices].sort().join("");
      if (tmp === "12345" || tmp === "23456") return 40;
      return 0;
    }
    case "야추":
      if (c(dices[0]) === 5) return 50;
      return 0;
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
