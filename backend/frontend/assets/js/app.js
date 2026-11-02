const API_URL = '/api/v1';

let cachedOffers = [];
let currentOfferFilter = 'ALL';
let currentUserProfile = null;
let userDocumentsCache = [];

// TOAST
let toastTimer;
function notify(msg, type = 'success') {
    const el = document.getElementById('toast-el');
    el.innerHTML = type === 'error' ? 
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>' :
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    el.className = `toast show${type === 'error' ? ' error' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// --- UPC EMAIL VALIDATOR ---
function isUpcEmail(email) {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return clean.endsWith('@upc.edu') || clean.endsWith('.upc.edu');
}

// --- TAB NAVIGATION ---
function switchMainTab(tabName) {
    document.querySelectorAll('.screen-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tabs .tab-btn').forEach(b => b.classList.remove('active'));

    const targetView = document.getElementById(`view-${tabName}`);
    const targetBtn = document.getElementById(`tab-nav-${tabName}`);
    
    if (targetView) targetView.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');

    if (tabName === 'feed') {
        loadPosts();
        loadFeedEvents();
    }
    if (tabName === 'community') loadCommunityMembers();
    if (tabName === 'offers') loadOffers();
    if (tabName === 'profile') {
        loadUserProfile();
        if (sessionStorage.getItem('user_role') !== 'Administrator') {
            loadUserDocuments();
        }
        loadRoleChangePanels();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadCommunityMembers() {
    const container = document.getElementById('communityMembers');
    const search = document.getElementById('communitySearch').value.trim();
    container.innerHTML = '<p class="text-sm text-text-muted py-8 text-center">Cargando comunidad...</p>';

    try {
        const token = sessionStorage.getItem('access_token');
        const query = new URLSearchParams({ limit: '50' });
        if (search) query.set('search', search);
        const response = await fetch(`${API_URL}/community/members?${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(await extractError(response, 'No se pudo cargar la comunidad.'));
        const members = await response.json();

        if (!members.length) {
            container.innerHTML = '<p class="text-sm text-text-muted py-8 text-center">No se encontraron miembros.</p>';
            return;
        }

        container.innerHTML = members.map(member => {
            const avatar = member.avatar_url
                ? `<img src="${escapeHtml(member.avatar_url)}" alt="" class="w-full h-full object-cover">`
                : escapeHtml((member.full_name || 'U').charAt(0).toUpperCase());
            const roleClass = member.role_name === 'Student' ? 'badge-student' : 'badge-alumni';
            const roleLabel = member.role_name === 'Student' ? 'Estudiante' : 'Alumni';
            const work = [member.current_position, member.company].filter(Boolean).map(escapeHtml).join(' · ');
            return `
                <article class="card community-member-card">
                    <div class="avatar-circle avatar-lg community-avatar">${avatar}</div>
                    <div class="community-member-info">
                        <div class="community-member-heading">
                            <h2 class="font-semibold text-white" data-no-translate>${escapeHtml(member.full_name)}</h2>
                            <span class="badge-pill ${roleClass}">${roleLabel}</span>
                        </div>
                        <p class="text-xs text-text-secondary mt-1" data-no-translate>${work || 'Perfil profesional pendiente de completar'}</p>
                    </div>
                    <div class="community-member-actions">
                        <button type="button" class="btn-secondary text-xs" onclick="openCommunityProfile('${member.id}')">Ver perfil</button>
                        <button type="button" class="${member.is_following ? 'btn-secondary' : 'btn-primary'} text-xs" onclick="toggleFollowMember('${member.id}', ${member.is_following})">${member.is_following ? 'Siguiendo' : 'Seguir'}</button>
                    </div>
                </article>`;
        }).join('');
    } catch (error) {
        container.innerHTML = `<p class="form-alert" role="alert">${escapeHtml(error.message)}</p>`;
    }
}

async function openCommunityProfile(memberId) {
    const panel = document.getElementById('communityProfilePanel');
    panel.dataset.memberId = memberId;
    panel.classList.remove('hidden');
    panel.innerHTML = '<p class="text-sm text-text-muted">Cargando perfil...</p>';

    try {
        const token = sessionStorage.getItem('access_token');
        const response = await fetch(`${API_URL}/community/members/${encodeURIComponent(memberId)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(await extractError(response, 'No se pudo cargar el perfil.'));
        const member = await response.json();
        const avatar = member.avatar_url
            ? `<img src="${escapeHtml(member.avatar_url)}" alt="" class="w-full h-full object-cover">`
            : escapeHtml((member.full_name || 'U').charAt(0).toUpperCase());
        const roleClass = member.role_name === 'Student' ? 'badge-student' : 'badge-alumni';
        const roleLabel = member.role_name === 'Student' ? 'Estudiante' : 'Alumni';
        const work = [member.current_position, member.company].filter(Boolean).map(escapeHtml);
        panel.innerHTML = `
            <div class="community-profile-header">
                <div class="avatar-circle avatar-lg">${avatar}</div>
                <div>
                    <h2 class="text-lg font-bold text-white" data-no-translate>${escapeHtml(member.full_name)}</h2>
                    <span class="badge-pill ${roleClass} mt-2">${roleLabel}</span>
                </div>
            </div>
            <div class="community-profile-details">
                ${work[0] ? `<p><strong>Puesto:</strong> <span data-no-translate>${work[0]}</span></p>` : ''}
                ${work[1] ? `<p><strong>Empresa:</strong> <span data-no-translate>${work[1]}</span></p>` : ''}
                ${member.bio ? `<p class="community-member-bio" data-no-translate>${escapeHtml(member.bio)}</p>` : '<p class="text-sm text-text-muted">Este miembro aún no ha añadido una presentación.</p>'}
                <p class="text-xs text-text-secondary">${member.followers_count} seguidores · ${member.following_count} siguiendo</p>
                <a class="btn-secondary text-xs community-contact" href="mailto:${escapeHtml(member.email)}">Contactar por email</a>
                <button type="button" class="${member.is_following ? 'btn-secondary' : 'btn-primary'} text-xs" onclick="toggleFollowMember('${member.id}', ${member.is_following})">${member.is_following ? 'Dejar de seguir' : 'Seguir'}</button>
            </div>`;
    } catch (error) {
        panel.innerHTML = `<p class="form-alert" role="alert">${escapeHtml(error.message)}</p>`;
    }
}

async function toggleFollowMember(memberId, isFollowing) {
    try {
        const response = await fetch(`${API_URL}/community/members/${encodeURIComponent(memberId)}/follow`, {
            method: isFollowing ? 'DELETE' : 'POST',
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('access_token')}` }
        });
        if (!response.ok) throw new Error(await extractError(response, 'No se pudo actualizar el seguimiento.'));
        await loadCommunityMembers();
        const selectedProfile = document.getElementById('communityProfilePanel');
        if (selectedProfile.dataset.memberId) await openCommunityProfile(selectedProfile.dataset.memberId);
    } catch (error) {
        notify(error.message, 'error');
    }
}

// --- AUTH TABS ---
function switchAuthTab(tab) {
    const isRegister = tab === 'register';
    const loginTab = document.getElementById('auth-tab-login');
    const registerTab = document.getElementById('auth-tab-register');
    document.getElementById('auth-tabs').classList.toggle('register', isRegister);
    loginTab.classList.toggle('active', !isRegister);
    loginTab.setAttribute('aria-selected', String(!isRegister));
    loginTab.tabIndex = isRegister ? -1 : 0;
    registerTab.classList.toggle('active', isRegister);
    registerTab.setAttribute('aria-selected', String(isRegister));
    registerTab.tabIndex = isRegister ? 0 : -1;
    document.getElementById('loginForm').classList.toggle('active', !isRegister);
    document.getElementById('registerForm').classList.toggle('active', isRegister);
    hideFormError('loginError');
    hideFormError('regError');
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const isVisible = input.type === 'password';
    input.type = isVisible ? 'text' : 'password';
    setPasswordToggleState(btn, isVisible);
}

