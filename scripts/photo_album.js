document.addEventListener('DOMContentLoaded', () => {
    const galleries = document.querySelectorAll('.horizontal-gallery, .horizontal-gallery-shorter');

    galleries.forEach(gallery => {
        let direction = 1; // 1 for right, -1 for left
        let autoScroll;

        function getScrollSpeed() {
            const base = gallery.clientWidth * 0.0075;
            return Math.max(base, 2); // Never scroll less than 2px per tick
        }

        function startAutoScroll() {
            autoScroll = setInterval(() => {
                gallery.scrollLeft += getScrollSpeed() * direction;

                // If at the right end, reverse direction
                if (gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 1) {
                    direction = -1;
                }
                // If at the left end, reverse direction
                if (gallery.scrollLeft <= 0) {
                    direction = 1;
                }
            }, 10);
        }
        startAutoScroll();

        // Pause/resume auto-scroll: only use hover logic on non-touch devices
        function isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }

        if (!isTouchDevice()) {
            gallery.addEventListener('mouseenter', () => clearInterval(autoScroll));
            gallery.addEventListener('mouseleave', startAutoScroll);
        }

        // Touch devices: pause on touch, resume on touch end
        gallery.addEventListener('touchstart', () => clearInterval(autoScroll), {passive: true});
        gallery.addEventListener('touchend', startAutoScroll, {passive: true});

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