// Oficjalna baza zdjęć pojazdów z Roblox ERLC (Emergency Response: Liberty County)
const erlcVehicleImages = {
    "Aston Martin Vantage": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/a/a2/Vantage.png",
    "Audi R8": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/3/3b/R8.png",
    "BMW M3 E46": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/8/85/M3_E46.png",
    "BMW M4": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/b/b1/M4.png",
    "Bugatti Chiron": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/9/93/Chiron.png",
    "Chevrolet Camaro ZL1": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/8/8b/Camaro_ZL1.png",
    "Chevrolet Corvette C8": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/e/e1/Corvette_C8.png",
    "Chevrolet Tahoe": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/3/30/Tahoe.png",
    "Dodge Charger SRT": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/2/22/Charger_SRT.png",
    "Dodge Challenger SRT": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/e/e4/Challenger_SRT.png",
    "Ford Mustang GT": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/9/9a/Mustang_GT.png",
    "Ford F-150 Raptor": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/d/d3/F-150_Raptor.png",
    "Lamborghini Urus": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/a/a9/Urus.png",
    "McLaren 720S": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/e/ef/720S.png",
    "Mercedes-Benz G63 AMG": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/4/4b/G63_AMG.png",
    "Nissan GT-R R35": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/4/4d/GT-R.png",
    "Tesla Model S": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/6/66/Model_S.png",
    "Toyota Supra MK5": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/2/23/Supra.png",
    "Police Crown Victoria": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/5/5a/Crown_Victoria.png",
    "Police Ford Explorer": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/e/ea/Explorer_Police.png",
    "Police Dodge Charger": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/6/60/Charger_Police.png",
    "Police Chevrolet Tahoe": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/5/53/Tahoe_Police.png",
    "Police Mustang GT": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/1/1c/Mustang_Police.png",
    "Sheriff Ford F-150": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/8/87/F-150_Sheriff.png",
    "Fire Engine Pumper": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/b/b2/Fire_Engine.png",
    "Ambulance ERLC": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/3/36/Ambulance.png",
    "Chief SUV": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/9/91/Chief_SUV.png",
    "DOT Utility Truck": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/0/05/DOT_Truck.png",
    "Tow Truck": "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/9/9f/Tow_Truck.png"
};

// Automatyczne wykrywanie hosta (zapobiega problemom w sieciach zewnętrznych)
const API_URL = "https://lapd-mdt-5y78.onrender.com";

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
    } else if (nazwaZakladki === 'vehicles') {
        pobierzPojazdy();
        aktualizujPodgladAuta();
    } else if (nazwaZakladki === 'reports') {
        pobierzRaporty();
    } else if (nazwaZakladki === 'admin') {
        pobierzFunkcjonariuszy(); // Automatyczne ładowanie listy kadr po wejściu w panel admina
    }
}

// System Logowania
async function zaloguj() {
    const badge = document.getElementById('badgeInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('login-error');

    if (!badge) {
        errorDiv.innerText = "Wpisz numer odznaki lub imię!";
        return;
    }

    errorDiv.innerText = "Logowanie w toku...";

    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ badge, password })
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
            zapiszSesje(badge, data.officer, data.rola);
            return;
        } else {
            errorDiv.innerText = data.message || "Błędne dane logowania.";
        }
    } catch (e) {
        console.error("Błąd logowania sieciowego:", e);
        errorDiv.innerText = "Błąd połączenia z serwerem bazy danych.";
    }
}

function zapiszSesje(badge, officerName, rola) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-system').style.display = 'flex';
    
    document.getElementById('officer-session-name').innerText = officerName;
    document.getElementById('officer-session-badge').innerText = badge.toUpperCase();
    document.getElementById('card-officer-name').innerText = officerName;
    document.getElementById('card-badge-num').innerText = badge.toUpperCase();
    
    localStorage.setItem('userRola', rola);
    localStorage.setItem('officerName', officerName);
    localStorage.setItem('officerBadge', badge.toUpperCase());

    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin) {
        navAdmin.style.display = (rola === 'admin') ? 'block' : 'none';
    }
    
    sprawdzStatus();
}

