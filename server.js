const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Użycie pliku zamiast pamięci RAM, aby dane nie znikały
const db = new sqlite3.Database('./baza.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS obywatele (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imie TEXT,
        nazwisko TEXT,
        data_urodzenia TEXT,
        poszukiwany INTEGER DEFAULT 0,
        uwagi TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mandaty (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        obywatel_id INTEGER,
        powod TEXT,
        kwota INTEGER,
        data TEXT,
        FOREIGN KEY(obywatel_id) REFERENCES obywatele(id)
    )`);
});

const funkcjonariusze = {
    "99": { haslo: "lspd", imie: "Officer Smith", rola: "user" },
    "admin": { haslo: "admin123", imie: "Komendant Główny", rola: "admin" }
};

// Endpoint statusu
app.get("/api/status", (req, res) => {
    res.json({ status: "Online", system: "LSPD MDT v2.0" });
});

// Logowanie
app.post("/api/login", (req, res) => {
    const { badge, password } = req.body;
    if (funkcjonariusze[badge] && funkcjonariusze[badge].haslo === password) {
        res.json({ success: true, officer: funkcjonariusze[badge].imie, rola: funkcjonariusze[badge].rola });
    } else {
        res.status(401).json({ success: false, message: "Błędne dane!" });
    }
});

// Dodawanie funkcjonariusza
app.post("/api/officers", (req, res) => {
    const { badge, name, password } = req.body;
    if (!badge || !password || !name) return res.status(400).json({ success: false, message: "Wypełnij wszystkie pola!" });
    
    funkcjonariusze[badge] = { haslo: password, imie: name, rola: "user" };
    res.json({ success: true, message: "Dodano funkcjonariusza!" });
});

// Pobieranie obywateli z mandatami
app.get("/api/obywatele", (req, res) => {
    const search = req.query.search || "";
    db.all(`SELECT * FROM obywatele WHERE imie LIKE ? OR nazwisko LIKE ?`, [`%${search}%`, `%${search}%`], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.json([]);

        let count = 0;
        rows.forEach((o) => {
            db.all(`SELECT * FROM mandaty WHERE obywatel_id = ?`, [o.id], (err, mandaty) => {
                o.mandaty = mandaty || [];
                count++;
                if (count === rows.length) res.json(rows);
            });
        });
    });
});

// Dodawanie obywatela
app.post("/api/obywatele", (req, res) => {
    const { imie, nazwisko, data_urodzenia, uwagi } = req.body;
    db.run(`INSERT INTO obywatele (imie, nazwisko, data_urodzenia, uwagi) VALUES (?, ?, ?, ?)`, 
        [imie, nazwisko, data_urodzenia, uwagi], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Wystawianie mandatu
app.post("/api/mandaty", (req, res) => {
    const { obywatel_id, powod, kwota, data } = req.body;
    db.run(`INSERT INTO mandaty (obywatel_id, powod, kwota, data) VALUES (?, ?, ?, ?)`, 
        [obywatel_id, powod, kwota, data], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});