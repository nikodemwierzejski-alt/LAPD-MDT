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
            
            document.getElementById('officer-session-name').innerText = data.officer;
            
            const rolaUzytkownika = (badge === 'admin' || data.rola === 'admin') ? 'admin' : (data.rola || 'user');
            localStorage.setItem('userRola', ropaUzytkownika = rolaUzytkownika);
            localStorage.setItem('officerName', data.officer);

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
        errorDiv.innerText = "Błąd połączenia z serwerem.";
    }
}

function wyloguj() {
    localStorage.removeItem('userRola');
    localStorage.removeItem('officerName');
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
        statusEl.innerText = 'System: OFFLINE';
        statusEl.style.color = '#f87171';
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
            wynikiDiv.innerHTML = '<p style="color:#64748b; font-size:13px;">Brak wyników.</p>';
            return;
        }

        wynikiDiv.innerHTML = obywatele.map(o => `
            <div class="citizen-card ${o.poszukiwany ? 'wanted-border' : ''}">
                <h3>${o.imie} ${o.nazwisko}</h3>
                <p><strong>Urodzony:</strong> ${o.data_urodzenia || 'Brak'}</p>
                <p><strong>Status:</strong> ${o.poszukiwany ? '<span class="pulse-wanted">🔴 POSZUKIWANY</span>' : '🟢 Czysty'}</p>
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
                        : '<p style="font-size:12px; color:#64748b;">Czyste konto</p>'}
                </div>

                <div class="add-mandate-box">
                    <input type="text" id="powod-${o.id}" placeholder="Powód mandatu" style="font-size:12px; padding:5px; width:60%; background:#1f2937; border:1px solid #374151; color:white; border-radius:4px;">
                    <input type="number" id="kwota-${o.id}" placeholder="Kwota $" style="font-size:12px; padding:5px; width:25%; background:#1f2937; border:1px solid #374151; color:white; border-radius:4px;">
                    <button class="btn-small btn-primary" onclick="wystawMandat(${o.id})">+</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        wynikiDiv.innerHTML = '<p style="color:#f87171;">Błąd bazy danych.</p>';
    }
}

async function przelaczPoszukiwany(id, nowyStatus) {
    await fetch(`/api/obywatele/${id}/poszukiwany`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poszukiwany: nowyStatus })
    });
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
            szukajObywatela();
        } else {
            alert('Błąd podczas zapisywania mandatu.');
        }
    } catch (err) {
        console.error('Błąd:', err);
    }
}

async function dodajObywatela(event) {
    event.preventDefault();
    const dane = {
        imie: document.getElementById('formImie').value,
        nazwisko: document.getElementById('formNazwisko').value,
        data_urodzenia: document.getElementById('formDataUrodzenia').value,
        uwagi: document.getElementById('formUwagi').value
    };

    const res = await fetch('/api/obywatele', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dane)
    });

    if (res.ok) {
        document.getElementById('dodajObywatelaForm').reset();
        alert('Dodano do systemu LSPD!');
        szukajObywatela(); 
    }
}

// --- MODUŁ RAPORTÓW (NOWOŚĆ) ---
async function utworzRaport(event) {
    event.preventDefault();
    
    const tytul = document.getElementById('raportTytul').value.trim();
    const kategoria = document.getElementById('raportKategoria').value;
    const obywatel = document.getElementById('raportObywatel').value.trim() || 'Brak';
    const opis = document.getElementById('raportOpis').value.trim();
    const autor = localStorage.getItem('officerName') || 'Oficer LSPD';
    const data = new Date().toLocaleString('pl-PL');

    const nowyRaport = { tytul, kategoria, obywatel, opis, autor, data };

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
            // Fallback lokalny jeśli backend nie ma jeszcze endpointu raportów
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
    alert('Raport zapisany lokalnie w terminalu!');
    pobierzRaporty();
}

async function pobierzRaporty() {
    const listaDiv = document.getElementById('listaRaportow');
    const szukajVal = (document.getElementById('searchRaportInput')?.value || '').toLowerCase();
    
    listaDiv.innerHTML = 'Ładowanie raportów...';

    try {
        const res = await fetch('/api/raporty');
        if (res.ok) {
            const raporty = await res.json();
            wyswietlListeRaportow(raporty, szukajVal);
            return;
        }
    } catch (e) {}

    // Pobranie z localStorage w przypadku braku dedykowanej tabeli SQL
    let raporty = JSON.parse(localStorage.getItem('mdt_raporty') || '[]');
    if (raporty.length === 0) {
        raporty = [
            { id: 1, tytul: "Zatrzymanie pojazdu za przekroczenie prędkości", kategoria: "Mandat", obywatel: "Jan Kowalski", opis: "Kierowca poruszał się 90mph w strefie 45mph.", autor: "Lukas Weber", data: "19.04.2026, 22:15:00" }
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
        r.autor.toLowerCase().includes(filtr)
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
            <p><strong>Opis:</strong> ${r.opis}</p>
            <p style="font-size:11px; color:#64748b; margin-top:8px;">Autor: ${r.autor} | ${r.data}</p>
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
        messageDiv.style.color = '#f87171';
        messageDiv.innerText = "Błąd połączenia z serwerem.";
    }
}

async function usunObywatela(id) {
    if (!confirm("Czy na pewno chcesz trwale usunąć tego obywatela z bazy?")) return;

    try {
        const res = await fetch(`/api/obywatele/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (data.success) {
            szukajObywatela();
        } else {
            alert('Błąd podczas usuwania obywatela.');
        }
    } catch (err) {
        console.error('Błąd:', err);
        alert('Błąd połączenia z serwerem.');
    }
}
