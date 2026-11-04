/* Public site JS: only the contact form -> database. Settings live in config.js */
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
    const response = await fetch(SUPABASE_URL + "/rest/v1/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY,
        "Authorization": "Bearer " + API_KEY,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        name: data.name.trim(),
        phone: data.phone.trim(),
        message: data.message.trim()
      })
    });
    if (!response.ok) throw new Error("Request failed");
    form.reset();
    status.textContent = "Request sent. We will contact you shortly.";
  } catch (error) {
    status.textContent = "Could not send. Please message us on WhatsApp instead.";
    status.classList.add("error");
  }
});
