(async function () {

    "use strict";

    const NS = "galowie_konkurs";
    const baseUrl = location.origin + "/game.php";

    /* ==============================
       USTAWIENIA
    ============================== */

    let targetTribes = [];
    let topLimit = 2000;
    let minTotal = 0;

    const perPage = 25;

    /* ==============================
       STYLE
    ============================== */

    const style = document.createElement("style");

    style.textContent = `
        #${NS}_panel {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999999;
            width: 430px;
            max-height: 85vh;
            overflow-y: auto;
            background: #f4e8c1;
            border: 2px solid #7a5a25;
            box-shadow: 0 4px 15px rgba(0,0,0,.4);
            padding: 15px;
            font-family: Arial, sans-serif;
            color: #33250f;
        }

        #${NS}_panel h2 {
            margin: 0 0 12px 0;
            font-size: 20px;
        }

        #${NS}_panel textarea,
        #${NS}_panel input {
            width: 100%;
            box-sizing: border-box;
            margin: 4px 0 10px 0;
            padding: 7px;
        }

        #${NS}_panel button {
            padding: 7px 10px;
            margin: 3px;
            cursor: pointer;
        }

        #${NS}_status {
            margin-top: 10px;
            padding: 8px;
            background: #fff8df;
            border: 1px solid #c6aa69;
            white-space: pre-line;
        }

        #${NS}_results {
            margin-top: 12px;
        }

        #${NS}_results table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        #${NS}_results th,
        #${NS}_results td {
            border: 1px solid #b9a06b;
            padding: 4px;
            text-align: center;
        }

        #${NS}_results th {
            background: #dbc48a;
        }

        #${NS}_results tr:nth-child(even) {
            background: #f9f1d5;
        }

        #${NS}_close {
            float: right;
            font-weight: bold;
        }
    `;

    document.head.appendChild(style);

    /* ==============================
       PANEL
    ============================== */

    const panel = document.createElement("div");

    panel.id = NS + "_panel";

    panel.innerHTML = `
        <button id="${NS}_close">✖</button>

        <h2>🏆 KONKURS GALÓW</h2>

        <b>Plemiona:</b>

        <textarea
            id="${NS}_tribes"
            rows="5"
            placeholder="Wpisz plemiona, każde w osobnej linii
:G:
-G-
~G~
;G;"
        ></textarea>

        <b>Ranking do pozycji:</b>

        <input
            id="${NS}_top"
            type="number"
            value="2000"
            min="25"
            step="25"
        >

        <b>Minimalna suma konkursowa:</b>

        <input
            id="${NS}_min"
            type="number"
            value="0"
            min="0"
        >

        <button id="${NS}_start">
            ▶ START KONKURSU
        </button>

        <button id="${NS}_copy" disabled>
            📋 KOPIUJ BBCode
        </button>

        <button id="${NS}_download" disabled>
            💾 POBIERZ BBCode
        </button>

        <div id="${NS}_status">
            Gotowy do rozpoczęcia.
        </div>

        <div id="${NS}_results"></div>
    `;

    document.body.appendChild(panel);

    /* ==============================
       ZAMKNIĘCIE
    ============================== */

    document.getElementById(NS + "_close").onclick = () => {
        panel.remove();
        style.remove();
    };

    /* ==============================
       POMOCNICZE
    ============================== */

    function normalizeName(name) {

        return name
            .trim()
            .toLowerCase();

    }

    function parseNumber(text) {

        if (!text) return 0;

        return parseInt(
            text.replace(/[^\d]/g, ""),
            10
        ) || 0;

    }

    function getTime(row) {

        const cells = row.querySelectorAll("td");

        if (cells.length < 5)
            return "";

        return cells[cells.length - 1]
            .innerText
            .trim();

    }

    /* ==============================
       POBIERANIE RANKINGU
    ============================== */

    async function getRanking(type, label) {

        const result = new Map();

        const pagesNeeded =
            Math.ceil(topLimit / perPage);

        const status =
            document.getElementById(NS + "_status");

        for (let page = 0; page < pagesNeeded; page++) {

            const offset =
                page * perPage;

            status.innerText =
                `⏳ Pobieranie ${label}...\n` +
                `Strona ${page + 1}/${pagesNeeded}`;

            const url =
                `${baseUrl}?screen=ranking` +
                `&mode=in_a_day` +
                `&type=${type}` +
                `&offset=${offset}`;

            const response =
                await fetch(url);

            if (!response.ok)
                throw new Error(
                    `Nie udało się pobrać ${label}.`
                );

            const html =
                await response.text();

            const doc =
                new DOMParser()
                    .parseFromString(
                        html,
                        "text/html"
                    );

            const table =
                doc.querySelector(
                    "#in_a_day_ranking_table"
                );

            if (!table)
                continue;

            const rows =
                table.querySelectorAll("tbody tr");

            rows.forEach(row => {

                const cells =
                    row.querySelectorAll("td");

                if (cells.length < 4)
                    return;

                const rank =
                    parseNumber(
                        cells[0].innerText
                    );

                if (!rank || rank > topLimit)
                    return;

                const playerLink =
                    row.querySelector(
                        'a[href*="info_player"]'
                    );

                if (!playerLink)
                    return;

                const player =
                    playerLink.innerText.trim();

                const playerKey =
                    normalizeName(player);

                const allyLink =
                    row.querySelector(
                        'a[href*="info_ally"]'
                    );

                const ally =
                    allyLink
                        ? allyLink.innerText.trim()
                        : "";

                const value =
                    parseNumber(
                        cells[3].innerText
                    );

                result.set(
                    playerKey,
                    {
                        player,
                        ally,
                        value,
                        rank,
                        time: getTime(row)
                    }
                );

            });

            await new Promise(
                resolve =>
                    setTimeout(resolve, 150)
            );
        }

        return result;
    }

    /* ==============================
       SPRAWDZANIE PLEMIENIA
    ============================== */

    function tribeMatches(tribe, targets) {

        const value =
            normalizeName(tribe);

        return targets.some(
            target =>
                normalizeName(target) === value
        );

    }

    /* ==============================
       START
    ============================== */

    document.getElementById(NS + "_start").onclick =
        async () => {

            try {

                targetTribes =
                    document.getElementById(
                        NS + "_tribes"
                    )
                    .value
                    .split(/\n+/)
                    .map(x => x.trim())
                    .filter(Boolean);

                topLimit =
                    parseInt(
                        document.getElementById(
                            NS + "_top"
                        ).value,
                        10
                    ) || 2000;

                minTotal =
                    parseNumber(
                        document.getElementById(
                            NS + "_min"
                        ).value
                    );

                if (!targetTribes.length) {

                    alert(
                        "Wpisz przynajmniej jedno plemię."
                    );

                    return;
                }

                const status =
                    document.getElementById(
                        NS + "_status"
                    );

                status.innerText =
                    "🚀 Rozpoczynam konkurs...";

                /* ==========================
                   POBIERAMY OBA RANKINGI
                ========================== */

                const [farm, scavenger] =
                    await Promise.all([
                        getRanking(
                            "loot_res",
                            "FARMY 🪙"
                        ),
                        getRanking(
                            "scavenge",
                            "ZBIERAKA 🧺"
                        )
                    ]);

                status.innerText =
                    "🔄 Łączenie wyników...";

                /* ==========================
                   ŁĄCZENIE GRACZY
                ========================== */

                const players =
                    new Map();

                function addPlayer(
                    key,
                    data,
                    source
                ) {

                    if (!players.has(key)) {

                        players.set(
                            key,
                            {
                                player:
                                    data.player,

                                ally:
                                    data.ally,

                                farm: 0,
                                scavenger: 0,

                                farmRank: "",
                                scavengerRank: "",

                                farmTime: "",
                                scavengerTime: ""
                            }
                        );

                    }

                    const p =
                        players.get(key);

                    if (source === "farm") {

                        p.farm =
                            data.value;

                        p.farmRank =
                            data.rank;

                        p.farmTime =
                            data.time;

                    } else {

                        p.scavenger =
                            data.value;

                        p.scavengerRank =
                            data.rank;

                        p.scavengerTime =
                            data.time;

                    }

                }

                farm.forEach(
                    (data, key) =>
                        addPlayer(
                            key,
                            data,
                            "farm"
                        )
                );

                scavenger.forEach(
                    (data, key) =>
                        addPlayer(
                            key,
                            data,
                            "scavenger"
                        )
                );

                /* ==========================
                   FILTRUJEMY PLEMIĘ
                ========================== */

                let data =
                    Array.from(players.values())
                    .filter(player =>
                        tribeMatches(
                            player.ally,
                            targetTribes
                        )
                    );

                /* ==========================
                   SUMA
                ========================== */

                data.forEach(player => {

                    player.total =
                        player.farm +
                        player.scavenger;

                });

                data =
                    data.filter(
                        player =>
                            player.total >= minTotal
                    );

                /* ==========================
                   SORTOWANIE
                ========================== */

                data.sort(
                    (a, b) =>
                        b.total - a.total
                );

                /* ==========================
                   TABELA
                ========================== */

                let html = `
                    <h3>
                        🏆 Ranking konkursowy
                    </h3>

                    <table>

                        <thead>

                            <tr>
                                <th>LP</th>
                                <th>Farma LP</th>
                                <th>Zbierak LP</th>
                                <th>Gracz</th>
                                <th>Plemię</th>
                                <th>🪙 Farma</th>
                                <th>🧺 Zbierak</th>
                                <th>🏆 SUMA</th>
                            </tr>

                        </thead>

                        <tbody>
                `;

                data.forEach(
                    (player, index) => {

                        html += `
                            <tr>

                                <td>
                                    <b>
                                        ${index + 1}
                                    </b>
                                </td>

                                <td>
                                    ${player.farmRank || "—"}
                                </td>

                                <td>
                                    ${player.scavengerRank || "—"}
                                </td>

                                <td>
                                    <a
                                        href="${
                                            baseUrl +
                                            "?screen=info_player" +
                                            "&id=" +
                                            encodeURIComponent(
                                                player.player
                                            )
                                        }"
                                        target="_blank"
                                    >
                                        ${player.player}
                                    </a>
                                </td>

                                <td>
                                    ${player.ally || "—"}
                                </td>

                                <td>
                                    ${player.farm.toLocaleString("pl-PL")}
                                </td>

                                <td>
                                    ${player.scavenger.toLocaleString("pl-PL")}
                                </td>

                                <td>
                                    <b>
                                        ${player.total.toLocaleString("pl-PL")}
                                    </b>
                                </td>

                            </tr>
                        `;

                    }
                );

                html += `
                        </tbody>
                    </table>
                `;

                document.getElementById(
                    NS + "_results"
                ).innerHTML = html;

                /* ==========================
                   BBCODE
                ========================== */

                let bbcode =
                    "[table]\n";

                bbcode +=
                    "[**]LP[||]" +
                    "Farma LP[||]" +
                    "Zbierak LP[||]" +
                    "Gracz[||]" +
                    "Plemię[||]" +
                    "Farma[||]" +
                    "Zbierak[||]" +
                    "SUMA[/**]\n";

                data.forEach(
                    (player, index) => {

                        bbcode +=
                            `[*]` +
                            `[b]${index + 1}[/b][|]` +
                            `${player.farmRank || "—"}[|]` +
                            `${player.scavengerRank || "—"}[|]` +
                            `[player]${player.player}[/player][|]` +
                            `${player.ally || "—"}[|]` +
                            `${player.farm}[|]` +
                            `${player.scavenger}[|]` +
                            `[b]${player.total}[/b]\n`;

                    }
                );

                bbcode +=
                    "[/table]";

                /* ==========================
                   PRZYCISKI
                ========================== */

                const copyButton =
                    document.getElementById(
                        NS + "_copy"
                    );

                copyButton.disabled = false;

                copyButton.onclick =
                    async () => {

                        try {

                            await navigator.clipboard
                                .writeText(bbcode);

                            copyButton.innerText =
                                "✅ Skopiowano!";

                            setTimeout(
                                () =>
                                    copyButton.innerText =
                                        "📋 KOPIUJ BBCode",
                                2000
                            );

                        } catch (e) {

                            alert(
                                "Nie udało się skopiować BBCode."
                            );

                        }

                    };

                const downloadButton =
                    document.getElementById(
                        NS + "_download"
                    );

                downloadButton.disabled = false;

                downloadButton.onclick =
                    () => {

                        const blob =
                            new Blob(
                                [bbcode],
                                {
                                    type:
                                        "text/plain;charset=utf-8"
                                }
                            );

                        const url =
                            URL.createObjectURL(blob);

                        const a =
                            document.createElement("a");

                        a.href = url;

                        a.download =
                            "konkurs_galow.txt";

                        document.body.appendChild(a);

                        a.click();

                        a.remove();

                        URL.revokeObjectURL(url);

                    };

                status.innerText =
                    `✅ Konkurs zakończony!\n\n` +
                    `Farma: ${farm.size} graczy\n` +
                    `Zbierak: ${scavenger.size} graczy\n` +
                    `Wyników konkursowych: ${data.length}`;

            } catch (e) {

                console.error(e);

                document.getElementById(
                    NS + "_status"
                ).innerText =
                    "❌ Błąd:\n\n" +
                    e.message;

                alert(
                    "Konkurs - błąd:\n\n" +
                    e.message
                );

            }

        };

})();