function wyloguj() {
    localStorage.removeItem('userRola');
    localStorage.removeItem('officerName');
    localStorage.removeItem('officerBadge');
    location.reload();
}

async function sprawdzStatus() {
    try {
        const res = await fetch(`${API_URL}/api/status`);
        const data = await res.json();
        const statusEl = document.getElementById('system-status');
        statusEl.innerText = `System: ${data.status} | ${data.system}`;
        statusEl.style.color = '#4ade80';
    } catch (err) {
        const statusEl = document.getElementById('system-status');
        statusEl.innerText = 'System: OFFLINE';
        statusEl.style.color = '#f87171';
    }
}

// --- DYNAMICZNY PODGLĄD FOTOGRAFICZNY ERLC ---
function aktualizujPodgladAuta() {
    const selectModel = document.getElementById('vehModel');
    const imgEl = document.getElementById('erlcVehicleImg');
    
    if (!selectModel || !imgEl) return;

    const wybranyModel = selectModel.value;
    const urlZdjecia = erlcVehicleImages[wybranyModel] || "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/9/9a/Mustang_GT.png";
    
    imgEl.src = urlZdjecia;
}

// --- MODUŁ OBYWATELI ---
async function szukajObywatela() {
    const query = document.getElementById('searchInput').value;
    const wynikiDiv = document.getElementById('wynikiWyszukiwania');
    wynikiDiv.innerHTML = 'Szukanie...';

    try {
        const res = await fetch(`${API_URL}/api/obywatele?search=${encodeURIComponent(query)}&t=${Date.now()}`);
        const obywatele = await res.json();
        if (!Array.isArray(obywatele) || obywatele.length === 0) {
            wynikiDiv.innerHTML = '<p style="color:#64748b; font-size:13px;">Brak wyników w bazie SQL.</p>';
            return;
        }
        renderujObywateli(obywatele);
    } catch (err) {
        wynikiDiv.innerHTML = '<p style="color:#f87171; font-size:13px;">Błąd pobierania danych obywateli z serwera.</p>';
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
                    <button class="btn-small" style="background-color: #dc2626; color: white;" onclick="usunObywatela(${o.id})">🗑️ Usuń obywatela</button>
                ` : ''}
            </div>

            <div class="mandates-section">
                ${(o.mandaty && o.mandaty.length > 0) ? o.mandaty.map(m => `<div class="mandate-item">⚠️ ${m.data} - ${m.powod} [${m.kwota}$]</div>`).join('') : '<p style="font-size:12px; color:#64748b;">Brak wystawionych mandatów</p>'}
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
        await fetch(`${API_URL}/api/obywatele/${id}/poszukiwany`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poszukiwany: nowyStatus })
        });
    } catch(e) {}
    szukajObywatela();
}

async function wystawMandat(obywatel_id) {
    const powod = document.getElementById(`powod-${obywatel_id}`).value;
    const kwota = document.getElementById(`kwota-${obywatel_id}`).value;
    const data = new Date().toLocaleDateString('pl-PL');
    if (!powod || !kwota) { alert('Uzupełnij powód i kwotę mandatu!'); return; }
    try {
        await fetch(`${API_URL}/api/mandaty`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ obywatel_id, powod, kwota: parseInt(kwota), data })
        });
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
        const res = await fetch(`${API_URL}/api/obywatele`, {
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
        alert('Błąd połączenia z serwerem.');
    }
}

// --- MODUŁ POJAZDÓW ERLC DMV ---
async function utworzPojazd(event) {
    event.preventDefault();
    
    const model = document.getElementById('vehModel').value;
    const plate = document.getElementById('vehPlate').value.trim().toUpperCase();
    const color = document.getElementById('vehColor').value.trim();
    const owner = document.getElementById('vehOwner').value.trim();
    const status = document.getElementById('vehStatus').value;
    const dataDodania = new Date().toLocaleString('pl-PL');

    const nowyPojazd = { model, plate, color, owner, status, dataDodania };

    try {
        const res = await fetch(`${API_URL}/api/pojazdy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nowyPojazd)
        });
        if (res.ok) {
            document.getElementById('dodajPojazdForm').reset();
            alert('Pojazd ERLC został pomyślnie zarejestrowany w systemie DMV!');
            pobierzPojazdy();
            aktualizujPodgladAuta();
            return;
        }
    } catch (e) {
        alert('Błąd zapisu pojazdu.');
    }
}

