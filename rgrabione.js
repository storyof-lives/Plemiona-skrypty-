(async function () {

try {

const NS = "rgrab";
const baseUrl = location.origin + "/game.php";

const $ = id => document.getElementById(NS + id);

const cleanPlayer = str =>
    str.replace(/\u00A0/g, " ").trim();

const normTribe = str =>
    str.replace(/\s/g, "").trim();

const escapeHTML = str =>
    String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const Script = {

    results: [],
    seen: new Set(),

    targets: [],
    top: 2000,
    min: 0,

    sortKey: "loot",
    sortDir: "desc",

    init() {

        document.getElementById(NS + "_overlay")?.remove();

        const el = document.createElement("div");
        el.id = NS + "_overlay";

        el.innerHTML = `
        <div style="
            position:fixed;
            inset:0;
            background:rgba(2,6,23,.75);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:999999;
        ">

            <div style="
                width:440px;
                max-width:94%;
                background:white;
                border-radius:12px;
                border:2px solid #b45309;
                overflow:hidden;
                box-shadow:0 10px 40px rgba(0,0,0,.35);
            ">

                <div style="
                    background:linear-gradient(#78350f,#d97706);
                    color:white;
                    padding:11px;
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    font-weight:bold;
                ">
                    <span>💰 RABOWANE PRO</span>

                    <button
                        id="${NS}_close_start"
                        style="
                            background:none;
                            border:none;
                            color:white;
                            font-size:17px;
                            cursor:pointer;
                        "
                    >✕</button>
                </div>

                <div style="padding:12px">

                    <div style="
                        font-size:12px;
                        color:#555;
                        margin-bottom:5px;
                    ">
                        Plemiona — jedno w każdym wierszu lub oddzielone spacją:
                    </div>

                    <textarea
                        id="${NS}_input"
                        placeholder=":G:
~G~
-G-
;G;"
                        style="
                            width:100%;
                            height:85px;
                            box-sizing:border-box;
                            border-radius:6px;
                            border:1px solid #ccc;
                            padding:7px;
                            resize:vertical;
                        "
                    ></textarea>

                    <div style="
                        display:flex;
                        gap:6px;
                        margin-top:7px;
                    ">

                        <div style="flex:1">
                            <div style="font-size:11px;color:#666">
                                Ranking do pozycji
                            </div>

                            <input
                                id="${NS}_top"
                                value="2000"
                                type="number"
                                min="1"
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:7px;
                                    border:1px solid #ccc;
                                    border-radius:6px;
                                "
                            >
                        </div>

                        <div style="flex:1">
                            <div style="font-size:11px;color:#666">
                                Min. zrabowanych
                            </div>

                            <input
                                id="${NS}_min"
                                value="0"
                                type="number"
                                min="0"
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:7px;
                                    border:1px solid #ccc;
                                    border-radius:6px;
                                "
                            >
                        </div>

                    </div>

                    <button
                        id="${NS}_start"
                        style="
                            margin-top:9px;
                            width:100%;
                            padding:9px;
                            background:#d97706;
                            color:white;
                            border:none;
                            border-radius:6px;
                            font-weight:bold;
                            cursor:pointer;
                        "
                    >
                        ▶ START
                    </button>

                    <div style="
                        background:#eee;
                        margin-top:9px;
                        border-radius:4px;
                        overflow:hidden;
                    ">
                        <div
                            id="${NS}_bar"
                            style="
                                height:7px;
                                background:#d97706;
                                width:0%;
                                transition:width .15s;
                            "
                        ></div>
                    </div>

                    <div
                        id="${NS}_log"
                        style="
                            font-size:12px;
                            margin-top:7px;
                            color:#555;
                            min-height:16px;
                        "
                    ></div>

                </div>

            </div>

        </div>`;

        document.body.appendChild(el);

        $("_start").onclick = () => this.start();

        document.getElementById(NS + "_close_start").onclick =
            () => el.remove();
    },

    log(text) {
        $("_log").innerText = text;
    },

    prog(value) {
        $("_bar").style.width =
            Math.max(0, Math.min(100, value)) + "%";
    },

    async fetchDoc(url) {

        const response = await fetch(url);

        if (response.status === 429) {

            this.log("⏳ Serwer ograniczył zapytania — czekam...");

            await new Promise(resolve =>
                setTimeout(resolve, 1800)
            );

            return this.fetchDoc(url);
        }

        if (!response.ok) {
            throw new Error(
                "Błąd pobierania strony: HTTP " + response.status
            );
        }

        const html = await response.text();

        return new DOMParser()
            .parseFromString(html, "text/html");
    },

    async start() {

        this.results = [];
        this.seen = new Set();

        this.targets = $("_input")
            .value
            .split(/\n|\s+/)
            .map(normTribe)
            .filter(Boolean);

        this.top =
            parseInt($("_top").value, 10) || 2000;

        this.min =
            parseInt($("_min").value, 10) || 0;

        if (!this.targets.length) {

            alert("Wpisz przynajmniej jedno plemię.");

            return;
        }

        if (this.top < 1) {

            alert("Pozycja rankingu musi być większa od 0.");

            return;
        }

        document.getElementById(NS + "_start").disabled = true;

        this.log("🔎 Rozpoczynam wyszukiwanie...");

        try {

            await this.scan();

            document.getElementById(NS + "_overlay")?.remove();

            this.buildUI();

        } catch (error) {

            console.error(error);

            alert(
                "Wystąpił błąd:\n\n" +
                error.message
            );

            document.getElementById(NS + "_start").disabled = false;
        }
    },

    async scan() {

        const perPage = 25;

        const pagesNeeded =
            Math.ceil(this.top / perPage);

        for (let page = 0; page < pagesNeeded; page++) {

            const offset = page * perPage;

            this.log(
                `🔎 Sprawdzam ranking ${offset + 1}–${Math.min(
                    offset + perPage,
                    this.top
                )}... Znaleziono: ${this.results.length}`
            );

            const doc = await this.fetchDoc(
                `${baseUrl}?screen=ranking&mode=in_a_day&type=loot_res&offset=${offset}`
            );

            const table =
                doc.querySelector("#in_a_day_ranking_table");

            if (!table) {

                throw new Error(
                    "Nie znaleziono tabeli rankingu dziennego zrabowanych surowców."
                );
            }

            const rows = table.querySelectorAll("tr");

            let validRows = 0;

            rows.forEach(row => {

                const td = row.querySelectorAll("td");

                if (td.length < 5) return;

                const rank =
                    parseInt(
                        td[0].innerText.replace(/[^\d]/g, ""),
                        10
                    );

                if (!rank || rank > this.top) return;

                validRows++;

                const loot =
                    parseInt(
                        td[3].innerText.replace(/[^\d]/g, ""),
                        10
                    ) || 0;

                if (loot < this.min) return;

                const player =
                    cleanPlayer(td[1].textContent);

                const tribeRaw =
                    td[2].textContent.trim();

                const tribe =
                    normTribe(tribeRaw);

                const belongs =
                    this.targets.some(target =>
                        tribe === target ||
                        tribe.includes(target)
                    );

                if (!belongs) return;

                if (this.seen.has(player)) return;

                this.seen.add(player);

                this.results.push({

                    rank: rank,

                    player: player,

                    ally: tribeRaw,

                    loot: loot,

                    time: td[4]
                        ? td[4].innerText.trim()
                        : ""

                });

            });

            const progress =
                ((page + 1) / pagesNeeded) * 100;

            this.prog(progress);

            if (validRows === 0) break;

            await new Promise(resolve =>
                setTimeout(resolve, 250)
            );
        }

        this.log(
            `✅ Zakończono. Znaleziono ${this.results.length} graczy.`
        );
    },

    sort(data) {

        data.sort((a, b) => {

            const A = a[this.sortKey];
            const B = b[this.sortKey];

            if (typeof A === "string") {

                return this.sortDir === "asc"
                    ? A.localeCompare(B, "pl")
                    : B.localeCompare(A, "pl");
            }

            return this.sortDir === "asc"
                ? A - B
                : B - A;
        });
    },

    buildUI() {

        let data = [...this.results];

        this.sort(data);

        const colors = [
            "#2563eb",
            "#16a34a",
            "#dc2626",
            "#d97706",
            "#7c3aed",
            "#0891b2",
            "#db2777",
            "#65a30d"
        ];

        const tribeColors = {};
        let colorIndex = 0;

        const getColor = tribe => {

            if (!tribeColors[tribe]) {

                tribeColors[tribe] =
                    colors[colorIndex % colors.length];

                colorIndex++;
            }

            return tribeColors[tribe];
        };

        const rows = data.map((player, index) => {

            const color =
                getColor(player.ally);

            return `
            <tr style="
                background:${color}12;
                border-bottom:1px solid #eee;
            ">

                <td style="padding:5px">
                    <b>${index + 1}</b>
                </td>

                <td style="padding:5px">
                    ${player.rank}
                </td>

                <td style="padding:5px">

                    <a
                        href="${baseUrl}?screen=info_player&name=${encodeURIComponent(player.player)}"
                        target="_blank"
                        style="
                            color:${color};
                            font-weight:bold;
                            text-decoration:none;
                        "
                    >
                        ${escapeHTML(player.player)}
                    </a>

                </td>

                <td
                    style="
                        padding:5px;
                        color:${color};
                        font-weight:bold;
                    "
                >
                    ${escapeHTML(player.ally)}
                </td>

                <td
                    style="
                        padding:5px;
                        font-weight:bold;
                        white-space:nowrap;
                    "
                >
                    ${player.loot.toLocaleString("pl-PL")}
                </td>

                <td style="padding:5px">
                    ${escapeHTML(player.time)}
                </td>

            </tr>`;
        }).join("");

        document.getElementById(NS + "_result")?.remove();

        const result = document.createElement("div");

        result.id = NS + "_result";

        result.innerHTML = `

        <div style="
            position:fixed;
            inset:0;
            background:rgba(2,6,23,.82);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:999998;
        ">

            <div style="
                width:94%;
                max-width:1050px;
                max-height:88vh;
                background:white;
                border-radius:12px;
                overflow:hidden;
                box-shadow:0 10px 50px rgba(0,0,0,.4);
            ">

                <div style="
                    background:linear-gradient(#78350f,#d97706);
                    color:white;
                    padding:10px;
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                ">

                    <b>
                        💰 Ranking zrabowanych surowców
                    </b>

                    <button
                        id="${NS}_close"
                        style="
                            background:none;
                            border:none;
                            color:white;
                            font-size:17px;
                            cursor:pointer;
                        "
                    >✕</button>

                </div>

                <div style="
                    padding:10px;
                    overflow:auto;
                    max-height:80vh;
                ">

                    <div style="
                        margin-bottom:8px;
                        font-size:12px;
                        color:#555;
                    ">
                        Znaleziono:
                        <b>${data.length}</b>
                        graczy
                    </div>

                    <div style="
                        display:flex;
                        flex-wrap:wrap;
                        gap:5px;
                        margin-bottom:8px;
                    ">

                        <button data-s="rank">
                            Rank
                        </button>

                        <button data-s="player">
                            Gracz
                        </button>

                        <button data-s="ally">
                            Plemię
                        </button>

                        <button data-s="loot">
                            Zrabowane
                        </button>

                        <button data-s="time">
                            Kiedy
                        </button>

                    </div>

                    <table style="
                        width:100%;
                        border-collapse:collapse;
                        font-size:13px;
                    ">

                        <thead>

                            <tr style="
                                background:#eee;
                                text-align:left;
                            ">

                                <th style="padding:6px">
                                    LP
                                </th>

                                <th style="padding:6px">
                                    Rank
                                </th>

                                <th style="padding:6px">
                                    Gracz
                                </th>

                                <th style="padding:6px">
                                    Plemię
                                </th>

                                <th style="padding:6px">
                                    Zrabowane
                                </th>

                                <th style="padding:6px">
                                    Kiedy
                                </th>

                            </tr>

                        </thead>

                        <tbody>
                            ${rows}
                        </tbody>

                    </table>

                    <div style="
                        margin-top:10px;
                        display:flex;
                        gap:6px;
                        flex-wrap:wrap;
                    ">

                        <button id="${NS}_copy">
                            📋 Kopiuj BBCode
                        </button>

                        <button id="${NS}_download">
                            💾 Pobierz BBCode
                        </button>

                    </div>

                </div>

            </div>

        </div>`;

        document.body.appendChild(result);

        document.getElementById(NS + "_close").onclick =
            () => result.remove();

        document.querySelectorAll("[data-s]").forEach(button => {

            button.onclick = () => {

                const key =
                    button.dataset.s;

                if (this.sortKey === key) {

                    this.sortDir =
                        this.sortDir === "desc"
                            ? "asc"
                            : "desc";

                } else {

                    this.sortKey = key;
                    this.sortDir = "desc";
                }

                this.buildUI();
            };
        });

        let bbcode =
            "[table]\n";

        bbcode +=
            "[**]LP[||]Rank[||]Gracz[||]Plemię[||]Zrabowane[||]Kiedy[/**]\n";

        data.forEach((player, index) => {

    bbcode +=
        `[*][b]${index + 1}[/b][|]` +
        `${player.rank}[|]` +
        `[player]${player.player}[/player][|]` +
        `[ally]${player.ally}[/ally][|]` +
        `[b]${player.loot}[/b][|]` +
        `${player.time}\n`;
});

bbcode += "[/table]";

document.getElementById(NS + "_copy").onclick =
    async () => {

        try {

            await navigator.clipboard.writeText(bbcode);

            document.getElementById(NS + "_copy")
                .innerText = "✅ Skopiowano!";

        } catch (e) {

            alert(
                "Nie udało się skopiować BBCode."
            );
        }
    };

document.getElementById(NS + "_download").onclick =
    () => {

        const blob =
            new Blob(
                [bbcode],
                { type: "text/plain;charset=utf-8" }
            );

        const url =
            URL.createObjectURL(blob);

        const a =
            document.createElement("a");

        a.href = url;
        a.download =
            "ranking_zrabowane.txt";

        document.body.appendChild(a);

        a.click();

        a.remove();

        URL.revokeObjectURL(url);
    };
}

};

Script.init();

} catch (e) {

    console.error(e);

    alert(
        "Błąd skryptu:\n\n" +
        e.message
    );
}

})();