function setPasswordToggleState(btn, isVisible) {
    const eyeIcon = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const eyeOffIcon = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.1 3.9"/><path d="M6.6 6.6C3.7 8.2 2 12 2 12s3.5 7 10 7a11 11 0 0 0 4.1-.8"/></svg>';
    const label = isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña';
    btn.innerHTML = isVisible ? eyeOffIcon : eyeIcon;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', String(isVisible));
    btn.title = label;
}

function setButtonBusy(button, isBusy) {
    if (!button) return;
    button.disabled = isBusy;
    if (isBusy) button.setAttribute('aria-busy', 'true');
    else button.removeAttribute('aria-busy');
}

function selectRole(btn) {
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('regRole').value = btn.dataset.role;
}

function showFormError(id, msg) {
    const el = document.getElementById(id);
    el.innerHTML = `<svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span>${msg}</span>`;
    el.classList.remove('hidden');
}
function hideFormError(id) { document.getElementById(id).classList.add('hidden'); }

async function extractError(res, fallback) {
    try {
        const data = await res.json();
        if (typeof data.detail === 'string') return data.detail;
        if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
    } catch (_) {}
    return fallback;
}

// --- AUTH & MFA LOGIC (UPC DOMAIN ENFORCED) ---
let currentMfaSecret = '';
let currentMfaUri = '';

function toggleMfaMode(forceState) {
    const group = document.getElementById('mfaFieldGroup');
    const lbl = document.getElementById('lblToggleMfa');
    const toggle = document.getElementById('btnToggleMfa');
    const btn = document.getElementById('loginBtn');
    const btnLabel = btn ? btn.querySelector('.btn-label') : null;

    const isCurrentlyHidden = group.classList.contains('hidden');
    const targetVisible = typeof forceState === 'boolean' ? forceState : isCurrentlyHidden;

    if (targetVisible) {
        group.classList.remove('hidden');
        if (lbl) lbl.textContent = 'Ocultar código 2FA';
        if (btnLabel) btnLabel.textContent = 'Verificar código 2FA';
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'true');
            toggle.setAttribute('aria-pressed', 'true');
        }
        const input = document.getElementById('mfaCode');
        if (input) {
            input.focus();
        }
    } else {
        group.classList.add('hidden');
        if (lbl) lbl.textContent = 'Usar código 2FA';
        if (btnLabel) btnLabel.textContent = 'Iniciar sesión';
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-pressed', 'false');
        }
        const input = document.getElementById('mfaCode');
        if (input) input.value = '';
    }
    hideFormError('loginError');
}

let mfaSetupTrigger = null;

function openMfaSetupModal(trigger) {
    const modal = document.getElementById('mfaSetupModal');
    if (!modal) return;
    mfaSetupTrigger = trigger || document.activeElement;
    modal.classList.remove('hidden');

    const token = sessionStorage.getItem('access_token');
    const loginEmail = document.getElementById('email') ? document.getElementById('email').value.trim() : '';
    const loginPass = document.getElementById('password') ? document.getElementById('password').value : '';

    // If already authenticated (e.g. from Profile page)
    if (token) {
        document.getElementById('mfaStepCredentials').classList.add('hidden');
        document.getElementById('mfaStepVerify').classList.remove('hidden');
        generateMfaQrAuthenticated();
    } else {
        // In login screen
        document.getElementById('mfaStepCredentials').classList.remove('hidden');
        document.getElementById('mfaStepVerify').classList.add('hidden');
        if (loginEmail) document.getElementById('mfaSetupEmail').value = loginEmail;
        if (loginPass) document.getElementById('mfaSetupPassword').value = loginPass;
        hideFormError('mfaSetupCredError');
    }

    const focusTarget = token
        ? document.getElementById('mfaConfirmCode')
        : document.getElementById(loginEmail ? 'mfaSetupPassword' : 'mfaSetupEmail');
    focusTarget.focus();
}

function closeMfaSetupModal() {
    const modal = document.getElementById('mfaSetupModal');
    if (modal) modal.classList.add('hidden');
    hideFormError('mfaSetupCredError');
    hideFormError('mfaSetupVerifyError');
    if (mfaSetupTrigger && mfaSetupTrigger.isConnected) mfaSetupTrigger.focus();
    mfaSetupTrigger = null;
}

async function generateMfaQr() {
    hideFormError('mfaSetupCredError');
    const email = document.getElementById('mfaSetupEmail').value.trim();
    const password = document.getElementById('mfaSetupPassword').value;

    if (!email || !isUpcEmail(email)) {
        return showFormError('mfaSetupCredError', 'Introduce tu correo institucional UPC (@upc.edu o subdominios).');
    }
    if (!password) {
        return showFormError('mfaSetupCredError', 'Introduce tu contraseña.');
    }

    const btn = document.getElementById('btnGenerateQr');
    setButtonBusy(btn, true);

    try {
        const res = await fetch(`${API_URL}/auth/mfa/setup-credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
            throw new Error(await extractError(res, 'No se pudo generar el código QR. Revisa tus credenciales.'));
        }

        const data = await res.json();
        renderMfaQrDisplay(data.secret, data.provisioning_uri);
        document.getElementById('mfaStepCredentials').classList.add('hidden');
        document.getElementById('mfaStepVerify').classList.remove('hidden');
    } catch (err) {
        showFormError('mfaSetupCredError', err.message);
    } finally {
        setButtonBusy(btn, false);
    }
}

async function generateMfaQrAuthenticated() {
    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/auth/mfa/setup`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await extractError(res, 'Error al generar el setup de MFA'));
        const data = await res.json();
        renderMfaQrDisplay(data.secret, data.provisioning_uri);
    } catch (err) {
        showFormError('mfaSetupVerifyError', err.message);
    }
}

