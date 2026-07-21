const express = require("express");
const path = require("path");
const { Client } = require("pg");
const cors = require("cors");

const app = express();

// Konfiguracja CORS dla zewnętrznych sieci
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.static('.'));

const PORT = process.env.PORT || 3000;

const db = new Client({
    connectionString: "postgresql://neondb_owner:npg_T94GvMwZcjyA@ep-old-bread-auu10o6b.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

db.connect();

// Inicjalizacja bazy danych i struktury
async function inicjalizacjaBazy() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS obywatele (
                id SERIAL PRIMARY KEY,
                imie TEXT,
                nazwisko TEXT,
                data_urodzenia TEXT,
                poszukiwany INTEGER DEFAULT 0,
                uwagi TEXT
            );

            CREATE TABLE IF NOT EXISTS mandaty (
                id SERIAL PRIMARY KEY,
                obywatel_id INTEGER REFERENCES obywatele(id) ON DELETE CASCADE,
                powod TEXT,
                kwota INTEGER,
                data TEXT
            );

            CREATE TABLE IF NOT EXISTS kadry (
                id SERIAL PRIMARY KEY,
                odznaka VARCHAR(50) UNIQUE NOT NULL,
                stopien_nazwisko VARCHAR(100) NOT NULL,
                haslo VARCHAR(100) NOT NULL,
                rola VARCHAR(50) DEFAULT 'user'
            );

            CREATE TABLE IF NOT EXISTS pojazdy (
                id SERIAL PRIMARY KEY,
                model TEXT,
                plate TEXT,
                color TEXT,
                owner TEXT,
                status TEXT,
                data_dodania TEXT
            );

            CREATE TABLE IF NOT EXISTS raporty (
                id SERIAL PRIMARY KEY,
                tytul TEXT,
                kategoria TEXT,
                status TEXT,
                obywatel TEXT,
                pojazdy TEXT,
                wspoloficerowie TEXT,
                dowody TEXT,
                opis TEXT,
                autor TEXT,
                odznaka_autora TEXT,
                data TEXT
            );
        `);

        // Zabezpieczenie dodania kolumny rola
        await db.query(`
            ALTER TABLE kadry ADD COLUMN IF NOT EXISTS rola VARCHAR(50) DEFAULT 'user';
        `);

        // Konta domyślne
        await db.query(`
            INSERT INTO kadry (odznaka, stopien_nazwisko, haslo, rola) 
            VALUES ('99', 'Officer Smith', 'lspd', 'user')
            ON CONFLICT (odznaka) DO NOTHING;

            INSERT INTO kadry (odznaka, stopien_nazwisko, haslo, rola) 
            VALUES ('admin', 'Komendant Główny', 'admin123', 'admin')
            ON CONFLICT (odznaka) DO NOTHING;
        `);

        console.log("Tabele w bazie danych zostały sprawdzone/utworzone pomyślnie.");
    } catch (err) {
        console.error("Błąd podczas inicjalizacji bazy danych:", err);
    }
}

inicjalizacjaBazy();

// POPRAWIONE LOGOWANIE: Obsługuje logowanie zarówno po odznake, jak i po imieniu/nazwisku (stopien_nazwisko)
app.post("/api/login", async (req, res) => {
    const { badge, password } = req.body;
    
    console.log("Próba logowania dla identyfikatora:", badge);

    try {
        const query = `
            SELECT * FROM kadry 
            WHERE (odznaka = $1 OR stopien_nazwisko ILIKE $1) 
              AND haslo = $2
        `;
        const result = await db.query(query, [badge, password]);

        console.log("Znaleziono w bazie pasujących użytkowników:", result.rows.length);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({ 
                success: true, 
                officer: user.stopien_nazwisko, 
                rola: user.rola || 'user'
            });
        } else {
            res.status(401).json({ success: false, message: "Błędne dane logowania" });
        }
    } catch (err) {
        console.error("Błąd logowania:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Dodawanie nowego funkcjonariusza (Kadr)
app.post("/api/officers", async (req, res) => {
    const { badge, name, password } = req.body;
    try {
        const query = "INSERT INTO kadry (odznaka, stopien_nazwisko, haslo, rola) VALUES ($1, $2, $3, 'user')";
        await db.query(query, [badge, name, password]);
        res.json({ success: true, message: "Pomyślnie dodano funkcjonariusza!" });
    } catch (err) {
        console.error("Błąd dodawania kadra:", err);
        res.status(500).json({ success: false, message: "Błąd bazy danych (prawdopodobnie odznaka już istnieje)." });
    }
});

// Pobieranie obywateli z ich mandatami
app.get("/api/obywatele", async (req, res) => {
    const search = req.query.search || "";
    try {
        let query, params;

        if (search.trim() === "") {
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

// Usuwanie obywatela
app.delete("/api/obywatele/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM obywatele WHERE id = $1", [id]);
        res.json({ success: true, message: "Pomyślnie usunięto obywatela." });
    } catch (err) {
        console.error("Błąd usuwania obywatela:", err);
        res.status(500).json({ success: false, message: "Błąd serwera podczas usuwania." });
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

// Endpoint statusu
app.get("/api/status", (req, res) => {
    res.json({ status: "ONLINE", system: "LAPD-MDT" });
});

app.post("/api/obywatele/:id/poszukiwany", async (req, res) => {
    const { id } = req.params;
    const { poszukiwany } = req.body;

    try {
        const query = "UPDATE obywatele SET poszukiwany = $1 WHERE id = $2";
        await db.query(query, [poszukiwany, id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Błąd aktualizacji statusu:", err);
        res.status(500).send("Błąd serwera");
    }
});

// Pojazdy
app.get("/api/pojazdy", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM pojazdy ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post("/api/pojazdy", async (req, res) => {
    const { model, plate, color, owner, status, dataDodania } = req.body;
    try {
        await db.query(
            "INSERT INTO pojazdy (model, plate, color, owner, status, data_dodania) VALUES ($1, $2, $3, $4, $5, $6)",
            [model, plate, color, owner, status, dataDodania]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/pojazdy/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query("UPDATE pojazdy SET status = $1 WHERE id = $2", [status, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Raporty
app.get("/api/raporty", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM raporty ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post("/api/raporty", async (req, res) => {
    const { tytul, kategoria, status, obywatel, pojazdy, wspoloficerowie, dowody, opis, autor, odznakaAutora, data } = req.body;
    try {
        await db.query(
            `INSERT INTO raporty (tytul, kategoria, status, obywatel, pojazdy, wspoloficerowie, dowody, opis, autor, odznaka_autora, data) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [tytul, kategoria, status, obywatel, pojazdy, wspoloficerowie, dowody, opis, autor, odznakaAutora, data]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
