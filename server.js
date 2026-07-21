const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());
app.use(cors());

// --- INICJALIZACJA TRWAŁEJ BAZY DANYCH (ZAPIS NA DYSKU) ---
const db = new sqlite3.Database('./baza.db', (err) => {
    if (err) {
        console.error('Błąd otwierania bazy danych:', err.message);
    } else {
        console.log('Połączono z trwalą bazą danych SQLite.');
    }
});

// Tworzenie tabel, jeśli nie istnieją
db.serialize(() => {
    // Tabela funkcjonariuszy
    db.run(`CREATE TABLE IF NOT EXISTS officers (
        badge TEXT PRIMARY KEY,
        name TEXT,
        password TEXT,
        rola TEXT
    )`);

    // Domyślny admin (zostanie dodany tylko raz, jeśli tabela jest pusta)
    db.get(`SELECT count(*) as count FROM officers`, (err, row) => {
        if (row.count === 0) {
            db.run(`INSERT INTO officers (badge, name, password, rola) VALUES (?, ?, ?, ?)`, 
                ['NIKODEM', 'Nikodem', '02122004', 'admin']);
        }
    });

    // Tabela obywateli
    db.run(`CREATE TABLE IF NOT EXISTS obywatele (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imie TEXT,
        nazwisko TEXT,
        data_urodzenia TEXT,
        uwagi TEXT,
        poszukiwany INTEGER DEFAULT 0
    )`);

    // Tabela mandatów
    db.run(`CREATE TABLE IF NOT EXISTS mandaty (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        obywatel_id INTEGER,
        powod TEXT,
        kwota INTEGER,
        data TEXT,
        FOREIGN KEY(obywatel_id) REFERENCES obywatele(id)
    )`);

    // Tabela pojazdów
    db.run(`CREATE TABLE IF NOT EXISTS pojazdy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model TEXT,
        plate TEXT,
        color TEXT,
        owner TEXT,
        status TEXT,
        dataDodania TEXT
    )`);

    // Tabela raportów
    db.run(`CREATE TABLE IF NOT EXISTS raporty (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tytul TEXT,
        kategoria TEXT,
        status TEXT,
        obywatel TEXT,
        pojazdy TEXT,
        wspoloficerowie TEXT,
        dowody TEXT,
        opis TEXT,
        autor TEXT,
        odznakaAutora TEXT,
        data TEXT
    )`);
});

// --- 1. LOGOWANIE ---
app.post('/api/login', (req, res) => {
    const { badge, password } = req.body;
    const cleanBadge = (badge || '').trim().toUpperCase();

    db.get(`SELECT * FROM officers WHERE UPPER(badge) = ? AND password = ?`, [cleanBadge, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Błąd serwera bazy danych." });
        }
        if (row) {
            res.json({
                success: true,
                officer: row.name,
                rola: row.rola || 'officer'
            });
        } else {
            res.status(401).json({ success: false, message: "Błędny numer odznaki lub hasło!" });
        }
    });
});

