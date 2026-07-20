// System Logowania
async function zaloguj() {
    const badge = document.getElementById('badgeInput').value;
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
            document.getElementById('main-system').style.display = 'block';
            document.getElementById('officer-name').innerText = `Zalogowano: ${data.officer}`;
            
            // Pokazywanie złotego panelu tylko dla konta z rolą admin
            const adminPanel = document.getElementById('admin-panel');
            if (data.rola === 'admin') {
                adminPanel.style.display = 'block';
            } else {
                adminPanel.style.display = 'none';
            }
            
            sprawdzStatus();
        } else {
            errorDiv.innerText = data.message;
        }
    } catch (e) {
        errorDiv.innerText = "Błąd połączenia z serwerem.";
    }
}

async function sprawdzStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        document.getElementById('system-status').innerText = `System: ${data.status} | ${data.system}`;
        document.getElementById('system-status').style.color = '#00ff00';
    } catch (err) {
        document.getElementById('system-status').innerText = 'System: OFFLINE';
        document.getElementById('system-status').style.color = '#ff0000';
    }
}

async function szukajObywatela() {
    const query = document.getElementById('searchInput').value;
    const wynikiDiv = document.getElementById('wynikiWyszukiwania');
    wynikiDiv.innerHTML = 'Szukanie...';

    try {
        const res = await fetch(`/api/obywatele?search=${query}`);
        const obywatele = await res.json();

        if (obywatele.length === 0) {
            wynikiDiv.innerHTML = '<p>Brak wyników.</p>';
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
                </div>

                <div class="mandates-section">
                    <h4>Mandaty:</h4>
                    ${o.mandaty.length === 0 ? '<p style="font-size:12px; color:#64748b;">Czyste konto</p>' : 
                      o.mandaty.map(m => `<div class="mandate-item">⚠️ ${m.data} - ${m.powod} [${m.kwota}$]</div>`).join('')}
                    
                    <div class="add-mandate-box">
                        <input type="text" id="powod-${o.id}" placeholder="Powód mandatu" style="font-size:12px; padding:5px; width:60%;">
                        <input type="number" id="kwota-${o.id}" placeholder="Kwota $" style="font-size:12px; padding:5px; width:25%;">
                        <button class="btn-small" onclick="wystawMandat(${o.id})">+</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        wynikiDiv.innerHTML = '<p style="color:red;">Błąd bazy danych.</p>';
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
    const powod = document.getElementById(`powod-${obywatel_id}`).value;
    const kwota = document.getElementById(`kwota-${obywatel_id}`).value;
    const data = new Date().toLocaleDateString('pl-PL');

    if(!powod || !kwota) return alert('Uzupełnij powód i kwotę mandatu!');

    await fetch('/api/mandaty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obywatel_id, powod, kwota: parseInt(kwota), data })
    });
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

    const res = await fetch('/api/obywatele', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dane)
    });

    if (res.ok) {
        document.getElementById('dodajObywatelaForm').reset();
        alert('Dodano do systemu LSPD!');
        // DODAJ TĘ LINIKĘ PONIŻEJ:
        szukajObywatela(); 
    }
}
// Funkcja obsługująca dodawanie funkcjonariusza w panelu administratora
async function dodajFunkcjonariusza(event) {
    event.preventDefault(); // Zapobiega odświeżeniu strony
    
    // Pobieramy wartości z formularza
    const badge = document.getElementById('activeBadge').value.trim();
    const name = document.getElementById('activeName').value.trim();
    const password = document.getElementById('activePassword').value;
    const messageDiv = document.getElementById('admin-message');
    
    try {
        // Uwaga: Endpoint musi być taki sam jak w server.js
        // Jeśli w server.js użyłeś /api/funkcionariusze, to tutaj też musi być tak samo!
    const res = await fetch('/api/officers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ badge, name, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            messageDiv.style.color = '#00ff00'; // Kolor zielony dla sukcesu
            messageDiv.innerText = data.message;
            document.getElementById('dodajFunkcjonariuszaForm').reset(); // Czyścimy formularz
        } else {
            messageDiv.style.color = '#ff0000'; // Kolor czerwony dla błędu
            messageDiv.innerText = data.message;
        }
    } catch (e) {
        messageDiv.style.color = '#ff0000';
        messageDiv.innerText = "Błąd połączenia z serwerem.";
    }
}
