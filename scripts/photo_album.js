document.addEventListener('DOMContentLoaded', () => {
    const galleries = document.querySelectorAll('.horizontal-gallery, .horizontal-gallery-shorter');

    galleries.forEach(gallery => {
        let direction = 1;
        let autoScroll;

        function getScrollSpeed() {
            const base = gallery.clientWidth * 0.0075;
            return Math.max(base, 2);
        }

        function startAutoScroll() {
            autoScroll = setInterval(() => {
                gallery.scrollLeft += getScrollSpeed() * direction;
                if (gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 1) {
                    direction = -1;
                }
                if (gallery.scrollLeft <= 0) {
                    direction = 1;
                }
            }, 10);
        }
        startAutoScroll();

        // Only pause/resume auto-scroll on hover for desktop
        function isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }
        if (!isTouchDevice()) {
            gallery.addEventListener('mouseenter', () => clearInterval(autoScroll));
            gallery.addEventListener('mouseleave', startAutoScroll);
        }

        // Wheel scroll (manual override for desktop)
        gallery.addEventListener('wheel', (e) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            gallery.scrollLeft += e.deltaY * 3;
        }, { passive: false });

        // Adjust scroll speed on window resize
        window.addEventListener('resize', () => {
            clearInterval(autoScroll);
            startAutoScroll();
        });
    });
});