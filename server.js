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
            // Pobieramy obywateli wraz z ich mandatami
            query = `
                SELECT o.*, 
                       COALESCE(json_agg(m.*) FILTER (WHERE m.id IS NOT NULL), '[]') AS mandaty
                FROM obywatele o
                LEFT JOIN mandaty m ON m.obywatel_id = o.id
                GROUP BY o.id
            `;
            params = [];
        } else {
            const parts = search.trim().split(" ");
            if (parts.length > 1) {
                query = `
                    SELECT o.*, 
                           COALESCE(json_agg(m.*) FILTER (WHERE m.id IS NOT NULL), '[]') AS mandaty
                    FROM obywatele o
                    LEFT JOIN mandaty m ON m.obywatel_id = o.id
                    WHERE (o.imie ILIKE $1 AND o.nazwisko ILIKE $2) OR (o.imie ILIKE $2 AND o.nazwisko ILIKE $1)
                    GROUP BY o.id
                `;
                params = [`%${parts[0]}%`, `%${parts[1]}%`];
            } else {
                query = `
                    SELECT o.*, 
                           COALESCE(json_agg(m.*) FILTER (WHERE m.id IS NOT NULL), '[]') AS mandaty
                    FROM obywatele o
                    LEFT JOIN mandaty m ON m.obywatel_id = o.id
                    WHERE o.imie ILIKE $1 OR o.nazwisko ILIKE $1
                    GROUP BY o.id
                `;
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
app.post("/api/obywatele/:id/poszukiwany", async (req, res) => {
    const { id } = req.params;
    const { poszukiwany } = req.body; // To jest 0 lub 1 wysyłane z przycisku

    try {
        const query = "UPDATE obywatele SET poszukiwany = $1 WHERE id = $2";
        await db.query(query, [poszukiwany, id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error("Błąd aktualizacji statusu:", err);
        res.status(500).send("Błąd serwera");
    }
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});

