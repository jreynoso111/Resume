// --- SUPABASE CONFIG ---
// Loaded from ../js/supabase-config.js (never ship the service_role key to the browser).
const SUPABASE_URL = (window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.url) || '';
const SUPABASE_KEY = (window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.anonKey) || '';
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase configuration (check js/supabase-config.js).');
}

// Initialize the client (use "sb" to avoid global name conflicts).
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- MAIN FUNCTIONS ---

/**
 * 1) Load and render profile fields.
 */
async function loadProfile() {
    try {
        // Fetch the single profile row.
        let { data, error } = await sb
            .from('profile')
            .select('*')
            .limit(1)
            .single();

        if (error) throw error;

        if (data) {
            // Assign values into the DOM if the elements exist.
            setText('profile-name', data.full_name);
            setText('profile-headline', data.headline);
            setText('profile-bio', data.bio);
            
            // If you had location or email fields in HTML:
            // setText('profile-location', data.location);
            // setText('profile-email', data.email);
        }
    } catch (err) {
        console.error('Error loading profile:', err.message);
    }
}

/**
 * 2) Load and render work experience.
 */
async function loadExperience() {
    try {
        const container = document.getElementById('experience-container');
        if (!container) return; // No container on this page.

        // Fetch experiences ordered by start date (most recent first).
        let { data, error } = await sb
            .from('experience')
            .select('*')
            .order('start_date', { ascending: false });

        if (error) throw error;

        // Clear the container (remove "Loading..." placeholder).
        container.innerHTML = '';

        if (data.length === 0) {
            container.innerHTML = '<p>No experience yet.</p>';
            return;
        }

        // Render each experience entry.
        data.forEach(job => {
            const card = document.createElement('div');
            card.className = 'resume-item';
            
            // Format dates (e.g. "2023-01-01" -> "Jan 2023").
            const startStr = formatDate(job.start_date);
            const endStr = job.is_current ? 'Present' : formatDate(job.end_date);

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
        console.error('Error loading experience:', err.message);
        const container = document.getElementById('experience-container');
        if(container) container.innerHTML = '<p>Error loading data.</p>';
    }
}

// --- UTILS ---

// Safe helper to set text content when the element exists.
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text || '';
}

// Simple date formatter (YYYY-MM-DD -> Mon YYYY).
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00'); // Avoid timezone drift.
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

// --- INIT ---

// Run once the page is ready.
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadExperience();
});