function renderMfaQrDisplay(secret, uri) {
    currentMfaSecret = secret;
    currentMfaUri = uri;

    const displayEl = document.getElementById('mfaSecretDisplay');
    if (displayEl) displayEl.textContent = secret;

    const qrContainer = document.getElementById('mfaQrCanvas');
    const imgFallback = document.getElementById('mfaQrFallbackImg');
    const imgContainer = document.getElementById('mfaQrImageContainer');

    if (qrContainer) {
        qrContainer.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(qrContainer, {
                    text: uri,
                    width: 180,
                    height: 180,
                    colorDark: "#0b1329",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
                imgContainer.classList.add('hidden');
                qrContainer.classList.remove('hidden');
                return;
            } catch (e) {
                console.warn("QRCode local render error, using fallback image:", e);
            }
        }
    }

    // Fallback to QR server API
    if (imgFallback && imgContainer) {
        imgFallback.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uri)}`;
        imgContainer.classList.remove('hidden');
        if (qrContainer) qrContainer.classList.add('hidden');
    }
}

function copyMfaSecret() {
    if (!currentMfaSecret) return;
    navigator.clipboard.writeText(currentMfaSecret).then(() => {
        notify('Clave secreta copiada al portapapeles');
    }).catch(() => {
        notify('Copia la clave: ' + currentMfaSecret);
    });
}

function backToMfaCredentials() {
    const token = sessionStorage.getItem('access_token');
    if (token) {
        closeMfaSetupModal();
    } else {
        document.getElementById('mfaStepCredentials').classList.remove('hidden');
        document.getElementById('mfaStepVerify').classList.add('hidden');
    }
}

async function verifyAndEnableMfa() {
    hideFormError('mfaSetupVerifyError');
    const code = document.getElementById('mfaConfirmCode').value.trim();
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
        return showFormError('mfaSetupVerifyError', 'Introduce el código numérico de 6 dígitos que muestra tu app.');
    }

    const btn = document.getElementById('btnConfirmMfa');
    setButtonBusy(btn, true);

    const token = sessionStorage.getItem('access_token');

    try {
        if (token) {
            // Authenticated user enabling MFA
            const res = await fetch(`${API_URL}/auth/mfa/enable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });
            if (!res.ok) throw new Error(await extractError(res, 'Código MFA incorrecto o expirado.'));
            
            notify('¡2FA activado correctamente en tu cuenta!');
            closeMfaSetupModal();
            await loadUserProfile();
        } else {
            // Unauthenticated user enabling & logging in
            const email = document.getElementById('mfaSetupEmail').value.trim();
            const password = document.getElementById('mfaSetupPassword').value;

            const res = await fetch(`${API_URL}/auth/mfa/enable-credentials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, code })
            });
            if (!res.ok) throw new Error(await extractError(res, 'Código MFA incorrecto o credenciales no válidas.'));

            const data = await res.json();
            sessionStorage.setItem('access_token', data.access_token);
            sessionStorage.setItem('user_role', data.role);
            sessionStorage.setItem('user_email', email);

            notify('¡MFA activado con éxito! Sesión iniciada.');
            closeMfaSetupModal();
            await setupDashboard();
        }
    } catch (err) {
        showFormError('mfaSetupVerifyError', err.message);
    } finally {
        setButtonBusy(btn, false);
    }
}

async function disableMfa() {
    if (!confirm('¿Seguro que deseas desactivar la autenticación en dos pasos (2FA)? Tu cuenta estará menos protegida.')) return;
    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/auth/mfa/disable`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await extractError(res, 'No se pudo desactivar el MFA.'));
        notify('Autenticación en dos pasos desactivada');
        await loadUserProfile();
    } catch (err) {
        notify('Error: ' + err.message);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    hideFormError('loginError');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const mfaCodeInput = document.getElementById('mfaCode');
    const mfaCode = mfaCodeInput ? mfaCodeInput.value.trim() : '';
    const isMfaMode = mfaCodeInput && !mfaCodeInput.closest('#mfaFieldGroup').classList.contains('hidden');

    if (!email) return showFormError('loginError', 'Introduce tu correo institucional de la UPC.');
    if (!isUpcEmail(email)) {
        return showFormError('loginError', 'Acceso denegado: debes utilizar un correo de la UPC (@upc.edu o subdominios como @estudiantat.upc.edu).');
    }
    if (!password) return showFormError('loginError', 'Introduce tu contraseña.');
    if (isMfaMode && !/^\d{6}$/.test(mfaCode)) {
        return showFormError('loginError', 'Introduce el código 2FA de 6 dígitos.');
    }

    const btn = document.getElementById('loginBtn');
    setButtonBusy(btn, true);

    try {
        // If MFA field is filled or MFA mode active with code
        if (isMfaMode) {
            const resMfa = await fetch(`${API_URL}/auth/mfa/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, code: mfaCode })
            });
            if (!resMfa.ok) {
                throw new Error(await extractError(resMfa, 'Código MFA incorrecto o credenciales no válidas.'));
            }
            const data = await resMfa.json();
            sessionStorage.setItem('access_token', data.access_token);
            sessionStorage.setItem('user_role', data.role);
            sessionStorage.setItem('user_email', email);
            notify('¡Acceso completado con 2FA / MFA!');
            await setupDashboard();
            return;
        }

        // Standard login
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        
        if (!res.ok) {
            const errDetail = await extractError(res, 'Credenciales incorrectas o usuario no registrado.');
            // If backend indicates MFA is required for this user
            if (res.status === 403 && (errDetail.toLowerCase().includes('mfa required') || errDetail.toLowerCase().includes('mfa'))) {
                toggleMfaMode(true);
                showFormError('loginError', '🔐 Tu cuenta tiene activada la autenticación en dos pasos. Introduce el código de 6 dígitos generado en tu aplicación Authenticator.');
                return;
            }
            throw new Error(errDetail);
        }
        
        const data = await res.json();
        sessionStorage.setItem('access_token', data.access_token);
        sessionStorage.setItem('user_role', data.role);
        sessionStorage.setItem('user_email', email);
        
        notify('¡Bienvenido a AlumNET!');
        await setupDashboard();
    } catch (err) {
        showFormError('loginError', err.message);
    } finally {
        setButtonBusy(btn, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    hideFormError('regError');
    const payload = {
        full_name: document.getElementById('regName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
        role_name: document.getElementById('regRole').value
    };

    if (!['Student', 'Alumni'].includes(payload.role_name)) {
        return showFormError('regError', 'El rol seleccionado no está disponible para el registro.');
    }
    if (payload.full_name.length < 2) return showFormError('regError', 'Introduce tu nombre completo.');
    if (!payload.email || !isUpcEmail(payload.email)) {
        return showFormError('regError', 'Solo se permite el registro con correo oficial de la UPC (@estudiantat.upc.edu o @upc.edu).');
    }
    if (payload.password.length < 8) return showFormError('regError', 'La contraseña debe tener al menos 8 caracteres.');

    const btn = document.getElementById('registerBtn');
    setButtonBusy(btn, true);

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await extractError(res, 'No se pudo completar el registro. ¿El correo ya existe?'));
        
        notify('Cuenta creada con éxito. Ya puedes iniciar sesión.');
        document.getElementById('registerForm').reset();
        switchAuthTab('login');
        document.getElementById('email').value = payload.email;
    } catch (err) {
        showFormError('regError', err.message);
    } finally {
        setButtonBusy(btn, false);
    }
}

function logout() {
    sessionStorage.clear();
    location.reload();
}

// --- DASHBOARD SETUP ---
async function setupDashboard() {
    const token = sessionStorage.getItem('access_token');
    const role = sessionStorage.getItem('user_role');
    if (!token || !role) return;

    document.body.classList.remove('auth-mode');
    document.getElementById('view-login').classList.remove('active');
    document.getElementById('main-nav').style.display = 'flex';

    updateRoleControls(role);

    await loadUserProfile();
    await loadRoleChangePanels();

    // Check URL hash for direct links (e.g., #offer-123 or #post-123)
    handleDirectHashNavigation();
}

function updateRoleControls(role) {
    const pill = document.getElementById('role-pill');
    pill.style.display = 'inline-flex';
    pill.textContent = role;
    pill.className = `badge-pill ${role === 'Student' ? 'badge-student' : role === 'Alumni' ? 'badge-alumni' : 'badge-admin'}`;

    const publisherTrigger = document.getElementById('offer-publisher-trigger');
    const optEvent = document.getElementById('optEventAdminOnly');
    const lblPublish = document.getElementById('lblPublishBtn');

    if (role === 'Administrator') {
        publisherTrigger.classList.remove('hidden');
        optEvent.classList.remove('hidden');
        lblPublish.textContent = 'Publicar Oferta o Evento';
    } else if (role === 'Alumni') {
        publisherTrigger.classList.remove('hidden');
        optEvent.classList.add('hidden');
        lblPublish.textContent = 'Publicar Oferta';
    } else {
        publisherTrigger.classList.add('hidden');
    }

    const roleControl = document.getElementById('account-role-control');
    const requestedRole = document.getElementById('requestedRole');
    const roleRequestControl = document.getElementById('account-role-control');
    const workFields = document.getElementById('workProfileFields');
    const memberProfileEdit = document.getElementById('memberProfileEdit');
    const documentsPanel = document.getElementById('cvDocumentsPanel');
    const adminRequestsPanel = document.getElementById('adminRoleRequestsPanel');
    const isMember = role === 'Student' || role === 'Alumni';
    if (roleRequestControl) roleRequestControl.classList.toggle('hidden', !isMember);
    if (workFields) workFields.classList.toggle('hidden', !isMember);
    if (memberProfileEdit) memberProfileEdit.classList.toggle('hidden', !isMember);
    if (documentsPanel) documentsPanel.classList.toggle('hidden', role === 'Administrator');
    if (adminRequestsPanel) adminRequestsPanel.classList.toggle('hidden', role !== 'Administrator');
    if (requestedRole) {
        requestedRole.replaceChildren();
        for (const roleOption of ['Student', 'Alumni']) {
            if (roleOption === role) continue;
            const option = document.createElement('option');
            option.value = roleOption;
            option.textContent = roleOption;
            requestedRole.append(option);
        }
    }
}

function toggleRoleRequestForm(forceOpen) {
    const form = document.getElementById('roleChangeRequestForm');
    const requestButton = document.getElementById('btnOpenRoleRequest');
    if (requestButton.disabled) return;
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : form.classList.contains('hidden');
    form.classList.toggle('hidden', !shouldOpen);
    if (shouldOpen) document.getElementById('roleChangeReason').focus();
}

async function submitRoleChangeRequest(event) {
    event.preventDefault();
    const requestedRole = document.getElementById('requestedRole').value;
    const reason = document.getElementById('roleChangeReason').value.trim();
    if (reason.length < 15) {
        notify('La justificación debe tener al menos 15 caracteres.', 'error');
        return;
    }

    const button = document.getElementById('btnSubmitRoleRequest');
    setButtonBusy(button, true);
    try {
        const response = await fetch(`${API_URL}/auth/role-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ requested_role: requestedRole, reason })
        });
        if (!response.ok) throw new Error(await extractError(response, 'No se pudo enviar la solicitud.'));
        document.getElementById('roleChangeRequestForm').reset();
        toggleRoleRequestForm(false);
        await loadMyRoleChangeRequests();
        notify('Solicitud enviada para revisión administrativa.');
    } catch (error) {
        notify(error.message, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

async function loadRoleChangePanels() {
    const role = sessionStorage.getItem('user_role');
    if (role === 'Administrator') {
        await loadPendingRoleChangeRequests();
    } else if (role === 'Student' || role === 'Alumni') {
        await loadMyRoleChangeRequests();
    }
}

async function loadMyRoleChangeRequests() {
    const container = document.getElementById('roleChangeRequestStatus');
    if (!container) return;
    if (!['Student', 'Alumni'].includes(sessionStorage.getItem('user_role'))) {
        container.classList.add('hidden');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/role-requests/me`, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('access_token')}` }
        });
        if (!response.ok) throw new Error(await extractError(response, 'No se pudo cargar el estado de la solicitud.'));
        const requests = await response.json();
        const latest = requests[0];
        const requestButton = document.getElementById('btnOpenRoleRequest');
        if (!latest) {
            requestButton.disabled = false;
            requestButton.textContent = 'Solicitar cambio de perfil';
            container.classList.add('hidden');
            container.textContent = '';
            return;
        }

        const isPending = latest.status === 'PENDING';
        requestButton.disabled = isPending;
        requestButton.textContent = isPending ? 'Solicitud pendiente' : 'Solicitar cambio de perfil';

        const statusText = latest.status === 'PENDING'
            ? `Pendiente: solicitud para cambiar a ${latest.requested_role}.`
            : latest.status === 'APPROVED'
                ? `Aprobada: ahora tu perfil es ${latest.requested_role}.`
                : `Rechazada: solicitud para cambiar a ${latest.requested_role}.`;
        container.innerHTML = `<p><strong>${escapeHtml(statusText)}</strong></p><p data-no-translate>${escapeHtml(latest.reason)}</p>${latest.review_note ? `<p>Nota de administración: ${escapeHtml(latest.review_note)}</p>` : ''}`;
        container.classList.remove('hidden');
    } catch (error) {
        notify(error.message, 'error');
    }
}

