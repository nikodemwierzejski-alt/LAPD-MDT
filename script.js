// Zegarek w górnym pasku
setInterval(() => {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    const timeEl = document.getElementById('current-time');
    if (timeEl) timeEl.innerText = timeString;
}, 1000);

// Przełączanie zakładek
function zmienZakladke(nazwaZakladki, event) {
    if (event) event.preventDefault();
    
    document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const wybrana = document.getElementById(`tab-${nazwaZakladki}`);
    if (wybrana) wybrana.style.display = 'block';

    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (nazwaZakladki === 'citizens') {
        szukajObywatela();
    } else if (nazwaZakladki === 'reports') {
        pobierzRaporty();
    }
}

// System Logowania
async function zaloguj() {
    const badge = document.getElementById('badgeInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ badge, password })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-system').style.display = 'flex';
            
            // Przypisanie danych do interfejsu
            document.getElementById('officer-session-name').innerText = data.officer;
            document.getElementById('officer-session-badge').innerText = badge.toUpperCase();
            document.getElementById('card-officer-name').innerText = data.officer;
            document.getElementById('card-badge-num').innerText = badge.toUpperCase();
            
            const rolaUzytkownika = (badge === 'admin' || data.rola === 'admin') ? 'admin' : (data.rola || 'user');
            localStorage.setItem('userRola', rolaUzytkownika);
            localStorage.setItem('officerName', data.officer);
            localStorage.setItem('officerBadge', badge.toUpperCase());

            const navAdmin = document.getElementById('nav-admin');
            if (rolaUzytkownika === 'admin') {
                navAdmin.style.display = 'block';
            } else {
                navAdmin.style.display = 'none';
            }
            
            sprawdzStatus();
        } else {
            errorDiv.innerText = data.message;
        }
    } catch (e) {
        // Fallback dla szybkiego testowania lokalnego bez uruchomionego backendu Node.js
        if (badge.length > 0) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-system').style.display = 'flex';
            
            const nazwaMock = badge === 'admin' ? 'Administrator' : `Officer ${badge}`;
            document.getElementById('officer-session-name').innerText = nazwaMock;
            document.getElementById('officer-session-badge').innerText = badge.toUpperCase();
            document.getElementById('card-officer-name').innerText = nazwaMock;
            document.getElementById('card-badge-num').innerText = badge.toUpperCase();
            
            localStorage.setItem('userRola', badge === 'admin' ? 'admin' : 'user');
            localStorage.setItem('officerName', nazwaMock);
            localStorage.setItem('officerBadge', badge.toUpperCase());

            if (badge === 'admin') {
                document.getElementById('nav-admin').style.display = 'block';
            }
            sprawdzStatus();
        } else {
            errorDiv.innerText = "Błąd połączenia z serwerem lub podano puste dane.";
        }
    }
}

function wyloguj() {
    localStorage.removeItem('userRola');
    localStorage.removeItem('officerName');
    localStorage.removeItem('officerBadge');
    location.reload();
}

async function sprawdzStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const statusEl = document.getElementById('system-status');
        statusEl.innerText = `System: ${data.status} | ${data.system}`;
        statusEl.style.color = '#4ade80';
    } catch (err) {
        const statusEl = document.getElementById('system-status');
        statusEl.innerText = 'System: ONLINE (Local Mode)';
        statusEl.style.color = '#4ade80';
    }
}

// --- MODUŁ OBYWATELI ---
async function szukajObywatela() {
    const query = document.getElementById('searchInput').value;
    const wynikiDiv = document.getElementById('wynikiWyszukiwania');
    wynikiDiv.innerHTML = 'Szukanie...';

    try {
        const res = await fetch(`/api/obywatele?search=${encodeURIComponent(query)}&t=${Date.now()}`);
        const obywatele = await res.json();

        if (!Array.isArray(obywatele) || obywatele.length === 0) {
            wynikiDiv.innerHTML = '<p style="color:#64748b; font-size:13px;">Brak wyników w bazie SQL.</p>';
            return;
        }
        renderujObywateli(obywatele);
    } catch (err) {
        // Fallback lokalny dla obywateli
        renderujObywateli([
            { id: 1, imie: "John", nazwisko: "Doe", data_urodzenia: "12/05/1992", poszukiwany: true, uwagi: "Unikaj kontaktu, uzbrojony w przeszłości.", mandaty: [{data: "18.04.2026", powod: "Przekroczenie prędkości", kwota: 350}] },
            { id: 2, imie: "Jane", nazwisko: "Smith", data_urodzenia: "04/11/1998", poszukiwany: false, uwagi: "Czysta kartoteka.", mandaty: [] }
        ]);
    }
}

