document.addEventListener('DOMContentLoaded', () => {
    const galleries = document.querySelectorAll('.horizontal-gallery, .horizontal-gallery-shorter');

    galleries.forEach(gallery => {
        // Auto-scroll
        let autoScroll;
        function getScrollSpeed() {
            return window.innerWidth <= 768 ? 5 : 10;
        }
        function startAutoScroll() {
            autoScroll = setInterval(() => {
                gallery.scrollLeft += getScrollSpeed();
                // Stop at the end
                if (gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth) {
                    clearInterval(autoScroll);
                }
            }, 10);
        }
        startAutoScroll();

        // Pause auto-scroll on hover
        gallery.addEventListener('mouseenter', () => clearInterval(autoScroll));
        gallery.addEventListener('mouseleave', startAutoScroll);

        // Wheel scroll
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