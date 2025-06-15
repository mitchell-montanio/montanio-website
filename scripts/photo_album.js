document.addEventListener('DOMContentLoaded', () => {
    const galleries = document.querySelectorAll('.horizontal-gallery, .horizontal-gallery-shorter');

    galleries.forEach(gallery => {
        let direction = 1;
        let autoScroll;
        let resumeTimeout;

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

        function pauseAutoScroll() {
            clearInterval(autoScroll);
            if (resumeTimeout) clearTimeout(resumeTimeout);
        }
        function resumeAutoScroll() {
            // Add a short delay before resuming auto-scroll after touch
            resumeTimeout = setTimeout(startAutoScroll, 400);
        }

        // Only use hover logic on non-touch devices
        function isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }
        if (!isTouchDevice()) {
            gallery.addEventListener('mouseenter', pauseAutoScroll);
            gallery.addEventListener('mouseleave', startAutoScroll);
        }

        // Touch devices: pause on touch, resume after short delay on touch end
        gallery.addEventListener('touchstart', pauseAutoScroll, {passive: true});
        gallery.addEventListener('touchend', resumeAutoScroll, {passive: true});

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