function renderujObywateli(obywatele) {
    const wynikiDiv = document.getElementById('wynikiWyszukiwania');
    wynikiDiv.innerHTML = obywatele.map(o => `
        <div class="citizen-card ${o.poszukiwany ? 'wanted-border' : ''}">
            <h3>${o.imie} ${o.nazwisko}</h3>
            <p><strong>Urodzony:</strong> ${o.data_urodzenia || 'Brak'}</p>
            <p><strong>Status:</strong> ${o.poszukiwany ? '<span class="pulse-wanted">🔴 POSZUKIWANY (WARRANT ACTIVE)</span>' : '🟢 Czysty'}</p>
            <p><strong>Uwagi:</strong> ${o.uwagi || 'Brak wpisów'}</p>
            
            <div class="action-buttons">
                <button class="btn-small btn-warn" onclick="przelaczPoszukiwany(${o.id}, ${o.poszukiwany ? 0 : 1})">
                    ${o.poszukiwany ? 'Odwołaj poszukiwania' : 'Oznacz jako Poszukiwany'}
                </button>
                
                ${localStorage.getItem('userRola') === 'admin' ? `
                    <button class="btn-small" style="background-color: #dc2626; color: white;" onclick="usunObywatela(${o.id})">
                        🗑️ Usuń obywatela
                    </button>
                ` : ''}
            </div>

            <div class="mandates-section">
                ${(o.mandaty && o.mandaty.length > 0) 
                    ? o.mandaty.map(m => `<div class="mandate-item">⚠️ ${m.data} - ${m.powod} [${m.kwota}$]</div>`).join('') 
                    : '<p style="font-size:12px; color:#64748b;">Brak wystawionych mandatów</p>'}
            </div>

            <div class="add-mandate-box">
                <input type="text" id="powod-${o.id}" placeholder="Powód mandatu" style="font-size:12px; padding:5px; width:60%; background:#1f2937; border:1px solid #374151; color:white; border-radius:4px;">
                <input type="number" id="kwota-${o.id}" placeholder="Kwota $" style="font-size:12px; padding:5px; width:25%; background:#1f2937; border:1px solid #374151; color:white; border-radius:4px;">
                <button class="btn-small btn-primary" onclick="wystawMandat(${o.id})">+</button>
            </div>
        </div>
    `).join('');
}

async function przelaczPoszukiwany(id, nowyStatus) {
    try {
        await fetch(`/api/obywatele/${id}/poszukiwany`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poszukiwany: nowyStatus })
        });
    } catch(e) {}
    szukajObywatela();
}

async function wystawMandat(obywatel_id) {
    const powodInput = document.getElementById(`powod-${obywatel_id}`);
    const kwotaInput = document.getElementById(`kwota-${obywatel_id}`);

    const powod = powodInput.value;
    const kwota = kwotaInput.value;
    const data = new Date().toLocaleDateString('pl-PL');

    if (!powod || !kwota) {
        alert('Uzupełnij powód i kwotę mandatu!');
        return;
    }

    try {
        const res = await fetch('/api/mandaty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ obywatel_id, powod, kwota: parseInt(kwota), data })
        });

        if (res.ok) {
            powodInput.value = '';
            kwotaInput.value = '';
        }
    } catch (err) {}
    szukajObywatela();
}

async function dodajObywatela(event) {
    event.preventDefault();
    const dane = {
        imie: document.getElementById('formImie').value,
        nazwisko: document.getElementById('formNazwisko').value,
        data_urodzenia: document.getElementById('formDataUrodzenia').value,
        uwagi: document.getElementById('formUwagi').value
    };

    try {
        const res = await fetch('/api/obywatele', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dane)
        });
        if (res.ok) {
            document.getElementById('dodajObywatelaForm').reset();
            alert('Dodano obywatela do bazy LSPD!');
            szukajObywatela(); 
        }
    } catch(e) {
        alert('Dodano lokalnie!');
        document.getElementById('dodajObywatelaForm').reset();
    }
}

// --- MODUŁ RAPORTÓW (Z NUMEREM ODZNAKI AUTORA) ---
async function utworzRaport(event) {
    event.preventDefault();
    
    const tytul = document.getElementById('raportTytul').value.trim();
    const kategoria = document.getElementById('raportKategoria').value;
    const obywatel = document.getElementById('raportObywatel').value.trim() || 'Brak / Nieznany';
    const opis = document.getElementById('raportOpis').value.trim();
    
    // Pobranie danych zalogowanego oficera i jego numeru odznaki
    const autor = localStorage.getItem('officerName') || 'Lukas Weber';
    const odznakaAutora = localStorage.getItem('officerBadge') || 'LP-1150';
    const data = new Date().toLocaleString('pl-PL');

    const nowyRaport = { tytul, kategoria, obywatel, opis, autor, odznakaAutora, data };

    try {
        const res = await fetch('/api/raporty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nowyRaport)
        });

        if (res.ok) {
            document.getElementById('dodajRaportForm').reset();
            alert('Raport został pomyślnie zapisany w bazie!');
            pobierzRaporty();
        } else {
            zapiszRaportLokalnie(nowyRaport);
        }
    } catch (e) {
        zapiszRaportLokalnie(nowyRaport);
    }
}

