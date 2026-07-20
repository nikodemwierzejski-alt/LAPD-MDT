// Zegarek w górnym pasku
setInterval(() => {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    const timeEl = document.getElementById('current-time');
    if (timeEl) timeEl.innerText = timeString;
}, 1000);

// Przełączanie zakładek w nowoczesnym menu bocznym
function zmienZakladke(nazwaZakladki, event) {
    if (event) event.preventDefault();
    
    // Ukryj wszystkie zakładki
    document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Pokaż wybraną
    const wybrana = document.getElementById(`tab-${nazwaZakladki}`);
    if (wybrana) wybrana.style.display = 'block';

    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (nazwaZakladki === 'citizens') {
        szukajObywatela();
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
            
            // Ustawienia danych funkcjonariusza w nagłówku
            document.getElementById('officer-session-name').innerText = data.officer;
            
            // Określenie roli i zapamiętanie w localStorage
            const rolaUzytkownika = (badge === 'admin' || data.rola === 'admin') ? 'admin' : (data.rola || 'user');
            localStorage.setItem('userRola', rolaUzytkownika);

            // Pokazywanie lub ukrywanie przycisku/zakładki Admin w menu bocznym
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