async function loadPendingRoleChangeRequests() {
    const container = document.getElementById('pendingRoleChangeRequests');
    if (!container || sessionStorage.getItem('user_role') !== 'Administrator') return;
    container.innerHTML = '<p class="text-sm text-text-muted">Cargando solicitudes...</p>';

    try {
        const response = await fetch(`${API_URL}/auth/role-requests/pending`, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('access_token')}` }
        });
        if (!response.ok) throw new Error(await extractError(response, 'No se pudieron cargar las solicitudes.'));
        const requests = await response.json();
        if (!requests.length) {
            container.innerHTML = '<p class="text-sm text-text-muted">No hay solicitudes pendientes.</p>';
            return;
        }

        container.innerHTML = requests.map(request => `
            <article class="role-review-card">
                <div class="role-review-content">
                    <h3 class="font-semibold text-white" data-no-translate>${escapeHtml(request.requester_name)}</h3>
                    <a class="text-xs text-sky-300" href="mailto:${encodeURIComponent(request.requester_email)}">${escapeHtml(request.requester_email)}</a>
                    <p class="text-sm mt-2">${escapeHtml(request.current_role)} → ${escapeHtml(request.requested_role)}</p>
                    <p class="text-xs text-text-secondary mt-2" data-no-translate>${escapeHtml(request.reason)}</p>
                </div>
                <div class="role-review-actions">
                    <button type="button" class="btn-secondary text-xs" onclick="reviewRoleChangeRequest('${request.id}', 'REJECTED', this)">Rechazar</button>
                    <button type="button" class="btn-primary text-xs" onclick="reviewRoleChangeRequest('${request.id}', 'APPROVED', this)">Aprobar</button>
                </div>
            </article>
        `).join('');
    } catch (error) {
        container.innerHTML = `<p class="form-alert" role="alert">${escapeHtml(error.message)}</p>`;
    }
}

async function reviewRoleChangeRequest(requestId, decision, button) {
    setButtonBusy(button, true);
    try {
        const response = await fetch(`${API_URL}/auth/role-requests/${encodeURIComponent(requestId)}/review`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ decision })
        });
        if (!response.ok) throw new Error(await extractError(response, 'No se pudo revisar la solicitud.'));
        notify(decision === 'APPROVED' ? 'Cambio de perfil aprobado.' : 'Solicitud rechazada.');
        await loadPendingRoleChangeRequests();
    } catch (error) {
        notify(error.message, 'error');
    } finally {
        setButtonBusy(button, false);
    }
}

function handleDirectHashNavigation() {
    const hash = window.location.hash;
    if (hash.startsWith('#offer-')) {
        const offerId = hash.replace('#offer-', '');
        switchMainTab('offers');
        setTimeout(() => scrollToAndHighlight('offer-' + offerId), 500);
    } else if (hash.startsWith('#post-')) {
        const postId = hash.replace('#post-', '');
        switchMainTab('feed');
        setTimeout(() => scrollToAndHighlight('post-' + postId), 500);
    } else {
        switchMainTab('feed');
    }
}

function scrollToAndHighlight(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-target');
        setTimeout(() => el.classList.remove('highlight-target'), 3000);
    }
}

window.addEventListener('hashchange', handleDirectHashNavigation);

async function loadUserProfile() {
    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) return logout();
        if (!res.ok) return;

        currentUserProfile = await res.json();
        updateRoleControls(currentUserProfile.role_name);

        document.getElementById('header-user-name').textContent = currentUserProfile.full_name;
        document.getElementById('sidebar-user-name').textContent = currentUserProfile.full_name;
        document.getElementById('sidebar-user-email').textContent = currentUserProfile.email;
        document.getElementById('sidebar-user-role').textContent = currentUserProfile.role_name;
        document.getElementById('sidebar-user-role').className = `badge-pill ${currentUserProfile.role_name === 'Student' ? 'badge-student' : currentUserProfile.role_name === 'Alumni' ? 'badge-alumni' : 'badge-admin'}`;

        document.getElementById('profile-full-name').textContent = currentUserProfile.full_name;
        document.getElementById('profile-email').textContent = currentUserProfile.email;
        document.getElementById('profile-role-badge').textContent = currentUserProfile.role_name;
        document.getElementById('profile-role-badge').className = `badge-pill ${currentUserProfile.role_name === 'Student' ? 'badge-student' : currentUserProfile.role_name === 'Alumni' ? 'badge-alumni' : 'badge-admin'}`;

        applyAvatarToUI(currentUserProfile.avatar_url, currentUserProfile.full_name);

        // Local Bio
        const bio = localStorage.getItem(`bio_${currentUserProfile.id}`) || '';
        document.getElementById('profileBioInput').value = currentUserProfile.bio || bio;
        document.getElementById('currentPositionInput').value = currentUserProfile.current_position || '';
        document.getElementById('companyInput').value = currentUserProfile.company || '';

        // Update 2FA Security Card in Profile
        const mfaBadge = document.getElementById('profile-mfa-badge');
        const btnDisable = document.getElementById('btnProfileDisableMfa');
        const lblMfa = document.getElementById('lblProfileMfaBtn');

        if (currentUserProfile.mfa_enabled) {
            if (mfaBadge) {
                mfaBadge.textContent = 'Activado';
                mfaBadge.className = 'badge-pill bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-semibold';
            }
            if (lblMfa) lblMfa.textContent = 'Regenerar Código QR';
            if (btnDisable) btnDisable.classList.remove('hidden');
        } else {
            if (mfaBadge) {
                mfaBadge.textContent = 'Inactivo';
                mfaBadge.className = 'badge-pill bg-slate-500/20 text-slate-400 border-slate-500/30';
            }
            if (lblMfa) lblMfa.textContent = 'Configurar con Código QR';
            if (btnDisable) btnDisable.classList.add('hidden');
        }

    } catch (err) {
        console.error("Error cargando perfil:", err);
    }
}

function applyAvatarToUI(avatarUrl, name) {
    const initial = (name || 'U').charAt(0).toUpperCase();
    const elements = [
        document.getElementById('header-avatar'),
        document.getElementById('sidebar-avatar'),
        document.getElementById('composer-avatar'),
        document.getElementById('profile-page-avatar')
    ];

    elements.forEach(el => {
        if (!el) return;
        if (avatarUrl) {
            el.innerHTML = `<img src="${avatarUrl}" alt="Avatar" class="w-full h-full object-cover">`;
        } else {
            el.textContent = initial;
        }
    });

    const btnRemove = document.getElementById('btnRemoveAvatar');
    if (btnRemove) btnRemove.classList.toggle('hidden', !avatarUrl);
}

async function handleProfilePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        notify('Formato de imagen no soportado. Usa PNG o JPG.', 'error');
        return;
    }
    if (file.size > 4 * 1024 * 1024) {
        notify('La imagen excede el límite de 4 MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(event) {
        const base64Data = event.target.result;
        const token = sessionStorage.getItem('access_token');

        try {
            const res = await fetch(`${API_URL}/auth/avatar`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ avatar_url: base64Data })
            });
            if (!res.ok) throw new Error("Error al guardar la foto de perfil");

            currentUserProfile.avatar_url = base64Data;
            applyAvatarToUI(base64Data, currentUserProfile.full_name);
            notify('Foto de perfil actualizada correctamente');
            loadPosts();
        } catch (err) {
            notify(err.message, 'error');
        }
    };
    reader.readAsDataURL(file);
}

async function removeProfilePhoto() {
    const token = sessionStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_URL}/auth/avatar`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ avatar_url: "" })
        });
        if (!res.ok) throw new Error("Error al eliminar la foto");

        currentUserProfile.avatar_url = null;
        applyAvatarToUI(null, currentUserProfile.full_name);
        notify('Foto de perfil restaurada al avatar por defecto');
        loadPosts();
    } catch (err) {
        notify(err.message, 'error');
    }
}

