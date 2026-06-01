/* =============================================================
   SLIDE NAVIGATION
   ============================================================= */
(function() {
  let current = 0;
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const prevBtn = document.getElementById('prev-slide');
  const nextBtn = document.getElementById('next-slide');
  const total = slides.length;

  function goTo(index) {
    if (index < 0 || index >= total) return;
    slides.forEach(s => s.classList.remove('active'));
    slides[index].classList.add('active');
    dots.forEach(d => d.classList.remove('active'));
    dots[index].classList.add('active');
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === total - 1;
    current = index;

    // Trigger/update map when reaching slide 3
    if (index === 2) {
      if (!window.mapInitialized) initMap();
      else if (window.mapInstance) setTimeout(function() { window.mapInstance.invalidateSize(); }, 250);
    }
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  dots.forEach(d => d.addEventListener('click', () => goTo(parseInt(d.dataset.slide))));

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(current + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(current - 1);
  });

  // Touch swipe
  let touchStartX = 0;
  document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(dx) > 60) dx < 0 ? goTo(current + 1) : goTo(current - 1);
  }, { passive: true });

  window.goToSlide = goTo;
})();