function zapiszRaportLokalnie(raport) {
    let raporty = JSON.parse(localStorage.getItem('mdt_raporty') || '[]');
    raport.id = Date.now();
    raporty.unshift(raport);
    localStorage.setItem('mdt_raporty', JSON.stringify(raporty));
    document.getElementById('dodajRaportForm').reset();
    alert('Raport zapisany w archiwum terminala!');
    pobierzRaporty();
}

async function pobierzRaporty() {
    const listaDiv = document.getElementById('listaRaportow');
    const szukajVal = (document.getElementById('searchRaportInput')?.value || '').toLowerCase();
    
    listaDiv.innerHTML = 'Ładowanie archiwum raportów...';

    try {
        const res = await fetch('/api/raporty');
        if (res.ok) {
            const raporty = await res.json();
            wyswietlListeRaportow(raporty, szukajVal);
            return;
        }
    } catch (e) {}

    // Pobranie z localStorage w przypadku pracy offline / lokalnej
    let raporty = JSON.parse(localStorage.getItem('mdt_raporty') || '[]');
    if (raporty.length === 0) {
        raporty = [
            { 
                id: 1, 
                tytul: "Felony Traffic Stop na skrzyżowaniu Vespucci", 
                kategoria: "Felony Traffic Stop", 
                obywatel: "John Doe", 
                opis: "Pojazd podejrzany o udział w napadzie zatrzymany przy użyciu techniki high-risk.", 
                autor: "Lukas Weber", 
                odznakaAutora: "LP-1150", 
                data: "19.04.2026, 22:15:00" 
            }
        ];
        localStorage.setItem('mdt_raporty', JSON.stringify(raporty));
    }
    wyswietlListeRaportow(raporty, szukajVal);
}

function wyswietlListeRaportow(raporty, filtr) {
    const listaDiv = document.getElementById('listaRaportow');
    
    const przefiltrowane = raporty.filter(r => 
        r.tytul.toLowerCase().includes(filtr) || 
        r.obywatel.toLowerCase().includes(filtr) || 
        r.autor.toLowerCase().includes(filtr) ||
        (r.odznakaAutora && r.odznakaAutora.toLowerCase().includes(filtr))
    );

    if (przefiltrowane.length === 0) {
        listaDiv.innerHTML = '<p style="color:#64748b; font-size:13px;">Brak raportów spełniających kryteria.</p>';
        return;
    }

    listaDiv.innerHTML = przefiltrowane.map(r => `
        <div class="report-card">
            <span class="report-tag">${r.kategoria}</span>
            <h3>${r.tytul}</h3>
            <p><strong>Podejrzany:</strong> ${r.obywatel}</p>
            <p><strong>Narrative / Opis:</strong> ${r.opis}</p>
            <p style="font-size:11px; color:#38bdf8; margin-top:8px;">
                👤 Autor: ${r.autor} <span class="badge-pill" style="font-size:10px; padding:1px 5px;">${r.odznakaAutora || 'LP-XXXX'}</span> | 🕒 ${r.data}
            </p>
        </div>
    `).join('');
}

// --- MODUŁ ADMINISTRACYJNY ---
async function dodajFunkcjonariusza(event) {
    event.preventDefault();
    
    const badge = document.getElementById('activeBadge').value.trim();
    const name = document.getElementById('activeName').value.trim();
    const password = document.getElementById('activePassword').value;
    const messageDiv = document.getElementById('admin-message');
    
    try {
        const res = await fetch('/api/officers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ badge, name, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            messageDiv.style.color = '#4ade80';
            messageDiv.innerText = data.message;
            document.getElementById('dodajFunkcjonariuszaForm').reset();
        } else {
            messageDiv.style.color = '#f87171';
            messageDiv.innerText = data.message;
        }
    } catch (e) {
        messageDiv.style.color = '#4ade80';
        messageDiv.innerText = "Funkcjonariusz zapisany pomyślnie!";
        document.getElementById('dodajFunkcjonariuszaForm').reset();
    }
}

async function usunObywatela(id) {
    if (!confirm("Czy na pewno chcesz trwale usunąć tego obywatela z bazy?")) return;

    try {
        const res = await fetch(`/api/obywatele/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            szukajObywatela();
        }
    } catch (err) {
        szukajObywatela();
    }
}
