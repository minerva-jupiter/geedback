export const renderAbout = (app: HTMLDivElement) => {
  app.innerHTML = `
    <div class="about-container">
      <nav>
        <a href="#" id="back-home">← Back to App</a>
      </nav>

      <h1>About Geedback</h1>

      <section class="about-section">
        <h2>What is Geedback?</h2>
        <p>
          Geedback is a multi-oscillator synthesizer that uses smartphone feedback and gravity sensors
          to create unique soundscapes. It explores the interaction between movement and sound synthesis.
        </p>
      </section>

      <section class="about-section">
        <h2>Author</h2>
        <p>Created by <strong>tetsu AKA Minerva_Juppiter</strong></p>
      </section>

      <section class="about-section">
        <h2>Repository</h2>
        <p>
          You can find the source code on GitHub:
          <a href="https://github.com/minerva-jupiter/geedback" target="_blank" rel="noopener noreferrer">
            minerva-jupiter/geedback
          </a>
        </p>
      </section>

      <section class="about-section">
        <h2>Demo Video</h2>
        <div class="video-container">
          <iframe
            width="560"
            height="315"
            src="https://www.youtube.com/embed/8O0NMlRxeOw?si=wnrLWbrW070iwMPI"
            title="Geedback Demo"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        </div>
      </section>

      <footer style="margin-top: 40px; font-size: 0.8em; color: #666;">
        &copy; 2026 Minerva_Juppiter
      </footer>
    </div>
  `;

  document.getElementById("back-home")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.hash = "";
  });
};
