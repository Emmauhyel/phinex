/* JS is only used for the contact form -> database. Everything else is plain HTML/CSS. */

// ===== Edit these two lines with your database details =====
const DATABASE_URL = "https://YOUR-PROJECT.supabase.co/rest/v1/requests"; // table that stores requests
const API_KEY = "YOUR_PUBLIC_ANON_KEY"; // use the public (anon) key only, never a secret key

const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.className = "form-status";

  const data = Object.fromEntries(new FormData(form));
  if (!data.name.trim() || !data.phone.trim() || !data.message.trim()) {
    status.textContent = "Please fill in your name, phone number and message.";
    status.classList.add("error");
    return;
  }

  status.textContent = "Sending...";
  try {
    const response = await fetch(DATABASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY,
        "Authorization": "Bearer " + API_KEY,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ name: data.name, phone: data.phone, message: data.message })
    });
    if (!response.ok) throw new Error("Request failed");
    form.reset();
    status.textContent = "Request sent. We will contact you shortly.";
  } catch (error) {
    status.textContent = "Could not send. Please message us on WhatsApp instead.";
    status.classList.add("error");
  }
});
