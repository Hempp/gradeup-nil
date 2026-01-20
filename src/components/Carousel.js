// Carousel.js - Fixed implementation
class Carousel {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) return;

    this.slides = this.container.querySelectorAll('[role="tabpanel"]');
    this.prevBtn = this.container.querySelector('[aria-label="Previous"]');
    this.nextBtn = this.container.querySelector('[aria-label="Next"]');
    this.dots = this.container.querySelectorAll('[role="tab"]');

    this.currentIndex = 0;
    this.autoPlayInterval = null;

    this.init();
  }

  init() {
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());

    this.dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => this.goToSlide(idx));
    });

    this.autoPlay();

    this.container.addEventListener('mouseenter', () => this.stopAutoPlay());
    this.container.addEventListener('mouseleave', () => this.autoPlay());
  }

  showSlide(index) {
    this.slides.forEach((s, i) => {
      s.style.display = i === index ? 'block' : 'none';
      s.classList.toggle('active', i === index);
    });

    this.dots.forEach((d, i) => {
      d.classList.toggle('active', i === index);
      d.setAttribute('aria-selected', i === index);
    });

    this.currentIndex = index;
  }

  next() {
    const nextIndex = (this.currentIndex + 1) % this.slides.length;
    this.showSlide(nextIndex);
  }

  prev() {
    const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.showSlide(prevIndex);
  }

  goToSlide(index) {
    this.showSlide(index);
  }

  autoPlay() {
    this.autoPlayInterval = setInterval(() => this.next(), 4000);
  }

  stopAutoPlay() {
    clearInterval(this.autoPlayInterval);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Carousel('.testimonials-carousel');
});
