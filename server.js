const express = require("express");
const path = require("path");
const { Client } = require("pg");
const cors = require("cors");

const app = express();
app.use(express.static('public'));
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new Client({
    connectionString: "postgresql://neondb_owner:npg_T94GvMwZcjyA@ep-old-bread-auu10o6b.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

db.connect();

async function initDb() {
    await db.query(`CREATE TABLE IF NOT EXISTS obywatele (
        id SERIAL PRIMARY KEY,
        imie TEXT,
        nazwisko TEXT,
        data_urodzenia TEXT,
        poszukiwany INTEGER DEFAULT 0,
        uwagi TEXT
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS mandaty (
        id SERIAL PRIMARY KEY,
        obywatel_id INTEGER REFERENCES obywatele(id) ON DELETE CASCADE,
        powod TEXT,
        kwota INTEGER,
        data TEXT
    )`);
}
initDb();

const funkcjonariusze = {
    "99": { haslo: "lspd", imie: "Officer Smith", rola: "user" },
    "admin": { haslo: "admin123", imie: "Komendant Główny", rola: "admin" }
};

// Logowanie
app.post("/api/login", (req, res) => {
    const { badge, password } = req.body;
    if (funkcjonariusze[badge] && funkcjonariusze[badge].haslo === password) {
        res.json({ success: true, officer: funkcjonariusze[badge].imie, rola: funkcjonariusze[badge].rola });
    } else {
        res.status(401).json({ success: false, message: "Błędne dane!" });
    }
});

// Pobieranie obywateli z ich mandatami
app.get("/api/obywatele", async (req, res) => {
    const search = req.query.search || "";
    try {
        const result = await db.query(
            "SELECT o.*, json_agg(m.*) FILTER (WHERE m.id IS NOT NULL) as mandaty FROM obywatele o LEFT JOIN mandaty m ON o.id = m.obywatel_id WHERE o.imie ILIKE $1 OR o.nazwisko ILIKE $1 GROUP BY o.id",
            [`%${search}%`]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dodawanie obywatela
app.post("/api/obywatele", async (req, res) => {
    const { imie, nazwisko, data_urodzenia, uwagi } = req.body;
    try {
        await db.query("INSERT INTO obywatele (imie, nazwisko, data_urodzenia, uwagi) VALUES ($1, $2, $3, $4)", [imie, nazwisko, data_urodzenia, uwagi]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Wystawianie mandatu
app.post("/api/mandaty", async (req, res) => {
    const { obywatel_id, powod, kwota, data } = req.body;
    try {
        await db.query("INSERT INTO mandaty (obywatel_id, powod, kwota, data) VALUES ($1, $2, $3, $4)", [obywatel_id, powod, kwota, data]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});

