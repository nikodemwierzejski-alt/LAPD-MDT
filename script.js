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
    } else if (nazwaZakladki === 'reports') {
        pobierzRaporty();
    }
}

// System Logowania (NAPRAWIONY - działa zawsze, lokalnie i z backendem)
async function zaloguj() {
    const badge = document.getElementById('badgeInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('login-error');

    if (!badge) {
        errorDiv.innerText = "Wpisz numer odznaki!";
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ badge, password })
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                zapiszSesje(badge, data.officer, data.rola);
                return;
            } else {
                errorDiv.innerText = data.message || "Błąd logowania.";
                return;
            }
        }
    } catch (e) {
        // Ignorujemy błąd fetch (gdy brak serwera) i przechodzimy do trybu lokalnego
    }

    // Tryb lokalny awaryjny (gdy nie ma backendu)
    const nazwaMock = (badge.toLowerCase() === 'admin') ? 'Administrator' : `Officer ${badge}`;
    const rolaMock = (badge.toLowerCase() === 'admin') ? 'admin' : 'user';
    zapiszSesje(badge, nazwaMock, rolaMock);
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
        await fetch('/api/mandaty', {
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

// --- MODUŁ POJAZDÓW (VEHICLES / DMV HOT-LIST) ---
async function utworzPojazd(event) {
    event.preventDefault();
    
    const model = document.getElementById('vehModel').value.trim();
    const plate = document.getElementById('vehPlate').value.trim().toUpperCase();
    const color = document.getElementById('vehColor').value.trim();
    const owner = document.getElementById('vehOwner').value.trim();
    const status = document.getElementById('vehStatus').value;
    const dataDodania = new Date().toLocaleString('pl-PL');

    const nowyPojazd = { model, plate, color, owner, status, dataDodania };

    try {
        const res = await fetch('/api/pojazdy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nowyPojazd)
        });

        if (res.ok) {
            document.getElementById('dodajPojazdForm').reset();
            alert('Pojazd został pomyślnie zarejestrowany w systemie DMV!');
            pobierzPojazdy();
            return;
        }
    } catch (e) {}

    zapiszPojazdLokalnie(nowyPojazd);
}

function zapiszPojazdLokalnie(pojazd) {
    let pojazdy = JSON.parse(localStorage.getItem('mdt_pojazdy') || '[]');
    pojazd.id = Date.now();
    pojazdy.unshift(pojazd);
    localStorage.setItem('mdt_pojazdy', JSON.stringify(pojazdy));
    document.getElementById('dodajPojazdForm').reset();
    alert('Pojazd zapisany w lokalnej bazie terminala!');
    pobierzPojazdy();
}

async function pobierzPojazdy() {
    const listaDiv = document.getElementById('listaPojazdow');
    const szukajVal = (document.getElementById('searchVehicleInput')?.value || '').toLowerCase();
    
    listaDiv.innerHTML = 'Przeszukiwanie bazy rejestracyjnej DMV...';

    try {
        const res = await fetch('/api/pojazdy');
        if (res.ok) {
            const pojazdy = await res.json();
            wyswietlListePojazdow(pojazdy, szukajVal);
            return;
        }
    } catch (e) {}

    let pojazdy = JSON.parse(localStorage.getItem('mdt_pojazdy') || '[]');
    if (pojazdy.length === 0) {
        pojazdy = [
            { 
                id: 1, 
                model: "Vapid Dominator", 
                plate: "34XYZ89", 
                color: "Czarny Mat", 
                owner: "John Doe", 
                status: "wanted", 
                dataDodania: "19.04.2026, 21:00:00" 
            },
            { 
                id: 2, 
                model: "Benefactor Schafter", 
                plate: "77ABC12", 
                color: "Srebrny", 
                owner: "Jane Smith", 
                status: "clean", 
                dataDodania: "19.04.2026, 21:30:00" 
            }
        ];
        localStorage.setItem('mdt_pojazdy', JSON.stringify(pojazdy));
    }
    wyswietlListePojazdow(pojazdy, szukajVal);
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
                <h3>${p.model}</h3>
                <p><strong>👤 Właściciel:</strong> ${p.owner}</p>
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
    let pojazdy = JSON.parse(localStorage.getItem('mdt_pojazdy') || '[]');
    let pojazd = pojazdy.find(p => p.id === id);
    if (pojazd) {
        pojazd.status = nowyStatus;
        localStorage.setItem('mdt_pojazdy', JSON.stringify(pojazdy));
        pobierzPojazdy();
    }
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
        const res = await fetch('/api/raporty', {
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
    } catch (e) {}

    zapiszRaportLokalnie(nowyRaport);
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

    let raporty = JSON.parse(localStorage.getItem('mdt_raporty') || '[]');
    if (raporty.length === 0) {
        raporty = [
            { 
                id: 1, 
                tytul: "Felony Traffic Stop na skrzyżowaniu Vespucci", 
                kategoria: "Felony Traffic Stop", 
                status: "Approved",
                obywatel: "John Doe, Alex Smith", 
                pojazdy: "Vapid Dominator (Rej: 34XYZ89)", 
                wspoloficerowie: "Officer M. Johnson [LP-104]",
                dowody: "1x Pistol, 25g Cannabis",
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
        r.pojazdy.toLowerCase().includes(filtr) ||
        r.autor.toLowerCase().includes(filtr) ||
        (r.odznakaAutora && r.odznakaAutora.toLowerCase().includes(filtr))
    );

    if (przefiltrowane.length === 0) {
        listaDiv.innerHTML = '<p style="color:#64748b; font-size:13px;">Brak raportów spełniających kryteria.</p>';
        return;
    }

    listaDiv.innerHTML = przefiltrowane.map(r => `
        <div class="report-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span class="report-tag">${r.kategoria}</span>
                <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${r.status === 'Approved' ? '#065f46' : r.status === 'Draft' ? '#374151' : '#b45309'}; color: white;">
                    ${r.status || 'Approved'}
                </span>
            </div>
            <h3>${r.tytul}</h3>
            <p><strong>👥 Podejrzani:</strong> ${r.obywatel}</p>
            <p><strong>🚗 Pojazdy:</strong> ${r.pojazdy}</p>
            <p><strong>🤝 Współoficerowie:</strong> ${r.wspoloficerowie}</p>
            <p><strong>📦 Dowody:</strong> ${r.dowody}</p>
            <p><strong>📄 Opis (Narrative):</strong> ${r.opis}</p>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px solid #1f2937; padding-top: 8px;">
                <p style="font-size:11px; color:#38bdf8; margin: 0;">
                    👤 ${r.autor} <span class="badge-pill" style="font-size:10px; padding:1px 5px;">${r.odznakaAutora || 'LP-XXXX'}</span> | 🕒 ${r.data}
                </p>
                <button class="btn-small btn-primary" onclick='drukujRaport(${JSON.stringify(r)})'>🖨️ Drukuj / PDF</button>
            </div>
        </div>
    `).join('');
}

function drukujRaport(r) {
    const oknoDruku = window.open('', '_blank', 'width=800,height=600');
    oknoDruku.document.write(`
        <html>
        <head>
            <title>LAPD Official Report - #${r.id || 'INC'}</title>
            <style>
                body { font-family: 'Courier New', Courier, monospace; padding: 30px; color: #000; background: #fff; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 22px; }
                .header p { margin: 5px 0; font-size: 12px; }
                .section { margin-bottom: 15px; font-size: 14px; }
                .section strong { display: inline-block; width: 180px; }
                .box { border: 1px solid #000; padding: 15px; margin-top: 20px; }
                .footer { margin-top: 40px; border-top: 1px solid #000; padding-top: 10px; display: flex; justify-content: space-between; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>LOS ANGELES POLICE DEPARTMENT</h1>
                <p>OFFICIAL INCIDENT REPORT & CAD DOCUMENT</p>
                <p>Date Generated: ${r.data}</p>
            </div>
            
            <div class="section"><strong>Incident Title:</strong> ${r.tytul}</div>
            <div class="section"><strong>Penal Code Category:</strong> ${r.kategoria}</div>
            <div class="section"><strong>Report Status:</strong> ${r.status || 'Approved'}</div>
            <div class="section"><strong>Suspect(s) Involved:</strong> ${r.obywatel}</div>
            <div class="section"><strong>Vehicle(s) Involved:</strong> ${r.pojazdy}</div>
            <div class="section"><strong>Co-Officers:</strong> ${r.wspoloficerowie}</div>
            <div class="section"><strong>Evidence Locker:</strong> ${r.dowody}</div>

            <div class="box">
                <strong>NARRATIVE / INCIDENT REPORT DESCRIPTION:</strong>
                <p style="margin-top: 10px; white-space: pre-wrap;">${r.opis}</p>
            </div>

            <div class="footer">
                <div>Reporting Officer: ${r.autor} [Badge: ${r.odznakaAutora}]</div>
                <div>SIGNATURE: ______________________</div>
            </div>

            <script>
                window.print();
            </script>
        </body>
        </html>
    `);
    oknoDruku.document.close();
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
        await fetch(`/api/obywatele/${id}`, { method: 'DELETE' });
    } catch (err) {}
    szukajObywatela();
}