async function saveProfileBio() {
    if (!currentUserProfile) return;
    const payload = {
        bio: document.getElementById('profileBioInput').value,
        current_position: document.getElementById('currentPositionInput').value,
        company: document.getElementById('companyInput').value
    };
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(await extractError(response, 'No se pudo guardar el perfil.'));
        currentUserProfile = await response.json();
        notify('Perfil actualizado.');
    } catch (error) {
        notify(error.message, 'error');
    }
}


// --- APARTADO 1: FEED DE PUBLICACIONES (CON FOTO Y LIKES CON CONTADOR) ---
async function loadPosts() {
    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    const container = document.getElementById('postsContainer');
    try {
        const res = await fetch(`${API_URL}/posts/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) return logout();
        if (!res.ok) throw new Error("Error al cargar publicaciones");

        const posts = await res.json();
        document.getElementById('postsBadgeCount').textContent = posts.length;

        if (currentUserProfile) {
            const myPosts = posts.filter(p => p.author_id === currentUserProfile.id);
            document.getElementById('stat-posts-count').textContent = myPosts.length;
        }

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="card text-center py-12">
                    <h3 class="font-bold text-white text-base">Aún no hay publicaciones</h3>
                    <p class="text-xs text-text-muted mt-1">Sé el primero en compartir un proyecto o noticia con la comunidad UPC.</p>
                </div>
            `;
            return;
        }

        const myRole = sessionStorage.getItem('user_role');
        const myId = currentUserProfile ? currentUserProfile.id : null;

        container.innerHTML = posts.map(post => {
            const dateStr = formatRelativeTime(post.created_at);
            const isAuthor = myId && post.author_id === myId;
            const canDelete = isAuthor || myRole === 'Administrator';
            const roleClass = post.author_role === 'Student' ? 'badge-student' : post.author_role === 'Alumni' ? 'badge-alumni' : 'badge-admin';
            const initial = (post.author_name || 'U').charAt(0).toUpperCase();

            const avatarHtml = post.author_avatar ? 
                `<img src="${post.author_avatar}" alt="${escapeHtml(post.author_name)}" class="w-full h-full object-cover">` : 
                initial;

            const hasLiked = !!post.has_liked;
            const likesCount = post.likes_count || 0;

            return `
                <article class="post-card" id="post-${post.id}">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <div class="avatar-circle avatar-sm">${avatarHtml}</div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-sm text-white">${escapeHtml(post.author_name || 'Miembro UPC')}</span>
                                    <span class="badge-pill ${roleClass} text-[10px] py-0.5 px-2">${post.author_role || 'Student'}</span>
                                </div>
                                <span class="text-[11px] text-text-muted">${dateStr}</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <button onclick="sharePost('${post.id}')" class="text-text-muted hover:text-sky-400 p-1 rounded" title="Compartir enlace directo">
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </button>
                            ${canDelete ? `
                                <button onclick="handleDeletePost('${post.id}')" class="btn-danger-action" title="Eliminar">
                                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                                    <span>Eliminar</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <p class="post-content text-sm text-slate-200 leading-relaxed mb-4" data-no-translate>${escapeHtml(post.content)}</p>

                    <div class="border-t border-border-subtle pt-3 flex items-center justify-between text-xs text-text-muted">
                        <button onclick="toggleLikePost('${post.id}', this)" class="flex items-center gap-2 hover:text-rose-400 transition-colors ${hasLiked ? 'text-rose-500 font-semibold' : ''}">
                            <svg class="w-4 h-4 ${hasLiked ? 'fill-current text-rose-500' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            <span class="likes-count font-bold">${likesCount}</span>
                            <span>${hasLiked ? 'Te gusta' : 'Me gusta'}</span>
                        </button>
                        <span class="text-[11px] text-text-muted">Comunidad UPC</span>
                    </div>
                </article>
            `;
        }).join('');

    } catch (err) {
        container.innerHTML = `<div class="card text-rose-400 text-center py-6 text-sm">${err.message}</div>`;
    }
}

async function handleCreatePost(e) {
    e.preventDefault();
    const input = document.getElementById('postContentInput');
    const content = input.value;
    if (!content.trim()) return;

    const token = sessionStorage.getItem('access_token');
    const btn = document.getElementById('btnPublishPost');
    setButtonBusy(btn, true);

    try {
        const res = await fetch(`${API_URL}/posts/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        if (!res.ok) throw new Error(await extractError(res, 'No se pudo publicar'));

        input.value = '';
        document.getElementById('postCharCount').textContent = '0 / 2000';
        notify('¡Publicación compartida con la comunidad!');
        await loadPosts();
    } catch (err) {
        notify(err.message, 'error');
    } finally {
        setButtonBusy(btn, false);
    }
}

async function handleDeletePost(postId) {
    if (!confirm('¿Deseas eliminar esta publicación?')) return;
    const token = sessionStorage.getItem('access_token');

    try {
        const res = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('No se pudo eliminar la publicación');

        notify('Publicación eliminada');
        loadPosts();
    } catch (err) {
        notify(err.message, 'error');
    }
}

async function toggleLikePost(postId, btn) {
    const token = sessionStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Error al dar like");

        const data = await res.json();
        const svg = btn.querySelector('svg');
        const countSpan = btn.querySelector('.likes-count');

        countSpan.textContent = data.likes_count;
        if (data.has_liked) {
            btn.classList.add('text-rose-500', 'font-semibold');
            svg.classList.add('fill-current', 'text-rose-500');
            btn.lastElementChild.textContent = 'Te gusta';
        } else {
            btn.classList.remove('text-rose-500', 'font-semibold');
            svg.classList.remove('fill-current', 'text-rose-500');
            btn.lastElementChild.textContent = 'Me gusta';
        }
    } catch (err) {
        notify(err.message, 'error');
    }
}

function sharePost(postId) {
    const url = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(url);
    notify('Enlace directo a la publicación copiado al portapapeles');
}

// EVENTOS EN EL FEED (DESDE BASE DE DATOS)
async function loadFeedEvents() {
    const token = sessionStorage.getItem('access_token');
    const listEl = document.getElementById('feedEventsList');
    const badgeEl = document.getElementById('eventsCountBadge');

    try {
        const res = await fetch(`${API_URL}/offers/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;

        const all = await res.json();
        const events = all.filter(o => o.offer_type === 'Event');
        badgeEl.textContent = events.length;

        if (events.length === 0) {
            listEl.innerHTML = `<p class="text-xs text-text-muted py-2">No hay eventos oficiales programados actualmente.</p>`;
            return;
        }

        listEl.innerHTML = events.slice(0, 4).map(e => `
            <div class="p-2.5 rounded-lg bg-surface-card border border-border-subtle hover:border-amber-400/50 cursor-pointer transition-all" onclick="navigateToOffer('${e.id}')">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/10 text-amber-300">Evento UPC</span>
                    <span class="text-[10px] text-text-muted">${formatRelativeTime(e.created_at)}</span>
                </div>
                <h5 class="font-bold text-xs text-white truncate">${escapeHtml(e.title)}</h5>
                <p class="text-[11px] text-text-secondary mt-0.5">${escapeHtml(e.company)}</p>
            </div>
        `).join('');

    } catch (err) {
        console.error("Error al cargar eventos en el feed:", err);
    }
}

function navigateToOffer(offerId) {
    window.location.hash = `#offer-${offerId}`;
}

const postInput = document.getElementById('postContentInput');
if (postInput) {
    postInput.addEventListener('input', () => {
        document.getElementById('postCharCount').textContent = `${postInput.value.length} / 2000`;
    });
}


// --- APARTADO 2: OFERTAS & EVENTOS (ALUMNI & ADMIN RESTRICTIONS) ---
function toggleOfferComposer() {
    const card = document.getElementById('offerComposerCard');
    card.classList.toggle('hidden');
    if (!card.classList.contains('hidden')) {
        document.getElementById('offerTitle').focus();
    }
}

async function loadOffers() {
    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    const container = document.getElementById('offersContainer');
    try {
        const res = await fetch(`${API_URL}/offers/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) return logout();
        if (!res.ok) throw new Error("Error al obtener ofertas");

        cachedOffers = await res.json();
        document.getElementById('count-all-offers').textContent = `(${cachedOffers.length})`;

        // Update "Mis Ofertas" count & visibility
        const myId = currentUserProfile ? currentUserProfile.id : null;
        const myOffers = cachedOffers.filter(o => o.author_id === myId);
        const chipMyOffers = document.getElementById('chip-my-offers');
        if (myOffers.length > 0 || (currentUserProfile && currentUserProfile.role_name === 'Alumni')) {
            chipMyOffers.classList.remove('hidden');
            document.getElementById('count-my-offers').textContent = `(${myOffers.length})`;
        }

        renderOffers(cachedOffers);

        // If hash points to an offer, highlight it
        if (window.location.hash.startsWith('#offer-')) {
            const targetId = window.location.hash.replace('#offer-', '');
            setTimeout(() => scrollToAndHighlight('offer-' + targetId), 300);
        }

    } catch (err) {
        container.innerHTML = `<div class="card text-rose-400 text-center py-6 text-sm">${err.message}</div>`;
    }
}

function renderOffers(offers) {
    const container = document.getElementById('offersContainer');
    const searchVal = (document.getElementById('offerSearchInput')?.value || '').toLowerCase();
    const myId = currentUserProfile ? currentUserProfile.id : null;
    const myRole = currentUserProfile ? currentUserProfile.role_name : sessionStorage.getItem('user_role');

    let filtered = offers;
    if (currentOfferFilter === 'MY_OFFERS') {
        filtered = filtered.filter(o => o.author_id === myId);
    } else if (currentOfferFilter !== 'ALL') {
        filtered = filtered.filter(o => o.offer_type === currentOfferFilter);
    }

    if (searchVal) {
        filtered = filtered.filter(o => 
            o.title.toLowerCase().includes(searchVal) || 
            o.company.toLowerCase().includes(searchVal) ||
            o.description.toLowerCase().includes(searchVal)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="card text-center py-12">
                <h3 class="font-bold text-white text-base">No hay convocatorias que coincidan</h3>
                <p class="text-xs text-text-muted mt-1">Prueba a seleccionar otro filtro o término de búsqueda.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(offer => {
        const dateStr = formatRelativeTime(offer.created_at);
        const isAuthor = myId && offer.author_id === myId;
        
        // RULES SPECIFIED BY USER:
        // 1. Admin CANNOT apply, CANNOT view candidates.
        // 2. Admin CAN delete with a reason.
        // 3. Alumni who published offer CAN view candidates and CVs.
        const isAdmin = myRole === 'Administrator';
        const canViewCandidates = isAuthor && !isAdmin; // Only the author (not admin) can view candidates!
        const canApply = !isAdmin && !isAuthor; // Admin cannot apply

        const typeColor = offer.offer_type === 'Job' ? 'text-sky-400 bg-sky-500/10 border-sky-500/30' :
                          offer.offer_type === 'Internship' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                          offer.offer_type === 'Event' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                          'text-purple-400 bg-purple-500/10 border-purple-500/30';

        const isEvent = offer.offer_type === 'Event';

        return `
            <div class="offer-card" id="offer-${offer.id}" data-type="${offer.offer_type}">
                <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                    <div class="flex items-start gap-3">
                        <div class="w-12 h-12 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center text-lg font-bold text-sky-400 flex-shrink-0">
                            ${(offer.company || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap mb-1">
                                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border ${typeColor}">
                                    ${isEvent ? 'Evento UPC' : offer.offer_type}
                                </span>
                                ${isAuthor ? `<span class="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded">Tu publicación</span>` : ''}
                            </div>
                            <h3 class="text-lg font-bold text-white">${escapeHtml(offer.title)}</h3>
                            <p class="text-sm font-medium text-slate-300">${escapeHtml(offer.company)}</p>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <!-- COMPARTIR ENLACE DIRECTO -->
                        <button onclick="shareOffer('${offer.id}')" class="btn-secondary text-xs py-2" title="Copiar enlace directo">
                            <svg class="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            <span>Compartir</span>
                        </button>

                        <!-- VER CANDIDATOS (SOLO AUTOR ALUMNI, ADMIN NO) -->
                        ${canViewCandidates ? `
                            <button onclick="openApplicationsModal('${offer.id}', '${escapeHtml(offer.title)}')" class="btn-secondary text-xs py-2 text-sky-400 border-sky-500/40 hover:bg-sky-500/10">
                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                <span>Ver Candidatos (${offer.applications_count || 0})</span>
                            </button>
                        ` : ''}

                        <!-- POSTULARME (ADMIN NO PUEDE POSTULARSE) -->
                        ${canApply ? (offer.has_applied ? `
                            <span class="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>Ya postulado</span>
                            </span>
                        ` : `
                            <button onclick="openApplyModal('${offer.id}', '${escapeHtml(offer.title)}', '${escapeHtml(offer.company)}')" class="btn-primary text-xs py-2">
                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>${isEvent ? 'Inscribirme al Evento' : 'Postularme con mi CV'}</span>
                            </button>
                        `) : ''}

                        <!-- ELIMINAR (ADMIN CON MOTIVO, O AUTOR) -->
                        ${(isAdmin || isAuthor) ? `
                            <button onclick="openDeleteOfferModal('${offer.id}', '${escapeHtml(offer.title)}', ${isAdmin})" class="btn-danger-action py-1.5" title="Eliminar oferta">
                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                <span>${isAdmin ? 'Borrar (con motivo)' : 'Eliminar'}</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <p class="text-sm text-text-secondary leading-relaxed mb-4">${escapeHtml(offer.description)}</p>

                <div class="border-t border-border-subtle pt-3 flex items-center justify-between text-xs text-text-muted">
                    <span class="flex items-center gap-1.5">
                        Publicado ${dateStr} ${offer.author_name ? `por ${escapeHtml(offer.author_name)}` : ''}
                    </span>
                    <span class="text-emerald-400 font-semibold flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Convocatoria Abierta
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function filterOffers(type, btn) {
    currentOfferFilter = type;
    document.querySelectorAll('#offerFilterChips .chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderOffers(cachedOffers);
}

function handleOfferSearch() {
    renderOffers(cachedOffers);
}

// COMPARTIR OFERTA CON ENLACE DIRECTO
function shareOffer(offerId) {
    const url = `${window.location.origin}/#offer-${offerId}`;
    navigator.clipboard.writeText(url);
    notify('Enlace directo a la oferta copiado al portapapeles');
}

// PUBLICAR OFERTA
async function handlePublishOffer(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('access_token');
    const payload = {
        title: document.getElementById('offerTitle').value.trim(),
        company: document.getElementById('offerCompany').value.trim(),
        description: document.getElementById('offerDesc').value.trim(),
        offer_type: document.getElementById('offerType').value
    };

    const btn = document.getElementById('btnPublishOffer');
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/offers/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await extractError(res, "No se pudo publicar la convocatoria."));

        e.target.reset();
        toggleOfferComposer();
        notify("¡Convocatoria publicada con éxito!");
        await loadOffers();
    } catch (err) {
        notify(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// --- BORRAR OFERTA CON MOTIVO ---
function openDeleteOfferModal(offerId, title, isAdmin) {
    document.getElementById('deleteOfferId').value = offerId;
    document.getElementById('deleteOfferDescPrompt').textContent = `¿Seguro que deseas eliminar la convocatoria "${title}"?`;
    const reasonInput = document.getElementById('deleteReasonInput');
    reasonInput.value = '';
    reasonInput.required = isAdmin;
    document.getElementById('deleteOfferModal').classList.remove('hidden');
    setTimeout(() => reasonInput.focus(), 50);
}

function closeDeleteOfferModal() {
    document.getElementById('deleteOfferModal').classList.add('hidden');
}

async function submitDeleteOffer(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('access_token');
    const offerId = document.getElementById('deleteOfferId').value;
    const reason = document.getElementById('deleteReasonInput').value.trim();

    try {
        const res = await fetch(`${API_URL}/offers/${offerId}?reason=${encodeURIComponent(reason)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(await extractError(res, "No se pudo eliminar la oferta"));

        closeDeleteOfferModal();
        notify(`Convocatoria eliminada correctamente. Motivo registrado.`);
        await loadOffers();
        await loadFeedEvents();
    } catch (err) {
        notify(err.message, 'error');
    }
}

// --- APPLICATION FLOW ---
async function openApplyModal(offerId, title, company) {
    const token = sessionStorage.getItem('access_token');
    document.getElementById('applyOfferId').value = offerId;
    document.getElementById('applyModalOfferTitle').textContent = title;
    document.getElementById('applyModalOfferCompany').textContent = company;
    document.getElementById('applyCoverNote').value = '';

    const select = document.getElementById('applyCvSelect');
    select.innerHTML = '<option value="">Cargando documentos...</option>';

    try {
        const res = await fetch(`${API_URL}/documents/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const docs = await res.json();
        userDocumentsCache = docs;

        if (docs.length === 0) {
            select.innerHTML = '<option value="">No has subido ningún CV aún</option>';
            notify('Debes subir al menos un CV en "Mi Perfil" antes de postularte.', 'error');
            switchMainTab('profile');
            return;
        }

        select.innerHTML = docs.map(d => `
            <option value="${d.id}">${escapeHtml(d.filename)} (${formatRelativeTime(d.created_at)})</option>
        `).join('');

        document.getElementById('applyModal').classList.remove('hidden');
    } catch (err) {
        notify("Error al preparar la postulación", 'error');
    }
}

function closeApplyModal() {
    document.getElementById('applyModal').classList.add('hidden');
}

async function submitApplication(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('access_token');
    const offerId = document.getElementById('applyOfferId').value;
    const cvDocId = document.getElementById('applyCvSelect').value;
    const coverNote = document.getElementById('applyCoverNote').value.trim();

    if (!cvDocId) {
        notify('Por favor selecciona tu CV para postularte.', 'error');
        return;
    }

    const btn = document.getElementById('btnSubmitApply');
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/offers/${offerId}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                cv_document_id: cvDocId,
                cover_note: coverNote || null
            })
        });

        if (!res.ok) throw new Error(await extractError(res, 'No se pudo enviar la postulación'));

        notify('¡Postulación enviada exitosamente!');
        closeApplyModal();
        await loadOffers();
    } catch (err) {
        notify(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// VER CANDIDATOS (SOLO ALUMNI / AUTOR DE LA OFERTA)
async function openApplicationsModal(offerId, offerTitle) {
    const token = sessionStorage.getItem('access_token');
    document.getElementById('modalOfferTitle').textContent = `Convocatoria: ${offerTitle}`;
    const list = document.getElementById('modalApplicantsList');
    list.innerHTML = `<p class="text-xs text-text-muted text-center py-6">Cargando candidatos...</p>`;
    document.getElementById('applicationsModal').classList.remove('hidden');

    try {
        const res = await fetch(`${API_URL}/offers/${offerId}/applications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(await extractError(res, 'No tienes autorización para ver los candidatos de esta oferta'));

        const apps = await res.json();
        if (apps.length === 0) {
            list.innerHTML = `
                <div class="text-center py-8 text-text-muted text-xs">
                    Aún no se ha postulado ningún candidato a esta oferta.
                </div>
            `;
            return;
        }

        list.innerHTML = apps.map(app => {
            const dateStr = formatRelativeTime(app.created_at);
            const initial = (app.applicant_name || 'U').charAt(0).toUpperCase();
            const avatarHtml = app.applicant_avatar ?
                `<img src="${app.applicant_avatar}" alt="Avatar" class="w-full h-full object-cover">` :
                initial;

            return `
                <div class="p-4 bg-surface-card rounded-xl border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-start gap-3">
                        <div class="avatar-circle avatar-sm">${avatarHtml}</div>
                        <div>
                            <div class="font-bold text-sm text-white">${escapeHtml(app.applicant_name || 'Candidato')}</div>
                            <div class="text-xs text-sky-400">${escapeHtml(app.applicant_email)}</div>
                            ${app.cover_note ? `<p class="text-xs text-slate-300 mt-2 bg-bg-canvas p-2.5 rounded border border-border-subtle italic">"${escapeHtml(app.cover_note)}"</p>` : ''}
                            <div class="text-[11px] text-text-muted mt-1.5">Postulado ${dateStr}</div>
                        </div>
                    </div>

                    <div class="self-end sm:self-center">
                        ${app.cv_document_id ? `
                            <button onclick="downloadCandidateCV('${app.cv_document_id}', '${escapeHtml(app.cv_filename || 'CV_Candidato')}')" class="btn-primary text-xs py-1.5 px-3">
                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                <span>Descargar CV</span>
                            </button>
                        ` : `
                            <span class="text-xs text-text-muted">Sin CV adjunto</span>
                        `}
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        list.innerHTML = `<div class="text-xs text-rose-400 text-center py-4">${err.message}</div>`;
    }
}

function closeApplicationsModal() {
    document.getElementById('applicationsModal').classList.add('hidden');
}

async function downloadCandidateCV(docId, filename) {
    downloadDocument(docId, filename);
}


// --- APARTADO 3: MI PERFIL & GESTIÓN DE CV ---
function displaySelectedFile(input) {
    const file = input.files[0];
    const btn = document.getElementById('btnUploadCV');
    const nameEl = document.getElementById('selectedFileName');
    if (file) {
        nameEl.textContent = `Archivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        btn.disabled = false;
    } else {
        nameEl.textContent = 'Haz clic para seleccionar tu CV (PDF, PNG, JPG)';
        btn.disabled = true;
    }
}

async function handleUploadDocument(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('access_token');
    const fileInput = document.getElementById('cvFileInput');
    const file = fileInput.files[0];
    if (!file) return;

    const btn = document.getElementById('btnUploadCV');
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/documents/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) throw new Error(await extractError(res, "Error al subir el archivo (comprueba que sea PDF/PNG/JPG menor a 5MB)"));

        const data = await res.json();
        notify(`Documento "${data.filename}" guardado correctamente.`);
        fileInput.value = '';
        displaySelectedFile(fileInput);
        await loadUserDocuments();
    } catch (err) {
        notify(err.message, 'error');
    } finally {
        btn.disabled = fileInput.files.length === 0;
    }
}

async function loadUserDocuments() {
    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    const list = document.getElementById('userDocsList');
    try {
        const res = await fetch(`${API_URL}/documents/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) return logout();
        if (!res.ok) throw new Error("Error al cargar documentos");

        const docs = await res.json();
        document.getElementById('docsCountBadge').textContent = docs.length;
        document.getElementById('stat-docs-count').textContent = docs.length;

        if (docs.length === 0) {
            list.innerHTML = `
                <li class="p-6 text-center text-text-muted text-xs bg-bg-canvas/50 rounded-lg border border-border-subtle">
                    No has subido ningún CV aún. Sube tu primer currículum para postularte a las ofertas.
                </li>
            `;
            return;
        }

        list.innerHTML = docs.map(doc => {
            const isPdf = doc.content_type?.includes('pdf') || doc.filename?.endsWith('.pdf');
            const dateStr = formatRelativeTime(doc.created_at);

            return `
                <li class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-surface-card rounded-xl border border-border-subtle gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-lg ${isPdf ? 'bg-rose-500/10 text-rose-400' : 'bg-sky-500/10 text-sky-400'} flex items-center justify-center flex-shrink-0">
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div>
                            <div class="font-semibold text-sm text-white">${escapeHtml(doc.filename)}</div>
                            <div class="text-[11px] text-text-muted mt-0.5">Subido ${dateStr}</div>
                        </div>
                    </div>

                    <button onclick="downloadDocument('${doc.id}', '${escapeHtml(doc.filename)}')" class="btn-primary text-xs py-1.5 px-3 self-end sm:self-center">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>Descargar</span>
                    </button>
                </li>
            `;
        }).join('');

    } catch (err) {
        list.innerHTML = `<li class="text-rose-400 text-xs text-center py-4">${err.message}</li>`;
    }
}

async function downloadDocument(id, filename) {
    const token = sessionStorage.getItem('access_token');
    try {
        notify("Descargando documento...");
        const res = await fetch(`${API_URL}/documents/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Acceso denegado o documento no encontrado");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || "documento_upc";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        notify("Documento descargado con éxito");
    } catch (err) {
        notify(err.message, 'error');
    }
}

// --- UTILS ---
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatRelativeTime(dateStr) {
    if (window.AlumniI18n) return window.AlumniI18n.relativeTime(dateStr);
    if (!dateStr) return 'hace unos momentos';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);

        if (diffSec < 60) return 'hace un momento';
        if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`;
        if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)} h`;
        if (diffSec < 604800) return `hace ${Math.floor(diffSec / 86400)} días`;
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
        return dateStr;
    }
}

document.querySelectorAll('.toggle-pass').forEach(button => setPasswordToggleState(button, false));

document.getElementById('auth-tabs').addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextTab = event.key === 'ArrowRight'
        ? document.getElementById('auth-tab-register')
        : document.getElementById('auth-tab-login');
    switchAuthTab(nextTab === document.getElementById('auth-tab-register') ? 'register' : 'login');
    nextTab.focus();
});

const mfaSetupModal = document.getElementById('mfaSetupModal');
mfaSetupModal.addEventListener('click', event => {
    if (event.target === mfaSetupModal) closeMfaSetupModal();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mfaSetupModal.classList.contains('hidden')) {
        closeMfaSetupModal();
    }
});

if (sessionStorage.getItem('access_token')) {
    setupDashboard();
}
