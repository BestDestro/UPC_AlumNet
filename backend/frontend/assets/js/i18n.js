(() => {
    const messages = {
        'Comunidad & Empleo': ['Comunitat i ocupació', 'Community & Careers'],
        'AlumNET - Red de Talento y Empleo UPC': ['AlumNET - Xarxa de Talent i Ocupació UPC', 'AlumNET - Talent and Careers Network'],
        'AlumNET: red social universitaria, eventos, empleo y postulaciones profesionales para la comunidad UPC.': ['AlumNET: xarxa social universitària, esdeveniments, ocupació i candidatures professionals per a la comunitat UPC.', 'AlumNET: a university social network for events, jobs, and professional applications across the UPC community.'],
        'Feed Global': ['Feed global', 'Global feed'],
        'Empleo & Eventos': ['Feina i esdeveniments', 'Jobs & Events'],
        'Mi Perfil & CV': ['El meu perfil i CV', 'My Profile & CV'],
        'Comunidad': ['Comunitat', 'Community'],
        'Salir': ['Sortir', 'Log out'],
        'Usuario': ['Usuari', 'User'],
        'Student': ['Estudiant', 'Student'],
        'Administrator': ['Administrador', 'Administrator'],
        'Job': ['Feina', 'Job'],
        'Internship': ['Pràctiques', 'Internship'],
        'Opportunity': ['Oportunitat', 'Opportunity'],
        'Event': ['Esdeveniment', 'Event'],
        'La red profesional de la': ['La xarxa professional de la', 'The professional network of'],
        'Conecta con compañeros y titulados, accede a ofertas exclusivas de empleo y prácticas, y postúlate con tu CV.': ['Connecta amb companys i titulats, accedeix a ofertes exclusives de feina i pràctiques, i presenta-t’hi amb el teu CV.', 'Connect with fellow students and graduates, explore exclusive jobs and internships, and apply with your CV.'],
        'Feed social de toda la comunidad universitaria': ['Xarxa social de tota la comunitat universitària', 'Social feed for the entire university community'],
        'Bolsa de empleo y eventos de carrera profesional': ['Borsa de feina i esdeveniments professionals', 'Job board and career events'],
        'Gestión de CV y postulaciones directas': ['Gestió del CV i candidatures directes', 'CV management and direct applications'],
        'Acceso exclusivo para miembros con correo institucional UPC.': ['Accés exclusiu per a membres amb correu institucional UPC.', 'Exclusive access for members with a UPC institutional email.'],
        'Idioma': ['Llengua', 'Language'],
        'Iniciar sesión': ['Inicia sessió', 'Sign in'],
        'Registrarse': ['Registra’t', 'Register'],
        'Acceso a AlumNET': ['Accés a AlumNET', 'Sign in to AlumNET'],
        'Introduce tu correo institucional de la UPC.': ['Introdueix el teu correu institucional de la UPC.', 'Enter your UPC institutional email.'],
        'Correo institucional UPC': ['Correu institucional UPC', 'UPC institutional email'],
        'Acepta @estudiantat.upc.edu, @upc.edu o subdominios UPC.': ['S’accepten @estudiantat.upc.edu, @upc.edu o subdominis UPC.', 'Accepts @estudiantat.upc.edu, @upc.edu, or UPC subdomains.'],
        'Contraseña': ['Contrasenya', 'Password'],
        'Código de Verificación 2FA / MFA': ['Codi de verificació 2FA / MFA', '2FA / MFA verification code'],
        'Introduce el código de 6 dígitos generado en Google Authenticator, Microsoft Authenticator o Authy.': ['Introdueix el codi de 6 dígits de Google Authenticator, Microsoft Authenticator o Authy.', 'Enter the 6-digit code from Google Authenticator, Microsoft Authenticator, or Authy.'],
        'Usar código 2FA': ['Fes servir el codi 2FA', 'Use 2FA code'],
        'Ocultar código 2FA': ['Amaga el codi 2FA', 'Hide 2FA code'],
        'Verificar código 2FA': ['Verifica el codi 2FA', 'Verify 2FA code'],
        'Configurar 2FA': ['Configura el 2FA', 'Set up 2FA'],
        'Crear cuenta UPC': ['Crea un compte UPC', 'Create a UPC account'],
        'El rol seleccionado no está disponible para el registro.': ['El rol seleccionat no està disponible per al registre.', 'The selected role is not available for registration.'],
        'Únete a la comunidad de estudiantes y alumni.': ['Uneix-te a la comunitat d’estudiants i alumni.', 'Join the student and alumni community.'],
        'Nombre completo': ['Nom complet', 'Full name'],
        'Obligatorio: debe terminar en .upc.edu o @upc.edu': ['Obligatori: ha d’acabar en .upc.edu o @upc.edu', 'Required: must end in .upc.edu or @upc.edu'],
        'Perfil en la UPC': ['Perfil a la UPC', 'UPC profile'],
        'Estudiante': ['Estudiant', 'Student'],
        'Alumni': ['Alumni', 'Alumni'],
        'Titulado': ['Titulat', 'Graduate'],
        'Admin': ['Admin', 'Admin'],
        'Gestor': ['Gestor', 'Administrator'],
        'Crear cuenta': ['Crea un compte', 'Create account'],
        'Publicaciones': ['Publicacions', 'Posts'],
        'Documentos': ['Documents', 'Documents'],
        'Ver mi Perfil y CV': ['Mostra el meu perfil i CV', 'View my profile and CV'],
        'Comparte con la comunidad UPC': ['Comparteix amb la comunitat UPC', 'Share with the UPC community'],
        'Visible para todos los estudiantes, alumni y profesores': ['Visible per a tots els estudiants, alumni i professors', 'Visible to all students, alumni, and faculty'],
        'Publicar': ['Publica', 'Post'],
        'Publicaciones de la Comunidad': ['Publicacions de la comunitat', 'Community posts'],
        'Actualizar': ['Actualitza', 'Refresh'],
        'Cargando publicaciones...': ['Carregant publicacions...', 'Loading posts...'],
        'Eventos Oficiales UPC': ['Esdeveniments oficials UPC', 'Official UPC events'],
        'Publicados y gestionados por la Administración de la UPC.': ['Publicats i gestionats per l’administració de la UPC.', 'Published and managed by the UPC administration.'],
        'Cargando eventos desde la base de datos...': ['Carregant esdeveniments de la base de dades...', 'Loading events from the database...'],
        'Ver todos los eventos': ['Mostra tots els esdeveniments', 'View all events'],
        'Bolsa de Empleo, Prácticas y Eventos UPC': ['Borsa de feina, pràctiques i esdeveniments UPC', 'UPC jobs, internships, and events'],
        'Conecta directamente con ofertas y eventos de la comunidad UPC.': ['Connecta directament amb ofertes i esdeveniments de la comunitat UPC.', 'Connect directly with jobs and events from the UPC community.'],
        'Publicar Convocatoria': ['Publica una convocatòria', 'Post an opportunity'],
        'Todas': ['Totes', 'All'],
        'Empleos': ['Feines', 'Jobs'],
        'Prácticas': ['Pràctiques', 'Internships'],
        'Eventos UPC': ['Esdeveniments UPC', 'UPC events'],
        'Oportunidades': ['Oportunitats', 'Opportunities'],
        'Mis Ofertas Publicadas': ['Les meves ofertes publicades', 'My posted opportunities'],
        'Publicar Nueva Convocatoria': ['Publica una convocatòria nova', 'Post a new opportunity'],
        '✕ Cerrar': ['✕ Tanca', '✕ Close'],
        'Título *': ['Títol *', 'Title *'],
        'Empresa / Organizador *': ['Empresa / organitzador *', 'Company / organizer *'],
        'Tipo de Convocatoria *': ['Tipus de convocatòria *', 'Opportunity type *'],
        'Empleo (Job)': ['Feina (Job)', 'Job'],
        'Prácticas (Internship)': ['Pràctiques (Internship)', 'Internship'],
        'Oportunidad / Beca (Opportunity)': ['Oportunitat / beca (Opportunity)', 'Opportunity / scholarship'],
        'Evento UPC (Solo Admin)': ['Esdeveniment UPC (només admin)', 'UPC event (admins only)'],
        'Descripción detallada y requisitos *': ['Descripció detallada i requisits *', 'Detailed description and requirements *'],
        'Cancelar': ['Cancel·la', 'Cancel'],
        'Cargando convocatorias...': ['Carregant convocatòries...', 'Loading opportunities...'],
        'Cuenta Institucional UPC': ['Compte institucional UPC', 'UPC institutional account'],
        'Cambiar': ['Canvia', 'Change'],
        'Cambiar Foto': ['Canvia la foto', 'Change photo'],
        'Quitar foto': ['Elimina la foto', 'Remove photo'],
        'Rol en la UPC': ['Rol a la UPC', 'UPC role'],
        'Puesto actual': ['Càrrec actual', 'Current position'],
        'Empresa o institución': ['Empresa o institució', 'Company or institution'],
        'Ej.: Estudiante de Ingeniería': ['Ex.: Estudiant d’Enginyeria', 'E.g. Engineering student'],
        'Ej.: UPC, Empresa': ['Ex.: UPC, Empresa', 'E.g. UPC, Company'],
        'Encuentra estudiantes y alumni por nombre, puesto o empresa.': ['Troba estudiants i alumni per nom, càrrec o empresa.', 'Find students and alumni by name, position, or company.'],
        'Buscar personas...': ['Cerca persones...', 'Search people...'],
        'Cargando comunidad...': ['Carregant la comunitat...', 'Loading community...'],
        'No se encontraron miembros.': ['No s’han trobat membres.', 'No members found.'],
        'Perfil profesional pendiente de completar': ['Perfil professional pendent de completar', 'Professional profile not completed'],
        'Ver perfil': ['Mostra el perfil', 'View profile'],
        'Siguiendo': ['Seguint', 'Following'],
        'Seguir': ['Segueix', 'Follow'],
        'Dejar de seguir': ['Deixa de seguir', 'Unfollow'],
        'Contactar por email': ['Contacta per correu', 'Contact by email'],
        'Puesto:': ['Càrrec:', 'Position:'],
        'Empresa:': ['Empresa:', 'Company:'],
        'Este miembro aún no ha añadido una presentación.': ['Aquest membre encara no ha afegit una presentació.', 'This member has not added an introduction yet.'],
        'El cambio de perfil requiere aprobación administrativa.': ['El canvi de perfil requereix l’aprovació de l’administració.', 'Profile changes require admin approval.'],
        'Solicitar cambio de perfil': ['Sol·licita un canvi de perfil', 'Request a profile change'],
        'Solicitud pendiente': ['Sol·licitud pendent', 'Request pending'],
        'Perfil solicitado': ['Perfil sol·licitat', 'Requested profile'],
        'Justificación (mín. 15 caracteres)': ['Justificació (mín. 15 caràcters)', 'Reason (at least 15 characters)'],
        'Explica por qué necesitas cambiar tu perfil...': ['Explica per què necessites canviar el perfil...', 'Explain why you need to change your profile...'],
        'Enviar solicitud': ['Envia la sol·licitud', 'Submit request'],
        'Solicitudes de cambio de perfil': ['Sol·licituds de canvi de perfil', 'Profile change requests'],
        'Revisa la justificación antes de aprobar.': ['Revisa la justificació abans d’aprovar.', 'Review the reason before approving.'],
        'Cargando solicitudes...': ['Carregant sol·licituds...', 'Loading requests...'],
        'No hay solicitudes pendientes.': ['No hi ha sol·licituds pendents.', 'No pending requests.'],
        'Rechazar': ['Rebutja', 'Reject'],
        'Aprobar': ['Aprova', 'Approve'],
        'Nota de administración:': ['Nota de l’administració:', 'Admin note:'],
        'La justificación debe tener al menos 15 caracteres.': ['La justificació ha de tenir almenys 15 caràcters.', 'The reason must be at least 15 characters.'],
        'Solicitud enviada para revisión administrativa.': ['Sol·licitud enviada a l’administració per revisar-la.', 'Request sent for admin review.'],
        'Cambio de perfil aprobado.': ['Canvi de perfil aprovat.', 'Profile change approved.'],
        'Solicitud rechazada.': ['Sol·licitud rebutjada.', 'Request rejected.'],
        'No se pudo cargar la comunidad.': ['No s’ha pogut carregar la comunitat.', 'Could not load the community.'],
        'No se pudo cargar el perfil.': ['No s’ha pogut carregar el perfil.', 'Could not load the profile.'],
        'No se pudo actualizar el seguimiento.': ['No s’ha pogut actualitzar el seguiment.', 'Could not update following status.'],
        'No se pudo enviar la solicitud.': ['No s’ha pogut enviar la sol·licitud.', 'Could not submit the request.'],
        'No se pudo cargar el estado de la solicitud.': ['No s’ha pogut carregar l’estat de la sol·licitud.', 'Could not load request status.'],
        'No se pudieron cargar las solicitudes.': ['No s’han pogut carregar les sol·licituds.', 'Could not load requests.'],
        'No se pudo revisar la solicitud.': ['No s’ha pogut revisar la sol·licitud.', 'Could not review the request.'],
        'Only Student and Alumni can request this change': ['Només Student i Alumni poden sol·licitar aquest canvi', 'Only Student and Alumni can request this change'],
        'The requested role must be different from your current role': ['El perfil sol·licitat ha de ser diferent de l’actual', 'The requested role must be different from your current role'],
        'You already have a pending role change request': ['Ja tens una sol·licitud de canvi de perfil pendent', 'You already have a pending profile change request'],
        'Only Student and Alumni accounts can edit their profile': ['Només els comptes Student i Alumni poden editar el perfil', 'Only Student and Alumni accounts can edit their profile'],
        'Administrator accounts cannot upload CVs': ['Els comptes d’administració no poden pujar CV', 'Administrator accounts cannot upload CVs'],
        'Tipo de cuenta': ['Tipus de compte', 'Account type'],
        'Puedes cambiar entre Student y Alumni.': ['Pots canviar entre Student i Alumni.', 'You can switch between Student and Alumni.'],
        'Cambiar a Alumni': ['Canvia a Alumni', 'Switch to Alumni'],
        'Cambiar a Student': ['Canvia a Student', 'Switch to Student'],
        'Tu cuenta ahora es Alumni.': ['El teu compte ara és Alumni.', 'Your account is now Alumni.'],
        'Tu cuenta ahora es Student.': ['El teu compte ara és Student.', 'Your account is now Student.'],
        'No se pudo cambiar el tipo de cuenta.': ['No s’ha pogut canviar el tipus de compte.', 'Could not change account type.'],
        'ID de Usuario': ['ID d’usuari', 'User ID'],
        'Subir CV': ['Puja el CV', 'Upload CV'],
        'Titular & Resumen Profesional': ['Titular i resum professional', 'Headline & professional summary'],
        'Guardar': ['Desa', 'Save'],
        'Visible en tu perfil para empresas y reclutadores de la red UPC.': ['Visible al teu perfil per a empreses i reclutadors de la xarxa UPC.', 'Visible on your profile to companies and recruiters in the UPC network.'],
        'Seguridad 2FA / MFA': ['Seguretat 2FA / MFA', '2FA / MFA security'],
        'Inactivo': ['Inactiu', 'Inactive'],
        'Añade una capa de protección a tu cuenta vinculando Google Authenticator, Microsoft Authenticator o Authy mediante código QR.': ['Afegeix una capa de protecció al compte vinculant Google Authenticator, Microsoft Authenticator o Authy amb un codi QR.', 'Add a layer of protection by linking Google Authenticator, Microsoft Authenticator, or Authy with a QR code.'],
        'Configurar con Código QR': ['Configura amb codi QR', 'Set up with QR code'],
        'Desactivar 2FA': ['Desactiva el 2FA', 'Disable 2FA'],
        'Curriculum Vitae y Documentos': ['Currículum i documents', 'CV and documents'],
        'Sube tu CV en PDF o imagen para postularte a ofertas y oportunidades laborales.': ['Puja el teu CV en PDF o imatge per presentar-te a ofertes i oportunitats laborals.', 'Upload your CV as a PDF or image to apply for jobs and opportunities.'],
        'Haz clic para seleccionar tu CV (PDF, PNG, JPG)': ['Fes clic per seleccionar el teu CV (PDF, PNG, JPG)', 'Click to select your CV (PDF, PNG, JPG)'],
        'Tamaño máximo: 5 MB': ['Mida màxima: 5 MB', 'Maximum size: 5 MB'],
        'Subir y Guardar CV': ['Puja i desa el CV', 'Upload and save CV'],
        'Mis Documentos y CVs Subidos': ['Els meus documents i CV pujats', 'My uploaded documents and CVs'],
        'Refrescar': ['Actualitza', 'Refresh'],
        'Cargando documentos...': ['Carregant documents...', 'Loading documents...'],
        'Candidatos Postulados': ['Candidats inscrits', 'Applicants'],
        'Cargando oferta...': ['Carregant oferta...', 'Loading opportunity...'],
        'Cargando candidatos...': ['Carregant candidats...', 'Loading applicants...'],
        'Postularme al puesto': ['Presenta-m’hi', 'Apply for this position'],
        'Título de la oferta': ['Títol de l’oferta', 'Opportunity title'],
        'Empresa': ['Empresa', 'Company'],
        'Selecciona tu CV *': ['Selecciona el teu CV *', 'Select your CV *'],
        'Cargando tus CVs...': ['Carregant els teus CV...', 'Loading your CVs...'],
        'El autor del puesto podrá descargar y revisar este documento.': ['L’autor de l’oferta podrà descarregar i revisar aquest document.', 'The author of the opportunity can download and review this document.'],
        'Mensaje o carta de presentación (opcional)': ['Missatge o carta de presentació (opcional)', 'Message or cover letter (optional)'],
        'Enviar Postulación': ['Envia la candidatura', 'Submit application'],
        'Eliminar Convocatoria': ['Elimina la convocatòria', 'Delete opportunity'],
        '¿Estás seguro de que deseas retirar esta convocatoria de la plataforma?': ['Segur que vols retirar aquesta convocatòria de la plataforma?', 'Are you sure you want to remove this opportunity from the platform?'],
        'Motivo de eliminación *': ['Motiu de l’eliminació *', 'Reason for deletion *'],
        'Este motivo quedará registrado en el historial de moderación.': ['Aquest motiu quedarà registrat a l’historial de moderació.', 'This reason will be recorded in the moderation history.'],
        'Confirmar Eliminación': ['Confirma l’eliminació', 'Confirm deletion'],
        'Vincular Autenticación en Dos Pasos (MFA)': ['Vincula l’autenticació en dos passos (MFA)', 'Link two-factor authentication (MFA)'],
        'Google Authenticator, Microsoft Authenticator o Authy': ['Google Authenticator, Microsoft Authenticator o Authy', 'Google Authenticator, Microsoft Authenticator, or Authy'],
        'Introduce tus credenciales institucionales UPC para generar el código QR de vinculación único para tu cuenta.': ['Introdueix les credencials institucionals UPC per generar el codi QR únic del teu compte.', 'Enter your UPC institutional credentials to generate a unique QR code for your account.'],
        'Generar Código QR': ['Genera el codi QR', 'Generate QR code'],
        '1. Escanea este código QR con tu aplicación Authenticator:': ['1. Escaneja aquest codi QR amb l’aplicació Authenticator:', '1. Scan this QR code with your authenticator app:'],
        '¿No puedes escanear? Clave manual:': ['No el pots escanejar? Clau manual:', 'Can’t scan it? Enter the key manually:'],
        'Copiar': ['Copia', 'Copy'],
        '2. Introduce el código de 6 dígitos para confirmar:': ['2. Introdueix el codi de 6 dígits per confirmar:', '2. Enter the 6-digit code to confirm:'],
        'El código cambia cada 30 segundos en tu móvil.': ['El codi canvia cada 30 segons al mòbil.', 'The code changes every 30 seconds on your phone.'],
        '← Volver': ['← Enrere', '← Back'],
        'Cerrar': ['Tanca', 'Close'],
        'Activar 2FA e Iniciar Sesión': ['Activa el 2FA i inicia sessió', 'Enable 2FA and sign in'],
        'Mostrar contraseña': ['Mostra la contrasenya', 'Show password'],
        'Ocultar contraseña': ['Amaga la contrasenya', 'Hide password'],
        'Acceso o registro': ['Accés o registre', 'Sign in or register'],
        'Mínimo 8 caracteres': ['Mínim 8 caràcters', 'At least 8 characters'],
        '¿Qué novedad, proyecto o consulta quieres compartir hoy?...': ['Quina novetat, projecte o consulta vols compartir avui?...', 'What news, project, or question would you like to share today?...'],
        'Buscar por título o empresa...': ['Cerca per títol o empresa...', 'Search by title or company...'],
        'Ej: Tech Career Day UPC / Junior Pentester': ['Ex.: Tech Career Day UPC / Junior Pentester', 'E.g. Tech Career Day UPC / Junior Pentester'],
        'Ej: UPC FIB / Google / SEAT': ['Ex.: UPC FIB / Google / SEAT', 'E.g. UPC FIB / Google / SEAT'],
        'Describe los requisitos técnicos, agenda, modalidad o condiciones...': ['Descriu els requisits tècnics, l’agenda, la modalitat o les condicions...', 'Describe the technical requirements, schedule, format, or conditions...'],
        'Escribe un breve resumen de tus estudios, tecnologías y áreas de interés profesional...': ['Escriu un breu resum dels estudis, les tecnologies i les àrees d’interès professional...', 'Write a short summary of your studies, technologies, and professional interests...'],
        'Explica brevemente por qué encajas en este puesto...': ['Explica breument per què encaixes en aquesta posició...', 'Briefly explain why you are a good fit for this position...'],
        'Indica el motivo (ej: Plazas cubiertas, oferta duplicada, no cumple las directrices...)': ['Indica el motiu (p. ex.: places cobertes, oferta duplicada o incompliment de les directrius...)', 'Enter a reason (e.g. position filled, duplicate listing, or policy violation...)'],
        'Cambiar foto de perfil': ['Canvia la foto de perfil', 'Change profile photo'],
        'Código QR MFA': ['Codi QR MFA', 'MFA QR code'],
        'Ver mi perfil': ['Mostra el meu perfil', 'View my profile'],
        'Cerrar sesión': ['Tanca la sessió', 'Sign out'],
        'Aún no hay publicaciones': ['Encara no hi ha publicacions', 'No posts yet'],
        'Sé el primero en compartir un proyecto o noticia con la comunidad UPC.': ['Sigues el primer a compartir un projecte o una notícia amb la comunitat UPC.', 'Be the first to share a project or news with the UPC community.'],
        'Eliminar': ['Elimina', 'Delete'],
        'Te gusta': ['T’agrada', 'Liked'],
        'Me gusta': ['M’agrada', 'Like'],
        'Comunidad UPC': ['Comunitat UPC', 'UPC community'],
        'No hay eventos oficiales programados actualmente.': ['Ara mateix no hi ha esdeveniments oficials programats.', 'There are no official events scheduled right now.'],
        'Evento UPC': ['Esdeveniment UPC', 'UPC event'],
        'No hay convocatorias que coincidan': ['No hi ha convocatòries coincidents', 'No matching opportunities'],
        'Prueba a seleccionar otro filtro o término de búsqueda.': ['Prova un altre filtre o terme de cerca.', 'Try another filter or search term.'],
        'Tu publicación': ['La teva publicació', 'Your post'],
        'Ya postulado': ['Ja t’hi has inscrit', 'Applied'],
        'Postularme con mi CV': ['Presentar-m’hi amb el CV', 'Apply with my CV'],
        'Inscribirme al Evento': ['Inscriu-m’hi', 'Register for event'],
        'Borrar (con motivo)': ['Elimina (amb motiu)', 'Delete (with reason)'],
        'Convocatoria Abierta': ['Convocatòria oberta', 'Open opportunity'],
        'No hay ofertas': ['No hi ha ofertes', 'No opportunities'],
        'Aún no se ha postulado ningún candidato a esta oferta.': ['Encara no s’ha presentat cap candidat a aquesta oferta.', 'No one has applied to this opportunity yet.'],
        'Sin CV adjunto': ['Sense CV adjunt', 'No CV attached'],
        'Descargar CV': ['Descarrega el CV', 'Download CV'],
        'Descargar': ['Descarrega', 'Download'],
        'No has subido ningún CV aún': ['Encara no has pujat cap CV', 'You have not uploaded a CV yet'],
        'Debes subir al menos un CV en "Mi Perfil" antes de postularte.': ['Has de pujar almenys un CV a «El meu perfil» abans de presentar-t’hi.', 'Upload at least one CV in “My Profile” before applying.'],
        'No has subido ningún CV aún. Sube tu primer currículum para postularte a las ofertas.': ['Encara no has pujat cap CV. Puja el primer currículum per presentar-te a les ofertes.', 'You have not uploaded a CV yet. Upload your first CV to apply for opportunities.'],
        'Subido': ['Pujat', 'Uploaded'],
        'Descargando documento...': ['Descarregant document...', 'Downloading document...'],
        'Acceso denegado o documento no encontrado': ['Accés denegat o document no trobat', 'Access denied or document not found'],
        'Documento descargado con éxito': ['Document descarregat correctament', 'Document downloaded successfully'],
        'Introduce tu correo institucional UPC (@upc.edu o subdominios).': ['Introdueix el correu institucional UPC (@upc.edu o subdominis).', 'Enter your UPC institutional email (@upc.edu or a subdomain).'],
        'Introduce tu contraseña.': ['Introdueix la contrasenya.', 'Enter your password.'],
        'No se pudo generar el código QR. Revisa tus credenciales.': ['No s’ha pogut generar el codi QR. Revisa les credencials.', 'Could not generate the QR code. Check your credentials.'],
        'Error al generar el setup de MFA': ['Error en generar la configuració MFA', 'Could not create the MFA setup'],
        'Clave secreta copiada al portapapeles': ['Clau secreta copiada al porta-retalls', 'Secret key copied to clipboard'],
        'Introduce el código numérico de 6 dígitos que muestra tu app.': ['Introdueix el codi numèric de 6 dígits que mostra l’aplicació.', 'Enter the 6-digit code shown in your app.'],
        'Introduce el código 2FA de 6 dígitos.': ['Introdueix el codi 2FA de 6 dígits.', 'Enter the 6-digit 2FA code.'],
        'Código MFA incorrecto o expirado.': ['El codi MFA és incorrecte o ha caducat.', 'The MFA code is incorrect or expired.'],
        'Código MFA incorrecto o credenciales no válidas.': ['El codi MFA és incorrecte o les credencials no són vàlides.', 'The MFA code or credentials are invalid.'],
        '¡2FA activado correctamente en tu cuenta!': ['S’ha activat el 2FA al compte.', '2FA has been enabled on your account.'],
        '¡MFA activado con éxito! Sesión iniciada.': ['MFA activat correctament. Has iniciat la sessió.', 'MFA enabled. You are now signed in.'],
        'No se pudo desactivar el MFA.': ['No s’ha pogut desactivar l’MFA.', 'Could not disable MFA.'],
        'Autenticación en dos pasos desactivada': ['Autenticació en dos passos desactivada', 'Two-factor authentication disabled'],
        'Acceso denegado: debes utilizar un correo de la UPC (@upc.edu o subdominios como @estudiantat.upc.edu).': ['Accés denegat: has d’utilitzar un correu UPC (@upc.edu o subdominis com @estudiantat.upc.edu).', 'Access denied: use a UPC email (@upc.edu or a subdomain such as @estudiantat.upc.edu).'],
        '🔐 Tu cuenta tiene activada la autenticación en dos pasos. Introduce el código de 6 dígitos generado en tu aplicación Authenticator.': ['🔐 El compte té activada l’autenticació en dos passos. Introdueix el codi de 6 dígits de l’aplicació Authenticator.', '🔐 Two-factor authentication is enabled. Enter the 6-digit code from your authenticator app.'],
        '¡Acceso completado con 2FA / MFA!': ['Accés completat amb 2FA / MFA!', 'Signed in with 2FA / MFA!'],
        '¡Bienvenido a AlumNET!': ['Et donem la benvinguda a AlumNET!', 'Welcome to AlumNET!'],
        'Introduce tu nombre completo.': ['Introdueix el nom complet.', 'Enter your full name.'],
        'Solo se permite el registro con correo oficial de la UPC (@estudiantat.upc.edu o @upc.edu).': ['Només es permet el registre amb un correu oficial UPC (@estudiantat.upc.edu o @upc.edu).', 'Registration requires an official UPC email (@estudiantat.upc.edu or @upc.edu).'],
        'La contraseña debe tener al menos 8 caracteres.': ['La contrasenya ha de tenir almenys 8 caràcters.', 'Password must be at least 8 characters.'],
        'No se pudo completar el registro. ¿El correo ya existe?': ['No s’ha pogut completar el registre. Potser el correu ja existeix?', 'Registration failed. Does this email already exist?'],
        'Publicar Oferta o Evento': ['Publica una oferta o un esdeveniment', 'Post a job or event'],
        'Publicar Oferta': ['Publica una oferta', 'Post a job'],
        'Regenerar Código QR': ['Regenera el codi QR', 'Regenerate QR code'],
        'Formato de imagen no soportado. Usa PNG o JPG.': ['Format d’imatge no admès. Fes servir PNG o JPG.', 'Unsupported image format. Use PNG or JPG.'],
        'La imagen excede el límite de 4 MB.': ['La imatge supera el límit de 4 MB.', 'Image exceeds the 4 MB limit.'],
        'Error al guardar la foto de perfil': ['Error en desar la foto de perfil', 'Could not save profile photo'],
        'Foto de perfil actualizada correctamente': ['Foto de perfil actualitzada correctament', 'Profile photo updated'],
        'Error al eliminar la foto': ['Error en eliminar la foto', 'Could not remove photo'],
        'Foto de perfil restaurada al avatar por defecto': ['S’ha restaurat l’avatar predeterminat', 'Profile photo reset to the default avatar'],
        'Resumen profesional guardado': ['Resum professional desat', 'Professional summary saved'],
        'Error al cargar publicaciones': ['Error en carregar les publicacions', 'Could not load posts'],
        'No se pudo publicar': ['No s’ha pogut publicar', 'Could not publish'],
        '¡Publicación compartida con la comunidad!': ['Publicació compartida amb la comunitat!', 'Post shared with the community!'],
        '¿Deseas eliminar esta publicación?': ['Vols eliminar aquesta publicació?', 'Do you want to delete this post?'],
        'No se pudo eliminar la publicación': ['No s’ha pogut eliminar la publicació', 'Could not delete post'],
        'Publicación eliminada': ['Publicació eliminada', 'Post deleted'],
        'Error al dar like': ['Error en indicar que t’agrada', 'Could not like this post'],
        'Enlace directo a la publicación copiado al portapapeles': ['Enllaç directe a la publicació copiat al porta-retalls', 'Direct post link copied to clipboard'],
        'Enlace directo a la oferta copiado al portapapeles': ['Enllaç directe a l’oferta copiat al porta-retalls', 'Direct opportunity link copied to clipboard'],
        'Error al obtener ofertas': ['Error en obtenir les ofertes', 'Could not load opportunities'],
        'Compartir enlace directo': ['Comparteix l’enllaç directe', 'Share direct link'],
        'Copiar enlace directo': ['Copia l’enllaç directe', 'Copy direct link'],
        'Compartir': ['Comparteix', 'Share'],
        'Ver Candidatos': ['Mostra els candidats', 'View applicants'],
        'Publicado': ['Publicat', 'Posted'],
        'por': ['per', 'by'],
        '¿Seguro que deseas eliminar la oferta?': ['Segur que vols eliminar l’oferta?', 'Are you sure you want to delete this opportunity?'],
        'No tienes autorización para ver los candidatos de esta oferta': ['No tens autorització per veure els candidats d’aquesta oferta', 'You are not authorized to view applicants for this opportunity'],
        'Error al preparar la postulación': ['Error en preparar la candidatura', 'Could not prepare your application'],
        'Por favor selecciona tu CV para postularte.': ['Selecciona el teu CV per presentar-t’hi.', 'Select your CV before applying.'],
        'No se pudo enviar la postulación': ['No s’ha pogut enviar la candidatura', 'Could not submit application'],
        '¡Postulación enviada exitosamente!': ['Candidatura enviada correctament!', 'Application submitted successfully!'],
        'Convocatoria:': ['Convocatòria:', 'Opportunity:'],
        'Archivo:': ['Fitxer:', 'File:'],
        'Error al subir el archivo (comprueba que sea PDF/PNG/JPG menor a 5MB)': ['Error en pujar el fitxer (ha de ser PDF/PNG/JPG i tenir menys de 5 MB)', 'Upload failed (file must be PDF/PNG/JPG and under 5 MB)'],
        'Documento': ['Document', 'Document'],
        'guardado correctamente.': ['desat correctament.', 'saved successfully.'],
        'Error al cargar documentos': ['Error en carregar els documents', 'Could not load documents'],
        'Introduzca': ['Introdueix', 'Enter'],
        'hace un momento': ['fa un moment', 'just now'],
        'hace unos momentos': ['fa uns moments', 'moments ago']
    };

    const locales = { es: 'es-ES', ca: 'ca-ES', en: 'en-GB' };
    const textSources = new WeakMap();
    const attributeSources = new WeakMap();
    const supportedLanguages = ['es', 'ca', 'en'];

    let language = 'es';
    try {
        const savedLanguage = localStorage.getItem('alumniconnect-language');
        if (supportedLanguages.includes(savedLanguage)) language = savedLanguage;
    } catch (_) {}

    function translateRelativeTime(value, targetLanguage) {
        const patterns = [
            [/^hace (\d+) min$/, (count) => targetLanguage === 'ca' ? `fa ${count} min` : `${count} min ago`],
            [/^hace (\d+) h$/, (count) => targetLanguage === 'ca' ? `fa ${count} h` : `${count} hr ago`],
            [/^hace (\d+) días$/, (count) => targetLanguage === 'ca' ? `fa ${count} dies` : `${count} days ago`],
            [/^fa (\d+) min$/, (count) => targetLanguage === 'en' ? `${count} min ago` : `fa ${count} min`],
            [/^fa (\d+) h$/, (count) => targetLanguage === 'en' ? `${count} hr ago` : `fa ${count} h`],
            [/^fa (\d+) dies$/, (count) => targetLanguage === 'en' ? `${count} days ago` : `fa ${count} dies`],
            [/^(\d+) min ago$/, (count) => targetLanguage === 'ca' ? `fa ${count} min` : `${count} min ago`],
            [/^(\d+) hr ago$/, (count) => targetLanguage === 'ca' ? `fa ${count} h` : `${count} hr ago`],
            [/^(\d+) days ago$/, (count) => targetLanguage === 'ca' ? `fa ${count} dies` : `${count} days ago`]
        ];
        for (const [pattern, format] of patterns) {
            const match = value.match(pattern);
            if (match) return format(match[1]);
        }
        return translate(value, targetLanguage);
    }

    function translateDynamic(value, targetLanguage) {
        let match = value.match(/^(Publicado|Publicat|Posted) (.+?)(?: (por|per|by) (.+))?$/);
        if (match) {
            const date = translateRelativeTime(match[2], targetLanguage);
            const author = match[4] ? ` ${targetLanguage === 'ca' ? 'per' : targetLanguage === 'en' ? 'by' : 'por'} ${match[4]}` : '';
            const prefix = targetLanguage === 'ca' ? 'Publicat' : targetLanguage === 'en' ? 'Posted' : 'Publicado';
            return `${prefix} ${date}${author}`;
        }

        match = value.match(/^(Subido|Pujat|Uploaded) (.+)$/);
        if (match) {
            const prefix = targetLanguage === 'ca' ? 'Pujat' : targetLanguage === 'en' ? 'Uploaded' : 'Subido';
            return `${prefix} ${translateRelativeTime(match[2], targetLanguage)}`;
        }

        match = value.match(/^(Postulado|Postulat|Applied) (.+)$/);
        if (match) {
            const prefix = targetLanguage === 'ca' ? 'Presentat' : targetLanguage === 'en' ? 'Applied' : 'Postulado';
            return `${prefix} ${translateRelativeTime(match[2], targetLanguage)}`;
        }

        match = value.match(/^Archivo: (.+) \((.+) KB\)$/);
        if (match) return `${targetLanguage === 'ca' ? 'Fitxer' : targetLanguage === 'en' ? 'File' : 'Archivo'}: ${match[1]} (${match[2]} KB)`;

        match = value.match(/^Convocatoria: (.+)$/);
        if (match) return `${targetLanguage === 'ca' ? 'Convocatòria' : targetLanguage === 'en' ? 'Opportunity' : 'Convocatoria'}: ${match[1]}`;

        match = value.match(/^Ver Candidatos \((\d+)\)$/);
        if (match) return `${targetLanguage === 'ca' ? 'Mostra els candidats' : targetLanguage === 'en' ? 'View applicants' : 'Ver Candidatos'} (${match[1]})`;

        match = value.match(/^Copia la clave: (.+)$/);
        if (match) return `${targetLanguage === 'ca' ? 'Copia aquesta clau' : targetLanguage === 'en' ? 'Copy this key' : 'Copia la clave'}: ${match[1]}`;

        match = value.match(/^¿Seguro que deseas eliminar la convocatoria "(.+)"\?$/);
        if (match) return targetLanguage === 'ca'
            ? `Segur que vols eliminar la convocatòria «${match[1]}»?`
            : `Are you sure you want to delete the opportunity “${match[1]}”?`;

        match = value.match(/^Documento "(.+)" guardado correctamente\.$/);
        if (match) return targetLanguage === 'ca'
            ? `Document «${match[1]}» desat correctament.`
            : `Document “${match[1]}” saved successfully.`;

        match = value.match(/^Pendiente: solicitud para cambiar a (Student|Alumni)\.$/);
        if (match) return targetLanguage === 'ca'
            ? `Pendent: sol·licitud per canviar a ${match[1]}.`
            : `Pending: request to change to ${match[1]}.`;

        match = value.match(/^Aprobada: ahora tu perfil es (Student|Alumni)\.$/);
        if (match) return targetLanguage === 'ca'
            ? `Aprovada: ara el teu perfil és ${match[1]}.`
            : `Approved: your profile is now ${match[1]}.`;

        match = value.match(/^Rechazada: solicitud para cambiar a (Student|Alumni)\.$/);
        if (match) return targetLanguage === 'ca'
            ? `Rebutjada: sol·licitud per canviar a ${match[1]}.`
            : `Rejected: request to change to ${match[1]}.`;

        match = value.match(/^(\d+) seguidores · (\d+) siguiendo$/);
        if (match) return targetLanguage === 'ca'
            ? `${match[1]} seguidors · ${match[2]} seguits`
            : `${match[1]} followers · ${match[2]} following`;

        match = value.match(/^(\d+) seguidores · (\d+) siguiendo$/);
        if (match) return targetLanguage === 'ca'
            ? `${match[1]} seguidors · ${match[2]} seguits`
            : `${match[1]} followers · ${match[2]} following`;

        match = value.match(/^Pendiente: solicitud para cambiar a (Student|Alumni)\.$/);
        if (match) return targetLanguage === 'ca'
            ? `Pendent: sol·licitud per canviar a ${match[1]}.`
            : `Pending: request to change to ${match[1]}.`;

        match = value.match(/^Aprobada: ahora tu perfil es (Student|Alumni)\.$/);
        if (match) return targetLanguage === 'ca'
            ? `Aprovada: el perfil ara és ${match[1]}.`
            : `Approved: your profile is now ${match[1]}.`;

        match = value.match(/^Rechazada: solicitud para cambiar a (Student|Alumni)\.$/);
        if (match) return targetLanguage === 'ca'
            ? `Rebutjada: sol·licitud per canviar a ${match[1]}.`
            : `Rejected: request to change to ${match[1]}.`;

        if (value.startsWith('Error: ')) {
            return `${targetLanguage === 'ca' ? 'Error' : 'Error'}: ${translate(value.slice(7), targetLanguage)}`;
        }
        return value;
    }

    function translate(value, targetLanguage = language) {
        if (targetLanguage === 'es') return value;
        const entry = messages[value];
        if (entry) return entry[targetLanguage === 'ca' ? 0 : 1];
        return translateDynamic(value, targetLanguage);
    }

    function translateTextNode(node) {
        if (!textSources.has(node)) textSources.set(node, node.nodeValue);
        const source = textSources.get(node);
        if (node.parentElement?.closest('[data-no-translate]')) {
            if (node.nodeValue !== source) node.nodeValue = source;
            return;
        }
        const trimmed = source.trim();
        if (!trimmed) return;
        const leading = source.slice(0, source.indexOf(trimmed));
        const trailing = source.slice(source.indexOf(trimmed) + trimmed.length);
        const normalized = trimmed.replace(/\s+/g, ' ');
        if (language === 'es') {
            if (node.nodeValue !== source) node.nodeValue = source;
            return;
        }
        const translated = `${leading}${translate(normalized)}${trailing}`;
        if (translated === `${leading}${normalized}${trailing}`) {
            if (node.nodeValue !== source) node.nodeValue = source;
            return;
        }
        if (node.nodeValue !== translated) node.nodeValue = translated;
    }

    function translateAttributes(element) {
        const attributes = ['placeholder', 'title', 'aria-label', 'alt'];
        let sources = attributeSources.get(element);
        if (!sources) {
            sources = new Map();
            attributeSources.set(element, sources);
        }
        for (const attribute of attributes) {
            if (!element.hasAttribute(attribute)) continue;
            if (!sources.has(attribute)) sources.set(attribute, element.getAttribute(attribute));
            const translated = translate(sources.get(attribute));
            if (element.getAttribute(attribute) !== translated) element.setAttribute(attribute, translated);
        }
    }

    function translateTree(root) {
        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root);
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
        if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) translateTextNode(walker.currentNode);
        if (root.querySelectorAll) root.querySelectorAll('*').forEach(translateAttributes);
    }

    function setLanguage(nextLanguage) {
        if (!supportedLanguages.includes(nextLanguage)) return;
        language = nextLanguage;
        document.documentElement.lang = language;
        document.title = translate('AlumNET - Red de Talento y Empleo UPC');
        const description = document.querySelector('meta[name="description"]');
        if (description) description.content = translate('AlumNET: red social universitaria, eventos, empleo y postulaciones profesionales para la comunidad UPC.');
        const selector = document.getElementById('languageSelector');
        if (selector) selector.value = language;
        try {
            localStorage.setItem('alumniconnect-language', language);
        } catch (_) {}
        translateTree(document.body);
    }

    function relativeTime(dateString) {
        if (!dateString) return translate('hace unos momentos');
        try {
            const date = new Date(dateString);
            const difference = Math.floor((Date.now() - date.getTime()) / 1000);
            if (difference < 60) return translate('hace un momento');
            if (difference < 3600) {
                const count = Math.floor(difference / 60);
                return language === 'es' ? `hace ${count} min` : language === 'ca' ? `fa ${count} min` : `${count} min ago`;
            }
            if (difference < 86400) {
                const count = Math.floor(difference / 3600);
                return language === 'es' ? `hace ${count} h` : language === 'ca' ? `fa ${count} h` : `${count} hr ago`;
            }
            if (difference < 604800) {
                const count = Math.floor(difference / 86400);
                return language === 'es' ? `hace ${count} días` : language === 'ca' ? `fa ${count} dies` : `${count} days ago`;
            }
            return date.toLocaleDateString(locales[language], { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (_) {
            return dateString;
        }
    }

    const selector = document.getElementById('languageSelector');
    if (selector) selector.addEventListener('change', () => setLanguage(selector.value));
    document.documentElement.lang = language;
    document.title = translate('AlumNET - Red de Talento y Empleo UPC');
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = translate('AlumNET: red social universitaria, eventos, empleo y postulaciones profesionales para la comunidad UPC.');
    if (selector) selector.value = language;
    translateTree(document.body);

    const observer = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'characterData') translateTextNode(record.target);
            if (record.type === 'attributes') translateAttributes(record.target);
            if (record.type === 'childList') record.addedNodes.forEach(translateTree);
        }
    });
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'],
        characterData: true,
        childList: true,
        subtree: true
    });

    window.AlumniI18n = {
        getLanguage: () => language,
        relativeTime,
        setLanguage,
        translate
    };
})();