document.addEventListener('DOMContentLoaded', () => {
    const galleries = document.querySelectorAll('.horizontal-gallery, .horizontal-gallery-shorter');

    galleries.forEach(gallery => {
        let direction = 1; // 1 for right, -1 for left
        let autoScroll;

        function getScrollSpeed() {
            return gallery.clientWidth * 0.0075; // 0.75% of visible width per tick (25% slower)
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

        // Pause auto-scroll on mouse hover or touch
        function pauseAutoScroll() {
            clearInterval(autoScroll);
        }
        function resumeAutoScroll() {
            startAutoScroll();
        }

        gallery.addEventListener('mouseenter', pauseAutoScroll);
        gallery.addEventListener('mouseleave', resumeAutoScroll);
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