async function pobierzPojazdy() {
    const listaDiv = document.getElementById('listaPojazdow');
    const szukajVal = (document.getElementById('searchVehicleInput')?.value || '').toLowerCase();
    
    listaDiv.innerHTML = 'Przeszukiwanie bazy rejestracyjnej DMV...';

    try {
        const res = await fetch(`${API_URL}/api/pojazdy`);
        if (res.ok) {
            const pojazdy = await res.json();
            wyswietlListePojazdow(pojazdy, szukajVal);
            return;
        }
    } catch (e) {
        listaDiv.innerHTML = '<p style="color:#f87171; font-size:13px;">Błąd pobierania pojazdów z serwera.</p>';
    }
}

function wyswietlListePojazdow(pojazdy, filtr) {
    const listaDiv = document.getElementById('listaPojazdow');
    const przefiltrowane = pojazdy.filter(p => 
        p.model.toLowerCase().includes(filtr) || 
        p.plate.toLowerCase().includes(filtr) || 
        p.owner.toLowerCase().includes(filtr)
    );

    if (przefiltrowane.length === 0) {
        listaDiv.innerHTML = '<p style="color:#64748b; font-size:13px;">Brak pojazdów w rejestrze spełniających kryteria.</p>';
        return;
    }

    listaDiv.innerHTML = przefiltrowane.map(p => {
        let statusKolor = '#065f46';
        let statusTekst = '🟢 Czysty / Clean';
        if (p.status === 'wanted') {
            statusKolor = '#dc2626';
            statusTekst = '🔴 POSZUKIWANY / HOT-LIST (Stolen)';
        } else if (p.status === 'impounded') {
            statusKolor = '#b45309';
            statusTekst = '🟠 Skonfiskowany (Impounded)';
        }

        const zdjecieAuto = erlcVehicleImages[p.model] || "https://static.wikia.nocookie.net/emergency-response-liberty-county.fandom.com/images/9/9a/Mustang_GT.png";

        return `
            <div class="citizen-card ${p.status === 'wanted' ? 'wanted-border' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-family: monospace; font-size: 16px; font-weight: bold; background: #111827; padding: 4px 10px; border-radius: 6px; border: 1px solid #374151; color: #38bdf8;">
                        [ ${p.plate} ]
                    </span>
                    <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; background: ${statusKolor}; color: white; font-weight: bold;">
                        ${statusTekst}
                    </span>
                </div>
                <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 8px;">
                    <img src="${zdjecieAuto}" alt="${p.model}" style="width: 70px; height: 45px; object-fit: contain; background: #0f172a; border-radius: 4px; padding: 2px;">
                    <div>
                        <h3 style="margin: 0; font-size: 15px;">🚗 ${p.model}</h3>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: #94a3b8;"><strong>Właściciel:</strong> ${p.owner}</p>
                    </div>
                </div>
                <p><strong>🎨 Kolor:</strong> ${p.color}</p>
                <p><strong>🕒 Rejestracja:</strong> ${p.dataDodania}</p>

                <div style="margin-top: 12px; border-top: 1px solid #1f2937; padding-top: 8px; display: flex; gap: 8px; align-items: center;">
                    <label style="font-size: 11px; color: #9ca3af;">Zmień status:</label>
                    <select onchange="zmienStatusPojazdu(${p.id}, this.value)" style="font-size: 11px; padding: 4px; background: #1f2937; border: 1px solid #374151; color: white; border-radius: 4px;">
                        <option value="clean" ${p.status === 'clean' ? 'selected' : ''}>Czysty (Clean)</option>
                        <option value="wanted" ${p.status === 'wanted' ? 'selected' : ''}>Poszukiwany (Wanted)</option>
                        <option value="impounded" ${p.status === 'impounded' ? 'selected' : ''}>Skonfiskowany (Impounded)</option>
                    </select>
                </div>
            </div>
        `;
    }).join('');
}

