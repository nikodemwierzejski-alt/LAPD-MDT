const express = require("express");
const path = require("path");
const { Client } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const db = new Client({
    connectionString: "postgresql://neondb_owner:npg_T94GvMwZcjyA@ep-old-bread-auu10o6b.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

db.connect();

// Funkcja inicjalizująca tabele oraz konta domyślne w chmurze (Neon PostgreSQL)
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

        // Twoje unikalne konto admina oraz konta testowe
        await db.query(`
            INSERT INTO kadry (odznaka, stopien_nazwisko, haslo, rola) 
            VALUES ('Nikodem', 'Nikodem', '02122004', 'admin')
            ON CONFLICT (odznaka) DO NOTHING;

            INSERT INTO kadry (odznaka, stopien_nazwisko, haslo, rola) 
            VALUES ('99', 'Officer Smith', 'lspd', 'user')
            ON CONFLICT (odznaka) DO NOTHING;
        `);

        console.log("Tabele i konta w bazie Neon zostały pomyślnie skonfigurowane.");
    } catch (err) {
        console.error("Błąd podczas inicjalizacji bazy danych:", err);
    }
}

        // Automatyczne dodanie kont testowych z odpowiednimi rolami
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

        // Tutaj zapytania INSERT z await MUSZĄ być w środku funkcji!
        await db.query(`
            INSERT INTO kadry (odznaka, stopien_nazwisko, haslo, rola) 
            VALUES ('Nikodem', 'Nikodem', '02122004', 'admin')
            ON CONFLICT (odznaka) DO NOTHING;

            INSERT INTO kadry (odznaka, stopien_nazwisko, haslo, rola) 
            VALUES ('99', 'Officer Smith', 'lspd', 'user')
            ON CONFLICT (odznaka) DO NOTHING;
        `);

        console.log("Tabele w bazie danych zostały sprawdzone/utworzone pomyślnie.");
    } catch (err) {
        console.error("Błąd podczas inicjalizacji bazy danych:", err);
    }
}

// Wywołanie funkcji na samym dole
inicjalizacjaBazy();
inicjalizacjaBazy();

// --- LOGOWANIE WYŁĄCZNIE NA NUMER ODZNAKI I HASŁO ---
app.post("/api/login", async (req, res) => {
    const { badge, password } = req.body;
    
    console.log("Próba logowania dla odznaki:", badge);

    try {
        // Sprawdzamy wyłącznie po kolumnie odznaka oraz hasło (ignorując wielkość liter w odznace)
        const query = `
            SELECT * FROM kadry 
            WHERE UPPER(odznaka) = UPPER($1) 
            AND haslo = $2
        `;
        const result = await db.query(query, [badge, password]);

        console.log("Znaleziono w bazie pasujących użytkowników:", result.rows.length);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({ 
                success: true, 
                officer: user.stopien_nazwisko, 
                rola: user.rola 
            });
        } else {
            res.status(401).json({ success: false, message: "Błędne dane logowania (zły numer odznaki lub hasło)" });
        }
    } catch (err) {
        console.error("Błąd logowania:", err);
        res.status(500).send(err.message);
    }
});

// Pobieranie listy kadr (funkcjonariuszy) dla panelu Admina
app.get("/api/officers", async (req, res) => {
    try {
        const result = await db.query("SELECT odznaka as badge, stopien_nazwisko as name, haslo as password, rola FROM kadry");
        res.json(result.rows);
    } catch (err) {
        console.error("Błąd pobierania kadr:", err);
        res.status(500).json([]);
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

// Usuwanie funkcjonariusza (Admin)
app.delete("/api/officers/:badge", async (req, res) => {
    const { badge } = req.params;
    try {
        await db.query("DELETE FROM kadry WHERE UPPER(odznaka) = UPPER($1)", [badge]);
        res.json({ success: true });
    } catch (err) {
        console.error("Błąd usuwania funkcjonariusza:", err);
        res.status(500).json({ success: false });
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

// Aktualizacja statusu poszukiwanego obywatela
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

// --- MODUŁ POJAZDÓW (DMV) ---
app.get("/api/pojazdy", async (req, res) => {
    try {
        const result = await db.query("SELECT id, model, plate, color, owner, status, data_dodania as \"dataDodania\" FROM pojazdy ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        console.error("Błąd pobierania pojazdów:", err);
        res.status(500).json([]);
    }
});

app.post("/api/pojazdy", async (req, res) => {
    const { model, plate, color, owner, status, dataDodania } = req.body;
    try {
        await db.query(
            "INSERT INTO pojazdy (model, plate, color, owner, status, data_dodania) VALUES ($1, $2, $3, $4, $5, $6)",
            [model, plate, color, owner, status || 'clean', dataDodania]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Błąd dodawania pojazdu:", err);
        res.status(500).json({ success: false });
    }
});

app.post("/api/pojazdy/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query("UPDATE pojazdy SET status = $1 WHERE id = $2", [status, id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Błąd zmiany statusu pojazdu:", err);
        res.status(500).json({ success: false });
    }
});

// --- MODUŁ RAPORTÓW ---
app.get("/api/raporty", async (req, res) => {
    try {
        const result = await db.query("SELECT id, tytul, kategoria, status, obywatel, pojazdy, wspoloficerowie, dowody, opis, autor, odznaka_autora as \"odznakaAutora\", data FROM raporty ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        console.error("Błąd pobierania raportów:", err);
        res.status(500).json([]);
    }
});

app.post("/api/raporty", async (req, res) => {
    const r = req.body;
    try {
        await db.query(
            `INSERT INTO raporty (tytul, kategoria, status, obywatel, pojazdy, wspoloficerowie, dowody, opis, autor, odznaka_autora, data) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [r.tytul, r.kategoria, r.status, r.obywatel, r.pojazdy, r.wspoloficerowie, r.dowody, r.opis, r.autor, r.odznakaAutora, r.data]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Błąd dodawania raportu:", err);
        res.status(500).json({ success: false });
    }
});

// Endpoint sprawdzający status
app.get("/api/status", (req, res) => {
    res.json({ status: "ONLINE", system: "LAPD-MDT Cloud Database" });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
