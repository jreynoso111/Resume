// --- CONFIGURACIÓN SUPABASE ---
const SUPABASE_URL = 'https://nqoyljwjmsscbiukeiqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xb3lsandqbXNzY2JpdWtlaXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDA5NDcsImV4cCI6MjA4MDgxNjk0N30.cjvblSPvkT6goAhjt-eHHjnl9VEcpDCpCBcohXeAxAU';

// Inicializamos el cliente (usamos 'sb' para evitar conflictos globales)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- FUNCIONES PRINCIPALES ---

/**
 * 1. Cargar y mostrar el PERFIL (Nombre, Bio, Título)
 */
async function loadProfile() {
    try {
        // Buscamos el primer registro de la tabla profile
        let { data, error } = await sb
            .from('profile')
            .select('*')
            .limit(1)
            .single();

        if (error) throw error;

        if (data) {
            // Asignamos los datos a los elementos HTML si existen
            setText('profile-name', data.full_name);
            setText('profile-headline', data.headline);
            setText('profile-bio', data.bio);
            
            // Si tuvieras ubicación o email en el HTML:
            // setText('profile-location', data.location);
            // setText('profile-email', data.email);
        }
    } catch (err) {
        console.error('Error cargando perfil:', err.message);
    }
}

/**
 * 2. Cargar y mostrar la EXPERIENCIA LABORAL
 */
async function loadExperience() {
    try {
        const container = document.getElementById('experience-container');
        if (!container) return; // Si no existe el contenedor en el HTML, salimos

        // Buscamos experiencias ordenadas por fecha de inicio (más reciente primero)
        let { data, error } = await sb
            .from('experience')
            .select('*')
            .order('start_date', { ascending: false });

        if (error) throw error;

        // Limpiamos el contenedor (quitamos el texto de "Cargando...")
        container.innerHTML = '';

        if (data.length === 0) {
            container.innerHTML = '<p>No hay experiencia registrada aún.</p>';
            return;
        }

        // Generamos el HTML para cada trabajo
        data.forEach(job => {
            const card = document.createElement('div');
            card.className = 'resume-item'; // Clase para darle estilo en tu CSS si quieres
            
            // Formatear fechas (Ej: "2023-01-01" -> "Ene 2023")
            const startStr = formatDate(job.start_date);
            const endStr = job.is_current ? 'Presente' : formatDate(job.end_date);

            card.innerHTML = `
                <div style="margin-bottom: 25px;">
                    <h3 style="margin-bottom: 5px;">${job.role}</h3>
                    <h4 style="color: #666; margin-top: 0;">
                        ${job.company} 
                        <span style="font-weight:normal; font-size: 0.9em; color: #888;">
                            | ${startStr} - ${endStr}
                        </span>
                    </h4>
                    <p style="white-space: pre-wrap;">${job.description || ''}</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            `;
            
            container.appendChild(card);
        });

    } catch (err) {
        console.error('Error cargando experiencia:', err.message);
        const container = document.getElementById('experience-container');
        if(container) container.innerHTML = '<p>Error cargando datos.</p>';
    }
}

// --- UTILIDADES ---

// Función auxiliar para cambiar texto de forma segura (evita errores si el ID no existe)
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text || '';
}

// Formateador de fechas simple (YYYY-MM-DD -> Mes Año)
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00'); // T00:00:00 evita problemas de zona horaria
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
}

// --- INICIALIZACIÓN ---

// Escuchamos cuando el HTML termine de cargar
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadExperience();
});