async function zmienStatusPojazdu(id, nowyStatus) {
    try {
        await fetch(`${API_URL}/api/pojazdy/${id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nowyStatus })
        });
        pobierzPojazdy();
    } catch (e) {}
}

// --- MODUŁ RAPORTÓW ---
async function utworzRaport(event) {
    event.preventDefault();
    const tytul = document.getElementById('raportTytul').value.trim();
    const kategoria = document.getElementById('raportKategoria').value;
    const status = document.getElementById('raportStatus').value;
    const obywatel = document.getElementById('raportObywatel').value.trim() || 'Brak / Nieznany';
    const pojazdy = document.getElementById('raportPojazdy').value.trim() || 'Brak';
    const wspoloficerowie = document.getElementById('raportWspoloficerowie').value.trim() || 'Brak';
    const dowody = document.getElementById('raportDowody').value.trim() || 'Brak zabezpieczeń';
    const opis = document.getElementById('raportOpis').value.trim();
    
    const autor = localStorage.getItem('officerName') || 'Lukas Weber';
    const odznakaAutora = localStorage.getItem('officerBadge') || 'LP-1150';
    const data = new Date().toLocaleString('pl-PL');

    const nowyRaport = { tytul, kategoria, status, obywatel, pojazdy, wspoloficerowie, dowody, opis, autor, odznakaAutora, data };

    try {
        const res = await fetch(`${API_URL}/api/raporty`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nowyRaport)
        });
        if (res.ok) {
            document.getElementById('dodajRaportForm').reset();
            alert('Raport został pomyślnie zapisany w bazie CAD!');
            pobierzRaporty();
            return;
        }
    } catch (e) {
        alert('Błąd zapisu raportu.');
    }
}

async function pobierzRaporty() {
    const listaDiv = document.getElementById('listaRaportow');
    const szukajVal = (document.getElementById('searchRaportInput')?.value || '').toLowerCase();
    listaDiv.innerHTML = 'Ładowanie archiwum raportów...';

    try {
        const res = await fetch(`${API_URL}/api/raporty`);
        if (res.ok) {
            const raporty = await res.json();
            wyswietlListeRaportow(raporty, szukajVal);
            return;
        }
    } catch (e) {
        listaDiv.innerHTML = '<p style="color:#f87171; font-size:13px;">Błąd pobierania raportów z serwera.</p>';
    }
}

function wyswietlListeRaportow(raporty, filtr) {
    const listaDiv = document.getElementById('listaRaportow');
    const przefiltrowane = raporty.filter(r => 
        r.tytul.toLowerCase().includes(filtr) || 
        r.obywatel.toLowerCase().includes(filtr) || 
        r.pojazdy.toLowerCase().includes(filtr) ||
        r.autor.toLowerCase().includes(filtr)
    );

    if (przefiltrowane.length === 0) {
        listaDiv.innerHTML = '<p style="color:#64748b; font-size:13px;">Brak raportów spełniających kryteria.</p>';
        return;
    }

    listaDiv.innerHTML = przefiltrowane.map(r => `
        <div class="report-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span class="report-tag">${r.kategoria}</span>
                <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${r.status === 'Approved' ? '#065f46' : '#b45309'}; color: white;">${r.status}</span>
            </div>
            <h3>${r.tytul}</h3>
            <p><strong>👥 Podejrzani:</strong> ${r.obywatel}</p>
            <p><strong>🚗 Pojazdy:</strong> ${r.pojazdy}</p>
            <p><strong>📄 Opis:</strong> ${r.opis}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px solid #1f2937; padding-top: 8px;">
                <p style="font-size:11px; color:#38bdf8; margin: 0;">👤 ${r.autor} [${r.odznakaAutora}] | 🕒 ${r.data}</p>
                <button class="btn-small btn-primary" onclick='drukujRaport(${JSON.stringify(r)})'>🖨️ Drukuj</button>
            </div>
        </div>
    `).join('');
}

function drukujRaport(r) {
    const oknoDruku = window.open('', '_blank', 'width=800,height=600');
    oknoDruku.document.write(`
        <html><head><title>RAPORT - ${r.tytul}</title><style>body{font-family:monospace;padding:30px;}</style></head>
        <body><h1>LAPD REPORT</h1><p><b>Tytuł:</b> ${r.tytul}</p><p><b>Opis:</b> ${r.opis}</p><script>window.print();</script></body></html>
    `);
    oknoDruku.document.close();
}

// --- MODUŁ ZARZĄDZANIA KADRAMI (ADMIN) ---
async function dodajFunkcjonariusza(event) {
    event.preventDefault();
    const badge = document.getElementById('activeBadge').value.trim();
    const name = document.getElementById('activeName').value.trim();
    const password = document.getElementById('activePassword').value;
    const messageDiv = document.getElementById('admin-message');
    
    try {
        const res = await fetch(`${API_URL}/api/officers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ badge, name, password })
        });
        const data = await res.json();
        messageDiv.style.color = data.success ? '#4ade80' : '#f87171';
        messageDiv.innerText = data.message;
        if (data.success) {
            document.getElementById('dodajFunkcjonariuszaForm').reset();
            pobierzFunkcjonariuszy(); // Odśwież listę po dodaniu nowego konta
        }
    } catch (e) {
        messageDiv.style.color = '#f87171';
        messageDiv.innerText = "Błąd połączenia z serwerem.";
    }
}

