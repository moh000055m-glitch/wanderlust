class WanderlustPlanner {
  constructor() {
    this.endpoints = {
      countries: "https://countries.dev/countries",
      holidays: "https://date.nager.at/api/v3/PublicHolidays",
      longWeekends: "https://date.nager.at/api/v3/LongWeekend",
      ticketmaster: "https://app.ticketmaster.com/discovery/v2/events.json",
      exchangeRates: "https://open.er-api.com/v6/latest",
      geocoding: "https://geocoding-api.open-meteo.com/v1/search",
      weatherForecast: "https://api.open-meteo.com/v1/forecast",
      sunTimes: "https://api.sunrise-sunset.org/json",
    };
    this.state = {
      countries: [],
      selectedCountry: null,
      savedPlans: JSON.parse(localStorage.getItem("wanderlustPlans") || "[]"),
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.fetchCountries();
    this.Plans();
  }

  async fetchCountries() {
    const select = document.getElementById("global-country");
    if (!select) return;

    select.innerHTML = '<option value="">Loading countries...</option>';
    const res = await fetch(this.endpoints.countries);
    this.state.countries = await res.json();
    this.state.countries.sort((a, b) => a.name.localeCompare(b.name));
    select.innerHTML = '<option value="">Select Country</option>';
    this.state.countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country.alpha2Code;
      option.textContent = `${country.flag || ""} ${country.name}`;
      select.appendChild(option);
    });

    select.value = "EG";
    this.select_country("EG");
  }

  select_country(code) {
    this.state.selectedCountry = this.state.countries.find(
      (c) => c.alpha2Code === code,
    );
    if (!this.state.selectedCountry) return;

    const {
      name,
      capital,
      population,
      region,
      subregion,
      currencies,
      languages,
      flags,
    } = this.state.selectedCountry;
    const flagImg = flags.png || flags.svg || "";

    document.getElementById("dashboard-country-info").innerHTML = `
      <h3>${name}</h3>
      <img src="${flagImg}" alt="Country flag" width="100">
      <p><strong>Capital:</strong> ${capital || "Unknown"}</p>
      <p><strong>Population:</strong> ${population.toLocaleString()}</p>
      <p><strong>Region:</strong> ${region}</p>
      <p><strong>Subregion:</strong> ${subregion}</p>
      <p><strong>Currency:</strong> ${currencies.map((c) => c.name).join(", ")}</p>
      <p><strong>Languages:</strong> ${languages.map((l) => l.name).join(", ")}</p>
    `;

    document.getElementById("selected-country-flag").innerHTML =
      `<img src="${flagImg}" alt="Flag" width="30">`;
    document.getElementById("selected-country-name").textContent = name;
    document.getElementById("selected-city-name").textContent =
      capital || "Unknown";
    document.getElementById("selected-destination").textContent =
      `${name} - ${capital || "Unknown"}`;
    const cityInput = document.getElementById("global-city");
    if (cityInput && capital) cityInput.value = capital;
  }
  async Holidays() {
    if (!this.state.selectedCountry) return;
    const year =
      document.getElementById("global-year")?.value || new Date().getFullYear();
    const code = this.state.selectedCountry.alpha2Code;

    document.getElementById("holidays-content").innerHTML =
      "Loading holidays";

    const res = await fetch(`${this.endpoints.holidays}/${year}/${code}`);
    const holidays = await res.json();

    const html = holidays.map(
        (h) => `
      <div class="holiday-card">
        <h3>${h.localName}</h3>
        <p>Date: ${h.date}</p>
        <p>${h.name}</p>
        <button data-save="holiday" data-name="${h.localName}" data-date="${h.date}">Save to My Plans</button>
      </div>`,).join("");

    document.getElementById("holidays-content").innerHTML = html;}
  async Weekends() {
    if (!this.state.selectedCountry) return;
    const year =
      document.getElementById("global-year")?.value || new Date().getFullYear();
    const code = this.state.selectedCountry.alpha2Code;
    document.getElementById("lw-content").innerHTML =
      "Loading long weekends...";
    const res = await fetch(`${this.endpoints.longWeekends}/${year}/${code}`);
    const weekends = await res.json();
    const html = weekends.map(
        (w, index) => `
      <div class="weekend-card">
        <h3>Long Weekend ${index + 1}</h3>
        <p>From: ${w.startDate}</p>
        <p>To: ${w.endDate}</p>
        <p>Days: ${w.dayCount}</p>
        <button data-save="weekend" data-name="Long Weekend ${index + 1}" data-date="${w.startDate}">Save to My Plans</button>
      </div>`,).join("");
    document.getElementById("lw-content").innerHTML = html;
  }
  async Events() {
    const city = document.getElementById("global-city").value.trim();
    if (!city) return;

    document.getElementById("events-content").innerHTML = "Loading events...";

    const res = await fetch(
      `${this.endpoints.ticketmaster}?city=${encodeURIComponent(city)}&apikey=${this.config.ticketmasterKey}`,
    );
    const data = await res.json();
    const events = data._embedded?.events || [];
    const html = events.map(
        (e) => `
      <div class="event-card">
        <h3>${e.name}</h3>
        <p>Date: ${e.dates.start.localDate}</p>
        <a href="${e.url}" target="_blank">More information</a><br>
        <button data-save="event" data-name="${e.name}" data-date="${e.dates.start.localDate}">Save to My Plans</button>
      </div>`,).join("");

    document.getElementById("events-content").innerHTML = html;
  }
  getWeatherDescription(code) {
    if (code === 0) return "Clear sky";
    if (code === 1 || code === 2) return "Mainly clear";
    if (code === 3) return "Cloudy";
    if (code === 45 || code === 48) return "Fog";
    if (code >= 51 && code <= 67) return "Drizzle or rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Rain showers";
    if (code >= 95) return "Thunderstorm";
  }
  async Weather() {
    const city = document.getElementById("global-city").value.trim();
    if (!city) return;

    document.getElementById("weather-content").innerHTML = "Loading weather...";

    const locRes = await fetch(
      `${this.endpoints.geocoding}?name=${encodeURIComponent(city)}&count=1`,
    );
    const locData = await locRes.json();
    const { latitude, longitude, name } = locData.results[0];

    const weatherRes = await fetch(
      `${this.endpoints.weatherForecast}?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=7&timezone=auto`,
    );
    const weather = await weatherRes.json();
    let html = `<h3>Weather in ${name}</h3>`;
    for (let i = 0; i < weather.daily.time.length; i++) {
      html += `
        <div class="weather-card">
          <h4>${weather.daily.time[i]}</h4>
          <p>Max: ${weather.daily.temperature_2m_max[i]} °C</p>
          <p>Min: ${weather.daily.temperature_2m_min[i]} °C</p>
          <p>${this.getWeatherDescription(weather.daily.weather_code[i])}</p>
        </div>`;}
    document.getElementById("weather-content").innerHTML = html;
  }

  async Suntimes() {
    const city = document.getElementById("global-city").value.trim();
    if (!city) return;

    document.getElementById("sun-times-content").innerHTML =
      "Loading sunrise and sunset";

    const locRes = await fetch(
      `${this.endpoints.geocoding}?name=${encodeURIComponent(city)}&count=1`,
    );
    const locData = await locRes.json();
    const { latitude, longitude, name } = locData.results[0];

    const sunRes = await fetch(
      `${this.endpoints.sunTimes}?lat=${latitude}&lng=${longitude}&formatted=0`,
    );
    const data = await sunRes.json();
    document.getElementById("sun-times-content").innerHTML = `
      <h3>Sun Times in ${name}</h3>
      <p>Sunrise: ${new Date(data.results.sunrise).toLocaleTimeString()}</p>
      <p>Sunset: ${new Date(data.results.sunset).toLocaleTimeString()}</p>
    `;}

  async convertCurrency() {
    const amount = Number(document.getElementById("currency-amount").value);
    const from = document.getElementById("currency-from").value;
    const to = document.getElementById("currency-to").value;
    document.getElementById("currency-result").innerHTML = "Converting...";
    const res = await fetch(`${this.endpoints.exchangeRates}/${from}`);
    const data = await res.json();
    const result = amount * data.rates[to];
    document.getElementById("currency-result").innerHTML =
      `${amount} ${from} = ${result.toFixed(2)} ${to}`;}

  addPlan(type, name, date) {
    this.state.savedPlans.push({ id: Date.now(), type, name, date });
    localStorage.setItem(
      "wanderlustPlans",
      JSON.stringify(this.state.savedPlans),
    );
    this.Plans();
    alert("Plan saved successfully!");
  }

  removePlan(id) {
    this.state.savedPlans = this.state.savedPlans.filter((p) => p.id !== id);
    localStorage.setItem(
      "wanderlustPlans",
      JSON.stringify(this.state.savedPlans),
    );
    this.Plans();
  }

  Plans() {
    const html = this.state.savedPlans
      .map(
        (p) => `
      <div class="plan-card">
        <h3>${p.name}</h3>
        <p>Type: ${p.type}</p>
        <p>Date: ${p.date}</p>
        <button data-delete="${p.id}">Delete</button>
      </div>
      `,).join("");

    document.getElementById("plans-content").innerHTML =
      html || "You haven't saved any plans yet.";
    const counter = document.getElementById("stat-saved");
    if (counter) counter.textContent = this.state.savedPlans.length;
  }
  setupEventListeners() {
    document.getElementById("global-country")?.addEventListener("change", (e) => {
        this.selectCountry(e.target.value);
      });
    document.getElementById("global-search-btn")?.addEventListener("click", () => {
        if (!this.state.selectedCountry) return;
        this.select_country(this.state.selectedCountry.alpha2Code);
        this.Holidays();
        this.Weekends();
        this.Events();
        this.Weather();
        this.Suntimes();
      });
    document.getElementById("convert-btn")?.addEventListener("click", () => this.convertCurrency());
    document.getElementById("swap-currencies-btn")?.addEventListener("click", () => {
        const from = document.getElementById("currency-from");
        const to = document.getElementById("currency-to");
        const temp = from.value;
        from.value = to.value;
        to.value = temp;
      });
    document.getElementById("clear-selection-btn")?.addEventListener("click", () => {
        this.state.selectedCountry = null;
        document.getElementById("global-country").value = "";
        document.getElementById("global-city").value = "";
        document.getElementById("dashboard-country-info").innerHTML =
          "select a cuntry.";
        document.getElementById("selected-country-name").textContent = "";
        document.getElementById("selected-country-flag").textContent = "";
        document.getElementById("selected-city-name").textContent = "";
        document.getElementById("selected-destination").textContent = "";
      });
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const viewName = button.dataset.view;
        document.querySelectorAll(".view").forEach((view) => {
          view.style.display = "none";
        });

        const selectedView = document.getElementById(`${viewName}-view`);
        if (selectedView) {
          selectedView.style.display = "block";
  }

        if (viewName === "holidays") this.Holidays();
        if (viewName === "events") this.Events();
        if (viewName === "weather") this.Weather();
        if (viewName === "long-weekends") this.Weekends();
        if (viewName === "sun-times") this.Suntimes();
        if (viewName === "my-plans") this.plans();
      });
       });




    document.addEventListener("click", (e) => {
      const saveBtn = e.target.closest("[data-save]");
      if (saveBtn) {
        this.addPlan(
          saveBtn.dataset.save,
          saveBtn.dataset.name,
          saveBtn.dataset.date,
        );
       }
      const deleteBtn = e.target.closest("[data-delete]");
      if (deleteBtn) {
        this.removePlan(Number(deleteBtn.dataset.delete));
      }
     });
    }
    }
document.addEventListener("DOMContentLoaded", () => new WanderlustPlanner());