// --- 2. ZARZĄDZANIE KADRAMI ---
app.get('/api/officers', (req, res) => {
    db.all(`SELECT badge, name, password, rola FROM officers`, [], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

app.post('/api/officers', (req, res) => {
    const { badge, name, password } = req.body;
    if (!badge || !name || !password) {
        return res.status(400).json({ success: false, message: "Uzupełnij wszystkie pola!" });
    }

    const cleanBadge = badge.trim().toUpperCase();
    db.get(`SELECT * FROM officers WHERE UPPER(badge) = ?`, [cleanBadge], (err, row) => {
        if (row) {
            return res.json({ success: false, message: "Funkcjonariusz o takim numerze odznaki już istnieje!" });
        }

        db.run(`INSERT INTO officers (badge, name, password, rola) VALUES (?, ?, ?, ?)`, 
            [cleanBadge, name.trim(), password, 'officer'], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Błąd zapisu w bazie." });
            }
            res.json({ success: true, message: `Pomyślnie zarejestrowano funkcjonariusza: ${name} (${cleanBadge})` });
        });
    });
});

app.delete('/api/officers/:badge', (req, res) => {
    const badgeToDelete = req.params.badge.toUpperCase();
    db.run(`DELETE FROM officers WHERE UPPER(badge) = ?`, [badgeToDelete], (err) => {
        res.json({ success: true });
    });
});

// --- 3. OBYWATELE ---
app.get('/api/obywatele', (req, res) => {
    const search = (req.query.search || '').toLowerCase();
    let query = `SELECT * FROM obywatele`;
    let params = [];

    if (search) {
        query += ` WHERE LOWER(imie) LIKE ? OR LOWER(nazwisko) LIKE ?`;
        params = [`%${search}%`, `%${search}%`];
    }

    db.all(query, params, (err, obywatele) => {
        if (err) return res.status(500).json([]);

        // Pobieramy mandaty dla każdego obywatela
        let completed = 0;
        if (obywatele.length === 0) return res.json([]);

        obywatele.forEach((o, index) => {
            db.all(`SELECT powod, kwota, data FROM mandaty WHERE obywatel_id = ?`, [o.id], (err, mandaty) => {
                obywatele[index].mandaty = mandaty || [];
                completed++;
                if (completed === obywatele.length) {
                    res.json(obywatele);
                }
            });
        });
    });
});

app.post('/api/obywatele', (req, res) => {
    const { imie, nazwisko, data_urodzenia, uwagi } = req.body;
    db.run(`INSERT INTO obywatele (imie, nazwisko, data_urodzenia, uwagi, poszukiwany) VALUES (?, ?, ?, ?, 0)`,
        [imie, nazwisko, data_urodzenia, uwagi], (err) => {
        res.json({ success: !err });
    });
});

app.post('/api/obywatele/:id/poszukiwany', (req, res) => {
    const { poszukiwany } = req.body;
    db.run(`UPDATE obywatele SET poszukiwany = ? WHERE id = ?`, [poszukiwany, req.params.id], (err) => {
        res.json({ success: true });
    });
});

app.delete('/api/obywatele/:id', (req, res) => {
    db.run(`DELETE FROM obywatele WHERE id = ?`, [req.params.id], (err) => {
        db.run(`DELETE FROM mandaty WHERE obywatel_id = ?`, [req.params.id], () => {
            res.json({ success: true });
        });
    });
});

// --- 4. MANDATY ---
app.post('/api/mandaty', (req, res) => {
    const { obywatel_id, powod, kwota, data } = req.body;
    db.run(`INSERT INTO mandaty (obywatel_id, powod, kwota, data) VALUES (?, ?, ?, ?)`,
        [obywatel_id, powod, kwota, data], (err) => {
        res.json({ success: true });
    });
});

// --- 5. POJAZDY ---
app.get('/api/pojazdy', (req, res) => {
    db.all(`SELECT * FROM pojazdy`, [], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/pojazdy', (req, res) => {
    const { model, plate, color, owner, status, dataDodania } = req.body;
    db.run(`INSERT INTO pojazdy (model, plate, color, owner, status, dataDodania) VALUES (?, ?, ?, ?, ?, ?)`,
        [model, plate, color, owner, status || 'clean', dataDodania], (err) => {
        res.json({ success: true });
    });
});

app.post('/api/pojazdy/:id/status', (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE pojazdy SET status = ? WHERE id = ?`, [status, req.params.id], (err) => {
        res.json({ success: true });
    });
});

// --- 6. RAPORTY ---
app.get('/api/raporty', (req, res) => {
    db.all(`SELECT * FROM raporty`, [], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/raporty', (req, res) => {
    const r = req.body;
    db.run(`INSERT INTO raporty (tytul, kategoria, status, obywatel, pojazdy, wspoloficerowie, dowody, opis, autor, odznakaAutora, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.tytul, r.kategoria, r.status, r.obywatel, r.pojazdy, r.wspoloficerowie, r.dowody, r.opis, r.autor, r.odznakaAutora, r.data], (err) => {
        res.json({ success: true });
    });
});

// --- 7. STATUS ---
app.get('/api/status', (req, res) => {
    res.json({ status: "ONLINE", system: "LSPD CAD SQLite Persistent Storage" });
});

// Uruchomienie serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serwer z trwalą bazą danych SQLite uruchomiony na porcie ${PORT}`);
});