async function pobierzFunkcjonariuszy() {
    // Sprawdzamy czy kontener na listę istnieje w HTML (zależnie od tego, jak nazwałeś div na liście w adminie)
    // Jeśli kontener nazywa się inaczej, dopasuj ID lub dodaj go w sekcji admina.
    const listaDiv = document.getElementById('listaFunkcjonariuszy');
    if (!listaDiv) return;

    listaDiv.innerHTML = 'Ładowanie listy kadr...';

    try {
        const res = await fetch(`${API_URL}/api/officers`);
        if (res.ok) {
            const officers = await res.json();
            if (officers.length === 0) {
                listaDiv.innerHTML = '<p style="color:#64748b; font-size:13px;">Brak zarejestrowanych funkcjonariuszy w bazie.</p>';
                return;
            }
            listaDiv.innerHTML = officers.map(o => `
                <div class="citizen-card" style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-family: monospace; font-size: 14px; font-weight: bold; background: #111827; padding: 3px 8px; border-radius: 4px; color: #38bdf8;">
                            [ ${o.badge} ]
                        </span>
                        <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #065f46; color: white;">Officer</span>
                    </div>
                    <h3 style="margin: 8px 0 4px 0; font-size: 14px;">👤 ${o.name}</h3>
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">Hasło: ${o.password || '******'}</p>
                    <div style="margin-top: 8px; text-align: right;">
                        <button class="btn-small" style="background-color: #dc2626; color: white;" onclick="usunFunkcjonariusza('${o.badge}')">🗑️ Usuń konto</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        listaDiv.innerHTML = '<p style="color:#f87171; font-size:13px;">Błąd pobierania kadr z serwera.</p>';
    }
}

async function usunFunkcjonariusza(badge) {
    if (!confirm(`Czy na pewno chcesz usunąć konto funkcjonariusza z odznaką ${badge}?`)) return;
    try {
        await fetch(`${API_URL}/api/officers/${badge}`, { method: 'DELETE' });
        pobierzFunkcjonariuszy();
    } catch (e) {
        alert('Błąd usuwania konta.');
    }
}

async function usunObywatela(id) {
    if (!confirm("Czy na pewno chcesz usunąć obywatela?")) return;
    try { await fetch(`${API_URL}/api/obywatele/${id}`, { method: 'DELETE' }); } catch (e) {}
    szukajObywatela();
}
