<template>
  <div id="app">
    <nav class="navbar" role="navigation" aria-label="Primary">
      <div class="nav-container">
        <div class="logo-wrapper">
          <h1 class="logo">POS System</h1>
          <p class="logo-tagline">Faster checkout. Happier customers.</p>
        </div>
        <div class="nav-links">
          <router-link to="/pos" class="nav-link">POS</router-link>
          <router-link to="/products" class="nav-link">Products</router-link>
          <router-link to="/sales" class="nav-link">Sales</router-link>
          <router-link to="/reports" class="nav-link">Reports</router-link>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.navbar {
  background: linear-gradient(120deg, #1f3b73, #1b5fa7);
  color: white;
  padding: 20px 0;
  box-shadow: 0 10px 30px rgba(9, 20, 60, 0.3);
  position: sticky;
  top: 0;
  z-index: 20;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}

.logo-wrapper {
  display: flex;
  flex-direction: column;
}

.logo {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.logo-tagline {
  margin-top: 4px;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
}

.nav-links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 10px 22px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 1rem;
  transition: background 0.2s ease, transform 0.2s ease;
}

.nav-link:hover,
.nav-link.router-link-active,
.nav-link:focus-visible {
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  transform: translateY(-1px);
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 28px;
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    align-items: flex-start;
  }

  .nav-links {
    width: 100%;
    justify-content: flex-start;
  }

  .main-content {
    padding: 20px 16px 32px;
  }
}
</style>

