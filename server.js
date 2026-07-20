const express = require("express");
const path = require("path");
const { Client } = require("pg");
const cors = require("cors");

const app = express();
app.use(express.static('.'));
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
        let query, params;

        if (search.trim() === "") {
            // Jeśli puste pole, zwracamy wszystkich
            query = "SELECT * FROM obywatele";
            params = [];
        } else {
            // Dzielimy wpisany tekst na słowa po spacji
            const parts = search.trim().split(" ");
            
            if (parts.length > 1) {
                // Jeśli wpisano imię i nazwisko (np. Jan Kowalski)
                query = "SELECT * FROM obywatele WHERE (imie ILIKE $1 AND nazwisko ILIKE $2) OR (imie ILIKE $2 AND nazwisko ILIKE $1)";
                params = [`%${parts[0]}%`, `%${parts[1]}%`];
            } else {
                // Jeśli wpisano tylko jedno słowo (np. Jan)
                query = "SELECT * FROM obywatele WHERE imie ILIKE $1 OR nazwisko ILIKE $1";
                params = [`%${search}%`];
            }
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Błąd SQL:", err);
        res.status(500).send(err.message);
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
// Endpoint sprawdzający status
app.get("/api/status", (req, res) => {
    res.json({ status: "ONLINE", system: "LAPD-MDT" });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});

